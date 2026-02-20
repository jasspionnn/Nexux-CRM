
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
        await c.env.DB.batch([
            c.env.DB.prepare('INSERT INTO accounts (id, company_name, email, status, plan) VALUES (?, ?, ?, "active", "pro")').bind(accountId, companyName, email),
            c.env.DB.prepare('INSERT INTO users (id, account_id, name, email, password, role, status) VALUES (?, ?, ?, ?, ?, "ACCOUNT_ADMIN", "active")').bind(userId, accountId, userName, email, password),
            c.env.DB.prepare('INSERT INTO funnels (id, account_id, name) VALUES (?, ?, ?)').bind(`f-${Date.now()}`, accountId, 'Vendas')
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
    await c.env.DB.prepare(`
        INSERT INTO leads (id, account_id, title, company, value, contact_name, contact_email, contact_phone, funnel_id, stage_id, assigned_user_id, probability, tags, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(l.id, l.accountId, l.title, l.company, l.value, l.contactName, l.contactEmail, l.contactPhone, l.funnelId, l.stageId, l.assignedUserId, l.probability, toDB(l.tags), l.createdAt).run();
    return c.json({ success: true });
});

app.patch('/leads/:id', async (c) => {
    const id = c.req.param('id');
    const updates = await c.req.json();
    const mapping: any = { stageId: 'stage_id', funnelId: 'funnel_id', probability: 'probability', title: 'title' };
    for (const [key, val] of Object.entries(updates)) {
        if (mapping[key]) await c.env.DB.prepare(`UPDATE leads SET ${mapping[key]} = ? WHERE id = ?`).bind(val, id).run();
    }
    return c.json({ success: true });
});

app.get('/public/settings', async (c) => c.json({ login_background: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=2000' }));

export const onRequest = handle(app);
