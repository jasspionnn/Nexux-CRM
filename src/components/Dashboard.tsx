import React, { useState, useMemo } from 'react';
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
} from 'recharts';
import {
  Trophy,
  TrendingUp,
  DollarSign,
  Calendar,
  MoreHorizontal,
  Filter,
  Target,
  User as UserIcon,
  Briefcase,
} from 'lucide-react';

export const Dashboard = () => {
  const { leads, funnels, users, teams } = useCRM();
  const [dateRange] = useState('30_days');

  // ---------------- HELPERS ----------------

  const currencyFormatter = (val: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(val);

  const safeCurrency = (val: unknown) =>
    currencyFormatter(typeof val === 'number' ? val : 0);

  // ---------------- CALCULATIONS ----------------

  const globalGoal = useMemo(
    () => teams.reduce((acc, t) => acc + t.goal, 0),
    [teams]
  );

  const wonLeads = useMemo(
    () => leads.filter(l => l.probability === 100),
    [leads]
  );

  const activeLeads = useMemo(
    () => leads.filter(l => l.probability > 0 && l.probability < 100),
    [leads]
  );

  const totalRevenue = wonLeads.reduce((acc, l) => acc + l.value, 0);
  const goalProgress = globalGoal > 0 ? (totalRevenue / globalGoal) * 100 : 0;
  const gap = globalGoal - totalRevenue;

  const rankingData = useMemo(() => {
    return users
      .map(user => {
        const userWonLeads = wonLeads.filter(l => l.assignedUserId === user.id);
        const userAllLeads = leads.filter(l => l.assignedUserId === user.id);

        const revenue = userWonLeads.reduce((acc, l) => acc + l.value, 0);
        const salesCount = userWonLeads.length;
        const conversionRate =
          userAllLeads.length > 0
            ? (salesCount / userAllLeads.length) * 100
            : 0;

        const team = teams.find(t => t.id === user.teamId);
        const members =
          users.filter(u => u.teamId === user.teamId).length || 1;

        const individualGoal = team ? team.goal / members : 0;
        const goalStatus =
          individualGoal > 0 ? (revenue / individualGoal) * 100 : 0;

        return {
          id: user.id,
          name: user.name,
          avatar: user.avatar,
          salesCount,
          revenue,
          conversionRate,
          goalStatus,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [users, leads, wonLeads, teams]);

  const recentSales = useMemo(() => {
    return [...wonLeads]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      )
      .slice(0, 5);
  }, [wonLeads]);

  const primaryFunnel = funnels[0];

  const funnelData = useMemo(() => {
    if (!primaryFunnel) return [];

    return primaryFunnel.stages.map(stage => {
      const stageLeads = leads.filter(
        l => l.funnelId === primaryFunnel.id && l.stageId === stage.id
      );

      return {
        id: stage.id,
        name: stage.name,
        count: stageLeads.length,
        value: stageLeads.reduce((acc, l) => acc + l.value, 0),
      };
    });
  }, [primaryFunnel, leads]);

  const productData = useMemo(() => {
    const map: Record<string, number> = {};

    wonLeads.forEach(l => {
      const key = l.tags?.[0] || 'Outros';
      map[key] = (map[key] || 0) + l.value;
    });

    const data = Object.entries(map).map(([name, value]) => ({
      name,
      value,
    }));

    return data.length > 0 ? data : [{ name: 'Sem dados', value: 1 }];
  }, [wonLeads]);

  const evolutionData = useMemo(() => {
    const data: Record<string, number> = {};

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      });
      data[key] = 0;
    }

    wonLeads.forEach(l => {
      const key = new Date(l.createdAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      });
      if (key in data) data[key] += l.value;
    });

    return Object.entries(data).map(([date, value]) => ({
      date,
      value,
    }));
  }, [wonLeads]);

  const COLORS = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
  ];

  // ---------------- RENDER ----------------

  return (
    <div className="p-6 bg-gray-50 h-full overflow-y-auto text-gray-800">

      {/* --------- GRÁFICO DE ÁREA --------- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 h-[320px]">
        <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
          <TrendingUp className="text-blue-600" size={18} />
          Evolução de Vendas
        </h3>

        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={evolutionData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={v => `R$${(v ?? 0) / 1000}k`} />

            <Tooltip
              formatter={value => [safeCurrency(value), 'Vendas']}
            />

            <Area
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              fill="url(#colorValue)"
              strokeWidth={3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* --------- PIE CHART --------- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-[300px]">
        <h3 className="font-bold text-gray-800 mb-4">
          Mix de Produtos
        </h3>

        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={productData}
              dataKey="value"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
            >
              {productData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>

            <Tooltip formatter={value => safeCurrency(value)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
