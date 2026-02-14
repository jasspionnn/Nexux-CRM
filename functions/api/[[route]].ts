
import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>().basePath('/api');

// Lazy Migration para Webhooks
app.use('*', async (c, next) => {
    await c.env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS webhooks (
            id TEXT PRIMARY KEY,
            account_id TEXT NOT NULL,
            name TEXT NOT NULL,
            funnel_id TEXT NOT NULL,
            stage_id TEXT NOT NULL,
            active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now'))
        )
    `).run();
    await next();
});

app.onError((err, c) => {
  console.error(`[API ERROR]:`, err);
  return c.json({ error: err.message || 'Erro interno', status: 500 }, 500);
});

// --- WEBHOOKS MANAGEMENT ---

app.get('/webhooks/:accountId', async (c) => {
    const accountId = c.req.param('accountId');
    const result = await c.env.DB.prepare('SELECT * FROM webhooks WHERE account_id = ?').bind(accountId).all();
    return c.json(result.results);
});

app.post('/webhooks', async (c) => {
    const w = await c.req.json() as any;
    await c.env.DB.prepare(
        'INSERT INTO webhooks (id, account_id, name, funnel_id, stage_id, active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(w.id, w.accountId, w.name, w.funnelId, w.stage_id || w.stageId, w.active ? 1 : 0, w.createdAt).run();
    return c.json({ success: true });
});

app.patch('/webhooks/:id', async (c) => {
    const id = c.req.param('id');
    const data = await c.req.json() as any;
    const fields: string[] = [];
    const values: any[] = [];
    
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.funnelId !== undefined) { fields.push('funnel_id = ?'); values.push(data.funnelId); }
    if (data.stageId !== undefined) { fields.push('stage_id = ?'); values.push(data.stageId); }
    if (data.active !== undefined) { fields.push('active = ?'); values.push(data.active ? 1 : 0); }
    
    if (fields.length > 0) {
        await c.env.DB.prepare(`UPDATE webhooks SET ${fields.join(', ')} WHERE id = ?`).bind(...values, id).run();
    }
    return c.json({ success: true });
});

app.delete('/webhooks/:id', async (c) => {
    await c.env.DB.prepare('DELETE FROM webhooks WHERE id = ?').bind(c.req.param('id')).run();
    return c.json({ success: true });
});

// --- PUBLIC WEBHOOK RECEIVER ---

app.post('/webhooks/receive/:webhookId', async (c) => {
    const webhookId = c.req.param('webhookId');
    let payload: any;
    
    try {
        payload = await c.req.json();
    } catch (e) {
        return c.json({ error: 'Payload JSON inválido' }, 400);
    }

    // 1. Localizar configuração do Webhook
    const webhook = await c.env.DB.prepare('SELECT * FROM webhooks WHERE id = ?').bind(webhookId).first() as any;
    if (!webhook) {
        return c.json({ error: 'Integração não encontrada' }, 404);
    }
    if (!webhook.active) {
        return c.json({ error: 'Integração inativa' }, 403);
    }

    // 2. Mapeamento Inteligente de Campos
    const findInPayload = (keys: string[]) => {
        for (const k of keys) {
            const foundKey = Object.keys(payload).find(pKey => pKey.toLowerCase() === k.toLowerCase());
            if (foundKey) return payload[foundKey];
        }
        return '';
    };

    const name = findInPayload(['nome', 'name', 'full_name', 'contato', 'contact', 'client']);
    const email = findInPayload(['email', 'e-mail', 'mail', 'user_email']);
    const phone = findInPayload(['phone', 'telefone', 'tel', 'whatsapp', 'celular', 'mobile']);
    const company = findInPayload(['company', 'empresa', 'negocio', 'business', 'organizacao']) || 'Origem Externa';
    const value = parseFloat(findInPayload(['value', 'valor', 'price', 'amount', 'budget'])) || 0;

    const leadId = `l_wb_${Date.now()}`;

    // 3. Criar Lead no banco
    try {
        await c.env.DB.prepare(`
            INSERT INTO leads (
                id, account_id, title, company, value, 
                contact_name, contact_email, contact_phone, 
                funnel_id, stage_id, assigned_user_id, 
                probability, tags, notes, tasks, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            leadId,
            webhook.account_id,
            `Lead: ${name || company || 'Novo Contato'}`,
            company,
            value,
            name || 'Visitante',
            email,
            phone,
            webhook.funnel_id,
            webhook.stage_id,
            null, // Sem dono definido inicialmente
            10,   // Probabilidade padrão
            JSON.stringify(['Webhook', webhook.name]),
            JSON.stringify([{
                id: `note_wb_${Date.now()}`,
                content: `Lead recebido via Integração: ${webhook.name}\n\nDados brutos:\n${JSON.stringify(payload, null, 2)}`,
                createdAt: new Date().toISOString(),
                authorName: 'Nexus Webhook'
            }]),
            JSON.stringify([]),
            new Date().toISOString()
        ).run();

        return c.json({ success: true, leadId });
    } catch (err: any) {
        return c.json({ error: 'Erro ao processar lead', details: err.message }, 500);
    }
});

// --- SISTEMA E OUTRAS ROTAS ---

app.get('/health', async (c) => {
    try {
        await c.env.DB.prepare('SELECT 1').first();
        return c.json({ status: 'ok' });
    } catch (e: any) {
        return c.json({ status: 'error', error: e.message }, 500);
    }
});

app.get('/public/settings', async (c) => {
    try {
        const settings = await c.env.DB.prepare('SELECT * FROM system_settings').all();
        const config = settings.results.reduce((acc: any, curr: any) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});
        return c.json(config);
    } catch (e) {
        return c.json({ login_background: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=2000' });
    }
});

app.post('/auth/login', async (c) => {
    const { email, password } = await c.req.json() as any;
    const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ? AND password = ?')
        .bind(email, password).first() as any;
    if (!user) return c.json({ error: 'Credenciais inválidas' }, 401);
    return c.json({ user: { id: user.id, accountId: user.account_id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } });
});

app.post('/auth/register', async (c) => {
    const { userName, email, password, companyName } = await c.req.json() as any;
    const accountId = `acc_${Date.now()}`;
    const userId = `u_${Date.now()}`;
    await c.env.DB.batch([
        c.env.DB.prepare('INSERT INTO accounts (id, company_name, owner_name, email) VALUES (?, ?, ?, ?)').bind(accountId, companyName, userName, email),
        c.env.DB.prepare('INSERT INTO users (id, account_id, name, email, password, role, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(userId, accountId, userName, email, password, 'ACCOUNT_ADMIN', `https://ui-avatars.com/api/?name=${userName}`)
    ]);
    return c.json({ success: true });
});

app.get('/sync/:accountId', async (c) => {
    const accountId = c.req.param('accountId');
    const [funnels, leads, users, teams, customFields] = await Promise.all([
        c.env.DB.prepare('SELECT * FROM funnels WHERE account_id = ?').bind(accountId).all(),
        c.env.DB.prepare('SELECT * FROM leads WHERE account_id = ?').bind(accountId).all(),
        c.env.DB.prepare('SELECT id, account_id as accountId, name, email, role, team_id as teamId, avatar, status FROM users WHERE account_id = ?').bind(accountId).all(),
        c.env.DB.prepare('SELECT * FROM teams WHERE account_id = ?').bind(accountId).all(),
        c.env.DB.prepare('SELECT * FROM custom_fields WHERE account_id = ?').bind(accountId).all()
    ]);
    
    let stages: any[] = [];
    if (funnels.results.length > 0) {
        const ids = funnels.results.map((f: any) => f.id);
        const placeholders = ids.map(() => '?').join(',');
        const stagesData = await c.env.DB.prepare(`SELECT * FROM stages WHERE funnel_id IN (${placeholders}) ORDER BY "order" ASC`)
            .bind(...ids).all();
        stages = stagesData.results;
    }

    return c.json({
        funnels: funnels.results.map((f: any) => ({
            id: f.id,
            name: f.name,
            stages: stages.filter((s: any) => s.funnel_id === f.id).map((s: any) => ({ id: s.id, name: s.name, color: s.color, order: s.order }))
        })),
        leads: leads.results.map((l: any) => ({
            id: l.id,
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
            notes: JSON.parse(l.notes || '[]'),
            tasks: JSON.parse(l.tasks || '[]'),
            tags: JSON.parse(l.tags || '[]'),
            customValues: JSON.parse(l.custom_values || '{}'),
            createdAt: l.created_at
        })),
        users: users.results,
        teams: teams.results,
        customFields: customFields.results.map((cf: any) => ({
            id: cf.id,
            name: cf.name,
            type: cf.type,
            context: cf.context,
            funnelId: cf.funnel_id,
            options: JSON.parse(cf.options || '[]'),
            visibleStageIds: JSON.parse(cf.visible_stage_ids || '[]')
        }))
    });
});

app.post('/leads', async (c) => {
    const l = await c.req.json() as any;
    await c.env.DB.prepare(`
        INSERT INTO leads (id, account_id, title, company, value, contact_name, contact_email, contact_phone, funnel_id, stage_id, assigned_user_id, probability, tasks, notes, tags, custom_values, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(l.id, l.accountId, l.title, l.company, l.value, l.contactName, l.contactEmail, l.contactPhone, l.funnelId, l.stageId, l.assignedUserId, l.probability, JSON.stringify(l.tasks || []), JSON.stringify(l.notes || []), JSON.stringify(l.tags || []), JSON.stringify(l.customValues || {}), l.createdAt).run();
    return c.json({ success: true });
});

app.patch('/leads/:id', async (c) => {
    const id = c.req.param('id');
    const data = await c.req.json() as any;
    const fields: string[] = [];
    const values: any[] = [];
    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
    if (data.stageId !== undefined) { fields.push('stage_id = ?'); values.push(data.stageId); }
    if (data.funnelId !== undefined) { fields.push('funnel_id = ?'); values.push(data.funnelId); }
    if (data.contactName !== undefined) { fields.push('contact_name = ?'); values.push(data.contactName); }
    if (data.contactEmail !== undefined) { fields.push('contact_email = ?'); values.push(data.contactEmail); }
    if (data.contactPhone !== undefined) { fields.push('contact_phone = ?'); values.push(data.contactPhone); }
    if (data.company !== undefined) { fields.push('company = ?'); values.push(data.company); }
    if (data.value !== undefined) { fields.push('value = ?'); values.push(data.value); }
    if (data.assignedUserId !== undefined) { fields.push('assigned_user_id = ?'); values.push(data.assignedUserId); }
    if (data.probability !== undefined) { fields.push('probability = ?'); values.push(data.probability); }
    if (data.tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(data.tags)); }
    if (data.customValues !== undefined) { fields.push('custom_values = ?'); values.push(JSON.stringify(data.customValues)); }
    if (data.notes !== undefined) { fields.push('notes = ?'); values.push(JSON.stringify(data.notes)); }
    if (data.tasks !== undefined) { fields.push('tasks = ?'); values.push(JSON.stringify(data.tasks)); }
    if (fields.length > 0) { await c.env.DB.prepare(`UPDATE leads SET ${fields.join(', ')} WHERE id = ?`).bind(...values, id).run(); }
    return c.json({ success: true });
});

app.delete('/leads/:id', async (c) => {
    await c.env.DB.prepare('DELETE FROM leads WHERE id = ?').bind(c.req.param('id')).run();
    return c.json({ success: true });
});

app.patch('/admin/settings', async (c) => {
    const body = await c.req.json() as any;
    for (const [key, value] of Object.entries(body)) {
        await c.env.DB.prepare('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)').bind(key, String(value)).run();
    }
    return c.json({ success: true });
});

export const onRequest = handle(app);
