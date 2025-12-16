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
  Legend
} from 'recharts';
import {
  Trophy,
  TrendingUp,
  DollarSign,
  Calendar,
  MoreHorizontal,
  Filter,
  Target,
  User as UserIcon
} from 'lucide-react';

export const Dashboard = () => {
  const { leads, funnels, users, teams } = useCRM();
  const [dateRange, setDateRange] = useState('30_days');

  // ---------------- Helpers ----------------

  const currencyFormatter = (val: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0
    }).format(val);

  const safeCurrency = (val: unknown) =>
    currencyFormatter(typeof val === 'number' ? val : 0);

  // ---------------- Calculations ----------------

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
        const userWonLeads = wonLeads.filter(
          l => l.assignedUserId === user.id
        );
        const userAllLeads = leads.filter(
          l => l.assignedUserId === user.id
        );

        const revenue = userWonLeads.reduce((acc, l) => acc + l.value, 0);
        const salesCount = userWonLeads.length;
        const totalCount = userAllLeads.length;
        const conversionRate =
          totalCount > 0 ? (salesCount / totalCount) * 100 : 0;

        const userTeam = teams.find(t => t.id === user.teamId);
        const teamMemberCount =
          users.filter(u => u.teamId === user.teamId).length || 1;
        const individualGoal = userTeam
          ? userTeam.goal / teamMemberCount
          : 0;

        const goalStatus =
          individualGoal > 0 ? (revenue / individualGoal) * 100 : 0;

        return {
          id: user.id,
          name: user.name,
          avatar: user.avatar,
          salesCount,
          revenue,
          conversionRate,
          goalStatus
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
        l =>
          l.funnelId === primaryFunnel.id &&
          l.stageId === stage.id
      );

      const value = stageLeads.reduce((acc, l) => acc + l.value, 0);

      return {
        id: stage.id,
        name: stage.name,
        count: stageLeads.length,
        value
      };
    });
  }, [primaryFunnel, leads]);

  const productData = useMemo(() => {
    const counts: Record<string, number> = {};

    wonLeads.forEach(lead => {
      const product =
        lead.tags && lead.tags.length > 0 ? lead.tags[0] : 'Outros';
      counts[product] = (counts[product] || 0) + lead.value;
    });

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value
    }));
  }, [wonLeads]);

  const COLORS = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899'
  ];

  const evolutionData = useMemo(() => {
    const data: Record<string, number> = {};

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit'
      });
      data[dateStr] = 0;
    }

    wonLeads.forEach(lead => {
      const d = new Date(lead.createdAt);
      const dateStr = d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit'
      });
      if (data[dateStr] !== undefined) {
        data[dateStr] += lead.value;
      }
    });

    return Object.entries(data).map(([date, value]) => ({
      date,
      value
    }));
  }, [wonLeads]);

  // ---------------- Render ----------------

  return (
    <div className="p-6 bg-gray-50 h-full overflow-y-auto text-gray-800">
      {/* Charts corrigidos */}
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={evolutionData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip
            formatter={value => [safeCurrency(value), 'Vendas']}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#3b82f6"
            fill="#3b82f6"
          />
        </AreaChart>
      </ResponsiveContainer>

      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={productData}
            dataKey="value"
            cx="50%"
            cy="50%"
            outerRadius={80}
          >
            {productData.map((_, index) => (
              <Cell
                key={index}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip formatter={value => safeCurrency(value)} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
