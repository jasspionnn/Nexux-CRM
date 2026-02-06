import React, { useState, useEffect, useRef } from 'react';
import { useCRM } from '../context/CRMContext';
import { 
  ArrowLeft, Check, X, User, Phone, Mail, Building, 
  Calendar, Clock, ChevronRight, ChevronDown, ChevronUp,
  Plus, MoreHorizontal, FileText, CheckCircle, XCircle,
  Copy, Save, AlertCircle, ThumbsUp, Send, Edit2, Sparkles, PhoneCall, Layers,
  Briefcase, DollarSign, SlidersHorizontal, Trash2
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

  useEffect(() => { setTempValue(value); }, [value]);
  useEffect(() => { if (isEditing && inputRef.current) inputRef.current.focus(); }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (tempValue !== value) onChange(String(tempValue));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleBlur();
    if (e.key === 'Escape') { setTempValue(value); setIsEditing(false); }
  };

  return (
    <div className="flex flex-col group mb-1">
      <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
        {Icon && <Icon size={10} />} {label}
      </label>
      <div 
        onClick={() => setIsEditing(true)}
        className={`min-h-[32px] flex items-center text-sm rounded-lg px-2 -ml-2 transition-all cursor-pointer border border-transparent ${isEditing ? '' : 'hover:bg-gray-100 hover:border-gray-200'}`}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            type={type}
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full bg-white border border-blue-400 rounded-lg px-2 py-1 outline-none text-gray-900 font-bold"
          />
        ) : (
          <div className="flex items-center justify-between w-full">
            <span className={`truncate ${!value ? 'text-gray-400 italic' : 'text-gray-900 font-bold'}`}>
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
  const { leads, funnels, updateLead, customFields, addTask, toggleTask, deleteTask } = useCRM();
  const lead = leads.find(l => l.id === leadId);
  
  const [activeTab, setActiveTab] = useState<'notes' | 'tasks'>('notes');
  const [noteText, setNoteText] = useState('');
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [newTaskData, setNewTaskData] = useState<{title: string, date: string, type: 'call' | 'email' | 'meeting' | 'todo'}>({
      title: '',
      date: new Date().toISOString().slice(0, 16),
      type: 'todo'
  });
  
  if (!lead) return <div className="p-8 text-center"><p className="text-gray-500">Lead não encontrado.</p> <button onClick={onBack} className="text-blue-500 underline mt-2">Voltar</button></div>;

  const currentFunnel = funnels.find(f => f.id === lead.funnelId);
  const currentStageIndex = currentFunnel?.stages.findIndex(s => s.id === lead.stageId) ?? -1;

  const handleSaveNote = () => {
    if (!noteText.trim()) return;
    const newNote = { id: `note-${Date.now()}`, content: noteText, createdAt: new Date().toISOString(), authorName: 'Eu' };
    updateLead(lead.id, { notes: [newNote, ...lead.notes] });
    setNoteText('');
  };

  const handleCreateTask = (e: React.FormEvent) => {
      e.preventDefault();
      if(!newTaskData.title) return;
      addTask(lead.id, { id: `t-${Date.now()}`, title: newTaskData.title, dueDate: newTaskData.date || new Date().toISOString(), type: newTaskData.type, completed: false });
      setNewTaskData({ title: '', date: new Date().toISOString().slice(0, 16), type: 'todo' });
      setIsTaskFormOpen(false);
  };

  const handleMarkAsWon = () => {
    if (!currentFunnel) return;
    const targetStageId = currentFunnel.defaultWonStageId || currentFunnel.stages[currentFunnel.stages.length - 1].id;
    updateLead(lead.id, { probability: 100, stageId: targetStageId });
    updateLead(lead.id, { notes: [{ id: `sys-${Date.now()}`, content: "🎉 Negócio marcado como GANHO!", createdAt: new Date().toISOString(), authorName: 'Sistema' }, ...lead.notes] });
  };

  const handleTransferFunnel = (targetFunnelId: string) => {
      if (targetFunnelId === lead.funnelId) return;
      const targetFunnel = funnels.find(f => f.id === targetFunnelId);
      if (!targetFunnel) return;
      const targetStageId = targetFunnel.stages[0]?.id || '';
      
      const updateData = { 
        funnelId: targetFunnelId, 
        stageId: targetStageId,
        notes: [{ 
          id: `sys-mov-${Date.now()}`, 
          content: `🔄 Lead encaminhado do funil "${currentFunnel?.name}" para o funil "${targetFunnel.name}".`, 
          createdAt: new Date().toISOString(), 
          authorName: 'Sistema' 
        }, ...lead.notes] 
      };
      
      updateLead(lead.id, updateData);
  };

  const isWon = lead.probability === 100;
  const isLost = lead.probability === 0;

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden animate-fade-in relative">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between shrink-0 shadow-sm z-20">
            <div className="flex items-center gap-5 flex-1">
                <button onClick={onBack} className="bg-gray-50 p-3 rounded-xl hover:bg-gray-100 text-gray-500 transition-all border border-gray-100">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-1">
                    <input 
                        value={lead.title}
                        onChange={(e) => updateLead(lead.id, { title: e.target.value })}
                        className="text-2xl font-black text-gray-900 w-full outline-none bg-transparent hover:bg-blue-50 focus:bg-white rounded-lg px-2 -ml-2 transition-all tracking-tight"
                    />
                </div>
            </div>
            <div className="flex items-center gap-3">
                 {isWon ? (
                     <div className="flex items-center gap-2 px-6 py-3 bg-green-50 text-green-700 rounded-xl font-black text-sm border border-green-200">GANHO</div>
                 ) : (
                    <>
                        <button onClick={() => updateLead(lead.id, { probability: 0 })} className="px-5 py-3 border border-red-100 text-red-600 hover:bg-red-50 rounded-xl font-bold text-sm">Perda</button>
                        <button onClick={handleMarkAsWon} className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-green-100">Ganho</button>
                    </>
                 )}
            </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
            <div className="w-[360px] bg-white border-r border-gray-200 overflow-y-auto shrink-0 p-8 space-y-8">
                <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100/50">
                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Layers size={14} /> Encaminhar para Funil
                    </h4>
                    <select 
                        value={lead.funnelId} 
                        onChange={(e) => handleTransferFunnel(e.target.value)} 
                        className="w-full bg-white border border-blue-200 text-gray-800 text-sm font-bold rounded-xl p-3 outline-none focus:ring-4 focus:ring-blue-100 transition-all shadow-sm cursor-pointer"
                    >
                        {funnels.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                </div>

                <div className="space-y-6">
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2 border-b border-gray-50 pb-2">
                        <Briefcase size={16} className="text-blue-500" /> Negociação
                    </h3>
                    <div className="space-y-4">
                        <EditableField label="Empresa" value={lead.company} onChange={(v) => updateLead(lead.id, { company: v })} icon={Building} />
                        <EditableField label="Valor Esperado" value={lead.value} type="number" onChange={(v) => updateLead(lead.id, { value: Number(v) })} icon={DollarSign} />
                    </div>
                </div>

                <div className="space-y-6">
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2 border-b border-gray-50 pb-2">
                        <User size={16} className="text-blue-500" /> Contato Direto
                    </h3>
                    <div className="space-y-4">
                        <EditableField label="Nome do Contato" value={lead.contactName} onChange={(v) => updateLead(lead.id, { contactName: v })} icon={User} />
                        <EditableField label="E-mail" value={lead.contactEmail} onChange={(v) => updateLead(lead.id, { contactEmail: v })} icon={Mail} />
                        <EditableField label="Telefone" value={lead.contactPhone} onChange={(v) => updateLead(lead.id, { contactPhone: v })} icon={Phone} />
                    </div>
                </div>
            </div>

            <div className="flex-1 bg-gray-50 flex flex-col min-w-0">
                <div className="bg-white border-b border-gray-100 px-8 pt-4">
                    <div className="flex gap-8">
                        {['notes', 'tasks'].map((tab) => (
                            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`pb-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                                {tab === 'notes' ? 'Histórico de Notas' : 'Tarefas e Lembretes'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    {activeTab === 'notes' && (
                        <div className="space-y-6 max-w-3xl mx-auto">
                            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                                <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Adicione um detalhe importante..." className="w-full text-sm font-medium outline-none resize-none min-h-[100px] placeholder-gray-300" />
                                <div className="flex justify-end mt-4 pt-4 border-t border-gray-50">
                                    <button onClick={handleSaveNote} disabled={!noteText.trim()} className="bg-gray-900 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-black transition-all shadow-lg">Salvar Nota</button>
                                </div>
                            </div>
                            <div className="space-y-4 pb-10">
                                {lead.notes.map(note => (
                                    <div key={note.id} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex gap-4 animate-fade-in hover:border-blue-100 transition-colors">
                                        <div className={`p-3 rounded-full h-fit ${note.authorName === 'Sistema' ? 'bg-gray-100 text-gray-400' : 'bg-blue-50 text-blue-600'}`}><User size={18} /></div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-xs font-black text-gray-800 uppercase tracking-tight">{note.authorName}</span>
                                                <span className="text-[10px] font-bold text-gray-300">{new Date(note.createdAt).toLocaleString()}</span>
                                            </div>
                                            <p className="text-sm text-gray-600 leading-relaxed font-medium whitespace-pre-wrap">{note.content}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};