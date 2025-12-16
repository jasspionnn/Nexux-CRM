import React, { useMemo } from 'react';
import { useCRM } from '../context/CRMContext';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  TrendingUp, DollarSign, Calendar, Target,
  Briefcase, ArrowUpRight, ArrowDownRight,
  Users, Activity
} from 'lucide-react';

/* =========================
   HELPERS SEGUROS
========================= */

const toNumber = (val: unknown): number =>
  typeof val === 'number' && !isNaN(val) ? val : 0;

const formatCurrency = (val: unknown) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0
  }).format(toNumber(val));

const formatPercent = (val: unknown) =>
  `${toNumber(val).toFixed(1)}%`;

/* =========================
   COMPONENT
========================= */

export const Dashboard = () => {
  const { leads, funnels, users, teams } = useCRM();

  /* =========================
     DATA
  ========================= */

  const wonLeads = useMemo(() => leads.filter(l => l.probability === 100), [leads]);
  const lostLeads = useMemo(() => leads.filter(l => l.probability === 0), [leads]);
  const openLeads = useMemo(() => leads.filter(l => l.probability > 0 && l.probability < 100), [leads]);

  const totalRevenue = wonLeads.reduce((a, b) => a + b.value, 0);
  const pipelineValue = openLeads.reduce((a, b) => a + b.value, 0);

  const totalClosed = wonLeads.length + lostLeads.length;
  const winRate = totalClosed > 0 ? (wonLeads.length / totalClosed) * 100 : 0;
  const avgTicket = wonLeads.length > 0 ? totalRevenue / wonLeads.length : 0;

  const globalGoal = useMemo(
    () => teams.reduce((a, t) => a + t.goal, 0),
    [teams]
  );

  const goalProgress = globalGoal > 0
    ? (totalRevenue / globalGoal) * 100
    : 0;

  /* =========================
     EVOLUTION
  ========================= */

  const evolutionData = useMemo(() => {
    const map: Record<string, number> = {};
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      map[key] = 0;
    }

    wonLeads.forEach(l => {
      const key = new Date(l.createdAt)
        .toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (map[key] !== undefined) {
        map[key] += l.value;
      }
    });

    return Object.entries(map).map(([date, value]) => ({ date, value }));
  }, [wonLeads]);

  /* =========================
     PRODUCT MIX
  ========================= */

  const productData = useMemo(() => {
    const acc: Record<string, number> = {};
    wonLeads.forEach(l => {
      const key = l.tags?.[0] || 'Outros';
      acc[key] = (acc[key] || 0) + l.value;
    });

    const res = Object.entries(acc)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return res.length ? res : [{ name: 'Sem vendas', value: 1 }];
  }, [wonLeads]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  /* =========================
     KPI CARD
  ========================= */

  const Kpi = ({ title, value, sub, icon: Icon, trend, color }: any) => (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition">
      <div className="flex justify-between mb-4">
        <div className={`p-2 rounded-lg ${color} bg-opacity-10`}>
          <Icon className={color.replace('bg-', 'text-')} size={18} />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-bold flex items-center ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500 font-semibold uppercase">{title}</p>
      <h3 className="text-2xl font-bold text-gray-800 mt-1">{value}</h3>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  );

  /* =========================
     RENDER
  ========================= */

  return (
    <div className="p-6 bg-gray-50 min-h-full text-gray-800">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Executivo</h1>
          <p className="text-sm text-gray-500">Performance comercial consolidada</p>
        </div>
        <button className="flex items-center gap-2 bg-white border px-3 py-2 rounded-lg text-sm">
          <Calendar size={16}/> Últimos 30 dias
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Kpi title="Receita" value={formatCurrency(totalRevenue)} sub={`${wonLeads.length} vendas`} icon={DollarSign} color="bg-green-500" trend={12}/>
        <Kpi title="Pipeline" value={formatCurrency(pipelineValue)} sub={`${openLeads.length} oportunidades`} icon={Briefcase} color="bg-blue-500"/>
        <Kpi title="Ticket médio" value={formatCurrency(avgTicket)} sub="por venda" icon={Activity} color="bg-purple-500"/>
        <Kpi title="Conversão" value={formatPercent(winRate)} sub="ganhos / fechados" icon={Target} color="bg-orange-500" trend={-2.5}/>
      </div>

      {/* CHART */}
      <div className="bg-white rounded-xl border shadow-sm p-6 mb-8">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <TrendingUp size={18}/> Evolução de vendas
        </h3>

        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={evolutionData}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="date"/>
              <YAxis tickFormatter={(v) => formatCurrency(v)} />
              <Tooltip formatter={(v) => [formatCurrency(v), 'Vendas']} />
              <Area dataKey="value" stroke="#3b82f6" fill="url(#rev)" strokeWidth={3}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* PIE */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Users size={18}/> Mix de produtos
        </h3>

        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={productData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                {productData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]}/>
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};
