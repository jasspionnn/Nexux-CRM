import React, { useState, useEffect, useRef } from 'react';
import { CheckSquare, Plus, Search, Calendar, Briefcase, Loader2, Check, X, Phone, Mail, User, Clock, RotateCcw, CheckCircle2 } from 'lucide-react';
import { format, isToday, isTomorrow, isThisWeek, isPast, parseISO, addDays, addHours, startOfDay, addWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCRM } from '../context/CRMContext';

interface Task {
  id: string;
  lead_id: string;
  title: string;
  due_date: string;
  completed: number;
  type: string;
  lead_title?: string;
}

export const TasksView = ({ onNavigate }: { onNavigate: (view: string, data?: any) => void }) => {
  const { currentUser } = useCRM();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('TUDO');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', due_date: '', lead_id: '' });
  const [leads, setLeads] = useState<any[]>([]);
  // Reschedule state
  const [reschedulingTask, setReschedulingTask] = useState<Task | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');

  const [leadSearch, setLeadSearch] = useState('');
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const leadSearchRef = useRef<HTMLDivElement>(null);
  const leadInputRef = useRef<HTMLInputElement>(null);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    fetchTasks();
    fetchLeads();
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (leadSearchRef.current && !leadSearchRef.current.contains(e.target as Node)) {
        setShowLeadDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchTasks = async () => {
    try {
      const aid = currentUser?.account_id || '';
      const res = await fetch(`/api/tasks?account_id=${aid}`);
      const data = await res.json();
      setTasks(data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLeads = async () => {
    try {
      const aid = currentUser?.account_id || '';
      const res = await fetch(`/api/leads?account_id=${aid}`);
      const data = await res.json();
      setLeads(data);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    }
  };

  const toggleTask = async (task: Task) => {
    const newCompletedStatus = task.completed ? 0 : 1;
    
    // Optimistic update
    setTasks(tasks.map(t => t.id === task.id ? { ...t, completed: newCompletedStatus } : t));
    
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: newCompletedStatus })
      });
    } catch (error) {
      console.error('Failed to toggle task:', error);
      // Revert on error
      setTasks(tasks.map(t => t.id === task.id ? { ...t, completed: task.completed } : t));
    }
  };

  const openReschedule = (task: Task) => {
    // Pre-fill with current due_date or now + 1h
    const current = task.due_date
      ? format(parseISO(task.due_date), "yyyy-MM-dd'T'HH:mm")
      : format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:mm");
    setRescheduleDate(current);
    setReschedulingTask(task);
  };

  const handleReschedule = async (dateStr: string) => {
    if (!reschedulingTask) return;
    const isoDate = new Date(dateStr).toISOString();
    setTasks(prev => prev.map(t => t.id === reschedulingTask.id ? { ...t, due_date: isoDate, completed: 0 } : t));
    setReschedulingTask(null);
    await fetch(`/api/tasks/${reschedulingTask.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ due_date: isoDate, completed: 0 }),
    });
  };

  const quickRescheduleOptions = () => {
    const now = new Date();
    return [
      { label: 'Hoje — tarde', icon: '☀️', date: format(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0), "yyyy-MM-dd'T'HH:mm") },
      { label: 'Amanhã — manhã', icon: '🌅', date: format(new Date(addDays(startOfDay(now), 1).getTime() + 9 * 3600000), "yyyy-MM-dd'T'HH:mm") },
      { label: 'Próxima semana', icon: '📅', date: format(new Date(addWeeks(startOfDay(now), 1).getTime() + 9 * 3600000), "yyyy-MM-dd'T'HH:mm") },
      { label: 'Em 1 hora', icon: '⏰', date: format(addHours(now, 1), "yyyy-MM-dd'T'HH:mm") },
    ];
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title) return;

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTask,
          due_date: newTask.due_date ? new Date(newTask.due_date).toISOString() : null,
          completed: 0
        })
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        setNewTask({ title: '', due_date: '', lead_id: '' });
        setSelectedLead(null);
        setLeadSearch('');
        fetchTasks();
      }
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const filteredTasks = tasks.filter(task => {
    // Search filter
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Category filter
    if (filter === 'TUDO') return true;
    if (filter === 'CONCLUÍDAS') return task.completed === 1;
    
    if (task.completed === 1) return false;

    if (!task.due_date) return false;
    const date = parseISO(task.due_date);

    if (filter === 'HOJE') return isToday(date);
    if (filter === 'AMANHÃ') return isTomorrow(date);
    if (filter === 'SEMANA') return isThisWeek(date);
    if (filter === 'ATRASADAS') return isPast(date) && !isToday(date);

    return true;
  });

  const filters = ['TUDO', 'HOJE', 'AMANHÃ', 'SEMANA', 'ATRASADAS', 'CONCLUÍDAS'];

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <CheckSquare className="text-blue-600" size={28} />
            <h1 className="text-2xl font-bold text-slate-900">Minhas Tarefas</h1>
          </div>
          <p className="text-slate-500 text-sm">Acompanhe seus compromissos e não perca prazos.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Nova Tarefa
        </button>
      </div>

      {/* Filters & Search */}
      <div className="px-8 py-4 flex justify-between items-center border-b border-gray-200 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex bg-slate-100 p-1 rounded-lg">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
                filter === f 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 bg-slate-100 border-transparent rounded-lg text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all w-64"
          />
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto space-y-4">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              Nenhuma tarefa encontrada.
            </div>
          ) : (
            filteredTasks.map(task => {
              const isOverdue = task.due_date && !task.completed && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date));
              const isToday_ = task.due_date && isToday(parseISO(task.due_date));
              return (
                <div
                  key={task.id}
                  className={`bg-white border rounded-xl transition-all hover:shadow-md ${
                    task.completed ? 'border-slate-100 opacity-60' : isOverdue ? 'border-red-200' : 'border-gray-200'
                  }`}
                >
                  {/* Main row */}
                  <div className="p-4 flex items-center gap-4">
                    {/* Status indicator */}
                    <div className={`w-3 h-3 rounded-full shrink-0 ${
                      task.completed ? 'bg-green-400' : isOverdue ? 'bg-red-400' : isToday_ ? 'bg-amber-400' : 'bg-slate-300'
                    }`} />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-semibold text-base leading-snug ${task.completed ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                        {task.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {task.due_date && (
                          <span className={`flex items-center gap-1 text-xs font-medium ${
                            task.completed ? 'text-slate-400' : isOverdue ? 'text-red-500' : isToday_ ? 'text-amber-600' : 'text-slate-500'
                          }`}>
                            <Calendar size={11} />
                            {format(parseISO(task.due_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            {isOverdue && <span className="ml-1 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">ATRASADA</span>}
                            {isToday_ && !task.completed && <span className="ml-1 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">HOJE</span>}
                          </span>
                        )}
                        {task.lead_title && (
                          <button
                            onClick={() => onNavigate('lead-detail', task.lead_id)}
                            className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-md transition-colors"
                          >
                            <Briefcase size={10} />
                            <span className="truncate max-w-[120px]">{task.lead_title}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="px-4 pb-3 flex items-center gap-2 border-t border-slate-50 pt-3">
                    {task.completed ? (
                      /* Reopen button */
                      <button
                        onClick={() => toggleTask(task)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-500 rounded-lg text-xs font-semibold transition-all"
                      >
                        <RotateCcw size={13} />Reabrir tarefa
                      </button>
                    ) : (
                      <>
                        {/* Reschedule */}
                        <button
                          onClick={() => openReschedule(task)}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 text-slate-600 rounded-lg text-xs font-semibold transition-all"
                        >
                          <Clock size={13} />Reagendar
                        </button>
                        {/* Complete */}
                        <button
                          onClick={() => toggleTask(task)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                        >
                          <CheckCircle2 size={13} />Concluir
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Reschedule Modal */}
      {reschedulingTask && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Clock size={16} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Reagendar tarefa</h2>
                  <p className="text-xs text-slate-400 truncate max-w-[220px]">{reschedulingTask.title}</p>
                </div>
              </div>
              <button onClick={() => setReschedulingTask(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>

            <div className="px-5 py-4 space-y-3">
              {/* Quick options */}
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Opções rápidas</p>
              <div className="grid grid-cols-2 gap-2">
                {quickRescheduleOptions().map(opt => (
                  <button
                    key={opt.label}
                    onClick={() => handleReschedule(opt.date)}
                    className="flex items-center gap-2 px-3 py-2.5 border border-slate-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl text-xs font-semibold text-slate-700 hover:text-blue-700 transition-all text-left"
                  >
                    <span className="text-base leading-none">{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>

              {/* Custom date */}
              <div className="pt-1">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Escolher data e hora</p>
                <input
                  type="datetime-local"
                  value={rescheduleDate}
                  onChange={e => setRescheduleDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
              <button onClick={() => setReschedulingTask(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl text-sm font-medium transition-colors">
                Cancelar
              </button>
              <button
                onClick={() => handleReschedule(rescheduleDate)}
                disabled={!rescheduleDate}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors"
              >
                <Clock size={14} />Reagendar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-slate-800">Nova Tarefa</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Título da Tarefa</label>
                <input 
                  type="text" 
                  required
                  value={newTask.title}
                  onChange={e => setNewTask({...newTask, title: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Ex: Ligar para o cliente"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data e Hora</label>
                <input 
                  type="datetime-local" 
                  value={newTask.due_date}
                  onChange={e => setNewTask({...newTask, due_date: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cliente Relacionado (Opcional)</label>
                <div className="relative" ref={leadSearchRef}>
                  {selectedLead ? (
                    /* Selected state */
                    <div className="flex items-center gap-3 px-3 py-2.5 border border-blue-400 bg-blue-50 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                        <User size={14} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{selectedLead.title}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          {selectedLead.contact_phone && (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Phone size={10} />{selectedLead.contact_phone}
                            </span>
                          )}
                          {selectedLead.contact_email && (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Mail size={10} />{selectedLead.contact_email}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setSelectedLead(null); setNewTask({ ...newTask, lead_id: '' }); setLeadSearch(''); }}
                        className="text-slate-400 hover:text-slate-600 shrink-0"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    /* Search input */
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        ref={leadInputRef}
                        type="text"
                        value={leadSearch}
                        onChange={e => { setLeadSearch(e.target.value); setShowLeadDropdown(true); }}
                        onFocus={() => {
                          setShowLeadDropdown(true);
                          if (leadInputRef.current) {
                            const r = leadInputRef.current.getBoundingClientRect();
                            setDropdownRect({ top: r.bottom + 4, left: r.left, width: r.width });
                          }
                        }}
                        placeholder="Buscar cliente pelo nome..."
                        className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                  )}

                  {/* Dropdown — rendered via fixed positioning to break out of modal overflow */}
                  {showLeadDropdown && !selectedLead && dropdownRect && (
                    <div
                      style={{ position: 'fixed', top: dropdownRect.top, left: dropdownRect.left, width: dropdownRect.width, zIndex: 9999 }}
                      className="bg-white border border-slate-200 rounded-xl shadow-2xl overflow-y-auto max-h-72">
                      {(() => {
                        const filtered = leads.filter(l =>
                          !leadSearch || l.title?.toLowerCase().includes(leadSearch.toLowerCase())
                        );
                        if (filtered.length === 0) {
                          return (
                            <div className="px-4 py-6 text-center">
                              <p className="text-sm text-slate-400">Nenhum cliente encontrado</p>
                            </div>
                          );
                        }
                        return filtered.map(lead => (
                          <button
                            key={lead.id}
                            type="button"
                            onClick={() => {
                              setSelectedLead(lead);
                              setNewTask({ ...newTask, lead_id: lead.id });
                              setShowLeadDropdown(false);
                              setLeadSearch('');
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-100 last:border-0"
                          >
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 text-white font-bold text-sm">
                              {(lead.title || '?').charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">{lead.title}</p>
                              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                {lead.contact_phone && (
                                  <span className="flex items-center gap-1 text-xs text-slate-400">
                                    <Phone size={10} />{lead.contact_phone}
                                  </span>
                                )}
                                {lead.contact_email && (
                                  <span className="flex items-center gap-1 text-xs text-slate-400">
                                    <Mail size={10} />{lead.contact_email}
                                  </span>
                                )}
                                {!lead.contact_phone && !lead.contact_email && (
                                  <span className="text-xs text-slate-300">Sem contato cadastrado</span>
                                )}
                              </div>
                            </div>
                          </button>
                        ));
                      })()}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setSelectedLead(null); setLeadSearch(''); }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Salvar Tarefa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
