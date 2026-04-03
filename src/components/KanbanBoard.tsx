import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, MoreHorizontal, Check, Filter, X, 
  Calendar, Clock, Target, CheckCircle2, 
  ArrowRight, Search, RotateCcw
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';

export const KanbanBoard = ({ onNavigate }: any) => {
  const { currentUser } = useCRM();
  const [funnels, setFunnels] = useState<any[]>([]);
  const [activeFunnelId, setActiveFunnelId] = useState<string>('');
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // --- Filter State ---
  const [showFilters, setShowFilters] = useState(false);
  const [filterCreation, setFilterCreation] = useState({ start: '', end: '' });
  const [filterLastContact, setFilterLastContact] = useState({ start: '', end: '' });
  const [filterNextTask, setFilterNextTask] = useState({ start: '', end: '' });
  const [filterClosed, setFilterClosed] = useState({ start: '', end: '' });
  const [filterForecast, setFilterForecast] = useState({ start: '', end: '' });

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
      }
      
      if (Array.isArray(leadsData)) {
        setLeads(leadsData);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const activeFunnel = funnels.find(f => f.id === activeFunnelId);
  const stages = activeFunnel?.stages || [];

  // --- Filtering Logic ---
  const isDateInRange = (dateStr: string | null, range: { start: string, end: string }) => {
    if (!range.start && !range.end) return true;
    if (!dateStr) return false;
    
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    
    if (range.start) {
      const start = new Date(range.start);
      start.setHours(0, 0, 0, 0);
      if (date < start) return false;
    }
    
    if (range.end) {
      const end = new Date(range.end);
      end.setHours(23, 59, 59, 999);
      if (date > end) return false;
    }
    
    return true;
  };

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      // 1. Funnel match
      if (lead.funnel_id !== activeFunnelId) return false;
      
      // 2. Date Filters
      if (!isDateInRange(lead.created_at, filterCreation)) return false;
      if (!isDateInRange(lead.last_contact_at, filterLastContact)) return false;
      if (!isDateInRange(lead.next_task_at, filterNextTask)) return false;
      if (!isDateInRange(lead.closed_at, filterClosed)) return false;
      if (!isDateInRange(lead.closing_forecast_at, filterForecast)) return false;
      
      return true;
    });
  }, [leads, activeFunnelId, filterCreation, filterLastContact, filterNextTask, filterClosed, filterForecast]);

  const hasActiveFilters = filterCreation.start || filterCreation.end || 
                          filterLastContact.start || filterLastContact.end ||
                          filterNextTask.start || filterNextTask.end ||
                          filterClosed.start || filterClosed.end ||
                          filterForecast.start || filterForecast.end;

  const resetFilters = () => {
    setFilterCreation({ start: '', end: '' });
    setFilterLastContact({ start: '', end: '' });
    setFilterNextTask({ start: '', end: '' });
    setFilterClosed({ start: '', end: '' });
    setFilterForecast({ start: '', end: '' });
  };

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
      const data = await res.json();
      setLeads([...leads, data]);
      onNavigate('lead-detail', data.id);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('leadId', leadId);
  };

  const handleDrop = async (e: React.DragEvent, stageId: string) => {
    const leadId = e.dataTransfer.getData('leadId');
    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.stage_id === stageId) return;

    // Optimistic Update
    const oldLeads = [...leads];
    const isWon = stageId === activeFunnel?.default_won_stage_id;
    const isLost = stageId === activeFunnel?.default_lost_stage_id;
    const closed_at = (isWon || isLost) ? new Date().toISOString() : lead.closed_at;

    setLeads(leads.map(l => l.id === leadId ? { ...l, stage_id: stageId, closed_at } : l));

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          stage_id: stageId,
          closed_at: closed_at
        })
      });
      if (!res.ok) throw new Error('Failed');
    } catch (error) {
      setLeads(oldLeads);
      fetchData();
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="h-full flex relative bg-slate-50 overflow-hidden">
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-6 py-4 border-b border-gray-200 bg-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Pipeline de Vendas</h1>
              <div className="flex items-center gap-3 mt-1">
                {funnels.length > 0 && (
                  <select 
                    value={activeFunnelId} 
                    onChange={(e) => setActiveFunnelId(e.target.value)}
                    className="text-xs font-black uppercase tracking-widest border-2 border-slate-100 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 active:scale-95 transition-all bg-slate-50 text-indigo-600"
                  >
                    {funnels.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                )}
                <span className="text-xs font-bold text-slate-400">
                  {filteredLeads.length} leads no total
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all border shadow-sm ${
                showFilters || hasActiveFilters 
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-600' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Filter size={18} />
              Filtros {hasActiveFilters && <span className="w-5 h-5 bg-indigo-600 text-white rounded-full text-[10px] flex items-center justify-center ml-1 animate-in zoom-in">!</span>}
            </button>
            <button className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
              <Plus size={18} />
              Novo Lead
            </button>
          </div>
        </div>

        {/* Kanban Content */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
          <div className="flex gap-6 h-full items-start min-w-max">
            {stages.map((stage: any) => {
              const stageLeads = filteredLeads.filter(l => l.stage_id === stage.id);
              const totalValue = stageLeads.reduce((sum, l) => sum + (l.value || 0), 0);

              return (
                <div 
                  key={stage.id} 
                  className="w-80 flex flex-col h-full rounded-2xl bg-slate-100/50 border border-slate-200/60 p-2"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, stage.id)}
                >
                  <div className="p-3 mb-2">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color || '#6366f1' }}></div>
                        <h3 className="font-black text-slate-800 uppercase tracking-widest text-[11px] truncate max-w-[140px]">{stage.name}</h3>
                        <span className="bg-white px-2 py-0.5 rounded-full text-[10px] font-black text-slate-400 border border-slate-200">{stageLeads.length}</span>
                      </div>
                      <button className="text-slate-400 hover:text-slate-600 transition-colors">
                        <MoreHorizontal size={16} />
                      </button>
                    </div>
                    <div className="text-sm font-black text-slate-600 tracking-tight">
                      R$ {totalValue.toLocaleString('pt-BR')}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 pb-2 custom-scrollbar px-1">
                    {stageLeads.map(lead => {
                      const isWon = lead.stage_id === activeFunnel?.default_won_stage_id;
                      
                      return (
                        <div 
                          key={lead.id} 
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead.id)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer group relative ${
                            isWon 
                              ? 'bg-green-50/50 border-green-500 shadow-[0_4px_12px_rgba(34,197,94,0.1)] ring-2 ring-green-500/10' 
                              : 'bg-white border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5'
                          }`} 
                          onClick={() => onNavigate('lead-detail', lead.id)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest truncate mr-2">{lead.company || 'Sem empresa'}</div>
                            {isWon && (
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500 text-white rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm">
                                <Check size={8} />
                                Vendido
                              </span>
                            )}
                          </div>
                          
                          <h4 className={`font-bold mb-2 leading-tight ${isWon ? 'text-green-900' : 'text-slate-900'}`}>{lead.title}</h4>
                          
                          <div className="flex items-center justify-between mt-4">
                            <div className="font-black text-slate-800 text-sm tracking-tight">
                              R$ {(lead.value || 0).toLocaleString('pt-BR')}
                            </div>
                            <div className="flex items-center gap-2">
                              {lead.next_task_at && (
                                <div className="text-orange-500" title={`Tarefa em ${new Date(lead.next_task_at).toLocaleDateString()}`}>
                                  <Clock size={12} />
                                </div>
                              )}
                              {lead.assigned_user_id && (
                                <div className="w-5 h-5 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center text-[10px] font-black border border-orange-200">
                                  {lead.assigned_user_name ? lead.assigned_user_name.charAt(0).toUpperCase() : 'U'}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    <button 
                      onClick={() => handleCreateLead(stage.id)}
                      className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all flex items-center justify-center gap-2 font-bold text-xs"
                    >
                      <Plus size={14} />
                      Nova Negociação
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filter Drawer */}
      <div className={`fixed inset-y-0 right-0 w-[400px] bg-white shadow-2xl z-50 border-l border-slate-200 transition-transform duration-300 ease-in-out ${showFilters ? 'translate-x-0' : 'translate-x-[400px]'}`}>
        <div className="h-full flex flex-col p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Filter size={20} className="text-indigo-600" />
              Filtros Avançados
            </h2>
            <button onClick={() => setShowFilters(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-50 rounded-lg">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-8">
            <FilterDateSection 
              title="Data de Criação" 
              icon={<Calendar size={14} />}
              value={filterCreation} 
              onChange={setFilterCreation} 
            />
            <FilterDateSection 
              title="Último Contato" 
              icon={<Calendar size={14} />}
              value={filterLastContact} 
              onChange={setFilterLastContact} 
            />
            <FilterDateSection 
              title="Próxima Tarefa" 
              icon={<Clock size={14} />}
              value={filterNextTask} 
              onChange={setFilterNextTask} 
            />
            <FilterDateSection 
              title="Data de Fechamento" 
              icon={<Target size={14} />}
              value={filterClosed} 
              onChange={setFilterClosed} 
            />
            <FilterDateSection 
              title="Previsão de Fechamento" 
              icon={<Target size={14} />}
              value={filterForecast} 
              onChange={setFilterForecast} 
            />
          </div>

          <div className="mt-auto pt-8 flex gap-3 pb-6">
            <button 
              onClick={resetFilters}
              className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw size={14} />
              Limpar
            </button>
            <button 
              onClick={() => setShowFilters(false)}
              className="flex-1 px-4 py-3 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-all shadow-xl shadow-slate-200/50"
            >
              Aplicar
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

import { DatePicker } from './ui/DatePicker';

const FilterDateSection = ({ title, icon, value, onChange }: any) => (
  <div className="animate-in fade-in slide-in-from-right-4 duration-500">
    <div className="flex items-center gap-2 mb-3">
      <div className="w-6 h-6 bg-slate-50 text-slate-400 rounded-md flex items-center justify-center border border-slate-100">
        {icon}
      </div>
      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{title}</h3>
    </div>
    <DatePicker value={value} onChange={onChange} />
  </div>
);
