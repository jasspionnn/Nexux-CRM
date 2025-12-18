import { Lead, Team } from '../types';

/* =====================================================
   TYPES — ENTERPRISE DATA LAYER
===================================================== */

export interface RevenueEvolutionPoint {
  date: string;
  value: number;
}

export interface DashboardMetrics {
  revenue: number;
  pipeline: number;
  wonCount: number;
  lostCount: number;
  openCount: number;
  winRate: number;
  avgTicket: number;

  goal: number;
  goalProgress: number;

  evolution: RevenueEvolutionPoint[];
}

/* =====================================================
   HELPERS
===================================================== */

function formatDayMonth(date: Date) {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit'
  });
}

/* =====================================================
   MAIN BUILDER — SALESFORCE STYLE
===================================================== */

export function buildDashboardMetrics({
  leads,
  teams,
  days = 7
}: {
  leads: Lead[];
  teams: Team[];
  days?: number;
}): DashboardMetrics {

  /* ---------------------------
     Deal Segmentation
  ---------------------------- */

  const wonLeads = leads.filter(l => l.probability === 100);
  const lostLeads = leads.filter(l => l.probability === 0);
  const openLeads = leads.filter(
    l => l.probability > 0 && l.probability < 100
  );

  /* ---------------------------
     Revenue Metrics
  ---------------------------- */

  const revenue = wonLeads.reduce(
    (acc, lead) => acc + lead.value,
    0
  );

  const pipeline = openLeads.reduce(
    (acc, lead) => acc + lead.value,
    0
  );

  const totalClosed = wonLeads.length + lostLeads.length;

  const winRate =
    totalClosed > 0
      ? (wonLeads.length / totalClosed) * 100
      : 0;

  const avgTicket =
    wonLeads.length > 0
      ? revenue / wonLeads.length
      : 0;

  /* ---------------------------
     Goal Metrics
  ---------------------------- */

  const goal = teams.reduce(
    (acc, team) => acc + team.goal,
    0
  );

  const goalProgress =
    goal > 0
      ? (revenue / goal) * 100
      : 0;

  /* ---------------------------
     Revenue Evolution
  ---------------------------- */

  const evolutionMap: Record<string, number> = {};

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    evolutionMap[formatDayMonth(date)] = 0;
  }

  wonLeads.forEach(lead => {
    const key = formatDayMonth(new Date(lead.createdAt));
    if (evolutionMap[key] !== undefined) {
      evolutionMap[key] += lead.value;
    }
  });

  const evolution = Object.entries(evolutionMap).map(
    ([date, value]) => ({ date, value })
  );

  /* ---------------------------
     FINAL OBJECT
  ---------------------------- */

  return {
    revenue,
    pipeline,
    wonCount: wonLeads.length,
    lostCount: lostLeads.length,
    openCount: openLeads.length,
    winRate,
    avgTicket,
    goal,
    goalProgress,
    evolution
  };
}
