import React, { useState, useEffect } from 'react';
import { useCRM } from '../context/CRMContext.tsx';
import { UserRole, Account } from '../types.ts';
import { Building, Power, Search, ShieldCheck, Calendar, CheckCircle, Loader2, Save, X, Plus } from 'lucide-react';
import { api } from '../services/api.ts';

export const NexusAdminDashboard = () => {
  const { allAccounts = [], updateAccountStatus, extendAccountSubscription, isLoading, currentUser, createAccount } = useCRM();
  const [activeTab, setActiveTab] = useState<'accounts' | 'settings'>('accounts');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [systemSettings, setSystemSettings] = useState({ login_background: '' });

  // Form para nova conta
  const [newAcc, setNewAcc] = useState({
      companyName: '',
      ownerName: '',
      email: '',
      password: '',
      plan: 'pro' as Account['plan']
  });

  useEffect(() => {
      api.get<any>('/public/settings')
        .then(data => {
            if (data && typeof data === 'object') {
                setSystemSettings(prev => ({ ...prev, ...data }));
            }
        })
        .catch(err => console.error("Erro ao carregar settings:", err));
  }, []);

  // Bloqueio de segurança redundante
  if (currentUser?.role !== UserRole.NEXUS_ADMIN) {
      return <div className="p-8 font-black text-red-600">ACESSO NÃO AUTORIZADO</div>;
  }

  const filteredAccounts = (Array.isArray(allAccounts) ? allAccounts : []).filter(a => {
      if (!a) return false;
      const company = (a.companyName || '').toLowerCase();
      const email = (a.email || '').toLowerCase();
      const search = (searchTerm || '').toLowerCase();
      return company.includes(search) || email.includes(search);
  });

  const saveSystemSettings = async () => {
      setIsSaving(true);
      try {
          await api.patch('/admin/settings', systemSettings);
          setShowSaveToast(true);
          setTimeout(() => setShowSaveToast(false), 3000);
      } catch (e) {
          console.error(e);
          alert('Erro ao salvar configurações globais.');
      } finally {
          setIsSaving(false);
      }
  };

  const handleCreate = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          // Os dados reais de ID e Datas são gerados no backend
          await createAccount(newAcc as any, { name: newAcc.ownerName, email: newAcc.email, password: newAcc.password } as any);
          setIsModalOpen(false);
          setNewAcc({ companyName: '', ownerName: '', email: '', password: '', plan: 'pro' });
      } catch (err) {
          alert('Erro ao criar conta.');
      }
  };

  const getDaysRemaining = (dateStr?: string) => {
      if (!dateStr) return 0;
      const expDate = new Date(dateStr);
      if (isNaN(expDate.getTime())) return 0;
      const diff = expDate.getTime() - new Date().getTime();
      return Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
  };

  return (
    <div className="flex-1 bg-gray-50 h-full overflow-hidden flex flex-col animate-fade-in relative">
        <div className="h-20 bg-white border-b border-gray-200 px-8 flex items-center justify-between shadow-sm shrink-0">
            <div className="flex items-center gap-6">
                <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                    <ShieldCheck className="text-blue-600" size={28} />
                    Painel Nexus
                </h1>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button 
                        onClick={() => setActiveTab('accounts')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'accounts' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Empresas
                    </button>
                    <button 
                        onClick={() => setActiveTab('settings')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'settings' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Sistema
                    </button>
                </div>
            </div>
            
            {activeTab === 'accounts' && (
                <div className="flex gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Buscar empresa..."
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 w-64 text-sm font-bold"
                        />
                    </div>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 transition shadow-lg"
                    >
                        <Plus size={20} /> Nova Conta
                    </button>
                </div>
            )}
        </div>

        <div className="flex-1 overflow-auto p-8">
            {isLoading && filteredAccounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64">
                    <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
                    <p className="text-gray-500 font-bold">Carregando dados...</p>
                </div>
            ) : activeTab === 'accounts' ? (
                <div className="space-y-4 max-w-6xl mx-auto">
                    {filteredAccounts.length === 0 ? (
                        <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-200 text-center">
                            <Building className="mx-auto text-gray-300 mb-4" size={48} />
                            <p className="text-gray-500 font-medium">Nenhuma empresa encontrada.</p>
                        </div>
                    ) : (
                        filteredAccounts.map(account => (
                            <div key={account.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row justify-between items-center gap-4 hover:border-blue-300 transition-all group">
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                                        <Building size={24} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-gray-800">{account.companyName || 'Sem Nome'}</h3>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${account.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {account.status === 'active' ? 'Ativo' : 'Suspenso'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 font-medium">{account.email} • Plano {account.plan || 'trial'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Expiração</p>
                                        <p className="text-sm font-black text-gray-700">{getDaysRemaining(account.expiresAt)} dias</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => updateAccountStatus(account.id, account.status === 'active' ? 'suspended' : 'active')}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Trocar Status"
                                        >
                                            <Power size={20} />
                                        </button>
                                        <button 
                                            onClick={() => extendAccountSubscription(account.id, 1)}
                                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Estender 30 dias"
                                        >
                                            <Calendar size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
                    <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-gray-900">Personalização Global</h3>
                                <p className="text-sm text-gray-500">Configure a aparência padrão do ecossistema Nexus.</p>
                            </div>
                            <button 
                                onClick={saveSystemSettings}
                                disabled={isSaving}
                                className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-lg disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSaving ? "Salvando..." : "Salvar Alterações"}
                            </button>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">URL da Imagem de Login (Background)</label>
                            <input 
                                value={systemSettings.login_background || ''} 
                                onChange={e => setSystemSettings({ ...systemSettings, login_background: e.target.value })} 
                                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all font-bold text-sm" 
                                placeholder="https://exemplo.com/imagem.jpg" 
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>

        {isModalOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-scale-in">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Nova Conta Mãe</h2>
                        <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                    </div>
                    
                    <form onSubmit={handleCreate} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Nome da Empresa</label>
                            <input 
                                required
                                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all font-bold"
                                value={newAcc.companyName}
                                onChange={e => setNewAcc({...newAcc, companyName: e.target.value})}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Nome do Dono (Admin)</label>
                            <input 
                                required
                                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all font-bold"
                                value={newAcc.ownerName}
                                onChange={e => setNewAcc({...newAcc, ownerName: e.target.value})}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Email de Login</label>
                            <input 
                                required
                                type="email"
                                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all font-bold"
                                value={newAcc.email}
                                onChange={e => setNewAcc({...newAcc, email: e.target.value})}
                            />
                        </div>
                        <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 shadow-xl active:scale-95 transition-all">Criar Conta</button>
                    </form>
                </div>
            </div>
        )}

        {showSaveToast && (
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-scale-in z-[100]">
                <CheckCircle className="text-green-400" size={20} />
                <span className="font-bold text-sm">Configurações globais salvas!</span>
            </div>
        )}
    </div>
  );
};