import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus, Check, Filter, X,
  Calendar, Clock, Target, CheckCircle2,
  LayoutGrid, List, ChevronDown, BarChart3, User,
  Building2, DollarSign, GripVertical, RotateCcw
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { DatePicker } from './ui/DatePicker';
import { createPortal } from 'react-dom';

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
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userDropdownButtonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);

  // Dropdown states para outros filtros
  const [showFunnelDropdown, setShowFunnelDropdown] = useState(false);
  const funnelDropdownButtonRef = useRef<HTMLButtonElement>(null);
  const [funnelDropdownPosition, setFunnelDropdownPosition] = useState<{ top: number; left: number } | null>(null);

  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const statusDropdownButtonRef = useRef<HTMLButtonElement>(null);
  const [statusDropdownPosition, setStatusDropdownPosition] = useState<{ top: number; left: number } | null>(null);

  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const sortDropdownButtonRef = useRef<HTMLButtonElement>(null);
  const [sortDropdownPosition, setSortDropdownPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (showUserDropdown && userDropdownButtonRef.current) {
      const rect = userDropdownButtonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left
      });
    }
    if (showFunnelDropdown && funnelDropdownButtonRef.current) {
      const rect = funnelDropdownButtonRef.current.getBoundingClientRect();
      setFunnelDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left
      });
    }
    if (showStatusDropdown && statusDropdownButtonRef.current) {
      const rect = statusDropdownButtonRef.current.getBoundingClientRect();
      setStatusDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left
      });
    }
    if (showSortDropdown && sortDropdownButtonRef.current) {
      const rect = sortDropdownButtonRef.current.getBoundingClientRect();
      setSortDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left
      });
    }
  }, [showUserDropdown, showFunnelDropdown, showStatusDropdown, showSortDropdown]);
  
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
      if (Array.isArray(usersData)) {
        console.log('Users loaded:', usersData);
        setUsers(usersData);
      } else {
        console.error('Users data is not an array:', usersData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const activeFunnel = funnels.find(f => f.id === activeFunnelId);
  const stages = activeFunnel?.stages || [];

  // List view helper
  const ListTableView = () => {
    const getStageName = (stageId: string) => {
      const stage = stages.find((s: any) => s.id === stageId);
      return stage ? stage.name : '-';
    };

    const getStageColor = (stageId: string) => {
      const stage = stages.find((s: any) => s.id === stageId);
      return stage?.color || '#3b82f6';
    };

    return (
      <div className="flex-1 overflow-auto p-6">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Título</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Empresa</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Etapa</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Responsável</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Valor</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Criado em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white rounded-xl border border-slate-200">
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  Nenhuma negociação encontrada.
                </td>
              </tr>
            ) : (
              filteredLeads.map(lead => {
                const leadUser = users.find(u => String(u.id) === String(lead.assigned_user_id));
                const stageColor = getStageColor(lead.stage_id);
                return (
                  <tr 
                    key={lead.id} 
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => onNavigate('lead-detail', lead.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 text-sm">{lead.title}</div>
                      {lead.contact_name && <div className="text-xs text-slate-400">{lead.contact_name}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{lead.company || '-'}</td>
                    <td className="px-4 py-3">
                      <span 
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                        style={{ backgroundColor: `${stageColor}20`, color: stageColor }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stageColor }}></span>
                        {getStageName(lead.stage_id)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {leadUser ? (
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                            {leadUser.name?.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-slate-700">{leadUser.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">Não atribuído</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-700 text-sm">
                      R$ {(lead.value || 0).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-slate-500">
                      {lead.created_at ? new Date(lead.created_at).toLocaleDateString('pt-BR') : '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  };

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
      if (String(lead.funnel_id) !== String(activeFunnelId)) return false;
      
      // 2. User Filter (Multi-select)
      if (filterUsers.length > 0) {
        if (!lead.assigned_user_id) return false;
        if (!filterUsers.includes(String(lead.assigned_user_id))) return false;
      }

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

    result.sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [leads, activeFunnelId, filterUsers, filterStatus, filterCreation, filterLastContact, filterNextTask, filterClosed, filterForecast, sortOrder, activeFunnel]);

  const toggleUserFilter = (userId: string) => {
    const idStr = String(userId);
    setFilterUsers(prev => 
      prev.includes(idStr) ? prev.filter(id => id !== idStr) : [...prev, idStr]
    );
  };

  const hasActiveFilters = filterCreation.start || filterCreation.end || 
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
    return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-4 border-[#0F172A] border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="h-full flex relative bg-slate-50/50 overflow-hidden">
      
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* ROW 1: View Toggles & Actions */}
        <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
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
          </div>

          <button 
            onClick={() => handleCreateLead()}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#003B4F] text-white rounded-xl font-bold text-sm hover:bg-[#002a3a] transition-all shadow-lg active:scale-95"
          >
            <Plus size={18} />
            Criar
          </button>
        </div>

        {/* ROW 2: Filters Dropdowns */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="flex-1 flex items-center gap-3 overflow-x-auto no-scrollbar">
            
            {/* Invisible backdrop to close dropdowns on outside click */}
            {(showFunnelDropdown || showUserDropdown || showStatusDropdown || showSortDropdown) && (
              <div
                className="fixed inset-0 z-[50]"
                onClick={() => {
                  setShowFunnelDropdown(false);
                  setShowUserDropdown(false);
                  setShowStatusDropdown(false);
                  setShowSortDropdown(false);
                }}
              />
            )}

            {/* Funnel Dropdown */}
            <div className="min-w-[180px] relative" style={{ zIndex: showFunnelDropdown ? 61 : 'auto' }}>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10">
                <Filter size={14} />
              </div>
              <button
                ref={funnelDropdownButtonRef}
                type="button"
                onClick={() => setShowFunnelDropdown(prev => !prev)}
                className={`w-full flex items-center justify-between pl-9 pr-3 py-2.5 bg-white border rounded-xl text-[11px] font-bold text-slate-700 hover:border-slate-300 transition-all cursor-pointer ${
                  activeFunnelId ? 'border-indigo-400 text-indigo-700 bg-indigo-50' : 'border-slate-200'
                }`}
              >
                <span className="truncate">
                  {funnels.find(f => f.id === activeFunnelId)?.name || 'Todos os funis'}
                </span>
                <ChevronDown size={14} className={`text-slate-300 transition-transform ${showFunnelDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showFunnelDropdown && funnelDropdownPosition && createPortal(
                <div
                  className="w-64 bg-white border border-slate-100 rounded-2xl shadow-2xl p-2"
                  style={{
                    position: 'fixed',
                    top: `${funnelDropdownPosition.top}px`,
                    left: `${funnelDropdownPosition.left}px`,
                    zIndex: 1000
                  }}
                >
                  <div className="max-h-60 overflow-y-auto space-y-1 no-scrollbar">
                    {funnels.map(funnel => (
                      <div
                        key={funnel.id}
                        onClick={() => {
                          setActiveFunnelId(funnel.id);
                          setShowFunnelDropdown(false);
                        }}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer ${
                          activeFunnelId === funnel.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                          activeFunnelId === funnel.id ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                        }`}>
                          {activeFunnelId === funnel.id && <Check size={10} className="text-white" />}
                        </div>
                        <span className="text-[11px] font-bold">{funnel.name}</span>
                      </div>
                    ))}
                  </div>
                </div>,
                document.body
              )}
            </div>

            <div className="min-w-[180px] relative" style={{ zIndex: showUserDropdown ? 61 : 'auto' }}>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10">
                <User size={14} />
              </div>
              <button
                ref={userDropdownButtonRef}
                type="button"
                onClick={() => {
                  console.log('Toggle user dropdown, users:', users);
                  setShowUserDropdown(prev => !prev);
                }}
                className={`w-full flex items-center justify-between pl-9 pr-3 py-2.5 bg-white border rounded-xl text-[11px] font-bold text-slate-700 hover:border-slate-300 transition-all cursor-pointer ${
                  filterUsers.length > 0 ? 'border-indigo-400 text-indigo-700 bg-indigo-50' : 'border-slate-200'
                }`}
              >
                <span className="truncate">
                  {filterUsers.length === 0 ? 'Todos os usuários' : `${filterUsers.length} selecionado(s)`}
                </span>
                <ChevronDown size={14} className={`text-slate-300 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showUserDropdown && dropdownPosition && createPortal(
                <div
                  className="w-64 bg-white border border-slate-100 rounded-2xl shadow-2xl p-2"
                  style={{
                    position: 'fixed',
                    top: `${dropdownPosition.top}px`,
                    left: `${dropdownPosition.left}px`,
                    zIndex: 1000
                  }}
                >
                  <div className="max-h-60 overflow-y-auto space-y-1 no-scrollbar">
                    {users.length === 0 && (
                      <p className="text-[11px] text-slate-400 text-center py-3">Nenhum usuário encontrado</p>
                    )}
                    {users.map(user => (
                      <div
                        key={user.id}
                        onClick={() => toggleUserFilter(user.id)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer ${
                          filterUsers.includes(String(user.id)) ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                          filterUsers.includes(String(user.id)) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                        }`}>
                          {filterUsers.includes(String(user.id)) && <Check size={10} className="text-white" />}
                        </div>
                        <span className="text-[11px] font-bold">{user.name}</span>
                      </div>
                    ))}
                  </div>
                </div>,
                document.body
              )}
            </div>

            {/* Status Dropdown */}
            <div className="min-w-[180px] relative" style={{ zIndex: showStatusDropdown ? 61 : 'auto' }}>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10">
                <CheckCircle2 size={14} />
              </div>
              <button
                ref={statusDropdownButtonRef}
                type="button"
                onClick={() => setShowStatusDropdown(prev => !prev)}
                className={`w-full flex items-center justify-between pl-9 pr-3 py-2.5 bg-white border rounded-xl text-[11px] font-bold text-slate-700 hover:border-slate-300 transition-all cursor-pointer ${
                  filterStatus !== 'all' ? 'border-green-400 text-green-700 bg-green-50' : 'border-slate-200'
                }`}
              >
                <span className="truncate">
                  {filterStatus === 'all' ? 'Todos os status' : 
                   filterStatus === 'open' ? 'Aberto' :
                   filterStatus === 'won' ? 'Ganhos' : 'Perdidos'}
                </span>
                <ChevronDown size={14} className={`text-slate-300 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showStatusDropdown && statusDropdownPosition && createPortal(
                <div
                  className="w-64 bg-white border border-slate-100 rounded-2xl shadow-2xl p-2"
                  style={{
                    position: 'fixed',
                    top: `${statusDropdownPosition.top}px`,
                    left: `${statusDropdownPosition.left}px`,
                    zIndex: 1000
                  }}
                >
                  <div className="max-h-60 overflow-y-auto space-y-1 no-scrollbar">
                    {[
                      { value: 'all', label: 'Todos os status' },
                      { value: 'open', label: 'Aberto' },
                      { value: 'won', label: 'Ganhos' },
                      { value: 'lost', label: 'Perdidos' }
                    ].map(status => (
                      <div
                        key={status.value}
                        onClick={() => {
                          setFilterStatus(status.value as StatusFilter);
                          setShowStatusDropdown(false);
                        }}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer ${
                          filterStatus === status.value ? 'bg-green-50 text-green-700' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                          filterStatus === status.value ? 'bg-green-600 border-green-600' : 'border-slate-300'
                        }`}>
                          {filterStatus === status.value && <Check size={10} className="text-white" />}
                        </div>
                        <span className="text-[11px] font-bold">{status.label}</span>
                      </div>
                    ))}
                  </div>
                </div>,
                document.body
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="min-w-[180px] relative" style={{ zIndex: showSortDropdown ? 61 : 'auto' }}>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10">
                <BarChart3 size={14} className="rotate-90" />
              </div>
              <button
                ref={sortDropdownButtonRef}
                type="button"
                onClick={() => setShowSortDropdown(prev => !prev)}
                className={`w-full flex items-center justify-between pl-9 pr-3 py-2.5 bg-white border rounded-xl text-[11px] font-bold text-slate-700 hover:border-slate-300 transition-all cursor-pointer ${
                  sortOrder !== 'desc' ? 'border-purple-400 text-purple-700 bg-purple-50' : 'border-slate-200'
                }`}
              >
                <span className="truncate">
                  {sortOrder === 'desc' ? 'Criadas por último' : 'Criadas primeiro'}
                </span>
                <ChevronDown size={14} className={`text-slate-300 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showSortDropdown && sortDropdownPosition && createPortal(
                <div
                  className="w-64 bg-white border border-slate-100 rounded-2xl shadow-2xl p-2"
                  style={{
                    position: 'fixed',
                    top: `${sortDropdownPosition.top}px`,
                    left: `${sortDropdownPosition.left}px`,
                    zIndex: 1000
                  }}
                >
                  <div className="max-h-60 overflow-y-auto space-y-1 no-scrollbar">
                    {[
                      { value: 'desc', label: 'Criadas por último' },
                      { value: 'asc', label: 'Criadas primeiro' }
                    ].map(sort => (
                      <div
                        key={sort.value}
                        onClick={() => {
                          setSortOrder(sort.value as SortOrder);
                          setShowSortDropdown(false);
                        }}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer ${
                          sortOrder === sort.value ? 'bg-purple-50 text-purple-700' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                          sortOrder === sort.value ? 'bg-purple-600 border-purple-600' : 'border-slate-300'
                        }`}>
                          {sortOrder === sort.value && <Check size={10} className="text-white" />}
                        </div>
                        <span className="text-[11px] font-bold">{sort.label}</span>
                      </div>
                    ))}
                  </div>
                </div>,
                document.body
              )}
            </div>

          </div>

          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-[11px] transition-all border ${
              showFilters || hasActiveFilters 
                ? 'bg-cyan-50 border-cyan-200 text-cyan-700' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Filter size={16} />
            Filtros ({[filterCreation, filterLastContact, filterNextTask, filterClosed, filterForecast].filter(f => f.start || f.end).length + (filterUsers.length > 0 ? 1 : 0) + (filterStatus !== 'all' ? 1 : 0)})
          </button>
        </div>

        {/* ROW 3: Active Filters chips */}
        <div className="px-6 py-2 bg-slate-50/40 border-b border-slate-100 flex items-center gap-2 flex-wrap min-h-[40px]">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white border border-slate-200/50 px-3 py-1 rounded-lg">
            {filteredLeads.length} Negociações
          </span>
          {filterUsers.map(id => {
            const user = users.find(u => String(u.id) === String(id));
            return (
              <div key={id} className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-600 text-[10px] font-bold shadow-sm">
                <User size={10} className="text-slate-400" />
                {user?.name}
                <button onClick={() => toggleUserFilter(id)} className="hover:text-red-500 transition-colors">
                  <X size={12} />
                </button>
              </div>
            );
          })}
          {hasActiveFilters && (
            <button onClick={resetFilters} className="text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest pl-2 transition-colors">
              Limpar Tudo
            </button>
          )}
        </div>

        {/* Content Area */}
        {activeView === 'kanban' ? (
          <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 custom-scrollbar">
            <div className="flex gap-6 h-full items-start">
              {stages.map((stage: any) => {
                const stageLeads = filteredLeads.filter(l => l.stage_id === stage.id);
                const totalValue = stageLeads.reduce((sum, l) => sum + (Number(l.value) || 0), 0);

              const colorMap: Record<string, string> = {
                'bg-blue-300': '#93c5fd', 'bg-green-300': '#86efac',
                'bg-yellow-300': '#fde047', 'bg-red-300': '#fca5a5',
                'bg-purple-300': '#d8b4fe', 'bg-pink-300': '#f9a8d4',
                'bg-indigo-300': '#a5b4fc', 'bg-slate-300': '#cbd5e1',
              };
              const rawSC = stage.color || '#3b82f6';
              const sbc = colorMap[rawSC] || rawSC;
              const bo = stage.borderOpacity || '4d';
              return (
                <div 
                  key={stage.id} 
                  className="w-80 flex-shrink-0 flex flex-col h-full rounded-2xl bg-slate-100/10 bg-slate-100/10 p-1"
                  style={{ border: `2px solid ${sbc}${bo}` }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, stage.id)}
                >
                  <div className="p-4 mb-2 flex items-center justify-between">
                    <div className="flex flex-col">
                       <div className="flex items-center gap-2 mb-1">
                         <h3 className="font-black text-slate-800 uppercase tracking-widest text-[10px]">{stage.name}</h3>
                         <span className="px-1.5 py-0.5 bg-slate-200/60 rounded text-[9px] font-black text-slate-500">{stageLeads.length}</span>
                       </div>
                       <div className="text-[12px] font-bold text-slate-700">
                        R$ {totalValue.toLocaleString('pt-BR')}
                       </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 pb-4 px-2 no-scrollbar">
                    {stageLeads.map(lead => {
                      const isWon = lead.stage_id === activeFunnel?.default_won_stage_id;
                      const leadUser = users.find(u => String(u.id) === String(lead.assigned_user_id));
                      
                      const colorMap: Record<string, string> = {
                        'bg-blue-300': '#93c5fd', 'bg-green-300': '#86efac',
                        'bg-yellow-300': '#fde047', 'bg-red-300': '#fca5a5',
                        'bg-purple-300': '#d8b4fe', 'bg-pink-300': '#f9a8d4',
                        'bg-indigo-300': '#a5b4fc', 'bg-slate-300': '#cbd5e1',
                      };
                      const rawColor = stage.color || '#3b82f6';
                      const stageColor = colorMap[rawColor] || rawColor;
                      const opacity = stage.colorOpacity || '1a';
                      return (
                        <div 
                          key={lead.id} 
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead.id)}
                          onClick={() => onNavigate('lead-detail', lead.id)}
                          className="group p-5 rounded-2xl border transition-all cursor-pointer relative shadow-sm hover:shadow-md"
                          style={{
                            backgroundColor: isWon ? '#f0fdf4' : stageColor + opacity,
                            borderColor: isWon ? '#22c55e' : stageColor,
                          }}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                              <Building2 size={10} />
                              {lead.company || 'Sem empresa'}
                            </span>
                            {isWon && <CheckCircle2 size={14} className="text-green-500" />}
                          </div>
                          
                          <h4 className="font-bold text-[14px] text-slate-900 leading-snug mb-4 group-hover:text-indigo-600 transition-colors">
                            {lead.title}
                          </h4>
                          
                          <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                            <div className="flex flex-col">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Valor</span>
                              <div className="font-bold text-slate-900 text-xs flex items-center gap-0.5">
                                R$ {Number(lead.value).toLocaleString('pt-BR')}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {lead.next_task_at && (
                                <div className="w-5 h-5 rounded-full bg-orange-50 flex items-center justify-center text-orange-500" title="Tarefa próxima">
                                  <Clock size={10} />
                                </div>
                              )}
                              <div className="w-6 h-6 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center text-[10px] font-black border border-slate-100">
                                {leadUser?.name.charAt(0).toUpperCase() || '?'}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    <button 
                      onClick={() => handleCreateLead(stage.id)}
                      className="w-full py-4 border-2 border-dashed border-slate-200/50 rounded-2xl text-slate-400 hover:border-indigo-200 hover:text-indigo-600 transition-all flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest group"
                    >
                      <div className="w-5 h-5 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                        <Plus size={12} />
                      </div>
                      Nova Negociação
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        ) : (
          <ListTableView />
        )}
      </div>

      {/* Advanced Filter Drawer */}
      <div className={`fixed inset-y-0 right-0 w-[400px] bg-white shadow-2xl z-50 border-l border-slate-200 transition-transform duration-300 ease-in-out ${showFilters ? 'translate-x-0' : 'translate-x-[400px]'}`}>
        <div className="h-full flex flex-col p-8 overflow-y-auto">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Filter size={20} className="text-indigo-600" />
              Filtros Avançados
            </h2>
            <button onClick={() => setShowFilters(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-50 rounded-lg transition-all">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-10">
            <FilterDateSection title="Data de Criação" icon={<Calendar size={14} />} value={filterCreation} onChange={setFilterCreation} />
            <FilterDateSection title="Último Contato" icon={<Calendar size={14} />} value={filterLastContact} onChange={setFilterLastContact} />
            <FilterDateSection title="Próxima Tarefa" icon={<Clock size={14} />} value={filterNextTask} onChange={setFilterNextTask} />
            <FilterDateSection title="Data de Fechamento" icon={<Target size={14} />} value={filterClosed} onChange={setFilterClosed} />
            <FilterDateSection title="Previsão de Fechamento" icon={<Target size={14} />} value={filterForecast} onChange={setFilterForecast} />
          </div>

          <div className="mt-auto pt-10 flex gap-3 pb-6">
            <button onClick={resetFilters} className="flex-1 px-4 py-3.5 border border-slate-200 text-slate-500 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
              <RotateCcw size={14} /> Limpar
            </button>
            <button onClick={() => setShowFilters(false)} className="flex-1 px-4 py-3.5 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-all shadow-xl shadow-slate-200/40">
              Aplicar Filtros
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const FilterDateSection = ({ title, icon, value, onChange }: any) => (
  <div className="animate-in fade-in slide-in-from-right-4 duration-500">
    <div className="flex items-center gap-2 mb-4">
      <div className="w-7 h-7 bg-indigo-50 text-indigo-500 rounded-lg flex items-center justify-center border border-indigo-100/50">
        {icon}
      </div>
      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{title}</h3>
    </div>
    <DatePicker value={value} onChange={onChange} />
  </div>
);
