
import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';
import { Funnel, Lead, Team, User, Stage, CustomFieldDefinition, Task, Account, UserRole } from '../types';
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

  // Carga inicial
  useEffect(() => {
    const savedUser = localStorage.getItem('nexus_user');
    if (savedUser) {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        if (user.accountId) {
            syncData(user.accountId);
        }
    }
  }, []);

  const syncData = async (accountId: string) => {
      setIsLoading(true);
      try {
          const data = await api.get(`/sync/${accountId}`);
          setFunnels(data.funnels);
          setLeads(data.leads);
          setUsers(data.users);
          setTeams(data.teams);
          setCustomFields(data.customFields);
          
          if (data.funnels.length > 0 && !activeFunnelId) {
              setActiveFunnelId(data.funnels[0].id);
          }
      } catch (error) {
          console.error("Erro ao sincronizar:", error);
      } finally {
          setIsLoading(false);
      }
  };

  const login = async (email: string, pass: string): Promise<string | boolean> => {
      try {
          const data = await api.post('/auth/login', { email, password: pass });
          if (data.error) return data.error;

          setCurrentUser(data.user);
          localStorage.setItem('nexus_user', JSON.stringify(data.user));
          
          if (data.user.role !== 'NEXUS_ADMIN') {
              syncData(data.user.accountId);
          }
          return true;
      } catch (e) {
          return "Erro ao conectar com servidor.";
      }
  };

  const logout = () => {
      setCurrentUser(null);
      localStorage.removeItem('nexus_user');
      setLeads([]);
      setFunnels([]);
  };

  // --- LEADS ---

  const addLead = async (lead: Lead) => {
      // Optimistic Update (Atualiza a UI antes da API responder)
      setLeads(prev => [...prev, lead]);
      try {
          await api.post('/leads', lead);
      } catch (e) {
          console.error("Falha ao salvar lead", e);
          // Em app real, reverteria o estado aqui
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

  const deleteLead = (id: string) => {
      setLeads(prev => prev.filter(l => l.id !== id));
      // Falta endpoint de delete no backend demo, mas seria:
      // api.delete(`/leads/${id}`);
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

  // --- Placeholders (Sem Backend neste Demo) ---
  const registerAccount = async () => "Registro desativado na demo.";
  const addFunnel = (name: string) => console.log("Implementar API");
  const updateFunnel = (id: string, u: any) => console.log("Implementar API");
  const addStage = (fid: string, n: string) => console.log("Implementar API");
  const reorderStages = () => {};
  const addCustomField = () => {};
  const deleteCustomField = () => {};
  const addUser = () => {};
  const updateUser = () => {};
  const deleteUser = () => {};
  const addTeam = () => {};
  const deleteTeam = () => {};
  const createAccount = () => {};
  const updateAccountStatus = () => {};
  const extendAccountSubscription = () => {};
  const upgradePlan = async () => {};

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
