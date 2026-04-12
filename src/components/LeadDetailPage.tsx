import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, ThumbsDown, ThumbsUp, Briefcase, Phone, MessageSquare, Send, Layers,
  Edit2, Check, X, Calendar, Trash2, Clock, CheckCircle2, Circle, Plus, Activity
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const EditableField = ({ label, value, onSave, type = "text" }: { label: string; value: any; onSave: (v: string) => void; type?: string }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const handleSave = () => { onSave(editValue); setIsEditing(false); };
  const handleCancel = () => { setEditValue(value || ''); setIsEditing(false); };
  return (
    <div className="group relative">
      <div className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-1">{label}</div>
      {isEditing ? (
        <div className="flex items-center gap-2">
          <input type={type} value={editValue} onChange={(e) => setEditValue(e.target.value)}
            className="w-full text-sm font-bold text-slate-900 border-b border-indigo-500 focus:outline-none bg-white px-1"
            autoFocus onKeyDown={(e) => e.key === 'Enter' && handleSave()} />
          <button onClick={handleSave} className="text-green-600 hover:text-green-700"><Check size={16} /></button>
          <button onClick={handleCancel} className="text-red-500 hover:text-red-600"><X size={16} /></button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold text-gray-900 truncate pr-4">
            {type === 'number' && value ? `R$ ${Number(value).toLocaleString('pt-BR')}` : (value || '---')}
          </div>
          <button onClick={() => setIsEditing(true)}
            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-indigo-600 transition-opacity">
            <Edit2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

const StageBadge = ({ stage, onClick }: any) => (
  <button onClick={onClick}
    className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
      stage ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'
    }`}>
    {stage || 'Não definido'}
  </button>
);

export const LeadDetailPage = ({ leadId, onBack, onNavigate }: any) => {
  const { currentUser } = useCRM();
  const [lead, setLead] = useState<any>(null);
  const [funnel, setFunnel] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [leadVisits, setLeadVisits] = useState<any[]>([]);
  const [leadTimeline, setLeadTimeline] = useState<any[]>([]);
  const [noteText, setNoteText] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [activeTab, setActiveTab] = useState<'notes' | 'tasks' | 'visits' | 'timeline'>('notes');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingTask, setIsAddingTask] = useState(false);

  useEffect(() => { fetchData(); }, [leadId]);

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
      setNotes(await notesRes.json());
      const tasksRes = await fetch(`/api/leads/${leadId}/tasks`);
      setTasks(await tasksRes.json());
      setUsers(await (await fetch('/api/users')).json());
      const visitsRes = await fetch(`/api/lead-visits?lead_id=${leadId}`);
      if (visitsRes.ok) setLeadVisits(await visitsRes.json());
      const timelineRes = await fetch(`/api/lead-timeline?lead_id=${leadId}`);
      if (timelineRes.ok) setLeadTimeline(await timelineRes.json());
    } catch (error) { console.error(error); }
    finally { setIsLoading(false); }
  };

  const updateLead = async (updates: any) => {
    setLead({ ...lead, ...updates });
    await fetch(`/api/leads/${leadId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
  };

  const handleAddNote = async () => {
    if (!noteText.trim() || !lead) return;
    await fetch(`/api/leads/${leadId}/notes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: noteText, author_name: currentUser?.name || 'Usuário' }) });
    setNoteText('');
    fetchData();
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !lead) return;
    await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_id: leadId, title: newTaskTitle, due_date: newTaskDate || null, account_id: currentUser?.account_id || 'acc_demo' }) });
    setNewTaskTitle(''); setNewTaskDate(''); setIsAddingTask(false);
    fetchData();
  };

  const handleToggleTask = async (task: any) => {
    await fetch(`/api/tasks/${task.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ completed: !task.completed }) });
    fetchData();
  };

  const handleDeleteTask = async (taskId: string) => {
    await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    fetchData();
  };

  const handleStageChange = async (stageId: string) => {
    await updateLead({ stage_id: stageId });
    fetchData();
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full bg-slate-50/50"><div className="flex flex-col items-center gap-4"><div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div><p className="text-slate-400 font-bold text-sm animate-pulse tracking-widest uppercase">Carregando...</p></div></div>;
  }

  return (
    <div className="h-full flex flex-col bg-slate-50/50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-6 shrink-0">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <button onClick={() => onNavigate('kanban')} className="text-gray-400 hover:text-gray-600 transition-colors"><ArrowLeft size={20} /></button>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">{lead?.title}</h1>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <EditableField label="Empresa" value={lead?.company} onSave={(v) => updateLead({ company: v })} />
            <EditableField label="Valor" value={lead?.value} onSave={(v) => updateLead({ value: parseFloat(v) || 0 })} type="number" />
            <EditableField label="Nome do Contato" value={lead?.contact_name} onSave={(v) => updateLead({ contact_name: v })} />
            <EditableField label="Email" value={lead?.contact_email} onSave={(v) => updateLead({ contact_email: v })} />
            <EditableField label="Telefone" value={lead?.contact_phone} onSave={(v) => updateLead({ contact_phone: v })} />
            <div><div className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-1">Estágio</div>
              <div className="flex flex-wrap gap-2">
                {funnel?.stages?.map((s: any) => (
                  <button key={s.id} onClick={() => handleStageChange(s.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${lead?.stage_id === s.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-600'}`}>
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Content */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto">
          {/* Tabs */}
          <div className="flex items-center gap-8 border-b border-gray-100 mb-8">
            <button onClick={() => setActiveTab('notes')}
              className={`pb-4 px-2 text-sm font-bold tracking-wider uppercase transition-all relative ${activeTab === 'notes' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>
              <div className="flex items-center gap-2"><MessageSquare size={18} />ANOTAÇÕES {notes.length > 0 && <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded-full text-slate-500">{notes.length}</span>}</div>
              {activeTab === 'notes' && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full"></div>}
            </button>
            <button onClick={() => setActiveTab('tasks')}
              className={`pb-4 px-2 text-sm font-bold tracking-wider uppercase transition-all relative ${activeTab === 'tasks' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>
              <div className="flex items-center gap-2"><CheckCircle2 size={18} />TAREFAS {tasks.filter(t => !t.completed).length > 0 && (<span className="text-[10px] bg-indigo-100 px-1.5 py-0.5 rounded-full text-indigo-600">{tasks.filter(t => !t.completed).length}</span>)}</div>
              {activeTab === 'tasks' && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full"></div>}
            </button>
            <button onClick={() => setActiveTab('visits')}
              className={`pb-4 px-2 text-sm font-bold tracking-wider uppercase transition-all relative ${activeTab === 'visits' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>
              <div className="flex items-center gap-2"><Layers size={18} />VISITAS {leadVisits.length > 0 && (<span className="text-[10px] bg-purple-100 px-1.5 py-0.5 rounded-full text-purple-600">{leadVisits.length}</span>)}</div>
              {activeTab === 'visits' && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full"></div>}
            </button>
            <button onClick={() => setActiveTab('timeline')}
              className={`pb-4 px-2 text-sm font-bold tracking-wider uppercase transition-all relative ${activeTab === 'timeline' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>
              <div className="flex items-center gap-2"><Activity size={18} />JORNADA {leadTimeline.length > 0 && (<span className="text-[10px] bg-amber-100 px-1.5 py-0.5 rounded-full text-amber-600">{leadTimeline.length}</span>)}</div>
              {activeTab === 'timeline' && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full"></div>}
            </button>
          </div>

          {activeTab === 'notes' ? (
            <>
              <div className="flex items-center gap-2 text-gray-900 mb-6"><MessageSquare size={20} className="text-indigo-600" /><h2 className="text-lg font-bold uppercase tracking-wide">ANOTAÇÕES DO LEAD</h2></div>
              <div className="bg-white border border-gray-200 rounded-3xl p-4 shadow-sm mb-10 relative">
                <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Descreva o andamento da negociação..."
                  className="w-full h-24 resize-none border-none focus:ring-0 p-2 text-slate-700 placeholder-slate-400 outline-none bg-white font-medium shadow-inner rounded-xl" />
                <div className="absolute bottom-4 right-4">
                  <button onClick={handleAddNote} disabled={!noteText.trim()}
                    className="w-10 h-10 bg-indigo-200 text-indigo-600 rounded-full flex items-center justify-center hover:bg-indigo-300 transition-colors disabled:opacity-50">
                    <Send size={18} className="ml-1" />
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                {notes.length === 0 ? (
                  <div className="text-center py-16 bg-slate-50 border border-dashed border-slate-200 rounded-3xl"><MessageSquare size={40} className="mx-auto text-slate-200 mb-3" /><p className="text-slate-400 text-sm italic font-medium">Nenhuma anotação para este lead.</p></div>
                ) : (
                  notes.map(note => (
                    <div key={note.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xs">{note.author_name.charAt(0)}</div>
                        <div className="flex-1 pt-1">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-gray-900 tracking-wider uppercase">{note.author_name}</span>
                            <span className="text-[11px] font-medium text-gray-400">{new Date(note.created_at).toLocaleString('pt-BR')}</span>
                          </div>
                          <p className="text-gray-800 text-sm whitespace-pre-wrap">{note.content}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : activeTab === 'tasks' ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-gray-900"><CheckCircle2 size={20} className="text-indigo-600" /><h2 className="text-lg font-bold uppercase tracking-wide">PRÓXIMAS TAREFAS</h2></div>
                <button onClick={() => setIsAddingTask(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-colors"><Plus size={18} />ADICIONAR TAREFA</button>
              </div>
              {isAddingTask && (
                <div className="bg-slate-50 border border-indigo-100 rounded-2xl p-6 mb-8 animate-in zoom-in-95 duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">O que precisa ser feito?</label>
                      <input type="text" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="Ex: Ligar para cliente..."
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none" autoFocus />
                    </div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Quando?</label>
                      <input type="datetime-local" value={newTaskDate} onChange={e => setNewTaskDate(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button onClick={() => setIsAddingTask(false)} className="px-4 py-2 text-slate-400 hover:text-slate-600 font-bold text-xs uppercase tracking-widest">Cancelar</button>
                    <button onClick={handleAddTask} disabled={!newTaskTitle.trim()}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 transition-all">Salvar Tarefa</button>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {tasks.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-3xl"><CheckCircle2 size={40} className="mx-auto text-slate-200 mb-3" /><p className="text-slate-400 text-sm italic font-medium">Nenhuma tarefa pendente para este lead.</p><button onClick={() => setIsAddingTask(true)} className="mt-4 text-indigo-600 font-bold text-sm hover:underline">Clique para criar a primeira</button></div>
                ) : (
                  tasks.map(task => (
                    <div key={task.id} className={`group flex items-center justify-between p-4 rounded-2xl border transition-all ${task.completed ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-lg shadow-slate-200/40'}`}>
                      <div className="flex items-center gap-4 flex-1">
                        <button onClick={() => handleToggleTask(task)} className={`p-1 rounded-lg transition-colors ${task.completed ? 'text-green-500' : 'text-slate-300 hover:text-indigo-500'}`}>
                          {task.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <h4 className={`font-bold text-sm truncate ${task.completed ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{task.title}</h4>
                          {task.due_date && (<div className={`flex items-center gap-2 mt-1 text-[11px] font-bold uppercase tracking-wider ${task.completed ? 'text-slate-300' : 'text-slate-400 text-indigo-500'}`}><Calendar size={12} />{format(new Date(task.due_date), "dd MMM HH:mm", { locale: ptBR })}</div>)}
                        </div>
                      </div>
                      <button onClick={() => handleDeleteTask(task.id)} className="p-2 text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-xl hover:bg-red-50"><Trash2 size={18} /></button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : activeTab === 'visits' ? (
            <>
              <div className="flex items-center gap-2 text-gray-900 mb-6"><Layers size={20} className="text-purple-600" /><h2 className="text-lg font-bold uppercase tracking-wide">HISTÓRICO DE VISITAS</h2></div>
              <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
                {leadVisits.length === 0 ? (
                  <div className="text-center py-16 bg-slate-50 border border-dashed border-slate-200 rounded-3xl"><Layers size={40} className="mx-auto text-slate-200 mb-3" /><p className="text-slate-400 text-sm italic font-medium">Nenhuma visita registrada.</p><p className="text-slate-300 text-xs mt-2">As páginas visitadas pelo lead aparecerão aqui.</p></div>
                ) : (
                  <div className="divide-y divide-slate-100">{leadVisits.map((visit) => (
                    <div key={visit.id} className="px-5 py-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                      <div className="flex-1 min-w-0"><div className="flex items-center gap-3"><div className="w-2 h-2 bg-purple-400 rounded-full shrink-0" /><p className="text-sm font-semibold text-slate-800 truncate">{visit.url}</p></div>
                        {visit.referrer && (<p className="text-xs text-slate-400 mt-1 ml-5 truncate">Ref: {visit.referrer}</p>)}</div>
                      <div className="text-right shrink-0 ml-4"><p className="text-xs font-bold text-slate-600">{new Date(visit.visited_at).toLocaleDateString('pt-BR')}</p><p className="text-[10px] text-slate-400">{new Date(visit.visited_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p></div>
                    </div>
                  ))}</div>
                )}
              </div>
            </>
          ) : activeTab === 'timeline' ? (
            <>
              <div className="flex items-center gap-2 text-gray-900 mb-6"><Activity size={20} className="text-amber-600" /><h2 className="text-lg font-bold uppercase tracking-wide">JORNADA DO LEAD</h2></div>
              {leadTimeline.length === 0 ? (
                <div className="text-center py-16 bg-slate-50 border border-dashed border-slate-200 rounded-3xl"><Activity size={40} className="mx-auto text-slate-200 mb-3" /><p className="text-slate-400 text-sm italic font-medium">Nenhuma interação registrada.</p><p className="text-slate-300 text-xs mt-2">Pageviews, cliques e conversas aparecerão aqui.</p></div>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />
                  <div className="space-y-4">
                    {leadTimeline.map((event) => {
                      const isForm = event.event_type === 'form';
                      const colors: any = { pageview: { dot: 'bg-blue-400', bg: 'bg-blue-50', border: 'border-blue-100' }, form: { dot: 'bg-green-400', bg: 'bg-green-50', border: 'border-green-100' }, click: { dot: 'bg-purple-400', bg: 'bg-purple-50', border: 'border-purple-100' }, conversion: { dot: 'bg-amber-400', bg: 'bg-amber-50', border: 'border-amber-100' } };
                      const c = colors[event.event_type] || colors.pageview;
                      const labels: any = { pageview: 'Visitou página', form: 'Preencheu formulário', click: 'Clicou em elemento', conversion: 'Converteu' };
                      return (
                        <div key={event.id} className="relative flex gap-4">
                          <div className="relative z-10 w-8 h-8 flex-shrink-0"><div className={`w-3 h-3 ${c.dot} rounded-full mt-2.5 ml-2.5 ring-4 ring-white`} /></div>
                          <div className={`flex-1 ${c.bg} border ${c.border} rounded-xl p-4`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1"><span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{labels[event.event_type] || event.event_type}</span></div>
                                {event.url && (<p className="text-sm font-semibold text-slate-800 truncate">{event.url}</p>)}
                                {event.event_data?.el_label && (<p className="text-sm text-slate-600 mt-1">Elemento: <span className="font-medium">&quot;{event.event_data.el_label}&quot;</span></p>)}
                                {event.event_data?.form_data?.fid && (<p className="text-sm text-slate-600 mt-1">Formulário: <span className="font-medium">&quot;{event.event_data.form_data.fid}&quot;</span></p>)}
                                {isForm && event.event_data?.form_data?.fields && (<div className="mt-2 flex flex-wrap gap-1.5">{Object.entries(event.event_data.form_data.fields).filter(([k, v]: [string, any]) => String(v).includes('@')).map(([k, v]: [string, any]) => (<span key={k} className="text-xs bg-white px-2 py-0.5 rounded border border-slate-200">{String(v)}</span>))}</div>)}
                              </div>
                              <div className="text-right shrink-0 ml-4"><p className="text-xs font-bold text-slate-600">{new Date(event.created_at).toLocaleDateString('pt-BR')}</p><p className="text-[10px] text-slate-400">{new Date(event.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
