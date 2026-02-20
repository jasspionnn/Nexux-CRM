
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
  // Missing properties from build error
  updateVisibilitySettings: (settings: any) => Promise<void>;
  addUser: (user: Partial<User>) => Promise<void>;
  addTeam: (team: Partial<Team>) => Promise<void>;
  updateTeam: (id: string, updates: Partial<Team>) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  reorderStages: (funnelId: string, stages: Stage[]) => Promise<void>;
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
      const endpoint = user.role === UserRole.NEXUS_ADMIN ? '/admin/accounts' : `/sync/${user.accountId}`;
      const data = await api.get<any>(endpoint);
      
      if (data) {
        if (user.role === UserRole.NEXUS_ADMIN) {
          setAccounts(data.accounts || []);
        } else {
          setFunnels(data.funnels || []);
          setLeads(data.leads || []);
          setUsers(data.users || []);
          setCustomFields(data.customFields || []);
          // Mock data for teams/webhooks/bot if not in sync response yet
          setTeams(data.teams || []);
          setWebhooks(data.webhooks || []);
          setKnowledgeSources(data.knowledgeSources || []);
          setBotInstance(data.botInstance || null);

          // Validação Crítica de Funil Ativo
          if (data.funnels && data.funnels.length > 0) {
            const exists = data.funnels.some((f: any) => f.id === activeFunnelId);
            if (!activeFunnelId || !exists) {
              const firstId = data.funnels[0].id;
              setActiveFunnelId(firstId);
              localStorage.setItem('nexus_active_funnel', firstId);
            }
          }
        }
      }
    } catch (e) {
      console.error("Sync Failure:", e);
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
      return "Login falhou";
    } catch (e: any) { return e.message; }
    finally { setIsLoading(false); }
  };

  const registerAccount = async (u: string, e: string, p: string, c: string) => {
    await api.post('/auth/register', { userName: u, email: e, password: p, companyName: c });
    return login(e, p);
  };

  const addLead = async (l: Lead) => { await api.post('/leads', l); setLeads(prev => [...prev, l]); };
  const updateLead = async (id: string, ups: Partial<Lead>) => { await api.patch(`/leads/${id}`, ups); setLeads(p => p.map(l => l.id === id ? {...l, ...ups} : l)); };
  const logout = () => { setCurrentUser(null); localStorage.removeItem('nexus_user_session'); setFunnels([]); setLeads([]); };

  return (
    <CRMContext.Provider value={{
      funnels, leads, users, teams, customFields, allAccounts: accounts,
      webhooks, knowledgeSources, botInstance, activeFunnelId, currentUser, isLoading, isOnline,
      visibleLeads: leads, visibleUsers: users, currentAccount: accounts.find(a => a.id === currentUser?.accountId) || null,
      setActiveFunnelId: (id) => { setActiveFunnelId(id); localStorage.setItem('nexus_active_funnel', id); }, 
      login, registerAccount, logout, refreshData: () => refreshData(), addLead, updateLead,
      moveLead: async (lid, sid) => { await api.patch(`/leads/${lid}`, { stageId: sid }); setLeads(p => p.map(l => l.id === lid ? {...l, stageId: sid} : l)); },
      deleteLead: async id => { await api.delete(`/leads/${id}`); setLeads(p => p.filter(x => x.id !== id)); },
      addFunnel: async n => { const f={id:`f-${Date.now()}`, accountId:currentUser?.accountId||'', name:n, stages:[]}; await api.post('/funnels', f); setFunnels(p => [...p, f]); setActiveFunnelId(f.id); },
      
      // Implementations for missing methods
      duplicateLead: async (lid, fid, sid) => { 
        const original = leads.find(l => l.id === lid);
        if (!original) return;
        const newLead = { ...original, id: `l-${Date.now()}`, funnelId: fid, stageId: sid, createdAt: new Date().toISOString() };
        await addLead(newLead);
      },
      updateFunnel: async (id, ups) => { await api.patch(`/funnels/${id}`, ups); setFunnels(p => p.map(f => f.id === id ? {...f, ...ups} : f)); },
      deleteFunnel: async id => { await api.delete(`/funnels/${id}`); setFunnels(p => p.filter(f => f.id !== id)); },
      addStage: async (fid, name) => { 
        const s = { id: `s-${Date.now()}`, funnelId: fid, name, color: '#E5E7EB', order: 99 };
        await api.post('/stages', s);
        setFunnels(p => p.map(f => f.id === fid ? {...f, stages: [...f.stages, s]} : f));
      },
      updateStage: async (fid, sid, ups) => { 
        await api.patch(`/stages/${sid}`, ups);
        setFunnels(p => p.map(f => f.id === fid ? {...f, stages: f.stages.map(s => s.id === sid ? {...s, ...ups} : s)} : f));
      },
      deleteStage: async (fid, sid) => {
        await api.delete(`/stages/${sid}`);
        setFunnels(p => p.map(f => f.id === fid ? {...f, stages: f.stages.filter(s => s.id !== sid)} : f));
      },
      addTask: async (lid, t) => { await api.post('/tasks', t); /* Optimistic update logic would go here */ },
      toggleTask: async (lid, tid) => { await api.patch(`/tasks/${tid}/toggle`, {}); },
      deleteTask: async (lid, tid) => { await api.delete(`/tasks/${tid}`); },
      addCustomField: async (cf) => { await api.post('/custom-fields', cf); setCustomFields(p => [...p, cf]); },
      updateCustomField: async (id, ups) => { await api.patch(`/custom-fields/${id}`, ups); setCustomFields(p => p.map(c => c.id === id ? {...c, ...ups} : c)); },
      deleteCustomField: async id => { await api.delete(`/custom-fields/${id}`); setCustomFields(p => p.filter(c => c.id !== id)); },
      updateUser: async (id, ups) => { await api.patch(`/users/${id}`, ups); setUsers(p => p.map(u => u.id === id ? {...u, ...ups} : u)); },
      updateAccountStatus: async (aid, s) => { await api.patch(`/admin/accounts/${aid}`, { status: s }); },
      extendAccountSubscription: async (aid, m) => { await api.post(`/admin/accounts/${aid}/extend`, { months: m }); },
      addWebhook: async (w) => { await api.post('/webhooks', w); setWebhooks(p => [...p, w as Webhook]); },
      updateWebhook: async (id, ups) => { await api.patch(`/webhooks/${id}`, ups); setWebhooks(p => p.map(w => w.id === id ? {...w, ...ups} : w)); },
      deleteWebhook: async id => { await api.delete(`/webhooks/${id}`); setWebhooks(p => p.filter(w => w.id !== id)); },
      addKnowledgeSource: async (s) => { await api.post('/knowledge', s); setKnowledgeSources(p => [...p, s]); },
      deleteKnowledgeSource: async id => { await api.delete(`/knowledge/${id}`); setKnowledgeSources(p => p.filter(s => s.id !== id)); },
      updateBotInstance: async (ups) => { await api.patch('/bot', ups); setBotInstance(p => p ? {...p, ...ups} : null); },
      
      // New methods
      updateVisibilitySettings: async (s) => { console.log('Update visibility', s); },
      addUser: async (u) => { await api.post('/users', u); setUsers(p => [...p, u as User]); },
      addTeam: async (t) => { await api.post('/teams', t); setTeams(p => [...p, t as Team]); },
      updateTeam: async (id, ups) => { await api.patch(`/teams/${id}`, ups); setTeams(p => p.map(t => t.id === id ? {...t, ...ups} : t)); },
      deleteTeam: async id => { await api.delete(`/teams/${id}`); setTeams(p => p.filter(t => t.id !== id)); },
      deleteUser: async id => { await api.delete(`/users/${id}`); setUsers(p => p.filter(u => u.id !== id)); },
      reorderStages: async (fid, stages) => { 
        setFunnels(p => p.map(f => f.id === fid ? {...f, stages} : f));
        await api.post(`/funnels/${fid}/reorder-stages`, { stages });
      }
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
