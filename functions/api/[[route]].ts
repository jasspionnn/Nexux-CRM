
import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';
import { GoogleGenAI } from "@google/genai";

type Bindings = {
  DB: D1Database;
  VECTORIZE: any;
  AI: any;
};

const app = new Hono<{ Bindings: Bindings }>().basePath('/api');

const generateId = (prefix: string) => `${prefix}_${crypto.randomUUID().split('-')[0]}`;

// --- AUTH ---
app.post('/auth/login', async (c) => {
    try {
        const { email, password } = await c.req.json() as any;
        const user = await c.env.DB.prepare(
            'SELECT * FROM users WHERE email = ? AND password = ? AND status = "active"'
        ).bind(email, password).first();

        if (!user) return c.json({ error: "Credenciais inválidas ou conta inativa" }, 401);
        
        await c.env.DB.prepare('UPDATE users SET last_login = ? WHERE id = ?')
            .bind(new Date().toISOString(), (user as any).id).run();

        return c.json({ user });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

app.post('/auth/register', async (c) => {
    const { userName, email, password, companyName } = await c.req.json() as any;
    const accountId = generateId('acc');
    const userId = generateId('u');

    try {
        await c.env.DB.batch([
            c.env.DB.prepare('INSERT INTO accounts (id, company_name, owner_name, email, status, plan) VALUES (?, ?, ?, ?, "active", "pro")')
                .bind(accountId, companyName, userName, email),
            c.env.DB.prepare('INSERT INTO users (id, account_id, name, email, password, role, status, avatar) VALUES (?, ?, ?, ?, ?, "ACCOUNT_ADMIN", "active", ?)')
                .bind(userId, accountId, userName, email, password, `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}`)
        ]);
        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ error: "Erro ao criar conta: " + e.message }, 500);
    }
});

// --- SYNC ---
app.get('/sync/:accountId', async (c) => {
    const accountId = c.req.param('accountId');
    try {
        const [funnels, leads, users, teams, fields] = await Promise.all([
            c.env.DB.prepare('SELECT * FROM funnels WHERE account_id = ?').bind(accountId).all(),
            c.env.DB.prepare('SELECT * FROM leads WHERE account_id = ? ORDER BY created_at DESC').bind(accountId).all(),
            c.env.DB.prepare('SELECT id, name, email, role, avatar, team_id, status FROM users WHERE account_id = ?').bind(accountId).all(),
            c.env.DB.prepare('SELECT * FROM teams WHERE account_id = ?').bind(accountId).all(),
            c.env.DB.prepare('SELECT * FROM custom_fields WHERE account_id = ?').bind(accountId).all()
        ]);

        const formattedFunnels = (funnels.results || []).map((f: any) => {
            let stages = [];
            try {
                stages = typeof f.stages === 'string' ? JSON.parse(f.stages) : (f.stages || []);
            } catch (e) { stages = []; }
            return { ...f, stages };
        });

        const formattedLeads = (leads.results || []).map((l: any) => {
            const parse = (val: any) => {
                try { return typeof val === 'string' ? JSON.parse(val) : (val || []); }
                catch(e) { return []; }
            };
            return {
                ...l,
                notes: parse(l.notes),
                tasks: parse(l.tasks),
                tags: parse(l.tags),
                customValues: parse(l.custom_values)
            };
        });

        return c.json({
            funnels: formattedFunnels,
            leads: formattedLeads,
            users: users.results || [],
            teams: teams.results || [],
            customFields: fields.results || []
        });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// --- LEADS CRUD ---
app.post('/leads', async (c) => {
    const lead = await c.req.json() as any;
    try {
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
    } catch (e: any) { return c.json({ error: e.message }, 500); }
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

    try {
        await c.env.DB.prepare(`UPDATE leads SET ${setClause} WHERE id = ?`)
            .bind(...values, id).run();
        return c.json({ success: true });
    } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.delete('/leads/:id', async (c) => {
    await c.env.DB.prepare('DELETE FROM leads WHERE id = ?').bind(c.req.param('id')).run();
    return c.json({ success: true });
});

// --- SETTINGS ---
app.get('/public/settings', async (c) => {
    try {
        const { results } = await c.env.DB.prepare('SELECT key, value FROM system_settings').all();
        const settings = results.reduce((acc: any, cur: any) => ({ ...acc, [cur.key]: cur.value }), {});
        return c.json(settings);
    } catch { return c.json({}); }
});

app.patch('/admin/settings', async (c) => {
    const settings = await c.req.json() as any;
    const queries = Object.entries(settings).map(([key, value]) => 
        c.env.DB.prepare('INSERT INTO system_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
        .bind(key, value)
    );
    await c.env.DB.batch(queries);
    return c.json({ success: true });
});

// --- ADMIN ---
app.get('/admin/accounts', async (c) => {
    const { results } = await c.env.DB.prepare('SELECT * FROM accounts ORDER BY created_at DESC').all();
    return c.json({ accounts: results || [] });
});

// --- IA & BOT ---
app.post('/bot/chat-test', async (c) => {
    try {
        const { message, accountId } = await c.req.json() as any;
        const apiKey = process.env.API_KEY;
        if (!apiKey) throw new Error("Chave Gemini não configurada");

        let context = "Nenhum contexto encontrado.";
        if (c.env.VECTORIZE && c.env.AI) {
            try {
                const emb = await c.env.AI.run('@cf/baai/bge-small-en-v1.5', { text: [message] });
                const matches = await c.env.VECTORIZE.query(emb.data[0], { topK: 3, filter: { account_id: accountId } });
                if (matches.matches?.length > 0) {
                    const ids = matches.matches.map((m: any) => m.id);
                    const { results } = await c.env.DB.prepare(`SELECT content FROM knowledge_chunks WHERE id IN (${ids.map(() => '?').join(',')})`).bind(...ids).all();
                    context = (results || []).map((r: any) => r.content).join('\n');
                }
            } catch (e) { console.error("Falha RAG:", e); }
        }

        const ai = new GoogleGenAI({ apiKey });
        const result = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            config: { systemInstruction: `Você é um assistente de vendas. Use este contexto: ${context}`, temperature: 0.7 },
            contents: [{ role: 'user', parts: [{ text: message }] }]
        });

        const aiText = result.text;
        const historyId = generateId('his');
        await c.env.DB.prepare('INSERT INTO bot_chat_history (id, account_id, lead_phone, role, content) VALUES (?, ?, ?, ?, ?)')
            .bind(historyId, accountId, 'PLAYGROUND', 'user', message).run();

        return c.json({ response: aiText });
    } catch (err: any) {
        return c.json({ error: err.message }, 500);
    }
});

// Placeholder para rotas não implementadas
app.get('/webhooks/:id', (c) => c.json([]));
app.get('/knowledge/:id', async (c) => {
    const { results } = await c.env.DB.prepare('SELECT * FROM knowledge_sources WHERE account_id = ?').bind(c.req.param('id')).all();
    return c.json(results || []);
});
app.get('/bot/:id', (c) => c.json(null));

export const onRequest = handle(app);
