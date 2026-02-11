
import React, { useState, useEffect } from 'react';
import { useCRM } from '../context/CRMContext.tsx';
import { 
  ArrowLeft, Check, X, User, Phone, Mail, Building, 
  Calendar, Clock, ChevronDown, ChevronUp,
  Plus, MoreVertical, CheckCircle, XCircle,
  Edit2, PhoneCall, Layers, Trash2,
  Briefcase, DollarSign, SlidersHorizontal, 
  Tag as TagIcon, Target, Send, MessageSquare,
  FileText, ShoppingBag, ScrollText, PenTool,
  AlertCircle, ThumbsUp as LucideThumbsUp, ThumbsDown as LucideThumbsDown
} from 'lucide-react';
import { CustomFieldDefinition, Lead, Task, User as UserType } from '../types.ts';

interface Props {
  leadId: string;
  onBack: () => void;
  onNavigate: (view: string, data?: any) => void;
}

export const LeadDetailPage: React.FC<Props> = ({ leadId, onBack, onNavigate }) => {
  const { leads, funnels, updateLead, customFields, users, addTask, toggleTask, deleteTask } = useCRM();
  const lead = leads.find(l => l.id === leadId);
  
  const [activeTab, setActiveTab] = useState('history');
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [isChangingFunnel, setIsChangingFunnel] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', date: '', type: 'call' as Task['type'] });

  if (!lead) return <div className="p-8 text-center text-gray-500 font-bold">Oportunidade não encontrada.</div>;

  const currentFunnel = funnels.find(f => f.id === lead.funnelId);
  const currentStage = currentFunnel?.stages.find(s => s.id === lead.stageId);
  const currentStageIndex = currentFunnel?.stages.findIndex(s => s.id === lead.stageId) ?? -1;
  const assignedUser = users.find(u => u.id === lead.assignedUserId);

  // Handlers
  const handleSaveNote = () => {
      if (!noteText.trim()) return;
      const newNote = {
          id: `n-${Date.now()}`,
          content: noteText,
          createdAt: new Date().toISOString(),
          authorName: assignedUser?.name || 'Vendedor'
      };
      updateLead(lead.id, { notes: [newNote, ...lead.notes] });
      setNoteText('');
  };

  const handleCreateTask = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newTask.title) return;
      const task: Task = {
          id: `t-${Date.now()}`,
          title: newTask.title,
          dueDate: newTask.date || new Date().toISOString(),
          type: newTask.type,
          completed: false
      };
      addTask(lead.id, task);
      setIsTaskModalOpen(false);
      setNewTask({ title: '', date: '', type: 'call' });
  };

  const handleMarkWon = () => {
      const wonStage = currentFunnel?.stages[currentFunnel.stages.length - 1];
      updateLead(lead.id, { 
          probability: 100, 
          stageId: wonStage?.id || lead.stageId 
      });
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
                  <h1 className="text-2xl font-black text-gray-900 tracking-tight">{lead.title}</h1>
              </div>
              <div className="flex items-center gap-3">
                  <button onClick={() => updateLead(lead.id, { probability: 0 })} className="px-5 py-2.5 bg-[#A5EDFF] hover:bg-[#80E6FF] text-[#00455B] font-black rounded-xl text-xs uppercase tracking-widest flex items-center gap-2 shadow-sm transition-all">
                      <LucideThumbsDown size={16} strokeWidth={3} /> Perda
                  </button>
                  <button onClick={handleMarkWon} className="px-5 py-2.5 bg-[#00455B] hover:bg-[#003646] text-white font-black rounded-xl text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all">
                      <LucideThumbsUp size={16} strokeWidth={3} /> Venda
                  </button>
              </div>
          </div>

          <div className="flex items-center gap-3">
               <div className="px-3 py-1 bg-gray-100 text-gray-500 text-[10px] font-black uppercase rounded-lg border border-gray-200">
                   STATUS: {lead.probability === 100 ? 'GANHO' : lead.probability === 0 ? 'PERDIDO' : 'EM ABERTO'}
               </div>
               <div className="px-3 py-1 bg-[#00D2FF] text-[#00455B] text-[10px] font-black uppercase rounded-lg">
                   {currentFunnel?.name}
               </div>
               <div className="px-3 py-1 bg-gray-50 text-gray-400 text-[10px] font-black uppercase rounded-lg border border-gray-100 italic">
                   {currentStage?.name}
               </div>
          </div>
      </div>

      {/* Progress Bar (Chevrons) */}
      <div className="px-8 py-4 flex items-center shrink-0 bg-white shadow-sm z-10">
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
          {/* Sidebar Negociação */}
          <div className="w-[320px] bg-gray-50 border-r border-gray-100 overflow-y-auto shrink-0 p-6 flex flex-col gap-8">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setSidebarExpanded(!sidebarExpanded)}>
                  <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Briefcase size={14} /> Negociação
                  </h3>
                  {sidebarExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>

              {sidebarExpanded && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4 shadow-sm animate-fade-in">
                      <SidebarField label="Nome" value={lead.title} />
                      <SidebarField label="Responsável" value={assignedUser?.name || '---'} />
                      <SidebarField label="Valor" value={`R$ ${lead.value.toLocaleString()}`} />
                      <SidebarField label="Criação" value={new Date(lead.createdAt).toLocaleDateString()} />
                      <SidebarField label="Empresa" value={lead.company} />
                      <SidebarField label="E-mail" value={lead.contactEmail} />
                  </div>
              )}
          </div>

          {/* Área Principal Direita */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
              <div className="p-8 flex flex-col gap-8 flex-1 overflow-y-auto">
                  
                  {/* Bloco de Tarefas Pendentes */}
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

                  {/* Tabs de Conteúdo */}
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

                      {/* Conteúdo da Aba */}
                      <div className="space-y-6">
                         {activeTab === 'history' && (
                             <div className="space-y-6">
                                 {/* Box de Anotação */}
                                 <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                                     <textarea 
                                        value={noteText}
                                        onChange={e => setNoteText(e.target.value)}
                                        placeholder="Escreva uma nova anotação..."
                                        className="w-full bg-transparent text-sm font-medium outline-none resize-none h-24 placeholder:text-gray-400"
                                     />
                                     <div className="flex justify-end pt-2">
                                        <button onClick={handleSaveNote} className="bg-blue-600 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-blue-700 flex items-center gap-2 transition-all">
                                            <Send size={14} /> Salvar Anotação
                                        </button>
                                     </div>
                                 </div>
                                 
                                 {/* Feed Consolidado */}
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
                                 <h4 className="text-xs font-black text-gray-400 uppercase">Todas as atividades desta oportunidade</h4>
                                 {lead.tasks.map(task => (
                                     <TaskRow key={task.id} task={task} onToggle={() => toggleTask(lead.id, task.id)} onDelete={() => deleteTask(lead.id, task.id)} />
                                 ))}
                             </div>
                         )}

                         {/* Placeholders Estilizados para as outras abas */}
                         {['email', 'products', 'files', 'proposals', 'signature'].includes(activeTab) && (
                             <div className="p-20 text-center flex flex-col items-center gap-4 text-gray-300">
                                 <div className="p-6 bg-gray-50 rounded-full border-2 border-dashed border-gray-200">
                                     <AlertCircle size={40} />
                                 </div>
                                 <p className="font-bold uppercase text-xs tracking-widest">Nenhum registro de {tabItems.find(t => t.id === activeTab)?.label.toLowerCase()} encontrado.</p>
                             </div>
                         )}
                      </div>
                  </section>
              </div>
          </div>
      </div>

      {/* Modal de Nova Tarefa */}
      {isTaskModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
              <form onSubmit={handleCreateTask} className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                  <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
                      <h3 className="font-black text-gray-800 uppercase text-sm tracking-widest">Nova Atividade</h3>
                      <button type="button" onClick={() => setIsTaskModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                  </div>
                  <div className="p-8 space-y-5">
                      <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">O que precisa ser feito?</label>
                          <input 
                            required 
                            autoFocus
                            placeholder="Ex: Retornar ligação da proposta" 
                            className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-blue-100 font-bold"
                            value={newTask.title}
                            onChange={e => setNewTask({...newTask, title: e.target.value})}
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Data Prazo</label>
                            <input 
                                type="datetime-local" 
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none"
                                value={newTask.date}
                                onChange={e => setNewTask({...newTask, date: e.target.value})}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Tipo</label>
                            <select 
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none bg-white font-bold"
                                value={newTask.type}
                                onChange={e => setNewTask({...newTask, type: e.target.value as any})}
                            >
                                <option value="call">Ligação</option>
                                <option value="email">E-mail</option>
                                <option value="meeting">Reunião</option>
                                <option value="todo">Geral</option>
                            </select>
                          </div>
                      </div>
                      <button type="submit" className="w-full bg-[#00455B] text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-black transition-all">Criar Tarefa</button>
                  </div>
              </form>
          </div>
      )}
    </div>
  );
};

// Componentes Auxiliares
const SidebarField = ({ label, value }: { label: string, value: string }) => (
    <div className="flex flex-col gap-0.5">
        <p className="text-[10px] font-bold text-gray-400 uppercase">{label}</p>
        <p className="text-sm font-bold text-gray-800 truncate">{value || '---'}</p>
    </div>
);

const TaskRow = ({ task, onToggle, onDelete }: { task: Task, onToggle: () => void, onDelete: () => void }) => {
    const isOverdue = new Date(task.dueDate) < new Date() && !task.completed;
    return (
        <div className={`p-4 flex items-center gap-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors group ${task.completed ? 'opacity-50' : ''}`}>
            <button onClick={onToggle} className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${task.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-200 text-transparent hover:border-blue-400'}`}>
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
            <button onClick={onDelete} className="p-2 text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
        </div>
    );
};

const HistoryItem = ({ icon, title, date, content }: { icon: React.ReactNode, title: string, date: string, content: string }) => (
    <div className="flex gap-4 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-blue-100 transition-colors animate-fade-in">
        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            {icon}
        </div>
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
