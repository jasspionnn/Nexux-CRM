import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import { LeadCard } from './LeadCard';
import { Plus, MoreVertical, Layout } from 'lucide-react';
import { NewLeadModal } from './NewLeadModal';

interface Props {
  onNavigate: (view: string, data?: any) => void;
}

export const KanbanBoard: React.FC<Props> = ({ onNavigate }) => {
  const { funnels, activeFunnelId, leads, moveLead, users, setActiveFunnelId } = useCRM();
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);

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

  if (!activeFunnel) return <div>Carregando funil...</div>;

  return (
    <div className="h-full flex flex-col bg-gray-50/50">
      {/* Header Toolbar */}
      <div className="h-16 bg-white border-b px-6 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-gray-700">
            <Layout className="w-5 h-5 text-blue-600" />
            <span className="text-gray-400 text-sm font-medium mr-1">Funil:</span>
            <select 
              value={activeFunnelId}
              onChange={(e) => setActiveFunnelId(e.target.value)}
              className="bg-transparent font-bold text-gray-800 text-lg focus:outline-none cursor-pointer hover:bg-gray-50 p-1 rounded border-b border-transparent hover:border-gray-300 transition-all"
            >
              {funnels.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="text-sm text-gray-500 hidden sm:block">
              {leads.filter(l => l.funnelId === activeFunnelId).length} leads ativos
           </div>
           
           <button 
             onClick={() => setIsNewLeadModalOpen(true)}
             className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-sm hover:shadow active:transform active:scale-95"
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
            const stageLeads = leads.filter(l => l.stageId === stage.id && l.funnelId === activeFunnel.id);
            const totalValue = stageLeads.reduce((acc, curr) => acc + curr.value, 0);

            return (
              <div 
                key={stage.id}
                className="w-80 flex flex-col h-full max-h-full rounded-xl bg-gray-100/50 border border-gray-200/60"
                onDrop={(e) => handleDrop(e, stage.id)}
                onDragOver={handleDragOver}
              >
                {/* Stage Header */}
                <div className={`p-4 border-b border-gray-200/50 rounded-t-xl bg-white sticky top-0 z-10 border-t-4 ${stage.color.replace('bg-', 'border-t-').split(' ')[0]}`}>
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-semibold text-gray-700 truncate" title={stage.name}>{stage.name}</h3>
                    <MoreVertical size={16} className="text-gray-400 cursor-pointer hover:text-gray-600" />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{stageLeads.length} leads</span>
                    <span className="font-medium">R$ {totalValue.toLocaleString()}</span>
                  </div>
                </div>

                {/* Cards Container */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 kanban-scroll">
                  {stageLeads.map(lead => (
                    <LeadCard 
                      key={lead.id} 
                      lead={lead} 
                      user={users.find(u => u.id === lead.assignedUserId)}
                      onClick={() => onNavigate('lead-detail', lead.id)}
                      funnelName={activeFunnel.name}
                      stageName={stage.name}
                    />
                  ))}
                  <div 
                    className="w-full py-3 text-sm text-gray-400 border border-dashed border-gray-300 rounded-lg flex items-center justify-center gap-1 bg-gray-50/50 hover:bg-gray-100 transition-colors"
                  >
                     Arraste leads aqui
                  </div>
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