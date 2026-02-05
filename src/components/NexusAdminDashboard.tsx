
import React, { useState, useEffect, useRef } from 'react';
import { useCRM } from '../context/CRMContext';
import { Account, User as UserType, UserRole } from '../types';
import { Building, UserPlus, Power, Clock, Plus, Search, ShieldCheck, AlertCircle, Calendar, User, Settings, Image as ImageIcon, Save, CheckCircle, Upload, X, Trash2 } from 'lucide-react';
import { api } from '../services/api';

type AdminTab = 'accounts' | 'settings';

export const NexusAdminDashboard = () => {
  const { allAccounts, createAccount, updateAccountStatus, extendAccountSubscription } = useCRM();
  const [activeTab, setActiveTab] = useState<AdminTab>('accounts');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // System Settings State
  const [systemSettings, setSystemSettings] = useState({
      login_background: ''
  });

  useEffect(() => {
      api.get<any>('/public/settings').then(setSystemSettings).catch(console.error);
  }, []);

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
          expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
          visibilityConfig: {
            level: 'public',
            allowUserExport: false,
            showTeamGoals: true
          }
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

  const handleFileChange = (file: File) => {
      if (!file.type.startsWith('image/')) {
          alert('Por favor, selecione um arquivo de imagem.');
          return;
      }

      if (file.size > 2 * 1024 * 1024) { // 2MB limit for base64 storage
          alert('A imagem é muito grande. Escolha um arquivo de até 2MB para garantir a performance.');
          return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
          const base64 = e.target?.result as string;
          setSystemSettings(prev => ({ ...prev, login_background: base64 }));
      };
      reader.readAsDataURL(file);
  };

  const saveSystemSettings = async () => {
      setIsSaving(true);
      try {
          await api.patch('/admin/settings', systemSettings);
          setShowSaveToast(true);
          setTimeout(() => setShowSaveToast(false), 3000);
      } catch (e) {
          alert('Erro ao salvar configurações.');
      } finally {
          setIsSaving(false);
      }
  };

  const onDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
  };

  const onDragLeave = () => {
      setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileChange(file);
  };

  const getDaysRemaining = (dateStr: string) => {
      const diff = new Date(dateStr).getTime() - new Date().getTime();
      const days = Math.ceil(diff / (1000 * 3600 * 24));
      return days;
  };

  return (
    <div className="flex-1 bg-gray-50 h-full overflow-hidden flex flex-col animate-fade-in relative">
        <div className="h-20 bg-white border-b border-gray-200 px-8 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <ShieldCheck className="text-blue-600" />
                        Nexus Admin Panel
                    </h1>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                    <button 
                        onClick={() => setActiveTab('accounts')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'accounts' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Building size={16} /> Contas Mãe
                    </button>
                    <button 
                        onClick={() => setActiveTab('settings')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'settings' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Settings size={16} /> Configurações Globais
                    </button>
                </div>
            </div>
            
            {activeTab === 'accounts' && (
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
                        className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-100"
                    >
                        <Plus size={20} /> Nova Conta
                    </button>
                </div>
            )}
        </div>

        <div className="flex-1 overflow-auto p-8">
            {activeTab === 'accounts' ? (
                <div className="grid grid-cols-1 gap-6">
                    {filteredAccounts.map(account => {
                        const daysRemaining = getDaysRemaining(account.expiresAt);
                        const isExpired = daysRemaining < 0;

                        return (
                            <div key={account.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row justify-between items-center gap-6 hover:border-blue-200 transition-colors">
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 border border-blue-100">
                                        <Building size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                            {account.companyName}
                                            <span className={`text-[10px] px-2 py-0.5 rounded-lg uppercase font-black border ${account.status === 'active' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                                {account.status === 'active' ? 'Ativo' : 'Suspenso'}
                                            </span>
                                        </h3>
                                        <p className="text-sm text-gray-500 flex items-center gap-2 mt-1 font-medium">
                                            <User size={14} /> Dono: {account.ownerName} ({account.email})
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1 uppercase font-black tracking-widest bg-gray-50 px-2 py-1 rounded inline-block">Plano {account.plan}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 border-l border-gray-100 pl-6 h-full">
                                    <div className="text-center min-w-[120px]">
                                        <div className="flex items-center justify-center gap-1 text-gray-400 text-[10px] uppercase font-black mb-1">
                                            <Clock size={12} /> Expiração
                                        </div>
                                        <div className={`text-xl font-black ${isExpired ? 'text-red-600' : daysRemaining < 30 ? 'text-yellow-600' : 'text-gray-800'}`}>
                                            {isExpired ? 'Expirado' : `${daysRemaining} dias`}
                                        </div>
                                        <p className="text-[10px] text-gray-400 font-bold">{new Date(account.expiresAt).toLocaleDateString()}</p>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <button 
                                            onClick={() => updateAccountStatus(account.id, account.status === 'active' ? 'suspended' : 'active')}
                                            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-tight border flex items-center justify-center gap-2 w-32 transition-colors ${
                                                account.status === 'active' 
                                                ? 'border-red-200 text-red-600 hover:bg-red-50' 
                                                : 'border-green-200 text-green-600 hover:bg-green-50'
                                            }`}
                                        >
                                            <Power size={14} />
                                            {account.status === 'active' ? 'Suspenso' : 'Ativo'}
                                        </button>
                                        <button 
                                            onClick={() => extendAccountSubscription(account.id, 1)}
                                            className="px-4 py-2 rounded-lg text-xs font-black uppercase tracking-tight border border-blue-200 text-blue-600 hover:bg-blue-50 flex items-center justify-center gap-2 w-32"
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
            ) : (
                <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
                    <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm space-y-8">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                                    <ImageIcon size={24} className="text-blue-600" />
                                    Aparência do Login
                                </h3>
                                <p className="text-gray-500 text-sm mt-1 font-medium">Personalize a imagem de fundo da tela de acesso.</p>
                            </div>
                            <button 
                                onClick={saveSystemSettings}
                                disabled={isSaving}
                                className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-100 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSaving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <Save size={18} />}
                                Salvar Tudo
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 block ml-1">Upload da Imagem de Fundo</label>
                                
                                <div 
                                    onDragOver={onDragOver}
                                    onDragLeave={onDragLeave}
                                    onDrop={onDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`
                                        relative group cursor-pointer border-2 border-dashed rounded-3xl p-12 transition-all flex flex-col items-center justify-center gap-4
                                        ${isDragging ? 'border-blue-500 bg-blue-50 scale-[0.99]' : 'border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-white'}
                                    `}
                                >
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        className="hidden" 
                                        accept="image/*"
                                        onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
                                    />
                                    
                                    <div className={`p-4 rounded-2xl transition-colors ${isDragging ? 'bg-blue-100 text-blue-600' : 'bg-white text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500 shadow-sm'}`}>
                                        <Upload size={32} />
                                    </div>
                                    
                                    <div className="text-center">
                                        <p className="font-black text-gray-800 tracking-tight">Arraste e solte sua imagem aqui</p>
                                        <p className="text-sm text-gray-500 font-medium">Ou clique para selecionar dos seus arquivos</p>
                                    </div>
                                    
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">JPG, PNG ou WebP (Máx. 2MB)</p>
                                </div>
                            </div>

                            {systemSettings.login_background && (
                                <div className="pt-2 animate-fade-in">
                                    <div className="flex justify-between items-center mb-4">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest block ml-1">Pré-visualização</label>
                                        <button 
                                            onClick={() => setSystemSettings(prev => ({ ...prev, login_background: '' }))}
                                            className="text-red-500 hover:text-red-700 flex items-center gap-1 text-xs font-black uppercase tracking-tight"
                                        >
                                            <Trash2 size={14} /> Remover Imagem
                                        </button>
                                    </div>
                                    <div className="aspect-video w-full rounded-3xl overflow-hidden border border-gray-200 shadow-2xl bg-slate-900 relative">
                                        <div 
                                            className="absolute inset-0 bg-cover bg-center transition-all duration-700"
                                            style={{ backgroundImage: `url(${systemSettings.login_background})` }}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-tr from-black/40 to-transparent" />
                                        
                                        {/* Representação simulada da tela de login */}
                                        <div className="absolute inset-y-0 right-0 w-1/3 bg-white/90 backdrop-blur-md flex items-center justify-center p-8 border-l border-white/20">
                                            <div className="w-full space-y-4">
                                                <div className="w-12 h-12 bg-blue-600 rounded-xl mb-6 mx-auto" />
                                                <div className="h-2 w-3/4 bg-gray-200 rounded-full mx-auto" />
                                                <div className="h-8 w-full bg-gray-100 rounded-xl" />
                                                <div className="h-8 w-full bg-gray-100 rounded-xl" />
                                                <div className="h-10 w-full bg-blue-600 rounded-xl opacity-50" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* SAVE TOAST */}
        {showSaveToast && (
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-scale-in z-50">
                <CheckCircle className="text-green-400" size={20} />
                <span className="font-bold text-sm">Configurações globais atualizadas!</span>
            </div>
        )}

        {/* Create Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-scale-in">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Nova Conta Mãe</h2>
                    <p className="text-gray-500 text-sm mb-6">Cadastre uma nova empresa no ecossistema Nexus.</p>
                    
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
                                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all font-bold"
                                value={newAcc.email}
                                onChange={e => setNewAcc({...newAcc, email: e.target.value})}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Plano</label>
                                <select 
                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all font-bold appearance-none"
                                    value={newAcc.plan}
                                    onChange={e => setNewAcc({...newAcc, plan: e.target.value as any})}
                                >
                                    <option value="trial">Trial</option>
                                    <option value="pro">Pro</option>
                                    <option value="enterprise">Enterprise</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Senha Inicial</label>
                                <input 
                                    type="text"
                                    placeholder="Ex: 123"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all font-bold"
                                    value={newAcc.password}
                                    onChange={e => setNewAcc({...newAcc, password: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-gray-500 font-bold hover:bg-gray-100 rounded-2xl transition-all">Cancelar</button>
                            <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-100 active:scale-95 transition-all">Criar Conta</button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};
