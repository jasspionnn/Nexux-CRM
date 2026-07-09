import React, { useState, useEffect } from 'react';
import { useCRM } from '../context/CRMContext';
import { UserRole } from '../types';
import { Hexagon, ArrowRight, Lock, Mail } from 'lucide-react';

export const LoginPage = () => {
  const { login } = useCRM();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    fetch('/api/global-settings')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && !data.error) setSettings(data);
      })
      .catch(console.error);
  }, []);

  const t = settings || {
    login_title: 'O CRM feito para times dinâmicos e modernos.',
    login_subtitle: 'Acelere vendas, automatize sua captação com IA, e tenha uma visão cristalina sobre cada etapa do funil do seu cliente.',
    login_badge_text: '✨ Atualização 2.0 disponível',
    login_quote_text: 'A capacidade de plugar IA no WhatsApp e rastrear cada movimentação das oportunidades direto de dentro do Kanban mudou o jogo para a nossa equipe de B2B.',
    login_quote_author: 'Juliana Diniz',
    login_quote_role: 'Head of Sales, TechCorp'
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao realizar login');
      }

      login(data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex text-slate-900 bg-slate-50">
      {/* Left side - Login Form */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 md:px-24">
        <div className="w-full max-w-md mx-auto">
          <div className="mb-10 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
              <Hexagon size={24} />
            </div>
            <span className="text-2xl font-black tracking-tight text-slate-900">NEXUS</span>
          </div>

          <h1 className="text-4xl font-bold mb-2">Bem-vindo de volta!</h1>
          <p className="text-slate-500 mb-8 font-medium">Acesse sua conta para gerenciar seu CRM.</p>

          <form onSubmit={handleSubmit} className="space-y-5 flex flex-col">
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider font-bold text-slate-500">E-mail Corporativo</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail size={18} />
                </div>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all shadow-sm font-medium"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs uppercase tracking-wider font-bold text-slate-500">Senha</label>
                <a href="#" className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">Esqueceu a senha?</a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} />
                </div>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all shadow-sm font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 group mt-4 active:scale-[0.98]"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Entrar na Conta
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-slate-500 text-sm font-medium">
            Ainda não tem conta? <a href="#" className="text-blue-600 font-bold hover:underline transition-colors">Solicite um convite</a>
          </p>
        </div>
      </div>

      {/* Right side - Visual/Premium Branding Element */}
      <div className="hidden lg:flex flex-1 flex-col justify-between bg-slate-900 p-12 relative overflow-hidden">
        {/* Abstract beautiful shapes and gradients */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[600px] h-[600px] rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-[500px] h-[500px] rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex justify-end">
          <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full bg-white/20" />
            <div className="w-2 h-2 rounded-full bg-white/40" />
            <div className="w-8 h-2 rounded-full bg-blue-500" />
          </div>
        </div>

        <div className="relative z-10 max-w-xl self-center xl:self-start xl:mt-24">
          <div className="inline-block px-4 py-2 border border-blue-500/30 rounded-full bg-blue-500/10 backdrop-blur-sm text-blue-300 font-bold text-xs uppercase tracking-wider mb-6">
            {t.login_badge_text}
          </div>
          <h2 className="text-5xl font-black text-white leading-tight mb-6">
            {t.login_title}
          </h2>
          <p className="text-xl text-slate-400 mb-12 leading-relaxed font-light max-w-lg">
            {t.login_subtitle}
          </p>
          
          {/* Glassmorphism Testimonial Card */}
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl relative">
            <div className="absolute -top-4 -left-4 w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 blur-lg" />
            
            <div className="flex gap-1 mb-4 text-blue-400">
              {[...Array(5)].map((_, i) => <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>)}
            </div>
            <p className="text-slate-300 italic mb-6 leading-relaxed text-sm">
              &ldquo;{t.login_quote_text}&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
                {t.login_quote_author?.charAt(0) ?? 'J'}
              </div>
              <div>
                <div className="text-white font-bold text-sm">{t.login_quote_author}</div>
                <div className="text-blue-400 text-xs font-semibold">{t.login_quote_role}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
