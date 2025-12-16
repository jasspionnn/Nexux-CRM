
import React, { useState, useEffect, useRef } from 'react';
import { useCRM } from '../context/CRMContext';
import { 
  ArrowLeft, Check, X, User, Phone, Mail, Building, 
  Calendar, Clock, ChevronRight, ChevronDown, ChevronUp,
  Plus, MoreHorizontal, FileText, CheckCircle, XCircle,
  Copy, Save, AlertCircle, ThumbsUp, Send, Paperclip, Edit2, Sparkles, Settings, Trash2, PhoneCall
} from 'lucide-react';
import { CustomFieldDefinition, Lead, Task } from '../types';

interface EditableFieldProps {
  label: string;
  value: string | number;
  type?: 'text' | 'number' | 'email' | 'tel';
  onChange: (val: string) => void;
  placeholder?: string;
  icon?: React.ElementType;
}

const EditableField: React.FC<EditableFieldProps> = ({ label, value, type = 'text', onChange, placeholder = '-', icon: Icon }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (tempValue !== value) {
      onChange(String(tempValue));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
    if (e.key === 'Escape') {
      setTempValue(value);
      setIsEditing(false);
    }
  };

  return (
    <div className="flex flex-col group mb-1">
      <label className="text-xs text-gray-500 mb-1 flex items-center gap-1">
        {Icon && <Icon size={10} />}
        {label}
      </label>
      <div 
        onClick={() => setIsEditing(true)}
        className={`min-h-[28px] flex items-center text-sm rounded px-2 -ml-2 transition-colors cursor-pointer border border-transparent ${isEditing ? '' : 'hover:bg-gray-100 hover:border-gray-200'}`}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            type={type}
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full bg-white border border-blue-400 rounded px-1 outline-none text-gray-900"
          />
        ) : (
          <div className="flex items-center justify-between w-full">
            <span className={`truncate ${!value ? 'text-gray-400 italic' : 'text-gray-900 font-medium'}`}>
              {type === 'number' && value ? `R$ ${Number(value).toLocaleString()}` : (value || placeholder)}
            </span>
            <Edit2 size={12} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
      </div>
    </div>
  );
};

interface Props {
  leadId: string;
  onBack: () => void;
  onNavigate: (view: string, data?: any) => void;
}

export const LeadDetailPage: React.FC<Props> = ({ leadId, onBack, onNavigate }) => {
  const { leads, funnels, updateLead, duplicateLead, customFields, addTask, toggleTask, deleteTask } = useCRM();
  const lead = leads.find(l => l.id === leadId);
  
  // States
  const [activeTab, setActiveTab] = useState<'notes' | 'tasks'>('notes');
  const [noteText, setNoteText] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    negotiation: true,
    contact: true,
    custom: true
  });
  
  // Tasks Form State
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [newTaskData, setNewTaskData] = useState<{title: string, date: string, type: 'call' | 'email' | 'meeting' | 'todo'}>({
      title: '',
      date: '',
      type: 'todo'
  });
  
  // Modals / Overlays states
  const [showLostConfirm, setShowLostConfirm] = useState(false);
  const [lostFormValues, setLostFormValues] = useState<Record<string, any>>({});
  const [showDuplicateUI, setShowDuplicateUI] = useState(false);
  const [duplicateFunnelId, setDuplicateFunnelId] = useState('');
  const [duplicateStageId, setDuplicateStageId] = useState('');

  if (!lead) return <div className="p-8">Lead não encontrado. <button onClick={onBack} className="text-blue-500 underline">Voltar</button></div>;

  const currentFunnel = funnels.find(f => f.id === lead.funnelId);
  const currentStageIndex = currentFunnel?.stages.findIndex(s => s.id === lead.stageId) ?? -1;

  // --- Logic Helpers ---

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSaveNote = () => {
    if (!noteText.trim()) return;
    const newNote = {
      id: `note-${Date.now()}`,
      content: noteText,
      createdAt: new Date().toISOString(),
      authorName: 'Eu' 
    };
    updateLead(lead.id, { notes: [newNote, ...lead.notes] });
    setNoteText('');
  };

  const handleCreateTask = (e: React.FormEvent) => {
      e.preventDefault();
      if(!newTaskData.title) return;

      addTask(lead.id, {
          id: `t-${Date.now()}`,
          title: newTaskData.title,
          dueDate: newTaskData.date || new Date().toISOString(),
          type: newTaskData.type,
          completed: false
      });
      
      setNewTaskData({ title: '', date: '', type: 'todo' });
      setIsTaskFormOpen(false);
  };

  const handleMarkAsWon = () => {
    if (!currentFunnel) return;
    const targetStageId = currentFunnel.defaultWonStageId || currentFunnel.stages[currentFunnel.stages.length - 1].id;
    updateLead(lead.id, { 
        probability: 100,
        stageId: targetStageId
    });
    // Add system note
    const newNote = {
        id: `sys-${Date.now()}`,
        content: "🎉 Negócio marcado como GANHO!",
        createdAt: new Date().toISOString(),
        authorName: 'Sistema'
    };
    updateLead(lead.id, { notes: [newNote, ...lead.notes] });
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
    const updates: Partial<Lead> = { probability: 0, customValues: mergedCustomValues };
    
    if (currentFunnel?.defaultLostStageId) {
        updates.stageId = currentFunnel.defaultLostStageId;
    }

    const reasonSummary = Object.keys(lostFormValues).length > 0 
        ? Object.entries(lostFormValues).map(([key, val]) => {
            const field = customFields.find(f => f.id === key);
            return field ? `${field.name}: ${val}` : '';
        }).filter(Boolean).join('\n')
        : '';

    const newNote = {
        id: `sys-${Date.now()}`,
        content: `🔴 Negócio marcado como PERDIDO.${reasonSummary ? `\nMotivo: ${reasonSummary}` : ''}`,
        createdAt: new Date().toISOString(),
        authorName: 'Sistema'
    };

    updateLead(lead.id, { ...updates, notes: [newNote, ...lead.notes] });
    setShowLostConfirm(false);
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
          setShowDuplicateUI(false);
          alert("Lead duplicado com sucesso! Verifique a base de leads.");
      }
  };

  // --- Fields Filtering ---
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

  // --- Render Helpers ---

  const isWon = lead.probability === 100;
  const isLost = lead.probability === 0;

  const sortedTasks = [...(lead.tasks || [])].sort((a, b) => {
      if (a.completed === b.completed) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return a.completed ? 1 : -1;
  });

  const TaskIcon = ({ type }: { type: Task['type'] }) => {
      switch (type) {
          case 'call': return <PhoneCall size={16} className="text-blue-500" />;
          case 'email': return <Mail size={16} className="text-yellow-500" />; // Use Mail (not aliased)
          case 'meeting': return <User size={16} className="text-purple-500" />;
          default: return <CheckCircle size={16} className="text-green-500" />;
      }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden animate-fade-in relative">
        
        {/* === MODALS === */}
        {showLostConfirm && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-scale-in">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <AlertCircle className="text-red-500" /> Confirmar Perda
                    </h3>
                    <div className="space-y-4 mb-6">
                        {lostReasonFields.length > 0 ? lostReasonFields.map(field => (
                            <div key={field.id}>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{field.name}</label>
                                {field.type === 'select' ? (
                                    <select 
                                        className="w-full border rounded p-2"
                                        value={getCustomValue(field.id, 'form') || ''}
                                        onChange={e => handleCustomFieldChange(field, e.target.value, 'form')}
                                    >
                                        <option value="">Selecione...</option>
                                        {field.options?.map(o => <option key={o.id} value={o.label}>{o.label}</option>)}
                                    </select>
                                ) : (
                                    <input 
                                        className="w-full border rounded p-2"
                                        value={getCustomValue(field.id, 'form') || ''}
                                        onChange={e => handleCustomFieldChange(field, e.target.value, 'form')}
                                    />
                                )}
                            </div>
                        )) : <p className="text-gray-600">Tem certeza que deseja marcar como perdido?</p>}
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setShowLostConfirm(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                        <button onClick={confirmMarkAsLost} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Confirmar</button>
                    </div>
                </div>
            </div>
        )}

        {showDuplicateUI && (
             <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 animate-scale-in">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Copy className="text-blue-500" /> Duplicar Lead
                    </h3>
                    <div className="space-y-3 mb-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Funil</label>
                            <select 
                                className="w-full border rounded p-2 text-sm"
                                value={duplicateFunnelId}
                                onChange={e => {
                                    setDuplicateFunnelId(e.target.value);
                                    const f = funnels.find(fun => fun.id === e.target.value);
                                    setDuplicateStageId(f?.stages[0]?.id || '');
                                }}
                            >
                                {funnels.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Etapa</label>
                             {(() => {
                                const selectedDuplicateFunnel = funnels.find(f => f.id === duplicateFunnelId);
                                return (
                                    <select 
                                        className="w-full border rounded p-2 text-sm"
                                        value={duplicateStageId}
                                        onChange={e => setDuplicateStageId(e.target.value)}
                                    >
                                        {selectedDuplicateFunnel?.stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                )
                            })()}
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setShowDuplicateUI(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                        <button onClick={confirmDuplicate} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Duplicar</button>
                    </div>
                </div>
            </div>
        )}

        {/* === HEADER === */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0 shadow-sm z-20">
            <div className="flex items-center gap-4 flex-1">
                <button onClick={onBack} className="text-blue-600 hover:text-blue-800 transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-1 group">
                    <input 
                        value={lead.title}
                        onChange={(e) => updateLead(lead.id, { title: e.target.value })}
                        className="text-xl font-bold text-gray-800 w-full outline-none bg-transparent hover:bg-gray-50 focus:bg-white focus:ring-1 focus:ring-blue-200 rounded px-1 transition-all"
                    />
                    <div className="flex items-center gap-2 mt-1">
                        {lead.tags.map(tag => (
                            <span key={tag} className="text-[10px] uppercase font-bold px-2 py-0.5 bg-gray-100 text-gray-600 rounded-sm">
                                {tag}
                            </span>
                        ))}
                         <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-blue-50 text-blue-600 rounded-sm border border-blue-100">
                             {currentFunnel?.name}
                         </span>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                 <button onClick={initiateDuplicate} className="text-gray-400 hover:text-blue-600 p-2 hover:bg-gray-100 rounded-full transition-all" title="Duplicar">
                     <Copy size={18} />
                 </button>
                 <div className="h-6 w-px bg-gray-200 mx-1"></div>
                 {isWon ? (
                     <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-md font-bold text-sm animate-scale-in">
                         <CheckCircle size={18} /> Venda Ganha
                     </div>
                 ) : isLost ? (
                     <div className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-md font-bold text-sm animate-scale-in">
                         <XCircle size={18} /> Venda Perdida
                     </div>
                 ) : (
                    <>
                        <button 
                            onClick={initiateMarkAsLost}
                            className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-md font-medium text-sm transition-colors"
                        >
                            <X size={16} /> Marcar perda
                        </button>
                        <button 
                            onClick={handleMarkAsWon}
                            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md font-medium text-sm transition-colors shadow-sm"
                        >
                            <ThumbsUp size={16} /> Marcar venda
                        </button>
                    </>
                 )}
            </div>
        </header>

        {/* === PIPELINE BAR === */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 overflow-x-auto shrink-0">
             <div className="flex w-full min-w-[600px] h-9 rounded-sm overflow-hidden">
                 {currentFunnel?.stages.map((stage, index) => {
                     let status = 'future';
                     if (isWon) status = 'completed';
                     else if (isLost && index === currentStageIndex) status = 'lost';
                     else if (index < currentStageIndex) status = 'completed';
                     else if (index === currentStageIndex) status = 'current';

                     const bgColor = 
                        status === 'completed' ? 'bg-green-100 text-green-700' :
                        status === 'current' ? 'bg-blue-600 text-white' :
                        status === 'lost' ? 'bg-red-600 text-white' :
                        'bg-gray-200 text-gray-500';

                     return (
                         <div 
                            key={stage.id} 
                            onClick={() => !isWon && !isLost && updateLead(lead.id, { stageId: stage.id })}
                            className={`flex-1 relative flex items-center justify-center text-xs font-semibold select-none cursor-pointer transition-all group ${bgColor}`}
                            style={{
                                clipPath: index === currentFunnel.stages.length - 1 
                                    ? 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 12px 50%)'
                                    : index === 0 
                                        ? 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)'
                                        : 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%, 12px 50%)',
                                marginLeft: index === 0 ? 0 : '-12px',
                                zIndex: index
                            }}
                         >
                             {status === 'completed' && <Check size={14} className="mr-1" />}
                             {status === 'lost' && <X size={14} className="mr-1" />}
                             <span className="z-10 px-4 truncate">{stage.name}</span>
                         </div>
                     );
                 })}
             </div>
        </div>

        {/* === MAIN CONTENT === */}
        <div className="flex-1 flex overflow-hidden">
            
            {/* LEFT COLUMN: PROPERTIES */}
            <div className="w-[340px] bg-white border-r border-gray-200 overflow-y-auto shrink-0 flex flex-col">
                
                {/* Section: Negociação */}
                <div className="border-b border-gray-100">
                    <button 
                        onClick={() => toggleSection('negotiation')}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                        <h3 className="font-bold text-gray-800 text-sm">Negociação</h3>
                        {expandedSections.negotiation ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </button>
                    {expandedSections.negotiation && (
                        <div className="px-4 pb-4 space-y-2">
                             <EditableField 
                                label="Nome" 
                                value={lead.title} 
                                onChange={(val) => updateLead(lead.id, { title: val })} 
                             />
                             <EditableField 
                                label="Valor" 
                                value={lead.value} 
                                type="number"
                                onChange={(val) => updateLead(lead.id, { value: Number(val) })} 
                             />
                             <EditableField 
                                label="Empresa" 
                                value={lead.company} 
                                onChange={(val) => updateLead(lead.id, { company: val })} 
                                icon={Building}
                             />
                             <div className="flex flex-col pt-2">
                                <label className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                                    <Calendar size={10} /> Criado em
                                </label>
                                <span className="text-sm text-gray-700 px-2">{new Date(lead.createdAt).toLocaleDateString()}</span>
                             </div>
                        </div>
                    )}
                </div>

                {/* Section: Contact */}
                <div className="border-b border-gray-100">
                    <button 
                        onClick={() => toggleSection('contact')}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                        <h3 className="font-bold text-gray-800 text-sm">Contato</h3>
                        {expandedSections.contact ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </button>
                    {expandedSections.contact && (
                        <div className="px-4 pb-4 space-y-2">
                             <EditableField 
                                label="Nome" 
                                value={lead.contactName} 
                                onChange={(val) => updateLead(lead.id, { contactName: val })} 
                                icon={User}
                             />
                             <EditableField 
                                label="Email" 
                                value={lead.contactEmail} 
                                onChange={(val) => updateLead(lead.id, { contactEmail: val })} 
                                icon={Mail}
                             />
                             <EditableField 
                                label="Telefone" 
                                value={lead.contactPhone} 
                                onChange={(val) => updateLead(lead.id, { contactPhone: val })} 
                                icon={Phone}
                             />
                        </div>
                    )}
                </div>

                {/* Section: Custom Fields */}
                {visibleStandardFields.length > 0 && (
                    <div className="border-b border-gray-100">
                        <button 
                            onClick={() => toggleSection('custom')}
                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                        >
                            <h3 className="font-bold text-gray-800 text-sm">Informações Adicionais</h3>
                            {expandedSections.custom ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                        </button>
                        {expandedSections.custom && (
                            <div className="px-4 pb-4 space-y-4">
                                {visibleStandardFields.map(field => (
                                    <div key={field.id} className="flex flex-col">
                                        <label className="text-xs text-gray-500 mb-1">{field.name}</label>
                                        
                                        {field.type === 'text' && (
                                            <EditableField 
                                                label="" // No label since we render it above
                                                value={getCustomValue(field.id) || ''}
                                                onChange={(val) => handleCustomFieldChange(field, val)}
                                            />
                                        )}

                                        {field.type === 'select' && (
                                            <select
                                                value={getCustomValue(field.id) || ''}
                                                onChange={(e) => handleCustomFieldChange(field, e.target.value)}
                                                className="text-sm font-medium text-gray-900 border-b border-gray-200 focus:border-blue-500 outline-none py-1 w-full bg-transparent cursor-pointer"
                                            >
                                                <option value="">-</option>
                                                {field.options?.map(opt => (
                                                    <option key={opt.id} value={opt.label}>{opt.label}</option>
                                                ))}
                                            </select>
                                        )}

                                        {field.type === 'multiselect' && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {field.options?.map(opt => {
                                                    const isSelected = (getCustomValue(field.id) as string[] || []).includes(opt.label);
                                                    return (
                                                        <button 
                                                            key={opt.id}
                                                            onClick={() => handleCustomFieldChange(field, opt.label)}
                                                            className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${isSelected ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                                                        >
                                                            {opt.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* RIGHT COLUMN: TIMELINE & TABS */}
            <div className="flex-1 bg-gray-50 flex flex-col min-w-0">
                
                {/* Tabs */}
                <div className="bg-white border-b border-gray-200 px-6 pt-2">
                    <div className="flex gap-6">
                        <button 
                            onClick={() => setActiveTab('notes')}
                            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'notes' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            <FileText size={16} /> Notas
                        </button>
                        <button 
                            onClick={() => setActiveTab('tasks')}
                            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'tasks' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            <CheckCircle size={16} /> Tarefas
                        </button>
                    </div>
                </div>

                {/* Tab Content Area */}
                <div className="flex-1 overflow-y-auto p-6">
                    
                    {/* Add Note Input (Visible on Notes) */}
                    {activeTab === 'notes' && (
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-8">
                            <textarea 
                                value={noteText}
                                onChange={e => setNoteText(e.target.value)}
                                placeholder="Escreva uma observação..."
                                className="w-full text-sm outline-none resize-none min-h-[80px] placeholder-gray-400"
                            />
                            <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50">
                                <div className="flex gap-2">
                                    <button className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-50"><Paperclip size={18} /></button>
                                </div>
                                <button 
                                    onClick={handleSaveNote}
                                    disabled={!noteText.trim()}
                                    className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Salvar Nota
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'tasks' && (
                        <div className="mb-8">
                            {/* New Task Button / Form */}
                            {!isTaskFormOpen ? (
                                <button 
                                    onClick={() => setIsTaskFormOpen(true)}
                                    className="w-full py-3 bg-white border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-2 font-medium mb-4"
                                >
                                    <Plus size={18} /> Nova Tarefa
                                </button>
                            ) : (
                                <form onSubmit={handleCreateTask} className="bg-white p-4 rounded-lg border border-blue-200 shadow-sm mb-4 animate-scale-in">
                                    <div className="mb-3">
                                        <input 
                                            autoFocus
                                            placeholder="O que precisa ser feito?"
                                            className="w-full text-sm font-medium border-b border-gray-200 pb-2 outline-none focus:border-blue-500"
                                            value={newTaskData.title}
                                            onChange={e => setNewTaskData({...newTaskData, title: e.target.value})}
                                        />
                                    </div>
                                    <div className="flex gap-3 mb-4">
                                        <div className="flex-1">
                                            <label className="text-xs text-gray-500 block mb-1">Data e Hora</label>
                                            <input 
                                                type="datetime-local"
                                                className="w-full text-xs border border-gray-300 rounded px-2 py-1.5"
                                                value={newTaskData.date}
                                                onChange={e => setNewTaskData({...newTaskData, date: e.target.value})}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-xs text-gray-500 block mb-1">Tipo</label>
                                            <select 
                                                className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 bg-white"
                                                value={newTaskData.type}
                                                onChange={e => setNewTaskData({...newTaskData, type: e.target.value as any})}
                                            >
                                                <option value="todo">Tarefa</option>
                                                <option value="call">Ligação</option>
                                                <option value="email">Email</option>
                                                <option value="meeting">Reunião</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button 
                                            type="button" 
                                            onClick={() => setIsTaskFormOpen(false)}
                                            className="text-xs px-3 py-1.5 text-gray-500 hover:bg-gray-100 rounded"
                                        >
                                            Cancelar
                                        </button>
                                        <button 
                                            type="submit" 
                                            disabled={!newTaskData.title}
                                            className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            Salvar Tarefa
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* Tasks List */}
                            <div className="space-y-2">
                                {sortedTasks.length === 0 && !isTaskFormOpen && (
                                     <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
                                        <div className="mx-auto w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-3">
                                            <CheckCircle className="text-blue-500" />
                                        </div>
                                        <h3 className="text-gray-800 font-bold">Nenhuma tarefa agendada</h3>
                                        <p className="text-gray-500 text-sm mt-1">Crie tarefas para não esquecer follow-ups.</p>
                                    </div>
                                )}
                                
                                {sortedTasks.map(task => {
                                    const isOverdue = !task.completed && new Date(task.dueDate) < new Date();
                                    
                                    return (
                                        <div 
                                            key={task.id} 
                                            className={`group flex items-center gap-3 p-3 bg-white border rounded-lg transition-all ${task.completed ? 'opacity-60 bg-gray-50 border-gray-100' : 'border-gray-200 hover:shadow-sm hover:border-blue-300'}`}
                                        >
                                            <button 
                                                onClick={() => toggleTask(lead.id, task.id)}
                                                className={`flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${task.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-blue-500 text-transparent hover:text-blue-200'}`}
                                            >
                                                <Check size={14} strokeWidth={3} />
                                            </button>
                                            
                                            <div className="flex-1 min-w-0">
                                                <div className={`text-sm font-medium truncate ${task.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                                                    {task.title}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <TaskIcon type={task.type} />
                                                    <span className={`text-xs ${isOverdue ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                                                        {new Date(task.dueDate).toLocaleString()}
                                                        {isOverdue && ' (Atrasada)'}
                                                    </span>
                                                </div>
                                            </div>

                                            <button 
                                                onClick={() => deleteTask(lead.id, task.id)}
                                                className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full hover:bg-red-50"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Timeline (Always visible for context, or can be filtered if needed. Here we keep it as general history below notes) */}
                    <div className="relative pl-4 space-y-8 mt-8">
                         {/* Vertical Line */}
                         <div className="absolute left-[27px] top-2 bottom-0 w-0.5 bg-gray-200"></div>

                         {lead.notes.map(note => {
                             const isSystem = note.authorName === 'Sistema';
                             const isAI = note.authorName.includes('AI') || note.authorName.includes('Insight');
                             
                             return (
                                 <div key={note.id} className="relative pl-10 animate-fade-in">
                                     {/* Icon Node */}
                                     <div className={`absolute left-0 top-0 w-14 h-14 flex items-center justify-center`}>
                                         <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center z-10 bg-white ${isSystem ? 'border-gray-300 text-gray-500' : isAI ? 'border-purple-300 text-purple-600' : 'border-blue-200 text-blue-600'}`}>
                                            {isSystem ? <Settings size={14} /> : isAI ? <Sparkles size={14} /> : <User size={14} />}
                                         </div>
                                     </div>
                                     
                                     {/* Content */}
                                     <div className={`rounded-lg border p-4 ${isSystem ? 'bg-gray-50 border-gray-200' : isAI ? 'bg-purple-50 border-purple-100' : 'bg-white border-gray-200 shadow-sm'}`}>
                                         <div className="flex justify-between items-center mb-2">
                                             <span className={`text-sm font-bold ${isSystem ? 'text-gray-600' : isAI ? 'text-purple-700' : 'text-gray-800'}`}>
                                                 {isSystem ? 'Atualização do Sistema' : note.authorName}
                                             </span>
                                             <span className="text-xs text-gray-400">
                                                 {new Date(note.createdAt).toLocaleString()}
                                             </span>
                                         </div>
                                         <div className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                                             {note.content}
                                         </div>
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
