import React, { useState, useEffect } from 'react';
import { ArrowLeft, Activity, MousePointer, Globe, FileText, Zap, ChevronDown, ChevronUp } from 'lucide-react';

interface LeadJourneyProps { lead: any; onBack: () => void; }

export const LeadJourney: React.FC<LeadJourneyProps> = ({ lead, onBack }) => {
  const [timeline, setTimeline] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [editingValue, setEditingValue] = useState<{ fieldId: string, val: string } | null>(null);

  useEffect(() => {
    fetchData();
    fetchCustomFields();
  }, [lead.id]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [tRes, vRes] = await Promise.all([
        fetch(`/api/lead-timeline?lead_id=${lead.id}`),
        fetch(`/api/lead-visits?lead_id=${lead.id}`)
      ]);
      if (tRes.ok) setTimeline(await tRes.json());
      if (vRes.ok) setVisits(await vRes.json());
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  const fetchCustomFields = async () => {
    try {
      const res = await fetch(`/api/marketing/custom-fields?account_id=${lead.account_id || 'acc_demo'}`);
      if (res.ok) setCustomFields(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleUpdateField = async (fieldName: string, value: string) => {
    try {
      const rawData = typeof lead.raw_data === 'string' ? JSON.parse(lead.raw_data) : (lead.raw_data || {});
      const updatedData = { ...rawData, [fieldName]: value };
      
      const res = await fetch(`/api/marketing-leads/${lead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_data: JSON.stringify(updatedData) })
      });
      
      if (res.ok) {
        // Update local lead state manually or reload
        lead.raw_data = updatedData;
        setEditingValue(null);
        alert('Campo atualizado!');
      }
    } catch (e) { alert('Erro ao salvar'); }
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  const formatTime = (d: string) => new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const eventIcons: any = { pageview: Globe, form: FileText, click: MousePointer, conversion: Zap };
  const eventColors: any = { pageview: 'bg-blue-500', form: 'bg-green-500', click: 'bg-purple-500', conversion: 'bg-amber-500' };
  const eventBg: any = { pageview: 'bg-blue-50 border-blue-200', form: 'bg-green-50 border-green-200', click: 'bg-purple-50 border-purple-200', conversion: 'bg-amber-50 border-amber-200' };
  const eventLabels: any = { pageview: 'Visitou página', form: 'Preencheu formulário', click: 'Clicou', conversion: 'Converteu' };

  // Grouping consecutive pageviews
  const groupedTimeline: any[] = [];
  let currentGroup: any = null;

  timeline.forEach((event, idx) => {
    if (event.event_type === 'pageview') {
      if (currentGroup && currentGroup.type === 'group') {
        currentGroup.events.push(event);
      } else {
        currentGroup = { 
          type: 'group', 
          events: [event], 
          id: `group-${event.id}-${idx}`,
          created_at: event.created_at
        };
        groupedTimeline.push(currentGroup);
      }
    } else {
      currentGroup = { type: 'single', event: event, id: event.id };
      groupedTimeline.push(currentGroup);
    }
  });

  if (isLoading) return <div className="flex items-center justify-center h-full"><div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" /></div>;

  const renderEvent = (event: any, isInsideGroup = false) => {
    const Icon = eventIcons[event.event_type] || Globe;
    const color = eventColors[event.event_type] || 'bg-slate-500';
    const bg = eventBg[event.event_type] || 'bg-slate-50 border-slate-200';
    const label = eventLabels[event.event_type] || event.event_type;
    const isExpanded = expandedEvent === event.id;

    return (
      <div key={event.id} className={`relative flex gap-4 ${isInsideGroup ? 'ml-6 opacity-90 scale-95 origin-left' : ''}`}>
        <div className="relative z-10 w-14 flex-shrink-0 flex justify-center">
          <div className={`w-4 h-4 ${color} rounded-full ring-4 ring-white shadow-sm`} />
        </div>
        <div className={`flex-1 ${bg} border rounded-xl overflow-hidden shadow-sm`}>
          <button onClick={() => setExpandedEvent(isExpanded ? null : event.id)}
            className="w-full px-4 py-3 flex items-center justify-between text-left">
            <div className="flex items-center gap-3">
              <Icon size={16} className="text-slate-500" />
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
                {event.url && <p className="text-sm font-bold text-slate-800 truncate max-w-[200px] md:max-w-md">{event.url}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-600 uppercase">{formatDate(event.created_at)}</p>
                <p className="text-[10px] text-slate-400 font-bold tracking-tighter">{formatTime(event.created_at)}</p>
              </div>
              {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </div>
          </button>
          {isExpanded && (
            <div className="px-4 py-3 bg-white border-t border-slate-100 space-y-2 animate-in slide-in-from-top-2 duration-200">
              {event.event_data?.el_label && <p className="text-sm"><span className="font-bold text-slate-600">Elemento:</span> <span className="text-slate-800">&quot;{event.event_data.el_label}&quot;</span></p>}
              {event.event_data?.form_data?.fid && <p className="text-sm"><span className="font-bold text-slate-600">Formulário:</span> <span className="text-slate-800">&quot;{event.event_data.form_data.fid}&quot;</span></p>}
              {event.event_data?.form_data?.fields && (
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-1">Campos capturados:</p>
                  <div className="flex flex-wrap gap-1.5">{Object.entries(event.event_data.form_data.fields).map(([k, v]: [string, any]) => (<span key={k} className="text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200"><span className="text-slate-500">{k}:</span> <span className="font-medium">{String(v)}</span></span>))}</div>
                </div>
              )}
              {event.referrer && <p className="text-xs text-slate-400 italic break-all"><span className="font-bold">Vindo de:</span> {event.referrer}</p>}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full bg-slate-50/50 p-6 lg:p-10 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-slate-600 mb-6 text-sm font-bold transition-colors">
          <ArrowLeft size={18} />Voltar para Base de Leads
        </button>

        {/* Lead Info */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-100">
              {(lead.contact_name || lead.contact_email || '?').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-black text-slate-900 leading-tight">{lead.contact_name || 'Lead Anônimo'}</h2>
              <p className="text-sm font-bold text-slate-500">{lead.contact_email || 'Sem email'}</p>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1.5 px-2 py-0.5 bg-indigo-50 w-fit rounded-full">Via {lead.form_name}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{timeline.length} interações</span>
              <p className="text-xs font-bold text-slate-500 mt-1">{formatDate(lead.created_at)}</p>
            </div>
          </div>

          {/* Standard Fields Section */}
          <div className="pt-6 border-t border-slate-100">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Dados Básicos</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Nome', key: 'contact_name' },
                { label: 'Email', key: 'contact_email' },
                { label: 'Telefone', key: 'contact_phone' }
              ].map(f => (
                <div key={f.key} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{f.label}</p>
                  <p className="text-sm font-black text-slate-700">{lead[f.key] || '-'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Fields Section */}
          <div className="pt-6 border-t border-slate-100 mt-6">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Campos Personalizados</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {customFields.map((f: any) => {
                const rawData = typeof lead.raw_data === 'string' ? JSON.parse(lead.raw_data) : (lead.raw_data || {});
                const val = rawData[f.name] || '';
                const options = f.type === 'Seleção' && f.options ? f.options.split(',').map((o: string) => o.trim()) : [];
                const isEditing = editingValue?.fieldId === f.id;

                return (
                  <div key={f.id} className="bg-slate-50 rounded-xl p-3 border border-slate-100 relative group">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 truncate">{f.name}</p>
                    {isEditing ? (
                      f.type === 'Seleção' ? (
                        <select 
                          className="text-sm w-full font-black text-slate-700 bg-white border border-indigo-300 rounded px-1"
                          value={editingValue.val}
                          onChange={e => setEditingValue({ ...editingValue, val: e.target.value })}
                          onBlur={() => handleUpdateField(f.name, editingValue.val)}
                          autoFocus
                        >
                          <option value="">Selecione...</option>
                          {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : (
                        <input 
                          className="text-sm w-full font-black text-slate-700 bg-white border border-indigo-300 rounded px-1"
                          value={editingValue.val}
                          onChange={e => setEditingValue({ ...editingValue, val: e.target.value })}
                          onBlur={() => handleUpdateField(f.name, editingValue.val)}
                          autoFocus
                        />
                      )
                    ) : (
                      <p 
                        className="text-sm font-black text-slate-700 break-words cursor-pointer hover:text-indigo-600"
                        onClick={() => setEditingValue({ fieldId: f.id, val: val })}
                      >
                        {val || <span className="text-slate-300 italic">Vazio</span>}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Converted Forms Section */}
          {(() => {
            const formEvents = timeline.filter(ev => ev.event_type === 'form' || (ev.event_type === 'conversion' && (ev.event_data?.fid || ev.event_data?.form_data?.fid || ev.form_data)));
            const uniqueForms = Array.from(new Set(formEvents.map(ev => {
              const data = typeof ev.form_data === 'string' ? JSON.parse(ev.form_data) : (ev.form_data || ev.event_data?.form_data || ev.event_data);
              return data?.fid || ev.url || 'Formulário s/ nome';
            }))).filter(Boolean);
            
            if (uniqueForms.length === 0) return null;

            return (
              <div className="pt-6 border-t border-slate-100 mt-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Pontos de Conversão</h4>
                <div className="flex flex-wrap gap-2">
                  {uniqueForms.map((formId: string) => (
                    <div key={formId} className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 border border-green-100 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm">
                      <FileText size={14} />
                      {formId}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Timeline */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden">
          <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 tracking-tight">
              <Activity size={20} className="text-indigo-600" />
              Jornada de Experiência
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white border border-slate-200 px-3 py-1 rounded-full shadow-sm">
              Tempo Real
            </span>
          </div>

          {groupedTimeline.length === 0 ? (
            <div className="p-20 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <Activity className="text-slate-300" size={32} />
              </div>
              <p className="text-slate-400 font-bold">Início da jornada...</p>
              <p className="text-xs text-slate-300 mt-1">Interações do lead aparecerão em breve.</p>
            </div>
          ) : (
            <div className="relative p-8">
              <div className="absolute left-[35px] top-8 bottom-8 w-0.5 bg-slate-100" />
              <div className="space-y-6">
                {groupedTimeline.map((item) => {
                  if (item.type === 'group') {
                    const isExpanded = expandedGroups.has(item.id);
                    const count = item.events.length;
                    
                    if (count === 1 && !isExpanded) {
                      return renderEvent(item.events[0]);
                    }

                    return (
                      <div key={item.id} className="space-y-4">
                        <div className="relative flex gap-4">
                          <div className="relative z-10 w-14 flex-shrink-0 flex justify-center">
                            <div className="w-4 h-4 bg-slate-200 rounded-full ring-4 ring-white shadow-sm" />
                          </div>
                          <div className="flex-1">
                            <button 
                              onClick={() => toggleGroup(item.id)}
                              className="flex items-center gap-3 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all group"
                            >
                              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 group-hover:text-indigo-600 transition-colors">
                                <Globe size={16} />
                              </div>
                              <div className="text-left">
                                <p className="text-xs font-black text-slate-600 uppercase tracking-tight">
                                  {isExpanded ? 'Ocultar visitas' : `Ver ${count} visitas de página`}
                                </p>
                                {!isExpanded && <p className="text-[10px] text-slate-400 font-bold uppercase">{formatDate(item.created_at)}</p>}
                              </div>
                              <div className="ml-auto">
                                {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                              </div>
                            </button>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="space-y-4 animate-in slide-in-from-left-4 duration-300">
                            {item.events.map((ev: any) => renderEvent(ev, true))}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return renderEvent(item.event);
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
