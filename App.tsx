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
import { Loader2 } from 'lucide-react';

const AppContent = () => {
  const { currentUser, isLoading } = useCRM();
  const [currentView, setCurrentView] = useState('kanban');
  const [viewData, setViewData] = useState<any>(null);

  // Define a visão inicial baseada no papel do usuário
  useEffect(() => {
    if (currentUser?.role === UserRole.NEXUS_ADMIN) {
        setCurrentView('admin-accounts');
    } else if (currentUser) {
        if (currentView === 'admin-accounts') setCurrentView('kanban');
    }
  }, [currentUser]);

  // Se estiver carregando a sessão inicial
  if (isLoading && !currentUser) {
      return (
          <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-50">
              <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
              <p className="text-gray-600 font-bold">Iniciando Nexus CRM...</p>
          </div>
      );
  }

  // Se não houver usuário logado
  if (!currentUser) {
      return <LoginPage />;
  }

  const handleNavigate = (view: string, data?: any) => {
      if (data !== undefined) setViewData(data);
      setCurrentView(view);
  };

  const renderView = () => {
    // Caso seja Super Admin
    if (currentUser.role === UserRole.NEXUS_ADMIN) {
        return <NexusAdminDashboard />;
    }

    // Visões normais do CRM
    switch(currentView) {
      case 'dashboard': return <Dashboard />;
      case 'kanban': return <KanbanBoard onNavigate={handleNavigate} />;
      case 'leads-db': return <LeadsDatabase onNavigate={handleNavigate} />;
      case 'tasks': return <TasksView onNavigate={handleNavigate} />;
      case 'settings': 
        return currentUser.role === UserRole.ACCOUNT_ADMIN ? <Settings /> : <div className="p-8 font-black">ACESSO RESTRITO</div>;
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
