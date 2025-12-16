
import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import { Hexagon, ArrowRight, Lock, Mail, AlertCircle, User, UserPlus, CheckCircle, Building } from 'lucide-react';

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
            // Login Logic
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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[100px]"></div>
          <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[100px]"></div>
      </div>

      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden z-10 animate-fade-in">
        <div className="p-8 pb-6">
            <div className="flex justify-center mb-6">
                <div className="bg-blue-50 p-4 rounded-full">
                    <Hexagon className="text-blue-600 w-10 h-10 fill-current" />
                </div>
            </div>
            
            <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
                {isRegistering ? 'Criar Nova Conta' : 'Acesse sua Conta'}
            </h1>
            <p className="text-center text-gray-500 text-sm mb-6">
                {isRegistering ? 'Cadastre sua empresa e comece agora.' : 'Gestão de pipeline e vendas.'}
            </p>

            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2 mb-6 animate-scale-in">
                    <AlertCircle size={16} className="shrink-0" />
                    {error}
                </div>
            )}

            {success && (
                <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm flex items-center gap-2 mb-6 animate-scale-in">
                    <CheckCircle size={16} />
                    {success}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name Field - Only for Register */}
                {isRegistering && (
                    <div className="animate-fade-in space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Nome Completo</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 text-gray-400" size={18} />
                                <input 
                                    type="text"
                                    required={isRegistering}
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Seu Nome"
                                    className="w-full border border-gray-300 rounded-xl py-2.5 pl-10 pr-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-gray-800 font-medium"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Nome da Empresa</label>
                            <div className="relative">
                                <Building className="absolute left-3 top-3 text-gray-400" size={18} />
                                <input 
                                    type="text"
                                    required={isRegistering}
                                    value={companyName}
                                    onChange={e => setCompanyName(e.target.value)}
                                    placeholder="Sua Empresa"
                                    className="w-full border border-gray-300 rounded-xl py-2.5 pl-10 pr-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-gray-800 font-medium"
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input 
                            type="email"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="seu@email.com"
                            className="w-full border border-gray-300 rounded-xl py-2.5 pl-10 pr-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-gray-800 font-medium"
                        />
                    </div>
                </div>
                
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Senha</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input 
                            type="password"
                            required
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full border border-gray-300 rounded-xl py-2.5 pl-10 pr-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-gray-800 font-medium"
                        />
                    </div>
                </div>

                {!isRegistering && (
                    <div className="flex items-center justify-between text-xs mt-2">
                        <label className="flex items-center gap-2 cursor-pointer text-gray-500 hover:text-gray-700">
                            <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" />
                            Lembrar de mim
                        </label>
                        <a href="#" className="text-blue-600 hover:text-blue-800 font-medium">Esqueceu a senha?</a>
                    </div>
                )}

                <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-[0.98] flex justify-center items-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                        <>
                            {isRegistering ? (
                                <>Criar Conta Grátis <UserPlus size={18} /></>
                            ) : (
                                <>Entrar na Conta <ArrowRight size={18} /></>
                            )}
                        </>
                    )}
                </button>
            </form>
        </div>
        
        <div className="bg-gray-50 p-5 text-center border-t border-gray-100">
            <p className="text-sm text-gray-600">
                {isRegistering ? 'Já tem uma conta?' : 'Não tem uma conta?'}
                <button 
                    onClick={toggleMode} 
                    className="ml-2 text-blue-600 font-bold hover:underline focus:outline-none transition-colors"
                >
                    {isRegistering ? 'Fazer Login' : 'Cadastre-se'}
                </button>
            </p>
        </div>
      </div>
    </div>
  );
};
