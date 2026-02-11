
import React, { useState, useEffect } from 'react';
import { useCRM } from '../context/CRMContext.tsx';
import { 
  ArrowLeft, Check, X, User, Phone, Mail, Building, 
  Calendar, Clock, ChevronRight, ChevronDown, ChevronUp,
  Plus, MoreVertical, FileText, CheckCircle, XCircle,
  Edit2, Sparkles, PhoneCall, Layers, Trash2,
  Briefcase, DollarSign, SlidersHorizontal, Send, Mail as MailIcon, 
  FileBox, BarChart2, MessageSquare
} from 'lucide-react';
import { CustomFieldDefinition, Lead, Task } from '../types.ts';

interface Props {
  leadId: string;
  onBack: () => void;
  onNavigate: (view: string, data?: any) => void;
}

export const LeadDetailPage: React.FC<Props> = ({ leadId, onBack, onNavigate }) => {
  const { leads, funnels, updateLead, customFields, addTask, toggleTask, deleteTask } = useCRM();
  const lead = leads.find(l => l.id === leadId);
  
  const [activeTab, setActiveTab] = useState<'history' | 'email' | 'tasks' | 'products' | 'files'>('history');
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  if (!lead) return <div className="p-8 text-center text-gray-500">Lead não encontrado.</div>;

  const currentFunnel = funnels.find(f => f.id === lead.funnelId);
  const currentStageIndex = currentFunnel?.stages.findIndex(s => s.id === lead.stageId) ?? -1;

  const handleMarkAsWon = () => {
    if (!currentFunnel) return;
    const targetStageId = currentFunnel.defaultWonStageId || currentFunnel.stages[currentFunnel.stages.length - 1].id;
    updateLead(lead.id, { probability: 100, stageId: targetStageId });
  };

  const handleStageChange = (stageId: string) => {
      updateLead(lead.id, { stageId });
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden animate-fade-in">
      
      {/* Header Estilo RD */}
      <div className="px-8 py-6 flex flex-col gap-4 shrink-0">
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                  <button onClick={onBack} className="text-gray-400 hover:text-gray-600 transition-all">
                      <ArrowLeft size={20} />
                  </button>
                  <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{lead.title}</h1>
                  <MoreVertical size={20} className="text-gray-300 cursor-pointer" />
              </div>
              <div className="flex items-center gap-2">
                  <button onClick={() => updateLead(lead.id, { probability: 0 })} className="px-5 py-2 bg-[#A5EDFF] hover:bg-[#80E6FF] text-[#00455B] font-bold rounded-lg text-sm flex items-center gap-2 transition-all">
                      <ThumbsDown size={16} /> Marcar perda
                  </button>
                  <button onClick={handleMarkAsWon} className="px-5 py-2 bg-[#00455B] hover:bg-[#003646] text-white font-bold rounded-lg text-sm flex items-center gap-2 transition-all">
                      <ThumbsUp size={16} /> Marcar venda
                  </button>
              </div>
          </div>

          <div className="flex items-center gap-2">
               <span className="px-2.5 py-1 bg-gray-100 text-gray-400 text-[10px] font-black uppercase rounded">ESSENTIALS</span>
               <span className="px-2.5 py-1 bg-[#00D2FF] text-[#00455B] text-[10px] font-black uppercase rounded">RD STATION MARKETING</span>
          </div>
      </div>

      {/* Chevron Progress Bar */}
      <div className="px-8 pb-6 flex items-center shrink-0">
          {currentFunnel?.stages.map((stage, idx) => {
              const isActive = stage.id === lead.stageId;
              const isCompleted = idx < currentStageIndex;
              return (
                  <div 
                    key={stage.id} 
                    onClick={() => handleStageChange(stage.id)}
                    className={`chevron-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                  >
                      {stage.name}
                      {isActive && <span className="ml-2 opacity-60 text-[9px]">(0 dias)</span>}
                  </div>
              );
          })}
      </div>

      <div className="flex-1 flex overflow-hidden border-t border-gray-100">
          {/* Sidebar Esquerda: Negociação */}
          <div className="w-80 bg-[#F9FAFB] border-r border-gray-100 overflow-y-auto shrink-0 p-6 flex flex-col gap-6">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setSidebarExpanded(!sidebarExpanded)}>
                  <h3 className="text-base font-bold text-gray-800">Negociação</h3>
                  {sidebarExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>

              {sidebarExpanded && (
                <div className="space-y-6 animate-fade-in">
                    <Field label="Nome" value={lead.title} />
                    <Field label="Qualificação" value="1" />
                    <Field label="Criada em" value={new Date(lead.createdAt).toLocaleDateString() + ' ' + new Date(lead.createdAt).toLocaleTimeString().slice(0,5)} />
                    <Field label="Valor total" value={lead.value ? `R$ ${lead.value.toLocaleString()}` : 'Não informado'} />
                    <Field label="Previsão de fecha..." value="--" />
                    <Field label="Fonte" value="Desconhecido" />
                    <Field label="Campanha" value="Envio para onboarding" />
                    <Field label="Nutrição de e-mail" value="--" />
                    <Field label="Tags" value={lead.tags.join(', ') || '--'} />
                </div>
              )}
          </div>

          {/* Área Principal Direita */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
              <div className="p-8 flex flex-col gap-8 flex-1 overflow-y-auto">
                  {/* Próximas Tarefas */}
                  <section>
                      <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-bold text-gray-800">Próximas tarefas</h3>
                          <Calendar size={18} className="text-gray-400" />
                      </div>
                      
                      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                          <TaskItem label="Call de integração" date="11/02/2026 14:34" status="ATRASADA" />
                          <TaskItem label="Acompanhamento onboarding 1" date="18/02/2026 14:33" status="ABERTA EM DIA" last />
                      </div>

                      <div className="flex items-center justify-between mt-4">
                          <span className="text-sm text-gray-400">Mostrando 2/3 tarefas</span>
                          <button className="flex items-center gap-2 px-4 py-2 bg-[#A5EDFF] text-[#00455B] font-bold rounded-lg text-sm hover:bg-[#80E6FF] transition-all">
                              <Plus size={16} /> Criar tarefa
                          </button>
                      </div>
                  </section>

                  {/* Tabs de Atividades */}
                  <section className="mt-8 border-t border-gray-100 pt-8">
                      <div className="flex gap-6 border-b border-gray-100">
                          {tabs.map(tab => (
                              <button 
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`pb-4 text-sm font-bold transition-all border-b-2 ${activeTab === tab.id ? 'border-brand-cyan text-[#00455B]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                              >
                                  {tab.label}
                                  {tab.new && <span className="ml-2 bg-[#00D2FF] text-[#00455B] text-[8px] font-black px-1.5 py-0.5 rounded">NOVO</span>}
                              </button>
                          ))}
                      </div>

                      <div className="py-6 flex flex-col gap-4">
                          <div className="flex items-center gap-4">
                              <div className="flex-1 flex items-center gap-3 p-2 border border-gray-200 rounded-lg bg-gray-50">
                                  <span className="text-sm font-bold text-gray-400 px-2 uppercase">Do</span>
                                  <select className="flex-1 bg-transparent text-sm font-bold text-gray-800 outline-none">
                                      <option>RD Station CRM</option>
                                  </select>
                              </div>
                              <div className="flex-1 flex items-center gap-3 p-2 border border-gray-200 rounded-lg bg-gray-50">
                                  <span className="text-sm font-bold text-gray-400 px-2 uppercase">Exibir</span>
                                  <select className="flex-1 bg-transparent text-sm font-bold text-gray-800 outline-none">
                                      <option>Todos os eventos</option>
                                  </select>
                              </div>
                              <button className="flex items-center gap-2 px-5 py-2.5 bg-[#A5EDFF] text-[#00455B] font-bold rounded-lg text-sm hover:bg-[#80E6FF] transition-all shadow-sm">
                                  <Plus size={18} /> Criar anotação
                              </button>
                          </div>
                      </div>
                  </section>
              </div>
          </div>
      </div>
    </div>
  );
};

// Componentes Auxiliares Locais
const Field = ({ label, value }: { label: string, value: string }) => (
    <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold text-gray-400">{label}</p>
        <p className="text-sm font-bold text-gray-800">{value}</p>
    </div>
);

const TaskItem = ({ label, date, status, last }: { label: string, date: string, status: string, last?: boolean }) => (
    <div className={`p-5 flex items-center gap-6 ${last ? '' : 'border-b border-gray-100'}`}>
        <div className="bg-gray-900 text-white p-2 rounded-md"><CheckCircle size={14} /></div>
        <div className="flex-1 flex items-center gap-4">
            <span className="text-sm font-bold text-gray-800">Tarefa</span>
            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${status === 'ATRASADA' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{status}</span>
            <span className="text-sm font-medium text-gray-700">{label}</span>
        </div>
        <div className="flex items-center gap-8">
            <span className="text-sm font-medium text-gray-500">Prazo: <span className="font-bold text-gray-800">{date}</span></span>
            <div className="flex items-center gap-3 text-gray-400">
                <Edit2 size={16} className="cursor-pointer hover:text-brand-cyan" />
                <Clock size={16} className="cursor-pointer hover:text-brand-cyan" />
                <div className="w-6 h-6 rounded bg-[#A5EDFF] flex items-center justify-center text-[#00455B] cursor-pointer"><Check size={14} strokeWidth={4} /></div>
            </div>
        </div>
    </div>
);

const tabs = [
    { id: 'history', label: 'Histórico' },
    { id: 'email', label: 'E-mail' },
    { id: 'tasks', label: 'Tarefas' },
    { id: 'products', label: 'Produtos e Serviços' },
    { id: 'files', label: 'Arquivos' },
    { id: 'proposals', label: 'Propostas' },
    { id: 'signature', label: 'Assinatura Eletrônica', new: true },
];

const ThumbsUp = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10v12" /><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" /></svg>
);

const ThumbsDown = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M17 14V2" /><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z" /></svg>
);
