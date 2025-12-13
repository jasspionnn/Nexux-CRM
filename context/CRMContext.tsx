
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Funnel, Lead, Team, User, Stage, CustomFieldDefinition, Task } from '../types';
import { INITIAL_FUNNELS, MOCK_LEADS, MOCK_TEAMS, MOCK_USERS } from '../constants';

interface CRMContextType {
  funnels: Funnel[];
  leads: Lead[];
  users: User[];
  teams: Team[];
  customFields: CustomFieldDefinition[];
  activeFunnelId: string;
  setActiveFunnelId: (id: string) => void;
  addLead: (lead: Lead) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  moveLead: (leadId: string, targetStageId: string) => void;
  duplicateLead: (originalLeadId: string, targetFunnelId: string, targetStageId: string) => void;
  deleteLead: (id: string) => void;
  // Tasks Logic
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
  // User & Team Management
  addUser: (user: User) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  addTeam: (team: Team) => void;
  deleteTeam: (id: string) => void;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

interface CRMProviderProps {
  children: ReactNode;
}

export const CRMProvider: React.FC<CRMProviderProps> = ({ children }) => {
  const [funnels, setFunnels] = useState<Funnel[]>(INITIAL_FUNNELS);
  const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [teams, setTeams] = useState<Team[]>(MOCK_TEAMS);
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [activeFunnelId, setActiveFunnelId] = useState<string>(INITIAL_FUNNELS[0].id);

  const addLead = (lead: Lead) => {
    setLeads([...leads, lead]);
  };

  const updateLead = (id: string, updates: Partial<Lead>) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const moveLead = (leadId: string, targetStageId: string) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stageId: targetStageId } : l));
  };

  const duplicateLead = (originalLeadId: string, targetFunnelId: string, targetStageId: string) => {
    const originalLead = leads.find(l => l.id === originalLeadId);
    if (!originalLead) return;

    // Find names for the system note
    const originalFunnelName = funnels.find(f => f.id === originalLead.funnelId)?.name || 'Desconhecido';
    
    const newLead: Lead = {
      ...originalLead,
      id: `l${Date.now()}`,
      funnelId: targetFunnelId,
      stageId: targetStageId,
      createdAt: new Date().toISOString(),
      title: `${originalLead.title} (Cópia)`,
      tasks: [], // Reset tasks
      // We reset notes to avoid confusion, but add a system note about origin
      notes: [{
          id: `n-sys-${Date.now()}`,
          content: `Lead duplicado a partir do funil: ${originalFunnelName}.`,
          createdAt: new Date().toISOString(),
          authorName: 'Sistema'
      }]
    };
    
    setLeads(prev => [...prev, newLead]);
  };

  const deleteLead = (id: string) => {
    setLeads(prev => prev.filter(l => l.id !== id));
  };

  // --- Task Logic ---
  const addTask = (leadId: string, task: Task) => {
      setLeads(prev => prev.map(l => {
          if (l.id !== leadId) return l;
          return { ...l, tasks: [...(l.tasks || []), task] };
      }));
  };

  const toggleTask = (leadId: string, taskId: string) => {
      setLeads(prev => prev.map(l => {
          if (l.id !== leadId) return l;
          return {
              ...l,
              tasks: l.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
          };
      }));
  };

  const deleteTask = (leadId: string, taskId: string) => {
      setLeads(prev => prev.map(l => {
          if (l.id !== leadId) return l;
          return {
              ...l,
              tasks: l.tasks.filter(t => t.id !== taskId)
          };
      }));
  };


  const addFunnel = (name: string) => {
    const newFunnel: Funnel = {
      id: `f${Date.now()}`,
      name,
      stages: [
        { id: `s${Date.now()}_1`, name: 'Novo', color: 'bg-gray-100 border-gray-300', order: 0 },
        { id: `s${Date.now()}_2`, name: 'Ganho', color: 'bg-green-100 border-green-300', order: 1 },
      ]
    };
    setFunnels([...funnels, newFunnel]);
    setActiveFunnelId(newFunnel.id);
  };

  const updateFunnel = (id: string, updates: Partial<Funnel>) => {
    setFunnels(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const addStage = (funnelId: string, name: string) => {
    setFunnels(prev => prev.map(f => {
      if (f.id !== funnelId) return f;
      const newStage: Stage = {
        id: `s${Date.now()}`,
        name,
        color: 'bg-gray-100 border-gray-300',
        order: f.stages.length
      };
      return { ...f, stages: [...f.stages, newStage] };
    }));
  };

  const reorderStages = (funnelId: string, newStages: Stage[]) => {
    setFunnels(prev => prev.map(f => {
      if (f.id !== funnelId) return f;
      const updatedStages = newStages.map((stage, index) => ({
        ...stage,
        order: index
      }));
      return { ...f, stages: updatedStages };
    }));
  };

  const addCustomField = (field: CustomFieldDefinition) => {
    setCustomFields(prev => [...prev, field]);
  };

  const deleteCustomField = (id: string) => {
    setCustomFields(prev => prev.filter(f => f.id !== id));
  };

  const getFunnelStats = (funnelId: string) => {
    const funnelLeads = leads.filter(l => l.funnelId === funnelId);
    return {
      totalValue: funnelLeads.reduce((acc, curr) => acc + curr.value, 0),
      leadCount: funnelLeads.length
    };
  };

  // --- User & Team Logic ---
  const addUser = (user: User) => {
    setUsers(prev => [...prev, user]);
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
  };

  const deleteUser = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const addTeam = (team: Team) => {
    setTeams(prev => [...prev, team]);
  };

  const deleteTeam = (id: string) => {
    setTeams(prev => prev.filter(t => t.id !== id));
    // Remove users from the deleted team
    setUsers(prev => prev.map(u => u.teamId === id ? { ...u, teamId: undefined } : u));
  };

  return (
    <CRMContext.Provider value={{
      funnels,
      leads,
      users,
      teams,
      customFields,
      activeFunnelId,
      setActiveFunnelId,
      addLead,
      updateLead,
      moveLead,
      duplicateLead,
      deleteLead,
      addTask,
      toggleTask,
      deleteTask,
      addFunnel,
      updateFunnel,
      addStage,
      reorderStages,
      addCustomField,
      deleteCustomField,
      getFunnelStats,
      addUser,
      updateUser,
      deleteUser,
      addTeam,
      deleteTeam
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
