import React, { useState, useMemo } from 'react';
import { useCRM } from '../context/CRMContext.tsx';
import { Search, Building, User, Layers, ChevronRight } from 'lucide-react';
import { CustomerDetailModal } from './CustomerDetailModal.tsx';
import { Lead } from '../types.ts';

interface GroupedCustomer {
    id: string;
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
  const [selectedCustomer, setSelectedCustomer] = useState<GroupedCustomer | null>(null);

  const groupedCustomers = useMemo(() => {
      const groups: Record<string, GroupedCustomer> = {};
      leads.forEach(lead => {
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
      });
      return Object.values(groups);
  }, [leads]);

  const filteredCustomers = groupedCustomers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-gray-50 animate-fade-in">
      <div className="h-20 bg-white border-b px-8 flex items-center justify-between shadow-sm z-10">
         <div>
             <h2 className="text-2xl font-bold text-gray-800">Base de Leads</h2>
             <p className="text-gray-500 text-sm mt-1">Gestão centralizada de contatos e histórico de negociações.</p>
         </div>
         <div className="relative w-96">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                placeholder="Buscar cliente ou empresa..." 
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-50" 
            />
         </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Empresa</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Contato</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Valor Total</th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCustomers.map(customer => (
                <tr key={customer.id} onClick={() => setSelectedCustomer(customer)} className="hover:bg-blue-50/50 cursor-pointer transition-colors group">
                  <td className="px-6 py-4"><div className="font-bold text-gray-800">{customer.company}</div></td>
                  <td className="px-6 py-4 text-sm text-gray-600">{customer.name} ({customer.email})</td>
                  <td className="px-6 py-4 font-bold text-gray-700">R$ {customer.totalValue.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right"><ChevronRight size={20} className="text-gray-300" /></td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400 font-medium">Nenhum lead encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {selectedCustomer && (
        <CustomerDetailModal 
            customer={selectedCustomer} 
            onClose={() => setSelectedCustomer(null)} 
            onSelectDeal={(id) => onNavigate('lead-detail', id)} 
        />
      )}
    </div>
  );
};