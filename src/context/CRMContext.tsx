
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { Funnel, Lead, Team, User, Stage, CustomFieldDefinition, Task, Account, UserRole, Webhook, KnowledgeSource, BotInstance } from '../types';
import { api } from '../services/api';

interface CRMContextType {
  funnels: Funnel[];
  leads: Lead[];
  users: User[];
  teams: Team[];
  customFields: CustomFieldDefinition[];
  allAccounts: Account[];
  webhooks: Webhook[];
  knowledgeSources: KnowledgeSource[];
  botInstance: BotInstance | null;
  activeFunnelId: string;
  currentUser: User | null;
  isLoading: boolean;
  isOnline: boolean;
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
  addFunnel: (name: string) => Promise<void>;
  updateFunnel: (id: string, updates: Partial<Funnel>) => Promise<void>;
  deleteFunnel: (id: string) => Promise<void>;
  addStage: (funnelId: string, name: string) => Promise<void>;
  updateStage: (funnelId: string, stageId: string, updates: Partial<Stage>) => Promise<void>;
  deleteStage: (funnelId: string, stageId: string) => Promise<void>;
  reorderStages: (funnelId: string, stages: Stage[]) => Promise<void>;
  addTask: (leadId: string, task: Task) => Promise<void>;
  toggleTask: (leadId: string, taskId: string) => Promise<void>;
  deleteTask: (leadId: string, taskId: string) => Promise<void>;
  addCustomField: (field: CustomFieldDefinition) => Promise<void>;
  updateCustomField: (id: string, updates: Partial<CustomFieldDefinition>) => Promise<void>;
  deleteCustomField: (id: string) => Promise<void>;
  addUser: (user: User) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  addTeam: (team: Team) => Promise<void>;
  updateTeam: (id: string, updates: Partial<Team>) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
  updateAccountStatus: (accountId: string, status: string) => Promise<void>;
  extendAccountSubscription: (accountId: string, months: number) => Promise<void>;
  updateVisibilitySettings: (updates: any) => Promise<void>;
  addWebhook: (webhook: Partial<Webhook>) => Promise<void>;
  updateWebhook: (id: string, updates: Partial<Webhook>) => Promise<void>;
  deleteWebhook: (id: string) => Promise<void>;
  addKnowledgeSource: (source: KnowledgeSource) => Promise<void>;
  deleteKnowledgeSource: (id: string) => Promise<void>;
  updateBotInstance: (updates: Partial<BotInstance>) => Promise<void>;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

export const CRMProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([]);
  const [botInstance, setBotInstance] = useState<BotInstance | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]); 
  const [activeFunnelId, setActiveFunnelId] = useState<string>(() => localStorage.getItem('nexus_active_funnel') || '');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const refreshData = useCallback(async () => {
      const savedUser = localStorage.getItem('nexus_user_session');
      const user = savedUser ? JSON.parse(savedUser) : currentUser;
      
      if (!user) {
          setIsLoading(false);
          return;
      }

      try {
          if (user.role === UserRole.NEXUS_ADMIN) {
               const data = await api.get<any>('/admin/accounts');
               if (data && data.accounts) setAccounts(data.accounts);
          } else if (user.accountId) {
               const data = await api.get<any>(`/sync/${user.accountId}`);
               if (data) {
                 setFunnels(data.funnels || []);
                 setLeads(data.leads || []);
                 setUsers(data.users || []);
                 setTeams(data.teams || []);
                 setCustomFields(data.customFields || []);
                 setWebhooks(data.webhooks || []);
                 setKnowledgeSources(data.knowledgeSources || []);
                 setBotInstance(data.botInstance || null);
                 
                 if (data.funnels?.length > 0 && !activeFunnelId) {
                    setActiveFunnelId(data.funnels[0].id);
                 }
               }
          }
      } catch (error) { 
          console.error("Sync Engine Failure:", error); 
      } finally { 
          setIsLoading(false); 
      }
  }, [currentUser, activeFunnelId]);

  useEffect(() => {
    const savedUser = localStorage.getItem('nexus_user_session');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
    refreshData();
  }, []);

  const login = async (email: string, pass: string): Promise<string | boolean> => {
      setIsLoading(true);
      try {
          const res = await api.post<{user: User}>('/auth/login', { email, password: pass });
          if (res && res.user) {
            setCurrentUser(res.user);
            localStorage.setItem('nexus_user_session', JSON.stringify(res.user));
            return true;
          }
          return "Credenciais inválidas.";
      } catch (error: any) { 
          return error.message || "Erro no login."; 
      } finally { 
          setIsLoading(false); 
      }
  };

  const logout = () => { 
    setCurrentUser(null); 
    localStorage.removeItem('nexus_user_session');
    localStorage.removeItem('nexus_active_funnel');
    setFunnels([]);
    setLeads([]);
  };

  const addLead = async (lead: Lead) => { 
    await api.post('/leads', lead);
    setLeads(prev => [...prev, lead]);
  };

  const updateLead = async (id: string, updates: Partial<Lead>) => { 
    await api.patch(`/leads/${id}`, updates); 
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l)); 
  };

  const moveLead = async (leadId: string, targetStageId: string) => { 
    await api.patch(`/leads/${leadId}`, { stageId: targetStageId }); 
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stageId: targetStageId } : l)); 
  };

  const duplicateLead = async (originalLeadId: string, targetFunnelId: string, targetStageId: string) => {
    const original = leads.find(l => l.id === originalLeadId);
    if (!original) return;
    const newList: Lead = {
      ...original,
      id: `l-dup-${Date.now()}`,
      funnelId: targetFunnelId,
      stageId: targetStageId,
      createdAt: new Date().toISOString(),
      notes: [{ id: `sys-${Date.now()}`, content: `Cópia do lead original.`, createdAt: new Date().toISOString(), authorName: 'Sistema' }],
      tasks: []
    };
    await addLead(newList);
  };

  const deleteLead = async (id: string) => { 
    await api.delete(`/leads/${id}`); 
    setLeads(prev => prev.filter(l => l.id !== id)); 
  };

  const addFunnel = async (name: string) => { 
    if (!currentUser?.accountId) return;
    const nf: Funnel = { 
        id: `f-${Date.now()}`, 
        accountId: currentUser.accountId, 
        name, 
        stages: [
            { id: `s1-${Date.now()}`, name: 'Qualificação', color: 'bg-blue-500', order: 0 }, 
            { id: `s2-${Date.now()}`, name: 'Fechado', color: 'bg-green-500', order: 1 }
        ] 
    };
    await api.post('/funnels', nf); 
    setFunnels(prev => [...prev, nf]);
    setActiveFunnelId(nf.id);
  };

  const updateFunnel = async (id: string, updates: Partial<Funnel>) => { 
    await api.patch(`/funnels/${id}`, updates); 
    setFunnels(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f)); 
  };

  const deleteFunnel = async (id: string) => { 
    await api.delete(`/funnels/${id}`); 
    setFunnels(prev => prev.filter(f => f.id !== id)); 
  };

  const addTask = async (leadId: string, task: Task) => { 
      const lead = leads.find(l => l.id === leadId);
      if (!lead) return;
      const updatedTasks = [...(lead.tasks || []), task];
      await updateLead(leadId, { tasks: updatedTasks });
  };

  const toggleTask = async (leadId: string, taskId: string) => { 
      const lead = leads.find(l => l.id === leadId);
      if (!lead) return;
      const updatedTasks = (lead.tasks || []).map(t => t.id === taskId ? { ...t, completed: !t.completed } : t);
      await updateLead(leadId, { tasks: updatedTasks });
  };

  const deleteTask = async (leadId: string, taskId: string) => { 
      const lead = leads.find(l => l.id === leadId);
      if (!lead) return;
      const updatedTasks = (lead.tasks || []).filter(t => t.id !== taskId);
      await updateLead(leadId, { tasks: updatedTasks });
  };
  
  const addUser = async (user: User) => {
    await api.post('/users', user);
    setUsers(prev => [...prev, user]);
  };

  const addTeam = async (team: Team) => {
    await api.post('/teams', team);
    setTeams(prev => [...prev, team]);
  };

  const addCustomField = async (f: CustomFieldDefinition) => { 
    await api.post('/custom-fields', f); 
    setCustomFields(prev => [...prev, f]); 
  };

  return (
    <CRMContext.Provider value={{
      funnels, leads, users, teams, customFields, allAccounts: accounts,
      webhooks, knowledgeSources, botInstance,
      activeFunnelId, currentUser, isLoading, isOnline,
      visibleLeads: leads, visibleUsers: users, currentAccount: accounts.find(a => a.id === currentUser?.accountId) || null,
      setActiveFunnelId, login, registerAccount: async (u,e,p,c) => { await api.post('/auth/register', {userName:u,email:e,password:p,companyName:c}); return login(e,p); }, 
      logout, refreshData, addLead, updateLead, moveLead, deleteLead, duplicateLead,
      addFunnel, updateFunnel, deleteFunnel, 
      addStage: async (fid, n) => { const f = funnels.find(x => x.id === fid); if(!f) return; const ns = {id:`s-${Date.now()}`, name:n, color:'bg-gray-500', order:f.stages.length}; await updateFunnel(fid, {stages:[...f.stages, ns]}); },
      updateStage: async (fid, sid, ups) => { const f = funnels.find(x => x.id === fid); if(!f) return; const ss = f.stages.map(s => s.id === sid ? {...s, ...ups} : s); await updateFunnel(fid, {stages:ss}); },
      deleteStage: async (fid, sid) => { const f = funnels.find(x => x.id === fid); if(!f) return; const ss = f.stages.filter(s => s.id !== sid); await updateFunnel(fid, {stages:ss}); },
      reorderStages: async (fid, ss) => { await updateFunnel(fid, {stages:ss}); },
      addTask, toggleTask, deleteTask, addCustomField, 
      updateCustomField: async (id, ups) => { await api.patch(`/custom-fields/${id}`, ups); setCustomFields(prev => prev.map(f => f.id === id ? {...f, ...ups} : f)); },
      deleteCustomField: async (id) => { await api.delete(`/custom-fields/${id}`); setCustomFields(prev => prev.filter(f => f.id !== id)); },
      addUser, deleteUser: async (id) => { await api.delete(`/users/${id}`); setUsers(prev => prev.filter(u => u.id !== id)); },
      updateUser: async (id, ups) => { await api.patch(`/users/${id}`, ups); setUsers(prev => prev.map(u => u.id === id ? {...u, ...ups} : u)); },
      addTeam, deleteTeam: async (id) => { await api.delete(`/teams/${id}`); setTeams(prev => prev.filter(t => t.id !== id)); },
      updateTeam: async (id, ups) => { await api.patch(`/teams/${id}`, ups); setTeams(prev => prev.map(t => t.id === id ? {...t, ...ups} : t)); },
      updateAccountStatus: async (aid, s) => { await api.patch(`/admin/accounts/${aid}`, {status:s}); refreshData(); },
      extendAccountSubscription: async (aid, m) => { await api.post(`/admin/accounts/${aid}/extend`, {months:m}); refreshData(); },
      updateVisibilitySettings: async (ups) => { if(currentUser?.accountId) { await api.patch(`/admin/accounts/${currentUser.accountId}/visibility`, ups); refreshData(); } },
      addWebhook: async (wh) => { const nwh = {...wh, id:`wh-${Date.now()}`} as Webhook; setWebhooks(prev => [...prev, nwh]); },
      updateWebhook: async (id, ups) => { setWebhooks(prev => prev.map(w => w.id === id ? {...w, ...ups} : w)); },
      deleteWebhook: async (id) => { setWebhooks(prev => prev.filter(w => w.id !== id)); },
      addKnowledgeSource: async (ks) => { setKnowledgeSources(prev => [...prev, ks]); },
      deleteKnowledgeSource: async (id) => { setKnowledgeSources(prev => prev.filter(k => k.id !== id)); },
      updateBotInstance: async (ups) => { if(botInstance) setBotInstance({...botInstance, ...ups}); }
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
