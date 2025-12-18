
import React, { useMemo, useState } from 'react';
import { useCRM } from '../context/CRMContext';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  BarChart, Bar
} from 'recharts';
import {
  DollarSign, Target, TrendingUp, Briefcase,
  Users, Calendar, Filter, Activity, AlertCircle,
  Trophy, Medal, Star, ArrowUpRight
} from 'lucide-react';

/* ===========================
   HELPERS
=========================== */

const currency = (v?: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0
  }).format(v ?? 0);

const percent = (v?: number) => `${(v ?? 0).toFixed(1)}%`;

const daysBetween = (a: Date, b: Date) =>
  Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));

/* ===========================
   COMPONENT
=========================== */

export const Dashboard = () => {
  const { leads, users, funnels, teams } = useCRM();

  /* ===========================
     FILTER STATE
  =========================== */

  const [filters, setFilters] = useState({
    period: '30d',
    status: 'all',
    userId: 'all',
    funnelId: 'all'
  });

  /* ===========================
     FILTERED DATA (CORE)
  =========================== */

  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      // STATUS
      if (filters.status === 'won' && l.probability !== 100) return false;
      if (filters.status === 'lost' && l.probability !== 0) return false;
      if (filters.status === 'open' && (l.probability === 0 || l.probability === 100)) return false;

      // USER
      if (filters.userId !== 'all' && l.assignedUserId !== filters.userId) return false;

      // FUNNEL
      if (filters.funnelId !== 'all' && l.funnelId !== filters.funnelId) return false;

      // PERIOD
      if (filters.period !== 'all') {
        const diff = daysBetween(new Date(), new Date(l.createdAt));
        if (filters.period === '7d' && diff > 7) return false;
        if (filters.period === '30d' && diff > 30) return false;
        if (filters.period === '90d' && diff > 90) return false;
      }

      return true;
    });
  }, [leads, filters]);

  /* ===========================
     CORE METRICS
  =========================== */

  const won = filteredLeads.filter(l => l.probability === 100);
  const open = filteredLeads.filter(l => l.probability > 0 && l.probability < 100);
  const lost = filteredLeads.filter(l => l.probability === 0);

  const revenue = won.reduce((a, b) => a + b.value, 0);
  const pipeline = open.reduce((a, b) => a + b.value, 0);
  const conversion = won.length + lost.length > 0 ? (won.length / (won.length + lost.length)) * 100 : 0;
  const avgTicket = won.length > 0 ? revenue / won.length : 0;

  /* ===========================
     SALESPERSON RANKING
  =========================== */

  const salesByPerson = useMemo(() => {
    return users
      .filter(u => u.role !== 'NEXUS_ADMIN')
      .map(user => {
        const userLeads = leads.filter(l => l.assignedUserId === user.id);
        const userWon = userLeads.filter(l => l.probability === 100);
        const userLost = userLeads.filter(l => l.probability === 0);
        const userRevenue = userWon.reduce((acc, l) => acc + l.value, 0);
        const userConversion = (userWon.length + userLost.length) > 0 
          ? (userWon.length / (userWon.length + userLost.length)) * 100 
          : 0;

        return {
          id: user.id,
          name: user.name,
          avatar: user.avatar,
          revenue: userRevenue,
          salesCount: userWon.length,
          leadsCount: userLeads.length,
          conversion: userConversion
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [users, leads]);

  const topThree = salesByPerson.slice(0, 3);

  /* ===========================
     CHARTS DATA
  =========================== */

  const evolution = useMemo(() => {
    const map: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      map[d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })] = 0;
    }
    won.forEach(l => {
      const d = new Date(l.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (map[d] !== undefined) map[d] += l.value;
    });
    return Object.entries(map).map(([date, value]) => ({ date, value }));
  }, [won]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  /* ===========================
     RENDER
  =========================== */

  return (
    <div className="p-8 bg-gray-50 space-y-8 h-full overflow-y-auto">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard de Vendas</h1>
          <p className="text-gray-500 text-sm">Visão consolidada de performance e resultados.</p>
        </div>

        <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200">
          {(['7d', '30d', 'all']).map((p) => (
            <button
              key={p}
              onClick={() => setFilters(f => ({ ...f, period: p }))}
              className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${
                filters.period === p ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {p === '7d' ? '7 Dias' : p === '30d' ? '30 Dias' : 'Tudo'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Kpi icon={DollarSign} label="Receita" value={currency(revenue)} color="text-green-600" bg="bg-green-50" />
        <Kpi icon={Briefcase} label="Pipeline" value={currency(pipeline)} color="text-blue-600" bg="bg-blue-50" />
        <Kpi icon={TrendingUp} label="Conversão" value={percent(conversion)} color="text-purple-600" bg="bg-purple-50" />
        <Kpi icon={Activity} label="Ticket Médio" value={currency(avgTicket)} color="text-orange-600" bg="bg-orange-50" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* LEADERBOARD (RANKING) */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between mb-8">
               <h3 className="font-bold text-gray-900 flex items-center gap-2">
                 <Trophy className="text-yellow-500" size={20} />
                 Ranking de Vendas
               </h3>
               <button className="text-blue-600 text-xs font-bold hover:underline">Ver Todos</button>
            </div>

            {/* Podium Visual */}
            <div className="flex items-end justify-center gap-4 mb-10 pt-4">
              {/* 2nd Place */}
              {topThree[1] && (
                <div className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <img src={topThree[1].avatar} className="w-12 h-12 rounded-full border-2 border-gray-200" alt="" />
                    <div className="absolute -top-2 -right-2 bg-gray-100 text-gray-500 w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-[10px] font-bold">2</div>
                  </div>
                  <div className="bg-gray-50 w-20 h-16 rounded-t-lg flex flex-col items-center justify-center border-x border-t border-gray-100 shadow-sm">
                     <span className="text-[10px] font-bold text-gray-400">Prata</span>
                  </div>
                </div>
              )}

              {/* 1st Place */}
              {topThree[0] && (
                <div className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <img src={topThree[0].avatar} className="w-16 h-16 rounded-full border-4 border-yellow-400 shadow-lg" alt="" />
                    <div className="absolute -top-3 -right-2 bg-yellow-400 text-white w-8 h-8 rounded-full border-2 border-white flex items-center justify-center shadow-md">
                       <Trophy size={14} />
                    </div>
                  </div>
                  <div className="bg-yellow-50 w-24 h-24 rounded-t-lg flex flex-col items-center justify-center border-x border-t border-yellow-100 shadow-md">
                     <span className="text-xs font-bold text-yellow-700">Ouro</span>
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {topThree[2] && (
                <div className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <img src={topThree[2].avatar} className="w-12 h-12 rounded-full border-2 border-orange-200" alt="" />
                    <div className="absolute -top-2 -right-2 bg-orange-100 text-orange-600 w-6 h-6 rounded-full border border-orange-200 flex items-center justify-center text-[10px] font-bold">3</div>
                  </div>
                  <div className="bg-orange-50 w-20 h-12 rounded-t-lg flex flex-col items-center justify-center border-x border-t border-orange-100 shadow-sm">
                     <span className="text-[10px] font-bold text-orange-400">Bronze</span>
                  </div>
                </div>
              )}
            </div>

            {/* Ranking List */}
            <div className="space-y-4 flex-1">
              {salesByPerson.slice(0, 5).map((person, idx) => (
                <div key={person.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-400 w-4">#{idx + 1}</span>
                    <img src={person.avatar} className="w-8 h-8 rounded-full" alt="" />
                    <div>
                      <div className="text-sm font-bold text-gray-800">{person.name}</div>
                      <div className="text-[10px] text-gray-500 uppercase">{person.salesCount} vendas concluídas</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900">{currency(person.revenue)}</div>
                    <div className="text-[10px] font-bold text-green-600 flex items-center justify-end gap-1">
                      {person.conversion.toFixed(1)}% <ArrowUpRight size={10} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CHARTS */}
        <div className="xl:col-span-2 space-y-8">
          
          {/* Revenue Evolution */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
              <TrendingUp size={18} className="text-blue-600" />
              Evolução de Faturamento
            </h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolution}>
                  <defs>
                    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(v) => `R$${v/1000}k`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    formatter={(v?: number) => [currency(v), 'Faturamento']}
                  />
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fill="url(#g)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Performance Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Activity className="text-indigo-600" size={18} />
                Performance Detalhada
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 border-b border-gray-100 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="px-6 py-4">Vendedor</th>
                    <th className="px-6 py-4 text-center">Leads</th>
                    <th className="px-6 py-4 text-center">Vendas</th>
                    <th className="px-6 py-4 text-center">Conversão</th>
                    <th className="px-6 py-4 text-right">Faturamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {salesByPerson.map((person) => (
                    <tr key={person.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={person.avatar} className="w-8 h-8 rounded-full border border-gray-200" alt="" />
                          <div className="font-bold text-gray-800">{person.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-gray-600">{person.leadsCount}</td>
                      <td className="px-6 py-4 text-center font-bold text-gray-900">{person.salesCount}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${person.conversion > 20 ? 'bg-green-100 text-green-700' : person.conversion > 10 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                          {person.conversion.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900">{currency(person.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

/* ===========================
   KPI COMPONENT
=========================== */

const Kpi = ({ icon: Icon, label, value, color, bg }: any) => (
  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
    <div className={`p-3 rounded-xl ${bg}`}>
      <Icon size={24} className={color} />
    </div>
    <div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-black text-gray-900">{value}</p>
    </div>
  </div>
);
