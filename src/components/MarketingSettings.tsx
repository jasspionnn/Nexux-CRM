import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Zap, ArrowRight, Save, Loader2, Info, AlertCircle
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';

export const MarketingSettings = () => {
  const { currentUser } = useCRM();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Marketing Custom Fields (needed for mapping)
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
    setError(null);
    try {
      const [mktFieldsRes, crmFieldsRes, mappingsRes] = await Promise.all([
        fetch(`/api/marketing/custom-fields?account_id=${accountId}`),
        fetch(`/api/custom-fields?account_id=${accountId}`),
        fetch(`/api/marketing/field-mappings?account_id=${accountId}`)
      ]);

      const mktData = await mktFieldsRes.json();
      const crmData = await crmFieldsRes.json();
      const mappingsData = await mappingsRes.json();

      setMarketingFields(Array.isArray(mktData) ? mktData : []);
      setCrmFields(Array.isArray(crmData) ? crmData : []);
      setMappings(Array.isArray(mappingsData) ? mappingsData : []);
      
      if (mktData.error || crmData.error || mappingsData.error) {
        setError('Algumas tabelas podem não ter sido criadas. Por favor, acesse /api/migrate-db para atualizar o banco.');
      }
    } catch (error: any) {
      console.error('Failed to fetch marketing integration data:', error);
      setError('Erro ao carregar dados de integração.');
    } finally {
      setIsLoading(false);
    }
  };

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
      const res = await fetch('/api/marketing/field-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountId, mappings })
      });
      if (res.ok) {
        alert('Mapeamentos salvos com sucesso!');
      } else {
        const err = await res.json();
        alert('Erro ao salvar: ' + (err.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Error saving mappings:', error);
      alert('Erro ao salvar mapeamentos');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-white p-10">
        <div className="text-slate-500 flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-bold uppercase tracking-widest mt-4">Carregando Integração CRM...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-50 p-10 text-center">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl max-w-md">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">Ops! Algo deu errado</h2>
          <p className="text-slate-500 text-sm mb-6">{error}</p>
          <button onClick={fetchData} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold">Tentar Novamente</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
              <Zap size={18} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Integração CRM</h2>
          </div>
          <p className="text-slate-500 text-sm">Combine os campos do Marketing com os campos de Leads do CRM.</p>
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

      <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-indigo-50/30 flex items-center gap-3">
              <Info size={18} className="text-indigo-600" />
              <p className="text-xs text-indigo-700 font-medium">
                Esta configuração define como os leads capturados no marketing serão transformados em leads no CRM.
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
    </div>
  );
};
