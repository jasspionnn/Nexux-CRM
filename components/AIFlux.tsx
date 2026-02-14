
import React, { useState, useEffect } from 'react';
import { useCRM } from '../context/CRMContext';
import { 
  Bot, MessageSquare, Upload, Globe, CheckCircle, 
  AlertCircle, Smartphone, Database, BarChart3, 
  Settings2, Plus, Trash2, QrCode,
  Zap, FileText, Cpu, Eye, Loader2, Send, X, Sparkles,
  RefreshCw, Check
} from 'lucide-react';

type AIFluxTab = 'overview' | 'whatsapp' | 'knowledge' | 'analytics';

export const AIFlux = () => {
  const { 
    knowledgeSources, addKnowledgeSource, deleteKnowledgeSource, 
    botInstance, updateBotInstance, trainAI, isLoading 
  } = useCRM();

  const [activeTab, setActiveTab] = useState<AIFluxTab>('overview');
  const [isSyncing, setIsSyncing] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [trainingStatus, setTrainingStatus] = useState<'idle' | 'training' | 'success'>('idle');

  const handleSimulateConnection = async () => {
    setShowQR(true);
    // Simula tempo de escaneamento
    setTimeout(async () => {
        await updateBotInstance({ whatsapp_status: 'connected', whatsapp_number: '+55 11 99999-8888' });
        setShowQR(false);
    }, 4000);
  };

  const handleTrain = async () => {
    setTrainingStatus('training');
    await trainAI();
    setTimeout(() => {
        setTrainingStatus('success');
        setTimeout(() => setTrainingStatus('idle'), 3000);
    }, 3000);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden">
      {/* Header Estilizado */}
      <header className="bg-white border-b border-gray-200 px-8 py-6 shrink-0 shadow-sm z-20">
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100">
                      <Cpu size={28} />
                  </div>
                  <div>
                      <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                        AIFlux <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-black uppercase">Alpha</span>
                      </h1>
                      <p className="text-sm text-gray-500 font-medium">Automação de Leads com Inteligência Artificial Generativa</p>
                  </div>
              </div>
              <div className="flex items-center gap-2">
                  <span className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${botInstance?.whatsapp_status === 'connected' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                      <div className={`w-2 h-2 rounded-full ${botInstance?.whatsapp_status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                      Bot: {botInstance?.whatsapp_status === 'connected' ? 'Online' : 'Offline'}
                  </span>
                  <button onClick={handleTrain} disabled={trainingStatus === 'training'} className="bg-gray-900 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-lg active:scale-95 disabled:opacity-50">
                      {trainingStatus === 'training' ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} fill="currentColor" />}
                      {trainingStatus === 'training' ? 'Treinando...' : trainingStatus === 'success' ? 'IA Treinada!' : 'Atualizar IA'}
                  </button>
              </div>
          </div>

          <div className="flex gap-8 mt-6">
              {[
                { id: 'overview', label: 'Visão Geral', icon: Globe },
                { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
                { id: 'knowledge', label: 'Conhecimento', icon: Database },
                { id: 'analytics', label: 'Métricas', icon: BarChart3 },
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <StatCard title="Mensagens IA" value="1.284" change="+12%" icon={MessageSquare} color="indigo" />
                      <StatCard title="Leads Qualificados" value="342" change="+5%" icon={Sparkles} color="purple" />
                      <StatCard title="Taxa de Resposta" value="98.2%" change="Estável" icon={Zap} color="blue" />

                      <div className="md:col-span-2 bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
                          <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
                              <Cpu size={20} className="text-indigo-600" /> Atividade Recente do Bot
                          </h3>
                          <div className="space-y-4">
                              {[1,2,3].map(i => (
                                  <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-indigo-200 transition-all">
                                      <div className="flex items-center gap-4">
                                          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-indigo-600 border border-gray-200 group-hover:scale-110 transition-transform">
                                              <User size={20} />
                                          </div>
                                          <div>
                                              <p className="text-sm font-bold text-gray-800">Lead #{823 + i} qualificado via IA</p>
                                              <p className="text-[10px] text-gray-400 font-bold uppercase">Há {i * 15} minutos • WhatsApp API</p>
                                          </div>
                                      </div>
                                      <button className="text-indigo-600 font-black text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Ver Conversa</button>
                                  </div>
                              ))}
                          </div>
                      </div>

                      <div className="bg-indigo-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
                          <div className="relative z-10">
                              <h3 className="text-xl font-black mb-2">IA Status</h3>
                              <p className="text-indigo-300 text-sm mb-6">Seu modelo está operando com Gemini 1.5 Pro (RAG habilitado).</p>
                              <div className="space-y-4">
                                  <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-indigo-400">
                                      <span>Indexação</span>
                                      <span>100%</span>
                                  </div>
                                  <div className="w-full bg-white/10 rounded-full h-1.5">
                                      <div className="bg-indigo-400 w-full h-full rounded-full shadow-[0_0_10px_rgba(129,140,248,0.5)]"></div>
                                  </div>
                              </div>
                          </div>
                          <Sparkles size={120} className="absolute -bottom-10 -right-10 text-white/5 rotate-12" />
                      </div>
                  </div>
              )}

              {activeTab === 'whatsapp' && (
                  <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden animate-scale-in">
                      <div className="p-10 flex flex-col items-center text-center">
                          {botInstance?.whatsapp_status === 'connected' ? (
                              <>
                                  <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6 shadow-inner animate-fade-in">
                                      <CheckCircle size={48} />
                                  </div>
                                  <h3 className="text-2xl font-black text-gray-900 mb-2">Conectado com Sucesso</h3>
                                  <p className="text-gray-500 mb-8 max-w-sm font-medium">Sua IA já está atendendo os leads que chegam pelo número <br/> <span className="text-gray-900 font-bold">{botInstance.whatsapp_number}</span></p>
                                  <div className="flex gap-4">
                                      <button onClick={() => updateBotInstance({ whatsapp_status: 'disconnected' })} className="px-8 py-3 bg-red-50 text-red-600 font-black text-xs uppercase tracking-widest rounded-xl border border-red-100 hover:bg-red-100 transition-all">Desconectar</button>
                                      <button className="px-8 py-3 bg-gray-900 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-black transition-all shadow-lg">Reiniciar Bot</button>
                                  </div>
                              </>
                          ) : showQR ? (
                              <div className="animate-fade-in flex flex-col items-center">
                                  <div className="p-6 bg-white border-4 border-gray-100 rounded-3xl shadow-inner relative group">
                                      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4">
                                          <Loader2 className="animate-spin text-indigo-600 mb-2" size={32} />
                                          <p className="text-[10px] font-black uppercase text-indigo-600">Autenticando...</p>
                                      </div>
                                      <QrCode size={200} className="text-gray-900" />
                                  </div>
                                  <h4 className="mt-8 text-xl font-black text-gray-900">Escaneie o QR Code</h4>
                                  <p className="text-sm text-gray-500 mt-2 font-medium">Abra o WhatsApp > Dispositivos Conectados > Conectar</p>
                                  <button onClick={() => setShowQR(false)} className="mt-8 text-gray-400 text-[10px] font-black uppercase hover:text-gray-600">Cancelar Conexão</button>
                              </div>
                          ) : (
                              <>
                                  <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mb-6">
                                      <Smartphone size={32} />
                                  </div>
                                  <h3 className="text-2xl font-black text-gray-900 mb-2">Conecte seu WhatsApp</h3>
                                  <p className="text-gray-500 mb-8 max-w-sm font-medium">Permita que a IA interaja com seus clientes de forma natural e rápida.</p>
                                  <button onClick={handleSimulateConnection} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all flex items-center gap-2">
                                      <Zap size={20} fill="currentColor" /> Iniciar Pareamento
                                  </button>
                              </>
                          )}
                      </div>
                      <div className="bg-gray-50 p-6 border-t border-gray-100 flex items-center justify-center gap-8">
                          <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              <Shield size={14} /> Criptografia Ponta a Ponta
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              <Cpu size={14} /> Processamento Gemini
                          </div>
                      </div>
                  </div>
              )}

              {activeTab === 'knowledge' && (
                  <div className="space-y-8 animate-fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                          <div className="md:col-span-2 bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
                              <div className="flex justify-between items-center mb-8">
                                  <h3 className="text-lg font-black text-gray-900">Base de Conhecimento</h3>
                                  <label className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md cursor-pointer flex items-center gap-2">
                                      <Plus size={16} /> Adicionar Fonte
                                      <input type="file" className="hidden" onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) addKnowledgeSource({ name: file.name, type: 'PDF' });
                                      }} />
                                  </label>
                              </div>
                              <div className="space-y-3">
                                  {knowledgeSources.map(source => (
                                      <div key={source.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between group">
                                          <div className="flex items-center gap-4">
                                              <div className="p-2 bg-white rounded-lg text-indigo-500 border border-gray-100">
                                                  <FileText size={18} />
                                              </div>
                                              <div>
                                                  <p className="text-sm font-bold text-gray-800">{source.name}</p>
                                                  <p className="text-[10px] text-gray-400 font-bold uppercase">{source.type} • Indexado</p>
                                              </div>
                                          </div>
                                          <button onClick={() => deleteKnowledgeSource(source.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2"><Trash2 size={16} /></button>
                                      </div>
                                  ))}
                                  {knowledgeSources.length === 0 && (
                                      <div className="p-12 text-center text-gray-400 border-2 border-dashed border-gray-100 rounded-3xl">
                                          <Database size={48} className="mx-auto opacity-10 mb-4" />
                                          <p className="font-bold uppercase text-[10px] tracking-widest">IA Sem Memória</p>
                                          <p className="text-xs font-medium mt-1">Suba PDFs ou URLs para treinar o bot.</p>
                                      </div>
                                  )}
                              </div>
                          </div>
                          <div className="space-y-6">
                               <div className="bg-indigo-50 rounded-3xl p-6 border border-indigo-100">
                                   <h4 className="text-xs font-black text-indigo-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                                       <Zap size={14} fill="currentColor" /> Dica de Treinamento
                                   </h4>
                                   <p className="text-sm text-indigo-900/70 font-medium leading-relaxed">
                                       Quanto mais detalhado for o documento, melhor será a resposta do bot. Inclua tabelas de preços, FAQs e tom de voz preferido.
                                   </p>
                               </div>
                               <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm">
                                   <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Treinamento RAG</h4>
                                   <div className="flex flex-col items-center text-center py-4">
                                       <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-indigo-100">
                                           <Cpu size={24} />
                                       </div>
                                       <p className="text-sm font-bold text-gray-800">Modelo: Gemini 1.5</p>
                                       <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Último treino: {botInstance?.last_trained_at ? new Date(botInstance.last_trained_at).toLocaleDateString() : 'Nunca'}</p>
                                   </div>
                               </div>
                          </div>
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

const User = ({ size }: { size: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;
const Shield = ({ size }: { size: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>;
