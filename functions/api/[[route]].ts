
import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';
import { cors } from 'hono/cors';

type Bindings = {
  DB: D1Database;
};

// REMOVIDO: .basePath('/api') pois o diretório functions/api já define o prefixo
const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors());

app.onError((err, c) => {
  console.error(`[API ERROR]: ${err.message}`);
  return c.json({ error: "Erro interno do servidor", details: err.message }, 500);
});

const safeParse = (val: any) => {
    if (!val) return [];
    if (typeof val === 'object') return val;
    try { 
        return JSON.parse(val); 
    } catch { 
        return []; 
    }
};

// --- SETTINGS PÚBLICAS ---
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
// Esta rota agora é acessível em /api/sync/:accountId
app.get('/sync/:accountId', async (c) => {
    const accountId = c.req.param('accountId');
    console.log(`[SYNC] Iniciando sincronização para conta: ${accountId}`);
    
    try {
        const [funnelsRes, stagesRes, leadsRes, usersRes, teamsRes, fieldsRes, webhooksRes] = await Promise.all([
            c.env.DB.prepare('SELECT * FROM funnels WHERE account_id = ?').bind(accountId).all(),
            c.env.DB.prepare('SELECT * FROM stages WHERE funnel_id IN (SELECT id FROM funnels WHERE account_id = ?) ORDER BY "order" ASC').bind(accountId).all(),
            c.env.DB.prepare('SELECT * FROM leads WHERE account_id = ? ORDER BY created_at DESC').bind(accountId).all(),
            c.env.DB.prepare('SELECT id, account_id, name, email, role, avatar, team_id, status, last_login FROM users WHERE account_id = ?').bind(accountId).all(),
            c.env.DB.prepare('SELECT * FROM teams WHERE account_id = ?').bind(accountId).all(),
            c.env.DB.prepare('SELECT * FROM custom_fields WHERE account_id = ?').bind(accountId).all(),
            c.env.DB.prepare('SELECT * FROM webhooks WHERE account_id = ?').bind(accountId).all()
        ]);

        const allStages = stagesRes.results || [];
        
        // Mapeamento de Funis com Estágios aninhados
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

        // Mapeamento de Leads com parse de JSON
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

        // Mapeamento de Usuários
        const users = (usersRes.results || []).map((u: any) => ({
            id: u.id,
            accountId: u.account_id,
            name: u.name,
            email: u.email,
            role: u.role,
            avatar: u.avatar,
            teamId: u.team_id,
            status: u.status,
            lastLogin: u.last_login
        }));

        // Mapeamento de Campos Personalizados
        const customFields = (fieldsRes.results || []).map((cf: any) => ({
            id: cf.id,
            accountId: cf.account_id,
            name: cf.name,
            type: cf.type,
            context: cf.context,
            funnelId: cf.funnel_id,
            options: safeParse(cf.options),
            visibleStageIds: safeParse(cf.visible_stage_ids)
        }));

        console.log(`[SYNC] Sucesso. Funis: ${funnels.length}, Leads: ${leads.length}`);

        return c.json({
            funnels,
            leads,
            users,
            teams: teamsRes.results || [],
            customFields,
            webhooks: webhooksRes.results || []
        });
    } catch (e: any) {
        console.error(`[SYNC ERROR]: ${e.message}`);
        return c.json({ error: e.message }, 500);
    }
});

// --- AUTH ---
app.post('/auth/login', async (c) => {
    const { email, password } = await c.req.json() as any;
    const user: any = await c.env.DB.prepare(
        'SELECT * FROM users WHERE email = ? AND password = ? AND status = "active"'
    ).bind(email, password).first();

    if (!user) {
        return c.json({ error: "E-mail ou senha incorretos." }, 401);
    }
    
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

export const onRequest = handle(app);
