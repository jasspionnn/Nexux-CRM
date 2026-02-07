import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext.tsx';
import { LeadCard } from './LeadCard.tsx';
import { Plus, Layout, User, Layers, Loader2 } from 'lucide-react';
import { NewLeadModal } from './NewLeadModal.tsx';

interface Props {
  onNavigate: (view: string, data?: any) => void;
}

export const KanbanBoard: React.FC<Props> = ({ onNavigate }) => {
  const { funnels, activeFunnelId, visibleLeads, moveLead, visibleUsers, setActiveFunnelId, currentUser, isLoading, addFunnel } = useCRM();
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

  if (isLoading && funnels.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
        <Loader2 className="animate-spin text-blue-500" size={48} />
        <p className="font-bold">Sincronizando seus funis...</p>
      </div>
    );
  }

  if (!activeFunnel) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-fade-in">
        <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-gray-200 shadow-sm max-w-md">
           <Layers className="mx-auto text-gray-200 mb-6" size={80} />
           <h3 className="text-xl font-bold text-gray-800 mb-2">Nenhum funil ativo encontrado</h3>
           <p className="text-gray-500 mb-8 text-sm leading-relaxed">
             Parece que você ainda não tem um funil de vendas configurado ou ele não foi selecionado.
           </p>
           {funnels.length > 0 ? (
             <div className="space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Selecione um existente:</p>
                {funnels.map(f => (
                  <button 
                    key={f.id}
                    onClick={() => setActiveFunnelId(f.id)}
                    className="w-full p-4 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-xl font-bold text-gray-700 transition-all text-sm flex justify-between items-center"
                  >
                    {f.name}
                    <Plus size={16} className="text-blue-500" />
                  </button>
                ))}
             </div>
           ) : (
             <button 
              onClick={() => addFunnel('Vendas Geral')}
              className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg flex items-center gap-2 mx-auto"
             >
               <Plus size={20} /> Criar Meu Primeiro Funil
             </button>
           )}
        </div>
      </div>
    );
  }

  const leadsToDisplay = visibleLeads.filter(l => {
    if (l.funnelId !== activeFunnelId) return false;
    if (userFilter !== 'all' && l.assignedUserId !== userFilter) return false;
    return true;
  });

  return (
    <div className="h-full flex flex-col bg-gray-50/50">
      <div className="h-16 bg-white border-b px-6 flex items-center justify-between shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-gray-700">
            <Layout className="w-5 h-5 text-blue-600" />
            <select 
              value={activeFunnelId}
              onChange={(e) => setActiveFunnelId(e.target.value)}
              className="bg-transparent font-bold text-gray-800 text-lg focus:outline-none cursor-pointer p-1 rounded transition-all max-w-[200px] truncate"
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
              <option value="all">Vendedores: Todos</option>
              {visibleUsers.map(u => (
                <option key={u.id} value={u.id}>{u.name === currentUser?.name ? 'Meus Leads' : u.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="text-xs font-bold text-gray-400 uppercase tracking-widest hidden lg:block">
              {leadsToDisplay.length} oportunidades
           </div>
           <button 
             onClick={() => setIsNewLeadModalOpen(true)}
             className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md active:transform active:scale-95"
           >
             <Plus size={18} />
             Novo Lead
           </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 kanban-scroll">
        <div className="flex h-full gap-5 min-w-max">
          {activeFunnel.stages.map((stage) => {
            const stageLeads = leadsToDisplay.filter(l => l.stageId === stage.id);
            const totalValue = stageLeads.reduce((acc, curr) => acc + curr.value, 0);

            return (
              <div 
                key={stage.id}
                className="w-80 flex flex-col h-full max-h-full rounded-2xl bg-gray-100/40 border border-gray-200/60"
                onDrop={(e) => handleDrop(e, stage.id)}
                onDragOver={handleDragOver}
              >
                <div className={`p-4 border-b border-gray-200/50 rounded-t-2xl bg-white sticky top-0 z-10 border-t-4 ${stage.color.replace('bg-', 'border-t-').split(' ')[0]}`}>
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-bold text-gray-700 truncate text-sm">{stage.name}</h3>
                    <span className="bg-gray-100 text-gray-500 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">{stageLeads.length}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                    <span>Bruto</span>
                    <span className="text-gray-600">R$ {totalValue.toLocaleString()}</span>
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
                  {stageLeads.length === 0 && (
                    <div className="h-24 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-[10px] font-bold text-gray-300 uppercase">
                       Sem leads aqui
                    </div>
                  )}
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