
import { GoogleGenAI } from "@google/genai";
import { Lead, Funnel } from "../types";

/**
 * Analisa o estado atual do pipeline de vendas para fornecer insights estratégicos globais.
 * Utiliza o modelo gemini-3-pro-preview para tarefas complexas de raciocínio.
 */
export const analyzePipelineStrategy = async (leads: Lead[], funnels: Funnel[]): Promise<string> => {
  // Inicialização do cliente seguindo as diretrizes de segurança (API_KEY do process.env)
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const pipelineSummary = funnels.map(f => {
    const funnelLeads = leads.filter(l => l.funnelId === f.id);
    const stagesSummary = f.stages.map(s => {
      const count = funnelLeads.filter(l => l.stageId === s.id).length;
      return `${s.name}: ${count} leads`;
    }).join(', ');
    return `Funil "${f.name}": [${stagesSummary}]`;
  }).join('\n');

  const prompt = `
    Como um Diretor de Operações de Vendas Sênior, analise o estado atual deste CRM e forneça insights estratégicos.
    
    ESTADO DOS FUNIS:
    ${pipelineSummary}
    
    MÉTRICAS TOTAIS:
    - Total de Leads: ${leads.length}
    - Valor total em aberto: R$ ${leads.filter(l => l.probability > 0 && l.probability < 100).reduce((a,b) => a + b.value, 0).toLocaleString()}
    
    INSTRUÇÕES:
    1. Identifique gargalos (estágios com muitos leads parados).
    2. Sugira uma ação imediata para aumentar a conversão.
    3. Identifique qual funil parece mais promissor.
    4. Responda em Markdown profissional, com tom direto e executivo em Português do Brasil.
  `;

  try {
    // Chamada direta ao generateContent com modelo e prompt unificados
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
    });
    // Extração do texto usando a propriedade .text (não o método .text())
    return response.text || "Não foi possível gerar a análise no momento.";
  } catch (err) {
    console.error("Gemini Error (Pipeline Analysis):", err);
    return "Erro ao processar análise estratégica.";
  }
};

/**
 * Gera uma estratégia específica para um lead individual com base em seu contexto atual.
 */
export const generateLeadStrategy = async (lead: Lead, funnelName: string, stageName: string): Promise<string> => {
  // Inicialização do cliente garantindo o uso da API KEY mais recente
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
    // Chamada ao modelo Pro para melhor raciocínio estratégico
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
    });
    // Uso da propriedade .text para extrair a resposta
    return response.text || "Não foi possível gerar uma estratégia no momento.";
  } catch (error) {
    console.error("Gemini Error (Lead Strategy):", error);
    return "Erro ao conectar com a IA.";
  }
};
