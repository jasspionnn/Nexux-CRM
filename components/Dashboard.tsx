
import React, { useState, useMemo } from 'react';
import { useCRM } from '../context/CRMContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { DollarSign, TrendingUp, Users, Target, Activity, Award, PieChart as PieChartIcon, Filter, CalendarRange } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1', '#ec4899'];
const STATUS_COLORS = {
    won: '#10b981',   // Green
    open: '#3b82f6',  // Blue
    lost: '#ef4444'   // Red
};

type TimeRange = 'month' | 'quarter' | 'year';

export const Dashboard = () => {
  const { leads, funnels, users } = useCRM();
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('month');

  // --- FILTER LOGIC ---
  const filteredLeads = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const currentQuarter = Math.floor(currentMonth / 3);

    return leads.filter(l => {
      // 1. Funnel Filter
      if (selectedFunnelId !== 'all' && l.funnelId !== selectedFunnelId) {
        return false;
      }

      // 2. Date Filter
      const leadDate = new Date(l.createdAt);
      const leadMonth = leadDate.getMonth();
      const leadYear = leadDate.getFullYear();
      const leadQuarter = Math.floor(leadMonth / 3);

      if (timeRange === 'month') {
        return leadMonth === currentMonth && leadYear === currentYear;
      } else if (timeRange === 'quarter') {
        return leadQuarter === currentQuarter && leadYear === currentYear;
      } else if (timeRange === 'year') {
        return leadYear === currentYear;
      }
      
      return true;
    });
  }, [leads, selectedFunnelId, timeRange]);

  // --- KPI CALCULATIONS ---
  
  // 1. Basic Totals
  const totalPipelineValue = filteredLeads.reduce((sum, l) => sum + l.value, 0);
  const totalDeals = filteredLeads.length;
  
  // 2. Won/Lost Logic
  const wonDeals = filteredLeads.filter(l => l.probability === 100);
  const lostDeals = filteredLeads.filter(l => l.probability === 0);
  const openDeals = filteredLeads.filter(l => l.probability > 0 && l.probability < 100);

  const totalWonValue = wonDeals.reduce((sum, l) => sum + l.value, 0);
  
  // 3. Advanced Metrics
  const conversionRate = totalDeals > 0 ? ((wonDeals.length / totalDeals) * 100).toFixed(1) : '0';
  const avgTicket = wonDeals.length > 0 ? totalWonValue / wonDeals.length : 0;
  
  // 4. Weighted Forecast
  const weightedForecast = openDeals.reduce((sum, l) => sum + (l.value * (l.probability / 100)), 0) + totalWonValue;

  // --- CHART DATA PREPARATION ---

  // Chart 1: Funnel Analysis
  // Logic: If 'all' is selected, show Revenue by Funnel. If specific funnel, show Revenue by Stage.
  const chartMainData = useMemo(() => {
      if (selectedFunnelId === 'all') {
          // Compare Funnels
          return funnels.map(f => {
              // Filter leads for this funnel AND the selected time range
              const fLeads = filteredLeads.filter(l => l.funnelId === f.id);
              const total = fLeads.reduce((sum, l) => sum + l.value, 0);
              const weighted = fLeads.reduce((sum, l) => sum + (l.value * (l.probability / 100)), 0);
              return {
                  name: f.name,
                  total,
                  forecast: weighted,
                  count: fLeads.length
              };
          });
      } else {
          // Breakdown by Stage
          const currentFunnel = funnels.find(f => f.id === selectedFunnelId);
          return currentFunnel?.stages.map(stage => {
            const stageLeads = filteredLeads.filter(l => l.stageId === stage.id);
            const stageValue = stageLeads.reduce((sum, l) => sum + l.value, 0);
            const stageWeighted = stageLeads.reduce((sum, l) => sum + (l.value * (l.probability / 100)), 0);
            return {
                name: stage.name,
                total: stageValue,
                forecast: stageWeighted,
                count: stageLeads.length
            };
        }) || [];
      }
  }, [funnels, filteredLeads, selectedFunnelId]);

  // Chart 2: Top Sellers (User Performance)
  const userPerformance = useMemo(() => {
    return users.map(user => {
        const userLeads = filteredLeads.filter(l => l.assignedUserId === user.id);
        const totalValue = userLeads.reduce((acc, l) => acc + l.value, 0);
        const wonValue = userLeads.filter(l => l.probability === 100).reduce((acc, l) => acc + l.value, 0);
        return {
            name: user.name.split(' ')[0], // First name only for chart
            fullName: user.name,
            totalValue,
            wonValue,
            leadsCount: userLeads.length
        };
    }).sort((a, b) => b.totalValue - a.totalValue).slice(0, 5);
  }, [users, filteredLeads]);

  // Chart 3: Pipeline Status (Pie)
  const statusData = [
      { name: 'Ganho', value: wonDeals.length, color: STATUS_COLORS.won },
      { name: 'Em Aberto', value: openDeals.length, color: STATUS_COLORS.open },
      { name: 'Perdido', value: lostDeals.length, color: STATUS_COLORS.lost },
  ].filter(d => d.value > 0);

  // Custom Card Component
  const StatCard = ({ title, value, subValue, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
      <div className={`absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity ${color.replace('bg-', 'text-')}`}>
         <Icon size={64} />
      </div>
      <div className="flex items-center space-x-4 relative z-10">
        <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
          <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
        </div>
        <div>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-gray-800 mt-1">{value}</h3>
          {subValue && <p className="text-xs text-gray-400 mt-1 font-medium">{subValue}</p>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-8 space-y-8 animate-fade-in pb-20 h-full overflow-y-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Activity className="text-blue-600" />
                Performance de Vendas
            </h2>
            <p className="text-gray-500 mt-1">Análise em tempo real dos seus resultados e conversões.</p>
        </div>
        
        <div className="flex items-center gap-3">
             <div className="flex items-center bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
                <Filter size={16} className="text-gray-400 mr-2" />
                <select 
                    value={selectedFunnelId}
                    onChange={(e) => setSelectedFunnelId(e.target.value)}
                    className="bg-transparent text-sm font-medium text-gray-700 outline-none cursor-pointer min-w-[150px]"
                >
                    <option value="all">Todos os Funis</option>
                    <option disabled className="text-gray-300">──────────</option>
                    {funnels.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                </select>
             </div>
             
             <div className="flex bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                <button 
                    onClick={() => setTimeRange('month')}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${timeRange === 'month' ? 'bg-gray-100 text-gray-800 font-bold shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    Este Mês
                </button>
                <button 
                    onClick={() => setTimeRange('quarter')}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${timeRange === 'quarter' ? 'bg-gray-100 text-gray-800 font-bold shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    Trimestre
                </button>
                <button 
                    onClick={() => setTimeRange('year')}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${timeRange === 'year' ? 'bg-gray-100 text-gray-800 font-bold shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    Este Ano
                </button>
            </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Forecast Ponderado" 
          value={`R$ ${weightedForecast.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} 
          subValue={`Pipeline Total: R$ ${totalPipelineValue.toLocaleString()}`}
          icon={Target} 
          color="text-blue-600 bg-blue-600" 
        />
        <StatCard 
          title="Receita Confirmada" 
          value={`R$ ${totalWonValue.toLocaleString()}`} 
          subValue={`${wonDeals.length} negócios fechados`}
          icon={Award} 
          color="text-green-600 bg-green-600" 
        />
        <StatCard 
          title="Ticket Médio" 
          value={`R$ ${avgTicket.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} 
          subValue="Em negócios ganhos"
          icon={DollarSign} 
          color="text-purple-600 bg-purple-600" 
        />
        <StatCard 
          title="Taxa de Conversão" 
          value={`${conversionRate}%`} 
          subValue="Leads totais vs Ganhos"
          icon={PieChartIcon} 
          color="text-orange-600 bg-orange-600" 
        />
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Chart 1: Funnel Analysis */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <div className="mb-6 flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                    {selectedFunnelId === 'all' ? 'Comparativo de Funis' : 'Análise do Funil'}
                </h3>
                <p className="text-xs text-gray-500">
                    {selectedFunnelId === 'all' 
                        ? 'Receita total e forecast por funil.' 
                        : 'Distribuição de valor por etapa do funil.'}
                </p>
              </div>
          </div>
          <div className="flex-1 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartMainData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} tickFormatter={(value) => `R$${value/1000}k`} />
                <Tooltip 
                    cursor={{fill: '#f9fafb'}}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                    formatter={(value: number) => [`R$ ${value.toLocaleString()}`, '']}
                />
                <Legend iconType="circle" />
                <Bar name="Valor Total" dataKey="total" fill="#e5e7eb" radius={[4, 4, 0, 0]} barSize={30} />
                <Bar name="Forecast (Ponderado)" dataKey="forecast" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Pipeline Status (Fixed Center Text) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <h3 className="text-lg font-bold text-gray-800 mb-2">Status dos Leads</h3>
          <div className="flex-1 min-h-[250px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px' }} />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text - Adjusted Positioning */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ paddingBottom: '30px' }}>
                <span className="text-3xl font-bold text-gray-800 leading-none">{totalDeals}</span>
                <span className="text-[10px] text-gray-500 uppercase font-bold mt-1">Total</span>
            </div>
          </div>
        </div>

      </div>

      {/* Row 2: Team Ranking */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Users size={20} className="text-blue-500"/>
                  Ranking de Vendas
              </h3>
          </div>
          <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={userPerformance} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="fullName" type="category" width={150} tick={{fontSize: 13, fontWeight: 500, fill: '#374151'}} axisLine={false} tickLine={false} />
                    <Tooltip 
                        cursor={{fill: '#f9fafb'}}
                        contentStyle={{ borderRadius: '8px' }}
                        formatter={(value: number) => [`R$ ${value.toLocaleString()}`, '']}
                    />
                    <Legend />
                    <Bar name="Pipeline Total" dataKey="totalValue" fill="#e5e7eb" radius={[0, 4, 4, 0]} barSize={20} />
                    <Bar name="Fechado Ganho" dataKey="wonValue" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                 </BarChart>
             </ResponsiveContainer>
          </div>
      </div>

    </div>
  );
};
