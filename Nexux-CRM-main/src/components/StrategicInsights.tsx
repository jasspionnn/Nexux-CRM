
import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import { analyzePipelineStrategy } from '../services/geminiService';
import { Sparkles, TrendingUp, AlertCircle, Loader2, X, ChevronRight } from 'lucide-react';

export const StrategicInsights = () => {
  const { leads, funnels } = useCRM();
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    setIsOpen(true);
    const result = await analyzePipelineStrategy(leads, funnels);
    setInsight(result);
    setLoading(false);
  };

  return (
    <>
      <button 
        onClick={handleAnalyze}
        className="fixed bottom-8 right-8 bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-indigo-200 flex items-center gap-3 hover:bg-indigo-700 hover:scale-105 transition-all z-40 group"
      >
        <Sparkles size={20} className="group-hover:rotate-12 transition-transform" />
        Análise Estratégica IA
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[85vh] animate-scale-in">
            <header className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-50/50 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 rounded-xl text-white">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 text-lg">Nexus AI Strategy</h3>
                  <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Inteligência de Vendas Gemini 3 Pro</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 transition-all">
                <X size={24} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {loading ? (
                <div className="h-64 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="animate-spin text-indigo-600" size={48} />
                  <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Processando métricas globais...</p>
                </div>
              ) : (
                <div className="prose prose-indigo max-w-none text-gray-700 font-medium whitespace-pre-wrap">
                  {insight}
                </div>
              )}
            </div>

            <footer className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-3xl">
              <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold">
                <AlertCircle size={14} />
                <span>Esta análise é baseada no volume atual de leads e sua distribuição.</span>
              </div>
            </footer>
          </div>
        </div>
      )}
    </>
  );
};
