
import { GoogleGenAI } from "@google/genai";
import { Lead, Funnel } from "../types";

export const analyzePipelineStrategy = async (leads: Lead[], funnels: Funnel[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const funnelData = funnels.map(f => {
    const fLeads = leads.filter(l => l.funnelId === f.id);
    const won = fLeads.filter(l => l.probability === 100);
    const lost = fLeads.filter(l => l.probability === 0);
    const open = fLeads.filter(l => l.probability > 0 && l.probability < 100);
    
    return {
      name: f.name,
      won: won.length,
      lost: lost.length,
      open: open.length,
      value: open.reduce((a, b) => a + b.value, 0)
    };
  });

  const prompt = `
    Como um Consultor Estratégico de Vendas (Nexus AI), analise o pipeline atual e forneça recomendações de alto nível.
    
    DADOS ATUAIS:
    ${JSON.stringify(funnelData, null, 2)}
    
    TOTAL DE LEADS: ${leads.length}
    VALOR EM PIPELINE: R$ ${leads.filter(l => l.probability < 100 && l.probability > 0).reduce((a,b) => a + b.value, 0).toLocaleString()}
    
    ESTRUTURA DA RESPOSTA:
    1. Saúde do Pipeline (Score 0-100).
    2. Alerta de Gargalo (Onde os leads estão parando?).
    3. Sugestão Tática (Ações imediatas para os vendedores).
    4. Projeção de Receita (Baseado na probabilidade média).
    
    Use tom executivo, direto e em Português do Brasil.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
    });
    return response.text || "Análise indisponível no momento.";
  } catch (err) {
    console.error("Nexus AI Analysis Error:", err);
    return "Erro ao conectar com o cérebro da IA.";
  }
};

export const generateLeadStrategy = async (lead: Lead, funnelName: string, stageName: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Analise este lead e sugira 3 ações: ${lead.title} da empresa ${lead.company} no valor de R$ ${lead.value}. Etapa: ${stageName}. Notas: ${lead.notes.map(n => n.content).join('; ')}`;
  try {
    const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: prompt });
    return response.text || "Sem sugestões.";
  } catch (error) { return "Erro na IA."; }
};
