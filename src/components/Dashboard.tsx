import React, { useState, useEffect } from 'react';
import { useCRM } from '../context/CRMContext';
import { BarChart2, Users, CheckSquare, DollarSign, ArrowUpRight, Clock } from 'lucide-react';

export const Dashboard = () => {
  const { currentUser } = useCRM();
  const [leads, setLeads] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [leadsRes, tasksRes] = await Promise.all([
          fetch('/api/leads'),
          fetch('/api/tasks')
        ]);
        
        const leadsData = await leadsRes.json();
        const tasksData = await tasksRes.json();
        
        if (Array.isArray(leadsData)) setLeads(leadsData);
        if (Array.isArray(tasksData)) setTasks(tasksData);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const totalValue = leads.reduce((sum, lead) => sum + (lead.value || 0), 0);
  const activeLeads = leads.length;
  const pendingTasks = tasks.filter(t => !t.completed).length;
  
  // Get recent leads (last 5)
  const recentLeads = [...leads].sort((a, b) => {
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  }).slice(0, 5);

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Olá, {currentUser?.name || 'Usuário'}</h1>
        <p className="text-slate-500 mt-1">Aqui está o resumo das suas atividades hoje.</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <DollarSign size={24} />
            </div>
            <span className="flex items-center text-sm font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">
              <ArrowUpRight size={16} className="mr-1" />
              12%
            </span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium mb-1">Valor Total em Pipeline</h3>
          <div className="text-2xl font-bold text-slate-900">
            R$ {totalValue.toLocaleString('pt-BR')}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <Users size={24} />
            </div>
          </div>
          <h3 className="text-slate-500 text-sm font-medium mb-1">Negociações Ativas</h3>
          <div className="text-2xl font-bold text-slate-900">{activeLeads}</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
              <CheckSquare size={24} />
            </div>
          </div>
          <h3 className="text-slate-500 text-sm font-medium mb-1">Tarefas Pendentes</h3>
          <div className="text-2xl font-bold text-slate-900">{pendingTasks}</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
              <BarChart2 size={24} />
            </div>
          </div>
          <h3 className="text-slate-500 text-sm font-medium mb-1">Taxa de Conversão</h3>
          <div className="text-2xl font-bold text-slate-900">24.8%</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Leads */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Negociações Recentes</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {recentLeads.length > 0 ? (
              recentLeads.map(lead => (
                <div key={lead.id} className="p-6 hover:bg-slate-50 transition-colors flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">{lead.title}</h3>
                    <p className="text-sm text-slate-500">{lead.company || 'Sem empresa'}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900">R$ {(lead.value || 0).toLocaleString('pt-BR')}</div>
                    <div className="text-xs text-slate-400 flex items-center justify-end gap-1 mt-1">
                      <Clock size={12} />
                      {new Date(lead.created_at || Date.now()).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500">
                Nenhuma negociação encontrada.
              </div>
            )}
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Próximas Tarefas</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {tasks.filter(t => !t.completed).slice(0, 5).length > 0 ? (
              tasks.filter(t => !t.completed).slice(0, 5).map(task => (
                <div key={task.id} className="p-6 hover:bg-slate-50 transition-colors flex items-start gap-4">
                  <div className="w-5 h-5 rounded border-2 border-slate-300 mt-0.5 flex-shrink-0"></div>
                  <div>
                    <h3 className="font-bold text-slate-900">{task.title}</h3>
                    {task.due_date && (
                      <p className="text-sm text-orange-600 font-medium mt-1 flex items-center gap-1">
                        <Clock size={14} />
                        Vence em {new Date(task.due_date).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500">
                Nenhuma tarefa pendente.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
