
import React, { useState, useEffect } from 'react';
import { useCRM } from '../context/CRMContext';
import { 
  ArrowLeft, Check, X, User, Phone, Mail, Building, 
  ChevronDown, Plus, Trash2, Edit2, PhoneCall, 
  Briefcase, DollarSign, SlidersHorizontal, 
  ThumbsUp as LucideThumbsUp, ThumbsDown as LucideThumbsDown,
  Layers, RefreshCw, Loader2, Sparkles, Send, Calendar, CheckCircle, XCircle,
  MessageSquare
} from 'lucide-react';
import { CustomFieldDefinition, Lead, Task, User as UserType } from '../types';

interface Props {
  leadId: string;
  onBack: () => void;
  onNavigate: (view: string, data?: any) => void;
}

export const LeadDetailPage: React.FC<Props> = ({ leadId, onBack, onNavigate }) => {
  const { 
    leads, funnels, updateLead, customFields, users, 
    addTask, toggleTask, deleteTask 
  } = useCRM();
  
  const lead = leads.find(l => l.id === leadId);
  const [activeTab, setActiveTab] = useState('history');
  const [noteText, setNoteText] = useState('');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [newTag, setNewTag] = useState('');

  if (!lead) return <div className="p-8 text-center text-gray-500 font-bold">Oportunidade não encontrada.</div>;

  const currentFunnel = funnels.find(f => f.id === lead.funnelId);
  const currentStageIndex = currentFunnel?.stages.findIndex(s => s.id === lead.stageId) ?? -1;
  const assignedUser = users.find(u => u.id === lead.assignedUserId);

  const handleSaveNote = () => {
      if (!noteText.trim()) return;
      const newNote = {
          id: `n-${Date.now()}`,
          content: noteText,
          createdAt: new Date().toISOString(),
          authorName: users.find(u => u.id === lead.assignedUserId)?.name || 'Vendedor'
      };
      updateLead(lead.id, { notes: [newNote, ...lead.notes] });
      setNoteText('');
  };

  const handleTransferFunnel = async (targetFunnelId: string) => {
      if (targetFunnelId === lead.funnelId) return;
      setIsTransferring(true);
      
      const targetFunnel = funnels.find(f => f.id === targetFunnelId);
      if (!targetFunnel) return;
      
      const firstStageId = targetFunnel.stages[0]?.id || '';
      
      const transferNote = {
          id: `sys-${Date.now()}`,
          content: `🔄 Encaminhamento: Lead transferido de "${currentFunnel?.name}" para "${targetFunnel.name}".`,
          createdAt: new Date().toISOString(),
          authorName: 'Sistema'
      };

      await updateLead(lead.id, { 
          funnelId: targetFunnelId, 
          stageId: firstStageId,
          notes: [transferNote, ...lead.notes]
      });
      
      setTimeout(() => setIsTransferring(false), 800);
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden animate-fade-in">
      {/* Header Premium */}
      <div className="px-8 py-6 flex flex-col gap-4 shrink-0 bg-white border-b border-gray-100">
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                  <button onClick={onBack} className="text-gray-400 hover:text-gray-600 transition-all p-1 hover:bg-gray-100 rounded">
                      <ArrowLeft size={20} />
                  </button>
                  <div>
                      <h1 className="text-2xl font-black text-gray-900 tracking-tight">{lead.title}</h1>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">ID: {lead.id}</p>
                  </div>
              </div>
              <div className="flex items-center gap-3">
                  <button onClick={() => updateLead(lead.id, { probability: 0 })} className="px-5 py-2.5 bg-[#A5EDFF] hover:bg-[#80E6FF] text-[#00455B] font-black rounded-xl text-xs uppercase tracking-widest flex items-center gap-2 shadow-sm transition-all active:scale-95">
                      <LucideThumbsDown size={16} strokeWidth={3} /> Perda
                  </button>
                  <button onClick={() => updateLead(lead.id, { probability: 100 })} className="px-5 py-2.5 bg-[#00455B] hover:bg-[#003646] text-white font-black rounded-xl text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all active:scale-95">
                      <LucideThumbsUp size={16} strokeWidth={3} /> Ganho
                  </button>
              </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
               <div className="px-3 py-1 bg-gray-100 text-gray-500 text-[10px] font-black uppercase rounded-lg border border-gray-200">
                   {lead.probability === 100 ? 'VENDA GANHA' : lead.probability === 0 ? 'VENDA PERDIDA' : 'EM NEGOCIAÇÃO'}
               </div>
               <div className="px-3 py-1 bg-[#00D2FF] text-[#00455B] text-[10px] font-black uppercase rounded-lg">
                   {currentFunnel?.name}
               </div>
               <div className="flex gap-1">
                  {lead.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black uppercase rounded border border-blue-100">
                          {tag}
                      </span>
                  ))}
               </div>
          </div>
      </div>

      {/* Progress Bar Chevron */}
      <div className="px-8 py-4 flex items-center shrink-0 bg-white shadow-sm z-10 overflow-x-auto">
          {currentFunnel?.stages.map((stage, idx) => (
              <div 
                key={stage.id} 
                onClick={() => updateLead(lead.id, { stageId: stage.id })}
                className={`chevron-step ${stage.id === lead.stageId ? 'active' : idx < currentStageIndex ? 'completed' : ''}`}
              >
                  {stage.name}
              </div>
          ))}
      </div>

      <div className="flex-1 flex overflow-hidden">
          {/* Sidebar de Informações */}
          <div className="w-[340px] bg-gray-50 border-r border-gray-100 overflow-y-auto shrink-0 p-6 flex flex-col gap-8">
              {/* Widget de Encaminhamento */}
              <section className="bg-indigo-600 rounded-2xl p-5 text-white shadow-xl shadow-indigo-100 relative overflow-hidden group">
                  <div className="relative z-10">
                      <h4 className="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Layers size={14} /> Encaminhar Lead
                      </h4>
                      <div className="relative">
                          <select 
                            disabled={isTransferring}
                            value={lead.funnelId}
                            onChange={(e) => handleTransferFunnel(e.target.value)}
                            className="w-full bg-white/10 border border-white/20 text-white text-sm font-bold rounded-xl p-2.5 outline-none focus:bg-white/20 transition-all cursor-pointer appearance-none"
                          >
                            {funnels.map(f => (
                                <option key={f.id} value={f.id} className="text-gray-900">{f.name}</option>
                            ))}
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                      {isTransferring && <div className="mt-3 flex items-center gap-2 text-[10px] font-bold"><Loader2 className="animate-spin" size={12} /> Movendo...</div>}
                  </div>
                  <RefreshCw size={80} className="absolute -bottom-6 -right-6 text-white/5 rotate-12 group-hover:rotate-45 transition-transform duration-700" />
              </section>

              <section className="space-y-4">
                  <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Briefcase size={14} /> Negócio
                  </h3>
                  <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-5 shadow-sm">
                      <SidebarItem label="Empresa" value={lead.company} onSave={v => updateLead(lead.id, { company: v })} />
                      <SidebarItem label="Valor" value={`R$ ${lead.value.toLocaleString()}`} onSave={v => updateLead(lead.id, { value: parseFloat(v.replace(/\D/g, '')) })} />
                      <SidebarItem label="Responsável" value={assignedUser?.name || '---'} />
                  </div>
              </section>

              <section className="space-y-4">
                  <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Phone size={14} /> Contato
                  </h3>
                  <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-5 shadow-sm">
                      <SidebarItem label="Nome" value={lead.contactName} onSave={v => updateLead(lead.id, { contactName: v })} />
                      <SidebarItem label="E-mail" value={lead.contactEmail} onSave={v => updateLead(lead.id, { contactEmail: v })} />
                      <SidebarItem label="WhatsApp" value={lead.contactPhone} onSave={v => updateLead(lead.id, { contactPhone: v })} />
                  </div>
              </section>
          </div>

          {/* Area de Histórico e Notas */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
              <div className="p-8 h-full flex flex-col max-w-4xl mx-auto w-full gap-8">
                  <section className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                      <div className="flex items-center gap-2 mb-4">
                          <MessageSquare size={18} className="text-indigo-600" />
                          <h3 className="text-sm font-black text-gray-900 uppercase">Anotações do Lead</h3>
                      </div>
                      <div className="relative group">
                          <textarea 
                            value={noteText}
                            onChange={e => setNoteText(e.target.value)}
                            placeholder="Descreva o andamento da negociação..." 
                            className="w-full bg-white border border-gray-200 rounded-2xl p-4 text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all min-h-[120px] resize-none"
                          />
                          <button 
                            disabled={!noteText.trim()}
                            onClick={handleSaveNote}
                            className="absolute bottom-4 right-4 bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-30 shadow-lg"
                          >
                              <Send size={18} />
                          </button>
                      </div>
                  </section>

                  <section className="flex-1 overflow-y-auto space-y-6 pb-20 scrollbar-hide">
                      {lead.notes.map(note => (
                          <div key={note.id} className={`flex gap-4 animate-fade-in ${note.authorName === 'Sistema' ? 'bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 border-dashed' : ''}`}>
                              <div className="flex flex-col items-center gap-2">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border font-black text-xs ${note.authorName === 'Sistema' ? 'bg-white text-indigo-500' : 'bg-indigo-600 text-white'}`}>
                                      {note.authorName[0]}
                                  </div>
                                  <div className="flex-1 w-px bg-gray-100"></div>
                              </div>
                              <div className="flex-1 pt-1">
                                  <div className="flex justify-between items-center mb-2">
                                      <span className="text-xs font-black text-gray-800 uppercase tracking-tight">{note.authorName}</span>
                                      <span className="text-[10px] font-bold text-gray-400">{new Date(note.createdAt).toLocaleString()}</span>
                                  </div>
                                  <p className={`text-sm leading-relaxed ${note.authorName === 'Sistema' ? 'text-indigo-700 font-bold italic' : 'text-gray-600 font-medium'}`}>{note.content}</p>
                              </div>
                          </div>
                      ))}
                      {lead.notes.length === 0 && (
                          <div className="text-center py-20 text-gray-300 font-black uppercase text-[10px] tracking-widest">Início do Histórico</div>
                      )}
                  </section>
              </div>
          </div>
      </div>
    </div>
  );
};

const SidebarItem = ({ label, value, onSave }: { label: string, value: string, onSave?: (v: string) => void }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [temp, setTemp] = useState(value);
    useEffect(() => { setTemp(value); }, [value]);

    const handleBlur = () => { setIsEditing(false); if (temp !== value && onSave) onSave(temp); };

    return (
        <div className="group">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
            {isEditing ? (
                <input autoFocus value={temp} onChange={e => setTemp(e.target.value)} onBlur={handleBlur} onKeyDown={e => e.key === 'Enter' && handleBlur()} className="text-sm font-bold text-gray-900 border-b border-indigo-500 outline-none w-full bg-indigo-50 px-1" />
            ) : (
                <div onClick={() => onSave && setIsEditing(true)} className={`text-sm font-bold text-gray-800 flex justify-between items-center transition-all ${onSave ? 'cursor-pointer hover:text-indigo-600' : ''}`}>
                    <span className="truncate">{value || '---'}</span>
                    {onSave && <Edit2 size={10} className="opacity-0 group-hover:opacity-100 text-gray-300" />}
                </div>
            )}
        </div>
    );
};
