
import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import { LeadCard } from './LeadCard';
import { Plus, Layout, User, Layers, Loader2, AlertTriangle } from 'lucide-react';
import { NewLeadModal } from './NewLeadModal';
import { Lead, User as UserType } from '../types';

interface Props {
  onNavigate: (view: string, data?: any) => void;
}

export const KanbanBoard: React.FC<Props> = ({ onNavigate }) => {
  const { funnels, activeFunnelId, visibleLeads, moveLead, visibleUsers, setActiveFunnelId, currentUser, isLoading, addFunnel } = useCRM();
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [userFilter, setUserFilter] = useState<string>('all');

  const activeFunnel = (funnels || []).find(f => f.id === activeFunnelId);

  const handleDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    if (leadId) moveLead(leadId, stageId);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  if (isLoading) return <div className="h-full flex items-center justify-center bg-white"><Loader2 className="animate-spin text-blue-500" size={48} /></div>;

  if (!activeFunnel || !activeFunnel.stages.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-gray-50 text-center">
        <AlertTriangle className="text-amber-500 mb-4" size={48} />
        <h3 className="font-bold text-gray-800">Pipeline não configurado</h3>
        <button onClick={() => addFunnel('Vendas')} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg font-bold">Criar Primeiro Funil</button>
      </div>
    );
  }

  const leadsToDisplay = (visibleLeads || []).filter((l: Lead) => {
    if (l.funnelId !== activeFunnelId) return false;
    if (userFilter !== 'all' && l.assignedUserId !== userFilter) return false;
    return true;
  });

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-gray-700">
            <Layout className="w-5 h-5 text-blue-600" />
            <select value={activeFunnelId} onChange={(e) => setActiveFunnelId(e.target.value)} className="bg-transparent font-black text-gray-900 text-lg outline-none">
              {funnels.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <User size={14} className="text-gray-400" />
            <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} className="text-xs bg-gray-100 py-1.5 px-3 rounded-lg font-bold">
              <option value="all">Todos</option>
              {(visibleUsers || []).map((u: UserType) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        </div>
        <button onClick={() => setIsNewLeadModalOpen(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 transition-all">
          <Plus size={18} /> Novo Lead
        </button>
      </div>

      <div className="flex-1 overflow-x-auto p-6 kanban-scroll">
        <div className="flex h-full gap-6 min-w-max pb-4">
          {activeFunnel.stages.map((stage) => {
            const stageLeads = leadsToDisplay.filter((l: Lead) => l.stageId === stage.id);
            const total = stageLeads.reduce((acc: number, curr: Lead) => acc + (curr.value || 0), 0);
            return (
              <div key={stage.id} className="w-80 flex flex-col h-full rounded-2xl bg-gray-200/30 border border-gray-200/50" onDrop={(e) => handleDrop(e, stage.id)} onDragOver={handleDragOver}>
                <div className={`p-4 border-b border-gray-200/50 rounded-t-2xl bg-white sticky top-0 z-10 border-t-4 ${stage.color.replace('bg-', 'border-t-')}`}>
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-black text-gray-800 text-xs uppercase">{stage.name}</h3>
                    <span className="bg-gray-100 text-gray-500 text-[10px] font-black px-2 py-0.5 rounded-md">{stageLeads.length}</span>
                  </div>
                  <div className="text-[10px] font-bold text-blue-600">R$ {total.toLocaleString()}</div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {stageLeads.map((lead: Lead) => (
                    <LeadCard key={lead.id} lead={lead} funnelName={activeFunnel.name} stageName={stage.name} onClick={() => onNavigate('lead-detail', lead.id)} user={visibleUsers.find(u => u.id === lead.assignedUserId)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <NewLeadModal isOpen={isNewLeadModalOpen} onClose={() => setIsNewLeadModalOpen(false)} defaultFunnelId={activeFunnelId} />
    </div>
  );
};
