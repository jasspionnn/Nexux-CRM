import React, { useState, useEffect } from 'react';
import { Megaphone, BarChart3, Filter, GitBranch } from 'lucide-react';
import { SiteTracking } from './SiteTracking';
import { LeadSegmentation } from './LeadSegmentation';
import { AutomationFlows } from './AutomationFlows';

const SUB_ITEMS = [
  { id: 'tracking', label: 'Site Tracking', icon: BarChart3, description: 'Rastreie visitantes e conversões do seu site' },
  { id: 'segmentation', label: 'Segmentação de Leads', icon: Filter, description: 'Crie segmentações dinâmicas para filtrar leads' },
  { id: 'automations', label: 'Automações', icon: GitBranch, description: 'Crie fluxos de automação visuais estilo RD Station' },
];

export const Marketing = () => {
  const [activeSubView, setActiveSubView] = useState(() => {
    const hash = window.location.hash;
    if (hash.includes('segmentation')) return 'segmentation';
    return 'tracking';
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.includes('segmentation')) setActiveSubView('segmentation');
      else if (hash.includes('automations')) setActiveSubView('automations');
      else if (hash.includes('tracking') || hash.includes('marketing')) setActiveSubView('tracking');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigate = (subView: string) => {
    if (subView === 'tracking') {
      window.location.hash = '#/marketing';
    } else {
      window.location.hash = `#/marketing/${subView}`;
    }
    setActiveSubView(subView);
  };

  return (
    <div className="flex h-full bg-slate-50/50">
      {/* Sidebar de Sub-menu */}
      <aside className="w-64 bg-white border-r border-slate-200 shrink-0 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-1">
            <Megaphone className="text-purple-600" size={24} />
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Marketing</h2>
          </div>
          <p className="text-sm text-slate-500 mb-6">Ferramentas de marketing e análise</p>

          <nav className="space-y-1">
            {SUB_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = activeSubView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                    isActive
                      ? 'bg-purple-50 border border-purple-200 shadow-sm'
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-400'
                  }`}>
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-bold truncate ${isActive ? 'text-purple-700' : 'text-slate-700'}`}>
                      {item.label}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 leading-tight">{item.description}</p>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-y-auto">
        {activeSubView === 'tracking' && <SiteTracking />}
        {activeSubView === 'segmentation' && <LeadSegmentation />}
        {activeSubView === 'automations' && <AutomationFlows />}
      </main>
    </div>
  );
};
