
import React, { useState, useMemo } from 'react';
import { useCRM } from '../context/CRMContext';
import { 
  Plus, Building, Layers, SlidersHorizontal, Trash2, 
  Check, Shield, Loader2, Lock, Eye, Users2, ShieldAlert, 
  AlertCircle, Save, Search, User as UserIcon, Mail, ShieldCheck, 
  ChevronRight, MoreVertical, Star, UserPlus
} from 'lucide-react';
import { CustomFieldDefinition, VisibilityLevel, UserRole } from '../types';
import { Teams } from './Teams';

type SettingsTab = 'pipeline' | 'fields' | 'teams' | 'permissions' | 'billing';

export const Settings = () => {
  const { 
    funnels, users, currentUser, currentAccount, 
    updateVisibilitySettings, updateUser, teams
  } = useCRM();
  
  const [activeTab, setActiveTab] = useState<SettingsTab>('permissions');
  const [userSearch, setUserSearch] = useState('');
  
  // Permissions Global State
  const [visibilityLevel, setVisibilityLevel] = useState<VisibilityLevel>(currentAccount?.visibilityConfig?.level || 'public');
  const [allowExport, setAllowExport] = useState<boolean>(currentAccount?.visibilityConfig?.allowUserExport || false);
  const [showGoals, setShowGoals] = useState<boolean>(currentAccount?.visibilityConfig?.showTeamGoals || true);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);

  // Filtered users for the list
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

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    await updateUser(userId, { role: newRole });
  };

  const handleTeamChange = async (userId: string, teamId: string) => {
    await updateUser(userId, { teamId: teamId || undefined });
  };

  return (
    <div className="p-8 h-full flex flex-col bg-gray-50 animate-fade-in relative">
      
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">Configurações</h2>
            <p className="text-gray-500 mt-1">Gerencie a estrutura, equipe e níveis de segurança da conta.</p>
        </div>
        <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200 overflow-x-auto max-w-full">
            {[
              { id: 'pipeline', label: 'Funis', icon: Layers },
              { id: 'fields', label: 'Campos', icon: SlidersHorizontal },
              { id: 'teams', label: 'Equipes', icon: Users2 },
              { id: 'permissions', label: 'Permissões', icon: ShieldAlert },
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
          
          {activeTab === 'permissions' && (
            <div className="space-y-8 animate-fade-in">
              
              {/* SECTION: GLOBAL POLICY */}
              <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <Shield size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Política Global de Visibilidade</h3>
                    <p className="text-sm text-gray-500">Define o comportamento padrão para todos os vendedores (Papel: USER).</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  {[
                    { id: 'private', title: 'Modo Privado', desc: 'Vendedores veem apenas seus próprios leads.', icon: Lock, color: 'text-red-600 bg-red-50' },
                    { id: 'team', title: 'Modo Equipe', desc: 'Vendedores veem leads de todos da sua equipe.', icon: Users2, color: 'text-blue-600 bg-blue-50' },
                    { id: 'public', title: 'Modo Geral', desc: 'Todos os vendedores veem todos os leads da conta.', icon: Eye, color: 'text-green-600 bg-green-50' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setVisibilityLevel(opt.id as VisibilityLevel)}
                      className={`p-6 rounded-2xl border-2 text-left transition-all relative ${visibilityLevel === opt.id ? 'border-blue-500 ring-4 ring-blue-50' : 'border-gray-100 hover:border-gray-200'}`}
                    >
                      {visibilityLevel === opt.id && <div className="absolute top-4 right-4 bg-blue-500 text-white p-1 rounded-full"><Check size={12} strokeWidth={4} /></div>}
                      <div className={`p-2 rounded-lg w-fit mb-4 ${opt.color}`}>
                        <opt.icon size={20} />
                      </div>
                      <h4 className="font-bold text-gray-900 mb-1">{opt.title}</h4>
                      <p className="text-xs text-gray-500 leading-relaxed">{opt.desc}</p>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-gray-100">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm">Exportação de Dados</h4>
                      <p className="text-[10px] text-gray-500">Vendedores podem baixar listas CSV.</p>
                    </div>
                    <button 
                      onClick={() => setAllowExport(!allowExport)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${allowExport ? 'bg-blue-600' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${allowExport ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm">Visualização de Metas</h4>
                      <p className="text-[10px] text-gray-500">Mostrar metas financeiras no dashboard.</p>
                    </div>
                    <button 
                      onClick={() => setShowGoals(!showGoals)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${showGoals ? 'bg-blue-600' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${showGoals ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button 
                    onClick={handleSaveGlobalPermissions}
                    disabled={isSavingPermissions}
                    className="bg-gray-900 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-black transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-gray-200"
                  >
                    {isSavingPermissions ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    Aplicar Política Global
                  </button>
                </div>
              </div>

              {/* SECTION: USER MANAGEMENT */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                      <ShieldCheck size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Gestão de Colaboradores</h3>
                      <p className="text-sm text-gray-500">Configure cargos e equipes individualmente.</p>
                    </div>
                  </div>

                  <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input 
                      placeholder="Buscar por nome ou email..."
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100 uppercase text-[10px] font-bold text-gray-500">
                      <tr>
                        <th className="px-8 py-4">Usuário</th>
                        <th className="px-8 py-4">Equipe Designada</th>
                        <th className="px-8 py-4">Nível de Acesso (Cargo)</th>
                        <th className="px-8 py-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredUsers.map(user => (
                        <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                              <img src={user.avatar} className="w-9 h-9 rounded-full border border-gray-200 shadow-sm" alt="" />
                              <div>
                                <div className="text-sm font-bold text-gray-800 flex items-center gap-1">
                                  {user.name}
                                  {user.id === currentUser?.id && <span className="text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded ml-1">VOCÊ</span>}
                                </div>
                                <div className="text-xs text-gray-400 flex items-center gap-1">
                                  <Mail size={10} /> {user.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <select 
                              value={user.teamId || ''}
                              onChange={(e) => handleTeamChange(user.id, e.target.value)}
                              className="text-xs font-medium bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 w-full max-w-[160px]"
                            >
                              <option value="">Sem Equipe</option>
                              {teams.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-2">
                              <select 
                                value={user.role}
                                disabled={user.id === currentUser?.id}
                                onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                                className={`text-xs font-bold px-2 py-1.5 rounded-md border outline-none transition-all ${
                                  user.role === UserRole.ACCOUNT_ADMIN 
                                  ? 'bg-purple-50 text-purple-700 border-purple-100' 
                                  : 'bg-blue-50 text-blue-700 border-blue-100'
                                } ${user.id === currentUser?.id ? 'cursor-not-allowed opacity-80' : 'cursor-pointer focus:ring-2 focus:ring-purple-500'}`}
                              >
                                <option value={UserRole.USER}>Vendedor (USER)</option>
                                <option value={UserRole.ACCOUNT_ADMIN}>Administrador (ACCOUNT_ADMIN)</option>
                              </select>
                              {user.role === UserRole.ACCOUNT_ADMIN && <Star size={14} className="text-amber-400 fill-current" />}
                            </div>
                          </td>
                          <td className="px-8 py-5 text-right">
                             <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase border ${
                               user.status === 'active' 
                               ? 'bg-green-50 text-green-700 border-green-200' 
                               : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                             }`}>
                                {user.status === 'active' ? 'Ativo' : 'Pendente'}
                             </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredUsers.length === 0 && (
                  <div className="p-12 text-center text-gray-400">
                    <Search size={48} className="mx-auto mb-4 opacity-10" />
                    <p>Nenhum colaborador encontrado para "{userSearch}"</p>
                  </div>
                )}
                
                <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-center">
                  <button className="text-indigo-600 text-sm font-bold hover:underline flex items-center gap-2">
                    <UserPlus size={16} /> Convidar mais colaboradores
                  </button>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex gap-4">
                <AlertCircle className="text-amber-600 shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-bold mb-1">Notas de Segurança:</p>
                  <ul className="list-disc ml-4 space-y-1">
                    <li>Usuários com cargo **Administrador** têm visibilidade total e ignoram a Política Global.</li>
                    <li>Ao alterar o cargo de um usuário, ele pode precisar recarregar a página para aplicar as novas permissões de menu.</li>
                    <li>Você não pode alterar seu próprio cargo para evitar a perda acidental de acesso administrativo.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pipeline' && (
            <div className="flex gap-8 flex-1 animate-fade-in">
              <div className="w-80 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                <div className="p-5 border-b bg-gray-50 font-bold text-gray-700 flex items-center gap-2">
                    <Building size={18} className="text-blue-600" />
                    Funis de Vendas
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
                 <p className="max-w-xs">Selecione um funil ao lado para personalizar etapas, cores e automações de movimentação.</p>
              </div>
            </div>
          )}

          {activeTab === 'teams' && <div className="animate-fade-in -mx-8"><Teams /></div>}
          {activeTab === 'fields' && <div className="bg-white p-12 rounded-2xl border text-center text-gray-400 animate-fade-in">Módulo de Campos Personalizados</div>}
          {activeTab === 'billing' && <div className="bg-white p-12 rounded-2xl border text-center text-gray-400 animate-fade-in">Módulo de Faturamento e Planos</div>}
        </div>
      </div>
    </div>
  );
};

const CreditCard = ({ size }: { size: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
);
