import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, MoreHorizontal, Check, Filter, X, 
  Calendar, Clock, Target, CheckCircle2, 
  ArrowRight, Search, RotateCcw, LayoutGrid, 
  List, Sparkles, ChevronDown, TrendingUp,
  BarChart3, User
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { DatePicker } from './ui/DatePicker';

type SortOrder = 'desc' | 'asc';
type StatusFilter = 'all' | 'open' | 'won' | 'lost';

export const KanbanBoard = ({ onNavigate }: any) => {
  const { currentUser } = useCRM();
  const [funnels, setFunnels] = useState<any[]>([]);
  const [activeFunnelId, setActiveFunnelId] = useState<string>('');
  const [leads, setLeads] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<'kanban' | 'list'>('kanban');
  
  // --- Filter State ---
  const [showFilters, setShowFilters] = useState(false);
  const [filterUsers, setFilterUsers] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  // Date Filters
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
      const [funnelsRes, leadsRes, usersRes] = await Promise.all([
        fetch('/api/funnels'),
        fetch('/api/leads'),
        fetch('/api/users')
      ]);
      
      const funnelsData = await funnelsRes.json();
      const leadsData = await leadsRes.json();
      const usersData = await usersRes.json();
      
      if (Array.isArray(funnelsData)) {
        setFunnels(funnelsData);
        if (funnelsData.length > 0 && !activeFunnelId) {
          setActiveFunnelId(funnelsData[0].id);
        }
      }
      
      if (Array.isArray(leadsData)) setLeads(leadsData);
      if (Array.isArray(usersData)) setUsers(usersData);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const activeFunnel = funnels.find(f => f.id === activeFunnelId);
  const stages = activeFunnel?.stages || [];

  // --- Filtering & Sorting Logic ---
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
    let result = leads.filter(lead => {
      // 1. Funnel match
      if (lead.funnel_id !== activeFunnelId) return false;
      
      // 2. User Filter (Multi-select)
      if (filterUsers.length > 0 && !filterUsers.includes(lead.assigned_user_id)) return false;

      // 3. Status Filter
      if (filterStatus !== 'all') {
        const isWon = lead.stage_id === activeFunnel?.default_won_stage_id;
        const isLost = lead.stage_id === activeFunnel?.default_lost_stage_id;
        if (filterStatus === 'won' && !isWon) return false;
        if (filterStatus === 'lost' && !isLost) return false;
        if (filterStatus === 'open' && (isWon || isLost)) return false;
      }
      
      // 4. Date Filters
      if (!isDateInRange(lead.created_at, filterCreation)) return false;
      if (!isDateInRange(lead.last_contact_at, filterLastContact)) return false;
      if (!isDateInRange(lead.next_task_at, filterNextTask)) return false;
      if (!isDateInRange(lead.closed_at, filterClosed)) return false;
      if (!isDateInRange(lead.closing_forecast_at, filterForecast)) return false;
      
      return true;
    });

    // 5. Sorting
    result.sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [leads, activeFunnelId, filterUsers, filterStatus, filterCreation, filterLastContact, filterNextTask, filterClosed, filterForecast, sortOrder, activeFunnel]);

  const toggleUserFilter = (userId: string) => {
    setFilterUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const hasActiveFilters = filterCreation.start || filterCreation.end || 
                          filterLastContact.start || filterLastContact.end ||
                          filterNextTask.start || filterNextTask.end ||
                          filterClosed.start || filterClosed.end ||
                          filterForecast.start || filterForecast.end ||
                          filterUsers.length > 0 || filterStatus !== 'all';

  const resetFilters = () => {
    setFilterCreation({ start: '', end: '' });
    setFilterLastContact({ start: '', end: '' });
    setFilterNextTask({ start: '', end: '' });
    setFilterClosed({ start: '', end: '' });
    setFilterForecast({ start: '', end: '' });
    setFilterUsers([]);
    setFilterStatus('all');
  };

  const handleCreateLead = async (stageId?: string) => {
    const targetStageId = stageId || (stages.length > 0 ? stages[0].id : '');
    const newLead = {
      title: 'Nova Negociação',
      company: 'Empresa',
      value: 0,
      funnel_id: activeFunnelId,
      stage_id: targetStageId,
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
        body: JSON.stringify({ stage_id: stageId, closed_at: closed_at })
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
        
        {/* ROW 1: Toggles, Action Link, Controls */}
        <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-6">
            <div className="flex items-center p-1 bg-slate-100 rounded-xl">
              <button 
                onClick={() => setActiveView('kanban')}
                className={`p-2 rounded-lg transition-all ${activeView === 'kanban' ? 'bg-[#003B4F] text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <LayoutGrid size={18} />
              </button>
              <button 
                onClick={() => setActiveView('list')}
                className={`p-2 rounded-lg transition-all ${activeView === 'list' ? 'bg-cyan-100 text-cyan-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <List size={18} />
              </button>
            </div>
            
            <button className="flex items-center gap-2 text-[#0077b6] font-bold text-sm hover:opacity-80 transition-all">
              <Sparkles size={16} className="text-cyan-500" />
              Priorizar negociações
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 p-1 border border-slate-100 rounded-xl mr-2">
               <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg transition-all">
                <MoreHorizontal size={18} />
              </button>
              <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg transition-all">
                <Calendar size={18} />
              </button>
              <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg transition-all">
                <TrendingUp size={18} />
              </button>
            </div>
            
            <button 
              onClick={() => handleCreateLead()}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#003B4F] text-white rounded-xl font-bold text-sm hover:bg-[#002a3a] transition-all shadow-lg shadow-slate-200"
            >
              <Plus size={18} />
              Criar
            </button>
          </div>
        </div>

        {/* ROW 2: Filters Dropdowns */}
        <div className="px-6 py-2 bg-white border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="flex-1 flex items-center gap-3 overflow-x-auto no-scrollbar">
            
            {/* Funnel Select */}
            <div className="min-w-[180px] relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-600 transition-colors">
                <Filter size={14} />
              </div>
              <select 
                value={activeFunnelId} 
                onChange={(e) => setActiveFunnelId(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none hover:border-indigo-200 focus:ring-2 focus:ring-indigo-500/10 cursor-pointer appearance-none transition-all shadow-sm"
              >
                {funnels.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
            </div>

            {/* User Select (Multi) */}
            <div className="min-w-[200px] relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <User size={14} />
              </div>
              <div className="w-full flex items-center justify-between pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none hover:border-indigo-200 transition-all cursor-pointer shadow-sm group">
                <span className="truncate">
                  {filterUsers.length === 0 ? "Todos os usuários" : `${filterUsers.length} usuários selecionados`}
                </span>
                <ChevronDown size={14} className="text-slate-300 transition-transform group-hover:rotate-180" />
                
                {/* Popover */}
                <div className="absolute top-[calc(100%+8px)] left-0 w-64 bg-white border border-slate-100 rounded-2xl shadow-2xl p-2 z-[60] hidden group-hover:block animate-in fade-in zoom-in-95 duration-200">
                  <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar">
                    {users.map(user => (
                      <div 
                        key={user.id} 
                        onClick={(e) => { e.stopPropagation(); toggleUserFilter(user.id); }}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${filterUsers.includes(user.id) ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50'}`}
                      >
                         <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${filterUsers.includes(user.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                          {filterUsers.includes(user.id) && <Check size={10} className="text-white" />}
                        </div>
                        <span className="text-[11px] font-bold">{user.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Status Select */}
            <div className="min-w-[160px] relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <CheckCircle2 size={14} />
              </div>
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as StatusFilter)}
                className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none hover:border-indigo-200 focus:ring-2 focus:ring-indigo-500/10 cursor-pointer appearance-none transition-all shadow-sm"
              >
                <option value="all">Todos os status</option>
                <option value="open">Aberto</option>
                <option value="won">Ganhos (Fechado)</option>
                <option value="lost">Perdidos</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
            </div>

            {/* Sorting Select */}
            <div className="min-w-[180px] relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <BarChart3 size={14} className="rotate-90" />
              </div>
              <select 
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none hover:border-indigo-200 focus:ring-2 focus:ring-indigo-500/10 cursor-pointer appearance-none transition-all shadow-sm"
              >
                <option value="desc">Criadas por último</option>
                <option value="asc">Criadas primeiro</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
            </div>

          </div>

          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm border ${
              showFilters || hasActiveFilters 
                ? 'bg-[#e0f7fa] border-[#b2ebf2] text-[#00838f]' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Filter size={18} />
            Filtros ({[filterCreation, filterLastContact, filterNextTask, filterClosed, filterForecast].filter(f => f.start || f.end).length + (filterUsers.length > 0 ? 1 : 0) + (filterStatus !== 'all' ? 1 : 0)})
          </button>
        </div>

        {/* ACTIVE FILTERS BAR */}
        <div className="px-6 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2 flex-wrap min-h-[44px]">
           <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest bg-white border border-slate-100 px-3 py-1 rounded-lg">
            {filteredLeads.length} Negociações
          </span>
          {filterUsers.map(id => {
            const user = users.find(u => u.id === id);
            return (
              <div key={id} className="flex items-center gap-2 px-3 py-1 bg-white border border-indigo-100 rounded-lg text-indigo-600 text-[11px] font-bold shadow-sm">
                <User size={10} />
                {user?.name}
                <button onClick={() => toggleUserFilter(id)} className="hover:text-red-500 transition-colors">
                  <X size={12} />
                </button>
              </div>
            );
          })}
          {hasActiveFilters && (
            <button 
              onClick={resetFilters}
              className="text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest pl-2 transition-colors"
            >
              Limpar Tudo
            </button>
          )}
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
                  className="w-80 flex flex-col h-full rounded-2xl bg-slate-200/30 border border-slate-200/40 p-2"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, stage.id)}
                >
                  <div className="p-3 mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color || '#6366f1' }}></div>
                       <h3 className="font-black text-slate-800 uppercase tracking-widest text-[10px]">{stage.name}</h3>
                       <span className="text-[10px] font-black text-slate-400 ml-1">{stageLeads.length}</span>
                    </div>
                    <div className="text-[11px] font-black text-slate-600">
                      R$ {totalValue.toLocaleString('pt-BR')}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 pb-2 custom-scrollbar px-1">
                    {stageLeads.map(lead => {
                      const isWon = lead.stage_id === activeFunnel?.default_won_stage_id;
                      const leadUser = users.find(u => u.id === lead.assigned_user_id);
                      
                      return (
                        <div 
                          key={lead.id} 
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead.id)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer group relative ${
                            isWon 
                              ? 'bg-green-50/70 border-green-400 shadow-[0_4px_12px_rgba(34,197,94,0.08)]' 
                              : 'bg-white border-slate-200/80 shadow-sm hover:shadow-md hover:-translate-y-0.5'
                          }`} 
                          onClick={() => onNavigate('lead-detail', lead.id)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate mr-2">{lead.company || 'Sem empresa'}</div>
                            {isWon && (
                               <span className="px-2 py-0.5 bg-green-500 text-white rounded-full text-[8px] font-black uppercase tracking-widest">Ganhou</span>
                            )}
                          </div>
                          
                          <h4 className={`font-bold mb-3 leading-tight text-sm ${isWon ? 'text-green-900' : 'text-slate-900'}`}>{lead.title}</h4>
                          
                          <div className="flex items-center justify-between mt-4">
                            <div className="font-black text-slate-800 text-xs tracking-tight">
                              R$ {(lead.value || 0).toLocaleString('pt-BR')}
                            </div>
                            <div className="flex items-center gap-2">
                              {lead.next_task_at && (
                                <div className="text-orange-500" title={`Tarefa próxima`}>
                                  <Clock size={12} />
                                </div>
                              )}
                              <div className="w-6 h-6 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center text-[10px] font-black border border-slate-100 group-hover:border-indigo-200 transition-all">
                                {leadUser?.name.charAt(0).toUpperCase() || '?'}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    <button 
                      onClick={() => handleCreateLead(stage.id)}
                      className="w-full py-4 border-2 border-dashed border-slate-200/60 rounded-xl text-slate-400 hover:border-indigo-300 hover:text-indigo-600 hover:bg-white transition-all flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest"
                    >
                      <Plus size={12} />
                      Nova Negociação
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Date Filter Drawer */}
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
            <FilterDateSection title="Data de Criação" icon={<Calendar size={14} />} value={filterCreation} onChange={setFilterCreation} />
            <FilterDateSection title="Último Contato" icon={<Calendar size={14} />} value={filterLastContact} onChange={setFilterLastContact} />
            <FilterDateSection title="Próxima Tarefa" icon={<Clock size={14} />} value={filterNextTask} onChange={setFilterNextTask} />
            <FilterDateSection title="Data de Fechamento" icon={<Target size={14} />} value={filterClosed} onChange={setFilterClosed} />
            <FilterDateSection title="Previsão de Fechamento" icon={<Target size={14} />} value={filterForecast} onChange={setFilterForecast} />
          </div>

          <div className="mt-auto pt-8 flex gap-3 pb-6">
            <button onClick={resetFilters} className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
              <RotateCcw size={14} /> Limpar
            </button>
            <button onClick={() => setShowFilters(false)} className="flex-1 px-4 py-3 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-all shadow-xl shadow-slate-200/50">
              Aplicar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

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
