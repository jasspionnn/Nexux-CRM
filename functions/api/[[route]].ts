
import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';
import { cors } from 'hono/cors';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>().basePath('/api');

app.use('*', cors());

app.onError((err, c) => {
  console.error(`[API ERROR]: ${err.message}`);
  return c.json({ error: "Erro interno do servidor", details: err.message }, 500);
});

const safeParse = (val: any) => {
    if (!val) return [];
    if (typeof val === 'object') return val;
    try { return JSON.parse(val); } catch { return []; }
};

// --- SETTINGS PÚBLICAS (Login Background etc) ---
app.get('/public/settings', async (c) => {
    try {
        const settings = await c.env.DB.prepare('SELECT key, value FROM system_settings').all();
        const result = settings.results.reduce((acc: any, curr: any) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});
        return c.json(result);
    } catch {
        return c.json({});
    }
});

// --- ADMIN: GERENCIAR CONFIGURAÇÕES ---
app.patch('/admin/settings', async (c) => {
    const body = await c.req.json() as Record<string, string>;
    const queries = Object.entries(body).map(([key, value]) => 
        c.env.DB.prepare('INSERT INTO system_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
        .bind(key, value)
    );
    await c.env.DB.batch(queries);
    return c.json({ success: true });
});

// --- ADMIN: LISTAR CONTAS ---
app.get('/admin/accounts', async (c) => {
    const res = await c.env.DB.prepare('SELECT * FROM accounts ORDER BY created_at DESC').all();
    const formatted = (res.results || []).map((a: any) => ({
        id: a.id,
        companyName: a.company_name,
        ownerName: a.owner_name,
        email: a.email,
        status: a.status,
        plan: a.plan,
        expiresAt: a.expires_at,
        createdAt: a.created_at,
        visibilityConfig: {
            level: a.visibility_level || 'public',
            allowUserExport: !!a.allow_user_export,
            showTeamGoals: !!a.show_team_goals
        }
    }));
    return c.json({ accounts: formatted });
});

// --- SYNC ENGINE: O CORAÇÃO DOS DADOS ---
app.get('/sync/:accountId', async (c) => {
    const accountId = c.req.param('accountId');
    
    try {
        const [funnelsRes, stagesRes, leadsRes, usersRes, teamsRes, fieldsRes, webhooksRes] = await Promise.all([
            c.env.DB.prepare('SELECT * FROM funnels WHERE account_id = ?').bind(accountId).all(),
            c.env.DB.prepare('SELECT * FROM stages WHERE funnel_id IN (SELECT id FROM funnels WHERE account_id = ?) ORDER BY "order" ASC').bind(accountId).all(),
            c.env.DB.prepare('SELECT * FROM leads WHERE account_id = ? ORDER BY created_at DESC').bind(accountId).all(),
            c.env.DB.prepare('SELECT id, name, email, role, avatar, team_id, status, last_login FROM users WHERE account_id = ?').bind(accountId).all(),
            c.env.DB.prepare('SELECT * FROM teams WHERE account_id = ?').bind(accountId).all(),
            c.env.DB.prepare('SELECT * FROM custom_fields WHERE account_id = ?').bind(accountId).all(),
            c.env.DB.prepare('SELECT * FROM webhooks WHERE account_id = ?').bind(accountId).all()
        ]);

        const allStages = stagesRes.results || [];
        
        const funnels = (funnelsRes.results || []).map((f: any) => ({
            id: f.id,
            accountId: f.account_id,
            name: f.name,
            stages: allStages.filter((s: any) => s.funnel_id === f.id).map((s: any) => ({
                id: s.id,
                name: s.name,
                color: s.color,
                order: s.order
            })),
            defaultWonStageId: f.default_won_stage_id,
            defaultLostStageId: f.default_lost_stage_id
        }));

        const leads = (leadsRes.results || []).map((l: any) => ({
            id: l.id,
            accountId: l.account_id,
            title: l.title,
            company: l.company,
            value: l.value || 0,
            contactName: l.contact_name,
            contactEmail: l.contact_email,
            contactPhone: l.contact_phone,
            funnelId: l.funnel_id,
            stageId: l.stage_id,
            assignedUserId: l.assigned_user_id,
            createdAt: l.created_at,
            probability: l.probability || 0,
            tags: safeParse(l.tags),
            notes: safeParse(l.notes),
            tasks: safeParse(l.tasks),
            customValues: safeParse(l.custom_values)
        }));

        const users = (usersRes.results || []).map((u: any) => ({
            ...u,
            accountId: u.account_id,
            teamId: u.team_id,
            lastLogin: u.last_login
        }));

        const customFields = (fieldsRes.results || []).map((cf: any) => ({
            ...cf,
            accountId: cf.account_id,
            funnelId: cf.funnel_id,
            options: safeParse(cf.options),
            visibleStageIds: safeParse(cf.visible_stage_ids)
        }));

        return c.json({
            funnels,
            leads,
            users,
            teams: teamsRes.results || [],
            customFields,
            webhooks: webhooksRes.results || [],
            knowledgeSources: [], // Placeholder até implementar RAG
            botInstance: null     // Placeholder
        });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// --- AUTH ---
app.post('/auth/login', async (c) => {
    const { email, password } = await c.req.json() as any;
    const user: any = await c.env.DB.prepare(
        'SELECT * FROM users WHERE email = ? AND password = ? AND status = "active"'
    ).bind(email, password).first();

    if (!user) return c.json({ error: "E-mail ou senha incorretos." }, 401);
    
    await c.env.DB.prepare('UPDATE users SET last_login = ? WHERE id = ?')
        .bind(new Date().toISOString(), user.id).run();

    return c.json({ 
        user: {
            id: user.id,
            accountId: user.account_id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            status: user.status
        } 
    });
});

// --- MUTATIONS: LEADS ---
app.post('/leads', async (c) => {
    const lead = await c.req.json() as any;
    await c.env.DB.prepare(
        'INSERT INTO leads (id, account_id, title, company, value, contact_name, contact_email, contact_phone, funnel_id, stage_id, assigned_user_id, probability, tags, notes, tasks, custom_values) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
        lead.id, lead.accountId, lead.title, lead.company, lead.value, 
        lead.contactName, lead.contactEmail, lead.contactPhone,
        lead.funnelId, lead.stageId, lead.assignedUserId, lead.probability,
        JSON.stringify(lead.tags || []), JSON.stringify(lead.notes || []), 
        JSON.stringify(lead.tasks || []), JSON.stringify(lead.customValues || {})
    ).run();
    return c.json({ success: true });
});

app.patch('/leads/:id', async (c) => {
    const id = c.req.param('id');
    const updates = await c.req.json() as any;
    const keys = Object.keys(updates);
    if (keys.length === 0) return c.json({ success: true });

    const setClause = keys.map(k => {
        const dbKey = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        return `${dbKey} = ?`;
    }).join(', ');

    const values = keys.map(k => {
        const val = updates[k];
        return (typeof val === 'object' && val !== null) ? JSON.stringify(val) : val;
    });

    await c.env.DB.prepare(`UPDATE leads SET ${setClause} WHERE id = ?`).bind(...values, id).run();
    return c.json({ success: true });
});

export const onRequest = handle(app);
