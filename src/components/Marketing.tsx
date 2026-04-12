import React, { useState, useEffect } from 'react';
import { MarketingDashboard } from './MarketingDashboard';
import { SiteTracking } from './SiteTracking';
import { LeadSegmentation } from './LeadSegmentation';
import { AutomationFlows } from './AutomationFlows';
import { MarketingLeads } from './MarketingLeads';
import { BioLinks } from './BioLinks';
import { EmailMarketing } from './EmailMarketing';

export const Marketing = () => {
  const [activeSubView, setActiveSubView] = useState(() => {
    const hash = window.location.hash;
    if (hash.includes('segmentation')) return 'segmentation';
    if (hash.includes('automations')) return 'automations';
    if (hash.includes('leads-db') || hash.includes('marketing-leads')) return 'leads-db';
    if (hash.includes('bio-links')) return 'bio-links';
    if (hash.includes('email-mkt')) return 'email-mkt';
    return '';
  });

  useEffect(() => {
    const h = () => {
      const hash = window.location.hash;
      if (hash.includes('segmentation')) setActiveSubView('segmentation');
      else if (hash.includes('email-mkt')) setActiveSubView('email-mkt');
      else if (hash.includes('bio-links')) setActiveSubView('bio-links');
      else if (hash.includes('leads-db') || hash.includes('marketing-leads')) setActiveSubView('leads-db');
      else if (hash.includes('automations')) setActiveSubView('automations');
      else setActiveSubView('');
    };
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);

  if (activeSubView === '') {
    return <MarketingDashboard />;
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
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
