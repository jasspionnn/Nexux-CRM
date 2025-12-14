
import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';
import { cors } from 'hono/cors';

// --- Type Definitions for D1 (to avoid reliance on global types) ---
interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: unknown;
  error?: string;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown>(): Promise<T[]>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  dump(): Promise<ArrayBuffer>;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<unknown>;
}

type Bindings = {
  DB: D1Database;
};

// Application Types matching DB
interface DBUser {
    id: string;
    account_id: string;
    name: string;
    email: string;
    password?: string;
    role: string;
    avatar: string;
    status: string;
    team_id?: string;
}

interface DBAccount {
    id: string;
    status: string;
    plan: string;
}

const app = new Hono<{ Bindings: Bindings }>();

// 1. CORS Middleware
app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Helpers
const generateId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

// --- ROTAS DE AUTENTICAÇÃO ---

app.post('/api/auth/login', async (c) => {
  const body = await c.req.json();
  const { email, password } = body as { email?: string; password?: string };

  if (!email || !password) return c.json({ error: 'Dados incompletos' }, 400);
  
  // Busca usuário no D1
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<DBUser>();
  
  if (!user) return c.json({ error: 'Usuário não encontrado' }, 401);
  if (user.password !== password) return c.json({ error: 'Senha incorreta' }, 401);

  // Valida conta
  if (user.role !== 'NEXUS_ADMIN') {
      const account = await c.env.DB.prepare('SELECT * FROM accounts WHERE id = ?').bind(user.account_id).first<DBAccount>();
      if (!account || account.status !== 'active') {
          return c.json({ error: 'Conta inativa ou inexistente' }, 403);
      }
  }

  // Mapeia snake_case do DB para camelCase do Frontend
  const userCamel = {
      id: user.id,
      accountId: user.account_id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      status: user.status
  };

  return c.json({ user: userCamel });
});

// --- ROTAS DE SINCRONIZAÇÃO (Dashboard) ---
app.get('/api/sync/:accountId', async (c) => {
  const accountId = c.req.param('accountId');

  const funnelsResult = await c.env.DB.prepare('SELECT * FROM funnels WHERE account_id = ?').bind(accountId).all<any>();
  const leadsResult = await c.env.DB.prepare('SELECT * FROM leads WHERE account_id = ?').bind(accountId).all<any>();
  const usersResult = await c.env.DB.prepare('SELECT * FROM users WHERE account_id = ?').bind(accountId).all<any>();
  const teamsResult = await c.env.DB.prepare('SELECT * FROM teams WHERE account_id = ?').bind(accountId).all<any>();
  
  const funnels = funnelsResult.results;

  // Popula estágios para cada funil
  const funnelsWithStages = await Promise.all(funnels.map(async (f: any) => {
      const stagesResult = await c.env.DB.prepare('SELECT * FROM stages WHERE funnel_id = ? ORDER BY "order" ASC').bind(f.id).all<any>();
      return { ...f, stages: stagesResult.results };
  }));

  // Popula tasks e notes para cada lead
  const leadsRaw = leadsResult.results;
  const leads = await Promise.all(leadsRaw.map(async (l: any) => {
      const tasksRes = await c.env.DB.prepare('SELECT * FROM tasks WHERE lead_id = ?').bind(l.id).all<any>();
      const notesRes = await c.env.DB.prepare('SELECT * FROM notes WHERE lead_id = ? ORDER BY created_at DESC').bind(l.id).all<any>();
      
      return {
          id: l.id,
          accountId: l.account_id,
          title: l.title,
          company: l.company,
          value: l.value,
          contactName: l.contact_name,
          contactEmail: l.contact_email,
          contactPhone: l.contact_phone,
          funnelId: l.funnel_id,
          stageId: l.stage_id,
          assignedUserId: l.assigned_user_id,
          probability: l.probability,
          tags: JSON.parse(l.tags || '[]'),
          customValues: JSON.parse(l.custom_values || '{}'),
          createdAt: l.created_at,
          tasks: tasksRes.results.map((t: any) => ({ ...t, dueDate: t.due_date, leadId: t.lead_id, completed: Boolean(t.completed) })),
          notes: notesRes.results.map((n: any) => ({ ...n, leadId: n.lead_id, authorName: n.author_name, createdAt: n.created_at }))
      };
  }));

  // Map users to camelCase
  const usersCamel = usersResult.results.map((u: any) => ({
      id: u.id,
      accountId: u.account_id,
      name: u.name,
      email: u.email,
      role: u.role,
      avatar: u.avatar,
      status: u.status,
      teamId: u.team_id
  }));

  const teamsCamel = teamsResult.results.map((t: any) => ({
      id: t.id,
      accountId: t.account_id,
      name: t.name,
      goal: t.goal
  }));

  return c.json({
      funnels: funnelsWithStages,
      leads,
      users: usersCamel,
      teams: teamsCamel,
      customFields: []
  });
});

// --- ROTAS DE LEADS ---

app.get('/api/leads', async (c) => {
    return c.json({ msg: 'Use /api/sync/:accountId para carga inicial' });
});

app.post('/api/leads', async (c) => {
    const data = await c.req.json() as any;
    const id = data.id || generateId('l');
    
    await c.env.DB.prepare(`
        INSERT INTO leads (id, account_id, title, company, value, contact_name, contact_email, contact_phone, funnel_id, stage_id, assigned_user_id, probability, tags, custom_values, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        id, data.accountId, data.title, data.company, data.value, 
        data.contactName, data.contactEmail, data.contactPhone, 
        data.funnelId, data.stageId, data.assignedUserId, 
        data.probability, JSON.stringify(data.tags || []), JSON.stringify(data.customValues || {}), 
        new Date().toISOString()
    ).run();

    return c.json({ success: true, id });
});

app.patch('/api/leads/:id', async (c) => {
    const id = c.req.param('id');
    const data = await c.req.json() as any;
    
    // Atualização dinâmica simples
    if (data.stageId) await c.env.DB.prepare('UPDATE leads SET stage_id = ? WHERE id = ?').bind(data.stageId, id).run();
    if (data.probability !== undefined) await c.env.DB.prepare('UPDATE leads SET probability = ? WHERE id = ?').bind(data.probability, id).run();
    if (data.title) await c.env.DB.prepare('UPDATE leads SET title = ? WHERE id = ?').bind(data.title, id).run();
    if (data.value) await c.env.DB.prepare('UPDATE leads SET value = ? WHERE id = ?').bind(data.value, id).run();
    
    // Handle Notes
    if (data.notes && Array.isArray(data.notes) && data.notes.length > 0) {
        const newNote = data.notes[0];
        if (newNote.id) {
             const exists = await c.env.DB.prepare('SELECT id FROM notes WHERE id = ?').bind(newNote.id).first();
             if (!exists) {
                 await c.env.DB.prepare('INSERT INTO notes (id, lead_id, content, author_name, created_at) VALUES (?, ?, ?, ?, ?)')
                 .bind(newNote.id, id, newNote.content, newNote.authorName, newNote.createdAt || new Date().toISOString()).run();
             }
        }
    }

    return c.json({ success: true });
});

// --- ROTAS DE TASKS ---

app.post('/api/tasks', async (c) => {
    const data = await c.req.json() as any;
    
    await c.env.DB.prepare(`
        INSERT INTO tasks (id, lead_id, title, due_date, completed, type)
        VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
        data.id, data.leadId, data.title, data.dueDate, data.completed ? 1 : 0, data.type
    ).run();

    return c.json({ success: true });
});

app.delete('/api/tasks/:taskId', async (c) => {
    const taskId = c.req.param('taskId');
    await c.env.DB.prepare('DELETE FROM tasks WHERE id = ?').bind(taskId).run();
    return c.json({ success: true });
});

app.patch('/api/tasks/:taskId/toggle', async (c) => {
    const taskId = c.req.param('taskId');
    const task = await c.env.DB.prepare('SELECT completed FROM tasks WHERE id = ?').bind(taskId).first<{completed: number}>();
    if (task) {
        const newState = task.completed === 1 ? 0 : 1;
        await c.env.DB.prepare('UPDATE tasks SET completed = ? WHERE id = ?').bind(newState, taskId).run();
    }
    return c.json({ success: true });
});

export const onRequest = handle(app);
