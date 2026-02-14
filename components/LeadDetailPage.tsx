
import React, { useState, useEffect } from 'react';
import { useCRM } from '../context/CRMContext';
import { 
  ArrowLeft, Check, X, User, Phone, Mail, Building, 
  Calendar, Clock, ChevronDown, ChevronUp,
  Plus, MoreVertical, CheckCircle, XCircle,
  Edit2, PhoneCall, Layers, Trash2,
  Briefcase, DollarSign, SlidersHorizontal, 
  Tag as TagIcon, Target, Send, MessageSquare,
  AlertCircle, ThumbsUp as LucideThumbsUp, ThumbsDown as LucideThumbsDown
} from 'lucide-react';
import { CustomFieldDefinition, Lead, Task, User as UserType } from '../types';

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
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState({ title: '', date: '', type: 'call' as Task['type'] });
  const [newTag, setNewTag] = useState('');

  if (!lead) return <div className="p-8 text-center text-gray-500 font-bold">Oportunidade não encontrada.</div>;

  const currentFunnel = funnels.find(f => f.id === lead.funnelId);
  const currentStageIndex = currentFunnel?.stages.findIndex(s => s.id === lead.stageId) ?? -1;
  const assignedUser = users.find(u => u.id === lead.assignedUserId);

  const visibleCustomFields = customFields.filter(f => f.funnelId === lead.funnelId);

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

  const handleTaskSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newTask.title) return;

      if (editingTask) {
          const updatedTasks = (lead.tasks || []).map(t => 
            t.id === editingTask.id 
                ? { ...t, title: newTask.title, dueDate: newTask.date, type: newTask.type } 
                : t
          );
          await updateLead(lead.id, { tasks: updatedTasks });
      } else {
          await addTask(lead.id, {
              id: `t-${Date.now()}`,
              title: newTask.title,
              dueDate: newTask.date || new Date().toISOString(),
              type: newTask.type,
              completed: false
          });
      }
      closeTaskModal();
  };

  const openEditTask = (task: Task) => {
      setEditingTask(task);
      setNewTask({ title: task.title, date: task.dueDate.slice(0, 16), type: task.type });
      setIsTaskModalOpen(true);
  };

  const closeTaskModal = () => {
      setIsTaskModalOpen(false);
      setEditingTask(null);
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
    <div className="flex flex-col h-full bg-white overflow-hidden animate-fade-in">
      
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
          </div>

          <div className="flex-1 flex flex-col bg-white overflow-hidden">
              <div className="p-8 flex flex-col gap-8 flex-1 overflow-y-auto">
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
                                  <TaskRow 
                                    key={task.id} 
                                    task={task} 
                                    onToggle={() => toggleTask(lead.id, task.id)} 
                                    onDelete={() => deleteTask(lead.id, task.id)} 
                                    onEdit={() => openEditTask(task)}
                                  />
                              ))
                          ) : (
                              <div className="p-10 text-center text-gray-400 italic text-sm">Nenhuma tarefa pendente.</div>
                          )}
                      </div>
                  </section>
              </div>
          </div>
      </div>
    </div>
  );
};

const EditableSidebarField = ({ label, value, onSave, type = 'text' }: { label: string, value: string, onSave: (v: string) => void, type?: string }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [temp, setTemp] = useState(value);
    useEffect(() => { setTemp(value); }, [value]);
    const handleBlur = () => { setIsEditing(false); if (temp !== value) onSave(temp); };
    return (
        <div className="flex flex-col gap-1 group">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{label}</p>
            {isEditing ? (
                <input autoFocus type={type} value={temp} onChange={e => setTemp(e.target.value)} onBlur={handleBlur} onKeyDown={e => e.key === 'Enter' && handleBlur()} className="text-sm font-bold text-gray-800 bg-blue-50 border-b border-blue-500 outline-none w-full" />
            ) : (
                <div onClick={() => setIsEditing(true)} className="text-sm font-bold text-gray-800 cursor-pointer hover:text-blue-600 flex justify-between items-center transition-all rounded px-1 -mx-1">
                    <span className="truncate">{value || '---'}</span>
                    <Edit2 size={10} className="opacity-0 group-hover:opacity-100 text-gray-300" />
                </div>
            )}
        </div>
    );
};

const TaskRow = ({ task, onToggle, onDelete, onEdit }: { task: Task, onToggle: () => void, onDelete: () => void, onEdit: () => void }) => {
    return (
        <div className={`p-4 flex items-center gap-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors group ${task.completed ? 'opacity-50' : ''}`}>
            <button onClick={(e) => { e.stopPropagation(); onToggle(); }} className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${task.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-200 hover:border-blue-400'}`}>
                <Check size={16} strokeWidth={4} />
            </button>
            <div className="flex-1 cursor-pointer" onClick={onEdit}>
                <span className={`text-sm font-bold ${task.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>{task.title}</span>
            </div>
            <button onClick={(e) => { e.stopPropagation(); if(confirm('Excluir?')) onDelete(); }} className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
        </div>
    );
};

const tabItems = [
    { id: 'history', label: 'Histórico' },
    { id: 'email', label: 'E-mail' },
    { id: 'tasks', label: 'Tarefas' },
    { id: 'products', label: 'Produtos e Serviços' },
    { id: 'files', label: 'Arquivos' },
    { id: 'proposals', label: 'Propostas' },
    { id: 'signature', label: 'Assinatura Eletrônica' },
];
