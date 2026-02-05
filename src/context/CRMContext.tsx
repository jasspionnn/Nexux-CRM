import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { Funnel, Lead, Team, User, Stage, CustomFieldDefinition, Task, Account, UserRole, VisibilityLevel } from '../types';
import { api } from '../services/api';

interface CRMContextType {
  funnels: Funnel[];
  leads: Lead[];
  users: User[];
  teams: Team[];
  customFields: CustomFieldDefinition[];
  allAccounts: Account[];
  activeFunnelId: string;
  currentUser: User | null;
  isLoading: boolean;
  
  visibleLeads: Lead[];
  visibleUsers: User[];
  currentAccount: Account | null;

  setActiveFunnelId: (id: string) => void;
  login: (email: string, pass: string) => Promise<string | boolean>;
  registerAccount: (userName: string, email: string, pass: string, companyName: string) => Promise<string | boolean>;
  logout: () => void;
  refreshData: () => Promise<void>;

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
  deleteFunnel: (id: string, targetFunnelId?: string, targetStageId?: string) => Promise<void>;
  addStage: (funnelId: string, name: string) => Promise<void>;
  updateStage: (funnelId: string, stageId: string, updates: Partial<Stage>) => Promise<void>;
  reorderStages: (funnelId: string, newStages: Stage[]) => Promise<void>;
  deleteStage: (funnelId: string, stageId: string) => Promise<void>;
  addCustomField: (field: CustomFieldDefinition) => Promise<void>;
  deleteCustomField: (id: string) => Promise<void>;
  getFunnelStats: (funnelId: string) => { totalValue: number; leadCount: number };
  
  addUser: (user: User) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  addTeam: (team: Team) => Promise<void>;
  updateTeam: (id: string, updates: Partial<Team>) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;

  createAccount: (account: Account, adminUser: User) => Promise<void>;
  updateAccountStatus: (accountId: string, status: 'active' | 'suspended') => Promise<void>;
  extendAccountSubscription: (accountId: string, months: number) => Promise<void>;
  upgradePlan: (plan: 'pro' | 'enterprise') => Promise<void>;
  updateVisibilitySettings: (level: VisibilityLevel, allowExport: boolean, showGoals: boolean) => Promise<void>;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

export const CRMProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]); 

  const [activeFunnelId, setActiveFunnelId] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('nexus_user_session');
    if (savedUser) {
        try {
            setCurrentUser(JSON.parse(savedUser));
        } catch (e) {
            localStorage.removeItem('nexus_user_session');
        }
    }
  }, []);

  const refreshData = useCallback(async () => {
      if (!currentUser) return;
      setIsLoading(true);
      try {
          if (currentUser.role === UserRole.NEXUS_ADMIN) {
               const data = await api.get<{accounts: Account[]}>('/admin/accounts');
               setAccounts(data.accounts || []);
          } else {
               const data = await api.get<any>(`/sync/${currentUser.accountId}`);
               const fetchedFunnels = data.funnels || [];
               setFunnels(fetchedFunnels);
               setLeads(data.leads || []);
               setUsers(data.users || []);
               setTeams(data.teams || []);
               setCustomFields(data.customFields || []);

               if (fetchedFunnels.length > 0) {
                   const exists = fetchedFunnels.some((f: any) => f.id === activeFunnelId);
                   if (!activeFunnelId || !exists) {
                       setActiveFunnelId(fetchedFunnels[0].id);
                   }
               }
          }
      } catch (error) {
          console.error("Sync error:", error);
      } finally {
          setIsLoading(false);
      }
  }, [currentUser, activeFunnelId]);

  useEffect(() => {
      if (currentUser) refreshData();
  }, [currentUser]);

  const currentAccount = useMemo(() => {
    if (!currentUser?.accountId) return null;
    return accounts.find(a => a.id === currentUser.accountId) || null;
  }, [accounts, currentUser]);

  const visibleLeads = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === UserRole.NEXUS_ADMIN || currentUser.role === UserRole.ACCOUNT_ADMIN) {
      return leads;
    }
    const level = currentAccount?.visibilityConfig?.level || 'public';
    if (level === 'public') return leads;
    if (level === 'private') return leads.filter(l => l.assignedUserId === currentUser.id);
    if (level === 'team') {
      const teamUserIds = users.filter(u => u.teamId === currentUser.teamId).map(u => u.id);
      return leads.filter(l => teamUserIds.includes(l.assignedUserId));
    }
    return leads;
  }, [leads, currentUser, currentAccount, users]);

  const visibleUsers = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === UserRole.NEXUS_ADMIN || currentUser.role === UserRole.ACCOUNT_ADMIN) {
      return users;
    }
    const level = currentAccount?.visibilityConfig?.level || 'public';
    if (level === 'public' || level === 'team') return users;
    return users.filter(u => u.id === currentUser.id);
  }, [users, currentUser, currentAccount]);

  const login = async (email: string, pass: string): Promise<string | boolean> => {
      setIsLoading(true);
      try {
          const res = await api.post<{user: User}>('/auth/login', { email, password: pass });
          setCurrentUser(res.user);
          localStorage.setItem('nexus_user_session', JSON.stringify(res.user));
          return true;
      } catch (error: any) {
          return error.message || "Erro de login.";
      } finally {
          setIsLoading(false);
      }
  };

  const logout = () => {
      setCurrentUser(null);
      setLeads([]);
      setFunnels([]);
      setAccounts([]);
      localStorage.removeItem('nexus_user_session');
      setActiveFunnelId('');
  };

  const updateVisibilitySettings = async (level: VisibilityLevel, allowExport: boolean, showGoals: boolean) => {
    if (!currentUser?.accountId) return;
    try {
      await api.patch(`/admin/accounts/${currentUser.accountId}`, {
        visibilityConfig: { level, allowUserExport: allowExport, showTeamGoals: showGoals }
      });
      refreshData();
    } catch (e) {
      console.error(e);
    }
  };

  const addLead = async (lead: Lead) => { 
    setLeads(prev => [...prev, lead]); 
    await api.post('/leads', lead); 
  };
  
  const updateLead = async (id: string, updates: Partial<Lead>) => { 
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    await api.patch(`/leads/${id}`, updates);
  };
  
  const moveLead = async (leadId: string, targetStageId: string) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stageId: targetStageId } : l));
    await api.patch(`/leads/${leadId}`, { stageId: targetStageId });
  };

  const duplicateLead = async (originalLeadId: string, targetFunnelId: string, targetStageId: string) => {
    const original = leads.find(l => l.id === originalLeadId);
    if (!original) return;
    
    const copy: Lead = {
      ...original,
      id: `l-${Date.now()}`,
      funnelId: targetFunnelId,
      stageId: targetStageId,
      createdAt: new Date().toISOString(),
      notes: [{
        id: `n-${Date.now()}`,
        content: `Lead duplicado a partir de: ${original.title}`,
        createdAt: new Date().toISOString(),
        authorName: 'Sistema'
      }]
    };
    
    setLeads(prev => [...prev, copy]);
    await api.post('/leads', copy);
  };

  const deleteLead = async (id: string) => { 
    setLeads(prev => prev.filter(l => l.id !== id));
    await api.delete(`/leads/${id}`);
  };

  const addTask = async (leadId: string, task: Task) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, tasks: [...(l.tasks || []), task] } : l));
    await api.post('/tasks', { ...task, leadId });
  };
  
  const toggleTask = async (leadId: string, taskId: string) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, tasks: l.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t) } : l));
    await api.patch(`/tasks/${taskId}/toggle`, {});
  };
  
  const deleteTask = async (leadId: string, taskId: string) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, tasks: l.tasks.filter(t => t.id !== taskId) } : l));
    await api.delete(`/tasks/${taskId}`);
  };

  const addFunnel = async (name: string) => { 
    const nf: Funnel = { 
      id: `f${Date.now()}`, 
      accountId: currentUser?.accountId!, 
      name, 
      stages: [
        { id: `s1-${Date.now()}`, name: 'Lead', color: 'bg-blue-500', order: 0 },
        { id: `s2-${Date.now()}`, name: 'Venda', color: 'bg-green-500', order: 1 }
      ] 
    };
    setFunnels(prev => [...prev, nf]); 
    setActiveFunnelId(nf.id); 
    await api.post('/funnels', nf); 
  };

  const updateFunnel = async (id: string, updates: Partial<Funnel>) => {
    setFunnels(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    await api.patch(`/funnels/${id}`, updates);
  };

  const deleteFunnel = async (id: string) => {
    setFunnels(prev => prev.filter(f => f.id !== id));
    if (activeFunnelId === id) setActiveFunnelId('');
    await api.delete(`/funnels/${id}`);
  };

  const addStage = async (funnelId: string, name: string) => {
    const funnel = funnels.find(f => f.id === funnelId);
    if (!funnel) return;
    const newStage: Stage = {
        id: `s-${Date.now()}`,
        name,
        color: 'bg-gray-500',
        order: funnel.stages.length
    };
    const updatedStages = [...funnel.stages, newStage];
    updateFunnel(funnelId, { stages: updatedStages });
  };

  const updateStage = async (funnelId: string, stageId: string, updates: Partial<Stage>) => {
    const funnel = funnels.find(f => f.id === funnelId);
    if (!funnel) return;
    const updatedStages = funnel.stages.map(s => s.id === stageId ? { ...s, ...updates } : s);
    updateFunnel(funnelId, { stages: updatedStages });
  };

  const deleteStage = async (funnelId: string, stageId: string) => {
    const funnel = funnels.find(f => f.id === funnelId);
    if (!funnel) return;
    const updatedStages = funnel.stages.filter(s => s.id !== stageId);
    updateFunnel(funnelId, { stages: updatedStages });
  };

  const reorderStages = async (funnelId: string, newStages: Stage[]) => {
    updateFunnel(funnelId, { stages: newStages });
  };

  const addCustomField = async (f: CustomFieldDefinition) => { 
    setCustomFields(prev => [...prev, f]); 
    await api.post('/custom-fields', f); 
  };

  const deleteCustomField = async (id: string) => { 
    setCustomFields(prev => prev.filter(f => f.id !== id)); 
    await api.delete(`/custom-fields/${id}`); 
  };

  const getFunnelStats = (fid: string) => ({ totalValue: visibleLeads.filter(l => l.funnelId === fid).reduce((a, b) => a + b.value, 0), leadCount: visibleLeads.filter(l => l.funnelId === fid).length });
  
  const addUser = async (u: User) => { 
    const userData = { ...u, accountId: u.accountId || currentUser?.accountId };
    try {
      await api.post('/users', userData);
      // Só atualizamos o estado local após o sucesso na API
      setUsers(prev => [...prev, userData]);
    } catch (e: any) {
      console.error("Add user failed:", e.message);
      throw e;
    }
  };

  const updateUser = async (id: string, updates: Partial<User>) => { 
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    await api.patch(`/users/${id}`, updates);
  };
  const deleteUser = async (id: string) => { setUsers(prev => prev.filter(u => u.id !== id)); await api.delete(`/users/${id}`); };
  
  const addTeam = async (t: Team) => { setTeams(prev => [...prev, t]); await api.post('/teams', t); };
  const updateTeam = async (id: string, updates: Partial<Team>) => {
    setTeams(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    await api.patch(`/teams/${id}`, updates);
  };
  const deleteTeam = async (id: string) => { setTeams(prev => prev.filter(t => t.id !== id)); await api.delete(`/teams/${id}`); };

  const createAccount = async (a: Account, u: User) => { setAccounts(prev => [a, ...prev]); await api.post('/admin/accounts', { companyName: a.companyName, ownerName: u.name, email: u.email, password: u.password, plan: a.plan }); };
  const updateAccountStatus = async (id: string, s: any) => { setAccounts(prev => prev.map(a => a.id === id ? { ...a, status: s } : a)); await api.patch(`/admin/accounts/${id}`, { status: s }); };
  const extendAccountSubscription = async (id: string, m: number) => { /* logic */ };
  const upgradePlan = async (p: any) => { await api.post('/billing/upgrade', { accountId: currentUser?.accountId, plan: p }); refreshData(); };
  const registerAccount = async (u: string, e: string, p: string, c: string) => { await api.post('/auth/register', { userName: u, email: e, password: p, companyName: c }); return login(e, p); };

  return (
    <CRMContext.Provider value={{
      funnels, leads, users, teams, customFields, allAccounts: accounts,
      activeFunnelId, currentUser, isLoading, visibleLeads, visibleUsers, currentAccount,
      setActiveFunnelId, login, registerAccount, logout, refreshData,
      addLead, updateLead, moveLead, duplicateLead, deleteLead, addTask, toggleTask, deleteTask,
      addFunnel, updateFunnel, deleteFunnel, addStage, updateStage, reorderStages, deleteStage,
      addCustomField, deleteCustomField, getFunnelStats, addUser, updateUser, deleteUser,
      addTeam, updateTeam, deleteTeam, createAccount, updateAccountStatus, extendAccountSubscription, upgradePlan,
      updateVisibilitySettings
    }}>
      {children}
    </CRMContext.Provider>
  );
};

export const useCRM = () => {
  const context = useContext(CRMContext);
  if (!context) throw new Error("useCRM error");
  return context;
};