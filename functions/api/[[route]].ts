
import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';
import { cors } from 'hono/cors';

// --- Type Definitions for D1 ---
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

app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

const generateId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

// --- AUTH ---

app.post('/api/auth/login', async (c) => {
  const body = await c.req.json();
  const { email, password } = body as { email?: string; password?: string };

  if (!email || !password) return c.json({ error: 'Dados incompletos' }, 400);
  
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first() as DBUser | null;
  
  if (!user) return c.json({ error: 'Usuário não encontrado' }, 401);
  if (user.password !== password) return c.json({ error: 'Senha incorreta' }, 401);

  if (user.role !== 'NEXUS_ADMIN') {
      const account = await c.env.DB.prepare('SELECT * FROM accounts WHERE id = ?').bind(user.account_id).first() as DBAccount | null;
      if (!account || account.status !== 'active') {
          return c.json({ error: 'Conta inativa ou inexistente' }, 403);
      }
  }

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

app.post('/api/auth/register', async (c) => {
    const body = await c.req.json() as any;
    const { userName, email, password, companyName } = body;

    if (!userName || !email || !password || !companyName) {
        return c.json({ error: 'Preencha todos os campos' }, 400);
    }

    // Check existing
    const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (existing) return c.json({ error: 'Email já cadastrado' }, 400);

    const accountId = generateId('acc');
    const userId = generateId('u');

    try {
        // Create Account
        await c.env.DB.prepare(`
            INSERT INTO accounts (id, company_name, owner_name, email, status, plan, created_at, expires_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            accountId, companyName, userName, email, 'active', 'trial', 
            new Date().toISOString(), 
            new Date(Date.now() + 30*24*60*60*1000).toISOString()
        ).run();

        // Create Admin User
        await c.env.DB.prepare(`
            INSERT INTO users (id, account_id, name, email, password, role, avatar, status, joined_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            userId, accountId, userName, email, password, 'ACCOUNT_ADMIN', 
            `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=random`, 
            'active', new Date().toISOString()
        ).run();
        
        // Create Default Funnel
        const funnelId = generateId('f');
        await c.env.DB.prepare('INSERT INTO funnels (id, account_id, name) VALUES (?, ?, ?)').bind(funnelId, accountId, 'Funil de Vendas').run();
        
        // Default Stages
        await c.env.DB.batch([
            c.env.DB.prepare('INSERT INTO stages (id, funnel_id, name, color, "order") VALUES (?, ?, ?, ?, ?)').bind(generateId('s'), funnelId, 'Novo Lead', 'bg-gray-100 border-gray-300', 0),
            c.env.DB.prepare('INSERT INTO stages (id, funnel_id, name, color, "order") VALUES (?, ?, ?, ?, ?)').bind(generateId('s'), funnelId, 'Qualificação', 'bg-blue-50 border-blue-200', 1),
            c.env.DB.prepare('INSERT INTO stages (id, funnel_id, name, color, "order") VALUES (?, ?, ?, ?, ?)').bind(generateId('s'), funnelId, 'Proposta', 'bg-yellow-50 border-yellow-200', 2),
            c.env.DB.prepare('INSERT INTO stages (id, funnel_id, name, color, "order") VALUES (?, ?, ?, ?, ?)').bind(generateId('s'), funnelId, 'Fechamento', 'bg-green-50 border-green-200', 3)
        ]);

        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// --- SYNC ---

app.get('/api/sync/:accountId', async (c) => {
  const accountId = c.req.param('accountId');

  // Fetch Core Data
  const funnelsResult = await c.env.DB.prepare('SELECT * FROM funnels WHERE account_id = ?').bind(accountId).all() as D1Result<any>;
  const leadsResult = await c.env.DB.prepare('SELECT * FROM leads WHERE account_id = ?').bind(accountId).all() as D1Result<any>;
  const usersResult = await c.env.DB.prepare('SELECT * FROM users WHERE account_id = ?').bind(accountId).all() as D1Result<any>;
  const teamsResult = await c.env.DB.prepare('SELECT * FROM teams WHERE account_id = ?').bind(accountId).all() as D1Result<any>;
  const customFieldsResult = await c.env.DB.prepare('SELECT * FROM custom_fields WHERE account_id = ?').bind(accountId).all() as D1Result<any>;

  // Process Funnels & Stages
  const funnels = funnelsResult.results;
  const funnelsWithStages = await Promise.all(funnels.map(async (f: any) => {
      const stagesResult = await c.env.DB.prepare('SELECT * FROM stages WHERE funnel_id = ? ORDER BY "order" ASC').bind(f.id).all() as D1Result<any>;
      return { 
          id: f.id,
          accountId: f.account_id,
          name: f.name,
          stages: stagesResult.results.map((s:any) => ({
              id: s.id,
              name: s.name,
              color: s.color,
              order: s.order
          })),
          defaultWonStageId: f.default_won_stage_id,
          defaultLostStageId: f.default_lost_stage_id
      };
  }));

  // Process Leads with Tasks & Notes
  const leadsRaw = leadsResult.results;
  const leads = await Promise.all(leadsRaw.map(async (l: any) => {
      const tasksRes = await c.env.DB.prepare('SELECT * FROM tasks WHERE lead_id = ?').bind(l.id).all() as D1Result<any>;
      const notesRes = await c.env.DB.prepare('SELECT * FROM notes WHERE lead_id = ? ORDER BY created_at DESC').bind(l.id).all() as D1Result<any>;
      
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

  // Process Users
  const usersCamel = usersResult.results.map((u: any) => ({
      id: u.id,
      accountId: u.account_id,
      name: u.name,
      email: u.email,
      role: u.role,
      avatar: u.avatar,
      status: u.status,
      teamId: u.team_id,
      joinedAt: u.joined_at
  }));

  // Process Teams
  const teamsCamel = teamsResult.results.map((t: any) => ({
      id: t.id,
      accountId: t.account_id,
      name: t.name,
      goal: t.goal
  }));

  // Process Custom Fields
  const fieldsCamel = customFieldsResult.results.map((cf: any) => ({
      id: cf.id,
      accountId: cf.account_id,
      name: cf.name,
      type: cf.type,
      context: cf.context,
      funnelId: cf.funnel_id,
      options: JSON.parse(cf.options || '[]'),
      visibleStageIds: JSON.parse(cf.visible_stage_ids || '[]')
  }));

  return c.json({
      funnels: funnelsWithStages,
      leads,
      users: usersCamel,
      teams: teamsCamel,
      customFields: fieldsCamel
  });
});

// --- LEADS ---

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
    
    // Dynamic update builder
    if (data.stageId) await c.env.DB.prepare('UPDATE leads SET stage_id = ? WHERE id = ?').bind(data.stageId, id).run();
    if (data.probability !== undefined) await c.env.DB.prepare('UPDATE leads SET probability = ? WHERE id = ?').bind(data.probability, id).run();
    if (data.title) await c.env.DB.prepare('UPDATE leads SET title = ? WHERE id = ?').bind(data.title, id).run();
    if (data.value) await c.env.DB.prepare('UPDATE leads SET value = ? WHERE id = ?').bind(data.value, id).run();
    if (data.company) await c.env.DB.prepare('UPDATE leads SET company = ? WHERE id = ?').bind(data.company, id).run();
    if (data.contactName) await c.env.DB.prepare('UPDATE leads SET contact_name = ? WHERE id = ?').bind(data.contactName, id).run();
    if (data.contactEmail) await c.env.DB.prepare('UPDATE leads SET contact_email = ? WHERE id = ?').bind(data.contactEmail, id).run();
    if (data.contactPhone) await c.env.DB.prepare('UPDATE leads SET contact_phone = ? WHERE id = ?').bind(data.contactPhone, id).run();
    if (data.funnelId) await c.env.DB.prepare('UPDATE leads SET funnel_id = ? WHERE id = ?').bind(data.funnelId, id).run();
    if (data.customValues) {
        // Need to fetch existing first to merge? Or assume frontend sends full object?
        // Simple update:
        await c.env.DB.prepare('UPDATE leads SET custom_values = ? WHERE id = ?').bind(JSON.stringify(data.customValues), id).run();
    }

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

// --- TASKS ---

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
    const task = await c.env.DB.prepare('SELECT completed FROM tasks WHERE id = ?').bind(taskId).first() as {completed: number} | null;
    if (task) {
        const newState = task.completed === 1 ? 0 : 1;
        await c.env.DB.prepare('UPDATE tasks SET completed = ? WHERE id = ?').bind(newState, taskId).run();
    }
    return c.json({ success: true });
});

export const onRequest = handle(app);
