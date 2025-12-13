
import React, { useState } from 'react';
import { CRMProvider } from './context/CRMContext';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { KanbanBoard } from './components/KanbanBoard';
import { Settings } from './components/Settings';
import { Teams } from './components/Teams';
import { LeadsDatabase } from './components/LeadsDatabase';
import { LeadDetailPage } from './components/LeadDetailPage';
import { TasksView } from './components/TasksView';

const AppContent = () => {
  const [currentView, setCurrentView] = useState('kanban');
  const [viewData, setViewData] = useState<any>(null);

  const handleNavigate = (view: string, data?: any) => {
      if (data !== undefined) {
          setViewData(data);
      }
      setCurrentView(view);
  };

  const renderView = () => {
    switch(currentView) {
      case 'dashboard': return <Dashboard />;
      case 'kanban': return <KanbanBoard onNavigate={handleNavigate} />;
      case 'leads-db': return <LeadsDatabase onNavigate={handleNavigate} />;
      case 'tasks': return <TasksView onNavigate={handleNavigate} />;
      case 'settings': return <Settings />;
      case 'teams': return <Teams />;
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
