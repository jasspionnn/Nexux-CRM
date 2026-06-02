import React, { useState, useEffect } from 'react';
import { BookOpen, Flame, Network, ExternalLink, ArrowRight } from 'lucide-react';

interface PerformanceItem {
  id: string;
  type: string;
  name: string;
  description: string;
  thumb_url: string;
  cta_url: string;
  status: string;
  created_at: string;
}

const SECTION_CONFIG = {
  mentorias:  { type: 'mentoria',   label: 'Mentorias',  subtitle: 'Programas de mentoria exclusivos', icon: BookOpen, gradient: 'from-blue-600 to-indigo-700',  light: 'bg-blue-50',    text: 'text-blue-700'   },
  imersoes:   { type: 'imersao',    label: 'Imersões',   subtitle: 'Eventos intensivos e programas',   icon: Flame,    gradient: 'from-orange-500 to-red-600',   light: 'bg-orange-50',  text: 'text-orange-700' },
  networking: { type: 'networking', label: 'Networking', subtitle: 'Conexões e relacionamentos',       icon: Network,  gradient: 'from-emerald-600 to-teal-700', light: 'bg-emerald-50', text: 'text-emerald-700' },
};

const ItemCard: React.FC<{ item: PerformanceItem; cfg: typeof SECTION_CONFIG['mentorias'] }> = ({ item, cfg }) => {
  const Icon = cfg.icon;

  const handleCTA = () => {
    if (item.cta_url) {
      window.open(item.cta_url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col">
      {/* Thumb */}
      <div className="relative h-48 bg-slate-100 overflow-hidden shrink-0">
        {item.thumb_url ? (
          <img
            src={item.thumb_url}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${cfg.gradient} flex items-center justify-center`}>
            <Icon size={44} className="text-white/40" />
          </div>
        )}
        {/* Type badge */}
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold text-white bg-black/35 backdrop-blur-sm">
            <Icon size={11} />{cfg.label.replace(/s$/, '')}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-base font-bold text-slate-900 mb-2 line-clamp-2 leading-snug">{item.name}</h3>
        {item.description && (
          <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed flex-1">{item.description}</p>
        )}

        {/* CTA */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          {item.cta_url ? (
            <button
              onClick={handleCTA}
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-sm transition-all bg-gradient-to-r ${cfg.gradient} text-white hover:opacity-90 hover:shadow-md active:scale-95`}
            >
              Saiba mais <ExternalLink size={14} />
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-300">
              <ArrowRight size={14} />Em breve
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const EmptyState: React.FC<{ cfg: typeof SECTION_CONFIG['mentorias'] }> = ({ cfg }) => {
  const Icon = cfg.icon;
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className={`w-16 h-16 rounded-2xl ${cfg.light} flex items-center justify-center mb-4`}>
        <Icon size={28} className={cfg.text} />
      </div>
      <h3 className="text-lg font-bold text-slate-700 mb-2">Nenhum item disponível</h3>
      <p className="text-slate-400 text-sm max-w-xs">
        Em breve novos conteúdos de {cfg.label.toLowerCase()} estarão disponíveis aqui.
      </p>
    </div>
  );
};

const PerformanceSection: React.FC<{ subView: string }> = ({ subView }) => {
  const [items, setItems] = useState<PerformanceItem[]>([]);
  const [loading, setLoading] = useState(true);

  const cfg = SECTION_CONFIG[subView as keyof typeof SECTION_CONFIG] || SECTION_CONFIG.mentorias;
  const Icon = cfg.icon;

  useEffect(() => {
    setLoading(true);
    fetch(`/api/performance-items?type=${cfg.type}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setItems(data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [subView]);

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center shadow-md`}>
          <Icon size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900">{cfg.label}</h1>
          <p className="text-slate-500 text-sm">{cfg.subtitle}</p>
        </div>
        {!loading && items.length > 0 && (
          <span className={`ml-auto px-3 py-1 rounded-full text-xs font-bold ${cfg.light} ${cfg.text}`}>
            {items.length} disponíve{items.length === 1 ? 'l' : 'is'}
          </span>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(n => (
            <div key={n} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-pulse">
              <div className="h-48 bg-slate-100" />
              <div className="p-5 space-y-3">
                <div className="h-4 bg-slate-100 rounded w-3/4" />
                <div className="h-3 bg-slate-50 rounded w-full" />
                <div className="h-3 bg-slate-50 rounded w-5/6" />
                <div className="h-9 bg-slate-100 rounded-xl mt-4" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState cfg={cfg} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(item => (
            <ItemCard key={item.id} item={item} cfg={cfg} />
          ))}
        </div>
      )}
    </div>
  );
};

export const Performance = ({ subView }: { subView?: string }) => (
  <PerformanceSection subView={subView || 'mentorias'} />
);
