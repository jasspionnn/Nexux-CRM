
import React, { useState, useRef, useEffect } from 'react';
import { useCRM } from '../context/CRMContext';
import { 
  Plus, Trash2, QrCode, Zap, FileText, Cpu, Loader2, Database,
  Sparkles, Smartphone, Globe, MessageSquare, User,
  CheckCircle, Send, Bot, X
} from 'lucide-react';
import { api } from '../services/api';

type AIFluxTab = 'overview' | 'whatsapp' | 'knowledge' | 'playground';

export const AIFlux = () => {
  const { 
    knowledgeSources, addKnowledgeSource, deleteKnowledgeSource, 
    botInstance, updateBotInstance, currentUser
  } = useCRM();

  const [activeTab, setActiveTab] = useState<AIFluxTab>('overview');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showQR, setShowQR] = useState(false);
  
  // Playground State
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'bot', text: string}[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!inputMessage.trim() || isTyping) return;

      const userText = inputMessage;
      setInputMessage('');
      setChatMessages(prev => [...prev, { role: 'user', text: userText }]);
      setIsTyping(true);

      try {
          const res = await api.post<any>('/bot/chat-test', {
              message: userText,
              accountId: currentUser?.accountId
          });
          
          if (res.error) throw new Error(res.error);
          
          setChatMessages(prev => [...prev, { role: 'bot', text: res.response }]);
      } catch (err: any) {
          setChatMessages(prev => [...prev, { role: 'bot', text: `❌ Falha na API da IA: ${err.message}` }]);
      } finally {
          setIsTyping(false);
      }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsProcessing(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
          const text = event.target?.result as string;
          const sourceId = `kl-${Date.now()}`;
          await addKnowledgeSource({ id: sourceId, name: file.name, type: 'PDF' });
          await api.post('/knowledge/process', {
              accountId: currentUser?.accountId,
              sourceId: sourceId,
              content: text.slice(0, 50000)
          });
          setIsProcessing(false);
      };
      reader.readAsText(file);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden">
      <header className="bg-white border-b border-gray-200 px-8 py-6 shrink-0 shadow-sm z-20">
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg">
                      <Cpu size={28} />
                  </div>
                  <div>
                      <h1 className="text-2xl font-black text-gray-900 tracking-tight">AIFlux <span className="text-indigo-500">Engine</span></h1>
                      <p className="text-sm text-gray-500 font-medium">RAG & Automação de Vendas</p>
                  </div>
              </div>
              <div className="flex gap-4">
                <button 
                    onClick={() => setActiveTab('playground')}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'playground' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                >
                    <Sparkles size={16} /> Playground
                </button>
              </div>
          </div>

          <div className="flex gap-8 mt-6">
              {[
                { id: 'overview', label: 'Dashboard', icon: Globe },
                { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
                { id: 'knowledge', label: 'Base de Dados', icon: Database },
              ].map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as AIFluxTab)}
                    className={`pb-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                    <tab.icon size={14} />
                    {tab.label}
                </button>
              ))}
          </div>
      </header>

      <main className="flex-1 overflow-hidden p-8">
          <div className="max-w-6xl mx-auto h-full">
              
              {activeTab === 'playground' && (
                  <div className="bg-white rounded-3xl border border-gray-200 shadow-xl h-full flex flex-col overflow-hidden animate-scale-in">
                      <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white">
                                  <Bot size={20} />
                              </div>
                              <div>
                                  <h3 className="font-bold text-gray-900">AIFlux Playground</h3>
                                  <p className="text-[10px] text-green-600 font-black uppercase tracking-widest">Testando Base de Conhecimento</p>
                              </div>
                          </div>
                          <button onClick={() => setChatMessages([])} className="text-gray-400 hover:text-red-500 p-2"><Trash2 size={18} /></button>
                      </div>

                      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
                          {chatMessages.length === 0 && (
                              <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-4 opacity-50">
                                  <Bot size={48} />
                                  <p className="font-bold uppercase text-xs tracking-widest">Envie uma mensagem para testar a inteligência</p>
                              </div>
                          )}
                          {chatMessages.map((msg, i) => (
                              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                                  <div className={`max-w-[80%] p-4 rounded-2xl text-sm font-medium ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none border border-gray-200'}`}>
                                      {msg.text}
                                  </div>
                              </div>
                          ))}
                          {isTyping && (
                              <div className="flex justify-start animate-pulse">
                                  <div className="bg-gray-100 p-4 rounded-2xl rounded-tl-none border border-gray-200">
                                      <div className="flex gap-1">
                                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                      </div>
                                  </div>
                              </div>
                          )}
                          <div ref={chatEndRef} />
                      </div>

                      <form onSubmit={handleSendMessage} className="p-6 bg-gray-50 border-t border-gray-200 flex gap-4">
                          <input 
                              value={inputMessage}
                              onChange={e => setInputMessage(e.target.value)}
                              placeholder="Pergunte ao seu Bot..."
                              className="flex-1 bg-white border border-gray-200 rounded-2xl px-6 py-3 outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition-all font-medium"
                          />
                          <button 
                              type="submit"
                              disabled={!inputMessage.trim() || isTyping}
                              className="bg-indigo-600 text-white p-4 rounded-2xl hover:bg-indigo-700 shadow-lg disabled:opacity-50 transition-all active:scale-95"
                          >
                              <Send size={20} />
                          </button>
                      </form>
                  </div>
              )}

              {activeTab === 'overview' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <StatCard title="Total de Conversas" value="1.429" change="+18%" icon={MessageSquare} color="indigo" />
                      <StatCard title="Hits na Base (RAG)" value="842" change="+12%" icon={Sparkles} color="purple" />
                      <StatCard title="Saúde do Motor" value="98%" change="Estável" icon={Zap} color="blue" />
                      {/* ... (resto do dashboard) */}
                  </div>
              )}

              {activeTab === 'knowledge' && (
                  <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
                      <div className="flex justify-between items-center mb-8">
                          <div>
                              <h3 className="text-xl font-black text-gray-900">Base de Conhecimento</h3>
                              <p className="text-sm text-gray-500">Documentos que alimentam o cérebro da IA.</p>
                          </div>
                          <label className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 cursor-pointer ${isProcessing ? 'bg-gray-100 text-gray-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                              {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                              {isProcessing ? 'Sincronizando...' : 'Novo Documento'}
                              <input type="file" className="hidden" disabled={isProcessing} onChange={handleFileUpload} />
                          </label>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {knowledgeSources.map(source => (
                              <div key={source.id} className="p-5 bg-gray-50 rounded-2xl border border-gray-200 group hover:border-indigo-300 transition-all flex justify-between items-center">
                                  <div className="flex items-center gap-3">
                                      <FileText className="text-indigo-500" size={20} />
                                      <span className="text-sm font-bold text-gray-800">{source.name}</span>
                                  </div>
                                  <button onClick={() => deleteKnowledgeSource(source.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={16} /></button>
                              </div>
                          ))}
                      </div>
                  </div>
              )}
          </div>
      </main>
    </div>
  );
};

const StatCard = ({ title, value, change, icon: Icon, color }: any) => {
    const colors: any = {
        indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
        purple: 'bg-purple-50 text-purple-600 border-purple-100',
        blue: 'bg-blue-50 text-blue-600 border-blue-100',
    };
    return (
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl border transition-transform group-hover:scale-110 ${colors[color]}`}>
                    <Icon size={20} />
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-green-50 text-green-700">{change}</span>
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</p>
            <p className="text-2xl font-black text-gray-900">{value}</p>
        </div>
    );
};
