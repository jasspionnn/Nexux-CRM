import React, { useMemo } from 'react';
import { useCRM } from '../context/CRMContext';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  TrendingUp, DollarSign, Calendar, Target,
  Briefcase, ArrowUpRight, ArrowDownRight,
  Users, Activity, AlertCircle
} from 'lucide-react';

export const Dashboard = () => {
  const { leads, funnels, users, teams } = useCRM();

  /* ========================
     FORMATTERS
  ======================== */

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0
    }).format(val);

  const formatPercent = (val: number) => `${val.toFixed(1)}%`;

  /* ========================
     BASE DATA
  ======================== */

  const wonLeads = useMemo(() => leads.filter(l => l.probability === 100), [leads]);
  const lostLeads = useMemo(() => leads.filter(l => l.probability === 0), [leads]);
  const openLeads = useMemo(() => leads.filter(l => l.probability > 0 && l.probability < 100), [leads]);

  const totalRevenue = wonLeads.reduce((a, b) => a + b.value, 0);
  const pipelineValue = openLeads.reduce((a, b) => a + b.value, 0);

  const totalClosed = wonLeads.length + lostLeads.length;
  const winRate = totalClosed > 0 ? (wonLeads.length / totalClosed) * 100 : 0;
  const lostRate = totalClosed > 0 ? (lostLeads.length / totalClosed) * 100 : 0;
  const avgTicket = wonLeads.length > 0 ? totalRevenue / wonLeads.length : 0;
  const revenuePerLead = leads.length > 0 ? totalRevenue / leads.length : 0;

  /* ========================
     GOALS
  ======================== */

  const globalGoal = useMemo(
    () => teams.reduce((a, b) => a + b.goal, 0),
    [teams]
  );

  const goalProgress = globalGoal > 0 ? (totalRevenue / globalGoal) * 100 : 0;
  const pipelineCoverage = globalGoal > 0 ? pipelineValue / globalGoal : 0;

  /* ========================
     SALES CYCLE
  ======================== */

  const avgSalesCycle = useMemo(() => {
    if (wonLeads.length === 0) return 0;

    const days = wonLeads.reduce((acc, lead) => {
      const created = new Date(lead.createdAt).getTime();
      const closed = new Date(lead.updatedAt || lead.createdAt).getTime();
      return acc + (closed - created) / (1000 * 60 * 60 * 24);
    }, 0);

    return days / wonLeads.length;
  }, [wonLeads]);

  /* ========================
     EVOLUTION (7 DAYS)
  ======================== */

  const evolutionData = useMemo(() => {
    const data: Record<string, number> = {};

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      data[key] = 0;
    }

    wonLeads.forEach(lead => {
      const key = new Date(lead.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (data[key] !== undefined) data[key] += lead.value;
    });

    return Object.entries(data).map(([date, value]) => ({ date, value }));
  }, [wonLeads]);

  /* ========================
     PRODUCT MIX
  ======================== */

  const productData = useMemo(() => {
    const map: Record<string, number> = {};

    wonLeads.forEach(l => {
      const tag = l.tags?.[0] || 'Outros';
      map[tag] = (map[tag] || 0) + l.value;
    });

    const arr = Object.entries(map).map(([name, value]) => ({ name, value }));
    return arr.length > 0 ? arr : [{ name: 'Sem vendas', value: 1 }];
  }, [wonLeads]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1'];

  /* ========================
     TOP 20% SELLERS
  ======================== */

  const top20Share = useMemo(() => {
    if (users.length === 0 || totalRevenue === 0) return 0;

    const ranking = users.map(u => ({
      revenue: wonLeads
        .filter(l => l.assignedUserId === u.id)
        .reduce((a, b) => a + b.value, 0)
    })).sort((a, b) => b.revenue - a.revenue);

    const topCount = Math.ceil(users.length * 0.2);
    const topRevenue = ranking.slice(0, topCount).reduce((a, b) => a + b.revenue, 0);

    return (topRevenue / totalRevenue) * 100;
  }, [users, wonLeads, totalRevenue]);

  /* ========================
     KPI CARD
  ======================== */

  const Kpi = ({ title, value, sub, icon: Icon, color, trend }: any) => (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex justify-between mb-2">
        <div className={`p-2 rounded-lg ${color} bg-opacity-10`}>
          <Icon className={color.replace('bg-', 'text-')} size={20} />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-bold flex items-center ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-xs text-gray-500 uppercase font-semibold">{title}</p>
        <h3 className="text-2xl font-bold text-gray-800 mt-1">{value}</h3>
        <p className="text-xs text-gray-400 mt-1">{sub}</p>
      </div>
    </div>
  );

  /* ========================
     RENDER
  ======================== */

  return (
    <div className="p-6 bg-gray-50 h-full overflow-y-auto">

      <div className="flex justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Comercial</h1>
          <p className="text-sm text-gray-500">Indicadores estratégicos de vendas</p>
        </div>
        <button className="flex items-center gap-2 bg-white border px-3 py-2 rounded-lg text-sm">
          <Calendar size={16} /> Últimos 7 dias
        </button>
      </div>

      {/* KPI ROW 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Kpi title="Receita" value={formatCurrency(totalRevenue)} sub="Vendas ganhas" icon={DollarSign} color="bg-green-500" />
        <Kpi title="Pipeline" value={formatCurrency(pipelineValue)} sub="Em aberto" icon={Briefcase} color="bg-blue-500" />
        <Kpi title="Ticket Médio" value={formatCurrency(avgTicket)} sub="Por venda" icon={Activity} color="bg-purple-500" />
        <Kpi title="Win Rate" value={formatPercent(winRate)} sub="Conversão" icon={Target} color="bg-orange-500" />
      </div>

      {/* KPI ROW 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Kpi title="Pipeline Coverage" value={`${pipelineCoverage.toFixed(1)}x`} sub="Pipeline / Meta" icon={Briefcase} color="bg-indigo-500" />
        <Kpi title="Lost Rate" value={formatPercent(lostRate)} sub="Negócios perdidos" icon={AlertCircle} color="bg-red-500" />
        <Kpi title="Sales Cycle" value={`${avgSalesCycle.toFixed(0)} dias`} sub="Tempo médio" icon={Activity} color="bg-yellow-500" />
        <Kpi title="Top 20% Share" value={formatPercent(top20Share)} sub="Dependência do time" icon={Users} color="bg-pink-500" />
      </div>

      {/* EVOLUTION */}
      <div className="bg-white rounded-xl p-6 border">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <TrendingUp className="text-blue-600" /> Evolução de Vendas
        </h3>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={evolutionData}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(v) => `R$${v / 1000}k`} />
              <Tooltip formatter={(v) => formatCurrency(v as number)} />
              <Area dataKey="value" stroke="#3b82f6" fill="url(#rev)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};
