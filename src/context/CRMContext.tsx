
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
  refreshData: (userOverride?: User) => Promise<void>;
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
  addTask: (leadId: string, task: Task) => Promise<void>;
  toggleTask: (leadId: string, taskId: string) => Promise<void>;
  deleteTask: (leadId: string, taskId: string) => Promise<void>;
  addCustomField: (field: CustomFieldDefinition) => Promise<void>;
  updateCustomField: (id: string, updates: Partial<CustomFieldDefinition>) => Promise<void>;
  deleteCustomField: (id: string) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  updateAccountStatus: (accountId: string, status: string) => Promise<void>;
  extendAccountSubscription: (accountId: string, months: number) => Promise<void>;
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

  const refreshData = useCallback(async (userOverride?: User) => {
    const user = userOverride || currentUser;
    if (!user) {
      setIsLoading(false);
      return;
    }

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
          setWebhooks(data.webhooks || []);
          setKnowledgeSources(data.knowledgeSources || []);
          setBotInstance(data.botInstance || null);
          
          if (data.funnels?.length > 0 && !activeFunnelId) {
             const firstFid = data.funnels[0].id;
             setActiveFunnelId(firstFid);
             localStorage.setItem('nexus_active_funnel', firstFid);
          }
        }
      }
    } catch (e) {
      console.error("Critical Sync Error:", e);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, activeFunnelId]);

  useEffect(() => {
    const saved = localStorage.getItem('nexus_user_session');
    if (saved) {
      const u = JSON.parse(saved);
      setCurrentUser(u);
      refreshData(u);
    } else {
      setIsLoading(false);
    }
  }, [refreshData]);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await api.post<{user: User}>('/auth/login', { email, password: pass });
      if (res?.user) {
        const userWithAccount = { ...res.user, accountId: res.user.accountId || (res.user as any).account_id };
        setCurrentUser(userWithAccount);
        localStorage.setItem('nexus_user_session', JSON.stringify(userWithAccount));
        await refreshData(userWithAccount);
        return true;
      }
      return "Resposta inválida";
    } catch (e: any) {
      return e.message;
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

  return (
    <CRMContext.Provider value={{
      funnels, leads, users, teams, customFields, allAccounts: accounts,
      webhooks, knowledgeSources, botInstance, activeFunnelId, currentUser, isLoading, isOnline,
      visibleLeads: leads, visibleUsers: users, currentAccount: accounts.find(a => a.id === currentUser?.accountId) || null,
      setActiveFunnelId: (id) => { setActiveFunnelId(id); localStorage.setItem('nexus_active_funnel', id); }, 
      login, registerAccount: async (u,e,p,c) => { await api.post('/auth/register', {userName:u,email:e,password:p,companyName:c}); return login(e,p); },
      logout, refreshData: () => refreshData(), addLead, updateLead, moveLead, 
      duplicateLead: async () => {},
      deleteLead: async id => { await api.delete(`/leads/${id}`); setLeads(p => p.filter(x => x.id !== id)); },
      addFunnel: async n => { if(currentUser?.accountId) { const fid=`f-${Date.now()}`; const nf={id:fid, accountId:currentUser.accountId, name:n, stages:[]}; await api.post('/funnels', nf); setFunnels(p => [...p, nf]); setActiveFunnelId(fid); } },
      updateFunnel: async (id, ups) => { await api.patch(`/funnels/${id}`, ups); setFunnels(p => p.map(x => x.id === id ? {...x, ...ups} : x)); },
      deleteFunnel: async id => { await api.delete(`/funnels/${id}`); setFunnels(p => p.filter(x => x.id !== id)); },
      addStage: async (fid, n) => { const f=funnels.find(x=>x.id===fid); if(f) { const ns={id:`s-${Date.now()}`, name:n, color:'bg-gray-500', order:f.stages.length}; await api.patch(`/funnels/${fid}`, {stages:[...f.stages, ns]}); setFunnels(p => p.map(x=>x.id===fid?{...x, stages:[...x.stages, ns]}:x)); } },
      updateStage: async (fid, sid, ups) => { const f=funnels.find(x=>x.id===fid); if(f) { const ss=f.stages.map(s=>s.id===sid?{...s, ...ups}:s); await api.patch(`/funnels/${fid}`, {stages:ss}); setFunnels(p => p.map(x=>x.id===fid?{...x, stages:ss}:x)); } },
      deleteStage: async (fid, sid) => { const f=funnels.find(x=>x.id===fid); if(f) { const ss=f.stages.filter(s=>s.id!==sid); await api.patch(`/funnels/${fid}`, {stages:ss}); setFunnels(p => p.map(x=>x.id===fid?{...x, stages:ss}:x)); } },
      addTask: async (lid, t) => { const l=leads.find(x=>x.id===lid); if(l) { const ts=[...(l.tasks||[]), t]; await updateLead(lid, {tasks:ts}); } },
      toggleTask: async (lid, tid) => { const l=leads.find(x=>x.id===lid); if(l) { const ts=(l.tasks||[]).map(x=>x.id===tid?{...x, completed:!x.completed}:x); await updateLead(lid, {tasks:ts}); } },
      deleteTask: async (lid, tid) => { const l=leads.find(x=>x.id===lid); if(l) { const ts=(l.tasks||[]).filter(x=>x.id!==tid); await updateLead(lid, {tasks:ts}); } },
      addCustomField: async f => { await api.post('/custom-fields', f); setCustomFields(p => [...p, f]); },
      updateCustomField: async (id, ups) => { await api.patch(`/custom-fields/${id}`, ups); setCustomFields(p => p.map(x => x.id === id ? {...x, ...ups} : x)); },
      deleteCustomField: async id => { await api.delete(`/custom-fields/${id}`); setCustomFields(p => p.filter(x => x.id !== id)); },
      updateUser: async (id, ups) => { await api.patch(`/users/${id}`, ups); setUsers(p => p.map(x => x.id === id ? {...x, ...ups} : x)); },
      updateAccountStatus: async (id, s) => { await api.patch(`/admin/accounts/${id}`, {status:s}); refreshData(); },
      extendAccountSubscription: async (id, m) => { await api.post(`/admin/accounts/${id}/extend`, {months:m}); refreshData(); },
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
  if (!context) throw new Error("useCRM must be used within CRMProvider");
  return context;
};
