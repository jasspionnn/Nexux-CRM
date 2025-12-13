
import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import { User, Team, UserRole } from '../types';
import { Users, Shield, Briefcase, Plus, Trash2, Mail, DollarSign, UserPlus } from 'lucide-react';

export const Teams = () => {
  const { users, teams, addUser, updateUser, deleteUser, addTeam, deleteTeam } = useCRM();
  const [selectedTeamId, setSelectedTeamId] = useState<string | 'all'>('all');
  
  // Modal States
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

  // Form States
  const [newUser, setNewUser] = useState<Partial<User>>({ role: UserRole.SALES, teamId: '' });
  const [newTeam, setNewTeam] = useState<Partial<Team>>({ goal: 0 });

  const filteredUsers = selectedTeamId === 'all' 
    ? users 
    : users.filter(u => u.teamId === selectedTeamId);

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUser.name && newUser.email) {
      addUser({
        id: `u-${Date.now()}`,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role || UserRole.SALES,
        teamId: newUser.teamId || undefined,
        avatar: `https://ui-avatars.com/api/?name=${newUser.name}&background=random`
      });
      setIsUserModalOpen(false);
      setNewUser({ role: UserRole.SALES, teamId: '' });
    }
  };

  const handleAddTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTeam.name) {
      addTeam({
        id: `t-${Date.now()}`,
        name: newTeam.name,
        goal: Number(newTeam.goal) || 0
      });
      setIsTeamModalOpen(false);
      setNewTeam({ goal: 0 });
    }
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

          {teams.map(team => (
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
                {selectedTeamId === team.id && (
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
                    {users.filter(u => u.teamId === team.id).slice(0,3).map(u => (
                       <img key={u.id} src={u.avatar} className="w-6 h-6 rounded-full border-2 border-white" alt={u.name} />
                    ))}
                 </div>
                 <span className="text-xs text-gray-400">
                    {users.filter(u => u.teamId === team.id).length} membros
                 </span>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={() => setIsTeamModalOpen(true)}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <Plus size={18} /> Nova Equipe
          </button>
        </div>
      </div>

      {/* Right Content: Users Grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
         <div className="h-20 border-b border-gray-200 bg-white px-8 flex items-center justify-between">
            <div>
               <h3 className="text-lg font-bold text-gray-800">
                  {selectedTeamId === 'all' ? 'Todos os Colaboradores' : teams.find(t => t.id === selectedTeamId)?.name}
               </h3>
               <p className="text-sm text-gray-500">
                  {filteredUsers.length} usuários ativos nesta visualização
               </p>
            </div>
            <button 
               onClick={() => setIsUserModalOpen(true)}
               className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm font-medium transition-all"
            >
               <UserPlus size={18} /> Adicionar Vendedor
            </button>
         </div>

         <div className="flex-1 overflow-y-auto p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
               {filteredUsers.map(user => (
                  <div key={user.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                     <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                           <img src={user.avatar} className="w-12 h-12 rounded-full" alt={user.name} />
                           <div>
                              <h4 className="font-bold text-gray-800">{user.name}</h4>
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                 <Mail size={12} /> {user.email}
                              </div>
                           </div>
                        </div>
                        <button 
                           onClick={() => deleteUser(user.id)}
                           className="text-gray-300 hover:text-red-500 transition-colors"
                        >
                           <Trash2 size={16} />
                        </button>
                     </div>
                     
                     <div className="space-y-3">
                        {/* Role Select */}
                        <div>
                           <label className="text-[10px] uppercase font-bold text-gray-400">Cargo</label>
                           <div className="relative">
                              <Shield className="absolute left-2 top-2 text-gray-400" size={14} />
                              <select 
                                 value={user.role}
                                 onChange={(e) => updateUser(user.id, { role: e.target.value as UserRole })}
                                 className="w-full bg-gray-50 border border-gray-200 text-sm rounded-md py-1.5 pl-7 pr-2 outline-none focus:border-blue-500"
                              >
                                 {Object.values(UserRole).map(role => (
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
                                 value={user.teamId || ''}
                                 onChange={(e) => updateUser(user.id, { teamId: e.target.value || undefined })}
                                 className="w-full bg-gray-50 border border-gray-200 text-sm rounded-md py-1.5 pl-7 pr-2 outline-none focus:border-blue-500"
                              >
                                 <option value="">Sem equipe</option>
                                 {teams.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                 ))}
                              </select>
                           </div>
                        </div>
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

      {/* --- MODALS --- */}
      
      {/* Add User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
              <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
                 <h3 className="font-bold text-gray-800">Novo Usuário</h3>
                 <button onClick={() => setIsUserModalOpen(false)} className="text-gray-400 hover:text-gray-600"><Trash2 size={20} className="rotate-45" /></button>
              </div>
              <form onSubmit={handleAddUser} className="p-6 space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                    <input 
                       required
                       value={newUser.name || ''}
                       onChange={e => setNewUser({...newUser, name: e.target.value})}
                       className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input 
                       required
                       type="email"
                       value={newUser.email || ''}
                       onChange={e => setNewUser({...newUser, email: e.target.value})}
                       className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
                        <select 
                           value={newUser.role}
                           onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}
                           className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none bg-white"
                        >
                           {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Equipe</label>
                        <select 
                           value={newUser.teamId || ''}
                           onChange={e => setNewUser({...newUser, teamId: e.target.value})}
                           className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none bg-white"
                        >
                           <option value="">Nenhuma</option>
                           {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                     </div>
                 </div>
                 <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 mt-2">Salvar Usuário</button>
              </form>
           </div>
        </div>
      )}

      {/* Add Team Modal */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
              <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
                 <h3 className="font-bold text-gray-800">Nova Equipe</h3>
                 <button onClick={() => setIsTeamModalOpen(false)} className="text-gray-400 hover:text-gray-600"><Trash2 size={20} className="rotate-45" /></button>
              </div>
              <form onSubmit={handleAddTeam} className="p-6 space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Equipe</label>
                    <input 
                       required
                       placeholder="Ex: Inside Sales"
                       value={newTeam.name || ''}
                       onChange={e => setNewTeam({...newTeam, name: e.target.value})}
                       className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Meta Mensal (R$)</label>
                    <input 
                       type="number"
                       value={newTeam.goal || ''}
                       onChange={e => setNewTeam({...newTeam, goal: Number(e.target.value)})}
                       className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                 </div>
                 <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 mt-2">Criar Equipe</button>
              </form>
           </div>
        </div>
      )}

    </div>
  );
};
