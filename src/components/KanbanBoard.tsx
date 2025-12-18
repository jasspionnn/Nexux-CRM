
import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import { LeadCard } from './LeadCard';
import { Plus, MoreVertical, Layout, Filter, User } from 'lucide-react';
import { NewLeadModal } from './NewLeadModal';

interface Props {
  onNavigate: (view: string, data?: any) => void;
}

export const KanbanBoard: React.FC<Props> = ({ onNavigate }) => {
  const { funnels, activeFunnelId, visibleLeads, moveLead, visibleUsers, setActiveFunnelId, currentUser } = useCRM();
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [userFilter, setUserFilter] = useState<string>('all');

  const activeFunnel = funnels.find(f => f.id === activeFunnelId);

  const handleDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    if (leadId) {
      moveLead(leadId, stageId);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  if (!activeFunnel) return <div className="p-8 text-center text-gray-500">Nenhum funil ativo encontrado.</div>;

  // Filtragem local adicional (pelo cabeçalho do Kanban)
  const leadsToDisplay = visibleLeads.filter(l => {
    if (l.funnelId !== activeFunnelId) return false;
    if (userFilter !== 'all' && l.assignedUserId !== userFilter) return false;
    return true;
  });

  return (
    <div className="h-full flex flex-col bg-gray-50/50">
      {/* Header Toolbar */}
      <div className="h-16 bg-white border-b px-6 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-gray-700">
            <Layout className="w-5 h-5 text-blue-600" />
            <select 
              value={activeFunnelId}
              onChange={(e) => setActiveFunnelId(e.target.value)}
              className="bg-transparent font-bold text-gray-800 text-lg focus:outline-none cursor-pointer p-1 rounded transition-all"
            >
              {funnels.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div className="h-6 w-px bg-gray-200"></div>

          <div className="flex items-center gap-2">
            <User size={14} className="text-gray-400" />
            <select 
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="text-sm bg-gray-50 border-none focus:ring-0 text-gray-600 font-medium py-1 px-2 rounded cursor-pointer hover:bg-gray-100"
            >
              <option value="all">Todos os Vendedores</option>
              {visibleUsers.map(u => (
                <option key={u.id} value={u.id}>{u.name === currentUser?.name ? 'Meus Leads' : u.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="text-sm text-gray-500 hidden sm:block">
              {leadsToDisplay.length} leads visíveis
           </div>
           <button 
             onClick={() => setIsNewLeadModalOpen(true)}
             className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-sm active:transform active:scale-95"
           >
             <Plus size={18} />
             Novo Lead
           </button>
        </div>
      </div>

      {/* Kanban Stages */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 kanban-scroll">
        <div className="flex h-full gap-5 min-w-max">
          {activeFunnel.stages.map((stage) => {
            const stageLeads = leadsToDisplay.filter(l => l.stageId === stage.id);
            const totalValue = stageLeads.reduce((acc, curr) => acc + curr.value, 0);

            return (
              <div 
                key={stage.id}
                className="w-80 flex flex-col h-full max-h-full rounded-xl bg-gray-100/50 border border-gray-200/60"
                onDrop={(e) => handleDrop(e, stage.id)}
                onDragOver={handleDragOver}
              >
                <div className={`p-4 border-b border-gray-200/50 rounded-t-xl bg-white sticky top-0 z-10 border-t-4 ${stage.color.replace('bg-', 'border-t-').split(' ')[0]}`}>
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-semibold text-gray-700 truncate">{stage.name}</h3>
                    <MoreVertical size={16} className="text-gray-400" />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{stageLeads.length} leads</span>
                    <span className="font-medium">R$ {totalValue.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-3 kanban-scroll">
                  {stageLeads.map(lead => (
                    <LeadCard 
                      key={lead.id} 
                      lead={lead} 
                      user={visibleUsers.find(u => u.id === lead.assignedUserId)}
                      onClick={() => onNavigate('lead-detail', lead.id)}
                      funnelName={activeFunnel.name}
                      stageName={stage.name}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <NewLeadModal 
        isOpen={isNewLeadModalOpen}
        onClose={() => setIsNewLeadModalOpen(false)}
        defaultFunnelId={activeFunnelId}
      />
    </div>
  );
};
