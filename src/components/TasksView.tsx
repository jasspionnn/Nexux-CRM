import React, { useState, useEffect } from 'react';
import { CheckSquare, Plus, Search, Calendar, Briefcase, Loader2, Check, X } from 'lucide-react';
import { format, isToday, isTomorrow, isThisWeek, isPast, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('TUDO');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', due_date: '', lead_id: '' });
  const [leads, setLeads] = useState<any[]>([]);

  useEffect(() => {
    fetchTasks();
    fetchLeads();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
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
      const res = await fetch('/api/leads');
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
            filteredTasks.map(task => (
              <div 
                key={task.id} 
                className={`bg-white border rounded-xl p-5 flex items-center justify-between transition-all hover:shadow-md ${
                  task.completed ? 'border-gray-200 opacity-60' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  <button 
                    onClick={() => toggleTask(task)}
                    className={`mt-0.5 w-6 h-6 rounded border flex items-center justify-center transition-colors ${
                      task.completed 
                        ? 'bg-blue-600 border-blue-600 text-white' 
                        : 'border-gray-300 hover:border-blue-500'
                    }`}
                  >
                    {task.completed ? <Check size={16} /> : null}
                  </button>
                  
                  <div>
                    <h3 className={`font-bold text-lg ${task.completed ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                      {task.title}
                    </h3>
                    {task.due_date && (
                      <div className="flex items-center gap-1.5 mt-1.5 text-sm font-medium text-red-600">
                        <Calendar size={14} />
                        <span>
                          {format(parseISO(task.due_date), "dd/MM/yyyy, HH:mm:ss", { locale: ptBR })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                {task.lead_title && (
                  <button 
                    onClick={() => onNavigate('lead-detail', task.lead_id)}
                    className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-blue-100 transition-colors"
                  >
                    <Briefcase size={12} />
                    <span className="truncate max-w-[150px]">{task.lead_title}</span>
                    <span className="ml-1">&gt;</span>
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

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
                <label className="block text-sm font-medium text-slate-700 mb-1">Negociação Relacionada (Opcional)</label>
                <select 
                  value={newTask.lead_id}
                  onChange={e => setNewTask({...newTask, lead_id: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">Selecione uma negociação...</option>
                  {leads.map(lead => (
                    <option key={lead.id} value={lead.id}>{lead.title}</option>
                  ))}
                </select>
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
