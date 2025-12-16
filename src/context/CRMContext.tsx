
import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo, useCallback } from 'react';
import { Funnel, Lead, Team, User, Stage, CustomFieldDefinition, Task, Account, UserRole } from '../types';
import { INITIAL_FUNNELS, MOCK_LEADS, MOCK_TEAMS, MOCK_USERS, MOCK_ACCOUNTS } from '../constants';
import { api } from '../services/api';

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
  isLoading: boolean;
  
  setActiveFunnelId: (id: string) => void;
  login: (email: string, pass: string) => Promise<string | boolean>;
  registerAccount: (userName: string, email: string, pass: string, companyName: string) => Promise<string | boolean>;
  logout: () => void;
  refreshData: () => Promise<void>;

  // CRM Actions
  addLead: (lead: Lead) => Promise<void>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
  moveLead: (leadId: string, targetStageId: string) => Promise<void>;
  duplicateLead: (originalLeadId: string, targetFunnelId: string, targetStageId: string) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  addTask: (leadId: string, task: Task) => Promise<void>;
  toggleTask: (leadId: string, taskId: string) => Promise<void>;
  deleteTask: (leadId: string, taskId: string) => Promise<void>;
  
  addFunnel: (name: string) => Promise<void>;
  updateFunnel: (id: string, updates: Partial<Funnel>) => Promise<void>;
  addStage: (funnelId: string, name: string) => Promise<void>;
  reorderStages: (funnelId: string, newStages: Stage[]) => Promise<void>;
  addCustomField: (field: CustomFieldDefinition) => Promise<void>;
  deleteCustomField: (id: string) => Promise<void>;
  getFunnelStats: (funnelId: string) => { totalValue: number; leadCount: number };
  
  // User & Team Management
  addUser: (user: User) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  addTeam: (team: Team) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;

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
  // --- STATE ---
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [activeFunnelId, setActiveFunnelId] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // --- INITIALIZATION ---

  // 1. Load User Session
  useEffect(() => {
    const savedUser = localStorage.getItem('nexus_user_session');
    if (savedUser) {
        try {
            const parsed = JSON.parse(savedUser);
            setCurrentUser(parsed);
        } catch (e) {
            console.error("Failed to parse session", e);
        }
    }
  }, []);

  // 2. Fetch Data (Sync) when User is Logged In
  const refreshData = useCallback(async () => {
      if (!currentUser || !currentUser.accountId) return;
      setIsLoading(true);
      try {
          if (currentUser.role === UserRole.NEXUS_ADMIN) {
              setAccounts(MOCK_ACCOUNTS); 
          } else {
              const data = await api.get<any>(`/sync/${currentUser.accountId}`);
              setFunnels(data.funnels || []);
              setLeads(data.leads || []);
              setUsers(data.users || []);
              setTeams(data.teams || []);
              setCustomFields(data.customFields || []);

              if (!activeFunnelId && data.funnels && data.funnels.length > 0) {
                  setActiveFunnelId(data.funnels[0].id);
              }
          }
      } catch (error) {
          console.error("Sync error:", error);
      } finally {
          setIsLoading(false);
      }
  }, [currentUser, activeFunnelId]);

  useEffect(() => {
      if (currentUser) {
          refreshData();
      }
  }, [currentUser]);

  // --- AUTH ACTIONS ---

  const login = async (email: string, pass: string): Promise<string | boolean> => {
      setIsLoading(true);
      try {
          const res = await api.post<{user: User}>('/auth/login', { email, password: pass });
          setCurrentUser(res.user);
          localStorage.setItem('nexus_user_session', JSON.stringify(res.user));
          return true;
      } catch (error: any) {
          console.error(error);
          return "Credenciais inválidas ou erro no servidor.";
      } finally {
          setIsLoading(false);
      }
  };

  const registerAccount = async (userName: string, email: string, pass: string, companyName: string): Promise<string | boolean> => {
      setIsLoading(true);
      try {
          await api.post('/auth/register', { userName, email, password: pass, companyName });
          return await login(email, pass);
      } catch (error: any) {
          console.error(error);
          return "Erro ao criar conta. Tente outro email.";
      } finally {
          setIsLoading(false);
      }
  };

  const logout = () => {
      setCurrentUser(null);
      setLeads([]);
      setFunnels([]);
      localStorage.removeItem('nexus_user_session');
      setActiveFunnelId('');
  };

  // --- LEADS & TASKS ---

  const addLead = async (lead: Lead) => {
    setLeads(prev => [...prev, lead]);
    try {
        await api.post('/leads', lead);
    } catch (e) {
        console.error("Failed to add lead", e);
        refreshData(); 
    }
  };

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    try {
        await api.patch(`/leads/${id}`, updates);
    } catch (e) { console.error("Failed to update lead", e); }
  };

  const moveLead = async (leadId: string, targetStageId: string) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stageId: targetStageId } : l));
    try {
        await api.patch(`/leads/${leadId}`, { stageId: targetStageId });
    } catch (e) { console.error(e); }
  };

  const duplicateLead = async (originalLeadId: string, targetFunnelId: string, targetStageId: string) => {
    const originalLead = leads.find(l => l.id === originalLeadId);
    if (!originalLead || !currentUser?.accountId) return;

    const originalFunnelName = funnels.find(f => f.id === originalLead.funnelId)?.name || 'Desconhecido';
    
    const newLead: Lead = {
      ...originalLead,
      id: `l_${Date.now()}`,
      accountId: currentUser.accountId,
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
    
    setLeads(prev => [...prev, newLead]);
    try {
        const res = await api.post<{id: string}>('/leads', newLead);
        setLeads(prev => prev.map(l => l.id === newLead.id ? { ...l, id: res.id } : l));
    } catch (e) { refreshData(); }
  };

  const deleteLead = async (id: string) => {
    setLeads(prev => prev.filter(l => l.id !== id));
    // TODO: Implement DELETE /api/leads/:id
  };

  const addTask = async (leadId: string, task: Task) => {
      setLeads(prev => prev.map(l => {
          if (l.id !== leadId) return l;
          return { ...l, tasks: [...(l.tasks || []), task] };
      }));
      try {
          await api.post('/tasks', { ...task, leadId });
      } catch (e) { console.error(e); }
  };

  const toggleTask = async (leadId: string, taskId: string) => {
      setLeads(prev => prev.map(l => {
          if (l.id !== leadId) return l;
          return {
              ...l,
              tasks: l.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
          };
      }));
      try {
          await api.patch(`/tasks/${taskId}/toggle`, {});
      } catch (e) { console.error(e); }
  };

  const deleteTask = async (leadId: string, taskId: string) => {
      setLeads(prev => prev.map(l => {
          if (l.id !== leadId) return l;
          return {
              ...l,
              tasks: l.tasks.filter(t => t.id !== taskId)
          };
      }));
      try {
          await api.delete(`/tasks/${taskId}`);
      } catch (e) { console.error(e); }
  };

  // --- FUNNELS & CONFIG ---
  
  const addFunnel = async (name: string) => {
    if (!currentUser?.accountId) return;
    const newFunnel: Funnel = {
      id: `f${Date.now()}`,
      accountId: currentUser.accountId,
      name,
      stages: [
        { id: `s${Date.now()}_1`, name: 'Novo', color: 'bg-gray-100 border-gray-300', order: 0 },
        { id: `s${Date.now()}_2`, name: 'Ganho', color: 'bg-green-100 border-green-300', order: 1 },
      ]
    };
    setFunnels(prev => [...prev, newFunnel]);
    setActiveFunnelId(newFunnel.id);
    try {
        await api.post('/funnels', newFunnel);
    } catch (e) { refreshData(); }
  };

  const updateFunnel = async (id: string, updates: Partial<Funnel>) => {
    setFunnels(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    try {
        await api.patch(`/funnels/${id}`, updates);
    } catch (e) { console.error(e); }
  };

  const addStage = async (funnelId: string, name: string) => {
    const funnel = funnels.find(f => f.id === funnelId);
    if (!funnel) return;

    const newStage: Stage = {
        id: `s${Date.now()}`,
        name,
        color: 'bg-gray-100 border-gray-300',
        order: funnel.stages.length
    };
    
    setFunnels(prev => prev.map(f => {
      if (f.id !== funnelId) return f;
      return { ...f, stages: [...f.stages, newStage] };
    }));
    
    try {
        await api.post('/stages', { ...newStage, funnelId });
    } catch (e) { refreshData(); }
  };

  const reorderStages = async (funnelId: string, newStages: Stage[]) => {
    setFunnels(prev => prev.map(f => {
      if (f.id !== funnelId) return f;
      const updatedStages = newStages.map((stage, index) => ({
        ...stage,
        order: index
      }));
      return { ...f, stages: updatedStages };
    }));

    try {
        await api.post('/stages/reorder', { funnelId, stages: newStages });
    } catch (e) { refreshData(); }
  };

  const addCustomField = async (field: CustomFieldDefinition) => {
    if (!currentUser?.accountId) return;
    const fieldWithAccount = { ...field, accountId: currentUser.accountId };
    setCustomFields(prev => [...prev, fieldWithAccount]);
    try {
        await api.post('/custom-fields', fieldWithAccount);
    } catch (e) { refreshData(); }
  };

  const deleteCustomField = async (id: string) => {
    setCustomFields(prev => prev.filter(f => f.id !== id));
    try {
        await api.delete(`/custom-fields/${id}`);
    } catch (e) { refreshData(); }
  };

  const getFunnelStats = (funnelId: string) => {
    const funnelLeads = leads.filter(l => l.funnelId === funnelId);
    return {
      totalValue: funnelLeads.reduce((acc, curr) => acc + curr.value, 0),
      leadCount: funnelLeads.length
    };
  };

  // --- USER & TEAMS ---

  const addUser = async (user: User) => {
    if (!currentUser?.accountId && currentUser?.role !== UserRole.NEXUS_ADMIN) return;
    const finalUser = currentUser.role === UserRole.NEXUS_ADMIN ? user : { ...user, accountId: currentUser.accountId };
    setUsers(prev => [...prev, finalUser]);
    try {
        await api.post('/users', finalUser);
    } catch (e) { refreshData(); }
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    if (currentUser?.id === id) {
        const updated = { ...currentUser, ...updates };
        setCurrentUser(updated);
        localStorage.setItem('nexus_user_session', JSON.stringify(updated));
    }
    try {
        await api.patch(`/users/${id}`, updates);
    } catch (e) { console.error(e); }
  };

  const deleteUser = async (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    try {
        await api.delete(`/users/${id}`);
    } catch (e) { refreshData(); }
  };

  const addTeam = async (team: Team) => {
    if (!currentUser?.accountId) return;
    const newTeam = { ...team, accountId: currentUser.accountId };
    setTeams(prev => [...prev, newTeam]);
    try {
        await api.post('/teams', newTeam);
    } catch (e) { refreshData(); }
  };

  const deleteTeam = async (id: string) => {
    setTeams(prev => prev.filter(t => t.id !== id));
    setUsers(prev => prev.map(u => u.teamId === id ? { ...u, teamId: undefined } : u));
    try {
        await api.delete(`/teams/${id}`);
    } catch (e) { refreshData(); }
  };

  // --- NEXUS ADMIN (MOCK FOR NOW OR IMPLEMENT LATER) ---

  const createAccount = (account: Account, adminUser: User) => {
      setAccounts(prev => [...prev, account]);
      setUsers(prev => [...prev, adminUser]);
  };

  const updateAccountStatus = (accountId: string, status: 'active' | 'suspended') => {
      setAccounts(prev => prev.map(a => a.id === accountId ? { ...a, status } : a));
  };

  const extendAccountSubscription = (accountId: string, months: number) => {
      setAccounts(prev => prev.map(a => {
          if (a.id !== accountId) return a;
          const currentExpiry = new Date(a.expiresAt);
          const baseDate = currentExpiry < new Date() ? new Date() : currentExpiry;
          baseDate.setMonth(baseDate.getMonth() + months);
          return { ...a, expiresAt: baseDate.toISOString(), status: 'active' };
      }));
  };

  const upgradePlan = async (plan: 'pro' | 'enterprise') => {
      if (!currentUser?.accountId) return;
      await new Promise(resolve => setTimeout(resolve, 2000));
  };

  return (
    <CRMContext.Provider value={{
      funnels,
      leads,
      users,
      teams,
      customFields,
      allAccounts: accounts,
      activeFunnelId,
      currentUser,
      isLoading,
      setActiveFunnelId,
      login,
      registerAccount,
      logout,
      refreshData,
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
      createAccount,
      updateAccountStatus,
      extendAccountSubscription,
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
