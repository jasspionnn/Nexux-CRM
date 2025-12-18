
import React, { useState, useMemo } from 'react';
import { useCRM } from '../context/CRMContext';
import { 
  Plus, Building, Layers, SlidersHorizontal, Trash2, 
  Check, Shield, Loader2, Lock, Eye, Users2, ShieldAlert, 
  Save, Search, User as UserIcon, Mail, ShieldCheck, 
  Star, UserPlus, X, Briefcase, DollarSign, ChevronRight, CreditCard, Edit3, Target, 
  MoreVertical, HelpCircle, ChevronDown
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
  
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
      u.email.toLowerCase().includes(userSearch.toLowerCase())
    );
  }, [users, userSearch]);

  const getVisibilityLabel = (level: VisibilityLevel) => {
    if (level === 'public') return 'Geral';
    if (level === 'team') return 'Equipe';
    return 'Próprio';
  };

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
        <button 
            onClick={() => setIsUserModalOpen(true)}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-sm"
        >
            <Plus size={18} /> Novo Usuário
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === 'access' && (
          <div className="space-y-10 pb-12">
            
            {/* TABELA ESTILO RD CRM */}
            <div className="bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider w-16">Foto</th>
                      <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nome e E-mail</th>
                      <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Perfil</th>
                      <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        <div className="flex items-center gap-1">
                            Visibilidade <HelpCircle size={14} className="text-gray-300" />
                        </div>
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
                             <button className="p-2 text-gray-300 hover:text-blue-600 transition-colors">
                                <MoreVertical size={18} />
                             </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SEÇÃO DE EQUIPES */}
            <div className="pt-10 border-t border-gray-100">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Equipes e Metas</h3>
                        <p className="text-sm text-gray-500">Agrupe seus vendedores e defina objetivos.</p>
                    </div>
                    <button onClick={() => setIsTeamModalOpen(true)} className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:underline">
                        <Plus size={16} /> Criar Equipe
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {teams.map(team => (
                        <div key={team.id} className="p-6 rounded-xl border border-gray-100 bg-gray-50/30 group relative hover:border-blue-200 hover:bg-white transition-all shadow-sm">
                            <div className="mb-4">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Nome do Time</label>
                                <input 
                                    value={team.name}
                                    onChange={(e) => updateTeam(team.id, { name: e.target.value })}
                                    className="bg-transparent font-bold text-gray-800 border-b border-transparent hover:border-gray-200 focus:border-blue-500 outline-none w-full py-1 text-sm"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Meta Mensal</label>
                                <div className="flex items-center gap-1">
                                    <span className="text-xs font-bold text-gray-400">R$</span>
                                    <input 
                                        type="number"
                                        value={team.goal}
                                        onChange={(e) => updateTeam(team.id, { goal: Number(e.target.value) })}
                                        className="bg-transparent font-black text-lg border-b border-transparent hover:border-gray-200 focus:border-blue-500 outline-none w-full py-1 text-blue-600"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                                <div className="flex -space-x-2">
                                    {users.filter(u => u.teamId === team.id).slice(0, 3).map(u => (
                                        <div key={u.id} className="w-7 h-7 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-blue-700">
                                            {u.name[0]}
                                        </div>
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
          </div>
        )}
        
        {activeTab === 'pipeline' && <div className="p-20 text-center text-gray-400 font-bold">Módulo de Funis</div>}
        {activeTab === 'fields' && <div className="p-20 text-center text-gray-400 font-bold">Módulo de Campos</div>}
        {activeTab === 'billing' && <div className="p-20 text-center text-gray-400 font-bold">Módulo de Assinatura</div>}
      </div>

      {/* MODAL: NOVO USUÁRIO */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                <div className="px-8 py-6 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">Convidar Usuário</h3>
                    <button onClick={() => setIsUserModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                </div>
                <form onSubmit={(e) => {
                    e.preventDefault();
                    addUser({
                        id: `u-${Date.now()}`,
                        accountId: currentUser?.accountId,
                        name: (e.target as any).name.value,
                        email: (e.target as any).email.value,
                        role: UserRole.USER,
                        avatar: '',
                        status: 'active',
                        joinedAt: new Date().toISOString()
                    });
                    setIsUserModalOpen(false);
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
    </div>
  );
};
