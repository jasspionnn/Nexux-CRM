import React, { useState, useEffect } from 'react';
import { Plus, MoreHorizontal, Check } from 'lucide-react';
import { useCRM } from '../context/CRMContext';

export const KanbanBoard = ({ onNavigate }: any) => {
  const { currentUser } = useCRM();
  const [funnels, setFunnels] = useState<any[]>([]);
  const [activeFunnelId, setActiveFunnelId] = useState<string>('');
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [funnelsRes, leadsRes] = await Promise.all([
        fetch('/api/funnels'),
        fetch('/api/leads')
      ]);
      
      const funnelsData = await funnelsRes.json();
      const leadsData = await leadsRes.json();
      
      if (Array.isArray(funnelsData)) {
        setFunnels(funnelsData);
        if (funnelsData.length > 0 && !activeFunnelId) {
          setActiveFunnelId(funnelsData[0].id);
        }
      } else {
        console.error('Funnels data is not an array:', funnelsData);
      }
      
      if (Array.isArray(leadsData)) {
        setLeads(leadsData);
      } else {
        console.error('Leads data is not an array:', leadsData);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const activeFunnel = funnels.find(f => f.id === activeFunnelId);
  const stages = activeFunnel?.stages || [];

  const handleCreateLead = async (stageId: string) => {
    const newLead = {
      title: 'Nova Negociação',
      company: 'Empresa',
      value: 0,
      funnel_id: activeFunnelId,
      stage_id: stageId,
      assigned_user_id: currentUser?.id
    };

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLead)
      });
      const createdLead = await res.json();
      setLeads([createdLead, ...leads]);
      onNavigate('lead-detail', createdLead.id);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('leadId', leadId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    if (!leadId) return;

    // Optimistic update
    const updatedLeads = leads.map(lead => {
      if (lead.id === leadId) {
        return { ...lead, stage_id: stageId };
      }
      return lead;
    });
    setLeads(updatedLeads);

    // API call
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage_id: stageId })
      });
      if (!res.ok) {
        throw new Error('Failed to update lead stage');
      }
    } catch (error) {
      console.error('Failed to update lead stage:', error);
      // Revert on error
      fetchData();
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="px-6 py-4 border-b border-gray-200 bg-white flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pipeline de Vendas</h1>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-sm text-slate-500">Gerencie suas negociações e acompanhe o funil</p>
            {funnels.length > 1 && (
              <select 
                value={activeFunnelId} 
                onChange={(e) => setActiveFunnelId(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-slate-900"
              >
                {funnels.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>
        <button 
          onClick={() => stages.length > 0 && handleCreateLead(stages[0].id)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
          disabled={stages.length === 0}
        >
          <Plus size={18} />
          Nova Negociação
        </button>
      </div>

      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-6 h-full items-start">
          {stages.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              Este funil não possui etapas. Adicione etapas nas configurações.
            </div>
          ) : (
            stages.map((stage: any) => {
              const stageLeads = leads.filter(l => l.stage_id === stage.id);
              const totalValue = stageLeads.reduce((sum, l) => sum + (l.value || 0), 0);
              
              return (
                <div 
                  key={stage.id} 
                  className="w-80 shrink-0 flex flex-col max-h-full"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, stage.id)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color || '#3b82f6' }}></div>
                      <h3 className="font-bold text-slate-700">{stage.name}</h3>
                      <span className="text-xs font-semibold text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full">{stageLeads.length}</span>
                    </div>
                    <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal size={16} /></button>
                  </div>
                  <div className="text-sm font-medium text-slate-500 mb-3">
                    R$ {totalValue.toLocaleString('pt-BR')}
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-3 pb-2">
                    {stageLeads.map(lead => {
                      const isWon = lead.stage_id === activeFunnel?.default_won_stage_id;
                      
                      return (
                        <div 
                          key={lead.id} 
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead.id)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer ${
                            isWon 
                              ? 'bg-green-50/50 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.15)] hover:shadow-green-100 ring-2 ring-green-500/20' 
                              : 'bg-white border-gray-200 shadow-sm hover:shadow-md'
                          }`} 
                          onClick={() => onNavigate('lead-detail', lead.id)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-xs font-bold text-indigo-600 truncate mr-2">{lead.company || 'Sem empresa'}</div>
                            {isWon && (
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm">
                                <Check size={8} />
                                Vendido
                              </span>
                            )}
                          </div>
                          
                          <h4 className={`font-bold mb-2 ${isWon ? 'text-green-900' : 'text-slate-900'}`}>{lead.title}</h4>
                          
                          <div className="text-sm font-semibold text-slate-700 mb-3">
                            R$ {(lead.value || 0).toLocaleString('pt-BR')}
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-slate-500">
                              {lead.created_at ? new Date(lead.created_at).toLocaleDateString('pt-BR') : 'Hoje'}
                            </div>
                            {lead.assigned_user_id && (
                              <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white text-[10px] font-bold">
                                {lead.assigned_user_name ? lead.assigned_user_name.charAt(0).toUpperCase() : 'U'}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <button 
                    onClick={() => handleCreateLead(stage.id)}
                    className="mt-3 flex items-center justify-center gap-2 w-full py-2 border-2 border-dashed border-gray-300 rounded-xl text-slate-500 hover:text-slate-700 hover:border-gray-400 hover:bg-gray-50 transition-all font-medium text-sm"
                  >
                    <Plus size={16} />
                    Adicionar
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
