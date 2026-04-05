import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GitBranch, Plus, Play, Pause, Trash2, Edit2, Zap, Clock,
  Mail, Tag, ArrowRight, ChevronRight, Eye, X, Save, Loader2,
  MoveUp, MessageSquare, UserPlus, FileText, Globe, AlertCircle
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';

// ==================== TYPES ====================

type NodeType = 'trigger' | 'condition' | 'action' | 'delay';
type TriggerType = 'new_lead' | 'stage_change' | 'form_submit' | 'page_visit' | 'conversion' | 'webhook';
type ActionType = 'move_stage' | 'create_task' | 'add_tag' | 'remove_tag' | 'send_email' | 'send_webhook' | 'create_note' | 'assign_user';
type ConditionType = 'value_gt' | 'value_lt' | 'has_tag' | 'not_has_tag' | 'stage_is' | 'email_contains' | 'probability_gt';

interface FlowNode {
  id: string;
  type: NodeType;
  nodeType: TriggerType | ConditionType | ActionType | 'delay';
  label: string;
  config: Record<string, any>;
  x: number;
  y: number;
}

interface FlowConnection {
  id: string;
  from: string;
  to: string;
}

interface Automation {
  id: string; name: string; description: string; is_active: number;
  trigger_type: string; trigger_config: any;
  nodes: FlowNode[]; connections: FlowConnection[]; created_at: string;
}

// ==================== CATALOG ====================

const HEADER_H = 52; // fixed header height for port positioning

const TRIGGERS = [
  { type: 'new_lead' as TriggerType, label: 'Novo Lead', icon: UserPlus, color: 'bg-emerald-500', desc: 'Quando um novo lead é criado' },
  { type: 'stage_change' as TriggerType, label: 'Mudou de Estágio', icon: ArrowRight, color: 'bg-blue-500', desc: 'Quando lead muda de estágio' },
  { type: 'form_submit' as TriggerType, label: 'Formulário Preenchido', icon: FileText, color: 'bg-orange-500', desc: 'Quando lead preenche formulário' },
  { type: 'page_visit' as TriggerType, label: 'Visitou Página', icon: Globe, color: 'bg-purple-500', desc: 'Quando lead visita uma URL' },
  { type: 'conversion' as TriggerType, label: 'Conversão', icon: Zap, color: 'bg-amber-500', desc: 'Quando lead converte' },
  { type: 'webhook' as TriggerType, label: 'Webhook', icon: Globe, color: 'bg-indigo-500', desc: 'Quando recebe webhook' },
];
const CONDITIONS = [
  { type: 'value_gt' as ConditionType, label: 'Valor > X', icon: MoveUp, color: 'bg-amber-500', desc: 'Valor do lead maior que X' },
  { type: 'value_lt' as ConditionType, label: 'Valor < X', icon: MoveUp, color: 'bg-amber-500', desc: 'Valor do lead menor que X' },
  { type: 'has_tag' as ConditionType, label: 'Tem Tag', icon: Tag, color: 'bg-pink-500', desc: 'Lead possui tag X' },
  { type: 'not_has_tag' as ConditionType, label: 'Não Tem Tag', icon: Tag, color: 'bg-pink-500', desc: 'Lead não possui tag X' },
  { type: 'stage_is' as ConditionType, label: 'Estágio É', icon: ArrowRight, color: 'bg-blue-500', desc: 'Lead está no estágio X' },
  { type: 'email_contains' as ConditionType, label: 'Email Contém', icon: Mail, color: 'bg-red-500', desc: 'Email contém texto X' },
  { type: 'probability_gt' as ConditionType, label: 'Prob. > X%', icon: MoveUp, color: 'bg-green-500', desc: 'Probabilidade maior que X%' },
];
const ACTIONS = [
  { type: 'move_stage' as ActionType, label: 'Mover Estágio', icon: ArrowRight, color: 'bg-blue-500', desc: 'Move lead para outro estágio' },
  { type: 'create_task' as ActionType, label: 'Criar Tarefa', icon: AlertCircle, color: 'bg-orange-500', desc: 'Cria tarefa para usuário' },
  { type: 'add_tag' as ActionType, label: 'Adicionar Tag', icon: Tag, color: 'bg-pink-500', desc: 'Adiciona tag ao lead' },
  { type: 'remove_tag' as ActionType, label: 'Remover Tag', icon: Tag, color: 'bg-pink-500', desc: 'Remove tag do lead' },
  { type: 'send_email' as ActionType, label: 'Enviar Email', icon: Mail, color: 'bg-red-500', desc: 'Envia email para lead' },
  { type: 'send_webhook' as ActionType, label: 'Enviar Webhook', icon: Globe, color: 'bg-indigo-500', desc: 'Envia payload via webhook' },
  { type: 'create_note' as ActionType, label: 'Criar Nota', icon: FileText, color: 'bg-gray-500', desc: 'Adiciona nota ao lead' },
  { type: 'assign_user' as ActionType, label: 'Atribuir Usuário', icon: UserPlus, color: 'bg-teal-500', desc: 'Atribui lead a usuário' },
];
const DELAY = { type: 'delay' as const, label: 'Esperar', icon: Clock, color: 'bg-slate-500', desc: 'Espera X minutos/horas/dias' };

const CATALOG = [...TRIGGERS, ...CONDITIONS, ...ACTIONS, DELAY];
const findCat = (t: string) => CATALOG.find(n => n.type === t) || { type: t, label: t, icon: Zap, color: 'bg-gray-500', desc: '' };

const NODE_W = 300;

// Estimate config height based on node type
function configHeight(node: FlowNode): number {
  if (!node || Object.keys(node.config).length === 0) return 0;
  const t = node.nodeType;
  switch (t) {
    case 'new_lead': case 'conversion': case 'form_submit': return 50;
    case 'value_gt': case 'value_lt': case 'has_tag': case 'not_has_tag':
    case 'stage_is': case 'email_contains': case 'probability_gt':
    case 'move_stage': case 'delay': case 'add_tag': case 'remove_tag':
    case 'assign_user': case 'webhook': case 'page_visit': return 80;
    case 'stage_change': return 140;
    case 'create_task': return 170;
    case 'send_email': return 180;
    case 'send_webhook': return 120;
    case 'create_note': return 130;
    default: return 70;
  }
}

function nodeTotalH(node: FlowNode): number {
  const cfgH = configHeight(node);
  return cfgH > 0 ? HEADER_H + cfgH + 40 : HEADER_H; // header + config + footer
}

function portPos(node: FlowNode, side: 'out' | 'in'): { x: number; y: number } {
  // Output = right side center of header, Input = left side center of header
  return { x: side === 'out' ? node.x + NODE_W : node.x, y: node.y + HEADER_H / 2 };
}

function bezier(a: { x: number; y: number }, b: { x: number; y: number }): string {
  const dx = Math.max(Math.abs(b.x - a.x) * 0.4, 40);
  return `M${a.x},${a.y} C${a.x + dx},${a.y} ${b.x - dx},${b.y} ${b.x},${b.y}`;
}

function connPath(nodes: FlowNode[], fid: string, tid: string): string {
  const fn = nodes.find(n => n.id === fid), tn = nodes.find(n => n.id === tid);
  if (!fn || !tn) return '';
  return bezier(portPos(fn, 'out'), portPos(tn, 'in'));
}

// ==================== MAIN ====================

export const AutomationFlows = () => {
  const { currentUser } = useCRM();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingAuto, setEditingAuto] = useState<Automation | null>(null);
  const accountId = currentUser?.account_id || 'acc_demo';

  useEffect(() => { fetchAutos(); }, []);
  const fetchAutos = async () => {
    setIsLoading(true);
    try { const r = await fetch(`/api/automations?account_id=${accountId}`); if (r.ok) setAutomations(await r.json()); } catch (e) { /* */ }
    setIsLoading(false);
  };

  const handleSave = async (data: any) => {
    try {
      const exists = automations.find(a => a.id === data.id);
      const r = await fetch(exists ? `/api/automations/${data.id}` : '/api/automations', {
        method: exists ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, account_id: accountId })
      });
      if (r.ok) { setShowBuilder(false); setEditingAuto(null); fetchAutos(); }
    } catch (e) { console.error(e); }
  };

  if (isLoading) return <div className="flex items-center justify-center h-full"><div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-full bg-slate-50/50">
      {!showBuilder ? (
        <div className="p-6 lg:p-10"><div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div><h1 className="text-3xl font-black text-slate-900 flex items-center gap-3"><GitBranch className="text-teal-600" size={32} />Automações</h1><p className="text-slate-500 font-medium mt-1">Fluxos visuais para automatizar suas vendas.</p></div>
            <button onClick={() => { setEditingAuto({ id: crypto.randomUUID(), name: '', description: '', is_active: 1, trigger_type: '', trigger_config: {}, nodes: [], connections: [], created_at: new Date().toISOString() }); setShowBuilder(true); }} className="flex items-center gap-2 px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-lg shadow-teal-200"><Plus size={20} />Novo Fluxo</button>
          </div>
          {automations.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-12 text-center"><GitBranch className="mx-auto text-slate-300 mb-4" size={48} /><p className="text-slate-400 font-bold text-lg">Nenhum fluxo criado</p><p className="text-sm text-slate-400 mt-2 mb-6">Crie seu primeiro fluxo de automação.</p><button onClick={() => { setEditingAuto({ id: crypto.randomUUID(), name: '', description: '', is_active: 1, trigger_type: '', trigger_config: {}, nodes: [], connections: [], created_at: new Date().toISOString() }); setShowBuilder(true); }} className="inline-flex items-center gap-2 px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold"><Plus size={20} />Criar Primeiro Fluxo</button></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {automations.map(a => (
                <div key={a.id} className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${a.is_active ? 'bg-teal-50 text-teal-600' : 'bg-slate-100 text-slate-400'}`}><GitBranch size={20} /></div><div><h3 className="font-bold text-slate-900">{a.name}</h3>{a.description && <p className="text-xs text-slate-400 truncate max-w-[180px]">{a.description}</p>}</div></div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${a.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{a.is_active ? 'Ativo' : 'Pausado'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500"><Zap size={12} className="text-yellow-500" /><span>Trigger:</span><span className="capitalize">{a.trigger_type?.replace('_', ' ') || '-'}</span></div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1"><span>{(a.nodes || []).length} nós</span><span>•</span><span>{new Date(a.created_at).toLocaleDateString('pt-BR')}</span></div>
                  </div>
                  <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex gap-1">
                      <button onClick={async () => { await fetch(`/api/automations/${a.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...a, is_active: a.is_active ? 0 : 1 }) }); fetchAutos(); }} className="p-2 text-slate-400 hover:text-teal-600 rounded-lg hover:bg-white">{a.is_active ? <Pause size={16} /> : <Play size={16} />}</button>
                      <button onClick={() => { setEditingAuto(a); setShowBuilder(true); }} className="p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-white"><Edit2 size={16} /></button>
                      <button onClick={async () => { if (confirm('Excluir?')) { await fetch(`/api/automations/${a.id}`, { method: 'DELETE' }); fetchAutos(); } }} className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-white"><Trash2 size={16} /></button>
                    </div>
                    <button onClick={() => { setEditingAuto(a); setShowBuilder(true); }} className="flex items-center gap-1 text-xs font-bold text-teal-600"><Eye size={14} />Abrir<ChevronRight size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div></div>
      ) : (
        <Builder automation={editingAuto!} onSave={handleSave} onCancel={() => { setShowBuilder(false); setEditingAuto(null); }} accountId={accountId} />
      )}
    </div>
  );
};

// ==================== BUILDER ====================

const Builder: React.FC<{ automation: Automation; onSave: (d: any) => void; onCancel: () => void; accountId: string }> = ({ automation, onSave, onCancel, accountId }) => {
  const [name, setName] = useState(automation.name || '');
  const [description, setDescription] = useState(automation.description || '');
  const [nodes, setNodes] = useState<FlowNode[]>(automation.nodes || []);
  const [connections, setConnections] = useState<FlowConnection[]>(automation.connections || []);
  const [showCatalog, setShowCatalog] = useState(nodes.length === 0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [stages, setStages] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const canvasEl = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const [f, u] = await Promise.all([fetch('/api/funnels'), fetch(`/api/users?account_id=${accountId}`)]);
        if (f.ok) { const d = await f.json(); setStages(d.flatMap((x: any) => x.stages || [])); }
        if (u.ok) setUsers(await u.json());
      } catch (e) { /* */ }
    })();
  }, [accountId]);

  // Mouse tracking
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (connectingFrom && canvasEl.current) {
        const r = canvasEl.current.getBoundingClientRect();
        setMousePos({ x: e.clientX - r.left + canvasEl.current.scrollLeft, y: e.clientY - r.top + canvasEl.current.scrollTop });
      }
    };
    window.addEventListener('mousemove', h);
    return () => window.removeEventListener('mousemove', h);
  }, [connectingFrom]);

  // ─── Drag ───
  const onDragStart = useCallback((id: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    const sx = e.clientX, sy = e.clientY, ox = node.x, oy = node.y;
    const onMove = (ev: MouseEvent) => {
      setNodes(ns => ns.map(n => n.id === id ? { ...n, x: Math.max(0, ox + ev.clientX - sx), y: Math.max(0, oy + ev.clientY - sy) } : n));
    };
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [nodes]);

  const addNode = (cat: any, type: NodeType) => {
    const maxY = nodes.length ? Math.max(...nodes.map(n => n.y + nodeTotalH(n))) + 80 : 60;
    const nn: FlowNode = { id: crypto.randomUUID(), type, nodeType: cat.type, label: cat.label, config: {}, x: 60 + Math.random() * 30, y: maxY };
    setNodes([...nodes, nn]);
    setShowCatalog(false);
  };

  const updateCfg = (id: string, c: Record<string, any>) => setNodes(ns => ns.map(n => n.id === id ? { ...n, config: { ...n.config, ...c } } : n));
  const removeNode = (id: string) => { setNodes(ns => ns.filter(n => n.id !== id)); setConnections(cs => cs.filter(c => c.from !== id && c.to !== id)); setSelectedId(null); };

  const doSave = async () => {
    if (!name.trim()) { alert('Dê um nome ao fluxo'); return; }
    setSaving(true);
    await onSave({ id: automation.id, name, description, is_active: 1, trigger_type: nodes.find(n => n.type === 'trigger')?.nodeType || '', trigger_config: nodes.find(n => n.type === 'trigger')?.config || {}, nodes, connections, created_at: automation.created_at });
    setSaving(false);
  };

  // Canvas size
  const canvasH = Math.max(nodes.length ? Math.max(...nodes.map(n => n.y + nodeTotalH(n))) + 400 : 600, 600);

  // Form helpers
  const F: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
    <div className="space-y-1"><label className="text-[11px] font-bold text-slate-600">{label}</label>{children}{hint && <p className="text-[10px] text-slate-400">{hint}</p>}</div>
  );
  const ic = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 bg-white";
  const sc = ic;

  const renderCfg = (node: FlowNode) => {
    const t = node.nodeType;
    return (
      <div className="px-4 pt-3 pb-2 border-t border-slate-100 space-y-2.5">
        {t === 'new_lead' && <p className="text-xs text-slate-500 flex items-center gap-2"><Zap size={14} className="text-emerald-500" />Dispara quando um novo lead é criado.</p>}
        {t === 'stage_change' && (<><F label="Origem" hint="Qualquer se vazio"><select value={node.config.from_stage_id || ''} onChange={e => updateCfg(node.id, { from_stage_id: e.target.value })} className={sc}><option value="">Qualquer</option>{stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></F><div className="flex justify-center text-slate-300"><ArrowRight size={16} className="rotate-90" /></div><F label="Destino" hint="Qualquer se vazio"><select value={node.config.to_stage_id || ''} onChange={e => updateCfg(node.id, { to_stage_id: e.target.value })} className={sc}><option value="">Qualquer</option>{stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></F></>)}
        {t === 'page_visit' && <F label="URL contém"><input type="text" value={node.config.url_pattern || ''} onChange={e => updateCfg(node.id, { url_pattern: e.target.value })} placeholder="/precos" className={ic} /></F>}
        {t === 'value_gt' && <F label="Valor &gt;"><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span><input type="number" value={node.config.value || ''} onChange={e => updateCfg(node.id, { value: +e.target.value || 0 })} placeholder="0" className={`${ic} pl-9`} /></div></F>}
        {t === 'value_lt' && <F label="Valor &lt;"><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span><input type="number" value={node.config.value || ''} onChange={e => updateCfg(node.id, { value: +e.target.value || 0 })} placeholder="0" className={`${ic} pl-9`} /></div></F>}
        {(t === 'has_tag' || t === 'not_has_tag') && <F label="Tag"><input type="text" value={node.config.tag || ''} onChange={e => updateCfg(node.id, { tag: e.target.value })} placeholder="enterprise" className={ic} /></F>}
        {t === 'stage_is' && <F label="Estágio"><select value={node.config.stage_id || ''} onChange={e => updateCfg(node.id, { stage_id: e.target.value })} className={sc}><option value="">Selecione</option>{stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></F>}
        {t === 'email_contains' && <F label="Email contém"><input type="text" value={node.config.text || ''} onChange={e => updateCfg(node.id, { text: e.target.value })} placeholder="@empresa.com" className={ic} /></F>}
        {t === 'probability_gt' && <F label="Probabilidade &gt;"><div className="relative"><input type="number" value={node.config.probability || ''} onChange={e => updateCfg(node.id, { probability: +e.target.value || 0 })} placeholder="50" min={0} max={100} className={`${ic} pr-8`} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span></div></F>}
        {t === 'move_stage' && <F label="Mover para"><select value={node.config.to_stage_id || ''} onChange={e => updateCfg(node.id, { to_stage_id: e.target.value })} className={sc}><option value="">Selecione</option>{stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></F>}
        {t === 'create_task' && (<><F label="Título"><input type="text" value={node.config.title || ''} onChange={e => updateCfg(node.id, { title: e.target.value })} placeholder="Ligar para lead" className={ic} /></F><F label="Data limite"><input type="date" value={node.config.due_date || ''} onChange={e => updateCfg(node.id, { due_date: e.target.value })} className={ic} /></F><F label="Atribuir a"><select value={node.config.assigned_user_id || ''} onChange={e => updateCfg(node.id, { assigned_user_id: e.target.value })} className={sc}><option value="">Selecione</option>{users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></F></>)}
        {(t === 'add_tag' || t === 'remove_tag') && <F label="Tag"><input type="text" value={node.config.tag || ''} onChange={e => updateCfg(node.id, { tag: e.target.value })} placeholder="cliente" className={ic} /></F>}
        {t === 'send_email' && (<><F label="Assunto"><input type="text" value={node.config.subject || ''} onChange={e => updateCfg(node.id, { subject: e.target.value })} placeholder="Bem-vindo!" className={ic} /></F><F label="Corpo"><textarea value={node.config.body || ''} onChange={e => updateCfg(node.id, { body: e.target.value })} placeholder="Olá {{lead_name}}," rows={3} className={`${ic} resize-none font-mono text-xs`} /></F></>)}
        {t === 'send_webhook' && (<><F label="URL"><input type="url" value={node.config.url || ''} onChange={e => updateCfg(node.id, { url: e.target.value })} placeholder="https://api.exemplo.com" className={ic} /></F><F label="Método"><select value={node.config.method || 'POST'} onChange={e => updateCfg(node.id, { method: e.target.value })} className={sc}><option>POST</option><option>GET</option><option>PUT</option><option>DELETE</option></select></F></>)}
        {t === 'create_note' && <F label="Nota"><textarea value={node.config.content || ''} onChange={e => updateCfg(node.id, { content: e.target.value })} placeholder="Lead qualificado..." rows={2} className={`${ic} resize-none`} /></F>}
        {t === 'assign_user' && <F label="Usuário"><select value={node.config.user_id || ''} onChange={e => updateCfg(node.id, { user_id: e.target.value })} className={sc}><option value="">Selecione</option>{users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></F>}
        {t === 'delay' && (<div className="flex items-end gap-2"><div className="flex-1"><F label="Duração"><input type="number" value={node.config.duration || ''} onChange={e => updateCfg(node.id, { duration: +e.target.value || 0 })} placeholder="30" min={1} className={ic} /></F></div><select value={node.config.unit || 'minutes'} onChange={e => updateCfg(node.id, { unit: e.target.value })} className={`${sc} flex-1 mt-4`}><option value="minutes">Minutos</option><option value="hours">Horas</option><option value="days">Dias</option></select></div>)}
      </div>
    );
  };

  const sel = selectedId;

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3 flex-1">
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
          <div className="flex-1"><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nome do fluxo..." className="text-lg font-bold text-slate-900 border-none focus:outline-none bg-transparent w-full" /><input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição..." className="text-xs text-slate-500 border-none focus:outline-none bg-transparent w-full" /></div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCatalog(c => !c)} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-sm"><Plus size={15} />Bloco</button>
          <button onClick={doSave} disabled={saving || !nodes.length} className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-sm disabled:opacity-50">{saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}Salvar</button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Catalog */}
        {showCatalog && (
          <aside className="w-60 bg-white border-r border-slate-200 overflow-y-auto shrink-0 z-20">
            <div className="p-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Gatilhos</p>
              <div className="space-y-1 mb-4">{TRIGGERS.map(n => <CatItem key={n.type} n={n} onClick={() => addNode(n, 'trigger')} />)}</div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Condições</p>
              <div className="space-y-1 mb-4">{CONDITIONS.map(n => <CatItem key={n.type} n={n} onClick={() => addNode(n, 'condition')} />)}</div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Ações</p>
              <div className="space-y-1 mb-4">{ACTIONS.map(n => <CatItem key={n.type} n={n} onClick={() => addNode(n, 'action')} />)}</div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Tempo</p>
              <CatItem n={DELAY} onClick={() => addNode(DELAY, 'delay')} />
            </div>
          </aside>
        )}

        {/* Canvas */}
        <div ref={canvasEl} className="flex-1 overflow-auto relative" style={{ height: canvasH }}>
          <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px]" />

          {/* SVG connections layer */}
          <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1, pointerEvents: 'none' }}>
            {connections.map(c => {
              const path = connPath(nodes, c.from, c.to);
              if (!path) return null;
              const tn = nodes.find(n => n.id === c.to);
              const tp = tn ? portPos(tn, 'in') : { x: 0, y: 0 };
              return (
                <g key={c.id}>
                  {/* Invisible wide hit area */}
                  <path d={path} fill="none" stroke="transparent" strokeWidth={18} className="cursor-pointer" style={{ pointerEvents: 'stroke' }} onClick={() => setConnections(cs => cs.filter(x => x.id !== c.id))} />
                  {/* Visible line */}
                  <path d={path} fill="none" stroke="#94a3b8" strokeWidth={2.5} strokeLinecap="round" />
                  {/* Arrow dot at input */}
                  <circle cx={tp.x} cy={tp.y} r={4} fill="#94a3b8" />
                </g>
              );
            })}
            {/* Preview line */}
            {connectingFrom && (() => {
              const fn = nodes.find(n => n.id === connectingFrom);
              if (!fn) return null;
              const a = portPos(fn, 'out');
              const dx = Math.max(Math.abs(mousePos.x - a.x) * 0.4, 40);
              return <path d={`M${a.x},${a.y} C${a.x + dx},${a.y} ${mousePos.x - dx},${mousePos.y} ${mousePos.x},${mousePos.y}`} fill="none" stroke="#0d9488" strokeWidth={2.5} strokeDasharray="8 4" strokeLinecap="round" />;
            })()}
          </svg>

          {/* Nodes */}
          {nodes.map(node => {
            const cat = findCat(node.nodeType);
            const Icon = cat.icon;
            const isConn = connectingFrom === node.id;
            const hasOut = connections.some(c => c.from === node.id);
            const hasIn = connections.some(c => c.to === node.id);
            const isSel = sel === node.id;
            const h = nodeTotalH(node);

            return (
              <div key={node.id} className="absolute select-none" style={{ left: node.x, top: node.y, width: NODE_W, height: h, zIndex: isSel ? 20 : 10 }}>
                {/* Input port (left side) */}
                {nodes.indexOf(node) > 0 && (
                  <div
                    className={`absolute -left-[5px] w-3 h-3 rounded-full border-2 cursor-pointer transition-all z-30 ${
                      connectingFrom ? 'bg-teal-400 border-teal-600 scale-150 shadow-md shadow-teal-200' : 'bg-white border-slate-300 hover:border-teal-500 hover:scale-125'
                    }`}
                    style={{ top: HEADER_H / 2 - 6 }}
                    onClick={() => {
                      if (connectingFrom && connectingFrom !== node.id) {
                        if (!connections.find(c => c.from === connectingFrom && c.to === node.id)) {
                          setConnections(prev => [...prev, { id: crypto.randomUUID(), from: connectingFrom, to: node.id }]);
                        }
                        setConnectingFrom(null);
                      }
                    }}
                  />
                )}

                {/* Card */}
                <div className={`bg-white border-2 rounded-xl shadow-md overflow-hidden transition-all ${isSel ? 'border-teal-500 shadow-lg ring-1 ring-teal-200' : 'border-slate-200'} ${connectingFrom && !isConn ? 'ring-2 ring-teal-400/15' : ''}`}>
                  {/* Header / drag */}
                  <div className="flex items-center gap-2.5 px-3 select-none" style={{ height: HEADER_H }} onMouseDown={e => onDragStart(node.id, e)} onClick={() => { if (!connectingFrom) setSelectedId(isSel ? null : node.id); }}>
                    <div className={`w-8 h-8 rounded-lg ${cat.color} flex items-center justify-center text-white shrink-0 shadow-sm`}><Icon size={16} /></div>
                    <div className="flex-1 min-w-0"><p className="text-sm font-bold text-slate-900 truncate">{node.label}</p><p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{node.type}</p></div>
                    <button onClick={e => { e.stopPropagation(); removeNode(node.id); }} className="p-1 text-slate-300 hover:text-red-500 rounded shrink-0"><X size={14} /></button>
                  </div>

                  {/* Config */}
                  {isSel && renderCfg(node)}

                  {/* Footer */}
                  <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {hasIn && hasOut ? '✓ Conectado' : hasOut ? '→ Saída' : hasIn ? '← Entrada' : 'Pendente'}
                    </span>
                    <button onClick={e => { e.stopPropagation(); setConnectingFrom(isConn ? null : node.id); }}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${isConn ? 'bg-teal-100 text-teal-700 ring-1 ring-teal-300' : 'bg-teal-600 text-white hover:bg-teal-700'}`}>
                      <ArrowRight size={12} />{isConn ? 'Selecione o alvo' : 'Conectar'}
                    </button>
                  </div>
                </div>

                {/* Output port (right side) */}
                <div
                  className={`absolute -right-[5px] w-3 h-3 rounded-full border-2 cursor-pointer transition-all z-30 ${
                    isConn ? 'bg-teal-500 border-teal-600 scale-150 animate-pulse shadow-md shadow-teal-200' : 'bg-white border-slate-300 hover:border-teal-500 hover:scale-125'
                  }`}
                  style={{ top: HEADER_H / 2 - 6 }}
                  onClick={e => { e.stopPropagation(); setConnectingFrom(isConn ? null : node.id); }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const CatItem: React.FC<{ n: any; onClick: () => void }> = ({ n, onClick }) => {
  const Icon = n.icon;
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50/50 transition-all text-left group">
      <div className={`w-7 h-7 rounded-md ${n.color} flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform`}><Icon size={14} /></div>
      <div className="min-w-0"><p className="text-xs font-bold text-slate-700 truncate">{n.label}</p><p className="text-[9px] text-slate-400 truncate">{n.desc}</p></div>
    </button>
  );
};
