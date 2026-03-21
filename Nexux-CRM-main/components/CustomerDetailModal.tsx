
import React from 'react';
import { Lead, Funnel, Stage } from '../types';
import { X, User, Phone, Mail, Building, Briefcase, Calendar, ChevronRight } from 'lucide-react';
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

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  customer,
  onClose,
  onSelectDeal
}) => {
  const { funnels } = useCRM();

  const totalValue = customer.leads.reduce((sum, lead) => sum + lead.value, 0);
  const activeDeals = customer.leads.filter(
    lead => lead.probability > 0 && lead.probability < 100
  ).length;

  const getFunnelInfo = (lead: Lead) => {
    const funnel = funnels.find((f: Funnel) => f.id === lead.funnelId);
    const stage = funnel?.stages.find((s: Stage) => s.id === lead.stageId);

    return {
      funnelName: funnel?.name || 'Desconhecido',
      stageName: stage?.name || 'Desconhecido',
      stageColor: stage?.color || 'bg-gray-100'
    };
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 animate-fade-in p-4">
      <div className="bg-white w-full max-w-4xl h-[70vh] rounded-2xl shadow-2xl flex overflow-hidden animate-scale-in">
        <div className="w-1/3 bg-gray-50 border-r p-8 flex flex-col">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-6 shadow-inner">
            <User size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">{customer.name}</h2>
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-6 font-medium">
            <Building size={14} /> {customer.company}
          </div>
          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Mail size={16} className="text-gray-400" />
              <span>{customer.email || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Phone size={16} className="text-gray-400" />
              <span>{customer.phone || 'N/A'}</span>
            </div>
          </div>
          <div className="mt-auto bg-white p-4 rounded-xl border space-y-2 shadow-sm">
            <div className="flex justify-between text-xs font-bold text-gray-400 uppercase">Resumo</div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Total</span><span className="font-bold">R$ {totalValue.toLocaleString()}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Ativos</span><span className="font-bold text-blue-600">{activeDeals}</span></div>
          </div>
        </div>
        <div className="flex-1 flex flex-col">
          <div className="h-16 border-b flex items-center justify-between px-8 bg-white">
            <h3 className="font-bold text-gray-700 flex items-center gap-2"><Briefcase size={18} /> Negociações</h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/30">
            {customer.leads.map(lead => {
              const { funnelName, stageName, stageColor } = getFunnelInfo(lead);
              return (
                <div key={lead.id} onClick={() => onSelectDeal(lead.id)} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:border-blue-300 transition-all cursor-pointer group">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-gray-800">{lead.title}</h4>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase text-white ${stageColor.replace('bg-', 'bg-')}`}>{stageName}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <div className="text-gray-500 font-medium">{funnelName}</div>
                    <div className="font-black text-gray-700">R$ {lead.value.toLocaleString()}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
