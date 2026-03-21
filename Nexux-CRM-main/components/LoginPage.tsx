
import React, { useState, useEffect } from 'react';
import { useCRM } from '../context/CRMContext';
import { Hexagon, ArrowRight, Lock, Mail, AlertCircle, User, CheckCircle, Building } from 'lucide-react';
import { api } from '../services/api';

export const LoginPage = () => {
  const { login, registerAccount } = useCRM();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); 
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [bgImage, setBgImage] = useState('https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=2000');

  useEffect(() => {
    api.get<any>('/public/settings').then(settings => {
        if (settings.login_background) setBgImage(settings.login_background);
    }).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
        if (isRegistering) {
            const result = await registerAccount(name, email, password, companyName);
            if (result !== true) setError(typeof result === 'string' ? result : 'Erro ao criar conta.');
            else setSuccess('Conta criada! Entrando...');
        } else {
            const result = await login(email, password);
            if (result !== true) setError(typeof result === 'string' ? result : 'Erro ao fazer login.');
        }
    } catch (err) {
        setError('Ocorreu um erro inesperado.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex overflow-hidden">
      <div className="hidden lg:block lg:w-[60%] relative overflow-hidden bg-slate-900">
          <div 
            className="absolute inset-0 bg-cover bg-center transition-all duration-1000 transform hover:scale-105"
            style={{ backgroundImage: `url(${bgImage})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-slate-900/80 via-slate-900/20 to-transparent" />
          <div className="absolute bottom-12 left-12 max-w-lg text-white">
              <div className="flex items-center gap-3 mb-6">
                <Hexagon className="text-blue-400 w-8 h-8 fill-current" />
                <span className="text-2xl font-black tracking-tighter">NEXUS CRM</span>
              </div>
              <h2 className="text-4xl font-bold mb-4 leading-tight">O futuro da sua gestão comercial começa aqui.</h2>
          </div>
      </div>
      <div className="w-full lg:w-[40%] flex items-center justify-center p-8 bg-white animate-fade-in relative">
        <div className="w-full max-sm:w-full space-y-8 max-w-sm">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                {isRegistering ? 'Crie sua conta' : 'Acesse o sistema'}
            </h1>
            {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold flex items-center gap-3 border border-red-100 animate-scale-in"><AlertCircle size={20} />{error}</div>}
            {success && <div className="bg-green-50 text-green-600 p-4 rounded-xl text-sm font-bold flex items-center gap-3 border border-green-100 animate-scale-in"><CheckCircle size={20} />{success}</div>}
            <form onSubmit={handleSubmit} className="space-y-5">
                {isRegistering && (
                    <div className="space-y-5">
                        <input required value={name} onChange={e => setName(e.target.value)} placeholder="Seu Nome" className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3.5 px-4 outline-none focus:bg-white focus:border-blue-500 transition-all font-bold" />
                        <input required value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Nome da Empresa" className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3.5 px-4 outline-none focus:bg-white focus:border-blue-500 transition-all font-bold" />
                    </div>
                )}
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3.5 px-4 outline-none focus:bg-white focus:border-blue-500 transition-all font-bold" />
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3.5 px-4 outline-none focus:bg-white focus:border-blue-500 transition-all font-bold" />
                <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-black text-sm uppercase tracking-widest py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-[0.98] flex justify-center items-center gap-3 disabled:opacity-70">
                    {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <>{isRegistering ? 'Criar minha conta' : 'Entrar'}<ArrowRight size={20} /></>}
                </button>
            </form>
            <button onClick={() => setIsRegistering(!isRegistering)} className="w-full text-center text-sm font-medium text-blue-600 hover:text-blue-800">
                {isRegistering ? 'Já possui conta? Entrar' : 'Ainda não tem conta? Cadastre-se'}
            </button>
        </div>
      </div>
    </div>
  );
};
