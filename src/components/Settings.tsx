import React, { useState, useEffect } from 'react';
import { 
  Layers, SlidersHorizontal, Zap, Shield, CreditCard, Plus, ChevronRight, Trash2, GripVertical, 
  Check, X, Edit2, Copy, ExternalLink, Info, Hash, Type, Calendar, List, Users, User, 
  MoreVertical, ShieldCheck, Activity, ChevronDown, ChevronUp 
} from 'lucide-react';

const COLORS = [
  '#3b82f6', '#22c55e', '#eab308', '#ef4444',
  '#a855f7', '#ec4899', '#6366f1', '#64748b',
];

export const Settings = () => {
  const [activeTab, setActiveTab] = useState('funis');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedWebhooks, setExpandedWebhooks] = useState<Set<string>>(new Set());
  
  // State for Funnels
  const [funnels, setFunnels] = useState<any[]>([]);
  const [activeFunnelId, setActiveFunnelId] = useState<string>('');

  // State for Custom Fields
  const [customFields, setCustomFields] = useState<any[]>([]);

  // State for Webhooks
  const [webhooks, setWebhooks] = useState<any[]>([]);

  // State for Teams
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [funnelsRes, fieldsRes, webhooksRes, usersRes] = await Promise.all([
        fetch('/api/funnels'),
        fetch('/api/custom-fields'),
        fetch('/api/webhooks'),
        fetch('/api/users')
      ]);

      const funnelsData = await funnelsRes.json();
      setFunnels(funnelsData);
      if (funnelsData.length > 0) setActiveFunnelId(funnelsData[0].id);

      setCustomFields(await fieldsRes.json());
      setWebhooks(await webhooksRes.json());
      setTeamMembers(await usersRes.json());
    } catch (error) {
      console.error('Failed to fetch settings data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'funis', label: 'Funis de Vendas', icon: Layers },
    { id: 'campos', label: 'Campos', icon: SlidersHorizontal },
    { id: 'webhooks', label: 'Webhooks', icon: Zap },
    { id: 'equipes', label: 'Equipes e Acessos', icon: Shield },
    { id: 'plano', label: 'Plano', icon: CreditCard },
  ];

  // --- Funnel Handlers ---
  const activeFunnel = funnels.find(f => f.id === activeFunnelId);

  const handleAddFunnel = async () => {
    const res = await fetch('/api/funnels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Novo Funil' })
    });
    const newFunnel = await res.json();
    setFunnels([...funnels, newFunnel]);
    setActiveFunnelId(newFunnel.id);
  };

  const handleDeleteFunnel = async (id: string) => {
    await fetch(`/api/funnels/${id}`, { method: 'DELETE' });
    const updated = funnels.filter(f => f.id !== id);
    setFunnels(updated);
    if (activeFunnelId === id) setActiveFunnelId(updated[0]?.id || '');
  };

  const handleUpdateFunnelName = async (id: string, newName: string) => {
    setFunnels(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f));
    const funnel = funnels.find(f => f.id === id);
    try {
      await fetch(`/api/funnels/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newName,
          default_won_stage_id: funnel?.default_won_stage_id,
          default_lost_stage_id: funnel?.default_lost_stage_id
        })
      });
    } catch (error) {
      console.error('Error updating funnel name:', error);
    }
  };

  const handleUpdateFunnelAutomation = async (id: string, updates: any) => {
    setFunnels(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    const funnel = funnels.find(f => f.id === id);
    try {
      await fetch(`/api/funnels/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: funnel?.name,
          default_won_stage_id: updates.default_won_stage_id ?? funnel?.default_won_stage_id,
          default_lost_stage_id: updates.default_lost_stage_id ?? funnel?.default_lost_stage_id
        })
      });
    } catch (error) {
      console.error('Error updating funnel automation:', error);
    }
  };

  const handleAddStage = async (funnelId: string) => {
    const res = await fetch(`/api/funnels/${funnelId}/stages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Nova Etapa', color: COLORS[0], order: activeFunnel?.stages?.length || 0 })
    });
    const newStage = await res.json();
    setFunnels(funnels.map(f => {
      if (f.id === funnelId) {
        return { ...f, stages: [...(f.stages || []), newStage] };
      }
      return f;
    }));
  };

  const handleUpdateStage = async (funnelId: string, stageId: string, updates: any) => {
    setFunnels(funnels.map(f => {
      if (f.id === funnelId) {
        return {
          ...f,
          stages: f.stages.map((s: any) => s.id === stageId ? { ...s, ...updates } : s)
        };
      }
      return f;
    }));
    
    const stage = funnels.find(f => f.id === funnelId)?.stages.find((s: any) => s.id === stageId);
    await fetch(`/api/stages/${stageId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...stage, ...updates })
    });
  };

  const handleDeleteStage = async (funnelId: string, stageId: string) => {
    await fetch(`/api/stages/${stageId}`, { method: 'DELETE' });
    setFunnels(funnels.map(f => {
      if (f.id === funnelId) {
        return { ...f, stages: f.stages.filter((s: any) => s.id !== stageId) };
      }
      return f;
    }));
  };

  // --- Custom Fields Handlers ---
  const handleAddCustomField = async () => {
    try {
      const res = await fetch('/api/custom-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Novo Campo', type: 'Texto', context: 'Lead' })
      });
      if (!res.ok) {
        let errMessage = 'Failed to create custom field';
        try {
          const err = await res.json();
          errMessage = err.error || errMessage;
        } catch (e) {
          errMessage = `HTTP Error ${res.status}: ${res.statusText}`;
        }
        throw new Error(errMessage);
      }
      const newField = await res.json();
      setCustomFields(prev => [...prev, newField]);
    } catch (error: any) {
      console.error('Error adding custom field:', error);
      alert(`Erro ao adicionar campo personalizado: ${error.message}`);
    }
  };

  const handleUpdateCustomField = async (id: string, updates: any) => {
    setCustomFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    const field = customFields.find(f => f.id === id);
    try {
      await fetch(`/api/custom-fields/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...field, ...updates })
      });
    } catch (error) {
      console.error('Error updating custom field:', error);
    }
  };

  const handleDeleteCustomField = async (id: string) => {
    try {
      await fetch(`/api/custom-fields/${id}`, { method: 'DELETE' });
      setCustomFields(prev => prev.filter(f => f.id !== id));
    } catch (error) {
      console.error('Error deleting custom field:', error);
    }
  };

  // --- Webhooks Handlers ---
  const handleAddWebhook = async () => {
    const newWebhook = { name: 'Novo Webhook', active: true };
    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWebhook)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create webhook');
      }
      const data = await res.json();
      setWebhooks(prev => [...prev, data]);
      setExpandedWebhooks(prev => new Set(prev).add(data.id));
    } catch (error: any) {
      console.error('Error adding webhook:', error);
      alert(`Erro ao adicionar webhook: ${error.message}`);
    }
  };

  const handleUpdateWebhook = async (id: string, updates: any) => {
    setWebhooks(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
    const webhook = webhooks.find(w => w.id === id);
    try {
      await fetch(`/api/webhooks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...webhook, ...updates })
      });
    } catch (error) {
      console.error('Error updating webhook:', error);
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    try {
      await fetch(`/api/webhooks/${id}`, { method: 'DELETE' });
      setWebhooks(prev => prev.filter(w => w.id !== id));
    } catch (error) {
      console.error('Error deleting webhook:', error);
    }
  };

  // --- Team Handlers ---
  const handleAddTeamMember = async () => {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Novo Usuário', email: `novo_${Date.now()}@email.com`, role: 'Usuário', status: 'Pendente' })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create user');
      }
      const newUser = await res.json();
      setTeamMembers(prev => [...prev, newUser]);
    } catch (error: any) {
      console.error('Error adding team member:', error);
      alert(`Erro ao adicionar usuário: ${error.message}`);
    }
  };

  const handleUpdateTeamMember = async (id: string, updates: any) => {
    setTeamMembers(teamMembers.map(m => m.id === id ? { ...m, ...updates } : m));
    const member = teamMembers.find(m => m.id === id);
    await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...member, ...updates })
    });
  };

  const handleDeleteTeamMember = async (id: string) => {
    await fetch(`/api/users/${id}`, { method: 'DELETE' });
    setTeamMembers(teamMembers.filter(m => m.id !== id));
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
            
            {/* Automation Section */}
            <div className="bg-white border border-indigo-100 rounded-2xl p-6 mb-8 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-indigo-600">
                <SlidersHorizontal size={20} />
                <h3 className="text-lg font-bold uppercase tracking-wide">Automação de Status</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Etapa de Sucesso (Ganho)</label>
                  <select 
                    value={activeFunnel.default_won_stage_id || ''}
                    onChange={(e) => handleUpdateFunnelAutomation(activeFunnel.id, { default_won_stage_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">Selecione a etapa final de sucesso...</option>
                    {activeFunnel.stages.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Etapa de Perda (Perda)</label>
                  <select 
                    value={activeFunnel.default_lost_stage_id || ''}
                    onChange={(e) => handleUpdateFunnelAutomation(activeFunnel.id, { default_lost_stage_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">Selecione a etapa de descarte...</option>
                    {activeFunnel.stages.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
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
                {activeFunnel.stages.map((stage: any) => (
                  <div key={stage.id} className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl shadow-sm group">
                    <button className="text-slate-300 hover:text-slate-400 cursor-grab">
                      <GripVertical size={20} />
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {COLORS.map((color, index) => (
                        <button
                          key={index}
                          onClick={() => handleUpdateStage(activeFunnel.id, stage.id, { color })}
                          className={`w-6 h-6 rounded-full transition-all ${
                            stage.color === color ? 'ring-2 ring-offset-2 ring-slate-400' : 'opacity-50 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: color }}
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
    <div className="p-8 flex-1 overflow-y-auto bg-slate-50/50">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Campos Personalizados</h2>
            <p className="text-slate-500 text-sm mt-1">Crie e gerencie campos extras para leads, empresas e negociações.</p>
          </div>
          <button 
            onClick={handleAddCustomField}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus size={18} />
            Novo Campo
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identificação do Campo</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Configuração do Tipo</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contexto & Destino</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customFields.map(field => {
                const TypeIcon = field.type === 'Número' ? Hash : field.type === 'Data' ? Calendar : field.type === 'Seleção' ? List : Type;
                
                return (
                  <tr key={field.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                          <TypeIcon size={20} />
                        </div>
                        <div className="flex-1">
                          <input 
                            type="text" 
                            value={field.name}
                            onChange={(e) => handleUpdateCustomField(field.id, { name: e.target.value })}
                            className="bg-transparent border-none p-0 focus:ring-0 outline-none w-full font-bold text-slate-900 placeholder:text-slate-300"
                            placeholder="Ex: CPF do Cliente"
                          />
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">ID: {field.id.slice(0,8)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-2">
                        <select 
                          value={field.type}
                          onChange={(e) => handleUpdateCustomField(field.id, { type: e.target.value })}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none w-full"
                        >
                          <option>Texto</option>
                          <option>Número</option>
                          <option>Seleção</option>
                          <option>Data</option>
                        </select>
                        {field.type === 'Seleção' && (
                          <input 
                            type="text" 
                            value={field.options || ''}
                            placeholder="Opção A, Opção B..."
                            onChange={(e) => handleUpdateCustomField(field.id, { options: e.target.value })}
                            className="w-full bg-indigo-50/50 border border-indigo-100 rounded-lg px-3 py-1.5 text-[11px] font-medium text-indigo-700 placeholder:text-indigo-300 focus:ring-1 focus:ring-indigo-500 outline-none"
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tight ${
                          field.context === 'Lead' ? 'bg-blue-100 text-blue-700' : 
                          field.context === 'Empresa' ? 'bg-amber-100 text-amber-700' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {field.context}
                        </span>
                        <select 
                          value={field.context}
                          onChange={(e) => handleUpdateCustomField(field.id, { context: e.target.value })}
                          className="bg-transparent border-none p-0 focus:ring-0 outline-none text-slate-400 text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:text-slate-600"
                        >
                          <option>Lead</option>
                          <option>Empresa</option>
                          <option>Negociação</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                         <Layers size={12} className="text-slate-300" />
                         <select 
                          value={field.funnel_id || ''}
                          onChange={(e) => handleUpdateCustomField(field.id, { funnel_id: e.target.value })}
                          className="bg-transparent border-none p-0 focus:ring-0 outline-none text-slate-500 text-xs font-medium cursor-pointer hover:text-slate-700"
                        >
                          <option value="">Todos os Funis</option>
                          {funnels.map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={() => handleDeleteCustomField(field.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Excluir Campo"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {customFields.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-200">
                        <SlidersHorizontal size={32} />
                      </div>
                      <p className="text-slate-400 font-medium tracking-tight">Nenhum campo personalizado ainda.</p>
                      <button onClick={handleAddCustomField} className="text-indigo-600 text-sm font-bold hover:underline">Criar meu primeiro campo</button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderWebhooksTab = () => (
    <div className="p-8 flex-1 overflow-y-auto bg-slate-50/50">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Webhooks de Entrada</h2>
            <p className="text-slate-500 text-sm mt-1">Conecte ferramentas externas e capture leads automaticamente.</p>
          </div>
          <button 
            onClick={handleAddWebhook}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus size={18} />
            Novo Webhook
          </button>
        </div>

        <div className="space-y-6">
          {webhooks.map(webhook => {
            const webhookUrl = `${window.location.origin}/api/webhooks/incoming/${webhook.id}`;
            const targetFunnel = funnels.find(f => f.id === (webhook.funnel_id || (funnels.length > 0 ? funnels[0].id : '')));
            const isExpanded = expandedWebhooks.has(webhook.id);
            
            const toggleExpand = () => {
              setExpandedWebhooks(prev => {
                const next = new Set(prev);
                if (next.has(webhook.id)) {
                  next.delete(webhook.id);
                } else {
                  next.add(webhook.id);
                }
                return next;
              });
            };

            return (
              <div key={webhook.id} className={`bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/40 relative overflow-hidden group transition-all ${isExpanded ? 'p-8 border-indigo-200' : 'p-4 border-transparent hover:border-slate-300'}`}>
                {webhook.active && (
                  <div className={`absolute top-0 left-0 w-1 bg-green-500 transition-all ${isExpanded ? 'h-full' : 'h-full opacity-50'}`}></div>
                )}
                
                <div className={`flex items-center justify-between gap-6 ${isExpanded ? 'mb-8' : ''}`}>
                  <div className="flex-1 flex items-center gap-4 min-w-0">
                    <button 
                      onClick={toggleExpand}
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors shrink-0"
                    >
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                    
                    <div className={`w-3 h-3 rounded-full shrink-0 ${webhook.active ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] animate-pulse' : 'bg-slate-300'}`}></div>
                    
                    {isExpanded ? (
                      <input 
                        type="text" 
                        value={webhook.name}
                        onChange={(e) => handleUpdateWebhook(webhook.id, { name: e.target.value })}
                        className="font-black text-2xl text-slate-900 bg-transparent border-none p-0 focus:ring-0 outline-none w-full placeholder:text-slate-200 truncate"
                        placeholder="Ex: Landing Page Campanha"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <div className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer" onClick={toggleExpand}>
                        <span className="font-bold text-slate-900 truncate">{webhook.name}</span>
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest hidden sm:block">ID: {webhook.id.slice(0,8)}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    {!isExpanded && (
                       <button 
                         onClick={toggleExpand}
                         className="px-3 py-1 bg-slate-50 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-xs font-bold transition-all border border-slate-200"
                        >
                          Configurar
                       </button>
                    )}
                    <button 
                      onClick={() => handleUpdateWebhook(webhook.id, { active: !webhook.active })}
                      className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                        webhook.active ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}
                    >
                      {webhook.active ? (isExpanded ? 'Rodando Live' : 'Live') : 'Pausado'}
                    </button>
                    <button 
                      onClick={() => handleDeleteWebhook(webhook.id)}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 pb-8 border-b border-slate-100 font-sans">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <Layers size={14} />
                          Funil de Destino
                        </div>
                        <select
                          value={webhook.funnel_id || ''}
                          onChange={(e) => handleUpdateWebhook(webhook.id, { funnel_id: e.target.value, stage_id: null })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none hover:bg-white transition-all appearance-none cursor-pointer"
                        >
                          <option value="">Selecione um Funil</option>
                          {funnels.map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <Zap size={14} />
                          Etapa Inicial
                        </div>
                        <select
                          value={webhook.stage_id || ''}
                          onChange={(e) => handleUpdateWebhook(webhook.id, { stage_id: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none hover:bg-white transition-all appearance-none cursor-pointer"
                        >
                          <option value="">Selecione uma Etapa</option>
                          {targetFunnel?.stages?.map((s: any) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <ExternalLink size={14} />
                        Endpoint de Integração (POST)
                      </div>
                      <div className="bg-slate-900 rounded-2xl p-5 flex items-center justify-between gap-6 group/url shadow-inner">
                        <div className="flex-1 min-w-0">
                          <code className="text-indigo-300 text-sm font-mono block truncate selection:bg-indigo-500 selection:text-white">{webhookUrl}</code>
                        </div>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(webhookUrl);
                            alert('Endpoint copiado! Use-o para enviar dados via POST.');
                          }}
                          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-900/20 active:scale-95"
                        >
                          <Copy size={16} />
                          Copiar URL
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-8 flex items-center gap-4 text-xs font-medium text-slate-500 bg-slate-100/50 p-4 rounded-xl border border-dashed border-slate-200">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                        <Info size={16} />
                      </div>
                      <span className="flex-1 italic">Dica: Envie qualquer JSON. O sistema extrai automaticamente campos como **nome**, **email** e **telefone**.</span>
                    </div>
                  </>
                )}
              </div>
            );
          })}
          
          {webhooks.length === 0 && (
            <div className="text-center py-24 bg-white border border-dashed border-slate-200 rounded-3xl">
              <div className="flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-400">
                  <Zap size={40} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Nenhum Webhook Ativo</h3>
                <p className="text-slate-400 max-w-xs mx-auto text-sm">Integre fontes externas enviando dados via POST para o Nexus.</p>
                <button onClick={handleAddWebhook} className="mt-2 flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all">
                  <Plus size={18} />
                  Começar Agora
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderEquipesTab = () => (
    <div className="p-8 flex-1 overflow-y-auto bg-slate-50/50">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Equipe e Acessos</h2>
            <p className="text-slate-500 text-sm mt-1">Gerencie quem tem acesso à sua conta e quais as permissões.</p>
          </div>
          <button 
            onClick={handleAddTeamMember}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus size={18} />
            Convidar Membro
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identificação do Membro</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nível de Acesso</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado Atual</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teamMembers.map((member, idx) => {
                const colors = ['bg-indigo-500', 'bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];
                const color = colors[idx % colors.length];
                const initials = member.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                
                return (
                  <tr key={member.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full ${color} flex items-center justify-center text-white font-black text-sm shadow-inner`}>
                          {initials}
                        </div>
                        <div className="flex-1 space-y-0.5">
                          <input 
                            type="text" 
                            value={member.name}
                            onChange={(e) => handleUpdateTeamMember(member.id, { name: e.target.value })}
                            className="bg-transparent border-none p-0 focus:ring-0 outline-none w-full font-bold text-slate-900"
                            placeholder="Nome Completo"
                          />
                          <input 
                            type="text" 
                            value={member.email}
                            onChange={(e) => handleUpdateTeamMember(member.id, { email: e.target.value })}
                            className="bg-transparent border-none p-0 focus:ring-0 outline-none w-full text-xs font-medium text-slate-400 hover:text-indigo-600 transition-colors"
                            placeholder="email@empresa.com"
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <Shield size={12} className={
                            member.role === 'Admin' ? 'text-indigo-600' : 
                            member.role === 'Gerente' ? 'text-blue-600' : 'text-slate-400'
                          } />
                          <span className={`text-[10px] font-black tracking-widest uppercase ${
                            member.role === 'Admin' ? 'text-indigo-600' : 
                            member.role === 'Gerente' ? 'text-blue-600' : 'text-slate-400'
                          }`}>
                            {member.role}
                          </span>
                        </div>
                        <select 
                          value={member.role}
                          onChange={(e) => handleUpdateTeamMember(member.id, { role: e.target.value })}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                        >
                          <option>Admin</option>
                          <option>Gerente</option>
                          <option>Usuário</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${member.status === 'Ativo' ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                          <span className={`text-[10px] font-black tracking-widest uppercase ${member.status === 'Ativo' ? 'text-green-600' : 'text-amber-600'}`}>
                            {member.status}
                          </span>
                        </div>
                        <select 
                          value={member.status}
                          onChange={(e) => handleUpdateTeamMember(member.id, { status: e.target.value })}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                        >
                          <option>Ativo</option>
                          <option>Pendente</option>
                          <option>Inativo</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={() => handleDeleteTeamMember(member.id)}
                        className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="Remover Acesso"
                      >
                        <Trash2 size={20} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {teamMembers.length === 0 && (
            <div className="p-16 text-center text-slate-400 font-medium">
              Não há outros membros na equipe.
            </div>
          )}
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

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-slate-500 flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Carregando configurações...</span>
        </div>
      </div>
    );
  }

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
