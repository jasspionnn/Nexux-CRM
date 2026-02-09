import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';

type Bindings = {
  DB: D1Database;
};

// Ao usar .basePath('/api'), o Hono automaticamente ignora o prefixo "/api" nas requisições 
// recebidas do Cloudflare, permitindo definir as rotas de forma limpa e evitando erros 404.
const app = new Hono<{ Bindings: Bindings }>().basePath('/api');

// Manipulador de erro global para capturar falhas de banco de dados ou lógica
app.onError((err, c) => {
  console.error(`Backend Error: ${err.message}`);
  return c.json({ 
    error: err.message || 'Erro interno no servidor',
    details: err.stack
  }, 500);
});

// --- HEALTH CHECK ---
app.get('/health', async (c) => {
    try {
        await c.env.DB.prepare('SELECT 1').first();
        return c.json({ status: 'ok', database: 'connected' });
    } catch (e: any) {
        return c.json({ status: 'error', message: e.message }, 500);
    }
});

// --- SETTINGS ---
app.get('/public/settings', async (c) => {
    try {
        const settings = await c.env.DB.prepare('SELECT * FROM system_settings').all();
        const config = settings.results.reduce((acc: any, curr: any) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});
        return c.json(config);
    } catch (e) {
        // Fallback para não quebrar a tela de login se o banco estiver vazio
        return c.json({ login_background: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=2000' });
    }
});

app.patch('/admin/settings', async (c) => {
    const body = await c.req.json() as any;
    try {
        for (const [key, value] of Object.entries(body)) {
            // Verifica se o valor não é nulo/undefined antes de salvar
            const safeValue = value === null || value === undefined ? '' : String(value);
            
            await c.env.DB.prepare('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)')
                .bind(key, safeValue).run();
        }
        return c.json({ success: true });
    } catch (e: any) {
        console.error("Erro ao salvar configurações:", e.message);
        return c.json({ error: `Falha no Banco: ${e.message}. Verifique o tamanho dos dados (limite 1MB).` }, 500);
    }
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
            { id: `s2_${Date.now()}`, name: 'Venda', color: 'bg-green-500' }
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

    return c.json({ 
        user: {
            id: user.id,
            accountId: user.account_id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            teamId: user.team_id,
            status: user.status,
            lastLogin: new Date().toISOString()
        }
    });
});

// --- SYNC ---
app.get('/sync/:accountId', async (c) => {
    const accountId = c.req.param('accountId');
    
    const [funnels, leads, users, teams, customFields] = await Promise.all([
        c.env.DB.prepare('SELECT * FROM funnels WHERE account_id = ?').bind(accountId).all(),
        c.env.DB.prepare('SELECT * FROM leads WHERE account_id = ?').bind(accountId).all(),
        c.env.DB.prepare('SELECT id, account_id as accountId, name, email, role, team_id as teamId, avatar, status, joined_at as lastLogin FROM users WHERE account_id = ?').bind(accountId).all(),
        c.env.DB.prepare('SELECT * FROM teams WHERE account_id = ?').bind(accountId).all(),
        c.env.DB.prepare('SELECT * FROM custom_fields WHERE account_id = ?').bind(accountId).all()
    ]);

    const funnelIds = funnels.results.map((f: any) => f.id);
    let stages: any[] = [];
    if (funnelIds.length > 0) {
        const placeholders = funnelIds.map(() => '?').join(',');
        const stagesData = await c.env.DB.prepare(`SELECT * FROM stages WHERE funnel_id IN (${placeholders}) ORDER BY "order" ASC`)
            .bind(...funnelIds).all();
        stages = stagesData.results;
    }

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

// --- LEADS ---
app.post('/leads', async (c) => {
    const l = await c.req.json() as any;
    try {
        await c.env.DB.prepare(`
            INSERT INTO leads (
                id, account_id, title, company, value, 
                contact_name, contact_email, contact_phone, 
                funnel_id, stage_id, assigned_user_id, created_at, probability
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
            l.id, l.accountId, l.title, l.company, l.value, 
            l.contactName, l.contactEmail, l.contactPhone, 
            l.funnelId, l.stageId, l.assignedUserId, l.createdAt, l.probability
        ).run();
        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

app.patch('/leads/:id', async (c) => {
    const id = c.req.param('id');
    const data = await c.req.json() as any;
    const fields = [];
    const values = [];

    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
    if (data.company !== undefined) { fields.push('company = ?'); values.push(data.company); }
    if (data.value !== undefined) { fields.push('value = ?'); values.push(data.value); }
    if (data.contactName !== undefined) { fields.push('contact_name = ?'); values.push(data.contactName); }
    if (data.contactEmail !== undefined) { fields.push('contact_email = ?'); values.push(data.contactEmail); }
    if (data.contactPhone !== undefined) { fields.push('contact_phone = ?'); values.push(data.contactPhone); }
    if (data.stageId !== undefined) { fields.push('stage_id = ?'); values.push(data.stageId); }
    if (data.funnelId !== undefined) { fields.push('funnel_id = ?'); values.push(data.funnelId); }
    if (data.probability !== undefined) { fields.push('probability = ?'); values.push(data.probability); }
    if (data.customValues !== undefined) { fields.push('custom_values = ?'); values.push(JSON.stringify(data.customValues)); }
    if (data.notes !== undefined) { fields.push('notes = ?'); values.push(JSON.stringify(data.notes)); }

    if (fields.length > 0) {
        await c.env.DB.prepare(`UPDATE leads SET ${fields.join(', ')} WHERE id = ?`)
            .bind(...values, id).run();
    }
    return c.json({ success: true });
});

app.delete('/leads/:id', async (c) => {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM leads WHERE id = ?').bind(id).run();
    return c.json({ success: true });
});

// --- USERS ---
app.post('/users', async (c) => {
    const u = await c.req.json() as any;
    await c.env.DB.prepare('INSERT INTO users (id, account_id, name, email, password, role, avatar, team_id, status, joined_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(u.id, u.accountId, u.name, u.email, u.password || '123456', u.role, u.avatar, u.teamId, u.status || 'active', u.joinedAt || new Date().toISOString()).run();
    return c.json({ success: true });
});

app.patch('/users/:id', async (c) => {
    const id = c.req.param('id');
    const data = await c.req.json() as any;
    const fields = []; const values = [];
    if (data.name) { fields.push('name = ?'); values.push(data.name); }
    if (data.role) { fields.push('role = ?'); values.push(data.role); }
    if (data.teamId !== undefined) { fields.push('team_id = ?'); values.push(data.teamId); }
    if (data.status) { fields.push('status = ?'); values.push(data.status); }
    if (fields.length > 0) await c.env.DB.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).bind(...values, id).run();
    return c.json({ success: true });
});

app.delete('/users/:id', async (c) => {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
    return c.json({ success: true });
});

// --- TEAMS ---
app.post('/teams', async (c) => {
    const t = await c.req.json() as any;
    await c.env.DB.prepare('INSERT INTO teams (id, account_id, name, goal) VALUES (?, ?, ?, ?)')
        .bind(t.id, t.accountId, t.name, t.goal).run();
    return c.json({ success: true });
});

app.patch('/teams/:id', async (c) => {
    const id = c.req.param('id');
    const data = await c.req.json() as any;
    const fields = []; const values = [];
    if (data.name) { fields.push('name = ?'); values.push(data.name); }
    if (data.goal !== undefined) { fields.push('goal = ?'); values.push(data.goal); }
    if (fields.length > 0) await c.env.DB.prepare(`UPDATE teams SET ${fields.join(', ')} WHERE id = ?`).bind(...values, id).run();
    return c.json({ success: true });
});

app.delete('/teams/:id', async (c) => {
    const id = c.req.param('id');
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

// --- FUNNELS ---
app.post('/funnels', async (c) => {
    const f = await c.req.json() as any;
    await c.env.DB.prepare('INSERT INTO funnels (id, account_id, name) VALUES (?, ?, ?)')
        .bind(f.id, f.accountId, f.name).run();
    for (const s of f.stages) {
        await c.env.DB.prepare('INSERT INTO stages (id, funnel_id, name, color, "order") VALUES (?, ?, ?, ?, ?)')
            .bind(s.id, f.id, s.name, s.color, s.order).run();
    }
    return c.json({ success: true });
});

app.patch('/funnels/:id', async (c) => {
    const id = c.req.param('id');
    const data = await c.req.json() as any;
    if (data.name) {
        await c.env.DB.prepare('UPDATE funnels SET name = ? WHERE id = ?').bind(data.name, id).run();
    }
    if (data.stages) {
        await c.env.DB.prepare('DELETE FROM stages WHERE funnel_id = ?').bind(id).run();
        for (const s of data.stages) {
            await c.env.DB.prepare('INSERT INTO stages (id, funnel_id, name, color, "order") VALUES (?, ?, ?, ?, ?)')
                .bind(s.id, id, s.name, s.color, s.order).run();
        }
    }
    return c.json({ success: true });
});

app.delete('/funnels/:id', async (c) => {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM funnels WHERE id = ?').bind(id).run();
    return c.json({ success: true });
});

// --- ADMIN ACCOUNTS ---
app.get('/admin/accounts', async (c) => {
    const accounts = await c.env.DB.prepare('SELECT * FROM accounts ORDER BY created_at DESC').all();
    return c.json({ accounts: accounts.results });
});

app.patch('/admin/accounts/:id', async (c) => {
    const id = c.req.param('id');
    const data = await c.req.json() as any;
    const fields = [];
    const values = [];
    if (data.status) { fields.push('status = ?'); values.push(data.status); }
    if (data.visibilityConfig) { fields.push('visibility_config = ?'); values.push(JSON.stringify(data.visibilityConfig)); }
    if (fields.length > 0) {
        await c.env.DB.prepare(`UPDATE accounts SET ${fields.join(', ')} WHERE id = ?`)
            .bind(...values, id).run();
    }
    return c.json({ success: true });
});

// --- CUSTOM FIELDS ---
app.post('/custom-fields', async (c) => {
    const f = await c.req.json() as any;
    await c.env.DB.prepare('INSERT INTO custom_fields (id, account_id, name, type, context, funnel_id, options, visible_stage_ids) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(f.id, f.accountId, f.name, f.type, f.context, f.funnelId, JSON.stringify(f.options || []), JSON.stringify(f.visibleStageIds || [])).run();
    return c.json({ success: true });
});

app.patch('/custom-fields/:id', async (c) => {
    const id = c.req.param('id');
    const f = await c.req.json() as any;
    const fields = []; const values = [];
    if (f.name) { fields.push('name = ?'); values.push(f.name); }
    if (f.type) { fields.push('type = ?'); values.push(f.type); }
    if (f.context) { fields.push('context = ?'); values.push(f.context); }
    if (f.options) { fields.push('options = ?'); values.push(JSON.stringify(f.options)); }
    if (fields.length > 0) await c.env.DB.prepare(`UPDATE custom_fields SET ${fields.join(', ')} WHERE id = ?`).bind(...values, id).run();
    return c.json({ success: true });
});

app.delete('/custom-fields/:id', async (c) => {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM custom_fields WHERE id = ?').bind(id).run();
    return c.json({ success: true });
});

// CATCH-ALL PARA ROTAS NÃO ENCONTRADAS DENTRO DE /API
app.all('*', (c) => {
    return c.json({ error: `Rota não encontrada: ${c.req.path}` }, 404);
});

export const onRequest = handle(app);