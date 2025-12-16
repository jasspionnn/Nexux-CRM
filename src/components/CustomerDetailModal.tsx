import React from 'react';
import { Lead, Funnel, Stage } from '../types';
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

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  customer,
  onClose,
  onSelectDeal
}) => {
  const { funnels } = useCRM();

  // Calculate totals
  const totalValue = customer.leads.reduce((sum, lead) => sum + lead.value, 0);
  const activeDeals = customer.leads.filter(
    lead => lead.probability > 0 && lead.probability < 100
  ).length;
  const wonDeals = customer.leads.filter(
    lead => lead.probability === 100
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
      <div className="bg-white w-full max-w-5xl h-[80vh] rounded-2xl shadow-2xl flex overflow-hidden animate-scale-in">
        
        {/* Left Sidebar */}
        <div className="w-1/3 bg-gray-50 border-r border-gray-200 p-8 flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4 shadow-sm border border-blue-200">
              <User size={32} />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-1">
            {customer.name || 'Sem Nome'}
          </h2>

          <div className="flex items-center gap-2 text-gray-500 font-medium mb-6">
            <Building size={16} />
            {customer.company}
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <div className="p-2 bg-white rounded-lg border border-gray-200">
                <Mail size={16} />
              </div>
              <span>{customer.email || 'Não informado'}</span>
            </div>

            <div className="flex items-center gap-3 text-sm text-gray-600">
              <div className="p-2 bg-white rounded-lg border border-gray-200">
                <Phone size={16} />
              </div>
              <span>{customer.phone || 'Não informado'}</span>
            </div>
          </div>

          <div className="mt-auto bg-white p-4 rounded-xl border border-gray-200 space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase">
              Resumo do Cliente
            </h3>

            <div className="flex justify-between text-sm">
              <span>Total em Pipeline</span>
              <span className="font-bold">R$ {totalValue.toLocaleString()}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span>Negociações Ativas</span>
              <span className="font-bold text-blue-600">{activeDeals}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span>Negociações Ganhas</span>
              <span className="font-bold text-green-600">{wonDeals}</span>
            </div>
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 flex flex-col">
          <div className="h-20 border-b border-gray-100 flex items-center justify-between px-8">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Briefcase />
              Negociações
            </h3>
            <button onClick={onClose}>
              <X />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customer.leads.map(lead => {
                const { funnelName, stageName, stageColor } = getFunnelInfo(lead);

                return (
                  <div
                    key={lead.id}
                    onClick={() => onSelectDeal(lead.id)}
                    className="bg-white p-5 rounded-xl border hover:shadow cursor-pointer"
                  >
                    <h4 className="font-bold">{lead.title}</h4>

                    <div className="text-sm text-gray-500">
                      <Calendar size={12} />{' '}
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </div>

                    <div className="mt-2 flex justify-between text-sm">
                      <span>{funnelName}</span>
                      <span className={stageColor}>{stageName}</span>
                    </div>

                    <div className="mt-2 font-bold">
                      R$ {lead.value.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
