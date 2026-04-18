import React, { useState, useEffect, useRef } from 'react';
import { LayoutGrid, BarChart2, Inbox, CheckSquare, Sparkles, Search, Bell, Settings as SettingsIcon, LogOut, Megaphone, Users, Target, Bot, Eye, Link, Mail, BarChart3, ChevronRight, ChevronDown, Award, SlidersHorizontal } from 'lucide-react';
import { useCRM } from '../context/CRMContext';

const MKT_CATEGORIES: Record<string, { sub: string; label: string; icon: React.ElementType }[]> = {
  atracao: [
    { sub: 'tracking', label: 'Tracking', icon: Eye },
    { sub: 'bio-links', label: 'Link na Bio', icon: Link },
  ],
  relacionamento: [
    { sub: 'leads-db', label: 'Base de Leads', icon: Users },
    { sub: 'email-mkt', label: 'Email Mkt', icon: Mail },
  ],
  conversao: [
    { sub: 'lead-scoring', label: 'Lead Scoring', icon: Award },
    { sub: 'segmentation', label: 'Segmentação', icon: Target },
    { sub: 'automations', label: 'Automações', icon: Bot },
  ],
};

export const Header = ({ currentView, onChangeView, appMode, setAppMode }: any) => {
  const { currentUser, logout } = useCRM();
  const [activeSub, setActiveSub] = useState('');
  const [mktCategory, setMktCategory] = useState<string | null>(null);
  const [openCat, setOpenCat] = useState<string | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = () => {
      const m = window.location.hash.match(/#\/marketing\/(\w+)/);
      const sub = m ? m[1] : '';
      setActiveSub(sub);
      if (appMode === 'marketing') {
        const found = Object.entries(MKT_CATEGORIES).find(([, items]) =>
          items.some(i => i.sub === sub)
        );
        setMktCategory(found ? found[0] : null);
      }
    };
    h();
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, [appMode]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpenCat(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const crmItems = [
    { id: 'dashboard', label: 'Início', icon: LayoutGrid },
    { id: 'kanban', label: 'Negociações', icon: BarChart2 },
    { id: 'leads-db', label: 'Contatos', icon: Inbox },
    { id: 'tasks', label: 'Tarefas', icon: CheckSquare },
    { id: 'ai-bot', label: 'AIFlux', icon: Sparkles, color: 'text-indigo-600' },
  ];

  const handleMarketing = () => {
    setAppMode('marketing');
    setMktCategory('atracao');
    window.location.hash = '#/marketing/tracking';
  };

  const handleSales = () => {
    setAppMode('crm');
    setMktCategory(null);
    setOpenCat(null);
    window.location.hash = '#/kanban';
  };

  const handleCatClick = (cat: string) => {
    setOpenCat(openCat === cat ? null : cat);
    setMktCategory(cat);
  };

  const handleSub = (sub: string) => {
    window.location.hash = '#/marketing/' + sub;
    setOpenCat(null);
  };

  const handleDash = () => {
    window.location.hash = '#/marketing';
  };

  const catLabels: Record<string, string> = { atracao: 'Atração', relacionamento: 'Relacionamento', conversao: 'Conversão' };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      {appMode === 'crm' ? (
        <nav className="flex h-full flex-1">
          {crmItems.map(item => (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={'flex items-center gap-2 px-5 h-full border-b-2 transition-colors ' + (currentView === item.id ? 'border-slate-900 text-slate-900 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700 font-medium')}
            >
              <item.icon size={18} className={item.color || ''} />
              <span className={item.color || ''}>{item.label}</span>
              {item.id === 'ai-bot' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 ml-1"></span>}
            </button>
          ))}
          <button
            onClick={handleMarketing}
            className={'flex items-center gap-2 px-5 h-full border-b-2 transition-colors ' + (appMode === 'marketing' || currentView === 'marketing' ? 'border-purple-600 text-purple-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700 font-medium')}
          >
            <Megaphone size={18} className="text-purple-600" />
            <span className="text-purple-600">Marketing</span>
          </button>
        </nav>
      ) : (
        <nav className="flex h-full flex-1 items-center" ref={dropRef}>
          <button
            onClick={handleDash}
            className={'flex items-center gap-2 px-5 h-full border-b-2 transition-colors ' + (activeSub === '' ? 'border-purple-600 text-purple-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700 font-medium')}
          >
            <LayoutGrid size={16} />
            <span>Início</span>
          </button>
          {Object.entries(MKT_CATEGORIES).map(([key, items]) => {
            const Icon = items[0].icon;
            const isActive = mktCategory === key;
            const isOpen = openCat === key;
            const hasActiveSub = items.some(i => i.sub === activeSub);
            return (
              <div key={key} className="relative h-full">
                <button
                  onClick={() => handleCatClick(key)}
                  className={'flex items-center gap-2 px-5 h-full border-b-2 transition-colors ' + (isActive && hasActiveSub ? 'border-purple-600 text-purple-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700 font-medium')}
                >
                  <Icon size={16} />
                  <span>{catLabels[key]}</span>
                  <ChevronDown size={14} className={'transition-transform ' + (isOpen ? 'rotate-180' : '')} />
                </button>
                {isOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50 min-w-[200px]">
                    {items.map(item => {
                      const I = item.icon;
                      const isSubActive = activeSub === item.sub;
                      return (
                        <button
                          key={item.sub}
                          onClick={() => handleSub(item.sub)}
                          className={'w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ' + (isSubActive ? 'bg-purple-50 text-purple-700 font-bold' : 'text-slate-600 hover:bg-slate-50')}
                        >
                          <I size={16} />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          <div className="w-px h-6 bg-slate-200 mx-2" />
          <button
            onClick={handleSales}
            className="flex items-center gap-2 px-5 h-full border-b-2 border-transparent text-slate-900 hover:text-slate-700 font-semibold transition-colors"
          >
            <BarChart3 size={18} />
            <span>Vendas</span>
            <ChevronRight size={14} />
          </button>
        </nav>
      )}

      <div className="flex items-center gap-5">
        <button className="text-slate-400 hover:text-slate-600"><Search size={20} /></button>
        <button className="text-slate-400 hover:text-slate-600"><Bell size={20} /></button>
        <button 
          onClick={() => {
            if (appMode === 'marketing') {
              window.location.hash = '#/marketing/settings';
            } else {
              onChangeView('settings');
            }
          }} 
          className={'text-slate-400 hover:text-slate-600 ' + (currentView === 'settings' || (appMode === 'marketing' && activeSub === 'settings') ? 'text-slate-900' : '')}
        >
          <SettingsIcon size={20} />
        </button>
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
