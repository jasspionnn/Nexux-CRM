import React, { useState, useEffect } from 'react';
import { ArrowLeft, ThumbsDown, ThumbsUp, Briefcase, Phone, MessageSquare, Send, Layers, Edit2, Check, X } from 'lucide-react';
import { useCRM } from '../context/CRMContext';

const EditableField = ({ label, value, onSave, type = "text" }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value || '');
    setIsEditing(false);
  };

  return (
    <div className="group relative">
      <div className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-1">{label}</div>
      {isEditing ? (
        <div className="flex items-center gap-2">
          <input
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full text-sm font-bold text-slate-900 border-b border-indigo-500 focus:outline-none bg-white px-1"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <button onClick={handleSave} className="text-green-600 hover:text-green-700"><Check size={16} /></button>
          <button onClick={handleCancel} className="text-red-500 hover:text-red-600"><X size={16} /></button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold text-gray-900 truncate pr-4">
            {type === 'number' && value ? `R$ ${Number(value).toLocaleString('pt-BR')}` : (value || '---')}
          </div>
          <button 
            onClick={() => setIsEditing(true)} 
            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-indigo-600 transition-opacity"
          >
            <Edit2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

const EditableSelectField = ({ label, value, options, onSave }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value || '');
    setIsEditing(false);
  };

  const selectedOption = options.find((o: any) => o.id === value);

  return (
    <div className="group relative">
      <div className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-1">{label}</div>
      {isEditing ? (
        <div className="flex items-center gap-2">
          <select
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full text-sm font-bold text-slate-900 border-b border-indigo-500 focus:outline-none bg-white px-1"
            autoFocus
          >
            <option value="">Selecione...</option>
            {options.map((o: any) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <button onClick={handleSave} className="text-green-600 hover:text-green-700"><Check size={16} /></button>
          <button onClick={handleCancel} className="text-red-500 hover:text-red-600"><X size={16} /></button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold text-gray-900 truncate pr-4">
            {selectedOption ? selectedOption.name : '---'}
          </div>
          <button 
            onClick={() => setIsEditing(true)} 
            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-indigo-600 transition-opacity"
          >
            <Edit2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export const LeadDetailPage = ({ leadId, onBack, onNavigate }: any) => {
  const { currentUser } = useCRM();
  const [lead, setLead] = useState<any>(null);
  const [funnel, setFunnel] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [noteText, setNoteText] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [leadId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const leadRes = await fetch(`/api/leads/${leadId}`);
      if (!leadRes.ok) throw new Error('Lead not found');
      const leadData = await leadRes.json();
      setLead(leadData);

      const funnelsRes = await fetch('/api/funnels');
      const funnelsData = await funnelsRes.json();
      const currentFunnel = funnelsData.find((f: any) => f.id === leadData.funnel_id);
      setFunnel(currentFunnel);

      const notesRes = await fetch(`/api/leads/${leadId}/notes`);
      const notesData = await notesRes.json();
      setNotes(notesData);

      const usersRes = await fetch('/api/users');
      const usersData = await usersRes.json();
      setUsers(usersData);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateLead = async (updates: any) => {
    setLead({ ...lead, ...updates });
    await fetch(`/api/leads/${leadId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    
    const res = await fetch(`/api/leads/${leadId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: noteText, author_name: currentUser?.name || 'Usuário' })
    });
    const newNote = await res.json();
    setNotes([newNote, ...notes]);
    setNoteText('');
  };

  const handleStageChange = (stageId: string) => {
    updateLead({ stage_id: stageId });
  };

  const handleWin = () => {
    if (funnel?.stages?.length > 0) {
      const lastStage = funnel.stages[funnel.stages.length - 1];
      updateLead({ stage_id: lastStage.id });
    }
  };

  const handleLoss = () => {
    // For now, let's just add a tag or note, or maybe move to a specific stage if we had one.
    // Let's add a note indicating loss.
    fetch(`/api/leads/${leadId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '🔴 Lead marcado como PERDIDO.', author_name: currentUser?.name || 'Sistema' })
    }).then(() => fetchData());
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full bg-white"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!lead) {
    return <div className="p-8 text-center text-gray-500">Lead não encontrado.</div>;
  }

  const stages = funnel?.stages || [];
  const currentStageIndex = stages.findIndex((s: any) => s.id === lead.stage_id);

  return (
    <div className="flex flex-col min-h-full bg-white relative">
      {/* Top Header - Sticky */}
      <div className="sticky top-0 z-20 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 leading-none">{lead.title}</h1>
            </div>
            <div className="text-xs text-gray-400 mt-1 font-medium">ID: {lead.id}</div>
            <div className="flex items-center gap-2 mt-3">
              <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-[10px] font-bold tracking-wider uppercase">
                EM NEGOCIAÇÃO
              </span>
              <span className="px-3 py-1 bg-cyan-400 text-white rounded-full text-[10px] font-bold tracking-wider uppercase">
                {funnel?.name || 'FUNIL'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleLoss} className="flex items-center gap-2 px-6 py-2.5 bg-cyan-100 text-cyan-800 rounded-xl font-bold text-sm hover:bg-cyan-200 transition-colors">
            <ThumbsDown size={18} />
            PERDA
          </button>
          <button onClick={handleWin} className="flex items-center gap-2 px-6 py-2.5 bg-[#003b5c] text-white rounded-xl font-bold text-sm hover:bg-[#002b44] transition-colors">
            <ThumbsUp size={18} />
            GANHO
          </button>
        </div>
      </div>

      {/* Stages Bar - Sticky below Header */}
      <div className="sticky top-[86px] z-10 bg-white flex w-full px-6 py-4 border-b border-gray-100 shrink-0 overflow-x-auto hide-scrollbar">
        {stages.map((stage: any, index: number) => {
          const isFirst = index === 0;
          const isLast = index === stages.length - 1;
          const isActive = index <= currentStageIndex;
          const isCurrent = index === currentStageIndex;
          
          let clipPath = 'polygon(0% 0%, 95% 0%, 100% 50%, 95% 100%, 0% 100%, 5% 50%)';
          if (isFirst) clipPath = 'polygon(0% 0%, 95% 0%, 100% 50%, 95% 100%, 0% 100%)';
          if (isLast) clipPath = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 5% 50%)';

          return (
            <div
              key={stage.id}
              onClick={() => handleStageChange(stage.id)}
              className={`flex-1 min-w-[140px] h-10 flex items-center justify-center text-[11px] font-bold tracking-wider uppercase relative cursor-pointer transition-colors ${
                isCurrent ? 'bg-cyan-400 text-white z-10' : 
                isActive ? 'bg-cyan-100 text-cyan-800' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
              }`}
              style={{
                clipPath,
                marginLeft: isFirst ? '0' : '-1%',
                zIndex: stages.length - index
              }}
            >
              {stage.name}
            </div>
          );
        })}
      </div>

      {/* Main Content Area - Flows naturally */}
      <div className="flex flex-1">
        {/* Left Sidebar - No independent scroll */}
        <div className="w-80 bg-slate-50 border-r border-gray-200 p-6 shrink-0 flex flex-col gap-8">
          <button className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-sm">
            <Layers size={18} />
            ENCAMINHAR LEAD
          </button>

          {/* Negócio Section */}
          <div>
            <div className="flex items-center gap-2 text-gray-400 mb-3">
              <Briefcase size={16} />
              <h3 className="text-xs font-bold tracking-wider uppercase">NEGÓCIO</h3>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
              <EditableField 
                label="TÍTULO" 
                value={lead.title} 
                onSave={(val: string) => updateLead({ title: val })} 
              />
              <EditableField 
                label="EMPRESA" 
                value={lead.company} 
                onSave={(val: string) => updateLead({ company: val })} 
              />
              <EditableField 
                label="VALOR" 
                value={lead.value} 
                type="number"
                onSave={(val: string) => updateLead({ value: Number(val) })} 
              />
              <EditableSelectField
                label="RESPONSÁVEL"
                value={lead.assigned_user_id}
                options={users}
                onSave={(val: string) => updateLead({ assigned_user_id: val })}
              />
              <EditableField 
                label="PROBABILIDADE (%)" 
                value={lead.probability} 
                type="number"
                onSave={(val: string) => updateLead({ probability: Number(val) })} 
              />
            </div>
          </div>

          {/* Contato Section */}
          <div>
            <div className="flex items-center gap-2 text-gray-400 mb-3">
              <Phone size={16} />
              <h3 className="text-xs font-bold tracking-wider uppercase">CONTATO</h3>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
              <EditableField 
                label="NOME" 
                value={lead.contact_name} 
                onSave={(val: string) => updateLead({ contact_name: val })} 
              />
              <EditableField 
                label="E-MAIL" 
                value={lead.contact_email} 
                onSave={(val: string) => updateLead({ contact_email: val })} 
              />
              <EditableField 
                label="TELEFONE" 
                value={lead.contact_phone} 
                onSave={(val: string) => updateLead({ contact_phone: val })} 
              />
            </div>
          </div>
        </div>

        {/* Right Content - No independent scroll */}
        <div className="flex-1 p-8 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 text-gray-900 mb-6">
              <MessageSquare size={20} className="text-indigo-600" />
              <h2 className="text-lg font-bold">ANOTAÇÕES DO LEAD</h2>
            </div>

            {/* Note Input */}
            <div className="bg-white border border-gray-200 rounded-3xl p-4 shadow-sm mb-10 relative">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Descreva o andamento da negociação..."
                className="w-full h-24 resize-none border-none focus:ring-0 p-2 text-slate-700 placeholder-slate-400 outline-none bg-white font-medium shadow-inner rounded-xl"
              />
              <div className="absolute bottom-4 right-4">
                <button 
                  onClick={handleAddNote}
                  disabled={!noteText.trim()}
                  className="w-10 h-10 bg-indigo-200 text-indigo-600 rounded-full flex items-center justify-center hover:bg-indigo-300 transition-colors disabled:opacity-50"
                >
                  <Send size={18} className="ml-1" />
                </button>
              </div>
            </div>

            {/* Notes List */}
            <div className="space-y-8 pl-2">
              {notes.length === 0 ? (
                <div className="text-gray-400 text-sm italic">Nenhuma anotação ainda.</div>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0 text-sm">
                      {note.author_name ? note.author_name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-900 tracking-wider uppercase">{note.author_name}</span>
                        <span className="text-[11px] font-medium text-gray-400">
                          {new Date(note.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-gray-800 text-sm whitespace-pre-wrap">{note.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
