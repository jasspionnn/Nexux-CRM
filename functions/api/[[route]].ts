
import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';

type Bindings = {
  DB: D1Database;
};

// Define o basePath como /api para coincidir com a pasta functions/api
const app = new Hono<{ Bindings: Bindings }>().basePath('/api');

// --- HEALTH CHECK ---
app.get('/health', async (c) => {
    try {
        const result = await c.env.DB.prepare('SELECT 1').first();
        return c.json({ status: 'ok', database: 'connected', result });
    } catch (e: any) {
        return c.json({ status: 'error', message: e.message }, 500);
    }
});

// --- PUBLIC CONFIG ---
app.get('/public/settings', async (c) => {
    try {
        const settings = await c.env.DB.prepare('SELECT * FROM system_settings').all();
        const config = settings.results.reduce((acc: any, curr: any) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});
        return c.json(config);
    } catch (e: any) {
        return c.json({ login_background: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=2000' });
    }
});

// --- ADMIN SETTINGS (GLOBAL) ---
app.patch('/admin/settings', async (c) => {
    const body = await c.req.json() as any;
    for (const [key, value] of Object.entries(body)) {
        await c.env.DB.prepare('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)')
            .bind(key, value).run();
    }
    return c.json({ success: true });
});

// --- AUTH ---
app.post('/auth/register', async (c) => {
    const { userName, email, password, companyName } = await c.req.json() as any;
    const accountId = `acc_${Date.now()}`;
    const userId = `u_${Date.now()}`;

    try {
        await c.env.DB.prepare(
            'INSERT INTO accounts (id, company_name, owner_name, email, status, plan, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(
            accountId, companyName, userName, email, 'active', 'trial', 
            new Date().toISOString(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        ).run();

        await c.env.DB.prepare(
            'INSERT INTO users (id, account_id, name, email, password, role, avatar, status, joined_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(
            userId, accountId, userName, email, password, 'ACCOUNT_ADMIN',
            `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=random`,
            'active', new Date().toISOString()
        ).run();

        const funnelId = `f_${Date.now()}`;
        await c.env.DB.prepare('INSERT INTO funnels (id, account_id, name) VALUES (?, ?, ?)')
            .bind(funnelId, accountId, 'Vendas Geral').run();

        const stages = [
            { id: `s1_${Date.now()}`, name: 'Lead', color: 'bg-blue-500' },
            { id: `s2_${Date.now()}`, name: 'Qualificação', color: 'bg-purple-500' },
            { id: `s3_${Date.now()}`, name: 'Proposta', color: 'bg-orange-500' },
            { id: `s4_${Date.now()}`, name: 'Fechamento', color: 'bg-green-500' }
        ];

        for (let i = 0; i < stages.length; i++) {
            await c.env.DB.prepare('INSERT INTO stages (id, funnel_id, name, color, "order") VALUES (?, ?, ?, ?, ?)')
                .bind(stages[i].id, funnelId, stages[i].name, stages[i].color, i).run();
        }

        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

app.post('/auth/login', async (c) => {
    const { email, password } = await c.req.json() as any;
    const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ? AND password = ?')
        .bind(email, password).first() as any;

    if (!user) return c.json({ error: 'Credenciais inválidas' }, 401);

    const formattedUser = {
        id: user.id,
        accountId: user.account_id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        teamId: user.team_id,
        status: user.status,
        lastLogin: new Date().toISOString()
    };

    return c.json({ user: formattedUser });
});

// --- SYNC DATA ---
app.get('/sync/:accountId', async (c) => {
    const accountId = c.req.param('accountId');
    const funnels = await c.env.DB.prepare('SELECT * FROM funnels WHERE account_id = ?').bind(accountId).all();
    const funnelIds = funnels.results.map((f: any) => f.id);
    
    let stages: any[] = [];
    if (funnelIds.length > 0) {
        const placeholders = funnelIds.map(() => '?').join(',');
        const stagesData = await c.env.DB.prepare(`SELECT * FROM stages WHERE funnel_id IN (${placeholders}) ORDER BY "order" ASC`)
            .bind(...funnelIds).all();
        stages = stagesData.results;
    }

    const leads = await c.env.DB.prepare('SELECT * FROM leads WHERE account_id = ?').bind(accountId).all();
    const users = await c.env.DB.prepare('SELECT id, account_id as accountId, name, email, role, team_id as teamId, avatar, status, joined_at as lastLogin FROM users WHERE account_id = ?').bind(accountId).all();
    const teams = await c.env.DB.prepare('SELECT * FROM teams WHERE account_id = ?').bind(accountId).all();
    const customFields = await c.env.DB.prepare('SELECT * FROM custom_fields WHERE account_id = ?').bind(accountId).all();
    
    const leadIds = leads.results.map((l: any) => l.id);
    let tasks: any[] = [];
    if (leadIds.length > 0) {
        const placeholders = leadIds.map(() => '?').join(',');
        const tasksData = await c.env.DB.prepare(`SELECT * FROM tasks WHERE lead_id IN (${placeholders})`).bind(...leadIds).all();
        tasks = tasksData.results;
    }

    const formattedFunnels = funnels.results.map((f: any) => ({
        id: f.id,
        accountId: f.account_id,
        name: f.name,
        stages: stages.filter((s: any) => s.funnel_id === f.id).map((s: any) => ({
            id: s.id,
            name: s.name,
            color: s.color,
            order: s.order
        }))
    }));

    const formattedLeads = leads.results.map((l: any) => ({
        id: l.id,
        accountId: l.account_id,
        title: l.title,
        company: l.company,
        value: l.value,
        contactName: l.contactName,
        contactEmail: l.contactEmail,
        contactPhone: l.contactPhone,
        funnelId: l.funnel_id,
        stageId: l.stage_id,
        assignedUserId: l.assigned_user_id,
        createdAt: l.created_at,
        probability: l.probability,
        notes: JSON.parse(l.notes || '[]'),
        tasks: tasks.filter((t: any) => t.lead_id === l.id).map((t: any) => ({
            id: t.id,
            title: t.title,
            dueDate: t.due_date,
            completed: !!t.completed,
            type: t.type
        })),
        tags: JSON.parse(l.tags || '[]'),
        customValues: JSON.parse(l.custom_values || '{}')
    }));

    return c.json({
        funnels: formattedFunnels,
        leads: formattedLeads,
        users: users.results,
        teams: teams.results,
        customFields: customFields.results.map((cf: any) => ({
            id: cf.id,
            accountId: cf.account_id,
            name: cf.name,
            type: cf.type,
            context: cf.context,
            funnelId: cf.funnel_id,
            options: JSON.parse(cf.options || '[]'),
            visibleStageIds: JSON.parse(cf.visible_stage_ids || '[]')
        }))
    });
});

// --- OUTRAS ROTAS SIMPLIFICADAS ---
app.get('/admin/accounts', async (c) => {
    const accounts = await c.env.DB.prepare('SELECT * FROM accounts ORDER BY created_at DESC').all();
    return c.json({ accounts: accounts.results });
});

app.post('/leads', async (c) => {
    const l = await c.req.json() as any;
    await c.env.DB.prepare('INSERT INTO leads (id, account_id, title, company, value, funnel_id, stage_id, assigned_user_id, created_at, probability) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(l.id, l.accountId, l.title, l.company, l.value, l.funnelId, l.stageId, l.assignedUserId, l.createdAt, l.probability).run();
    return c.json({ success: true });
});

app.patch('/leads/:id', async (c) => {
    const id = c.req.param('id');
    const data = await c.req.json() as any;
    const fields = []; const values = [];
    if (data.stageId) { fields.push('stage_id = ?'); values.push(data.stageId); }
    if (data.funnelId) { fields.push('funnel_id = ?'); values.push(data.funnelId); }
    if (data.probability !== undefined) { fields.push('probability = ?'); values.push(data.probability); }
    if (fields.length > 0) await c.env.DB.prepare(`UPDATE leads SET ${fields.join(', ')} WHERE id = ?`).bind(...values, id).run();
    return c.json({ success: true });
});

// Catch-all
app.all('*', (c) => c.json({ error: `Not Found: ${c.req.path}` }, 404));

export const onRequest = handle(app);
