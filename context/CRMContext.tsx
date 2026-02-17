
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { Funnel, Lead, Team, User, Stage, CustomFieldDefinition, Task, Account, UserRole, VisibilityLevel, Webhook, KnowledgeSource, BotInstance } from '../types';
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

  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem('nexus_user_session');
    if (savedUser) { 
      try { 
        setCurrentUser(JSON.parse(savedUser)); 
      } catch (e) { 
        localStorage.removeItem('nexus_user_session');
      } 
    }
    // Garantir que saia do loading inicial após checar storage
    if (!savedUser) setIsLoading(false);
  }, []);

  const refreshData = useCallback(async () => {
      if (!currentUser) return;
      setIsLoading(true);
      try {
          if (currentUser.role === UserRole.NEXUS_ADMIN) {
               const data = await api.get<any>('/admin/accounts');
               if (data && data.accounts) setAccounts(data.accounts);
          } else if (currentUser.accountId) {
               const data = await api.get<any>(`/sync/${currentUser.accountId}`);
               if (data) {
                 setFunnels(data.funnels || []);
                 setLeads(data.leads || []);
                 setUsers(data.users || []);
                 setTeams(data.teams || []);
                 setCustomFields(data.customFields || []);
                 setWebhooks(data.webhooks || []);
                 setKnowledgeSources(data.knowledgeSources || []);
                 setBotInstance(data.botInstance || null);
                 
                 if (data.funnels && data.funnels.length > 0) {
                    const savedId = localStorage.getItem('nexus_active_funnel');
                    const exists = data.funnels.find((f: any) => f.id === savedId);
                    if (!savedId || !exists) {
                        const firstId = data.funnels[0].id;
                        setActiveFunnelId(firstId);
                        localStorage.setItem('nexus_active_funnel', firstId);
                    }
                 }
               }
          }
      } catch (error) { 
          console.error("Erro fatal na sincronização:", error); 
          // Opcional: Mostrar toast de erro aqui
      } finally { 
          setIsLoading(false); 
      }
  }, [currentUser]);

  useEffect(() => { 
    if (currentUser) refreshData(); 
  }, [currentUser, refreshData]);

  useEffect(() => {
    if (activeFunnelId) localStorage.setItem('nexus_active_funnel', activeFunnelId);
  }, [activeFunnelId]);

  const login = async (email: string, pass: string): Promise<string | boolean> => {
      setIsLoading(true);
      try {
          const res = await api.post<{user: User}>('/auth/login', { email, password: pass });
          if (res && res.user) {
            setCurrentUser(res.user);
            localStorage.setItem('nexus_user_session', JSON.stringify(res.user));
            return true;
          }
          return "Resposta inválida.";
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
  };

  const registerAccount = async (u: string, e: string, p: string, c: string) => { 
    await api.post('/auth/register', { userName: u, email: e, password: p, companyName: c }); 
    return login(e, p); 
  };

  const addLead = async (lead: Lead) => { setLeads(prev => [...prev, lead]); await api.post('/leads', lead); };
  const updateLead = async (id: string, updates: Partial<Lead>) => { setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l)); await api.patch(`/leads/${id}`, updates); };
  const moveLead = async (leadId: string, targetStageId: string) => { setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stageId: targetStageId } : l)); await api.patch(`/leads/${leadId}`, { stageId: targetStageId }); };
  const deleteLead = async (id: string) => { setLeads(prev => prev.filter(l => l.id !== id)); await api.delete(`/leads/${id}`); };

  const addFunnel = async (name: string) => { 
    if (!currentUser?.accountId) return;
    const nf: Funnel = { id: `f-${Date.now()}`, accountId: currentUser.accountId, name, stages: [{ id: `s1-${Date.now()}`, name: 'Lead', color: 'bg-blue-500', order: 0 }, { id: `s2-${Date.now()}`, name: 'Fechado', color: 'bg-green-500', order: 1 }] };
    setFunnels(prev => [...prev, nf]); await api.post('/funnels', nf); 
    if (!activeFunnelId) setActiveFunnelId(nf.id);
  };
  const updateFunnel = async (id: string, updates: Partial<Funnel>) => { setFunnels(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f)); await api.patch(`/funnels/${id}`, updates); };
  const deleteFunnel = async (id: string) => { setFunnels(prev => prev.filter(f => f.id !== id)); await api.delete(`/funnels/${id}`); };

  const addStage = async (funnelId: string, name: string) => { 
    const funnel = funnels.find(f => f.id === funnelId); 
    if (!funnel) return;
    const newStage = { id: `s-${Date.now()}`, name, color: 'bg-gray-500', order: funnel.stages.length };
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
  
  const addCustomField = async (f: CustomFieldDefinition) => { setCustomFields(prev => [...prev, f]); await api.post('/custom-fields', f); };
  const updateCustomField = async (id: string, updates: Partial<CustomFieldDefinition>) => { setCustomFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f)); await api.patch(`/custom-fields/${id}`, updates); };
  const deleteCustomField = async (id: string) => { setCustomFields(prev => prev.filter(f => f.id !== id)); await api.delete(`/custom-fields/${id}`); };

  const updateUser = async (id: string, updates: Partial<User>) => { setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u)); await api.patch(`/users/${id}`, updates); };
  const updateAccountStatus = async (accountId: string, status: string) => { await api.patch(`/admin/accounts/${accountId}`, { status }); refreshData(); };
  const extendAccountSubscription = async (accountId: string, months: number) => { await api.post(`/admin/accounts/${accountId}/extend`, { months }); refreshData(); };

  const addWebhook = async (webhook: Partial<Webhook>) => { setWebhooks(prev => [...prev, { ...webhook, id: `wh-${Date.now()}` } as Webhook]); };
  const updateWebhook = async (id: string, updates: Partial<Webhook>) => { setWebhooks(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w)); };
  const deleteWebhook = async (id: string) => { setWebhooks(prev => prev.filter(w => w.id !== id)); };
  const addKnowledgeSource = async (source: KnowledgeSource) => { setKnowledgeSources(prev => [...prev, source]); };
  const deleteKnowledgeSource = async (id: string) => { setKnowledgeSources(prev => prev.filter(k => k.id !== id)); };
  const updateBotInstance = async (updates: Partial<BotInstance>) => { if (botInstance) setBotInstance({ ...botInstance, ...updates }); };

  return (
    <CRMContext.Provider value={{
      funnels, leads, users, teams, customFields, allAccounts: accounts,
      webhooks, knowledgeSources, botInstance,
      activeFunnelId, currentUser, isLoading, isOnline,
      visibleLeads: leads, visibleUsers: users, currentAccount: accounts.find(a => a.id === currentUser?.accountId) || null,
      setActiveFunnelId, login, registerAccount, logout, refreshData,
      addLead, updateLead, moveLead, deleteLead, duplicateLead: async () => {},
      addFunnel, updateFunnel, deleteFunnel, addStage, updateStage, deleteStage,
      addTask, toggleTask, deleteTask, addCustomField, updateCustomField, deleteCustomField, updateUser, updateAccountStatus, extendAccountSubscription,
      addWebhook, updateWebhook, deleteWebhook, addKnowledgeSource, deleteKnowledgeSource, updateBotInstance
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
