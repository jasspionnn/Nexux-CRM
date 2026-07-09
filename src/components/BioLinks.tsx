import React, { useState, useEffect } from 'react';
import { Link, Plus, Trash2, Copy, Save, Palette, Type, Layout, ExternalLink, Smartphone, Monitor, BarChart3, Calendar, TrendingUp, MousePointer, Users, Clock, Download, ChevronDown, Check, X, Eye } from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { createPortal } from 'react-dom';

interface BioLink {
  id: string;
  label: string;
  url: string;
  icon: string;
}

interface BioPage {
  id?: string;
  slug: string;
  title: string;
  description: string;
  avatar_url: string;
  bg_color: string;
  text_color: string;
  button_color: string;
  button_text_color: string;
  button_radius: number;
  links: BioLink[];
  is_active: number;
  click_count?: number;
  // New design options
  font_family?: string;
  bg_gradient?: boolean;
  bg_gradient_color?: string;
  bg_pattern?: string;
  button_shadow?: string;
  button_animation?: string;
  avatar_shape?: string;
  show_powered_by?: boolean;
}

const ICON_OPTIONS = ['🔗', '📱', '📧', '🌐', '💼', '🎯', '📸', '🎵', '🎬', '📺', '💬', '🛒', '⭐', '🚀', ''];

const DEFAULT_BIO: BioPage = {
  slug: '',
  title: 'Meus Links',
  description: 'Confira meus links importantes',
  avatar_url: '',
  bg_color: '#0f172a',
  text_color: '#f8fafc',
  button_color: '#0d9488',
  button_text_color: '#ffffff',
  button_radius: 12,
  links: [
    { id: crypto.randomUUID(), label: 'Meu Site', url: 'https://meusite.com', icon: '🌐' },
    { id: crypto.randomUUID(), label: 'WhatsApp', url: 'https://wa.me/5511999999999', icon: '💬' },
    { id: crypto.randomUUID(), label: 'Instagram', url: 'https://instagram.com/meuperfil', icon: '📸' },
  ],
  is_active: 1,
};

export const BioLinks = () => {
  const { currentUser } = useCRM();
  const [isLoading, setIsLoading] = useState(true);
  const [bioPages, setBioPages] = useState<BioPage[]>([]);
  const [editing, setEditing] = useState<BioPage | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('mobile');
  const [activeTab, setActiveTab] = useState<'content' | 'design' | 'analytics'>('content');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const accountId = currentUser?.account_id || 'acc_demo';

  // Analytics states
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const dateDropdownRef = React.useRef<HTMLButtonElement>(null);

  // Analytics dashboard mode
  const [analyticsDashboard, setAnalyticsDashboard] = useState<BioPage | null>(null);

  useEffect(() => { fetchPages(); }, []);

  useEffect(() => {
    if (analyticsDashboard?.id) {
      fetchAnalyticsForDashboard();
    }
  }, [analyticsDashboard?.id, dateRange, customStartDate, customEndDate]);

  useEffect(() => {
    if (editing?.id) {
      fetchAnalytics();
    }
  }, [editing?.id, dateRange, customStartDate, customEndDate]);

  const getDateRange = () => {
    const now = new Date();
    let start: Date;
    switch (dateRange) {
      case '7d': start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
      case '90d': start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
      case 'custom': start = new Date(customStartDate); break;
      default: start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    const end = dateRange === 'custom' ? new Date(customEndDate) : now;
    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
  };

  const fetchPages = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/bio-links?account_id=${accountId}`);
      if (res.ok) setBioPages(await res.json());
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  const fetchAnalytics = async () => {
    if (!editing?.id) return;
    setAnalyticsLoading(true);
    try {
      const { start, end } = getDateRange();
      const res = await fetch(`/api/bio-links/${editing.id}/analytics?start_date=${start}&end_date=${end}`);
      if (res.ok) setAnalytics(await res.json());
    } catch (e) { console.error(e); }
    setAnalyticsLoading(false);
  };

  const fetchAnalyticsForDashboard = async () => {
    if (!analyticsDashboard?.id) return;
    setAnalyticsLoading(true);
    try {
      const { start, end } = getDateRange();
      const res = await fetch(`/api/bio-links/${analyticsDashboard.id}/analytics?start_date=${start}&end_date=${end}`);
      if (res.ok) setAnalytics(await res.json());
    } catch (e) { console.error(e); }
    setAnalyticsLoading(false);
  };

  const handleCreate = () => {
    const newBio = { ...DEFAULT_BIO, slug: `bio-${Date.now().toString(36)}`, id: undefined };
    setEditing(newBio as BioPage);
  };

  const handleEdit = (page: BioPage) => {
    setEditing({ ...page });
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const isUpdate = !!editing.id;
      const url = isUpdate ? `/api/bio-links/${editing.id}` : '/api/bio-links';
      const res = await fetch(url, {
        method: isUpdate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editing, account_id: accountId }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('Bio save error:', data);
        alert(`Erro ao salvar: ${data.error || 'Erro desconhecido'}`);
      } else {
        setEditing(null);
        fetchPages();
      }
    } catch (e: any) {
      console.error('Bio save error:', e);
      alert(`Erro ao salvar: ${e.message}`);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta página de links?')) return;
    try {
      await fetch(`/api/bio-links/${id}`, { method: 'DELETE' });
      fetchPages();
    } catch (e) { console.error(e); }
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/bio/${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateLink = (index: number, field: keyof BioLink, value: string) => {
    if (!editing) return;
    const links = [...editing.links];
    links[index] = { ...links[index], [field]: value };
    setEditing({ ...editing, links });
  };

  const addLink = () => {
    if (!editing) return;
    setEditing({
      ...editing,
      links: [...editing.links, { id: crypto.randomUUID(), label: '', url: '', icon: '🔗' }],
    });
  };

  const removeLink = (index: number) => {
    if (!editing) return;
    setEditing({ ...editing, links: editing.links.filter((_, i) => i !== index) });
  };

  if (isLoading) return <div className="flex items-center justify-center h-full"><div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" /></div>;

  // Analytics Dashboard Mode
  if (analyticsDashboard) {
    return (
      <div className="h-full bg-slate-50/50 flex flex-col overflow-hidden">
        {/* Dashboard Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { setAnalyticsDashboard(null); setAnalytics(null); }} 
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-slate-600" />
            </button>
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
                <BarChart3 size={24} className="text-purple-600" />
                Analytics - {analyticsDashboard.title}
              </h2>
              <p className="text-sm text-slate-500 font-medium mt-0.5">
                <a href={`/bio/${analyticsDashboard.slug}`} target="_blank" rel="noopener noreferrer" className="font-mono text-blue-600 hover:underline">
                  /bio/{analyticsDashboard.slug}
                </a>
              </p>
            </div>
          </div>
          <button 
            onClick={() => handleEdit(analyticsDashboard)} 
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-colors"
          >
            Editar Página
          </button>
        </div>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            {analyticsLoading ? (
              <div className="flex items-center justify-center py-24">
                <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : analytics ? (
              <>
                {/* Date Range Selector */}
                <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Período de Análise</label>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { label: '7 dias', value: '7d' },
                      { label: '30 dias', value: '30d' },
                      { label: '90 dias', value: '90d' },
                      { label: 'Personalizado', value: 'custom' },
                    ].map(range => (
                      <button
                        key={range.value}
                        onClick={() => setDateRange(range.value as any)}
                        className={`flex-1 min-w-[100px] px-4 py-2.5 border rounded-xl text-sm font-bold transition-colors ${
                          dateRange === range.value
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                  {dateRange === 'custom' && (
                    <div className="flex gap-3 mt-4">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-slate-400 mb-1.5">Data início</label>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={e => setCustomStartDate(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div className="flex items-end pb-2">
                        <span className="text-slate-400 text-sm">até</span>
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-slate-400 mb-1.5">Data fim</label>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={e => setCustomEndDate(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg text-white">
                    <div className="flex items-center gap-3 mb-3">
                      <MousePointer size={24} className="opacity-80" />
                      <span className="text-sm font-bold opacity-90">Total de Cliques</span>
                    </div>
                    <div className="text-4xl font-black">{analytics.total_stats?.total_clicks || 0}</div>
                    <div className="text-xs mt-2 opacity-70">Cliques em todos os botões</div>
                  </div>
                  <div className="p-6 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg text-white">
                    <div className="flex items-center gap-3 mb-3">
                      <Users size={24} className="opacity-80" />
                      <span className="text-sm font-bold opacity-90">Visitantes Únicos</span>
                    </div>
                    <div className="text-4xl font-black">{analytics.total_stats?.total_unique_clicks || 0}</div>
                    <div className="text-xs mt-2 opacity-70">IPs diferentes</div>
                  </div>
                  <div className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg text-white">
                    <div className="flex items-center gap-3 mb-3">
                      <TrendingUp size={24} className="opacity-80" />
                      <span className="text-sm font-bold opacity-90">Links com Cliques</span>
                    </div>
                    <div className="text-4xl font-black">{analytics.total_stats?.total_links_clicked || 0}</div>
                    <div className="text-xs mt-2 opacity-70">De {analyticsDashboard.links?.length || 0} links ativos</div>
                  </div>
                </div>

                {/* Clicks by Link - Detailed */}
                <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm">
                  <h3 className="text-lg font-black text-slate-900 mb-5 flex items-center gap-2">
                    <MousePointer size={20} className="text-blue-600" />
                    Desempenho por Link
                  </h3>
                  <div className="space-y-4">
                    {analytics.clicks_by_link?.length === 0 ? (
                      <div className="text-center py-16 text-slate-400">
                        <MousePointer size={48} className="mx-auto mb-3 opacity-30" />
                        <p className="font-bold text-sm">Nenhum clique registrado neste período</p>
                        <p className="text-xs mt-1">Compartilhe seu link na bio para começar a receber cliques</p>
                      </div>
                    ) : (
                      analytics.clicks_by_link?.map((link: any, idx: number) => {
                        const percentage = analytics.total_stats?.total_clicks > 0 
                          ? ((link.click_count / analytics.total_stats.total_clicks) * 100).toFixed(1) 
                          : 0;
                        return (
                          <div key={idx} className="p-5 bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-xl hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black text-sm">
                                  #{idx + 1}
                                </div>
                                <div>
                                  <span className="text-base font-bold text-slate-900">{link.link_label}</span>
                                  <div className="text-xs text-slate-400 font-mono truncate max-w-[300px]">{link.link_url}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-black text-blue-600">{link.click_count}</div>
                                <div className="text-xs text-slate-500">cliques ({percentage}%)</div>
                              </div>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-700 ease-out rounded-full"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                              <span>{link.unique_clicks} visitantes únicos</span>
                              <div className="flex gap-4">
                                <span>Primeiro: {link.first_click ? new Date(link.first_click).toLocaleDateString('pt-BR') : '-'}</span>
                                <span>Último: {link.last_click ? new Date(link.last_click).toLocaleDateString('pt-BR') : '-'}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Daily Clicks Timeline */}
                <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm">
                  <h3 className="text-lg font-black text-slate-900 mb-5 flex items-center gap-2">
                    <Calendar size={20} className="text-indigo-600" />
                    Linha do Tempo - Cliques por Dia
                  </h3>
                  {analytics.daily_clicks?.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                      <Calendar size={48} className="mx-auto mb-3 opacity-30" />
                      <p className="font-bold text-sm">Nenhum dado disponível</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto no-scrollbar">
                      {analytics.daily_clicks?.map((day: any, idx: number) => {
                        const maxClicks = Math.max(...analytics.daily_clicks.map((d: any) => d.click_count));
                        const percentage = maxClicks > 0 ? (day.click_count / maxClicks) * 100 : 0;
                        return (
                          <div key={idx} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-lg transition-colors">
                            <div className="w-24 text-slate-600 font-bold text-sm">
                              {new Date(day.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                            </div>
                            <div className="flex-1 bg-slate-100 rounded-full h-8 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-500 ease-out rounded-full flex items-center justify-end pr-3"
                                style={{ width: `${Math.max(percentage, 8)}%` }}
                              >
                                {day.click_count > 0 && (
                                  <span className="text-white font-black text-xs">{day.click_count}</span>
                                )}
                              </div>
                            </div>
                            <div className="w-20 text-right">
                              <div className="flex items-center gap-1 text-sm">
                                <Users size={12} className="text-slate-400" />
                                <span className="font-bold text-slate-700">{day.unique_clicks}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-24">
                <BarChart3 size={64} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-400 font-bold text-lg">Carregando analytics...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Editing mode
  if (editing) {
    return (
      <div className="h-full bg-slate-50/50 flex">
        {/* Editor Panel */}
        <div className="w-1/2 lg:w-[45%] border-r border-slate-200 bg-white flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                {editing.id ? 'Editar Página' : 'Nova Página'}
              </h2>
              <p className="text-sm text-slate-500 font-medium mt-0.5">Configure seus links e design</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-sm disabled:opacity-50">
                <Save size={16} />Salvar
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200 shrink-0">
            <button onClick={() => setActiveTab('content')} className={`flex-1 px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'content' ? 'border-slate-900 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <Link size={16} />Conteúdo
            </button>
            <button onClick={() => setActiveTab('design')} className={`flex-1 px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'design' ? 'border-slate-900 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <Palette size={16} />Design
            </button>
            <button onClick={() => { setActiveTab('analytics'); if (editing.id) fetchAnalytics(); }} className={`flex-1 px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'analytics' ? 'border-slate-900 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <BarChart3 size={16} />Analytics
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'content' && (
              <div className="space-y-5">
                {/* Basic Info */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">URL Slug</label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400 font-mono">/bio/</span>
                    <input
                      type="text"
                      value={editing.slug}
                      onChange={e => setEditing({ ...editing, slug: e.target.value })}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="meu-nome"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Título</label>
                  <input type="text" value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Descrição</label>
                  <textarea value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">URL do Avatar (opcional)</label>
                  <input type="text" value={editing.avatar_url} onChange={e => setEditing({ ...editing, avatar_url: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://..." />
                </div>

                {/* Links */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Links ({editing.links.length})</label>
                    <button onClick={addLink} className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700">
                      <Plus size={14} />Adicionar
                    </button>
                  </div>
                  <div className="space-y-3">
                    {editing.links.map((link, i) => (
                      <div key={link.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                        <div className="flex items-center gap-2">
                          <select
                            value={link.icon}
                            onChange={e => updateLink(i, 'icon', e.target.value)}
                            className="w-10 h-9 text-center text-lg bg-white border border-slate-200 rounded-lg focus:outline-none"
                          >
                            {ICON_OPTIONS.map(ic => <option key={ic} value={ic}>{ic || '—'}</option>)}
                          </select>
                          <input
                            type="text"
                            value={link.label}
                            onChange={e => updateLink(i, 'label', e.target.value)}
                            placeholder="Título do link"
                            className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button onClick={() => removeLink(i)} className="p-1 text-slate-300 hover:text-red-500 rounded transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={link.url}
                          onChange={e => updateLink(i, 'url', e.target.value)}
                          placeholder="https://..."
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'design' && (
              <div className="space-y-5">
                {/* Colors */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Palette size={14} className="text-slate-400" />
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cores</label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Fundo</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={editing.bg_color} onChange={e => setEditing({ ...editing, bg_color: e.target.value })} className="w-9 h-9 rounded cursor-pointer border-0" />
                        <input type="text" value={editing.bg_color} onChange={e => setEditing({ ...editing, bg_color: e.target.value })} className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-xs font-mono focus:outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Texto</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={editing.text_color} onChange={e => setEditing({ ...editing, text_color: e.target.value })} className="w-9 h-9 rounded cursor-pointer border-0" />
                        <input type="text" value={editing.text_color} onChange={e => setEditing({ ...editing, text_color: e.target.value })} className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-xs font-mono focus:outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Botão</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={editing.button_color} onChange={e => setEditing({ ...editing, button_color: e.target.value })} className="w-9 h-9 rounded cursor-pointer border-0" />
                        <input type="text" value={editing.button_color} onChange={e => setEditing({ ...editing, button_color: e.target.value })} className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-xs font-mono focus:outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Texto do Botão</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={editing.button_text_color} onChange={e => setEditing({ ...editing, button_text_color: e.target.value })} className="w-9 h-9 rounded cursor-pointer border-0" />
                        <input type="text" value={editing.button_text_color} onChange={e => setEditing({ ...editing, button_text_color: e.target.value })} className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-xs font-mono focus:outline-none" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Button Radius */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Layout size={14} className="text-slate-400" />
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Arredondamento do Botão</label>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={editing.button_radius}
                    onChange={e => setEditing({ ...editing, button_radius: parseInt(e.target.value) })}
                    className="w-full accent-slate-900"
                  />
                  <div className="text-center text-xs text-slate-400 font-mono mt-1">{editing.button_radius}px</div>
                </div>

                {/* Presets */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Temas Prontos</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { name: 'Dark', bg: '#0f172a', text: '#f8fafc', btn: '#0d9488', btnText: '#ffffff' },
                      { name: 'Light', bg: '#f8fafc', text: '#0f172a', btn: '#0d9488', btnText: '#ffffff' },
                      { name: 'Roxo', bg: '#1e1b4b', text: '#e0e7ff', btn: '#7c3aed', btnText: '#ffffff' },
                      { name: 'Rosa', bg: '#831843', text: '#fce7f3', btn: '#ec4899', btnText: '#ffffff' },
                      { name: 'Azul', bg: '#0c4a6e', text: '#e0f2fe', btn: '#0ea5e9', btnText: '#ffffff' },
                      { name: 'Verde', bg: '#052e16', text: '#dcfce7', btn: '#22c55e', btnText: '#ffffff' },
                      { name: 'Laranja', bg: '#431407', text: '#ffedd5', btn: '#f97316', btnText: '#ffffff' },
                      { name: 'Cinza', bg: '#18181b', text: '#f4f4f5', btn: '#a1a1aa', btnText: '#000000' },
                      { name: 'Dourado', bg: '#451a03', text: '#fef3c7', btn: '#d97706', btnText: '#ffffff' },
                    ].map(preset => (
                      <button
                        key={preset.name}
                        onClick={() => setEditing({ ...editing, bg_color: preset.bg, text_color: preset.text, button_color: preset.btn, button_text_color: preset.btnText })}
                        className="p-2 border border-slate-200 rounded-lg hover:border-blue-500 text-left"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.bg }} />
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.btn }} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-600">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Family */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Type size={14} className="text-slate-400" />
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fonte</label>
                  </div>
                  <select
                    value={editing.font_family || 'Inter'}
                    onChange={e => setEditing({ ...editing, font_family: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Inter">Inter (Padrão)</option>
                    <option value="Poppins">Poppins</option>
                    <option value="Roboto">Roboto</option>
                    <option value="Montserrat">Montserrat</option>
                    <option value="Open Sans">Open Sans</option>
                    <option value="Lato">Lato</option>
                  </select>
                </div>

                {/* Avatar Shape */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Formato do Avatar</label>
                  <div className="flex gap-2">
                    {['circle', 'square', 'rounded'].map(shape => (
                      <button
                        key={shape}
                        onClick={() => setEditing({ ...editing, avatar_shape: shape })}
                        className={`flex-1 px-3 py-2 border rounded-lg text-xs font-bold transition-colors ${
                          (editing.avatar_shape || 'circle') === shape
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {shape === 'circle' ? '⭕ Círculo' : shape === 'square' ? '⬜ Quadrado' : '🔲 Arredondado'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Button Shadow */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Sombra do Botão</label>
                  <div className="flex gap-2">
                    {[
                      { name: 'Nenhuma', value: 'none' },
                      { name: 'Leve', value: 'sm' },
                      { name: 'Média', value: 'md' },
                      { name: 'Forte', value: 'lg' },
                    ].map(shadow => (
                      <button
                        key={shadow.value}
                        onClick={() => setEditing({ ...editing, button_shadow: shadow.value })}
                        className={`flex-1 px-2 py-2 border rounded-lg text-[10px] font-bold transition-colors ${
                          (editing.button_shadow || 'md') === shadow.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {shadow.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Button Animation */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Animação do Botão</label>
                  <div className="flex gap-2">
                    {[
                      { name: 'Nenhuma', value: 'none' },
                      { name: 'Scale', value: 'scale' },
                      { name: 'Slide', value: 'slide' },
                      { name: 'Fade', value: 'fade' },
                    ].map(anim => (
                      <button
                        key={anim.value}
                        onClick={() => setEditing({ ...editing, button_animation: anim.value })}
                        className={`flex-1 px-2 py-2 border rounded-lg text-[10px] font-bold transition-colors ${
                          (editing.button_animation || 'scale') === anim.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {anim.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-5">
                {analyticsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : analytics ? (
                  <>
                    {/* Date Range Selector */}
                    <div className="relative">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Período</label>
                      <div className="flex gap-2 flex-wrap">
                        {[
                          { label: '7 dias', value: '7d' },
                          { label: '30 dias', value: '30d' },
                          { label: '90 dias', value: '90d' },
                          { label: 'Personalizado', value: 'custom' },
                        ].map(range => (
                          <button
                            key={range.value}
                            onClick={() => setDateRange(range.value as any)}
                            className={`flex-1 min-w-[80px] px-3 py-2 border rounded-lg text-xs font-bold transition-colors ${
                              dateRange === range.value
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {range.label}
                          </button>
                        ))}
                      </div>
                      {dateRange === 'custom' && (
                        <div className="flex gap-2 mt-3">
                          <div className="flex-1">
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">Data início</label>
                            <input
                              type="date"
                              value={customStartDate}
                              onChange={e => setCustomStartDate(e.target.value)}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">Data fim</label>
                            <input
                              type="date"
                              value={customEndDate}
                              onChange={e => setCustomEndDate(e.target.value)}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl">
                        <div className="flex items-center gap-2 mb-1">
                          <MousePointer size={14} className="text-blue-600" />
                          <span className="text-[10px] font-bold text-blue-600 uppercase">Total Cliques</span>
                        </div>
                        <div className="text-2xl font-black text-blue-900">{analytics.total_stats?.total_clicks || 0}</div>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl">
                        <div className="flex items-center gap-2 mb-1">
                          <Users size={14} className="text-green-600" />
                          <span className="text-[10px] font-bold text-green-600 uppercase">Cliques Únicos</span>
                        </div>
                        <div className="text-2xl font-black text-green-900">{analytics.total_stats?.total_unique_clicks || 0}</div>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp size={14} className="text-purple-600" />
                          <span className="text-[10px] font-bold text-purple-600 uppercase">Links Ativos</span>
                        </div>
                        <div className="text-2xl font-black text-purple-900">{analytics.total_stats?.total_links_clicked || 0}</div>
                      </div>
                    </div>

                    {/* Clicks by Link */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Cliques por Link</label>
                      <div className="space-y-2">
                        {analytics.clicks_by_link?.length === 0 ? (
                          <div className="text-center py-8 text-slate-400 text-xs">Nenhum clique registrado neste período</div>
                        ) : (
                          analytics.clicks_by_link?.map((link: any, idx: number) => (
                            <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-slate-900">{link.link_label}</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-sm font-black text-blue-600">{link.click_count}</span>
                                  <span className="text-[10px] text-slate-400 ml-1">cliques</span>
                                </div>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                                  style={{ width: `${(link.click_count / analytics.total_stats?.total_clicks) * 100 || 0}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                                <span>{link.unique_clicks} únicos</span>
                                <span className="font-mono truncate max-w-[200px] ml-2">{link.link_url}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Daily Clicks Chart */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Cliques por Dia</label>
                      <div className="space-y-1 max-h-48 overflow-y-auto no-scrollbar">
                        {analytics.daily_clicks?.length === 0 ? (
                          <div className="text-center py-8 text-slate-400 text-xs">Nenhum dado disponível</div>
                        ) : (
                          analytics.daily_clicks?.map((day: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-3 text-xs">
                              <div className="w-20 text-slate-500 font-mono text-[10px]">
                                {new Date(day.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                              </div>
                              <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                                  style={{ width: `${(day.click_count / Math.max(...analytics.daily_clicks.map((d: any) => d.click_count))) * 100}%` }}
                                />
                              </div>
                              <div className="w-16 text-right font-bold text-slate-700">{day.click_count}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <BarChart3 size={48} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-400 font-bold text-sm">Analytics indisponível</p>
                    <p className="text-slate-400 text-xs mt-1">Salve a página primeiro para ver estatísticas</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Preview Panel */}
        <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-8">
          {/* Preview Mode Toggle */}
          <div className="flex items-center gap-2 mb-6">
            <button onClick={() => setPreviewMode('mobile')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${previewMode === 'mobile' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
              <Smartphone size={14} />Mobile
            </button>
            <button onClick={() => setPreviewMode('desktop')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${previewMode === 'desktop' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
              <Monitor size={14} />Desktop
            </button>
          </div>

          {/* Phone Frame */}
          <div className={`bg-white rounded-[2.5rem] shadow-2xl overflow-hidden transition-all duration-300 ${previewMode === 'mobile' ? 'w-[320px] h-[640px]' : 'w-[480px] h-[640px]'}`}>
            <div className="h-full overflow-y-auto" style={{ backgroundColor: editing.bg_color }}>
              {/* Profile Section */}
              <div className="px-6 pt-12 pb-6 text-center">
                {editing.avatar_url ? (
                  <img src={editing.avatar_url} alt="" className="w-20 h-20 rounded-full mx-auto mb-4 object-cover border-2" style={{ borderColor: editing.button_color }} />
                ) : (
                  <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-black" style={{ backgroundColor: editing.button_color, color: editing.button_text_color }}>
                    {editing.title.charAt(0).toUpperCase()}
                  </div>
                )}
                <h3 className="text-lg font-black" style={{ color: editing.text_color }}>{editing.title}</h3>
                {editing.description && <p className="text-sm mt-1 opacity-80" style={{ color: editing.text_color }}>{editing.description}</p>}
              </div>

              {/* Links */}
              <div className="px-4 pb-8 space-y-3">
                {editing.links.filter(l => l.label && l.url).map(link => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 font-bold text-sm transition-transform hover:scale-[1.02] block"
                    style={{
                      backgroundColor: editing.button_color,
                      color: editing.button_text_color,
                      borderRadius: editing.button_radius,
                    }}
                  >
                    {link.icon && <span className="text-lg">{link.icon}</span>}
                    {link.label}
                  </a>
                ))}
              </div>

              {/* Footer */}
              <div className="px-4 pb-8 text-center">
                <p className="text-[10px] opacity-40" style={{ color: editing.text_color }}>Feito com Nexux CRM</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List mode
  return (
    <div className="h-full bg-slate-50/50 p-6 lg:p-10 overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3"><Link className="text-blue-600" size={32} />Link na Bio</h1>
            <p className="text-slate-500 font-medium mt-1">Crie páginas de links personalizáveis para compartilhar nas redes sociais.</p>
          </div>
          <button onClick={handleCreate} className="flex items-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold">
            <Plus size={18} />Nova Página
          </button>
        </div>

        {bioPages.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-12 text-center">
            <Link className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-400 font-bold text-lg">Nenhuma página criada ainda</p>
            <p className="text-sm text-slate-400 mt-2">Crie sua primeira página de links para compartilhar nas redes sociais.</p>
            <button onClick={handleCreate} className="mt-6 flex items-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold mx-auto">
              <Plus size={18} />Criar Minha Primeira Página
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {bioPages.map(page => (
              <div key={page.id} className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow">
                {/* Preview Header */}
                <div className="h-28 flex items-center justify-center" style={{ backgroundColor: page.bg_color }}>
                  <div className="text-center">
                    {page.avatar_url ? (
                      <img src={page.avatar_url} alt="" className="w-14 h-14 rounded-full mx-auto object-cover border-2" style={{ borderColor: page.button_color }} />
                    ) : (
                      <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center text-xl font-black" style={{ backgroundColor: page.button_color, color: page.button_text_color }}>
                        {page.title.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-black text-slate-900">{page.title}</h3>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded ${page.is_active ? 'text-blue-600 bg-blue-50' : 'text-slate-400 bg-slate-50'}`}>
                      {page.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mb-3">{page.description}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mb-4">
                    <span className="flex items-center gap-1"><Link size={12} />{page.links?.length || 0} links</span>
                    <span className="flex items-center gap-1"><Eye size={12} />{page.click_count || 0} cliques</span>
                    <span className="font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded">/bio/{page.slug}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setAnalyticsDashboard(page); setAnalytics(null); setActiveTab('analytics'); }} className="flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-bold transition-colors">
                      <BarChart3 size={14} />Analytics
                    </button>
                    <button onClick={() => copyLink(page.slug)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors">
                      {copied ? <><Eye size={14} />Copiado!</> : <><Copy size={14} />Copiar Link</>}
                    </button>
                    <button onClick={() => handleEdit(page)} className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors">
                      Editar
                    </button>
                    <button onClick={() => handleDelete(page.id!)} className="p-2 text-slate-300 hover:text-red-500 rounded-lg transition-colors">
                      <Trash2 size={16} />
                    </button>
                    <a href={`/bio/${page.slug}`} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-300 hover:text-blue-600 rounded-lg transition-colors">
                      <ExternalLink size={16} />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
