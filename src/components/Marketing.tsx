import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, BarChart3, Filter, GitBranch } from 'lucide-react';
import { SiteTracking } from './SiteTracking';
import { LeadSegmentation } from './LeadSegmentation';
import { AutomationFlows } from './AutomationFlows';

const SUB_ITEMS = [
  { id: 'tracking', label: 'Site Tracking', icon: BarChart3 },
  { id: 'segmentation', label: 'Segmentação', icon: Filter },
  { id: 'automations', label: 'Automações', icon: GitBranch },
];

export const Marketing = () => {
  const [activeSubView, setActiveSubView] = useState(() => {
    const hash = window.location.hash;
    if (hash.includes('segmentation')) return 'segmentation';
    if (hash.includes('automations')) return 'automations';
    return 'tracking';
  });

  useEffect(() => {
    const h = () => {
      const hash = window.location.hash;
      if (hash.includes('segmentation')) setActiveSubView('segmentation');
      else if (hash.includes('automations')) setActiveSubView('automations');
      else if (hash.includes('tracking') || hash.includes('marketing')) setActiveSubView('tracking');
    };
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);

  const handleNavigate = (subView: string) => {
    window.location.hash = subView === 'tracking' ? '#/marketing' : `#/marketing/${subView}`;
    setActiveSubView(subView);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Top bar selector */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0">
        <div className="flex items-center gap-2 max-w-2xl">
          {SUB_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeSubView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-200'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-white' : ''} />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        {activeSubView === 'tracking' && <SiteTracking />}
        {activeSubView === 'segmentation' && <LeadSegmentation />}
        {activeSubView === 'automations' && <AutomationFlows />}
      </main>
    </div>
  );
};
