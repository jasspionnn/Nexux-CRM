
import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';
import { cors } from 'hono/cors';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors());

// Auxiliares de conversão
const toDB = (val: any) => (val && typeof val === 'object') ? JSON.stringify(val) : val;
const fromDB = (val: any) => {
    if (!val) return [];
    if (typeof val === 'object') return val;
    try { return JSON.parse(val); } catch { return []; }
};

// --- AUTH ---
app.post('/auth/login', async (c) => {
    const { email, password } = await c.req.json() as any;
    const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ? AND password = ?')
        .bind(email, password).first() as any;
    if (!user) return c.json({ error: 'Credenciais inválidas' }, 401);
    return c.json({ user: { ...user, accountId: user.account_id } });
});

app.post('/auth/register', async (c) => {
    const { userName, email, password, companyName } = await c.req.json() as any;
    const accId = `acc_${Date.now()}`;
    const userId = `u_${Date.now()}`;
    
    await c.env.DB.batch([
        c.env.DB.prepare('INSERT INTO accounts (id, company_name, email, status, plan) VALUES (?, ?, ?, "active", "trial")').bind(accId, companyName, email),
        c.env.DB.prepare('INSERT INTO users (id, account_id, name, email, password, role, status) VALUES (?, ?, ?, ?, ?, "ACCOUNT_ADMIN", "active")').bind(userId, accId, userName, email, password),
        c.env.DB.prepare('INSERT INTO funnels (id, account_id, name) VALUES (?, ?, "Funil de Vendas")').bind(`f_${accId}`, accId),
        c.env.DB.prepare('INSERT INTO stages (id, funnel_id, name, color, "order") VALUES (?, ?, "Lead", "bg-blue-500", 0)').bind(`s_${accId}`, `f_${accId}`)
    ]);
    
    return c.json({ success: true });
});

// --- SYNC ENGINE (O CORAÇÃO DO CRM) ---
app.get('/sync/:accountId', async (c) => {
    const accountId = c.req.param('accountId');
    try {
        const [funnelsRes, stagesRes, leadsRes, fieldsRes, teamsRes, usersRes] = await Promise.all([
            c.env.DB.prepare('SELECT * FROM funnels WHERE account_id = ?').bind(accountId).all(),
            c.env.DB.prepare('SELECT s.* FROM stages s JOIN funnels f ON s.funnel_id = f.id WHERE f.account_id = ? ORDER BY s."order" ASC').bind(accountId).all(),
            c.env.DB.prepare('SELECT * FROM leads WHERE account_id = ?').bind(accountId).all(),
            c.env.DB.prepare('SELECT * FROM custom_fields WHERE account_id = ?').bind(accountId).all(),
            c.env.DB.prepare('SELECT * FROM teams WHERE account_id = ?').bind(accountId).all(),
            c.env.DB.prepare('SELECT * FROM users WHERE account_id = ?').bind(accountId).all()
        ]);

        const allStages = stagesRes.results || [];
        const funnels = (funnelsRes.results || []).map((f: any) => ({
            ...f,
            accountId: f.account_id,
            stages: allStages.filter((s: any) => s.funnel_id === f.id)
        }));

        const leads = (leadsRes.results || []).map((l: any) => ({
            ...l,
            accountId: l.account_id,
            contactName: l.contact_name,
            contactEmail: l.contact_email,
            contactPhone: l.contact_phone,
            funnelId: l.funnel_id,
            stageId: l.stage_id,
            assignedUserId: l.assigned_user_id,
            createdAt: l.created_at,
            tags: fromDB(l.tags),
            notes: fromDB(l.notes),
            tasks: fromDB(l.tasks),
            customValues: fromDB(l.custom_values)
        }));

        return c.json({ 
            funnels, 
            leads, 
            customFields: (fieldsRes.results || []).map((cf: any) => ({ ...cf, accountId: cf.account_id, funnelId: cf.funnel_id, visibleStageIds: fromDB(cf.visible_stage_ids), options: fromDB(cf.options) })), 
            teams: (teamsRes.results || []).map((t: any) => ({ ...t, accountId: t.account_id })), 
            users: (usersRes.results || []).map((u: any) => ({ ...u, accountId: u.account_id, teamId: u.team_id }))
        });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// --- LEADS MUTATIONS ---
app.post('/leads', async (c) => {
    const l = await c.req.json() as any;
    try {
        await c.env.DB.prepare(`
            INSERT INTO leads (id, account_id, title, company, value, contact_name, contact_email, contact_phone, funnel_id, stage_id, assigned_user_id, probability, tags, notes, tasks, custom_values, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            l.id, l.accountId, l.title, l.company, l.value, l.contactName, l.contactEmail, l.contactPhone,
            l.funnelId, l.stageId, l.assignedUserId, l.probability, 
            toDB(l.tags), toDB(l.notes), toDB(l.tasks), toDB(l.customValues), 
            l.createdAt
        ).run();
        return c.json({ success: true });
    } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.patch('/leads/:id', async (c) => {
    const id = c.req.param('id');
    const updates = await c.req.json() as any;
    const mapping: any = {
        title: 'title', company: 'company', value: 'value',
        contactName: 'contact_name', contactEmail: 'contact_email', contactPhone: 'contact_phone',
        funnelId: 'funnel_id', stageId: 'stage_id', assignedUserId: 'assigned_user_id',
        probability: 'probability', tags: 'tags', notes: 'notes', tasks: 'tasks', customValues: 'custom_values'
    };

    try {
        for (const [key, val] of Object.entries(updates)) {
            const dbKey = mapping[key];
            if (dbKey) {
                await c.env.DB.prepare(`UPDATE leads SET ${dbKey} = ? WHERE id = ?`).bind(toDB(val), id).run();
            }
        }
        return c.json({ success: true });
    } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.delete('/leads/:id', async (c) => {
    await c.env.DB.prepare('DELETE FROM leads WHERE id = ?').bind(c.req.param('id')).run();
    return c.json({ success: true });
});

// --- FUNNELS ---
app.post('/funnels', async (c) => {
    const f = await c.req.json() as any;
    await c.env.DB.prepare('INSERT INTO funnels (id, account_id, name) VALUES (?, ?, ?)').bind(f.id, f.accountId, f.name).run();
    for (const s of f.stages) {
        await c.env.DB.prepare('INSERT INTO stages (id, funnel_id, name, color, "order") VALUES (?, ?, ?, ?, ?)').bind(s.id, f.id, s.name, s.color, s.order).run();
    }
    return c.json({ success: true });
});

app.patch('/funnels/:id', async (c) => {
    const id = c.req.param('id');
    const { name, stages } = await c.req.json() as any;
    if (name) await c.env.DB.prepare('UPDATE funnels SET name = ? WHERE id = ?').bind(name, id).run();
    if (stages) {
        await c.env.DB.prepare('DELETE FROM stages WHERE funnel_id = ?').bind(id).run();
        for (const s of stages) {
            await c.env.DB.prepare('INSERT INTO stages (id, funnel_id, name, color, "order") VALUES (?, ?, ?, ?, ?)').bind(s.id, id, s.name, s.color, s.order).run();
        }
    }
    return c.json({ success: true });
});

export const onRequest = handle(app);
