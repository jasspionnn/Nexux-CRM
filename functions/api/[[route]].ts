import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';

type Bindings = {
  DB: D1Database;
};

/**
 * Nexus CRM - Centralized API Router
 * We avoid .basePath('/api') here because Cloudflare Pages filesystem routing
 * already directs requests starting with /api to this file. 
 * Using absolute paths inside Hono is more reliable across different environments.
 */
const app = new Hono<{ Bindings: Bindings }>();

// Global Error Handler
app.onError((err, c) => {
  console.error(`[API ERROR] ${c.req.method} ${c.req.path}:`, err);
  
  if (err.message.includes('no such table')) {
    return c.json({ 
      error: "Banco de dados não inicializado. Execute o esquema SQL no seu console D1.",
      details: err.message,
      status: 500
    }, 500);
  }

  return c.json({ 
    error: err.message || 'Erro interno no servidor',
    status: 500
  }, 500);
});

// JSON 404 Handler
app.notFound((c) => {
  console.warn(`[API 404] ${c.req.method} ${c.req.path}`);
  return c.json({ 
    error: 'Endpoint não encontrado no Nexus Router', 
    requestedPath: c.req.path 
  }, 404);
});

// --- SYSTEM & HEALTH ---

app.get('/api/health', async (c) => {
    try {
        if (!c.env.DB) {
            return c.json({ status: 'error', message: 'DB binding is missing.' }, 500);
        }
        // Test connectivity
        await c.env.DB.prepare('SELECT 1').first();
        return c.json({ status: 'ok', database: 'connected', time: new Date().toISOString() });
    } catch (e: any) {
        return c.json({ status: 'error', error: e.message }, 500);
    }
});

app.get('/api/public/settings', async (c) => {
    try {
        const settings = await c.env.DB.prepare('SELECT * FROM system_settings').all();
        const config = settings.results.reduce((acc: any, curr: any) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});
        return c.json(config);
    } catch (e) {
        // Return default settings if table doesn't exist yet
        return c.json({ 
            login_background: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=2000' 
        });
    }
});

// --- AUTH ---

app.post('/api/auth/login', async (c) => {
    const { email, password } = await c.req.json() as any;
    const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ? AND password = ?')
        .bind(email, password).first() as any;
    
    if (!user) {
        return c.json({ error: 'Credenciais inválidas' }, 401);
    }
    
    return c.json({ 
        user: {
            id: user.id,
            accountId: user.account_id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar
        }
    });
});

app.post('/api/auth/register', async (c) => {
    const { userName, email, password, companyName } = await c.req.json() as any;
    const accountId = `acc_${Date.now()}`;
    const userId = `u_${Date.now()}`;
    
    await c.env.DB.batch([
        c.env.DB.prepare('INSERT INTO accounts (id, company_name, owner_name, email) VALUES (?, ?, ?, ?)').bind(accountId, companyName, userName, email),
        c.env.DB.prepare('INSERT INTO users (id, account_id, name, email, password, role, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(userId, accountId, userName, email, password, 'ACCOUNT_ADMIN', `https://ui-avatars.com/api/?name=${userName}`)
    ]);
    
    return c.json({ success: true });
});

// --- DATA SYNC ---

app.get('/api/sync/:accountId', async (c) => {
    const accountId = c.req.param('accountId');
    const [funnels, leads, users, teams, customFields] = await Promise.all([
        c.env.DB.prepare('SELECT * FROM funnels WHERE account_id = ?').bind(accountId).all(),
        c.env.DB.prepare('SELECT * FROM leads WHERE account_id = ?').bind(accountId).all(),
        c.env.DB.prepare('SELECT id, account_id as accountId, name, email, role, team_id as teamId, avatar, status FROM users WHERE account_id = ?').bind(accountId).all(),
        c.env.DB.prepare('SELECT * FROM teams WHERE account_id = ?').bind(accountId).all(),
        c.env.DB.prepare('SELECT * FROM custom_fields WHERE account_id = ?').bind(accountId).all()
    ]);

    let stages: any[] = [];
    if (funnels.results.length > 0) {
        const ids = funnels.results.map((f: any) => f.id);
        const placeholders = ids.map(() => '?').join(',');
        const stagesData = await c.env.DB.prepare(`SELECT * FROM stages WHERE funnel_id IN (${placeholders}) ORDER BY "order" ASC`)
            .bind(...ids).all();
        stages = stagesData.results;
    }

    return c.json({
        funnels: funnels.results.map((f: any) => ({
            id: f.id,
            name: f.name,
            stages: stages.filter((s: any) => s.funnel_id === f.id).map((s: any) => ({ 
                id: s.id, 
                name: s.name, 
                color: s.color, 
                order: s.order 
            }))
        })),
        leads: leads.results.map((l: any) => ({
            id: l.id,
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
            notes: JSON.parse(l.notes || '[]'),
            tasks: JSON.parse(l.tasks || '[]'),
            tags: JSON.parse(l.tags || '[]'),
            customValues: JSON.parse(l.custom_values || '{}'),
            createdAt: l.created_at
        })),
        users: users.results,
        teams: teams.results,
        customFields: customFields.results.map((cf: any) => ({
            id: cf.id,
            name: cf.name,
            type: cf.type,
            context: cf.context,
            funnelId: cf.funnel_id,
            options: JSON.parse(cf.options || '[]'),
            visibleStageIds: JSON.parse(cf.visible_stage_ids || '[]')
        }))
    });
});

// --- ADMIN ---

app.get('/api/admin/accounts', async (c) => {
    const result = await c.env.DB.prepare('SELECT * FROM accounts').all();
    return c.json({ accounts: result.results });
});

app.patch('/api/admin/settings', async (c) => {
    const body = await c.req.json() as any;
    for (const [key, value] of Object.entries(body)) {
        await c.env.DB.prepare('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)').bind(key, String(value)).run();
    }
    return c.json({ success: true });
});

// --- LEADS ---

app.post('/api/leads', async (c) => {
    const l = await c.req.json() as any;
    await c.env.DB.prepare(`
        INSERT INTO leads (id, account_id, title, company, value, contact_name, contact_email, contact_phone, funnel_id, stage_id, assigned_user_id, probability, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(l.id, l.accountId, l.title, l.company, l.value, l.contactName, l.contactEmail, l.contactPhone, l.funnelId, l.stageId, l.assignedUserId, l.probability, l.createdAt).run();
    return c.json({ success: true });
});

app.patch('/api/leads/:id', async (c) => {
    const id = c.req.param('id');
    const data = await c.req.json() as any;
    const fields: string[] = [];
    const values: any[] = [];
    
    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
    if (data.stageId !== undefined) { fields.push('stage_id = ?'); values.push(data.stageId); }
    if (data.funnelId !== undefined) { fields.push('funnel_id = ?'); values.push(data.funnelId); }
    if (data.customValues !== undefined) { fields.push('custom_values = ?'); values.push(JSON.stringify(data.customValues)); }
    if (data.notes !== undefined) { fields.push('notes = ?'); values.push(JSON.stringify(data.notes)); }
    
    if (fields.length > 0) {
        await c.env.DB.prepare(`UPDATE leads SET ${fields.join(', ')} WHERE id = ?`).bind(...values, id).run();
    }
    return c.json({ success: true });
});

app.delete('/api/leads/:id', async (c) => {
    await c.env.DB.prepare('DELETE FROM leads WHERE id = ?').bind(c.req.param('id')).run();
    return c.json({ success: true });
});

export const onRequest = handle(app);