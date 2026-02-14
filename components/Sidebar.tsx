
import React from 'react';
import { useCRM } from '../context/CRMContext';
import { 
  LayoutDashboard, Kanban, Users, Settings, LogOut, Hexagon, 
  Database, CheckSquare, Shield, ShieldCheck, Search, Bell, Menu 
} from 'lucide-react';
import { UserRole } from '../types';

interface NavbarProps {
  currentView: string;
  onChangeView: (view: string) => void;
}

export const Sidebar: React.FC<NavbarProps> = ({ currentView, onChangeView }) => {
  const { currentUser, logout } = useCRM();

  const isNexusAdmin = currentUser?.role === UserRole.NEXUS_ADMIN;

  const menuItems = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
    { id: 'kanban', label: 'Negociações', icon: Kanban },
    { id: 'leads-db', label: 'Contatos', icon: Database },
    { id: 'tasks', label: 'Tarefas', icon: CheckSquare },
  ];

  return (
    <nav className="h-16 bg-white border-b border-gray-200 flex items-center px-6 justify-between fixed top-0 w-full z-[100] shadow-sm">
      <div className="flex items-center gap-8">
        <div className="flex items-center cursor-pointer" onClick={() => onChangeView('dashboard')}>
          <Hexagon className="text-gray-900 w-7 h-7 mr-2 fill-current" />
          <span className="font-bold text-lg tracking-tighter text-gray-800">CRM</span>
        </div>

        <div className="hidden md:flex items-center gap-1">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`px-4 py-5 text-sm font-semibold transition-all border-b-2 ${
                currentView === item.id 
                  ? 'border-brand-navy text-gray-900' 
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              {item.label}
            </button>
          ))}
          <button className="px-4 py-5 text-sm font-semibold text-gray-500 hover:text-gray-900 border-b-2 border-transparent">Análises</button>
          <button className="px-4 py-5 text-sm font-semibold text-gray-500 hover:text-gray-900 border-b-2 border-transparent">Marketing</button>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <div className="hidden sm:flex items-center gap-4 text-gray-400">
          <Search size={20} className="cursor-pointer hover:text-gray-600" />
          <Bell size={20} className="cursor-pointer hover:text-gray-600" />
          <Settings size={20} className="cursor-pointer hover:text-gray-600" onClick={() => onChangeView('settings')} />
        </div>

        <div className="h-8 w-px bg-gray-200 mx-2"></div>

        <div className="flex items-center gap-3 group cursor-pointer relative">
          <div className="text-right hidden lg:block">
            <p className="text-xs font-bold text-gray-900 leading-none">{currentUser?.name}</p>
            <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold">{currentUser?.accountId ? 'Conta Padrão' : 'Nexus Admin'}</p>
          </div>
          <img src={currentUser?.avatar} className="w-9 h-9 rounded-full border border-gray-100 shadow-sm" alt="profile" />
          
          {/* Dropdown Simples */}
          <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all p-2">
            <button onClick={logout} className="w-full flex items-center gap-2 p-2 text-sm text-red-600 font-bold hover:bg-red-50 rounded-lg">
              <LogOut size={16} /> Sair
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
