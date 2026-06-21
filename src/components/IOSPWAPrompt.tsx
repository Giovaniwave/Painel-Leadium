import React from 'react';
import { X, Share, PlusSquare } from 'lucide-react';

interface IOSPwaPromptProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export default function IOSPwaPrompt({ isOpen, onClose, theme = 'dark' }: IOSPwaPromptProps) {
  if (!isOpen) return null;

  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className={`w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl transform transition-transform animate-slideUp ${
          isDark ? 'bg-[#1A1A1A] text-white border border-white/10' : 'bg-white text-gray-900 border border-black/10'
        }`}
      >
        <div className="flex justify-between items-center mb-6">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden bg-[#FF4D00]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-8 h-8 flex-shrink-0">
              <path fill="#ffffff" d="M144 256c0-61.9 50.1-112 112-112s112 50.1 112 112-50.1 112-112 112-112-50.1-112-112zm48 0c0 35.3 28.7 64 64 64s64-28.7 64-64-28.7-64-64-64-64 28.7-64 64z"/>
            </svg>
          </div>
          <button 
            onClick={onClose} 
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
              isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <h3 className="text-xl font-bold tracking-tight mb-2">Instale o Leadium CRM</h3>
        <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Instale nosso app no seu iPhone para uso em tela cheia e acesso rápido offline.
        </p>

        <div className="space-y-4 font-medium text-[13px]">
          <div className={`flex items-center gap-4 py-3 px-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
            <Share className="w-5 h-5 text-[#FF4D00]" />
            <p>1. Toque em <strong className="font-semibold uppercase tracking-wide">Compartilhar</strong> na barra do Safari.</p>
          </div>
          
          <div className={`flex items-center gap-4 py-3 px-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
            <PlusSquare className="w-5 h-5 text-[#FF4D00]" />
            <p>2. Selecione <strong className="font-semibold uppercase tracking-wide">Adicionar à Tela de Início</strong>.</p>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full mt-6 py-3.5 rounded-xl bg-[#FF4D00] text-white font-bold uppercase tracking-[0.15em] text-[11px] shadow-[0_0_20px_rgba(255,77,0,0.3)] hover:shadow-[0_0_30px_rgba(255,77,0,0.5)] transition-all"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}
