import React, { useState, useEffect } from 'react';
import {
  Filter, Plus, Trash2, Play, Users, Edit2, Check, X,
  ChevronDown, ChevronUp, Search, Save, Loader2
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';

type Operator = 'equals' | 'not_equals' | 'contains' | 'not_contains' |
  'greater_than' | 'less_than' | 'starts_with' | 'ends_with' | 'is_empty' | 'is_not_empty';

interface SegmentRule {
  id: string;
  field: string;
  operator: Operator;
  value: string;
}

interface Segment {
  id: string;
  name: string;
  description: string;
  rules: SegmentRule[];
  lead_count: number;
  created_at: string;
}

const FIELDS = [
  { value: 'title', label: 'Título', type: 'text' },
  { value: 'company', label: 'Empresa', type: 'text' },
  { value: 'value', label: 'Valor', type: 'number' },
  { value: 'contact_name', label: 'Nome do Contato', type: 'text' },
  { value: 'contact_email', label: 'Email do Contato', type: 'text' },
  { value: 'contact_phone', label: 'Telefone do Contato', type: 'text' },
  { value: 'funnel_id', label: 'Funil', type: 'select' },
  { value: 'stage_id', label: 'Estágio', type: 'select' },
  { value: 'assigned_user_id', label: 'Responsável', type: 'select' },
  { value: 'probability', label: 'Probabilidade (%)', type: 'number' },
  { value: 'tags', label: 'Tags', type: 'text' },
  { value: 'created_at', label: 'Data de Criação', type: 'date' },
];

const OPERATORS: { value: Operator; label: string; showValue: boolean }[] = [
  { value: 'equals', label: 'É igual a', showValue: true },
  { value: 'not_equals', label: 'Não é igual a', showValue: true },
  { value: 'contains', label: 'Contém', showValue: true },
  { value: 'not_contains', label: 'Não contém', showValue: true },
  { value: 'greater_than', label: 'Maior que', showValue: true },
  { value: 'less_than', label: 'Menor que', showValue: true },
  { value: 'starts_with', label: 'Começa com', showValue: true },
  { value: 'ends_with', label: 'Termina com', showValue: true },
  { value: 'is_empty', label: 'Está vazio', showValue: false },
  { value: 'is_not_empty', label: 'Não está vazio', showValue: false },
];

export const LeadSegmentation = () => {
  const { currentUser } = useCRM();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [funnels, setFunnels] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingSegment, setEditingSegment] = useState<string | null>(null);
  const [builderName, setBuilderName] = useState('');
  const [builderDescription, setBuilderDescription] = useState('');
  const [builderRules, setBuilderRules] = useState<SegmentRule[]>([]);
  const [previewLeads, setPreviewLeads] = useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [expandedSegment, setExpandedSegment] = useState<string | null>(null);

  const accountId = currentUser?.account_id || 'acc_demo';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [segmentsRes, funnelsRes, usersRes] = await Promise.all([
        fetch(`/api/segments?account_id=${accountId}`),
        fetch(`/api/funnels`),
        fetch(`/api/users?account_id=${accountId}`),
      ]);

      if (segmentsRes.ok) {
        const data = await segmentsRes.json();
        setSegments(Array.isArray(data) ? data : []);
      }

      if (funnelsRes.ok) {
        const data = await funnelsRes.json();
        setFunnels(data);
        const allStages = data.flatMap((f: any) => f.stages || []);
        setStages(allStages);
      }

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch segmentation data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addRule = () => {
    setBuilderRules([
      ...builderRules,
      { id: crypto.randomUUID(), field: 'title', operator: 'contains', value: '' }
    ]);
  };

  const removeRule = (id: string) => {
    setBuilderRules(builderRules.filter(r => r.id !== id));
  };

  const updateRule = (id: string, updates: Partial<SegmentRule>) => {
    setBuilderRules(builderRules.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const handlePreview = async () => {
    if (builderRules.length === 0) return;
    setPreviewLoading(true);
    try {
      const res = await fetch('/api/segments/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: accountId,
          rules: builderRules
        })
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewLeads(data.leads || []);
      }
    } catch (error) {
      console.error('Preview error:', error);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSaveSegment = async () => {
    if (!builderName.trim() || builderRules.length === 0) return;

    try {
      const method = editingSegment ? 'PUT' : 'POST';
      const url = editingSegment ? `/api/segments/${editingSegment}` : '/api/segments';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: accountId,
          name: builderName,
          description: builderDescription,
          rules: builderRules
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert('Erro ao salvar: ' + (err.error || 'Erro desconhecido'));
        return;
      }

      // Clear preview
      setPreviewLeads([]);
      setBuilderName('');
      setBuilderDescription('');
      setBuilderRules([]);
      setShowBuilder(false);
      setEditingSegment(null);
      fetchData();
    } catch (error) {
      console.error('Save segment error:', error);
      alert('Erro ao salvar segmentação');
    }
  };

  const handleDeleteSegment = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta segmentação?')) return;
    try {
      const res = await fetch(`/api/segments/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (error) {
      console.error('Delete segment error:', error);
    }
  };

  const handleEditSegment = (segment: Segment) => {
    setBuilderName(segment.name);
    setBuilderDescription(segment.description);
    setBuilderRules(segment.rules);
    setEditingSegment(segment.id);
    setShowBuilder(true);
    setPreviewLeads([]);
  };

  const handleRunSegment = async (segment: Segment) => {
    setPreviewLoading(true);
    try {
      const res = await fetch('/api/segments/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: accountId,
          rules: segment.rules
        })
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewLeads(data.leads || []);
        setExpandedSegment(segment.id);
      }
    } catch (error) {
      console.error('Run segment error:', error);
    } finally {
      setPreviewLoading(false);
    }
  };

  const getFieldLabel = (field: string) => {
    return FIELDS.find(f => f.value === field)?.label || field;
  };

  const getOperatorLabel = (op: string) => {
    return OPERATORS.find(o => o.value === op)?.label || op;
  };

  const getSelectOptions = (field: string) => {
    if (field === 'funnel_id') return funnels.map(f => ({ value: f.id, label: f.name }));
    if (field === 'stage_id') return stages.map(s => ({ value: s.id, label: s.name }));
    if (field === 'assigned_user_id') return users.map(u => ({ value: u.id, label: u.name }));
    return [];
  };

  const cancelBuilder = () => {
    setShowBuilder(false);
    setBuilderName('');
    setBuilderDescription('');
    setBuilderRules([]);
    setEditingSegment(null);
    setPreviewLeads([]);
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Filter className="text-purple-600" size={32} />
              Segmentação de Leads
            </h1>
            <p className="text-slate-500 font-medium mt-1">Crie segmentações dinâmicas para filtrar seus leads com regras personalizadas.</p>
          </div>
          {!showBuilder && (
            <button
              onClick={() => { setShowBuilder(true); setPreviewLeads([]); }}
              className="flex items-center gap-2 px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-purple-200"
            >
              <Plus size={20} />
              Nova Segmentação
            </button>
          )}
        </div>

        {/* Builder */}
        {showBuilder && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/40 mb-8 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">
                {editingSegment ? 'Editar Segmentação' : 'Nova Segmentação'}
              </h3>
              <button onClick={cancelBuilder} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Name & Description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Nome *</label>
                  <input
                    type="text"
                    value={builderName}
                    onChange={e => setBuilderName(e.target.value)}
                    placeholder="Ex: Leads Enterprise acima de R$10k"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Descrição</label>
                  <input
                    type="text"
                    value={builderDescription}
                    onChange={e => setBuilderDescription(e.target.value)}
                    placeholder="Descrição opcional..."
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Rules */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-bold text-slate-700">Regras</label>
                  <button
                    onClick={addRule}
                    className="flex items-center gap-1.5 text-sm font-bold text-purple-600 hover:text-purple-700"
                  >
                    <Plus size={16} />
                    Adicionar Regra
                  </button>
                </div>

                <div className="space-y-3">
                  {builderRules.map((rule, index) => {
                    const field = FIELDS.find(f => f.value === rule.field);
                    const isSelectField = field?.type === 'select';
                    const showValue = OPERATORS.find(o => o.value === rule.operator)?.showValue ?? true;

                    return (
                      <div key={rule.id} className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-xs font-bold text-slate-400 w-6 text-center">{index + 1}</span>

                        <select
                          value={rule.field}
                          onChange={e => updateRule(rule.id, { field: e.target.value })}
                          className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 min-w-[160px]"
                        >
                          {FIELDS.map(f => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                          ))}
                        </select>

                        <select
                          value={rule.operator}
                          onChange={e => updateRule(rule.id, { operator: e.target.value as Operator })}
                          className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 min-w-[150px]"
                        >
                          {OPERATORS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>

                        {showValue && !isSelectField && (
                          <input
                            type={field?.type === 'number' ? 'number' : 'text'}
                            value={rule.value}
                            onChange={e => updateRule(rule.id, { value: e.target.value })}
                            placeholder="Valor..."
                            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        )}

                        {showValue && isSelectField && (
                          <select
                            value={rule.value}
                            onChange={e => updateRule(rule.id, { value: e.target.value })}
                            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="">Selecione...</option>
                            {getSelectOptions(rule.field).map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        )}

                        <button
                          onClick={() => removeRule(rule.id)}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    );
                  })}

                  {builderRules.length === 0 && (
                    <div className="text-center py-8 text-slate-400">
                      <Filter size={32} className="mx-auto mb-3 opacity-30" />
                      <p className="font-medium">Nenhuma regra adicionada</p>
                      <p className="text-sm mt-1">Clique em "Adicionar Regra" para começar</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Preview & Save */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={handlePreview}
                  disabled={previewLoading || builderRules.length === 0}
                  className="flex items-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                >
                  {previewLoading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                  Preview ({previewLeads.length} leads)
                </button>
                <button
                  onClick={handleSaveSegment}
                  disabled={!builderName.trim() || builderRules.length === 0}
                  className="flex items-center gap-2 px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                >
                  <Save size={18} />
                  Salvar Segmentação
                </button>
                <button
                  onClick={cancelBuilder}
                  className="px-5 py-3 text-slate-500 hover:text-slate-700 font-bold transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Preview Results */}
        {previewLeads.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/40 mb-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-purple-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="text-purple-600" size={20} />
                <h3 className="font-bold text-slate-900">{previewLeads.length} leads encontrados</h3>
              </div>
            </div>
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 sticky top-0 z-10 border-b border-gray-200">
                  <tr className="text-slate-400 text-xs uppercase tracking-wider font-bold">
                    <th className="px-6 py-3">Título</th>
                    <th className="px-6 py-3">Empresa</th>
                    <th className="px-6 py-3">Valor</th>
                    <th className="px-6 py-3">Contato</th>
                    <th className="px-6 py-3">Estágio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {previewLeads.map((lead) => {
                    const stage = stages.find(s => s.id === lead.stage_id);
                    return (
                      <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3 text-sm font-medium text-slate-900">{lead.title}</td>
                        <td className="px-6 py-3 text-sm text-slate-500">{lead.company || '-'}</td>
                        <td className="px-6 py-3 text-sm font-bold text-green-600">
                          {lead.value ? `R$ ${lead.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td className="px-6 py-3 text-sm text-slate-500">{lead.contact_name || lead.contact_email || '-'}</td>
                        <td className="px-6 py-3">
                          {stage ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border" style={{ borderColor: stage.color + '33', color: stage.color, backgroundColor: stage.color + '11' }}>
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }}></span>
                              {stage.name}
                            </span>
                          ) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Saved Segments */}
        <div className="space-y-4">
          <h2 className="text-xl font-black text-slate-900">Segmentações Salvas</h2>

          {segments.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/40 p-12 text-center">
              <Filter className="mx-auto text-slate-300 mb-4" size={48} />
              <p className="text-slate-400 font-bold text-lg">Nenhuma segmentação criada</p>
              <p className="text-sm text-slate-400 mt-2 mb-6">Crie sua primeira segmentação para filtrar leads com regras personalizadas.</p>
              <button
                onClick={() => { setShowBuilder(true); setPreviewLeads([]); }}
                className="inline-flex items-center gap-2 px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-colors"
              >
                <Plus size={20} />
                Criar Primeira Segmentação
              </button>
            </div>
          ) : (
            segments.map((segment) => (
              <div key={segment.id} className="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/40 overflow-hidden">
                <div
                  className="px-6 py-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors"
                  onClick={() => setExpandedSegment(expandedSegment === segment.id ? null : segment.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                      <Filter size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{segment.name}</h3>
                      {segment.description && (
                        <p className="text-sm text-slate-500">{segment.description}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        {segment.rules.length} regra{segment.rules.length !== 1 ? 's' : ''} • Criado em {new Date(segment.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-lg">
                      {segment.lead_count || 0} leads
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRunSegment(segment); }}
                      disabled={previewLoading}
                      className="p-2 text-slate-400 hover:text-purple-600 transition-colors"
                      title="Executar segmentação"
                    >
                      {previewLoading && expandedSegment === segment.id ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Play size={18} />
                      )}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEditSegment(segment); }}
                      className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteSegment(segment.id); }}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={18} />
                    </button>
                    {expandedSegment === segment.id ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                  </div>
                </div>

                {expandedSegment === segment.id && (
                  <div className="px-6 pb-5 border-t border-slate-100 bg-slate-50/30">
                    <div className="pt-4 space-y-2">
                      <h4 className="text-sm font-bold text-slate-700 mb-3">Regras:</h4>
                      {segment.rules.map((rule, i) => (
                        <div key={rule.id} className="flex items-center gap-2 text-sm">
                          <span className="text-xs font-bold text-slate-400 w-5">{i + 1}.</span>
                          <span className="font-medium text-slate-700">{getFieldLabel(rule.field)}</span>
                          <span className="text-slate-500">{getOperatorLabel(rule.operator)}</span>
                          {rule.value && <span className="font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded">"{rule.value}"</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
