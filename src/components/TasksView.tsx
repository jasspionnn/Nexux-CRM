import React, { useState, useMemo } from 'react';
import { useCRM } from '../context/CRMContext';
import { 
    CheckCircle, Circle, Clock, Calendar, 
    AlertCircle, PhoneCall, Mail, User, 
    Briefcase, ChevronRight, CheckSquare, Search
} from 'lucide-react';
import { Task } from '../types';

interface Props {
  onNavigate: (view: string, data?: any) => void;
}

type FilterType = 'all' | 'today' | 'tomorrow' | 'week' | 'month' | 'overdue' | 'completed';

export const TasksView: React.FC<Props> = ({ onNavigate }) => {
  const { leads, toggleTask, deleteTask } = useCRM();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Helper to flatten tasks
  const allTasks = useMemo(() => {
    const tasks: Array<{ task: Task; leadId: string; leadTitle: string; leadCompany: string }> = [];
    
    leads.forEach(lead => {
      if (lead.tasks && lead.tasks.length > 0) {
        lead.tasks.forEach(t => {
          tasks.push({
            task: t,
            leadId: lead.id,
            leadTitle: lead.title,
            leadCompany: lead.company
          });
        });
      }
    });

    return tasks.sort((a, b) => new Date(a.task.dueDate).getTime() - new Date(b.task.dueDate).getTime());
  }, [leads]);

  // Filtering Logic
  const filteredTasks = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    return allTasks.filter(item => {
      const taskDate = new Date(item.task.dueDate);
      const taskDateOnly = new Date(taskDate);
      taskDateOnly.setHours(0, 0, 0, 0);

      const matchesSearch = 
        item.task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.leadTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.leadCompany.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // Handle 'completed' filter separately
      if (activeFilter === 'completed') {
        return item.task.completed;
      }

      // For all other time-based filters, only show incomplete tasks
      if (item.task.completed) return false;

      switch (activeFilter) {
        case 'overdue':
          return taskDate < new Date() && !item.task.completed;
        case 'today':
          return taskDateOnly.getTime() === now.getTime();
        case 'tomorrow':
          return taskDateOnly.getTime() === tomorrow.getTime();
        case 'week':
          return taskDate >= now && taskDate <= nextWeek;
        case 'month':
          return taskDate >= now && taskDate <= nextMonth;
        case 'all':
        default:
          return true;
      }
    });
  }, [allTasks, activeFilter, searchTerm]);

  const TaskIcon = ({ type }: { type: Task['type'] }) => {
      switch (type) {
          case 'call': return <PhoneCall size={16} className="text-blue-500" />;
          case 'email': return <Mail size={16} className="text-yellow-500" />;
          case 'meeting': return <User size={16} className="text-purple-500" />;
          default: return <CheckSquare size={16} className="text-green-500" />;
      }
  };

  const getDueDateLabel = (dateStr: string) => {
      const date = new Date(dateStr);
      const now = new Date();
      const isOverdue = date < now;
      
      return (
          <span className={`flex items-center gap-1 text-xs font-medium ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
              <Calendar size={12} />
              {date.toLocaleDateString()} às {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {isOverdue && <span className="text-[10px] bg-red-100 px-1.5 rounded ml-1">Atrasada</span>}
          </span>
      );
  };

  // Stats
  const stats = useMemo(() => {
      const pending = allTasks.filter(t => !t.task.completed).length;
      const overdue = allTasks.filter(t => !t.task.completed && new Date(t.task.dueDate) < new Date()).length;
      const today = allTasks.filter(t => {
          const d = new Date(t.task.dueDate);
          const now = new Date();
          return !t.task.completed && d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length;
      return { pending, overdue, today };
  }, [allTasks]);

  return (
    <div className="h-full flex flex-col bg-gray-50 animate-fade-in">
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
         <div className="flex justify-between items-start mb-6">
             <div>
                 <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                     <CheckSquare className="text-blue-600" />
                     Minhas Tarefas
                 </h2>
                 <p className="text-gray-500 mt-1">Gerencie suas atividades diárias e follow-ups.</p>
             </div>
             
             {/* Summary Cards */}
             <div className="flex gap-4">
                 <div className="bg-blue-50 border border-blue-100 px-4 py-2 rounded-lg flex flex-col items-center min-w-[100px]">
                     <span className="text-2xl font-bold text-blue-600">{stats.today}</span>
                     <span className="text-xs text-blue-400 font-bold uppercase">Hoje</span>
                 </div>
                 <div className="bg-red-50 border border-red-100 px-4 py-2 rounded-lg flex flex-col items-center min-w-[100px]">
                     <span className="text-2xl font-bold text-red-600">{stats.overdue}</span>
                     <span className="text-xs text-red-400 font-bold uppercase">Atrasadas</span>
                 </div>
                 <div className="bg-gray-50 border border-gray-200 px-4 py-2 rounded-lg flex flex-col items-center min-w-[100px]">
                     <span className="text-2xl font-bold text-gray-700">{stats.pending}</span>
                     <span className="text-xs text-gray-400 font-bold uppercase">Pendentes</span>
                 </div>
             </div>
         </div>

         <div className="flex justify-between items-end">
             {/* Filters */}
             <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                 {(['all', 'today', 'tomorrow', 'week', 'month', 'overdue', 'completed'] as FilterType[]).map((filter) => (
                     <button
                        key={filter}
                        onClick={() => setActiveFilter(filter)}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${
                            activeFilter === filter 
                            ? 'bg-white text-blue-600 shadow-sm' 
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                        }`}
                     >
                        {filter === 'all' && 'Todas'}
                        {filter === 'today' && 'Hoje'}
                        {filter === 'tomorrow' && 'Amanhã'}
                        {filter === 'week' && 'Esta Semana'}
                        {filter === 'month' && 'Este Mês'}
                        {filter === 'overdue' && 'Atrasadas'}
                        {filter === 'completed' && 'Concluídas'}
                     </button>
                 ))}
             </div>

             <div className="relative w-64">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                <input 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar tarefas..."
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500 bg-white"
                />
             </div>
         </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto space-y-3">
              {filteredTasks.length === 0 ? (
                  <div className="text-center py-20 text-gray-400">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <CheckCircle size={32} className="opacity-20" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-600">Tudo limpo por aqui!</h3>
                      <p className="text-sm">Nenhuma tarefa encontrada para este filtro.</p>
                  </div>
              ) : (
                  filteredTasks.map((item) => (
                      <div 
                        key={item.task.id}
                        className={`bg-white border rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition-all group ${item.task.completed ? 'opacity-60 bg-gray-50 border-gray-200' : 'border-gray-200 hover:border-blue-300'}`}
                      >
                          <button 
                             onClick={() => toggleTask(item.leadId, item.task.id)}
                             className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                                 item.task.completed 
                                 ? 'bg-green-500 border-green-500 text-white' 
                                 : 'border-gray-300 text-transparent hover:border-blue-500'
                             }`}
                          >
                             <CheckCircle size={14} fill="currentColor" />
                          </button>

                          <div className="flex-1 min-w-0">
                              <div className={`text-base font-semibold ${item.task.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                                  {item.task.title}
                              </div>
                              <div className="flex items-center gap-4 mt-1">
                                  {getDueDateLabel(item.task.dueDate)}
                                  <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                                     <TaskIcon type={item.task.type} />
                                     <span className="uppercase">{item.task.type === 'todo' ? 'Tarefa' : item.task.type === 'call' ? 'Ligação' : item.task.type === 'meeting' ? 'Reunião' : 'Email'}</span>
                                  </div>
                              </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                             <button 
                                onClick={() => onNavigate('lead-detail', item.leadId)}
                                className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors bg-gray-50 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-transparent hover:border-blue-100"
                             >
                                <Briefcase size={14} />
                                <span className="max-w-[150px] truncate">{item.leadTitle}</span>
                                <ChevronRight size={14} className="text-gray-400" />
                             </button>
                             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                                 {item.leadCompany}
                             </span>
                          </div>
                      </div>
                  ))
              )}
          </div>
      </div>
    </div>
  );
};