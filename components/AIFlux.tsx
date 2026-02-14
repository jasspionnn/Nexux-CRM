
import React, { useState, useRef, useEffect } from 'react';
import { useCRM } from '../context/CRMContext';
import { 
  Bot, MessageSquare, Upload, Globe, CheckCircle, 
  AlertCircle, Smartphone, Database, BarChart3, 
  Settings2, Plus, Trash2, ExternalLink, QrCode,
  Zap, FileText, Cpu, Eye, Loader2, Send, X, Sparkles as SparklesIcon
} from 'lucide-react';
import { UserRole } from '../types';
import { GoogleGenAI } from "@google/genai";

type AIFluxTab = 'overview' | 'whatsapp' | 'knowledge' | 'admin';

export const AIFlux = () => {
  const { 
    currentUser, 
    knowledgeSources, 
    botInstance, 
    addKnowledgeSource, 
    deleteKnowledgeSource, 
    updateBotInstance, 
    trainAI, 
    users, 
    leads 
  } = useCRM();

  const [activeTab, setActiveTab] = useState<AIFluxTab>('overview');
  const [isTraining, setIsTraining] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'bot', text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [urlModalOpen, setUrlModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAccountAdmin = currentUser?.role === UserRole.ACCOUNT_ADMIN;

  // --- LOGICA DO BOT (ATIVAR/DESATIVAR) ---
  const handleToggleBotStatus = async () => {
      const currentActive = botInstance?.active ?? false;
      await updateBotInstance({ active: !currentActive });
  };

  // --- LOGICA DE TREINAMENTO ---
  const handleTrain = async () => {
    if (knowledgeSources.length === 0) {
        alert("Adicione pelo menos uma fonte de conhecimento antes de treinar.");
        return;
    }
    setIsTraining(true);
    await trainAI();
    setTimeout(() => {
        setIsTraining(false);
        alert("IA Treinada com sucesso! O bot agora está atualizado com seus novos dados.");
    }, 2500);
  };

  // --- LOGICA DE UPLOAD (RAG) ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
          const content = event.target?.result as string;
          await addKnowledgeSource({
              name: file.name,
              type: 'PDF',
              content: content.slice(0, 100000)
          });
      };
      reader.readAsText(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddUrl = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const url = formData.get('url') as string;
      if (url) {
          await addKnowledgeSource({ name: url, type: 'URL', url });
          setUrlModalOpen(false);
      }
  };

  // --- LOGICA WHATSAPP ---
  const toggleWhatsApp = async () => {
      const currentStatus = botInstance?.whatsapp_status || 'disconnected';
      
      if (currentStatus === 'connected') {
          if(confirm("Deseja realmente desconectar o WhatsApp?")) {
              await updateBotInstance({ whatsapp_status: 'disconnected', whatsapp_number: '' });
          }
          return;
      }

      await updateBotInstance({ whatsapp_status: 'pairing' });
      
      setTimeout(async () => {
          const fakeNumber = `+55 (11) 9${Math.floor(10000000 + Math.random() * 90000000)}`;
          await updateBotInstance({ 
              whatsapp_status: 'connected', 
              whatsapp_number: fakeNumber 
          });
      }, 3000);
  };

  // --- LOGICA PLAYGROUND IA ---
  const handleSendMessage = async () => {
      if (!chatInput.trim() || isChatLoading) return;
      
      const userMsg = chatInput;
      setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
      setChatInput('');
      setIsChatLoading(true);

      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const contextStrings = knowledgeSources.map(s => 
              `FONTE: ${s.name}\nCONTEÚDO: ${s.content || 'URL sync ativa: ' + s.url}`
          ).join('\n\n');

          const systemPrompt = `Você é o AIFlux, o assistente inteligente do Nexus CRM.
          Sua tarefa é responder perguntas dos clientes baseando-se EXCLUSIVAMENTE na base de conhecimento abaixo.
          
          BASE DE CONHECIMENTO ATUAL:
          ${contextStrings || "Nenhum documento carregado ainda."}
          
          REGRAS:
          1. Seja cordial e profissional.
          2. Se não encontrar a informação na base de conhecimento, responda que ainda está aprendendo sobre esse assunto específico.
          3. Não invente dados de contato ou preços que não estejam nos documentos.`;

          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: [
                  { role: 'user', parts: [{ text: `${systemPrompt}\n\nPERGUNTA DO USUÁRIO: ${userMsg}` }] }
              ],
          });

          setChatMessages(prev => [...prev, { role: 'bot', text: response.text || "Não consegui processar essa informação agora." }]);
      } catch (err) {
          setChatMessages(prev => [...prev, { role: 'bot', text: "Erro na conexão com o motor de IA." }]);
      } finally {
          setIsChatLoading(false);
      }
  };

  const aiLeadsCount = leads.filter(l => l.tags?.includes('AIFlux') || JSON.stringify(l.notes).includes('IA')).length;

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden animate-fade-in relative">
      
      {/* PlayGround de Teste (Side Panel) */}
      {isChatOpen && (
          <div className="absolute inset-y-0 right-0 w-96 bg-white shadow-2xl z-[150] border-l border-indigo-100 flex flex-col animate-slide-in-right">
              <div className="p-6 bg-indigo-900 text-white flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-3">
                      <Bot size={20} className="text-indigo-400" />
                      <h3 className="font-bold">Testar Chatbot</h3>
                  </div>
                  <button onClick={() => setIsChatOpen(false)} className="hover:rotate-90 transition-transform"><X size={20} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                  {chatMessages.length === 0 && (
                      <div className="text-center py-20 opacity-40">
                          <SparklesIcon className="mx-auto text-indigo-400 mb-4 animate-pulse" size={48} />
                          <p className="text-xs text-indigo-900 font-black uppercase tracking-widest">AIFlux Playground</p>
                          <p className="text-[10px] mt-1 font-bold">Inicie um chat para validar o conhecimento da IA</p>
                      </div>
                  )}
                  {chatMessages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] p-4 rounded-2xl text-sm font-medium shadow-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-indigo-100 text-gray-700 rounded-tl-none'}`}>
                              {m.text}
                          </div>
                      </div>
                  ))}
                  {isChatLoading && <div className="flex justify-start"><div className="bg-white p-3 rounded-2xl border border-indigo-100 shadow-sm"><Loader2 className="animate-spin text-indigo-500" size={16} /></div></div>}
              </div>
              <div className="p-4 border-t bg-white shrink-0">
                  <div className="relative">
                      <input 
                        value={chatInput} 
                        onChange={e => setChatInput(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Pergunte algo à IA..." 
                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 pl-5 pr-14 text-sm outline-none focus:ring-4 focus:ring-indigo-100 transition-all font-medium" 
                      />
                      <button onClick={handleSendMessage} className="absolute right-2 top-2 p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg"><Send size={18} /></button>
                  </div>
              </div>
          </div>
      )}

      {/* Header AIFlux */}
      <div className="px-8 py-6 bg-gradient-to-r from-indigo-900 to-slate-900 text-white shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/20 backdrop-blur-md rounded-2xl border border-indigo-400/30 shadow-inner">
              <SparklesIcon size={24} className="text-indigo-300" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">AIFlux <span className="text-[10px] font-black bg-indigo-500 px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-lg shadow-indigo-500/20">Active RAG</span></h1>
              <p className="text-indigo-200/70 text-xs font-bold uppercase tracking-widest">Painel de Controle de Inteligência Artificial</p>
            </div>
          </div>
          
          <div className="flex bg-white/10 p-1 rounded-xl backdrop-blur-md border border-white/10 shadow-lg">
            {(['overview', 'whatsapp', 'knowledge', isAccountAdmin ? 'admin' : null] as const).filter(Boolean).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as AIFluxTab)}
                className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                  activeTab === tab ? 'bg-indigo-500 text-white shadow-xl scale-105' : 'text-indigo-200 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab === 'overview' && 'Overview'}
                {tab === 'whatsapp' && 'WhatsApp'}
                {tab === 'knowledge' && 'Conhecimento'}
                {tab === 'admin' && 'Gestão Subcontas'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard icon={MessageSquare} label="Atendimentos IA" value={leads.length * 4 + 12} color="text-blue-600" />
              <StatCard icon={Bot} label="Conversão Bot" value="24.5%" color="text-indigo-600" />
              <StatCard icon={Zap} label="Leads pela IA" value={aiLeadsCount} color="text-emerald-600" />
              <StatCard icon={Cpu} label="Status Geral" value={botInstance?.active ? 'ON' : 'OFF'} color={botInstance?.active ? 'text-emerald-600' : 'text-red-600'} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="font-black text-gray-800 flex items-center gap-2 uppercase text-sm tracking-widest">
                    <BarChart3 size={18} className="text-indigo-500" /> Performance Operacional
                    </h3>
                    <div className="flex items-center gap-6">
                        <span className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase"><div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-lg shadow-indigo-200"></div> Chatbot</span>
                        <span className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase"><div className="w-2.5 h-2.5 rounded-full bg-gray-200"></div> Humano</span>
                    </div>
                </div>
                <div className="h-64 flex items-end gap-3 px-2">
                  {[30, 55, 40, 85, 60, 75, 45, 65, 80, 40, 70, 95].map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col justify-end gap-1.5 group cursor-pointer">
                      <div className="w-full bg-gray-100 rounded-md transition-all group-hover:bg-gray-200" style={{ height: `${h/2.5}%` }}></div>
                      <div className="w-full bg-indigo-500 rounded-md transition-all group-hover:bg-indigo-600 shadow-sm" style={{ height: `${h}%` }}></div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-6 text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">
                  <span>08h</span><span>10h</span><span>12h</span><span>14h</span><span>16h</span><span>18h</span><span>20h</span><span>22h</span>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex flex-col">
                <h3 className="font-black text-gray-800 mb-8 uppercase text-sm tracking-widest">Configuração do Bot</h3>
                <div className="space-y-6 flex-1">
                  <StatusItem label="Motor de IA" status="Gemini 3 Pro" color="bg-emerald-500" />
                  <StatusItem label="Canal WhatsApp" status={botInstance?.whatsapp_status === 'connected' ? 'Conectado' : 'Offline'} color={botInstance?.whatsapp_status === 'connected' ? 'bg-emerald-500' : 'bg-gray-300'} />
                  <StatusItem label="Última Indexação" status={botInstance?.last_trained_at ? new Date(botInstance.last_trained_at).toLocaleDateString() : 'Não treinado'} color="bg-blue-500" />
                  
                  <div className="pt-8 border-t border-gray-50 space-y-4">
                    <button onClick={() => setIsChatOpen(true)} className="w-full py-4 bg-white border-2 border-indigo-50 text-indigo-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-50 transition-all flex items-center justify-center gap-3 shadow-sm active:scale-95">
                      <Eye size={18} /> Abrir Playground
                    </button>
                    <button 
                        onClick={handleToggleBotStatus} 
                        className={`w-full py-4 ${botInstance?.active ? 'bg-red-50 text-red-600 hover:bg-red-100 shadow-red-100' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'} rounded-2xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95`}
                    >
                      <Settings2 size={18} /> {botInstance?.active ? 'Desativar Automação' : 'Reativar Chatbot'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'knowledge' && (
          <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-12">
            <div className="bg-indigo-900 rounded-[40px] p-10 text-white relative overflow-hidden shadow-2xl">
              <div className="relative z-10">
                <h3 className="text-3xl font-black mb-3">Base de Conhecimento RAG</h3>
                <p className="text-indigo-200 max-w-xl mb-8 font-medium leading-relaxed">
                    Carregue documentos ou sincronize URLs. A IA converterá esses dados em vetores para responder seus clientes em tempo real no WhatsApp.
                </p>
                <div className="flex gap-4">
                  <button onClick={() => fileInputRef.current?.click()} className="bg-white text-indigo-900 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-indigo-50 transition-all shadow-xl active:scale-95">
                    <Upload size={20} /> Subir Documento
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.txt,.docx" />
                  </button>
                  <button 
                    onClick={handleTrain}
                    disabled={isTraining || knowledgeSources.length === 0}
                    className="bg-indigo-500 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-indigo-400 transition-all shadow-2xl disabled:opacity-50 active:scale-95"
                  >
                    {isTraining ? <Loader2 size={20} className="animate-spin" /> : <Cpu size={20} />}
                    {isTraining ? 'Indexando...' : 'Atualizar IA'}
                  </button>
                </div>
              </div>
              <SparklesIcon className="absolute -right-16 -bottom-16 w-80 h-80 text-white/5 rotate-12" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div onClick={() => fileInputRef.current?.click()} className="bg-white rounded-[32px] border-2 border-dashed border-gray-200 p-10 flex flex-col items-center justify-center hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer group shadow-sm">
                <div className="p-6 bg-indigo-50 rounded-[24px] text-indigo-500 group-hover:scale-110 transition-all shadow-inner mb-5">
                  <FileText size={40} />
                </div>
                <h4 className="font-black text-gray-800 uppercase text-sm tracking-widest">Documentação Local</h4>
                <p className="text-gray-400 text-xs font-bold text-center mt-3 uppercase leading-relaxed">Clique para subir PDFs de produtos,<br/>scripts de vendas ou manuais.</p>
              </div>

              <div onClick={() => setUrlModalOpen(true)} className="bg-white rounded-[32px] border-2 border-dashed border-gray-200 p-10 flex flex-col items-center justify-center hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer group shadow-sm">
                <div className="p-6 bg-indigo-50 rounded-[24px] text-indigo-500 group-hover:scale-110 transition-all shadow-inner mb-5">
                  <Globe size={40} />
                </div>
                <h4 className="font-black text-gray-800 uppercase text-sm tracking-widest">Sincronizar Website</h4>
                <p className="text-gray-400 text-xs font-bold text-center mt-3 uppercase leading-relaxed">A IA irá ler periodicamente seu site<br/>para manter o conhecimento atualizado.</p>
              </div>
            </div>

            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
               <div className="px-10 py-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                  <h3 className="font-black text-gray-800 uppercase text-xs tracking-widest">Fontes Ativas ({knowledgeSources.length})</h3>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase shadow-sm">
                     <Database size={12} /> Vetorização OK
                  </div>
               </div>
               <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 bg-gray-50/10">
                      <th className="px-10 py-5">Identificação</th>
                      <th className="px-10 py-5">Tipo</th>
                      <th className="px-10 py-5">Sincronismo</th>
                      <th className="px-10 py-5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {knowledgeSources.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-10 py-6">
                          <div className="flex items-center gap-4">
                            <div className={`p-2.5 rounded-xl ${item.type === 'PDF' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500 shadow-sm'}`}>
                              {item.type === 'PDF' ? <FileText size={18} /> : <Globe size={18} />}
                            </div>
                            <span className="font-black text-gray-700 text-sm truncate max-w-md">{item.name}</span>
                          </div>
                        </td>
                        <td className="px-10 py-6"><span className="text-[10px] font-black text-gray-400 border border-gray-200 px-2 py-1 rounded-lg uppercase">{item.type}</span></td>
                        <td className="px-10 py-6"><span className="text-xs font-bold text-gray-500">{new Date(item.created_at).toLocaleDateString()}</span></td>
                        <td className="px-10 py-6 text-right">
                          <button onClick={() => deleteKnowledgeSource(item.id)} className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                        </td>
                      </tr>
                    ))}
                    {knowledgeSources.length === 0 && (
                        <tr><td colSpan={4} className="py-20 text-center text-gray-300 font-black uppercase text-xs tracking-widest opacity-40 italic">Nenhum conhecimento cadastrado</td></tr>
                    )}
                  </tbody>
               </table>
            </div>
          </div>
        )}

        {activeTab === 'whatsapp' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-fade-in py-12">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                <div className="space-y-8">
                   <div className={`inline-flex items-center gap-2 px-4 py-2 ${botInstance?.whatsapp_status === 'connected' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'} rounded-full text-[10px] font-black uppercase shadow-sm`}>
                     {botInstance?.whatsapp_status === 'connected' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                     {botInstance?.whatsapp_status === 'connected' ? 'WhatsApp Espelhado' : 'Aguardando Dispositivo'}
                   </div>
                   <h2 className="text-4xl font-black text-gray-900 leading-tight">Integração Direta com WhatsApp</h2>
                   <p className="text-gray-500 leading-relaxed font-medium text-lg">
                       Conecte sua conta em segundos. O AIFlux responde as mensagens recebidas usando sua base de conhecimento e qualifica os leads automaticamente.
                   </p>
                   
                   <div className="space-y-4">
                      {botInstance?.whatsapp_status === 'connected' && (
                        <div className="flex items-center gap-5 p-6 bg-white border border-emerald-100 rounded-[24px] shadow-xl shadow-emerald-50 animate-scale-in">
                            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl shadow-inner"><Smartphone size={24} /></div>
                            <div className="flex-1">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Número Conectado</p>
                                <p className="font-black text-gray-800 text-lg">{botInstance.whatsapp_number}</p>
                            </div>
                            <button onClick={toggleWhatsApp} className="text-red-500 font-black text-xs uppercase tracking-widest hover:underline px-3 py-2 hover:bg-red-50 rounded-lg transition-all">Desconectar</button>
                        </div>
                      )}

                      <div className="p-6 bg-blue-50 border border-blue-100 rounded-[24px] flex gap-4 shadow-sm">
                         <AlertCircle className="text-blue-500 shrink-0 mt-1" size={24} />
                         <p className="text-xs text-blue-900 font-bold leading-relaxed uppercase">
                             <b>Dica de Segurança:</b> Utilizamos o protocolo oficial de espelhamento. Não é necessário manter o app do CRM aberto para que a IA continue respondendo.
                         </p>
                      </div>

                      {botInstance?.whatsapp_status !== 'connected' && (
                          <button onClick={toggleWhatsApp} className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black uppercase text-sm tracking-widest shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-4 active:scale-95">
                              {botInstance?.whatsapp_status === 'pairing' ? <Loader2 size={24} className="animate-spin" /> : <QrCode size={24} />}
                              {botInstance?.whatsapp_status === 'pairing' ? 'Gerando Sessão...' : 'Configurar WhatsApp Agora'}
                          </button>
                      )}
                   </div>
                </div>

                <div className="flex flex-col items-center">
                   <div className="bg-white p-12 rounded-[60px] shadow-2xl border border-gray-100 relative group overflow-hidden">
                      <div className={`absolute inset-0 bg-indigo-600 opacity-0 ${botInstance?.whatsapp_status === 'connected' ? 'opacity-0' : 'group-hover:opacity-5'} transition-all duration-500`}></div>
                      <div className="w-72 h-72 bg-gray-50 rounded-[48px] flex items-center justify-center mb-8 relative overflow-hidden shadow-inner border border-gray-100">
                         <QrCode size={220} className={`${botInstance?.whatsapp_status === 'connected' ? 'opacity-10 blur-md' : 'text-gray-900 opacity-80'}`} />
                         {botInstance?.whatsapp_status === 'connected' && (
                            <div className="absolute inset-0 bg-white/40 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                                <div className="w-20 h-20 bg-emerald-500 rounded-[32px] flex items-center justify-center text-white mb-5 shadow-2xl scale-110">
                                <CheckCircle size={40} />
                                </div>
                                <p className="text-lg font-black text-indigo-900 uppercase tracking-tighter">Conectado</p>
                                <p className="text-[10px] text-gray-500 font-black mt-2 uppercase tracking-widest">Sincronismo Ativo</p>
                            </div>
                         )}
                         {botInstance?.whatsapp_status === 'pairing' && (
                             <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                                 <Loader2 size={56} className="text-indigo-600 animate-spin" />
                                 <p className="text-[10px] font-black text-indigo-600 uppercase">Aguardando Leitura...</p>
                             </div>
                         )}
                      </div>
                      <p className="text-center text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">
                        {botInstance?.whatsapp_status === 'connected' ? 'Vínculo: Celular do Proprietário' : 'Escaneie o código no WhatsApp'}
                      </p>
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'admin' && (
          <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
             <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">Gestão Comercial das IAs</h3>
                  <p className="text-sm text-gray-500 font-bold uppercase tracking-widest mt-1 opacity-60">Consumo de Tokens e Status de Instâncias</p>
                </div>
                <button className="px-8 py-3 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95">Relatório Financeiro</button>
             </div>

             <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <th className="px-10 py-6">Usuário Responsável</th>
                      <th className="px-10 py-6 text-center">Interações</th>
                      <th className="px-10 py-6 text-center">IA Ativa</th>
                      <th className="px-10 py-6 text-center">WhatsApp</th>
                      <th className="px-10 py-6 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-sm font-medium">
                    {users.filter(u => u.role !== UserRole.NEXUS_ADMIN).map(u => (
                        <AdminRow key={u.id} name={u.name} messages={Math.floor(Math.random()*800 + 40)} botStatus="Ativo" wppStatus="Conectado" />
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        )}
      </div>

      {/* Modal de URL */}
      {urlModalOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                  <div className="p-8 border-b bg-gray-50 flex justify-between items-center">
                      <h3 className="font-black text-gray-800 uppercase text-xs tracking-widest">Sincronizar Website</h3>
                      <button onClick={() => setUrlModalOpen(false)} className="hover:rotate-90 transition-transform text-gray-400"><X size={24} /></button>
                  </div>
                  <form onSubmit={handleAddUrl} className="p-10 space-y-8">
                      <div className="space-y-3">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1">URL Corporativa (HTTPS)</label>
                          <input required name="url" placeholder="https://exemplo.com.br/faq" className="w-full bg-gray-50 border border-gray-200 rounded-[20px] py-4 px-6 text-sm font-black outline-none focus:ring-4 focus:ring-indigo-100 transition-all" />
                          <p className="text-[9px] text-gray-400 font-bold uppercase ml-1 italic">* A IA mapeará todas as páginas públicas deste domínio.</p>
                      </div>
                      <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-[20px] font-black uppercase text-xs tracking-widest shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-3">
                        <Globe size={18} /> Iniciar Sincronismo
                      </button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }: any) => (
  <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm transition-all hover:translate-y-[-6px] hover:shadow-xl group">
    <div className={`p-4 rounded-2xl w-fit mb-6 shadow-inner transition-transform group-hover:scale-110 ${color.replace('text', 'bg').replace('600', '50')} ${color}`}>
      <Icon size={24} />
    </div>
    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{label}</p>
    <p className="text-3xl font-black text-gray-900 mt-2">{value}</p>
  </div>
);

const StatusItem = ({ label, status, color }: any) => (
  <div className="flex justify-between items-center group">
    <span className="text-xs font-black text-gray-400 uppercase tracking-widest group-hover:text-gray-600 transition-colors">{label}</span>
    <div className="flex items-center gap-3">
      <span className="text-xs font-black text-gray-800 uppercase tracking-tight">{status}</span>
      <div className={`w-2.5 h-2.5 rounded-full shadow-lg ${color}`}></div>
    </div>
  </div>
);

const AdminRow = ({ name, messages, botStatus, wppStatus, warning }: any) => (
  <tr className="hover:bg-indigo-50/20 transition-all group">
    <td className="px-10 py-6 font-black text-gray-800">{name}</td>
    <td className="px-10 py-6 text-center font-black text-indigo-500">{messages}</td>
    <td className="px-10 py-6 text-center">
      <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase shadow-sm ${botStatus === 'Ativo' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
        {botStatus}
      </span>
    </td>
    <td className="px-10 py-6 text-center">
      <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase text-gray-400">
        <div className={`w-2 h-2 rounded-full ${warning ? 'bg-red-500 shadow-red-200' : 'bg-emerald-500 shadow-emerald-200'} shadow-lg`}></div>
        {wppStatus}
      </div>
    </td>
    <td className="px-10 py-6 text-right">
       <button className="text-gray-300 hover:text-indigo-600 hover:bg-white p-2.5 rounded-xl shadow-sm transition-all"><Eye size={20} /></button>
    </td>
  </tr>
);
