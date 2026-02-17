
import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';
import { cors } from 'hono/cors';

type Bindings = {
  DB: D1Database;
  VECTORIZE: any;
  AI: any;
};

const app = new Hono<{ Bindings: Bindings }>().basePath('/api');

app.use('*', cors());

app.onError((err, c) => {
  console.error(`[API ERROR]: ${err.message}`);
  return c.json({ error: "Erro de conexão com o banco de dados", details: err.message }, 500);
});

const safeParse = (val: any) => {
    if (!val) return [];
    if (typeof val === 'object') return val;
    try { return JSON.parse(val); } catch { return []; }
};

// --- SYNC ENGINE (CORRIGIDO PARA BUSCAR ESTÁGIOS RELACIONAIS) ---
app.get('/sync/:accountId', async (c) => {
    const accountId = c.req.param('accountId');
    
    try {
        const [funnelsRes, stagesRes, leadsRes, usersRes, teamsRes, fieldsRes] = await Promise.all([
            c.env.DB.prepare('SELECT * FROM funnels WHERE account_id = ?').bind(accountId).all(),
            c.env.DB.prepare('SELECT * FROM stages WHERE funnel_id IN (SELECT id FROM funnels WHERE account_id = ?) ORDER BY "order" ASC').bind(accountId).all(),
            c.env.DB.prepare('SELECT * FROM leads WHERE account_id = ? ORDER BY created_at DESC').bind(accountId).all(),
            c.env.DB.prepare('SELECT id, name, email, role, avatar, team_id, status, last_login FROM users WHERE account_id = ?').bind(accountId).all(),
            c.env.DB.prepare('SELECT * FROM teams WHERE account_id = ?').bind(accountId).all(),
            c.env.DB.prepare('SELECT * FROM custom_fields WHERE account_id = ?').bind(accountId).all()
        ]);

        // 1. Processar Funis e acoplar Estágios da tabela relacional
        const allStages = stagesRes.results || [];
        const formattedFunnels = (funnelsRes.results || []).map((f: any) => {
            // Se existirem estágios na tabela relacional, usamos eles. 
            // Caso contrário, tentamos o fallback da coluna JSON.
            const relationalStages = allStages
                .filter((s: any) => s.funnel_id === f.id)
                .map((s: any) => ({
                    id: s.id,
                    name: s.name,
                    color: s.color,
                    order: s.order
                }));

            return {
                id: f.id,
                accountId: f.account_id,
                name: f.name,
                stages: relationalStages.length > 0 ? relationalStages : safeParse(f.stages),
                defaultWonStageId: f.default_won_stage_id,
                defaultLostStageId: f.default_lost_stage_id
            };
        });

        // 2. Processar Leads com mapeamento camelCase
        const formattedLeads = (leadsRes.results || []).map((l: any) => ({
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

        // 3. Processar Usuários
        const formattedUsers = (usersRes.results || []).map((u: any) => ({
            ...u,
            accountId: u.account_id,
            teamId: u.team_id,
            lastLogin: u.last_login
        }));

        return c.json({
            funnels: formattedFunnels,
            leads: formattedLeads,
            users: formattedUsers,
            teams: teamsRes.results || [],
            customFields: (fieldsRes.results || []).map((cf: any) => ({ 
                ...cf, 
                accountId: cf.account_id,
                funnelId: cf.funnel_id,
                options: safeParse(cf.options), 
                visibleStageIds: safeParse(cf.visible_stage_ids) 
            }))
        });
    } catch (e: any) {
        console.error("Erro no Sync:", e);
        return c.json({ error: e.message }, 500);
    }
});

// --- AUTH ---
app.post('/auth/login', async (c) => {
    const { email, password } = await c.req.json() as any;
    const user: any = await c.env.DB.prepare(
        'SELECT * FROM users WHERE email = ? AND password = ? AND status = "active"'
    ).bind(email, password).first();

    if (!user) return c.json({ error: "Credenciais inválidas." }, 401);
    
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
