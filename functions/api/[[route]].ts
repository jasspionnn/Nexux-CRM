
import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// --- HEALTH CHECK ---
app.get('/health', async (c) => {
    try {
        await c.env.DB.prepare('SELECT 1').first();
        return c.json({ status: 'ok', database: 'connected' });
    } catch (e: any) {
        return c.json({ status: 'error', message: e.message }, 500);
    }
});

// --- PUBLIC CONFIG ---
app.get('/public/settings', async (c) => {
    const settings = await c.env.DB.prepare('SELECT * FROM system_settings').all();
    const config = settings.results.reduce((acc: any, curr: any) => {
        acc[curr.key] = curr.value;
        return acc;
    }, {});
    return c.json(config);
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

// --- NEXUS ADMIN: ACCOUNTS MANAGEMENT ---
app.get('/admin/accounts', async (c) => {
    try {
        const accounts = await c.env.DB.prepare('SELECT * FROM accounts ORDER BY created_at DESC').all();
        const formatted = accounts.results.map((a: any) => ({
            id: a.id,
            companyName: a.company_name,
            ownerName: a.owner_name,
            email: a.email,
            status: a.status,
            plan: a.plan,
            expiresAt: a.expires_at,
            createdAt: a.created_at,
            visibilityConfig: JSON.parse(a.visibility_config || '{"level":"public","allowUserExport":false,"showTeamGoals":true}')
        }));
        return c.json({ accounts: formatted });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

app.post('/admin/accounts', async (c) => {
    const { companyName, ownerName, email, password, plan } = await c.req.json() as any;
    const accountId = `acc_${Date.now()}`;
    const userId = `u_${Date.now()}`;

    await c.env.DB.prepare(
        'INSERT INTO accounts (id, company_name, owner_name, email, status, plan, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
        accountId, companyName, ownerName, email, 'active', plan || 'pro', 
        new Date().toISOString(), new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    ).run();

    await c.env.DB.prepare(
        'INSERT INTO users (id, account_id, name, email, password, role, avatar, status, joined_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
        userId, accountId, ownerName, email, password || '123', 'ACCOUNT_ADMIN',
        `https://ui-avatars.com/api/?name=${encodeURIComponent(ownerName)}&background=random`,
        'active', new Date().toISOString()
    ).run();

    return c.json({ success: true });
});

app.patch('/admin/accounts/:id', async (c) => {
    const id = c.req.param('id');
    const data = await c.req.json() as any;
    const fields = []; const values = [];
    if (data.status) { fields.push('status = ?'); values.push(data.status); }
    if (data.plan) { fields.push('plan = ?'); values.push(data.plan); }
    if (data.visibilityConfig) { fields.push('visibility_config = ?'); values.push(JSON.stringify(data.visibilityConfig)); }
    if (data.expiresAt) { fields.push('expires_at = ?'); values.push(data.expiresAt); }
    if (fields.length > 0) await c.env.DB.prepare(`UPDATE accounts SET ${fields.join(', ')} WHERE id = ?`).bind(...values, id).run();
    return c.json({ success: true });
});

// --- AUTH ---
app.post('/auth/register', async (c) => {
    const { userName, email, password, companyName } = await c.req.json() as any;
    const accountId = `acc_${Date.now()}`;
    const userId = `u_${Date.now()}`;

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
        defaultWonStageId: f.default_won_stage_id,
        defaultLostStageId: f.default_lost_stage_id,
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
        contactName: l.contact_name,
        contactEmail: l.contact_email,
        contactPhone: l.contact_phone,
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

    const formattedFields = customFields.results.map((cf: any) => ({
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
        funnels: formattedFunnels,
        leads: formattedLeads,
        users: users.results,
        teams: teams.results,
        customFields: formattedFields
    });
});

// --- USERS ---
app.post('/users', async (c) => {
    try {
        const data = await c.req.json() as any;
        const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(data.email).first();
        if (existing) return c.json({ error: 'Este e-mail já está sendo utilizado.' }, 400);

        await c.env.DB.prepare('INSERT INTO users (id, account_id, name, email, password, role, team_id, avatar, status, joined_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
            .bind(data.id, data.accountId, data.name, data.email, data.password || 'nexus123', data.role, data.teamId || null, data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=random`, data.status || 'active', data.joinedAt || new Date().toISOString()).run();
        
        return c.json({ success: true });
    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
});

app.patch('/users/:id', async (c) => {
    const id = c.req.param('id');
    const data = await c.req.json() as any;
    const fieldMapping: Record<string, string> = { role: 'role', teamId: 'team_id', status: 'status', name: 'name', avatar: 'avatar' };
    const updates = Object.entries(data).filter(([key]) => fieldMapping[key]).map(([key]) => `${fieldMapping[key]} = ?`).join(', ');
    const values = Object.entries(data).filter(([key]) => fieldMapping[key]).map(([, val]) => val);
    if (updates) await c.env.DB.prepare(`UPDATE users SET ${updates} WHERE id = ?`).bind(...values, id).run();
    return c.json({ success: true });
});

app.delete('/users/:id', async (c) => {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
    return c.json({ success: true });
});

// --- FUNNELS ---
app.post('/funnels', async (c) => {
    const f = await c.req.json() as any;
    await c.env.DB.prepare('INSERT INTO funnels (id, account_id, name) VALUES (?, ?, ?)')
        .bind(f.id, f.accountId, f.name).run();
    if (f.stages) {
        for (const s of f.stages) {
            await c.env.DB.prepare('INSERT INTO stages (id, funnel_id, name, color, "order") VALUES (?, ?, ?, ?, ?)')
                .bind(s.id, f.id, s.name, s.color, s.order).run();
        }
    }
    return c.json({ success: true });
});

app.patch('/funnels/:id', async (c) => {
    const id = c.req.param('id');
    const data = await c.req.json() as any;
    const fields = []; const values = [];
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.defaultWonStageId !== undefined) { fields.push('default_won_stage_id = ?'); values.push(data.defaultWonStageId); }
    if (data.defaultLostStageId !== undefined) { fields.push('default_lost_stage_id = ?'); values.push(data.defaultLostStageId); }
    if (fields.length > 0) await c.env.DB.prepare(`UPDATE funnels SET ${fields.join(', ')} WHERE id = ?`).bind(...values, id).run();

    if (data.stages) {
        const batch = [];
        for (const s of data.stages) {
            batch.push(c.env.DB.prepare('INSERT INTO stages (id, funnel_id, name, color, "order") VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, color=excluded.color, "order"=excluded."order"').bind(s.id, id, s.name, s.color, s.order));
        }
        const currentStageIds = data.stages.map((s: any) => s.id);
        if (currentStageIds.length > 0) {
            const placeholders = currentStageIds.map(() => '?').join(',');
            try { await c.env.DB.prepare(`DELETE FROM stages WHERE funnel_id = ? AND id NOT IN (${placeholders})`).bind(id, ...currentStageIds).run(); } catch (e) {}
        }
        if (batch.length > 0) await c.env.DB.batch(batch);
    }
    return c.json({ success: true });
});

app.delete('/funnels/:id', async (c) => {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM funnels WHERE id = ?').bind(id).run();
    return c.json({ success: true });
});

// --- CUSTOM FIELDS ---
app.post('/custom-fields', async (c) => {
    const cf = await c.req.json() as any;
    await c.env.DB.prepare('INSERT INTO custom_fields (id, account_id, name, type, context, funnel_id, options, visible_stage_ids) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(cf.id, cf.accountId, cf.name, cf.type, cf.context, cf.funnelId, JSON.stringify(cf.options || []), JSON.stringify(cf.visibleStageIds || [])).run();
    return c.json({ success: true });
});

app.patch('/custom-fields/:id', async (c) => {
    const id = c.req.param('id');
    const data = await c.req.json() as any;
    const fieldMapping: Record<string, string> = { name: 'name', type: 'type', context: 'context', funnelId: 'funnel_id', options: 'options', visibleStageIds: 'visible_stage_ids' };
    const updates = Object.entries(data).filter(([key]) => fieldMapping[key]).map(([key]) => `${fieldMapping[key]} = ?`).join(', ');
    const values = Object.entries(data).filter(([key]) => fieldMapping[key]).map(([, val]) => typeof val === 'object' ? JSON.stringify(val) : val);
    if (updates) await c.env.DB.prepare(`UPDATE custom_fields SET ${updates} WHERE id = ?`).bind(...values, id).run();
    return c.json({ success: true });
});

app.delete('/custom-fields/:id', async (c) => {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM custom_fields WHERE id = ?').bind(id).run();
    return c.json({ success: true });
});

// --- LEADS ---
app.post('/leads', async (c) => {
    const l = await c.req.json() as any;
    await c.env.DB.prepare('INSERT INTO leads (id, account_id, title, company, value, contact_name, contact_email, contact_phone, funnel_id, stage_id, assigned_user_id, created_at, probability, notes, tags, custom_values) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(l.id, l.accountId, l.title, l.company, l.value, l.contactName, l.contactEmail, l.contactPhone, l.funnelId, l.stageId, l.assignedUserId, l.createdAt, l.probability, JSON.stringify(l.notes || []), JSON.stringify(l.tags || []), JSON.stringify(l.customValues || {})).run();
    return c.json({ success: true });
});

app.patch('/leads/:id', async (c) => {
    const id = c.req.param('id');
    const data = await c.req.json() as any;
    const fieldMapping: Record<string, string> = { stageId: 'stage_id', funnelId: 'funnel_id', probability: 'probability', notes: 'notes', title: 'title', company: 'company', value: 'value', customValues: 'custom_values' };
    const updates = Object.entries(data).filter(([key]) => fieldMapping[key]).map(([key]) => `${fieldMapping[key]} = ?`).join(', ');
    const values = Object.entries(data).filter(([key]) => fieldMapping[key]).map(([, val]) => typeof val === 'object' ? JSON.stringify(val) : val);
    if (updates) await c.env.DB.prepare(`UPDATE leads SET ${updates} WHERE id = ?`).bind(...values, id).run();
    return c.json({ success: true });
});

app.delete('/leads/:id', async (c) => {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM leads WHERE id = ?').bind(id).run();
    return c.json({ success: true });
});

// --- TEAMS ---
app.post('/teams', async (c) => {
    const data = await c.req.json() as any;
    await c.env.DB.prepare('INSERT INTO teams (id, account_id, name, goal) VALUES (?, ?, ?, ?)')
        .bind(data.id, data.accountId, data.name, data.goal).run();
    return c.json({ success: true });
});

app.patch('/teams/:id', async (c) => {
    const id = c.req.param('id');
    const data = await c.req.json() as any;
    const fields = []; const values = [];
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.goal !== undefined) { fields.push('goal = ?'); values.push(data.goal); }
    if (fields.length) await c.env.DB.prepare(`UPDATE teams SET ${fields.join(', ')} WHERE id = ?`).bind(...values, id).run();
    return c.json({ success: true });
});

app.delete('/teams/:id', async (c) => {
    const id = c.req.param('id');
    await c.env.DB.prepare('UPDATE users SET team_id = NULL WHERE team_id = ?').bind(id).run();
    await c.env.DB.prepare('DELETE FROM teams WHERE id = ?').bind(id).run();
    return c.json({ success: true });
});

// --- TASKS ---
app.post('/tasks', async (c) => {
    const t = await c.req.json() as any;
    await c.env.DB.prepare('INSERT INTO tasks (id, lead_id, title, due_date, completed, type) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(t.id, t.leadId, t.title, t.dueDate, t.completed ? 1 : 0, t.type).run();
    return c.json({ success: true });
});

app.patch('/tasks/:id/toggle', async (c) => {
    const id = c.req.param('id');
    await c.env.DB.prepare('UPDATE tasks SET completed = 1 - completed WHERE id = ?').bind(id).run();
    return c.json({ success: true });
});

app.delete('/tasks/:id', async (c) => {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM tasks WHERE id = ?').bind(id).run();
    return c.json({ success: true });
});

// --- BILLING DUMMY ---
app.post('/billing/upgrade', async (c) => {
    return c.json({ success: true });
});

export const onRequest = handle(app);
