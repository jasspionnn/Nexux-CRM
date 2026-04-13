import React, { useState, useEffect } from 'react';
import { ArrowLeft, Activity, MousePointer, Globe, FileText, Zap, ChevronDown, ChevronUp } from 'lucide-react';

interface LeadJourneyProps { lead: any; onBack: () => void; }

export const LeadJourney: React.FC<LeadJourneyProps> = ({ lead, onBack }) => {
  const [timeline, setTimeline] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
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

  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  const formatTime = (d: string) => new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const eventIcons: any = { pageview: Globe, form: FileText, click: MousePointer, conversion: Zap };
  const eventColors: any = { pageview: 'bg-blue-500', form: 'bg-green-500', click: 'bg-purple-500', conversion: 'bg-amber-500' };
  const eventBg: any = { pageview: 'bg-blue-50 border-blue-200', form: 'bg-green-50 border-green-200', click: 'bg-purple-50 border-purple-200', conversion: 'bg-amber-50 border-amber-200' };
  const eventLabels: any = { pageview: 'Visitou página', form: 'Preencheu formulário', click: 'Clicou', conversion: 'Converteu' };

  if (isLoading) return <div className="flex items-center justify-center h-full"><div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="h-full bg-slate-50/50 p-6 lg:p-10 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-slate-600 mb-6 text-sm font-bold">
          <ArrowLeft size={18} />Voltar para Base de Leads
        </button>

        {/* Lead Info */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-lg">
              {(lead.contact_name || lead.contact_email || '?').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-black text-slate-900">{lead.contact_name || 'Lead Anônimo'}</h2>
              <p className="text-sm text-slate-500">{lead.contact_email || 'Sem email'}</p>
              <p className="text-xs text-slate-400 mt-1">Via {lead.form_name} • {formatDate(lead.created_at)}</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-500">{timeline.length} eventos</span>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2"><Activity size={20} className="text-purple-600" />Jornada do Lead</h3>
          </div>

          {timeline.length === 0 ? (
            <div className="p-12 text-center"><Activity className="mx-auto text-slate-300 mb-3" size={40} /><p className="text-slate-400 font-bold">Nenhuma interação registrada</p><p className="text-sm text-slate-400 mt-1">Pageviews, cliques e conversas aparecerão aqui.</p></div>
          ) : (
            <div className="relative p-6">
              <div className="absolute left-[27px] top-6 bottom-6 w-0.5 bg-slate-200" />
              <div className="space-y-4">
                {timeline.map(event => {
                  const Icon = eventIcons[event.event_type] || Globe;
                  const color = eventColors[event.event_type] || 'bg-slate-500';
                  const bg = eventBg[event.event_type] || 'bg-slate-50 border-slate-200';
                  const label = eventLabels[event.event_type] || event.event_type;
                  const isExpanded = expandedEvent === event.id;

                  return (
                    <div key={event.id} className="relative flex gap-4">
                      <div className="relative z-10 w-14 flex-shrink-0 flex justify-center">
                        <div className={`w-4 h-4 ${color} rounded-full ring-4 ring-white shadow-sm`} />
                      </div>
                      <div className={`flex-1 ${bg} border rounded-xl overflow-hidden`}>
                        <button onClick={() => setExpandedEvent(isExpanded ? null : event.id)}
                          className="w-full px-4 py-3 flex items-center justify-between text-left">
                          <div className="flex items-center gap-3">
                            <Icon size={16} className="text-slate-500" />
                            <div>
                              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
                              {event.url && <p className="text-sm font-semibold text-slate-800 truncate max-w-xs">{event.url}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right"><p className="text-xs font-bold text-slate-600">{formatDate(event.created_at)}</p><p className="text-[10px] text-slate-400">{formatTime(event.created_at)}</p></div>
                            {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                          </div>
                        </button>
                        {isExpanded && event.event_data && (
                          <div className="px-4 py-3 bg-white border-t border-slate-100 space-y-2">
                            {event.event_data.el_label && <p className="text-sm"><span className="font-bold text-slate-600">Elemento:</span> <span className="text-slate-800">&quot;{event.event_data.el_label}&quot;</span></p>}
                            {event.event_data.form_data?.fid && <p className="text-sm"><span className="font-bold text-slate-600">Formulário:</span> <span className="text-slate-800">&quot;{event.event_data.form_data.fid}&quot;</span></p>}
                            {event.event_data.form_data?.fields && (
                              <div>
                                <p className="text-xs font-bold text-slate-500 mb-1">Campos capturados:</p>
                                <div className="flex flex-wrap gap-1.5">{Object.entries(event.event_data.form_data.fields).map(([k, v]: [string, any]) => (<span key={k} className="text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200"><span className="text-slate-500">{k}:</span> <span className="font-medium">{String(v)}</span></span>))}</div>
                              </div>
                            )}
                            {event.referrer && <p className="text-sm"><span className="font-bold text-slate-600">Referrer:</span> <span className="text-slate-800">{event.referrer}</span></p>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
