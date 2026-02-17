
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

  // Segurança extra na busca do funil ativo
  const activeFunnel = (funnels || []).find(f => f.id === activeFunnelId);

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

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4 bg-white">
        <Loader2 className="animate-spin text-blue-500" size={48} />
        <p className="font-bold">Sincronizando pipeline...</p>
      </div>
    );
  }

  // Se o funil não for encontrado ou não tiver estágios
  if (!activeFunnel || !Array.isArray(activeFunnel.stages) || activeFunnel.stages.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-gray-50">
        <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-gray-200 shadow-sm max-w-md">
           {funnels.length > 0 ? <Layers className="mx-auto text-blue-500 mb-6" size={80} /> : <AlertTriangle className="mx-auto text-amber-500 mb-6" size={80} />}
           <h3 className="text-xl font-bold text-gray-800 mb-2">
             {!activeFunnel ? 'Nenhum funil selecionado' : 'Funil sem estágios configurados'}
           </h3>
           <p className="text-gray-500 mb-8 text-sm leading-relaxed">
             {!activeFunnel 
               ? 'Escolha um funil existente ou crie um novo para começar a gerenciar seus leads.' 
               : 'Este funil parece estar vazio. Adicione estágios nas configurações para visualizá-lo.'}
           </p>
           
           <div className="flex flex-col gap-3">
             {funnels.length > 0 && (
                <div className="grid grid-cols-1 gap-2">
                  {funnels.map(f => (
                    <button 
                      key={f.id}
                      onClick={() => setActiveFunnelId(f.id)}
                      className="p-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-bold transition-all text-sm flex justify-between items-center"
                    >
                      {f.name} <Plus size={16} />
                    </button>
                  ))}
                </div>
             )}
             <button 
              onClick={() => addFunnel('Funil de Vendas Principal')}
              className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg flex items-center gap-2 mx-auto mt-4"
             >
               <Plus size={20} /> Criar Novo Funil
             </button>
           </div>
        </div>
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
      {/* Barra de Ferramentas do Pipeline */}
      <div className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between shadow-sm shrink-0 z-20">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-gray-700">
            <Layout className="w-5 h-5 text-blue-600" />
            <select 
              value={activeFunnelId}
              onChange={(e) => setActiveFunnelId(e.target.value)}
              className="bg-transparent font-black text-gray-900 text-lg focus:outline-none cursor-pointer p-1 rounded transition-all max-w-[250px] truncate"
            >
              {funnels.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>

          <div className="hidden sm:flex items-center gap-2">
            <User size={14} className="text-gray-400" />
            <select 
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="text-xs bg-gray-100 border-none focus:ring-0 text-gray-600 font-bold py-1.5 px-3 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors"
            >
              <option value="all">Todos os Vendedores</option>
              {(visibleUsers || []).map((u: UserType) => (
                <option key={u.id} value={u.id}>{u.name === currentUser?.name ? 'Meus Leads' : u.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           <button 
             onClick={() => setIsNewLeadModalOpen(true)}
             className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 transition-all shadow-md active:scale-95"
           >
             <Plus size={18} />
             Novo Lead
           </button>
        </div>
      </div>

      {/* Colunas do Kanban */}
      <div className="flex-1 overflow-x-auto p-6 kanban-scroll">
        <div className="flex h-full gap-6 min-w-max pb-4">
          {activeFunnel.stages.map((stage) => {
            const stageLeads = leadsToDisplay.filter((l: Lead) => l.stageId === stage.id);
            const totalValue = stageLeads.reduce((acc: number, curr: Lead) => acc + (curr.value || 0), 0);
            const stageColor = stage.color || 'bg-gray-500';

            return (
              <div 
                key={stage.id}
                className="w-80 flex flex-col h-full rounded-2xl bg-gray-200/30 border border-gray-200/50"
                onDrop={(e) => handleDrop(e, stage.id)}
                onDragOver={handleDragOver}
              >
                <div className={`p-4 border-b border-gray-200/50 rounded-t-2xl bg-white sticky top-0 z-10 border-t-4 ${stageColor.replace('bg-', 'border-t-').split(' ')[0]}`}>
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-black text-gray-800 truncate text-xs uppercase tracking-tight">{stage.name}</h3>
                    <span className="bg-gray-100 text-gray-500 text-[10px] font-black px-2 py-0.5 rounded-md">{stageLeads.length}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <span>Bruto</span>
                    <span className="text-blue-600">R$ {totalValue.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-3 kanban-scroll">
                  {stageLeads.map((lead: Lead) => (
                    <LeadCard 
                      key={lead.id} 
                      lead={lead} 
                      user={(visibleUsers || []).find((u: UserType) => u.id === lead.assignedUserId)}
                      onClick={() => onNavigate('lead-detail', lead.id)}
                      funnelName={activeFunnel.name}
                      stageName={stage.name}
                    />
                  ))}
                  {stageLeads.length === 0 && (
                    <div className="h-32 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-[10px] font-black text-gray-300 uppercase gap-2">
                       <Layers size={24} className="opacity-20" />
                       Sem leads
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
