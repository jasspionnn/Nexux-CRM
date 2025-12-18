import { Lead, User, Team, Funnel } from '../types';

export type DashboardMetrics = {
  revenue: number;
  pipeline: number;
  wonCount: number;
  lostCount: number;
  openCount: number;
  winRate: number;
  avgTicket: number;
  goal: number;
  goalProgress: number;
  evolution: { date: string; value: number }[];
};

export function buildDashboardMetrics({
  leads,
  teams,
}: {
  leads: Lead[];
  teams: Team[];
}): DashboardMetrics {

  const won = leads.filter(l => l.probability === 100);
  const lost = leads.filter(l => l.probability === 0);
  const open = leads.filter(l => l.probability > 0 && l.probability < 100);

  const revenue = won.reduce((a, b) => a + b.value, 0);
  const pipeline = open.reduce((a, b) => a + b.value, 0);

  const totalClosed = won.length + lost.length;
  const winRate = totalClosed > 0 ? (won.length / totalClosed) * 100 : 0;
  const avgTicket = won.length > 0 ? revenue / won.length : 0;

  const goal = teams.reduce((a, t) => a + t.goal, 0);
  const goalProgress = goal > 0 ? (revenue / goal) * 100 : 0;

  // evolução últimos 7 dias
  const evolutionMap: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    evolutionMap[key] = 0;
  }

  won.forEach(l => {
    const key = new Date(l.createdAt).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });
    if (evolutionMap[key] !== undefined) {
      evolutionMap[key] += l.value;
    }
  });

  const evolution = Object.entries(evolutionMap).map(([date, value]) => ({
    date,
    value,
  }));

  return {
    revenue,
    pipeline,
    wonCount: won.length,
    lostCount: lost.length,
    openCount: open.length,
    winRate,
    avgTicket,
    goal,
    goalProgress,
    evolution,
  };
}
