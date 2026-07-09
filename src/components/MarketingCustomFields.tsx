import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Edit2, X
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';

export const MarketingCustomFields = () => {
  const { currentUser } = useCRM();
  const [isLoading, setIsLoading] = useState(true);
  const [marketingFields, setMarketingFields] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<any>(null);

  const accountId = currentUser?.account_id || 'acc_demo';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/marketing/custom-fields?account_id=${accountId}`);
      const data = await res.json();
      setMarketingFields(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingField.id ? 'PUT' : 'POST';
    const url = editingField.id ? `/api/marketing/custom-fields/${editingField.id}` : '/api/marketing/custom-fields';
    
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editingField, account_id: accountId })
      });
      if (res.ok) {
        fetchData();
        setIsModalOpen(false);
        setEditingField(null);
      }
    } catch (e) { alert('Erro ao salvar'); }
  };

  const openModal = (field?: any) => {
    setEditingField(field || { name: '', type: 'Texto', options: '' });
    setIsModalOpen(true);
  };

  if (isLoading) return <div className="p-10 text-center">Carregando...</div>;

  return (
    <div className="p-8 h-full overflow-y-auto bg-slate-50/50">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Gestão de Campos (Mkt)</h2>
            <p className="text-slate-500 text-sm mt-1">Configure campos exclusivos para captura de dados e automações.</p>
          </div>
          <button onClick={() => openModal()} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg">
            <Plus size={18} /> Novo Campo Marketing
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-gray-200">
              <tr className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">
                <th className="px-8 py-4">Nome</th>
                <th className="px-8 py-4">Tipo</th>
                <th className="px-8 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {marketingFields.map(f => (
                <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-4 font-bold text-slate-800">{f.name}</td>
                  <td className="px-8 py-4 text-sm text-slate-500">{f.type}</td>
                  <td className="px-8 py-4 text-right flex items-center justify-end gap-2">
                    <button onClick={() => openModal(f)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit2 size={16} /></button>
                    <button onClick={() => { if(confirm('Excluir?')) fetch(`/api/marketing/custom-fields/${f.id}`, {method: 'DELETE'}).then(fetchData); }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setIsModalOpen(false)}>
          <form className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()} onSubmit={handleSave}>
            <h3 className="text-xl font-black mb-4">{editingField.id ? 'Editar Campo' : 'Novo Campo'}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Nome do Campo</label>
                <input required className="w-full mt-1 px-4 py-2 border rounded-lg" value={editingField.name} onChange={e => setEditingField({...editingField, name: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Tipo</label>
                <select className="w-full mt-1 px-4 py-2 border rounded-lg" value={editingField.type} onChange={e => setEditingField({...editingField, type: e.target.value})}>
                  <option>Texto</option>
                  <option>Número</option>
                  <option>Seleção</option>
                  <option>Data</option>
                </select>
              </div>
              {editingField.type === 'Seleção' && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Opções (separadas por vírgula)</label>
                  <textarea className="w-full mt-1 px-4 py-2 border rounded-lg" value={editingField.options || ''} onChange={e => setEditingField({...editingField, options: e.target.value})} placeholder="Opção 1, Opção 2" />
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" className="flex-1 py-2 font-bold text-slate-500" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-bold">Salvar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
