
import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';
import { cors } from 'hono/cors';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>().basePath('/api');

app.use('*', cors());

// Auxiliares de conversão
const toDB = (val: any) => (val && typeof val === 'object') ? JSON.stringify(val) : val;
const fromDB = (val: any) => {
    if (!val) return [];
    try { return typeof val === 'string' ? JSON.parse(val) : val; } catch { return []; }
};

// --- SYNC ENGINE (O CÉREBRO) ---
app.get('/sync/:accountId', async (c) => {
    const accountId = c.req.param('accountId');
    try {
        const [funnelsRes, stagesRes, leadsRes, notesRes, tasksRes, fieldsRes, usersRes] = await c.env.DB.batch([
            c.env.DB.prepare('SELECT * FROM funnels WHERE account_id = ?').bind(accountId),
            c.env.DB.prepare('SELECT s.* FROM stages s JOIN funnels f ON s.funnel_id = f.id WHERE f.account_id = ? ORDER BY s."order" ASC').bind(accountId),
            c.env.DB.prepare('SELECT * FROM leads WHERE account_id = ?').bind(accountId),
            c.env.DB.prepare('SELECT n.* FROM notes n JOIN leads l ON n.lead_id = l.id WHERE l.account_id = ?').bind(accountId),
            c.env.DB.prepare('SELECT t.* FROM tasks t JOIN leads l ON t.lead_id = l.id WHERE l.account_id = ?').bind(accountId),
            c.env.DB.prepare('SELECT * FROM custom_fields WHERE account_id = ?').bind(accountId),
            c.env.DB.prepare('SELECT id, name, email, role, avatar, status, team_id FROM users WHERE account_id = ?').bind(accountId)
        ]);

        const allNotes = notesRes.results || [];
        const allTasks = tasksRes.results || [];

        const leads = (leadsRes.results || []).map((l: any) => ({
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
            createdAt: l.created_at,
            tags: fromDB(l.tags),
            customValues: fromDB(l.custom_values),
            notes: allNotes.filter((n: any) => n.lead_id === l.id).map((n: any) => ({
                id: n.id, content: n.content, createdAt: n.created_at, authorName: n.author_name
            })),
            tasks: allTasks.filter((t: any) => t.lead_id === l.id).map((t: any) => ({
                id: t.id, title: t.title, dueDate: t.due_date, completed: !!t.completed, type: t.type
            }))
        }));

        const stages = (stagesRes.results || []).map((s: any) => ({
            id: s.id, funnelId: s.funnel_id, name: s.name, color: s.color, order: s.order
        }));

        const funnels = (funnelsRes.results || []).map((f: any) => ({
            id: f.id, accountId: f.account_id, name: f.name,
            stages: stages.filter((s: any) => s.funnelId === f.id)
        }));

        return c.json({ 
            funnels, 
            leads, 
            users: usersRes.results,
            customFields: (fieldsRes.results || []).map((cf: any) => ({
                id: cf.id, accountId: cf.account_id, name: cf.name, type: cf.type,
                context: cf.context, funnelId: cf.funnel_id, 
                options: fromDB(cf.options), visibleStageIds: fromDB(cf.visible_stage_ids)
            }))
        });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// --- AUTH & REGISTER ---
app.post('/auth/register', async (c) => {
    const { userName, email, password, companyName } = await c.req.json();
    const accountId = `acc-${Date.now()}`;
    const userId = `u-${Date.now()}`;
    
    try {
        const funnelId = `f-${Date.now()}`;
        await c.env.DB.batch([
            c.env.DB.prepare('INSERT INTO accounts (id, company_name, email, status, plan) VALUES (?, ?, ?, "active", "pro")').bind(accountId, companyName, email),
            c.env.DB.prepare('INSERT INTO users (id, account_id, name, email, password, role, status) VALUES (?, ?, ?, ?, ?, "ACCOUNT_ADMIN", "active")').bind(userId, accountId, userName, email, password),
            c.env.DB.prepare('INSERT INTO funnels (id, account_id, name) VALUES (?, ?, ?)').bind(funnelId, accountId, 'Vendas'),
            c.env.DB.prepare('INSERT INTO stages (id, funnel_id, name, color, "order") VALUES (?, ?, ?, ?, ?)').bind(`s1-${Date.now()}`, funnelId, 'Lead', 'bg-blue-500', 0),
            c.env.DB.prepare('INSERT INTO stages (id, funnel_id, name, color, "order") VALUES (?, ?, ?, ?, ?)').bind(`s2-${Date.now()}`, funnelId, 'Fechado', 'bg-green-500', 1)
        ]);
        return c.json({ success: true });
    } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.post('/auth/login', async (c) => {
    const { email, password } = await c.req.json();
    const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ? AND password = ?').bind(email, password).first() as any;
    if (!user) return c.json({ error: 'Credenciais inválidas' }, 401);
    return c.json({ user: { ...user, accountId: user.account_id } });
});

// --- WRITES ---
app.post('/leads', async (c) => {
    const l = await c.req.json();
    const stmts = [
        c.env.DB.prepare(`
            INSERT INTO leads (id, account_id, title, company, value, contact_name, contact_email, contact_phone, funnel_id, stage_id, assigned_user_id, probability, tags, custom_values, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(l.id, l.accountId, l.title, l.company, l.value, l.contactName, l.contactEmail, l.contactPhone, l.funnelId, l.stageId, l.assignedUserId, l.probability, toDB(l.tags), toDB(l.customValues), l.createdAt)
    ];

    if (l.notes && Array.isArray(l.notes)) {
        for (const n of l.notes) {
            stmts.push(c.env.DB.prepare('INSERT INTO notes (id, lead_id, content, author_name, created_at) VALUES (?, ?, ?, ?, ?)')
                .bind(n.id || `n-${Date.now()}-${Math.random()}`, l.id, n.content, n.authorName, n.createdAt));
        }
    }

    if (l.tasks && Array.isArray(l.tasks)) {
        for (const t of l.tasks) {
            stmts.push(c.env.DB.prepare('INSERT INTO tasks (id, lead_id, title, due_date, completed, type) VALUES (?, ?, ?, ?, ?, ?)')
                .bind(t.id || `t-${Date.now()}-${Math.random()}`, l.id, t.title, t.dueDate, t.completed ? 1 : 0, t.type));
        }
    }

    await c.env.DB.batch(stmts);
    return c.json({ success: true });
});

app.patch('/leads/:id', async (c) => {
    const id = c.req.param('id');
    const updates = await c.req.json();
    const mapping: any = { 
        stageId: 'stage_id', 
        funnelId: 'funnel_id', 
        probability: 'probability', 
        title: 'title',
        company: 'company',
        value: 'value',
        contactName: 'contact_name',
        contactEmail: 'contact_email',
        contactPhone: 'contact_phone',
        assignedUserId: 'assigned_user_id',
        tags: 'tags',
        customValues: 'custom_values'
    };
    
    for (const [key, val] of Object.entries(updates)) {
        if (mapping[key]) {
            const dbVal = (key === 'tags' || key === 'customValues') ? toDB(val) : val;
            await c.env.DB.prepare(`UPDATE leads SET ${mapping[key]} = ? WHERE id = ?`).bind(dbVal, id).run();
        }
    }
    return c.json({ success: true });
});

app.delete('/leads/:id', async (c) => {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM leads WHERE id = ?').bind(id).run();
    return c.json({ success: true });
});

app.post('/leads/:id/notes', async (c) => {
    const leadId = c.req.param('id');
    const n = await c.req.json();
    await c.env.DB.prepare('INSERT INTO notes (id, lead_id, content, author_name, created_at) VALUES (?, ?, ?, ?, ?)')
        .bind(n.id, leadId, n.content, n.authorName, n.createdAt).run();
    return c.json({ success: true });
});

// --- FUNNELS ---
app.post('/funnels', async (c) => {
    const f = await c.req.json();
    const stmts = [
        c.env.DB.prepare('INSERT INTO funnels (id, account_id, name) VALUES (?, ?, ?)').bind(f.id, f.accountId, f.name)
    ];
    
    if (f.stages && Array.isArray(f.stages)) {
        for (const s of f.stages) {
            stmts.push(c.env.DB.prepare('INSERT INTO stages (id, funnel_id, name, color, "order") VALUES (?, ?, ?, ?, ?)').bind(s.id, f.id, s.name, s.color, s.order));
        }
    }
    
    await c.env.DB.batch(stmts);
    return c.json({ success: true });
});

app.patch('/funnels/:id', async (c) => {
    const id = c.req.param('id');
    const updates = await c.req.json();
    if (updates.name) {
        await c.env.DB.prepare('UPDATE funnels SET name = ? WHERE id = ?').bind(updates.name, id).run();
    }
    return c.json({ success: true });
});

app.delete('/funnels/:id', async (c) => {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM funnels WHERE id = ?').bind(id).run();
    return c.json({ success: true });
});

app.post('/funnels/:id/reorder-stages', async (c) => {
    const { stages } = await c.req.json();
    const stmts = stages.map((s: any, i: number) => c.env.DB.prepare('UPDATE stages SET "order" = ? WHERE id = ?').bind(i, s.id));
    await c.env.DB.batch(stmts);
    return c.json({ success: true });
});

// --- STAGES ---
app.post('/stages', async (c) => {
    const s = await c.req.json();
    await c.env.DB.prepare('INSERT INTO stages (id, funnel_id, name, color, "order") VALUES (?, ?, ?, ?, ?)').bind(s.id, s.funnelId, s.name, s.color, s.order).run();
    return c.json({ success: true });
});

app.patch('/stages/:id', async (c) => {
    const id = c.req.param('id');
    const updates = await c.req.json();
    if (updates.name) await c.env.DB.prepare('UPDATE stages SET name = ? WHERE id = ?').bind(updates.name, id).run();
    if (updates.color) await c.env.DB.prepare('UPDATE stages SET color = ? WHERE id = ?').bind(updates.color, id).run();
    return c.json({ success: true });
});

app.delete('/stages/:id', async (c) => {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM stages WHERE id = ?').bind(id).run();
    return c.json({ success: true });
});

// --- TASKS ---
app.post('/tasks', async (c) => {
    const t = await c.req.json();
    await c.env.DB.prepare('INSERT INTO tasks (id, lead_id, title, due_date, completed, type) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(t.id, t.leadId, t.title, t.dueDate, t.completed ? 1 : 0, t.type).run();
    return c.json({ success: true });
});

app.patch('/tasks/:id/toggle', async (c) => {
    const id = c.req.param('id');
    await c.env.DB.prepare('UPDATE tasks SET completed = CASE WHEN completed = 1 THEN 0 ELSE 1 END WHERE id = ?').bind(id).run();
    return c.json({ success: true });
});

app.delete('/tasks/:id', async (c) => {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM tasks WHERE id = ?').bind(id).run();
    return c.json({ success: true });
});

// --- CUSTOM FIELDS ---
app.post('/custom-fields', async (c) => {
    const cf = await c.req.json();
    await c.env.DB.prepare('INSERT INTO custom_fields (id, account_id, name, type, context, funnel_id, options, visible_stage_ids) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(cf.id, cf.accountId, cf.name, cf.type, cf.context, cf.funnelId, toDB(cf.options), toDB(cf.visibleStageIds)).run();
    return c.json({ success: true });
});

app.patch('/custom-fields/:id', async (c) => {
    const id = c.req.param('id');
    const updates = await c.req.json();
    if (updates.name) await c.env.DB.prepare('UPDATE custom_fields SET name = ? WHERE id = ?').bind(updates.name, id).run();
    if (updates.options) await c.env.DB.prepare('UPDATE custom_fields SET options = ? WHERE id = ?').bind(toDB(updates.options), id).run();
    return c.json({ success: true });
});

app.delete('/custom-fields/:id', async (c) => {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM custom_fields WHERE id = ?').bind(id).run();
    return c.json({ success: true });
});

// --- USERS & TEAMS ---
app.post('/users', async (c) => {
    const u = await c.req.json();
    await c.env.DB.prepare('INSERT INTO users (id, account_id, name, email, password, role, status, team_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(u.id, u.accountId, u.name, u.email, u.password || '123456', u.role, u.status || 'active', u.teamId || null).run();
    return c.json({ success: true });
});

app.patch('/users/:id', async (c) => {
    const id = c.req.param('id');
    const updates = await c.req.json();
    const mapping: any = { name: 'name', role: 'role', status: 'status', teamId: 'team_id' };
    for (const [key, val] of Object.entries(updates)) {
        if (mapping[key]) await c.env.DB.prepare(`UPDATE users SET ${mapping[key]} = ? WHERE id = ?`).bind(val, id).run();
    }
    return c.json({ success: true });
});

app.delete('/users/:id', async (c) => {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
    return c.json({ success: true });
});

app.post('/teams', async (c) => {
    const t = await c.req.json();
    await c.env.DB.prepare('INSERT INTO teams (id, account_id, name, goal) VALUES (?, ?, ?, ?)').bind(t.id, t.accountId, t.name, t.goal || 0).run();
    return c.json({ success: true });
});

app.patch('/teams/:id', async (c) => {
    const id = c.req.param('id');
    const updates = await c.req.json();
    if (updates.name) await c.env.DB.prepare('UPDATE teams SET name = ? WHERE id = ?').bind(updates.name, id).run();
    if (updates.goal !== undefined) await c.env.DB.prepare('UPDATE teams SET goal = ? WHERE id = ?').bind(updates.goal, id).run();
    return c.json({ success: true });
});

app.delete('/teams/:id', async (c) => {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM teams WHERE id = ?').bind(id).run();
    return c.json({ success: true });
});

// --- ADMIN ---
app.get('/admin/accounts', async (c) => {
    const res = await c.env.DB.prepare('SELECT id, company_name as companyName, email, status, plan, expires_at as expiresAt FROM accounts').all();
    return c.json({ accounts: res.results || [] });
});

app.patch('/admin/accounts/:id', async (c) => {
    const id = c.req.param('id');
    const { status } = await c.req.json();
    await c.env.DB.prepare('UPDATE accounts SET status = ? WHERE id = ?').bind(status, id).run();
    return c.json({ success: true });
});

app.post('/admin/accounts/:id/extend', async (c) => {
    const id = c.req.param('id');
    const { months } = await c.req.json();
    await c.env.DB.prepare('UPDATE accounts SET expires_at = date(expires_at, "+" || ? || " months") WHERE id = ?').bind(months, id).run();
    return c.json({ success: true });
});

// --- WEBHOOKS & KNOWLEDGE ---
app.post('/webhooks', async (c) => {
    const w = await c.req.json();
    await c.env.DB.prepare('INSERT INTO webhooks (id, account_id, name, url, events, is_active) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(w.id, w.accountId, w.name, w.url, toDB(w.events), w.isActive ? 1 : 0).run();
    return c.json({ success: true });
});

app.patch('/webhooks/:id', async (c) => {
    const id = c.req.param('id');
    const updates = await c.req.json();
    if (updates.isActive !== undefined) await c.env.DB.prepare('UPDATE webhooks SET is_active = ? WHERE id = ?').bind(updates.isActive ? 1 : 0, id).run();
    return c.json({ success: true });
});

app.delete('/webhooks/:id', async (c) => {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM webhooks WHERE id = ?').bind(id).run();
    return c.json({ success: true });
});

app.post('/knowledge', async (c) => {
    const s = await c.req.json();
    await c.env.DB.prepare('INSERT INTO knowledge_sources (id, account_id, name, type) VALUES (?, ?, ?, ?)')
        .bind(s.id, s.accountId, s.name, s.type).run();
    return c.json({ success: true });
});

app.delete('/knowledge/:id', async (c) => {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM knowledge_sources WHERE id = ?').bind(id).run();
    return c.json({ success: true });
});

app.patch('/bot', async (c) => {
    const updates = await c.req.json();
    const accountId = updates.accountId;
    if (!accountId) return c.json({ error: 'accountId required' }, 400);
    
    // Upsert bot settings
    const existing = await c.env.DB.prepare('SELECT * FROM bot_settings WHERE account_id = ?').bind(accountId).first();
    if (existing) {
        if (updates.systemPrompt) await c.env.DB.prepare('UPDATE bot_settings SET system_prompt = ? WHERE account_id = ?').bind(updates.systemPrompt, accountId).run();
        if (updates.temperature !== undefined) await c.env.DB.prepare('UPDATE bot_settings SET temperature = ? WHERE account_id = ?').bind(updates.temperature, accountId).run();
        if (updates.autoReply !== undefined) await c.env.DB.prepare('UPDATE bot_settings SET auto_reply = ? WHERE account_id = ?').bind(updates.autoReply ? 1 : 0, accountId).run();
    } else {
        await c.env.DB.prepare('INSERT INTO bot_settings (account_id, system_prompt, temperature, auto_reply) VALUES (?, ?, ?, ?)')
            .bind(accountId, updates.systemPrompt || '', updates.temperature || 0.7, updates.autoReply ? 1 : 0).run();
    }
    return c.json({ success: true });
});

app.get('/public/settings', async (c) => c.json({ login_background: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=2000' }));

export const onRequest = handle(app);
