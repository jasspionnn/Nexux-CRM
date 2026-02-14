
import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import { 
  Bot, MessageSquare, Upload, Globe, CheckCircle, 
  AlertCircle, Smartphone, Database, BarChart3, 
  Settings2, Plus, Trash2, ExternalLink, QrCode,
  Zap, FileText, Cpu, Eye, Loader2
} from 'lucide-react';
import { UserRole } from '../types';

type AIFluxTab = 'overview' | 'whatsapp' | 'knowledge' | 'admin';

export const AIFlux = () => {
  const { currentUser } = useCRM();
  const [activeTab, setActiveTab] = useState<AIFluxTab>('overview');
  const [isTraining, setIsTraining] = useState(false);
  const [knowledgeBase, setKnowledgeBase] = useState([
    { id: '1', name: 'Manual_Vendas_2024.pdf', type: 'PDF', size: '2.4 MB', date: '2024-05-10' },
    { id: '2', name: 'https://seusite.com.br/faq', type: 'URL', size: '-', date: '2024-05-12' },
  ]);

  const isAccountAdmin = currentUser?.role === UserRole.ACCOUNT_ADMIN;

  const handleTrain = () => {
    setIsTraining(true);
    setTimeout(() => setIsTraining(false), 3000);
  };

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden animate-fade-in">
      {/* Header AIFlux */}
      <div className="px-8 py-6 bg-gradient-to-r from-indigo-900 to-slate-900 text-white shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/20 backdrop-blur-md rounded-2xl border border-indigo-400/30">
              <Sparkles size={24} className="text-indigo-300" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">AIFlux <span className="text-xs font-bold bg-indigo-500 px-2 py-0.5 rounded-full ml-2 uppercase">Pro</span></h1>
              <p className="text-indigo-200/70 text-sm font-medium">Chatbots inteligentes baseados na sua base de conhecimento.</p>
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
              <StatCard icon={MessageSquare} label="Conversas Totais" value="1.248" color="text-blue-600" />
              <StatCard icon={Bot} label="Resolvido por IA" value="85%" color="text-indigo-600" />
              <StatCard icon={Zap} label="Leads Qualificados" value="156" color="text-emerald-600" />
              <StatCard icon={Cpu} label="Tokens Utilizados" value="45.2k" color="text-amber-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
                <h3 className="font-black text-gray-800 mb-6 flex items-center gap-2">
                  <BarChart3 size={18} className="text-indigo-500" /> Atividade em Tempo Real
                </h3>
                <div className="h-64 flex items-end gap-3 px-4">
                  {[40, 70, 45, 90, 65, 80, 50, 60, 85, 30, 75, 95].map((h, i) => (
                    <div key={i} className="flex-1 bg-indigo-100 rounded-t-lg relative group transition-all hover:bg-indigo-500">
                      <div className="absolute inset-x-0 bottom-0 bg-indigo-500 rounded-t-lg transition-all" style={{ height: `${h}%` }}></div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-4 text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">
                  <span>08:00</span>
                  <span>12:00</span>
                  <span>16:00</span>
                  <span>20:00</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
                <h3 className="font-black text-gray-800 mb-6">Status do Sistema</h3>
                <div className="space-y-6">
                  <StatusItem label="IA Engine (Gemini 3)" status="Operacional" color="bg-emerald-500" />
                  <StatusItem label="API WhatsApp" status="Conectado" color="bg-emerald-500" />
                  <StatusItem label="Base de Vetores" status="98% Otimizada" color="bg-blue-500" />
                  <div className="pt-4 border-t border-gray-100">
                    <button className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                      <Settings2 size={16} /> Configurar Bot
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'knowledge' && (
          <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
            <div className="bg-indigo-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
              <div className="relative z-10">
                <h3 className="text-2xl font-black mb-2">Módulo de Treinamento RAG</h3>
                <p className="text-indigo-200 max-w-lg mb-6">Envie documentos ou links. Nossa IA irá processar os dados para responder seus clientes com precisão cirúrgica.</p>
                <div className="flex gap-4">
                  <button className="bg-white text-indigo-900 px-6 py-3 rounded-xl font-black text-sm uppercase flex items-center gap-2 hover:bg-indigo-50 transition-all">
                    <Plus size={18} /> Adicionar Fonte
                  </button>
                  <button 
                    onClick={handleTrain}
                    disabled={isTraining}
                    className="bg-indigo-500 text-white px-8 py-3 rounded-xl font-black text-sm uppercase flex items-center gap-2 hover:bg-indigo-400 transition-all shadow-xl disabled:opacity-50"
                  >
                    {isTraining ? <Loader2 size={18} className="animate-spin" /> : <Cpu size={18} />}
                    {isTraining ? 'Processando...' : 'Treinar IA Agora'}
                  </button>
                </div>
              </div>
              <Sparkles className="absolute -right-10 -bottom-10 w-64 h-64 text-white/5" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8 flex flex-col items-center justify-center border-dashed border-2 hover:border-indigo-400 transition-all cursor-pointer group">
                <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-500 group-hover:scale-110 transition-transform mb-4">
                  <Upload size={32} />
                </div>
                <h4 className="font-bold text-gray-800">Upload de Documentos</h4>
                <p className="text-gray-400 text-sm text-center mt-2">Arraste PDFs, DOCX ou arquivos TXT.<br/>Máximo 10MB por arquivo.</p>
              </div>

              <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8 flex flex-col items-center justify-center border-dashed border-2 hover:border-indigo-400 transition-all cursor-pointer group">
                <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-500 group-hover:scale-110 transition-transform mb-4">
                  <Globe size={32} />
                </div>
                <h4 className="font-bold text-gray-800">Mapear Website</h4>
                <p className="text-gray-400 text-sm text-center mt-2">Insira uma URL para a IA ler<br/>seu FAQ ou documentação online.</p>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
               <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <h3 className="font-black text-gray-800 uppercase text-xs tracking-widest">Fontes de Conhecimento Ativas</h3>
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-600 rounded-full text-[10px] font-black uppercase">{knowledgeBase.length} Arquivos</span>
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
                    {knowledgeBase.map(item => (
                      <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors group">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-500">
                              {item.type === 'PDF' ? <FileText size={16} /> : <Globe size={16} />}
                            </div>
                            <span className="font-bold text-gray-700 text-sm">{item.name}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5"><span className="text-xs font-bold text-gray-400">{item.type}</span></td>
                        <td className="px-8 py-5"><span className="text-xs font-medium text-gray-500">{item.date}</span></td>
                        <td className="px-8 py-5 text-right">
                          <button className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
          </div>
        )}

        {activeTab === 'whatsapp' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-6">
                   <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase">
                     <CheckCircle size={12} /> Conexão Segura Ativa
                   </div>
                   <h2 className="text-3xl font-black text-gray-900 leading-tight">Conecte o WhatsApp do seu Negócio</h2>
                   <p className="text-gray-500 leading-relaxed font-medium">AIFlux utiliza a tecnologia oficial de espelhamento. Seus dados são criptografados e a IA responde como se fosse você.</p>
                   
                   <div className="space-y-4">
                      <div className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-2xl shadow-sm">
                         <div className="p-3 bg-indigo-50 text-indigo-500 rounded-xl"><Smartphone size={20} /></div>
                         <div>
                            <p className="text-xs font-black text-gray-400 uppercase">Instância Atual</p>
                            <p className="font-bold text-gray-800">+55 (11) 99999-0000</p>
                         </div>
                         <button className="ml-auto text-red-500 font-bold text-xs hover:underline">Desconectar</button>
                      </div>

                      <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex gap-3">
                         <AlertCircle className="text-indigo-500 shrink-0" size={20} />
                         <p className="text-xs text-indigo-800 leading-relaxed font-medium"><b>Dica:</b> Mantenha seu celular conectado à internet para garantir que a IA possa enviar as mensagens instantaneamente.</p>
                      </div>
                   </div>
                </div>

                <div className="flex flex-col items-center">
                   <div className="bg-white p-8 rounded-[40px] shadow-2xl border border-gray-100 relative group overflow-hidden">
                      <div className="absolute inset-0 bg-indigo-600 opacity-0 group-hover:opacity-5 transition-opacity"></div>
                      <div className="w-64 h-64 bg-gray-100 rounded-3xl flex items-center justify-center mb-6 relative overflow-hidden">
                         <QrCode size={180} className="text-gray-900" />
                         <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                            <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white mb-3 shadow-lg">
                               <CheckCircle size={24} />
                            </div>
                            <p className="text-sm font-black text-indigo-900">Aparelho Conectado</p>
                         </div>
                      </div>
                      <p className="text-center text-gray-400 text-[10px] font-black uppercase tracking-widest">Sincronizado em: 14/05/2024 às 10:24</p>
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'admin' && (
          <div className="space-y-8 animate-fade-in">
             <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black text-gray-900">Gestão Central de Instâncias</h3>
                  <p className="text-sm text-gray-500">Acompanhe a performance de todos os bots ativos na sua conta mãe.</p>
                </div>
                <button className="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all">Relatório Consolidado</button>
             </div>

             <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <th className="px-8 py-5">Sub-Conta / Usuário</th>
                      <th className="px-8 py-5 text-center">Mensagens (Mês)</th>
                      <th className="px-8 py-5 text-center">Status Bot</th>
                      <th className="px-8 py-5 text-center">Conexão Wpp</th>
                      <th className="px-8 py-5 text-right w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-sm">
                    <AdminRow name="Vendedor Interno 01" messages="856" botStatus="Ativo" wppStatus="Conectado" />
                    <AdminRow name="Equipe Comercial SP" messages="2.410" botStatus="Ativo" wppStatus="Conectado" />
                    <AdminRow name="Suporte Técnico" messages="124" botStatus="Pausado" wppStatus="Desconectado" warning />
                    <AdminRow name="Ana Pereira (Field Sales)" messages="56" botStatus="Ativo" wppStatus="Conectado" />
                  </tbody>
                </table>
             </div>
          </div>
        )}
      </div>
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
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M19 17v4" />
    <path d="M3 5h4" />
    <path d="M17 19h4" />
  </svg>
);
