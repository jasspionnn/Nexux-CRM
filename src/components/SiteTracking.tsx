import React, { useState, useEffect } from 'react';
import { Eye, MousePointer, Target, Copy, Check, RefreshCw, Code, TrendingUp, Calendar, BarChart3, FormInput } from 'lucide-react';
import { useCRM } from '../context/CRMContext';

export const SiteTracking = () => {
  const { currentUser } = useCRM();
  const [isLoading, setIsLoading] = useState(true);
  const [trackingId, setTrackingId] = useState<string>('');
  const [stats, setStats] = useState({ pageviews: 0, forms: 0, conversions: 0 });
  const [events, setEvents] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [trackingForms, setTrackingForms] = useState<any[]>([]);

  const accountId = currentUser?.account_id || 'acc_demo';

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [trackingRes, statsRes, eventsRes, formsRes] = await Promise.all([
        fetch(`/api/tracking?account_id=${accountId}`),
        fetch(`/api/tracking/stats?account_id=${accountId}`),
        fetch(`/api/tracking/events?account_id=${accountId}&limit=50`),
        fetch(`/api/tracking-forms?account_id=${accountId}`)
      ]);
      if (trackingRes.ok) setTrackingId((await trackingRes.json()).tracking_id);
      if (statsRes.ok) setStats(await statsRes.json());
      if (eventsRes.ok) { const d = await eventsRes.json(); if (Array.isArray(d)) setEvents(d); }
      if (formsRes.ok) { const d = await formsRes.json(); if (Array.isArray(d)) setTrackingForms(d); }
    } catch (error) { console.error('Failed to fetch marketing data:', error); }
    setIsLoading(false);
  };

  const handleRegenerateId = async () => {
    if (!confirm('Tem certeza que deseja gerar um novo Tracking ID? O código anterior deixará de funcionar.')) return;
    setRegenerating(true);
    try {
      const res = await fetch('/api/tracking/regenerate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountId })
      });
      if (res.ok) { const data = await res.json(); setTrackingId(data.tracking_id); fetchData(); }
    } catch (error) { console.error('Failed to regenerate tracking ID:', error); }
    setRegenerating(false);
  };

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(getTrackerCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getTrackerCode = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';
    return `<script>
  (function() {
    var t='${trackingId}';
    var e='${origin}';
    var s=document.createElement('script');
    s.src=e+'/tracker.js?v=23';
    s.onload=function(){NexuxTracker.init(t,e)};
    document.head.appendChild(s);
  })();
<\/script>`;
  };

  const handleDeleteForm = async (id: string) => {
    if (!confirm('Excluir este formulário rastreado?')) return;
    try { await fetch(`/api/tracking-forms/${id}`, { method: 'DELETE' }); fetchData(); }
    catch (e) { console.error(e); alert('Erro ao excluir'); }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'pageview': return 'Pageview';
      case 'form': return 'Formulário';
      case 'conversion': return 'Conversão';
      default: return type;
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'pageview': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'form': return 'bg-green-100 text-green-700 border-green-200';
      case 'conversion': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const parseFormData = (formDataStr: string | null) => {
    if (!formDataStr) return null;
    try { return typeof formDataStr === 'string' ? JSON.parse(formDataStr) : formDataStr; } catch { return null; }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50/50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-bold text-sm animate-pulse tracking-widest uppercase">Carregando...</p>
        </div>
      </div>
    );
  }

  // Count conversions per form
  const formConversions: Record<string, number> = {};
  events.forEach(ev => {
    if (ev.form_data) {
      try {
        const fd = typeof ev.form_data === 'string' ? JSON.parse(ev.form_data) : ev.form_data;
        const fid = fd.fid || 'unknown';
        if (ev.event_type === 'form' || (ev.event_type === 'conversion' && fd.fields)) {
          formConversions[fid] = (formConversions[fid] || 0) + 1;
        }
      } catch { /* */ }
    }
  });

  return (
    <div className="h-full bg-slate-50/50 flex overflow-hidden">
      {/* Left: Events */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-8 border-r border-slate-200">
        <div className="max-w-full">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2"><div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600"><Eye size={18} /></div></div>
              <p className="text-xs font-bold text-slate-400 uppercase">Pageviews</p>
              <p className="text-2xl font-black text-slate-900">{stats.pageviews.toLocaleString()}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2"><div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600"><MousePointer size={18} /></div></div>
              <p className="text-xs font-bold text-slate-400 uppercase">Formulários</p>
              <p className="text-2xl font-black text-slate-900">{stats.forms.toLocaleString()}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2"><div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600"><Target size={18} /></div></div>
              <p className="text-xs font-bold text-slate-400 uppercase">Conversões</p>
              <p className="text-2xl font-black text-slate-900">{stats.conversions.toLocaleString()}</p>
            </div>
          </div>

          {/* Tracking Code */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm mb-6 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div><h3 className="text-sm font-bold text-slate-900">Código de Rastreamento</h3></div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600">{trackingId}</span>
                <button onClick={handleRegenerateId} disabled={regenerating} className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors disabled:opacity-50">
                  <RefreshCw size={14} className={regenerating ? 'animate-spin' : ''} />Novo ID
                </button>
              </div>
            </div>
            <div className="p-4">
              <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg text-xs overflow-x-auto font-mono relative">
                <code>{getTrackerCode()}</code>
                <button onClick={handleCopyCode} className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-medium transition-colors">
                  {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copiado!' : 'Copiar'}
                </button>
              </pre>
            </div>
          </div>

          {/* Events Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900">Eventos Recentes</h3>
              <button onClick={fetchData} className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors">
                <RefreshCw size={14} />Atualizar
              </button>
            </div>
            {events.length === 0 ? (
              <div className="p-8 text-center"><TrendingUp className="mx-auto text-slate-300 mb-3" size={36} /><p className="text-slate-400 font-medium text-sm">Nenhum evento registrado.</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-gray-200">
                    <tr className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">
                      <th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Campos</th><th className="px-4 py-3">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {events.slice(0, 20).map((event) => {
                      const formData = parseFormData(event.form_data);
                      const fields = formData?.fields || {};
                      const fieldEntries = Object.entries(fields);
                      return (
                        <tr key={event.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getEventTypeColor(event.event_type)}`}>{getEventTypeLabel(event.event_type)}</span>
                          </td>
                          <td className="px-4 py-3">
                            {fieldEntries.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {fieldEntries.slice(0, 3).map(([key, val]) => (
                                  <span key={key} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200" title={`${key}: ${val}`}>
                                    <span className="font-bold text-slate-400">{key}:</span><span className="ml-0.5 truncate max-w-[60px]">{String(val)}</span>
                                  </span>
                                ))}
                                {fieldEntries.length > 3 && <span className="text-[10px] text-slate-400">+{fieldEntries.length - 3}</span>}
                              </div>
                            ) : <span className="text-xs text-slate-400">-</span>}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">{formatDate(event.created_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Forms */}
      <div className="flex-1 bg-white overflow-y-auto shrink-0 border-l border-slate-200">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <FormInput size={20} className="text-teal-600" />
            <h3 className="text-sm font-bold text-slate-900">Formulários</h3>
            <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-bold">{trackingForms.length}</span>
          </div>

          {trackingForms.length === 0 ? (
            <div className="text-center py-8"><FormInput className="mx-auto text-slate-300 mb-2" size={32} /><p className="text-slate-400 text-xs">Nenhum formulário detectado.</p><p className="text-slate-400 text-[10px] mt-1">Preencha um formulário no site.</p></div>
          ) : (
            <div className="space-y-2">
              {trackingForms.map(form => {
                const fields = form.fields || [];
                const convCount = formConversions[form.name] || 0;
                const leadFields = fields.filter((f: any) => ['email','phone','name'].includes(f.type));
                return (
                  <div key={form.id} className="border border-slate-200 rounded-xl p-3 hover:border-teal-300 transition-colors group">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-xs font-bold text-slate-900 truncate flex-1" title={form.name}>{form.name}</h4>
                      <div className="flex items-center gap-1">
                        {convCount > 0 && <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">{convCount} conv.</span>}
                        <button onClick={() => handleDeleteForm(form.id)} className="p-1 text-slate-300 hover:text-red-500 rounded transition-colors opacity-0 group-hover:opacity-100">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {fields.slice(0, 4).map((f: any, i: number) => (
                        <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                          {f.name}{f.type !== 'text' && <span className="text-slate-400 ml-0.5">({f.type})</span>}
                        </span>
                      ))}
                      {fields.length > 4 && <span className="text-[10px] text-slate-400">+{fields.length - 4}</span>}
                    </div>
                    <div className="flex items-center justify-between">
                      {leadFields.length > 0 && <span className="text-[10px] font-bold text-teal-600">✓ Captura leads</span>}
                      <span className="text-[10px] text-slate-400">{new Date(form.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
