
import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';
import { Funnel, Lead, Team, User, Stage, CustomFieldDefinition, Task, Account, UserRole } from '../types';
import { INITIAL_FUNNELS, MOCK_LEADS, MOCK_TEAMS, MOCK_USERS, MOCK_ACCOUNTS } from '../constants';

interface CRMContextType {
  // Data (Filtered by Account)
  funnels: Funnel[];
  leads: Lead[];
  users: User[];
  teams: Team[];
  customFields: CustomFieldDefinition[];
  
  // Data (Nexus Admin Only)
  allAccounts: Account[];
  
  activeFunnelId: string;
  currentUser: User | null; // Auth State
  
  setActiveFunnelId: (id: string) => void;
  login: (email: string, pass: string) => string | boolean; // Returns error string or true
  registerAccount: (userName: string, email: string, pass: string, companyName: string) => string | boolean;
  logout: () => void;

  // CRM Actions
  addLead: (lead: Lead) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  moveLead: (leadId: string, targetStageId: string) => void;
  duplicateLead: (originalLeadId: string, targetFunnelId: string, targetStageId: string) => void;
  deleteLead: (id: string) => void;
  addTask: (leadId: string, task: Task) => void;
  toggleTask: (leadId: string, taskId: string) => void;
  deleteTask: (leadId: string, taskId: string) => void;
  
  addFunnel: (name: string) => void;
  updateFunnel: (id: string, updates: Partial<Funnel>) => void;
  addStage: (funnelId: string, name: string) => void;
  reorderStages: (funnelId: string, newStages: Stage[]) => void;
  addCustomField: (field: CustomFieldDefinition) => void;
  deleteCustomField: (id: string) => void;
  getFunnelStats: (funnelId: string) => { totalValue: number; leadCount: number };
  
  // User & Team Management
  addUser: (user: User) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  addTeam: (team: Team) => void;
  deleteTeam: (id: string) => void;

  // Nexus Admin Actions
  createAccount: (account: Account, adminUser: User) => void;
  updateAccountStatus: (accountId: string, status: 'active' | 'suspended') => void;
  extendAccountSubscription: (accountId: string, months: number) => void;
  
  // Payment Integration (Mock)
  upgradePlan: (plan: 'pro' | 'enterprise') => Promise<void>;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

interface CRMProviderProps {
  children: ReactNode;
}

export const CRMProvider: React.FC<CRMProviderProps> = ({ children }) => {
  // Master Data (Contains data for ALL accounts)
  const [masterFunnels, setMasterFunnels] = useState<Funnel[]>(INITIAL_FUNNELS);
  const [masterLeads, setMasterLeads] = useState<Lead[]>(MOCK_LEADS);
  const [masterUsers, setMasterUsers] = useState<User[]>(MOCK_USERS);
  const [masterTeams, setMasterTeams] = useState<Team[]>(MOCK_TEAMS);
  const [masterCustomFields, setMasterCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [masterAccounts, setMasterAccounts] = useState<Account[]>(MOCK_ACCOUNTS);

  const [activeFunnelId, setActiveFunnelId] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Load user from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('nexus_user');
    if (savedUser) {
        try {
            const parsed = JSON.parse(savedUser);
            setCurrentUser(parsed);
        } catch (e) {}
    }
  }, []);

  // --- FILTERED DATA (Based on Current User) ---
  const currentAccountId = currentUser?.accountId;
  const isNexusAdmin = currentUser?.role === UserRole.NEXUS_ADMIN;

  const visibleFunnels = useMemo(() => {
      if (isNexusAdmin) return []; // Admin Nexus doesn't see pipelines
      return masterFunnels.filter(f => f.accountId === currentAccountId);
  }, [masterFunnels, currentAccountId, isNexusAdmin]);

  const visibleLeads = useMemo(() => {
      if (isNexusAdmin) return [];
      return masterLeads.filter(l => l.accountId === currentAccountId);
  }, [masterLeads, currentAccountId, isNexusAdmin]);

  const visibleUsers = useMemo(() => {
      if (isNexusAdmin) return [];
      return masterUsers.filter(u => u.accountId === currentAccountId);
  }, [masterUsers, currentAccountId, isNexusAdmin]);

  const visibleTeams = useMemo(() => {
      if (isNexusAdmin) return [];
      return masterTeams.filter(t => t.accountId === currentAccountId);
  }, [masterTeams, currentAccountId, isNexusAdmin]);
  
  const visibleCustomFields = useMemo(() => {
      if (isNexusAdmin) return [];
      return masterCustomFields.filter(f => f.accountId === currentAccountId);
  }, [masterCustomFields, currentAccountId, isNexusAdmin]);


  // Set default active funnel when filtered list changes
  useEffect(() => {
      if (visibleFunnels.length > 0 && !visibleFunnels.find(f => f.id === activeFunnelId)) {
          setActiveFunnelId(visibleFunnels[0].id);
      }
  }, [visibleFunnels, activeFunnelId]);


  // --- AUTH ACTIONS ---

  const login = (email: string, pass: string): string | boolean => {
      const user = masterUsers.find(u => u.email === email);
      
      if (!user) return "Usuário não encontrado.";
      
      // Simple Password Check
      const isValid = user.password ? user.password === pass : pass === '123';
      if (!isValid) return "Senha incorreta.";

      // Account Status Check (Skip for Nexus Admin)
      if (user.role !== UserRole.NEXUS_ADMIN && user.accountId) {
          const account = masterAccounts.find(a => a.id === user.accountId);
          if (!account) return "Conta da empresa não encontrada.";
          if (account.status === 'suspended') return "Esta conta está suspensa. Contate o suporte.";
          if (new Date(account.expiresAt) < new Date()) return "A assinatura da conta expirou.";
      }

      if (user.status === 'inactive') return "Usuário inativo.";

      // Auto-activate pending
      if (user.status === 'pending') {
          const activeUser = { ...user, status: 'active' as const };
          setMasterUsers(prev => prev.map(u => u.id === user.id ? activeUser : u));
          setCurrentUser(activeUser);
          localStorage.setItem('nexus_user', JSON.stringify(activeUser));
      } else {
          setCurrentUser(user);
          localStorage.setItem('nexus_user', JSON.stringify(user));
      }
      return true;
  };

  const registerAccount = (userName: string, email: string, pass: string, companyName: string) => {
      // Check if user exists
      if (masterUsers.find(u => u.email === email)) {
          return "Este email já está cadastrado.";
      }

      const accountId = `acc_${Date.now()}`;
      
      const newAccount: Account = {
          id: accountId,
          companyName,
          ownerName: userName,
          email,
          status: 'active',
          plan: 'trial',
          subscriptionStatus: 'trialing',
          createdAt: new Date().toISOString(),
          expiresAt: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString() // 30 days trial
      };

      const newUser: User = {
          id: `u_${Date.now()}`,
          accountId: accountId,
          name: userName,
          email,
          password: pass,
          role: UserRole.ACCOUNT_ADMIN,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=random`,
          status: 'active',
          joinedAt: new Date().toISOString()
      };

       // Default Funnel
      const defaultFunnel: Funnel = {
        id: `f_def_${accountId}`,
        accountId: accountId,
        name: 'Vendas Padrão',
        stages: [
            { id: `s_${Date.now()}_1`, name: 'Novo Lead', color: 'bg-gray-100 border-gray-300', order: 0 },
            { id: `s_${Date.now()}_2`, name: 'Qualificação', color: 'bg-blue-50 border-blue-200', order: 1 },
            { id: `s_${Date.now()}_3`, name: 'Fechamento', color: 'bg-green-50 border-green-200', order: 2 },
        ]
      };

      setMasterAccounts(prev => [...prev, newAccount]);
      setMasterUsers(prev => [...prev, newUser]);
      setMasterFunnels(prev => [...prev, defaultFunnel]);
      setActiveFunnelId(defaultFunnel.id);

      // Auto login
      setCurrentUser(newUser);
      localStorage.setItem('nexus_user', JSON.stringify(newUser));

      return true;
  };

  const logout = () => {
      setCurrentUser(null);
      localStorage.removeItem('nexus_user');
      setActiveFunnelId('');
  };

  // --- CRM ACTIONS (Auto-inject Account ID) ---

  const addLead = (lead: Lead) => {
    if (!currentAccountId) return;
    setMasterLeads([...masterLeads, { ...lead, accountId: currentAccountId }]);
  };

  const updateLead = (id: string, updates: Partial<Lead>) => {
    setMasterLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const moveLead = (leadId: string, targetStageId: string) => {
    setMasterLeads(prev => prev.map(l => l.id === leadId ? { ...l, stageId: targetStageId } : l));
  };

  const duplicateLead = (originalLeadId: string, targetFunnelId: string, targetStageId: string) => {
    const originalLead = masterLeads.find(l => l.id === originalLeadId);
    if (!originalLead || !currentAccountId) return;

    const originalFunnelName = visibleFunnels.find(f => f.id === originalLead.funnelId)?.name || 'Desconhecido';
    
    const newLead: Lead = {
      ...originalLead,
      id: `l${Date.now()}`,
      accountId: currentAccountId,
      funnelId: targetFunnelId,
      stageId: targetStageId,
      createdAt: new Date().toISOString(),
      title: `${originalLead.title} (Cópia)`,
      tasks: [],
      notes: [{
          id: `n-sys-${Date.now()}`,
          content: `Lead duplicado a partir do funil: ${originalFunnelName}.`,
          createdAt: new Date().toISOString(),
          authorName: 'Sistema'
      }]
    };
    
    setMasterLeads(prev => [...prev, newLead]);
  };

  const deleteLead = (id: string) => {
    setMasterLeads(prev => prev.filter(l => l.id !== id));
  };

  const addTask = (leadId: string, task: Task) => {
      setMasterLeads(prev => prev.map(l => {
          if (l.id !== leadId) return l;
          return { ...l, tasks: [...(l.tasks || []), task] };
      }));
  };

  const toggleTask = (leadId: string, taskId: string) => {
      setMasterLeads(prev => prev.map(l => {
          if (l.id !== leadId) return l;
          return {
              ...l,
              tasks: l.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
          };
      }));
  };

  const deleteTask = (leadId: string, taskId: string) => {
      setMasterLeads(prev => prev.map(l => {
          if (l.id !== leadId) return l;
          return {
              ...l,
              tasks: l.tasks.filter(t => t.id !== taskId)
          };
      }));
  };

  const addFunnel = (name: string) => {
    if (!currentAccountId) return;
    const newFunnel: Funnel = {
      id: `f${Date.now()}`,
      accountId: currentAccountId,
      name,
      stages: [
        { id: `s${Date.now()}_1`, name: 'Novo', color: 'bg-gray-100 border-gray-300', order: 0 },
        { id: `s${Date.now()}_2`, name: 'Ganho', color: 'bg-green-100 border-green-300', order: 1 },
      ]
    };
    setMasterFunnels([...masterFunnels, newFunnel]);
    setActiveFunnelId(newFunnel.id);
  };

  const updateFunnel = (id: string, updates: Partial<Funnel>) => {
    setMasterFunnels(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const addStage = (funnelId: string, name: string) => {
    setMasterFunnels(prev => prev.map(f => {
      if (f.id !== funnelId) return f;
      const newStage: Stage = {
        id: `s${Date.now()}`,
        name,
        color: 'bg-gray-100 border-gray-300',
        order: f.stages.length
      };
      return { ...f, stages: [...f.stages, newStage] };
    }));
  };

  const reorderStages = (funnelId: string, newStages: Stage[]) => {
    setMasterFunnels(prev => prev.map(f => {
      if (f.id !== funnelId) return f;
      const updatedStages = newStages.map((stage, index) => ({
        ...stage,
        order: index
      }));
      return { ...f, stages: updatedStages };
    }));
  };

  const addCustomField = (field: CustomFieldDefinition) => {
    if (!currentAccountId) return;
    setMasterCustomFields(prev => [...prev, { ...field, accountId: currentAccountId }]);
  };

  const deleteCustomField = (id: string) => {
    setMasterCustomFields(prev => prev.filter(f => f.id !== id));
  };

  const getFunnelStats = (funnelId: string) => {
    const funnelLeads = visibleLeads.filter(l => l.funnelId === funnelId);
    return {
      totalValue: funnelLeads.reduce((acc, curr) => acc + curr.value, 0),
      leadCount: funnelLeads.length
    };
  };

  const addUser = (user: User) => {
    if (!currentAccountId && !isNexusAdmin) return;
    // If user is Account Admin creating a user, force correct accountId
    const finalUser = isNexusAdmin ? user : { ...user, accountId: currentAccountId };
    setMasterUsers(prev => [...prev, finalUser]);
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    setMasterUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    if (currentUser?.id === id) {
        const updated = { ...currentUser, ...updates };
        setCurrentUser(updated);
        localStorage.setItem('nexus_user', JSON.stringify(updated));
    }
  };

  const deleteUser = (id: string) => {
    setMasterUsers(prev => prev.filter(u => u.id !== id));
  };

  const addTeam = (team: Team) => {
    if (!currentAccountId) return;
    setMasterTeams(prev => [...prev, { ...team, accountId: currentAccountId }]);
  };

  const deleteTeam = (id: string) => {
    setMasterTeams(prev => prev.filter(t => t.id !== id));
    setMasterUsers(prev => prev.map(u => u.teamId === id ? { ...u, teamId: undefined } : u));
  };

  // --- NEXUS ADMIN ACTIONS ---

  const createAccount = (account: Account, adminUser: User) => {
      setMasterAccounts(prev => [...prev, account]);
      setMasterUsers(prev => [...prev, adminUser]);
      
      // Create Default Funnel for new account
      const defaultFunnel: Funnel = {
        id: `f_def_${account.id}`,
        accountId: account.id,
        name: 'Funil Padrão',
        stages: [
            { id: `s_${Date.now()}_1`, name: 'Lead', color: 'bg-gray-100 border-gray-300', order: 0 },
            { id: `s_${Date.now()}_2`, name: 'Negociação', color: 'bg-blue-50 border-blue-200', order: 1 },
            { id: `s_${Date.now()}_3`, name: 'Ganho', color: 'bg-green-50 border-green-200', order: 2 },
        ]
      };
      setMasterFunnels(prev => [...prev, defaultFunnel]);
  };

  const updateAccountStatus = (accountId: string, status: 'active' | 'suspended') => {
      setMasterAccounts(prev => prev.map(a => a.id === accountId ? { ...a, status } : a));
  };

  const extendAccountSubscription = (accountId: string, months: number) => {
      setMasterAccounts(prev => prev.map(a => {
          if (a.id !== accountId) return a;
          const currentExpiry = new Date(a.expiresAt);
          // If already expired, start from now
          const baseDate = currentExpiry < new Date() ? new Date() : currentExpiry;
          baseDate.setMonth(baseDate.getMonth() + months);
          return { ...a, expiresAt: baseDate.toISOString(), status: 'active' };
      }));
  };

  // --- PAYMENT / UPGRADE (Mock) ---
  const upgradePlan = async (plan: 'pro' | 'enterprise') => {
      if (!currentAccountId) return;
      
      // Simulate API Call
      await new Promise(resolve => setTimeout(resolve, 2000));

      setMasterAccounts(prev => prev.map(a => {
          if (a.id !== currentAccountId) return a;
          const newExpiry = new Date();
          newExpiry.setFullYear(newExpiry.getFullYear() + 1); // 1 year sub
          
          return {
              ...a,
              plan,
              subscriptionStatus: 'active',
              expiresAt: newExpiry.toISOString()
          };
      }));
  };

  return (
    <CRMContext.Provider value={{
      // Filtered Views
      funnels: visibleFunnels,
      leads: visibleLeads,
      users: visibleUsers,
      teams: visibleTeams,
      customFields: visibleCustomFields,
      
      // Admin Views
      allAccounts: masterAccounts,

      activeFunnelId,
      currentUser,
      setActiveFunnelId,
      login,
      registerAccount,
      logout,
      addLead,
      updateLead,
      moveLead,
      duplicateLead,
      deleteLead,
      addTask,
      toggleTask,
      deleteTask,
      addFunnel,
      updateFunnel,
      addStage,
      reorderStages,
      addCustomField,
      deleteCustomField,
      getFunnelStats,
      addUser,
      updateUser,
      deleteUser,
      addTeam,
      deleteTeam,
      
      // Nexus Actions
      createAccount,
      updateAccountStatus,
      extendAccountSubscription,
      
      // Payments
      upgradePlan
    }}>
      {children}
    </CRMContext.Provider>
  );
};

export const useCRM = () => {
  const context = useContext(CRMContext);
  if (!context) throw new Error("useCRM must be used within a CRMProvider");
  return context;
};
