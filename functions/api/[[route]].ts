
import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';
import { GoogleGenAI } from "@google/genai";

type Bindings = {
  DB: D1Database;
  VECTORIZE: any;
  AI: any;
};

const app = new Hono<{ Bindings: Bindings }>().basePath('/api');

// --- HELPER PARA LOGAR NO BANCO ---
async function logHistory(db: D1Database, accountId: string, phone: string, role: string, content: string) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await db.prepare(
        'INSERT INTO bot_chat_history (id, account_id, lead_phone, role, content) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, accountId, phone, role, content).run();
}

// --- PLAYGROUND (COM GRAVAÇÃO) ---
app.post('/bot/chat-test', async (c) => {
    try {
        const { message, accountId } = await c.req.json() as any;
        const apiKey = process.env.API_KEY;

        if (!apiKey) throw new Error("Chave de API (API_KEY) não encontrada no ambiente.");
        if (!accountId) throw new Error("ID da conta não enviado.");

        // 1. RAG - Busca Contexto
        let context = "";
        try {
            const embedding = await c.env.AI.run('@cf/baai/bge-small-en-v1.5', { text: [message] });
            const vector = embedding.data[0];
            const matches = await c.env.VECTORIZE.query(vector, { topK: 3, filter: { account_id: accountId } });
            
            if (matches.matches?.length > 0) {
                const ids = matches.matches.map((m: any) => m.id);
                const { results } = await c.env.DB.prepare(
                    `SELECT content FROM knowledge_chunks WHERE id IN (${ids.map(() => '?').join(',')})`
                ).bind(...ids).all();
                context = results.map((r: any) => r.content).join('\n');
            }
        } catch (e) { console.error("RAG Bypass:", e); }

        // 2. IA - Resposta
        const ai = new GoogleGenAI({ apiKey });
        const result = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            config: {
                systemInstruction: `Responda usando este contexto: ${context || 'Nenhum contexto encontrado.'}`,
                temperature: 0.7
            },
            contents: [{ role: 'user', parts: [{ text: message }] }]
        });

        const aiText = result.text || "Sem resposta.";

        // 3. GRAVAÇÃO NO BANCO (Obrigatória)
        // Usamos 'PLAYGROUND' como telefone para testes
        await Promise.all([
            logHistory(c.env.DB, accountId, 'PLAYGROUND', 'user', message),
            logHistory(c.env.DB, accountId, 'PLAYGROUND', 'model', aiText)
        ]);

        return c.json({ response: aiText });

    } catch (err: any) {
        return c.json({ error: err.message }, 500);
    }
});

// --- SALVAR FONTE DE CONHECIMENTO ---
app.post('/knowledge', async (c) => {
    const { id, accountId, name, type } = await c.req.json() as any;
    await c.env.DB.prepare(
        'INSERT INTO knowledge_sources (id, account_id, name, type) VALUES (?, ?, ?, ?)'
    ).bind(id, accountId, name, type).run();
    return c.json({ success: true });
});

// --- PROCESSAR E SALVAR CHUNKS VETORIAIS ---
app.post('/knowledge/process', async (c) => {
    const { accountId, sourceId, content } = await c.req.json() as any;
    const chunks = content.match(/.{1,800}/g) || [];

    for (const text of chunks) {
        const chunkId = `chk-${crypto.randomUUID()}`;
        const emb = await c.env.AI.run('@cf/baai/bge-small-en-v1.5', { text: [text] });
        
        await Promise.all([
            c.env.VECTORIZE.upsert([{ id: chunkId, values: emb.data[0], metadata: { account_id: accountId } }]),
            c.env.DB.prepare('INSERT INTO knowledge_chunks (id, account_id, source_id, content) VALUES (?, ?, ?, ?)')
                .bind(chunkId, accountId, sourceId, text).run()
        ]);
    }
    return c.json({ success: true });
});

export const onRequest = handle(app);
