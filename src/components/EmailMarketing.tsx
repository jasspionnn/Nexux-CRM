import React, { useState, useEffect } from 'react';
import { Mail, Plus, Trash2, Save, Eye, Send, BarChart3, FileText, Copy, X, ChevronRight, Zap, Users } from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { EmailBlockEditor, EmailDocument, EMPTY_DOCUMENT, DEFAULT_GLOBAL_STYLES, generateEmailHTML } from './EmailBlockEditor';

interface EmailTemplate {
  id?: string;
  name: string;
  subject: string;
  body: string;
  type: 'campaign' | 'automation';
}

interface EmailCampaign {
  id?: string;
  name: string;
  segment_id: string;
  template_id: string;
  subject: string;
  body: string;
  status: string;
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  total_hard_bounce: number;
  total_soft_bounce: number;
  engaged_lead_ids: string[];
  sent_at?: string;
  created_at?: string;
}

interface Metrics {
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  total_hard_bounce: number;
  total_soft_bounce: number;
  open_rate: string;
  click_rate: string;
  hard_bounce_rate: string;
  soft_bounce_rate: string;
  engaged_count: number;
}

function parseDoc(body: string): EmailDocument {
  try {
    const parsed = JSON.parse(body);
    if (parsed && parsed.sections) return parsed as EmailDocument;
  } catch {}
  return { ...EMPTY_DOCUMENT, globalStyles: { ...DEFAULT_GLOBAL_STYLES } };
}

export const EmailMarketing = () => {
  const { currentUser } = useCRM();
  const [activeTab, setActiveTab] = useState<'campaigns' | 'templates'>('campaigns');
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [segments, setSegments] = useState<any[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<EmailCampaign | null>(null);
  const [templateDoc, setTemplateDoc] = useState<EmailDocument>(EMPTY_DOCUMENT);
  const [campaignDoc, setCampaignDoc] = useState<EmailDocument>(EMPTY_DOCUMENT);
  const [viewingMetrics, setViewingMetrics] = useState<{ campaign: EmailCampaign; metrics: Metrics } | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const accountId = currentUser?.account_id || 'acc_demo';

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [tRes, cRes, sRes] = await Promise.all([
        fetch(`/api/email-templates?account_id=${accountId}`),
        fetch(`/api/email-campaigns?account_id=${accountId}`),
        fetch(`/api/segments?account_id=${accountId}`),
      ]);
      if (tRes.ok) setTemplates(await tRes.json());
      if (cRes.ok) setCampaigns(await cRes.json());
      if (sRes.ok) setSegments(await sRes.json());
    } catch (e) { console.error(e); }
  };

  const openTemplate = (tpl: EmailTemplate) => {
    setEditingTemplate({ ...tpl });
    setTemplateDoc(parseDoc(tpl.body));
  };

  const newTemplate = (type: 'campaign' | 'automation') => {
    setEditingTemplate({ name: '', subject: '', body: '', type });
    setTemplateDoc({ ...EMPTY_DOCUMENT, globalStyles: { ...DEFAULT_GLOBAL_STYLES } });
  };

  const openCampaign = (c: EmailCampaign) => {
    setEditingCampaign({ ...c });
    setCampaignDoc(parseDoc(c.body));
  };

  const newCampaign = () => {
    setEditingCampaign({ name: '', segment_id: '', template_id: '', subject: '', body: '', status: 'draft', total_sent: 0, total_opened: 0, total_clicked: 0, total_hard_bounce: 0, total_soft_bounce: 0, engaged_lead_ids: [] });
    setCampaignDoc({ ...EMPTY_DOCUMENT, globalStyles: { ...DEFAULT_GLOBAL_STYLES } });
  };

  const saveTemplate = async () => {
    if (!editingTemplate || !editingTemplate.name.trim()) return;
    setSaving(true);
    try {
      const body = JSON.stringify(templateDoc);
      const isUpdate = !!editingTemplate.id;
      const res = await fetch(`/api/email-templates${isUpdate ? `/${editingTemplate.id}` : ''}`, {
        method: isUpdate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editingTemplate, body, account_id: accountId }),
      });
      if (res.ok) { setEditingTemplate(null); fetchAll(); }
      else { const d = await res.json(); alert(`Erro: ${d.error}`); }
    } catch (e: any) { alert(`Erro: ${e.message}`); }
    setSaving(false);
  };

  const saveCampaign = async () => {
    if (!editingCampaign || !editingCampaign.name.trim()) return;
    setSaving(true);
    try {
      const body = JSON.stringify(campaignDoc);
      const isUpdate = !!editingCampaign.id;
      const res = await fetch(`/api/email-campaigns${isUpdate ? `/${editingCampaign.id}` : ''}`, {
        method: isUpdate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editingCampaign, body, account_id: accountId }),
      });
      if (res.ok) { setEditingCampaign(null); fetchAll(); }
      else { const d = await res.json(); alert(`Erro: ${d.error}`); }
    } catch (e: any) { alert(`Erro: ${e.message}`); }
    setSaving(false);
  };

  const handleSendCampaign = async (campaign: EmailCampaign) => {
    if (!confirm(`Disparar "${campaign.name}" para a lista selecionada?`)) return;
    setSending(true);
    try {
      const res = await fetch(`/api/email-campaigns/${campaign.id}/send`, { method: 'POST' });
      if (res.ok) { const d = await res.json(); alert(`Disparo realizado! ${d.total_sent} email(s) enviado(s).`); fetchAll(); }
    } catch (e: any) { alert(`Erro: ${e.message}`); }
    setSending(false);
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Excluir este template?')) return;
    try { await fetch(`/api/email-templates/${id}`, { method: 'DELETE' }); fetchAll(); } catch {}
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('Excluir esta campanha?')) return;
    try { await fetch(`/api/email-campaigns/${id}`, { method: 'DELETE' }); fetchAll(); } catch {}
  };

  const viewMetrics = async (campaign: EmailCampaign) => {
    try {
      const res = await fetch(`/api/email-campaigns/${campaign.id}/metrics`);
      if (res.ok) setViewingMetrics({ campaign, metrics: await res.json() });
    } catch (e) { console.error(e); }
  };

  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

  // ── Metrics view ──
  if (viewingMetrics) {
    const { campaign, metrics } = viewingMetrics;
    return (
      <div className="h-full bg-slate-50/50 p-6 lg:p-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
                <button onClick={() => setViewingMetrics(null)} className="hover:text-slate-600">Email Marketing</button>
                <ChevronRight size={14} />
                <span className="text-slate-600">{campaign.name}</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900">Métricas da Campanha</h1>
            </div>
            <button onClick={() => setViewingMetrics(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold">Voltar</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            {[
              { label: 'Enviados',    value: metrics.total_sent,                                         icon: Send,    color: 'text-blue-600',   bg: 'bg-blue-50' },
              { label: 'Aberturas',   value: `${metrics.total_opened} (${metrics.open_rate}%)`,          icon: Eye,     color: 'text-green-600',  bg: 'bg-green-50' },
              { label: 'Cliques',     value: `${metrics.total_clicked} (${metrics.click_rate}%)`,        icon: Zap,     color: 'text-amber-600',  bg: 'bg-amber-50' },
              { label: 'Hard Bounce', value: `${metrics.total_hard_bounce} (${metrics.hard_bounce_rate}%)`, icon: X,  color: 'text-red-600',    bg: 'bg-red-50' },
              { label: 'Soft Bounce', value: `${metrics.total_soft_bounce} (${metrics.soft_bounce_rate}%)`, icon: X,  color: 'text-orange-600', bg: 'bg-orange-50' },
            ].map(m => (
              <div key={m.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className={`w-8 h-8 rounded-lg ${m.bg} flex items-center justify-center ${m.color} mb-3`}><m.icon size={16} /></div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{m.label}</p>
                <p className="text-lg font-black text-slate-900 mt-1">{m.value}</p>
              </div>
            ))}
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Leads Engajados</h3>
            <p className="text-2xl font-black text-blue-600">{metrics.engaged_count}</p>
            <p className="text-xs text-slate-400 mt-1">Leads que abriram ou clicaram no email</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Template editor ──
  if (editingTemplate) {
    return (
      <div className="h-full flex flex-col">
        <div className="bg-white border-b border-slate-200 px-5 py-0 flex items-stretch shrink-0 shadow-sm" style={{ minHeight: 56 }}>
          <button onClick={() => setEditingTemplate(null)}
            className="flex items-center gap-2 pr-5 mr-4 border-r border-slate-200 text-slate-400 hover:text-slate-700 transition-colors shrink-0 text-xs font-semibold">
            <X size={15} />Fechar
          </button>
          <div className="flex-1 flex items-center gap-3 py-3 min-w-0">
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${editingTemplate.type === 'campaign' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
              {editingTemplate.type === 'campaign' ? 'Template Disparo' : 'Template Automação'}
            </span>
            <div className="w-px h-5 bg-slate-200 shrink-0" />
            <div className="flex-1 min-w-0">
              <input type="text" value={editingTemplate.name}
                onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                placeholder="Nome do template..."
                className="text-sm font-bold text-slate-900 border-none focus:outline-none bg-transparent w-full placeholder-slate-300" />
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[10px] text-slate-400 shrink-0">Assunto:</span>
                <input type="text" value={editingTemplate.subject}
                  onChange={e => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                  placeholder="Assunto do email..."
                  className="text-xs text-slate-500 border-none focus:outline-none bg-transparent flex-1 placeholder-slate-300" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 pl-4 border-l border-slate-200 shrink-0">
            <button onClick={saveTemplate} disabled={saving || !editingTemplate.name.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-bold text-sm transition-colors">
              <Save size={14} />{saving ? 'Salvando...' : 'Salvar template'}
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <EmailBlockEditor doc={templateDoc} onChange={setTemplateDoc} />
        </div>
      </div>
    );
  }

  // ── Campaign editor ──
  if (editingCampaign) {
    return (
      <div className="h-full flex flex-col">
        <div className="bg-white border-b border-slate-200 px-5 py-0 flex items-stretch shrink-0 shadow-sm" style={{ minHeight: 56 }}>
          <button onClick={() => setEditingCampaign(null)}
            className="flex items-center gap-2 pr-5 mr-4 border-r border-slate-200 text-slate-400 hover:text-slate-700 transition-colors shrink-0 text-xs font-semibold">
            <X size={15} />Fechar
          </button>
          <div className="flex-1 flex items-center gap-3 py-3 min-w-0">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 shrink-0">Campanha</span>
            <div className="w-px h-5 bg-slate-200 shrink-0" />
            <div className="flex-1 min-w-0">
              <input type="text" value={editingCampaign.name}
                onChange={e => setEditingCampaign({ ...editingCampaign, name: e.target.value })}
                placeholder="Nome da campanha..."
                className="text-sm font-bold text-slate-900 border-none focus:outline-none bg-transparent w-full placeholder-slate-300" />
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[10px] text-slate-400 shrink-0">Assunto:</span>
                <input type="text" value={editingCampaign.subject}
                  onChange={e => setEditingCampaign({ ...editingCampaign, subject: e.target.value })}
                  placeholder="Assunto do email..."
                  className="text-xs text-slate-500 border-none focus:outline-none bg-transparent flex-1 placeholder-slate-300" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 pl-4 border-l border-slate-200 shrink-0">
            <div className="flex items-center gap-1.5">
              <Users size={13} className="text-slate-400" />
              <select value={editingCampaign.segment_id}
                onChange={e => setEditingCampaign({ ...editingCampaign, segment_id: e.target.value })}
                className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700 font-medium">
                <option value="">Selecionar segmento...</option>
                {segments.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <button onClick={saveCampaign} disabled={saving || !editingCampaign.name.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-bold text-sm transition-colors">
              <Save size={14} />{saving ? 'Salvando...' : 'Salvar campanha'}
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <EmailBlockEditor doc={campaignDoc} onChange={setCampaignDoc} />
        </div>
      </div>
    );
  }

  // ── List view ──
  return (
    <div className="h-full bg-slate-50/50 p-6 lg:p-10 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3"><Mail className="text-blue-600" size={32} />Email Marketing</h1>
            <p className="text-slate-500 font-medium mt-1">Crie templates e dispare campanhas para seus segmentos.</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          {(['campaigns', 'templates'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === tab ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}>
              {tab === 'campaigns' ? <><Send size={16} />Campanhas</> : <><FileText size={16} />Templates</>}
            </button>
          ))}
        </div>

        {activeTab === 'templates' ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-slate-900">Templates de Email</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => newTemplate('campaign')} className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-bold"><Plus size={16} />Template Disparo</button>
                <button onClick={() => newTemplate('automation')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold"><Zap size={16} />Template Automação</button>
              </div>
            </div>
            {templates.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-12 text-center">
                <Mail className="mx-auto text-slate-300 mb-4" size={48} />
                <p className="text-slate-400 font-bold text-lg">Nenhum template criado</p>
                <p className="text-sm text-slate-400 mt-2">Crie templates para reutilizar em campanhas ou automações.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map(tpl => {
                  const doc = parseDoc(tpl.body);
                  const sectionCount = doc.sections.length;
                  return (
                    <div key={tpl.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
                      {/* Mini preview */}
                      <div className="h-32 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                        {sectionCount > 0 ? (
                          <div className="w-full h-full p-2 pointer-events-none" style={{ transform: 'scale(0.45)', transformOrigin: 'top center' }}>
                            <div dangerouslySetInnerHTML={{ __html: generateEmailHTML(doc) }} />
                          </div>
                        ) : (
                          <div className="text-center"><Mail size={24} className="text-slate-300 mx-auto mb-1" /><p className="text-[10px] text-slate-400">Email vazio</p></div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-100/50" />
                      </div>
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-sm font-bold text-slate-900 truncate flex-1">{tpl.name}</h3>
                          <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${tpl.type === 'campaign' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>{tpl.type === 'campaign' ? 'Disparo' : 'Automação'}</span>
                        </div>
                        <p className="text-xs text-slate-500 truncate">{tpl.subject || 'Sem assunto'}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{sectionCount} seção{sectionCount !== 1 ? 'ões' : ''}</p>
                      </div>
                      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                        <button onClick={() => openTemplate(tpl)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors"><FileText size={12} />Editar</button>
                        <button onClick={() => handleDeleteTemplate(tpl.id!)} className="p-1.5 text-slate-400 hover:text-red-500 rounded transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-slate-900">Campanhas</h2>
              <button onClick={newCampaign} className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-bold"><Plus size={16} />Nova Campanha</button>
            </div>
            {campaigns.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-12 text-center">
                <Send className="mx-auto text-slate-300 mb-4" size={48} />
                <p className="text-slate-400 font-bold text-lg">Nenhuma campanha criada</p>
                <p className="text-sm text-slate-400 mt-2">Crie campanhas para disparar emails em massa.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {campaigns.map(c => {
                  const openRate = c.total_sent > 0 ? ((c.total_opened / c.total_sent) * 100).toFixed(1) : '0';
                  const clickRate = c.total_sent > 0 ? ((c.total_clicked / c.total_sent) * 100).toFixed(1) : '0';
                  const statusColors: Record<string, string> = { draft: 'bg-slate-100 text-slate-600', scheduled: 'bg-blue-50 text-blue-600', sending: 'bg-amber-50 text-amber-600', sent: 'bg-green-50 text-green-600', paused: 'bg-orange-50 text-orange-600', failed: 'bg-red-50 text-red-600' };
                  const statusLabels: Record<string, string> = { draft: 'Rascunho', scheduled: 'Agendado', sending: 'Enviando', sent: 'Enviado', paused: 'Pausado', failed: 'Falhou' };
                  return (
                    <div key={c.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                      <div className="p-4 flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-bold text-slate-900 truncate">{c.name}</h3>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusColors[c.status] || 'bg-slate-100 text-slate-600'}`}>{statusLabels[c.status] || c.status}</span>
                          </div>
                          <p className="text-xs text-slate-500 truncate">{c.subject}</p>
                        </div>
                        {c.total_sent > 0 && (
                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-center"><p className="text-[10px] text-slate-400 font-bold uppercase">Enviados</p><p className="text-sm font-black text-slate-900">{c.total_sent}</p></div>
                            <div className="text-center"><p className="text-[10px] text-slate-400 font-bold uppercase">Abertura</p><p className="text-sm font-black text-green-600">{openRate}%</p></div>
                            <div className="text-center"><p className="text-[10px] text-slate-400 font-bold uppercase">Cliques</p><p className="text-sm font-black text-blue-600">{clickRate}%</p></div>
                          </div>
                        )}
                        <div className="flex items-center gap-1 shrink-0">
                          {c.status === 'draft' && <button onClick={() => handleSendCampaign(c)} disabled={sending} className="p-2 text-slate-400 hover:text-green-600 rounded transition-colors" title="Disparar"><Send size={14} /></button>}
                          <button onClick={() => viewMetrics(c)} className="p-2 text-slate-400 hover:text-blue-600 rounded transition-colors" title="Métricas"><BarChart3 size={14} /></button>
                          <button onClick={() => openCampaign(c)} className="p-2 text-slate-400 hover:text-slate-600 rounded transition-colors" title="Editar"><FileText size={14} /></button>
                          <button onClick={() => handleDeleteCampaign(c.id!)} className="p-2 text-slate-400 hover:text-red-500 rounded transition-colors" title="Excluir"><Trash2 size={14} /></button>
                        </div>
                      </div>
                      {c.sent_at && <div className="px-4 py-2 bg-slate-50 border-t border-slate-100"><p className="text-[10px] text-slate-400">Enviado em {formatDate(c.sent_at)}</p></div>}
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
