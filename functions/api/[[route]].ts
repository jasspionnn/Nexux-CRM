
import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';
import { GoogleGenAI } from "@google/genai";

interface VectorizeIndex {
  query(vector: number[] | Float32Array, options?: { topK?: number; filter?: any; returnVectors?: boolean; returnMetadata?: boolean }): Promise<any>;
  upsert(vectors: { id: string; values: number[]; metadata?: any }[]): Promise<any>;
}

type Bindings = {
  DB: D1Database;
  VECTORIZE: VectorizeIndex;
  AI: any;
};

const app = new Hono<{ Bindings: Bindings }>().basePath('/api');

// --- WEBHOOK DO WHATSAPP (PROCESSAMENTO RAG) ---
app.post('/whatsapp/webhook/:accountId', async (c) => {
    const accountId = c.req.param('accountId');
    const body = await c.req.json() as any;
    
    // Extração básica (ajustar conforme o provedor de WhatsApp)
    const messageText = body.text?.message || body.message?.text;
    const leadPhone = body.sender?.phone || body.from;

    if (!messageText || !leadPhone) return c.json({ status: 'ignored' });

    // 1. Buscar Configurações e Memória Recente (5 últimas mensagens)
    const [settings, history] = await Promise.all([
        c.env.DB.prepare('SELECT * FROM bot_settings WHERE account_id = ? AND active = 1').bind(accountId).first() as any,
        c.env.DB.prepare('SELECT role, content FROM bot_chat_history WHERE account_id = ? AND lead_phone = ? ORDER BY timestamp DESC LIMIT 5').bind(accountId, leadPhone).all()
    ]);

    if (!settings) return c.json({ status: 'bot_inactive' });

    // 2. GERAÇÃO DE EMBEDDING (Cloudflare AI)
    // Converte a pergunta do usuário em um vetor numérico
    const embeddingResponse = await c.env.AI.run('@cf/baai/bge-small-en-v1.5', { text: [messageText] });
    const queryVector = embeddingResponse.data[0];

    // 3. BUSCA VETORIAL (Cloudflare Vectorize)
    // Busca os trechos de conhecimento mais próximos, filtrando pelo accountId
    const vectorMatches = await c.env.VECTORIZE.query(queryVector, {
        topK: 3,
        filter: { account_id: accountId } 
    });

    // 4. RECUPERAÇÃO DE CONTEXTO (D1)
    let context = "Informações Adicionais:\n";
    if (vectorMatches.matches.length > 0) {
        const chunkIds = vectorMatches.matches.map(m => m.id);
        const placeholders = chunkIds.map(() => '?').join(',');
        const chunks = await c.env.DB.prepare(`SELECT content FROM knowledge_chunks WHERE id IN (${placeholders})`).bind(...chunkIds).all();
        context += chunks.results.map((r: any) => `- ${r.content}`).join('\n');
    }

    // 5. CHAMADA GEMINI
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: settings.model || 'gemini-3-flash-preview',
        config: {
            systemInstruction: `${settings.system_prompt}\n\nUSE O CONTEXTO ABAIXO PARA RESPONDER CASO SEJA RELEVANTE:\n${context}`,
            temperature: settings.temperature || 0.7
        },
        contents: [
            // Inclui histórico para manter o fio da meada
            ...history.results.reverse().map((h: any) => ({ role: h.role, parts: [{ text: h.content }] })),
            { role: 'user', parts: [{ text: messageText }] }
        ]
    });

    const aiResponse = response.text;

    // 6. SALVAR NO D1 (Batch)
    const logId = Date.now().toString();
    await c.env.DB.batch([
        c.env.DB.prepare('INSERT INTO bot_chat_history (id, account_id, lead_phone, role, content) VALUES (?, ?, ?, ?, ?)').bind(`${logId}-u`, accountId, leadPhone, 'user', messageText),
        c.env.DB.prepare('INSERT INTO bot_chat_history (id, account_id, lead_phone, role, content) VALUES (?, ?, ?, ?, ?)').bind(`${logId}-m`, accountId, leadPhone, 'model', aiResponse)
    ]);

    return c.json({ success: true, response: aiResponse });
});

// --- PROCESSAMENTO DE DOCUMENTOS (TRAINING) ---
app.post('/knowledge/process', async (c) => {
    const { accountId, sourceId, content } = await c.req.json() as any;

    // 1. Quebrar em Chunks (blocos de ~800 caracteres com sobreposição)
    const chunks = [];
    for (let i = 0; i < content.length; i += 700) {
        chunks.push(content.substring(i, i + 800));
    }
    
    // 2. Processar cada bloco
    for (const chunkText of chunks) {
        const chunkId = `chunk-${crypto.randomUUID()}`;
        
        // Gerar Embedding
        const embedding = await c.env.AI.run('@cf/baai/bge-small-en-v1.5', { text: [chunkText] });
        
        // Salvar no Vectorize
        await c.env.VECTORIZE.upsert([{
            id: chunkId,
            values: embedding.data[0],
            metadata: { account_id: accountId }
        }]);

        // Salvar Referência no D1
        await c.env.DB.prepare('INSERT INTO knowledge_chunks (id, account_id, source_id, content) VALUES (?, ?, ?, ?)')
            .bind(chunkId, accountId, sourceId, chunkText).run();
    }

    return c.json({ success: true });
});

export const onRequest = handle(app);
