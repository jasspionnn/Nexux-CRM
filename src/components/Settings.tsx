
import React, { useState, useMemo } from 'react';
import { useCRM } from '../context/CRMContext';
import { 
  Plus, Building, Layers, SlidersHorizontal, Trash2, 
  Check, Shield, Loader2, Lock, Eye, Users2, ShieldAlert, 
  AlertCircle, Save, Search, User as UserIcon, Mail, ShieldCheck, 
  Star, UserPlus, X, Briefcase, DollarSign, ChevronRight, CreditCard
} from 'lucide-react';
import { VisibilityLevel, UserRole, User, Team } from '../types';

type SettingsTab = 'pipeline' | 'fields' | 'access' | 'billing';

export const Settings = () => {
  const { 
    funnels, users, currentUser, currentAccount, 
    updateVisibilitySettings, updateUser, teams, 
    addUser, addTeam, deleteTeam, deleteUser 
  } = useCRM();
  
  const [activeTab, setActiveTab] = useState<SettingsTab>('access');
  const [userSearch, setUserSearch] = useState('');
  
  // Modals
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

  // Global Visibility State
  const [visibilityLevel, setVisibilityLevel] = useState<VisibilityLevel>(currentAccount?.visibilityConfig?.level || 'public');
  const [allowExport, setAllowExport] = useState<boolean>(currentAccount?.visibilityConfig?.allowUserExport || false);
  const [showGoals, setShowGoals] = useState<boolean>(currentAccount?.visibilityConfig?.showTeamGoals || true);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);

  // Form States
  const [newUser, setNewUser] = useState({ name: '', email: '', teamId: '', role: UserRole.USER });
  const [newTeam, setNewTeam] = useState({ name: '', goal: 0 });

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
      u.email.toLowerCase().includes(userSearch.toLowerCase())
    );
  }, [users, userSearch]);

  const handleSaveGlobalPermissions = async () => {
    setIsSavingPermissions(true);
    await updateVisibilitySettings(visibilityLevel, allowExport, showGoals);
    setIsSavingPermissions(false);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email) return;

    await addUser({
      id: `u-${Date.now()}`,
      accountId: currentUser?.accountId,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      teamId: newUser.teamId || undefined,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(newUser.name)}&background=random`,
      status: 'active',
      joinedAt: new Date().toISOString()
    });
    
    setNewUser({ name: '', email: '', teamId: '', role: UserRole.USER });
    setIsUserModalOpen(false);
  };

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeam.name) return;

    await addTeam({
      id: `t-${Date.now()}`,
      accountId: currentUser?.accountId || '',
      name: newTeam.name,
      goal: Number(newTeam.goal) || 0
    });
    
    setNewTeam({ name: '', goal: 0 });
    setIsTeamModalOpen(false);
  };

  return (
    <div className="p-8 h-full flex flex-col bg-gray-50 animate-fade-in relative">
      
      {/* NAVEGAÇÃO SUPERIOR */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">Configurações</h2>
            <p className="text-gray-500 mt-1">Gestão de funis, campos, usuários e permissões da conta.</p>
        </div>
        <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200 overflow-x-auto max-w-full">
            {[
              { id: 'pipeline', label: 'Funis', icon: Layers },
              { id: 'fields', label: 'Campos', icon: SlidersHorizontal },
              { id: 'access', label: 'Equipes e Acessos', icon: ShieldAlert },
              { id: 'billing', label: 'Assinatura', icon: CreditCard },
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <tab.icon size={16} /> {tab.label}
              </button>
            ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-6xl space-y-8 pb-12">
          
          {activeTab === 'access' && (
            <div className="space-y-8 animate-fade-in">
              
              {/* BLOCO 1: REGRAS DA CONTA MÃE (VISIBILIDADE) */}
              <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <Shield size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Configuração da Conta Mãe</h3>
                    <p className="text-sm text-gray-500">Defina como a hierarquia de visibilidade funciona para todos os usuários.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  {[
                    { id: 'private', title: 'Privado', desc: 'Usuários veem apenas seus próprios leads.', icon: Lock, color: 'text-red-600 bg-red-50' },
                    { id: 'team', title: 'Equipe', desc: 'Usuários veem leads de todos da sua equipe.', icon: Users2, color: 'text-blue-600 bg-blue-50' },
                    { id: 'public', title: 'Geral', desc: 'Todos veem todos os leads da empresa.', icon: Eye, color: 'text-green-600 bg-green-50' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setVisibilityLevel(opt.id as VisibilityLevel)}
                      className={`p-5 rounded-2xl border-2 text-left transition-all relative ${visibilityLevel === opt.id ? 'border-blue-500 ring-4 ring-blue-50' : 'border-gray-100 hover:border-gray-200'}`}
                    >
                      {visibilityLevel === opt.id && <div className="absolute top-3 right-3 bg-blue-500 text-white p-1 rounded-full"><Check size={10} strokeWidth={4} /></div>}
                      <div className={`p-2 rounded-lg w-fit mb-3 ${opt.color}`}>
                        <opt.icon size={18} />
                      </div>
                      <h4 className="font-bold text-gray-900 mb-0.5">{opt.title}</h4>
                      <p className="text-[10px] text-gray-500 leading-tight">{opt.desc}</p>
                    </button>
                  ))}
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-6 border-t border-gray-100">
                    <div className="flex flex-wrap gap-6">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input type="checkbox" checked={allowExport} onChange={() => setAllowExport(!allowExport)} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300" />
                            <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">Permitir exportação de dados</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input type="checkbox" checked={showGoals} onChange={() => setShowGoals(!showGoals)} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300" />
                            <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">Visualizar metas da equipe</span>
                        </label>
                    </div>
                    <button 
                      onClick={handleSaveGlobalPermissions}
                      disabled={isSavingPermissions}
                      className="bg-gray-900 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-black transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-gray-200"
                    >
                      {isSavingPermissions ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                      Salvar Política
                    </button>
                </div>
              </div>

              {/* BLOCO 2: GESTÃO LINEAR DE USUÁRIOS E EQUIPES */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-8 border-b border-gray-100 bg-gray-50/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                      <ShieldCheck size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Colaboradores e Equipes</h3>
                      <p className="text-sm text-gray-500">Gerencie quem faz parte de cada time e seus níveis de acesso.</p>
                    </div>
                  </div>

                  <div className="flex gap-3 w-full md:w-auto">
                      <div className="relative flex-1 md:w-64">
                          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                          <input 
                              placeholder="Buscar membro..."
                              value={userSearch}
                              onChange={e => setUserSearch(e.target.value)}
                              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          />
                      </div>
                      <button 
                          onClick={() => setIsTeamModalOpen(true)}
                          className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-gray-50 transition-all border-dashed"
                      >
                          <Briefcase size={16} /> Nova Equipe
                      </button>
                      <button 
                          onClick={() => setIsUserModalOpen(true)}
                          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
                      >
                          <UserPlus size={18} /> Novo Usuário
                      </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50/80 border-b border-gray-100 uppercase text-[10px] font-bold text-gray-500 tracking-widest">
                      <tr>
                        <th className="px-8 py-5">Colaborador</th>
                        <th className="px-8 py-5">Equipe (In-line)</th>
                        <th className="px-8 py-5">Acesso (In-line)</th>
                        <th className="px-8 py-5">Status</th>
                        <th className="px-8 py-5 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredUsers.map(user => (
                        <tr key={user.id} className="hover:bg-blue-50/20 transition-colors group">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-3">
                              <img src={user.avatar} className="w-10 h-10 rounded-full border border-gray-200 shadow-sm" alt="" />
                              <div>
                                <div className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                                  {user.name}
                                  {user.id === currentUser?.id && <span className="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-black tracking-tighter">MEU PERFIL</span>}
                                </div>
                                <div className="text-xs text-gray-400 flex items-center gap-1">
                                  <Mail size={10} /> {user.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <select 
                              value={user.teamId || ''}
                              onChange={(e) => updateUser(user.id, { teamId: e.target.value || undefined })}
                              className="text-xs font-bold bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 w-full max-w-[200px] shadow-sm cursor-pointer hover:border-blue-300 transition-all"
                            >
                              <option value="">Nenhuma Equipe</option>
                              {teams.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-3">
                              <select 
                                value={user.role}
                                disabled={user.id === currentUser?.id}
                                onChange={(e) => updateUser(user.id, { role: e.target.value as UserRole })}
                                className={`text-xs font-black px-3 py-2 rounded-xl border outline-none transition-all shadow-sm ${
                                  user.role === UserRole.ACCOUNT_ADMIN 
                                  ? 'bg-purple-50 text-purple-700 border-purple-200' 
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                                } ${user.id === currentUser?.id ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:bg-white focus:ring-2 focus:ring-indigo-500'}`}
                              >
                                <option value={UserRole.USER}>Vendedor (USER)</option>
                                <option value={UserRole.ACCOUNT_ADMIN}>Administrador (ACCOUNT_ADMIN)</option>
                              </select>
                              {user.role === UserRole.ACCOUNT_ADMIN && <Star size={16} className="text-amber-400 fill-current" />}
                            </div>
                          </td>
                          <td className="px-8 py-6">
                             <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase border ${
                               user.status === 'active' 
                               ? 'bg-green-50 text-green-700 border-green-200' 
                               : 'bg-amber-50 text-amber-700 border-amber-200'
                             }`}>
                                {user.status === 'active' ? 'Ativo' : 'Pendente'}
                             </span>
                          </td>
                          <td className="px-8 py-6 text-right">
                             {user.id !== currentUser?.id && (
                                <button 
                                    onClick={() => deleteUser(user.id)}
                                    className="p-2.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                    title="Remover Membro"
                                >
                                    <Trash2 size={20} />
                                </button>
                             )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* RESUMO DE EQUIPES NO RODAPÉ DA TABELA */}
                <div className="p-8 bg-gray-50 border-t border-gray-100">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Resumo de Equipes ({teams.length})</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {teams.map(team => (
                            <div key={team.id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm group relative">
                                <button 
                                    onClick={() => deleteTeam(team.id)}
                                    className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <Trash2 size={12} />
                                </button>
                                <div className="font-bold text-gray-800 text-sm mb-1">{team.name}</div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-gray-500 flex items-center gap-1 font-medium">
                                        <DollarSign size={10} /> Meta: {team.goal.toLocaleString()}
                                    </span>
                                    <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold">
                                        {users.filter(u => u.teamId === team.id).length} membros
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex gap-4">
                <AlertCircle className="text-blue-600 shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-bold mb-1">Dica de Gestão:</p>
                  <p>As alterações de equipe e cargo feitas na lista são salvas automaticamente. Usuários definidos como **Administradores** ignoram qualquer restrição de visibilidade e têm acesso a todos os leads de todos os funis da conta.</p>
                </div>
              </div>
            </div>
          )}

          {/* OUTRAS ABAS (MANTIDAS) */}
          {activeTab === 'pipeline' && (
            <div className="flex gap-8 flex-1 animate-fade-in h-[600px]">
              <div className="w-80 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                <div className="p-5 border-b bg-gray-50 font-bold text-gray-700 flex items-center gap-2">
                    <Building size={18} className="text-blue-600" />
                    Meus Funis
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {funnels.map(funnel => (
                    <button 
                        key={funnel.id}
                        className="w-full text-left p-4 rounded-xl flex justify-between items-center transition-all bg-white border border-gray-100 hover:border-blue-200 hover:shadow-sm"
                    >
                        <span className="font-bold text-gray-700 truncate">{funnel.name}</span>
                        <ChevronRight size={16} className="text-gray-400" />
                    </button>
                    ))}
                    <button className="w-full p-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
                      <Plus size={18} /> Novo Funil
                    </button>
                </div>
              </div>
              <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 p-12 flex flex-col items-center justify-center text-gray-400 text-center">
                 <Layers size={64} className="opacity-10 mb-6" />
                 <h3 className="text-xl font-bold text-gray-800 mb-2">Editor de Pipeline</h3>
                 <p className="max-w-xs">Selecione um funil ao lado para personalizar etapas, cores e gatilhos de automação.</p>
              </div>
            </div>
          )}
          {activeTab === 'fields' && <div className="bg-white p-12 rounded-2xl border text-center text-gray-400 animate-fade-in">Módulo de Campos Personalizados</div>}
          {activeTab === 'billing' && <div className="bg-white p-12 rounded-2xl border text-center text-gray-400 animate-fade-in">Módulo de Faturamento e Planos</div>}
        </div>
      </div>

      {/* MODAL: NOVO USUÁRIO (RÁPIDO) */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                <div className="px-8 py-6 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                        <UserPlus className="text-blue-600" size={24} />
                        Novo Colaborador
                    </h3>
                    <button onClick={() => setIsUserModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                </div>
                <form onSubmit={handleAddUser} className="p-8 space-y-5">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Nome Completo</label>
                        <input 
                            required
                            placeholder="Nome do vendedor..."
                            value={newUser.name}
                            onChange={e => setNewUser({...newUser, name: e.target.value})}
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all font-medium"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">E-mail de Login</label>
                        <input 
                            required
                            type="email"
                            placeholder="vendedor@empresa.com"
                            value={newUser.email}
                            onChange={e => setNewUser({...newUser, email: e.target.value})}
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all font-medium"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Equipe Inicial</label>
                            <select 
                                value={newUser.teamId}
                                onChange={e => setNewUser({...newUser, teamId: e.target.value})}
                                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none bg-white font-bold text-sm"
                            >
                                <option value="">Sem Equipe</option>
                                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Cargo/Permissão</label>
                            <select 
                                value={newUser.role}
                                onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}
                                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none bg-white font-bold text-sm"
                            >
                                <option value={UserRole.USER}>Vendedor</option>
                                <option value={UserRole.ACCOUNT_ADMIN}>Admin</option>
                            </select>
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 mt-4">
                        Criar Usuário
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* MODAL: NOVA EQUIPE */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in">
                <div className="px-8 py-6 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                        <Briefcase className="text-indigo-600" size={24} />
                        Nova Equipe
                    </h3>
                    <button onClick={() => setIsTeamModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                </div>
                <form onSubmit={handleAddTeam} className="p-8 space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Nome da Equipe</label>
                        <input 
                            required
                            placeholder="Ex: Vendas Internas"
                            value={newTeam.name}
                            onChange={e => setNewTeam({...newTeam, name: e.target.value})}
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 transition-all font-medium"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Meta Mensal (R$)</label>
                        <input 
                            type="number"
                            placeholder="0"
                            value={newTeam.goal || ''}
                            onChange={e => setNewTeam({...newTeam, goal: Number(e.target.value)})}
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 transition-all font-medium"
                        />
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
                        Criar Equipe
                    </button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};
