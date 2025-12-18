import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  ReactNode
} from 'react';

import {
  Lead,
  User,
  Funnel,
  Team
} from '../types';

/* =====================================================
   FILTROS GLOBAIS — NEXUS ENTERPRISE
===================================================== */

export type DateRange =
  | '7_days'
  | '30_days'
  | '90_days'
  | 'this_month'
  | 'last_month'
  | 'custom';

export type DealStatus = 'all' | 'won' | 'lost' | 'open';

export interface CRMFilters {
  dateRange: DateRange;
  teamId: string | null;
  userId: string | null;
  funnelId: string | null;
  status: DealStatus;
}

/* =====================================================
   CONTEXT TYPE — ENTERPRISE
===================================================== */

interface CRMContextType {
  /* Raw Data */
  leads: Lead[];
  users: User[];
  teams: Team[];
  funnels: Funnel[];

  /* Global Filters */
  filters: CRMFilters;
  setFilters: (filters: CRMFilters) => void;
  resetFilters: () => void;

  /* Filtered Data */
  filteredLeads: Lead[];

  /* Enterprise Metrics */
  metrics: {
    totalRevenue: number;
    pipelineValue: number;
    wonCount: number;
    lostCount: number;
    openCount: number;
    winRate: number;
    avgTicket: number;
  };
}

/* =====================================================
   CONTEXT
===================================================== */

const CRMContext = createContext<CRMContextType | null>(null);

/* =====================================================
   PROVIDER
===================================================== */

interface ProviderProps {
  children: ReactNode;
  initialData: {
    leads: Lead[];
    users: User[];
    teams: Team[];
    funnels: Funnel[];
  };
}

export const CRMProvider = ({
  children,
  initialData
}: ProviderProps) => {
  const { leads, users, teams, funnels } = initialData;

  /* =====================================================
     GLOBAL FILTER STATE
  ===================================================== */

  const [filters, setFilters] = useState<CRMFilters>({
    dateRange: '30_days',
    teamId: null,
    userId: null,
    funnelId: null,
    status: 'all'
  });

  /* =====================================================
     FILTER ENGINE (Salesforce-style)
  ===================================================== */

  const filteredLeads = useMemo(() => {
    let result = [...leads];

    /* Team filter */
    if (filters.teamId) {
      const teamUserIds = users
        .filter(u => u.teamId === filters.teamId)
        .map(u => u.id);

      result = result.filter(l =>
        teamUserIds.includes(l.assignedUserId)
      );
    }

    /* User filter */
    if (filters.userId) {
      result = result.filter(
        l => l.assignedUserId === filters.userId
      );
    }

    /* Funnel filter */
    if (filters.funnelId) {
      result = result.filter(
        l => l.funnelId === filters.funnelId
      );
    }

    /* Status filter */
    switch (filters.status) {
      case 'won':
        result = result.filter(l => l.probability === 100);
        break;
      case 'lost':
        result = result.filter(l => l.probability === 0);
        break;
      case 'open':
        result = result.filter(
          l => l.probability > 0 && l.probability < 100
        );
        break;
    }

    /* Date filter (createdAt) */
    if (filters.dateRange !== 'custom') {
      const now = new Date();
      let startDate: Date | null = null;

      switch (filters.dateRange) {
        case '7_days':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          break;
        case '30_days':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 30);
          break;
        case '90_days':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 90);
          break;
        case 'this_month':
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            1
          );
          break;
        case 'last_month':
          startDate = new Date(
            now.getFullYear(),
            now.getMonth() - 1,
            1
          );
          break;
      }

      if (startDate) {
        result = result.filter(l => {
          const created = new Date(l.createdAt);
          return created >= startDate!;
        });
      }
    }

    return result;
  }, [leads, users, filters]);

  /* =====================================================
     ENTERPRISE METRICS LAYER
  ===================================================== */

  const metrics = useMemo(() => {
    const won = filteredLeads.filter(l => l.probability === 100);
    const lost = filteredLeads.filter(l => l.probability === 0);
    const open = filteredLeads.filter(
      l => l.probability > 0 && l.probability < 100
    );

    const totalRevenue = won.reduce(
      (acc, l) => acc + l.value,
      0
    );

    const pipelineValue = open.reduce(
      (acc, l) => acc + l.value,
      0
    );

    const closedDeals = won.length + lost.length;

    return {
      totalRevenue,
      pipelineValue,
      wonCount: won.length,
      lostCount: lost.length,
      openCount: open.length,
      winRate:
        closedDeals > 0
          ? (won.length / closedDeals) * 100
          : 0,
      avgTicket:
        won.length > 0
          ? totalRevenue / won.length
          : 0
    };
  }, [filteredLeads]);

  /* =====================================================
     HELPERS
  ===================================================== */

  const resetFilters = () => {
    setFilters({
      dateRange: '30_days',
      teamId: null,
      userId: null,
      funnelId: null,
      status: 'all'
    });
  };

  /* =====================================================
     PROVIDER
  ===================================================== */

  return (
    <CRMContext.Provider
      value={{
        leads,
        users,
        teams,
        funnels,
        filters,
        setFilters,
        resetFilters,
        filteredLeads,
        metrics
      }}
    >
      {children}
    </CRMContext.Provider>
  );
};

/* =====================================================
   HOOK
===================================================== */

export const useCRM = () => {
  const context = useContext(CRMContext);
  if (!context) {
    throw new Error(
      'useCRM must be used within CRMProvider'
    );
  }
  return context;
};
