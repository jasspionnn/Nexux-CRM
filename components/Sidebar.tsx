
import React from 'react';
import { LayoutDashboard, Kanban, Users, Settings, LogOut, Hexagon, Database, CheckSquare } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onChangeView: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'kanban', label: 'Pipeline', icon: Kanban },
    { id: 'leads-db', label: 'Base de Leads', icon: Database },
    { id: 'tasks', label: 'Tarefas', icon: CheckSquare },
    { id: 'teams', label: 'Equipes', icon: Users },
  ];

  return (
    <div className="w-64 bg-slate-900 h-screen flex flex-col text-white">
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <Hexagon className="text-blue-500 w-8 h-8 mr-3 fill-current" />
        <span className="font-bold text-xl tracking-tight">Nexus CRM</span>
      </div>

      <nav className="flex-1 py-6 px-3 space-y-1">
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => onChangeView(item.id)}
            className={`w-full flex items-center px-3 py-3 rounded-lg transition-all duration-200 ${
              currentView === item.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <item.icon className="w-5 h-5 mr-3" />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button 
            onClick={() => onChangeView('settings')}
            className={`flex items-center transition w-full px-3 py-2 rounded-lg mb-1 ${
                currentView === 'settings' 
                ? 'bg-slate-800 text-white' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
        >
            <Settings className="w-5 h-5 mr-3" />
            <span>Configurações</span>
        </button>
        <button className="flex items-center text-red-400 hover:text-red-300 transition w-full px-3 py-2 hover:bg-slate-800 rounded-lg">
            <LogOut className="w-5 h-5 mr-3" />
            <span>Sair</span>
        </button>
      </div>
    </div>
  );
};
