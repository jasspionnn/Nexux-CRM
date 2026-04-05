import React, { useState, useEffect } from 'react';
import { Eye, MousePointer, Target, Copy, Check, RefreshCw, Code, TrendingUp, Calendar, Plus, Trash2, Edit2, X, Save, FormInput } from 'lucide-react';
import { useCRM } from '../context/CRMContext';

export const SiteTracking = () => {
  const { currentUser } = useCRM();
  const [isLoading, setIsLoading] = useState(true);
  const [trackingId, setTrackingId] = useState<string>('');
  const [stats, setStats] = useState({ pageviews: 0, forms: 0, conversions: 0 });
  const [events, setEvents] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'forms'>('overview');

  const [trackingForms, setTrackingForms] = useState<any[]>([]);

  const accountId = currentUser?.account_id || 'acc_demo';

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30s
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
    if (!confirm('Tem certeza que deseja gerar um novo Tracking ID? O código anterior deixará de funcionar.')) {
      return;
    }

    setRegenerating(true);
    try {
      const res = await fetch('/api/tracking/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountId })
      });

      if (res.ok) {
        const data = await res.json();
        setTrackingId(data.tracking_id);
        fetchData();
      }
    } catch (error) {
      console.error('Failed to regenerate tracking ID:', error);
    } finally {
      setRegenerating(false);
    }
  };

  const handleCopyCode = async () => {
    const code = getTrackerCode();
    await navigator.clipboard.writeText(code);
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
    s.src=e+'/tracker.js?v=19';
    s.onload=function(){NexuxTracker.init(t,e)};
    document.head.appendChild(s);
  })();
<\/script>

<!-- Captura automática de formulários: email, telefone, nome = conversão -->
<!-- Para rastrear conversões manuais via JS: -->
<!-- <script>NexuxTracker.track('compra',{valor:99.90})<\/script> -->`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
    try {
      const data = typeof formDataStr === 'string' ? JSON.parse(formDataStr) : formDataStr;
      return data;
    } catch { return null; }
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

  return (
    <div className="min-h-full bg-slate-50/50 p-6 lg:p-10">
      <div className="max-w-7xl mx-auto">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl shadow-slate-200/40">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Eye size={24} />
              </div>
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Pageviews</p>
            <p className="text-4xl font-black text-slate-900 mt-1">{stats.pageviews.toLocaleString()}</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl shadow-slate-200/40">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                <MousePointer size={24} />
              </div>
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Formulários</p>
            <p className="text-4xl font-black text-slate-900 mt-1">{stats.forms.toLocaleString()}</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl shadow-slate-200/40">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                <Target size={24} />
              </div>
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Conversões</p>
            <p className="text-4xl font-black text-slate-900 mt-1">{stats.conversions.toLocaleString()}</p>
          </div>
        </div>

        {/* Tracking Code Section */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/40 mb-8">
          <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Código de Rastreamento</h3>
              <p className="text-sm text-slate-500">Insira este código no seu site para começar a rastrear.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono bg-slate-100 px-3 py-1.5 rounded-lg text-slate-600">{trackingId}</span>
              <button
                onClick={handleRegenerateId}
                disabled={regenerating}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw size={16} className={regenerating ? 'animate-spin' : ''} />
                Novo ID
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="relative">
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-sm overflow-x-auto font-mono">
                <code>{getTrackerCode()}</code>
              </pre>
              <button
                onClick={handleCopyCode}
                className="absolute top-3 right-3 flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>

            <div className="mt-4 flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <Code className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
              <div className="text-sm text-blue-800">
                <p className="font-bold mb-1">Como usar:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-700">
                  <li>Copie o código acima</li>
                  <li>Cole antes do fechamento da tag <code className="bg-blue-100 px-1 rounded">&lt;/head&gt;</code> no seu site</li>
                  <li>Os dados começarão a aparecer automaticamente</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Events Section */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/40 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-bold text-slate-900">Eventos Recentes</h3>
              <div className="flex rounded-lg bg-slate-100 p-1">
                <button onClick={() => setActiveTab('overview')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'overview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Visão Geral</button>
                <button onClick={() => setActiveTab('events')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'events' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Eventos</button>
                <button onClick={() => setActiveTab('forms')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'forms' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Formulários</button>
              </div>
            </div>
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <RefreshCw size={16} />
              Atualizar
            </button>
          </div>

          {events.length === 0 ? (
            <div className="p-12 text-center">
              <TrendingUp className="mx-auto text-slate-300 mb-4" size={48} />
              <p className="text-slate-400 font-medium">Nenhum evento registrado ainda.</p>
              <p className="text-sm text-slate-400 mt-1">Adicione o código de rastreamento ao seu site para começar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 sticky top-0 z-10 border-b border-gray-200">
                  <tr className="text-slate-400 text-xs uppercase tracking-wider font-bold">
                    <th className="px-6 py-4">Tipo</th>
                    <th className="px-6 py-4">URL</th>
                    <th className="px-6 py-4">Campos Capturados</th>
                    <th className="px-6 py-4">Data/Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {events.slice(0, activeTab === 'overview' ? 10 : undefined).map((event) => {
                    const formData = parseFormData(event.form_data);
                    const fields = formData?.fields || {};
                    const fieldEntries = Object.entries(fields);
                    return (
                    <tr key={event.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getEventTypeColor(event.event_type)}`}>
                          {getEventTypeLabel(event.event_type)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-900 max-w-xs truncate" title={event.url}>
                          {event.url || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {fieldEntries.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {fieldEntries.slice(0, 3).map(([key, val]) => (
                              <span key={key} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200" title={`${key}: ${val}`}>
                                <span className="font-bold text-slate-500">{key}:</span>
                                <span className="ml-1 truncate max-w-[80px]">{String(val)}</span>
                              </span>
                            ))}
                            {fieldEntries.length > 3 && <span className="text-xs text-slate-400">+{fieldEntries.length - 3}</span>}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Calendar size={14} />
                          {formatDate(event.created_at)}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Formulários Tab */}
        {activeTab === 'forms' && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden mt-6">
            <div className="px-6 py-5 border-b border-gray-100 bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Formulários Detectados</h3>
                <p className="text-sm text-slate-500">Formulários detectados automaticamente quando preenchidos no site.</p>
              </div>
            </div>

            {trackingForms.length === 0 ? (
              <div className="p-12 text-center">
                <FormInput className="mx-auto text-slate-300 mb-4" size={48} />
                <p className="text-slate-400 font-bold text-lg">Nenhum formulário detectado ainda</p>
                <p className="text-sm text-slate-400 mt-2">Preencha um formulário no seu site para ele aparecer aqui automaticamente.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {trackingForms.map(form => {
                  const fields = form.fields || [];
                  const leadFields = fields.filter((f: any) => ['email','phone','name'].includes(f.type));
                  return (
                    <div key={form.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
                          <FormInput size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">{form.name}</h4>
                          {form.url_pattern && <p className="text-xs text-slate-500 mt-0.5">URL: {form.url_pattern}</p>}
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {fields.slice(0, 5).map((f: any, i: number) => (
                              <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                                {f.name}
                                {f.type !== 'text' && <span className="ml-1 text-slate-400">({f.type})</span>}
                              </span>
                            ))}
                            {fields.length > 5 && <span className="text-xs text-slate-400">+{fields.length - 5}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {leadFields.length > 0 && <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded">✓ Captura leads</span>}
                        <span className="text-xs text-slate-400">{new Date(form.created_at).toLocaleDateString('pt-BR')}</span>
                        <button onClick={async () => { if (confirm('Excluir este formulário?')) { await fetch(`/api/tracking-forms/${form.id}`, { method: 'DELETE' }); fetchData(); } }} className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-white"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};