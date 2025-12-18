import React, { useMemo, useState } from 'react';
import { useCRM } from '../context/CRMContext';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  DollarSign, Target, TrendingUp, Briefcase,
  Users, Calendar, Filter, Activity, AlertCircle
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
     FILTERED LEADS (CORE)
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

  const forecast = open.reduce(
    (a, b) => a + (b.value * (b.probability / 100)),
    0
  );

  const conversion =
    won.length + lost.length > 0
      ? (won.length / (won.length + lost.length)) * 100
      : 0;

  const avgTicket = won.length > 0 ? revenue / won.length : 0;

  /* ===========================
     SALES CYCLE
  =========================== */

  const avgCycle = won.length > 0
    ? won.reduce((a, b) =>
        a + daysBetween(new Date(b.createdAt), new Date()), 0
      ) / won.length
    : 0;

  /* ===========================
     STALLED LEADS
  =========================== */

  const stalled = open.filter(l =>
    daysBetween(new Date(), new Date(l.createdAt)) > 14
  );

  /* ===========================
     EVOLUTION
  =========================== */

  const evolution = useMemo(() => {
    const map: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      map[d.toLocaleDateString('pt-BR')] = 0;
    }

    won.forEach(l => {
      const d = new Date(l.createdAt).toLocaleDateString('pt-BR');
      if (map[d] !== undefined) map[d] += l.value;
    });

    return Object.entries(map).map(([date, value]) => ({ date, value }));
  }, [won]);

  /* ===========================
     PRODUCT MIX
  =========================== */

  const products = useMemo(() => {
    const acc: Record<string, number> = {};
    won.forEach(l => {
      const key = l.tags?.[0] ?? 'Outros';
      acc[key] = (acc[key] ?? 0) + l.value;
    });
    return Object.entries(acc).map(([name, value]) => ({ name, value }));
  }, [won]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  /* ===========================
     RENDER
  =========================== */

  return (
    <div className="p-6 bg-gray-50 space-y-8">

      {/* FILTER BAR */}
      <div className="flex flex-wrap gap-3">
        <select className="border rounded px-3 py-2 text-sm"
          value={filters.period}
          onChange={e => setFilters(f => ({ ...f, period: e.target.value }))}>
          <option value="7d">7 dias</option>
          <option value="30d">30 dias</option>
          <option value="90d">90 dias</option>
          <option value="all">Todo período</option>
        </select>

        <select className="border rounded px-3 py-2 text-sm"
          value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="all">Todos</option>
          <option value="won">Ganhas</option>
          <option value="open">Em aberto</option>
          <option value="lost">Perdidas</option>
        </select>

        <button
          className="border px-3 py-2 rounded text-sm flex items-center gap-2"
          onClick={() => setFilters({
            period: '30d',
            status: 'all',
            userId: 'all',
            funnelId: 'all'
          })}
        >
          <Filter size={14} /> Reset
        </button>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <Kpi icon={DollarSign} label="Receita" value={currency(revenue)} />
        <Kpi icon={Briefcase} label="Pipeline" value={currency(pipeline)} />
        <Kpi icon={Target} label="Forecast" value={currency(forecast)} />
        <Kpi icon={TrendingUp} label="Conversão" value={percent(conversion)} />
        <Kpi icon={Activity} label="Ticket Médio" value={currency(avgTicket)} />
        <Kpi icon={Calendar} label="Ciclo Médio" value={`${avgCycle.toFixed(0)} dias`} />
        <Kpi icon={Users} label="Leads Ativos" value={open.length} />
        <Kpi icon={AlertCircle} label="Leads Parados" value={stalled.length} />
      </div>

      {/* EVOLUTION */}
      <div className="bg-white p-6 rounded-xl border">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={evolution}>
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="date" />
            <YAxis />
            <CartesianGrid strokeDasharray="3 3" />
            <Tooltip formatter={(v?: number) => currency(v)} />
            <Area dataKey="value" stroke="#3b82f6" fill="url(#g)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* PRODUCT MIX */}
      <div className="bg-white p-6 rounded-xl border">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={products} dataKey="value" nameKey="name" innerRadius={50}>
              {products.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v?: number) => currency(v)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

/* ===========================
   KPI COMPONENT
=========================== */

const Kpi = ({ icon: Icon, label, value }: any) => (
  <div className="bg-white p-5 rounded-xl border flex gap-4 items-center">
    <div className="p-2 bg-blue-100 rounded">
      <Icon size={20} className="text-blue-600" />
    </div>
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  </div>
);
