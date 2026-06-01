import React from 'react';
import { BookOpen, Flame, Network, Users, Calendar, Star, ArrowRight } from 'lucide-react';

const placeholderCards = (title: string, color: string) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
    {[1, 2, 3].map(n => (
      <div key={n} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Star size={20} className="text-white" />
        </div>
        <div className="h-4 bg-slate-100 rounded w-3/4" />
        <div className="h-3 bg-slate-50 rounded w-full" />
        <div className="h-3 bg-slate-50 rounded w-5/6" />
        <button className="mt-2 flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-800 transition-colors">
          Ver detalhes <ArrowRight size={14} />
        </button>
      </div>
    ))}
  </div>
);

const Mentorias = () => (
  <div className="p-8">
    <div className="flex items-center gap-3 mb-2">
      <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
        <BookOpen size={20} className="text-white" />
      </div>
      <div>
        <h1 className="text-2xl font-black text-slate-900">Mentorias</h1>
        <p className="text-slate-500 text-sm">Gerencie sessões e programas de mentoria</p>
      </div>
    </div>
    <div className="mt-8 bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
      <BookOpen size={48} className="text-emerald-300 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-slate-700 mb-2">Módulo em construção</h2>
      <p className="text-slate-400 text-sm max-w-md mx-auto">
        Em breve você poderá gerenciar sessões de mentoria, acompanhar progresso dos mentorados e agendar encontros direto aqui.
      </p>
    </div>
  </div>
);

const Imersoes = () => (
  <div className="p-8">
    <div className="flex items-center gap-3 mb-2">
      <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
        <Flame size={20} className="text-white" />
      </div>
      <div>
        <h1 className="text-2xl font-black text-slate-900">Imersões</h1>
        <p className="text-slate-500 text-sm">Eventos intensivos e programas de imersão</p>
      </div>
    </div>
    <div className="mt-8 bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
      <Flame size={48} className="text-emerald-300 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-slate-700 mb-2">Módulo em construção</h2>
      <p className="text-slate-400 text-sm max-w-md mx-auto">
        Em breve você poderá criar e gerenciar imersões, controlar inscrições e acompanhar resultados dos participantes.
      </p>
    </div>
  </div>
);

const Networking = () => (
  <div className="p-8">
    <div className="flex items-center gap-3 mb-2">
      <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
        <Network size={20} className="text-white" />
      </div>
      <div>
        <h1 className="text-2xl font-black text-slate-900">Networking</h1>
        <p className="text-slate-500 text-sm">Conexões e relacionamentos estratégicos</p>
      </div>
    </div>
    <div className="mt-8 bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
      <Network size={48} className="text-emerald-300 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-slate-700 mb-2">Módulo em construção</h2>
      <p className="text-slate-400 text-sm max-w-md mx-auto">
        Em breve você poderá mapear sua rede de contatos estratégicos, registrar interações e fortalecer relacionamentos-chave.
      </p>
    </div>
  </div>
);

export const Performance = ({ subView }: { subView?: string }) => {
  switch (subView) {
    case 'imersoes': return <Imersoes />;
    case 'networking': return <Networking />;
    default: return <Mentorias />;
  }
};
