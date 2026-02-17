
import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';
import { cors } from 'hono/cors';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors());

// Utilitários de Conversão
const toDB = (val: any) => (val && typeof val === 'object') ? JSON.stringify(val) : val;
const fromDB = (val: any) => {
    if (!val) return [];
    if (typeof val === 'object') return val;
    try { return JSON.parse(val); } catch { return []; }
};

// --- SYNC PRINCIPAL ---
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

        const allStages = (stagesRes.results || []).map((s: any) => ({
            ...s,
            funnelId: s.funnel_id
        }));

        const funnels = (funnelsRes.results || []).map((f: any) => ({
            ...f,
            accountId: f.account_id,
            stages: allStages.filter((s: any) => s.funnelId === f.id)
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
            customFields: (fieldsRes.results || []).map((cf: any) => ({
                ...cf,
                accountId: cf.account_id,
                funnelId: cf.funnel_id,
                visibleStageIds: fromDB(cf.visible_stage_ids),
                options: fromDB(cf.options)
            })),
            teams: (teamsRes.results || []).map((t: any) => ({ ...t, accountId: t.account_id })),
            users: (usersRes.results || []).map((u: any) => ({
                ...u,
                accountId: u.account_id,
                teamId: u.team_id
            }))
        });
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

// --- AUTH ---
app.post('/auth/login', async (c) => {
    const { email, password } = await c.req.json() as any;
    try {
        const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ? AND password = ?').bind(email, password).first() as any;
        if (!user) return c.json({ error: 'Credenciais inválidas' }, 401);
        return c.json({ user: { ...user, accountId: user.account_id } });
    } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.get('/public/settings', async (c) => {
    return c.json({ login_background: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=2000' });
});

export const onRequest = handle(app);
