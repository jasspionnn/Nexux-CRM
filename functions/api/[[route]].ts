
import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// --- AUTH & ACCOUNTS ---

app.post('/api/auth/register', async (c) => {
    const { userName, email, password, companyName } = await c.req.json() as any;
    const accountId = `acc_${Date.now()}`;
    const userId = `u_${Date.now()}`;

    // 1. Criar Conta
    await c.env.DB.prepare(
        'INSERT INTO accounts (id, company_name, owner_name, email, status, plan, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
        accountId, companyName, userName, email, 'active', 'trial', 
        new Date().toISOString(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    ).run();

    // 2. Criar Usuário Admin
    await c.env.DB.prepare(
        'INSERT INTO users (id, account_id, name, email, password, role, avatar, status, joined_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
        userId, accountId, userName, email, password, 'ACCOUNT_ADMIN',
        `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=random`,
        'active', new Date().toISOString()
    ).run();

    // 3. Criar Funil Padrão
    const funnelId = `f_${Date.now()}`;
    await c.env.DB.prepare('INSERT INTO funnels (id, account_id, name) VALUES (?, ?, ?)')
        .bind(funnelId, accountId, 'Vendas Geral').run();

    // 4. Criar Etapas Padrão
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

app.post('/api/auth/login', async (c) => {
    const { email, password } = await c.req.json() as any;
    const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ? AND password = ?')
        .bind(email, password).first() as any;

    if (!user) {
        return c.json({ error: 'Credenciais inválidas' }, 401);
    }

    // Converter snake_case do DB para camelCase do Frontend
    const formattedUser = {
        id: user.id,
        accountId: user.account_id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        teamId: user.team_id,
        status: user.status
    };

    return c.json({ user: formattedUser });
});

// --- SYNC DATA ---

app.get('/api/sync/:accountId', async (c) => {
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
    const users = await c.env.DB.prepare('SELECT id, name, email, role, team_id as teamId, avatar, status FROM users WHERE account_id = ?').bind(accountId).all();
    const teams = await c.env.DB.prepare('SELECT * FROM teams WHERE account_id = ?').bind(accountId).all();

    // Formatar funis com suas etapas
    const formattedFunnels = funnels.results.map((f: any) => ({
        ...f,
        stages: stages.filter((s: any) => s.funnel_id === f.id).map((s: any) => ({
            id: s.id,
            name: s.name,
            color: s.color,
            order: s.order
        }))
    }));

    // Formatar leads (converter snake_case para camelCase se necessário)
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
        tasks: JSON.parse(l.tasks || '[]'),
        tags: JSON.parse(l.tags || '[]')
    }));

    return c.json({
        funnels: formattedFunnels,
        leads: formattedLeads,
        users: users.results,
        teams: teams.results,
        customFields: []
    });
});

// --- TEAMS ---

app.post('/api/teams', async (c) => {
    const data = await c.req.json() as any;
    await c.env.DB.prepare('INSERT INTO teams (id, account_id, name, goal) VALUES (?, ?, ?, ?)')
        .bind(data.id, data.accountId, data.name, data.goal).run();
    return c.json({ success: true });
});

app.patch('/api/teams/:id', async (c) => {
    const id = c.req.param('id');
    const data = await c.req.json() as any;
    
    if (data.name !== undefined && data.goal !== undefined) {
        await c.env.DB.prepare('UPDATE teams SET name = ?, goal = ? WHERE id = ?').bind(data.name, data.goal, id).run();
    } else if (data.name !== undefined) {
        await c.env.DB.prepare('UPDATE teams SET name = ? WHERE id = ?').bind(data.name, id).run();
    } else if (data.goal !== undefined) {
        await c.env.DB.prepare('UPDATE teams SET goal = ? WHERE id = ?').bind(data.goal, id).run();
    }
    
    return c.json({ success: true });
});

app.delete('/api/teams/:id', async (c) => {
    const id = c.req.param('id');
    await c.env.DB.prepare('UPDATE users SET team_id = NULL WHERE team_id = ?').bind(id).run();
    await c.env.DB.prepare('DELETE FROM teams WHERE id = ?').bind(id).run();
    return c.json({ success: true });
});

// --- USERS ---

app.post('/api/users', async (c) => {
    const data = await c.req.json() as any;
    await c.env.DB.prepare('INSERT INTO users (id, account_id, name, email, role, team_id, avatar, status, joined_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(data.id, data.accountId, data.name, data.email, data.role, data.teamId, data.avatar, data.status, data.joinedAt).run();
    return c.json({ success: true });
});

app.patch('/api/users/:id', async (c) => {
    const id = c.req.param('id');
    const data = await c.req.json() as any;
    
    // Mapear campos camelCase do front para snake_case do DB
    const fieldMapping: Record<string, string> = {
        role: 'role',
        teamId: 'team_id',
        status: 'status',
        name: 'name',
        avatar: 'avatar'
    };

    const updates = Object.entries(data)
        .filter(([key]) => fieldMapping[key])
        .map(([key]) => `${fieldMapping[key]} = ?`)
        .join(', ');
    
    const values = Object.entries(data)
        .filter(([key]) => fieldMapping[key])
        .map(([, val]) => val);

    if (updates) {
        await c.env.DB.prepare(`UPDATE users SET ${updates} WHERE id = ?`).bind(...values, id).run();
    }
    
    return c.json({ success: true });
});

app.delete('/api/users/:id', async (c) => {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
    return c.json({ success: true });
});

// --- LEADS ---

app.post('/api/leads', async (c) => {
    const l = await c.req.json() as any;
    await c.env.DB.prepare(
        'INSERT INTO leads (id, account_id, title, company, value, contact_name, contact_email, contact_phone, funnel_id, stage_id, assigned_user_id, created_at, probability, notes, tasks, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
        l.id, l.accountId, l.title, l.company, l.value, l.contactName, l.contactEmail, l.contactPhone, 
        l.funnelId, l.stageId, l.assignedUserId, l.createdAt, l.probability, 
        JSON.stringify(l.notes || []), JSON.stringify(l.tasks || []), JSON.stringify(l.tags || [])
    ).run();
    return c.json({ success: true });
});

app.patch('/api/leads/:id', async (c) => {
    const id = c.req.param('id');
    const data = await c.req.json() as any;
    
    const fieldMapping: Record<string, string> = {
        stageId: 'stage_id',
        funnelId: 'funnel_id',
        probability: 'probability',
        notes: 'notes',
        tasks: 'tasks',
        title: 'title',
        company: 'company',
        value: 'value'
    };

    const updates = Object.entries(data)
        .filter(([key]) => fieldMapping[key])
        .map(([key]) => `${fieldMapping[key]} = ?`)
        .join(', ');
    
    const values = Object.entries(data)
        .filter(([key]) => fieldMapping[key])
        .map(([, val]) => typeof val === 'object' ? JSON.stringify(val) : val);

    if (updates) {
        await c.env.DB.prepare(`UPDATE leads SET ${updates} WHERE id = ?`).bind(...values, id).run();
    }
    
    return c.json({ success: true });
});

export const onRequest = handle(app);
