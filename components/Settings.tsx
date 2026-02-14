
import React, { useState, useMemo, useEffect } from 'react';
import { useCRM } from '../context/CRMContext';
import { 
  Plus, Layers, SlidersHorizontal, Trash2, 
  ShieldCheck, CreditCard, ChevronRight, GripVertical, X, Zap, Copy, Check, ExternalLink,
  ChevronDown, Edit2
} from 'lucide-react';
import { UserRole, CustomFieldDefinition, CustomFieldType, CustomFieldContext, Webhook } from '../types';

type SettingsTab = 'pipeline' | 'fields' | 'access' | 'billing' | 'webhooks';

export const Settings = () => {
  const { 
    funnels, users, currentUser, currentAccount, 
    updateUser, teams, 
    addFunnel, updateFunnel, deleteFunnel, addStage, updateStage, deleteStage,
    customFields, addCustomField, updateCustomField, deleteCustomField,
    webhooks, addWebhook, updateWebhook, deleteWebhook
  } = useCRM();
  
  const [activeTab, setActiveTab] = useState<SettingsTab>('access');
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>(funnels[0]?.id || '');
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const selectedFunnel = useMemo(() => funnels.find(f => f.id === (selectedFunnelId || funnels[0]?.id)), [funnels, selectedFunnelId]);
  const STAGE_COLORS = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-gray-500'];

  const getWebhookUrl = (id: string) => `${window.location.origin}/api/webhooks/receive/${id}`;

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(getWebhookUrl(id));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const [webhookForm, setWebhookForm] = useState({
      name: '',
      funnelId: funnels[0]?.id || '',
      stageId: funnels[0]?.stages[0]?.id || ''
  });

  useEffect(() => {
    if (editingWebhook) {
        setWebhookForm({
            name: editingWebhook.name,
            funnelId: editingWebhook.funnelId,
            stageId: editingWebhook.stageId
        });
    } else {
        setWebhookForm({
            name: '',
            funnelId: funnels[0]?.id || '',
            stageId: funnels[0]?.stages[0]?.id || ''
        });
    }
  }, [editingWebhook, funnels]);

  const handleOpenWebhookModal = (webhook: Webhook | null = null) => {
      setEditingWebhook(webhook);
      setIsWebhookModalOpen(true);
  };

  return (
    <div className="p-8 h-full flex flex-col bg-white animate-fade-in relative overflow-hidden">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div className="flex bg-gray-100/50 rounded-xl p-1 border border-gray-200 overflow-x-auto max-w-full">
            {[
              { id: 'access', label: 'Equipes e Acessos', icon: ShieldCheck },
              { id: 'pipeline', label: 'Funis de Vendas', icon: Layers },
              { id: 'fields', label: 'Campos', icon: SlidersHorizontal },
              { id: 'webhooks', label: 'Webhooks', icon: Zap },
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
                    </div>
                </div>
                {selectedFunnel && (
                    <div className="flex-1 space-y-8 pb-12 overflow-y-auto">
                        <div className="flex justify-between items-center">
                            <input value={selectedFunnel.name} onChange={(e) => updateFunnel(selectedFunnel.id, { name: e.target.value })} className="text-2xl font-black text-gray-900 bg-transparent border-b border-transparent focus:border-blue-500 outline-none w-64" />
                            <button onClick={() => deleteFunnel(selectedFunnel.id)} className="text-red-400 hover:text-red-600"><Trash2 size={20} /></button>
                        </div>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};
