
import React, { useState, useMemo } from 'react';
import { useCRM } from '../context/CRMContext';
import { 
  Plus, Building, Layers, SlidersHorizontal, Trash2, 
  Check, Shield, Loader2, Lock, Eye, Users2, ShieldAlert, 
  Save, Search, User as UserIcon, Mail, ShieldCheck, 
  Star, UserPlus, X, Briefcase, DollarSign, ChevronRight, CreditCard, Edit3, Target, 
  MoreVertical, HelpCircle, ChevronDown, ChevronUp, GripVertical, AlertCircle
} from 'lucide-react';
import { VisibilityLevel, UserRole, User, Team, Funnel, Stage, CustomFieldDefinition } from '../types';

type SettingsTab = 'pipeline' | 'fields' | 'access' | 'billing';

export const Settings = () => {
  const { 
    funnels, users, currentUser, currentAccount, 
    updateVisibilitySettings, updateUser, teams, 
    addUser, addTeam, updateTeam, deleteTeam, deleteUser,
    addFunnel, updateFunnel, deleteFunnel, addStage, updateStage, deleteStage, reorderStages,
    customFields, addCustomField, deleteCustomField
  } = useCRM();
  
  const [activeTab, setActiveTab] = useState<SettingsTab>('access');
  const [userSearch, setUserSearch] = useState('');
  
  // Modals / Selection States
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isFunnelModalOpen, setIsFunnelModalOpen] = useState(false);
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>(funnels[0]?.id || '');

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
      u.email.toLowerCase().includes(userSearch.toLowerCase())
    );
  }, [users, userSearch]);

  const selectedFunnel = useMemo(() => 
    funnels.find(f => f.id === (selectedFunnelId || funnels[0]?.id)),
    [funnels, selectedFunnelId]
  );

  const getVisibilityLabel = (level: VisibilityLevel) => {
    if (level === 'public') return 'Geral';
    if (level === 'team') return 'Equipe';
    return 'Próprio';
  };

  const STAGE_COLORS = [
      'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-gray-500'
  ];

  return (
    <div className="p-8 h-full flex flex-col bg-white animate-fade-in relative overflow-hidden">
      
      {/* NAVEGAÇÃO SUPERIOR */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div className="flex bg-gray-100/50 rounded-xl p-1 border border-gray-200 overflow-x-auto max-w-full">
            {[
              { id: 'access', label: 'Equipes e Acessos', icon: ShieldCheck },
              { id: 'pipeline', label: 'Funis de Vendas', icon: Layers },
              { id: 'fields', label: 'Campos', icon: SlidersHorizontal },
              { id: 'billing', label: 'Plano', icon: CreditCard },
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <tab.icon size={16} /> {tab.label}
              </button>
            ))}
        </div>
        
        {activeTab === 'access' && (
            <button onClick={() => setIsUserModalOpen(true)} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-sm">
                <Plus size={18} /> Novo Usuário
            </button>
        )}
        {activeTab === 'pipeline' && (
            <button onClick={() => setIsFunnelModalOpen(true)} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-sm">
                <Plus size={18} /> Novo Funil
            </button>
        )}
        {activeTab === 'fields' && (
            <button onClick={() => setIsFieldModalOpen(true)} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-sm">
                <Plus size={18} /> Novo Campo
            </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        
        {/* ABA: ACESSOS (ESTILO RD CRM) */}
        {activeTab === 'access' && (
          <div className="space-y-10 pb-12">
            <div className="bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider w-16">Foto</th>
                      <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nome e E-mail</th>
                      <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Perfil</th>
                      <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        <div className="flex items-center gap-1">Visibilidade <HelpCircle size={14} className="text-gray-300" /></div>
                      </th>
                      <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Último Acesso</th>
                      <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-4 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredUsers.map(user => (
                      <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-4 py-6">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 text-gray-500 font-bold text-sm shadow-sm">
                                {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                        </td>
                        <td className="px-4 py-6">
                          <div>
                            <div className="text-sm font-bold text-gray-800">{user.name}</div>
                            <div className="text-xs text-gray-400 font-medium">{user.email}</div>
                          </div>
                        </td>
                        <td className="px-4 py-6">
                          <div className="relative inline-block w-full max-w-[180px]">
                            <select 
                                value={user.role}
                                disabled={user.id === currentUser?.id}
                                onChange={(e) => updateUser(user.id, { role: e.target.value as UserRole })}
                                className="appearance-none w-full bg-white border-b border-transparent hover:border-gray-200 text-sm font-medium text-gray-700 py-1.5 pr-8 outline-none cursor-pointer transition-all disabled:opacity-50"
                            >
                                <option value={UserRole.USER}>Vendedor</option>
                                <option value={UserRole.ACCOUNT_ADMIN}>Administrador</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          </div>
                        </td>
                        <td className="px-4 py-6">
                           <div className="flex gap-8">
                                <div>
                                    <div className="text-[10px] font-bold text-gray-900 mb-0.5">Negociações</div>
                                    <div className="text-xs text-gray-400 font-medium">{getVisibilityLabel(currentAccount?.visibilityConfig?.level || 'public')}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold text-gray-900 mb-0.5">Empresas</div>
                                    <div className="text-xs text-gray-400 font-medium">{getVisibilityLabel(currentAccount?.visibilityConfig?.level || 'public')}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold text-gray-900 mb-0.5">Contatos</div>
                                    <div className="text-xs text-gray-400 font-medium">{getVisibilityLabel(currentAccount?.visibilityConfig?.level || 'public')}</div>
                                </div>
                           </div>
                        </td>
                        <td className="px-4 py-6">
                          <div className="text-xs text-gray-600 font-medium">
                            {user.lastLogin ? (
                                <>
                                    <div>{new Date(user.lastLogin).toLocaleDateString()}</div>
                                    <div className="text-gray-400">{new Date(user.lastLogin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                </>
                            ) : '---'}
                          </div>
                        </td>
                        <td className="px-4 py-6">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-tight ${user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                {user.status === 'active' ? 'Ativo' : 'Inativo'}
                            </span>
                        </td>
                        <td className="px-4 py-6 text-right">
                             <button className="p-2 text-gray-300 hover:text-blue-600 transition-colors"><MoreVertical size={18} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="pt-10 border-t border-gray-100">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Equipes e Metas</h3>
                        <p className="text-sm text-gray-500">Agrupe seus vendedores e defina objetivos.</p>
                    </div>
                    <button onClick={() => setIsTeamModalOpen(true)} className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:underline"><Plus size={16} /> Criar Equipe</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {teams.map(team => (
                        <div key={team.id} className="p-6 rounded-xl border border-gray-100 bg-gray-50/30 group relative hover:border-blue-200 hover:bg-white transition-all shadow-sm">
                            <div className="mb-4">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Nome do Time</label>
                                <input value={team.name} onChange={(e) => updateTeam(team.id, { name: e.target.value })} className="bg-transparent font-bold text-gray-800 border-b border-transparent hover:border-gray-200 focus:border-blue-500 outline-none w-full py-1 text-sm" />
                            </div>
                            <div className="mb-4">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Meta Mensal</label>
                                <div className="flex items-center gap-1">
                                    <span className="text-xs font-bold text-gray-400">R$</span>
                                    <input type="number" value={team.goal} onChange={(e) => updateTeam(team.id, { goal: Number(e.target.value) })} className="bg-transparent font-black text-lg border-b border-transparent hover:border-gray-200 focus:border-blue-500 outline-none w-full py-1 text-blue-600" />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                                <div className="flex -space-x-2">{users.filter(u => u.teamId === team.id).slice(0, 3).map(u => (<div key={u.id} className="w-7 h-7 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-blue-700">{u.name[0]}</div>))}</div>
                                <span className="text-[10px] font-bold text-gray-400 uppercase">{users.filter(u => u.teamId === team.id).length} Membros</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        )}

        {/* ABA: FUNIS DE VENDAS */}
        {activeTab === 'pipeline' && (
            <div className="flex h-full gap-8 overflow-hidden animate-fade-in">
                {/* Lista lateral de Funis */}
                <div className="w-64 border-r border-gray-100 pr-6 shrink-0 overflow-y-auto">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Meus Funis</h4>
                    <div className="space-y-2">
                        {funnels.map(f => (
                            <button 
                                key={f.id}
                                onClick={() => setSelectedFunnelId(f.id)}
                                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex justify-between items-center group ${selectedFunnelId === f.id ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                <span className="truncate">{f.name}</span>
                                {selectedFunnelId === f.id && <ChevronRight size={14} />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Editor do Funil Selecionado */}
                {selectedFunnel ? (
                    <div className="flex-1 space-y-8 pb-12 overflow-y-auto">
                        <div className="flex justify-between items-start">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Nome do Funil</label>
                                <input 
                                    value={selectedFunnel.name} 
                                    onChange={(e) => updateFunnel(selectedFunnel.id, { name: e.target.value })}
                                    className="text-2xl font-black text-gray-900 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-blue-500 outline-none w-full"
                                />
                            </div>
                            <button 
                                onClick={() => {if(confirm('Excluir funil?')) deleteFunnel(selectedFunnel.id)}}
                                className="text-red-400 hover:text-red-600 p-2 transition-colors"
                            ><Trash2 size={20} /></button>
                        </div>

                        {/* Lista de Estágios */}
                        <div className="space-y-4">
                            <h5 className="text-[11px] font-black text-gray-900 uppercase flex items-center gap-2">
                                <GripVertical size={14} className="text-gray-300" /> Estágios do Processo
                            </h5>
                            <div className="space-y-3">
                                {selectedFunnel.stages.map((stage, idx) => (
                                    <div key={stage.id} className="bg-gray-50/50 rounded-xl p-4 border border-gray-100 flex items-center gap-4 hover:border-blue-200 transition-all group">
                                        <div className="text-[10px] font-black text-gray-300 w-4">#{idx + 1}</div>
                                        <div className="flex-1">
                                            <input 
                                                value={stage.name}
                                                onChange={(e) => updateStage(selectedFunnel.id, stage.id, { name: e.target.value })}
                                                className="bg-transparent text-sm font-bold text-gray-800 outline-none w-full focus:border-b border-blue-400"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {STAGE_COLORS.map(color => (
                                                <button 
                                                    key={color}
                                                    onClick={() => updateStage(selectedFunnel.id, stage.id, { color })}
                                                    className={`w-4 h-4 rounded-full transition-transform hover:scale-125 ${color} ${stage.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                                                />
                                            ))}
                                        </div>
                                        <button onClick={() => deleteStage(selectedFunnel.id, stage.id)} className="p-2 text-gray-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                                <button 
                                    onClick={() => addStage(selectedFunnel.id, 'Novo Estágio')}
                                    className="w-full py-4 border-2 border-dashed border-gray-100 rounded-xl text-gray-300 text-sm font-bold hover:border-blue-200 hover:text-blue-500 transition-all flex items-center justify-center gap-2"
                                >
                                    <Plus size={18} /> Adicionar Estágio
                                </button>
                            </div>
                        </div>

                        {/* Configurações Avançadas */}
                        <div className="bg-blue-50/30 rounded-2xl p-6 border border-blue-100/50 space-y-6">
                            <h5 className="text-[11px] font-black text-blue-600 uppercase">Configuração de Conclusão</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 mb-1.5 block">Etapa de Venda GANHA</label>
                                    <select 
                                        value={selectedFunnel.defaultWonStageId}
                                        onChange={(e) => updateFunnel(selectedFunnel.id, { defaultWonStageId: e.target.value })}
                                        className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm font-bold outline-none"
                                    >
                                        <option value="">Selecione...</option>
                                        {selectedFunnel.stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 mb-1.5 block">Etapa de Venda PERDIDA</label>
                                    <select 
                                        value={selectedFunnel.defaultLostStageId}
                                        onChange={(e) => updateFunnel(selectedFunnel.id, { defaultLostStageId: e.target.value })}
                                        className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm font-bold outline-none"
                                    >
                                        <option value="">Selecione...</option>
                                        {selectedFunnel.stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-300 font-bold uppercase text-xs tracking-widest">
                        Nenhum funil selecionado
                    </div>
                )}
            </div>
        )}

        {/* ABA: CAMPOS CUSTOMIZADOS */}
        {activeTab === 'fields' && (
            <div className="space-y-8 animate-fade-in">
                <div>
                    <h3 className="text-xl font-black text-gray-900">Campos Personalizados</h3>
                    <p className="text-sm text-gray-500">Adapte o CRM ao seu modelo de negócio adicionando informações únicas.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Lista de Campos */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase">
                                <tr>
                                    <th className="px-6 py-4">Nome do Campo</th>
                                    <th className="px-6 py-4">Tipo</th>
                                    <th className="px-6 py-4">Contexto</th>
                                    <th className="px-6 py-4 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {customFields.map(field => (
                                    <tr key={field.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-sm text-gray-800">{field.name}</td>
                                        <td className="px-6 py-4 text-xs font-medium text-gray-500 capitalize">{field.type}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${field.context === 'lead_detail' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                                                {field.context === 'lead_detail' ? 'Detalhe Lead' : 'Motivo Perda'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button onClick={() => deleteCustomField(field.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {customFields.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-20 text-center text-gray-300 font-bold uppercase text-[10px] tracking-widest">
                                            Nenhum campo personalizado ainda
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Explicação e Dicas */}
                    <div className="bg-blue-50 rounded-2xl p-8 space-y-6">
                        <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm flex gap-4">
                            <Target size={24} className="text-blue-600 shrink-0" />
                            <div>
                                <h4 className="text-sm font-bold text-gray-800">Campos de Motivo de Perda</h4>
                                <p className="text-xs text-gray-500 leading-relaxed mt-1">Configure campos para aparecerem somente quando o vendedor descartar um lead. Isso ajuda a gerar relatórios precisos de por que você está perdendo vendas.</p>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm flex gap-4">
                            <Layers size={24} className="text-blue-600 shrink-0" />
                            <div>
                                <h4 className="text-sm font-bold text-gray-800">Específicos por Funil</h4>
                                <p className="text-xs text-gray-500 leading-relaxed mt-1">Diferentes negócios pedem diferentes dados. Você pode atrelar campos específicos para cada funil criado no sistema.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'billing' && <div className="p-20 text-center text-gray-400 font-bold">Módulo de Assinatura</div>}
      </div>

      {/* MODAIS: ACESSOS */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                <div className="px-8 py-6 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">Convidar Usuário</h3>
                    <button onClick={() => setIsUserModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                </div>
                <form onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.target as any;
                    const name = form.name.value;
                    const email = form.email.value;
                    const initialPassword = 'nexus' + Math.floor(Math.random() * 9000 + 1000);

                    try {
                        await addUser({
                            id: `u-${Date.now()}`,
                            accountId: currentUser?.accountId,
                            name: name,
                            email: email,
                            password: initialPassword,
                            role: UserRole.USER,
                            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
                            status: 'active',
                            joinedAt: new Date().toISOString()
                        });
                        alert(`Usuário criado com sucesso!\nSenha inicial: ${initialPassword}`);
                        setIsUserModalOpen(false);
                    } catch (err) {
                        alert('Erro ao criar usuário. Tente novamente.');
                    }
                }} className="p-8 space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Nome Completo</label>
                        <input name="name" required placeholder="Ex: João Silva" className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">E-mail</label>
                        <input name="email" required type="email" placeholder="joao@empresa.com" className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium" />
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold hover:bg-blue-700 shadow-md mt-4">Convidar Agora</button>
                </form>
            </div>
        </div>
      )}

      {/* MODAL: NOVO FUNIL */}
      {isFunnelModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                <div className="px-8 py-6 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">Criar Novo Funil</h3>
                    <button onClick={() => setIsFunnelModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                </div>
                <form onSubmit={(e) => {
                    e.preventDefault();
                    addFunnel((e.target as any).name.value);
                    setIsFunnelModalOpen(false);
                }} className="p-8 space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Nome do Funil</label>
                        <input name="name" required placeholder="Ex: Prospecção Outbound" className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium" />
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold hover:bg-blue-700 shadow-md mt-4">Criar Funil</button>
                </form>
            </div>
        </div>
      )}

      {/* MODAL: NOVO CAMPO */}
      {isFieldModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
                <div className="px-8 py-6 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">Configurar Novo Campo</h3>
                    <button onClick={() => setIsFieldModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                </div>
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.target as any;
                    addCustomField({
                        id: `cf-${Date.now()}`,
                        accountId: currentUser?.accountId || '',
                        name: form.fname.value,
                        type: form.ftype.value,
                        context: form.fcontext.value,
                        funnelId: form.ffunnel.value,
                        visibleStageIds: []
                    });
                    setIsFieldModalOpen(false);
                }} className="p-8 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Nome do Campo</label>
                            <input name="fname" required placeholder="Ex: Segmento da Empresa" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Tipo de Dado</label>
                            <select name="ftype" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm font-medium">
                                <option value="text">Texto</option>
                                <option value="select">Seleção Única</option>
                                <option value="multiselect">Seleção Múltipla</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Exibir em:</label>
                            <select name="fcontext" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm font-medium">
                                <option value="lead_detail">Detalhes do Lead</option>
                                <option value="lost_reason">Motivo de Perda</option>
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Disponível no Funil:</label>
                            <select name="ffunnel" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm font-medium">
                                {funnels.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold hover:bg-blue-700 shadow-md mt-4">Adicionar Campo</button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};
