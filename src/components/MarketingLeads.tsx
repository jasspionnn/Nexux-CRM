import React, { useState, useEffect } from 'react';
import { Users, Download, Trash2, Check, X, RefreshCw, Send } from 'lucide-react';
import { useCRM } from '../context/CRMContext';

export const MarketingLeads = () => {
  const { currentUser } = useCRM();
  const [isLoading, setIsLoading] = useState(true);
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);

  const accountId = currentUser?.account_id || 'acc_demo';

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/marketing-leads?account_id=${accountId}`);
      if (res.ok) setLeads(await res.json());
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === leads.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(leads.map(l => l.id)));
  };

  const handleSyncToCrm = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Enviar ${selectedIds.size} lead(s) para o CRM?`)) return;
    setSyncing(true);
    try {
      const res = await fetch('/api/marketing-leads/sync-to-crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountId, lead_ids: Array.from(selectedIds) })
      });
      if (res.ok) {
        const data = await res.json();
        alert(`${data.synced} lead(s) enviado(s) para o CRM!`);
        setSelectedIds(new Set());
        fetchData();
      }
    } catch (e) { console.error(e); alert('Erro ao enviar'); }
    setSyncing(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este lead?')) return;
    try { await fetch(`/api/marketing-leads/${id}`, { method: 'DELETE' }); fetchData(); }
    catch (e) { console.error(e); }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (isLoading) return <div className="flex items-center justify-center h-full"><div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="h-full bg-slate-50/50 p-6 lg:p-10 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3"><Users className="text-teal-600" size={32} />Base de Leads</h1>
            <p className="text-slate-500 font-medium mt-1">Leads capturados via formulários de marketing.</p>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <button onClick={handleSyncToCrm} disabled={syncing} className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-sm disabled:opacity-50">
                <Send size={16} />Enviar {selectedIds.size} para CRM
              </button>
            )}
            <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-sm"><RefreshCw size={16} /></button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
          {leads.length === 0 ? (
            <div className="p-12 text-center"><Users className="mx-auto text-slate-300 mb-4" size={48} /><p className="text-slate-400 font-bold text-lg">Nenhum lead capturado ainda</p><p className="text-sm text-slate-400 mt-2">Preencha um formulário com campos mapeados para capturar leads.</p></div>
          ) : (
            <>
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
                <span className="text-xs font-bold text-slate-500">{leads.length} leads</span>
                {selectedIds.size > 0 && <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded">{selectedIds.size} selecionado(s)</span>}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-gray-200">
                    <tr className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">
                      <th className="px-4 py-3 w-10"><input type="checkbox" checked={selectedIds.size === leads.length && leads.length > 0} onChange={toggleAll} className="rounded" /></th>
                      <th className="px-4 py-3">Nome</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Telefone</th>
                      <th className="px-4 py-3">Formulário</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Data</th><th className="px-4 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {leads.map(lead => (
                      <tr key={lead.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.has(lead.id) ? 'bg-teal-50/50' : ''}`}>
                        <td className="px-4 py-3"><input type="checkbox" checked={selectedIds.has(lead.id)} onChange={() => toggleSelect(lead.id)} className="rounded" /></td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{lead.contact_name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{lead.contact_email || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{lead.contact_phone || '-'}</td>
                        <td className="px-4 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">{lead.form_name}</span></td>
                        <td className="px-4 py-3">
                          {lead.synced_to_crm ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-600"><Check size={12} />CRM</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600"><X size={12} />Pendente</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{formatDate(lead.created_at)}</td>
                        <td className="px-4 py-3"><button onClick={() => handleDelete(lead.id)} className="p-1 text-slate-300 hover:text-red-500 rounded transition-colors"><Trash2 size={14} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
