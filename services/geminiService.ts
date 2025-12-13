import { GoogleGenAI } from "@google/genai";
import { Lead } from "../types";

export const generateLeadStrategy = async (lead: Lead, funnelName: string, stageName: string): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return "API Key not configured.";
  }
  
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Atue como um estrategista de vendas sênior.
    Analise o seguinte lead e forneça uma estratégia curta (máximo 3 pontos) para mover este lead para a próxima etapa ou fechar o negócio.
    
    Lead: ${lead.title} (Empresa: ${lead.company})
    Valor: R$ ${lead.value}
    Funil Atual: ${funnelName}
    Etapa Atual: ${stageName}
    Probabilidade de Fechamento: ${lead.probability}%
    Notas Recentes: ${lead.notes.map(n => n.content).join('; ')}
    
    Responda em Português do Brasil. Use tom profissional e direto.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Não foi possível gerar uma estratégia no momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Erro ao conectar com a IA.";
  }
};