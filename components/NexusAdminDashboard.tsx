import React, { useState, useEffect, useRef } from 'react';
import { useCRM } from '../context/CRMContext';
import { Account, User as UserType, UserRole } from '../types';
import { Building, Power, Clock, Plus, Search, ShieldCheck, Calendar, User, Settings, Save, CheckCircle, Upload, Trash2 } from 'lucide-react';
import { api } from '../services/api';

export const NexusAdminDashboard = () => {
  const { allAccounts, createAccount, updateAccountStatus, extendAccountSubscription } = useCRM();
  const [activeTab, setActiveTab] = useState<'accounts' | 'settings'>('accounts');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [systemSettings, setSystemSettings] = useState({ login_background: '' });

  useEffect(() => {
      api.get<any>('/public/settings').then(setSystemSettings).catch(console.error);
  }, []);

  const filteredAccounts = allAccounts.filter(a => 
      a.companyName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      a.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const saveSystemSettings = async () => {
      setIsSaving(true);
      try {
          await api.patch('/admin/settings', systemSettings);
          setShowSaveToast(true);
          setTimeout(() => setShowSaveToast(false), 3000);
      } catch (e) {
          alert('Erro ao salvar.');
      } finally {
          setIsSaving(false);
      }
  };

  return (
    <div className="flex-1 bg-gray-50 h-full overflow-hidden flex flex-col animate-fade-in relative">
        <div className="h-20 bg-white border-b border-gray-200 px-8 flex items-center justify-between shadow-sm">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <ShieldCheck className="text-blue-600" /> Nexus Admin
            </h1>
            <div className="flex gap-4">
                <button onClick={() => setActiveTab('accounts')} className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'accounts' ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>Contas</button>
                <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'settings' ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>Configurações</button>
            </div>
        </div>

        <div className="flex-1 overflow-auto p-8">
            {activeTab === 'accounts' ? (
                <div className="space-y-6">
                    <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg"><Plus size={20} /> Nova Conta</button>
                    {filteredAccounts.map(account => (
                        <div key={account.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">{account.companyName}</h3>
                                <p className="text-sm text-gray-500">{account.email}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => updateAccountStatus(account.id, account.status === 'active' ? 'suspended' : 'active')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-tight border ${account.status === 'active' ? 'border-red-200 text-red-600' : 'border-green-200 text-green-600'}`}>
                                    {account.status === 'active' ? 'Suspender' : 'Ativar'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="max-w-2xl mx-auto bg-white p-8 rounded-3xl border shadow-sm space-y-8">
                    <h3 className="text-xl font-black text-gray-900">Configurações Globais</h3>
                    <div className="space-y-4">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">URL da Imagem de Fundo</label>
                        <input value={systemSettings.login_background} onChange={e => setSystemSettings({ ...systemSettings, login_background: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:bg-white focus:border-blue-500 transition-all font-bold" placeholder="https://..." />
                        <button onClick={saveSystemSettings} disabled={isSaving} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 shadow-xl disabled:opacity-50">
                            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </div>
            )}
        </div>
        {showSaveToast && <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-scale-in z-50"><CheckCircle className="text-green-400" size={20} /><span className="font-bold text-sm">Atualizado!</span></div>}
    </div>
  );
};