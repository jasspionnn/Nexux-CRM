import React, { useMemo } from 'react';
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
  Legend
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Target,
  Briefcase,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Activity
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

  /* =======================
     CORE DATA
  ======================= */

  const wonLeads = useMemo(
    () => leads.filter(l => l.probability === 100),
    [leads]
  );

  const lostLeads = useMemo(
    () => leads.filter(l => l.probability === 0),
    [leads]
  );

  const openLeads = useMemo(
    () => leads.filter(l => l.probability > 0 && l.probability < 100),
    [leads]
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
     SALES CYCLE (SAFE)
     Usa apenas createdAt
  ======================= */

  const avgSalesCycle = useMemo(() => {
    if (!wonLeads.length) return 0;
    const now = Date.now();

    const days = wonLeads.reduce((acc, lead) => {
      const created = new Date(lead.createdAt).getTime();
      return acc + (now - created) / (1000 * 60 * 60 * 24);
    }, 0);

    return days / wonLeads.length;
  }, [wonLeads]);

  /* =======================
     GOALS
  ======================= */

  const globalGoal = useMemo(
    () => teams.reduce((acc, t) => acc + safeNumber(t.goal), 0),
    [teams]
  );

  const goalProgress = globalGoal
    ? (totalRevenue / globalGoal) * 100
    : 0;

  /* =======================
     EVOLUTION (7 DAYS)
  ======================= */

  const evolutionData = useMemo(() => {
    const map: Record<string, number> = {};

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit'
      });
      map[key] = 0;
    }

    wonLeads.forEach(l => {
      const key = new Date(l.createdAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit'
      });
      if (map[key] !== undefined) {
        map[key] += safeNumber(l.value);
      }
    });

    return Object.entries(map).map(([date, value]) => ({
      date,
      value
    }));
  }, [wonLeads]);

  /* =======================
     PRODUCT MIX
  ======================= */

  const productData = useMemo(() => {
    const acc: Record<string, number> = {};

    wonLeads.forEach(l => {
      const tag =
        Array.isArray(l.tags) && l.tags.length ? l.tags[0] : 'Outros';
      acc[tag] = (acc[tag] || 0) + safeNumber(l.value);
    });

    const result = Object.entries(acc)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return result.length ? result : [{ name: 'Sem vendas', value: 1 }];
  }, [wonLeads]);

  const COLORS = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#8b5cf6',
    '#ec4899',
    '#6366f1'
  ];

  /* =======================
     RENDER
  ======================= */

  return (
    <div className="p-6 bg-gray-50 h-full overflow-y-auto text-gray-800">

      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard Comercial</h1>
        <p className="text-sm text-gray-500">
          Indicadores estratégicos de performance
        </p>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">

        <Kpi
          title="Receita"
          value={formatCurrency(totalRevenue)}
          icon={DollarSign}
        />

        <Kpi
          title="Pipeline"
          value={formatCurrency(pipelineValue)}
          icon={Briefcase}
        />

        <Kpi
          title="Ticket médio"
          value={formatCurrency(avgTicket)}
          icon={Activity}
        />

        <Kpi
          title="Win rate"
          value={formatPercent(winRate)}
          icon={Target}
        />

      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">

        {/* EVOLUTION */}
        <div className="lg:col-span-2 bg-white rounded-xl border p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="text-blue-600" size={18} />
            Evolução de vendas
          </h3>

          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                  formatter={(v) => formatCurrency(safeNumber(v))}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  fill="#93c5fd"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PRODUCT MIX */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-bold mb-4">Mix de produtos</h3>

          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={productData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                >
                  {productData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={COLORS[i % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => formatCurrency(safeNumber(v))}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* EXTRA METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <Metric label="Negócios ganhos" value={wonLeads.length} />
        <Metric label="Negócios perdidos" value={lostLeads.length} />
        <Metric label="Ciclo médio (dias)" value={avgSalesCycle.toFixed(0)} />

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
  icon: Icon
}: {
  title: string;
  value: string;
  icon: any;
}) => (
  <div className="bg-white p-5 rounded-xl border shadow-sm">
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm text-gray-500">{title}</span>
      <Icon size={18} className="text-gray-400" />
    </div>
    <div className="text-2xl font-bold">{value}</div>
  </div>
);

const Metric = ({
  label,
  value
}: {
  label: string;
  value: number | string;
}) => (
  <div className="bg-white p-4 rounded-xl border text-center">
    <div className="text-xs text-gray-500 mb-1">{label}</div>
    <div className="text-xl font-bold">{value}</div>
  </div>
);
