import React from 'react';
import { useCRM } from '../context/CRMContext';
import {
  Calendar,
  Users,
  Filter,
  RefreshCcw,
  Briefcase,
  Target
} from 'lucide-react';

export const Header = () => {
  const {
    filters,
    setFilters,
    resetFilters,
    teams,
    users,
    funnels
  } = useCRM();

  return (
    <header className="w-full bg-white border-b border-gray-200 px-6 py-4 flex flex-col gap-4">

      {/* =====================================================
         TOP BAR — BRAND + CONTEXT
      ===================================================== */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Nexus CRM
          </h1>
          <p className="text-xs text-gray-500">
            Enterprise Sales Command Center
          </p>
        </div>

        <button
          onClick={resetFilters}
          className="flex items-center gap-2 text-xs font-medium text-gray-600 hover:text-gray-900 transition"
        >
          <RefreshCcw size={14} />
          Resetar filtros
        </button>
      </div>

      {/* =====================================================
         FILTER BAR — SALESFORCE LEVEL
      ===================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">

        {/* Date Range */}
        <div className="relative">
          <Calendar size={14} className="absolute left-3 top-3 text-gray-400" />
          <select
            value={filters.dateRange}
            onChange={e =>
              setFilters({ ...filters, dateRange: e.target.value as any })
            }
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
            onChange={e =>
              setFilters({
                ...filters,
                teamId: e.target.value || null,
                userId: null
              })
            }
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
          <Users size={14} className="absolute left-3 top-3 text-gray-400" />
          <select
            value={filters.userId || ''}
            onChange={e =>
              setFilters({
                ...filters,
                userId: e.target.value || null
              })
            }
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">Todos os vendedores</option>
            {users
              .filter(u =>
                filters.teamId ? u.teamId === filters.teamId : true
              )
              .map(user => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
          </select>
        </div>

        {/* Funnel */}
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-3 text-gray-400" />
          <select
            value={filters.funnelId || ''}
            onChange={e =>
              setFilters({
                ...filters,
                funnelId: e.target.value || null
              })
            }
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
            onChange={e =>
              setFilters({
                ...filters,
                status: e.target.value as any
              })
            }
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="all">Todos os status</option>
            <option value="open">Em aberto</option>
            <option value="won">Ganho</option>
            <option value="lost">Perdido</option>
          </select>
        </div>

        {/* Context Indicator */}
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 text-xs font-semibold text-gray-600">
          <Briefcase size={14} />
          Visão Global
        </div>
      </div>
    </header>
  );
};
