import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import { X, Save, DollarSign, Building, User } from 'lucide-react';
import { Lead } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultFunnelId: string;
}

export const NewLeadModal: React.FC<Props> = ({ isOpen, onClose, defaultFunnelId }) => {
  const { addLead, funnels, users } = useCRM();
  
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    value: 0,
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    funnelId: defaultFunnelId,
    stageId: funnels.find(f => f.id === defaultFunnelId)?.stages[0]?.id || '',
    assignedUserId: users[0]?.id || ''
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    if (!formData.title || !formData.funnelId || !formData.stageId) return;

    const newLead: Lead = {
      id: `l${Date.now()}`,
      title: formData.title,
      company: formData.company || 'Nova Empresa',
      value: Number(formData.value),
      contactName: formData.contactName,
      contactEmail: formData.contactEmail,
      contactPhone: formData.contactPhone,
      funnelId: formData.funnelId,
      stageId: formData.stageId,
      assignedUserId: formData.assignedUserId,
      createdAt: new Date().toISOString(),
      notes: [],
      tasks: [],
      tags: ['Novo'],
      probability: 10, // Default probability
    };

    addLead(newLead);
    onClose();
    
    // Reset minimal form data for next use if component isn't unmounted
    setFormData({
        title: '',
        company: '',
        value: 0,
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        funnelId: defaultFunnelId,
        stageId: funnels.find(f => f.id === defaultFunnelId)?.stages[0]?.id || '',
        assignedUserId: users[0]?.id || ''
    });
  };

  const activeFunnel = funnels.find(f => f.id === formData.funnelId);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800">Novo Lead</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Título do Negócio <span className="text-red-500">*</span></label>
            <input 
              required
              type="text"
              placeholder="Ex: Implantação de Sistema ERP"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Empresa</label>
              <div className="relative">
                <Building className="absolute left-3 top-3 text-gray-400" size={16} />
                <input 
                  type="text"
                  placeholder="Nome da Empresa"
                  value={formData.company}
                  onChange={e => setFormData({...formData, company: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Valor Estimado</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 text-gray-400" size={16} />
                <input 
                  type="number"
                  placeholder="0,00"
                  value={formData.value || ''}
                  onChange={e => setFormData({...formData, value: Number(e.target.value)})}
                  className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1.5">Funil de Vendas</label>
               <select 
                 value={formData.funnelId}
                 onChange={e => {
                    const newFunnelId = e.target.value;
                    const newFunnel = funnels.find(f => f.id === newFunnelId);
                    setFormData({
                        ...formData, 
                        funnelId: newFunnelId,
                        stageId: newFunnel?.stages[0]?.id || ''
                    });
                 }}
                 className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all"
               >
                 {funnels.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
               </select>
            </div>
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1.5">Etapa Inicial</label>
               <select 
                 value={formData.stageId}
                 onChange={e => setFormData({...formData, stageId: e.target.value})}
                 className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all"
               >
                 {activeFunnel?.stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
               </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Contato Principal</label>
             <div className="relative">
                <User className="absolute left-3 top-3 text-gray-400" size={16} />
                <input 
                  type="text"
                  placeholder="Nome do contato"
                  value={formData.contactName}
                  onChange={e => setFormData({...formData, contactName: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-50 mt-2">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium shadow-sm hover:shadow"
            >
              <Save size={18} />
              Criar Lead
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};