
import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import { User, Team, UserRole } from '../types';
import { Briefcase, Plus, Trash2, Mail, DollarSign, UserPlus, Send, Check, X, Clock, CheckCircle, Shield, Users } from 'lucide-react';

export const Teams = () => {
  const { users, teams, addUser, updateUser, deleteUser, addTeam, deleteTeam, currentUser } = useCRM();
  const [selectedTeamId, setSelectedTeamId] = useState<string | 'all'>('all');
  const canEdit = currentUser?.role === UserRole.ACCOUNT_ADMIN;
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'sending' | 'success'>('idle');
  const [newUser, setNewUser] = useState<Partial<User>>({ role: UserRole.USER, teamId: '' });
  const [newTeam, setNewTeam] = useState<Partial<Team>>({ goal: 0 });

  const filteredUsers = selectedTeamId === 'all' ? users : users.filter((u: User) => u.teamId === selectedTeamId);

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newUser.name && newUser.email) {
      setInviteStatus('sending');
      addUser({
        id: `u-${Date.now()}`,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role || UserRole.USER,
        teamId: newUser.teamId || undefined,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(newUser.name)}`,
        status: 'pending'
      });
      setInviteStatus('success');
    }
  };

  return (
    <div className="flex h-full bg-gray-50">
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b"><h2 className="text-xl font-bold flex items-center gap-2"><Briefcase className="text-blue-600" /> Equipes</h2></div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <button onClick={() => setSelectedTeamId('all')} className={`w-full text-left p-3 rounded-lg flex justify-between ${selectedTeamId === 'all' ? 'bg-blue-50 text-blue-700 font-bold' : ''}`}><span>Todos</span> <span>{users.length}</span></button>
          {teams.map((t: Team) => (
            <div key={t.id} onClick={() => setSelectedTeamId(t.id)} className={`p-3 rounded-lg border cursor-pointer ${selectedTeamId === t.id ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200'}`}>
              <div className="flex justify-between font-bold"><span>{t.name}</span> {canEdit && <Trash2 size={14} onClick={() => deleteTeam(t.id)} className="text-red-400" />}</div>
              <div className="text-xs text-gray-500">Meta: R$ {t.goal.toLocaleString()}</div>
            </div>
          ))}
        </div>
        {canEdit && <button onClick={() => setIsTeamModalOpen(true)} className="p-4 text-blue-600 font-bold text-sm">+ Nova Equipe</button>}
      </div>

      <div className="flex-1 flex flex-col">
        <div className="h-16 border-b bg-white px-8 flex items-center justify-between">
          <h3 className="font-bold">{selectedTeamId === 'all' ? 'Colaboradores' : teams.find((t:Team) => t.id === selectedTeamId)?.name}</h3>
          {canEdit && <button onClick={() => setIsUserModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">Convidar</button>}
        </div>
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredUsers.map((u: User) => (
            <div key={u.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative">
              <div className="flex gap-3 mb-4">
                <img src={u.avatar} className="w-12 h-12 rounded-full" />
                <div><h4 className="font-bold">{u.name}</h4><p className="text-xs text-gray-500">{u.email}</p></div>
              </div>
              <div className="space-y-2">
                <select disabled={!canEdit} value={u.role} onChange={e => updateUser(u.id, {role: e.target.value as UserRole})} className="w-full text-xs bg-gray-50 p-2 rounded border">
                  {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <select disabled={!canEdit} value={u.teamId || ''} onChange={e => updateUser(u.id, {teamId: e.target.value})} className="w-full text-xs bg-gray-50 p-2 rounded border">
                  <option value="">Sem Equipe</option>
                  {teams.map((t: Team) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              {canEdit && <button onClick={() => deleteUser(u.id)} className="absolute bottom-4 right-4 text-red-300 hover:text-red-500"><Trash2 size={16} /></button>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
