import React from 'react';
import { LayoutDashboard, Trello, Users, CheckSquare, Bot, Settings, LogOut, BarChart3 } from 'lucide-react';
import { useCRM } from '../context/CRMContext';

export const Sidebar = ({ currentView, onChangeView }: any) => {
  const { currentUser, logout } = useCRM();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'kanban', label: 'Pipeline (Kanban)', icon: Trello },
    { id: 'leads-db', label: 'Leads Database', icon: Users },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'marketing', label: 'Marketing', icon: BarChart3 },
    { id: 'ai-bot', label: 'AI & Bot Settings', icon: Bot },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 h-full flex flex-col transition-all">
      <div className="p-6 flex items-center space-x-3">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-xl">N</span>
        </div>
        <span className="text-white font-bold text-xl tracking-wide">Nexux CRM</span>
      </div>

      <div className="px-4 pb-4">
        <div className="bg-slate-800 rounded-lg p-3 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
            {currentUser?.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{currentUser?.name}</p>
            <p className="text-xs text-slate-400 truncate">{currentUser?.role}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto mt-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-indigo-600 text-white' 
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400'} />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={logout}
          className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut size={20} />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
