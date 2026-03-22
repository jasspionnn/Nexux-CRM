import React, { useState } from 'react';
import { Layers, SlidersHorizontal, Zap, Shield, CreditCard, Plus, ChevronRight, Trash2, GripVertical, Check, X, Edit2 } from 'lucide-react';

const COLORS = [
  'bg-blue-300', 'bg-green-300', 'bg-yellow-300', 'bg-red-300',
  'bg-purple-300', 'bg-pink-300', 'bg-indigo-300', 'bg-slate-300',
];

export const Settings = () => {
  const [activeTab, setActiveTab] = useState('funis');
  
  // State for Funnels
  const [funnels, setFunnels] = useState([
    { 
      id: '1', 
      name: 'Funil de Vendas', 
      stages: [
        { id: '1', name: 'Novo Lead', color: 'bg-blue-300' },
        { id: '2', name: 'Qualificação', color: 'bg-green-300' },
        { id: '3', name: 'Proposta', color: 'bg-yellow-300' },
        { id: '4', name: 'Fechamento', color: 'bg-red-300' },
      ]
    },
    { id: '2', name: 'Funil de Marketing', stages: [] },
  ]);
  const [activeFunnelId, setActiveFunnelId] = useState(funnels[0]?.id);

  // State for Custom Fields
  const [customFields, setCustomFields] = useState([
    { id: '1', name: 'Origem do Lead', type: 'Texto', context: 'Lead' },
    { id: '2', name: 'Tamanho da Empresa', type: 'Seleção', context: 'Empresa' },
  ]);

  // State for Webhooks
  const [webhooks, setWebhooks] = useState([
    { id: '1', name: 'Integração RD Station', url: 'https://api.rd.services/webhook', active: true },
  ]);

  // State for Teams
  const [teamMembers, setTeamMembers] = useState([
    { id: '1', name: 'Caue', email: 'caue@example.com', role: 'Admin', status: 'Ativo' },
    { id: '2', name: 'João Vendedor', email: 'joao@example.com', role: 'Usuário', status: 'Ativo' },
  ]);

  const tabs = [
    { id: 'funis', label: 'Funis de Vendas', icon: Layers },
    { id: 'campos', label: 'Campos', icon: SlidersHorizontal },
    { id: 'webhooks', label: 'Webhooks', icon: Zap },
    { id: 'equipes', label: 'Equipes e Acessos', icon: Shield },
    { id: 'plano', label: 'Plano', icon: CreditCard },
  ];

  // --- Funnel Handlers ---
  const activeFunnel = funnels.find(f => f.id === activeFunnelId);

  const handleAddFunnel = () => {
    const newFunnel = { id: Date.now().toString(), name: 'Novo Funil', stages: [] };
    setFunnels([...funnels, newFunnel]);
    setActiveFunnelId(newFunnel.id);
  };

  const handleDeleteFunnel = (id: string) => {
    const updated = funnels.filter(f => f.id !== id);
    setFunnels(updated);
    if (activeFunnelId === id) setActiveFunnelId(updated[0]?.id || '');
  };

  const handleUpdateFunnelName = (id: string, newName: string) => {
    setFunnels(funnels.map(f => f.id === id ? { ...f, name: newName } : f));
  };

  const handleAddStage = (funnelId: string) => {
    setFunnels(funnels.map(f => {
      if (f.id === funnelId) {
        return {
          ...f,
          stages: [...f.stages, { id: Date.now().toString(), name: 'Nova Etapa', color: COLORS[0] }]
        };
      }
      return f;
    }));
  };

  const handleUpdateStage = (funnelId: string, stageId: string, updates: any) => {
    setFunnels(funnels.map(f => {
      if (f.id === funnelId) {
        return {
          ...f,
          stages: f.stages.map(s => s.id === stageId ? { ...s, ...updates } : s)
        };
      }
      return f;
    }));
  };

  const handleDeleteStage = (funnelId: string, stageId: string) => {
    setFunnels(funnels.map(f => {
      if (f.id === funnelId) {
        return { ...f, stages: f.stages.filter(s => s.id !== stageId) };
      }
      return f;
    }));
  };

  // --- Renderers ---
  const renderFunnelsTab = () => (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-200 flex flex-col shrink-0">
        <div className="px-6 py-5 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase">Meus Funis</h3>
          <button onClick={handleAddFunnel} className="text-blue-600 hover:text-blue-700 transition-colors">
            <Plus size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 space-y-1">
          {funnels.map((funnel) => (
            <button
              key={funnel.id}
              onClick={() => setActiveFunnelId(funnel.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                activeFunnelId === funnel.id
                  ? 'bg-slate-50 text-blue-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="truncate">{funnel.name}</span>
              <ChevronRight size={16} className={activeFunnelId === funnel.id ? 'text-blue-600 shrink-0' : 'text-slate-300 shrink-0'} />
            </button>
          ))}
        </div>
      </div>

      {/* Funnel Details */}
      <div className="flex-1 overflow-y-auto p-8 bg-white">
        {activeFunnel ? (
          <div className="max-w-4xl">
            {/* Funnel Header Card */}
            <div className="bg-slate-50 rounded-2xl p-6 mb-8 relative border border-gray-100 group">
              <div className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-1">Nome do Funil</div>
              <input 
                type="text" 
                value={activeFunnel.name}
                onChange={(e) => handleUpdateFunnelName(activeFunnel.id, e.target.value)}
                className="text-2xl font-bold text-slate-900 bg-transparent border-none p-0 focus:ring-0 w-full outline-none"
              />
              <button 
                onClick={() => handleDeleteFunnel(activeFunnel.id)}
                className="absolute top-6 right-6 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                title="Excluir Funil"
              >
                <Trash2 size={20} />
              </button>
            </div>

            {/* Stages Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">Estágios do Funil</h3>
                <button 
                  onClick={() => handleAddStage(activeFunnel.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-bold text-sm hover:bg-blue-100 transition-colors"
                >
                  <Plus size={16} />
                  Adicionar Estágio
                </button>
              </div>

              <div className="space-y-3">
                {activeFunnel.stages.map((stage) => (
                  <div key={stage.id} className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl shadow-sm group">
                    <button className="text-slate-300 hover:text-slate-400 cursor-grab">
                      <GripVertical size={20} />
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {COLORS.map((color, index) => (
                        <button
                          key={index}
                          onClick={() => handleUpdateStage(activeFunnel.id, stage.id, { color })}
                          className={`w-6 h-6 rounded-full ${color} ${
                            stage.color === color ? 'ring-2 ring-offset-2 ring-slate-400' : 'opacity-50 hover:opacity-100'
                          } transition-all`}
                        />
                      ))}
                    </div>

                    <div className="flex-1 ml-4">
                      <input 
                        type="text"
                        value={stage.name}
                        onChange={(e) => handleUpdateStage(activeFunnel.id, stage.id, { name: e.target.value })}
                        className="font-bold text-slate-900 bg-transparent border-none p-0 focus:ring-0 w-full outline-none"
                      />
                    </div>

                    <button 
                      onClick={() => handleDeleteStage(activeFunnel.id, stage.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
                {activeFunnel.stages.length === 0 && (
                  <div className="text-center py-8 text-slate-500 border-2 border-dashed border-gray-200 rounded-xl">
                    Nenhum estágio configurado neste funil.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500">
            Selecione ou crie um funil para editar.
          </div>
        )}
      </div>
    </div>
  );

  const renderCamposTab = () => (
    <div className="p-8 flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Campos Personalizados</h2>
            <p className="text-slate-500 text-sm mt-1">Gerencie os campos adicionais para leads e empresas.</p>
          </div>
          <button 
            onClick={() => setCustomFields([...customFields, { id: Date.now().toString(), name: 'Novo Campo', type: 'Texto', context: 'Lead' }])}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Novo Campo
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nome do Campo</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contexto</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {customFields.map(field => (
                <tr key={field.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">
                    <input 
                      type="text" 
                      value={field.name}
                      onChange={(e) => setCustomFields(customFields.map(f => f.id === field.id ? { ...f, name: e.target.value } : f))}
                      className="bg-transparent border-none p-0 focus:ring-0 outline-none w-full"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                    <select 
                      value={field.type}
                      onChange={(e) => setCustomFields(customFields.map(f => f.id === field.id ? { ...f, type: e.target.value } : f))}
                      className="bg-transparent border-none p-0 focus:ring-0 outline-none text-slate-600"
                    >
                      <option>Texto</option>
                      <option>Número</option>
                      <option>Seleção</option>
                      <option>Data</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                    <select 
                      value={field.context}
                      onChange={(e) => setCustomFields(customFields.map(f => f.id === field.id ? { ...f, context: e.target.value } : f))}
                      className="bg-transparent border-none p-0 focus:ring-0 outline-none text-slate-600"
                    >
                      <option>Lead</option>
                      <option>Empresa</option>
                      <option>Negociação</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button 
                      onClick={() => setCustomFields(customFields.filter(f => f.id !== field.id))}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {customFields.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">Nenhum campo personalizado configurado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderWebhooksTab = () => (
    <div className="p-8 flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Webhooks</h2>
            <p className="text-slate-500 text-sm mt-1">Integre o CRM com outras ferramentas via webhooks.</p>
          </div>
          <button 
            onClick={() => setWebhooks([...webhooks, { id: Date.now().toString(), name: 'Novo Webhook', url: 'https://...', active: true }])}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Novo Webhook
          </button>
        </div>

        <div className="space-y-4">
          {webhooks.map(webhook => (
            <div key={webhook.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex items-start justify-between gap-4">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <input 
                    type="text" 
                    value={webhook.name}
                    onChange={(e) => setWebhooks(webhooks.map(w => w.id === webhook.id ? { ...w, name: e.target.value } : w))}
                    className="font-bold text-lg text-slate-900 bg-transparent border-none p-0 focus:ring-0 outline-none w-1/2"
                    placeholder="Nome do Webhook"
                  />
                  <button 
                    onClick={() => setWebhooks(webhooks.map(w => w.id === webhook.id ? { ...w, active: !w.active } : w))}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${webhook.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}
                  >
                    {webhook.active ? 'Ativo' : 'Inativo'}
                  </button>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-gray-200">
                  <span className="text-slate-400 text-sm font-mono">POST</span>
                  <input 
                    type="text" 
                    value={webhook.url}
                    onChange={(e) => setWebhooks(webhooks.map(w => w.id === webhook.id ? { ...w, url: e.target.value } : w))}
                    className="flex-1 bg-transparent border-none p-0 focus:ring-0 outline-none text-sm font-mono text-slate-700"
                    placeholder="https://sua-api.com/webhook"
                  />
                </div>
              </div>
              <button 
                onClick={() => setWebhooks(webhooks.filter(w => w.id !== webhook.id))}
                className="text-slate-400 hover:text-red-500 transition-colors mt-1"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))}
          {webhooks.length === 0 && (
            <div className="text-center py-12 bg-white border border-gray-200 rounded-xl text-slate-500">
              Nenhum webhook configurado.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderEquipesTab = () => (
    <div className="p-8 flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Equipes e Acessos</h2>
            <p className="text-slate-500 text-sm mt-1">Gerencie os usuários e permissões da sua conta.</p>
          </div>
          <button 
            onClick={() => setTeamMembers([...teamMembers, { id: Date.now().toString(), name: 'Novo Usuário', email: 'novo@email.com', role: 'Usuário', status: 'Pendente' }])}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Convidar Usuário
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Usuário</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Permissão</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {teamMembers.map(member => (
                <tr key={member.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-bold text-slate-900">
                      <input 
                        type="text" 
                        value={member.name}
                        onChange={(e) => setTeamMembers(teamMembers.map(m => m.id === member.id ? { ...m, name: e.target.value } : m))}
                        className="bg-transparent border-none p-0 focus:ring-0 outline-none w-full"
                      />
                    </div>
                    <div className="text-sm text-slate-500">
                      <input 
                        type="text" 
                        value={member.email}
                        onChange={(e) => setTeamMembers(teamMembers.map(m => m.id === member.id ? { ...m, email: e.target.value } : m))}
                        className="bg-transparent border-none p-0 focus:ring-0 outline-none w-full text-sm"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                    <select 
                      value={member.role}
                      onChange={(e) => setTeamMembers(teamMembers.map(m => m.id === member.id ? { ...m, role: e.target.value } : m))}
                      className="bg-transparent border-none p-0 focus:ring-0 outline-none text-slate-600 font-medium"
                    >
                      <option>Admin</option>
                      <option>Gerente</option>
                      <option>Usuário</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${member.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {member.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button 
                      onClick={() => setTeamMembers(teamMembers.filter(m => m.id !== member.id))}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderPlanoTab = () => (
    <div className="p-8 flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Seu Plano</h2>
        
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Hexagon size={120} />
          </div>
          <div className="relative z-10">
            <div className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-bold tracking-wider uppercase mb-4">
              Plano Pro
            </div>
            <h3 className="text-4xl font-bold mb-2">R$ 199<span className="text-lg font-normal text-slate-300">/mês</span></h3>
            <p className="text-slate-300 mb-8 max-w-md">Você tem acesso a todos os recursos avançados, incluindo automações de IA e webhooks ilimitados.</p>
            
            <div className="space-y-3 mb-8">
              {['Usuários Ilimitados', 'Funis Ilimitados', 'AIFlux Avançado', 'Suporte Prioritário'].map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-400/20 flex items-center justify-center text-green-400">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <span className="font-medium">{feature}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              <button className="bg-white text-slate-900 px-6 py-3 rounded-xl font-bold hover:bg-slate-50 transition-colors">
                Gerenciar Assinatura
              </button>
              <button className="bg-white/10 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/20 transition-colors">
                Ver Faturas
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Top Tabs */}
      <div className="px-6 py-4 border-b border-gray-200 shrink-0">
        <div className="flex gap-2 bg-white p-1 rounded-xl border border-gray-200 w-fit shadow-sm overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
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
      {activeTab === 'funis' && renderFunnelsTab()}
      {activeTab === 'campos' && renderCamposTab()}
      {activeTab === 'webhooks' && renderWebhooksTab()}
      {activeTab === 'equipes' && renderEquipesTab()}
      {activeTab === 'plano' && renderPlanoTab()}
    </div>
  );
};

// Helper icon for Plano tab
const Hexagon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
  </svg>
);
