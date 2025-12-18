import React, { useMemo } from 'react';
import { useCRM } from '../context/CRMContext';
import { buildDashboardMetrics } from '../dashboards/dashboardDataLayer';

import {
  TrendingUp,
  DollarSign,
  Target,
  Briefcase,
  Activity,
  Layers,
  CheckCircle,
  XCircle,
} from 'lucide-react';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

/* =====================================================
   HELPERS
===================================================== */

const currency = (v: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(v);

/* =====================================================
   DASHBOARD — NEXUS ENTERPRISE
===================================================== */

export const Dashboard = () => {
  const { filteredLeads, teams, filters } = useCRM();

  const metrics = useMemo(
    () =>
      buildDashboardMetrics({
        leads: filteredLeads,
        teams,
        days:
          filters.dateRange === '7_days'
            ? 7
            : filters.dateRange === '90_days'
            ? 90
            : 30,
      }),
    [filteredLeads, teams, filters.dateRange]
  );

  /* ==============================
     Enterprise Derived Metrics
  =============================== */

  const pipelineCoverage =
    metrics.goal > 0 ? (metrics.pipeline / metrics.goal) * 100 : 0;

  const avgRevenuePerDeal =
    metrics.wonCount > 0 ? metrics.revenue / metrics.wonCount : 0;

  const weightedForecast = useMemo(() => {
    const openLeads = filteredLeads.filter(
      l => l.probability > 0 && l.probability < 100
    );

    return openLeads.reduce(
      (acc, lead) => acc + lead.value * (lead.probability / 100),
      0
    );
  }, [filteredLeads]);

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="p-6 bg-gray-50 min-h-full space-y-8">

      {/* KPI GRID — ENTERPRISE */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

        <Kpi title="Receita" value={currency(metrics.revenue)} icon={DollarSign} />
        <Kpi title="Pipeline" value={currency(metrics.pipeline)} icon={Briefcase} />
        <Kpi title="Ticket Médio" value={currency(avgRevenuePerDeal)} icon={Activity} />
        <Kpi title="Win Rate" value={`${metrics.winRate.toFixed(1)}%`} icon={Target} />

        <Kpi title="Deals Ganhos" value={`${metrics.wonCount}`} icon={CheckCircle} />
        <Kpi title="Deals Perdidos" value={`${metrics.lostCount}`} icon={XCircle} />
        <Kpi title="Deals Abertos" value={`${metrics.openCount}`} icon={Layers} />
        <Kpi
          title="Forecast (ponderado)"
          value={currency(weightedForecast)}
          icon={TrendingUp}
        />
      </div>

      {/* META — SALESFORCE STYLE */}
      <div className="bg-gray-900 rounded-xl p-6 text-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold">Meta Geral</h3>
          <Target />
        </div>

        <div className="text-4xl font-black mb-1">
          {metrics.goalProgress.toFixed(0)}%
        </div>

        <div className="text-sm text-gray-400 mb-4">
          {currency(metrics.revenue)} de {currency(metrics.goal)}  
          <span className="ml-2 text-xs text-gray-500">
            • Coverage: {pipelineCoverage.toFixed(0)}%
          </span>
        </div>

        <div className="h-2 bg-gray-700 rounded overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-green-400 rounded transition-all"
            style={{ width: `${Math.min(metrics.goalProgress, 100)}%` }}
          />
        </div>
      </div>

      {/* EVOLUÇÃO — REVENUE TREND */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <TrendingUp /> Evolução de Vendas
        </h3>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={metrics.evolution}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(v) => currency(Number(v))} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.2}
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};

/* =====================================================
   KPI COMPONENT
===================================================== */

const Kpi = ({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: any;
}) => (
  <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
    <div className="flex justify-between mb-2">
      <span className="text-xs uppercase text-gray-500 font-semibold">
        {title}
      </span>
      <Icon className="text-gray-400" size={18} />
    </div>
    <div className="text-2xl font-bold text-gray-900">
      {value}
    </div>
  </div>
);
