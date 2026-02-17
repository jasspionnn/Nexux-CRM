
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { Funnel, Lead, User, Stage, CustomFieldDefinition, Task, Account, UserRole } from '../types';
import { api } from '../services/api';

interface CRMContextType {
  funnels: Funnel[];
  leads: Lead[];
  users: User[];
  customFields: CustomFieldDefinition[];
  activeFunnelId: string;
  currentUser: User | null;
  isLoading: boolean;
  setActiveFunnelId: (id: string) => void;
  login: (email: string, pass: string) => Promise<string | boolean>;
  logout: () => void;
  refreshData: () => Promise<void>;
  addLead: (lead: Lead) => Promise<void>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
  moveLead: (leadId: string, targetStageId: string) => Promise<void>;
  transferLead: (leadId: string, targetFunnelId: string, targetStageId: string) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  addFunnel: (name: string) => Promise<void>;
  deleteFunnel: (id: string) => Promise<void>;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

export const CRMProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [activeFunnelId, setActiveFunnelId] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshData = useCallback(async () => {
    if (!currentUser?.accountId) return;
    setIsLoading(true);
    try {
      const data = await api.get<any>(`/sync/${currentUser.accountId}`);
      if (data) {
        setFunnels(data.funnels || []);
        setLeads(data.leads || []);
        setCustomFields(data.customFields || []);
        if (data.funnels.length > 0 && !activeFunnelId) {
          setActiveFunnelId(data.funnels[0].id);
        }
      }
    } catch (err) {
      console.error("Sync Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, activeFunnelId]);

  useEffect(() => {
    const saved = localStorage.getItem('nexus_session');
    if (saved) setCurrentUser(JSON.parse(saved));
    else setIsLoading(false);
  }, []);

  useEffect(() => {
    if (currentUser) refreshData();
  }, [currentUser]);

  const login = async (email: string, pass: string) => {
    try {
      const res = await api.post<any>('/auth/login', { email, password: pass });
      if (res.user) {
        setCurrentUser(res.user);
        localStorage.setItem('nexus_session', JSON.stringify(res.user));
        return true;
      }
      return "Credenciais inválidas";
    } catch (e: any) { return e.message; }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('nexus_session');
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

  const transferLead = async (leadId: string, targetFunnelId: string, targetStageId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    const targetFunnel = funnels.find(f => f.id === targetFunnelId);
    const note = {
      id: `sys-${Date.now()}`,
      content: `🔄 Encaminhado para o funil: ${targetFunnel?.name}`,
      createdAt: new Date().toISOString(),
      authorName: 'Sistema'
    };

    const updates = {
      funnelId: targetFunnelId,
      stageId: targetStageId,
      notes: [note, ...lead.notes]
    };

    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...updates } : l));
    await api.patch(`/leads/${leadId}`, updates);
  };

  const deleteLead = async (id: string) => {
    setLeads(prev => prev.filter(l => l.id !== id));
    await api.delete(`/leads/${id}`);
  };

  const addFunnel = async (name: string) => {
    if (!currentUser?.accountId) return;
    const newFunnel: Funnel = {
      id: `f-${Date.now()}`,
      accountId: currentUser.accountId,
      name,
      stages: [
        { id: `s1-${Date.now()}`, name: 'Novo', color: 'bg-blue-500', order: 0 },
        { id: `s2-${Date.now()}`, name: 'Ganha', color: 'bg-green-500', order: 1 }
      ]
    };
    setFunnels(prev => [...prev, newFunnel]);
    await api.post('/funnels', newFunnel);
    setActiveFunnelId(newFunnel.id);
  };

  return (
    <CRMContext.Provider value={{
      funnels, leads, users, customFields, activeFunnelId, currentUser, isLoading,
      setActiveFunnelId, login, logout, refreshData, addLead, updateLead, moveLead, transferLead, deleteLead, addFunnel, deleteFunnel: async () => {}
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
