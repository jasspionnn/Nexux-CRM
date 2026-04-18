import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Check, X, Edit2, SlidersHorizontal, Zap, 
  ArrowRight, Save, Loader2, Type, Hash, List, Calendar, Info
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';

export const MarketingSettings = () => {
  const { currentUser } = useCRM();
  const [activeTab, setActiveTab] = useState('integracoes');
  const [isLoading, setIsLoading] = useState(true);
  
  // Marketing Custom Fields
  const [marketingFields, setMarketingFields] = useState<any[]>([]);
  // CRM Custom Fields
  const [crmFields, setCrmFields] = useState<any[]>([]);
  // Mappings
  const [mappings, setMappings] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const accountId = currentUser?.account_id || 'acc_demo';

  const STANDARD_MKT_FIELDS = [
    { id: 'contact_name', name: 'Nome do Contato' },
    { id: 'contact_email', name: 'Email' },
    { id: 'contact_phone', name: 'Telefone' },
    { id: 'company', name: 'Empresa' },
    { id: 'title', name: 'Título do Lead' },
    { id: 'value', name: 'Valor' },
    { id: 'tags', name: 'Tags' },
  ];

  const STANDARD_CRM_FIELDS = [
    { id: 'contact_name', name: 'Nome do Contato' },
    { id: 'contact_email', name: 'Email' },
    { id: 'contact_phone', name: 'Telefone' },
    { id: 'company', name: 'Empresa' },
    { id: 'title', name: 'Título do Lead' },
    { id: 'value', name: 'Valor' },
    { id: 'tags', name: 'Tags' },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [mktFieldsRes, crmFieldsRes, mappingsRes] = await Promise.all([
        fetch(`/api/marketing/custom-fields?account_id=${accountId}`),
        fetch(`/api/custom-fields?account_id=${accountId}`),
        fetch(`/api/marketing/field-mappings?account_id=${accountId}`)
      ]);

      setMarketingFields(await mktFieldsRes.json());
      setCrmFields(await crmFieldsRes.json());
      setMappings(await mappingsRes.json());
    } catch (error) {
      console.error('Failed to fetch marketing settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'integracoes', label: 'Integração CRM', icon: Zap },
    { id: 'campos', label: 'Campos Marketing', icon: SlidersHorizontal },
  ];

  // --- Marketing Custom Fields Handlers ---
  const handleAddMktField = async () => {
    try {
      const res = await fetch('/api/marketing/custom-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Novo Campo Marketing', type: 'Texto', account_id: accountId })
      });
      const newField = await res.json();
      setMarketingFields(prev => [newField, ...prev]);
    } catch (error) {
      console.error('Error adding mkt field:', error);
    }
  };

  const handleUpdateMktField = async (id: string, updates: any) => {
    setMarketingFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    try {
      await fetch(`/api/marketing/custom-fields/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    } catch (error) {
      console.error('Error updating mkt field:', error);
    }
  };

  const handleDeleteMktField = async (id: string) => {
    if (!confirm('Excluir este campo de marketing?')) return;
    try {
      await fetch(`/api/marketing/custom-fields/${id}`, { method: 'DELETE' });
      setMarketingFields(prev => prev.filter(f => f.id !== id));
    } catch (error) {
      console.error('Error deleting mkt field:', error);
    }
  };

  // --- Mapping Handlers ---
  const handleAddMapping = () => {
    setMappings([...mappings, { 
      id: crypto.randomUUID(), 
      marketing_standard_field: 'contact_name', 
      crm_standard_field: 'contact_name' 
    }]);
  };

  const handleRemoveMapping = (id: string) => {
    setMappings(mappings.filter(m => m.id !== id));
  };

  const updateMapping = (id: string, updates: any) => {
    setMappings(mappings.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const saveMappings = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/marketing/field-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountId, mappings })
      });
      alert('Mapeamentos salvos com sucesso!');
    } catch (error) {
      console.error('Error saving mappings:', error);
      alert('Erro ao salvar mapeamentos');
    } finally {
      setIsSaving(false);
    }
  };

  const renderIntegracoesTab = () => (
    <div className="p-8 flex-1 overflow-y-auto bg-slate-50/50">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Combinação de Campos</h2>
            <p className="text-slate-500 text-sm mt-1">Mapeie como os dados do Marketing devem ser enviados para o CRM.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={handleAddMapping}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all shadow-sm"
            >
              <Plus size={18} />
              Novo Mapeamento
            </button>
            <button 
              onClick={saveMappings}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Salvar Mapeamentos
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-indigo-50/30 flex items-center gap-3">
            <Info size={18} className="text-indigo-600" />
            <p className="text-xs text-indigo-700 font-medium">
              Configure abaixo quais campos de Marketing correspondem a quais campos no CRM (Leads). 
              Isso garante que os dados capturados via Tracking ou Formulários sejam salvos corretamente.
            </p>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[40%]">Campo Marketing</th>
                <th className="px-4 py-4 text-center text-slate-300"><ArrowRight size={14} className="mx-auto" /></th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[40%]">Campo CRM (Lead)</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mappings.map(mapping => (
                <tr key={mapping.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-6">
                    <select 
                      value={mapping.marketing_field_id ? `custom:${mapping.marketing_field_id}` : `standard:${mapping.marketing_standard_field}`}
                      onChange={(e) => {
                        const [type, val] = e.target.value.split(':');
                        if (type === 'standard') updateMapping(mapping.id, { marketing_standard_field: val, marketing_field_id: null });
                        else updateMapping(mapping.id, { marketing_field_id: val, marketing_standard_field: null });
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <optgroup label="Campos Padrão">
                        {STANDARD_MKT_FIELDS.map(f => <option key={f.id} value={`standard:${f.id}`}>{f.name}</option>)}
                      </optgroup>
                      <optgroup label="Campos Personalizados (Mkt)">
                        {marketingFields.map(f => <option key={f.id} value={`custom:${f.id}`}>{f.name}</option>)}
                      </optgroup>
                    </select>
                  </td>
                  <td className="px-4 py-6 text-center text-slate-300">
                    <ArrowRight size={18} className="mx-auto" />
                  </td>
                  <td className="px-8 py-6">
                    <select 
                      value={mapping.crm_field_id ? `custom:${mapping.crm_field_id}` : `standard:${mapping.crm_standard_field}`}
                      onChange={(e) => {
                        const [type, val] = e.target.value.split(':');
                        if (type === 'standard') updateMapping(mapping.id, { crm_standard_field: val, crm_field_id: null });
                        else updateMapping(mapping.id, { crm_field_id: val, crm_standard_field: null });
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <optgroup label="Campos Padrão">
                        {STANDARD_CRM_FIELDS.map(f => <option key={f.id} value={`standard:${f.id}`}>{f.name}</option>)}
                      </optgroup>
                      <optgroup label="Campos Personalizados (CRM)">
                        {crmFields.map(f => <option key={f.id} value={`custom:${f.id}`}>{f.name}</option>)}
                      </optgroup>
                    </select>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button 
                      onClick={() => handleRemoveMapping(mapping.id)}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {mappings.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-12 text-center text-slate-400 text-sm italic">
                    Nenhum mapeamento configurado. Clique em "Novo Mapeamento" para começar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderCamposTab = () => (
    <div className="p-8 flex-1 overflow-y-auto bg-slate-50/50">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Campos Exclusivos Marketing</h2>
            <p className="text-slate-500 text-sm mt-1">Gerencie campos específicos para suas campanhas e automações de marketing.</p>
          </div>
          <button 
            onClick={handleAddMktField}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            <Plus size={18} />
            Novo Campo Marketing
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Campo</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {marketingFields.map(field => {
                const TypeIcon = field.type === 'Número' ? Hash : field.type === 'Data' ? Calendar : field.type === 'Seleção' ? List : Type;
                return (
                  <tr key={field.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                          <TypeIcon size={20} />
                        </div>
                        <input 
                          type="text" 
                          value={field.name}
                          onChange={(e) => handleUpdateMktField(field.id, { name: e.target.value })}
                          className="bg-transparent border-none p-0 focus:ring-0 outline-none w-full font-bold text-slate-900"
                        />
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <select 
                        value={field.type}
                        onChange={(e) => handleUpdateMktField(field.id, { type: e.target.value })}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option>Texto</option>
                        <option>Número</option>
                        <option>Seleção</option>
                        <option>Data</option>
                      </select>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={() => handleDeleteMktField(field.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {marketingFields.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-8 py-16 text-center text-slate-400">
                    Nenhum campo personalizado de marketing criado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-slate-500 flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-bold uppercase tracking-widest">Carregando Configurações de Marketing...</span>
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
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-indigo-50 text-indigo-600'
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
      {activeTab === 'integracoes' && renderIntegracoesTab()}
      {activeTab === 'campos' && renderCamposTab()}
    </div>
  );
};
