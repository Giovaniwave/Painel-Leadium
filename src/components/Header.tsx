/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, Bell, MessageSquare, Info, Menu, Sun, Moon, LogOut, Settings } from 'lucide-react';
import InstallAppButton from './InstallAppButton';

interface HeaderProps {
  title: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onOpenAssistant: () => void;
  hasUnreadMessage: boolean;
  onToggleMobileMenu: () => void;
  userProfile: { name: string; avatarUrl: string; email: string };
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onLogout: () => void;
  onNavigateToTab: (tab: 'dashboard' | 'budgeting' | 'transactions' | 'clients' | 'settings' | 'expenses') => void;
}

export default function Header({ 
  title, 
  searchQuery, 
  setSearchQuery, 
  onOpenAssistant,
  hasUnreadMessage,
  onToggleMobileMenu,
  userProfile,
  theme,
  onToggleTheme,
  onLogout,
  onNavigateToTab
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  
  const notifications = [
    { id: 1, text: 'Alerta: Você consumiu 84% do limite do seu Orçamento Principal.', time: '1 hora atrás', urgent: true },
    { id: 2, text: 'Depósito recebido: +$1,000.00 referente a contrato via PayPal.', time: '1 dia atrás', urgent: false },
    { id: 3, text: 'Boas-vindas ao Leadium! Configure suas metas em Ajustes.', time: '2 dias atrás', urgent: false },
  ];

  return (
    <header className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-6 sticky top-0 bg-[#0D0D0D]/95 backdrop-blur-md border-b border-white/10 z-40" id="app-header">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile Hamburger menu removed per user request for clean bottom tabs instead */}

        <h1 className="text-lg sm:text-3xl font-serif italic text-white tracking-tight font-light truncate">
          {title === 'Financial Dashboard' ? (
            <>
              <span className="md:hidden font-sans uppercase font-extrabold tracking-wider text-white">LEADIUM</span>
              <span className="hidden md:inline">Financial Dashboard</span>
            </>
          ) : (
            title
          )}
        </h1>
      </div>

      <div className="flex items-center gap-6">
        {/* Search Bar - actively updates query */}
        <div className="relative group hidden md:block w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-3.5 h-3.5 transition-colors group-hover:text-white" />
          <input
            id="global-transaction-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#141414] border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs w-full text-white placeholder-gray-500 focus:outline-none focus:border-white/40 tracking-wider transition-all cursor-text animate-fadeIn"
            placeholder="Search transactions..."
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-4">
          
          <div className="hidden sm:block">
            <InstallAppButton />
          </div>

          {/* Theme Mode Toggle (Sun/Moon Switcher) */}
          <button
            id="header-theme-toggle"
            onClick={onToggleTheme}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all cursor-pointer"
            title={theme === 'dark' ? "Ativar Modo Branco" : "Ativar Modo Escuro"}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-gray-300 hover:text-white transition-colors" />
            ) : (
              <Moon className="w-5 h-5 text-gray-600 hover:text-black transition-colors" />
            )}
          </button>

          {/* Notifications Dropdown Toggle */}
          <div className="relative">
            <button
              id="header-notification-btn"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-white rounded-full ring-2 ring-[#0D0D0D] animate-pulse"></span>
            </button>

            {showNotifications && (
              <div 
                className="absolute right-[-16px] sm:right-0 mt-3 w-80 max-w-[calc(100vw-32px)] bg-[#161616] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fadeIn"
                id="notification-dropdown"
              >
                <div className="px-4 py-3 bg-[#111111] border-b border-white/10 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider">Alerts & Notifications</span>
                  <button 
                    onClick={() => setShowNotifications(false)}
                    className="text-[10px] text-gray-400 hover:text-white underline cursor-pointer"
                  >
                    Close
                  </button>
                </div>
                <div className="divide-y divide-white/5 max-h-72 overflow-y-auto">
                  {notifications.map((n) => (
                    <div key={n.id} className="p-4 hover:bg-white/5 transition-colors">
                      <p className={`text-xs ${n.urgent ? 'text-white font-bold' : 'text-gray-300'}`}>
                        {n.text}
                      </p>
                      <span className="text-[10px] text-gray-500 mt-1 block font-mono">
                        {n.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* HUD Line break before User */}
          <div className="h-6 w-px bg-white/10 hidden sm:block"></div>

          {/* User Profile display with Dropdown */}
          <div className="relative">
            <button 
              onClick={() => {
                if (window.innerWidth < 768) {
                  onToggleMobileMenu();
                } else {
                  setShowUserDropdown(!showUserDropdown);
                }
              }}
              className="flex items-center gap-3 pl-2 group cursor-pointer text-left focus:outline-none"
              title={userProfile.name}
            >
              <img
                id="user-profile-avatar"
                src={userProfile.avatarUrl || null}
                alt={userProfile.name}
                className="w-8 h-8 rounded-full border border-white/10 object-cover group-hover:border-white transition-all duration-300 shadow-md hover:scale-[1.05]"
                referrerPolicy="no-referrer"
              />
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-semibold text-white group-hover:text-white/80 transition-colors">
                  {userProfile.name}
                </span>
                <span className="text-[8px] text-gray-500 uppercase tracking-widest font-mono font-bold">
                  Sessão Ativa
                </span>
              </div>
            </button>

            {showUserDropdown && (
              <div className="absolute right-0 mt-3 w-52 bg-[#161616] border border-white/10 rounded-xl shadow-2xl py-1.5 z-50 animate-fadeIn text-xs">
                <div className="px-4 py-2 border-b border-white/5 text-[10px] text-[#888888] uppercase tracking-wider font-bold">
                  Painel Executivo
                </div>
                
                {/* CONFIGURAÇÕES Option */}
                <button
                  type="button"
                  onClick={() => {
                    setShowUserDropdown(false);
                    onNavigateToTab('settings');
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-left text-gray-300 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
                >
                  <Settings className="w-4 h-4 shrink-0 text-gray-400" />
                  <span>Configurações</span>
                </button>

                {/* ASSISTENTE KAIROS Option */}
                <button
                  type="button"
                  onClick={() => {
                    setShowUserDropdown(false);
                    onOpenAssistant();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-left text-gray-300 hover:bg-[#FF4D00]/10 hover:text-white transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 shrink-0 text-[#FF4D00]" />
                  <span>Assistente Kairos</span>
                </button>

                <div className="border-t border-white/5 my-1" />
                
                <div className="sm:hidden px-2 mb-2 mt-2">
                  <InstallAppButton />
                </div>

                {/* LOGOUT Option */}
                <button
                  type="button"
                  onClick={() => {
                    setShowUserDropdown(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-left text-red-400 hover:bg-red-500/10 hover:text-red-350 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 shrink-0 text-red-500" />
                  <span>Sair do Sistema</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
