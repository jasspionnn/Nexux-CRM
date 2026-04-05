import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GitBranch, Plus, Play, Pause, Trash2, Edit2, Zap, Clock,
  Mail, Tag, ArrowRight, ChevronRight, Eye, X, Save, Loader2,
  MoveUp, MessageSquare, UserPlus, FileText, Globe, AlertCircle, GripVertical
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
  position: { x: number; y: number };
}

interface FlowConnection {
  id: string;
  from: string;
  to: string;
  label?: string;
}

interface Automation {
  id: string;
  name: string;
  description: string;
  is_active: number;
  trigger_type: string;
  trigger_config: any;
  nodes: FlowNode[];
  connections: FlowConnection[];
  created_at: string;
}

// ==================== NODE CATALOG ====================

const TRIGGER_NODES = [
  { type: 'new_lead' as TriggerType, label: 'Novo Lead Criado', icon: UserPlus, color: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', description: 'Quando um novo lead é criado' },
  { type: 'stage_change' as TriggerType, label: 'Mudou de Estágio', icon: ArrowRight, color: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', description: 'Quando lead muda de estágio' },
  { type: 'form_submit' as TriggerType, label: 'Formulário Preenchido', icon: FileText, color: 'bg-orange-500', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', description: 'Quando lead preenche formulário' },
  { type: 'page_visit' as TriggerType, label: 'Visitou Página', icon: Globe, color: 'bg-purple-500', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', description: 'Quando lead visita uma URL' },
  { type: 'conversion' as TriggerType, label: 'Conversão', icon: Zap, color: 'bg-yellow-500', bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', description: 'Quando lead converte' },
  { type: 'webhook' as TriggerType, label: 'Webhook Recebido', icon: Globe, color: 'bg-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', description: 'Quando recebe webhook' },
];

const CONDITION_NODES = [
  { type: 'value_gt' as ConditionType, label: 'Valor Maior Que', icon: MoveUp, color: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', description: 'Valor do lead > X' },
  { type: 'value_lt' as ConditionType, label: 'Valor Menor Que', icon: MoveUp, color: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', description: 'Valor do lead < X' },
  { type: 'has_tag' as ConditionType, label: 'Tem Tag', icon: Tag, color: 'bg-pink-500', bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', description: 'Lead possui tag X' },
  { type: 'not_has_tag' as ConditionType, label: 'Não Tem Tag', icon: Tag, color: 'bg-pink-500', bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', description: 'Lead não possui tag X' },
  { type: 'stage_is' as ConditionType, label: 'Estágio É', icon: ArrowRight, color: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', description: 'Lead está no estágio X' },
  { type: 'email_contains' as ConditionType, label: 'Email Contém', icon: Mail, color: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', description: 'Email contém texto X' },
  { type: 'probability_gt' as ConditionType, label: 'Probabilidade >', icon: MoveUp, color: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', description: 'Probabilidade > X%' },
];

const ACTION_NODES = [
  { type: 'move_stage' as ActionType, label: 'Mover Estágio', icon: ArrowRight, color: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', description: 'Move lead para outro estágio' },
  { type: 'create_task' as ActionType, label: 'Criar Tarefa', icon: AlertCircle, color: 'bg-orange-500', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', description: 'Cria tarefa para usuário' },
  { type: 'add_tag' as ActionType, label: 'Adicionar Tag', icon: Tag, color: 'bg-pink-500', bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', description: 'Adiciona tag ao lead' },
  { type: 'remove_tag' as ActionType, label: 'Remover Tag', icon: Tag, color: 'bg-pink-500', bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', description: 'Remove tag do lead' },
  { type: 'send_email' as ActionType, label: 'Enviar Email', icon: Mail, color: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', description: 'Envia email para lead' },
  { type: 'send_webhook' as ActionType, label: 'Enviar Webhook', icon: Globe, color: 'bg-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', description: 'Envia payload via webhook' },
  { type: 'create_note' as ActionType, label: 'Criar Nota', icon: FileText, color: 'bg-gray-500', bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', description: 'Adiciona nota ao lead' },
  { type: 'assign_user' as ActionType, label: 'Atribuir Usuário', icon: UserPlus, color: 'bg-teal-500', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', description: 'Atribui lead a usuário' },
];

const DELAY_NODE = { type: 'delay' as const, label: 'Esperar / Delay', icon: Clock, color: 'bg-slate-500', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', description: 'Espera X minutos/horas/dias' };

const ALL_NODE_CATALOG = [...TRIGGER_NODES, ...CONDITION_NODES, ...ACTION_NODES, DELAY_NODE];

function getNodeCatalog(type: string) {
  return ALL_NODE_CATALOG.find(n => n.type === type) || { type, label: type, icon: Zap, color: 'bg-gray-500', bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', description: '' };
}

// ==================== MAIN COMPONENT ====================

export const AutomationFlows = () => {
  const { currentUser } = useCRM();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);

  const accountId = currentUser?.account_id || 'acc_demo';

  useEffect(() => { fetchAutomations(); }, []);

  const fetchAutomations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/automations?account_id=${accountId}`);
      if (res.ok) setAutomations(await res.json());
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  const handleCreateFlow = () => {
    setEditingAutomation({ id: crypto.randomUUID(), name: '', description: '', is_active: 1, trigger_type: '', trigger_config: {}, nodes: [], connections: [], created_at: new Date().toISOString() });
    setShowBuilder(true);
  };

  const handleSaveFlow = async (data: any) => {
    try {
      const exists = automations.find(a => a.id === data.id);
      const res = await fetch(exists ? `/api/automations/${data.id}` : '/api/automations', {
        method: exists ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, account_id: accountId })
      });
      if (res.ok) { setShowBuilder(false); setEditingAutomation(null); fetchAutomations(); }
    } catch (e) { console.error(e); }
  };

  const handleDeleteFlow = async (id: string) => {
    if (!confirm('Excluir este fluxo?')) return;
    await fetch(`/api/automations/${id}`, { method: 'DELETE' });
    fetchAutomations();
  };

  const handleToggleActive = async (a: Automation) => {
    await fetch(`/api/automations/${a.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...a, is_active: a.is_active ? 0 : 1 }) });
    fetchAutomations();
  };

  if (isLoading) return <div className="flex items-center justify-center h-full"><div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-full bg-slate-50/50">
      {!showBuilder ? (
        <div className="p-6 lg:p-10">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3"><GitBranch className="text-teal-600" size={32} />Automações</h1>
                <p className="text-slate-500 font-medium mt-1">Crie fluxos de automação visuais para automatizar suas vendas.</p>
              </div>
              <button onClick={handleCreateFlow} className="flex items-center gap-2 px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-teal-200"><Plus size={20} />Novo Fluxo</button>
            </div>
            {automations.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-12 text-center">
                <GitBranch className="mx-auto text-slate-300 mb-4" size={48} />
                <p className="text-slate-400 font-bold text-lg">Nenhum fluxo criado</p>
                <p className="text-sm text-slate-400 mt-2 mb-6">Crie seu primeiro fluxo para automatizar ações baseado em eventos.</p>
                <button onClick={handleCreateFlow} className="inline-flex items-center gap-2 px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold"><Plus size={20} />Criar Primeiro Fluxo</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {automations.map(a => (
                  <div key={a.id} className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${a.is_active ? 'bg-teal-50 text-teal-600' : 'bg-slate-100 text-slate-400'}`}><GitBranch size={20} /></div>
                          <div><h3 className="font-bold text-slate-900">{a.name}</h3>{a.description && <p className="text-xs text-slate-400 truncate max-w-[180px]">{a.description}</p>}</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${a.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{a.is_active ? 'Ativo' : 'Pausado'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-4"><Zap size={12} className="text-yellow-500" /><span className="font-medium">Trigger:</span><span className="capitalize">{a.trigger_type?.replace('_', ' ') || '-'}</span></div>
                      <div className="flex items-center gap-2 text-xs text-slate-400"><span>{(a.nodes || []).length} nós</span><span>•</span><span>{new Date(a.created_at).toLocaleDateString('pt-BR')}</span></div>
                    </div>
                    <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleToggleActive(a)} className="p-2 text-slate-400 hover:text-teal-600 rounded-lg hover:bg-white">{a.is_active ? <Pause size={16} /> : <Play size={16} />}</button>
                        <button onClick={() => { setEditingAutomation(a); setShowBuilder(true); }} className="p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-white"><Edit2 size={16} /></button>
                        <button onClick={() => handleDeleteFlow(a.id)} className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-white"><Trash2 size={16} /></button>
                      </div>
                      <button onClick={() => { setEditingAutomation(a); setShowBuilder(true); }} className="flex items-center gap-1.5 text-xs font-bold text-teal-600"><Eye size={14} />Abrir<ChevronRight size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <AutomationBuilder automation={editingAutomation!} onSave={handleSaveFlow} onCancel={() => { setShowBuilder(false); setEditingAutomation(null); }} accountId={accountId} />
      )}
    </div>
  );
};

// ==================== BUILDER COMPONENT ====================

const AutomationBuilder: React.FC<{ automation: Automation; onSave: (d: any) => void; onCancel: () => void; accountId: string }> = ({ automation, onSave, onCancel, accountId }) => {
  const [name, setName] = useState(automation.name || '');
  const [description, setDescription] = useState(automation.description || '');
  const [nodes, setNodes] = useState<FlowNode[]>(automation.nodes || []);
  const [connections, setConnections] = useState<FlowConnection[]>(automation.connections || []);
  const [showCatalog, setShowCatalog] = useState(nodes.length === 0);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [stages, setStages] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const dragState = useRef<{ nodeId: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [f, u] = await Promise.all([fetch('/api/funnels'), fetch(`/api/users?account_id=${accountId}`)]);
        if (f.ok) { const d = await f.json(); setStages(d.flatMap((x: any) => x.stages || [])); }
        if (u.ok) setUsers(await u.json());
      } catch (e) { console.error(e); }
    })();
  }, [accountId]);

  // Mouse tracking for connection preview
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (connectingFrom && containerRef.current) {
        const r = containerRef.current;
        setMousePos({ x: e.clientX - r.getBoundingClientRect().left + r.scrollLeft, y: e.clientY - r.getBoundingClientRect().top + r.scrollTop });
      }
    };
    window.addEventListener('mousemove', h);
    return () => window.removeEventListener('mousemove', h);
  }, [connectingFrom]);

  // Drag handlers
  const handleDragStart = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    dragState.current = { nodeId, startX: e.clientX, startY: e.clientY, origX: node.position.x, origY: node.position.y };

    const onMove = (ev: MouseEvent) => {
      if (!dragState.current) return;
      const dx = ev.clientX - dragState.current.startX;
      const dy = ev.clientY - dragState.current.startY;
      setNodes(ns => ns.map(n => n.id === dragState.current!.nodeId ? { ...n, position: { x: dragState.current!.origX + dx, y: dragState.current!.origY + dy } } : n));
    };
    const onUp = () => { dragState.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [nodes]);

  const addNode = (nodeType: any, category: NodeType) => {
    const newNode: FlowNode = {
      id: crypto.randomUUID(), type: category, nodeType: nodeType.type, label: nodeType.label, config: {},
      position: { x: 100 + Math.random() * 100, y: nodes.length * 200 + 60 }
    };
    const newNodes = [...nodes, newNode];
    let nc = [...connections];
    if (nodes.length > 0) nc.push({ id: crypto.randomUUID(), from: nodes[nodes.length - 1].id, to: newNode.id });
    setNodes(newNodes);
    setConnections(nc);
    setShowCatalog(false);
  };

  const updateConfig = (nid: string, cfg: Record<string, any>) => setNodes(ns => ns.map(n => n.id === nid ? { ...n, config: { ...n.config, ...cfg } } : n));
  const removeNode = (nid: string) => { setNodes(ns => ns.filter(n => n.id !== nid)); setConnections(cs => cs.filter(c => c.from !== nid && c.to !== nid)); setSelectedNode(null); };
  const removeConnection = (cid: string) => setConnections(cs => cs.filter(c => c.id !== cid));

  const getPortPos = (nid: string, side: 'right' | 'left') => {
    const el = nodeRefs.current.get(nid);
    if (!el || !containerRef.current) return { x: 200, y: 50 };
    const cr = containerRef.current.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    return { x: (side === 'right' ? er.right : er.left) - cr.left + containerRef.current.scrollLeft, y: er.top - cr.top + er.height / 2 + containerRef.current.scrollTop };
  };

  const connPath = (fid: string, tid: string) => {
    const a = getPortPos(fid, 'right'), b = getPortPos(tid, 'left');
    const dx = Math.max(Math.abs(b.x - a.x) * 0.5, 60);
    return `M${a.x},${a.y} C${a.x + dx},${a.y} ${b.x - dx},${b.y} ${b.x},${b.y}`;
  };

  const handleSave = async () => {
    if (!name.trim()) { alert('Dê um nome ao fluxo'); return; }
    setIsSaving(true);
    await onSave({ id: automation.id, name, description, is_active: 1, trigger_type: nodes.find(n => n.type === 'trigger')?.nodeType || '', trigger_config: nodes.find(n => n.type === 'trigger')?.config || {}, nodes, connections, created_at: automation.created_at });
    setIsSaving(false);
  };

  // ==================== FORM RENDERERS ====================

  const FormField: React.FC<{ label: string; children: React.ReactNode; hint?: string }> = ({ label, children, hint }) => (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-600">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-slate-400">{hint}</p>}
    </div>
  );

  const inputCls = "w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-colors bg-white";
  const selectCls = inputCls;

  const renderConfig = (node: FlowNode) => {
    const t = node.nodeType;
    return (
      <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
        {t === 'new_lead' && <div className="flex items-center gap-2 text-xs text-slate-500"><Zap size={14} className="text-green-500" />Dispara quando um novo lead é criado no CRM.</div>}

        {t === 'stage_change' && (
          <div className="space-y-3">
            <FormField label="Estágio de origem" hint="Deixe vazio para qualquer origem"><select value={node.config.from_stage_id || ''} onChange={e => updateConfig(node.id, { from_stage_id: e.target.value })} className={selectCls}><option value="">Qualquer estágio</option>{stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></FormField>
            <div className="flex items-center justify-center text-slate-300"><ArrowRight size={20} /></div>
            <FormField label="Estágio de destino" hint="Deixe vazio para qualquer destino"><select value={node.config.to_stage_id || ''} onChange={e => updateConfig(node.id, { to_stage_id: e.target.value })} className={selectCls}><option value="">Qualquer estágio</option>{stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></FormField>
          </div>
        )}

        {t === 'form_submit' && <FormField label="ID do formulário" hint="Deixe vazio para qualquer formulário"><input type="text" value={node.config.form_id || ''} onChange={e => updateConfig(node.id, { form_id: e.target.value })} placeholder="Qualquer formulário" className={inputCls} /></FormField>}

        {t === 'page_visit' && <FormField label="URL" hint="A URL deve conter este texto"><input type="text" value={node.config.url_pattern || ''} onChange={e => updateConfig(node.id, { url_pattern: e.target.value })} placeholder="ex: /precos, /contato" className={inputCls} /></FormField>}

        {t === 'conversion' && <div className="flex items-center gap-2 text-xs text-slate-500"><Zap size={14} className="text-yellow-500" />Dispara quando um evento de conversão é registrado.</div>}

        {t === 'webhook' && <FormField label="Nome do webhook" hint="Identificador opcional"><input type="text" value={node.config.webhook_name || ''} onChange={e => updateConfig(node.id, { webhook_name: e.target.value })} placeholder="ex: pagamento_confirmado" className={inputCls} /></FormField>}

        {t === 'value_gt' && <FormField label="Valor mínimo" hint="Valor do lead deve ser maior que"><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span><input type="number" value={node.config.value || ''} onChange={e => updateConfig(node.id, { value: parseFloat(e.target.value) || 0 })} placeholder="0.00" className={`${inputCls} pl-9`} /></div></FormField>}

        {t === 'value_lt' && <FormField label="Valor máximo" hint="Valor do lead deve ser menor que"><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span><input type="number" value={node.config.value || ''} onChange={e => updateConfig(node.id, { value: parseFloat(e.target.value) || 0 })} placeholder="0.00" className={`${inputCls} pl-9`} /></div></FormField>}

        {(t === 'has_tag' || t === 'not_has_tag') && <FormField label="Tag"><input type="text" value={node.config.tag || ''} onChange={e => updateConfig(node.id, { tag: e.target.value })} placeholder="ex: enterprise, quente" className={inputCls} /></FormField>}

        {t === 'stage_is' && <FormField label="Estágio"><select value={node.config.stage_id || ''} onChange={e => updateConfig(node.id, { stage_id: e.target.value })} className={selectCls}><option value="">Selecione...</option>{stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></FormField>}

        {t === 'email_contains' && <FormField label="Texto no email"><input type="text" value={node.config.text || ''} onChange={e => updateConfig(node.id, { text: e.target.value })} placeholder="ex: @empresa.com" className={inputCls} /></FormField>}

        {t === 'probability_gt' && <FormField label="Probabilidade mínima"><div className="relative"><input type="number" value={node.config.probability || ''} onChange={e => updateConfig(node.id, { probability: parseInt(e.target.value) || 0 })} placeholder="0" min={0} max={100} className={`${inputCls} pr-8`} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span></div></FormField>}

        {t === 'move_stage' && <FormField label="Mover para"><select value={node.config.to_stage_id || ''} onChange={e => updateConfig(node.id, { to_stage_id: e.target.value })} className={selectCls}><option value="">Selecione o estágio...</option>{stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></FormField>}

        {t === 'create_task' && (
          <div className="space-y-3">
            <FormField label="Título da tarefa"><input type="text" value={node.config.title || ''} onChange={e => updateConfig(node.id, { title: e.target.value })} placeholder="ex: Ligar para o lead" className={inputCls} /></FormField>
            <FormField label="Data limite"><input type="date" value={node.config.due_date || ''} onChange={e => updateConfig(node.id, { due_date: e.target.value })} className={inputCls} /></FormField>
            <FormField label="Atribuir a"><select value={node.config.assigned_user_id || ''} onChange={e => updateConfig(node.id, { assigned_user_id: e.target.value })} className={selectCls}><option value="">Selecione...</option>{users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></FormField>
          </div>
        )}

        {(t === 'add_tag' || t === 'remove_tag') && <FormField label={t === 'add_tag' ? 'Tag para adicionar' : 'Tag para remover'}><input type="text" value={node.config.tag || ''} onChange={e => updateConfig(node.id, { tag: e.target.value })} placeholder="ex: cliente" className={inputCls} /></FormField>}

        {t === 'send_email' && (
          <div className="space-y-3">
            <FormField label="Assunto"><input type="text" value={node.config.subject || ''} onChange={e => updateConfig(node.id, { subject: e.target.value })} placeholder="Assunto do email" className={inputCls} /></FormField>
            <FormField label="Corpo do email"><textarea value={node.config.body || ''} onChange={e => updateConfig(node.id, { body: e.target.value })} placeholder="Olá {{lead_name}}, ..." rows={4} className={`${inputCls} resize-none font-mono text-xs`} /></FormField>
          </div>
        )}

        {t === 'send_webhook' && (
          <div className="space-y-3">
            <FormField label="URL"><input type="url" value={node.config.url || ''} onChange={e => updateConfig(node.id, { url: e.target.value })} placeholder="https://api.exemplo.com/webhook" className={inputCls} /></FormField>
            <FormField label="Método"><select value={node.config.method || 'POST'} onChange={e => updateConfig(node.id, { method: e.target.value })} className={selectCls}><option value="POST">POST</option><option value="GET">GET</option><option value="PUT">PUT</option><option value="DELETE">DELETE</option></select></FormField>
          </div>
        )}

        {t === 'create_note' && <FormField label="Conteúdo da nota"><textarea value={node.config.content || ''} onChange={e => updateConfig(node.id, { content: e.target.value })} placeholder="Lead qualificado automaticamente..." rows={3} className={`${inputCls} resize-none`} /></FormField>}

        {t === 'assign_user' && <FormField label="Usuário"><select value={node.config.user_id || ''} onChange={e => updateConfig(node.id, { user_id: e.target.value })} className={selectCls}><option value="">Selecione...</option>{users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></FormField>}

        {t === 'delay' && (
          <div className="flex items-end gap-3">
            <FormField label="Duração"><input type="number" value={node.config.duration || ''} onChange={e => updateConfig(node.id, { duration: parseInt(e.target.value) || 0 })} placeholder="0" min={1} className={inputCls} /></FormField>
            <div className="flex-1"><select value={node.config.unit || 'minutes'} onChange={e => updateConfig(node.id, { unit: e.target.value })} className={selectCls}><option value="minutes">Minutos</option><option value="hours">Horas</option><option value="days">Dias</option></select></div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-4 flex-1">
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
          <div className="flex-1">
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nome do fluxo..." className="text-lg font-bold text-slate-900 border-none focus:outline-none bg-transparent w-full" />
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição (opcional)" className="text-sm text-slate-500 border-none focus:outline-none bg-transparent w-full" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowCatalog(!showCatalog)} className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-colors"><Plus size={16} />Adicionar Bloco</button>
          <button onClick={handleSave} disabled={isSaving || nodes.length === 0} className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50">{isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}Salvar</button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Catalog */}
        {showCatalog && (
          <aside className="w-72 bg-white border-r border-slate-200 overflow-y-auto shrink-0 z-20">
            <div className="p-4">
              <h3 className="text-sm font-bold text-slate-700 mb-4">Blocos Disponíveis</h3>
              <div className="space-y-5">
                <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Gatilhos</p><div className="space-y-1.5">{TRIGGER_NODES.map(n => <CatalogItem key={n.type} node={n} onClick={() => addNode(n, 'trigger')} />)}</div></div>
                <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Condições</p><div className="space-y-1.5">{CONDITION_NODES.map(n => <CatalogItem key={n.type} node={n} onClick={() => addNode(n, 'condition')} />)}</div></div>
                <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ações</p><div className="space-y-1.5">{ACTION_NODES.map(n => <CatalogItem key={n.type} node={n} onClick={() => addNode(n, 'action')} />)}</div></div>
                <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tempo</p><CatalogItem node={DELAY_NODE} onClick={() => addNode(DELAY_NODE, 'delay')} /></div>
              </div>
            </div>
          </aside>
        )}

        {/* Canvas */}
        <div ref={containerRef} className="flex-1 overflow-auto relative bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px]">
          {nodes.length === 0 && !showCatalog && (
            <div className="absolute inset-0 flex items-center justify-center"><div className="text-center"><GitBranch className="mx-auto text-slate-300 mb-4" size={48} /><p className="text-slate-400 font-bold text-lg">Fluxo vazio</p><p className="text-sm text-slate-400 mt-2 mb-6">Adicione blocos para começar.</p><button onClick={() => setShowCatalog(true)} className="inline-flex items-center gap-2 px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold"><Plus size={20} />Adicionar Bloco</button></div></div>
          )}

          {/* SVG Connections */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
            {connections.map(conn => {
              const fn = nodes.find(n => n.id === conn.from), tn = nodes.find(n => n.id === conn.to);
              if (!fn || !tn) return null;
              return (
                <g key={conn.id}>
                  <path d={connPath(conn.from, conn.to)} fill="none" stroke="transparent" strokeWidth={20} className="pointer-events-auto cursor-pointer" onClick={() => removeConnection(conn.id)} />
                  <path d={connPath(conn.from, conn.to)} fill="none" stroke="#cbd5e1" strokeWidth={2.5} className="pointer-events-none" />
                  <circle cx={getPortPos(conn.to, 'left').x} cy={getPortPos(conn.to, 'left').y} r={5} fill="#cbd5e1" className="pointer-events-none" />
                </g>
              );
            })}
            {connectingFrom && <path d={`M${getPortPos(connectingFrom, 'right').x},${getPortPos(connectingFrom, 'right').y} C${getPortPos(connectingFrom, 'right').x + 80},${getPortPos(connectingFrom, 'right').y} ${mousePos.x - 80},${mousePos.y} ${mousePos.x},${mousePos.y}`} fill="none" stroke="#0d9488" strokeWidth={2.5} strokeDasharray="8 4" className="pointer-events-none" />}
          </svg>

          {/* Nodes */}
          <div className="p-10 min-h-[800px] relative" style={{ zIndex: 10 }}>
            {nodes.map((node) => {
              const cat = getNodeCatalog(node.nodeType);
              const Icon = cat.icon;
              const isSelected = selectedNode === node.id;
              const isConn = connectingFrom === node.id;
              const hasOut = connections.some(c => c.from === node.id);

              return (
                <div key={node.id} ref={el => { if (el) nodeRefs.current.set(node.id, el); }}
                  className="absolute" style={{ left: node.position.x, top: node.position.y, width: 360 }}>

                  {/* Input port */}
                  {nodes.indexOf(node) > 0 && (
                    <div
                      className={`absolute -left-[10px] top-6 w-5 h-5 rounded-full border-[3px] cursor-pointer transition-all z-20 ${connectingFrom ? 'bg-teal-400 border-teal-600 scale-125 animate-pulse' : 'bg-white border-slate-300 hover:border-teal-500 hover:scale-125'}`}
                      onClick={() => { if (connectingFrom && connectingFrom !== node.id) { if (!connections.find(c => c.from === connectingFrom && c.to === node.id)) setConnections([...connections, { id: crypto.randomUUID(), from: connectingFrom, to: node.id }]); setConnectingFrom(null); } }}
                    />
                  )}

                  {/* Node card */}
                  <div className={`bg-white border-2 rounded-xl shadow-lg overflow-hidden transition-all ${isSelected ? 'border-teal-500 shadow-teal-100' : 'border-slate-200 hover:border-slate-300'} ${connectingFrom && !isConn ? 'ring-2 ring-teal-400/20' : ''}`}>
                    {/* Drag handle + header */}
                    <div className="flex items-center gap-2 px-4 py-3 cursor-grab active:cursor-grabbing select-none" onMouseDown={e => handleDragStart(node.id, e)}>
                      <GripVertical size={16} className="text-slate-300 shrink-0" />
                      <div className={`w-10 h-10 rounded-lg ${cat.color} flex items-center justify-center text-white shrink-0`}><Icon size={20} /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{node.label}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{node.type}</p>
                      </div>
                      <button onClick={e => { e.stopPropagation(); removeNode(node.id); }} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 shrink-0"><X size={16} /></button>
                    </div>

                    {/* Config panel */}
                    {isSelected && <div className="px-4 pb-4">{renderConfig(node)}</div>}

                    {/* Footer */}
                    <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{hasOut ? '✓ Conectado' : 'Pendente'}</span>
                      <button onClick={e => { e.stopPropagation(); setConnectingFrom(isConn ? null : node.id); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isConn ? 'bg-teal-100 text-teal-700 ring-2 ring-teal-300' : 'bg-teal-600 text-white hover:bg-teal-700'}`}>
                        <ArrowRight size={14} />{isConn ? 'Clique no alvo ↓' : 'Conectar'}
                      </button>
                    </div>
                  </div>

                  {/* Output port */}
                  <div
                    className={`absolute -right-[10px] top-6 w-5 h-5 rounded-full border-[3px] cursor-pointer transition-all z-20 ${isConn ? 'bg-teal-500 border-teal-600 scale-125 animate-pulse' : 'bg-white border-slate-300 hover:border-teal-500 hover:scale-125'}`}
                    onClick={e => { e.stopPropagation(); setConnectingFrom(isConn ? null : node.id); }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// Catalog item sub-component
const CatalogItem: React.FC<{ node: any; onClick: () => void }> = ({ node, onClick }) => {
  const Icon = node.icon;
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200 hover:border-teal-300 hover:bg-teal-50/50 transition-all text-left group">
      <div className={`w-9 h-9 rounded-lg ${node.color} flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform`}><Icon size={17} /></div>
      <div className="min-w-0"><p className="text-sm font-bold text-slate-700 truncate">{node.label}</p><p className="text-[10px] text-slate-400 truncate">{node.description}</p></div>
    </button>
  );
};
