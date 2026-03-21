
import React, { useState, useEffect, useRef } from 'react';
import { useCRM } from '../context/CRMContext';
import { 
  ArrowLeft, Check, X, User, Phone, Mail, Building, 
  Calendar, Clock, ChevronRight, ChevronDown, ChevronUp,
  Plus, MoreHorizontal, FileText, CheckCircle, XCircle,
  Copy, Save, AlertCircle, ThumbsUp, Send, Paperclip, Edit2, Sparkles, Settings, Trash2, PhoneCall, Layers,
  Briefcase, DollarSign, SlidersHorizontal
} from 'lucide-react';
import { CustomFieldDefinition, Lead, Task } from '../types';

interface EditableFieldProps {
  label: string;
  value: string | number;
  type?: 'text' | 'number' | 'email' | 'tel';
  onChange: (val: string) => void;
  placeholder?: string;
  icon?: React.ElementType;
}

const EditableField: React.FC<EditableFieldProps> = ({ label, value, type = 'text', onChange, placeholder = '-', icon: Icon }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (tempValue !== value) {
      onChange(String(tempValue));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleBlur();
    if (e.key === 'Escape') { setTempValue(value); setIsEditing(false); }
  };

  return (
    <div className="flex flex-col group mb-1">
      <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
        {Icon && <Icon size={10} />}
        {label}
      </label>
      <div 
        onClick={() => setIsEditing(true)}
        className={`min-h-[32px] flex items-center text-sm rounded-lg px-2 -ml-2 transition-all cursor-pointer border border-transparent ${isEditing ? '' : 'hover:bg-gray-100 hover:border-gray-200'}`}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            type={type}
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full bg-white border border-blue-400 rounded-lg px-2 py-1 outline-none text-gray-900 font-bold"
          />
        ) : (
          <div className="flex items-center justify-between w-full">
            <span className={`truncate ${!value ? 'text-gray-400 italic' : 'text-gray-900 font-bold'}`}>
              {type === 'number' && value ? `R$ ${Number(value).toLocaleString()}` : (value || placeholder)}
            </span>
            <Edit2 size={12} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
      </div>
    </div>
  );
};

interface Props {
  leadId: string;
  onBack: () => void;
  onNavigate: (view: string, data?: any) => void;
}

export const LeadDetailPage: React.FC<Props> = ({ leadId, onBack, onNavigate }) => {
  const { leads, funnels, updateLead, duplicateLead, customFields, addTask, toggleTask, deleteTask, addNote } = useCRM();
  const lead = leads.find(l => l.id === leadId);
  
  const [activeTab, setActiveTab] = useState<'notes' | 'tasks'>('notes');
  const [noteText, setNoteText] = useState('');
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [newTaskData, setNewTaskData] = useState<{title: string, date: string, type: 'call' | 'email' | 'meeting' | 'todo'}>({
      title: '',
      date: new Date().toISOString().slice(0, 16),
      type: 'todo'
  });
  
  if (!lead) return <div className="p-8 text-center"><p className="text-gray-500">Lead não encontrado.</p> <button onClick={onBack} className="text-blue-500 underline mt-2">Voltar</button></div>;

  const currentFunnel = funnels.find(f => f.id === lead.funnelId);
  const currentStageIndex = currentFunnel?.stages.findIndex(s => s.id === lead.stageId) ?? -1;

  const handleSaveNote = () => {
    if (!noteText.trim()) return;
    const newNote = { id: `note-${Date.now()}`, content: noteText, createdAt: new Date().toISOString(), authorName: 'Eu' };
    addNote(lead.id, newNote);
    setNoteText('');
  };

  const handleCreateTask = (e: React.FormEvent) => {
      e.preventDefault();
      if(!newTaskData.title) return;
      addTask(lead.id, { id: `t-${Date.now()}`, title: newTaskData.title, dueDate: newTaskData.date || new Date().toISOString(), type: newTaskData.type, completed: false });
      setNewTaskData({ title: '', date: new Date().toISOString().slice(0, 16), type: 'todo' });
      setIsTaskFormOpen(false);
  };

  const handleMarkAsWon = () => {
    if (!currentFunnel) return;
    const targetStageId = currentFunnel.defaultWonStageId || currentFunnel.stages[currentFunnel.stages.length - 1].id;
    updateLead(lead.id, { probability: 100, stageId: targetStageId });
    addNote(lead.id, { id: `sys-${Date.now()}`, content: "🎉 Negócio marcado como GANHO!", createdAt: new Date().toISOString(), authorName: 'Sistema' });
  };

  const handleTransferFunnel = (targetFunnelId: string) => {
      if (targetFunnelId === lead.funnelId) return;
      const targetFunnel = funnels.find(f => f.id === targetFunnelId);
      if (!targetFunnel) return;
      const targetStageId = targetFunnel.stages[0]?.id || '';
      
      const updateData = { 
        funnelId: targetFunnelId, 
        stageId: targetStageId
      };
      
      updateLead(lead.id, updateData);
      addNote(lead.id, { 
          id: `sys-mov-${Date.now()}`, 
          content: `🔄 Lead encaminhado do funil "${currentFunnel?.name}" para o funil "${targetFunnel.name}".`, 
          createdAt: new Date().toISOString(), 
          authorName: 'Sistema' 
      });
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

  const visibleStandardFields = customFields.filter(field => {
    if (field.context === 'lost_reason') return false; 
    if (field.funnelId !== lead.funnelId) return false;
    if (field.visibleStageIds.length > 0 && !field.visibleStageIds.includes(lead.stageId)) return false;
    return true;
  });

  const isWon = lead.probability === 100;
  const isLost = lead.probability === 0;

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden animate-fade-in relative">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between shrink-0 shadow-sm z-20">
            <div className="flex items-center gap-5 flex-1">
                <button onClick={onBack} className="bg-gray-50 p-3 rounded-xl hover:bg-gray-100 text-gray-500 transition-all border border-gray-100">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-1">
                    <input 
                        key={`title-${lead.id}`}
                        defaultValue={lead.title}
                        onBlur={(e) => updateLead(lead.id, { title: e.target.value })}
                        className="text-2xl font-black text-gray-900 w-full outline-none bg-transparent hover:bg-blue-50 focus:bg-white rounded-lg px-2 -ml-2 transition-all tracking-tight"
                    />
                    <div className="flex items-center gap-3 mt-1.5">
                         <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-blue-600 text-white rounded-lg shadow-sm">
                             {currentFunnel?.name || 'Sem Funil'}
                         </span>
                         {lead.tags.map(tag => (
                            <span key={tag} className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-gray-100 text-gray-500 rounded-lg border border-gray-200">
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                 {isWon ? (
                     <div className="flex items-center gap-2 px-6 py-3 bg-green-50 text-green-700 rounded-xl font-black text-sm border border-green-200 shadow-sm animate-scale-in">
                         <CheckCircle size={20} /> VENDA GANHA
                     </div>
                 ) : isLost ? (
                     <div className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-700 rounded-xl font-black text-sm border border-red-200 shadow-sm animate-scale-in">
                         <XCircle size={20} /> VENDA PERDIDA
                     </div>
                 ) : (
                    <>
                        <button onClick={() => updateLead(lead.id, { probability: 0 })} className="flex items-center gap-2 px-5 py-3 border border-red-100 text-red-600 hover:bg-red-50 rounded-xl font-bold text-sm transition-all">
                            <X size={18} /> Perda
                        </button>
                        <button onClick={handleMarkAsWon} className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-green-100">
                            <ThumbsUp size={18} /> Ganho
                        </button>
                    </>
                 )}
            </div>
        </header>

        {/* Pipeline Progress Bar */}
        <div className="bg-white border-b border-gray-100 px-8 py-5 shrink-0 overflow-x-auto">
             <div className="flex w-full min-w-[700px] h-10 rounded-xl overflow-hidden shadow-inner bg-gray-50 border border-gray-100">
                 {currentFunnel?.stages.map((stage, index) => {
                     let status = 'future';
                     if (isWon) status = 'completed';
                     else if (isLost && index === currentStageIndex) status = 'lost';
                     else if (index < currentStageIndex) status = 'completed';
                     else if (index === currentStageIndex) status = 'current';

                     const bgColor = status === 'completed' ? 'bg-green-50 text-green-600' : status === 'current' ? 'bg-blue-600 text-white' : status === 'lost' ? 'bg-red-600 text-white' : 'bg-transparent text-gray-400';

                     return (
                         <div key={stage.id} onClick={() => !isWon && !isLost && updateLead(lead.id, { stageId: stage.id })} className={`flex-1 flex items-center justify-center text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all border-r border-gray-100 last:border-r-0 ${bgColor} ${status === 'current' ? 'shadow-lg z-10' : ''}`}>
                             {status === 'completed' && <Check size={14} className="mr-1.5" strokeWidth={4} />}
                             {status === 'lost' && <X size={14} className="mr-1.5" strokeWidth={4} />}
                             <span className="truncate px-2">{stage.name}</span>
                         </div>
                     );
                 })}
             </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
            {/* Sidebar Details */}
            <div className="w-[360px] bg-white border-r border-gray-200 overflow-y-auto shrink-0 p-8 space-y-8">
                {/* Encaminhar Feature */}
                <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100/50">
                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Layers size={14} /> Encaminhar para Funil
                    </h4>
                    <select 
                        value={lead.funnelId} 
                        onChange={(e) => handleTransferFunnel(e.target.value)} 
                        className="w-full bg-white border border-blue-200 text-gray-800 text-sm font-bold rounded-xl p-3 outline-none focus:ring-4 focus:ring-blue-100 transition-all shadow-sm cursor-pointer"
                    >
                        {funnels.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                </div>

                <div className="space-y-6">
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2 border-b border-gray-50 pb-2">
                        <Briefcase size={16} className="text-blue-500" /> Negociação
                    </h3>
                    <div className="space-y-4">
                        <EditableField label="Empresa" value={lead.company} onChange={(v) => updateLead(lead.id, { company: v })} icon={Building} />
                        <EditableField label="Valor Esperado" value={lead.value} type="number" onChange={(v) => updateLead(lead.id, { value: Number(v) })} icon={DollarSign} />
                    </div>
                </div>

                {visibleStandardFields.length > 0 && (
                    <div className="space-y-6">
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2 border-b border-gray-50 pb-2">
                            <SlidersHorizontal size={16} className="text-blue-500" /> Campos Personalizados
                        </h3>
                        <div className="space-y-4">
                            {visibleStandardFields.map(field => (
                                <div key={field.id} className="flex flex-col group">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">{field.name}</label>
                                    
                                    {field.type === 'text' && (
                                        <input 
                                            type="text"
                                            key={`cf-${field.id}-${lead.id}`}
                                            defaultValue={lead.customValues?.[field.id] || ''}
                                            onBlur={(e) => handleCustomFieldChange(field, e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="..."
                                        />
                                    )}

                                    {field.type === 'select' && (
                                        <select
                                            value={lead.customValues?.[field.id] || ''}
                                            onChange={(e) => handleCustomFieldChange(field, e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Selecione...</option>
                                            {field.options?.map(opt => (
                                                <option key={opt.id} value={opt.label}>{opt.label}</option>
                                            ))}
                                        </select>
                                    )}

                                    {field.type === 'multiselect' && (
                                        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-2 max-h-32 overflow-y-auto shadow-inner">
                                            {field.options?.map(opt => {
                                                const isSelected = (lead.customValues?.[field.id] as string[] || []).includes(opt.label);
                                                return (
                                                    <label key={opt.id} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded transition-colors">
                                                        <input 
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => handleCustomFieldChange(field, opt.label)}
                                                            className="rounded text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <span className="text-xs font-bold text-gray-700">{opt.label}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="space-y-6">
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2 border-b border-gray-50 pb-2">
                        <User size={16} className="text-blue-500" /> Contato Direto
                    </h3>
                    <div className="space-y-4">
                        <EditableField label="Nome do Contato" value={lead.contactName} onChange={(v) => updateLead(lead.id, { contactName: v })} icon={User} />
                        <EditableField label="E-mail" value={lead.contactEmail} onChange={(v) => updateLead(lead.id, { contactEmail: v })} icon={Mail} />
                        <EditableField label="Telefone" value={lead.contactPhone} onChange={(v) => updateLead(lead.id, { contactPhone: v })} icon={Phone} />
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 bg-gray-50 flex flex-col min-w-0">
                <div className="bg-white border-b border-gray-100 px-8 pt-4">
                    <div className="flex gap-8">
                        {['notes', 'tasks'].map((tab) => (
                            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`pb-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                                {tab === 'notes' ? 'Histórico de Notas' : 'Tarefas e Lembretes'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    {activeTab === 'notes' && (
                        <div className="space-y-6 max-w-3xl mx-auto">
                            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                                <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Adicione um detalhe importante sobre esta venda..." className="w-full text-sm font-medium outline-none resize-none min-h-[100px] placeholder-gray-300" />
                                <div className="flex justify-end mt-4 pt-4 border-t border-gray-50">
                                    <button onClick={handleSaveNote} disabled={!noteText.trim()} className="bg-gray-900 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-black disabled:opacity-30 transition-all shadow-lg">Salvar Nota</button>
                                </div>
                            </div>
                            <div className="space-y-4 pb-10">
                                {lead.notes.map(note => (
                                    <div key={note.id} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex gap-4 animate-fade-in hover:border-blue-100 transition-colors">
                                        <div className={`p-3 rounded-full h-fit ${note.authorName === 'Sistema' ? 'bg-gray-100 text-gray-400' : 'bg-blue-50 text-blue-600'}`}>
                                            <User size={18} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-xs font-black text-gray-800 uppercase tracking-tight">{note.authorName}</span>
                                                <span className="text-[10px] font-bold text-gray-300">{new Date(note.createdAt).toLocaleString()}</span>
                                            </div>
                                            <p className="text-sm text-gray-600 leading-relaxed font-medium whitespace-pre-wrap">{note.content}</p>
                                        </div>
                                    </div>
                                ))}
                                {lead.notes.length === 0 && (
                                    <div className="text-center py-10 text-gray-400 font-bold uppercase text-[10px] tracking-widest">Nenhuma nota registrada.</div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'tasks' && (
                        <div className="max-w-3xl mx-auto space-y-6">
                           {isTaskFormOpen ? (
                               <div className="bg-white p-6 rounded-2xl border border-blue-200 shadow-xl shadow-blue-50 mb-6 animate-scale-in">
                                   <div className="flex justify-between items-center mb-4">
                                       <h4 className="font-bold text-gray-800">Nova Atividade</h4>
                                       <button onClick={() => setIsTaskFormOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                                   </div>
                                   <form onSubmit={handleCreateTask} className="space-y-4">
                                       <input required value={newTaskData.title} onChange={e => setNewTaskData({...newTaskData, title: e.target.value})} placeholder="O que precisa ser feito?" className="w-full border-b-2 border-gray-100 focus:border-blue-500 py-2 outline-none font-bold text-gray-700" />
                                       <div className="grid grid-cols-2 gap-4">
                                           <div>
                                               <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Data e Hora</label>
                                               <input type="datetime-local" value={newTaskData.date} onChange={e => setNewTaskData({...newTaskData, date: e.target.value})} className="w-full bg-gray-50 rounded-lg p-2 text-sm outline-none" />
                                           </div>
                                           <div>
                                               <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Tipo</label>
                                               <select value={newTaskData.type} onChange={e => setNewTaskData({...newTaskData, type: e.target.value as any})} className="w-full bg-gray-50 rounded-lg p-2 text-sm outline-none">
                                                   <option value="todo">Tarefa</option>
                                                   <option value="call">Ligação</option>
                                                   <option value="meeting">Reunião</option>
                                                   <option value="email">E-mail</option>
                                               </select>
                                           </div>
                                       </div>
                                       <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg">Criar Tarefa</button>
                                   </form>
                               </div>
                           ) : (
                               <button onClick={() => setIsTaskFormOpen(true)} className="w-full py-4 bg-white border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 font-bold hover:border-blue-400 hover:text-blue-500 transition-all flex items-center justify-center gap-2 mb-6 shadow-sm">
                                   <Plus size={20} /> Adicionar Nova Atividade
                               </button>
                           )}
                            <div className="space-y-3 pb-10">
                                {lead.tasks.map(task => (
                                    <div key={task.id} className={`p-4 bg-white border rounded-2xl flex items-center gap-4 transition-all ${task.completed ? 'opacity-50 border-gray-100' : 'border-gray-200 shadow-sm hover:border-blue-200'}`}>
                                        <button onClick={() => toggleTask(lead.id, task.id)} className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${task.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-200 hover:border-blue-500'}`}>
                                            <Check size={14} strokeWidth={4} />
                                        </button>
                                        <div className="flex-1">
                                            <div className={`text-sm font-bold ${task.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>{task.title}</div>
                                            <div className="text-[10px] text-gray-400 font-black uppercase flex items-center gap-2 mt-0.5">
                                                {task.type === 'call' && <PhoneCall size={10} />}
                                                {task.type === 'email' && <Mail size={10} />}
                                                <Calendar size={10} /> {new Date(task.dueDate).toLocaleString()}
                                            </div>
                                        </div>
                                        <button onClick={() => deleteTask(lead.id, task.id)} className="p-2 text-gray-200 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                    </div>
                                ))}
                                {lead.tasks.length === 0 && !isTaskFormOpen && (
                                    <div className="text-center py-10 text-gray-300 font-bold uppercase text-[10px] tracking-widest">Nenhuma tarefa agendada.</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};
