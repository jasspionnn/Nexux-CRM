
import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import { User, Team, UserRole } from '../types';
import { Users, Shield, Briefcase, Plus, Trash2, Mail, DollarSign, UserPlus, Send, Check, Copy, Loader2, X, Clock, CheckCircle } from 'lucide-react';

export const Teams = () => {
  const { users, teams, addUser, updateUser, deleteUser, addTeam, deleteTeam, currentUser } = useCRM();
  const [selectedTeamId, setSelectedTeamId] = useState<string | 'all'>('all');
  
  // Permission Check
  const canEdit = currentUser?.role === UserRole.ACCOUNT_ADMIN;

  // Modal States
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

  // Invitation Logic State
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'sending' | 'success'>('idle');
  const [generatedCreds, setGeneratedCreds] = useState<{email: string, pass: string} | null>(null);

  // Form States
  const [newUser, setNewUser] = useState<Partial<User>>({ role: UserRole.USER, teamId: '' });
  const [newTeam, setNewTeam] = useState<Partial<Team>>({ goal: 0 });

  const filteredUsers = selectedTeamId === 'all' 
    ? users 
    : users.filter(u => u.teamId === selectedTeamId);

  const resetUserModal = () => {
      setIsUserModalOpen(false);
      setNewUser({ role: UserRole.USER, teamId: '' });
      setInviteStatus('idle');
      setGeneratedCreds(null);
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newUser.name && newUser.email) {
      setInviteStatus('sending');
      
      // Generate a temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + "1!";
      
      // Simulate API/Email Service delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      addUser({
        id: `u-${Date.now()}`,
        name: newUser.name,
        email: newUser.email,
        password: tempPassword,
        role: newUser.role || UserRole.USER,
        teamId: newUser.teamId || undefined,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(newUser.name)}&background=random`,
        status: 'pending', // Set as pending invite
        joinedAt: new Date().toISOString()
      });

      setGeneratedCreds({ email: newUser.email, pass: tempPassword });
      setInviteStatus('success');
    }
  };

  const handleAddTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTeam.name) {
      addTeam({
        id: `t-${Date.now()}`,
        accountId: currentUser?.accountId || '',
        name: newTeam.name,
        goal: Number(newTeam.goal) || 0
      });
      setIsTeamModalOpen(false);
      setNewTeam({ goal: 0 });
    }
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex h-full animate-fade-in bg-gray-50">
      
      {/* Left Sidebar: Teams List */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Briefcase className="text-blue-600" size={24} />
            Equipes
          </h2>
          <p className="text-xs text-gray-500 mt-1">Gerencie departamentos e metas</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <button
            onClick={() => setSelectedTeamId('all')}
            className={`w-full text-left p-3 rounded-lg flex justify-between items-center transition-all ${
              selectedTeamId === 'all' 
              ? 'bg-blue-50 text-blue-700 font-medium' 
              : 'hover:bg-gray-50 text-gray-600'
            }`}
          >
            <span>Todos os Usuários</span>
            <span className="bg-gray-100 text-gray-500 text-xs py-0.5 px-2 rounded-full">{users.length}</span>
          </button>

          {teams.map((team: Team) => (
            <div 
              key={team.id}
              onClick={() => setSelectedTeamId(team.id)}
              className={`w-full p-3 rounded-lg cursor-pointer transition-all border ${
                selectedTeamId === team.id 
                ? 'bg-white border-blue-300 shadow-md ring-1 ring-blue-100' 
                : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`font-semibold ${selectedTeamId === team.id ? 'text-blue-700' : 'text-gray-700'}`}>
                  {team.name}
                </span>
                {selectedTeamId === team.id && canEdit && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteTeam(team.id); setSelectedTeamId('all'); }}
                    className="text-gray-300 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                 <DollarSign size={12} />
                 Meta: R$ {team.goal.toLocaleString()}
              </div>
              <div className="mt-2 flex items-center gap-2">
                 <div className="flex -space-x-2">
                    {users.filter((u: User) => u.teamId === team.id).slice(0,3).map((u: User) => (
                       <img key={u.id} src={u.avatar} className="w-6 h-6 rounded-full border-2 border-white" alt={u.name} />
                    ))}
                 </div>
                 <span className="text-xs text-gray-400">
                    {users.filter((u: User) => u.teamId === team.id).length} membros
                 </span>
              </div>
            </div>
          ))}
        </div>

        {canEdit && (
          <div className="p-4 border-t border-gray-100">
            <button 
              onClick={() => setIsTeamModalOpen(true)}
              className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <Plus size={18} /> Nova Equipe
            </button>
          </div>
        )}
      </div>

      {/* Right Content: Users Grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
         <div className="h-20 border-b border-gray-200 bg-white px-8 flex items-center justify-between">
            <div>
               <h3 className="text-lg font-bold text-gray-800">
                  {selectedTeamId === 'all' ? 'Todos os Colaboradores' : teams.find((t: Team) => t.id === selectedTeamId)?.name}
               </h3>
               <p className="text-sm text-gray-500">
                  {filteredUsers.length} usuários ativos nesta visualização
               </p>
            </div>
            {canEdit && (
              <button 
                 onClick={() => setIsUserModalOpen(true)}
                 className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm font-medium transition-all"
              >
                 <UserPlus size={18} /> Convidar Usuário
              </button>
            )}
         </div>

         <div className="flex-1 overflow-y-auto p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
               {filteredUsers.map((user: User) => (
                  <div key={user.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow relative">
                     {/* Status Badge */}
                     <div className="absolute top-5 right-5">
                         {user.status === 'pending' ? (
                             <span className="flex items-center gap-1 bg-yellow-100 text-yellow-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border border-yellow-200" title="Aguardando primeiro acesso">
                                 <Clock size={10} /> Pendente
                             </span>
                         ) : (
                             <span className="flex items-center gap-1 bg-green-100 text-green-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border border-green-200">
                                 <CheckCircle size={10} /> Ativo
                             </span>
                         )}
                     </div>

                     <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                           <img src={user.avatar} className={`w-12 h-12 rounded-full ${user.status === 'pending' ? 'grayscale opacity-70' : ''}`} alt={user.name} />
                           <div>
                              <h4 className="font-bold text-gray-800">{user.name}</h4>
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                 <Mail size={12} /> {user.email}
                              </div>
                           </div>
                        </div>
                     </div>
                     
                     <div className="space-y-3 pt-2">
                        {/* Role Select */}
                        <div>
                           <label className="text-[10px] uppercase font-bold text-gray-400">Cargo</label>
                           <div className="relative">
                              <Shield size={14} className="absolute left-2 top-2 text-gray-400" />
                              <select 
                                 disabled={!canEdit}
                                 value={user.role}
                                 onChange={(e) => updateUser(user.id, { role: e.target.value as UserRole })}
                                 className={`w-full bg-gray-50 border border-gray-200 text-sm rounded-md py-1.5 pl-7 pr-2 outline-none ${canEdit ? 'focus:border-blue-500' : 'cursor-not-allowed text-gray-500'}`}
                              >
                                 {Object.values(UserRole)
                                    .filter(role => role !== UserRole.NEXUS_ADMIN)
                                    .map(role => (
                                    <option key={role} value={role}>{role}</option>
                                 ))}
                              </select>
                           </div>
                        </div>

                        {/* Team Select */}
                        <div>
                           <label className="text-[10px] uppercase font-bold text-gray-400">Equipe</label>
                           <div className="relative">
                              <Users className="absolute left-2 top-2 text-gray-400" size={14} />
                              <select 
                                 disabled={!canEdit}
                                 value={user.teamId || ''}
                                 onChange={(e) => updateUser(user.id, { teamId: e.target.value || undefined })}
                                 className={`w-full bg-gray-50 border border-gray-200 text-sm rounded-md py-1.5 pl-7 pr-2 outline-none ${canEdit ? 'focus:border-blue-500' : 'cursor-not-allowed text-gray-500'}`}
                              >
                                 <option value="">Sem equipe</option>
                                 {teams.map((t: Team) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                 ))}
                              </select>
                           </div>
                        </div>
                     </div>

                     <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                         <span className="text-[10px] text-gray-400">
                            Entrou em: {new Date(user.joinedAt || Date.now()).toLocaleDateString()}
                         </span>
                         {canEdit && (
                            <button 
                                onClick={() => deleteUser(user.id)}
                                className="text-gray-300 hover:text-red-500 transition-colors p-1 hover:bg-red-50 rounded"
                                title="Remover Usuário"
                            >
                                <Trash2 size={16} />
                            </button>
                         )}
                     </div>
                  </div>
               ))}
               
               {filteredUsers.length === 0 && (
                   <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                       <Users size={48} className="opacity-20 mb-3" />
                       <p>Nenhum usuário encontrado nesta equipe.</p>
                   </div>
               )}
            </div>
         </div>
      </div>

      {/* Invite User Modal */}
      {isUserModalOpen && canEdit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
              <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
                 <h3 className="font-bold text-gray-800">
                     {inviteStatus === 'success' ? 'Convite Enviado' : 'Convidar Novo Usuário'}
                 </h3>
                 <button onClick={resetUserModal} className="text-gray-400 hover:text-gray-600">
                    <X size={20} />
                 </button>
              </div>

              {inviteStatus === 'success' && generatedCreds ? (
                  <div className="p-6 text-center animate-fade-in">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Check className="text-green-600 w-8 h-8" />
                      </div>
                      <h4 className="text-lg font-bold text-gray-800 mb-2">Convite enviado com sucesso!</h4>
                      <p className="text-gray-600 text-sm mb-6">
                          Um e-mail de boas-vindas foi enviado para <strong>{generatedCreds.email}</strong>.
                      </p>
                      <button onClick={resetUserModal} className="w-full bg-gray-900 text-white py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors">Concluir</button>
                  </div>
              ) : (
                  <form onSubmit={handleInviteUser} className="p-6 space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                        <input required value={newUser.name || ''} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input required type="email" value={newUser.email || ''} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                     </div>
                     <button type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2 shadow-sm">
                        <Send size={18} /> Enviar Convite
                     </button>
                  </form>
              )}
           </div>
        </div>
      )}

      {/* Add Team Modal */}
      {isTeamModalOpen && canEdit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
              <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
                 <h3 className="font-bold text-gray-800">Nova Equipe</h3>
                 <button onClick={() => setIsTeamModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleAddTeam} className="p-6 space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                    <input required value={newTeam.name || ''} onChange={e => setNewTeam({...newTeam, name: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                 </div>
                 <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700">Criar</button>
              </form>
           </div>
        </div>
      )}

    </div>
  );
};
