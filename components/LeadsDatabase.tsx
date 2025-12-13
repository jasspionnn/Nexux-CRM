
import React, { useState, useMemo } from 'react';
import { useCRM } from '../context/CRMContext';
import { Search, Building, User, Layers, ChevronRight } from 'lucide-react';
import { CustomerDetailModal } from './CustomerDetailModal';
import { Lead } from '../types';

interface GroupedCustomer {
    id: string; // email or company name used as key
    name: string;
    company: string;
    email: string;
    phone: string;
    leads: Lead[];
    totalValue: number;
}

interface Props {
  onNavigate: (view: string, data?: any) => void;
}

export const LeadsDatabase: React.FC<Props> = ({ onNavigate }) => {
  const { leads } = useCRM();
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for Modals
  const [selectedCustomer, setSelectedCustomer] = useState<GroupedCustomer | null>(null);

  // Group leads by Customer (Email is primary key, Company is secondary)
  const groupedCustomers = useMemo(() => {
      const groups: Record<string, GroupedCustomer> = {};

      leads.forEach(lead => {
          // Determine a unique key for the customer
          const key = lead.contactEmail ? lead.contactEmail.toLowerCase().trim() : lead.company ? lead.company.toLowerCase().trim() : 'desconhecido';
          
          if (!groups[key]) {
              groups[key] = {
                  id: key,
                  name: lead.contactName || 'Sem Nome',
                  company: lead.company || 'Sem Empresa',
                  email: lead.contactEmail || '',
                  phone: lead.contactPhone || '',
                  leads: [],
                  totalValue: 0
              };
          }

          groups[key].leads.push(lead);
          groups[key].totalValue += lead.value;
          
          // Update contact info if missing in previous iteration but present here
          if (groups[key].name === 'Sem Nome' && lead.contactName) groups[key].name = lead.contactName;
          if (groups[key].phone === '' && lead.contactPhone) groups[key].phone = lead.contactPhone;
      });

      return Object.values(groups);
  }, [leads]);

  const filteredCustomers = groupedCustomers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenDeal = (leadId: string) => {
      // Navigate to the full page view
      onNavigate('lead-detail', leadId);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 animate-fade-in">
      {/* Header */}
      <div className="h-20 bg-white border-b border-gray-200 px-8 flex items-center justify-between shadow-sm z-10">
         <div>
             <h2 className="text-2xl font-bold text-gray-800">Base de Clientes</h2>
             <p className="text-gray-500 text-sm mt-1">Gerencie seus contatos e visualize suas múltiplas negociações.</p>
         </div>
         <div className="relative w-96">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               placeholder="Buscar Cliente, Empresa ou Email..."
               className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-50 focus:bg-white transition-all"
            />
         </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Cliente / Empresa</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Contato</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Funis Ativos</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Pipeline Total</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCustomers.map(customer => {
                 const activeDealsCount = customer.leads.filter(l => l.probability > 0 && l.probability < 100).length;
                 const totalDealsCount = customer.leads.length;

                 return (
                   <tr
                     key={customer.id}
                     onClick={() => setSelectedCustomer(customer)}
                     className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                   >
                     <td className="px-6 py-4">
                        <div className="font-bold text-gray-800 text-base">{customer.name}</div>
                        <div className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                           <Building size={12} /> {customer.company}
                        </div>
                     </td>
                     <td className="px-6 py-4">
                        <div className="flex flex-col text-sm">
                            <span className="text-gray-700 font-medium flex items-center gap-1">
                                <User size={12} className="text-gray-400"/>
                                {customer.name}
                            </span>
                            <span className="text-gray-400 text-xs mt-0.5">{customer.email}</span>
                        </div>
                     </td>
                     <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                             <div className="bg-blue-100 text-blue-700 p-1.5 rounded-lg">
                                <Layers size={16} />
                             </div>
                             <div>
                                <div className="font-bold text-gray-800">{activeDealsCount} ativos</div>
                                <div className="text-xs text-gray-500">de {totalDealsCount} negociações</div>
                             </div>
                        </div>
                     </td>
                     <td className="px-6 py-4">
                        <span className="font-bold text-gray-700 bg-gray-100 px-3 py-1 rounded-full text-sm">
                            R$ {customer.totalValue.toLocaleString()}
                        </span>
                     </td>
                     <td className="px-6 py-4 text-right">
                        <button className="text-blue-500 hover:text-blue-700 hover:bg-blue-100 p-2 rounded-full transition-colors">
                            <ChevronRight size={20} />
                        </button>
                     </td>
                   </tr>
                 );
              })}
              {filteredCustomers.length === 0 && (
                 <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                       <div className="flex flex-col items-center">
                          <Search size={48} className="opacity-20 mb-3" />
                          <p>Nenhum cliente encontrado.</p>
                       </div>
                    </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Detail Modal (The Panel) */}
      {selectedCustomer && (
          <CustomerDetailModal 
            customer={selectedCustomer}
            onClose={() => setSelectedCustomer(null)}
            onSelectDeal={handleOpenDeal}
          />
      )}
    </div>
  );
}
