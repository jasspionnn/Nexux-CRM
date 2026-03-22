import React, { useState } from 'react';
import { Layers, SlidersHorizontal, Zap, Shield, CreditCard, Plus, ChevronRight, Trash2, GripVertical } from 'lucide-react';

export const Settings = () => {
  const [activeTab, setActiveTab] = useState('funis');
  const [activeFunnel, setActiveFunnel] = useState('1');

  const tabs = [
    { id: 'funis', label: 'Funis de Vendas', icon: Layers },
    { id: 'campos', label: 'Campos', icon: SlidersHorizontal },
    { id: 'webhooks', label: 'Webhooks', icon: Zap },
    { id: 'equipes', label: 'Equipes e Acessos', icon: Shield },
    { id: 'plano', label: 'Plano', icon: CreditCard },
  ];

  const funnels = [
    { id: '1', name: 'Funil de Vendas' },
    { id: '2', name: 'Novo dafqd' },
    { id: '3', name: 'axs' },
    { id: '4', name: '`reste' },
  ];

  const colors = [
    'bg-blue-300',
    'bg-green-300',
    'bg-yellow-300',
    'bg-red-300',
    'bg-purple-300',
    'bg-pink-300',
    'bg-indigo-300',
    'bg-slate-300',
  ];

  const stages = [
    { id: '1', name: 'Novo Lead', color: 'bg-blue-300' },
    { id: '2', name: 'Qualificação', color: 'bg-green-300' },
    { id: '3', name: 'Proposta', color: 'bg-yellow-300' },
    { id: '4', name: 'Fechamento', color: 'bg-red-300' },
    { id: '5', name: 'Vendidas', color: 'bg-purple-300' },
    { id: '6', name: 'etapa de gay', color: 'bg-pink-300' },
  ];

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Top Tabs */}
      <div className="px-6 py-4 border-b border-gray-200 shrink-0">
        <div className="flex gap-2 bg-white p-1 rounded-xl border border-gray-200 w-fit shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-gray-200 flex flex-col shrink-0">
          <div className="px-6 py-5 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase">Meus Funis</h3>
            <button className="text-blue-600 hover:text-blue-700 transition-colors">
              <Plus size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 space-y-1">
            {funnels.map((funnel) => (
              <button
                key={funnel.id}
                onClick={() => setActiveFunnel(funnel.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                  activeFunnel === funnel.id
                    ? 'bg-slate-50 text-blue-600'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {funnel.name}
                <ChevronRight size={16} className={activeFunnel === funnel.id ? 'text-blue-600' : 'text-slate-300'} />
              </button>
            ))}
          </div>
        </div>

        {/* Funnel Details */}
        <div className="flex-1 overflow-y-auto p-8 bg-white">
          <div className="max-w-4xl">
            {/* Funnel Header Card */}
            <div className="bg-slate-50 rounded-2xl p-6 mb-8 relative border border-gray-100">
              <div className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-1">Nome do Funil</div>
              <h2 className="text-2xl font-bold text-slate-900">Funil de Vendas</h2>
              <button className="absolute top-6 right-6 text-red-400 hover:text-red-500 transition-colors">
                <Trash2 size={20} />
              </button>
            </div>

            {/* Stages Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">Estágios do Funil</h3>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-bold text-sm hover:bg-blue-100 transition-colors">
                  <Plus size={16} />
                  Adicionar Estágio
                </button>
              </div>

              <div className="space-y-3">
                {stages.map((stage) => (
                  <div key={stage.id} className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
                    <button className="text-slate-300 hover:text-slate-400 cursor-grab">
                      <GripVertical size={20} />
                    </button>
                    
                    <div className="flex items-center gap-2">
                      {colors.map((color, index) => (
                        <button
                          key={index}
                          className={`w-6 h-6 rounded-full ${color} ${
                            stage.color === color ? 'ring-2 ring-offset-2 ring-slate-400' : ''
                          }`}
                        />
                      ))}
                    </div>

                    <div className="flex-1 ml-2">
                      <span className="font-bold text-slate-900">{stage.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
