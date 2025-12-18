
import React, { useMemo } from 'react';
import { useCRM, DateRange } from '../context/CRMContext';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  TrendingUp, DollarSign, Target, Briefcase, Activity, 
  Calendar, Users, ArrowUpRight, ArrowDownRight, Filter
} from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1'];

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

const formatPercent = (val: number) => `${val.toFixed(1)}%`;

export const Dashboard = () => {
  const { filteredLeads, metrics, users, filters, setFilters, teams } = useCRM();

  // --- DATA CALCULATIONS ---

  // Sales Evolution (Daily)
  const evolutionData = useMemo(() => {
    const data: Record<string, number> = {};
    const won = filteredLeads.filter(l => l.probability === 100);
    
    // Fill last 7 days as default if range is small
    for(let i=6; i>=0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        data[dateStr] = 0;
    }

    won.forEach(lead => {
        const d = new Date(lead.createdAt);
        const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        if (data[dateStr] !== undefined) {
            data[dateStr] += lead.value;
        }
    });

    return Object.entries(data).map(([date, value]) => ({ date, value }));
  }, [filteredLeads]);

  // Product/Tag Mix
  const productData = useMemo(() => {
    const counts: Record<string, number> = {};
    const won = filteredLeads.filter(l => l.probability === 100);
    
    won.forEach(lead => {
      const tag = (lead.tags && lead.tags.length > 0) ? lead.tags[0] : 'Outros';
      counts[tag] = (counts[tag] || 0) + lead.value;
    });

    const result = Object.entries(counts).map(([name, value]) => ({ name, value }));
    return result.length > 0 ? result : [{ name: 'Sem Vendas', value: 1 }];
  }, [filteredLeads]);

  // Performance by Salesperson
  const salesByPerson = useMemo(() => {
    return users.map(user => {
      const userLeads = filteredLeads.filter(l => l.assignedUserId === user.id);
      const userWon = userLeads.filter(l => l.probability === 100);
      const userRevenue = userWon.reduce((acc, l) => acc + l.value, 0);
      const conversionRate = userLeads.length > 0 ? (userWon.length / userLeads.length) * 100 : 0;

      return {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        leadsCount: userLeads.length,
        salesCount: userWon.length,
        revenue: userRevenue,
        conversionRate
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [users, filteredLeads]);

  // --- RENDER HELPERS ---

  const KpiCard = ({ title, value, icon: Icon, color, trend }: any) => (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
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
        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
      </div>
    </div>
  );

  return (
    <div className="p-6 bg-gray-50 h-full overflow-y-auto text-gray-800">
      
      {/* Header & Global Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Executivo</h1>
          <p className="text-sm text-gray-500">Acompanhe seus resultados e performance da equipe.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
          {(['7_days', '30_days', 'this_month', 'last_month'] as DateRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setFilters({ ...filters, dateRange: range })}
              className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${
                filters.dateRange === range 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {range === '7_days' && '7 Dias'}
              {range === '30_days' && '30 Dias'}
              {range === 'this_month' && 'Este Mês'}
              {range === 'last_month' && 'Mês Passado'}
            </button>
          ))}
          <div className="w-px h-6 bg-gray-200 mx-1"></div>
          <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KpiCard title="Receita Realizada" value={formatCurrency(metrics.totalRevenue)} icon={DollarSign} color="bg-green-600" trend={8.4} />
        <KpiCard title="Valor em Pipeline" value={formatCurrency(metrics.pipelineValue)} icon={Briefcase} color="bg-blue-600" />
        <KpiCard title="Ticket Médio" value={formatCurrency(metrics.avgTicket)} icon={Activity} color="text-purple-600 bg-purple-600" />
        <KpiCard title="Taxa de Conversão" value={formatPercent(metrics.winRate)} icon={Target} color="bg-orange-600" trend={-1.2} />
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Sales Evolution */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
            <TrendingUp size={18} className="text-blue-600" /> Evolução de Faturamento
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolutionData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(v) => `R$${v/1000}k`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(v: number) => [formatCurrency(v), 'Faturamento']}
                />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Product Mix */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col">
          <h3 className="font-bold text-gray-800 mb-4">Mix de Produtos / Tags</h3>
          <div className="flex-1 min-h-[250px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={productData}
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {productData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '11px'}} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] text-center pointer-events-none">
              <div className="text-xl font-bold text-gray-800">{productData.length}</div>
              <div className="text-[10px] text-gray-400 uppercase font-bold">Categorias</div>
            </div>
          </div>
        </div>
      </div>

      {/* SALESPERSON PERFORMANCE TABLE */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Users className="text-indigo-600" size={18} /> Performance por Vendedor
          </h3>
          <span className="text-xs font-bold text-gray-400 uppercase">Ordenado por Faturamento</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 border-b border-gray-100 uppercase text-[10px] font-bold">
              <tr>
                <th className="px-6 py-4">Vendedor</th>
                <th className="px-6 py-4 text-center">Leads Geridos</th>
                <th className="px-6 py-4 text-center">Vendas</th>
                <th className="px-6 py-4 text-center">Taxa Conversão</th>
                <th className="px-6 py-4 text-right">Faturamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {salesByPerson.map((person, idx) => (
                <tr key={person.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img src={person.avatar} className="w-8 h-8 rounded-full border border-gray-200" alt={person.name} />
                        {idx === 0 && <div className="absolute -top-1 -right-1 bg-yellow-400 w-3 h-3 rounded-full border border-white" />}
                      </div>
                      <div>
                        <div className="font-bold text-gray-800">{person.name}</div>
                        <div className="text-[10px] text-gray-400">Time: {teams.find(t => t.id === users.find(u => u.id === person.id)?.teamId)?.name || 'N/A'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center text-gray-600 font-medium">{person.leadsCount}</td>
                  <td className="px-6 py-4 text-center font-bold text-gray-900">{person.salesCount}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${person.conversionRate > 20 ? 'bg-green-500' : person.conversionRate > 10 ? 'bg-blue-500' : 'bg-gray-400'}`} 
                          style={{ width: `${Math.min(person.conversionRate, 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-gray-600">{person.conversionRate.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="font-bold text-gray-800">{formatCurrency(person.revenue)}</div>
                  </td>
                </tr>
              ))}
              {salesByPerson.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-gray-400 italic">
                    Nenhum dado de performance disponível para o período selecionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
