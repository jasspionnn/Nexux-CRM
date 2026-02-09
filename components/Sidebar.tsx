
import React from 'react';
import { useCRM } from '../context/CRMContext';
import { LayoutDashboard, Kanban, Users, Settings, LogOut, Hexagon, Database, CheckSquare, Shield, ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import { UserRole } from '../types';

interface SidebarProps {
  currentView: string;
  onChangeView: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView }) => {
  const { currentUser, logout, isOnline } = useCRM();

  const isNexusAdmin = currentUser?.role === UserRole.NEXUS_ADMIN;
  const isAccountAdmin = currentUser?.role === UserRole.ACCOUNT_ADMIN;

  let menuItems = [];

  if (isNexusAdmin) {
    menuItems = [{ id: 'admin-accounts', label: 'Gestão de Contas', icon: ShieldCheck }];
  } else {
    menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'kanban', label: 'Pipeline', icon: Kanban },
        { id: 'leads-db', label: 'Base de Leads', icon: Database },
        { id: 'tasks', label: 'Tarefas', icon: CheckSquare },
    ];
  }

  return (
    <div className="w-64 bg-slate-900 h-screen flex flex-col text-white">
      <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
        <div className="flex items-center">
            <Hexagon className="text-blue-500 w-8 h-8 mr-3 fill-current" />
            <span className="font-bold text-xl tracking-tight">
                {isNexusAdmin ? 'Nexus Admin' : 'Nexus CRM'}
            </span>
        </div>
        
        {/* Connection Indicator */}
        <div title={isOnline ? 'Banco de dados conectado' : 'Erro de conexão com o banco'}>
            {isOnline ? (
                <Wifi size={14} className="text-green-500 animate-pulse" />
            ) : (
                <WifiOff size={14} className="text-red-500" />
            )}
        </div>
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
        <div className="flex items-center gap-3 mb-4 px-2">
            <img 
                src={currentUser?.avatar} 
                className="w-10 h-10 rounded-full border-2 border-slate-700" 
                alt={currentUser?.name} 
            />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate text-white">{currentUser?.name}</p>
                <div className="flex items-center gap-1">
                    {isNexusAdmin && <Shield size={10} className="text-yellow-400" />}
                    {isAccountAdmin && <Shield size={10} className="text-blue-400" />}
                    <p className="text-xs text-slate-400 truncate capitalize">
                        {isNexusAdmin ? 'Super Admin' : isAccountAdmin ? 'Conta Mãe' : 'Vendedor'}
                    </p>
                </div>
            </div>
        </div>

        {!isNexusAdmin && isAccountAdmin && (
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
        )}
        
        <button 
            onClick={logout}
            className="flex items-center text-red-400 hover:text-red-300 transition w-full px-3 py-2 hover:bg-slate-800 rounded-lg"
        >
            <LogOut className="w-5 h-5 mr-3" />
            <span>Sair</span>
        </button>
      </div>
    </div>
  );
};
