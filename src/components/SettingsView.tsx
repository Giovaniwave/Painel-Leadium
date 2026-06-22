/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Camera, Save, User, Sparkles, Upload, Moon, Sun } from 'lucide-react';
import { BudgetGoal } from '../types';

interface SettingsViewProps {
  budgetGoals: BudgetGoal[]; // Unused now but kept interface intact to prevent build failures
  onUpdateGoal: (id: 'Primary' | 'Secondary' | 'Tertiary', updates: Partial<BudgetGoal>) => void;
  onResetAllData: () => void;
  userProfile: { name: string; avatarUrl: string; email: string };
  onUpdateProfile: (updatedProfile: { name: string; avatarUrl: string; email: string }) => void;
  theme: 'dark' | 'light';
  setTheme: (t: 'dark' | 'light') => void;
}

export default function SettingsView({
  userProfile,
  onUpdateProfile,
  theme,
  setTheme
}: SettingsViewProps) {
  const isDark = theme === 'dark';
  
  const [tempName, setTempName] = useState(userProfile.name);
  const [avatarPreview, setAvatarPreview] = useState(userProfile.avatarUrl);
  
  // Sync state if userProfile changes from parent component (e.g. after database load)
  React.useEffect(() => {
    setTempName(userProfile.name);
    setAvatarPreview(userProfile.avatarUrl);
  }, [userProfile.name, userProfile.avatarUrl]);
  const [dragActive, setDragActive] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem válida (PNG, JPG, WEBP, etc).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setAvatarPreview(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempName.trim()) {
      alert('O nome do titular não pode ficar vazio.');
      return;
    }
    onUpdateProfile({
      ...userProfile,
      name: tempName.trim(),
      avatarUrl: avatarPreview
    });
    setSuccessMsg('Configurações atualizadas com sucesso! Suas alterações já estão em vigor.');
    setTimeout(() => {
      setSuccessMsg('');
    }, 4000);
  };

  return (
    <div className="space-y-8 py-4 animate-fadeIn">
      {/* Title block */}
      <div className="border-b border-white/10 pb-5" style={{ borderColor: !isDark ? 'rgba(0,0,0,0.08)' : '' }}>
        <h2 className={`text-4xl font-serif italic tracking-tighter ${isDark ? 'text-white' : 'text-gray-900'} font-light`}>
          Configurações da Conta
        </h2>
        <p className={`text-[10px] uppercase tracking-[0.2em] ${isDark ? 'text-gray-500' : 'text-gray-400'} mt-1`}>
          Atualize seus dados cadastrais, faça upload da foto de perfil e personalize sua experiência
        </p>
      </div>

      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleSave} className="space-y-6">
          {successMsg && (
            <div className={`p-4 border rounded-xl text-xs font-semibold font-mono animate-fadeIn ${
              isDark 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}>
              {successMsg}
            </div>
          )}

          {/* Core profile details module */}
          <div className={`p-6 rounded-2xl border ${
            isDark ? 'bg-black/30 border-white/5' : 'bg-white border-black/5 shadow-sm'
          } space-y-6`}>
            
            {/* Header info */}
            <div className={`flex items-center justify-between pb-4 border-b border-white/5`} style={{ borderColor: !isDark ? 'rgba(0,0,0,0.06)' : '' }}>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#FF4D00]" />
                <h3 className={`text-xs uppercase tracking-[0.25em] font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Ficha de Perfil do Titular
                </h3>
              </div>
              
              {/* Theme switch micro-indicator */}
              <button
                type="button"
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                  isDark 
                    ? 'bg-[#141414] border-white/10 text-gray-300 hover:text-white hover:bg-white/5' 
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:text-black hover:bg-gray-100'
                }`}
              >
                {isDark ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-[#FF4D00]" />
                    <span>Modo Claro</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-gray-500" />
                    <span>Modo Escuro</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-5">
              {/* Profile Avatar Upload block */}
              <div className="space-y-2">
                <label className={`text-[10px] uppercase tracking-[0.2em] font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'} block`}>
                  Foto de Perfil (Avatar do Sistema)
                </label>
                
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Current Preview Avatar */}
                  <div className="relative group shrink-0">
                    <img 
                      src={avatarPreview || null} 
                      alt="Avatar Preview" 
                      className={`w-24 h-24 rounded-full border-2 object-cover ${
                        isDark ? 'border-[#FF4D00]/50 bg-black' : 'border-[#FF4D00] bg-gray-50 shadow-sm'
                      }`}
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={onButtonClick}>
                      <Camera className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  {/* Drag and Drop File Upload Area */}
                  <div 
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={onButtonClick}
                    className={`flex-1 w-full p-6 rounded-xl border border-dashed text-center cursor-pointer transition-all ${
                      dragActive
                        ? (isDark ? 'border-[#FF4D00] bg-[#FF4D00]/5' : 'border-[#FF4D00] bg-[#FF4D00]/5')
                        : (isDark ? 'border-white/10 hover:border-white/20 bg-black/20 hover:bg-black/30' : 'border-gray-300 hover:border-[#FF4D00] bg-gray-50 hover:bg-gray-100/50')
                    }`}
                  >
                    <input 
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    
                    <Upload className={`w-6 h-6 mx-auto mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                    <p className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-gray-900'} mb-1`}>
                      Arraste e solte sua foto aqui ou <span className="text-[#FF4D00] hover:underline">clique para buscar</span>
                    </p>
                    <p className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      Aceita arquivos PNG, JPG, JPEG, WEBP ou GIF (será salvo direto no sistema)
                    </p>
                  </div>
                </div>
              </div>

              {/* Account Name input field */}
              <div className="space-y-1">
                <label className={`text-[10px] uppercase tracking-[0.2em] font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'} block`}>
                  Nome Completo / Razão Social
                </label>
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  placeholder="Seu Nome Completo"
                  className={`w-full border rounded-xl py-3 px-4 text-xs focus:ring-0 focus:outline-none transition-all ${
                    isDark 
                      ? 'bg-[#141414] border-white/10 text-white focus:border-[#FF4D00]/50 font-sans' 
                      : 'bg-gray-50 border-gray-200 text-gray-950 focus:border-[#FF4D00]/50 font-sans font-medium'
                  }`}
                />
              </div>

              {/* Email (Read-only as it ties to system authentication) */}
              <div className="space-y-1">
                <label className={`text-[10px] uppercase tracking-[0.2em] font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'} block`}>
                  E-mail da Conta (Autenticado)
                </label>
                <input
                  type="email"
                  value={userProfile.email}
                  disabled
                  className={`w-full border rounded-xl py-3 px-4 text-xs font-mono font-medium select-none cursor-not-allowed opacity-60 ${
                    isDark 
                      ? 'bg-[#181818] border-white/5 text-gray-400' 
                      : 'bg-gray-100 border-gray-200 text-gray-500'
                  }`}
                />
              </div>
            </div>

            {/* Actions block row */}
            <div className={`pt-5 border-t border-white/5 flex gap-3 justify-end`} style={{ borderColor: !isDark ? 'rgba(0,0,0,0.06)' : '' }}>
              <button
                type="submit"
                className={`px-6 py-2.5 rounded-lg text-xs font-semibold tracking-wider uppercase transition-colors cursor-pointer flex items-center gap-2 ${
                  isDark 
                    ? 'bg-white text-black hover:bg-gray-200' 
                    : 'bg-black text-white hover:bg-gray-800 keep-white'
                }`}
              >
                <Save className="w-4 h-4" />
                <span>Salvar Alterações</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
