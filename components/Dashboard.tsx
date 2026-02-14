
import React, { useMemo, useState } from 'react';
import { useCRM } from '../context/CRMContext';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  DollarSign, TrendingUp, Briefcase, Activity, Trophy, ArrowUpRight
} from 'lucide-react';

const currency = (v?: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0
  }).format(v ?? 0);

const percent = (v?: number) => `${(v ?? 0).toFixed(1)}%`;

const daysBetween = (a: Date, b: Date) =>
  Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));

export const Dashboard = () => {
  const { leads, users } = useCRM();
  const [filters, setFilters] = useState({ period: '30d' });

  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      if (filters.period !== 'all') {
        const diff = daysBetween(new Date(), new Date(l.createdAt));
        if (filters.period === '7d' && diff > 7) return false;
        if (filters.period === '30d' && diff > 30) return false;
      }
      return true;
    });
  }, [leads, filters]);

  const won = filteredLeads.filter(l => l.probability === 100);
  const open = filteredLeads.filter(l => l.probability > 0 && l.probability < 100);
  const lost = filteredLeads.filter(l => l.probability === 0);

  const revenue = won.reduce((a, b) => a + b.value, 0);
  const pipeline = open.reduce((a, b) => a + b.value, 0);
  const conversion = won.length + lost.length > 0 ? (won.length / (won.length + lost.length)) * 100 : 0;
  const avgTicket = won.length > 0 ? revenue / won.length : 0;

  const salesByPerson = useMemo(() => {
    return users
      .filter(u => u.role !== 'NEXUS_ADMIN')
      .map(user => {
        const userLeads = leads.filter(l => l.assignedUserId === user.id);
        const userWon = userLeads.filter(l => l.probability === 100);
        const userRevenue = userWon.reduce((acc, l) => acc + l.value, 0);
        return {
          id: user.id,
          name: user.name,
          avatar: user.avatar,
          revenue: userRevenue,
          salesCount: userWon.length
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [users, leads]);

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

  return (
    <div className="p-8 bg-gray-50 space-y-8 h-full overflow-y-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard de Vendas</h1>
          <p className="text-gray-500 text-sm">Visão consolidada de performance e resultados.</p>
        </div>
        <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200">
          {(['7d', '30d', 'all']).map((p) => (
            <button
              key={p}
              onClick={() => setFilters({ period: p })}
              className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${
                filters.period === p ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {p === '7d' ? '7 Dias' : p === '30d' ? '30 Dias' : 'Tudo'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Kpi icon={DollarSign} label="Receita" value={currency(revenue)} color="text-green-600" bg="bg-green-50" />
        <Kpi icon={Briefcase} label="Pipeline" value={currency(pipeline)} color="text-blue-600" bg="bg-blue-50" />
        <Kpi icon={TrendingUp} label="Conversão" value={percent(conversion)} color="text-purple-600" bg="bg-purple-50" />
        <Kpi icon={Activity} label="Ticket Médio" value={currency(avgTicket)} color="text-orange-600" bg="bg-orange-50" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-1">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Trophy className="text-yellow-500" size={20} />
              Ranking de Faturamento
            </h3>
            <div className="space-y-4">
              {salesByPerson.slice(0, 5).map((person, idx) => (
                <div key={person.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-400 w-4">#{idx + 1}</span>
                    <img src={person.avatar} className="w-8 h-8 rounded-full border" alt="" />
                    <div className="text-sm font-bold text-gray-800">{person.name}</div>
                  </div>
                  <div className="text-right font-bold text-gray-900 text-sm">{currency(person.revenue)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="xl:col-span-2">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
              <TrendingUp size={18} className="text-blue-600" />
              Evolução de Faturamento
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolution}>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <Tooltip formatter={(v?: number) => [currency(v), 'Faturamento']} />
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fill="#3b82f6" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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
