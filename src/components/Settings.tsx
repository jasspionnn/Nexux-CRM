
import React, { useState, useMemo } from 'react';
import { useCRM } from '../context/CRMContext';
import { 
  Plus, Building, Layers, SlidersHorizontal, Trash2, 
  Check, Shield, Loader2, Lock, Eye, Users2, ShieldAlert, 
  Save, Search, User as UserIcon, Mail, ShieldCheck, 
  Star, UserPlus, X, Briefcase, DollarSign, ChevronRight, CreditCard, Edit3, Target
} from 'lucide-react';
import { VisibilityLevel, UserRole, User, Team } from '../types';

type SettingsTab = 'pipeline' | 'fields' | 'access' | 'billing';

export const Settings = () => {
  const { 
    funnels, users, currentUser, currentAccount, 
    updateVisibilitySettings, updateUser, teams, 
    addUser, addTeam, updateTeam, deleteTeam, deleteUser 
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
            <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Configurações</h2>
            <p className="text-gray-500 mt-1">Gestão de funis, campos, equipe e acessos da conta.</p>
        </div>
        <div className="flex bg-white rounded-xl p-1 shadow-sm border border-gray-200 overflow-x-auto max-w-full">
            {[
              { id: 'access', label: 'Equipes e Acessos', icon: ShieldCheck },
              { id: 'pipeline', label: 'Funis de Vendas', icon: Layers },
              { id: 'fields', label: 'Campos', icon: SlidersHorizontal },
              { id: 'billing', label: 'Plano', icon: CreditCard },
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'text-gray-500 hover:bg-gray-50'}`}
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
              
              {/* BLOCO 1: GESTÃO DE USUÁRIOS (PERMISSÕES IN-LINE) */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-8 border-b border-gray-100 bg-gray-50/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Usuários e Permissões</h3>
                    <p className="text-sm text-gray-500">Defina Cargo e Equipe diretamente na lista abaixo.</p>
                  </div>

                  <div className="flex gap-3 w-full md:w-auto">
                      <div className="relative flex-1 md:w-64">
                          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                          <input 
                              placeholder="Buscar membro..."
                              value={userSearch}
                              onChange={e => setUserSearch(e.target.value)}
                              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                          />
                      </div>
                      <button 
                          onClick={() => setIsUserModalOpen(true)}
                          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                      >
                          <UserPlus size={18} /> Novo Usuário
                      </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100 uppercase text-[10px] font-black text-gray-400 tracking-widest">
                      <tr>
                        <th className="px-8 py-5">Nome</th>
                        <th className="px-8 py-5">Equipe</th>
                        <th className="px-8 py-5">Cargo (Permissão)</th>
                        <th className="px-8 py-5 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredUsers.map(user => (
                        <tr key={user.id} className="hover:bg-blue-50/10 transition-colors group">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-3">
                              <img src={user.avatar} className="w-10 h-10 rounded-full border border-gray-200" alt="" />
                              <div>
                                <div className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                                  {user.name}
                                  {user.id === currentUser?.id && <span className="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-black uppercase">Você</span>}
                                </div>
                                <div className="text-xs text-gray-400">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <select 
                              value={user.teamId || ''}
                              onChange={(e) => updateUser(user.id, { teamId: e.target.value || undefined })}
                              className="text-xs font-bold bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 w-full max-w-[180px] shadow-sm cursor-pointer"
                            >
                              <option value="">Sem Equipe</option>
                              {teams.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-8 py-6">
                             <select 
                                value={user.role}
                                disabled={user.id === currentUser?.id}
                                onChange={(e) => updateUser(user.id, { role: e.target.value as UserRole })}
                                className={`text-xs font-black px-4 py-2 rounded-lg border outline-none shadow-sm ${
                                  user.role === UserRole.ACCOUNT_ADMIN 
                                  ? 'bg-purple-50 text-purple-700 border-purple-200' 
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                } ${user.id === currentUser?.id ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:bg-white focus:ring-2 focus:ring-blue-500'}`}
                              >
                                <option value={UserRole.USER}>Vendedor (USER)</option>
                                <option value={UserRole.ACCOUNT_ADMIN}>Admin (ACCOUNT_ADMIN)</option>
                              </select>
                          </td>
                          <td className="px-8 py-6 text-right">
                             {user.id !== currentUser?.id && (
                                <button onClick={() => deleteUser(user.id)} className="p-2 text-gray-300 hover:text-red-600 transition-colors">
                                    <Trash2 size={18} />
                                </button>
                             )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* BLOCO 2: EQUIPES (NOME E META EDITÁVEL) */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
                 <div className="flex justify-between items-center mb-8">
                    <h3 className="text-lg font-bold text-gray-900">Equipes e Metas</h3>
                    <button onClick={() => setIsTeamModalOpen(true)} className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:underline">
                        <Plus size={16} /> Nova Equipe
                    </button>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {teams.map(team => (
                        <div key={team.id} className="p-6 rounded-2xl border border-gray-100 bg-gray-50/40 flex flex-col group relative hover:border-blue-200 hover:bg-white transition-all shadow-sm">
                            <button onClick={() => deleteTeam(team.id)} className="absolute top-4 right-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                <Trash2 size={16} />
                            </button>
                            
                            <div className="mb-4">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Nome do Time</label>
                                <div className="flex items-center gap-2 group/input">
                                    <input 
                                        value={team.name}
                                        onChange={(e) => updateTeam(team.id, { name: e.target.value })}
                                        className="bg-transparent font-bold text-gray-800 border-b border-transparent hover:border-gray-200 focus:border-blue-500 outline-none w-full py-1 text-sm"
                                    />
                                    <Edit3 size={12} className="text-gray-300 opacity-0 group-hover/input:opacity-100" />
                                </div>
                            </div>

                            <div>
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Meta Bruta (R$)</label>
                                <div className="flex items-center gap-1 group/input">
                                    <span className="text-xs font-bold text-gray-400">R$</span>
                                    <input 
                                        type="number"
                                        value={team.goal}
                                        onChange={(e) => updateTeam(team.id, { goal: Number(e.target.value) })}
                                        className="bg-transparent font-black text-lg border-b border-transparent hover:border-gray-200 focus:border-blue-500 outline-none w-full py-1 text-blue-600"
                                    />
                                    <Edit3 size={12} className="text-gray-300 opacity-0 group-hover/input:opacity-100" />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                                <div className="flex -space-x-2">
                                    {users.filter(u => u.teamId === team.id).slice(0, 4).map(u => (
                                        <img key={u.id} src={u.avatar} className="w-7 h-7 rounded-full border-2 border-white shadow-sm" alt="" title={u.name} />
                                    ))}
                                </div>
                                <span className="text-[10px] font-bold text-gray-400 uppercase">
                                    {users.filter(u => u.teamId === team.id).length} Membros
                                </span>
                            </div>
                        </div>
                    ))}
                 </div>
              </div>

              {/* BLOCO 3: VISIBILIDADE GLOBAL */}
              <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <Shield size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Configuração de Visibilidade</h3>
                    <p className="text-sm text-gray-500">Defina o nível padrão de visualização de leads da conta.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                  {[
                    { id: 'private', title: 'Privado', desc: 'Vendedores veem apenas seus leads.', icon: Lock, color: 'text-red-600 bg-red-50' },
                    { id: 'team', title: 'Equipe', desc: 'Vendedores veem leads do seu time.', icon: Users2, color: 'text-blue-600 bg-blue-50' },
                    { id: 'public', title: 'Geral', desc: 'Todos veem todos os leads da conta.', icon: Eye, color: 'text-emerald-600 bg-emerald-50' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setVisibilityLevel(opt.id as VisibilityLevel)}
                      className={`p-6 rounded-2xl border-2 text-left transition-all relative ${visibilityLevel === opt.id ? 'border-blue-500 ring-8 ring-blue-50' : 'border-gray-100 hover:border-gray-200'}`}
                    >
                      {visibilityLevel === opt.id && <div className="absolute top-4 right-4 bg-blue-500 text-white p-1 rounded-full"><Check size={12} strokeWidth={4} /></div>}
                      <div className={`p-2 rounded-lg w-fit mb-4 ${opt.color}`}>
                        <opt.icon size={20} />
                      </div>
                      <h4 className="font-bold text-gray-900 mb-1">{opt.title}</h4>
                      <p className="text-[10px] font-medium text-gray-500 leading-relaxed">{opt.desc}</p>
                    </button>
                  ))}
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pt-8 border-t border-gray-100">
                    <div className="flex flex-wrap gap-8">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <input type="checkbox" checked={allowExport} onChange={() => setAllowExport(!allowExport)} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-all" />
                            <span className="text-sm font-bold text-gray-700 group-hover:text-blue-600 transition-colors">Permitir exportação de dados</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <input type="checkbox" checked={showGoals} onChange={() => setShowGoals(!showGoals)} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-all" />
                            <span className="text-sm font-bold text-gray-700 group-hover:text-blue-600 transition-colors">Exibir metas nos dashboards</span>
                        </label>
                    </div>
                    <button 
                      onClick={handleSaveGlobalPermissions}
                      disabled={isSavingPermissions}
                      className="bg-gray-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-all flex items-center gap-2 disabled:opacity-50 shadow-xl shadow-gray-200"
                    >
                      {isSavingPermissions ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                      Atualizar Política
                    </button>
                </div>
              </div>
            </div>
          )}

          {/* ABAS SECUNDÁRIAS */}
          {activeTab === 'pipeline' && (
            <div className="flex gap-8 flex-1 animate-fade-in h-[600px]">
              <div className="w-80 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                <div className="p-6 border-b bg-gray-50 font-bold text-gray-700">Meus Funis</div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                    {funnels.map(funnel => (
                    <button key={funnel.id} className="w-full text-left p-4 rounded-xl flex justify-between items-center bg-white border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all">
                        <span className="font-bold text-gray-700 truncate">{funnel.name}</span>
                        <ChevronRight size={16} className="text-gray-300" />
                    </button>
                    ))}
                    <button className="w-full p-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 font-bold flex items-center justify-center gap-2 hover:bg-white hover:border-blue-400 transition-all">
                      <Plus size={18} /> Novo Funil
                    </button>
                </div>
              </div>
              <div className="flex-1 bg-white rounded-2xl border border-gray-200 p-12 flex flex-col items-center justify-center text-gray-400 text-center">
                 <Layers size={80} className="opacity-10 mb-4" />
                 <h3 className="text-xl font-black text-gray-800 mb-2">Editor de Funis</h3>
                 <p className="max-w-xs text-sm">Selecione um funil ao lado para personalizar etapas e cores.</p>
              </div>
            </div>
          )}
          
          {activeTab === 'fields' && <div className="bg-white p-20 rounded-2xl border border-gray-200 text-center text-gray-400 font-bold">Módulo de Campos em Breve</div>}
          {activeTab === 'billing' && <div className="bg-white p-20 rounded-2xl border border-gray-200 text-center text-gray-400 font-bold">Módulo de Assinatura em Breve</div>}
        </div>
      </div>

      {/* MODAL: NOVO USUÁRIO */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                <div className="px-8 py-6 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-black text-xl text-gray-800">Novo Colaborador</h3>
                    <button onClick={() => setIsUserModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                </div>
                <form onSubmit={handleAddUser} className="p-8 space-y-5">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Nome Completo</label>
                        <input required placeholder="Nome do vendedor" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all font-bold" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">E-mail Corporativo</label>
                        <input required type="email" placeholder="email@empresa.com" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all font-bold" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Equipe</label>
                            <select value={newUser.teamId} onChange={e => setNewUser({...newUser, teamId: e.target.value})} className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none bg-white font-bold text-sm">
                                <option value="">Sem Equipe</option>
                                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Cargo</label>
                            <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})} className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none bg-white font-bold text-sm">
                                <option value={UserRole.USER}>Vendedor</option>
                                <option value={UserRole.ACCOUNT_ADMIN}>Admin</option>
                            </select>
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-200 mt-4">Cadastrar</button>
                </form>
            </div>
        </div>
      )}

      {/* MODAL: NOVA EQUIPE */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in">
                <div className="px-8 py-6 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-black text-xl text-gray-800">Criar Time</h3>
                    <button onClick={() => setIsTeamModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                </div>
                <form onSubmit={handleAddTeam} className="p-8 space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Nome do Time</label>
                        <input required placeholder="Ex: Inside Sales" value={newTeam.name} onChange={e => setNewTeam({...newTeam, name: e.target.value})} className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all font-bold" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Meta (R$)</label>
                        <input type="number" placeholder="100.000" value={newTeam.goal || ''} onChange={e => setNewTeam({...newTeam, goal: Number(e.target.value)})} className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all font-bold text-blue-600" />
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-200 mt-2">Criar Equipe</button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};
