import React, { useState, useEffect } from 'react';
import { CRMProvider, useCRM } from './context/CRMContext';
import { Sidebar as Navbar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { KanbanBoard } from './components/KanbanBoard';
import { Settings } from './components/Settings';
import { LeadsDatabase } from './components/LeadsDatabase';
import { LeadDetailPage } from './components/LeadDetailPage';
import { TasksView } from './components/TasksView';
import { LoginPage } from './components/LoginPage';
import { NexusAdminDashboard } from './components/NexusAdminDashboard';
import { StrategicInsights } from './components/StrategicInsights';
import { UserRole } from './types';
import { Loader2 } from 'lucide-react';

const AppContent = () => {
  const { currentUser, isLoading } = useCRM();
  const [currentView, setCurrentView] = useState('kanban');
  const [viewData, setViewData] = useState<any>(null);

  useEffect(() => {
    if (currentUser?.role === UserRole.NEXUS_ADMIN) {
        setCurrentView('admin-accounts');
    }
  }, [currentUser]);

  if (isLoading) {
      return (
          <div className="h-screen w-screen flex flex-col items-center justify-center bg-white">
              <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
              <p className="text-gray-800 font-black text-lg tracking-tighter uppercase">Nexus CRM</p>
          </div>
      );
  }

  if (!currentUser) return <LoginPage />;

  const handleNavigate = (view: string, data?: any) => {
      if (data !== undefined) setViewData(data);
      setCurrentView(view);
  };

  const renderView = () => {
    if (currentUser.role === UserRole.NEXUS_ADMIN) return <NexusAdminDashboard />;

    switch(currentView) {
      case 'dashboard': return <Dashboard />;
      case 'kanban': return <KanbanBoard onNavigate={handleNavigate} />;
      case 'leads-db': return <LeadsDatabase onNavigate={handleNavigate} />;
      case 'tasks': return <TasksView onNavigate={handleNavigate} />;
      case 'settings': return <Settings />;
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
    <div className={`flex flex-col h-screen bg-gray-50 overflow-hidden ${currentUser.role !== UserRole.NEXUS_ADMIN ? 'pt-16' : ''}`}>
      {currentUser.role !== UserRole.NEXUS_ADMIN && <Navbar currentView={currentView} onChangeView={(view: string) => handleNavigate(view)} />}
      <main className="flex-1 overflow-hidden relative">
        {renderView()}
      </main>
      {currentUser.role !== UserRole.NEXUS_ADMIN && <StrategicInsights />}
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
