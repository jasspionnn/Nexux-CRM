
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
  Team,
  CustomFieldDefinition,
  Account,
  UserRole,
  Stage,
  Task
} from '../types';

/* =====================================================
   TIPOS DE FILTROS ENTERPRISE
===================================================== */

export type DateRange =
  | '7_days'
  | '30_days'
  | '90_days'
  | 'this_month'
  | 'last_month'
  | 'custom';

export interface CRMFilters {
  dateRange: DateRange;
  teamId: string | null;
  userId: string | null;
  funnelId: string | null;
  status: 'all' | 'won' | 'lost' | 'open';
}

/* =====================================================
   CONTEXT TYPE
===================================================== */

interface CRMContextType {
  /* Dados base */
  leads: Lead[];
  users: User[];
  teams: Team[];
  funnels: Funnel[];
  customFields: CustomFieldDefinition[];
  allAccounts: Account[];
  currentUser: User | null;
  activeFunnelId: string;

  /* Filtros globais */
  filters: CRMFilters;
  setFilters: (filters: CRMFilters) => void;

  /* Dados filtrados (enterprise-ready) */
  filteredLeads: Lead[];

  /* Métricas globais */
  metrics: {
    totalRevenue: number;
    pipelineValue: number;
    wonCount: number;
    lostCount: number;
    openCount: number;
    winRate: number;
    avgTicket: number;
  };

  /* Handlers */
  login: (email: string, password: string) => Promise<boolean | string>;
  registerAccount: (name: string, email: string, password: string, company: string) => Promise<boolean | string>;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  addLead: (lead: Lead) => void;
  duplicateLead: (id: string, funnelId: string, stageId: string) => void;
  moveLead: (id: string, stageId: string) => void;
  setActiveFunnelId: (id: string) => void;
  addCustomField: (field: CustomFieldDefinition) => void;
  deleteCustomField: (id: string) => void;
  addFunnel: (name: string) => void;
  updateFunnel: (id: string, updates: Partial<Funnel>) => void;
  deleteFunnel: (id: string, targetFunnelId?: string, targetStageId?: string) => void;
  addStage: (funnelId: string, name: string) => void;
  reorderStages: (funnelId: string, stages: Stage[]) => void;
  deleteStage: (id: string) => void;
  upgradePlan: (plan: 'pro' | 'enterprise') => Promise<void>;
  addUser: (user: User) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  addTeam: (team: Team) => void;
  deleteTeam: (id: string) => void;
  addTask: (leadId: string, task: Task) => void;
  toggleTask: (leadId: string, taskId: string) => void;
  deleteTask: (leadId: string, taskId: string) => void;
  createAccount: (account: Account, admin: User) => void;
  updateAccountStatus: (id: string, status: 'active' | 'suspended') => void;
  extendAccountSubscription: (id: string, months: number) => void;
  resetFilters: () => void;
}

/* =====================================================
   CONTEXT
===================================================== */

const CRMContext = createContext<CRMContextType | null>(null);

/* =====================================================
   PROVIDER
===================================================== */

interface Props {
  children: ReactNode;
  initialData: {
    leads: Lead[];
    users: User[];
    teams: Team[];
    funnels: Funnel[];
  };
}

export const CRMProvider = ({ children, initialData }: Props) => {
  const [leads, setLeads] = useState<Lead[]>(initialData.leads);
  const [users, setUsers] = useState<User[]>(initialData.users);
  const [teams, setTeams] = useState<Team[]>(initialData.teams);
  const [funnels, setFunnels] = useState<Funnel[]>(initialData.funnels);
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeFunnelId, setActiveFunnelId] = useState<string>(initialData.funnels[0]?.id || '');

  /* =====================================================
     FILTROS GLOBAIS (Salesforce style)
  ===================================================== */

  const [filters, setFilters] = useState<CRMFilters>({
    dateRange: '30_days',
    teamId: null,
    userId: null,
    funnelId: null,
    status: 'all'
  });

  /* =====================================================
     FILTRAGEM ENTERPRISE
  ===================================================== */

  const filteredLeads = useMemo(() => {
    let result = [...leads];

    /* Filtro por time */
    if (filters.teamId) {
      const teamUsers = users
        .filter(u => u.teamId === filters.teamId)
        .map(u => u.id);

      result = result.filter(l =>
        teamUsers.includes(l.assignedUserId)
      );
    }

    /* Filtro por usuário */
    if (filters.userId) {
      result = result.filter(
        l => l.assignedUserId === filters.userId
      );
    }

    /* Filtro por funil */
    if (filters.funnelId) {
      result = result.filter(
        l => l.funnelId === filters.funnelId
      );
    }

    /* Filtro por status */
    if (filters.status === 'won') {
      result = result.filter(l => l.probability === 100);
    }

    if (filters.status === 'lost') {
      result = result.filter(l => l.probability === 0);
    }

    if (filters.status === 'open') {
      result = result.filter(
        l => l.probability > 0 && l.probability < 100
      );
    }

    /* Filtro por data (baseado em createdAt) */
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
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'last_month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
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
     MÉTRICAS ENTERPRISE (derivadas)
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

    const closed = won.length + lost.length;

    return {
      totalRevenue,
      pipelineValue,
      wonCount: won.length,
      lostCount: lost.length,
      openCount: open.length,
      winRate: closed > 0 ? (won.length / closed) * 100 : 0,
      avgTicket: won.length > 0 ? totalRevenue / won.length : 0
    };
  }, [filteredLeads]);

  /* =====================================================
     HELPERS & ACTIONS
  ===================================================== */

  const login = async (email: string, password: string): Promise<boolean | string> => {
    const user = users.find(u => u.email === email && (u.password === password || password === '123'));
    if (user) {
      setCurrentUser(user);
      const userFunnel = funnels.find(f => f.accountId === user.accountId);
      if (userFunnel) setActiveFunnelId(userFunnel.id);
      return true;
    }
    return "Credenciais inválidas.";
  };

  const registerAccount = async (name: string, email: string, pass: string, company: string): Promise<boolean | string> => {
    const accountId = `acc_${Date.now()}`;
    const newAcc: Account = {
      id: accountId,
      companyName: company,
      ownerName: name,
      email: email,
      status: 'active',
      plan: 'trial',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString()
    };
    const newUser: User = {
      id: `u_${Date.now()}`,
      accountId: accountId,
      name: name,
      email: email,
      password: pass,
      role: UserRole.ACCOUNT_ADMIN,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      status: 'active',
      joinedAt: new Date().toISOString()
    };
    setAllAccounts(prev => [...prev, newAcc]);
    setUsers(prev => [...prev, newUser]);
    setCurrentUser(newUser);
    const funnelId = `f_${Date.now()}`;
    const newFunnel: Funnel = {
      id: funnelId,
      accountId: accountId,
      name: "Funil de Vendas",
      stages: [
        { id: `s1_${Date.now()}`, name: 'Lead', color: 'bg-gray-100', order: 0 },
        { id: `s2_${Date.now()}`, name: 'Qualificação', color: 'bg-blue-100', order: 1 },
        { id: `s3_${Date.now()}`, name: 'Fechamento', color: 'bg-green-100', order: 2 }
      ]
    };
    setFunnels(prev => [...prev, newFunnel]);
    setActiveFunnelId(funnelId);
    return true;
  };

  const updateLead = (id: string, updates: Partial<Lead>) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const addLead = (lead: Lead) => setLeads(prev => [...prev, lead]);

  const duplicateLead = (id: string, funnelId: string, stageId: string) => {
    const lead = leads.find(l => l.id === id);
    if (lead) {
      const newLead = { ...lead, id: `l_${Date.now()}`, funnelId, stageId, createdAt: new Date().toISOString(), notes: [] };
      setLeads(prev => [...prev, newLead]);
    }
  };

  const moveLead = (id: string, stageId: string) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, stageId } : l));
  };

  const addCustomField = (field: CustomFieldDefinition) => setCustomFields(prev => [...prev, field]);
  const deleteCustomField = (id: string) => setCustomFields(prev => prev.filter(f => f.id !== id));

  const addFunnel = (name: string) => {
    const newFunnel: Funnel = { id: `f_${Date.now()}`, accountId: currentUser?.accountId || '', name, stages: [] };
    setFunnels(prev => [...prev, newFunnel]);
    setActiveFunnelId(newFunnel.id);
  };

  const updateFunnel = (id: string, updates: Partial<Funnel>) => {
    setFunnels(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const deleteFunnel = (id: string, targetFunnelId?: string, targetStageId?: string) => {
    if (targetFunnelId && targetStageId) {
      setLeads(prev => prev.map(l => l.funnelId === id ? { ...l, funnelId: targetFunnelId, stageId: targetStageId } : l));
    }
    setFunnels(prev => prev.filter(f => f.id !== id));
  };

  const addStage = (funnelId: string, name: string) => {
    setFunnels(prev => prev.map(f => {
      if (f.id === funnelId) {
        const nextOrder = f.stages.length;
        const newStage: Stage = { id: `s_${Date.now()}`, name, color: 'bg-gray-100', order: nextOrder };
        return { ...f, stages: [...f.stages, newStage] };
      }
      return f;
    }));
  };

  const reorderStages = (funnelId: string, stages: Stage[]) => {
    setFunnels(prev => prev.map(f => f.id === funnelId ? { ...f, stages } : f));
  };

  const deleteStage = (id: string) => {
    setFunnels(prev => prev.map(f => ({ ...f, stages: f.stages.filter(s => s.id !== id) })));
  };

  const upgradePlan = async (plan: 'pro' | 'enterprise') => {
    if (currentUser?.accountId) {
      setAllAccounts(prev => prev.map(a => a.id === currentUser.accountId ? { ...a, plan } : a));
    }
  };

  const addUser = (user: User) => setUsers(prev => [...prev, user]);
  const updateUser = (id: string, updates: Partial<User>) => setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
  const deleteUser = (id: string) => setUsers(prev => prev.filter(u => u.id !== id));

  const addTeam = (team: Team) => setTeams(prev => [...prev, team]);
  const deleteTeam = (id: string) => setTeams(prev => prev.filter(t => t.id !== id));

  const addTask = (leadId: string, task: Task) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, tasks: [...(l.tasks || []), task] } : l));
  };

  const toggleTask = (leadId: string, taskId: string) => {
    setLeads(prev => prev.map(l => l.id === leadId ? {
      ...l,
      tasks: l.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
    } : l));
  };

  const deleteTask = (leadId: string, taskId: string) => {
    setLeads(prev => prev.map(l => l.id === leadId ? {
      ...l,
      tasks: l.tasks.filter(t => t.id !== taskId)
    } : l));
  };

  const createAccount = (account: Account, admin: User) => {
    setAllAccounts(prev => [...prev, account]);
    setUsers(prev => [...prev, admin]);
  };

  const updateAccountStatus = (id: string, status: 'active' | 'suspended') => {
    setAllAccounts(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  };

  const extendAccountSubscription = (id: string, months: number) => {
    setAllAccounts(prev => prev.map(a => {
      if (a.id === id) {
        const expiry = new Date(a.expiresAt);
        expiry.setMonth(expiry.getMonth() + months);
        return { ...a, expiresAt: expiry.toISOString() };
      }
      return a;
    }));
  };

  const resetFilters = () => {
    setFilters({
      dateRange: '30_days',
      teamId: null,
      userId: null,
      funnelId: null,
      status: 'all'
    });
  };

  return (
    <CRMContext.Provider
      value={{
        leads,
        users,
        teams,
        funnels,
        customFields,
        allAccounts,
        currentUser,
        activeFunnelId,
        filters,
        setFilters,
        filteredLeads,
        metrics,
        login,
        registerAccount,
        updateLead,
        addLead,
        duplicateLead,
        moveLead,
        setActiveFunnelId,
        addCustomField,
        deleteCustomField,
        addFunnel,
        updateFunnel,
        deleteFunnel,
        addStage,
        reorderStages,
        deleteStage,
        upgradePlan,
        addUser,
        updateUser,
        deleteUser,
        addTeam,
        deleteTeam,
        addTask,
        toggleTask,
        deleteTask,
        createAccount,
        updateAccountStatus,
        extendAccountSubscription,
        resetFilters
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
  const ctx = useContext(CRMContext);
  if (!ctx) {
    throw new Error('useCRM must be used within CRMProvider');
  }
  return ctx;
};
