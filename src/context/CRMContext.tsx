
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
    const saved = localStorage.getItem('nexus_user_session');
    const user = saved ? JSON.parse(saved) : currentUser;
    if (!user) { setIsLoading(false); return; }

    try {
      if (user.role === UserRole.NEXUS_ADMIN) {
        const data = await api.get<any>('/admin/accounts');
        if (data?.accounts) setAccounts(data.accounts);
      } else if (user.accountId) {
        const data = await api.get<any>(`/sync/${user.accountId}`);
        if (data) {
          setFunnels(data.funnels || []);
          setLeads(data.leads || []);
          setUsers(data.users || []);
          setTeams(data.teams || []);
          setCustomFields(data.customFields || []);
          if (data.funnels?.length > 0 && !activeFunnelId) setActiveFunnelId(data.funnels[0].id);
        }
      }
    } catch (e) { console.error("Sync Error:", e); }
    finally { setIsLoading(false); }
  }, [currentUser, activeFunnelId]);

  useEffect(() => {
    const saved = localStorage.getItem('nexus_user_session');
    if (saved) setCurrentUser(JSON.parse(saved));
    refreshData();
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await api.post<{user: User}>('/auth/login', { email, password: pass });
      if (res?.user) {
        setCurrentUser(res.user);
        localStorage.setItem('nexus_user_session', JSON.stringify(res.user));
        return true;
      }
      return "Erro no login";
    } catch (e: any) { return e.message; }
    finally { setIsLoading(false); }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('nexus_user_session');
    localStorage.removeItem('nexus_active_funnel');
    setLeads([]);
  };

  const addLead = async (l: Lead) => {
    await api.post('/leads', l);
    setLeads(prev => [...prev, l]);
  };

  const updateLead = async (id: string, ups: Partial<Lead>) => {
    await api.patch(`/leads/${id}`, ups);
    setLeads(prev => prev.map(l => l.id === id ? {...l, ...ups} : l));
  };

  const moveLead = async (lid: string, sid: string) => {
    await api.patch(`/leads/${lid}`, { stageId: sid });
    setLeads(prev => prev.map(l => l.id === lid ? {...l, stageId: sid} : l));
  };

  const addTask = async (lid: string, t: Task) => {
    const lead = leads.find(x => x.id === lid);
    if (!lead) return;
    const newTasks = [...lead.tasks, t];
    await updateLead(lid, { tasks: newTasks });
  };

  const toggleTask = async (lid: string, tid: string) => {
    const lead = leads.find(x => x.id === lid);
    if (!lead) return;
    const newTasks = lead.tasks.map(x => x.id === tid ? {...x, completed: !x.completed} : x);
    await updateLead(lid, { tasks: newTasks });
  };

  const addFunnel = async (name: string) => {
    if (!currentUser?.accountId) return;
    const nf: Funnel = { id: `f-${Date.now()}`, accountId: currentUser.accountId, name, stages: [{id:`s-${Date.now()}`, name:'Novo', color:'bg-blue-500', order:0}] };
    await api.post('/funnels', nf);
    setFunnels(prev => [...prev, nf]);
  };

  const addUser = async (u: User) => { await api.post('/users', u); setUsers(p => [...p, u]); };
  const addTeam = async (t: Team) => { await api.post('/teams', t); setTeams(p => [...p, t]); };
  const addCustomField = async (f: CustomFieldDefinition) => { await api.post('/custom-fields', f); setCustomFields(p => [...p, f]); };

  return (
    <CRMContext.Provider value={{
      funnels, leads, users, teams, customFields, allAccounts: accounts,
      webhooks, knowledgeSources, botInstance, activeFunnelId, currentUser, isLoading, isOnline,
      visibleLeads: leads, visibleUsers: users, currentAccount: accounts.find(a => a.id === currentUser?.accountId) || null,
      setActiveFunnelId, login, registerAccount: async (u,e,p,c) => { await api.post('/auth/register', {userName:u,email:e,password:p,companyName:c}); return login(e,p); },
      logout, refreshData, addLead, updateLead, moveLead, 
      duplicateLead: async (id, fid, sid) => { const l = leads.find(x => x.id === id); if(l) await addLead({...l, id: `l-${Date.now()}`, funnelId: fid, stageId: sid}); },
      deleteLead: async id => { await api.delete(`/leads/${id}`); setLeads(p => p.filter(x => x.id !== id)); },
      addFunnel, updateFunnel: async (id, ups) => { await api.patch(`/funnels/${id}`, ups); setFunnels(p => p.map(x => x.id === id ? {...x, ...ups} : x)); },
      deleteFunnel: async id => { await api.delete(`/funnels/${id}`); setFunnels(p => p.filter(x => x.id !== id)); },
      addStage: async (fid, n) => { const f = funnels.find(x => x.id === fid); if(f) await api.patch(`/funnels/${fid}`, { stages: [...f.stages, {id:`s-${Date.now()}`, name:n, color:'bg-gray-500', order: f.stages.length}] }); refreshData(); },
      updateStage: async (fid, sid, ups) => { const f = funnels.find(x => x.id === fid); if(f) await api.patch(`/funnels/${fid}`, { stages: f.stages.map(s => s.id === sid ? {...s, ...ups} : s) }); refreshData(); },
      deleteStage: async (fid, sid) => { const f = funnels.find(x => x.id === fid); if(f) await api.patch(`/funnels/${fid}`, { stages: f.stages.filter(s => s.id !== sid) }); refreshData(); },
      reorderStages: async (fid, ss) => { await api.patch(`/funnels/${fid}`, { stages: ss }); refreshData(); },
      addTask, toggleTask, deleteTask: async (lid, tid) => { const l = leads.find(x => x.id === lid); if(l) await updateLead(lid, { tasks: l.tasks.filter(x => x.id !== tid) }); },
      addCustomField, updateCustomField: async (id, ups) => { await api.patch(`/custom-fields/${id}`, ups); setCustomFields(p => p.map(x => x.id === id ? {...x, ...ups} : x)); },
      deleteCustomField: async id => { await api.delete(`/custom-fields/${id}`); setCustomFields(p => p.filter(x => x.id !== id)); },
      addUser, updateUser: async (id, ups) => { await api.patch(`/users/${id}`, ups); setUsers(p => p.map(x => x.id === id ? {...x, ...ups} : x)); },
      deleteUser: async id => { await api.delete(`/users/${id}`); setUsers(p => p.filter(x => x.id !== id)); },
      addTeam, updateTeam: async (id, ups) => { await api.patch(`/teams/${id}`, ups); setTeams(p => p.map(x => x.id === id ? {...x, ...ups} : x)); },
      deleteTeam: async id => { await api.delete(`/teams/${id}`); setTeams(p => p.filter(x => x.id !== id)); },
      updateAccountStatus: async (id, s) => { await api.patch(`/admin/accounts/${id}`, {status:s}); refreshData(); },
      extendAccountSubscription: async (id, m) => { await api.post(`/admin/accounts/${id}/extend`, {months:m}); refreshData(); },
      updateVisibilitySettings: async ups => { if(currentUser?.accountId) await api.patch(`/admin/accounts/${currentUser.accountId}/visibility`, ups); },
      addWebhook: async w => { setWebhooks(p => [...p, {...w, id:`wh-${Date.now()}`} as Webhook]); },
      updateWebhook: async (id, ups) => { setWebhooks(p => p.map(x => x.id === id ? {...x, ...ups} : x)); },
      deleteWebhook: async id => { setWebhooks(p => p.filter(x => x.id !== id)); },
      addKnowledgeSource: async s => { setKnowledgeSources(p => [...p, s]); },
      deleteKnowledgeSource: async id => { setKnowledgeSources(p => p.filter(x => x.id !== id)); },
      updateBotInstance: async ups => { if(botInstance) setBotInstance({...botInstance, ...ups}); }
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
