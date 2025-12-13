
import React from 'react';
import { Lead } from '../types';
import { X, User, Phone, Mail, Building, Briefcase, Calendar, ArrowRight, ExternalLink } from 'lucide-react';
import { useCRM } from '../context/CRMContext';

interface CustomerDetailModalProps {
  customer: {
    name: string;
    company: string;
    email: string;
    phone: string;
    leads: Lead[];
  };
  onClose: () => void;
  onSelectDeal: (leadId: string) => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({ customer, onClose, onSelectDeal }) => {
  const { funnels } = useCRM();

  // Calculate total value
  const totalValue = customer.leads.reduce((sum, lead) => sum + lead.value, 0);
  const activeDeals = customer.leads.filter(l => l.probability > 0 && l.probability < 100).length;
  const wonDeals = customer.leads.filter(l => l.probability === 100).length;

  const getFunnelInfo = (lead: Lead) => {
    const funnel = funnels.find(f => f.id === lead.funnelId);
    const stage = funnel?.stages.find(s => s.id === lead.stageId);
    return { funnelName: funnel?.name || 'Desconhecido', stageName: stage?.name || 'Desconhecido', stageColor: stage?.color || 'bg-gray-100' };
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 animate-fade-in p-4">
      <div className="bg-white w-full max-w-5xl h-[80vh] rounded-2xl shadow-2xl flex overflow-hidden animate-scale-in">
        
        {/* Left Sidebar: Customer Profile */}
        <div className="w-1/3 bg-gray-50 border-r border-gray-200 p-8 flex flex-col">
          <div className="flex justify-between items-start mb-6">
             <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4 shadow-sm border border-blue-200">
                <User size={32} />
             </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 leading-tight mb-1">{customer.name || 'Sem Nome'}</h2>
          <div className="flex items-center gap-2 text-gray-500 font-medium mb-6">
             <Building size={16} />
             {customer.company}
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 text-sm text-gray-600 group">
              <div className="p-2 bg-white rounded-lg border border-gray-200 group-hover:border-blue-300 transition-colors">
                 <Mail size={16} className="text-gray-400 group-hover:text-blue-500" />
              </div>
              <span className="truncate">{customer.email || 'Não informado'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600 group">
              <div className="p-2 bg-white rounded-lg border border-gray-200 group-hover:border-blue-300 transition-colors">
                 <Phone size={16} className="text-gray-400 group-hover:text-blue-500" />
              </div>
              <span>{customer.phone || 'Não informado'}</span>
            </div>
          </div>

          <div className="mt-auto">
             <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Resumo do Cliente</h3>
                <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                   <span className="text-sm text-gray-600">Total em Pipeline</span>
                   <span className="font-bold text-gray-800">R$ {totalValue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                   <span className="text-sm text-gray-600">Negociações Ativas</span>
                   <span className="font-bold text-blue-600">{activeDeals}</span>
                </div>
                <div className="flex justify-between items-center">
                   <span className="text-sm text-gray-600">Negociações Ganhas</span>
                   <span className="font-bold text-green-600">{wonDeals}</span>
                </div>
             </div>
          </div>
        </div>

        {/* Right Content: Deal Cards */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="h-20 border-b border-gray-100 flex items-center justify-between px-8">
             <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Briefcase className="text-blue-600" />
                Negociações e Funis
             </h3>
             <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition">
                <X size={24} />
             </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30">
             {customer.leads.length === 0 ? (
                <div className="text-center text-gray-400 py-12">
                   <p>Nenhuma negociação encontrada para este cliente.</p>
                </div>
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {customer.leads.map(lead => {
                      const { funnelName, stageName, stageColor } = getFunnelInfo(lead);
                      const isWon = lead.probability === 100;
                      const isLost = lead.probability === 0;
                      
                      return (
                         <div 
                           key={lead.id}
                           onClick={() => onSelectDeal(lead.id)}
                           className="bg-white p-5 rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                         >
                            <div className={`absolute top-0 left-0 w-1 h-full ${isWon ? 'bg-green-500' : isLost ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                            
                            <div className="flex justify-between items-start mb-3 pl-2">
                               <div>
                                  <h4 className="font-bold text-gray-800 text-lg leading-tight mb-1 group-hover:text-blue-700 transition-colors">
                                     {lead.title}
                                  </h4>
                                  <div className="flex items-center gap-2 text-xs text-gray-500">
                                     <Calendar size={12} />
                                     {new Date(lead.createdAt).toLocaleDateString()}
                                  </div>
                               </div>
                               <ExternalLink size={16} className="text-gray-300 group-hover:text-blue-500" />
                            </div>

                            <div className="pl-2 space-y-3">
                               <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-100">
                                  <div className="flex flex-col">
                                     <span className="text-[10px] font-bold text-gray-400 uppercase">Funil</span>
                                     <span className="text-xs font-semibold text-gray-700">{funnelName}</span>
                                  </div>
                                  <ArrowRight size={14} className="text-gray-300" />
                                  <div className="flex flex-col items-end">
                                     <span className="text-[10px] font-bold text-gray-400 uppercase">Etapa Atual</span>
                                     <span className={`text-xs font-semibold px-2 py-0.5 rounded ${stageColor.replace('bg-', 'bg-opacity-20 text-')}`}>
                                        {stageName}
                                     </span>
                                  </div>
                               </div>

                               <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                                  <span className="font-bold text-gray-900 text-lg">
                                     R$ {lead.value.toLocaleString()}
                                  </span>
                                  {isWon ? (
                                     <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">Ganho</span>
                                  ) : isLost ? (
                                     <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full border border-red-100">Perdido</span>
                                  ) : (
                                     <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full border border-blue-100">{lead.probability}% Prob.</span>
                                  )}
                               </div>
                            </div>
                         </div>
                      );
                   })}
                </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};
