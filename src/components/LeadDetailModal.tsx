import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import { X, User, Phone, Mail, Building, Briefcase, SlidersHorizontal, CheckCircle, XCircle, ThumbsUp, AlertCircle, Save, Copy, Link, ArrowRight } from 'lucide-react';
import { CustomFieldDefinition, Lead } from '../types';

interface Props {
  leadId: string;
  onClose: () => void;
  onLeadSelect?: (id: string) => void;
}

export const LeadDetailModal: React.FC<Props> = ({ leadId, onClose, onLeadSelect }) => {
  const { leads, funnels, updateLead, duplicateLead, customFields, addNote } = useCRM();
  const lead = leads.find(l => l.id === leadId);
  const [noteText, setNoteText] = useState('');
  
  // State for Lost Reason Logic
  const [showLostConfirm, setShowLostConfirm] = useState(false);
  const [lostFormValues, setLostFormValues] = useState<Record<string, any>>({});

  // State for Duplication Logic
  const [showDuplicateUI, setShowDuplicateUI] = useState(false);
  const [duplicateFunnelId, setDuplicateFunnelId] = useState('');
  const [duplicateStageId, setDuplicateStageId] = useState('');

  if (!lead) return null;

  const currentFunnel = funnels.find(f => f.id === lead.funnelId);

  // --- Related Leads Logic ---
  const relatedLeads = leads.filter(l =>
    l.id !== lead.id && (
        (l.company && lead.company && l.company.trim().toLowerCase() === lead.company.trim().toLowerCase()) ||
        (l.contactEmail && lead.contactEmail && l.contactEmail.trim().toLowerCase() === lead.contactEmail.trim().toLowerCase())
    )
  );

  const handleSaveNote = (text: string = noteText) => {
    if (!text.trim()) return;
    const newNote = {
      id: `note-${Date.now()}`,
      content: text,
      createdAt: new Date().toISOString(),
      authorName: 'Eu' 
    };
    addNote(lead.id, newNote);
    setNoteText('');
  };

  const handleFunnelChange = (newFunnelId: string) => {
      const targetFunnel = funnels.find(f => f.id === newFunnelId);
      if (targetFunnel && targetFunnel.stages.length > 0) {
          updateLead(lead.id, { funnelId: newFunnelId, stageId: targetFunnel.stages[0].id });
      }
  };

  const handleMarkAsWon = () => {
    if (!currentFunnel) return;
    const targetStageId = currentFunnel.defaultWonStageId || currentFunnel.stages[currentFunnel.stages.length - 1].id;
    updateLead(lead.id, { 
        probability: 100,
        stageId: targetStageId
    });
    handleSaveNote("🎉 Negócio marcado como GANHO!");
    onClose();
  };

  const initiateMarkAsLost = () => {
      const hasLostFields = customFields.some(
          f => f.funnelId === lead.funnelId && f.context === 'lost_reason'
      );

      if (hasLostFields) {
          setShowLostConfirm(true);
      } else {
          confirmMarkAsLost();
      }
  };

  const confirmMarkAsLost = () => {
    const mergedCustomValues = { ...lead.customValues, ...lostFormValues };

    const updates: Partial<Lead> = { 
        probability: 0,
        customValues: mergedCustomValues
    };
    
    if (currentFunnel?.defaultLostStageId) {
        updates.stageId = currentFunnel.defaultLostStageId;
    }

    updateLead(lead.id, updates);

    if (Object.keys(lostFormValues).length > 0) {
        const reasonSummary = Object.entries(lostFormValues).map(([key, val]) => {
            const field = customFields.find(f => f.id === key);
            return field ? `${field.name}: ${val}` : '';
        }).filter(Boolean).join('\n');
        
        handleSaveNote(`🔴 Negócio marcado como PERDIDO.\n${reasonSummary}`);
    } else {
        handleSaveNote("🔴 Negócio marcado como PERDIDO.");
    }
    
    onClose();
  };

  const initiateDuplicate = () => {
      setDuplicateFunnelId(lead.funnelId);
      const funnel = funnels.find(f => f.id === lead.funnelId);
      setDuplicateStageId(funnel?.stages[0]?.id || '');
      setShowDuplicateUI(true);
  };

  const confirmDuplicate = () => {
      if (duplicateFunnelId && duplicateStageId) {
          duplicateLead(lead.id, duplicateFunnelId, duplicateStageId);
          onClose();
      }
  };

  const visibleStandardFields = customFields.filter(field => {
      if (field.context === 'lost_reason') return false; 
      if (field.funnelId !== lead.funnelId) return false;
      if (field.visibleStageIds.length > 0 && !field.visibleStageIds.includes(lead.stageId)) return false;
      return true;
  });

  const lostReasonFields = customFields.filter(field => {
      return field.context === 'lost_reason' && field.funnelId === lead.funnelId;
  });

  const getCustomValue = (fieldId: string, source: 'lead' | 'form' = 'lead') => {
      if (source === 'form') return lostFormValues[fieldId];
      return lead.customValues?.[fieldId];
  };

  const handleCustomFieldChange = (field: CustomFieldDefinition, value: any, source: 'lead' | 'form' = 'lead') => {
      if (source === 'lead') {
          const currentValues = lead.customValues || {};
          let newValue = value;
          if (field.type === 'multiselect') {
              const currentArray = (currentValues[field.id] as string[]) || [];
              newValue = currentArray.includes(value) ? currentArray.filter(v => v !== value) : [...currentArray, value];
          }
          updateLead(lead.id, { customValues: { ...currentValues, [field.id]: newValue } });
      } else {
          const currentValues = lostFormValues;
          let newValue = value;
          if (field.type === 'multiselect') {
              const currentArray = (currentValues[field.id] as string[]) || [];
              newValue = currentArray.includes(value) ? currentArray.filter(v => v !== value) : [...currentArray, value];
          }
          setLostFormValues({ ...currentValues, [field.id]: newValue });
      }
  };

  const isWon = lead.probability === 100;
  const isLost = lead.probability === 0;

  if (showLostConfirm) {
      return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in p-6">
                  <div className="flex items-center gap-3 text-red-600 mb-4">
                      <AlertCircle size={32} />
                      <h2 className="text-xl font-bold">Confirmar Perda</h2>
                  </div>
                  <p className="text-gray-600 mb-6 text-sm">
                      Por favor, preencha os motivos do descarte para concluir a operação.
                  </p>

                  <div className="space-y-4 mb-6">
                      {lostReasonFields.map(field => (
                           <div key={field.id}>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{field.name}</label>
                                
                                {field.type === 'text' && (
                                    <input 
                                        type="text"
                                        value={getCustomValue(field.id, 'form') || ''}
                                        onChange={(e) => handleCustomFieldChange(field, e.target.value, 'form')}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                                        placeholder="Descreva..."
                                    />
                                )}

                                {field.type === 'select' && (
                                    <select
                                        value={getCustomValue(field.id, 'form') || ''}
                                        onChange={(e) => handleCustomFieldChange(field, e.target.value, 'form')}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none bg-white"
                                    >
                                        <option value="">Selecione...</option>
                                        {field.options?.map(opt => (
                                            <option key={opt.id} value={opt.label}>{opt.label}</option>
                                        ))}
                                    </select>
                                )}

                                {field.type === 'multiselect' && (
                                    <div className="border border-gray-300 rounded-lg p-3 bg-gray-50 space-y-2 max-h-32 overflow-y-auto">
                                        {field.options?.map(opt => {
                                            const isSelected = (getCustomValue(field.id, 'form') as string[] || []).includes(opt.label);
                                            return (
                                                <label key={opt.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-0.5 rounded">
                                                    <input 
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleCustomFieldChange(field, opt.label, 'form')}
                                                        className="rounded text-red-600 focus:ring-red-500"
                                                    />
                                                    <span className="text-sm text-gray-700">{opt.label}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                           </div>
                      ))}
                  </div>

                  <div className="flex justify-end gap-3">
                      <button 
                          onClick={() => setShowLostConfirm(false)}
                          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition"
                      >
                          Cancelar
                      </button>
                      <button 
                          onClick={confirmMarkAsLost}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium shadow-sm flex items-center gap-2"
                      >
                          <Save size={16} /> Confirmar Descarte
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  if (showDuplicateUI) {
      const selectedDuplicateFunnel = funnels.find(f => f.id === duplicateFunnelId);
      return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in p-6">
                  <div className="flex items-center gap-3 text-blue-600 mb-4">
                      <Copy size={24} />
                      <h2 className="text-xl font-bold">Duplicar Lead</h2>
                  </div>
                  <p className="text-gray-600 mb-6 text-sm">
                      Uma cópia deste lead será criada. Selecione o destino:
                  </p>

                  <div className="space-y-4 mb-6">
                      <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Funil de Destino</label>
                          <select 
                             value={duplicateFunnelId}
                             onChange={(e) => {
                                 setDuplicateFunnelId(e.target.value);
                                 const f = funnels.find(fun => fun.id === e.target.value);
                                 setDuplicateStageId(f?.stages[0]?.id || '');
                             }}
                             className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                          >
                             {funnels.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Etapa</label>
                          <select 
                             value={duplicateStageId}
                             onChange={(e) => setDuplicateStageId(e.target.value)}
                             className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                          >
                             {selectedDuplicateFunnel?.stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                      </div>
                  </div>

                  <div className="flex justify-end gap-3">
                      <button 
                          onClick={() => setShowDuplicateUI(false)}
                          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition"
                      >
                          Cancelar
                      </button>
                      <button 
                          onClick={confirmDuplicate}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm flex items-center gap-2"
                      >
                          <Copy size={16} /> Duplicar
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-end z-50 transition-opacity">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
        
        {/* Header Editable */}
        <div className="h-20 border-b px-6 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3 flex-1 mr-8">
             <div className={`p-2 rounded-lg ${isWon ? 'bg-green-100' : isLost ? 'bg-red-100' : 'bg-blue-100'}`}>
                {isWon ? <CheckCircle className="text-green-600" size={24} /> : 
                 isLost ? <XCircle className="text-red-600" size={24} /> :
                 <Briefcase className="text-blue-600" size={24} />}
             </div>
             <div className="flex-1">
                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Título da Oportunidade</label>
                 <input
                     key={`title-${lead.id}`}
                     defaultValue={lead.title}
                     onBlur={(e) => updateLead(lead.id, { title: e.target.value })}
                     className="text-lg font-bold text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none w-full placeholder-gray-400 transition-colors"
                     placeholder="Nome da Oportunidade"
                 />
             </div>
          </div>
          <div className="flex items-center gap-2">
             <button 
                 onClick={initiateDuplicate}
                 className="p-2 hover:bg-blue-100 text-blue-600 rounded-full transition"
                 title="Duplicar Lead"
             >
                 <Copy size={20} />
             </button>
             <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition">
                <X size={20} />
             </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
            
            {/* Status Banner */}
            {isWon && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3 text-green-800 animate-scale-in">
                    <ThumbsUp size={24} />
                    <div>
                        <p className="font-bold">Venda Ganha!</p>
                        <p className="text-sm">Parabéns pelo fechamento deste negócio.</p>
                    </div>
                </div>
            )}
            
            {/* Company Edit Section */}
            <div className="mb-6">
                <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">Cliente / Empresa</label>
                <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-500 transition-all shadow-sm">
                    <Building className="text-gray-400" size={20} />
                    <input
                        key={`company-${lead.id}`}
                        defaultValue={lead.company}
                        onBlur={(e) => updateLead(lead.id, { company: e.target.value })}
                        className="flex-1 bg-transparent font-medium text-lg text-gray-700 outline-none placeholder-gray-400"
                        placeholder="Nome da Empresa ou Cliente"
                    />
                </div>
            </div>

            {/* Top Info Grid */}
            <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <label className="text-xs font-semibold text-gray-500 uppercase">Valor do Negócio</label>
                    <div className="flex items-center mt-1">
                        <span className="text-gray-400 mr-2 text-lg">R$</span>
                        <input 
                            type="number"
                            key={`value-${lead.id}`}
                            defaultValue={lead.value}
                            onBlur={(e) => updateLead(lead.id, { value: Number(e.target.value) })}
                            className="text-2xl font-bold text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none w-full"
                        />
                    </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                     <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Probabilidade</label>
                        <span className={`text-sm font-bold ${isWon ? 'text-green-600' : isLost ? 'text-red-600' : 'text-blue-600'}`}>
                            {lead.probability}%
                        </span>
                     </div>
                     <input 
                        type="range"
                        min="0" max="100"
                        disabled={isWon || isLost}
                        defaultValue={lead.probability}
                        onMouseUp={(e) => updateLead(lead.id, { probability: Number((e.target as HTMLInputElement).value) })}
                        onTouchEnd={(e) => updateLead(lead.id, { probability: Number((e.target as HTMLInputElement).value) })}
                        className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${isWon ? 'bg-green-200 accent-green-600' : isLost ? 'bg-red-200 accent-red-600' : 'bg-gray-200 accent-blue-600'}`}
                     />
                </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <button 
                    onClick={handleMarkAsWon}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border font-bold transition-all shadow-sm active:scale-95 ${
                        isWon 
                        ? 'bg-green-600 text-white border-green-600' 
                        : 'bg-white text-green-600 border-green-200 hover:bg-green-50 hover:border-green-300'
                    }`}
                >
                    <CheckCircle size={20} />
                    {isWon ? 'Venda Confirmada' : 'Marcar como Ganho'}
                </button>
                <button 
                    onClick={initiateMarkAsLost}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border font-bold transition-all shadow-sm active:scale-95 ${
                        isLost 
                        ? 'bg-red-600 text-white border-red-600' 
                        : 'bg-white text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300'
                    }`}
                >
                    <XCircle size={20} />
                    {isLost ? 'Venda Perdida' : 'Marcar como Perdido'}
                </button>
            </div>

            {/* Pipeline Controls */}
            <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 mb-8">
                <h3 className="text-xs font-bold text-blue-800 uppercase mb-3 flex items-center gap-2">
                    Mover Oportunidade
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-blue-600 mb-1 block">Funil</label>
                        <select 
                            value={lead.funnelId}
                            onChange={(e) => handleFunnelChange(e.target.value)}
                            className="w-full bg-white border border-blue-200 text-gray-700 text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                        >
                            {funnels.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-blue-600 mb-1 block">Etapa</label>
                         <select 
                            value={lead.stageId}
                            onChange={(e) => updateLead(lead.id, { stageId: e.target.value })}
                            className="w-full bg-white border border-blue-200 text-gray-700 text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                        >
                            {currentFunnel?.stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Related Opportunities */}
            {relatedLeads.length > 0 && (
                <div className="mb-8 border-t border-b border-gray-100 py-6">
                    <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Link size={16} className="text-blue-500" />
                        Outras Oportunidades ({relatedLeads.length})
                    </h3>
                    <div className="space-y-3">
                        {relatedLeads.map(rel => {
                             const relFunnel = funnels.find(f => f.id === rel.funnelId);
                             const relStage = relFunnel?.stages.find(s => s.id === rel.stageId);
                             return (
                                <div
                                   key={rel.id}
                                   onClick={() => onLeadSelect && onLeadSelect(rel.id)}
                                   className={`p-3 rounded-lg border border-gray-200 flex justify-between items-center bg-white ${onLeadSelect ? 'cursor-pointer hover:bg-gray-50 hover:border-blue-300 shadow-sm' : ''}`}
                                >
                                    <div>
                                        <div className="font-bold text-gray-800 text-sm">{rel.title}</div>
                                        <div className="text-xs text-gray-500">
                                           {relFunnel?.name} • <span className="text-gray-700 font-medium">{relStage?.name}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-gray-700 text-sm">R$ {rel.value.toLocaleString()}</div>
                                        <div className={`text-[10px] font-bold uppercase ${rel.probability === 100 ? 'text-green-600' : rel.probability === 0 ? 'text-red-600' : 'text-blue-600'}`}>
                                           {rel.probability === 100 ? 'Ganho' : rel.probability === 0 ? 'Perdido' : 'Em Aberto'}
                                        </div>
                                    </div>
                                </div>
                             );
                        })}
                    </div>
                </div>
            )}

            {/* Custom Fields */}
            {visibleStandardFields.length > 0 && (
                <div className="mb-8 border-t border-b border-gray-100 py-6">
                    <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <SlidersHorizontal size={16} className="text-blue-500" />
                        Informações Adicionais
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {visibleStandardFields.map(field => (
                            <div key={field.id} className={field.type === 'text' ? 'col-span-2' : ''}>
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">{field.name}</label>
                                
                                {field.type === 'text' && (
                                    <input 
                                        type="text"
                                        key={`cf-${field.id}-${lead.id}`}
                                        defaultValue={getCustomValue(field.id) || ''}
                                        onBlur={(e) => handleCustomFieldChange(field, e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder={`Digite ${field.name.toLowerCase()}...`}
                                    />
                                )}

                                {field.type === 'select' && (
                                    <select
                                        value={getCustomValue(field.id) || ''}
                                        onChange={(e) => handleCustomFieldChange(field, e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all"
                                    >
                                        <option value="">Selecione...</option>
                                        {field.options?.map(opt => (
                                            <option key={opt.id} value={opt.label}>{opt.label}</option>
                                        ))}
                                    </select>
                                )}

                                {field.type === 'multiselect' && (
                                    <div className="border border-gray-300 rounded-lg p-3 bg-white space-y-2 max-h-32 overflow-y-auto">
                                        {field.options?.map(opt => {
                                            const isSelected = (getCustomValue(field.id) as string[] || []).includes(opt.label);
                                            return (
                                                <label key={opt.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-0.5 rounded">
                                                    <input 
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleCustomFieldChange(field, opt.label)}
                                                        className="rounded text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className="text-sm text-gray-700">{opt.label}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Contact Info */}
            <div className="mb-8">
                <h3 className="text-sm font-bold text-gray-900 mb-4 border-b pb-2">Informações de Contato</h3>
                <div className="space-y-4">
                    <div className="flex items-center gap-3 group">
                        <User className="text-gray-400 group-focus-within:text-blue-500" size={18} />
                        <input 
                            key={`contactName-${lead.id}`}
                            defaultValue={lead.contactName}
                            onBlur={(e) => updateLead(lead.id, { contactName: e.target.value })}
                            className="flex-1 bg-transparent border-b border-gray-100 focus:border-blue-500 outline-none py-1 transition-colors"
                            placeholder="Nome do Contato"
                        />
                    </div>
                    <div className="flex items-center gap-3 group">
                        <Mail className="text-gray-400 group-focus-within:text-blue-500" size={18} />
                        <input 
                            key={`contactEmail-${lead.id}`}
                            defaultValue={lead.contactEmail}
                            onBlur={(e) => updateLead(lead.id, { contactEmail: e.target.value })}
                            className="flex-1 bg-transparent border-b border-gray-100 focus:border-blue-500 outline-none py-1 transition-colors"
                            placeholder="Email"
                        />
                    </div>
                    <div className="flex items-center gap-3 group">
                        <Phone className="text-gray-400 group-focus-within:text-blue-500" size={18} />
                        <input 
                            key={`contactPhone-${lead.id}`}
                            defaultValue={lead.contactPhone}
                            onBlur={(e) => updateLead(lead.id, { contactPhone: e.target.value })}
                            className="flex-1 bg-transparent border-b border-gray-100 focus:border-blue-500 outline-none py-1 transition-colors"
                            placeholder="Telefone"
                        />
                    </div>
                </div>
            </div>

            {/* Notes Section */}
            <div>
                 <h3 className="text-sm font-bold text-gray-900 mb-4 border-b pb-2 flex items-center justify-between">
                    <span>Histórico e Notas</span>
                    <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{lead.notes.length}</span>
                 </h3>
                 
                 <div className="flex gap-2 mb-6">
                    <textarea 
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Escreva uma nota ou atualização..."
                        className="flex-1 border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none h-20"
                    />
                    <button 
                        onClick={() => handleSaveNote()}
                        disabled={!noteText.trim()}
                        className="bg-blue-600 text-white rounded-lg px-4 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center shadow-sm"
                    >
                        <ArrowRight size={20} />
                    </button>
                 </div>

                 <div className="space-y-4">
                    {lead.notes.map(note => (
                        <div key={note.id} className={`p-4 rounded-xl text-sm border shadow-sm ${note.authorName.includes('AI') ? 'bg-gradient-to-r from-purple-50 to-white border-purple-100' : 'bg-white border-gray-100'}`}>
                            <div className="flex justify-between items-center mb-2">
                                <span className={`font-semibold ${note.authorName.includes('AI') ? 'text-purple-700 flex items-center gap-1' : 'text-gray-700'}`}>
                                    {note.authorName.includes('AI') && '✨ '}
                                    {note.authorName}
                                </span>
                                <span className="text-[10px] text-gray-400 uppercase tracking-wide">{new Date(note.createdAt).toLocaleString()}</span>
                            </div>
                            <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                        </div>
                    ))}
                 </div>
            </div>

        </div>
      </div>
    </div>
  );
};