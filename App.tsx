
import React, { useState, useEffect } from 'react';
import { CRMProvider, useCRM } from './context/CRMContext.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { KanbanBoard } from './components/KanbanBoard.tsx';
import { Settings } from './components/Settings.tsx';
import { LeadsDatabase } from './components/LeadsDatabase.tsx';
import { LeadDetailPage } from './components/LeadDetailPage.tsx';
import { TasksView } from './components/TasksView.tsx';
import { LoginPage } from './components/LoginPage.tsx';
import { NexusAdminDashboard } from './components/NexusAdminDashboard.tsx';
import { UserRole } from './types.ts';

const AppContent = () => {
  const { currentUser } = useCRM();
  const [currentView, setCurrentView] = useState('kanban');
  const [viewData, setViewData] = useState<any>(null);

  useEffect(() => {
    if (currentUser?.role === UserRole.NEXUS_ADMIN) {
        setCurrentView('admin-accounts');
    } else if (currentView === 'admin-accounts' && currentUser) {
        setCurrentView('kanban');
    }
  }, [currentUser]);

  if (!currentUser) {
      return <LoginPage />;
  }

  const handleNavigate = (view: string, data?: any) => {
      if (data !== undefined) setViewData(data);
      setCurrentView(view);
  };

  const renderView = () => {
    if (currentView === 'admin-accounts') {
        return currentUser.role === UserRole.NEXUS_ADMIN ? <NexusAdminDashboard /> : <div>Acesso Negado</div>;
    }

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
    <CRMProvider>
      <AppContent />
    </CRMProvider>
  );
}
