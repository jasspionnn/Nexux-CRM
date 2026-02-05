
import React, { useState, useEffect } from 'react';
import { useCRM } from '../context/CRMContext';
import { Hexagon, ArrowRight, Lock, Mail, AlertCircle, User, UserPlus, CheckCircle, Building } from 'lucide-react';
import { api } from '../services/api';

export const LoginPage = () => {
  const { login, registerAccount } = useCRM();
  
  // Form States
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); 
  const [companyName, setCompanyName] = useState('');
  
  // UI States
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [bgImage, setBgImage] = useState('https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=2000');

  useEffect(() => {
    // Busca configuração pública (como a imagem de fundo)
    api.get<any>('/public/settings').then(settings => {
        if (settings.login_background) {
            setBgImage(settings.login_background);
        }
    }).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
        if (isRegistering) {
            if (!name || !email || !password || !companyName) {
                setError('Por favor, preencha todos os campos.');
                setLoading(false);
                return;
            }

            const result = await registerAccount(name, email, password, companyName);
            if (result !== true) {
                 setError(typeof result === 'string' ? result : 'Erro ao criar conta.');
            } else {
                 setSuccess('Conta criada! Entrando...');
            }
        } else {
            const result = await login(email, password);
            if (result !== true) {
                setError(typeof result === 'string' ? result : 'Erro ao fazer login. Verifique suas credenciais.');
            }
        }
    } catch (err) {
        setError('Ocorreu um erro inesperado.');
    } finally {
        setLoading(false);
    }
  };

  const toggleMode = () => {
      setIsRegistering(!isRegistering);
      setError('');
      setSuccess('');
      setCompanyName('');
  };

  return (
    <div className="min-h-screen bg-white flex overflow-hidden">
      
      {/* LADO ESQUERDO: IMAGEM DE FUNDO (60%) */}
      <div className="hidden lg:block lg:w-[60%] relative overflow-hidden bg-slate-900">
          <div 
            className="absolute inset-0 bg-cover bg-center transition-all duration-1000 transform hover:scale-105"
            style={{ backgroundImage: `url(${bgImage})` }}
          />
          {/* Overlay gradiente para melhorar contraste e estética */}
          <div className="absolute inset-0 bg-gradient-to-tr from-slate-900/80 via-slate-900/20 to-transparent" />
          
          {/* Conteúdo flutuante sobre a imagem */}
          <div className="absolute bottom-12 left-12 max-w-lg text-white">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20">
                    <Hexagon className="text-blue-400 w-8 h-8 fill-current" />
                </div>
                <span className="text-2xl font-black tracking-tighter">NEXUS CRM</span>
              </div>
              <h2 className="text-4xl font-bold mb-4 leading-tight">O futuro da sua gestão comercial começa aqui.</h2>
              <p className="text-slate-300 font-medium">Pipeline inteligente, automação de vendas e visão estratégica para escalar seu negócio.</p>
          </div>
      </div>

      {/* LADO DIREITO: FORMULÁRIO (40%) */}
      <div className="w-full lg:w-[40%] flex items-center justify-center p-8 sm:p-12 md:p-16 lg:p-20 bg-white animate-fade-in relative">
        <div className="w-full max-w-sm space-y-8">
            <div className="text-left">
                <div className="lg:hidden flex justify-start mb-6">
                    <div className="bg-blue-50 p-3 rounded-2xl">
                        <Hexagon className="text-blue-600 w-8 h-8 fill-current" />
                    </div>
                </div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                    {isRegistering ? 'Crie sua conta' : 'Acesse o sistema'}
                </h1>
                <p className="text-gray-500 font-medium mt-2">
                    {isRegistering ? 'Cadastre sua empresa e comece em segundos.' : 'Bem-vindo de volta! Digite seus dados.'}
                </p>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold flex items-center gap-3 border border-red-100 animate-scale-in">
                    <AlertCircle size={20} className="shrink-0" />
                    {error}
                </div>
            )}

            {success && (
                <div className="bg-green-50 text-green-600 p-4 rounded-xl text-sm font-bold flex items-center gap-3 border border-green-100 animate-scale-in">
                    <CheckCircle size={20} />
                    {success}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                {isRegistering && (
                    <div className="animate-fade-in space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Nome Completo</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                                <input 
                                    type="text"
                                    required={isRegistering}
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Como devemos te chamar?"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-gray-800 font-bold placeholder:font-normal placeholder:text-gray-400"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Nome da Empresa</label>
                            <div className="relative group">
                                <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                                <input 
                                    type="text"
                                    required={isRegistering}
                                    value={companyName}
                                    onChange={e => setCompanyName(e.target.value)}
                                    placeholder="Nome da sua organização"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-gray-800 font-bold placeholder:font-normal placeholder:text-gray-400"
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">E-mail</label>
                    <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                        <input 
                            type="email"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="seu@email.com"
                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-gray-800 font-bold placeholder:font-normal placeholder:text-gray-400"
                        />
                    </div>
                </div>
                
                <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Senha</label>
                        {!isRegistering && <button type="button" className="text-xs font-bold text-blue-600 hover:text-blue-800">Esqueceu a senha?</button>}
                    </div>
                    <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                        <input 
                            type="password"
                            required
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-gray-800 font-bold placeholder:font-normal placeholder:text-gray-400"
                        />
                    </div>
                </div>

                <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white font-black text-sm uppercase tracking-widest py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-[0.98] flex justify-center items-center gap-3 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                        <>
                            {isRegistering ? 'Criar minha conta' : 'Entrar no sistema'}
                            <ArrowRight size={20} />
                        </>
                    )}
                </button>
            </form>

            <div className="pt-8 text-center border-t border-gray-100">
                <p className="text-sm font-medium text-gray-600">
                    {isRegistering ? 'Já possui conta?' : 'Ainda não tem conta?'}
                    <button 
                        onClick={toggleMode} 
                        className="ml-2 text-blue-600 font-black hover:text-blue-800 transition-colors uppercase tracking-tight"
                    >
                        {isRegistering ? 'Fazer Login' : 'Cadastre-se grátis'}
                    </button>
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};
