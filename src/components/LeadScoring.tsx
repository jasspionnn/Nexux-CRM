import React, { useState, useEffect } from 'react';
import { 
  Star, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  TrendingUp, 
  Users, 
  Target, 
  Award,
  ChevronDown,
  ChevronRight,
  BarChart3,
  Settings,
  Activity,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface CustomField {
  id: string;
  name: string;
  type: string;
  options?: string;
}

interface ProfileField {
  id: string;
  custom_field_id: string;
  custom_field_name?: string;
  weight_percentage: number;
  star_rating: number;
  condition_type: string;
  condition_value: string;
}

interface ProfileRule {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  fields: ProfileField[];
}

interface InterestConversion {
  id: string;
  conversion_name: string;
  points: number;
  event_type: string;
  event_ids: string;
}

interface InterestRule {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  conversions: InterestConversion[];
}

interface LeadScore {
  id: string;
  title: string;
  contact_email: string;
  score_profile: number;
  score_interest: number;
  score_grade: string;
}

const API_BASE = '/api';

const getHeaders = () => {
  const token = localStorage.getItem('crm_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

const calculateGrade = (total: number): string => {
  if (total >= 80) return 'A';
  if (total >= 60) return 'B';
  if (total >= 40) return 'C';
  if (total >= 20) return 'D';
  return 'E';
};

const getGradeColor = (grade: string): string => {
  const colors: Record<string, string> = {
    'A': 'bg-green-500 text-white',
    'B': 'bg-blue-500 text-white',
    'C': 'bg-yellow-500 text-white',
    'D': 'bg-orange-500 text-white',
    'E': 'bg-red-500 text-white',
  };
  return colors[grade] || 'bg-gray-500 text-white';
};

const getGradeBg = (grade: string): string => {
  const colors: Record<string, string> = {
    'A': 'bg-green-50 border-green-200',
    'B': 'bg-blue-50 border-blue-200',
    'C': 'bg-yellow-50 border-yellow-200',
    'D': 'bg-orange-50 border-orange-200',
    'E': 'bg-red-50 border-red-200',
  };
  return colors[grade] || 'bg-gray-50 border-gray-200';
};

const StarRating = ({ rating, onChange, readonly = false }: { rating: number; onChange?: (r: number) => void; readonly?: boolean }) => {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={`transition-all ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHoverRating(star)}
          onMouseLeave={() => !readonly && setHoverRating(0)}
        >
          <Star
            size={18}
            className={`${
              star <= (hoverRating || rating)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
};

export const LeadScoring = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'interest' | 'scores'>('profile');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Profile state
  const [profileRules, setProfileRules] = useState<ProfileRule[]>([]);
  const [editingProfileRule, setEditingProfileRule] = useState<string | null>(null);
  const [newProfileRule, setNewProfileRule] = useState(false);
  const [profileRuleForm, setProfileRuleForm] = useState<Partial<ProfileRule>>({});
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  // Interest state
  const [interestRules, setInterestRules] = useState<InterestRule[]>([]);
  const [editingInterestRule, setEditingInterestRule] = useState<string | null>(null);
  const [newInterestRule, setNewInterestRule] = useState(false);
  const [interestRuleForm, setInterestRuleForm] = useState<Partial<InterestRule>>({});
  const [trackingForms, setTrackingForms] = useState<any[]>([]);

  // Scores state
  const [leadScores, setLeadScores] = useState<LeadScore[]>([]);
  const [scoresLoading, setScoresLoading] = useState(false);

  useEffect(() => {
    loadProfileRules();
    loadInterestRules();
    loadCustomFields();
    loadTrackingForms();
  }, []);

  useEffect(() => {
    if (activeTab === 'scores') {
      loadLeadScores();
    }
  }, [activeTab]);

  const loadCustomFields = async () => {
    try {
      const res = await fetch(`${API_BASE}/custom-fields`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setCustomFields(data || []);
      }
    } catch (err) {
      console.error('Erro ao carregar campos personalizados:', err);
    }
  };

  const loadTrackingForms = async () => {
    try {
      const res = await fetch(`${API_BASE}/tracking-forms`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setTrackingForms(data || []);
      }
    } catch (err) {
      console.error('Erro ao carregar formulários:', err);
    }
  };

  const loadProfileRules = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/scoring/profile-rules`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setProfileRules(data || []);
      }
    } catch (err) {
      console.error('Erro ao carregar regras de perfil:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadInterestRules = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/scoring/interest-rules`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setInterestRules(data || []);
      }
    } catch (err) {
      console.error('Erro ao carregar regras de interesse:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLeadScores = async () => {
    try {
      setScoresLoading(true);
      const res = await fetch(`${API_BASE}/scoring/leads`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setLeadScores(data || []);
      }
    } catch (err) {
      console.error('Erro ao carregar scores dos leads:', err);
    } finally {
      setScoresLoading(false);
    }
  };

  // Profile Rule CRUD
  const handleSaveProfileRule = async () => {
    if (!profileRuleForm.name) {
      alert('Nome da regra é obrigatório');
      return;
    }

    try {
      setSaving(true);
      const method = editingProfileRule ? 'PUT' : 'POST';
      const url = editingProfileRule 
        ? `${API_BASE}/scoring/profile-rules/${editingProfileRule}`
        : `${API_BASE}/scoring/profile-rules`;

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(profileRuleForm),
      });

      if (res.ok) {
        await loadProfileRules();
        setEditingProfileRule(null);
        setNewProfileRule(false);
        setProfileRuleForm({});
      }
    } catch (err) {
      console.error('Erro ao salvar regra de perfil:', err);
      alert('Erro ao salvar regra');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfileRule = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta regra?')) return;

    try {
      const res = await fetch(`${API_BASE}/scoring/profile-rules/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });

      if (res.ok) {
        await loadProfileRules();
      }
    } catch (err) {
      console.error('Erro ao excluir regra de perfil:', err);
    }
  };

  const handleAddProfileField = (ruleId: string) => {
    setProfileRules(prev => prev.map(rule => {
      if (rule.id === ruleId) {
        return {
          ...rule,
          fields: [
            ...rule.fields,
            {
              id: `temp-${Date.now()}`,
              custom_field_id: '',
              weight_percentage: 50,
              star_rating: 5,
              condition_type: 'any',
              condition_value: '',
            }
          ]
        };
      }
      return rule;
    }));
  };

  const handleUpdateProfileField = (ruleId: string, fieldId: string, updates: Partial<ProfileField>) => {
    setProfileRules(prev => prev.map(rule => {
      if (rule.id === ruleId) {
        return {
          ...rule,
          fields: rule.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f)
        };
      }
      return rule;
    }));
  };

  const handleRemoveProfileField = (ruleId: string, fieldId: string) => {
    setProfileRules(prev => prev.map(rule => {
      if (rule.id === ruleId) {
        return {
          ...rule,
          fields: rule.fields.filter(f => f.id !== fieldId)
        };
      }
      return rule;
    }));
  };

  const handleSaveProfileRuleFields = async (ruleId: string) => {
    const rule = profileRules.find(r => r.id === ruleId);
    if (!rule) return;

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/scoring/profile-rules/${ruleId}/fields`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ fields: rule.fields }),
      });

      if (res.ok) {
        await loadProfileRules();
      }
    } catch (err) {
      console.error('Erro ao salvar campos da regra:', err);
      alert('Erro ao salvar campos');
    } finally {
      setSaving(false);
    }
  };

  // Interest Rule CRUD
  const handleSaveInterestRule = async () => {
    if (!interestRuleForm.name) {
      alert('Nome da regra é obrigatório');
      return;
    }

    try {
      setSaving(true);
      const method = editingInterestRule ? 'PUT' : 'POST';
      const url = editingInterestRule 
        ? `${API_BASE}/scoring/interest-rules/${editingInterestRule}`
        : `${API_BASE}/scoring/interest-rules`;

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(interestRuleForm),
      });

      if (res.ok) {
        await loadInterestRules();
        setEditingInterestRule(null);
        setNewInterestRule(false);
        setInterestRuleForm({});
      }
    } catch (err) {
      console.error('Erro ao salvar regra de interesse:', err);
      alert('Erro ao salvar regra');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteInterestRule = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta regra?')) return;

    try {
      const res = await fetch(`${API_BASE}/scoring/interest-rules/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });

      if (res.ok) {
        await loadInterestRules();
      }
    } catch (err) {
      console.error('Erro ao excluir regra de interesse:', err);
    }
  };

  const handleAddConversion = (ruleId: string) => {
    setInterestRules(prev => prev.map(rule => {
      if (rule.id === ruleId) {
        return {
          ...rule,
          conversions: [
            ...rule.conversions,
            {
              id: `temp-${Date.now()}`,
              conversion_name: '',
              points: 10,
              event_type: 'form_submit',
              event_ids: '[]',
            }
          ]
        };
      }
      return rule;
    }));
  };

  const handleUpdateConversion = (ruleId: string, conversionId: string, updates: Partial<InterestConversion>) => {
    setInterestRules(prev => prev.map(rule => {
      if (rule.id === ruleId) {
        return {
          ...rule,
          conversions: rule.conversions.map(c => c.id === conversionId ? { ...c, ...updates } : c)
        };
      }
      return rule;
    }));
  };

  const handleRemoveConversion = (ruleId: string, conversionId: string) => {
    setInterestRules(prev => prev.map(rule => {
      if (rule.id === ruleId) {
        return {
          ...rule,
          conversions: rule.conversions.filter(c => c.id !== conversionId)
        };
      }
      return rule;
    }));
  };

  const handleSaveInterestRuleConversions = async (ruleId: string) => {
    const rule = interestRules.find(r => r.id === ruleId);
    if (!rule) return;

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/scoring/interest-rules/${ruleId}/conversions`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ conversions: rule.conversions }),
      });

      if (res.ok) {
        await loadInterestRules();
      }
    } catch (err) {
      console.error('Erro ao salvar conversões da regra:', err);
      alert('Erro ao salvar conversões');
    } finally {
      setSaving(false);
    }
  };

  const handleRecalculateScores = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/scoring/recalculate`, {
        method: 'POST',
        headers: getHeaders(),
      });

      if (res.ok) {
        await loadLeadScores();
        alert('Scores recalculados com sucesso!');
      }
    } catch (err) {
      console.error('Erro ao recalcular scores:', err);
      alert('Erro ao recalcular scores');
    } finally {
      setLoading(false);
    }
  };

  // Render Profile Tab
  const renderProfileTab = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Perfil do Lead</h2>
          <p className="text-sm text-slate-500 mt-1">
            Configure campos personalizados com pesos e pontuações por estrela
          </p>
        </div>
        <button
          onClick={() => {
            setNewProfileRule(true);
            setEditingProfileRule(null);
            setProfileRuleForm({ name: '', description: '', is_active: true, fields: [] });
          }}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
        >
          <Plus size={18} />
          <span>Nova Regra</span>
        </button>
      </div>

      {/* New Rule Form */}
      {(newProfileRule || editingProfileRule) && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            {editingProfileRule ? 'Editar Regra' : 'Nova Regra de Perfil'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Regra *</label>
              <input
                type="text"
                value={profileRuleForm.name || ''}
                onChange={(e) => setProfileRuleForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="Ex: Lead Ideal B2B"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
              <textarea
                value={profileRuleForm.description || ''}
                onChange={(e) => setProfileRuleForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                rows={2}
                placeholder="Descreva o objetivo desta regra..."
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={profileRuleForm.is_active !== false}
                onChange={(e) => setProfileRuleForm(prev => ({ ...prev, is_active: e.target.checked }))}
                className="rounded border-slate-300"
              />
              <label className="text-sm text-slate-700">Regra ativa</label>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSaveProfileRule}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
              >
                <Save size={16} />
                <span>{saving ? 'Salvando...' : 'Salvar'}</span>
              </button>
              <button
                onClick={() => {
                  setNewProfileRule(false);
                  setEditingProfileRule(null);
                  setProfileRuleForm({});
                }}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <X size={16} />
                <span>Cancelar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rules List */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Carregando...</div>
      ) : profileRules.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <Target size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">Nenhuma regra de perfil</h3>
          <p className="text-slate-500">Crie sua primeira regra para começar a pontuar leads por perfil</p>
        </div>
      ) : (
        profileRules.map(rule => (
          <div key={rule.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${rule.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <h3 className="text-lg font-semibold text-slate-900">{rule.name}</h3>
                  {rule.description && (
                    <span className="text-sm text-slate-500">— {rule.description}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingProfileRule(rule.id);
                      setNewProfileRule(false);
                      setProfileRuleForm(rule);
                    }}
                    className="p-2 text-slate-500 hover:text-teal-600 transition-colors"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteProfileRule(rule.id)}
                    className="p-2 text-slate-500 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Fields */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-700">Campos Personalizados</h4>
                  <button
                    onClick={() => handleAddProfileField(rule.id)}
                    className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700"
                  >
                    <Plus size={14} />
                    <span>Adicionar Campo</span>
                  </button>
                </div>

                {rule.fields.length === 0 ? (
                  <p className="text-sm text-slate-400 py-4 text-center">Nenhum campo adicionado</p>
                ) : (
                  <div className="space-y-2">
                    {rule.fields.map((field, idx) => (
                      <div key={field.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="md:col-span-1">
                            <label className="block text-xs font-medium text-slate-600 mb-1">Campo</label>
                            <select
                              value={field.custom_field_id}
                              onChange={(e) => handleUpdateProfileField(rule.id, field.id, { custom_field_id: e.target.value })}
                              className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                            >
                              <option value="">Selecione...</option>
                              {customFields.map(cf => (
                                <option key={cf.id} value={cf.id}>{cf.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Peso (%)</label>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={field.weight_percentage}
                              onChange={(e) => handleUpdateProfileField(rule.id, field.id, { weight_percentage: parseInt(e.target.value) || 50 })}
                              className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Estrelas (1-10)</label>
                            <StarRating
                              rating={field.star_rating}
                              onChange={(r) => handleUpdateProfileField(rule.id, field.id, { star_rating: r })}
                            />
                          </div>
                          <div className="flex items-end gap-2">
                            <button
                              onClick={() => handleRemoveProfileField(rule.id, field.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {rule.fields.length > 0 && (
                  <div className="pt-3">
                    <button
                      onClick={() => handleSaveProfileRuleFields(rule.id)}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm disabled:opacity-50"
                    >
                      <Save size={14} />
                      <span>{saving ? 'Salvando...' : 'Salvar Campos'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  // Render Interest Tab
  const renderInterestTab = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Interesse do Lead</h2>
          <p className="text-sm text-slate-500 mt-1">
            Configure conversões e quantos pontos cada ação vale
          </p>
        </div>
        <button
          onClick={() => {
            setNewInterestRule(true);
            setEditingInterestRule(null);
            setInterestRuleForm({ name: '', description: '', is_active: true, conversions: [] });
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          <span>Nova Regra</span>
        </button>
      </div>

      {/* New Rule Form */}
      {(newInterestRule || editingInterestRule) && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            {editingInterestRule ? 'Editar Regra' : 'Nova Regra de Interesse'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Regra *</label>
              <input
                type="text"
                value={interestRuleForm.name || ''}
                onChange={(e) => setInterestRuleForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: Engajamento com Conteúdo"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
              <textarea
                value={interestRuleForm.description || ''}
                onChange={(e) => setInterestRuleForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={2}
                placeholder="Descreva o objetivo desta regra..."
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={interestRuleForm.is_active !== false}
                onChange={(e) => setInterestRuleForm(prev => ({ ...prev, is_active: e.target.checked }))}
                className="rounded border-slate-300"
              />
              <label className="text-sm text-slate-700">Regra ativa</label>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSaveInterestRule}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Save size={16} />
                <span>{saving ? 'Salvando...' : 'Salvar'}</span>
              </button>
              <button
                onClick={() => {
                  setNewInterestRule(false);
                  setEditingInterestRule(null);
                  setInterestRuleForm({});
                }}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <X size={16} />
                <span>Cancelar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rules List */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Carregando...</div>
      ) : interestRules.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <Activity size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">Nenhuma regra de interesse</h3>
          <p className="text-slate-500">Crie sua primeira regra para pontuar leads por engajamento</p>
        </div>
      ) : (
        interestRules.map(rule => (
          <div key={rule.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${rule.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <h3 className="text-lg font-semibold text-slate-900">{rule.name}</h3>
                  {rule.description && (
                    <span className="text-sm text-slate-500">— {rule.description}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingInterestRule(rule.id);
                      setNewInterestRule(false);
                      setInterestRuleForm(rule);
                    }}
                    className="p-2 text-slate-500 hover:text-blue-600 transition-colors"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteInterestRule(rule.id)}
                    className="p-2 text-slate-500 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Conversions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-700">Conversões</h4>
                  <button
                    onClick={() => handleAddConversion(rule.id)}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <Plus size={14} />
                    <span>Adicionar Conversão</span>
                  </button>
                </div>

                {rule.conversions.length === 0 ? (
                  <p className="text-sm text-slate-400 py-4 text-center">Nenhuma conversão adicionada</p>
                ) : (
                  <div className="space-y-2">
                    {rule.conversions.map((conversion) => {
                      const selectedEventIds = (() => {
                        try {
                          return JSON.parse(conversion.event_ids || '[]');
                        } catch {
                          return [];
                        }
                      })();

                      return (
                        <div key={conversion.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-1">
                              <label className="block text-xs font-medium text-slate-600 mb-1">Nome da Conversão</label>
                              <input
                                type="text"
                                value={conversion.conversion_name}
                                onChange={(e) => handleUpdateConversion(rule.id, conversion.id, { conversion_name: e.target.value })}
                                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                                placeholder="Ex: Baixou E-book"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">Pontos</label>
                              <input
                                type="number"
                                min="0"
                                value={conversion.points}
                                onChange={(e) => handleUpdateConversion(rule.id, conversion.id, { points: parseInt(e.target.value) || 0 })}
                                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de Evento</label>
                              <select
                                value={conversion.event_type}
                                onChange={(e) => handleUpdateConversion(rule.id, conversion.id, { event_type: e.target.value })}
                                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                              >
                                <option value="form_submit">Formulário</option>
                                <option value="page_view">Visualização de Página</option>
                                <option value="custom_event">Evento Personalizado</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">Formulários/Eventos</label>
                              <select
                                multiple
                                value={selectedEventIds}
                                onChange={(e) => {
                                  const values = Array.from(e.target.selectedOptions, option => option.value);
                                  handleUpdateConversion(rule.id, conversion.id, { event_ids: JSON.stringify(values) });
                                }}
                                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                                size={3}
                              >
                                {trackingForms.map(form => (
                                  <option key={form.id} value={form.id}>{form.name}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="flex justify-end mt-3">
                            <button
                              onClick={() => handleRemoveConversion(rule.id, conversion.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {rule.conversions.length > 0 && (
                  <div className="pt-3">
                    <button
                      onClick={() => handleSaveInterestRuleConversions(rule.id)}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
                    >
                      <Save size={14} />
                      <span>{saving ? 'Salvando...' : 'Salvar Conversões'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  // Render Scores Tab
  const renderScoresTab = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Scores dos Leads</h2>
          <p className="text-sm text-slate-500 mt-1">
            Visualize e gerencie a pontuação de todos os leads
          </p>
        </div>
        <button
          onClick={handleRecalculateScores}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          <BarChart3 size={18} />
          <span>{loading ? 'Calculando...' : 'Recalcular Scores'}</span>
        </button>
      </div>

      {/* Score Legend */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Legenda de Grades</h3>
        <div className="flex flex-wrap gap-4">
          {['A', 'B', 'C', 'D', 'E'].map(grade => (
            <div key={grade} className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${getGradeColor(grade)}`}>
                {grade}
              </span>
              <span className="text-xs text-slate-500">
                {grade === 'A' && '≥ 80 pts (Excelente)'}
                {grade === 'B' && '≥ 60 pts (Bom)'}
                {grade === 'C' && '≥ 40 pts (Regular)'}
                {grade === 'D' && '≥ 20 pts (Fraco)'}
                {grade === 'E' && '< 20 pts (Muito Fraco)'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Scores Table */}
      {scoresLoading ? (
        <div className="text-center py-12 text-slate-500">Carregando scores...</div>
      ) : leadScores.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <Award size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">Nenhum score calculado</h3>
          <p className="text-slate-500 mb-4">Clique em "Recalcular Scores" para calcular a pontuação de todos os leads</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Lead</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Perfil</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Interesse</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {leadScores.map(lead => {
                  const total = (lead.score_profile || 0) + (lead.score_interest || 0);
                  const grade = calculateGrade(total);
                  
                  return (
                    <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{lead.title}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{lead.contact_email || '-'}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-semibold text-teal-600">{lead.score_profile?.toFixed(1) || 0}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-semibold text-blue-600">{lead.score_interest || 0}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-lg font-bold text-slate-900">{total.toFixed(1)}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${getGradeColor(grade)}`}>
                          {grade}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-6">
        <div className="flex items-center gap-3 mb-2">
          <Award size={28} className="text-teal-600" />
          <h1 className="text-3xl font-bold text-slate-900">Lead Scoring</h1>
        </div>
        <p className="text-slate-500">
          Pontue seus leads baseado em perfil e interesse, igual ao RD Marketing
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 px-8">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-4 px-2 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'border-teal-600 text-teal-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users size={18} />
            <span>Perfil</span>
          </button>
          <button
            onClick={() => setActiveTab('interest')}
            className={`py-4 px-2 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'interest'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <TrendingUp size={18} />
            <span>Interesse</span>
          </button>
          <button
            onClick={() => setActiveTab('scores')}
            className={`py-4 px-2 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'scores'
                ? 'border-purple-600 text-purple-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <BarChart3 size={18} />
            <span>Scores</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {activeTab === 'profile' && renderProfileTab()}
        {activeTab === 'interest' && renderInterestTab()}
        {activeTab === 'scores' && renderScoresTab()}
      </div>
    </div>
  );
};
