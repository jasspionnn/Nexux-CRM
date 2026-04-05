import React, { useState, useEffect, useRef } from 'react';
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
  { type: 'new_lead' as TriggerType, label: 'Novo Lead Criado', icon: UserPlus, color: 'bg-green-500', description: 'Quando um novo lead é criado' },
  { type: 'stage_change' as TriggerType, label: 'Mudou de Estágio', icon: ArrowRight, color: 'bg-blue-500', description: 'Quando lead muda de estágio' },
  { type: 'form_submit' as TriggerType, label: 'Formulário Preenchido', icon: FileText, color: 'bg-orange-500', description: 'Quando lead preenche formulário' },
  { type: 'page_visit' as TriggerType, label: 'Visitou Página', icon: Globe, color: 'bg-purple-500', description: 'Quando lead visita uma URL' },
  { type: 'conversion' as TriggerType, label: 'Conversão', icon: Zap, color: 'bg-yellow-500', description: 'Quando lead converte' },
  { type: 'webhook' as TriggerType, label: 'Webhook Recebido', icon: Globe, color: 'bg-indigo-500', description: 'Quando recebe webhook' },
];

const CONDITION_NODES = [
  { type: 'value_gt' as ConditionType, label: 'Valor Maior Que', icon: MoveUp, color: 'bg-amber-500', description: 'Valor do lead > X' },
  { type: 'value_lt' as ConditionType, label: 'Valor Menor Que', icon: MoveUp, color: 'bg-amber-500', description: 'Valor do lead < X' },
  { type: 'has_tag' as ConditionType, label: 'Tem Tag', icon: Tag, color: 'bg-pink-500', description: 'Lead possui tag X' },
  { type: 'not_has_tag' as ConditionType, label: 'Não Tem Tag', icon: Tag, color: 'bg-pink-500', description: 'Lead não possui tag X' },
  { type: 'stage_is' as ConditionType, label: 'Estágio É', icon: ArrowRight, color: 'bg-blue-500', description: 'Lead está no estágio X' },
  { type: 'email_contains' as ConditionType, label: 'Email Contém', icon: Mail, color: 'bg-red-500', description: 'Email contém texto X' },
  { type: 'probability_gt' as ConditionType, label: 'Probabilidade >', icon: MoveUp, color: 'bg-green-500', description: 'Probabilidade > X%' },
];

const ACTION_NODES = [
  { type: 'move_stage' as ActionType, label: 'Mover Estágio', icon: ArrowRight, color: 'bg-blue-500', description: 'Move lead para outro estágio' },
  { type: 'create_task' as ActionType, label: 'Criar Tarefa', icon: AlertCircle, color: 'bg-orange-500', description: 'Cria tarefa para usuário' },
  { type: 'add_tag' as ActionType, label: 'Adicionar Tag', icon: Tag, color: 'bg-pink-500', description: 'Adiciona tag ao lead' },
  { type: 'remove_tag' as ActionType, label: 'Remover Tag', icon: Tag, color: 'bg-pink-500', description: 'Remove tag do lead' },
  { type: 'send_email' as ActionType, label: 'Enviar Email', icon: Mail, color: 'bg-red-500', description: 'Envia email para lead' },
  { type: 'send_webhook' as ActionType, label: 'Enviar Webhook', icon: Globe, color: 'bg-indigo-500', description: 'Envia payload via webhook' },
  { type: 'create_note' as ActionType, label: 'Criar Nota', icon: FileText, color: 'bg-gray-500', description: 'Adiciona nota ao lead' },
  { type: 'assign_user' as ActionType, label: 'Atribuir Usuário', icon: UserPlus, color: 'bg-teal-500', description: 'Atribui lead a usuário' },
];

const DELAY_NODE = { type: 'delay' as const, label: 'Esperar / Delay', icon: Clock, color: 'bg-slate-500', description: 'Espera X minutos/horas/dias' };

// ==================== MAIN COMPONENT ====================

export const AutomationFlows = () => {
  const { currentUser } = useCRM();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);

  const accountId = currentUser?.account_id || 'acc_demo';

  useEffect(() => {
    fetchAutomations();
  }, []);

  const fetchAutomations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/automations?account_id=${accountId}`);
      if (res.ok) {
        const data = await res.json();
        setAutomations(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch automations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFlow = () => {
    const newAutomation: Automation = {
      id: crypto.randomUUID(),
      name: '',
      description: '',
      is_active: 1,
      trigger_type: '',
      trigger_config: {},
      nodes: [],
      connections: [],
      created_at: new Date().toISOString(),
    };
    setEditingAutomation(newAutomation);
    setShowBuilder(true);
  };

  const handleEditFlow = (automation: Automation) => {
    setEditingAutomation({
      ...automation,
      nodes: automation.nodes || [],
      connections: automation.connections || [],
    });
    setShowBuilder(true);
  };

  const handleDeleteFlow = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este fluxo?')) return;
    try {
      await fetch(`/api/automations/${id}`, { method: 'DELETE' });
      fetchAutomations();
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleToggleActive = async (automation: Automation) => {
    try {
      await fetch(`/api/automations/${automation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...automation, is_active: automation.is_active ? 0 : 1 })
      });
      fetchAutomations();
    } catch (error) {
      console.error('Toggle error:', error);
    }
  };

  const handleSaveFlow = async (data: Omit<Automation, 'id' | 'created_at'> & { id?: string; created_at?: string }) => {
    try {
      const method = data.id && automations.find(a => a.id === data.id) ? 'PUT' : 'POST';
      const url = method === 'PUT' ? `/api/automations/${data.id}` : '/api/automations';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, account_id: accountId })
      });

      if (res.ok) {
        setShowBuilder(false);
        setEditingAutomation(null);
        fetchAutomations();
      }
    } catch (error) {
      console.error('Save error:', error);
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
    <div className="min-h-full bg-slate-50/50">
      {!showBuilder ? (
        // ==================== LIST VIEW ====================
        <div className="p-6 lg:p-10">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                  <GitBranch className="text-teal-600" size={32} />
                  Automações
                </h1>
                <p className="text-slate-500 font-medium mt-1">Crie fluxos de automação visuais para automatizar suas vendas.</p>
              </div>
              <button
                onClick={handleCreateFlow}
                className="flex items-center gap-2 px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-teal-200"
              >
                <Plus size={20} />
                Novo Fluxo
              </button>
            </div>

            {automations.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/40 p-12 text-center">
                <GitBranch className="mx-auto text-slate-300 mb-4" size={48} />
                <p className="text-slate-400 font-bold text-lg">Nenhum fluxo de automação criado</p>
                <p className="text-sm text-slate-400 mt-2 mb-6">Crie seu primeiro fluxo para automatizar ações baseado em eventos dos leads.</p>
                <button
                  onClick={handleCreateFlow}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-colors"
                >
                  <Plus size={20} />
                  Criar Primeiro Fluxo
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {automations.map(automation => (
                  <div key={automation.id} className="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/40 overflow-hidden hover:shadow-2xl hover:shadow-slate-200/50 transition-shadow">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${automation.is_active ? 'bg-teal-50 text-teal-600' : 'bg-slate-100 text-slate-400'}`}>
                            <GitBranch size={20} />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900">{automation.name}</h3>
                            {automation.description && (
                              <p className="text-xs text-slate-400 truncate max-w-[180px]">{automation.description}</p>
                            )}
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${automation.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {automation.is_active ? 'Ativo' : 'Pausado'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                        <Zap size={12} className="text-yellow-500" />
                        <span className="font-medium">Trigger:</span>
                        <span className="capitalize">{automation.trigger_type?.replace('_', ' ') || '-'}</span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>{(automation.nodes || []).length} nós</span>
                        <span>•</span>
                        <span>Criado em {new Date(automation.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>

                    <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleActive(automation)}
                          className="p-2 text-slate-400 hover:text-teal-600 transition-colors rounded-lg hover:bg-white"
                          title={automation.is_active ? 'Pausar' : 'Ativar'}
                        >
                          {automation.is_active ? <Pause size={16} /> : <Play size={16} />}
                        </button>
                        <button
                          onClick={() => handleEditFlow(automation)}
                          className="p-2 text-slate-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-white"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteFlow(automation.id)}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-white"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <button
                        onClick={() => handleEditFlow(automation)}
                        className="flex items-center gap-1.5 text-xs font-bold text-teal-600 hover:text-teal-700"
                      >
                        <Eye size={14} />
                        Abrir
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <AutomationBuilder
          automation={editingAutomation!}
          onSave={handleSaveFlow}
          onCancel={() => { setShowBuilder(false); setEditingAutomation(null); }}
          accountId={accountId}
        />
      )}
    </div>
  );
};

// ==================== BUILDER COMPONENT ====================

interface BuilderProps {
  automation: Automation;
  onSave: (data: any) => void;
  onCancel: () => void;
  accountId: string;
}

const AutomationBuilder: React.FC<BuilderProps> = ({ automation, onSave, onCancel, accountId }) => {
  const [name, setName] = useState(automation.name || '');
  const [description, setDescription] = useState(automation.description || '');
  const [nodes, setNodes] = useState<FlowNode[]>(automation.nodes || []);
  const [connections, setConnections] = useState<FlowConnection[]>(automation.connections || []);
  const [showCatalog, setShowCatalog] = useState(nodes.length === 0);
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [stages, setStages] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fRes, uRes] = await Promise.all([
          fetch('/api/funnels'),
          fetch(`/api/users?account_id=${accountId}`)
        ]);
        if (fRes.ok) {
          const fData = await fRes.json();
          setStages(fData.flatMap((f: any) => f.stages || []));
        }
        if (uRes.ok) setUsers(await uRes.json());
      } catch (e) { console.error(e); }
    };
    fetchData();
  }, [accountId]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (connectingFrom && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePos({ x: e.clientX - rect.left + containerRef.current.scrollLeft, y: e.clientY - rect.top + containerRef.current.scrollTop });
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [connectingFrom]);

  const addNode = (nodeType: any, category: NodeType) => {
    const newNode: FlowNode = {
      id: crypto.randomUUID(),
      type: category,
      nodeType: nodeType.type,
      label: nodeType.label,
      config: {},
      position: { x: 100, y: nodes.length * 220 + 80 }
    };

    const newNodes = [...nodes, newNode];
    let newConnections = [...connections];

    // Auto-connect to last node
    if (nodes.length > 0) {
      const lastNode = nodes[nodes.length - 1];
      newConnections.push({ id: crypto.randomUUID(), from: lastNode.id, to: newNode.id });
    }

    setNodes(newNodes);
    setConnections(newConnections);
    setShowCatalog(false);
  };

  const updateNodeConfig = (nodeId: string, config: Record<string, any>) => {
    setNodes(nodes.map(n => n.id === nodeId ? { ...n, config: { ...n.config, ...config } } : n));
  };

  const removeNode = (nodeId: string) => {
    setNodes(nodes.filter(n => n.id !== nodeId));
    setConnections(connections.filter(c => c.from !== nodeId && c.to !== nodeId));
    setSelectedNode(null);
  };

  const removeConnection = (connId: string) => {
    setConnections(connections.filter(c => c.id !== connId));
  };

  const handleSave = async () => {
    if (!name.trim()) { alert('Dê um nome ao fluxo'); return; }
    setIsSaving(true);
    await onSave({ id: automation.id, name, description, is_active: 1, trigger_type: nodes.find(n => n.type === 'trigger')?.nodeType || '', trigger_config: nodes.find(n => n.type === 'trigger')?.config || {}, nodes, connections, created_at: automation.created_at });
    setIsSaving(false);
  };

  const getNodeIcon = (node: FlowNode) => {
    const all = [...TRIGGER_NODES, ...CONDITION_NODES, ...ACTION_NODES, DELAY_NODE];
    return all.find(n => n.type === node.nodeType)?.icon || Zap;
  };

  const getNodeColor = (node: FlowNode) => {
    const all = [...TRIGGER_NODES, ...CONDITION_NODES, ...ACTION_NODES, DELAY_NODE];
    return all.find(n => n.type === node.nodeType)?.color || 'bg-gray-500';
  };

  const getPortPos = (nodeId: string, side: 'right' | 'left') => {
    const el = nodeRefs.current.get(nodeId);
    if (!el || !containerRef.current) return { x: 200, y: 50 };
    const cRect = containerRef.current.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();
    return {
      x: (side === 'right' ? eRect.right : eRect.left) - cRect.left + containerRef.current.scrollLeft,
      y: eRect.top - cRect.top + eRect.height / 2 + containerRef.current.scrollTop
    };
  };

  const connPath = (fromId: string, toId: string) => {
    const a = getPortPos(fromId, 'right');
    const b = getPortPos(toId, 'left');
    const dx = Math.max(Math.abs(b.x - a.x) * 0.5, 60);
    return `M${a.x},${a.y} C${a.x + dx},${a.y} ${b.x - dx},${b.y} ${b.x},${b.y}`;
  };

  const renderNodeConfig = (node: FlowNode) => {
    return (
      <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
        {node.nodeType === 'new_lead' && <p className="text-xs text-slate-500">Dispara quando um novo lead é criado no CRM.</p>}

        {node.nodeType === 'stage_change' && (
          <div className="space-y-2">
            <select value={node.config.from_stage_id || ''} onChange={e => updateNodeConfig(node.id, { from_stage_id: e.target.value })} className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg">
              <option value="">De qualquer estágio →</option>
              {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={node.config.to_stage_id || ''} onChange={e => updateNodeConfig(node.id, { to_stage_id: e.target.value })} className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg">
              <option value="">Para qualquer estágio</option>
              {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}

        {node.nodeType === 'page_visit' && <input type="text" value={node.config.url_pattern || ''} onChange={e => updateNodeConfig(node.id, { url_pattern: e.target.value })} placeholder="URL contém..." className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg" />}

        {(node.nodeType === 'value_gt' || node.nodeType === 'value_lt') && <input type="number" value={node.config.value || ''} onChange={e => updateNodeConfig(node.id, { value: parseFloat(e.target.value) })} placeholder={`Valor ${node.nodeType === 'value_gt' ? '>' : '<'} R$`} className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg" />}

        {(node.nodeType === 'has_tag' || node.nodeType === 'not_has_tag') && <input type="text" value={node.config.tag || ''} onChange={e => updateNodeConfig(node.id, { tag: e.target.value })} placeholder="Nome da tag..." className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg" />}

        {node.nodeType === 'stage_is' && (
          <select value={node.config.stage_id || ''} onChange={e => updateNodeConfig(node.id, { stage_id: e.target.value })} className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg">
            <option value="">Selecione o estágio...</option>
            {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}

        {node.nodeType === 'email_contains' && <input type="text" value={node.config.text || ''} onChange={e => updateNodeConfig(node.id, { text: e.target.value })} placeholder="Email contém..." className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg" />}

        {node.nodeType === 'probability_gt' && <input type="number" value={node.config.probability || ''} onChange={e => updateNodeConfig(node.id, { probability: parseInt(e.target.value) })} placeholder="Probabilidade > %" min={0} max={100} className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg" />}

        {node.nodeType === 'move_stage' && (
          <select value={node.config.to_stage_id || ''} onChange={e => updateNodeConfig(node.id, { to_stage_id: e.target.value })} className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg">
            <option value="">Mover para estágio...</option>
            {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}

        {node.nodeType === 'create_task' && (
          <div className="space-y-2">
            <input type="text" value={node.config.title || ''} onChange={e => updateNodeConfig(node.id, { title: e.target.value })} placeholder="Título da tarefa..." className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg" />
            <input type="date" value={node.config.due_date || ''} onChange={e => updateNodeConfig(node.id, { due_date: e.target.value })} className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg" />
            <select value={node.config.assigned_user_id || ''} onChange={e => updateNodeConfig(node.id, { assigned_user_id: e.target.value })} className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg">
              <option value="">Atribuir a...</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        )}

        {(node.nodeType === 'add_tag' || node.nodeType === 'remove_tag') && <input type="text" value={node.config.tag || ''} onChange={e => updateNodeConfig(node.id, { tag: e.target.value })} placeholder="Nome da tag..." className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg" />}

        {node.nodeType === 'send_email' && (
          <div className="space-y-2">
            <input type="text" value={node.config.subject || ''} onChange={e => updateNodeConfig(node.id, { subject: e.target.value })} placeholder="Assunto..." className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg" />
            <textarea value={node.config.body || ''} onChange={e => updateNodeConfig(node.id, { body: e.target.value })} placeholder="Corpo do email..." rows={3} className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg resize-none" />
          </div>
        )}

        {node.nodeType === 'send_webhook' && (
          <div className="space-y-2">
            <input type="url" value={node.config.url || ''} onChange={e => updateNodeConfig(node.id, { url: e.target.value })} placeholder="https://..." className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg" />
            <select value={node.config.method || 'POST'} onChange={e => updateNodeConfig(node.id, { method: e.target.value })} className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg">
              <option value="POST">POST</option><option value="GET">GET</option><option value="PUT">PUT</option>
            </select>
          </div>
        )}

        {node.nodeType === 'create_note' && <textarea value={node.config.content || ''} onChange={e => updateNodeConfig(node.id, { content: e.target.value })} placeholder="Conteúdo da nota..." rows={3} className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg resize-none" />}

        {node.nodeType === 'assign_user' && (
          <select value={node.config.user_id || ''} onChange={e => updateNodeConfig(node.id, { user_id: e.target.value })} className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg">
            <option value="">Selecionar usuário...</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        )}

        {node.nodeType === 'delay' && (
          <div className="flex items-center gap-2">
            <input type="number" value={node.config.duration || ''} onChange={e => updateNodeConfig(node.id, { duration: parseInt(e.target.value) })} placeholder="Duração" min={1} className="w-20 px-2 py-1.5 text-xs border border-slate-200 rounded-lg" />
            <select value={node.config.unit || 'minutes'} onChange={e => updateNodeConfig(node.id, { unit: e.target.value })} className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg">
              <option value="minutes">minutos</option><option value="hours">horas</option><option value="days">dias</option>
            </select>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4 flex-1">
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
          <div className="flex-1">
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nome do fluxo..." className="text-lg font-bold text-slate-900 border-none focus:outline-none bg-transparent w-full" />
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição (opcional)" className="text-sm text-slate-500 border-none focus:outline-none bg-transparent w-full" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowCatalog(!showCatalog)} className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-colors">
            <Plus size={16} /> Adicionar Bloco
          </button>
          <button onClick={handleSave} disabled={isSaving || nodes.length === 0} className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50">
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Catalog */}
        {showCatalog && (
          <aside className="w-72 bg-white border-r border-slate-200 overflow-y-auto shrink-0">
            <div className="p-4">
              <h3 className="text-sm font-bold text-slate-700 mb-4">Blocos Disponíveis</h3>
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Gatilhos</p>
                  <div className="space-y-1.5">
                    {TRIGGER_NODES.map(node => { const Icon = node.icon; return (
                      <button key={node.type} onClick={() => addNode(node, 'trigger')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200 hover:border-teal-300 hover:bg-teal-50 transition-all text-left">
                        <div className={`w-8 h-8 rounded-lg ${node.color} flex items-center justify-center text-white shrink-0`}><Icon size={16} /></div>
                        <div className="min-w-0"><p className="text-sm font-bold text-slate-700 truncate">{node.label}</p><p className="text-[10px] text-slate-400 truncate">{node.description}</p></div>
                      </button>
                    );})}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Condições</p>
                  <div className="space-y-1.5">
                    {CONDITION_NODES.map(node => { const Icon = node.icon; return (
                      <button key={node.type} onClick={() => addNode(node, 'condition')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50 transition-all text-left">
                        <div className={`w-8 h-8 rounded-lg ${node.color} flex items-center justify-center text-white shrink-0`}><Icon size={16} /></div>
                        <div className="min-w-0"><p className="text-sm font-bold text-slate-700 truncate">{node.label}</p><p className="text-[10px] text-slate-400 truncate">{node.description}</p></div>
                      </button>
                    );})}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ações</p>
                  <div className="space-y-1.5">
                    {ACTION_NODES.map(node => { const Icon = node.icon; return (
                      <button key={node.type} onClick={() => addNode(node, 'action')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left">
                        <div className={`w-8 h-8 rounded-lg ${node.color} flex items-center justify-center text-white shrink-0`}><Icon size={16} /></div>
                        <div className="min-w-0"><p className="text-sm font-bold text-slate-700 truncate">{node.label}</p><p className="text-[10px] text-slate-400 truncate">{node.description}</p></div>
                      </button>
                    );})}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tempo</p>
                  <button onClick={() => addNode(DELAY_NODE, 'delay')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-left">
                    <div className={`w-8 h-8 rounded-lg ${DELAY_NODE.color} flex items-center justify-center text-white shrink-0`}><DELAY_NODE.icon size={16} /></div>
                    <div className="min-w-0"><p className="text-sm font-bold text-slate-700 truncate">{DELAY_NODE.label}</p><p className="text-[10px] text-slate-400 truncate">{DELAY_NODE.description}</p></div>
                  </button>
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Canvas */}
        <div ref={containerRef} className="flex-1 overflow-auto relative bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px]">
          {nodes.length === 0 && !showCatalog && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <GitBranch className="mx-auto text-slate-300 mb-4" size={48} />
                <p className="text-slate-400 font-bold text-lg">Fluxo vazio</p>
                <p className="text-sm text-slate-400 mt-2 mb-6">Adicione blocos para começar.</p>
                <button onClick={() => setShowCatalog(true)} className="inline-flex items-center gap-2 px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-colors">
                  <Plus size={20} /> Adicionar Primeiro Bloco
                </button>
              </div>
            </div>
          )}

          {/* SVG connections */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
            {/* Existing connections */}
            {connections.map(conn => {
              const fromNode = nodes.find(n => n.id === conn.from);
              const toNode = nodes.find(n => n.id === conn.to);
              if (!fromNode || !toNode) return null;
              return (
                <g key={conn.id}>
                  {/* Thick invisible hit area */}
                  <path d={connPath(conn.from, conn.to)} fill="none" stroke="transparent" strokeWidth={20} className="pointer-events-auto cursor-pointer" onClick={() => removeConnection(conn.id)} />
                  {/* Visible line */}
                  <path d={connPath(conn.from, conn.to)} fill="none" stroke="#94a3b8" strokeWidth={2} className="pointer-events-none" />
                  {/* Arrow dot */}
                  <circle cx={getPortPos(conn.to, 'left').x} cy={getPortPos(conn.to, 'left').y} r={4} fill="#94a3b8" className="pointer-events-none" />
                </g>
              );
            })}

            {/* Preview line */}
            {connectingFrom && (
              <path
                d={`M${getPortPos(connectingFrom, 'right').x},${getPortPos(connectingFrom, 'right').y} C${getPortPos(connectingFrom, 'right').x + 80},${getPortPos(connectingFrom, 'right').y} ${mousePos.x - 80},${mousePos.y} ${mousePos.x},${mousePos.y}`}
                fill="none" stroke="#0d9488" strokeWidth={2} strokeDasharray="6 4" className="pointer-events-none"
              />
            )}
          </svg>

          {/* Nodes */}
          <div className="p-8 min-h-full relative" style={{ zIndex: 10 }}>
            {nodes.map((node, index) => {
              const Icon = getNodeIcon(node);
              const color = getNodeColor(node);
              const isSelected = selectedNode?.id === node.id;
              const isConnecting = connectingFrom === node.id;

              return (
                <div key={node.id} className="relative mb-8" style={{ marginLeft: node.position.x, width: 340 }}>
                  {/* Input port */}
                  {index > 0 && (
                    <div
                      className={`absolute -left-[9px] top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-[3px] cursor-pointer transition-all z-20 ${
                        connectingFrom ? 'bg-teal-400 border-teal-600 scale-125 animate-pulse' : 'bg-white border-slate-300 hover:border-teal-500 hover:scale-125'
                      }`}
                      onClick={() => {
                        if (connectingFrom) {
                          const exists = connections.find(c => c.from === connectingFrom && c.to === node.id);
                          if (!exists) setConnections([...connections, { id: crypto.randomUUID(), from: connectingFrom, to: node.id }]);
                          setConnectingFrom(null);
                        }
                      }}
                    />
                  )}

                  <div
                    ref={el => { if (el) nodeRefs.current.set(node.id, el); }}
                    className={`bg-white border-2 rounded-xl shadow-lg overflow-hidden transition-all ${
                      isSelected ? 'border-teal-500 shadow-teal-200' : 'border-slate-200 hover:border-slate-300'
                    } ${connectingFrom && !isConnecting ? 'ring-2 ring-teal-400/30' : ''}`}
                    onClick={() => { if (!connectingFrom) setSelectedNode(isSelected ? null : node); }}
                  >
                    <div className="px-4 py-3 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center text-white shrink-0`}><Icon size={20} /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{node.label}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">{node.type}</p>
                      </div>
                      <button onClick={e => { e.stopPropagation(); removeNode(node.id); }} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100"><X size={16} /></button>
                    </div>

                    {isSelected && renderNodeConfig(node)}

                    {/* Output area */}
                    <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">
                        {connections.some(c => c.from === node.id) ? '✓ Conectado' : 'Sem conexão'}
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); setConnectingFrom(isConnecting ? null : node.id); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          isConnecting ? 'bg-teal-100 text-teal-700 ring-2 ring-teal-300 animate-pulse' : 'bg-teal-600 text-white hover:bg-teal-700'
                        }`}
                      >
                        <ArrowRight size={14} />
                        {isConnecting ? 'Clique no próximo bloco ↓' : 'Conectar →'}
                      </button>
                    </div>
                  </div>

                  {/* Output port */}
                  <div
                    className={`absolute -right-[9px] top-[calc(50%-10px)] w-5 h-5 rounded-full border-[3px] cursor-pointer transition-all z-20 ${
                      isConnecting ? 'bg-teal-500 border-teal-600 scale-125 animate-pulse' : 'bg-white border-slate-300 hover:border-teal-500 hover:scale-125'
                    }`}
                    onClick={e => { e.stopPropagation(); setConnectingFrom(isConnecting ? null : node.id); }}
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
