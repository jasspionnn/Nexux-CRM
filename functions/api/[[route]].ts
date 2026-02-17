
import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';
import { cors } from 'hono/cors';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors());

const safeParse = (val: any) => {
    if (!val) return [];
    if (typeof val === 'object') return val;
    try { return JSON.parse(val); } catch { return []; }
};

const safeStringify = (val: any) => JSON.stringify(val || []);

// --- AUTH & ADMIN ---
app.post('/auth/login', async (c) => {
    const { email, password } = await c.req.json() as any;
    const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ? AND password = ?').bind(email, password).first() as any;
    if (!user) return c.json({ error: 'Credenciais inválidas' }, 401);
    return c.json({ user });
});

// --- SYNC ENGINE ---
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
            tags: safeParse(l.tags),
            notes: safeParse(l.notes),
            tasks: safeParse(l.tasks),
            customValues: safeParse(l.custom_values)
        }));

        return c.json({ funnels, leads, customFields: fieldsRes.results, teams: teamsRes.results, users: usersRes.results });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// --- LEADS ---
app.post('/leads', async (c) => {
    const l = await c.req.json() as any;
    try {
        await c.env.DB.prepare(`
            INSERT INTO leads (id, account_id, title, company, value, contact_name, contact_email, contact_phone, funnel_id, stage_id, assigned_user_id, probability, tags, notes, tasks, custom_values, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            l.id, l.accountId, l.title, l.company, l.value, l.contactName, l.contactEmail, l.contactPhone,
            l.funnelId, l.stageId, l.assignedUserId, l.probability, 
            safeStringify(l.tags), safeStringify(l.notes), safeStringify(l.tasks), safeStringify(l.customValues), 
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
                const finalVal = typeof val === 'object' ? JSON.stringify(val) : val;
                await c.env.DB.prepare(`UPDATE leads SET ${dbKey} = ? WHERE id = ?`).bind(finalVal, id).run();
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
