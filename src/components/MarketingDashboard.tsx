import React, { useState, useEffect } from 'react';
import { Eye, FileText, Target, DollarSign, TrendingUp, MousePointer, BarChart3, ArrowRight } from 'lucide-react';

export const MarketingDashboard = () => {
  const [stats, setStats] = useState({
    visits: 0,
    forms: 0,
    opportunities: 0,
    sales: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [visitsRes, formsRes] = await Promise.all([
          fetch('/api/tracking/stats'),
          fetch('/api/tracking/events?type=form&limit=1000'),
        ]);

        const visitsData = visitsRes.ok ? await visitsRes.json() : {};
        const formsData = formsRes.ok ? await formsRes.json() : { results: [] };

        setStats({
          visits: visitsData.pageviews || 0,
          forms: formsData.results?.length || 0,
          opportunities: 0,
          sales: 0,
        });
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchStats();
  }, []);

  const handleNavigate = (sub: string) => {
    window.location.hash = '#/marketing/' + sub;
  };

  const funnelSteps = [
    { label: 'Visitas', value: stats.visits, icon: Eye, color: 'bg-blue-500', bg: 'bg-blue-50', textColor: 'text-blue-600' },
    { label: 'Formulários', value: stats.forms, icon: FileText, color: 'bg-purple-500', bg: 'bg-purple-50', textColor: 'text-purple-600' },
    { label: 'Oportunidades', value: stats.opportunities, icon: Target, color: 'bg-amber-500', bg: 'bg-amber-50', textColor: 'text-amber-600' },
    { label: 'Vendas', value: stats.sales, icon: DollarSign, color: 'bg-green-500', bg: 'bg-green-50', textColor: 'text-green-600' },
  ];

  const calcRate = (current: number, total: number) => {
    if (!total) return '0%';
    return Math.round((current / total) * 100) + '%';
  };

  const QUICK_ACTIONS = [
    { label: 'Tracking', sub: 'tracking', icon: Eye, color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
    { label: 'Link na Bio', sub: 'bio-links', icon: MousePointer, color: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200' },
    { label: 'Base de Leads', sub: 'leads-db', icon: Target, color: 'bg-green-100 text-green-700 hover:bg-green-200' },
    { label: 'Email Mkt', sub: 'email-mkt', icon: FileText, color: 'bg-red-100 text-red-700 hover:bg-red-200' },
    { label: 'Segmentação', sub: 'segmentation', icon: BarChart3, color: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' },
    { label: 'Lead Scoring', sub: 'lead-scoring', icon: Target, color: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
    { label: 'Automações', sub: 'automations', icon: TrendingUp, color: 'bg-purple-100 text-purple-700 hover:bg-purple-200' },
  ];

  try {
    if (loading) {
      return <div className="flex items-center justify-center h-full"><div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" /></div>;
    }

    return (
      <div className="h-full bg-slate-50/50 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 lg:p-10">
          <div className="mb-8">
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
              <BarChart3 className="text-purple-600" size={32} />
              Marketing - Visão Geral
            </h1>
            <p className="text-slate-500 font-medium mt-1">Acompanhe métricas e acesse ferramentas de marketing.</p>
          </div>

          {/* Funnel */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 mb-8">
            <h3 className="text-lg font-black text-slate-900 mb-6">Funil de Conversão</h3>
            <div className="flex items-end justify-between gap-2">
              {funnelSteps.map((step, i) => {
                const Icon = step.icon;
                const widthPct = 100 - (i * 20);
                const convRate = i === 0 ? '100%' : calcRate(step.value, (funnelSteps[0]?.value || 1));
                return (
                  <React.Fragment key={step.label}>
                    <div className="flex-1 flex flex-col items-center">
                      <div
                        className={`${step.bg} rounded-xl p-6 w-full flex flex-col items-center gap-3 transition-all hover:shadow-md`}
                        style={{ maxWidth: widthPct + '%' }}
                      >
                        <div className={`w-12 h-12 rounded-xl ${step.color} flex items-center justify-center text-white shadow-sm`}>
                          <Icon size={22} />
                        </div>
                        <p className="text-3xl font-black text-slate-900">{(step.value || 0).toLocaleString('pt-BR')}</p>
                        <p className={`text-xs font-bold uppercase tracking-wider ${step.textColor}`}>{step.label}</p>
                        {i > 0 && (
                          <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-100">
                            Taxa: {convRate}
                          </span>
                        )}
                      </div>
                    </div>
                    {i < funnelSteps.length - 1 && (
                      <div className="flex items-center pb-8">
                        <ArrowRight size={20} className="text-slate-300" />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Quick Access */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <h3 className="text-lg font-black text-slate-900 mb-4">Acesso Rápido</h3>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {QUICK_ACTIONS.map(action => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.sub}
                    onClick={() => handleNavigate(action.sub)}
                    className={'flex flex-col items-center gap-2 p-4 rounded-xl ' + (action.color || '') + ' transition-colors font-bold text-sm'}
                  >
                    {Icon && <Icon size={24} />}
                    {action.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  } catch (err: any) {
    return (
      <div className="p-20 text-center">
        <div className="bg-red-50 border border-red-100 p-8 rounded-2xl max-w-xl mx-auto">
          <h2 className="text-red-600 font-black text-2xl mb-4">Erro no Dashboard de Marketing</h2>
          <div className="bg-white p-4 rounded-lg border border-red-100 text-left overflow-auto max-h-40 mb-6">
            <code className="text-xs text-red-500">{err.stack || err.message}</code>
          </div>
          <button onClick={() => window.location.reload()} className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold">Tentar Novamente</button>
        </div>
      </div>
    );
  }
};
