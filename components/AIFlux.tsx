
import React, { useState, useRef, useMemo } from 'react';
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
  const { currentUser, knowledgeSources, botInstance, addKnowledgeSource, deleteKnowledgeSource, updateBotInstance, trainAI, users, leads } = useCRM();
  const [activeTab, setActiveTab] = useState<AIFluxTab>('overview');
  const [isTraining, setIsTraining] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'bot', text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [urlModalOpen, setUrlModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAccountAdmin = currentUser?.role === UserRole.ACCOUNT_ADMIN;

  const handleTrain = async () => {
    setIsTraining(true);
    await trainAI();
    setTimeout(() => setIsTraining(false), 2500);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
          const content = event.target?.result as string;
          await addKnowledgeSource({
              name: file.name,
              type: 'PDF',
              content: content.slice(0, 50000) // Simulação simples de conteúdo textual
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

  const toggleWhatsApp = async () => {
      const newStatus = botInstance?.whatsapp_status === 'connected' ? 'disconnected' : 'pairing';
      await updateBotInstance({ whatsapp_status: newStatus });
      if (newStatus === 'pairing') {
          setTimeout(() => updateBotInstance({ whatsapp_status: 'connected', whatsapp_number: '+55 (11) 9' + Math.floor(Math.random()*90000000 + 10000000) }), 3000);
      }
  };

  const handleSendMessage = async () => {
      if (!chatInput.trim() || isChatLoading) return;
      
      const userMsg = chatInput;
      setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
      setChatInput('');
      setIsChatLoading(true);

      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const knowledgeContext = knowledgeSources.map(s => `FONTE: ${s.name}\nCONTEÚDO: ${s.content || s.url}`).join('\n\n');
          
          const prompt = `Você é o AIFlux Bot, assistente especializado do Nexus CRM. 
          Use a BASE DE CONHECIMENTO abaixo para responder ao usuário. 
          Se não souber a resposta, diga que não encontrou na base de conhecimento mas que pode ajudar com informações gerais.
          
          BASE DE CONHECIMENTO:
          ${knowledgeContext}
          
          PERGUNTA DO USUÁRIO: ${userMsg}`;

          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: prompt,
          });

          setChatMessages(prev => [...prev, { role: 'bot', text: response.text || "Desculpe, tive um problema ao processar sua pergunta." }]);
      } catch (err) {
          setChatMessages(prev => [...prev, { role: 'bot', text: "Erro ao conectar com o motor de IA." }]);
      } finally {
          setIsChatLoading(false);
      }
  };

  // Stats reais baseados no contexto
  const aiLeads = leads.filter(l => JSON.stringify(l.notes).includes('AI')).length;

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden animate-fade-in relative">
      
      {/* PlayGround de Teste (Side Panel) */}
      {isChatOpen && (
          <div className="absolute inset-y-0 right-0 w-96 bg-white shadow-2xl z-[150] border-l border-indigo-100 flex flex-col animate-slide-in-right">
              <div className="p-6 bg-indigo-900 text-white flex justify-between items-center">
                  <div className="flex items-center gap-3">
                      <Bot size={20} />
                      <h3 className="font-bold">Testar Chatbot</h3>
                  </div>
                  <button onClick={() => setIsChatOpen(false)}><X size={20} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                  {chatMessages.length === 0 && (
                      <div className="text-center py-10">
                          <SparklesIcon className="mx-auto text-indigo-200 mb-2" size={32} />
                          <p className="text-xs text-gray-400 font-bold uppercase">Inicie um teste para validar o treinamento</p>
                      </div>
                  )}
                  {chatMessages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] p-3 rounded-2xl text-sm font-medium ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white border border-indigo-100 text-gray-700 shadow-sm'}`}>
                              {m.text}
                          </div>
                      </div>
                  ))}
                  {isChatLoading && <div className="flex justify-start"><div className="bg-white p-3 rounded-2xl border border-indigo-100"><Loader2 className="animate-spin text-indigo-500" size={16} /></div></div>}
              </div>
              <div className="p-4 border-t bg-white">
                  <div className="relative">
                      <input 
                        value={chatInput} 
                        onChange={e => setChatInput(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Pergunte algo à IA..." 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-4 pr-12 text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                      />
                      <button onClick={handleSendMessage} className="absolute right-2 top-1.5 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"><Send size={16} /></button>
                  </div>
              </div>
          </div>
      )}

      {/* Header AIFlux */}
      <div className="px-8 py-6 bg-gradient-to-r from-indigo-900 to-slate-900 text-white shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/20 backdrop-blur-md rounded-2xl border border-indigo-400/30">
              <Sparkles size={24} className="text-indigo-300" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">AIFlux <span className="text-xs font-bold bg-indigo-500 px-2 py-0.5 rounded-full ml-2 uppercase">Pro</span></h1>
              <p className="text-indigo-200/70 text-sm font-medium">Bots operacionais inteligentes via Gemini 3.</p>
            </div>
          </div>
          
          <div className="flex bg-white/10 p-1 rounded-xl backdrop-blur-md border border-white/10">
            {(['overview', 'whatsapp', 'knowledge', isAccountAdmin ? 'admin' : null] as const).filter(Boolean).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as AIFluxTab)}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                  activeTab === tab ? 'bg-indigo-500 text-white shadow-lg' : 'text-indigo-200 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab === 'overview' && 'Overview'}
                {tab === 'whatsapp' && 'WhatsApp'}
                {tab === 'knowledge' && 'Conhecimento'}
                {tab === 'admin' && 'Central Admin'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard icon={MessageSquare} label="Conversas IA" value={leads.length * 3} color="text-blue-600" />
              <StatCard icon={Bot} label="Taxa de Resposta" value="100%" color="text-indigo-600" />
              <StatCard icon={Zap} label="Leads pela IA" value={aiLeads} color="text-emerald-600" />
              <StatCard icon={Cpu} label="Status Bot" value={botInstance?.active ? 'ATIVO' : 'OFFLINE'} color={botInstance?.active ? 'text-emerald-600' : 'text-red-600'} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-gray-800 flex items-center gap-2">
                    <BarChart3 size={18} className="text-indigo-500" /> Atividade do Bot
                    </h3>
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase"><div className="w-2 h-2 rounded-full bg-indigo-500"></div> Bot</span>
                        <span className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase"><div className="w-2 h-2 rounded-full bg-indigo-100"></div> Humano</span>
                    </div>
                </div>
                <div className="h-64 flex items-end gap-3 px-4">
                  {[40, 70, 45, 90, 65, 80, 50, 60, 85, 30, 75, 95].map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col justify-end gap-1">
                      <div className="w-full bg-indigo-100 rounded-sm" style={{ height: `${h/2}%` }}></div>
                      <div className="w-full bg-indigo-500 rounded-sm" style={{ height: `${h}%` }}></div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-4 text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">
                  <span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sab</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
                <h3 className="font-black text-gray-800 mb-6 uppercase text-xs tracking-widest">Informações da Instância</h3>
                <div className="space-y-6">
                  <StatusItem label="IA Engine" status="Gemini 3 Pro" color="bg-emerald-500" />
                  <StatusItem label="WhatsApp" status={botInstance?.whatsapp_status === 'connected' ? 'Conectado' : 'Aguardando'} color={botInstance?.whatsapp_status === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'} />
                  <StatusItem label="Último Treino" status={botInstance?.last_trained_at ? new Date(botInstance.last_trained_at).toLocaleDateString() : 'Nunca'} color="bg-blue-500" />
                  <div className="pt-4 border-t border-gray-100 space-y-3">
                    <button onClick={() => setIsChatOpen(true)} className="w-full py-3 bg-white border border-indigo-200 text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 shadow-sm">
                      <Eye size={16} /> Abrir Chat de Teste
                    </button>
                    <button onClick={() => updateBotInstance({ active: !botInstance?.active })} className={`w-full py-3 ${botInstance?.active ? 'bg-red-50 text-red-600' : 'bg-indigo-600 text-white'} rounded-xl font-bold transition-all flex items-center justify-center gap-2`}>
                      <Settings2 size={16} /> {botInstance?.active ? 'Pausar Automação' : 'Reativar Bot'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'knowledge' && (
          <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-12">
            <div className="bg-indigo-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
              <div className="relative z-10">
                <h3 className="text-2xl font-black mb-2">Módulo de Treinamento RAG</h3>
                <p className="text-indigo-200 max-w-lg mb-6">Alimente seu bot com manuais, tabelas de preços e links de suporte. Ele se tornará o maior expert no seu negócio.</p>
                <div className="flex gap-4">
                  <button onClick={() => fileInputRef.current?.click()} className="bg-white text-indigo-900 px-6 py-3 rounded-xl font-black text-sm uppercase flex items-center gap-2 hover:bg-indigo-50 transition-all">
                    <Plus size={18} /> Subir Arquivo
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                  </button>
                  <button 
                    onClick={handleTrain}
                    disabled={isTraining || knowledgeSources.length === 0}
                    className="bg-indigo-500 text-white px-8 py-3 rounded-xl font-black text-sm uppercase flex items-center gap-2 hover:bg-indigo-400 transition-all shadow-xl disabled:opacity-50"
                  >
                    {isTraining ? <Loader2 size={18} className="animate-spin" /> : <Cpu size={18} />}
                    {isTraining ? 'Indexando Dados...' : 'Treinar IA Agora'}
                  </button>
                </div>
              </div>
              <SparklesIcon className="absolute -right-10 -bottom-10 w-64 h-64 text-white/5" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div onClick={() => fileInputRef.current?.click()} className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8 flex flex-col items-center justify-center border-dashed border-2 hover:border-indigo-400 transition-all cursor-pointer group">
                <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-500 group-hover:scale-110 transition-transform mb-4">
                  <Upload size={32} />
                </div>
                <h4 className="font-bold text-gray-800">Manuais e Documentos</h4>
                <p className="text-gray-400 text-sm text-center mt-2">Clique para subir PDFs ou TXT.<br/>A IA lerá cada linha para aprender.</p>
              </div>

              <div onClick={() => setUrlModalOpen(true)} className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8 flex flex-col items-center justify-center border-dashed border-2 hover:border-indigo-400 transition-all cursor-pointer group">
                <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-500 group-hover:scale-110 transition-transform mb-4">
                  <Globe size={32} />
                </div>
                <h4 className="font-bold text-gray-800">Conectar Website / FAQ</h4>
                <p className="text-gray-400 text-sm text-center mt-2">Insira uma URL externa para que a IA<br/>sincronize informações dinâmicas.</p>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
               <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <h3 className="font-black text-gray-800 uppercase text-xs tracking-widest">Base de Conhecimento Ativa</h3>
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-600 rounded-full text-[10px] font-black uppercase">{knowledgeSources.length} Fontes de Dados</span>
               </div>
               <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/30 border-b border-gray-50">
                      <th className="px-8 py-4">Arquivo/Origem</th>
                      <th className="px-8 py-4">Tipo</th>
                      <th className="px-8 py-4">Data Sinc</th>
                      <th className="px-8 py-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {knowledgeSources.map(item => (
                      <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors group">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-500">
                              {item.type === 'PDF' ? <FileText size={16} /> : <Globe size={16} />}
                            </div>
                            <span className="font-bold text-gray-700 text-sm truncate max-w-md">{item.name}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5"><span className="text-xs font-bold text-gray-400">{item.type}</span></td>
                        <td className="px-8 py-5"><span className="text-xs font-medium text-gray-500">{new Date(item.created_at).toLocaleDateString()}</span></td>
                        <td className="px-8 py-5 text-right">
                          <button onClick={() => deleteKnowledgeSource(item.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                    {knowledgeSources.length === 0 && (
                        <tr><td colSpan={4} className="py-12 text-center text-gray-400 font-bold uppercase text-[10px] tracking-widest">Nenhuma fonte cadastrada</td></tr>
                    )}
                  </tbody>
               </table>
            </div>
          </div>
        )}

        {activeTab === 'whatsapp' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-6">
                   <div className={`inline-flex items-center gap-2 px-3 py-1 ${botInstance?.whatsapp_status === 'connected' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'} rounded-full text-[10px] font-black uppercase`}>
                     {botInstance?.whatsapp_status === 'connected' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                     {botInstance?.whatsapp_status === 'connected' ? 'Conexão Ativa' : 'Aguardando Pareamento'}
                   </div>
                   <h2 className="text-3xl font-black text-gray-900 leading-tight">Canal de Atendimento WhatsApp</h2>
                   <p className="text-gray-500 leading-relaxed font-medium">Espelhe sua conta em menos de 30 segundos. A IA responderá as dúvidas recorrentes e encaminhará os leads qualificados direto para o seu Pipeline.</p>
                   
                   <div className="space-y-4">
                      {botInstance?.whatsapp_status === 'connected' && (
                        <div className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-2xl shadow-sm animate-scale-in">
                            <div className="p-3 bg-indigo-50 text-indigo-500 rounded-xl"><Smartphone size={20} /></div>
                            <div>
                                <p className="text-xs font-black text-gray-400 uppercase">Instância Conectada</p>
                                <p className="font-bold text-gray-800">{botInstance.whatsapp_number}</p>
                            </div>
                            <button onClick={toggleWhatsApp} className="ml-auto text-red-500 font-bold text-xs hover:underline">Desconectar</button>
                        </div>
                      )}

                      <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex gap-3">
                         <AlertCircle className="text-indigo-500 shrink-0" size={20} />
                         <p className="text-xs text-indigo-800 leading-relaxed font-medium"><b>Segurança:</b> Usamos tecnologia oficial que preserva o histórico de mensagens e não exige que você deixe o app do WhatsApp aberto o tempo todo.</p>
                      </div>

                      {botInstance?.whatsapp_status !== 'connected' && (
                          <button onClick={toggleWhatsApp} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3">
                              {botInstance?.whatsapp_status === 'pairing' ? <Loader2 size={20} className="animate-spin" /> : <QrCode size={20} />}
                              {botInstance?.whatsapp_status === 'pairing' ? 'Iniciando Sessão...' : 'Conectar Agora'}
                          </button>
                      )}
                   </div>
                </div>

                <div className="flex flex-col items-center">
                   <div className="bg-white p-8 rounded-[40px] shadow-2xl border border-gray-100 relative group overflow-hidden">
                      <div className={`absolute inset-0 bg-indigo-600 opacity-0 ${botInstance?.whatsapp_status === 'connected' ? 'opacity-0' : 'group-hover:opacity-5'} transition-opacity`}></div>
                      <div className="w-64 h-64 bg-gray-100 rounded-3xl flex items-center justify-center mb-6 relative overflow-hidden">
                         <QrCode size={180} className={`${botInstance?.whatsapp_status === 'connected' ? 'opacity-20 blur-sm' : 'text-gray-900'}`} />
                         {botInstance?.whatsapp_status === 'connected' && (
                            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                                <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white mb-3 shadow-lg">
                                <CheckCircle size={24} />
                                </div>
                                <p className="text-sm font-black text-indigo-900">Aparelho Vinculado</p>
                                <p className="text-[10px] text-gray-500 font-bold mt-1 uppercase">Sincronização OK</p>
                            </div>
                         )}
                         {botInstance?.whatsapp_status === 'pairing' && (
                             <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                 <Loader2 size={48} className="text-indigo-600 animate-spin" />
                             </div>
                         )}
                      </div>
                      <p className="text-center text-gray-400 text-[10px] font-black uppercase tracking-widest">
                        {botInstance?.whatsapp_status === 'connected' ? 'Última sinc: hoje' : 'Escaneie para ativar'}
                      </p>
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'admin' && (
          <div className="space-y-8 animate-fade-in">
             <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black text-gray-900">Gestão Comercial das IAs</h3>
                  <p className="text-sm text-gray-500">Monitoramento centralizado de consumo e eficiência operacional.</p>
                </div>
                <button className="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all">Consolidar Dados</button>
             </div>

             <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <th className="px-8 py-5">Sub-Conta / Usuário</th>
                      <th className="px-8 py-5 text-center">Interações</th>
                      <th className="px-8 py-5 text-center">Status Bot</th>
                      <th className="px-8 py-5 text-center">Canal Wpp</th>
                      <th className="px-8 py-5 text-right w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-sm">
                    {users.filter(u => u.role !== UserRole.NEXUS_ADMIN).map(u => (
                        <AdminRow key={u.id} name={u.name} messages={Math.floor(Math.random()*500 + 50)} botStatus="Ativo" wppStatus="Conectado" />
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        )}
      </div>

      {/* Modal de URL */}
      {urlModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                  <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
                      <h3 className="font-black text-gray-800 uppercase text-xs tracking-widest">Adicionar URL de Conhecimento</h3>
                      <button onClick={() => setUrlModalOpen(false)}><X size={20} /></button>
                  </div>
                  <form onSubmit={handleAddUrl} className="p-8 space-y-6">
                      <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Endereço (HTTPS)</label>
                          <input required name="url" placeholder="https://ajuda.empresa.com.br" className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-100" />
                      </div>
                      <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-indigo-700 transition-all">Sincronizar Conteúdo</button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }: any) => (
  <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm transition-all hover:translate-y-[-4px] hover:shadow-md">
    <div className={`p-2 rounded-lg w-fit mb-4 bg-gray-50 ${color}`}>
      <Icon size={20} />
    </div>
    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
    <p className="text-2xl font-black text-gray-900 mt-1">{value}</p>
  </div>
);

const StatusItem = ({ label, status, color }: any) => (
  <div className="flex justify-between items-center">
    <span className="text-sm font-bold text-gray-600">{label}</span>
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold text-gray-500">{status}</span>
      <div className={`w-2 h-2 rounded-full ${color}`}></div>
    </div>
  </div>
);

const AdminRow = ({ name, messages, botStatus, wppStatus, warning }: any) => (
  <tr className="hover:bg-gray-50 transition-colors">
    <td className="px-8 py-5 font-bold text-gray-800">{name}</td>
    <td className="px-8 py-5 text-center font-bold text-gray-500">{messages}</td>
    <td className="px-8 py-5 text-center">
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${botStatus === 'Ativo' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
        {botStatus}
      </span>
    </td>
    <td className="px-8 py-5 text-center">
      <div className="flex items-center justify-center gap-2 text-xs font-bold text-gray-500">
        <div className={`w-1.5 h-1.5 rounded-full ${warning ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
        {wppStatus}
      </div>
    </td>
    <td className="px-8 py-5 text-right">
       <button className="text-gray-300 hover:text-indigo-600 transition-colors"><Eye size={18} /></button>
    </td>
  </tr>
);

const Sparkles = ({ className, size }: { className?: string, size?: number }) => (
  <svg 
    width={size || 24} 
    height={size || 24} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M19 17v4" />
    <path d="M3 5h4" />
    <path d="M17 19h4" />
  </svg>
);
