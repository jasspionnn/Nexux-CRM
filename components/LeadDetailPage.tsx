
import React, { useState, useEffect, useRef } from 'react';
import { useCRM } from '../context/CRMContext.tsx';
import { 
  ArrowLeft, Check, X, User, Phone, Mail, Building, 
  Calendar, Clock, ChevronDown, ChevronUp,
  Plus, MoreVertical, CheckCircle, XCircle,
  Edit2, PhoneCall, Layers, Trash2,
  Briefcase, DollarSign, SlidersHorizontal, 
  Tag as TagIcon, Hash, Target, ThumbsUp as LucideThumbsUp, ThumbsDown as LucideThumbsDown,
  // Added missing icons
  Send, MessageSquare
} from 'lucide-react';
import { CustomFieldDefinition, Lead, Task, User as UserType } from '../types.ts';

interface Props {
  leadId: string;
  onBack: () => void;
  onNavigate: (view: string, data?: any) => void;
}

export const LeadDetailPage: React.FC<Props> = ({ leadId, onBack, onNavigate }) => {
  const { leads, funnels, updateLead, customFields, users, currentUser } = useCRM();
  const lead = leads.find(l => l.id === leadId);
  
  const [activeTab, setActiveTab] = useState<'history' | 'email' | 'tasks' | 'products' | 'files'>('history');
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [isChangingFunnel, setIsChangingFunnel] = useState(false);
  const [newTag, setNewTag] = useState('');

  if (!lead) return <div className="p-8 text-center text-gray-500 font-bold">Oportunidade não encontrada.</div>;

  const currentFunnel = funnels.find(f => f.id === lead.funnelId);
  const currentStage = currentFunnel?.stages.find(s => s.id === lead.stageId);
  const currentStageIndex = currentFunnel?.stages.findIndex(s => s.id === lead.stageId) ?? -1;
  const assignedUser = users.find(u => u.id === lead.assignedUserId);

  const handleStageChange = (stageId: string) => {
      updateLead(lead.id, { stageId });
  };

  const handleFunnelChange = (newFunnelId: string) => {
      const targetFunnel = funnels.find(f => f.id === newFunnelId);
      if (!targetFunnel) return;
      updateLead(lead.id, { 
          funnelId: newFunnelId, 
          stageId: targetFunnel.stages[0].id 
      });
      setIsChangingFunnel(false);
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && newTag.trim()) {
          const tags = [...(lead.tags || [])];
          if (!tags.includes(newTag.trim())) {
              updateLead(lead.id, { tags: [...tags, newTag.trim()] });
          }
          setNewTag('');
      }
  };

  const handleRemoveTag = (tagToRemove: string) => {
      updateLead(lead.id, { tags: lead.tags.filter(t => t !== tagToRemove) });
  };

  const handleCustomFieldChange = (field: CustomFieldDefinition, value: any) => {
    const currentValues = lead.customValues || {};
    let newValue = value;
    if (field.type === 'multiselect') {
        const currentArray = (currentValues[field.id] as string[]) || [];
        newValue = currentArray.includes(value) ? currentArray.filter(v => v !== value) : [...currentArray, value];
    }
    updateLead(lead.id, { customValues: { ...currentValues, [field.id]: newValue } });
  };

  // Filtragem de campos personalizados para o contexto atual
  const visibleCustomFields = customFields.filter(f => {
      if (f.funnelId !== lead.funnelId) return false;
      if (f.context === 'lost_reason' && lead.probability !== 0) return false;
      return true;
  });

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden animate-fade-in pt-16">
      
      {/* Header Estilo RD */}
      <div className="px-8 py-6 flex flex-col gap-4 shrink-0 bg-white border-b border-gray-100">
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                  <button onClick={onBack} className="text-gray-400 hover:text-gray-600 transition-all p-1 hover:bg-gray-100 rounded">
                      <ArrowLeft size={20} />
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">{lead.title}</h1>
                        <Edit2 size={14} className="text-gray-300 cursor-pointer hover:text-blue-500" />
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">ID: {lead.id}</p>
                  </div>
              </div>
              <div className="flex items-center gap-2">
                  <button onClick={() => updateLead(lead.id, { probability: 0 })} className="px-5 py-2.5 bg-[#A5EDFF] hover:bg-[#80E6FF] text-[#00455B] font-black rounded-xl text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm">
                      <LucideThumbsDown size={16} strokeWidth={3} /> Perda
                  </button>
                  <button onClick={() => updateLead(lead.id, { probability: 100 })} className="px-5 py-2.5 bg-[#00455B] hover:bg-[#003646] text-white font-black rounded-xl text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg">
                      <LucideThumbsUp size={16} strokeWidth={3} /> Venda
                  </button>
              </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
               <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-500 text-[10px] font-black uppercase rounded-lg border border-gray-200">
                   <Target size={12} />
                   STATUS: {lead.probability === 100 ? 'GANHO' : lead.probability === 0 ? 'PERDIDO' : 'EM ABERTO'}
               </div>
               
               <div className="relative group">
                    <button 
                        onClick={() => setIsChangingFunnel(!isChangingFunnel)}
                        className={`px-3 py-1 bg-[#00D2FF] text-[#00455B] text-[10px] font-black uppercase rounded-lg flex items-center gap-1.5 hover:brightness-95 transition-all shadow-sm ${isChangingFunnel ? 'ring-2 ring-[#00455B]/20' : ''}`}
                    >
                        <Layers size={12} />
                        {currentFunnel?.name || 'Selecionar Funil'}
                        <ChevronDown size={10} strokeWidth={3} />
                    </button>

                    {isChangingFunnel && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsChangingFunnel(false)} />
                            <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-2 animate-scale-in">
                                <p className="px-3 py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Trocar Funil</p>
                                {funnels.map(f => (
                                    <button 
                                        key={f.id}
                                        onClick={() => handleFunnelChange(f.id)}
                                        className={`w-full text-left px-3 py-2.5 text-xs font-bold rounded-lg transition-colors ${f.id === lead.funnelId ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        {f.name}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
               </div>

               <div className="px-3 py-1 bg-gray-50 text-gray-400 text-[10px] font-black uppercase rounded-lg border border-gray-100 italic">
                   ETAPA: {currentStage?.name}
               </div>

               {/* Tags no Header */}
               <div className="flex items-center gap-2 border-l border-gray-200 pl-3 ml-2">
                    {lead.tags.map(tag => (
                        <span key={tag} className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-600 text-[9px] font-black uppercase rounded-md border border-blue-100">
                            <TagIcon size={10} />
                            {tag}
                            <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-500"><X size={10} strokeWidth={4} /></button>
                        </span>
                    ))}
                    <div className="relative">
                        <TagIcon className="absolute left-2 top-1.5 text-gray-300" size={10} />
                        <input 
                            value={newTag}
                            onChange={e => setNewTag(e.target.value)}
                            // Fixed: pointed to correctly defined handleAddTag
                            onKeyDown={handleAddTag}
                            placeholder="Nova tag..."
                            className="pl-6 pr-2 py-1 bg-gray-50 border border-transparent focus:border-blue-200 rounded-md text-[10px] font-bold outline-none w-24"
                        />
                    </div>
               </div>
          </div>
      </div>

      {/* Barra de Progresso Interativa */}
      <div className="px-8 py-4 flex items-center shrink-0 bg-white shadow-sm z-10">
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
                      {isActive && <span className="ml-2 opacity-60 text-[8px]">(Etapa Atual)</span>}
                  </div>
              );
          })}
      </div>

      <div className="flex-1 flex overflow-hidden">
          {/* Sidebar Detalhada com Todos os Campos do Schema */}
          <div className="w-[340px] bg-gray-50 border-r border-gray-100 overflow-y-auto shrink-0 p-6 flex flex-col gap-8">
              
              {/* Seção Responsável */}
              <div className="space-y-4">
                  <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <User size={14} /> Responsável
                  </h3>
                  <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
                      <img src={assignedUser?.avatar} className="w-8 h-8 rounded-full border border-gray-100" />
                      <select 
                        value={lead.assignedUserId}
                        onChange={(e) => updateLead(lead.id, { assignedUserId: e.target.value })}
                        className="flex-1 bg-transparent text-sm font-bold text-gray-800 outline-none cursor-pointer"
                      >
                          {users.map(u => (
                              <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                      </select>
                  </div>
              </div>

              {/* Seção Negociação Principal */}
              <div className="space-y-4">
                  <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <DollarSign size={14} /> Negociação
                  </h3>
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-4">
                      <Field 
                        label="Empresa" 
                        value={lead.company} 
                        editable 
                        onChange={(v) => updateLead(lead.id, { company: v })} 
                      />
                      <Field 
                        label="Valor (R$)" 
                        value={lead.value ? lead.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Não informado'} 
                        editable 
                        onChange={(v) => updateLead(lead.id, { value: parseFloat(v.replace(/[^0-9,]/g, '').replace(',', '.')) || 0 })} 
                      />
                      <div className="space-y-1">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Probabilidade: {lead.probability}%</p>
                          <input 
                            type="range" 
                            min="0" max="100" 
                            value={lead.probability} 
                            onChange={(e) => updateLead(lead.id, { probability: parseInt(e.target.value) })}
                            className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                          />
                      </div>
                      <Field label="Criada em" value={new Date(lead.createdAt).toLocaleString()} />
                  </div>
              </div>

              {/* Seção Contato */}
              <div className="space-y-4">
                  <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <Phone size={14} /> Contato
                  </h3>
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-4">
                      <Field label="Nome" value={lead.contactName} editable onChange={(v) => updateLead(lead.id, { contactName: v })} />
                      <Field label="E-mail" value={lead.contactEmail} editable onChange={(v) => updateLead(lead.id, { contactEmail: v })} />
                      <Field label="Telefone" value={lead.contactPhone} editable onChange={(v) => updateLead(lead.id, { contactPhone: v })} />
                  </div>
              </div>

              {/* Seção Campos Personalizados (Dinâmicos) */}
              {visibleCustomFields.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <SlidersHorizontal size={14} /> Personalizados
                    </h3>
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-4">
                        {visibleCustomFields.map(field => (
                            <div key={field.id} className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">{field.name}</label>
                                {field.type === 'text' && (
                                    <input 
                                        value={lead.customValues?.[field.id] || ''}
                                        onChange={(e) => handleCustomFieldChange(field, e.target.value)}
                                        className="w-full text-sm font-bold text-gray-800 bg-gray-50 px-2 py-1 rounded outline-none border border-transparent focus:border-blue-200"
                                    />
                                )}
                                {field.type === 'select' && (
                                    <select 
                                        value={lead.customValues?.[field.id] || ''}
                                        onChange={(e) => handleCustomFieldChange(field, e.target.value)}
                                        className="w-full text-sm font-bold text-gray-800 bg-gray-50 px-2 py-1 rounded outline-none"
                                    >
                                        <option value="">Selecione...</option>
                                        {field.options?.map(opt => <option key={opt.id} value={opt.label}>{opt.label}</option>)}
                                    </select>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
              )}
          </div>

          {/* Área Principal: Atividades e Histórico */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
              <div className="p-8 flex flex-col gap-8 flex-1 overflow-y-auto">
                  {/* Próximas Atividades */}
                  <section>
                      <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-black text-gray-900 tracking-tight">Atividades Pendentes</h3>
                          <button className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-blue-100 transition-all">
                              <Plus size={16} /> Nova Tarefa
                          </button>
                      </div>
                      
                      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                         {lead.tasks.filter(t => !t.completed).map(task => (
                             <TaskItem key={task.id} label={task.title} date={task.dueDate} status="ABERTA" />
                         ))}
                         {lead.tasks.filter(t => !t.completed).length === 0 && (
                             <div className="p-10 text-center text-gray-400 font-medium italic text-sm">Nenhuma tarefa pendente.</div>
                         )}
                      </div>
                  </section>

                  {/* Feed de Atividades / Histórico */}
                  <section className="flex-1 flex flex-col">
                      <div className="flex gap-8 border-b border-gray-100 mb-6">
                          {tabs.map(tab => (
                              <button 
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`pb-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === tab.id ? 'border-brand-navy text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                              >
                                  {tab.label}
                              </button>
                          ))}
                      </div>

                      <div className="space-y-6">
                         <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                             <textarea 
                                placeholder="Escreva uma anotação sobre este lead..." 
                                className="w-full bg-transparent text-sm font-medium outline-none resize-none h-24 placeholder:text-gray-400"
                             />
                             <div className="flex justify-end pt-2">
                                <button className="bg-blue-600 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2">
                                    <Send size={14} /> Salvar Anotação
                                </button>
                             </div>
                         </div>

                         {/* Histórico Real */}
                         <div className="space-y-4 pb-12">
                             {lead.notes.map(note => (
                                 <div key={note.id} className="flex gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-blue-100 transition-colors">
                                     <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                                         <MessageSquare size={18} />
                                     </div>
                                     <div className="flex-1">
                                         <div className="flex justify-between items-center mb-1">
                                             <span className="text-[11px] font-black text-gray-900 uppercase">{note.authorName}</span>
                                             <span className="text-[10px] text-gray-400 font-bold">{new Date(note.createdAt).toLocaleString()}</span>
                                         </div>
                                         <p className="text-sm text-gray-600 leading-relaxed font-medium">{note.content}</p>
                                     </div>
                                 </div>
                             ))}
                         </div>
                      </div>
                  </section>
              </div>
          </div>
      </div>
    </div>
  );
};

// Componente de Campo de Visualização/Edição
const Field = ({ label, value, editable, onChange }: { label: string, value: string, editable?: boolean, onChange?: (v: string) => void }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value);

    const handleBlur = () => {
        setIsEditing(false);
        if (onChange) onChange(tempValue);
    };

    return (
        <div className="flex flex-col gap-0.5 group">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{label}</p>
            {editable ? (
                isEditing ? (
                    <input 
                        autoFocus
                        value={tempValue}
                        onChange={e => setTempValue(e.target.value)}
                        onBlur={handleBlur}
                        className="text-sm font-bold text-gray-800 bg-blue-50 border-b border-blue-500 outline-none w-full"
                    />
                ) : (
                    <div 
                        onClick={() => setIsEditing(true)}
                        className="text-sm font-bold text-gray-800 flex items-center justify-between cursor-pointer hover:text-blue-600"
                    >
                        <span className="truncate">{value || '---'}</span>
                        <Edit2 size={10} className="opacity-0 group-hover:opacity-100" />
                    </div>
                )
            ) : (
                <p className="text-sm font-bold text-gray-800 truncate">{value || '---'}</p>
            )}
        </div>
    );
};

const TaskItem = ({ label, date, status, last }: { label: string, date: string, status: string, last?: boolean }) => (
    <div className={`p-4 flex items-center gap-4 ${last ? '' : 'border-b border-gray-50'}`}>
        <div className="bg-gray-900 text-white p-2 rounded-lg"><CheckCircle size={14} /></div>
        <div className="flex-1">
            <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-blue-600">Tarefa</span>
                <span className="text-sm font-bold text-gray-800">{label}</span>
            </div>
            <p className="text-[10px] text-gray-400 font-bold flex items-center gap-1 mt-0.5">
                <Clock size={10} /> Prazo: {new Date(date).toLocaleString()}
            </p>
        </div>
        <div className="flex items-center gap-2">
            <button className="p-2 text-gray-300 hover:text-blue-600"><Edit2 size={16} /></button>
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 cursor-pointer hover:bg-blue-600 hover:text-white transition-all">
                <Check size={16} strokeWidth={4} />
            </div>
        </div>
    </div>
);

const tabs = [
    { id: 'history', label: 'Histórico' },
    { id: 'email', label: 'E-mail' },
    { id: 'tasks', label: 'Tarefas' },
    { id: 'files', label: 'Arquivos' },
    { id: 'signature', label: 'Assinatura Eletrônica' },
];

const handleAddAddTag = (e: any) => {}; // Placeholder para evitar erro de referência circular se copiado parcialmente
