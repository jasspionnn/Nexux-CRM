
import React, { useState, useMemo } from 'react';
import { useCRM } from '../context/CRMContext';
import { 
    CheckCircle, Calendar, 
    PhoneCall, Mail, User, 
    Briefcase, ChevronRight, CheckSquare, Search, Plus, X, Filter, Trash2
} from 'lucide-react';
import { Task, Lead } from '../types';

interface Props {
  onNavigate: (view: string, data?: any) => void;
}

type FilterType = 'all' | 'today' | 'tomorrow' | 'week' | 'month' | 'overdue' | 'completed';
type TaskTypeFilter = 'all' | 'call' | 'email' | 'meeting' | 'todo';

export const TasksView: React.FC<Props> = ({ onNavigate }) => {
  const { leads, toggleTask, deleteTask, addTask } = useCRM();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [typeFilter, setTypeFilter] = useState<TaskTypeFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTaskData, setNewTaskData] = useState({
      title: '',
      date: new Date().toISOString().slice(0, 16),
      type: 'todo' as Task['type'],
      leadId: ''
  });

  const allTasks = useMemo(() => {
    const tasks: Array<{ task: Task; leadId: string; leadTitle: string; leadCompany: string }> = [];
    leads.forEach(lead => {
      (lead.tasks || []).forEach(t => {
        tasks.push({ task: t, leadId: lead.id, leadTitle: lead.title, leadCompany: lead.company });
      });
    });
    return tasks.sort((a, b) => new Date(a.task.dueDate).getTime() - new Date(b.task.dueDate).getTime());
  }, [leads]);

  const filteredTasks = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(now); nextWeek.setDate(nextWeek.getDate() + 7);
    const nextMonth = new Date(now); nextMonth.setMonth(nextMonth.getMonth() + 1);

    return allTasks.filter(item => {
      const taskDate = new Date(item.task.dueDate);
      const taskDateOnly = new Date(taskDate); taskDateOnly.setHours(0, 0, 0, 0);

      const matchesSearch = item.task.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           item.leadTitle.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           item.leadCompany.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      if (typeFilter !== 'all' && item.task.type !== typeFilter) return false;

      if (activeFilter === 'completed') return item.task.completed;
      if (item.task.completed) return false;

      switch (activeFilter) {
        case 'overdue': return taskDate < new Date();
        case 'today': return taskDateOnly.getTime() === now.getTime();
        case 'tomorrow': return taskDateOnly.getTime() === tomorrow.getTime();
        case 'week': return taskDate >= now && taskDate <= nextWeek;
        case 'month': return taskDate >= now && taskDate <= nextMonth;
        default: return true;
      }
    });
  }, [allTasks, activeFilter, typeFilter, searchTerm]);

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskData.title || !newTaskData.leadId) return;
    addTask(newTaskData.leadId, {
        id: `t-${Date.now()}`,
        title: newTaskData.title,
        dueDate: newTaskData.date,
        type: newTaskData.type,
        completed: false
    });
    setNewTaskData({ title: '', date: new Date().toISOString().slice(0, 16), type: 'todo', leadId: '' });
    setIsModalOpen(false);
  };

  const TaskIcon = ({ type }: { type: Task['type'] }) => {
      switch (type) {
          case 'call': return <PhoneCall size={16} className="text-blue-500" />;
          case 'email': return <Mail size={16} className="text-yellow-500" />;
          case 'meeting': return <User size={16} className="text-purple-500" />;
          default: return <CheckSquare size={16} className="text-green-500" />;
      }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 animate-fade-in">
      <div className="bg-white border-b border-gray-200 px-8 py-6 shadow-sm z-10">
         <div className="flex justify-between items-center mb-6">
             <div>
                 <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                     <CheckSquare className="text-blue-600" /> Minhas Tarefas
                 </h2>
                 <p className="text-gray-500 mt-1 text-sm font-medium">Acompanhe seus compromissos e não perca prazos.</p>
             </div>
             <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
                <Plus size={20} /> Nova Tarefa
             </button>
         </div>

         <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
             <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                 {(['all', 'today', 'tomorrow', 'week', 'overdue', 'completed'] as FilterType[]).map((f) => (
                     <button key={f} onClick={() => setActiveFilter(f)} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-tight transition-all ${activeFilter === f ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                        {f === 'all' ? 'Tudo' : f === 'today' ? 'Hoje' : f === 'tomorrow' ? 'Amanhã' : f === 'week' ? 'Semana' : f === 'overdue' ? 'Atrasadas' : 'Concluídas'}
                     </button>
                 ))}
             </div>

             <div className="flex items-center gap-4 w-full lg:w-auto">
                 <div className="relative flex-1 lg:w-64">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar..." className="w-full pl-9 pr-4 py-2 text-sm border-none rounded-xl outline-none bg-gray-100 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all" />
                 </div>
             </div>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto space-y-3">
              {filteredTasks.length === 0 ? (
                  <div className="text-center py-20 text-gray-400 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                      <CheckCircle size={48} className="opacity-10 mx-auto mb-4" />
                      <h3 className="text-lg font-bold text-gray-800">Nada para exibir</h3>
                      <p className="text-sm font-medium">Relaxe! Você está em dia com suas tarefas.</p>
                  </div>
              ) : (
                  filteredTasks.map((item) => (
                      <div key={item.task.id} className={`bg-white border rounded-2xl p-4 flex items-center gap-4 hover:shadow-lg transition-all group ${item.task.completed ? 'opacity-60 grayscale bg-gray-50' : 'border-gray-200 hover:border-blue-300 shadow-sm'}`}>
                          <button onClick={() => toggleTask(item.leadId, item.task.id)} className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${item.task.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-200 hover:border-blue-500 text-transparent'}`}>
                             <CheckCircle size={14} fill="currentColor" />
                          </button>
                          <div className="flex-1 min-w-0">
                              <div className={`text-base font-bold truncate ${item.task.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>{item.task.title}</div>
                              <div className="flex items-center gap-3 mt-1.5">
                                  <span className={`flex items-center gap-1 text-[10px] font-black uppercase ${new Date(item.task.dueDate) < new Date() && !item.task.completed ? 'text-red-500' : 'text-gray-400'}`}>
                                      <Calendar size={12} /> {new Date(item.task.dueDate).toLocaleString()}
                                  </span>
                              </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                             <button onClick={() => onNavigate('lead-detail', item.leadId)} className="text-[10px] font-black uppercase tracking-tight text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1">
                                <Briefcase size={10} /> {item.leadTitle} <ChevronRight size={10} />
                             </button>
                             <button onClick={() => deleteTask(item.leadId, item.task.id)} className="p-2 text-gray-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                          </div>
                      </div>
                  ))
              )}
          </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="text-xl font-black text-gray-800 tracking-tight">Agendar Atividade</h3>
                    <button onClick={() => setIsModalOpen(false)} className="bg-white p-2 rounded-xl text-gray-400 hover:text-gray-600 shadow-sm border border-gray-200"><X size={20} /></button>
                </div>
                <form onSubmit={handleCreateTask} className="p-8 space-y-6">
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Lead / Negócio</label>
                        <select required value={newTaskData.leadId} onChange={e => setNewTaskData({...newTaskData, leadId: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-100 transition-all">
                            <option value="">Selecione o Lead...</option>
                            {leads.map(l => <option key={l.id} value={l.id}>{l.title} ({l.company})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">O que precisa ser feito?</label>
                        <input required value={newTaskData.title} onChange={e => setNewTaskData({...newTaskData, title: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-100 transition-all" placeholder="Ex: Retornar ligação da proposta" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Data</label>
                            <input type="datetime-local" value={newTaskData.date} onChange={e => setNewTaskData({...newTaskData, date: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-100" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Tipo</label>
                            <select value={newTaskData.type} onChange={e => setNewTaskData({...newTaskData, type: e.target.value as any})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none bg-white">
                                <option value="todo">Tarefa</option>
                                <option value="call">Ligação</option>
                                <option value="meeting">Reunião</option>
                                <option value="email">E-mail</option>
                            </select>
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-95">Salvar Atividade</button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};
