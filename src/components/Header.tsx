import React, { useState } from 'react';
import { LayoutGrid, BarChart2, Inbox, CheckSquare, Sparkles, Search, Bell, Settings as SettingsIcon, Hexagon, LogOut, Megaphone, Users, Target, Bot, Eye, Link, Mail, BarChart3, ChevronRight } from 'lucide-react';
import { useCRM } from '../context/CRMContext';

type AppMode = 'crm' | 'marketing';

export const Header = ({ currentView, onChangeView, appMode, setAppMode }: any) => {
  const { currentUser, logout } = useCRM();
  const [marketingOpen, setMarketingOpen] = useState(false);

  const crmItems = [
    { id: 'dashboard', label: 'Início', icon: LayoutGrid },
    { id: 'kanban', label: 'Negociações', icon: BarChart2 },
    { id: 'leads-db', label: 'Contatos', icon: Inbox },
    { id: 'tasks', label: 'Tarefas', icon: CheckSquare },
    { id: 'ai-bot', label: 'AIFlux', icon: Sparkles, color: 'text-indigo-600' },
  ];

  const marketingItems = [
    { id: 'tracking', label: 'Tracking', icon: Eye, sub: 'tracking' },
    { id: 'segmentation', label: 'Segmentação', icon: Target, sub: 'segmentation' },
    { id: 'automations', label: 'Automações', icon: Bot, sub: 'automations' },
    { id: 'leads-db', label: 'Base de Leads', icon: Users, sub: 'leads-db' },
    { id: 'bio-links', label: 'Link na Bio', icon: Link, sub: 'bio-links' },
    { id: 'email-mkt', label: 'Email Mkt', icon: Mail, sub: 'email-mkt' },
  ];

  const handleMarketing = () => {
    setAppMode('marketing');
    onChangeView('tracking');
    setMarketingOpen(true);
  };

  const handleSales = () => {
    setAppMode('crm');
    onChangeView('kanban');
    setMarketingOpen(false);
  };

  const handleMarketingItem = (sub: string) => {
    onChangeView('marketing');
    setTimeout(() => {
      window.location.hash = `#/marketing/${sub}`;
    }, 50);
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-8">
        <Hexagon className="fill-slate-900 text-slate-900" size={28} />
        <span className="font-bold text-xl tracking-tight text-slate-900">CRM</span>
        {appMode === 'marketing' && <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full ml-2">Marketing</span>}
      </div>

      {/* Nav */}
      {appMode === 'crm' ? (
        <nav className="flex h-full flex-1">
          {crmItems.map(item => (
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
          <button
            onClick={handleMarketing}
            className={`flex items-center gap-2 px-5 h-full border-b-2 transition-colors ${currentView === 'marketing' ? 'border-purple-600 text-purple-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700 font-medium'}`}
          >
            <Megaphone size={18} className="text-purple-600" />
            <span className="text-purple-600">Marketing</span>
          </button>
        </nav>
      ) : (
        <nav className="flex h-full flex-1">
          {marketingItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleMarketingItem(item.sub)}
              className={`flex items-center gap-2 px-4 h-full border-b-2 transition-colors ${currentView === 'marketing' && window.location.hash.includes(item.sub) ? 'border-purple-600 text-purple-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700 font-medium'}`}
            >
              <item.icon size={16} />
              <span>{item.label}</span>
            </button>
          ))}
          <button
            onClick={handleSales}
            className={`flex items-center gap-2 px-5 h-full border-b-2 transition-colors border-transparent text-slate-900 hover:text-slate-700 font-semibold`}
          >
            <BarChart3 size={18} />
            <span>Vendas</span>
            <ChevronRight size={14} />
          </button>
        </nav>
      )}

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
