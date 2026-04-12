import React, { useState, useEffect } from 'react';
import { CRMProvider, useCRM } from './context/CRMContext';
import { Header as Navbar } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { KanbanBoard } from './components/KanbanBoard';
import { Settings } from './components/Settings';
import { LeadsDatabase } from './components/LeadsDatabase';
import { LeadDetailPage } from './components/LeadDetailPage';
import { TasksView } from './components/TasksView';
import { LoginPage } from './components/LoginPage';
import { NexusAdminDashboard } from './components/NexusAdminDashboard';
import { StrategicInsights } from './components/StrategicInsights';
import { AIBotSettings } from './components/AIBotSettings';
import { Marketing } from './components/Marketing';
import { UserRole } from './types';
import { Loader2 } from 'lucide-react';

const AppContent = () => {
  const { currentUser, isLoading } = useCRM();

  const [currentView, setCurrentView] = useState(() => {
    const hash = window.location.hash.replace(/^#\/?/, '');
    return hash ? hash.split('/')[0] : 'kanban';
  });

  const [appMode, setAppMode] = useState<'crm' | 'marketing'>(() => {
    const hash = window.location.hash;
    return hash.includes('marketing') ? 'marketing' : 'crm';
  });

  const [viewData, setViewData] = useState<any>(() => {
    const hash = window.location.hash.replace(/^#\/?/, '');
    const parts = hash.split('/');
    return parts.length > 1 ? parts[1] : null;
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (hash) {
        const parts = hash.split('/');
        setCurrentView(parts[0]);
        setViewData(parts.length > 1 ? parts[1] : null);
        if (hash.startsWith('marketing')) setAppMode('marketing');
        else if (!hash.startsWith('admin')) setAppMode('crm');
      } else {
        if (currentUser?.role === UserRole.NEXUS_ADMIN) {
          setCurrentView('admin-accounts');
        } else {
          setCurrentView('kanban');
        }
        setViewData(null);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === UserRole.NEXUS_ADMIN) {
        if (!window.location.hash || window.location.hash === '#/' || !window.location.hash.includes('admin')) {
          window.location.hash = '#/admin-accounts';
        }
      } else {
        if (!window.location.hash || window.location.hash === '#/') {
          window.location.hash = '#/kanban';
        }
      }
    }
  }, [currentUser]);


  if (!currentUser) return <LoginPage />;

  const handleNavigate = (view: string, data?: any) => {
      if (data !== undefined) {
          window.location.hash = `#/${view}/${data}`;
      } else {
          window.location.hash = `#/${view}`;
      }
  };

  const renderView = () => {
    if (currentUser.role === UserRole.NEXUS_ADMIN) return <NexusAdminDashboard />;

    switch(currentView) {
      case 'dashboard': return <Dashboard />;
      case 'kanban': return <KanbanBoard onNavigate={handleNavigate} />;
      case 'leads-db': return <LeadsDatabase onNavigate={handleNavigate} />;
      case 'tasks': return <TasksView onNavigate={handleNavigate} />;
      case 'marketing': return <Marketing />;
      case 'ai-bot': return <AIBotSettings />;
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
    <div className={`flex flex-col h-screen bg-slate-50 overflow-hidden`}>
      {currentUser.role !== UserRole.NEXUS_ADMIN && <Navbar currentView={currentView} onChangeView={handleNavigate} appMode={appMode} setAppMode={setAppMode} />}
      <main className="flex-1 overflow-y-auto relative">
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
