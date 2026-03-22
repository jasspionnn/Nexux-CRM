import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Plus } from 'lucide-react';
import { useCRM } from '../context/CRMContext';

export const LeadsDatabase = ({ onNavigate }: any) => {
  const { currentUser } = useCRM();
  const [leads, setLeads] = useState<any[]>([]);
  const [funnels, setFunnels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [leadsRes, funnelsRes] = await Promise.all([
        fetch('/api/leads'),
        fetch('/api/funnels')
      ]);
      const leadsData = await leadsRes.json();
      const funnelsData = await funnelsRes.json();
      setLeads(leadsData);
      setFunnels(funnelsData);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStageName = (funnelId: string, stageId: string) => {
    const funnel = funnels.find(f => f.id === funnelId);
    if (!funnel) return 'Desconhecido';
    const stage = funnel.stages?.find((s: any) => s.id === stageId);
    return stage ? stage.name : 'Desconhecido';
  };

  const handleCreateLead = async () => {
    if (funnels.length === 0) {
      alert('Crie um funil de vendas primeiro nas configurações.');
      return;
    }
    
    const funnel = funnels[0];
    if (!funnel.stages || funnel.stages.length === 0) {
      alert('O funil não possui etapas. Adicione etapas nas configurações.');
      return;
    }

    const newLead = {
      title: 'Novo Contato',
      company: '',
      value: 0,
      funnel_id: funnel.id,
      stage_id: funnel.stages[0].id,
      assigned_user_id: currentUser?.id
    };

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLead)
      });
      const createdLead = await res.json();
      onNavigate('lead-detail', createdLead.id);
    } catch (error) {
      console.error(error);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Base de Contatos</h1>
          <p className="text-sm text-slate-500">Visualize e gerencie todos os leads do sistema</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="text-slate-500 hover:text-slate-700 p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Download size={18} />
          </button>
          <button 
            onClick={handleCreateLead}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Plus size={18} />
            Novo Contato
          </button>
        </div>
      </div>

      <div className="p-6 border-b border-gray-200 bg-slate-50 flex items-center gap-4 shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome, empresa ou email..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-slate-600 hover:bg-white bg-white font-medium transition-colors shadow-sm">
          <Filter size={18} />
          Filtros
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 sticky top-0 z-10 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Negociação</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Empresa</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contato</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estágio</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {leads.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  Nenhum contato encontrado.
                </td>
              </tr>
            ) : (
              leads.map(lead => (
                <tr key={lead.id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => onNavigate('lead-detail', lead.id)}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-slate-900">{lead.title}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-600">{lead.company || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-slate-900">{lead.contact_name || '-'}</div>
                    <div className="text-sm text-slate-500">{lead.contact_email || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-700">
                    R$ {(lead.value || 0).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      {getStageName(lead.funnel_id, lead.stage_id)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-sm">
                    {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
