
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Funnel, Lead, Team, User, Stage, CustomFieldDefinition, Task, Account } from '../types';
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
  
  setActiveFunnelId: (id: string) => void;
  login: (email: string, pass: string) => Promise<string | boolean>;
  logout: () => void;

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
  
  addUser: (user: User) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  addTeam: (team: Team) => void;
  deleteTeam: (id: string) => void;

  registerAccount: (userName: string, email: string, pass: string, companyName: string) => Promise<string | boolean>;
  createAccount: (account: Account, adminUser: User) => void;
  updateAccountStatus: (accountId: string, status: 'active' | 'suspended') => void;
  extendAccountSubscription: (accountId: string, months: number) => void;
  upgradePlan: (plan: 'pro' | 'enterprise') => Promise<void>;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

// Helper Types for API Responses
interface SyncResponse {
    funnels: Funnel[];
    leads: Lead[];
    users: User[];
    teams: Team[];
    customFields: CustomFieldDefinition[];
}

interface AuthResponse {
    user: User;
    error?: string;
}

export const CRMProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  
  const [activeFunnelId, setActiveFunnelId] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Carga inicial do usuário (Sessão)
  useEffect(() => {
    const savedUser = localStorage.getItem('nexus_user');
    if (savedUser) {
        try {
            const user = JSON.parse(savedUser);
            setCurrentUser(user);
            if (user.accountId) {
                // Sincroniza dados ao recarregar a página
                syncData(user.accountId);
            }
        } catch (e) {
            console.error("Sessão inválida", e);
        }
    }
  }, []);

  const syncData = async (accountId: string) => {
      setIsLoading(true);
      try {
          const data = await api.get<SyncResponse>(`/sync/${accountId}`);
          
          setFunnels(data.funnels || []);
          setLeads(data.leads || []);
          setUsers(data.users || []);
          setTeams(data.teams || []);
          setCustomFields(data.customFields || []);
          
          // Define o funil ativo se não houver um selecionado
          if (data.funnels && data.funnels.length > 0) {
              setActiveFunnelId(prev => prev || data.funnels[0].id);
          }
      } catch (error) {
          console.error("Erro ao sincronizar dados:", error);
      } finally {
          setIsLoading(false);
      }
  };

  const login = async (email: string, pass: string): Promise<string | boolean> => {
      try {
          const data = await api.post<AuthResponse>('/auth/login', { email, password: pass });
          
          if (data.error) return data.error;
          if (!data.user) return "Erro desconhecido no login.";

          setCurrentUser(data.user);
          localStorage.setItem('nexus_user', JSON.stringify(data.user));
          
          if (data.user.role !== 'NEXUS_ADMIN' && data.user.accountId) {
              await syncData(data.user.accountId);
          }
          return true;
      } catch (e) {
          console.error(e);
          return "Erro ao conectar com servidor. Verifique sua conexão.";
      }
  };

  const logout = () => {
      setCurrentUser(null);
      localStorage.removeItem('nexus_user');
      setLeads([]);
      setFunnels([]);
      setUsers([]);
  };

  // --- LEADS ---

  const addLead = async (lead: Lead) => {
      // Optimistic Update (Atualiza UI instantaneamente)
      setLeads(prev => [...prev, lead]);
      try {
          await api.post('/leads', lead);
      } catch (e) {
          console.error("Falha ao salvar lead no servidor", e);
          // Reverte em caso de erro
          setLeads(prev => prev.filter(l => l.id !== lead.id));
      }
  };

  const updateLead = async (id: string, updates: Partial<Lead>) => {
      setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
      try {
          await api.patch(`/leads/${id}`, updates);
      } catch (e) {
          console.error("Falha ao atualizar lead", e);
      }
  };

  const deleteLead = async (id: string) => {
      setLeads(prev => prev.filter(l => l.id !== id));
      // TODO: Implementar DELETE endpoint no backend
      // await api.delete(`/leads/${id}`);
  };

  const moveLead = (leadId: string, targetStageId: string) => {
      updateLead(leadId, { stageId: targetStageId });
  };

  const duplicateLead = (originalLeadId: string, targetFunnelId: string, targetStageId: string) => {
      const originalLead = leads.find(l => l.id === originalLeadId);
      if (!originalLead || !currentUser?.accountId) return;
      
      const newLead: Lead = {
          ...originalLead,
          id: `l_${Date.now()}`,
          funnelId: targetFunnelId,
          stageId: targetStageId,
          title: `${originalLead.title} (Cópia)`,
          createdAt: new Date().toISOString(),
          tasks: [],
          notes: []
      };
      
      addLead(newLead);
  };

  // --- TASKS ---

  const addTask = async (leadId: string, task: Task) => {
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, tasks: [...(l.tasks || []), task] } : l));
      try {
          await api.post('/tasks', { ...task, leadId });
      } catch (e) { console.error(e); }
  };

  const toggleTask = async (leadId: string, taskId: string) => {
      setLeads(prev => prev.map(l => 
          l.id === leadId ? { ...l, tasks: l.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t) } : l
      ));
      try {
          await api.patch(`/tasks/${taskId}/toggle`, {});
      } catch (e) { console.error(e); }
  };

  const deleteTask = async (leadId: string, taskId: string) => {
      setLeads(prev => prev.map(l => 
          l.id === leadId ? { ...l, tasks: l.tasks.filter(t => t.id !== taskId) } : l
      ));
      try {
          await api.delete(`/tasks/${taskId}`);
      } catch (e) { console.error(e); }
  };

  // --- Placeholders e Funções Locais (Pode migrar para API depois) ---
  
  const registerAccount = async (userName: string, email: string, pass: string, companyName: string): Promise<string|boolean> => {
      // Para Demo, apenas simula sucesso
      console.log("Register:", userName, email);
      return "Registro via API ainda não implementado na Demo. Use admin@demo.com / 123";
  };
  
  const addFunnel = (name: string) => {
    if (!currentUser?.accountId) return;
    const newFunnel: Funnel = {
      id: `f_${Date.now()}`,
      accountId: currentUser.accountId,
      name,
      stages: [
        { id: `s_${Date.now()}_1`, name: 'Novo', color: 'bg-gray-100 border-gray-300', order: 0 },
        { id: `s_${Date.now()}_2`, name: 'Ganho', color: 'bg-green-100 border-green-300', order: 1 },
      ]
    };
    setFunnels(prev => [...prev, newFunnel]);
    // TODO: api.post('/funnels', newFunnel);
  };

  const updateFunnel = (id: string, updates: Partial<Funnel>) => {
      setFunnels(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };
  const addStage = (fid: string, n: string) => {
     setFunnels(prev => prev.map(f => {
         if (f.id !== fid) return f;
         const newStage = { id: `s_${Date.now()}`, name: n, color: 'bg-gray-100', order: f.stages.length };
         return { ...f, stages: [...f.stages, newStage] };
     }));
  };
  const reorderStages = (funnelId: string, newStages: Stage[]) => {
      setFunnels(prev => prev.map(f => f.id === funnelId ? { ...f, stages: newStages } : f));
  };
  const addCustomField = (field: CustomFieldDefinition) => {
      setCustomFields(prev => [...prev, field]);
  };
  const deleteCustomField = (id: string) => {
      setCustomFields(prev => prev.filter(f => f.id !== id));
  };
  const addUser = (u: User) => {
      setUsers(prev => [...prev, u]);
  };
  const updateUser = (id: string, updates: Partial<User>) => {
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
  };
  const deleteUser = (id: string) => {
      setUsers(prev => prev.filter(u => u.id !== id));
  };
  const addTeam = (t: Team) => {
      setTeams(prev => [...prev, t]);
  };
  const deleteTeam = (id: string) => {
      setTeams(prev => prev.filter(t => t.id !== id));
  };
  const createAccount = (acc: Account) => {
      setAllAccounts(prev => [...prev, acc]);
  };
  const updateAccountStatus = (id: string, status: 'active' | 'suspended') => {
      setAllAccounts(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  };
  const extendAccountSubscription = (id: string, months: number) => {
      console.log("Extend", id, months);
  };
  const upgradePlan = async (plan: 'pro' | 'enterprise') => {
      console.log("Upgrade", plan);
  };

  const getFunnelStats = (fid: string) => {
      const fl = leads.filter(l => l.funnelId === fid);
      return { totalValue: fl.reduce((a,b) => a + b.value, 0), leadCount: fl.length };
  };

  return (
    <CRMContext.Provider value={{
      funnels, leads, users, teams, customFields, allAccounts,
      activeFunnelId, currentUser, isLoading,
      setActiveFunnelId, login, logout,
      addLead, updateLead, moveLead, duplicateLead, deleteLead,
      addTask, toggleTask, deleteTask,
      addFunnel, updateFunnel, addStage, reorderStages,
      addCustomField, deleteCustomField, getFunnelStats,
      addUser, updateUser, deleteUser, addTeam, deleteTeam,
      registerAccount, createAccount, updateAccountStatus, 
      extendAccountSubscription, upgradePlan
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
