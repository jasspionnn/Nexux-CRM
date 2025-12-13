
import React, { useState, useRef } from 'react';
import { useCRM } from '../context/CRMContext';
import { Plus, GripVertical, Building, Layers, SlidersHorizontal, Trash2, CheckSquare, Type, List, ArrowRight, AlertOctagon, FileText } from 'lucide-react';
import { CustomFieldDefinition, CustomFieldOption, CustomFieldType, CustomFieldContext } from '../types';

type SettingsTab = 'pipeline' | 'fields';

export const Settings = () => {
  const { funnels, addFunnel, updateFunnel, addStage, reorderStages, customFields, addCustomField, deleteCustomField } = useCRM();
  const [activeTab, setActiveTab] = useState<SettingsTab>('pipeline');
  
  // Pipeline State
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>(funnels[0]?.id || '');
  const [newFunnelName, setNewFunnelName] = useState('');
  const [newStageName, setNewStageName] = useState('');
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // Custom Fields State
  const [fieldFunnelId, setFieldFunnelId] = useState<string>(funnels[0]?.id || '');
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState<CustomFieldType>('text');
  const [fieldContext, setFieldContext] = useState<CustomFieldContext>('lead_detail');
  const [fieldOptions, setFieldOptions] = useState<CustomFieldOption[]>([]);
  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [fieldVisibleStages, setFieldVisibleStages] = useState<string[]>([]);

  const selectedFunnel = funnels.find(f => f.id === selectedFunnelId);
  const fieldFunnel = funnels.find(f => f.id === fieldFunnelId);

  // --- Pipeline Handlers ---
  const handleAddFunnel = () => {
    if (newFunnelName.trim()) {
      addFunnel(newFunnelName);
      setNewFunnelName('');
    }
  };

  const handleAddStage = () => {
    if (selectedFunnelId && newStageName.trim()) {
      addStage(selectedFunnelId, newStageName);
      setNewStageName('');
    }
  };

  const handleDragStart = (position: number) => {
    dragItem.current = position;
  };

  const handleDragEnter = (position: number) => {
    dragOverItem.current = position;
    if (selectedFunnel && dragItem.current !== null && dragOverItem.current !== null) {
        const copyListItems = [...selectedFunnel.stages];
        const dragItemContent = copyListItems[dragItem.current];
        copyListItems.splice(dragItem.current, 1);
        copyListItems.splice(dragOverItem.current, 0, dragItemContent);
        dragItem.current = dragOverItem.current;
        reorderStages(selectedFunnel.id, copyListItems);
    }
  };

  const handleDragEnd = () => {
    dragItem.current = null;
    dragOverItem.current = null;
  };

  // --- Custom Field Handlers ---
  const handleAddOption = () => {
    if (!newOptionLabel.trim()) return;
    setFieldOptions([...fieldOptions, { id: `opt-${Date.now()}`, label: newOptionLabel }]);
    setNewOptionLabel('');
  };

  const handleRemoveOption = (id: string) => {
    setFieldOptions(fieldOptions.filter(o => o.id !== id));
  };

  const toggleStageVisibility = (stageId: string) => {
    if (fieldVisibleStages.includes(stageId)) {
        setFieldVisibleStages(fieldVisibleStages.filter(id => id !== stageId));
    } else {
        setFieldVisibleStages([...fieldVisibleStages, stageId]);
    }
  };

  const handleCreateField = () => {
    if (!fieldName.trim() || !fieldFunnelId) return;
    
    const newField: CustomFieldDefinition = {
        id: `cf-${Date.now()}`,
        name: fieldName,
        type: fieldType,
        context: fieldContext,
        funnelId: fieldFunnelId,
        visibleStageIds: fieldContext === 'lead_detail' ? fieldVisibleStages : [], // Visibility irrelevant for lost reason (always shown on lost modal)
        options: (fieldType === 'select' || fieldType === 'multiselect') ? fieldOptions : undefined
    };

    addCustomField(newField);
    
    // Reset Form
    setFieldName('');
    setFieldType('text');
    setFieldOptions([]);
    setFieldVisibleStages([]);
    // Keep context and funnel same for convenience
  };

  return (
    <div className="p-8 h-full flex flex-col bg-gray-50 animate-fade-in">
      <div className="mb-6 flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">Configurações</h2>
            <p className="text-gray-500 mt-1">Gerencie funis, etapas e campos personalizados.</p>
        </div>
        <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200">
            <button 
                onClick={() => setActiveTab('pipeline')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'pipeline' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
            >
                Funis e Etapas
            </button>
            <button 
                onClick={() => setActiveTab('fields')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'fields' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
            >
                Campos Personalizados
            </button>
        </div>
      </div>
      
      {activeTab === 'pipeline' ? (
        <div className="flex gap-8 flex-1 min-h-0">
            {/* List of Funnels */}
            <div className="w-80 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
            <div className="p-4 border-b bg-gray-50 font-semibold text-gray-700 flex items-center gap-2">
                <Building size={18} />
                Funis de Vendas
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {funnels.map(funnel => (
                <button 
                    key={funnel.id}
                    onClick={() => setSelectedFunnelId(funnel.id)}
                    className={`w-full text-left p-3 rounded-lg flex justify-between items-center transition-all ${
                    selectedFunnelId === funnel.id 
                    ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm border' 
                    : 'hover:bg-gray-50 text-gray-600 border border-transparent'
                    }`}
                >
                    <span className="font-medium truncate">{funnel.name}</span>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    {funnel.stages.length}
                    </span>
                </button>
                ))}
            </div>

            <div className="p-4 border-t bg-gray-50">
                <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Novo Funil</label>
                <div className="flex gap-2">
                <input 
                    value={newFunnelName}
                    onChange={e => setNewFunnelName(e.target.value)}
                    placeholder="Ex: Pós-Venda"
                    className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-gray-900 bg-white"
                />
                <button 
                    onClick={handleAddFunnel}
                    disabled={!newFunnelName.trim()}
                    className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Plus size={20} />
                </button>
                </div>
            </div>
            </div>

            {/* Stages Editor */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
            {selectedFunnel ? (
                <>
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase tracking-wider">Editando</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">{selectedFunnel.name}</h3>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                    <div className="space-y-3 max-w-3xl">
                    {selectedFunnel.stages.map((stage, index) => (
                        <div 
                            key={stage.id} 
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragEnter={() => handleDragEnter(index)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => e.preventDefault()}
                            className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl shadow-sm group hover:border-blue-300 transition-all cursor-move active:cursor-grabbing"
                        >
                        <div className="text-gray-300 cursor-grab hover:text-gray-500">
                            <GripVertical size={20} />
                        </div>
                        <div className={`w-2 h-10 rounded-full ${stage.color.split(' ')[0]}`}></div>
                        <div className="flex-1">
                            <div className="font-semibold text-gray-800">{stage.name}</div>
                            <div className="text-xs text-gray-500 mt-0.5">Posição {index + 1}</div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-md">
                                Arrastar para reordenar
                            </div>
                        </div>
                        </div>
                    ))}
                    </div>

                    {/* Automation Settings */}
                    <div className="max-w-3xl mt-8 pt-6 border-t border-gray-200">
                        <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                           <ArrowRight size={16} className="text-purple-500" />
                           Automação de Conclusão
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                              <label className="block text-xs font-bold text-green-600 uppercase mb-2">Ao marcar como GANHO</label>
                              <p className="text-xs text-gray-500 mb-2">Mover automaticamente o lead para:</p>
                              <select 
                                 value={selectedFunnel.defaultWonStageId || ''}
                                 onChange={(e) => updateFunnel(selectedFunnel.id, { defaultWonStageId: e.target.value })}
                                 className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none bg-white text-gray-900"
                              >
                                 <option value="">Última etapa (Padrão)</option>
                                 {selectedFunnel.stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                              </select>
                           </div>
                           <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                              <label className="block text-xs font-bold text-red-600 uppercase mb-2">Ao marcar como PERDIDO</label>
                              <p className="text-xs text-gray-500 mb-2">Mover automaticamente o lead para:</p>
                              <select 
                                 value={selectedFunnel.defaultLostStageId || ''}
                                 onChange={(e) => updateFunnel(selectedFunnel.id, { defaultLostStageId: e.target.value })}
                                 className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none bg-white text-gray-900"
                              >
                                 <option value="">Manter etapa atual (Padrão)</option>
                                 {selectedFunnel.stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                              </select>
                           </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t bg-white">
                    <div className="max-w-3xl">
                        <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <Layers size={16} className="text-blue-500"/>
                            Adicionar Nova Etapa
                        </h4>
                        <div className="flex gap-3">
                        <input 
                            value={newStageName}
                            onChange={e => setNewStageName(e.target.value)}
                            placeholder="Nome da etapa (ex: Negociação)"
                            className="flex-1 text-sm border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all text-gray-900 bg-white"
                        />
                        <button 
                            onClick={handleAddStage}
                            disabled={!newStageName.trim()}
                            className="bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium shadow-sm"
                        >
                            <Plus size={18} />
                            Adicionar Etapa
                        </button>
                        </div>
                    </div>
                </div>
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                <Building size={48} className="mb-4 opacity-20" />
                <p>Selecione um funil ao lado para gerenciar suas etapas.</p>
                </div>
            )}
            </div>
        </div>
      ) : (
        <div className="flex gap-8 flex-1 min-h-0">
             {/* Left: Create Field Form */}
             <div className="w-96 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-y-auto">
                 <div className="p-5 border-b border-gray-100">
                     <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Plus size={18} className="text-blue-600" />
                        Novo Campo Personalizado
                     </h3>
                 </div>
                 <div className="p-6 space-y-6">
                     {/* Name */}
                     <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome do Campo</label>
                         <input 
                            value={fieldName}
                            onChange={(e) => setFieldName(e.target.value)}
                            placeholder="Ex: Motivo da Perda, Origem..."
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
                         />
                     </div>
                     
                     {/* Funnel Select */}
                     <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1.5">Funil</label>
                         <select 
                             value={fieldFunnelId}
                             onChange={(e) => {
                                 setFieldFunnelId(e.target.value);
                                 setFieldVisibleStages([]); // Reset stages when funnel changes
                             }}
                             className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none bg-white text-gray-900"
                         >
                             {funnels.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                         </select>
                     </div>

                     {/* Context Select (Where it appears) */}
                     <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1.5">Contexto de Uso</label>
                         <div className="grid grid-cols-2 gap-2">
                             <button 
                                onClick={() => setFieldContext('lead_detail')}
                                className={`p-3 border rounded-lg text-xs font-medium flex flex-col items-center gap-1 transition-all ${fieldContext === 'lead_detail' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'}`}
                             >
                                 <FileText size={16} /> 
                                 Detalhes do Lead
                             </button>
                             <button 
                                onClick={() => setFieldContext('lost_reason')}
                                className={`p-3 border rounded-lg text-xs font-medium flex flex-col items-center gap-1 transition-all ${fieldContext === 'lost_reason' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'}`}
                             >
                                 <AlertOctagon size={16} /> 
                                 Motivo de Descarte
                             </button>
                         </div>
                         <p className="text-[10px] text-gray-500 mt-1">
                             {fieldContext === 'lead_detail' ? 'Aparece no formulário principal do lead.' : 'Aparece apenas ao marcar o lead como Perdido.'}
                         </p>
                     </div>

                     {/* Type Select */}
                     <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de Campo</label>
                         <div className="grid grid-cols-3 gap-2">
                             <button 
                                onClick={() => setFieldType('text')}
                                className={`p-2 border rounded-lg text-xs font-medium flex flex-col items-center gap-1 transition-all ${fieldType === 'text' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'}`}
                             >
                                 <Type size={16} /> Texto
                             </button>
                             <button 
                                onClick={() => setFieldType('select')}
                                className={`p-2 border rounded-lg text-xs font-medium flex flex-col items-center gap-1 transition-all ${fieldType === 'select' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'}`}
                             >
                                 <List size={16} /> Única
                             </button>
                             <button 
                                onClick={() => setFieldType('multiselect')}
                                className={`p-2 border rounded-lg text-xs font-medium flex flex-col items-center gap-1 transition-all ${fieldType === 'multiselect' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'}`}
                             >
                                 <CheckSquare size={16} /> Múltipla
                             </button>
                         </div>
                     </div>

                     {/* Options Builder (for select/multiselect) */}
                     {(fieldType === 'select' || fieldType === 'multiselect') && (
                         <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Opções de Seleção</label>
                             <div className="flex gap-2 mb-2">
                                 <input 
                                    value={newOptionLabel}
                                    onChange={(e) => setNewOptionLabel(e.target.value)}
                                    placeholder="Nova opção..."
                                    className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 text-gray-900 bg-white"
                                 />
                                 <button onClick={handleAddOption} className="bg-gray-200 hover:bg-gray-300 rounded p-1">
                                     <Plus size={16} />
                                 </button>
                             </div>
                             <ul className="space-y-1 max-h-32 overflow-y-auto">
                                 {fieldOptions.map(opt => (
                                     <li key={opt.id} className="flex justify-between items-center bg-white px-2 py-1 rounded border border-gray-200 text-sm text-gray-700">
                                         <span>{opt.label}</span>
                                         <button onClick={() => handleRemoveOption(opt.id)} className="text-red-400 hover:text-red-600">
                                             <XIcon size={14} />
                                         </button>
                                     </li>
                                 ))}
                                 {fieldOptions.length === 0 && <li className="text-xs text-gray-400 italic">Nenhuma opção adicionada.</li>}
                             </ul>
                         </div>
                     )}

                     {/* Stage Visibility (Only for Standard Fields) */}
                     {fieldContext === 'lead_detail' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Visibilidade por Etapa</label>
                            <p className="text-xs text-gray-500 mb-2">Se nenhuma for selecionada, aparecerá em todas.</p>
                            <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3">
                                {fieldFunnel?.stages.map(stage => (
                                    <label key={stage.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                        <input 
                                            type="checkbox"
                                            checked={fieldVisibleStages.includes(stage.id)}
                                            onChange={() => toggleStageVisibility(stage.id)}
                                            className="rounded text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700">{stage.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                     )}

                     <button 
                        onClick={handleCreateField}
                        disabled={!fieldName.trim()}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                     >
                         Criar Campo
                     </button>
                 </div>
             </div>

             {/* Right: Existing Fields List */}
             <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6 overflow-hidden flex flex-col">
                 <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                     <SlidersHorizontal className="text-gray-500" />
                     Campos Existentes
                 </h3>
                 <div className="flex-1 overflow-y-auto space-y-3">
                     {customFields.length === 0 ? (
                         <div className="text-center text-gray-400 py-12">
                             <SlidersHorizontal size={48} className="mx-auto mb-3 opacity-20" />
                             <p>Nenhum campo personalizado criado ainda.</p>
                         </div>
                     ) : (
                         customFields.map(field => {
                             const fName = funnels.find(f => f.id === field.funnelId)?.name;
                             return (
                                <div key={field.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-all bg-white shadow-sm">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-gray-800">{field.name}</h4>
                                                {field.context === 'lost_reason' && (
                                                    <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded border border-red-200 font-bold uppercase">Motivo Descarte</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium border border-blue-100 uppercase">
                                                    {field.type === 'multiselect' ? 'Múltipla Escolha' : field.type === 'select' ? 'Seleção Única' : 'Texto'}
                                                </span>
                                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                                    em <span className="font-medium text-gray-700">{fName}</span>
                                                </span>
                                            </div>
                                            <div className="mt-2 text-xs text-gray-500">
                                                {field.context === 'lost_reason' 
                                                    ? 'Visível ao descartar Lead' 
                                                    : `Visível em: ${field.visibleStageIds.length === 0 ? 'Todas as etapas' : `${field.visibleStageIds.length} etapas específicas`}`}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => deleteCustomField(field.id)}
                                            className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-full transition-colors"
                                            title="Excluir Campo"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                    {(field.type === 'select' || field.type === 'multiselect') && (
                                        <div className="mt-3 flex flex-wrap gap-1">
                                            {field.options?.map(opt => (
                                                <span key={opt.id} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200">
                                                    {opt.label}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                             );
                         })
                     )}
                 </div>
             </div>
        </div>
      )}
    </div>
  );
};

// Simple Icon component for the list
const XIcon = ({size}: {size: number}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);
