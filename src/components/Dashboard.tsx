
import React, { useMemo, useState } from 'react';
import { useCRM } from '../context/CRMContext';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  DollarSign, TrendingUp, Briefcase, Activity, Trophy
} from 'lucide-react';
import { Lead, User } from '../types';

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
  const { leads = [], users = [] } = useCRM();
  const [filters, setFilters] = useState({ period: '30d' });

  const filteredLeads = useMemo(() => {
    const safeLeads = Array.isArray(leads) ? leads : [];
    return safeLeads.filter((l: Lead) => {
      if (!l.createdAt) return false;
      if (filters.period !== 'all') {
        const diff = daysBetween(new Date(), new Date(l.createdAt));
        if (filters.period === '7d' && diff > 7) return false;
        if (filters.period === '30d' && diff > 30) return false;
      }
      return true;
    });
  }, [leads, filters]);

  const won = filteredLeads.filter((l: Lead) => l.probability === 100);
  const open = filteredLeads.filter((l: Lead) => l.probability > 0 && l.probability < 100);
  const lost = filteredLeads.filter((l: Lead) => l.probability === 0);

  const revenue = won.reduce((a: number, b: Lead) => a + (b.value || 0), 0);
  const pipeline = open.reduce((a: number, b: Lead) => a + (b.value || 0), 0);
  const conversion = won.length + lost.length > 0 ? (won.length / (won.length + lost.length)) * 100 : 0;
  const avgTicket = won.length > 0 ? revenue / won.length : 0;

  const salesByPerson = useMemo(() => {
    const safeUsers = Array.isArray(users) ? users : [];
    return safeUsers
      .filter((u: User) => u.role !== 'NEXUS_ADMIN')
      .map((user: User) => {
        const userLeads = filteredLeads.filter((l: Lead) => l.assignedUserId === user.id);
        const userWon = userLeads.filter((l: Lead) => l.probability === 100);
        const userRevenue = userWon.reduce((acc: number, l: Lead) => acc + (l.value || 0), 0);
        return {
          id: user.id,
          name: user.name,
          avatar: user.avatar,
          revenue: userRevenue,
          salesCount: userWon.length
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [users, filteredLeads]);

  const evolution = useMemo(() => {
    const map: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      map[d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })] = 0;
    }
    won.forEach((l: Lead) => {
      const d = new Date(l.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (map[d] !== undefined) map[d] += (l.value || 0);
    });
    return Object.entries(map).map(([date, value]) => ({ date, value }));
  }, [won]);

  return (
    <div className="p-8 bg-gray-50 space-y-8 h-full overflow-y-auto animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Performance Nexus</h1>
          <p className="text-gray-500 text-sm font-medium">Dados reais sincronizados via Cloudflare D1.</p>
        </div>
        <div className="flex bg-white rounded-xl p-1 shadow-sm border border-gray-200">
          {(['7d', '30d', 'all']).map((p) => (
            <button
              key={p}
              onClick={() => setFilters({ period: p })}
              className={`px-5 py-2 rounded-lg text-xs font-black uppercase transition-all ${
                filters.period === p ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {p === '7d' ? '7 Dias' : p === '30d' ? '30 Dias' : 'Geral'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Kpi icon={DollarSign} label="Receita" value={currency(revenue)} color="text-green-600" bg="bg-green-50" />
        <Kpi icon={Briefcase} label="Pipeline" value={currency(pipeline)} color="text-indigo-600" bg="bg-indigo-50" />
        <Kpi icon={TrendingUp} label="Conversão" value={percent(conversion)} color="text-purple-600" bg="bg-purple-50" />
        <Kpi icon={Activity} label="Ticket Médio" value={currency(avgTicket)} color="text-orange-600" bg="bg-orange-50" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-1">
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
            <h3 className="font-black text-gray-900 mb-6 flex items-center gap-2 uppercase text-xs tracking-widest">
              <Trophy className="text-yellow-500" size={16} />
              Top Performance
            </h3>
            <div className="space-y-4">
              {salesByPerson.slice(0, 5).map((person, idx) => (
                <div key={person.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-gray-300 w-4">#{idx + 1}</span>
                    <img src={person.avatar} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" alt="" />
                    <div>
                      <div className="text-sm font-bold text-gray-800">{person.name}</div>
                      <div className="text-[10px] font-black text-indigo-500 uppercase">{person.salesCount} vendas</div>
                    </div>
                  </div>
                  <div className="text-right font-black text-gray-900 text-xs">{currency(person.revenue)}</div>
                </div>
              ))}
              {salesByPerson.length === 0 && <p className="text-center py-10 text-gray-400 font-bold uppercase text-[10px]">Sem dados...</p>}
            </div>
          </div>
        </div>

        <div className="xl:col-span-2">
          <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
            <h3 className="font-black text-gray-900 mb-8 flex items-center gap-2 uppercase text-xs tracking-widest">
              ROI & Crescimento
            </h3>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolution}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                  <Tooltip 
                    formatter={(value: any) => [currency(Number(value || 0)), 'Receita']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={4} fill="#6366f1" fillOpacity={0.1} />
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
  <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow group">
    <div className={`p-4 rounded-2xl transition-transform group-hover:scale-110 ${bg}`}>
      <Icon size={24} className={color} />
    </div>
    <div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-xl font-black text-gray-900 tracking-tight">{value}</p>
    </div>
  </div>
);
