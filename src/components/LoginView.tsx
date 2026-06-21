/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Mail, Lock, ShieldCheck, ArrowRight } from 'lucide-react';

interface LoginViewProps {
  onLogin: (email: string) => void;
}

export default function LoginView({ onLogin }: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    // High fidelity email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Por favor, insira um e-mail válido.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      let data;
      try {
        data = await res.json();
      } catch (parseError) {
        // If the server didn't return JSON, it's likely a 404 or 503 from Hostinger
        console.error('Failed to parse API response. The server may not be running or is returning HTML.', parseError);
        setError('Servidor backend indisponível. Verifique se o Node.js está rodando (Hostinger).');
        setIsLoading(false);
        return;
      }
      
      if (!res.ok) {
        setError(data.error || 'Erro ao autenticar. Tente novamente.');
      } else if (data.success && data.email) {
        onLogin(data.email);
      } else {
        setError('Erro desconhecido ao autenticar.');
      }
    } catch (err) {
      console.error('Login request failed:', err);
      setError('Problema de comunicação com o servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0D0D0D] flex flex-col items-center justify-center p-4 selection:bg-white selection:text-black">
      {/* Decorative Minimal background patterns */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.02),transparent_50%)] pointer-events-none" />
      
      <div className="w-full max-w-sm z-10 animate-fadeIn space-y-8">
        
        {/* Superior Branding Header Section */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="relative group">
            <div className="absolute -inset-1 rounded-full bg-white/5 group-hover:bg-white/10 blur-xl transition-all duration-500" />
            <img 
              src="https://i.ibb.co/k245JhFM/logotipooficialleadium.png" 
              alt="Leadium Logo" 
              className="w-20 h-20 object-contain relative transition-transform duration-500 group-hover:scale-105" 
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl uppercase tracking-[0.4em] font-black text-white leading-none">
              LEADIUM
            </h1>
            <p className="text-[9px] uppercase tracking-[0.3em] text-gray-500 font-bold font-mono">
              FINANCIAL ARCHITECT
            </p>
          </div>
        </div>

        {/* Auth Body Box */}
        <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl relative">
          
          {/* Section banner */}
          <div className="space-y-1 text-center">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-white" />
              <span>Acesso Restrito</span>
            </h2>
            <p className="text-[10px] text-gray-500">Insira suas credenciais de segurança corporativa</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-white/5 border border-white/20 text-white text-[11px] font-mono rounded-lg leading-relaxed text-center animate-shake">
                {error}
              </div>
            )}

            {/* Email field */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 block">
                E-mail Corporativo
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-3.5 h-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@leadium.com"
                  className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl py-3 pl-9 pr-4 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-white transition-colors"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 block">
                Chave de Acesso
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-3.5 h-3.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl py-3 pl-9 pr-4 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-white transition-colors"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Action button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center py-3 bg-white text-black hover:bg-gray-200 font-medium rounded-lg transition-colors cursor-pointer text-sm shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>Entrar</span>
              )}
            </button>
          </form>
        </div>

        {/* Minimal Footer */}
        <div className="text-center">
          <p className="text-[9px] text-[#444444] uppercase tracking-widest font-mono">
            Powered by Supabase Unified Auth Engine
          </p>
        </div>
      </div>
    </div>
  );
}
