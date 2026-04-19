import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, SlidersHorizontal, Type, Hash, List, Calendar, AlertCircle, RefreshCw
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';

export const MarketingCustomFields = () => {
  const { currentUser } = useCRM();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marketingFields, setMarketingFields] = useState<any[]>([]);

  const accountId = currentUser?.account_id || 'acc_demo';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/marketing/custom-fields?account_id=${accountId}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setMarketingFields(data);
      } else {
        setError(data.error || 'Erro ao carregar campos de marketing.');
      }
    } catch (error) {
      console.error('Failed to fetch mkt fields:', error);
      setError('Erro de conexão ao carregar campos.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMktField = async () => {
    try {
      const res = await fetch('/api/marketing/custom-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Novo Campo Marketing', type: 'Texto', account_id: accountId })
      });
      const newField = await res.json();
      if (newField.id) setMarketingFields(prev => [newField, ...prev]);
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

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-white p-10">
        <div className="text-slate-500 flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-bold uppercase tracking-widest mt-4">Carregando Campos de Marketing...</span>
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
          <button onClick={fetchData} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg">Tentar Novamente</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 h-full overflow-y-auto bg-slate-50/50">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Campos Exclusivos Marketing</h2>
            <p className="text-slate-500 text-sm mt-1">Gerencie campos específicos para suas campanhas e automações de marketing.</p>
          </div>
          <button 
            onClick={handleAddMktField}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg"
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
};
