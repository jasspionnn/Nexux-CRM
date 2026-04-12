import React, { useState, useEffect, useRef } from 'react';
import { LayoutGrid, BarChart2, Inbox, CheckSquare, Sparkles, Search, Bell, Settings as SettingsIcon, LogOut, Megaphone, Users, Target, Bot, Eye, Link, Mail, BarChart3, ChevronRight, ChevronDown } from 'lucide-react';
import { useCRM } from '../context/CRMContext';

type MktCategory = 'atracao' | 'relacionamento' | 'conversao';

const CATEGORY_ITEMS: Record<MktCategory, { sub: string; label: string; icon: React.ElementType }[]> = {
  atracao: [
    { sub: '', label: 'Início', icon: LayoutGrid },
    { sub: 'tracking', label: 'Tracking', icon: Eye },
    { sub: 'bio-links', label: 'Link na Bio', icon: Link },
  ],
  relacionamento: [
    { sub: '', label: 'Início', icon: LayoutGrid },
    { sub: 'leads-db', label: 'Base de Leads', icon: Users },
    { sub: 'email-mkt', label: 'Email Mkt', icon: Mail },
  ],
  conversao: [
    { sub: '', label: 'Início', icon: LayoutGrid },
    { sub: 'segmentation', label: 'Segmentação', icon: Target },
    { sub: 'automations', label: 'Automações', icon: Bot },
  ],
};

const CATEGORY_LABELS: Record<MktCategory, string> = {
  atracao: 'Atração',
  relacionamento: 'Relacionamento',
  conversao: 'Conversão',
};

function subToCategory(sub: string): MktCategory {
  if (sub === 'tracking' || sub === 'bio-links' || sub === '') return 'atracao';
  if (sub === 'leads-db' || sub === 'email-mkt') return 'relacionamento';
  return 'conversao';
}

export const Header = ({ currentView, onChangeView, appMode, setAppMode }: any) => {
  const { currentUser, logout } = useCRM();
  const [activeSub, setActiveSub] = useState('');
  const [category, setCategory] = useState<MktCategory>('atracao');
  const [catOpen, setCatOpen] = useState(false);
  const catRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = () => {
      const m = window.location.hash.match(/#\/marketing\/(\w+)/);
      const sub = m ? m[1] : '';
      setActiveSub(sub);
      setCategory(subToCategory(sub));
    };
    h();
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) {
        setCatOpen(false);
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
    window.location.hash = '#/marketing/tracking';
  };

  const handleSales = () => {
    setAppMode('crm');
    window.location.hash = '#/kanban';
  };

  const handleMktNav = (sub: string) => {
    window.location.hash = sub ? '#/marketing/' + sub : '#/marketing';
    setCatOpen(false);
  };

  const handleCategoryChange = (cat: MktCategory) => {
    setCategory(cat);
    setCatOpen(false);
    const items = CATEGORY_ITEMS[cat];
    if (items.length > 0) {
      const first = items.find(i => i.sub !== '') || items[0];
      window.location.hash = first.sub ? '#/marketing/' + first.sub : '#/marketing';
    }
  };

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
        <nav className="flex h-full flex-1 items-center">
          {/* Category Selector */}
          <div className="relative mr-4" ref={catRef}>
            <button
              onClick={() => setCatOpen(!catOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-sm font-bold hover:bg-purple-100 transition-colors"
            >
              <span>{CATEGORY_LABELS[category]}</span>
              <ChevronDown size={14} className={'transition-transform ' + (catOpen ? 'rotate-180' : '')} />
            </button>
            {catOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50 min-w-[180px]">
                {(Object.keys(CATEGORY_ITEMS) as MktCategory[]).map(cat => (
                  <button
                    key={cat}
                    onClick={() => handleCategoryChange(cat)}
                    className={'w-full text-left px-4 py-2 text-sm font-medium transition-colors ' + (category === cat ? 'bg-purple-50 text-purple-700 font-bold' : 'text-slate-600 hover:bg-slate-50')}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Category Items */}
          {CATEGORY_ITEMS[category].map(item => {
            const Icon = item.icon;
            const isActive = activeSub === item.sub;
            return (
              <button
                key={item.sub}
                onClick={() => handleMktNav(item.sub)}
                className={'flex items-center gap-2 px-4 h-full border-b-2 transition-colors ' + (isActive ? 'border-purple-600 text-purple-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700 font-medium')}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}

          <button
            onClick={handleSales}
            className="flex items-center gap-2 px-5 h-full border-b-2 border-transparent text-slate-900 hover:text-slate-700 font-semibold transition-colors ml-2"
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
        <button onClick={() => onChangeView('settings')} className={'text-slate-400 hover:text-slate-600 ' + (currentView === 'settings' ? 'text-slate-900' : '')}><SettingsIcon size={20} /></button>
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
