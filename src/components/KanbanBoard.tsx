import React from 'react';
import { Plus, MoreHorizontal } from 'lucide-react';

export const KanbanBoard = ({ onNavigate }: any) => {
  const stages = [
    { id: '1', name: 'Lead Entrante', color: 'bg-blue-500', count: 3, value: 'R$ 15.000' },
    { id: '2', name: 'Contato Feito', color: 'bg-yellow-500', count: 2, value: 'R$ 8.500' },
    { id: '3', name: 'Reunião Agendada', color: 'bg-purple-500', count: 1, value: 'R$ 5.000' },
    { id: '4', name: 'Proposta Enviada', color: 'bg-orange-500', count: 4, value: 'R$ 42.000' },
    { id: '5', name: 'Negociação', color: 'bg-pink-500', count: 2, value: 'R$ 18.000' },
  ];

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="px-6 py-4 border-b border-gray-200 bg-white flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pipeline de Vendas</h1>
          <p className="text-sm text-slate-500">Gerencie suas negociações e acompanhe o funil</p>
        </div>
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors">
          <Plus size={18} />
          Nova Negociação
        </button>
      </div>

      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-6 h-full items-start">
          {stages.map(stage => (
            <div key={stage.id} className="w-80 shrink-0 flex flex-col max-h-full">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${stage.color}`}></div>
                  <h3 className="font-bold text-slate-700">{stage.name}</h3>
                  <span className="text-xs font-semibold text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full">{stage.count}</span>
                </div>
                <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal size={16} /></button>
              </div>
              <div className="text-sm font-medium text-slate-500 mb-3">{stage.value}</div>
              
              <div className="flex-1 overflow-y-auto space-y-3 pb-2">
                {/* Placeholder Cards */}
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate('lead-detail', '123')}>
                  <div className="text-xs font-bold text-indigo-600 mb-1">Empresa Exemplo LTDA</div>
                  <h4 className="font-bold text-slate-900 mb-2">Implementação de CRM</h4>
                  <div className="text-sm font-semibold text-slate-700 mb-3">R$ 5.000,00</div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-500">Hoje</div>
                    <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white text-[10px] font-bold">CA</div>
                  </div>
                </div>
              </div>
              
              <button className="mt-3 flex items-center justify-center gap-2 w-full py-2 border-2 border-dashed border-gray-300 rounded-xl text-slate-500 hover:text-slate-700 hover:border-gray-400 hover:bg-gray-50 transition-all font-medium text-sm">
                <Plus size={16} />
                Adicionar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
