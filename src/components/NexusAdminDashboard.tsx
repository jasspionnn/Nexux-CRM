import React, { useState, useEffect } from 'react';
import { Building2, Activity, DollarSign, Settings, LogOut, Search, Bell, Menu, X, Plus, ShieldCheck, Play, Pause, Key, Save, Trash2, Users, Edit2 } from 'lucide-react';
import { useCRM } from '../context/CRMContext';

export const NexusAdminDashboard = () => {
  const { currentUser, logout } = useCRM();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'accounts' | 'settings' | 'users'>('accounts');
  
  const [stats, setStats] = useState({ totalAccounts: 0, activeAccounts: 0, totalUsers: 0, mrr: 0 });
  const [accounts, setAccounts] = useState<any[]>([]);
  const [nexusUsers, setNexusUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Global Settings State
  const [globalSettings, setGlobalSettings] = useState<any>({
    login_title: '', login_subtitle: '', login_badge_text: '', login_quote_text: '', login_quote_author: '', login_quote_role: ''
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Modal State - Create Account
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({ company_name: '', owner_name: '', email: '', plan: 'pro' });
  const [creating, setCreating] = useState(false);
  const [createdInfo, setCreatedInfo] = useState<any>(null);

  // Modal State - Edit Account
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [editAccFormData, setEditAccFormData] = useState({ company_name: '', owner_name: '', email: '', plan: 'pro', expires_at: '' });
  const [newPassword, setNewPassword] = useState<string | null>(null);

  // Modal State - Edit User
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editUserFormData, setEditUserFormData] = useState({ name: '', email: '', role: 'NEXUS_ADMIN', status: 'active' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, accountsRes, settingsRes, usersRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/accounts'),
        fetch('/api/global-settings'),
        fetch('/api/users?account_id=acc_nexus')
      ]);
      
      if (statsRes.ok) setStats(await statsRes.json());
      if (accountsRes.ok) setAccounts(await accountsRes.json());
      if (settingsRes.ok) setGlobalSettings(await settingsRes.json());
      if (usersRes.ok) setNexusUsers(await usersRes.json());
    } catch (e) {
      console.error('Failed to fetch admin data', e);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Account Handlers ---

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    try {
      await fetch(`/api/admin/accounts/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      fetchData();
    } catch(e) {
      console.error(e);
      alert('Erro ao alterar status');
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        const data = await res.json();
        setCreatedInfo({ ...data, email: formData.email });
        fetchData();
        setFormData({ company_name: '', owner_name: '', email: '', plan: 'pro' });
        setIsAddModalOpen(false);
      } else {
        const errData = await res.json();
        alert(`Falha ao criar conta: ${errData.error || 'Erro interno no servidor'}`);
      }
    } catch (e) {
      console.error(e);
      alert('Erro.');
    } finally {
      setCreating(false);
    }
  };

  const handleEditAccount = (acc: any) => {
    setEditingAccount(acc);
    setEditAccFormData({
      company_name: acc.company_name,
      owner_name: acc.owner_name,
      email: acc.email,
      plan: acc.plan,
      expires_at: acc.expires_at ? acc.expires_at.split('T')[0] : ''
    });
    setNewPassword(null);
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/admin/accounts/${editingAccount.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editAccFormData)
      });
      if (res.ok) {
        setEditingAccount(null);
        fetchData();
      } else {
        alert('Erro ao atualizar conta');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetPassword = async () => {
    if (!confirm('Deseja gerar uma nova senha temporária para o proprietário desta conta?')) return;
    try {
      const res = await fetch(`/api/admin/accounts/${editingAccount.id}/reset-password`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setNewPassword(data.newPassword);
      } else {
        alert('Erro ao resetar senha');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // --- User Handlers ---

  const handleCreateNexusUser = async () => {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: 'Novo Admin Nexus', 
          email: `admin_${Date.now()}@nexus.com`, 
          role: 'NEXUS_ADMIN', 
          status: 'active',
          account_id: 'acc_nexus',
          password: '123'
        })
      });
      if (res.ok) fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setEditUserFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    });
  };

  const handleUpdateNexusUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editUserFormData)
      });
      if (res.ok) {
        setEditingUser(null);
        fetchData();
      } else {
        alert('Erro ao atualizar usuário');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteNexusUser = async (id: string) => {
    if (id === currentUser?.id) return alert('Você não pode excluir a si mesmo.');
    if (!confirm('Tem certeza que deseja remover este administrador?')) return;
    try {
      await fetch(`/api/users/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  // --- Settings Handlers ---

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/global-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(globalSettings)
      });
      if (res.ok) {
        alert('Configurações Globais atualizadas com sucesso!');
      } else {
        alert('Erro ao salvar as configurações.');
      }
    } catch(e) {
      console.error(e);
      alert('Erro de comunicação.');
    } finally {
      setSavingSettings(false);
    }
  };

  const kpis = [
    { title: 'Contas Licenciadas', value: stats.totalAccounts, icon: Building2, active: stats.activeAccounts },
    { title: 'Usuários no Ecossistema', value: stats.totalUsers, icon: Activity },
    { title: 'Receita Mensal (MRR)', value: `R$ ${stats.mrr},00`, icon: DollarSign },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* Sidebar */}
      <aside className={`bg-gray-900 text-slate-300 w-64 flex-shrink-0 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed md:relative z-30 h-full`}>
        <div className="p-6 flex items-center justify-between">
          <h1 className="text-xl font-black tracking-widest text-white flex items-center gap-2">
            <ShieldCheck className="text-blue-500" /> NEXUS
          </h1>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden hover:text-white">
            <X size={20} />
          </button>
        </div>
        <nav className="mt-6 space-y-1">
          <button 
            onClick={() => setActiveTab('accounts')}
            className={`w-full flex items-center px-6 py-3 transition-colors ${activeTab === 'accounts' ? 'bg-gray-800 text-white border-l-4 border-blue-500' : 'hover:bg-gray-800 hover:text-white'}`}
          >
            <Building2 className="mr-3" size={20} />
            Gestão de Contas Mãe
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center px-6 py-3 transition-colors ${activeTab === 'users' ? 'bg-gray-800 text-white border-l-4 border-blue-500' : 'hover:bg-gray-800 hover:text-white'}`}
          >
            <Users className="mr-3" size={20} />
            Administradores Nexus
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center px-6 py-3 transition-colors ${activeTab === 'settings' ? 'bg-gray-800 text-white border-l-4 border-blue-500' : 'hover:bg-gray-800 hover:text-white'}`}
          >
            <Settings className="mr-3" size={20} />
            Configurações Globais
          </button>
        </nav>
        <div className="absolute bottom-0 w-full p-6 border-t border-gray-800">
          <button onClick={logout} className="flex items-center w-full px-4 py-2 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
            <LogOut className="mr-3" size={20} />
            Sair do Painel
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 z-10">
          <div className="flex items-center justify-between px-8 py-4">
            <div className="flex items-center">
              <button onClick={() => setIsSidebarOpen(true)} className={`mr-4 text-slate-500 hover:text-slate-900 md:hidden ${isSidebarOpen ? 'hidden' : 'block'}`}>
                <Menu size={24} />
              </button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar Conta / Tenant..." 
                  className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-72 text-sm"
                />
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <button className="text-slate-400 hover:text-slate-600 relative">
                <Bell size={20} />
              </button>
              <div className="flex items-center space-x-3 border-l pl-6">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                  {currentUser?.name.charAt(0)}
                </div>
                <div className="hidden sm:block">
                  <span className="text-sm font-bold text-slate-900 block">{currentUser?.name}</span>
                  <span className="text-xs text-slate-500">Super Admin</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-8 relative">
          
          {activeTab === 'accounts' && (
            <>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Software Core</h2>
                  <p className="text-slate-500 font-medium mt-1">Gerencie licenças e recursos globais das Contas.</p>
                </div>
                <button 
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-95"
                >
                  <Plus size={18} />
                  Nova Licença
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {kpis.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-6 flex flex-col justify-center">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                          <Icon size={24} />
                        </div>
                      </div>
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">{stat.title}</p>
                      <p className="text-4xl font-black text-slate-900 mt-1">{isLoading ? '-' : stat.value}</p>
                      {stat.active !== undefined && (
                        <div className="mt-3 text-sm font-medium text-green-600 flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          {stat.active} licenças ativas no momento
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Master Accounts Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="text-lg font-bold text-slate-900">Contas Mãe Ativas e Suspensas</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white border-b border-gray-100/80 text-slate-400 text-xs uppercase tracking-wider font-bold">
                        <th className="px-6 py-4">Empresa (Tenant)</th>
                        <th className="px-6 py-4">Plano</th>
                        <th className="px-6 py-4">Proprietário / Email</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {accounts.filter(acc => acc.id !== 'acc_nexus').map((acc) => (
                        <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold shadow-sm ${acc.status === 'active' ? 'bg-gradient-to-tr from-blue-600 to-indigo-600' : 'bg-gray-300'}`}>
                                {acc.company_name.charAt(0)}
                              </div>
                              <div>
                                <div className="text-sm font-bold text-slate-900">{acc.company_name}</div>
                                <div className="text-xs font-mono text-slate-400 mt-0.5">{acc.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                              {acc.plan}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                             <div className="text-sm font-bold text-slate-800">{acc.owner_name}</div>
                             <div className="text-xs text-slate-500 font-medium">{acc.email}</div>
                          </td>
                          <td className="px-6 py-5">
                            {acc.status === 'active' ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)] animate-pulse"></div> Ativo
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                                 Suspenso
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-5 text-right font-medium">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => handleEditAccount(acc)}
                                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                              >
                                <Edit2 size={14} /> Editar
                              </button>
                              {acc.status === 'active' ? (
                                <button 
                                  onClick={() => handleToggleStatus(acc.id, acc.status)}
                                  className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                                >
                                 <Pause size={14} /> Suspender
                                </button>
                              ) : (
                                <button 
                                  onClick={() => handleToggleStatus(acc.id, acc.status)}
                                  className="inline-flex items-center gap-2 text-sm text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors"
                                >
                                 <Play size={14} /> Reativar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {accounts.length === 0 && !isLoading && (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">Nenhuma conta cadastrada no banco.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTab === 'users' && (
            <div className="max-w-5xl">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Administradores Nexus</h2>
                  <p className="text-slate-500 font-medium mt-1">Gerencie os usuários que têm acesso a este painel administrativo.</p>
                </div>
                <button 
                  onClick={handleCreateNexusUser}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-95"
                >
                  <Plus size={18} />
                  Novo Administrador
                </button>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-gray-100 text-slate-400 text-xs uppercase tracking-wider font-bold">
                      <th className="px-6 py-4">Nome / Email</th>
                      <th className="px-6 py-4">Cargo</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {nexusUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-5">
                          <div className="text-sm font-bold text-slate-900">{user.name}</div>
                          <div className="text-xs text-slate-500">{user.email}</div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="inline-flex items-center px-2 py-1 rounded bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-tighter">
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                           <span className="text-xs font-bold text-green-600">{user.status}</span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => handleEditUser(user)}
                              className="p-2 text-slate-300 hover:text-blue-500 transition-colors"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeleteNexusUser(user.id)}
                              className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-3xl">
              <div className="mb-8">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">White-label / Login Screen</h2>
                <p className="text-slate-500 font-medium mt-1">Personalize a identidade da tela de Login de forma global no sistema.</p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">
                <div className="px-8 py-6 border-b border-gray-100 bg-slate-50/50">
                  <h3 className="text-lg font-bold text-slate-900">Textos Dinâmicos da Tela de Login</h3>
                </div>
                <div className="p-8 space-y-6">
                  
                  <div className="space-y-1">
                    <label className="text-xs uppercase tracking-wider font-bold text-slate-500">Badge (Etiqueta Brilhante superior)</label>
                    <input 
                      type="text" 
                      value={globalSettings?.login_badge_text || ''}
                      onChange={e => setGlobalSettings({...globalSettings, login_badge_text: e.target.value})}
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs uppercase tracking-wider font-bold text-slate-500">Título Principal</label>
                    <input 
                      type="text" 
                      value={globalSettings?.login_title || ''}
                      onChange={e => setGlobalSettings({...globalSettings, login_title: e.target.value})}
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-blue-500 text-lg" 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs uppercase tracking-wider font-bold text-slate-500">Subtítulo Explicativo</label>
                    <textarea 
                      rows={2}
                      value={globalSettings?.login_subtitle || ''}
                      onChange={e => setGlobalSettings({...globalSettings, login_subtitle: e.target.value})}
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>

                  <div className="border-t border-gray-100 pt-6 mt-6">
                    <h4 className="text-sm font-bold text-slate-800 mb-4">Cartão de Depoimento Flutuante (Glassmorphism)</h4>
                    
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs uppercase tracking-wider font-bold text-slate-500">Texto Citação (Aspas)</label>
                        <textarea 
                          rows={3}
                          value={globalSettings?.login_quote_text || ''}
                          onChange={e => setGlobalSettings({...globalSettings, login_quote_text: e.target.value})}
                          className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-blue-500 italic" 
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs uppercase tracking-wider font-bold text-slate-500">Autor do Depoimento</label>
                          <input 
                            type="text" 
                            value={globalSettings?.login_quote_author || ''}
                            onChange={e => setGlobalSettings({...globalSettings, login_quote_author: e.target.value})}
                            className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-blue-500" 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs uppercase tracking-wider font-bold text-slate-500">Cargo / Empresa (Subtitle)</label>
                          <input 
                            type="text" 
                            value={globalSettings?.login_quote_role || ''}
                            onChange={e => setGlobalSettings({...globalSettings, login_quote_role: e.target.value})}
                            className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-blue-500 text-blue-600" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6">
                    <button 
                      onClick={handleSaveSettings}
                      disabled={savingSettings}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 active:scale-95 ml-auto"
                    >
                      {savingSettings ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Save size={18} />
                          Salvar Alterações Globais
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Creation Modal */}
      {isAddModalOpen && !createdInfo && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl">
            <h3 className="text-2xl font-black text-slate-900 mb-2">Criar Nova Licença</h3>
            <p className="text-slate-500 font-medium text-sm mb-6">Uma nova Conta Mãe isolada será provisionada instantaneamente no banco de dados.</p>
            
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-bold tracking-wider uppercase text-slate-500 mb-1">Nome da Empresa</label>
                <input required value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} type="text" className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-blue-500" placeholder="Acme Inc." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold tracking-wider uppercase text-slate-500 mb-1">Nome do Proprietário</label>
                  <input required value={formData.owner_name} onChange={e => setFormData({...formData, owner_name: e.target.value})} type="text" className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-blue-500" placeholder="João Silva" />
                </div>
                <div>
                  <label className="block text-xs font-bold tracking-wider uppercase text-slate-500 mb-1">Plano Inicial</label>
                  <select value={formData.plan} onChange={e => setFormData({...formData, plan: e.target.value})} className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold tracking-wider uppercase text-slate-500 mb-1">E-mail Principal (Login)</label>
                <input required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} type="email" className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-blue-500" placeholder="joao@acme.com" />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 bg-white border border-gray-200 rounded-xl text-slate-700 font-bold hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={creating} className="flex-1 py-3 bg-blue-600 rounded-xl text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 active:scale-95 flex justify-center items-center">
                  {creating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Provisionar Conta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {createdInfo && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl border-t-8 border-green-500 text-center">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
               <ShieldCheck size={32} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Conta Ativada!</h3>
            <p className="text-slate-500 font-medium text-sm mb-6">A infraestrutura da empresa <strong>{createdInfo.company_name}</strong> foi inicializada. Entregue os dados abaixo ao proprietário.</p>
            
            <div className="bg-slate-50 rounded-xl p-4 text-left border border-gray-200 mb-6 space-y-3">
               <div>
                  <p className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-1 flex justify-between">Email de Acesso</p>
                  <p className="font-mono text-slate-900 font-bold bg-white p-2 rounded border border-gray-200">{createdInfo.email}</p>
               </div>
               <div>
                  <p className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-1 flex items-center gap-1"><Key size={12}/> Senha Provisória</p>
                  <p className="font-mono text-slate-900 font-bold bg-white p-2 rounded border border-gray-200 text-red-600 tracking-wider">
                    {createdInfo.defaultPassword}
                  </p>
               </div>
            </div>

            <button onClick={() => setCreatedInfo(null)} className="w-full py-3 bg-slate-900 rounded-xl text-white font-bold hover:bg-black transition-colors">
              Concluir
            </button>
          </div>
        </div>
      )}

      {/* Edit Account Modal */}
      {editingAccount && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-xl shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-slate-900">Configurar Licença</h3>
              <button onClick={() => setEditingAccount(null)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleUpdateAccount} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold tracking-wider uppercase text-slate-500 mb-1">Nome da Empresa</label>
                  <input required value={editAccFormData.company_name} onChange={e => setEditAccFormData({...editAccFormData, company_name: e.target.value})} type="text" className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold tracking-wider uppercase text-slate-500 mb-1">Proprietário</label>
                  <input required value={editAccFormData.owner_name} onChange={e => setEditAccFormData({...editAccFormData, owner_name: e.target.value})} type="text" className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold tracking-wider uppercase text-slate-500 mb-1">E-mail de Login (Proprietário)</label>
                <input required value={editAccFormData.email} onChange={e => setEditAccFormData({...editAccFormData, email: e.target.value})} type="email" className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold tracking-wider uppercase text-slate-500 mb-1">Plano</label>
                  <select value={editAccFormData.plan} onChange={e => setEditAccFormData({...editAccFormData, plan: e.target.value})} className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold tracking-wider uppercase text-slate-500 mb-1">Data de Expiração</label>
                  <input value={editAccFormData.expires_at} onChange={e => setEditAccFormData({...editAccFormData, expires_at: e.target.value})} type="date" className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Password Reset Section */}
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Segurança do Acesso</h4>
                    <p className="text-xs text-slate-500">Gere uma nova senha temporária para o proprietário.</p>
                  </div>
                  <button 
                    type="button"
                    onClick={handleResetPassword}
                    className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2 rounded-xl transition-all active:scale-95 text-xs"
                  >
                    <Key size={14} /> Gerar Nova Senha
                  </button>
                </div>
                
                {newPassword && (
                  <div className="bg-indigo-600 rounded-xl p-4 text-white animate-in zoom-in-95 duration-200">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Nova Senha Gerada:</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xl font-mono font-bold tracking-wider">{newPassword}</p>
                      <button type="button" onClick={() => {navigator.clipboard.writeText(newPassword); alert('Copiado!')}} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><Edit2 size={16} /></button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setEditingAccount(null)} className="flex-1 py-3.5 bg-white border border-gray-200 rounded-xl text-slate-700 font-bold hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-3.5 bg-blue-600 rounded-xl text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 active:scale-95 flex justify-center items-center gap-2">
                  <Save size={18} /> Salvar Configurações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl">
            <h3 className="text-2xl font-black text-slate-900 mb-2">Editar Administrador</h3>
            <p className="text-slate-500 font-medium text-sm mb-6">Atualize as informações de acesso do administrador.</p>
            
            <form onSubmit={handleUpdateNexusUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold tracking-wider uppercase text-slate-500 mb-1">Nome Completo</label>
                <input required value={editUserFormData.name} onChange={e => setEditUserFormData({...editUserFormData, name: e.target.value})} type="text" className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-bold tracking-wider uppercase text-slate-500 mb-1">E-mail de Acesso</label>
                <input required value={editUserFormData.email} onChange={e => setEditUserFormData({...editUserFormData, email: e.target.value})} type="email" className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold tracking-wider uppercase text-slate-500 mb-1">Cargo</label>
                  <select value={editUserFormData.role} onChange={e => setEditUserFormData({...editUserFormData, role: e.target.value})} className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="NEXUS_ADMIN">Super Admin</option>
                    <option value="ACCOUNT_ADMIN">Account Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold tracking-wider uppercase text-slate-500 mb-1">Status</label>
                  <select value={editUserFormData.status} onChange={e => setEditUserFormData({...editUserFormData, status: e.target.value})} className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="active">Ativo</option>
                    <option value="disabled">Suspenso</option>
                  </select>
                </div>
              </div>

              {/* Password Reset for Admin */}
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Segurança</h4>
                    <p className="text-xs text-slate-500">Gere uma nova senha para este administrador.</p>
                  </div>
                  <button 
                    type="button"
                    onClick={handleResetUserPassword}
                    className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2 rounded-xl transition-all active:scale-95 text-xs"
                  >
                    <Key size={14} /> Resetar Senha
                  </button>
                </div>
                
                {newUserPassword && (
                  <div className="bg-indigo-600 rounded-xl p-4 text-white animate-in zoom-in-95 duration-200">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Nova Senha Gerada:</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xl font-mono font-bold tracking-wider">{newUserPassword}</p>
                      <button type="button" onClick={() => {navigator.clipboard.writeText(newUserPassword); alert('Copiado!')}} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><Edit2 size={16} /></button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setEditingUser(null)} className="flex-1 py-3 bg-white border border-gray-200 rounded-xl text-slate-700 font-bold hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 rounded-xl text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 active:scale-95">
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
