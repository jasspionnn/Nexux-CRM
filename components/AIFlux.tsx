
import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import { 
  Plus, Trash2, QrCode, Zap, FileText, Cpu, Loader2, Database,
  Sparkles, Shield, Smartphone, Globe, MessageSquare, BarChart3, User,
  CheckCircle // Added to fix "Cannot find name 'CheckCircle'"
} from 'lucide-react';
import { api } from '../services/api';

type AIFluxTab = 'overview' | 'whatsapp' | 'knowledge' | 'settings';

export const AIFlux = () => {
  const { 
    knowledgeSources, addKnowledgeSource, deleteKnowledgeSource, 
    botInstance, updateBotInstance, trainAI, currentUser
  } = useCRM();

  const [activeTab, setActiveTab] = useState<AIFluxTab>('overview');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsProcessing(true);
      try {
          // 1. Simulação de Extração de Texto (Em produção usaria PDF.js ou Worker local)
          const reader = new FileReader();
          reader.onload = async (event) => {
              const text = event.target?.result as string;
              
              // 2. Criar fonte no banco
              const sourceId = `kl-${Date.now()}`;
              await addKnowledgeSource({ id: sourceId, name: file.name, type: 'PDF' });

              // 3. Enviar para o Worker processar embeddings e Vectorize
              await api.post('/knowledge/process', {
                  accountId: currentUser?.accountId,
                  sourceId: sourceId,
                  content: text.slice(0, 50000) // Limite básico
              });

              setIsProcessing(false);
          };
          reader.readAsText(file);
      } catch (err) {
          console.error(err);
          setIsProcessing(false);
      }
  };

  const handleSimulateConnection = () => {
    setShowQR(true);
    setTimeout(async () => {
        await updateBotInstance({ whatsapp_status: 'connected', whatsapp_number: '+55 11 98888-7777' });
        setShowQR(false);
    }, 3000);
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
                      <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                        AIFlux <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full uppercase">Engine</span>
                      </h1>
                      <p className="text-sm text-gray-500 font-medium">Automação Inteligente & RAG Ecosystem</p>
                  </div>
              </div>
              <div className="flex items-center gap-2">
                  <span className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${botInstance?.whatsapp_status === 'connected' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                      <div className={`w-2 h-2 rounded-full ${botInstance?.whatsapp_status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                      Status: {botInstance?.whatsapp_status === 'connected' ? 'Conectado' : 'Desconectado'}
                  </span>
              </div>
          </div>

          <div className="flex gap-8 mt-6">
              {[
                { id: 'overview', label: 'Dashboard', icon: Globe },
                { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
                { id: 'knowledge', label: 'Base de Dados', icon: Database },
                { id: 'settings', label: 'Configurações', icon: Zap },
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

      <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
              
              {activeTab === 'overview' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-fade-in">
                      <StatCard title="Total de Conversas" value="1.429" change="+18%" icon={MessageSquare} color="indigo" />
                      <StatCard title="Hits na Base (RAG)" value="842" change="+12%" icon={Sparkles} color="purple" />
                      <StatCard title="Economia de Tempo" value="124h" change="Este mês" icon={Zap} color="blue" />

                      <div className="md:col-span-2 bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
                          <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
                              <Activity size={20} className="text-indigo-600" /> Fluxo de Atendimento IA
                          </h3>
                          <div className="space-y-4">
                              {[1,2,3].map(i => (
                                  <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group">
                                      <div className="flex items-center gap-4">
                                          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-indigo-600 border border-gray-200">
                                              <User size={18} />
                                          </div>
                                          <div>
                                              <p className="text-sm font-bold text-gray-800">Lead +55 (11) 9...{i}2</p>
                                              <p className="text-[10px] text-gray-400 font-bold uppercase">Respondido via RAG Engine • {i*5}m atrás</p>
                                          </div>
                                      </div>
                                      <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-1 rounded">Sincronizado</span>
                                  </div>
                              ))}
                          </div>
                      </div>

                      <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
                          <div className="relative z-10">
                              <h3 className="text-xl font-black mb-2">Cloudflare Vectorize</h3>
                              <p className="text-slate-400 text-sm mb-6">Sua inteligência está distribuída na borda para latência zero.</p>
                              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                                  <div className="flex justify-between text-[10px] font-black uppercase">
                                      <span>Namespace</span>
                                      <span className="text-indigo-400">{currentUser?.accountId}</span>
                                  </div>
                                  <div className="flex justify-between text-[10px] font-black uppercase">
                                      <span>Dimensões</span>
                                      <span className="text-indigo-400">384 (bge-small)</span>
                                  </div>
                              </div>
                          </div>
                          <Database size={140} className="absolute -bottom-10 -right-10 text-white/5 rotate-12" />
                      </div>
                  </div>
              )}

              {activeTab === 'knowledge' && (
                  <div className="space-y-8 animate-fade-in">
                      <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
                          <div className="flex justify-between items-center mb-8">
                              <div>
                                  <h3 className="text-xl font-black text-gray-900">Base de Conhecimento</h3>
                                  <p className="text-sm text-gray-500">Documentos usados para contextualizar as respostas do bot.</p>
                              </div>
                              <label className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 cursor-pointer ${isProcessing ? 'bg-gray-100 text-gray-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                                  {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                                  {isProcessing ? 'Processando Vetores...' : 'Subir Documento'}
                                  <input type="file" className="hidden" disabled={isProcessing} onChange={handleFileUpload} />
                              </label>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                              {knowledgeSources.map(source => (
                                  <div key={source.id} className="p-5 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col justify-between group hover:border-indigo-200 transition-all">
                                      <div className="flex items-start justify-between mb-4">
                                          <div className="p-3 bg-white rounded-xl text-indigo-600 shadow-sm">
                                              <FileText size={20} />
                                          </div>
                                          <button onClick={() => deleteKnowledgeSource(source.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                                              <Trash2 size={16} />
                                          </button>
                                      </div>
                                      <div>
                                          <p className="text-sm font-black text-gray-800 truncate">{source.name}</p>
                                          <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Status: Ativo no Vectorize</p>
                                      </div>
                                  </div>
                              ))}
                              {knowledgeSources.length === 0 && !isProcessing && (
                                  <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-200 rounded-3xl">
                                      <Database size={48} className="mx-auto text-gray-200 mb-4" />
                                      <p className="text-gray-400 font-bold uppercase text-xs">Sua IA ainda é uma folha em branco</p>
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
              )}

              {activeTab === 'whatsapp' && (
                   <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden animate-scale-in max-w-xl mx-auto">
                   <div className="p-10 flex flex-col items-center text-center">
                       {botInstance?.whatsapp_status === 'connected' ? (
                           <>
                               <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6 shadow-inner">
                                   <CheckCircle size={48} />
                               </div>
                               <h3 className="text-2xl font-black text-gray-900 mb-2">WhatsApp Ativo</h3>
                               <p className="text-gray-500 mb-8 max-w-xs font-medium">O número <span className="text-gray-900 font-bold">{botInstance.whatsapp_number}</span> está sendo monitorado pela IA.</p>
                               <button onClick={() => updateBotInstance({ whatsapp_status: 'disconnected' })} className="px-8 py-3 bg-red-50 text-red-600 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-red-100 transition-all border border-red-100">Desconectar Instância</button>
                           </>
                       ) : showQR ? (
                           <div className="flex flex-col items-center">
                               <div className="p-6 bg-white border-2 border-gray-100 rounded-3xl shadow-lg mb-6">
                                   <QrCode size={200} className="text-gray-900" />
                               </div>
                               <Loader2 className="animate-spin text-indigo-600 mb-2" size={24} />
                               <p className="text-sm font-black uppercase text-indigo-600 tracking-widest">Aguardando Escaneamento...</p>
                           </div>
                       ) : (
                           <>
                               <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mb-6">
                                   <Smartphone size={32} />
                               </div>
                               <h3 className="text-2xl font-black text-gray-900 mb-2">Conexão via API</h3>
                               <p className="text-gray-500 mb-8 max-w-xs font-medium">Integre seu número e deixe que o Gemini + RAG cuide do primeiro atendimento.</p>
                               <button onClick={handleSimulateConnection} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 shadow-xl transition-all">
                                   Gerar QR Code de Acesso
                               </button>
                           </>
                       )}
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
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${change.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{change}</span>
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</p>
            <p className="text-2xl font-black text-gray-900">{value}</p>
        </div>
    );
};

const Activity = ({ size, className }: { size: number, className?: string }) => <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>;
