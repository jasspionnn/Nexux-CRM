import React, { useState, useEffect } from 'react';
import { BarChart3, Eye, MousePointer, Target, Copy, Check, RefreshCw, Code, ExternalLink, TrendingUp, Calendar } from 'lucide-react';
import { useCRM } from '../context/CRMContext';

export const Marketing = () => {
  const { currentUser } = useCRM();
  const [isLoading, setIsLoading] = useState(true);
  const [trackingId, setTrackingId] = useState<string>('');
  const [stats, setStats] = useState({ pageviews: 0, forms: 0, conversions: 0 });
  const [events, setEvents] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'events'>('overview');

  const accountId = currentUser?.account_id || 'acc_demo';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [trackingRes, statsRes, eventsRes] = await Promise.all([
        fetch(`/api/tracking?account_id=${accountId}`),
        fetch(`/api/tracking/stats?account_id=${accountId}`),
        fetch(`/api/tracking/events?account_id=${accountId}&limit=50`)
      ]);

      if (trackingRes.ok) {
        const trackingData = await trackingRes.json();
        setTrackingId(trackingData.tracking_id);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        if (Array.isArray(eventsData)) setEvents(eventsData);
      }
    } catch (error) {
      console.error('Failed to fetch marketing data:', error);
    } finally {
      setIsLoading(false);
    }
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
    s.src=e+'/tracker.js';
    s.onload=function(){NexuxTracker.init(t,e)};
    document.head.appendChild(s);
  })();
</script>`;
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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <BarChart3 className="text-indigo-600" size={32} />
            Marketing
          </h1>
          <p className="text-slate-500 font-medium mt-1">Rastreie visitantes e conversões do seu site.</p>
        </div>

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
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'overview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Visão Geral
                </button>
                <button
                  onClick={() => setActiveTab('events')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'events' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Todos os Eventos
                </button>
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
                    <th className="px-6 py-4">Referência</th>
                    <th className="px-6 py-4">Data/Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {events.slice(0, activeTab === 'overview' ? 10 : undefined).map((event) => (
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
                        <div className="text-sm text-slate-500 max-w-xs truncate" title={event.referrer}>
                          {event.referrer || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Calendar size={14} />
                          {formatDate(event.created_at)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};