import React from 'react';
import { Eye, Link, Users, Mail, Filter, Bot, TrendingUp, MousePointer, FormInput, BarChart3 } from 'lucide-react';

const STAT_CARDS = [
  { label: 'Pageviews', value: '12.4K', change: '+12%', icon: Eye, color: 'bg-blue-500', bg: 'bg-blue-50' },
  { label: 'Leads Capturados', value: '847', change: '+8%', icon: FormInput, color: 'bg-green-500', bg: 'bg-green-50' },
  { label: 'Taxa de Conversão', value: '6.8%', change: '+2.1%', icon: TrendingUp, color: 'bg-amber-500', bg: 'bg-amber-50' },
  { label: 'Cliques em Links', value: '3.2K', change: '+15%', icon: MousePointer, color: 'bg-purple-500', bg: 'bg-purple-50' },
];

const QUICK_ACTIONS = [
  { label: 'Tracking', sub: 'tracking', icon: Eye, color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
  { label: 'Link na Bio', sub: 'bio-links', icon: Link, color: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200' },
  { label: 'Base de Leads', sub: 'leads-db', icon: Users, color: 'bg-green-100 text-green-700 hover:bg-green-200' },
  { label: 'Email Mkt', sub: 'email-mkt', icon: Mail, color: 'bg-red-100 text-red-700 hover:bg-red-200' },
  { label: 'Segmentação', sub: 'segmentation', icon: Filter, color: 'bg-purple-100 text-purple-700 hover:bg-purple-200' },
  { label: 'Automações', sub: 'automations', icon: Bot, color: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' },
];

export const MarketingDashboard = () => {
  const handleNavigate = (sub: string) => {
    window.location.hash = '#/marketing/' + sub;
  };

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

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {STAT_CARDS.map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                    <Icon size={20} className={card.color.replace('bg-', 'text-').split(' ')[0]} />
                  </div>
                  <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{card.change}</span>
                </div>
                <p className="text-2xl font-black text-slate-900">{card.value}</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">{card.label}</p>
              </div>
            );
          })}
        </div>

        {/* Quick Access */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-black text-slate-900 mb-4">Acesso Rápido</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {QUICK_ACTIONS.map(action => {
              const Icon = action.icon;
              return (
                <button
                  key={action.sub}
                  onClick={() => handleNavigate(action.sub)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl ${action.color} transition-colors font-bold text-sm`}
                >
                  <Icon size={24} />
                  {action.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
