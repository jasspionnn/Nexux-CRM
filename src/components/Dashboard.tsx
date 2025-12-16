import React, { useState, useMemo } from 'react';
import { useCRM } from '../context/CRMContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

type TimeRange = 'month' | 'quarter' | 'year';

export const Dashboard = () => {
  const { leads, funnels, users } = useCRM();
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('month');

  const currencyFormatter = (value: unknown) => {
    const num = typeof value === 'number' ? value : Number(value) || 0;
    return [`R$ ${num.toLocaleString()}`, ''];
  };

  // ---------- FILTER ----------
  const filteredLeads = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const currentQuarter = Math.floor(currentMonth / 3);

    return leads.filter((l) => {
      if (selectedFunnelId !== 'all' && l.funnelId !== selectedFunnelId) return false;

      const leadDate = new Date(l.createdAt);
      const leadMonth = leadDate.getMonth();
      const leadYear = leadDate.getFullYear();
      const leadQuarter = Math.floor(leadMonth / 3);

      if (timeRange === 'month') return leadMonth === currentMonth && leadYear === currentYear;
      if (timeRange === 'quarter') return leadQuarter === currentQuarter && leadYear === currentYear;
      if (timeRange === 'year') return leadYear === currentYear;

      return true;
    });
  }, [leads, selectedFunnelId, timeRange]);

  // ---------- CHART DATA ----------
  const chartMainData = useMemo(() => {
    if (selectedFunnelId === 'all') {
      return funnels.map((f) => {
        const fLeads = filteredLeads.filter((l) => l.funnelId === f.id);
        return {
          name: f.name,
          total: fLeads.reduce((s, l) => s + l.value, 0),
          forecast: fLeads.reduce((s, l) => s + l.value * (l.probability / 100), 0),
          count: fLeads.length,
        };
      });
    }

    const funnel = funnels.find((f) => f.id === selectedFunnelId);
    return (
      funnel?.stages.map((s) => {
        const stageLeads = filteredLeads.filter((l) => l.stageId === s.id);
        return {
          name: s.name,
          total: stageLeads.reduce((sum, l) => sum + l.value, 0),
          forecast: stageLeads.reduce((sum, l) => sum + l.value * (l.probability / 100), 0),
          count: stageLeads.length,
        };
      }) || []
    );
  }, [funnels, filteredLeads, selectedFunnelId]);

  const userPerformance = useMemo(() => {
    return users
      .map((u) => {
        const userLeads = filteredLeads.filter((l) => l.assignedUserId === u.id);
        return {
          fullName: u.name,
          totalValue: userLeads.reduce((a, l) => a + l.value, 0),
          wonValue: userLeads
            .filter((l) => l.probability === 100)
            .reduce((a, l) => a + l.value, 0),
        };
      })
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5);
  }, [users, filteredLeads]);

  return (
    <div className="p-8 space-y-8">

      <div className="bg-white p-6 rounded-xl border">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartMainData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={currencyFormatter} />
            <Legend />
            <Bar dataKey="total" name="Valor Total" fill="#e5e7eb" />
            <Bar dataKey="forecast" name="Forecast" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white p-6 rounded-xl border">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={userPerformance} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" horizontal />
            <XAxis type="number" hide />
            <YAxis dataKey="fullName" type="category" width={150} />
            <Tooltip formatter={currencyFormatter} />
            <Legend />
            <Bar dataKey="totalValue" name="Pipeline Total" fill="#e5e7eb" />
            <Bar dataKey="wonValue" name="Fechado Ganho" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
};
