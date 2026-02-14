
import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>().basePath('/api');

// Migrations automáticas e Garantia de Tabelas
app.use('*', async (c, next) => {
    // Tabelas de IA e Bot
    await c.env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS knowledge_sources (
            id TEXT PRIMARY KEY,
            account_id TEXT NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            content TEXT,
            url TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
    `).run();
    await c.env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS bot_instances (
            account_id TEXT PRIMARY KEY,
            whatsapp_status TEXT DEFAULT 'disconnected',
            whatsapp_number TEXT,
            active INTEGER DEFAULT 1,
            last_trained_at TEXT
        )
    `).run();
    await c.env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS webhooks (
            id TEXT PRIMARY KEY,
            account_id TEXT NOT NULL,
            name TEXT NOT NULL,
            funnel_id TEXT NOT NULL,
            stage_id TEXT NOT NULL,
            active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now'))
        )
    `).run();
    await next();
});

// --- KNOWLEDGE BASE ---
app.get('/knowledge/:accountId', async (c) => {
    const result = await c.env.DB.prepare('SELECT * FROM knowledge_sources WHERE account_id = ? ORDER BY created_at DESC').bind(c.req.param('accountId')).all();
    return c.json(result.results);
});

app.post('/knowledge', async (c) => {
    const data = await c.req.json() as any;
    await c.env.DB.prepare(
        'INSERT INTO knowledge_sources (id, account_id, name, type, content, url) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(data.id, data.accountId, data.name, data.type, data.content || null, data.url || null).run();
    return c.json({ success: true });
});

app.delete('/knowledge/:id', async (c) => {
    await c.env.DB.prepare('DELETE FROM knowledge_sources WHERE id = ?').bind(c.req.param('id')).run();
    return c.json({ success: true });
});

// --- BOT INSTANCE ---
app.get('/bot/:accountId', async (c) => {
    let bot = await c.env.DB.prepare('SELECT * FROM bot_instances WHERE account_id = ?').bind(c.req.param('accountId')).first();
    if (!bot) {
        await c.env.DB.prepare('INSERT INTO bot_instances (account_id) VALUES (?)').bind(c.req.param('accountId')).run();
        bot = { account_id: c.req.param('accountId'), whatsapp_status: 'disconnected', active: 1 };
    }
    return c.json(bot);
});

app.patch('/bot/:accountId', async (c) => {
    const data = await c.req.json() as any;
    const fields: string[] = [];
    const values: any[] = [];
    if (data.whatsapp_status !== undefined) { fields.push('whatsapp_status = ?'); values.push(data.whatsapp_status); }
    if (data.whatsapp_number !== undefined) { fields.push('whatsapp_number = ?'); values.push(data.whatsapp_number); }
    if (data.active !== undefined) { fields.push('active = ?'); values.push(data.active ? 1 : 0); }
    if (data.last_trained_at !== undefined) { fields.push('last_trained_at = ?'); values.push(data.last_trained_at); }
    
    if (fields.length > 0) {
        await c.env.DB.prepare(`UPDATE bot_instances SET ${fields.join(', ')} WHERE account_id = ?`).bind(...values, c.req.param('accountId')).run();
    }
    return c.json({ success: true });
});

// --- WEBHOOKS ---
app.get('/webhooks/:accountId', async (c) => {
    const result = await c.env.DB.prepare('SELECT * FROM webhooks WHERE account_id = ?').bind(c.req.param('accountId')).all();
    return c.json(result.results);
});

app.post('/webhooks', async (c) => {
    const w = await c.req.json() as any;
    await c.env.DB.prepare('INSERT INTO webhooks (id, account_id, name, funnel_id, stage_id, active) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(w.id, w.accountId, w.name, w.funnelId, w.stageId, w.active ? 1 : 0).run();
    return c.json({ success: true });
});

// --- CRM SYNC & LEADS ---
app.get('/sync/:accountId', async (c) => {
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
            stages: stages.filter((s: any) => s.funnel_id === f.id).map((s: any) => ({ id: s.id, name: s.name, color: s.color, order: s.order }))
        })),
        leads: leads.results.map((l: any) => ({
            ...l,
            notes: JSON.parse(l.notes || '[]'),
            tasks: JSON.parse(l.tasks || '[]'),
            tags: JSON.parse(l.tags || '[]'),
            customValues: JSON.parse(l.custom_values || '{}'),
            contactName: l.contact_name,
            contactEmail: l.contact_email,
            contactPhone: l.contact_phone,
            funnelId: l.funnel_id,
            stageId: l.stage_id,
            assignedUserId: l.assigned_user_id
        })),
        users: users.results,
        teams: teams.results,
        customFields: customFields.results.map((cf: any) => ({
            ...cf,
            options: JSON.parse(cf.options || '[]'),
            visibleStageIds: JSON.parse(cf.visible_stage_ids || '[]'),
            funnelId: cf.funnel_id
        }))
    });
});

app.post('/leads', async (c) => {
    const l = await c.req.json() as any;
    await c.env.DB.prepare(`
        INSERT INTO leads (id, account_id, title, company, value, contact_name, contact_email, contact_phone, funnel_id, stage_id, assigned_user_id, probability, tasks, notes, tags, custom_values, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(l.id, l.accountId, l.title, l.company, l.value, l.contactName, l.contactEmail, l.contactPhone, l.funnelId, l.stageId, l.assignedUserId, l.probability, JSON.stringify(l.tasks || []), JSON.stringify(l.notes || []), JSON.stringify(l.tags || []), JSON.stringify(l.customValues || {}), l.createdAt).run();
    return c.json({ success: true });
});

app.patch('/leads/:id', async (c) => {
    const id = c.req.param('id');
    const data = await c.req.json() as any;
    const fields: string[] = [];
    const values: any[] = [];
    
    const map = {
        title: 'title',
        stageId: 'stage_id',
        funnelId: 'funnel_id',
        contactName: 'contact_name',
        contactEmail: 'contact_email',
        contactPhone: 'contact_phone',
        company: 'company',
        value: 'value',
        assignedUserId: 'assigned_user_id',
        probability: 'probability',
        tags: 'tags',
        customValues: 'custom_values',
        notes: 'notes',
        tasks: 'tasks'
    };

    for (const [key, dbKey] of Object.entries(map)) {
        if (data[key] !== undefined) {
            fields.push(`${dbKey} = ?`);
            values.push(typeof data[key] === 'object' ? JSON.stringify(data[key]) : data[key]);
        }
    }

    if (fields.length > 0) {
        await c.env.DB.prepare(`UPDATE leads SET ${fields.join(', ')} WHERE id = ?`).bind(...values, id).run();
    }
    return c.json({ success: true });
});

// --- AUTH ---
app.post('/auth/login', async (c) => {
    const { email, password } = await c.req.json() as any;
    const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ? AND password = ?')
        .bind(email, password).first() as any;
    if (!user) return c.json({ error: 'Credenciais inválidas' }, 401);
    return c.json({ user: { id: user.id, accountId: user.account_id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } });
});

app.post('/auth/register', async (c) => {
    const { userName, email, password, companyName } = await c.req.json() as any;
    const accountId = `acc_${Date.now()}`;
    const userId = `u_${Date.now()}`;
    await c.env.DB.batch([
        c.env.DB.prepare('INSERT INTO accounts (id, company_name, owner_name, email) VALUES (?, ?, ?, ?)').bind(accountId, companyName, userName, email),
        c.env.DB.prepare('INSERT INTO users (id, account_id, name, email, password, role, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(userId, accountId, userName, email, password, 'ACCOUNT_ADMIN', `https://ui-avatars.com/api/?name=${userName}`)
    ]);
    return c.json({ success: true });
});

// --- SETTINGS ---
app.get('/public/settings', async (c) => {
    const result = await c.env.DB.prepare('SELECT * FROM system_settings').all();
    const config = result.results.reduce((acc: any, curr: any) => { acc[curr.key] = curr.value; return acc; }, {});
    return c.json(config);
});

app.patch('/admin/settings', async (c) => {
    const body = await c.req.json() as any;
    for (const [key, value] of Object.entries(body)) {
        await c.env.DB.prepare('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)').bind(key, String(value)).run();
    }
    return c.json({ success: true });
});

export const onRequest = handle(app);
