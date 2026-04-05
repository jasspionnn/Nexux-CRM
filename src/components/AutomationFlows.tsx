import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GitBranch, Plus, Play, Pause, Trash2, Edit2, Zap, Clock,
  Mail, Tag, ArrowRight, ChevronRight, Eye, X, Save, Loader2,
  MoveUp, UserPlus, FileText, Globe, AlertCircle, GripVertical
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';

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

interface Automation {
  id: string; name: string; description: string; is_active: number;
  trigger_type: string; trigger_config: any;
  nodes: FlowNode[]; connections: any[]; created_at: string;
}

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
const DELAY_NODE = { type: 'delay' as const, label: 'Esperar', icon: Clock, color: 'bg-slate-500', desc: 'Espera X minutos/horas/dias' };

const ALL_NODES = [...TRIGGERS, ...CONDITIONS, ...ACTIONS, DELAY_NODE];
const findCat = (t: string) => ALL_NODES.find(n => n.type === t) || { type: t, label: t, icon: Zap, color: 'bg-gray-500', desc: '' };

const NODE_W = 260;
const NODE_H = 100;
const LINKER_GAP = 80;

// ==================== MAIN ====================

export const AutomationFlows = () => {
  const { currentUser } = useCRM();
  const [autos, setAutos] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editing, setEditing] = useState<Automation | null>(null);
  const aid = currentUser?.account_id || 'acc_demo';

  useEffect(() => { fetchAutos(); }, []);
  const fetchAutos = async () => {
    setLoading(true);
    try { const r = await fetch(`/api/automations?account_id=${aid}`); if (r.ok) setAutos(await r.json()); } catch (e) { /* */ }
    setLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-full bg-slate-50/50">
      {!showBuilder ? (
        <div className="p-6 lg:p-10"><div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div><h1 className="text-3xl font-black text-slate-900 flex items-center gap-3"><GitBranch className="text-teal-600" size={32} />Automações</h1><p className="text-slate-500 font-medium mt-1">Fluxos visuais para automatizar suas vendas.</p></div>
            <button onClick={() => { setEditing({ id: crypto.randomUUID(), name: '', description: '', is_active: 1, trigger_type: '', trigger_config: {}, nodes: [], connections: [], created_at: new Date().toISOString() }); setShowBuilder(true); }} className="flex items-center gap-2 px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-lg shadow-teal-200"><Plus size={20} />Novo Fluxo</button>
          </div>
          {autos.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-12 text-center"><GitBranch className="mx-auto text-slate-300 mb-4" size={48} /><p className="text-slate-400 font-bold text-lg">Nenhum fluxo criado</p><p className="text-sm text-slate-400 mt-2 mb-6">Crie seu primeiro fluxo de automação.</p><button onClick={() => { setEditing({ id: crypto.randomUUID(), name: '', description: '', is_active: 1, trigger_type: '', trigger_config: {}, nodes: [], connections: [], created_at: new Date().toISOString() }); setShowBuilder(true); }} className="inline-flex items-center gap-2 px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold"><Plus size={20} />Criar Primeiro Fluxo</button></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {autos.map(a => (
                <div key={a.id} className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${a.is_active ? 'bg-teal-50 text-teal-600' : 'bg-slate-100 text-slate-400'}`}><GitBranch size={20} /></div><div><h3 className="font-bold text-slate-900">{a.name}</h3>{a.description && <p className="text-xs text-slate-400 truncate max-w-[180px]">{a.description}</p>}</div></div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${a.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{a.is_active ? 'Ativo' : 'Pausado'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1"><Zap size={12} className="text-yellow-500" /><span>Trigger:</span><span className="capitalize">{a.trigger_type?.replace('_', ' ') || '-'}</span></div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1"><span>{(a.nodes || []).length} nós</span><span>•</span><span>{new Date(a.created_at).toLocaleDateString('pt-BR')}</span></div>
                  </div>
                  <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex gap-1">
                      <button onClick={async () => { await fetch(`/api/automations/${a.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...a, is_active: a.is_active ? 0 : 1 }) }); fetchAutos(); }} className="p-2 text-slate-400 hover:text-teal-600 rounded-lg hover:bg-white">{a.is_active ? <Pause size={16} /> : <Play size={16} />}</button>
                      <button onClick={() => { setEditing(a); setShowBuilder(true); }} className="p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-white"><Edit2 size={16} /></button>
                      <button onClick={async () => { if (confirm('Excluir?')) { await fetch(`/api/automations/${a.id}`, { method: 'DELETE' }); fetchAutos(); } }} className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-white"><Trash2 size={16} /></button>
                    </div>
                    <button onClick={() => { setEditing(a); setShowBuilder(true); }} className="flex items-center gap-1 text-xs font-bold text-teal-600"><Eye size={14} />Abrir<ChevronRight size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div></div>
      ) : (
        <Builder key={editing?.id || 'new'} automation={editing!} onClose={() => { setShowBuilder(false); setEditing(null); }} onRefresh={fetchAutos} accountId={aid} />
      )}
    </div>
  );
};

// ==================== CONFIG PANEL ====================

const FieldLabel: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <div className="space-y-1"><label className="text-[11px] font-bold text-slate-600">{label}</label>{children}{hint && <p className="text-[10px] text-slate-400">{hint}</p>}</div>
);

const ConfigPanel: React.FC<{ node: FlowNode; onConfigChange: (nodeId: string, c: Record<string, any>) => void; stages: any[]; users: any[] }> = React.memo(({ node, onConfigChange, stages, users }) => {
  const ic = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 bg-white";
  const set = (key: string, val: any) => onConfigChange(node.id, { [key]: val });
  const t = node.nodeType;

  return (
    <div className="px-3 pt-3 pb-2 border-t border-slate-100 space-y-2.5">
      {t === 'new_lead' && <p className="text-xs text-slate-500 flex items-center gap-2"><Zap size={14} className="text-emerald-500" />Dispara quando um novo lead é criado.</p>}
      {t === 'stage_change' && (<>
        <FieldLabel label="Origem"><select value={node.config.from_stage_id || ''} onChange={e => set('from_stage_id', e.target.value)} className={ic}><option value="">Qualquer</option>{stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></FieldLabel>
        <div className="flex justify-center text-slate-300"><ArrowRight size={16} className="rotate-90" /></div>
        <FieldLabel label="Destino"><select value={node.config.to_stage_id || ''} onChange={e => set('to_stage_id', e.target.value)} className={ic}><option value="">Qualquer</option>{stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></FieldLabel>
      </>)}
      {t === 'page_visit' && <FieldLabel label="URL contém"><input type="text" value={node.config.url_pattern || ''} onChange={e => set('url_pattern', e.target.value)} placeholder="/precos" className={ic} /></FieldLabel>}
      {(t === 'value_gt' || t === 'value_lt') && <FieldLabel label={t === 'value_gt' ? 'Valor >' : 'Valor <'}><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span><input type="number" value={node.config.value || ''} onChange={e => set('value', +e.target.value || 0)} placeholder="0" className={`${ic} pl-9`} /></div></FieldLabel>}
      {(t === 'has_tag' || t === 'not_has_tag') && <FieldLabel label="Tag"><input type="text" value={node.config.tag || ''} onChange={e => set('tag', e.target.value)} placeholder="enterprise" className={ic} /></FieldLabel>}
      {t === 'stage_is' && <FieldLabel label="Estágio"><select value={node.config.stage_id || ''} onChange={e => set('stage_id', e.target.value)} className={ic}><option value="">Selecione</option>{stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></FieldLabel>}
      {t === 'email_contains' && <FieldLabel label="Email contém"><input type="text" value={node.config.text || ''} onChange={e => set('text', e.target.value)} placeholder="@empresa.com" className={ic} /></FieldLabel>}
      {t === 'probability_gt' && <FieldLabel label="Probabilidade &gt;"><div className="relative"><input type="number" value={node.config.probability || ''} onChange={e => set('probability', +e.target.value || 0)} placeholder="50" min={0} max={100} className={`${ic} pr-8`} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span></div></FieldLabel>}
      {t === 'move_stage' && <FieldLabel label="Mover para"><select value={node.config.to_stage_id || ''} onChange={e => set('to_stage_id', e.target.value)} className={ic}><option value="">Selecione</option>{stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></FieldLabel>}
      {t === 'create_task' && (<>
        <FieldLabel label="Título"><input type="text" value={node.config.title || ''} onChange={e => set('title', e.target.value)} placeholder="Ligar para lead" className={ic} /></FieldLabel>
        <FieldLabel label="Data limite"><input type="date" value={node.config.due_date || ''} onChange={e => set('due_date', e.target.value)} className={ic} /></FieldLabel>
        <FieldLabel label="Atribuir a"><select value={node.config.assigned_user_id || ''} onChange={e => set('assigned_user_id', e.target.value)} className={ic}><option value="">Selecione</option>{users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></FieldLabel>
      </>)}
      {(t === 'add_tag' || t === 'remove_tag') && <FieldLabel label="Tag"><input type="text" value={node.config.tag || ''} onChange={e => set('tag', e.target.value)} placeholder="cliente" className={ic} /></FieldLabel>}
      {t === 'send_email' && (<>
        <FieldLabel label="Assunto"><input type="text" value={node.config.subject || ''} onChange={e => set('subject', e.target.value)} placeholder="Bem-vindo!" className={ic} /></FieldLabel>
        <FieldLabel label="Corpo"><textarea value={node.config.body || ''} onChange={e => set('body', e.target.value)} placeholder="Olá {{lead_name}}," rows={3} className={`${ic} resize-none font-mono text-xs`} /></FieldLabel>
      </>)}
      {t === 'send_webhook' && (<>
        <FieldLabel label="URL"><input type="url" value={node.config.url || ''} onChange={e => set('url', e.target.value)} placeholder="https://api.exemplo.com" className={ic} /></FieldLabel>
        <FieldLabel label="Método"><select value={node.config.method || 'POST'} onChange={e => set('method', e.target.value)} className={ic}><option>POST</option><option>GET</option><option>PUT</option><option>DELETE</option></select></FieldLabel>
      </>)}
      {t === 'create_note' && <FieldLabel label="Nota"><textarea value={node.config.content || ''} onChange={e => set('content', e.target.value)} placeholder="Lead qualificado..." rows={2} className={`${ic} resize-none`} /></FieldLabel>}
      {t === 'assign_user' && <FieldLabel label="Usuário"><select value={node.config.user_id || ''} onChange={e => set('user_id', e.target.value)} className={ic}><option value="">Selecione</option>{users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></FieldLabel>}
      {t === 'delay' && (
        <div className="flex items-end gap-2">
          <div className="flex-1"><FieldLabel label="Duração"><input type="number" value={node.config.duration || ''} onChange={e => set('duration', +e.target.value || 0)} placeholder="30" min={1} className={ic} /></FieldLabel></div>
          <select value={node.config.unit || 'minutes'} onChange={e => set('unit', e.target.value)} className={`${ic} flex-1 mt-4`}><option value="minutes">Minutos</option><option value="hours">Horas</option><option value="days">Dias</option></select>
        </div>
      )}
    </div>
  );
}, (prev, next) => prev.node === next.node && prev.onConfigChange === next.onConfigChange);

// ==================== BUILDER ====================

const Builder: React.FC<{ automation: Automation; onClose: () => void; onRefresh: () => void; accountId: string }> = ({ automation, onClose, onRefresh, accountId }) => {
  const [name, setName] = useState(automation.name || '');
  const [description, setDescription] = useState(automation.description || '');
  const [nodes, setNodes] = useState<FlowNode[]>(automation.nodes || []);
  const [selId, setSelId] = useState<number | null>(null);
  const [addMenuIdx, setAddMenuIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [stages, setStages] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [autos, setAutos] = useState<Automation[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ idx: number; sx: number; sy: number; ox: number; oy: number } | null>(null);
  const panRef = useRef<{ active: boolean; sx: number; sy: number; sl: number; st: number } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [f, u, a] = await Promise.all([fetch('/api/funnels'), fetch(`/api/users?account_id=${accountId}`), fetch(`/api/automations?account_id=${accountId}`)]);
        if (f.ok) { const d = await f.json(); setStages(d.flatMap((x: any) => x.stages || [])); }
        if (u.ok) setUsers(await u.json());
        if (a.ok) setAutos(await a.json());
      } catch (e) { /* */ }
    })();
  }, [accountId]);

  // Pan + drag
  const onCanvasDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-node]') || (e.target as HTMLElement).closest('[data-ui]')) return;
    if (!canvasRef.current) return;
    panRef.current = { active: true, sx: e.clientX, sy: e.clientY, sl: canvasRef.current.scrollLeft, st: canvasRef.current.scrollTop };
    canvasRef.current.style.cursor = 'grabbing';
  }, []);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (panRef.current?.active && canvasRef.current) {
        canvasRef.current.scrollLeft = panRef.current.sl - (e.clientX - panRef.current.sx);
        canvasRef.current.scrollTop = panRef.current.st - (e.clientY - panRef.current.sy);
      }
      if (dragRef.current) {
        const d = dragRef.current;
        setNodes(ns => ns.map((n, i) => i === d.idx ? { ...n, x: Math.max(0, d.ox + e.clientX - d.sx), y: Math.max(0, d.oy + e.clientY - d.sy) } : n));
      }
    };
    const up = () => { panRef.current = null; dragRef.current = null; if (canvasRef.current) canvasRef.current.style.cursor = ''; };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, []);

  useEffect(() => {
    if (nodes.length > 0 && canvasRef.current) {
      canvasRef.current.scrollTo({ left: Math.max(0, nodes[0].x - 80), top: Math.max(0, nodes[0].y - 40), behavior: 'instant' as any });
    }
  }, [nodes.length]);

  const addNode = useCallback((cat: any, type: NodeType) => {
    const last = nodes.length > 0 ? nodes[nodes.length - 1] : null;
    const nn: FlowNode = { id: crypto.randomUUID(), type, nodeType: cat.type, label: cat.label, config: {}, x: last ? last.x + NODE_W + LINKER_GAP : 80, y: last ? last.y : 80 };
    setNodes(prev => [...prev, nn]);
    setAddMenuIdx(null);
  }, [nodes]);

  const insertNode = useCallback((afterIdx: number, cat: any, type: NodeType) => {
    const after = nodes[afterIdx];
    if (!after) return;
    const nn: FlowNode = { id: crypto.randomUUID(), type, nodeType: cat.type, label: cat.label, config: {}, x: after.x + NODE_W + LINKER_GAP, y: after.y };
    setNodes(prev => {
      const shifted = prev.map((n, i) => i > afterIdx ? { ...n, x: n.x + NODE_W + LINKER_GAP } : n);
      const result = [...shifted];
      result.splice(afterIdx + 1, 0, nn);
      return result;
    });
    setAddMenuIdx(null);
  }, [nodes]);

  const onConfigChange = useCallback((nodeId: string, c: Record<string, any>) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, config: { ...n.config, ...c } } : n));
  }, []);

  const removeNode = useCallback((idx: number) => {
    setNodes(prev => prev.filter((_, i) => i !== idx));
    setSelId(null);
    setAddMenuIdx(null);
  }, []);

  const doSave = async () => {
    if (!name.trim()) { alert('Dê um nome ao fluxo'); return; }
    setSaving(true);
    try {
      const exists = autos.find(a => a.id === automation.id);
      const res = await fetch(exists ? `/api/automations/${automation.id}` : '/api/automations', {
        method: exists ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: automation.id, name, description, is_active: 1, trigger_type: nodes.find(n => n.type === 'trigger')?.nodeType || '', trigger_config: nodes.find(n => n.type === 'trigger')?.config || {}, nodes, connections: nodes.map((n, i) => i > 0 ? { from: nodes[i-1].id, to: n.id } : null).filter(Boolean), created_at: automation.created_at || '', account_id: accountId })
      });
      if (!res.ok) { const err = await res.json(); alert('Erro: ' + (err.error || 'Erro desconhecido')); return; }
      onClose(); onRefresh();
    } catch (e) { console.error(e); alert('Erro ao salvar'); }
    setSaving(false);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0" style={{ zIndex: 50 }}>
        <div className="flex items-center gap-3 flex-1">
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
          <div className="flex-1"><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nome do fluxo..." className="text-lg font-bold text-slate-900 border-none focus:outline-none bg-transparent w-full" /><input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição..." className="text-xs text-slate-500 border-none focus:outline-none bg-transparent w-full" /></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setAddMenuIdx(addMenuIdx !== null ? null : (nodes.length > 0 ? nodes.length - 1 : -1))} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-sm">
              <Plus size={15} />Adicionar bloco
            </button>
            {/* Empty state trigger menu */}
            {addMenuIdx === -1 && (
              <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 p-3 z-50" style={{ width: 280 }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase">Escolha um gatilho</span>
                  <button onClick={() => setAddMenuIdx(null)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
                </div>
                <div className="space-y-1">{TRIGGERS.map(n => { const Icon = n.icon; return (
                  <button key={n.type} onClick={() => addNode(n, 'trigger')} className="w-full flex items-center gap-2 px-2 py-2 rounded-lg border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all text-left">
                    <div className={`w-6 h-6 rounded ${n.color} flex items-center justify-center text-white shrink-0`}><Icon size={12} /></div>
                    <span className="text-xs font-bold text-slate-700 truncate">{n.label}</span>
                  </button>
                );})}</div>
              </div>
            )}
          </div>
          <button onClick={doSave} disabled={saving || !nodes.length} className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-sm disabled:opacity-50">{saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}Salvar</button>
        </div>
      </div>

      {/* Canvas */}
      <div ref={canvasRef} className="flex-1 overflow-auto relative" onMouseDown={onCanvasDown}>
        <div style={{ width: 6000, height: 4000, position: 'relative' }}>
          {/* Grid */}
          <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px]" />

          {/* Empty state */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center" data-ui>
              <div className="text-center">
                <GitBranch className="mx-auto text-slate-300 mb-4" size={48} />
                <p className="text-slate-400 font-bold text-lg">Fluxo vazio</p>
                <p className="text-sm text-slate-400 mt-2 mb-6">Escolha um gatilho para começar.</p>
                <div className="flex flex-wrap justify-center gap-3 max-w-2xl">
                  {TRIGGERS.map(n => { const Icon = n.icon; return (
                    <button key={n.type} onClick={() => addNode(n, 'trigger')} className="flex items-center gap-3 px-5 py-3.5 bg-white border-2 border-slate-200 rounded-xl hover:border-emerald-400 hover:shadow-lg transition-all">
                      <div className={`w-9 h-9 rounded-lg ${n.color} flex items-center justify-center text-white`}><Icon size={18} /></div>
                      <div className="text-left"><p className="text-sm font-bold text-slate-700">{n.label}</p><p className="text-[10px] text-slate-400">{n.desc}</p></div>
                    </button>
                  );})}
                </div>
              </div>
            </div>
          )}

          {/* Connection lines (SVG) */}
          <svg className="absolute" width={6000} height={4000} style={{ pointerEvents: 'none', zIndex: 5 }}>
            {nodes.map((node, idx) => {
              if (idx === 0) return null;
              const prev = nodes[idx - 1];
              const x1 = prev.x + NODE_W;
              const y1 = prev.y + NODE_H / 2;
              const x2 = node.x;
              const y2 = node.y + NODE_H / 2;
              const dx = (x2 - x1) * 0.4;
              return (
                <g key={`conn-${idx}`}>
                  <path d={`M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`} fill="none" stroke="#cbd5e1" strokeWidth={3} />
                  <circle cx={x2} cy={y2} r={4} fill="#cbd5e1" />
                </g>
              );
            })}
          </svg>

          {/* Nodes + linkers */}
          {nodes.map((node, idx) => {
            const cat = findCat(node.nodeType);
            const Icon = cat.icon;
            const isSel = selId === idx;
            const isLast = idx === nodes.length - 1;

            return (
              <React.Fragment key={node.id}>
                {/* Node card */}
                <div className="absolute select-none" style={{ left: node.x, top: node.y, width: NODE_W, zIndex: isSel ? 30 : 10 }} data-node>
                  <div className={`bg-white border-2 rounded-xl shadow-md overflow-hidden transition-all ${isSel ? 'border-teal-500 shadow-lg ring-1 ring-teal-200' : 'border-slate-200'}`}>
                    <div className="flex items-center gap-2.5 px-3" style={{ height: 52 }} onMouseDown={e => { e.preventDefault(); e.stopPropagation(); dragRef.current = { idx, sx: e.clientX, sy: e.clientY, ox: node.x, oy: node.y }; }} onClick={() => { setSelId(isSel ? null : idx); setAddMenuIdx(null); }}>
                      <GripVertical size={16} className="text-slate-300 shrink-0" />
                      <div className={`w-8 h-8 rounded-lg ${cat.color} flex items-center justify-center text-white shrink-0 shadow-sm`}><Icon size={16} /></div>
                      <div className="flex-1 min-w-0"><p className="text-sm font-bold text-slate-900 truncate">{node.label}</p><p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{node.type}</p></div>
                      <button onClick={e => { e.stopPropagation(); removeNode(idx); }} className="p-1 text-slate-300 hover:text-red-500 rounded shrink-0"><X size={14} /></button>
                    </div>
                    {isSel && <ConfigPanel node={node} onConfigChange={onConfigChange} stages={stages} users={users} />}
                    <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between" style={{ height: 38 }}>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{idx === 0 ? '🚀 Gatilho' : node.type === 'condition' ? '🔍 Condição' : node.type === 'delay' ? '⏱ Tempo' : '⚡ Ação'}</span>
                    </div>
                  </div>
                </div>

                {/* Linker "+" after last node */}
                {isLast && (
                  <div className="absolute flex items-center justify-center" style={{ left: node.x + NODE_W, top: node.y + NODE_H / 2 - 16, width: LINKER_GAP, height: 32 }} data-ui>
                    <div className="w-8 h-8 bg-teal-600 hover:bg-teal-700 rounded-full flex items-center justify-center text-white cursor-pointer shadow-lg hover:scale-110 transition-all" onClick={() => setAddMenuIdx(addMenuIdx === idx ? null : idx)}>
                      <Plus size={18} />
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}

          {/* Add menu popup (for existing nodes) */}
          {addMenuIdx !== null && addMenuIdx >= 0 && nodes[addMenuIdx] && (() => {
            const node = nodes[addMenuIdx];
            return (
              <div className="absolute bg-white rounded-xl shadow-2xl border border-slate-200 p-3 z-50" style={{ left: node.x + NODE_W + LINKER_GAP + 10, top: node.y - 10, width: 280 }} data-ui>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase">Adicionar próximo bloco</span>
                  <button onClick={() => setAddMenuIdx(null)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Condições</p>
                <div className="space-y-1 mb-3">{CONDITIONS.map(n => { const Icon = n.icon; return (
                  <button key={n.type} onClick={() => insertNode(addMenuIdx, n, 'condition')} className="w-full flex items-center gap-2 px-2 py-2 rounded-lg border border-slate-200 hover:border-amber-400 hover:bg-amber-50 transition-all text-left">
                    <div className={`w-6 h-6 rounded ${n.color} flex items-center justify-center text-white shrink-0`}><Icon size={12} /></div>
                    <span className="text-xs font-bold text-slate-700 truncate">{n.label}</span>
                  </button>
                );})}</div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ações</p>
                <div className="space-y-1 mb-3">{ACTIONS.map(n => { const Icon = n.icon; return (
                  <button key={n.type} onClick={() => insertNode(addMenuIdx, n, 'action')} className="w-full flex items-center gap-2 px-2 py-2 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-left">
                    <div className={`w-6 h-6 rounded ${n.color} flex items-center justify-center text-white shrink-0`}><Icon size={12} /></div>
                    <span className="text-xs font-bold text-slate-700 truncate">{n.label}</span>
                  </button>
                );})}</div>
                <button onClick={() => insertNode(addMenuIdx, DELAY_NODE, 'delay')} className="w-full flex items-center gap-2 px-2 py-2 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all text-left">
                  <div className={`w-6 h-6 rounded ${DELAY_NODE.color} flex items-center justify-center text-white shrink-0`}><DELAY_NODE.icon size={12} /></div>
                  <span className="text-xs font-bold text-slate-700 truncate">{DELAY_NODE.label}</span>
                </button>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
