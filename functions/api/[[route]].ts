
import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';
import { cors } from 'hono/cors';

type Bindings = {
  DB: D1Database;
  VECTORIZE: any;
  AI: any;
};

const app = new Hono<{ Bindings: Bindings }>().basePath('/api');

// Habilitar CORS para desenvolvimento
app.use('*', cors());

// --- MIDDLEWARE DE ERRO GLOBAL ---
app.onError((err, c) => {
  console.error(`[API ERROR]: ${err.message}`);
  return c.json({ 
    error: "Erro de conexão com o banco de dados", 
    details: err.message,
    status: 500 
  }, 500);
});

const generateId = (prefix: string) => `${prefix}_${crypto.randomUUID().split('-')[0]}`;

const safeParse = (val: any) => {
    if (!val) return [];
    if (typeof val === 'object') return val;
    try { return JSON.parse(val); } catch { return []; }
};

// --- AUTH ---
app.post('/auth/login', async (c) => {
    const { email, password } = await c.req.json() as any;
    
    // Verificação de segurança: Garantir que o DB está vinculado
    if (!c.env.DB) throw new Error("Binding 'DB' não encontrado no ambiente.");

    const user = await c.env.DB.prepare(
        'SELECT * FROM users WHERE email = ? AND password = ? AND status = "active"'
    ).bind(email, password).first();

    if (!user) return c.json({ error: "Credenciais inválidas ou usuário inativo." }, 401);
    
    await c.env.DB.prepare('UPDATE users SET last_login = ? WHERE id = ?')
        .bind(new Date().toISOString(), (user as any).id).run();

    return c.json({ user });
});

app.post('/auth/register', async (c) => {
    const { userName, email, password, companyName } = await c.req.json() as any;
    const accountId = generateId('acc');
    const userId = generateId('u');

    try {
        await c.env.DB.batch([
            c.env.DB.prepare('INSERT INTO accounts (id, company_name, owner_name, email, status, plan) VALUES (?, ?, ?, ?, "active", "pro")')
                .bind(accountId, companyName, userName, email),
            c.env.DB.prepare('INSERT INTO users (id, account_id, name, email, password, role, status, avatar) VALUES (?, ?, ?, ?, ?, "ACCOUNT_ADMIN", "active", ?)')
                .bind(userId, accountId, userName, email, password, `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}`)
        ]);
        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ error: "Falha ao registrar conta: " + e.message }, 500);
    }
});

// --- SYNC (MOTOR DE DADOS) ---
app.get('/sync/:accountId', async (c) => {
    const accountId = c.req.param('accountId');
    
    // Execução paralela para performance profissional
    const [funnels, leads, users, teams, fields] = await Promise.all([
        c.env.DB.prepare('SELECT * FROM funnels WHERE account_id = ?').bind(accountId).all(),
        c.env.DB.prepare('SELECT * FROM leads WHERE account_id = ? ORDER BY created_at DESC').bind(accountId).all(),
        c.env.DB.prepare('SELECT id, name, email, role, avatar, team_id, status FROM users WHERE account_id = ?').bind(accountId).all(),
        c.env.DB.prepare('SELECT * FROM teams WHERE account_id = ?').bind(accountId).all(),
        c.env.DB.prepare('SELECT * FROM custom_fields WHERE account_id = ?').bind(accountId).all()
    ]);

    const formattedFunnels = (funnels.results || []).map((f: any) => ({
        ...f,
        stages: safeParse(f.stages)
    }));

    const formattedLeads = (leads.results || []).map((l: any) => ({
        ...l,
        notes: safeParse(l.notes),
        tasks: safeParse(l.tasks),
        tags: safeParse(l.tags),
        customValues: safeParse(l.custom_values)
    }));

    return c.json({
        funnels: formattedFunnels,
        leads: formattedLeads,
        users: users.results || [],
        teams: teams.results || [],
        customFields: (fields.results || []).map((cf: any) => ({ 
            ...cf, 
            options: safeParse(cf.options), 
            visibleStageIds: safeParse(cf.visible_stage_ids) 
        }))
    });
});

// --- CRUD GENÉRICO (Funnels, Leads, etc) ---
app.post('/funnels', async (c) => {
    const f = await c.req.json() as any;
    await c.env.DB.prepare(
        'INSERT INTO funnels (id, account_id, name, stages) VALUES (?, ?, ?, ?)'
    ).bind(f.id, f.accountId, f.name, JSON.stringify(f.stages || [])).run();
    return c.json({ success: true });
});

app.patch('/leads/:id', async (c) => {
    const id = c.req.param('id');
    const updates = await c.req.json() as any;
    const keys = Object.keys(updates);
    if (keys.length === 0) return c.json({ success: true });

    const setClause = keys.map(k => {
        const dbKey = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        return `${dbKey} = ?`;
    }).join(', ');

    const values = keys.map(k => {
        const val = updates[k];
        return (typeof val === 'object' && val !== null) ? JSON.stringify(val) : val;
    });

    await c.env.DB.prepare(`UPDATE leads SET ${setClause} WHERE id = ?`)
        .bind(...values, id).run();
    
    return c.json({ success: true });
});

app.get('/admin/accounts', async (c) => {
    const { results } = await c.env.DB.prepare('SELECT * FROM accounts ORDER BY created_at DESC').all();
    return c.json({ accounts: results || [] });
});

app.get('/public/settings', async (c) => {
    const { results } = await c.env.DB.prepare('SELECT key, value FROM system_settings').all();
    const settings = results.reduce((acc: any, cur: any) => ({ ...acc, [cur.key]: cur.value }), {});
    return c.json(settings);
});

export const onRequest = handle(app);
