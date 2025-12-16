
import React, { useMemo, useState } from 'react';
import { useCRM } from '../context/CRMContext';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  Briefcase,
  Activity,
  Target,
  Calendar,
  Filter,
  Users
} from 'lucide-react';

/* =======================
   FORMATTERS (SAFE)
======================= */

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0
  }).format(value);

const formatPercent = (value: number): string =>
  `${value.toFixed(1)}%`;

const safeNumber = (value: unknown): number =>
  typeof value === 'number' && !isNaN(value) ? value : 0;

/* =======================
   COMPONENT
======================= */

export const Dashboard = () => {
  const { leads, funnels, users, teams } = useCRM();
  
  // STATE: Date Filter
  const [dateRange, setDateRange] = useState('30_days');

  /* =======================
     DATE FILTER LOGIC
  ======================= */
  const filteredLeads = useMemo(() => {
    const now = new Date();
    
    return leads.filter(lead => {
      const leadDate = new Date(lead.createdAt);
      
      switch (dateRange) {
        case '7_days': {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          return leadDate >= sevenDaysAgo;
        }
        case '30_days': {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(now.getDate() - 30);
          return leadDate >= thirtyDaysAgo;
        }
        case 'this_month': {
          return leadDate.getMonth() === now.getMonth() && leadDate.getFullYear() === now.getFullYear();
        }
        case 'last_month': {
          const lastMonth = new Date();
          lastMonth.setMonth(now.getMonth() - 1);
          return leadDate.getMonth() === lastMonth.getMonth() && leadDate.getFullYear() === lastMonth.getFullYear();
        }
        case 'this_year': {
          return leadDate.getFullYear() === now.getFullYear();
        }
        default: // 'all'
          return true;
      }
    });
  }, [leads, dateRange]);

  /* =======================
     CORE DATA (Based on filteredLeads)
  ======================= */

  const wonLeads = useMemo(
    () => filteredLeads.filter(l => l.probability === 100),
    [filteredLeads]
  );

  const lostLeads = useMemo(
    () => filteredLeads.filter(l => l.probability === 0),
    [filteredLeads]
  );

  const openLeads = useMemo(
    () => filteredLeads.filter(l => l.probability > 0 && l.probability < 100),
    [filteredLeads]
  );

  const totalRevenue = useMemo(
    () => wonLeads.reduce((acc, l) => acc + safeNumber(l.value), 0),
    [wonLeads]
  );

  const pipelineValue = useMemo(
    () => openLeads.reduce((acc, l) => acc + safeNumber(l.value), 0),
    [openLeads]
  );

  const avgTicket = useMemo(
    () => (wonLeads.length ? totalRevenue / wonLeads.length : 0),
    [wonLeads, totalRevenue]
  );

  const winRate = useMemo(() => {
    const closed = wonLeads.length + lostLeads.length;
    return closed ? (wonLeads.length / closed) * 100 : 0;
  }, [wonLeads, lostLeads]);

  /* =======================
     SALESPERSON PERFORMANCE
  ======================= */

  const salesByPerson = useMemo(() => {
    return users.map(user => {
      // Leads assigned to this user in the selected period
      const userLeads = filteredLeads.filter(l => l.assignedUserId === user.id);
      const userWon = userLeads.filter(l => l.probability === 100);
      const userRevenue = userWon.reduce((acc, l) => acc + safeNumber(l.value), 0);
      
      // Conversion Rate: Won / Total Assigned (excluding Open if you prefer only closed math, but typically it's vs total)
      // Here using Total Assigned in period for simplicity
      const conversionRate = userLeads.length > 0 
        ? (userWon.length / userLeads.length) * 100 
        : 0;

      return {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        leadsCount: userLeads.length,
        salesCount: userWon.length,
        revenue: userRevenue,
        conversionRate
      };
    }).sort((a, b) => b.revenue - a.revenue); // Sort by revenue desc
  }, [users, filteredLeads]);

  /* =======================
     EVOLUTION CHART
  ======================= */

  const evolutionData = useMemo(() => {
    const map: Record<string, number> = {};
    const daysToMap = dateRange === '7_days' ? 7 : dateRange === '30_days' ? 30 : 15; // default scale
    
    // Fill empty days for better visual if short range
    if (dateRange === '7_days' || dateRange === '30_days') {
        for (let i = daysToMap - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            map[key] = 0;
        }
    }

    wonLeads.forEach(l => {
      const d = new Date(l.createdAt);
      // Group by month if viewing year, else by day
      const key = dateRange === 'this_year' 
        ? d.toLocaleDateString('pt-BR', { month: 'short' })
        : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

      if (map[key] !== undefined) {
        map[key] += safeNumber(l.value);
      } else if (dateRange !== '7_days' && dateRange !== '30_days') {
         // Dynamic keys for other ranges
         map[key] = (map[key] || 0) + safeNumber(l.value);
      }
    });

    return Object.entries(map).map(([date, value]) => ({ date, value }));
  }, [wonLeads, dateRange]);

  /* =======================
     PRODUCT MIX
  ======================= */

  const productData = useMemo(() => {
    const acc: Record<string, number> = {};
    wonLeads.forEach(l => {
      const tag = Array.isArray(l.tags) && l.tags.length ? l.tags[0] : 'Outros';
      acc[tag] = (acc[tag] || 0) + safeNumber(l.value);
    });
    const result = Object.entries(acc)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    return result.length ? result : [{ name: 'Sem vendas', value: 1 }];
  }, [wonLeads]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1'];

  /* =======================
     RENDER
  ======================= */

  return (
    <div className="p-6 bg-gray-50 h-full overflow-y-auto text-gray-800">

      {/* HEADER & FILTER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Comercial</h1>
            <p className="text-sm text-gray-500">Indicadores de performance e resultados.</p>
        </div>
        
        <div className="bg-white p-1 rounded-lg border border-gray-200 shadow-sm flex text-sm font-medium">
             <button 
                onClick={() => setDateRange('7_days')}
                className={`px-3 py-1.5 rounded-md transition-all ${dateRange === '7_days' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
             >
                 7D
             </button>
             <button 
                onClick={() => setDateRange('30_days')}
                className={`px-3 py-1.5 rounded-md transition-all ${dateRange === '30_days' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
             >
                 30D
             </button>
             <button 
                onClick={() => setDateRange('this_month')}
                className={`px-3 py-1.5 rounded-md transition-all ${dateRange === 'this_month' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
             >
                 Este Mês
             </button>
             <button 
                onClick={() => setDateRange('this_year')}
                className={`px-3 py-1.5 rounded-md transition-all ${dateRange === 'this_year' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
             >
                 Ano
             </button>
             <button 
                onClick={() => setDateRange('all')}
                className={`px-3 py-1.5 rounded-md transition-all ${dateRange === 'all' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
             >
                 Tudo
             </button>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Kpi title="Receita (Fechado)" value={formatCurrency(totalRevenue)} icon={DollarSign} color="text-green-600" bg="bg-green-50" />
        <Kpi title="Em Pipeline" value={formatCurrency(pipelineValue)} icon={Briefcase} color="text-blue-600" bg="bg-blue-50" />
        <Kpi title="Ticket Médio" value={formatCurrency(avgTicket)} icon={Activity} color="text-purple-600" bg="bg-purple-50" />
        <Kpi title="Taxa de Conversão" value={formatPercent(winRate)} icon={Target} color="text-orange-600" bg="bg-orange-50" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        
        {/* EVOLUTION CHART */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <TrendingUp className="text-blue-600" size={20} />
                Evolução de Vendas
              </h3>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolutionData}>
                <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(v) => `R$${v/1000}k`} />
                <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(v: number) => [formatCurrency(v), 'Venda']}
                />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PRODUCT MIX */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col">
          <h3 className="font-bold text-gray-800 mb-4">Mix de Produtos / Tags</h3>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={productData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                >
                  {productData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SALESPERSON RANKING TABLE */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
             <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Users className="text-indigo-600" size={20} />
                Performance por Vendedor
             </h3>
             <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">
                Ordenado por Receita
             </span>
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 border-b border-gray-100 uppercase text-xs font-semibold">
                   <tr>
                      <th className="px-6 py-4">Vendedor</th>
                      <th className="px-6 py-4 text-center">Leads Totais</th>
                      <th className="px-6 py-4 text-center">Vendas</th>
                      <th className="px-6 py-4 text-center">Conversão</th>
                      <th className="px-6 py-4 text-right">Receita Gerada</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                   {salesByPerson.map((person, idx) => (
                      <tr key={person.id} className="hover:bg-gray-50 transition-colors">
                         <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                               <img src={person.avatar} className="w-8 h-8 rounded-full border border-gray-200" alt={person.name} />
                               <div>
                                  <div className="font-bold text-gray-800">{person.name}</div>
                                  <div className="text-xs text-gray-400">Rank #{idx + 1}</div>
                               </div>
                            </div>
                         </td>
                         <td className="px-6 py-4 text-center text-gray-600">
                            {person.leadsCount}
                         </td>
                         <td className="px-6 py-4 text-center font-medium text-gray-800">
                            {person.salesCount}
                         </td>
                         <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                               <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${person.conversionRate > 20 ? 'bg-green-500' : person.conversionRate > 10 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                                    style={{ width: `${Math.min(person.conversionRate, 100)}%` }}
                                  ></div>
                               </div>
                               <span className="text-xs font-bold text-gray-600">{person.conversionRate.toFixed(1)}%</span>
                            </div>
                         </td>
                         <td className="px-6 py-4 text-right">
                            <div className="font-bold text-gray-800">{formatCurrency(person.revenue)}</div>
                         </td>
                      </tr>
                   ))}
                   {salesByPerson.length === 0 && (
                      <tr>
                         <td colSpan={5} className="p-8 text-center text-gray-400">
                            Nenhum dado encontrado para o período selecionado.
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

/* =======================
   SUB COMPONENTS
======================= */

const Kpi = ({
  title,
  value,
  icon: Icon,
  color,
  bg
}: {
  title: string;
  value: string;
  icon: any;
  color?: string;
  bg?: string;
}) => (
  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{title}</span>
      <div className={`p-2 rounded-lg ${bg || 'bg-gray-50'}`}>
         <Icon size={18} className={color || 'text-gray-500'} />
      </div>
    </div>
    <div className="text-2xl font-bold text-gray-900">{value}</div>
  </div>
);
