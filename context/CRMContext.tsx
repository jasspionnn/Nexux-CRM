import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { Funnel, Lead, Team, User, Stage, CustomFieldDefinition, Task, Account, UserRole, VisibilityLevel } from '../types.ts';
import { api } from '../services/api.ts';

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
  deleteFunnel: (id: string) => Promise<void>;
  addStage: (funnelId: string, name: string) => Promise<void>;
  updateStage: (funnelId: string, stageId: string, updates: Partial<Stage>) => Promise<void>;
  reorderStages: (funnelId: string, newStages: Stage[]) => Promise<void>;
  deleteStage: (funnelId: string, stageId: string) => Promise<void>;
  addCustomField: (field: CustomFieldDefinition) => Promise<void>;
  updateCustomField: (id: string, updates: Partial<CustomFieldDefinition>) => Promise<void>;
  deleteCustomField: (id: string) => Promise<void>;
  addUser: (user: User) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  addTeam: (team: Team) => Promise<void>;
  updateTeam: (id: string, updates: Partial<Team>) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
  createAccount: (account: Account, adminUser: User) => Promise<void>;
  updateAccountStatus: (accountId: string, status: 'active' | 'suspended') => Promise<void>;
  extendAccountSubscription: (accountId: string, months: number) => Promise<void>;
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
  const [activeFunnelId, setActiveFunnelId] = useState<string>(() => localStorage.getItem('nexus_active_funnel') || '');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { 
    if (activeFunnelId) localStorage.setItem('nexus_active_funnel', activeFunnelId); 
  }, [activeFunnelId]);

  useEffect(() => {
    const savedUser = localStorage.getItem('nexus_user_session');
    if (savedUser) { 
      try { 
        setCurrentUser(JSON.parse(savedUser)); 
      } catch (e) { 
        localStorage.removeItem('nexus_user_session');
      } 
    }
    setIsLoading(false);
  }, []);

  const refreshData = useCallback(async () => {
      if (!currentUser) return;
      setIsLoading(true);
      try {
          if (currentUser.role === UserRole.NEXUS_ADMIN) {
               const data = await api.get<{accounts: Account[]}>('/admin/accounts');
               if (data && data.accounts) {
                 setAccounts(data.accounts);
               }
          } else if (currentUser.accountId) {
               const data = await api.get<any>(`/sync/${currentUser.accountId}`);
               if (data) {
                 setFunnels(data.funnels || []);
                 setLeads(data.leads || []);
                 setUsers(data.users || []);
                 setTeams(data.teams || []);
                 setCustomFields(data.customFields || []);
                 
                 if (data.funnels?.length > 0) {
                     const exists = data.funnels.find((f: any) => f.id === activeFunnelId);
                     if (!activeFunnelId || !exists) {
                         setActiveFunnelId(data.funnels[0].id);
                     }
                 }
               }
          }
      } catch (error) { 
          console.error("Erro na sincronização:", error); 
      } finally { 
          setIsLoading(false); 
      }
  }, [currentUser, activeFunnelId]);

  useEffect(() => { 
    if (currentUser) refreshData(); 
  }, [currentUser, refreshData]);

  const currentAccount = useMemo(() => {
    if (!currentUser?.accountId) return null;
    return accounts.find(a => a.id === currentUser.accountId) || null;
  }, [accounts, currentUser]);

  const visibleLeads = useMemo(() => leads, [leads]);
  const visibleUsers = useMemo(() => users, [users]);

  const login = async (email: string, pass: string): Promise<string | boolean> => {
      setIsLoading(true);
      try {
          const res = await api.post<{user: User}>('/auth/login', { email, password: pass });
          if (res && res.user) {
            setCurrentUser(res.user);
            localStorage.setItem('nexus_user_session', JSON.stringify(res.user));
            return true;
          }
          return "Resposta inválida do servidor.";
      } catch (error: any) { 
          return error.message || "Credenciais inválidas."; 
      } finally { 
          setIsLoading(false); 
      }
  };

  const logout = () => { 
    setCurrentUser(null); 
    localStorage.removeItem('nexus_user_session');
    localStorage.removeItem('nexus_active_funnel');
    setActiveFunnelId(''); 
    setFunnels([]);
    setLeads([]);
    setAccounts([]);
  };

  const registerAccount = async (u: string, e: string, p: string, c: string) => { 
    await api.post('/auth/register', { userName: u, email: e, password: p, companyName: c }); 
    return login(e, p); 
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
    const copy: Lead = { ...original, id: `l-${Date.now()}`, funnelId: targetFunnelId, stageId: targetStageId, createdAt: new Date().toISOString() };
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
    await api.patch(`/tasks/${taskId}/toggle`, {}); 
    refreshData(); 
  };

  const deleteTask = async (leadId: string, taskId: string) => { 
    await api.delete(`/tasks/${taskId}`); 
    refreshData(); 
  };

  const addFunnel = async (name: string) => { 
    if (!currentUser?.accountId) return;
    const nf: Funnel = { 
      id: `f${Date.now()}`, 
      accountId: currentUser.accountId, 
      name, 
      stages: [
        { id: `s1-${Date.now()}`, name: 'Lead', color: 'bg-blue-500', order: 0 }, 
        { id: `s2-${Date.now()}`, name: 'Venda', color: 'bg-green-500', order: 1 }
      ] 
    };
    setFunnels(prev => [...prev, nf]); 
    await api.post('/funnels', nf); 
  };

  const updateFunnel = async (id: string, updates: Partial<Funnel>) => { 
    setFunnels(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f)); 
    await api.patch(`/funnels/${id}`, updates); 
  };

  const deleteFunnel = async (id: string) => { 
    setFunnels(prev => prev.filter(f => f.id !== id)); 
    await api.delete(`/funnels/${id}`); 
  };

  const addStage = async (funnelId: string, name: string) => {
    const funnel = funnels.find(f => f.id === funnelId);
    if (!funnel) return;
    const newStage: Stage = { id: `s-${Date.now()}`, name, color: 'bg-gray-500', order: funnel.stages.length };
    updateFunnel(funnelId, { stages: [...funnel.stages, newStage] });
  };

  const updateStage = async (funnelId: string, stageId: string, updates: Partial<Stage>) => {
    const funnel = funnels.find(f => f.id === funnelId);
    if (!funnel) return;
    updateFunnel(funnelId, { stages: funnel.stages.map(s => s.id === stageId ? { ...s, ...updates } : s) });
  };

  const deleteStage = async (funnelId: string, stageId: string) => {
    const funnel = funnels.find(f => f.id === funnelId);
    if (!funnel) return;
    updateFunnel(funnelId, { stages: funnel.stages.filter(s => s.id !== stageId) });
  };

  const reorderStages = async (funnelId: string, newStages: Stage[]) => { 
    updateFunnel(funnelId, { stages: newStages }); 
  };

  const addCustomField = async (f: CustomFieldDefinition) => { 
    setCustomFields(prev => [...prev, f]); 
    await api.post('/custom-fields', f); 
  };

  const updateCustomField = async (id: string, updates: Partial<CustomFieldDefinition>) => { 
    setCustomFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f)); 
    await api.patch(`/custom-fields/${id}`, updates); 
  };

  const deleteCustomField = async (id: string) => { 
    setCustomFields(prev => prev.filter(f => f.id !== id)); 
    await api.delete(`/custom-fields/${id}`); 
  };

  const addUser = async (u: User) => { 
    await api.post('/users', u); 
    refreshData(); 
  };

  const updateUser = async (id: string, updates: Partial<User>) => { 
    await api.patch(`/users/${id}`, updates); 
    refreshData(); 
  };

  const deleteUser = async (id: string) => { 
    await api.delete(`/users/${id}`); 
    refreshData(); 
  };

  const addTeam = async (team: Team) => { 
    await api.post('/teams', team); 
    refreshData(); 
  };

  const updateTeam = async (id: string, updates: Partial<Team>) => { 
    await api.patch(`/teams/${id}`, updates); 
    refreshData(); 
  };

  const deleteTeam = async (id: string) => { 
    await api.delete(`/teams/${id}`); 
    refreshData(); 
  };

  const createAccount = async (a: Account, u: User) => { 
    await api.post('/admin/accounts', { 
      companyName: a.companyName, 
      ownerName: u.name, 
      email: u.email, 
      password: u.password, 
      plan: a.plan 
    }); 
    refreshData(); 
  };

  const updateAccountStatus = async (id: string, s: any) => { 
    await api.patch(`/admin/accounts/${id}`, { status: s }); 
    refreshData(); 
  };

  const extendAccountSubscription = async (id: string, m: number) => { 
    console.log(`Extending subscription for ${id} by ${m} months`);
    refreshData();
  };

  const updateVisibilitySettings = async (level: VisibilityLevel, allowExport: boolean, showGoals: boolean) => {
    if (!currentUser?.accountId) return;
    await api.patch(`/admin/accounts/${currentUser.accountId}`, { 
      visibilityConfig: { level, allowUserExport: allowExport, showTeamGoals: showGoals } 
    });
    refreshData();
  };

  return (
    <CRMContext.Provider value={{
      funnels, leads, users, teams, customFields, allAccounts: accounts,
      activeFunnelId, currentUser, isLoading, visibleLeads, visibleUsers, currentAccount,
      setActiveFunnelId, login, registerAccount, logout, refreshData,
      addLead, updateLead, moveLead, duplicateLead, deleteLead, addTask, toggleTask, deleteTask,
      addFunnel, updateFunnel, deleteFunnel, addStage, updateStage, reorderStages, deleteStage,
      addCustomField, updateCustomField, deleteCustomField, addUser, updateUser, deleteUser,
      addTeam, updateTeam, deleteTeam, createAccount, updateAccountStatus, extendAccountSubscription, updateVisibilitySettings
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