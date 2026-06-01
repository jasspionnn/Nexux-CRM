import React, { useState, useEffect, useMemo } from 'react';
import { useCRM } from '../context/CRMContext';
import { 
  BarChart2, Users, CheckSquare, DollarSign, 
  ArrowUpRight, Clock, Target, TrendingUp, 
  Award, Briefcase, Plus, Calendar, 
  ChevronRight, ArrowDownRight, Activity,
  Filter, Search
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, 
  Cell, PieChart, Pie
} from 'recharts';

type DateRange = '7d' | '15d' | '30d' | 'thisMonth' | 'all' | 'custom';
type ChartPeriod = 'weekly' | 'monthly';

export const Dashboard = () => {
  const { currentUser } = useCRM();
  const [leads, setLeads] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [funnels, setFunnels] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- Filter State ---
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('weekly');
  const [customStartDate, setCustomStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const aid = currentUser?.account_id || '';
        const [leadsRes, tasksRes, funnelsRes, usersRes] = await Promise.all([
          fetch(`/api/leads?account_id=${aid}`),
          fetch(`/api/tasks?account_id=${aid}`),
          fetch(`/api/funnels?account_id=${aid}`),
          fetch(`/api/users?account_id=${aid}`)
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
    // 1. Helper to check if date is in range
    const isDateInRange = (dateStr: string) => {
      if (dateRange === 'all') return true;
      const date = new Date(dateStr);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      let start = new Date();
      start.setHours(0, 0, 0, 0);

      if (dateRange === '7d') start.setDate(today.getDate() - 7);
      else if (dateRange === '15d') start.setDate(today.getDate() - 15);
      else if (dateRange === '30d') start.setDate(today.getDate() - 30);
      else if (dateRange === 'thisMonth') {
        start = new Date(today.getFullYear(), today.getMonth(), 1);
      } else if (dateRange === 'custom') {
        const customS = new Date(customStartDate);
        const customE = new Date(customEndDate);
        customS.setHours(0, 0, 0, 0);
        customE.setHours(23, 59, 59, 999);
        return date >= customS && date <= customE;
      }
      
      return date >= start && date <= today;
    };

    // 2. Filter Leads and Tasks
    const filteredLeads = leads.filter(l => isDateInRange(l.created_at));
    const filteredTasks = tasks.filter(t => !t.completed); // Tasks are usually better as 'future' but we can filter by creation or due date if needed
    
    // Calculate Stats on Filtered Data
    const totalPipelineValue = filteredLeads.reduce((sum, lead) => sum + (lead.value || 0), 0);
    
    const wonLeads = filteredLeads.filter(lead => {
      const funnel = funnels.find(f => f.id === lead.funnel_id);
      return funnel && lead.stage_id === funnel.default_won_stage_id;
    });
    
    const lostLeads = filteredLeads.filter(lead => {
      const funnel = funnels.find(f => f.id === lead.funnel_id);
      return funnel && lead.stage_id === funnel.default_lost_stage_id;
    });

    const wonValue = wonLeads.reduce((sum, lead) => sum + (lead.value || 0), 0);
    const totalClosed = wonLeads.length + lostLeads.length;
    const conversionRate = totalClosed > 0 ? (wonLeads.length / totalClosed) * 100 : 0;
    const pendingTasksCount = filteredTasks.length;
    
    // 3. Dynamic Chart Data (Last 7 or 30 days)
    const chartDays = chartPeriod === 'weekly' ? 7 : 30;
    const chartData = [...Array(chartDays)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (chartDays - 1 - i));
      const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const dayValue = filteredLeads
        .filter(l => new Date(l.created_at).toDateString() === d.toDateString())
        .reduce((sum, l) => sum + (l.value || 0), 0);
      return { name: dateStr, value: dayValue };
    });

    // Funnel Distribution
    const activeFunnel = funnels[0];
    const stageDistribution = activeFunnel?.stages?.map((stage: any) => ({
      name: stage.name,
      leads: leads.filter(l => l.stage_id === stage.id).length, // Distribution usually shows all current leads, not just filtered by creation
      color: stage.color || '#6366f1'
    })) || [];

    // Sales Ranking (Based on Filtered Won Leads)
    const ranking = users.map(user => {
      const userWonLeadsInPeriod = wonLeads.filter(l => l.assigned_user_id === user.id);
      const userWonValue = userWonLeadsInPeriod.reduce((sum, l) => sum + (l.value || 0), 0);
      return {
        ...user,
        wonValue: userWonValue,
        wonCount: userWonLeadsInPeriod.length
      };
    }).sort((a, b) => b.wonValue - a.wonValue).slice(0, 5);

    return {
      totalPipelineValue,
      wonValue,
      conversionRate,
      pendingTasksCount,
      chartData,
      stageDistribution,
      ranking,
      recentLeads: filteredLeads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5)
    };
  }, [leads, tasks, funnels, users, dateRange, customStartDate, customEndDate, chartPeriod]);

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
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-black uppercase tracking-widest">Dashboard</div>
              <div className="text-slate-300">•</div>
              <div className="text-slate-400 text-sm font-medium">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">
              Olá, <span className="text-indigo-600">{currentUser?.name?.split(' ')[0] || 'Usuário'}</span> 👋
            </h1>
            <p className="text-slate-500 font-medium mt-1">Veja como está a performance comercial no período selecionado.</p>
          </div>
          
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-white p-3 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100">
            <div className="flex items-center gap-3 min-w-[200px]">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-inner">
                <Filter size={18} />
              </div>
              <select 
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRange)}
                className="bg-transparent border-none p-0 focus:ring-0 outline-none font-bold text-slate-900 text-sm w-full cursor-pointer hover:text-indigo-600 transition-colors"
              >
                <option value="all">Todo o Período</option>
                <option value="7d">Últimos 7 dias</option>
                <option value="15d">Últimos 15 dias</option>
                <option value="30d">Últimos 30 dias</option>
                <option value="thisMonth">Este Mês</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>
            
            {dateRange === 'custom' && (
              <div className="flex items-center gap-2 border-l border-slate-100 pl-4 py-1 animate-in fade-in slide-in-from-left-2 duration-300">
                <input 
                  type="date" 
                  value={customStartDate} 
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-slate-50 border-none rounded-lg px-2 py-1 text-xs font-bold text-slate-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
                <span className="text-slate-300 font-black">→</span>
                <input 
                  type="date" 
                  value={customEndDate} 
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-slate-50 border-none rounded-lg px-2 py-1 text-xs font-bold text-slate-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
            )}
            
            <button className="md:ml-2 flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
              <Search size={14} />
              Filtrar
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
            trend={dateRange === 'all' ? undefined : "Periodo atual"}
            trendUp={true}
          />
          <MetricCard 
            title="Novas Oportunidades"
            value={`R$ ${stats.totalPipelineValue.toLocaleString('pt-BR')}`}
            icon={<DollarSign size={24} />}
            color="bg-indigo-500"
            subtitle="Criadas no período"
          />
          <MetricCard 
            title="Taxa de Conversão"
            value={`${stats.conversionRate.toFixed(1)}%`}
            icon={<TrendingUp size={24} />}
            color="bg-cyan-500"
            subtitle="Fechamentos vs Perdas"
          />
          <MetricCard 
            title="Pendências críticas"
            value={stats.pendingTasksCount}
            icon={<CheckSquare size={24} />}
            color="bg-orange-500"
            subtitle="Próximas Tarefas"
          />
        </div>

        {/* Charts & Ranking Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          
          {/* Main Area Chart */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-8 shadow-xl shadow-slate-200/40">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Evolução do Pipeline</h3>
                <p className="text-slate-400 text-sm font-medium">Financeiro gerado por dia ({chartPeriod === 'weekly' ? 'Semana' : 'Mês'})</p>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                <button 
                  onClick={() => setChartPeriod('weekly')}
                  className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${chartPeriod === 'weekly' ? 'bg-white text-indigo-600 shadow-lg shadow-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Semanal
                </button>
                <button 
                  onClick={() => setChartPeriod('monthly')}
                  className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${chartPeriod === 'monthly' ? 'bg-white text-indigo-600 shadow-lg shadow-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Mensal
                </button>
              </div>
            </div>
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.chartData}>
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
                  <YAxis hide />
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
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sales Ranking */}
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl shadow-slate-200/40">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center border border-amber-100">
                <Award size={20} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Ranking de Vendas</h3>
                <p className="text-slate-400 text-sm font-medium">Líderes de fechamento no período</p>
              </div>
            </div>

            <div className="space-y-6">
              {stats.ranking.map((user, index) => (
                <div key={user.id} className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center font-black text-indigo-600 border-2 border-white shadow-sm overflow-hidden">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    {index === 0 && (
                      <div className="absolute -top-1 -right-1 bg-amber-400 text-white w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-bounce">
                        <Award size={10} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 truncate">{user.name}</span>
                      <span className="font-black text-indigo-600 text-sm">R$ {user.wonValue.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="flex-1 bg-slate-50 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-indigo-500 h-full rounded-full transition-all duration-1000 ease-out" 
                          style={{ width: `${(user.wonValue / (stats.ranking[0]?.wonValue || 1)) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] font-black text-slate-400">{user.wonCount} v</span>
                    </div>
                  </div>
                </div>
              ))}
              {stats.ranking.length === 0 && (
                <p className="text-center py-10 text-slate-400 font-medium">Sem vendas concluídas neste período.</p>
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
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Potencial do Funil</h3>
                  <p className="text-slate-400 text-sm font-medium">Distribuição atual por estágio</p>
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
                    width={110} 
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
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Negociações no Período</h3>
                  <p className="text-slate-400 text-sm font-medium">Últimos leads captados ou criados</p>
                </div>
              </div>
              <button className="text-indigo-600 font-black text-xs uppercase tracking-widest hover:underline flex items-center gap-1">
                Ver tudo <ChevronRight size={14} />
              </button>
            </div>

            <div className="space-y-6">
              {stats.recentLeads.map(lead => (
                <div key={lead.id} className="flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all shadow-sm">
                      <Briefcase size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">{lead.title}</h4>
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
                <div className="py-10 flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                    <Filter size={24} />
                  </div>
                  <p className="text-center text-slate-400 font-bold text-xs uppercase tracking-widest">Sem atividades neste filtro.</p>
                </div>
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
  <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-xl shadow-slate-200/40 relative overflow-hidden group transition-all hover:-translate-y-1 hover:shadow-indigo-100">
    <div className="flex items-center justify-between mb-4">
      <div className={`w-14 h-14 ${color} text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100`}>
        {icon}
      </div>
      {trend && (
        <div className={`flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${trendUp ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
          {trend}
        </div>
      )}
    </div>
    <div className="mt-6">
      <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1.5">{title}</h3>
      <div className="text-3xl font-black text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">{value}</div>
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
