import React, { useState, useEffect, useMemo } from 'react';
import { useCRM } from '../context/CRMContext';
import { 
  BarChart2, Users, CheckSquare, DollarSign, 
  ArrowUpRight, Clock, Target, TrendingUp, 
  Award, Briefcase, Plus, Calendar, 
  ChevronRight, ArrowDownRight, Activity
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, 
  Cell, PieChart, Pie
} from 'recharts';

export const Dashboard = () => {
  const { currentUser } = useCRM();
  const [leads, setLeads] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [funnels, setFunnels] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [leadsRes, tasksRes, funnelsRes, usersRes] = await Promise.all([
          fetch('/api/leads'),
          fetch('/api/tasks'),
          fetch('/api/funnels'),
          fetch('/api/users')
        ]);
        
        const leadsData = await leadsRes.json();
        const tasksData = await tasksRes.json();
        const funnelsData = await funnelsRes.json();
        const usersData = await usersRes.json();
        
        if (Array.isArray(leadsData)) setLeads(leadsData);
        if (Array.isArray(tasksData)) setTasks(tasksData);
        if (Array.isArray(funnelsData)) setFunnels(funnelsData);
        if (Array.isArray(usersData)) setUsers(usersData);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- Analytics Logic ---
  const stats = useMemo(() => {
    const totalPipelineValue = leads.reduce((sum, lead) => sum + (lead.value || 0), 0);
    
    // Calculate Won Value based on funnel settings
    const wonLeads = leads.filter(lead => {
      const funnel = funnels.find(f => f.id === lead.funnel_id);
      return funnel && lead.stage_id === funnel.default_won_stage_id;
    });
    
    const wonValue = wonLeads.reduce((sum, lead) => sum + (lead.value || 0), 0);
    const conversionRate = leads.length > 0 ? (wonLeads.length / leads.length) * 100 : 0;
    const pendingTasks = tasks.filter(t => !t.completed).length;
    
    // Daily Growth Data (Last 7 days)
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const dayValue = leads
        .filter(l => new Date(l.created_at).toDateString() === d.toDateString())
        .reduce((sum, l) => sum + (l.value || 0), 0);
      return { name: dateStr, value: dayValue };
    });

    // Funnel Distribution
    const activeFunnel = funnels[0]; // Typical use case: first funnel
    const stageDistribution = activeFunnel?.stages?.map((stage: any) => ({
      name: stage.name,
      leads: leads.filter(l => l.stage_id === stage.id).length,
      color: stage.color || '#6366f1'
    })) || [];

    // Sales Ranking
    const ranking = users.map(user => {
      const userWonLeads = wonLeads.filter(l => l.assigned_user_id === user.id);
      const userWonValue = userWonLeads.reduce((sum, l) => sum + (l.value || 0), 0);
      return {
        ...user,
        wonValue: userWonValue,
        wonCount: userWonLeads.length
      };
    }).sort((a, b) => b.wonValue - a.wonValue).slice(0, 5);

    return {
      totalPipelineValue,
      wonValue,
      conversionRate,
      pendingTasks,
      last7Days,
      stageDistribution,
      ranking,
      recentLeads: [...leads].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5)
    };
  }, [leads, tasks, funnels, users]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50/50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-bold text-sm animate-pulse tracking-widest uppercase">Nexus Intelligence Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50/50 p-6 lg:p-10">
      <div className="max-w-[1600px] mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-black uppercase tracking-widest">Dashboard</div>
              <div className="text-slate-300">•</div>
              <div className="text-slate-400 text-sm font-medium">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">
              Olá, <span className="text-indigo-600">{currentUser?.name?.split(' ')[0] || 'Usuário'}</span> 👋
            </h1>
            <p className="text-slate-500 font-medium mt-1">Sua central de inteligência e performance comercial.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all shadow-sm">
              <Calendar size={18} />
              Relatórios
            </button>
            <button className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 hover:-translate-y-0.5 active:translate-y-0">
              <Plus size={18} />
              Nova Negociação
            </button>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <MetricCard 
            title="Valor Realizado (Won)"
            value={`R$ ${stats.wonValue.toLocaleString('pt-BR')}`}
            icon={<Target size={24} />}
            color="bg-green-500"
            trend="+14.2%"
            trendUp={true}
          />
          <MetricCard 
            title="Pipeline Ativo"
            value={`R$ ${stats.totalPipelineValue.toLocaleString('pt-BR')}`}
            icon={<DollarSign size={24} />}
            color="bg-indigo-500"
            trend="+8.5%"
            trendUp={true}
          />
          <MetricCard 
            title="Taxa de Conversão"
            value={`${stats.conversionRate.toFixed(1)}%`}
            icon={<TrendingUp size={24} />}
            color="bg-cyan-500"
            trend="-2.1%"
            trendUp={false}
          />
          <MetricCard 
            title="Tarefas do Dia"
            value={stats.pendingTasks}
            icon={<CheckSquare size={24} />}
            color="bg-orange-500"
            subtitle="Pendências críticas"
          />
        </div>

        {/* Charts & Ranking Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          
          {/* Main Area Chart */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-8 shadow-xl shadow-slate-200/40">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Evolução do Pipeline</h3>
                <p className="text-slate-400 text-sm font-medium">Volume financeiro gerado nos últimos 7 dias</p>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl">
                <button className="px-4 py-1.5 bg-white text-indigo-600 rounded-lg text-xs font-black shadow-sm">Semanal</button>
                <button className="px-4 py-1.5 text-slate-400 rounded-lg text-xs font-black hover:text-slate-600">Mensal</button>
              </div>
            </div>
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.last7Days}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }}
                    dy={10}
                  />
                  <YAxis 
                    hide 
                  />
                  <Tooltip 
                    content={<CustomTooltip />}
                    cursor={{ stroke: '#6366f1', strokeWidth: 2 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#6366f1" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorValue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sales Ranking */}
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl shadow-slate-200/40">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center">
                <Award size={20} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Ranking de Vendas</h3>
                <p className="text-slate-400 text-sm font-medium">Performance por usuário</p>
              </div>
            </div>

            <div className="space-y-6">
              {stats.ranking.map((user, index) => (
                <div key={user.id} className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-500 border-2 border-white shadow-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    {index === 0 && (
                      <div className="absolute -top-1 -right-1 bg-amber-400 text-white w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                        <Award size={10} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 truncate">{user.name}</span>
                      <span className="font-black text-indigo-600 text-sm">R$ {user.wonValue.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-500 h-full rounded-full transition-all duration-1000" 
                        style={{ width: `${(user.wonValue / (stats.ranking[0]?.wonValue || 1)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
              {stats.ranking.length === 0 && (
                <p className="text-center py-10 text-slate-400 font-medium">Nenhum dado de venda ainda.</p>
              )}
            </div>
          </div>

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Funnel Bottlenecks */}
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl shadow-slate-200/40 overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-cyan-50 text-cyan-500 rounded-xl flex items-center justify-center">
                  <Activity size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Distribuição do Funil</h3>
                  <p className="text-slate-400 text-sm font-medium">Identifique gargalos no processo</p>
                </div>
              </div>
            </div>

            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.stageDistribution} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={100} 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: '#475569', fontSize: 11, fontWeight: 800 }}
                  />
                  <Tooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip format="leads" />} />
                  <Bar dataKey="leads" radius={[0, 8, 8, 0]} barSize={24}>
                    {stats.stageDistribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl shadow-slate-200/40">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-50 text-slate-500 rounded-xl flex items-center justify-center">
                  <Plus size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Atividades Recentes</h3>
                  <p className="text-slate-400 text-sm font-medium">Novas negociações criadas por você</p>
                </div>
              </div>
              <button className="text-indigo-600 font-bold text-sm hover:underline flex items-center gap-1">
                Ver tudo <ChevronRight size={16} />
              </button>
            </div>

            <div className="space-y-6">
              {stats.recentLeads.map(lead => (
                <div key={lead.id} className="flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                      <Briefcase size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 leading-tight">{lead.title}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{lead.company || 'Sem empresa'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-slate-900 tracking-tight">
                      R$ {(lead.value || 0).toLocaleString('pt-BR')}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 mt-0.5">
                      {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>
              ))}
              {stats.recentLeads.length === 0 && (
                <p className="text-center py-10 text-slate-400 font-medium">Nenhuma atividade recente.</p>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: string;
  trendUp?: boolean;
  subtitle?: string;
}

const MetricCard = ({ title, value, icon, color, trend, trendUp, subtitle }: MetricCardProps) => (
  <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-xl shadow-slate-200/40 relative overflow-hidden group transition-all hover:-translate-y-1">
    <div className="flex items-center justify-between mb-4">
      <div className={`w-14 h-14 ${color} text-white rounded-2xl flex items-center justify-center shadow-lg shadow-${color.split('-')[1]}-200`}>
        {icon}
      </div>
      {trend && (
        <div className={`flex items-center px-3 py-1 rounded-full text-xs font-black ${trendUp ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
          {trendUp ? <ArrowUpRight size={14} className="mr-0.5" /> : <ArrowDownRight size={14} className="mr-0.5" />}
          {trend}
        </div>
      )}
    </div>
    <div className="mt-6">
      <h3 className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1.5">{title}</h3>
      <div className="text-3xl font-black text-slate-900 tracking-tight">{value}</div>
      {subtitle && <p className="text-slate-400 text-[10px] font-bold mt-1 uppercase tracking-tighter">{subtitle}</p>}
    </div>
    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full translate-x-16 -translate-y-16 opacity-0 group-hover:opacity-100 transition-opacity"></div>
  </div>
);

const CustomTooltip = ({ active, payload, label, format = 'valor' }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 p-4 rounded-2xl shadow-2xl border border-slate-800">
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
        <p className="text-white text-lg font-black">
          {format === 'valor' ? `R$ ${payload[0].value.toLocaleString('pt-BR')}` : `${payload[0].value} Leads`}
        </p>
      </div>
    );
  }
  return null;
};
