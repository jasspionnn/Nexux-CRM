import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import { Account, User as UserType, UserRole } from '../types';
import { Building, UserPlus, Power, Clock, Plus, Search, ShieldCheck, AlertCircle, Calendar, User } from 'lucide-react';

export const NexusAdminDashboard = () => {
  const { allAccounts, createAccount, updateAccountStatus, extendAccountSubscription } = useCRM();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Account Form
  const [newAcc, setNewAcc] = useState({
      companyName: '',
      ownerName: '',
      email: '',
      password: '',
      plan: 'pro' as Account['plan']
  });

  const filteredAccounts = allAccounts.filter(a => 
      a.companyName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      a.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newAcc.companyName || !newAcc.email) return;

      const accountId = `acc_${Date.now()}`;
      
      const account: Account = {
          id: accountId,
          companyName: newAcc.companyName,
          ownerName: newAcc.ownerName,
          email: newAcc.email,
          status: 'active',
          plan: newAcc.plan,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString() // 1 year default
      };

      const adminUser: UserType = {
          id: `u_${Date.now()}`,
          accountId: accountId,
          name: newAcc.ownerName,
          email: newAcc.email,
          password: newAcc.password || '123',
          role: UserRole.ACCOUNT_ADMIN,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(newAcc.ownerName)}&background=random`,
          status: 'active',
          joinedAt: new Date().toISOString()
      };

      createAccount(account, adminUser);
      setIsModalOpen(false);
      setNewAcc({ companyName: '', ownerName: '', email: '', password: '', plan: 'pro' });
  };

  const getDaysRemaining = (dateStr: string) => {
      const diff = new Date(dateStr).getTime() - new Date().getTime();
      const days = Math.ceil(diff / (1000 * 3600 * 24));
      return days;
  };

  return (
    <div className="flex-1 bg-gray-50 h-full overflow-hidden flex flex-col animate-fade-in">
        <div className="h-20 bg-white border-b border-gray-200 px-8 flex items-center justify-between shadow-sm">
            <div>
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <ShieldCheck className="text-blue-600" />
                    Gestão de Contas Mãe
                </h1>
                <p className="text-sm text-gray-500 mt-1">Painel Administrativo Nexus</p>
            </div>
            
            <div className="flex gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Buscar empresa..."
                        className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 w-64"
                    />
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-blue-700 transition shadow-sm"
                >
                    <Plus size={20} /> Nova Conta
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-auto p-8">
            <div className="grid grid-cols-1 gap-6">
                {filteredAccounts.map(account => {
                    const daysRemaining = getDaysRemaining(account.expiresAt);
                    const isExpired = daysRemaining < 0;

                    return (
                        <div key={account.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="flex items-center gap-4 flex-1">
                                <div className="w-16 h-16 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                                    <Building size={32} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                        {account.companyName}
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase border ${account.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                            {account.status === 'active' ? 'Ativo' : 'Suspenso'}
                                        </span>
                                    </h3>
                                    <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                                        <User size={14} /> Dono: {account.ownerName} ({account.email})
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1 uppercase font-bold tracking-wide">Plano {account.plan}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-6 border-l border-gray-100 pl-6 h-full">
                                <div className="text-center min-w-[120px]">
                                    <div className="flex items-center justify-center gap-1 text-gray-500 text-xs uppercase font-bold mb-1">
                                        <Clock size={12} /> Expira em
                                    </div>
                                    <div className={`text-xl font-bold ${isExpired ? 'text-red-600' : daysRemaining < 30 ? 'text-yellow-600' : 'text-gray-800'}`}>
                                        {isExpired ? 'Expirado' : `${daysRemaining} dias`}
                                    </div>
                                    <p className="text-[10px] text-gray-400">{new Date(account.expiresAt).toLocaleDateString()}</p>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <button 
                                        onClick={() => updateAccountStatus(account.id, account.status === 'active' ? 'suspended' : 'active')}
                                        className={`px-3 py-1.5 rounded text-xs font-bold border flex items-center justify-center gap-2 w-32 transition-colors ${
                                            account.status === 'active' 
                                            ? 'border-red-200 text-red-600 hover:bg-red-50' 
                                            : 'border-green-200 text-green-600 hover:bg-green-50'
                                        }`}
                                    >
                                        <Power size={14} />
                                        {account.status === 'active' ? 'Suspender' : 'Ativar'}
                                    </button>
                                    <button 
                                        onClick={() => extendAccountSubscription(account.id, 1)}
                                        className="px-3 py-1.5 rounded text-xs font-bold border border-blue-200 text-blue-600 hover:bg-blue-50 flex items-center justify-center gap-2 w-32"
                                    >
                                        <Calendar size={14} />
                                        +30 Dias
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Create Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-scale-in">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Nova Conta Mãe</h2>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Nome da Empresa</label>
                            <input 
                                required
                                className="w-full border rounded p-2 text-sm outline-none focus:border-blue-500"
                                value={newAcc.companyName}
                                onChange={e => setNewAcc({...newAcc, companyName: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Nome do Dono (Admin)</label>
                            <input 
                                required
                                className="w-full border rounded p-2 text-sm outline-none focus:border-blue-500"
                                value={newAcc.ownerName}
                                onChange={e => setNewAcc({...newAcc, ownerName: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Email de Login</label>
                            <input 
                                required
                                type="email"
                                className="w-full border rounded p-2 text-sm outline-none focus:border-blue-500"
                                value={newAcc.email}
                                onChange={e => setNewAcc({...newAcc, email: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Senha Inicial</label>
                            <input 
                                type="password"
                                placeholder="Padrão: 123"
                                className="w-full border rounded p-2 text-sm outline-none focus:border-blue-500"
                                value={newAcc.password}
                                onChange={e => setNewAcc({...newAcc, password: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Plano</label>
                            <select 
                                className="w-full border rounded p-2 text-sm outline-none focus:border-blue-500 bg-white"
                                value={newAcc.plan}
                                onChange={e => setNewAcc({...newAcc, plan: e.target.value as any})}
                            >
                                <option value="trial">Trial</option>
                                <option value="pro">Pro</option>
                                <option value="enterprise">Enterprise</option>
                            </select>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 text-gray-500 hover:bg-gray-100 rounded">Cancelar</button>
                            <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700">Criar Conta</button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};