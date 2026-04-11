import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, BarChart3, Filter, GitBranch, Users, Link, Mail } from 'lucide-react';
import { SiteTracking } from './SiteTracking';
import { LeadSegmentation } from './LeadSegmentation';
import { AutomationFlows } from './AutomationFlows';
import { MarketingLeads } from './MarketingLeads';
import { BioLinks } from './BioLinks';
import { EmailMarketing } from './EmailMarketing';

const SUB_ITEMS = [
  { id: 'tracking', label: 'Site Tracking', icon: BarChart3 },
  { id: 'segmentation', label: 'Segmentação', icon: Filter },
  { id: 'automations', label: 'Automações', icon: GitBranch },
  { id: 'leads-db', label: 'Base de Leads', icon: Users },
  { id: 'bio-links', label: 'Link na Bio', icon: Link },
  { id: 'email-mkt', label: 'Email Mkt', icon: Mail },
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
      else if (hash.includes('email-mkt')) setActiveSubView('email-mkt');
      else if (hash.includes('bio-links')) setActiveSubView('bio-links');
      else if (hash.includes('leads-db') || hash.includes('marketing-leads')) setActiveSubView('leads-db');
      else if (hash.includes('automations')) setActiveSubView('automations');
      else setActiveSubView('tracking');
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
        <div className="flex items-center gap-3 flex-nowrap overflow-x-auto">
          {SUB_ITEMS.map((item, idx) => {
            const Icon = item.icon;
            const isActive = activeSubView === item.id;
            return (
              <React.Fragment key={item.id}>
                {/* Separator before Bio Links */}
                {idx === SUB_ITEMS.length - 1 && (
                  <div className="w-px h-8 bg-slate-200 mx-1" />
                )}
                <button
                  onClick={() => handleNavigate(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-md shadow-slate-300'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-white' : ''} />
                  {item.label}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        {activeSubView === 'tracking' && <SiteTracking />}
        {activeSubView === 'segmentation' && <LeadSegmentation />}
        {activeSubView === 'automations' && <AutomationFlows />}
        {activeSubView === 'leads-db' && <MarketingLeads />}
        {activeSubView === 'bio-links' && <BioLinks />}
        {activeSubView === 'email-mkt' && <EmailMarketing />}
      </main>
    </div>
  );
};
