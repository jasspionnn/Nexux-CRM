
import React, { useState, useMemo } from 'react';
import { useCRM } from '../context/CRMContext';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import { 
  TrendingUp, DollarSign, Calendar, Target, 
  Briefcase, ArrowUpRight, ArrowDownRight, Users, 
  Filter, Activity, AlertCircle
} from 'lucide-react';

export const Dashboard = () => {
  const { leads, funnels, users, teams } = useCRM();
  const [dateRange, setDateRange] = useState('30_days');

  // --- HELPERS & FORMATTERS ---

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

  const formatPercent = (val: number) => 
    `${val.toFixed(1)}%`;

  // --- DATA CALCULATIONS ---

  // 1. General Metrics
  const wonLeads = useMemo(() => leads.filter(l => l.probability === 100), [leads]);
  const lostLeads = useMemo(() => leads.filter(l => l.probability === 0), [leads]);
  const openLeads = useMemo(() => leads.filter(l => l.probability > 0 && l.probability < 100), [leads]);

  const totalRevenue = wonLeads.reduce((acc, l) => acc + l.value, 0);
  const pipelineValue = openLeads.reduce((acc, l) => acc + l.value, 0);
  
  const totalClosed = wonLeads.length + lostLeads.length;
  const winRate = totalClosed > 0 ? (wonLeads.length / totalClosed) * 100 : 0;
  const avgTicket = wonLeads.length > 0 ? totalRevenue / wonLeads.length : 0;

  // 2. Goal Progress
  const globalGoal = useMemo(() => teams.reduce((acc, t) => acc + t.goal, 0), [teams]);
  const goalProgress = globalGoal > 0 ? (totalRevenue / globalGoal) * 100 : 0;

  // 3. Funnel Insights (Conversion between stages)
  const primaryFunnel = funnels[0];
  const funnelData = useMemo(() => {
    if (!primaryFunnel) return [];
    
    // Calculate count and value per stage
    const data = primaryFunnel.stages.map(stage => {
        const stageLeads = leads.filter(l => l.funnelId === primaryFunnel.id && l.stageId === stage.id);
        return {
            id: stage.id,
            name: stage.name,
            count: stageLeads.length,
            value: stageLeads.reduce((acc, l) => acc + l.value, 0),
            color: stage.color
        };
    });

    return data;
  }, [primaryFunnel, leads]);

  // 4. Sales Evolution (Daily)
  const evolutionData = useMemo(() => {
    const data: Record<string, number> = {};
    const today = new Date();
    
    // Initialize last 7 days
    for(let i=6; i>=0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        data[dateStr] = 0;
    }

    wonLeads.forEach(lead => {
        const d = new Date(lead.createdAt);
        const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        if (data[dateStr] !== undefined) {
            data[dateStr] += lead.value;
        }
    });

    return Object.entries(data).map(([date, value]) => ({ date, value }));
  }, [wonLeads]);

  // 5. Product Mix
  const productData = useMemo(() => {
    const counts: Record<string, number> = {};
    wonLeads.forEach(lead => {
      const product = (lead.tags && lead.tags.length > 0) ? lead.tags[0] : 'Outros';
      counts[product] = (counts[product] || 0) + lead.value;
    });

    const result = Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value); // Sort descending
    
    return result.length > 0 ? result : [{ name: 'Sem Vendas', value: 1 }];
  }, [wonLeads]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1'];

  // --- COMPONENTS ---

  const KpiCard = ({ title, value, subtext, icon: Icon, trend, color }: any) => (
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-2">
              <div className={`p-2 rounded-lg ${color} bg-opacity-10 text-opacity-100`}>
                  <Icon size={20} className={color.replace('bg-', 'text-')} />
              </div>
              {trend && (
                  <span className={`flex items-center text-xs font-bold ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {trend > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      {Math.abs(trend)}%
                  </span>
              )}
          </div>
          <div>
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">{title}</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">{value}</h3>
              <p className="text-xs text-gray-400 mt-1">{subtext}</p>
          </div>
      </div>
  );

  return (
    <div className="p-6 bg-gray-50 h-full overflow-y-auto animate-fade-in text-gray-800">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Visão Geral</h1>
            <p className="text-sm text-gray-500">Monitoramento em tempo real de performance comercial.</p>
          </div>
          <div className="flex gap-2">
             <button className="flex items-center gap-2 bg-white border border-gray-300 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 text-gray-700 transition-colors">
                <Calendar size={16} />
                Últimos 30 dias
             </button>
          </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KpiCard 
              title="Vendas Realizadas" 
              value={formatCurrency(totalRevenue)} 
              subtext={`${wonLeads.length} negócios fechados`}
              icon={DollarSign}
              color="bg-green-500"
              trend={12}
          />
          <KpiCard 
              title="Em Pipeline" 
              value={formatCurrency(pipelineValue)} 
              subtext={`${openLeads.length} oportunidades ativas`}
              icon={Briefcase}
              color="bg-blue-500"
          />
          <KpiCard 
              title="Ticket Médio" 
              value={formatCurrency(avgTicket)} 
              subtext="Por venda realizada"
              icon={Activity}
              color="bg-purple-500"
          />
          <KpiCard 
              title="Taxa de Conversão" 
              value={formatPercent(winRate)} 
              subtext="Ganhas vs. Total Fechado"
              icon={Target}
              color="bg-orange-500"
              trend={-2.5}
          />
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          {/* Sales Evolution */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      <TrendingUp className="text-blue-600" size={20} /> Evolução de Vendas
                  </h3>
              </div>
              <div className="h-[300px] w-full">
                  {totalRevenue > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={evolutionData}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} tickFormatter={(val) => `R$${val/1000}k`} />
                            <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(val: number) => [formatCurrency(val), 'Vendas']}
                            />
                            <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                        </AreaChart>
                      </ResponsiveContainer>
                  ) : (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-lg">
                          <TrendingUp size={48} className="mb-2 opacity-20" />
                          <p>Sem vendas no período.</p>
                      </div>
                  )}
              </div>
          </div>

          {/* Goal & Product Mix */}
          <div className="flex flex-col gap-6">
              
              {/* Goal Card */}
              <div className="bg-gray-900 rounded-xl p-6 text-white relative overflow-hidden shadow-lg flex-1">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-blue-600 rounded-full blur-[60px] opacity-20 -mr-10 -mt-10"></div>
                  
                  <div className="relative z-10 h-full flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-lg">Meta Mensal</h3>
                            <p className="text-gray-400 text-xs mt-1">Progresso geral da equipe</p>
                          </div>
                          <div className="bg-gray-800 p-2 rounded-lg">
                              <Target size={20} className="text-blue-400" />
                          </div>
                      </div>

                      <div className="my-6 text-center">
                          <div className="text-5xl font-black mb-2">{goalProgress.toFixed(0)}%</div>
                          <div className="text-sm text-gray-400">atingido de {formatCurrency(globalGoal)}</div>
                      </div>

                      <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                          <div 
                             className="bg-gradient-to-r from-blue-500 to-green-400 h-full rounded-full transition-all duration-1000"
                             style={{ width: `${Math.min(goalProgress, 100)}%` }}
                          ></div>
                      </div>
                  </div>
              </div>

              {/* Products Mix */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex-1 flex flex-col">
                  <h3 className="font-bold text-gray-800 text-sm mb-4">Top Produtos / Tags</h3>
                  <div className="flex-1 min-h-[150px]">
                      {totalRevenue > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={productData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={60}
                                    paddingAngle={5}
                                >
                                    {productData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(val: number) => formatCurrency(val)} />
                                <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{fontSize: '10px'}} />
                            </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-xs text-gray-400">
                            Sem dados de produtos.
                        </div>
                      )}
                  </div>
              </div>
          </div>
      </div>

      {/* Funnel & Team Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Visual Funnel */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <Filter className="text-purple-500" size={20} />
                  Performance do Funil: {primaryFunnel?.name || 'Principal'}
              </h3>
              
              <div className="space-y-4">
                  {funnelData.length === 0 ? (
                      <div className="text-center py-10 text-gray-400">
                          <Filter size={32} className="mx-auto mb-2 opacity-20" />
                          <p>Nenhum dado no funil.</p>
                      </div>
                  ) : (
                      funnelData.map((stage, idx) => {
                          const maxVal = Math.max(...funnelData.map(d => d.count));
                          const widthPercent = maxVal > 0 ? (stage.count / maxVal) * 100 : 0;
                          
                          // Conversion rate from previous stage
                          const prevStage = funnelData[idx - 1];
                          const conversion = prevStage && prevStage.count > 0 
                             ? ((stage.count / prevStage.count) * 100).toFixed(0) + '%' 
                             : idx === 0 ? '100%' : '0%';

                          return (
                              <div key={stage.id} className="relative">
                                  <div className="flex justify-between text-sm mb-1 z-10 relative">
                                      <span className="font-medium text-gray-700">{stage.name}</span>
                                      <div className="text-right">
                                          <span className="font-bold text-gray-900 mr-3">{stage.count} leads</span>
                                          <span className="text-gray-500 text-xs">{formatCurrency(stage.value)}</span>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                      <div className="flex-1 h-8 bg-gray-50 rounded-r-lg relative overflow-hidden group">
                                          <div 
                                            className={`h-full rounded-r-lg transition-all duration-1000 ${idx % 2 === 0 ? 'bg-blue-100 group-hover:bg-blue-200' : 'bg-indigo-100 group-hover:bg-indigo-200'}`}
                                            style={{ width: `${Math.max(widthPercent, 2)}%` }}
                                          ></div>
                                      </div>
                                      <div className="w-16 text-right text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded">
                                          {idx === 0 ? 'Início' : `${conversion}`}
                                      </div>
                                  </div>
                              </div>
                          );
                      })
                  )}
              </div>
          </div>

          {/* Team Ranking List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
               <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <Users className="text-orange-500" size={20} />
                  Ranking da Equipe
               </h3>
               
               <div className="flex-1 overflow-auto">
                   <table className="w-full text-left text-sm">
                       <thead className="text-gray-400 border-b border-gray-100 text-xs uppercase">
                           <tr>
                               <th className="pb-3 font-semibold">Vendedor</th>
                               <th className="pb-3 font-semibold text-center">Vendas</th>
                               <th className="pb-3 font-semibold text-right">Receita</th>
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-50">
                           {users.map((user, idx) => {
                               const revenue = wonLeads
                                 .filter(l => l.assignedUserId === user.id)
                                 .reduce((acc, l) => acc + l.value, 0);
                               const sales = wonLeads.filter(l => l.assignedUserId === user.id).length;
                               
                               if (revenue === 0) return null; // Hide users with no sales for cleaner view

                               return (
                                   <tr key={user.id} className="group hover:bg-gray-50 transition-colors">
                                       <td className="py-3 flex items-center gap-3">
                                            <div className="relative">
                                                <img src={user.avatar} className="w-8 h-8 rounded-full border border-gray-200" alt={user.name} />
                                                {idx < 3 && (
                                                    <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white border border-white ${idx === 0 ? 'bg-yellow-400' : idx === 1 ? 'bg-gray-400' : 'bg-orange-400'}`}>
                                                        {idx + 1}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="font-medium text-gray-700">{user.name}</span>
                                       </td>
                                       <td className="py-3 text-center text-gray-600 font-medium">{sales}</td>
                                       <td className="py-3 text-right font-bold text-gray-800">{formatCurrency(revenue)}</td>
                                   </tr>
                               );
                           })}
                           {wonLeads.length === 0 && (
                               <tr>
                                   <td colSpan={3} className="py-8 text-center text-gray-400 text-xs">
                                       Nenhuma venda registrada neste período.
                                   </td>
                               </tr>
                           )}
                       </tbody>
                   </table>
               </div>
          </div>

      </div>

    </div>
  );
};
