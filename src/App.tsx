import { Lead, User, Team, Funnel, UserRole } from './types';

const mockData = {
  leads: [] as Lead[],
  users: [
    {
      id: 'u1',
      name: 'Admin Nexus',
      email: 'admin@nexus.com',
      role: UserRole.ACCOUNT_ADMIN,
      avatar: '',
      status: 'active',
    },
  ] as User[],
  teams: [
    {
      id: 't1',
      accountId: 'acc1',
      name: 'Time Comercial',
      goal: 100000,
    },
  ] as Team[],
  funnels: [
    {
      id: 'f1',
      accountId: 'acc1',
      name: 'Funil Principal',
      stages: [],
    },
  ] as Funnel[],
};

import React, { useState, useEffect } from 'react';
import { CRMProvider, useCRM } from './context/CRMContext';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { KanbanBoard } from './components/KanbanBoard';
import { Settings } from './components/Settings';
import { LeadsDatabase } from './components/LeadsDatabase';
import { LeadDetailPage } from './components/LeadDetailPage';
import { TasksView } from './components/TasksView';
import { LoginPage } from './components/LoginPage';
import { NexusAdminDashboard } from './components/NexusAdminDashboard';
import { UserRole } from './types';

const AppContent = () => {
  const { currentUser } = useCRM();
  const [currentView, setCurrentView] = useState('kanban');
  const [viewData, setViewData] = useState<any>(null);

  // Set initial view based on role
  useEffect(() => {
    if (currentUser?.role === UserRole.NEXUS_ADMIN) {
        setCurrentView('admin-accounts');
    } else {
        // Only reset if we were in admin view
        if (currentView === 'admin-accounts') setCurrentView('kanban');
    }
  }, [currentUser]);

  if (!currentUser) {
      return <LoginPage />;
  }

  const handleNavigate = (view: string, data?: any) => {
      if (data !== undefined) {
          setViewData(data);
      }
      setCurrentView(view);
  };

  const renderView = () => {
    // Nexus Admin Specific View
    if (currentView === 'admin-accounts') {
        if (currentUser.role !== UserRole.NEXUS_ADMIN) return <div>Acesso Negado</div>;
        return <NexusAdminDashboard />;
    }

    // CRM Views
    switch(currentView) {
      case 'dashboard': return <Dashboard />;
      case 'kanban': return <KanbanBoard onNavigate={handleNavigate} />;
      case 'leads-db': return <LeadsDatabase onNavigate={handleNavigate} />;
      case 'tasks': return <TasksView onNavigate={handleNavigate} />;
      case 'settings': 
        return currentUser.role === UserRole.ACCOUNT_ADMIN ? <Settings /> : <div>Acesso restrito</div>;
      case 'lead-detail': 
        return <LeadDetailPage 
            leadId={viewData} 
            onBack={() => handleNavigate('kanban')} 
            onNavigate={handleNavigate}
        />;
      default: return <KanbanBoard onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar currentView={currentView} onChangeView={(view) => handleNavigate(view)} />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {renderView()}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <CRMProvider initialData={mockData}>
     <AppContent />
    </CRMProvider>

  );
}