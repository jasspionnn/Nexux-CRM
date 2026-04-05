import React, { useState, useRef, useEffect } from 'react';
import { LayoutGrid, BarChart2, Inbox, CheckSquare, Sparkles, Search, Bell, Settings as SettingsIcon, Hexagon, LogOut, Megaphone, ChevronDown, BarChart3, Filter, GitBranch } from 'lucide-react';
import { useCRM } from '../context/CRMContext';

export const Header = ({ currentView, onChangeView }: any) => {
  const { currentUser, logout } = useCRM();
  const [marketingOpen, setMarketingOpen] = useState(false);
  const marketingRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { id: 'dashboard', label: 'Início', icon: LayoutGrid },
    { id: 'kanban', label: 'Negociações', icon: BarChart2 },
    { id: 'leads-db', label: 'Contatos', icon: Inbox },
    { id: 'tasks', label: 'Tarefas', icon: CheckSquare },
    { id: 'ai-bot', label: 'AIFlux', icon: Sparkles, color: 'text-indigo-600' },
    { id: 'marketing', label: 'Marketing', icon: Megaphone, color: 'text-purple-600' },
  ];

  // Close dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (marketingRef.current && !marketingRef.current.contains(e.target as Node)) setMarketingOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const marketingTools = [
    { id: 'tracking', label: 'Site Tracking', icon: BarChart3 },
    { id: 'segmentation', label: 'Segmentação', icon: Filter },
    { id: 'automations', label: 'Automações', icon: GitBranch },
  ];

  const goToMarketing = (sub: string) => {
    window.location.hash = sub === 'tracking' ? '#/marketing' : `#/marketing/${sub}`;
    onChangeView('marketing');
    setMarketingOpen(false);
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-8">
        <Hexagon className="fill-slate-900 text-slate-900" size={28} />
        <span className="font-bold text-xl tracking-tight text-slate-900">CRM</span>
      </div>

      {/* Nav */}
      <nav className="flex h-full flex-1">
        {navItems.map(item => {
          const isMarketing = item.id === 'marketing';
          return isMarketing ? (
            <div key={item.id} ref={marketingRef} className="relative h-full"
              onMouseEnter={() => setMarketingOpen(true)}
              onMouseLeave={() => setMarketingOpen(false)}
            >
              <button
                onClick={() => { onChangeView('marketing'); goToMarketing('tracking'); }}
                className={`flex items-center gap-2 px-5 h-full border-b-2 transition-colors ${currentView === 'marketing' ? 'border-slate-900 text-slate-900 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700 font-medium'}`}
              >
                <item.icon size={18} className={item.color || ''} />
                <span className={item.color || ''}>{item.label}</span>
                <ChevronDown size={14} className={`transition-transform ${marketingOpen ? 'rotate-180' : ''}`} />
                <span className="w-1.5 h-1.5 rounded-full bg-purple-600 ml-1"></span>
              </button>

              {/* Dropdown */}
              {marketingOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                  {marketingTools.map(tool => {
                    const Icon = tool.icon;
                    return (
                      <button
                        key={tool.id}
                        onClick={() => goToMarketing(tool.id)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-purple-50 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                          <Icon size={16} />
                        </div>
                        <span className="font-bold text-slate-700">{tool.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`flex items-center gap-2 px-5 h-full border-b-2 transition-colors ${currentView === item.id ? 'border-slate-900 text-slate-900 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700 font-medium'}`}
            >
              <item.icon size={18} className={item.color || ''} />
              <span className={item.color || ''}>{item.label}</span>
              {item.id === 'ai-bot' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 ml-1"></span>}
            </button>
          );
        })}
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
