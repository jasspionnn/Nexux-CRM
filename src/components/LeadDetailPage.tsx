import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, ThumbsDown, ThumbsUp, Briefcase, Phone, MessageSquare, Send, Layers, 
  Edit2, Check, X, Calendar, Trash2, Clock, CheckCircle2, Circle, Plus
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const EditableField = ({ label, value, onSave, type = "text" }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value || '');
    setIsEditing(false);
  };

  return (
    <div className="group relative">
      <div className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-1">{label}</div>
      {isEditing ? (
        <div className="flex items-center gap-2">
          <input
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full text-sm font-bold text-slate-900 border-b border-indigo-500 focus:outline-none bg-white px-1"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <button onClick={handleSave} className="text-green-600 hover:text-green-700"><Check size={16} /></button>
          <button onClick={handleCancel} className="text-red-500 hover:text-red-600"><X size={16} /></button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold text-gray-900 truncate pr-4">
            {type === 'number' && value ? `R$ ${Number(value).toLocaleString('pt-BR')}` : (value || '---')}
          </div>
          <button 
            onClick={() => setIsEditing(true)} 
            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-indigo-600 transition-opacity"
          >
            <Edit2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

const EditableSelectField = ({ label, value, options, onSave }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value || '');
    setIsEditing(false);
  };

  const selectedOption = options.find((o: any) => o.id === value);

  return (
    <div className="group relative">
      <div className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-1">{label}</div>
      {isEditing ? (
        <div className="flex items-center gap-2">
          <select
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full text-sm font-bold text-slate-900 border-b border-indigo-500 focus:outline-none bg-white px-1"
            autoFocus
          >
            <option value="">Selecione...</option>
            {options.map((o: any) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <button onClick={handleSave} className="text-green-600 hover:text-green-700"><Check size={16} /></button>
          <button onClick={handleCancel} className="text-red-500 hover:text-red-600"><X size={16} /></button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold text-gray-900 truncate pr-4">
            {selectedOption ? selectedOption.name : '---'}
          </div>
          <button 
            onClick={() => setIsEditing(true)} 
            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-indigo-600 transition-opacity"
          >
            <Edit2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export const LeadDetailPage = ({ leadId, onBack, onNavigate }: any) => {
  const { currentUser } = useCRM();
  const [lead, setLead] = useState<any>(null);
  const [funnel, setFunnel] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [leadVisits, setLeadVisits] = useState<any[]>([]);
  const [noteText, setNoteText] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [activeTab, setActiveTab] = useState<'notes' | 'tasks' | 'visits'>('notes');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingTask, setIsAddingTask] = useState(false);

  useEffect(() => {
    fetchData();
  }, [leadId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const leadRes = await fetch(`/api/leads/${leadId}`);
      if (!leadRes.ok) throw new Error('Lead not found');
      const leadData = await leadRes.json();
      setLead(leadData);

      const funnelsRes = await fetch('/api/funnels');
      const funnelsData = await funnelsRes.json();
      const currentFunnel = funnelsData.find((f: any) => f.id === leadData.funnel_id);
      setFunnel(currentFunnel);

      const notesRes = await fetch(`/api/leads/${leadId}/notes`);
      const notesData = await notesRes.json();
      setNotes(notesData);

      const tasksRes = await fetch(`/api/leads/${leadId}/tasks`);
      const tasksData = await tasksRes.json();
      setTasks(tasksData);

      const usersRes = await fetch('/api/users');
      const usersData = await usersRes.json();
      setUsers(usersData);

      const visitsRes = await fetch(`/api/lead-timeline?lead_id=${leadId}`);
      if (visitsRes.ok) {
        const timelineData = await visitsRes.json();
        setLeadVisits(timelineData);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateLead = async (updates: any) => {
    setLead({ ...lead, ...updates });
    await fetch(`/api/leads/${leadId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    
    const res = await fetch(`/api/leads/${leadId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: noteText, author_name: currentUser?.name || 'Usuário' })
    });
    const newNote = await res.json();
    setNotes([newNote, ...notes]);
    setNoteText('');
  };

  const handleStageChange = (stageId: string) => {
    updateLead({ stage_id: stageId });
  };

  const handleWin = () => {
    const isWon = lead.stage_id === funnel?.default_won_stage_id;
    const isLost = lead.stage_id === funnel?.default_lost_stage_id;

    if (funnel?.default_won_stage_id) {
      updateLead({ stage_id: funnel.default_won_stage_id });
      // Add success note
      fetch(`/api/leads/${leadId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '🎉 Negócio marcado como GANHO!', author_name: currentUser?.name || 'Sistema' })
      }).then(() => fetchData());
    } else if (funnel?.stages?.length > 0) {
      const lastStage = funnel.stages[funnel.stages.length - 1];
      updateLead({ stage_id: lastStage.id });
    }
  };

  const handleLoss = () => {
    if (funnel?.default_lost_stage_id) {
      updateLead({ stage_id: funnel.default_lost_stage_id });
    }
    
    fetch(`/api/leads/${leadId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '🔴 Negócio marcado como PERDIDO.', author_name: currentUser?.name || 'Sistema' })
    }).then(() => fetchData());
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: leadId,
          title: newTaskTitle,
          due_date: newTaskDate ? new Date(newTaskDate).toISOString() : null,
          completed: 0
        })
      });
      const data = await res.json();
      setTasks([data, ...tasks]);
      setNewTaskTitle('');
      setNewTaskDate('');
      setIsAddingTask(false);
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const handleToggleTask = async (task: any) => {
    const newStatus = task.completed ? 0 : 1;
    setTasks(tasks.map(t => t.id === task.id ? { ...t, completed: newStatus } : t));
    
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: newStatus })
    });
  };

  const handleDeleteTask = async (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full bg-white"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!lead) {
    return <div className="p-8 text-center text-gray-500">Lead não encontrado.</div>;
  }

  const stages = funnel?.stages || [];
  const currentStageIndex = stages.findIndex((s: any) => s.id === lead.stage_id);

  return (
    <div className="flex flex-col min-h-full bg-white relative">
      {/* Top Header - Sticky */}
      <div className="sticky top-0 z-20 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 leading-none">{lead.title}</h1>
            </div>
            <div className="text-xs text-gray-400 mt-1 font-medium">ID: {lead.id}</div>
            <div className="flex items-center gap-2 mt-3">
              {lead.stage_id === funnel?.default_won_stage_id ? (
                <span className="px-3 py-1 bg-green-500 text-white rounded-full text-[10px] font-bold tracking-wider uppercase flex items-center gap-1 shadow-lg shadow-green-200">
                  <ThumbsUp size={10} />
                  VENDIDO
                </span>
              ) : lead.stage_id === funnel?.default_lost_stage_id ? (
                <span className="px-3 py-1 bg-red-500 text-white rounded-full text-[10px] font-bold tracking-wider uppercase flex items-center gap-1 shadow-lg shadow-red-200">
                  <ThumbsDown size={10} />
                  PERDIDO
                </span>
              ) : (
                <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-[10px] font-bold tracking-wider uppercase">
                  EM NEGOCIAÇÃO
                </span>
              )}
              <span className="px-3 py-1 bg-cyan-400 text-white rounded-full text-[10px] font-bold tracking-wider uppercase">
                {funnel?.name || 'FUNIL'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleLoss} className="flex items-center gap-2 px-6 py-2.5 bg-cyan-100 text-cyan-800 rounded-xl font-bold text-sm hover:bg-cyan-200 transition-colors">
            <ThumbsDown size={18} />
            PERDA
          </button>
          <button onClick={handleWin} className="flex items-center gap-2 px-6 py-2.5 bg-[#003b5c] text-white rounded-xl font-bold text-sm hover:bg-[#002b44] transition-colors">
            <ThumbsUp size={18} />
            GANHO
          </button>
        </div>
      </div>

      {/* Stages Bar - Sticky below Header */}
      <div className="sticky top-[86px] z-10 bg-white flex w-full px-6 py-4 border-b border-gray-100 shrink-0 overflow-x-auto hide-scrollbar">
        {stages.map((stage: any, index: number) => {
          const isFirst = index === 0;
          const isLast = index === stages.length - 1;
          const isActive = index <= currentStageIndex;
          const isCurrent = index === currentStageIndex;
          const isWonStage = stage.id === funnel?.default_won_stage_id;
          const isLostStage = stage.id === funnel?.default_lost_stage_id;
          
          let clipPath = 'polygon(0% 0%, 95% 0%, 100% 50%, 95% 100%, 0% 100%, 5% 50%)';
          if (isFirst) clipPath = 'polygon(0% 0%, 95% 0%, 100% 50%, 95% 100%, 0% 100%)';
          if (isLast) clipPath = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 5% 50%)';

          return (
            <div
              key={stage.id}
              onClick={() => handleStageChange(stage.id)}
              className={`flex-1 min-w-[140px] h-10 flex items-center justify-center text-[11px] font-bold tracking-wider uppercase relative cursor-pointer transition-all ${
                isCurrent 
                  ? (isWonStage ? 'bg-green-500 text-white z-10 shadow-lg' : 'bg-cyan-400 text-white z-10 shadow-lg') : 
                isActive 
                  ? (isWonStage ? 'bg-green-100 text-green-800' : 'bg-cyan-100 text-cyan-800') : 
                'bg-gray-200 text-gray-500 hover:bg-gray-300'
              }`}
              style={{
                clipPath,
                marginLeft: isFirst ? '0' : '-1%',
                zIndex: stages.length - index
              }}
            >
              {stage.name}
            </div>
          );
        })}
      </div>

      {/* Main Content Area - Flows naturally */}
      <div className="flex flex-1">
        {/* Left Sidebar - No independent scroll */}
        <div className="w-80 bg-slate-50 border-r border-gray-200 p-6 shrink-0 flex flex-col gap-8">
          <button className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-sm">
            <Layers size={18} />
            ENCAMINHAR LEAD
          </button>

          {/* Negócio Section */}
          <div>
            <div className="flex items-center gap-2 text-gray-400 mb-3">
              <Briefcase size={16} />
              <h3 className="text-xs font-bold tracking-wider uppercase">NEGÓCIO</h3>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
              <EditableField 
                label="TÍTULO" 
                value={lead.title} 
                onSave={(val: string) => updateLead({ title: val })} 
              />
              <EditableField 
                label="EMPRESA" 
                value={lead.company} 
                onSave={(val: string) => updateLead({ company: val })} 
              />
              <EditableField 
                label="VALOR" 
                value={lead.value} 
                type="number"
                onSave={(val: string) => updateLead({ value: Number(val) })} 
              />
              <EditableField 
                label="VALOR (R$)" 
                value={lead.value} 
                type="number"
                onSave={(val: string) => updateLead({ value: Number(val) })} 
              />
              <EditableSelectField
                label="RESPONSÁVEL"
                value={lead.assigned_user_id}
                options={users}
                onSave={(val: string) => updateLead({ assigned_user_id: val })}
              />
              <EditableField 
                label="PROBABILIDADE (%)" 
                value={lead.probability || 0} 
                type="number"
                onSave={(val: string) => updateLead({ probability: Number(val) })} 
              />
              <EditableField 
                label="PREVISÃO DE FECHAMENTO" 
                value={lead.closing_forecast_at || ''} 
                type="date"
                onSave={(val: string) => updateLead({ closing_forecast_at: val })} 
              />
              <div className="pt-2 border-t border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">CRIADO EM</p>
                <p className="text-sm font-bold text-gray-600">{new Date(lead.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          </div>

          {/* Contato Section */}
          <div>
            <div className="flex items-center gap-2 text-gray-400 mb-3">
              <Phone size={16} />
              <h3 className="text-xs font-bold tracking-wider uppercase">CONTATO</h3>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
              <EditableField 
                label="NOME" 
                value={lead.contact_name} 
                onSave={(val: string) => updateLead({ contact_name: val })} 
              />
              <EditableField 
                label="E-MAIL" 
                value={lead.contact_email} 
                onSave={(val: string) => updateLead({ contact_email: val })} 
              />
              <EditableField 
                label="TELEFONE" 
                value={lead.contact_phone} 
                onSave={(val: string) => updateLead({ contact_phone: val })} 
              />
            </div>
          </div>
        </div>

        {/* Right Content - No independent scroll */}
        <div className="flex-1 p-8 bg-white">
          <div className="max-w-4xl mx-auto">
            {/* Tabs */}
            <div className="flex items-center gap-8 border-b border-gray-100 mb-8">
              <button 
                onClick={() => setActiveTab('notes')}
                className={`pb-4 px-2 text-sm font-bold tracking-wider uppercase transition-all relative ${
                  activeTab === 'notes' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare size={18} />
                  ANOTAÇÕES {notes.length > 0 && <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded-full text-slate-500">{notes.length}</span>}
                </div>
                {activeTab === 'notes' && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full"></div>}
              </button>
              
              <button 
                onClick={() => setActiveTab('tasks')}
                className={`pb-4 px-2 text-sm font-bold tracking-wider uppercase transition-all relative ${
                  activeTab === 'tasks' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} />
                  TAREFAS {tasks.filter(t => !t.completed).length > 0 && (
                    <span className="text-[10px] bg-indigo-100 px-1.5 py-0.5 rounded-full text-indigo-600">
                      {tasks.filter(t => !t.completed).length}
                    </span>
                  )}
                </div>
                {activeTab === 'tasks' && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full"></div>}
              </button>

              <button
                onClick={() => setActiveTab('visits')}
                className={`pb-4 px-2 text-sm font-bold tracking-wider uppercase transition-all relative ${
                  activeTab === 'visits' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Layers size={18} />
                  VISITAS {leadVisits.length > 0 && (
                    <span className="text-[10px] bg-purple-100 px-1.5 py-0.5 rounded-full text-purple-600">{leadVisits.length}</span>
                  )}
                </div>
                {activeTab === 'visits' && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full"></div>}
              </button>
            </div>

            {activeTab === 'notes' ? (
              <>
                <div className="flex items-center gap-2 text-gray-900 mb-6">
                  <MessageSquare size={20} className="text-indigo-600" />
                  <h2 className="text-lg font-bold uppercase tracking-wide">ANOTAÇÕES DO LEAD</h2>
                </div>

                {/* Note Input */}
                <div className="bg-white border border-gray-200 rounded-3xl p-4 shadow-sm mb-10 relative">
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Descreva o andamento da negociação..."
                    className="w-full h-24 resize-none border-none focus:ring-0 p-2 text-slate-700 placeholder-slate-400 outline-none bg-white font-medium shadow-inner rounded-xl"
                  />
                  <div className="absolute bottom-4 right-4">
                    <button 
                      onClick={handleAddNote}
                      disabled={!noteText.trim()}
                      className="w-10 h-10 bg-indigo-200 text-indigo-600 rounded-full flex items-center justify-center hover:bg-indigo-300 transition-colors disabled:opacity-50"
                    >
                      <Send size={18} className="ml-1" />
                    </button>
                  </div>
                </div>

                {/* Notes List */}
                <div className="space-y-8 pl-2">
                  {notes.length === 0 ? (
                    <div className="text-gray-400 text-sm italic">Nenhuma anotação ainda.</div>
                  ) : (
                    notes.map((note) => (
                      <div key={note.id} className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0 text-sm">
                          {note.author_name ? note.author_name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="flex-1 pt-1">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-gray-900 tracking-wider uppercase">{note.author_name}</span>
                            <span className="text-[11px] font-medium text-gray-400">
                              {new Date(note.created_at).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <p className="text-gray-800 text-sm whitespace-pre-wrap">{note.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : activeTab === 'tasks' ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-900">
                    <CheckCircle2 size={20} className="text-indigo-600" />
                    <h2 className="text-lg font-bold uppercase tracking-wide">PRÓXIMAS TAREFAS</h2>
                  </div>
                  <button
                    onClick={() => setIsAddingTask(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-colors"
                  >
                    <Plus size={18} />
                    ADICIONAR TAREFA
                  </button>
                </div>

                {/* Task Quick Input Modal/Inline */}
                {isAddingTask && (
                  <div className="bg-slate-50 border border-indigo-100 rounded-2xl p-6 mb-8 animate-in zoom-in-95 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">O que precisa ser feito?</label>
                        <input
                          type="text"
                          value={newTaskTitle}
                          onChange={e => setNewTaskTitle(e.target.value)}
                          placeholder="Ex: Ligar para cliente..."
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                          autoFocus
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Quando?</label>
                        <input
                          type="datetime-local"
                          value={newTaskDate}
                          onChange={e => setNewTaskDate(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setIsAddingTask(false)}
                        className="px-4 py-2 text-slate-400 hover:text-slate-600 font-bold text-xs uppercase tracking-widest"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleAddTask}
                        disabled={!newTaskTitle.trim()}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 transition-all"
                      >
                        Salvar Tarefa
                      </button>
                    </div>
                  </div>
                )}

                {/* Tasks List */}
                <div className="space-y-3">
                  {tasks.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-3xl">
                      <CheckCircle2 size={40} className="mx-auto text-slate-200 mb-3" />
                      <p className="text-slate-400 text-sm italic font-medium">Nenhuma tarefa pendente para este lead.</p>
                      <button onClick={() => setIsAddingTask(true)} className="mt-4 text-indigo-600 font-bold text-sm hover:underline">
                        Clique para criar a primeira
                      </button>
                    </div>
                  ) : (
                    tasks.map(task => (
                      <div
                        key={task.id}
                        className={`group flex items-center justify-between p-4 rounded-2xl border transition-all ${
                          task.completed
                            ? 'bg-slate-50 border-slate-100 opacity-60'
                            : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-lg shadow-slate-200/40'
                        }`}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <button
                            onClick={() => handleToggleTask(task)}
                            className={`p-1 rounded-lg transition-colors ${
                              task.completed ? 'text-green-500' : 'text-slate-300 hover:text-indigo-500'
                            }`}
                          >
                            {task.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                          </button>

                          <div className="min-w-0 flex-1">
                            <h4 className={`font-bold text-sm truncate ${task.completed ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                              {task.title}
                            </h4>
                            {task.due_date && (
                              <div className={`flex items-center gap-2 mt-1 text-[11px] font-bold uppercase tracking-wider ${
                                task.completed ? 'text-slate-300' : 'text-slate-400 text-indigo-500'
                              }`}>
                                <Calendar size={12} />
                                {format(new Date(task.due_date), "dd MMM HH:mm", { locale: ptBR })}
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-2 text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-xl hover:bg-red-50"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : activeTab === 'visits' ? (
              <>
                <div className="flex items-center gap-2 text-gray-900 mb-6">
                  <Layers size={20} className="text-purple-600" />
                  <h2 className="text-lg font-bold uppercase tracking-wide">HISTÓRICO DE VISITAS</h2>
                </div>

                <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
                  {leadVisits.length === 0 ? (
                    <div className="text-center py-16 bg-slate-50 border border-dashed border-slate-200 rounded-3xl">
                      <Layers size={40} className="mx-auto text-slate-200 mb-3" />
                      <p className="text-slate-400 text-sm italic font-medium">Nenhuma visita registrada.</p>
                      <p className="text-slate-300 text-xs mt-2">As páginas visitadas pelo lead aparecerão aqui.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {leadVisits.map((visit, i) => {
                        const isForm = visit.event_type === 'form';
                        const isConversion = visit.event_type === 'conversion';
                        const eventData = visit.event_data || {};
                        const fields = eventData.fields || (eventData.form_data?.fields) || {};
                        const fieldEntries = Object.entries(fields);

                        return (
                          <div key={visit.id} className="px-5 py-4 hover:bg-slate-50/80 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3">
                                  <div className={`w-2 h-2 rounded-full shrink-0 ${isForm ? 'bg-green-500' : isConversion ? 'bg-amber-500' : 'bg-purple-400'}`} />
                                  <div className="flex flex-col">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                      {isForm ? 'Formulário Preenchido' : isConversion ? 'Conversão' : 'Página Visitada'}
                                    </p>
                                    <p className="text-sm font-semibold text-slate-800 truncate">{visit.url}</p>
                                  </div>
                                </div>
                                
                                {isForm && fieldEntries.length > 0 && (
                                  <div className="mt-3 ml-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {fieldEntries.map(([key, val]: [string, any]) => (
                                      <div key={key} className="bg-slate-50 border border-slate-100 rounded-lg p-2">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase truncate">{key}</p>
                                        <p className="text-xs font-bold text-slate-700 break-words">{String(val)}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {visit.referrer && !isForm && (
                                  <p className="text-xs text-slate-400 mt-1 ml-5 truncate">Ref: {visit.referrer}</p>
                                )}
                              </div>
                              <div className="text-right shrink-0 ml-4">
                                <p className="text-xs font-bold text-slate-600">
                                  {new Date(visit.created_at || visit.visited_at).toLocaleDateString('pt-BR')}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {new Date(visit.created_at || visit.visited_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
