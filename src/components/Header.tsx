import React from 'react';
import { LayoutGrid, BarChart2, Inbox, CheckSquare, Sparkles, Search, Bell, Settings as SettingsIcon, Hexagon, LogOut } from 'lucide-react';
import { useCRM } from '../context/CRMContext';

export const Header = ({ currentView, onChangeView }: any) => {
  const { currentUser, logout } = useCRM();

  const navItems = [
    { id: 'dashboard', label: 'Início', icon: LayoutGrid },
    { id: 'kanban', label: 'Negociações', icon: BarChart2 },
    { id: 'leads-db', label: 'Contatos', icon: Inbox },
    { id: 'tasks', label: 'Tarefas', icon: CheckSquare },
    { id: 'ai-bot', label: 'AIFlux', icon: Sparkles, color: 'text-indigo-600' },
  ];

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-8">
        <Hexagon className="fill-slate-900 text-slate-900" size={28} />
        <span className="font-bold text-xl tracking-tight text-slate-900">CRM</span>
      </div>

      {/* Nav */}
      <nav className="flex h-full flex-1">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => onChangeView(item.id)}
            className={`flex items-center gap-2 px-5 h-full border-b-2 transition-colors ${currentView === item.id ? 'border-slate-900 text-slate-900 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700 font-medium'}`}
          >
            <item.icon size={18} className={item.color || ''} />
            <span className={item.color || ''}>{item.label}</span>
            {item.id === 'ai-bot' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 ml-1"></span>}
          </button>
        ))}
      </nav>

      {/* Right */}
      <div className="flex items-center gap-5">
        <button className="text-slate-400 hover:text-slate-600"><Search size={20} /></button>
        <button className="text-slate-400 hover:text-slate-600"><Bell size={20} /></button>
        <button onClick={() => onChangeView('settings')} className={`text-slate-400 hover:text-slate-600 ${currentView === 'settings' ? 'text-slate-900' : ''}`}><SettingsIcon size={20} /></button>
        
        <div className="h-8 w-px bg-gray-200 mx-1"></div>
        
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-bold text-slate-900 leading-none">{currentUser?.name || 'User'}</div>
            <div className="text-[10px] font-bold text-slate-400 tracking-wider mt-1">{currentUser?.role === 'NEXUS_ADMIN' ? 'ADMIN' : 'CONTA PADRÃO'}</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm">
            {currentUser?.name ? currentUser.name.substring(0, 2).toUpperCase() : 'US'}
          </div>
          <button onClick={logout} className="ml-2 text-slate-400 hover:text-red-600 transition-colors" title="Sair">
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};
