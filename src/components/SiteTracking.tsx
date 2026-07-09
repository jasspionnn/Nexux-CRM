import React, { useState, useEffect } from 'react';
import { Eye, MousePointer, Target, Copy, Check, RefreshCw, Code, TrendingUp, Calendar, BarChart3, FormInput, X, ArrowRight, Save } from 'lucide-react';
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

  const [mappingForm, setMappingForm] = useState<any>(null);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [availableMktFields, setAvailableMktFields] = useState<any[]>([]);
  const [availableCrmFields, setAvailableCrmFields] = useState<any[]>([]);

  const accountId = currentUser?.account_id || 'acc_demo';

  useEffect(() => {
    fetchData();
    fetchAvailableFields();
  }, []);

  const fetchAvailableFields = async () => {
    try {
      const [mktRes, crmRes] = await Promise.all([
        fetch(`/api/marketing/custom-fields?account_id=${accountId}`),
        fetch(`/api/custom-fields?account_id=${accountId}`)
      ]);
      if (mktRes.ok) setAvailableMktFields(await mktRes.json());
      if (crmRes.ok) setAvailableCrmFields(await crmRes.json());
    } catch (e) { console.error('Error fetching available fields:', e); }
  };

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
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://nexux-crm.pages.dev';
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

  // Combined fields for mapping (Focus on Marketing Fields)
  const ALL_MKT_FIELDS = [
    { value: '', label: 'Ignorar' },
    { value: 'contact_name', label: 'Nome do Contato' },
    { value: 'contact_email', label: 'Email' },
    { value: 'contact_phone', label: 'Telefone' },
    { value: 'company', label: 'Empresa' },
    { value: 'title', label: 'Título do Lead' },
    { value: 'value', label: 'Valor' },
    { value: 'tags', label: 'Tags' },
    ...(Array.isArray(availableMktFields) ? availableMktFields.map(f => ({ value: `mkt:${f.id}`, label: `[Mkt] ${f.name}` })) : []),
  ];

  const openMapping = async (form: any) => {
    setMappingForm(form);
    // Load existing mapping
    try {
      const mapping = form.field_mapping ? (typeof form.field_mapping === 'string' ? JSON.parse(form.field_mapping) : form.field_mapping) : {};
      setFieldMapping(mapping);
    } catch { setFieldMapping({}); }
  };

  const saveMapping = async () => {
    if (!mappingForm) return;
    try {
      const res = await fetch(`/api/tracking-forms/${mappingForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: mappingForm.name,
          url_pattern: mappingForm.url_pattern,
          form_selector: mappingForm.form_selector,
          fields: mappingForm.fields,
          is_active: mappingForm.is_active,
          field_mapping: fieldMapping,
        })
      });
      if (res.ok) {
        setMappingForm(null);
        fetchData();
      } else {
        const err = await res.json();
        alert('Erro ao salvar: ' + (err.error || 'Erro desconhecido'));
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar mapeamento');
    }
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
  if (Array.isArray(events)) {
    events.forEach(ev => {
      if (ev && ev.form_data) {
        try {
          const fd = typeof ev.form_data === 'string' ? JSON.parse(ev.form_data) : ev.form_data;
          // Support both fid (backend/manual) and form_id (tracker.js)
          const fid = fd.fid || fd.form_id || 'unknown';
          if (ev.event_type === 'form' || (ev.event_type === 'conversion' && fd.fields)) {
            formConversions[fid] = (formConversions[fid] || 0) + 1;
          }
        } catch { /* */ }
      }
    });
  }

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
              <p className="text-2xl font-black text-slate-900">{(stats?.pageviews || 0).toLocaleString()}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2"><div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600"><MousePointer size={18} /></div></div>
              <p className="text-xs font-bold text-slate-400 uppercase">Formulários</p>
              <p className="text-2xl font-black text-slate-900">{(stats?.forms || 0).toLocaleString()}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2"><div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600"><Target size={18} /></div></div>
              <p className="text-xs font-bold text-slate-400 uppercase">Conversões</p>
              <p className="text-2xl font-black text-slate-900">{(stats?.conversions || 0).toLocaleString()}</p>
            </div>
          </div>

          {/* Tracking Code */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm mb-6 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div><h3 className="text-sm font-bold text-slate-900">Código de Rastreamento</h3></div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600">{trackingId || '...'}</span>
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
            {(!events || events.length === 0) ? (
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
                      if (!event) return null;
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
            <FormInput size={20} className="text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Formulários</h3>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">{trackingForms?.length || 0}</span>
          </div>

          {(!trackingForms || trackingForms.length === 0) ? (
            <div className="text-center py-8"><FormInput className="mx-auto text-slate-300 mb-2" size={32} /><p className="text-slate-400 text-xs">Nenhum formulário detectado.</p><p className="text-slate-400 text-[10px] mt-1">Preencha um formulário no site.</p></div>
          ) : (
            <div className="space-y-2">
              {trackingForms.map(form => {
                if (!form) return null;
                const fields = Array.isArray(form.fields) ? form.fields : [];
                const convCount = formConversions[form.name] || formConversions[form.id] || 0;
                const leadFields = fields.filter((f: any) => f && ['email','phone','name'].includes(f.type));
                return (
                  <div key={form.id} className="border border-slate-200 rounded-xl p-3 hover:border-blue-300 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-xs font-bold text-slate-900 truncate flex-1 mr-2" title={form.name}>{form.name}</h4>
                      <div className="flex items-center gap-1 shrink-0">
                        {convCount > 0 && <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{convCount} conv.</span>}
                        <button onClick={() => openMapping(form)} className="p-1 text-slate-300 hover:text-blue-500 rounded transition-colors" title="Combinar campos">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                        <button onClick={() => handleDeleteForm(form.id)} className="p-1 text-slate-300 hover:text-red-500 rounded transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {fields.slice(0, 4).map((f: any, i: number) => (
                        <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                          {f?.name}{f?.type !== 'text' && <span className="text-slate-400 ml-0.5">({f?.type})</span>}
                        </span>
                      ))}
                      {fields.length > 4 && <span className="text-[10px] text-slate-400">+{fields.length - 4}</span>}
                    </div>
                    <div className="flex items-center justify-between">
                      {leadFields.length > 0 && <span className="text-[10px] font-bold text-blue-600">✓ Captura leads</span>}
                      <span className="text-[10px] text-slate-400">{form.created_at ? new Date(form.created_at).toLocaleDateString('pt-BR') : '-'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Field Mapping Modal */}
      {mappingForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setMappingForm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-base font-bold text-slate-900">Combinar Campos</h3>
                <p className="text-xs text-slate-500 mt-0.5">{mappingForm.name}</p>
              </div>
              <button onClick={() => setMappingForm(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-3 max-h-80 overflow-y-auto">
              <p className="text-xs text-slate-500 mb-2">Mapeie os campos do formulário para os campos do CRM:</p>
              {(() => {
                const fields = Array.isArray(mappingForm.fields) 
                  ? mappingForm.fields 
                  : (typeof mappingForm.fields === 'string' ? JSON.parse(mappingForm.fields) : []);
                
                return fields.map((f: any) => (
                  <div key={f.name} className="flex items-center gap-3">
                    <div className="w-24 text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">{f.name}</span>
                    </div>
                    <ArrowRight size={14} className="text-slate-300 shrink-0" />
                    <select
                      value={fieldMapping[f.name] || ''}
                      onChange={e => setFieldMapping(m => ({ ...m, [f.name]: e.target.value }))}
                      className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {ALL_MKT_FIELDS.map(cf => (
                        <option key={cf.value} value={cf.value}>{cf.label}</option>
                      ))}
                    </select>
                  </div>
                ));
              })()}
              {(!mappingForm.fields || (typeof mappingForm.fields === 'string' && mappingForm.fields === '[]')) && <p className="text-sm text-slate-400 text-center py-4">Nenhum campo detectado.</p>}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
              <button onClick={() => setMappingForm(null)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700">Cancelar</button>
              <button onClick={saveMapping} className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-sm"><Save size={16} />Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
