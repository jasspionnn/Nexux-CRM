
import React, { useState, useEffect, useRef } from 'react';
import { useCRM } from '../context/CRMContext.tsx';
import { 
  ArrowLeft, Check, X, User, Phone, Mail, Building, 
  Calendar, Clock, ChevronDown, ChevronUp,
  Plus, MoreVertical, CheckCircle, XCircle,
  Edit2, PhoneCall, Layers, Trash2,
  Briefcase, DollarSign, SlidersHorizontal, 
  Tag as TagIcon, Target, Send, MessageSquare,
  AlertCircle, ThumbsUp as LucideThumbsUp, ThumbsDown as LucideThumbsDown
} from 'lucide-react';
import { CustomFieldDefinition, Lead, Task, User as UserType } from '../types.ts';

interface Props {
  leadId: string;
  onBack: () => void;
  onNavigate: (view: string, data?: any) => void;
}

export const LeadDetailPage: React.FC<Props> = ({ leadId, onBack, onNavigate }) => {
  const { 
    leads, funnels, updateLead, customFields, users, 
    addTask, toggleTask, deleteTask 
  } = useCRM();
  
  const lead = leads.find(l => l.id === leadId);
  const [activeTab, setActiveTab] = useState('history');
  const [noteText, setNoteText] = useState('');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', date: '', type: 'call' as Task['type'] });
  const [newTag, setNewTag] = useState('');

  if (!lead) return <div className="p-8 text-center text-gray-500 font-bold">Oportunidade não encontrada.</div>;

  const currentFunnel = funnels.find(f => f.id === lead.funnelId);
  const currentStage = currentFunnel?.stages.find(s => s.id === lead.stageId);
  const currentStageIndex = currentFunnel?.stages.findIndex(s => s.id === lead.stageId) ?? -1;
  const assignedUser = users.find(u => u.id === lead.assignedUserId);

  // Filtragem de campos personalizados para o funil atual
  const visibleCustomFields = customFields.filter(f => f.funnelId === lead.funnelId);

  // Handlers
  const handleSaveNote = () => {
      if (!noteText.trim()) return;
      const newNote = {
          id: `n-${Date.now()}`,
          content: noteText,
          createdAt: new Date().toISOString(),
          authorName: users.find(u => u.id === lead.assignedUserId)?.name || 'Vendedor'
      };
      updateLead(lead.id, { notes: [newNote, ...lead.notes] });
      setNoteText('');
  };

  const handleCreateTask = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newTask.title) return;
      addTask(lead.id, {
          id: `t-${Date.now()}`,
          title: newTask.title,
          dueDate: newTask.date || new Date().toISOString(),
          type: newTask.type,
          completed: false
      });
      setIsTaskModalOpen(false);
      setNewTask({ title: '', date: '', type: 'call' });
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
                      <h1 className="text-2xl font-black text-gray-900 tracking-tight">{lead.title}</h1>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">ID: {lead.id}</p>
                  </div>
              </div>
              <div className="flex items-center gap-3">
                  <button onClick={() => updateLead(lead.id, { probability: 0 })} className="px-5 py-2.5 bg-[#A5EDFF] hover:bg-[#80E6FF] text-[#00455B] font-black rounded-xl text-xs uppercase tracking-widest flex items-center gap-2 shadow-sm transition-all">
                      <LucideThumbsDown size={16} strokeWidth={3} /> Perda
                  </button>
                  <button onClick={() => updateLead(lead.id, { probability: 100 })} className="px-5 py-2.5 bg-[#00455B] hover:bg-[#003646] text-white font-black rounded-xl text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all">
                      <LucideThumbsUp size={16} strokeWidth={3} /> Venda
                  </button>
              </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
               <div className="px-3 py-1 bg-gray-100 text-gray-500 text-[10px] font-black uppercase rounded-lg border border-gray-200">
                   STATUS: {lead.probability === 100 ? 'GANHO' : lead.probability === 0 ? 'PERDIDO' : 'EM ABERTO'}
               </div>
               <div className="px-3 py-1 bg-[#00D2FF] text-[#00455B] text-[10px] font-black uppercase rounded-lg">
                   {currentFunnel?.name}
               </div>
               
               {/* Tags */}
               <div className="flex items-center gap-2 border-l pl-3 border-gray-200">
                  {lead.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black uppercase rounded border border-blue-100 flex items-center gap-1">
                          {tag}
                          <button onClick={() => updateLead(lead.id, { tags: lead.tags.filter(t => t !== tag) })} className="hover:text-red-500"><X size={10} /></button>
                      </span>
                  ))}
                  <input 
                    value={newTag}
                    onChange={e => setNewTag(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder="+ Tag"
                    className="text-[9px] font-bold bg-transparent outline-none border-b border-dashed border-gray-300 w-16 px-1 focus:border-blue-500"
                  />
               </div>
          </div>
      </div>

      {/* Progress Bar */}
      <div className="px-8 py-4 flex items-center shrink-0 bg-white shadow-sm z-10 overflow-x-auto">
          {currentFunnel?.stages.map((stage, idx) => (
              <div 
                key={stage.id} 
                onClick={() => updateLead(lead.id, { stageId: stage.id })}
                className={`chevron-step ${stage.id === lead.stageId ? 'active' : idx < currentStageIndex ? 'completed' : ''}`}
              >
                  {stage.name}
              </div>
          ))}
      </div>

      <div className="flex-1 flex overflow-hidden">
          {/* Sidebar Editável */}
          <div className="w-[340px] bg-gray-50 border-r border-gray-100 overflow-y-auto shrink-0 p-6 flex flex-col gap-8">
              
              <section className="space-y-4">
                  <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <User size={14} /> Responsável
                  </h3>
                  <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
                      <img src={assignedUser?.avatar} className="w-8 h-8 rounded-full border" />
                      <select 
                        value={lead.assignedUserId}
                        onChange={(e) => updateLead(lead.id, { assignedUserId: e.target.value })}
                        className="flex-1 bg-transparent text-sm font-bold text-gray-800 outline-none"
                      >
                          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                  </div>
              </section>

              <section className="space-y-4">
                  <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Briefcase size={14} /> Negociação
                  </h3>
                  <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-5 shadow-sm">
                      <EditableSidebarField label="Título" value={lead.title} onSave={(v) => updateLead(lead.id, { title: v })} />
                      <EditableSidebarField label="Empresa" value={lead.company} onSave={(v) => updateLead(lead.id, { company: v })} />
                      <EditableSidebarField label="Valor (R$)" value={lead.value.toString()} type="number" onSave={(v) => updateLead(lead.id, { value: parseFloat(v) || 0 })} />
                      <div className="space-y-1">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Probabilidade: {lead.probability}%</p>
                          <input 
                            type="range" min="0" max="100" value={lead.probability} 
                            onChange={(e) => updateLead(lead.id, { probability: parseInt(e.target.value) })}
                            className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#00455B]"
                          />
                      </div>
                  </div>
              </section>

              <section className="space-y-4">
                  <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Phone size={14} /> Contato
                  </h3>
                  <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-5 shadow-sm">
                      <EditableSidebarField label="Nome" value={lead.contactName} onSave={(v) => updateLead(lead.id, { contactName: v })} />
                      <EditableSidebarField label="E-mail" value={lead.contactEmail} onSave={(v) => updateLead(lead.id, { contactEmail: v })} />
                      <EditableSidebarField label="Telefone" value={lead.contactPhone} onSave={(v) => updateLead(lead.id, { contactPhone: v })} />
                  </div>
              </section>

              {/* Seção Campos Personalizados */}
              {visibleCustomFields.length > 0 && (
                <section className="space-y-4">
                    <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <SlidersHorizontal size={14} /> Personalizados
                    </h3>
                    <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-5 shadow-sm">
                        {visibleCustomFields.map(field => (
                            <div key={field.id} className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">{field.name}</label>
                                {field.type === 'text' ? (
                                    <input 
                                        defaultValue={lead.customValues?.[field.id] || ''}
                                        onBlur={(e) => updateLead(lead.id, { customValues: { ...lead.customValues, [field.id]: e.target.value } })}
                                        className="w-full text-sm font-bold text-gray-800 bg-gray-50 px-2 py-1.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-100"
                                    />
                                ) : (
                                    <select 
                                        value={lead.customValues?.[field.id] || ''}
                                        onChange={(e) => updateLead(lead.id, { customValues: { ...lead.customValues, [field.id]: e.target.value } })}
                                        className="w-full text-sm font-bold text-gray-800 bg-gray-50 px-2 py-1.5 rounded-lg outline-none"
                                    >
                                        <option value="">Selecione...</option>
                                        {field.options?.map(opt => <option key={opt.id} value={opt.label}>{opt.label}</option>)}
                                    </select>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
              )}
          </div>

          {/* Área Principal */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
              <div className="p-8 flex flex-col gap-8 flex-1 overflow-y-auto">
                  
                  {/* Atividades Pendentes */}
                  <section>
                      <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-black text-gray-900 tracking-tight">Atividades Pendentes</h3>
                          <button 
                            onClick={() => setIsTaskModalOpen(true)}
                            className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center gap-2"
                          >
                              <Plus size={16} /> Nova Tarefa
                          </button>
                      </div>
                      
                      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                          {lead.tasks.filter(t => !t.completed).length > 0 ? (
                              lead.tasks.filter(t => !t.completed).map(task => (
                                  <TaskRow key={task.id} task={task} onToggle={() => toggleTask(lead.id, task.id)} onDelete={() => deleteTask(lead.id, task.id)} />
                              ))
                          ) : (
                              <div className="p-10 text-center text-gray-400 italic text-sm">Nenhuma tarefa pendente.</div>
                          )}
                      </div>
                  </section>

                  {/* Abas */}
                  <section className="flex-1 flex flex-col">
                      <div className="flex gap-6 border-b border-gray-100 mb-6 overflow-x-auto">
                          {tabItems.map(tab => (
                              <button 
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`pb-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-[#00455B] text-[#00455B]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                              >
                                  {tab.label}
                              </button>
                          ))}
                      </div>

                      <div className="space-y-6">
                         {activeTab === 'history' && (
                             <div className="space-y-6">
                                 <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                                     <textarea 
                                        value={noteText}
                                        onChange={e => setNoteText(e.target.value)}
                                        placeholder="Escreva uma anotação..."
                                        className="w-full bg-transparent text-sm font-medium outline-none resize-none h-24 placeholder:text-gray-400"
                                     />
                                     <div className="flex justify-end pt-2">
                                        <button onClick={handleSaveNote} className="bg-blue-600 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-blue-700 flex items-center gap-2 transition-all">
                                            <Send size={14} /> Salvar Anotação
                                        </button>
                                     </div>
                                 </div>
                                 <div className="space-y-4 pb-10">
                                     {lead.notes.map(note => (
                                         <HistoryItem key={note.id} icon={<MessageSquare size={18} />} title={note.authorName} date={note.createdAt} content={note.content} />
                                     ))}
                                     {lead.tasks.filter(t => t.completed).map(task => (
                                         <HistoryItem key={task.id} icon={<CheckCircle size={18} className="text-green-500" />} title="Tarefa Concluída" date={new Date().toISOString()} content={task.title} />
                                     ))}
                                 </div>
                             </div>
                         )}

                         {activeTab === 'tasks' && (
                             <div className="space-y-4">
                                 {lead.tasks.map(task => (
                                     <TaskRow key={task.id} task={task} onToggle={() => toggleTask(lead.id, task.id)} onDelete={() => deleteTask(lead.id, task.id)} />
                                 ))}
                             </div>
                         )}

                         {activeTab !== 'history' && activeTab !== 'tasks' && (
                             <div className="py-20 text-center text-gray-300">
                                 <AlertCircle size={40} className="mx-auto mb-2 opacity-20" />
                                 <p className="uppercase text-[10px] font-black tracking-widest">Nenhum dado em {activeTab}</p>
                             </div>
                         )}
                      </div>
                  </section>
              </div>
          </div>
      </div>

      {/* Modal Nova Tarefa */}
      {isTaskModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
              <form onSubmit={handleCreateTask} className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                  <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
                      <h3 className="font-black text-gray-800 uppercase text-sm tracking-widest">Nova Atividade</h3>
                      <button type="button" onClick={() => setIsTaskModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                  </div>
                  <div className="p-8 space-y-5">
                      <input required autoFocus placeholder="O que precisa ser feito?" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-blue-100 font-bold" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
                      <div className="grid grid-cols-2 gap-4">
                          <input type="datetime-local" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none" value={newTask.date} onChange={e => setNewTask({...newTask, date: e.target.value})} />
                          <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none bg-white font-bold" value={newTask.type} onChange={e => setNewTask({...newTask, type: e.target.value as any})}>
                                <option value="call">Ligação</option>
                                <option value="email">E-mail</option>
                                <option value="meeting">Reunião</option>
                                <option value="todo">Geral</option>
                          </select>
                      </div>
                      <button type="submit" className="w-full bg-[#00455B] text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-black transition-all">Criar Tarefa</button>
                  </div>
              </form>
          </div>
      )}
    </div>
  );
};

// Componente Sidebar Field Interativo
const EditableSidebarField = ({ label, value, onSave, type = 'text' }: { label: string, value: string, onSave: (v: string) => void, type?: string }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [temp, setTemp] = useState(value);

    const handleBlur = () => {
        setIsEditing(false);
        if (temp !== value) onSave(temp);
    };

    return (
        <div className="flex flex-col gap-1 group">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{label}</p>
            {isEditing ? (
                <input 
                    autoFocus type={type} value={temp} 
                    onChange={e => setTemp(e.target.value)} 
                    onBlur={handleBlur}
                    onKeyDown={e => e.key === 'Enter' && handleBlur()}
                    className="text-sm font-bold text-gray-800 bg-blue-50 border-b border-blue-500 outline-none w-full"
                />
            ) : (
                <div 
                    onClick={() => setIsEditing(true)}
                    className="text-sm font-bold text-gray-800 cursor-pointer hover:text-blue-600 flex justify-between items-center group-hover:bg-gray-50 transition-all rounded px-1 -mx-1"
                >
                    <span className="truncate">{value || '---'}</span>
                    <Edit2 size={10} className="opacity-0 group-hover:opacity-100 text-gray-300" />
                </div>
            )}
        </div>
    );
};

const TaskRow = ({ task, onToggle, onDelete }: { task: Task, onToggle: () => void, onDelete: () => void }) => {
    const isOverdue = new Date(task.dueDate) < new Date() && !task.completed;
    return (
        <div className={`p-4 flex items-center gap-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors group ${task.completed ? 'opacity-50' : ''}`}>
            <button 
                onClick={(e) => { e.stopPropagation(); onToggle(); }} 
                className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${task.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-200 text-transparent hover:border-blue-400'}`}
            >
                <Check size={16} strokeWidth={4} />
            </button>
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    {task.type === 'call' && <PhoneCall size={12} className="text-blue-500" />}
                    {task.type === 'email' && <Mail size={12} className="text-yellow-500" />}
                    <span className={`text-sm font-bold ${task.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>{task.title}</span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                    <span className={`text-[10px] font-black uppercase ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
                        {new Date(task.dueDate).toLocaleString()}
                    </span>
                    {isOverdue && <span className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded">ATRASADA</span>}
                </div>
            </div>
            <button 
                onClick={(e) => { e.stopPropagation(); if(confirm('Excluir tarefa?')) onDelete(); }} 
                className="p-2 text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
            >
                <Trash2 size={16} />
            </button>
        </div>
    );
};

const HistoryItem = ({ icon, title, date, content }: { icon: React.ReactNode, title: string, date: string, content: string }) => (
    <div className="flex gap-4 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-blue-100 transition-colors animate-fade-in">
        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">{icon}</div>
        <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-black text-gray-900 uppercase tracking-tight">{title}</span>
                <span className="text-[10px] text-gray-400 font-bold">{new Date(date).toLocaleString()}</span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed font-medium whitespace-pre-wrap">{content}</p>
        </div>
    </div>
);

const tabItems = [
    { id: 'history', label: 'Histórico' },
    { id: 'email', label: 'E-mail' },
    { id: 'tasks', label: 'Tarefas' },
    { id: 'products', label: 'Produtos e Serviços' },
    { id: 'files', label: 'Arquivos' },
    { id: 'proposals', label: 'Propostas' },
    { id: 'signature', label: 'Assinatura Eletrônica' },
];
