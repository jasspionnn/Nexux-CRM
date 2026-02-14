
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

// --- PLAYGROUND / TESTE DA IA ---
app.post('/bot/chat-test', async (c) => {
    try {
        const { message, accountId } = await c.req.json() as any;
        const apiKey = process.env.API_KEY;

        if (!apiKey) {
            return c.json({ error: "API_KEY não configurada no Cloudflare" }, 500);
        }

        // 1. RAG (Busca de contexto)
        let context = "";
        try {
            const embeddingResponse = await c.env.AI.run('@cf/baai/bge-small-en-v1.5', { text: [message] });
            const queryVector = embeddingResponse.data[0];

            const vectorMatches = await c.env.VECTORIZE.query(queryVector, {
                topK: 3,
                filter: { account_id: accountId } 
            });

            if (vectorMatches.matches.length > 0) {
                const chunkIds = vectorMatches.matches.map((m: any) => m.id);
                const placeholders = chunkIds.map(() => '?').join(',');
                const chunks = await c.env.DB.prepare(`SELECT content FROM knowledge_chunks WHERE id IN (${placeholders})`).bind(...chunkIds).all();
                context = chunks.results.map((r: any) => r.content).join('\n');
            }
        } catch (ragError) {
            console.error("Erro no RAG:", ragError);
            // Continua sem contexto se o RAG falhar
        }

        // 2. Chamada Gemini
        const ai = new GoogleGenAI({ apiKey });
        const model = ai.models.generateContent({
            model: 'gemini-1.5-flash', // Usando um modelo mais estável para evitar erros de preview
            config: {
                systemInstruction: `Você é um assistente de vendas da empresa. Use este contexto: ${context}`,
                temperature: 0.7
            },
            contents: [{ role: 'user', parts: [{ text: message }] }]
        });

        const result = await model;
        return c.json({ response: result.text });

    } catch (err: any) {
        console.error("Erro na API da IA:", err);
        return c.json({ error: err.message || "Erro interno na IA" }, 500);
    }
});

// --- RESTO DAS ROTAS (WHATSAPP E KNOWLEDGE) ---
// ... (mantenha os endpoints de webhook e processamento anteriores)

export const onRequest = handle(app);
