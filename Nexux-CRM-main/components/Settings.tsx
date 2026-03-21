
import React, { useState, useMemo, useEffect } from 'react';
import { useCRM } from '../context/CRMContext';
import { 
  Plus, Layers, SlidersHorizontal, Trash2, 
  ShieldCheck, CreditCard, ChevronRight, GripVertical, X, Zap, Copy, Check, ExternalLink,
  ChevronDown, Edit2, Save
} from 'lucide-react';
import { UserRole, CustomFieldDefinition, CustomFieldType, CustomFieldContext, Webhook, Stage } from '../types';

type SettingsTab = 'pipeline' | 'fields' | 'access' | 'billing' | 'webhooks';

export const Settings = () => {
  const { 
    funnels, users, currentUser, currentAccount, 
    updateUser, teams, 
    addFunnel, updateFunnel, deleteFunnel, addStage, updateStage, deleteStage,
    customFields, addCustomField, updateCustomField, deleteCustomField,
    webhooks, addWebhook, updateWebhook, deleteWebhook
  } = useCRM();
  
  const [activeTab, setActiveTab] = useState<SettingsTab>('pipeline');
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>(funnels[0]?.id || '');
  
  // Modals state
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  
  // Editing state
  const [editingField, setEditingField] = useState<Partial<CustomFieldDefinition> | null>(null);
  const [editingWebhook, setEditingWebhook] = useState<Partial<Webhook> | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const selectedFunnel = useMemo(() => funnels.find(f => f.id === (selectedFunnelId || funnels[0]?.id)), [funnels, selectedFunnelId]);
  const STAGE_COLORS = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-gray-500'];

  const getWebhookUrl = (id: string) => `${window.location.origin}/api/webhooks/receive/${id}`;

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(getWebhookUrl(id));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveField = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingField?.name || !editingField?.type || !editingField?.context || !editingField?.funnelId) return;
      
      if (editingField.id) {
          await updateCustomField(editingField.id, editingField);
      } else {
          await addCustomField({
              ...editingField,
              id: `cf-${Date.now()}`,
              accountId: currentAccount?.id || '',
              options: editingField.options || [],
              visibleStageIds: editingField.visibleStageIds || []
          } as CustomFieldDefinition);
      }
      setIsFieldModalOpen(false);
      setEditingField(null);
  };

  const handleSaveWebhook = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingWebhook?.name || !editingWebhook?.funnelId || !editingWebhook?.stageId) return;
      
      if (editingWebhook.id) {
          await updateWebhook(editingWebhook.id, editingWebhook);
      } else {
          await addWebhook({
              ...editingWebhook,
              id: `wh-${Date.now()}`,
              accountId: currentAccount?.id || '',
              active: true,
              createdAt: new Date().toISOString()
          } as Webhook);
      }
      setIsWebhookModalOpen(false);
      setEditingWebhook(null);
  };

  const getDaysRemaining = (dateStr?: string) => {
      if (!dateStr) return 0;
      const expDate = new Date(dateStr);
      if (isNaN(expDate.getTime())) return 0;
      const diff = expDate.getTime() - new Date().getTime();
      return Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
  };

  return (
    <div className="p-8 h-full flex flex-col bg-white animate-fade-in relative overflow-hidden">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div className="flex bg-gray-100/50 rounded-xl p-1 border border-gray-200 overflow-x-auto max-w-full">
            {[
              { id: 'pipeline', label: 'Funis de Vendas', icon: Layers },
              { id: 'fields', label: 'Campos', icon: SlidersHorizontal },
              { id: 'webhooks', label: 'Webhooks', icon: Zap },
              { id: 'access', label: 'Equipes e Acessos', icon: ShieldCheck },
              { id: 'billing', label: 'Plano', icon: CreditCard },
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <tab.icon size={16} /> {tab.label}
              </button>
            ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        
        {/* PIPELINE SETTINGS */}
        {activeTab === 'pipeline' && (
            <div className="flex h-full gap-8">
                <div className="w-64 border-r pr-6 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Meus Funis</h4>
                        <button onClick={() => {
                            const name = prompt("Nome do novo funil:");
                            if (name) addFunnel(name);
                        }} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><Plus size={16} /></button>
                    </div>
                    <div className="space-y-2 flex-1 overflow-y-auto">
                        {funnels.map(f => (
                            <button key={f.id} onClick={() => setSelectedFunnelId(f.id)} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex justify-between items-center transition-all ${selectedFunnelId === f.id ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
                                {f.name} <ChevronRight size={14} />
                            </button>
                        ))}
                    </div>
                </div>
                {selectedFunnel && (
                    <div className="flex-1 space-y-8 pb-12 overflow-y-auto pr-4">
                        <div className="flex justify-between items-center bg-gray-50 p-6 rounded-2xl border border-gray-100">
                            <div className="flex-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Nome do Funil</label>
                                <input 
                                    value={selectedFunnel.name} 
                                    onChange={(e) => updateFunnel(selectedFunnel.id, { name: e.target.value })} 
                                    className="text-2xl font-black text-gray-900 bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:border-blue-500 outline-none w-full transition-colors" 
                                />
                            </div>
                            <button onClick={() => {
                                if(confirm("Tem certeza que deseja excluir este funil?")) deleteFunnel(selectedFunnel.id);
                            }} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-3 rounded-xl transition-colors"><Trash2 size={20} /></button>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-black text-gray-900">Estágios do Funil</h3>
                                <button onClick={() => {
                                    const name = prompt("Nome do novo estágio:");
                                    if (name) addStage(selectedFunnel.id, name);
                                }} className="flex items-center gap-2 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors">
                                    <Plus size={16} /> Adicionar Estágio
                                </button>
                            </div>
                            <div className="space-y-3">
                                {selectedFunnel.stages.map((stage, index) => (
                                    <div key={stage.id} className="flex items-center gap-4 bg-white border border-gray-200 p-4 rounded-xl shadow-sm hover:border-blue-300 transition-colors group">
                                        <div className="text-gray-300 cursor-grab active:cursor-grabbing"><GripVertical size={20} /></div>
                                        <div className="flex gap-2">
                                            {STAGE_COLORS.map(color => (
                                                <button 
                                                    key={color} 
                                                    onClick={() => updateStage(selectedFunnel.id, stage.id, { color })}
                                                    className={`w-6 h-6 rounded-full ${color} ${stage.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : 'opacity-50 hover:opacity-100'}`}
                                                />
                                            ))}
                                        </div>
                                        <input 
                                            value={stage.name} 
                                            onChange={(e) => updateStage(selectedFunnel.id, stage.id, { name: e.target.value })}
                                            className="flex-1 font-bold text-gray-800 bg-transparent border-none outline-none focus:ring-0"
                                        />
                                        <button onClick={() => {
                                            if(confirm("Excluir estágio?")) deleteStage(selectedFunnel.id, stage.id);
                                        }} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* FIELDS SETTINGS */}
        {activeTab === 'fields' && (
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black text-gray-900">Campos Personalizados</h3>
                        <p className="text-sm text-gray-500">Adicione campos extras aos seus leads.</p>
                    </div>
                    <button onClick={() => {
                        setEditingField({ type: 'text', context: 'lead_detail', funnelId: funnels[0]?.id || '', visibleStageIds: [], options: [] });
                        setIsFieldModalOpen(true);
                    }} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-blue-700 shadow-sm">
                        <Plus size={16} /> Novo Campo
                    </button>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 uppercase text-[10px] font-black text-gray-500 tracking-widest">
                                <th className="px-6 py-4">Nome do Campo</th>
                                <th className="px-6 py-4">Tipo</th>
                                <th className="px-6 py-4">Contexto</th>
                                <th className="px-6 py-4">Funil</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {customFields.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500 font-medium">Nenhum campo personalizado criado.</td></tr>
                            ) : customFields.map(field => (
                                <tr key={field.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-gray-900">{field.name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600 capitalize">{field.type}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{field.context === 'lead_detail' ? 'Detalhes do Lead' : 'Motivo de Perda'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{funnels.find(f => f.id === field.funnelId)?.name || 'Todos'}</td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <button onClick={() => { setEditingField(field); setIsFieldModalOpen(true); }} className="p-2 text-gray-400 hover:text-blue-600 bg-white rounded-lg shadow-sm border border-gray-100"><Edit2 size={16} /></button>
                                        <button onClick={() => { if(confirm("Excluir campo?")) deleteCustomField(field.id); }} className="p-2 text-gray-400 hover:text-red-600 bg-white rounded-lg shadow-sm border border-gray-100"><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* WEBHOOKS SETTINGS */}
        {activeTab === 'webhooks' && (
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black text-gray-900">Webhooks (Entrada)</h3>
                        <p className="text-sm text-gray-500">Crie URLs para receber leads de outras plataformas.</p>
                    </div>
                    <button onClick={() => {
                        setEditingWebhook({ name: '', funnelId: funnels[0]?.id || '', stageId: funnels[0]?.stages[0]?.id || '', active: true });
                        setIsWebhookModalOpen(true);
                    }} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-blue-700 shadow-sm">
                        <Plus size={16} /> Novo Webhook
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {webhooks.length === 0 ? (
                        <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-12 text-center">
                            <Zap className="mx-auto text-gray-300 mb-4" size={48} />
                            <p className="text-gray-500 font-medium">Nenhum webhook configurado.</p>
                        </div>
                    ) : webhooks.map(webhook => {
                        const funnel = funnels.find(f => f.id === webhook.funnelId);
                        const stage = funnel?.stages.find(s => s.id === webhook.stageId);
                        return (
                            <div key={webhook.id} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h4 className="font-black text-gray-900 text-lg">{webhook.name}</h4>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${webhook.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {webhook.active ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 flex items-center gap-2">
                                        <Layers size={14} /> {funnel?.name} <ChevronRight size={12} /> {stage?.name}
                                    </p>
                                    <div className="mt-4 flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                                        <code className="text-xs text-gray-600 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{getWebhookUrl(webhook.id)}</code>
                                        <button onClick={() => handleCopy(webhook.id)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                                            {copiedId === webhook.id ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => updateWebhook(webhook.id, { active: !webhook.active })} className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl font-bold text-sm border border-gray-200">
                                        {webhook.active ? 'Desativar' : 'Ativar'}
                                    </button>
                                    <button onClick={() => { setEditingWebhook(webhook); setIsWebhookModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl border border-blue-100"><Edit2 size={18} /></button>
                                    <button onClick={() => { if(confirm("Excluir webhook?")) deleteWebhook(webhook.id); }} className="p-2 text-red-500 hover:bg-red-50 rounded-xl border border-red-100"><Trash2 size={18} /></button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        )}

        {/* ACCESS SETTINGS */}
        {activeTab === 'access' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-black text-gray-900">Usuários e Acessos</h3>
                    <p className="text-sm text-gray-500">Gerencie quem tem acesso ao seu CRM.</p>
                </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 uppercase text-[10px] font-black text-gray-500 tracking-widest">
                    <th className="px-6 py-4">Usuário</th>
                    <th className="px-6 py-4">E-mail</th>
                    <th className="px-6 py-4">Perfil</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-900 flex items-center gap-3">
                          <img src={user.avatar} alt="" className="w-8 h-8 rounded-full bg-gray-200" />
                          {user.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                      <td className="px-6 py-4">
                          <select 
                            value={user.role} 
                            onChange={(e) => updateUser(user.id, { role: e.target.value as any })} 
                            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={user.id === currentUser?.id}
                          >
                              <option value={UserRole.USER}>Vendedor</option>
                              <option value={UserRole.ACCOUNT_ADMIN}>Administrador</option>
                          </select>
                      </td>
                      <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {user.status}
                          </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* BILLING SETTINGS */}
        {activeTab === 'billing' && (
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10"><CreditCard size={120} /></div>
                    <div className="relative z-10">
                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-2">Plano Atual</h3>
                        <div className="flex items-end gap-4 mb-6">
                            <h1 className="text-5xl font-black uppercase tracking-tighter">{currentAccount?.plan || 'TRIAL'}</h1>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold mb-2 ${currentAccount?.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {currentAccount?.status === 'active' ? 'ATIVO' : 'SUSPENSO'}
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-6 border-t border-white/10 pt-6">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Empresa</p>
                                <p className="font-bold">{currentAccount?.companyName}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Dias Restantes</p>
                                <p className="font-bold text-xl">{getDaysRemaining(currentAccount?.expiresAt)} dias</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center">
                    <p className="text-gray-500 font-medium mb-4">Para alterar seu plano ou estender sua assinatura, entre em contato com o suporte.</p>
                    <button className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors">
                        Falar com Suporte
                    </button>
                </div>
            </div>
        )}
      </div>

      {/* MODALS */}
      {isFieldModalOpen && editingField && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-fade-in">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <h2 className="text-lg font-black text-gray-900">{editingField.id ? 'Editar Campo' : 'Novo Campo'}</h2>
                      <button onClick={() => setIsFieldModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-xl"><X size={20} /></button>
                  </div>
                  <form onSubmit={handleSaveField} className="p-6 space-y-4">
                      <div>
                          <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-2">Nome do Campo</label>
                          <input required value={editingField.name || ''} onChange={e => setEditingField({...editingField, name: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-2">Tipo</label>
                              <select value={editingField.type} onChange={e => setEditingField({...editingField, type: e.target.value as any})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500">
                                  <option value="text">Texto</option>
                                  <option value="select">Seleção Única</option>
                                  <option value="multiselect">Múltipla Seleção</option>
                              </select>
                          </div>
                          <div>
                              <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-2">Contexto</label>
                              <select value={editingField.context} onChange={e => setEditingField({...editingField, context: e.target.value as any})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500">
                                  <option value="lead_detail">Detalhes do Lead</option>
                                  <option value="lost_reason">Motivo de Perda</option>
                              </select>
                          </div>
                      </div>
                      <div>
                          <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-2">Funil</label>
                          <select value={editingField.funnelId} onChange={e => setEditingField({...editingField, funnelId: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500">
                              {funnels.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                          </select>
                      </div>
                      {(editingField.type === 'select' || editingField.type === 'multiselect') && (
                          <div>
                              <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-2">Opções (separadas por vírgula)</label>
                              <input 
                                value={editingField.options?.map(o => o.label).join(', ') || ''} 
                                onChange={e => {
                                    const opts = e.target.value.split(',').map(s => s.trim()).filter(Boolean).map(label => ({ id: `opt-${Date.now()}-${Math.random()}`, label }));
                                    setEditingField({...editingField, options: opts});
                                }} 
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" 
                                placeholder="Opção 1, Opção 2..."
                              />
                          </div>
                      )}
                      <div className="pt-4 flex gap-3">
                          <button type="button" onClick={() => setIsFieldModalOpen(false)} className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm">Cancelar</button>
                          <button type="submit" className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-lg">Salvar Campo</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {isWebhookModalOpen && editingWebhook && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-fade-in">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <h2 className="text-lg font-black text-gray-900">{editingWebhook.id ? 'Editar Webhook' : 'Novo Webhook'}</h2>
                      <button onClick={() => setIsWebhookModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-xl"><X size={20} /></button>
                  </div>
                  <form onSubmit={handleSaveWebhook} className="p-6 space-y-4">
                      <div>
                          <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-2">Nome da Integração</label>
                          <input required value={editingWebhook.name || ''} onChange={e => setEditingWebhook({...editingWebhook, name: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: RD Station, Facebook Lead Ads..." />
                      </div>
                      <div>
                          <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-2">Funil de Destino</label>
                          <select value={editingWebhook.funnelId} onChange={e => {
                              const fId = e.target.value;
                              const f = funnels.find(x => x.id === fId);
                              setEditingWebhook({...editingWebhook, funnelId: fId, stageId: f?.stages[0]?.id || ''});
                          }} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500">
                              {funnels.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-2">Estágio Inicial</label>
                          <select value={editingWebhook.stageId} onChange={e => setEditingWebhook({...editingWebhook, stageId: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500">
                              {funnels.find(f => f.id === editingWebhook.funnelId)?.stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                      </div>
                      <div className="pt-4 flex gap-3">
                          <button type="button" onClick={() => setIsWebhookModalOpen(false)} className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm">Cancelar</button>
                          <button type="submit" className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-lg">Salvar Webhook</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

    </div>
  );
};
