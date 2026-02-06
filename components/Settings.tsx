
import React, { useState, useMemo } from 'react';
import { useCRM } from '../context/CRMContext';
import { 
  Plus, Layers, SlidersHorizontal, Trash2, 
  ShieldCheck, CreditCard, ChevronRight, GripVertical, X
} from 'lucide-react';
import { UserRole, CustomFieldDefinition } from '../types';

export const Settings = () => {
  const { 
    funnels, users, currentUser, 
    updateUser, addFunnel, updateFunnel, deleteFunnel, addStage, updateStage, deleteStage,
    customFields, addCustomField, updateCustomField, deleteCustomField
  } = useCRM();
  
  const [activeTab, setActiveTab] = useState<'pipeline' | 'fields' | 'access' | 'billing'>('access');
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>(funnels[0]?.id || '');
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null);

  const selectedFunnel = useMemo(() => funnels.find(f => f.id === selectedFunnelId), [funnels, selectedFunnelId]);
  const STAGE_COLORS = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-gray-500'];

  return (
    <div className="p-8 h-full flex flex-col bg-white animate-fade-in relative overflow-hidden">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div className="flex bg-gray-100/50 rounded-xl p-1 border border-gray-200 overflow-x-auto max-w-full">
            {[
              { id: 'access', label: 'Equipes e Acessos', icon: ShieldCheck },
              { id: 'pipeline', label: 'Funis de Vendas', icon: Layers },
              { id: 'fields', label: 'Campos', icon: SlidersHorizontal },
              { id: 'billing', label: 'Plano', icon: CreditCard },
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <tab.icon size={16} /> {tab.label}
              </button>
            ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === 'access' && (
          <div className="bg-white overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 uppercase text-[10px] font-bold text-gray-400">
                  <th className="px-4 py-4">Usuário</th>
                  <th className="px-4 py-4">Perfil</th>
                  <th className="px-4 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-6 font-bold text-gray-800">{user.name}</td>
                    <td className="px-4 py-6">
                        <select value={user.role} onChange={(e) => updateUser(user.id, { role: e.target.value as any })} className="bg-transparent text-sm font-medium text-gray-700 outline-none">
                            <option value={UserRole.USER}>Vendedor</option>
                            <option value={UserRole.ACCOUNT_ADMIN}>Administrador</option>
                        </select>
                    </td>
                    <td className="px-4 py-6 uppercase text-[10px] font-black text-green-600">{user.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'pipeline' && (
            <div className="flex h-full gap-8">
                <div className="w-64 border-r pr-6">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Meus Funis</h4>
                    <div className="space-y-2">
                        {funnels.map(f => (
                            <button key={f.id} onClick={() => setSelectedFunnelId(f.id)} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex justify-between items-center transition-all ${selectedFunnelId === f.id ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
                                {f.name} <ChevronRight size={14} />
                            </button>
                        ))}
                        <button onClick={() => addFunnel('Novo Funil')} className="w-full py-3 border-2 border-dashed border-gray-100 text-gray-300 text-sm font-bold flex items-center justify-center gap-2 hover:border-blue-200 hover:text-blue-500 rounded-xl">
                            <Plus size={16} /> Novo Funil
                        </button>
                    </div>
                </div>
                {selectedFunnel && (
                    <div className="flex-1 space-y-8 pb-12 overflow-y-auto">
                        <div className="flex justify-between items-center">
                            <input value={selectedFunnel.name} onChange={(e) => updateFunnel(selectedFunnel.id, { name: e.target.value })} className="text-2xl font-black text-gray-900 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-blue-500 outline-none w-64" />
                            <button onClick={() => deleteFunnel(selectedFunnel.id)} className="text-red-400 hover:text-red-600"><Trash2 size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <h5 className="text-[11px] font-black text-gray-900 uppercase">Estágios do Processo</h5>
                            {selectedFunnel.stages.map((stage) => (
                                <div key={stage.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-center gap-4">
                                    <GripVertical size={16} className="text-gray-300" />
                                    <input value={stage.name} onChange={(e) => updateStage(selectedFunnel.id, stage.id, { name: e.target.value })} className="bg-transparent text-sm font-bold text-gray-800 outline-none flex-1" />
                                    <div className="flex gap-1">{STAGE_COLORS.map(c => <button key={c} onClick={() => updateStage(selectedFunnel.id, stage.id, { color: c })} className={`w-4 h-4 rounded-full ${c} ${stage.color === c ? 'ring-2 ring-blue-400' : ''}`} />)}</div>
                                    <button onClick={() => deleteStage(selectedFunnel.id, stage.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={16} /></button>
                                </div>
                            ))}
                            <button onClick={() => addStage(selectedFunnel.id, 'Nova Etapa')} className="w-full py-4 border-2 border-dashed border-gray-100 rounded-xl text-gray-300 text-sm font-bold hover:border-blue-200 hover:text-blue-500 flex items-center justify-center gap-2">
                                <Plus size={18} /> Adicionar Estágio
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'fields' && (
            <div className="space-y-8 animate-fade-in">
                <div className="flex justify-between items-center">
                    <div><h3 className="text-xl font-black text-gray-900">Campos Personalizados</h3></div>
                    <button onClick={() => {setEditingField(null); setIsFieldModalOpen(true)}} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm"><Plus size={18} /> Novo Campo</button>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase">
                            <tr><th className="px-6 py-4">Campo</th><th className="px-6 py-4">Contexto</th><th className="px-6 py-4">Funil</th><th className="px-6 py-4"></th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {customFields.map(field => (
                                <tr key={field.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-sm text-gray-800">{field.name}</td>
                                    <td className="px-6 py-4 uppercase text-[10px] font-black text-blue-600">{field.context}</td>
                                    <td className="px-6 py-4 text-xs font-bold text-gray-500">{funnels.find(f => f.id === field.funnelId)?.name || 'Global'}</td>
                                    <td className="px-6 py-4 text-right"><button onClick={() => deleteCustomField(field.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={16} /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
      </div>

      {isFieldModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
                <div className="px-8 py-6 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">Novo Campo Customizado</h3>
                    <button onClick={() => setIsFieldModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                </div>
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.target as any;
                    addCustomField({ 
                        id: `cf-${Date.now()}`, 
                        accountId: currentUser?.accountId || '', 
                        name: form.fname.value,
                        type: 'text',
                        context: 'lead_detail',
                        funnelId: form.ffunnel.value,
                        visibleStageIds: []
                    });
                    setIsFieldModalOpen(false);
                }} className="p-8 space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Nome do Campo</label>
                        <input name="fname" required className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Funil:</label>
                        <select name="ffunnel" defaultValue={selectedFunnelId} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none bg-white text-sm font-medium">
                            {funnels.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold hover:bg-blue-700 shadow-md">Adicionar Campo</button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};
