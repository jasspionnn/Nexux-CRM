import React, { useState, useEffect } from 'react';
import { MarketingDashboard } from './MarketingDashboard';
import { SiteTracking } from './SiteTracking';
import { LeadSegmentation } from './LeadSegmentation';
import { AutomationFlows } from './AutomationFlows';
import { MarketingLeads } from './MarketingLeads';
import { BioLinks } from './BioLinks';
import { EmailMarketing } from './EmailMarketing';
import { LeadScoring } from './LeadScoring';
import { MarketingSettings } from './MarketingSettings';
import { MarketingCustomFields } from './MarketingCustomFields';

export const Marketing = ({ subView }: { subView?: string | null }) => {
  const [activeSubView, setActiveSubView] = useState('');

  useEffect(() => {
    // Priority 1: Use prop from MainApp
    if (subView) {
      setActiveSubView(subView);
    } else {
      // Priority 2: Use hash
      const hash = window.location.hash;
      if (hash.includes('lead-scoring')) setActiveSubView('lead-scoring');
      else if (hash.includes('segmentation')) setActiveSubView('segmentation');
      else if (hash.includes('email-mkt')) setActiveSubView('email-mkt');
      else if (hash.includes('bio-links')) setActiveSubView('bio-links');
      else if (hash.includes('leads-db') || hash.includes('marketing-leads')) setActiveSubView('leads-db');
      else if (hash.includes('automations')) setActiveSubView('automations');
      else if (hash.includes('tracking')) setActiveSubView('tracking');
      else if (hash.includes('settings')) setActiveSubView('settings');
      else if (hash.includes('mkt-fields')) setActiveSubView('mkt-fields');
      else setActiveSubView('');
    }
  }, [subView]);

  useEffect(() => {
    // Only add listener if we don't have a reliable subView prop
    const h = () => {
      if (subView) return; // MainApp will handle hash change and update prop
      const hash = window.location.hash;
      if (hash.includes('lead-scoring')) setActiveSubView('lead-scoring');
      else if (hash.includes('segmentation')) setActiveSubView('segmentation');
      else if (hash.includes('email-mkt')) setActiveSubView('email-mkt');
      else if (hash.includes('bio-links')) setActiveSubView('bio-links');
      else if (hash.includes('leads-db') || hash.includes('marketing-leads')) setActiveSubView('leads-db');
      else if (hash.includes('automations')) setActiveSubView('automations');
      else if (hash.includes('tracking')) setActiveSubView('tracking');
      else if (hash.includes('settings')) setActiveSubView('settings');
      else if (hash.includes('mkt-fields')) setActiveSubView('mkt-fields');
      else setActiveSubView('');
    };
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, [subView]);

  try {
    // Robust sub-view matching
    const knownSubViews = ['lead-scoring', 'tracking', 'segmentation', 'automations', 'leads-db', 'bio-links', 'email-mkt', 'settings', 'mkt-fields'];
    const currentSubView = knownSubViews.includes(activeSubView) ? activeSubView : '';

    if (currentSubView === '') {
      return <MarketingDashboard />;
    }

    return (
      <div className="flex flex-col h-full bg-slate-50/50">
        <main className="flex-1 overflow-y-auto">
          {currentSubView === 'lead-scoring' && <LeadScoring />}
          {currentSubView === 'tracking' && <SiteTracking />}
          {currentSubView === 'segmentation' && <LeadSegmentation />}
          {currentSubView === 'automations' && <AutomationFlows />}
          {currentSubView === 'leads-db' && <MarketingLeads />}
          {currentSubView === 'bio-links' && <BioLinks />}
          {currentSubView === 'email-mkt' && <EmailMarketing />}
          {currentSubView === 'settings' && <MarketingSettings />}
          {currentSubView === 'mkt-fields' && <MarketingCustomFields />}
        </main>
      </div>
    );
  } catch (err: any) {
    return (
      <div className="p-10 text-center">
        <div className="bg-red-50 border border-red-200 p-8 rounded-2xl max-w-2xl mx-auto shadow-lg">
          <h2 className="text-red-700 font-black text-2xl mb-4">Erro no Módulo de Marketing</h2>
          <p className="text-slate-600 mb-4">Falha ao carregar a sub-view: <strong>{activeSubView}</strong></p>
          <pre className="bg-white p-4 rounded-lg border border-red-100 text-left text-xs text-red-500 overflow-auto max-h-48 mb-6">
            {err.stack || err.message}
          </pre>
          <button onClick={() => window.location.reload()} className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold">Recarregar Ferramenta</button>
        </div>
      </div>
    );
  }
};
