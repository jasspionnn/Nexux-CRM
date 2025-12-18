import React, { useMemo } from 'react';
import { useCRM } from '../context/CRMContext';
import {
  Calendar,
  Users,
  Filter,
  RefreshCcw,
  Briefcase,
  Target,
  User,
  SlidersHorizontal,
} from 'lucide-react';

export const Header = () => {
  const { filters, setFilters, resetFilters, teams, users, funnels } = useCRM();

  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (filters.teamId) c++;
    if (filters.userId) c++;
    if (filters.funnelId) c++;
    if (filters.status !== 'all') c++;
    if (filters.dateRange !== '30_days') c++;
    return c;
  }, [filters]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => (filters.teamId ? u.teamId === filters.teamId : true));
  }, [users, filters.teamId]);

  const contextLabel = useMemo(() => {
    const parts: string[] = [];

    // Range
    const rangeMap: Record<string, string> = {
      '7_days': '7 dias',
      '30_days': '30 dias',
      '90_days': '90 dias',
      'this_month': 'este mês',
      'last_month': 'mês passado',
      'custom': 'custom',
    };
    parts.push(rangeMap[filters.dateRange] || filters.dateRange);

    // Scope
    if (!filters.teamId && !filters.userId && !filters.funnelId && filters.status === 'all') {
      parts.push('visão global');
      return parts.join(' • ');
    }

    if (filters.teamId) {
      const team = teams.find(t => t.id === filters.teamId);
      parts.push(team ? `time: ${team.name}` : 'time');
    }

    if (filters.userId) {
      const u = users.find(x => x.id === filters.userId);
      parts.push(u ? `vendedor: ${u.name}` : 'vendedor');
    }

    if (filters.funnelId) {
      const f = funnels.find(x => x.id === filters.funnelId);
      parts.push(f ? `funil: ${f.name}` : 'funil');
    }

    if (filters.status !== 'all') {
      const statusMap: Record<string, string> = {
        open: 'aberto',
        won: 'ganho',
        lost: 'perdido',
        all: 'todos',
      };
      parts.push(`status: ${statusMap[filters.status] || filters.status}`);
    }

    return parts.join(' • ');
  }, [filters, teams, users, funnels]);

  const onChangeDateRange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      dateRange: value as any,
    }));
  };

  const onChangeTeam = (value: string) => {
    setFilters(prev => ({
      ...prev,
      teamId: value || null,
      userId: null, // cascata: muda time, reseta usuário
    }));
  };

  const onChangeUser = (value: string) => {
    setFilters(prev => ({
      ...prev,
      userId: value || null,
    }));
  };

  const onChangeFunnel = (value: string) => {
    setFilters(prev => ({
      ...prev,
      funnelId: value || null,
    }));
  };

  const onChangeStatus = (value: string) => {
    setFilters(prev => ({
      ...prev,
      status: value as any,
    }));
  };

  return (
    <header className="w-full bg-white border-b border-gray-200 px-6 py-4 flex flex-col gap-4">

      {/* TOP BAR */}
      <div className="flex items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Nexus CRM</h1>
          <p className="text-xs text-gray-500">Enterprise Sales Command Center</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Active Filters Badge */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <SlidersHorizontal size={14} />
            {activeFilterCount === 0 ? 'Sem filtros' : `${activeFilterCount} filtro${activeFilterCount > 1 ? 's' : ''} ativo${activeFilterCount > 1 ? 's' : ''}`}
          </div>

          {/* Reset */}
          <button
            onClick={resetFilters}
            className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border transition ${
              activeFilterCount === 0
                ? 'text-gray-400 border-gray-200 bg-gray-50 cursor-not-allowed'
                : 'text-gray-700 border-gray-300 bg-white hover:bg-gray-50'
            }`}
            disabled={activeFilterCount === 0}
            title="Resetar filtros"
          >
            <RefreshCcw size={14} />
            Limpar
          </button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">

        {/* Date Range */}
        <div className="relative">
          <Calendar size={14} className="absolute left-3 top-3 text-gray-400" />
          <select
            value={filters.dateRange}
            onChange={e => onChangeDateRange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="7_days">Últimos 7 dias</option>
            <option value="30_days">Últimos 30 dias</option>
            <option value="90_days">Últimos 90 dias</option>
            <option value="this_month">Este mês</option>
            <option value="last_month">Mês passado</option>
          </select>
        </div>

        {/* Team */}
        <div className="relative">
          <Users size={14} className="absolute left-3 top-3 text-gray-400" />
          <select
            value={filters.teamId || ''}
            onChange={e => onChangeTeam(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">Todos os times</option>
            {teams.map(team => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>

        {/* User */}
        <div className="relative">
          <User size={14} className="absolute left-3 top-3 text-gray-400" />
          <select
            value={filters.userId || ''}
            onChange={e => onChangeUser(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">Todos os vendedores</option>
            {filteredUsers.map(u => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        {/* Funnel */}
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-3 text-gray-400" />
          <select
            value={filters.funnelId || ''}
            onChange={e => onChangeFunnel(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">Todos os funis</option>
            {funnels.map(funnel => (
              <option key={funnel.id} value={funnel.id}>
                {funnel.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div className="relative">
          <Target size={14} className="absolute left-3 top-3 text-gray-400" />
          <select
            value={filters.status}
            onChange={e => onChangeStatus(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="all">Todos os status</option>
            <option value="open">Em aberto</option>
            <option value="won">Ganho</option>
            <option value="lost">Perdido</option>
          </select>
        </div>

        {/* Context Indicator */}
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-gray-700">
          <Briefcase size={14} className="text-gray-500" />
          <span className="truncate" title={contextLabel}>
            {contextLabel}
          </span>
        </div>
      </div>
    </header>
  );
};
