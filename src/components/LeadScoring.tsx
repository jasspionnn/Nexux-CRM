import React, { useState, useEffect } from 'react';
import { 
  Star, Plus, Trash2, Edit3, Save, X, 
  TrendingUp, Users, Target, Award,
  ChevronDown, ChevronRight, BarChart3,
  Settings, Activity, CheckCircle,
  AlertCircle, Search, Sliders, ListChecks
} from 'lucide-react';

interface CustomField {
  id: string;
  name: string;
  type: string;
  options?: string; // JSON array string of option labels
}

interface ProfileField {
  id: string;
  custom_field_id: string;
  custom_field_name?: string;
  custom_field_type?: string;
  weight_percentage: number;
  answer_scores: Record<string, any>; 
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
  points?: number; // Mock logic because we might sum or apply directly
}

const API_BASE = '/api';

const getHeaders = () => {
  const token = localStorage.getItem('crm_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

const StarRating = ({ rating, onChange, readonly = false }: { rating: number; onChange?: (r: number) => void; readonly?: boolean }) => {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className="flex gap-0.5">
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
                ? 'fill-orange-500 text-orange-500'
                : 'fill-slate-200 text-slate-200'
            }`}
          />
        </button>
      ))}
    </div>
  );
};

export const LeadScoring = () => {
  const [configMode, setConfigMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'interest'>('profile');
  const [needsApply, setNeedsApply] = useState(false);
  const [applying, setApplying] = useState(false);
  const [loading, setLoading] = useState(false);

  // States
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [trackingForms, setTrackingForms] = useState<any[]>([]);

  // We map RD Station "Profile" as the FIRST rule in profileRules
  const [profileRules, setProfileRules] = useState<ProfileRule[]>([]);
  
  // Modals
  const [propertyModal, setPropertyModal] = useState<{ isOpen: boolean; fieldId?: string } | null>(null);
  const [propertyForm, setPropertyForm] = useState<any>(null);

  const [interestRules, setInterestRules] = useState<InterestRule[]>([]);
  const [groupModal, setGroupModal] = useState<{ isOpen: boolean; ruleId?: string } | null>(null);
  const [groupForm, setGroupForm] = useState<any>(null);

  // New Dashboard States
  const [dashboardStats, setDashboardStats] = useState<{ total: number; grades: Record<string, number>; avgInterest: number; loaded: boolean }>({ 
    total: 0, 
    grades: { 'A': 0, 'B': 0, 'C': 0, 'D': 0 }, 
    avgInterest: 0, 
    loaded: false 
  });


  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([
      loadCustomFields(),
      loadProfileRules(),
      loadInterestRules(),
      loadTrackingForms(),
      loadDashboardStats()
    ]);
    setLoading(false);
  };

  const loadDashboardStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/scoring/stats`, { headers: getHeaders() });
      if (res.ok) {
        const rows = await res.json();
        let total = 0;
        let sumInterestAvg = 0;
        let grades: any = { 'A': 0, 'B': 0, 'C': 0, 'D': 0 };
        
        rows.forEach((r: any) => {
          const g = r.score_grade || 'D';
          const cnt = Number(r.total) || 0;
          grades[g] = (grades[g] || 0) + cnt;
          total += cnt;
          sumInterestAvg += (Number(r.avg_interest) || 0) * cnt;
        });

        const avgInterest = total > 0 ? Math.round(sumInterestAvg / total) : 0;
        setDashboardStats({ total, grades, avgInterest, loaded: true });
      }
    } catch (err) {}
  };

  const loadCustomFields = async () => {
    try {
      const res = await fetch(`${API_BASE}/custom-fields`, { headers: getHeaders() });
      if (res.ok) setCustomFields(await res.json() || []);
    } catch (err) {}
  };

  const loadTrackingForms = async () => {
    try {
      const res = await fetch(`${API_BASE}/tracking-forms`, { headers: getHeaders() });
      if (res.ok) setTrackingForms(await res.json() || []);
    } catch (err) {}
  };

  const loadProfileRules = async () => {
    try {
      const res = await fetch(`${API_BASE}/scoring/profile-rules`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        // Force at least 1 default profile rule if empty
        if (data && data.length === 0) {
          await createDefaultProfileRule();
        } else {
          setProfileRules(data || []);
        }
      } else {
        alert("Erro no servidor ao carregar regras. Pode ser que falte tabelas no BD da nuvem.");
      }
    } catch (err) {}
  };

  const createDefaultProfileRule = async () => {
    try {
      const res = await fetch(`${API_BASE}/scoring/profile-rules`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ name: 'Perfil Padrão', description: 'Regulador master de perfil', is_active: true })
      });
      if (res.ok) {
        const nr = await res.json();
        setProfileRules([nr]);
      }
    } catch (err) {}
  };

  const loadInterestRules = async () => {
    try {
      const res = await fetch(`${API_BASE}/scoring/interest-rules`, { headers: getHeaders() });
      if (res.ok) setInterestRules(await res.json() || []);
    } catch (err) {}
  };

  const currentProfileRule = profileRules[0]; // RD relies on single profile mapping space

  const handleApplyChanges = async () => {
    setApplying(true);
    try {
      // First save the profile fields mapping
      if (currentProfileRule) {
        await fetch(`${API_BASE}/scoring/profile-rules/${currentProfileRule.id}/fields`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ fields: currentProfileRule.fields }),
        });
      }
      // Trigger recalculation (which applies setting to all leads)
      await fetch(`${API_BASE}/scoring/recalculate`, {
        method: 'POST',
        headers: getHeaders()
      });
      setNeedsApply(false);
      alert('Alterações aplicadas com sucesso a toda a Base de Leads!');
    } catch (err) {
      alert('Erro ao aplicar alterações.');
    } finally {
      setApplying(false);
    }
  };

  // ------------------- PROFILE MODAL -------------------
  
  const openPropertyModal = (cf: CustomField) => {
    // find if existing field
    const ext = currentProfileRule?.fields.find(f => f.custom_field_id === cf.id);
    let terms: any[] = [];
    let method = 'exact';
    let weight = 50;

    if (ext) {
      weight = ext.weight_percentage;
      method = ext.answer_scores?.__method__ || 'exact';
      
      // parse terms
      Object.keys(ext.answer_scores || {}).forEach(k => {
        if (k !== '__method__') {
          terms.push({ term: k, stars: ext.answer_scores[k] });
        }
      });
    } else {
      // auto populate if options exist
      if (cf.options) {
        try {
          const parsed = JSON.parse(cf.options);
          const opts = Array.isArray(parsed) ? parsed : (typeof parsed === 'string' ? parsed.split(',').map((o: string) => o.trim()) : []);
          terms = opts.map(o => ({ term: o, stars: 5 }));
        } catch {}
      }
    }

    if (terms.length === 0) terms.push({ term: '', stars: 5 });

    setPropertyForm({
      fieldId: cf.id,
      name: cf.name,
      weight,
      search_method: method,
      terms
    });
    setPropertyModal({ isOpen: true, fieldId: cf.id });
  };

  const handleSaveProperty = () => {
    if (!currentProfileRule) {
      alert('Erro Crítico: O banco de dados não encontrou a regra de Perfil. Você atualizou o banco de dados via d1 execute na nuvem? As tabelas de regras podem estar faltando no Cloudflare.');
      setPropertyModal(null);
      return;
    }
    if (!propertyForm) return;

    const answer_scores: any = { __method__: propertyForm.search_method };
    propertyForm.terms.forEach((t: any) => {
      if (t.term.trim()) answer_scores[t.term.trim()] = t.stars;
    });

    const newField: ProfileField = {
      id: propertyModal?.fieldId || `temp-${Date.now()}`,
      custom_field_id: propertyForm.fieldId,
      custom_field_name: propertyForm.name,
      weight_percentage: propertyForm.weight,
      answer_scores
    };

    setProfileRules(prev => prev.map(rule => {
      if (rule.id === currentProfileRule.id) {
        const exists = rule.fields.findIndex(f => f.custom_field_id === newField.custom_field_id);
        const newFields = [...rule.fields];
        if (exists >= 0) newFields[exists] = newField;
        else newFields.push(newField);
        return { ...rule, fields: newFields };
      }
      return rule;
    }));

    setNeedsApply(true);
    setPropertyModal(null);
  };

  const handleDeleteProperty = (fieldId: string) => {
    if (!currentProfileRule) return;
    setProfileRules(prev => prev.map(r => ({
      ...r,
      fields: r.fields.filter(f => f.id !== fieldId && f.custom_field_id !== fieldId)
    })));
    setNeedsApply(true);
  };

  // ------------------- INTEREST MODAL -------------------
  
  const openGroupModal = (rule?: InterestRule) => {
    if (rule) {
      setGroupForm({
        id: rule.id,
        name: rule.name,
        points: rule.conversions?.[0]?.points || 10,
        conversions: rule.conversions || []
      });
    } else {
      setGroupForm({
        name: '',
        points: 20,
        conversions: []
      });
    }
    setGroupModal({ isOpen: true, ruleId: rule?.id });
  };

  const handleSaveGroup = async () => {
    if (!groupForm?.name) return;
    try {
      const isEdit = !!groupModal?.ruleId;
      const url = isEdit ? `${API_BASE}/scoring/interest-rules/${groupModal.ruleId}` : `${API_BASE}/scoring/interest-rules`;
      const rulePayload = {
        name: groupForm.name,
        description: 'Grupo de Atividades',
        is_active: true
      };

      let ruleId = groupModal?.ruleId;
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: getHeaders(),
        body: JSON.stringify(rulePayload)
      });
      if (!isEdit && res.ok) {
        const created = await res.json();
        ruleId = created.id;
      }

      if (ruleId) {
        // Sync conversions (all get the group's points)
        const conversionsToSave = groupForm.conversions.map((c: any) => ({
          ...c,
          points: groupForm.points
        }));

        await fetch(`${API_BASE}/scoring/interest-rules/${ruleId}/conversions`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ conversions: conversionsToSave })
        });
      }

      await loadInterestRules();
      setNeedsApply(true);
      setGroupModal(null);
    } catch (err) {}
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm('Excluir este grupo?')) return;
    try {
      await fetch(`${API_BASE}/scoring/interest-rules/${id}`, { method: 'DELETE', headers: getHeaders() });
      await loadInterestRules();
      setNeedsApply(true);
    } catch (err) {}
  };


  // ----------------------- RENDER -----------------------
  try {
    if (!configMode) {
      // Show dashboard if we have any profile rules or if stats are loaded.
      const showDashboard = (profileRules && profileRules.length > 0) || (dashboardStats && dashboardStats.loaded);
      
      // Extremely safe predominant grade calculation
      let predominantGrade = 'A';
      try {
        if (dashboardStats && dashboardStats.grades) {
          const keys = Object.keys(dashboardStats.grades);
          if (keys.length > 0) {
            predominantGrade = keys.reduce((a, b) => (dashboardStats.grades[a] || 0) > (dashboardStats.grades[b] || 0) ? a : b, 'A');
          }
        }
      } catch (e) { console.error('Grade calc error:', e); }

      return (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-[#F8FAFC]">
          {needsApply && (
            <div className="bg-yellow-50 border border-yellow-200 p-6 m-8 rounded-lg shadow-sm text-center">
              <p className="text-slate-800 font-medium mb-1">Você possui alterações nas configurações do Lead Scoring que ainda não foram aplicadas.</p>
              <p className="text-slate-800 font-medium mb-3">Deseja aplicar essas alterações agora?</p>
              <button 
                onClick={handleApplyChanges}
                disabled={applying}
                className="bg-[#F5A623] hover:bg-[#E59613] text-white px-6 py-2 rounded font-medium disabled:opacity-50"
              >
                {applying ? 'Aplicando...' : 'Aplicar alterações'}
              </button>
              <p className="text-slate-500 text-sm mt-3">A atualização completa da sua Base de Leads pode demorar alguns minutos.</p>
            </div>
          )}

          {showDashboard ? (
            <div className="flex-1 w-full max-w-5xl mx-auto p-8 overflow-y-auto">
               <div className="flex justify-between items-end mb-8">
                 <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Dashboard de Qualificação</h2>
                    <p className="text-slate-500 mt-1">Análise em tempo real do seu funil e perfis de Lead.</p>
                 </div>
                 <button onClick={() => setConfigMode(true)} className="flex items-center gap-2 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-500 text-slate-700 px-4 py-2 rounded-md shadow-sm font-medium transition-all">
                   <Settings size={18} /> Configurar Regras
                 </button>
               </div>

               <div className="grid grid-cols-3 gap-6 mb-8">
                  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                     <div className="flex items-center gap-3 mb-2 text-slate-500 font-medium">
                        <Users size={20} className="text-blue-500" /> Total Qualificados
                     </div>
                     <div className="text-4xl font-bold text-slate-800 tracking-tight">{dashboardStats?.total || 0}</div>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                     <div className="flex items-center gap-3 mb-2 text-slate-500 font-medium">
                        <TrendingUp size={20} className="text-emerald-500" /> Perfil Predominante
                     </div>
                     <div className="text-4xl font-bold text-slate-800 flex items-center gap-2 tracking-tight">
                       Grade {predominantGrade}
                     </div>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                     <div className="flex items-center gap-3 mb-2 text-slate-500 font-medium">
                        <Activity size={20} className="text-orange-500" /> Média de Interesse
                     </div>
                     <div className="text-4xl font-bold text-slate-800 tracking-tight">{dashboardStats?.avgInterest || 0} <span className="text-base text-slate-400 font-normal">pontos</span></div>
                  </div>
               </div>

               <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
                 <h3 className="text-lg font-bold text-slate-800 mb-6">Distribuição por Perfil de Qualificação</h3>
                 <div className="space-y-6">
                   {['A', 'B', 'C', 'D'].map(grade => {
                     const count = (dashboardStats?.grades && dashboardStats.grades[grade]) || 0;
                     const totalLeads = dashboardStats?.total || 0;
                     const pct = totalLeads > 0 ? (count / totalLeads) * 100 : 0;
                     const colors: any = {
                       'A': 'bg-emerald-500',
                       'B': 'bg-blue-500',
                       'C': 'bg-yellow-400',
                       'D': 'bg-orange-500'
                     };
                     
                     return (
                       <div key={grade} className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center font-bold text-slate-700 text-lg shadow-inner">{grade}</div>
                         <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden flex shadow-inner border border-slate-200/50">
                           <div className={`h-full ${colors[grade] || 'bg-slate-300'} transition-all duration-1000 ease-out`} style={{width: `${pct}%`}}></div>
                         </div>
                         <div className="w-16 text-right font-bold text-slate-700 text-lg">{count}</div>
                         <div className="w-16 text-right text-sm font-medium text-slate-400">{pct.toFixed(1)}%</div>
                       </div>
                     );
                   })}
                 </div>
               </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center -mt-16 text-center px-4">
              <div className="w-48 h-48 mb-6 relative">
                <div className="absolute inset-0 border-4 border-blue-100 rounded-full animate-pulse" />
                <div className="absolute inset-2 border-4 border-blue-200 rounded-full" />
                <div className="absolute inset-0 flex items-center justify-center text-blue-500">
                  <Users size={80} strokeWidth={1} />
                </div>
              </div>
              
              <h2 className="text-3xl font-black text-slate-800 mb-2">Configure seu Lead Scoring</h2>
              <p className="text-slate-500 mb-8 max-w-md">
                Ainda não detectamos regras configuradas. Defina os critérios de Perfil e Interesse para começar a qualificar seus leads.
              </p>

              <div className="flex gap-4">
                <button 
                  onClick={() => setConfigMode(true)} 
                  className="px-8 py-3 bg-[#2E9CFF] hover:bg-blue-600 text-white rounded-lg font-bold shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
                >
                  <Plus size={20} /> Começar agora
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }
  } catch (err: any) {
    return (
      <div className="p-20 text-center">
        <div className="bg-red-50 border border-red-100 p-8 rounded-2xl max-w-xl mx-auto">
          <h2 className="text-red-600 font-black text-2xl mb-4">Erro no Dashboard</h2>
          <div className="bg-white p-4 rounded-lg border border-red-100 text-left overflow-auto max-h-40 mb-6">
            <code className="text-xs text-red-500">{err.stack || err.message}</code>
          </div>
          <button onClick={() => window.location.reload()} className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold">Recarregar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F4F7FA] p-8">
      {/* HEADER TABS */}
      <div className="max-w-5xl mx-auto mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-6">Lead Scoring</h1>
        
        {needsApply && (
          <div className="bg-yellow-50 border border-yellow-200 p-6 mb-8 rounded-lg shadow-sm text-center relative">
            <button onClick={() => setConfigMode(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20}/></button>
            <p className="text-slate-800 mb-3">Você possui alterações nas configurações do Lead Scoring que ainda não foram aplicadas.</p>
            <button onClick={handleApplyChanges} disabled={applying} className="bg-[#F5A623] hover:bg-[#E59613] text-white px-6 py-2 rounded font-medium disabled:opacity-50">
              {applying ? 'Aplicando...' : 'Aplicar alterações'}
            </button>
          </div>
        )}

        <div className="flex w-64 bg-white border border-slate-200 rounded overflow-hidden shadow-sm">
          <button 
            className={`flex-1 py-3 text-sm font-semibold text-center ${activeTab === 'profile' ? 'bg-[#2E9CFF] text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            onClick={() => setActiveTab('profile')}
            style={{ clipPath: activeTab === 'profile' ? 'polygon(0 0, 100% 0, 90% 100%, 0 100%)' : 'none' }}
          >
            Perfil
          </button>
          <button 
            className={`flex-1 py-3 text-sm font-semibold text-center ${activeTab === 'interest' ? 'bg-[#2E9CFF] text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            onClick={() => setActiveTab('interest')}
            style={{ marginLeft: activeTab === 'profile' ? '-10%' : '0', clipPath: activeTab === 'interest' ? 'polygon(10% 0, 100% 0, 100% 100%, 0 100%)' : 'none', paddingLeft: activeTab === 'interest' ? '10%' : '0' }}
          >
            Interesse
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto flex gap-8">
        
        {/* LEFTSIDE INFO */}
        <div className="w-1/3 pt-4">
          {activeTab === 'profile' ? (
            <>
              <p className="text-slate-500 text-sm leading-relaxed mb-4">
                O perfil do Lead determina o quão próximo ele está do seu cliente ideal. Use as propriedades de seus leads para cruzar e definir pesos.
              </p>
              <p className="text-slate-500 text-sm leading-relaxed">
                Adicione propriedades, termos específicos de preenchimento, e determine notas baseadas na qualificação desses campos.
              </p>
            </>
          ) : (
            <>
              <p className="text-slate-500 text-sm leading-relaxed mb-4">
                Toda vez que um Lead baixa determinado conteúdo de sua empresa, preenche um formulário ou completa um evento de rastreio, é possível adicionar um valor ao seu score e, dessa forma, medir o quanto esse Lead está interessado no seu produto ou serviço.
              </p>
              <p className="text-slate-500 text-sm leading-relaxed">
                Crie os grupos com as atividades de conversão que possuem o mesmo valor. Toda vez que seu Lead efetuar alguma dessas atividades do grupo, um valor é acrescido à pontuação de interesse.
              </p>
            </>
          )}
        </div>

        {/* RIGHTSIDE LISTS */}
        <div className="w-2/3 bg-white border border-slate-200 rounded-lg shadow-sm">
          {/* PROFILE VIEW */}
          {activeTab === 'profile' && (
            <div>
              <div className="p-4 bg-slate-50 border-b border-slate-200 font-medium text-slate-600">
                Propriedades avaliadas
              </div>
              <div className="p-0">
                {currentProfileRule?.fields.map(field => (
                  <div key={field.id} className="flex items-center justify-between p-4 border-b border-slate-100 hover:bg-slate-50 group">
                    <div className="flex items-center gap-3">
                      <Target className="text-blue-400" size={20} />
                      <span className="text-slate-700 font-medium">{field.custom_field_name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-slate-400">Peso: {field.weight_percentage}%</span>
                      <button onClick={() => openPropertyModal(customFields.find(c => c.id === field.custom_field_id)!)} className="text-blue-500 text-sm font-medium border border-blue-200 bg-white px-3 py-1 rounded shadow-sm hover:bg-blue-50">
                        Editar
                      </button>
                      <button onClick={() => handleDeleteProperty(field.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                    </div>
                  </div>
                ))}
                
                <div className="p-4 border-t border-slate-100">
                  <div className="relative inline-block w-full">
                    <select 
                      onChange={e => {
                        const cf = customFields.find(c => c.id === e.target.value);
                        if (cf) {
                          openPropertyModal(cf);
                          e.target.value = "";
                        }
                      }}
                      className="w-full opacity-0 absolute top-0 left-0 h-full cursor-pointer z-10"
                    >
                      <option value="">Selecione...</option>
                      {customFields.filter(cf => !currentProfileRule?.fields.find(f => f.custom_field_id === cf.id)).map(cf => (
                        <option key={cf.id} value={cf.id}>{cf.name}</option>
                      ))}
                    </select>
                    <button className="flex items-center gap-2 text-blue-500 font-medium hover:underline focus:outline-none relative z-0 pointer-events-none">
                      <Plus size={18} /> Adicionar propriedade
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* INTEREST VIEW */}
          {activeTab === 'interest' && (
            <div>
              <div className="p-4 bg-slate-50 border-b border-slate-200 font-medium text-slate-600 flex justify-between">
                <span>Grupos de atividade</span>
              </div>
              <div className="p-0">
                {interestRules.map(rule => (
                  <div key={rule.id} className="flex items-center justify-between p-4 border-b border-slate-100 hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-400">
                        <ListChecks size={16} />
                      </div>
                      <span className="text-slate-700 font-medium">{rule.name}</span>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className="text-slate-600 font-medium">{rule.conversions?.[0]?.points || 0} <span className="text-xs font-normal text-slate-400">pontos</span></span>
                      
                      <div className="flex items-center gap-0 border border-blue-300 rounded shadow-sm text-sm">
                        <button onClick={() => openGroupModal(rule)} className="px-3 py-1.5 text-blue-500 hover:bg-blue-50 font-medium border-r border-blue-200">
                          Editar
                        </button>
                        <button onClick={() => handleDeleteGroup(rule.id)} className="px-2 py-1.5 text-blue-500 hover:bg-blue-50">
                          <ChevronDown size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="p-4">
                  <button onClick={() => openGroupModal()} className="flex items-center gap-2 text-blue-500 font-medium hover:underline focus:outline-none">
                    <Plus size={18} /> Adicionar grupo
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PROPERTY MODAL */}
      {propertyModal?.isOpen && propertyForm && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-md shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h3 className="text-lg font-medium text-slate-800">Propriedade {propertyForm.name}*</h3>
              <button onClick={() => setPropertyModal(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-8">
                 <h4 className="font-semibold text-slate-800 text-[15px] mb-3">Método de busca do termo na propriedade</h4>
                 <div className="space-y-4 text-sm">
                   <label className="flex items-start gap-2 cursor-pointer">
                     <input type="radio" className="mt-1 w-4 h-4 text-[#2E9CFF] focus:ring-[#2E9CFF]" 
                            checked={propertyForm.search_method === 'contains'} 
                            onChange={() => setPropertyForm({...propertyForm, search_method: 'contains'})} />
                     <div>
                        <span className="font-medium text-slate-800">Contém</span>
                        <p className="text-slate-500 mt-1">Exemplo: o termo "Diretor" é encontrado no caso da propriedade ser preenchida com "Diretor de Marketing".</p>
                     </div>
                   </label>
                   <label className="flex items-start gap-2 cursor-pointer">
                     <input type="radio" className="mt-1 w-4 h-4 text-[#2E9CFF] focus:ring-[#2E9CFF]" 
                            checked={propertyForm.search_method === 'exact'} 
                            onChange={() => setPropertyForm({...propertyForm, search_method: 'exact'})} />
                     <div>
                        <span className="font-medium text-slate-800">Exato (é igual)</span>
                        <p className="text-slate-500 mt-1">Exemplo: o termo "Diretor" somente é encontrado no caso da propriedade ser preenchida exatamente da mesma forma.</p>
                     </div>
                   </label>
                 </div>
              </div>

              <div>
                 <div className="flex items-center justify-between mb-4">
                   <h4 className="font-semibold text-slate-800 text-[15px]">Adicione termos e atribua uma nota para cada um deles.</h4>
                   <div className="flex items-center gap-2">
                     <span className="text-xs text-slate-500 font-medium">Peso:</span>
                     <input type="number" min="1" max="100" value={propertyForm.weight} 
                            onChange={e => setPropertyForm({...propertyForm, weight: Number(e.target.value)})} 
                            className="w-16 px-2 py-1 text-right border border-slate-300 rounded text-sm"/>
                     <span className="text-xs text-slate-500">%</span>
                   </div>
                 </div>
                 
                 <div className="border border-slate-200 rounded overflow-hidden">
                   {propertyForm.terms.map((t: any, idx: number) => (
                     <div key={idx} className="flex items-center p-3 border-b border-slate-200 last:border-0 bg-white">
                       <input 
                         type="text" 
                         value={t.term} 
                         onChange={e => {
                           const newT = [...propertyForm.terms];
                           newT[idx].term = e.target.value;
                           setPropertyForm({...propertyForm, terms: newT});
                         }} 
                         className="flex-1 max-w-[200px] px-3 py-2 border border-slate-300 rounded text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                         placeholder="Exemplo..." 
                       />
                       
                       <div className="flex-1 flex justify-center ml-2">
                         <StarRating 
                           rating={t.stars} 
                           onChange={r => {
                             const newT = [...propertyForm.terms];
                             newT[idx].stars = r;
                             setPropertyForm({...propertyForm, terms: newT});
                           }} 
                         />
                       </div>

                       <div className="flex items-center gap-3 w-20 justify-end">
                         <div className="bg-slate-100 border border-slate-200 px-3 py-1.5 rounded text-sm text-slate-700 font-medium text-center shadow-inner">
                           {t.stars}
                         </div>
                         <button onClick={() => {
                           const newT = [...propertyForm.terms];
                           newT.splice(idx, 1);
                           setPropertyForm({...propertyForm, terms: newT});
                         }} className="text-blue-500 hover:text-red-500"><Trash2 size={16}/></button>
                       </div>
                     </div>
                   ))}
                 </div>
                 
                 <div className="mt-4 border border-dashed border-slate-300 rounded p-2 text-center hover:bg-slate-50 cursor-pointer text-sm text-[#2E9CFF] font-medium"
                      onClick={() => setPropertyForm({...propertyForm, terms: [...propertyForm.terms, {term: '', stars: 5}]})}>
                   + Adicionar termo
                 </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 rounded-b-md">
              <button onClick={() => setPropertyModal(null)} className="px-4 py-2 text-[15px] text-[#2E9CFF] hover:underline">Cancelar</button>
              <button onClick={handleSaveProperty} className="px-6 py-2 bg-[#4fb2ff] text-white text-[15px] font-medium rounded hover:bg-blue-500 shadow-sm">
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INTEREST GROUP MODAL */}
      {groupModal?.isOpen && groupForm && (
        <div className="fixed inset-0 bg-slate-900/50 flex justify-center items-start pt-20 z-50 p-4">
          <div className="bg-white rounded-md shadow-xl w-full max-w-[600px] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h3 className="text-xl font-medium text-slate-800">Adicionar grupo de atividades</h3>
              <button onClick={() => setGroupModal(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>

            <div className="p-6">
              <div className="flex gap-6 mb-6">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-[#1a2e44] mb-2">Nome do grupo</label>
                  <input 
                    type="text" 
                    value={groupForm.name} 
                    onChange={e => setGroupForm({...groupForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#2E9CFF] focus:ring-1 focus:ring-[#2E9CFF]" 
                    placeholder="Conversões topo de funil"
                  />
                </div>
                <div className="w-32">
                  <label className="block text-sm font-bold text-[#1a2e44] mb-2">Pontuação</label>
                  <div className="flex rounded border border-slate-300 overflow-hidden focus-within:border-[#2E9CFF] focus-within:ring-1 focus-within:ring-[#2E9CFF]">
                    <input 
                      type="number" 
                      value={groupForm.points}
                      onChange={e => setGroupForm({...groupForm, points: Number(e.target.value)})}
                      className="w-full px-3 py-2 text-center border-none focus:ring-0" 
                    />
                    <div className="bg-slate-100 flex items-center px-3 border-l border-slate-300 text-sm text-slate-600">
                      pontos
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 items-start mb-4">
                <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center text-blue-400 shrink-0 mt-1">
                  <ListChecks size={24} />
                </div>
                <div>
                  <h4 className="text-[17px] font-bold text-[#1a2e44]">Atividades de Conversão</h4>
                  <p className="text-[#6c7b8d] text-base mt-2">Landing Pages, formulários integrados</p>
                  
                  <div className="mt-4 relative">
                    <button className="bg-[#4fb2ff] hover:bg-blue-500 text-white px-5 py-2.5 rounded font-medium text-[15px] shadow-sm flex items-center gap-2">
                       Adicionar atividade
                       {/* Input invisível para dropdown improvisado */}
                       <select 
                         className="absolute inset-0 opacity-0 cursor-pointer"
                         onChange={e => {
                           const val = e.target.value;
                           if (!val) return;
                           const [type, id, name] = val.split('|');
                           if (!groupForm.conversions.some((c: any) => c.conversion_name === name)) {
                             setGroupForm({
                               ...groupForm,
                               conversions: [...groupForm.conversions, {
                                 id: `temp-${Date.now()}`,
                                 conversion_name: name,
                                 event_type: type,
                                 event_ids: JSON.stringify([id])
                               }]
                             });
                           }
                           e.target.value = '';
                         }}
                       >
                         <option value="">Selecione...</option>
                         <optgroup label="Formulários">
                           {trackingForms.map(f => (
                             <option key={f.id} value={`form_submit|${f.id}|Formulário: ${f.name}`}>{f.name}</option>
                           ))}
                         </optgroup>
                       </select>
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-[#6c7b8d] text-sm leading-relaxed mt-6">
                Adicione os eventos que farão parte deste grupo. O valor definido acima será atribuído à pontuação de interesse do Lead no caso de o mesmo converter em algum evento deste grupo.
              </p>

              {groupForm.conversions.length > 0 && (
                <div className="mt-8">
                  <h4 className="text-base font-bold text-[#1a2e44] border-b border-slate-200 pb-2 mb-4">
                    Lista de eventos de conversão do grupo
                  </h4>
                  <div className="space-y-4">
                    {groupForm.conversions.map((conv: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between group border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                        <span className="font-bold text-[#1a2e44] text-[15px]">{conv.conversion_name}</span>
                        <button onClick={() => {
                          const newC = [...groupForm.conversions];
                          newC.splice(idx, 1);
                          setGroupForm({...groupForm, conversions: newC});
                        }} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 size={18}/>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 rounded-b-md">
              <button onClick={() => setGroupModal(null)} className="px-5 py-2 text-[15px] text-[#2E9CFF] hover:underline">Cancelar</button>
              <button onClick={handleSaveGroup} className="px-6 py-2 bg-[#4fb2ff] text-white text-[15px] font-medium rounded hover:bg-blue-500 shadow-sm">
                Salvar e fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
