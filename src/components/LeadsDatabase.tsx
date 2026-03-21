import React from 'react';
import { Search, Filter, Download, Plus } from 'lucide-react';

export const LeadsDatabase = ({ onNavigate }: any) => {
  const leads = [
    { id: '1', title: 'Implementação de CRM', company: 'Empresa Exemplo LTDA', value: 'R$ 5.000,00', contact: 'João Silva', email: 'joao@exemplo.com', stage: 'Proposta Enviada', date: '2023-10-25' },
    { id: '2', title: 'Consultoria de Vendas', company: 'Tech Solutions', value: 'R$ 12.000,00', contact: 'Maria Souza', email: 'maria@tech.com', stage: 'Negociação', date: '2023-10-24' },
    { id: '3', title: 'Treinamento de Equipe', company: 'Comercial Brasil', value: 'R$ 3.500,00', contact: 'Pedro Santos', email: 'pedro@comercial.com', stage: 'Lead Entrante', date: '2023-10-26' },
  ];

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Base de Contatos</h1>
          <p className="text-sm text-slate-500">Visualize e gerencie todos os leads do sistema</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="text-slate-500 hover:text-slate-700 p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Download size={18} />
          </button>
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors">
            <Plus size={18} />
            Novo Contato
          </button>
        </div>
      </div>

      <div className="p-6 border-b border-gray-200 bg-slate-50 flex items-center gap-4 shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome, empresa ou email..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-slate-600 hover:bg-white bg-white font-medium transition-colors shadow-sm">
          <Filter size={18} />
          Filtros
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 sticky top-0 z-10 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Negociação</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Empresa</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contato</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estágio</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {leads.map(lead => (
              <tr key={lead.id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => onNavigate('lead-detail', lead.id)}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-slate-900">{lead.title}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-slate-600">{lead.company}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-slate-900">{lead.contact}</div>
                  <div className="text-sm text-slate-500">{lead.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-700">{lead.value}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    {lead.stage}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-sm">{lead.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
