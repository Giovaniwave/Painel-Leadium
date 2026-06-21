/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  LayoutDashboard, 
  Wallet, 
  ArrowLeftRight, 
  Users,
  Settings, 
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  X,
  MessageSquare,
  DownloadCloud
} from 'lucide-react';
import { ActiveTab } from '../types';
import { usePWAInstall } from '../hooks/usePWAInstall';
import IOSPwaPrompt from './IOSPWAPrompt';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
  onOpenAssistant: () => void;
  theme?: 'dark' | 'light';
}

export default function Sidebar({ 
  activeTab, 
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  isOpenMobile,
  setIsOpenMobile,
  onOpenAssistant,
  theme
}: SidebarProps) {
  const { isInstallable, promptInstall, showIOSPrompt, closeIOSPrompt } = usePWAInstall();

  const logoUrl = theme === 'light'
    ? "https://i.ibb.co/M5kWMmTJ/logo-para-versao-white-removebg-preview.png"
    : "https://i.ibb.co/k245JhFM/logotipooficialleadium.png";

  const menuItems = [
    { id: 'dashboard' as ActiveTab, label: 'Painel', icon: LayoutDashboard },
    { id: 'budgeting' as ActiveTab, label: 'Carteira', icon: Wallet },
    { id: 'transactions' as ActiveTab, label: 'Transações', icon: ArrowLeftRight },
    { id: 'clients' as ActiveTab, label: 'Clientes', icon: Users },
  ];

  const bottomItems = [
    { id: 'settings' as ActiveTab, label: 'Configurações', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Drawer Overlay Backing - hidden per user request of navigation tabs */}
      {isOpenMobile && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-xs z-40 hidden animate-fadeIn"
          onClick={() => setIsOpenMobile(false)}
        />
      )}

      <aside 
        className={`
          hidden md:flex md:sticky flex-col flex-shrink-0 bg-[#080808] border-r border-white/10 transition-all duration-300
          ${isCollapsed ? 'md:w-20' : 'md:w-72'}
        `} 
        id="main-sidebar"
      >
        {/* Brand Logo & Toggle Header */}
        <div className={`px-6 py-8 flex items-center justify-between border-b border-white/5 relative ${isCollapsed ? 'justify-center py-8' : ''}`}>
          {(!isCollapsed || isOpenMobile) ? (
            <div className="flex items-center gap-3">
              <img 
                src={logoUrl} 
                alt="Leadium Logo" 
                className="w-14 h-14 object-contain shrink-0" 
                referrerPolicy="no-referrer"
              />
              <div className="flex flex-col">
                <span className="text-xs uppercase tracking-[0.3em] font-bold text-white leading-none">
                  Leadium
                </span>
                <span className="text-[8px] uppercase tracking-[0.25em] text-[#666666] font-medium mt-1">
                  Gestão Financeira
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center w-12 h-12">
              <img 
                src={logoUrl} 
                alt="Leadium Logo" 
                className="w-12 h-12 object-contain" 
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          {/* Mobile Close Button */}
          {isOpenMobile && (
            <button
              onClick={() => setIsOpenMobile(false)}
              className="md:hidden p-1.5 rounded-lg bg-white/5 hover:bg-white hover:text-black hover:border-white text-gray-400 border border-white/10 transition-all duration-300 cursor-pointer"
              title="Fechar Menu"
              id="sidebar-close-btn"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Desktop Shrink Button (Absolutely positioned on border, out of flex flow) */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex absolute top-10 -right-3 z-50 w-6 h-6 rounded-full bg-[#141414] hover:bg-white text-gray-400 hover:text-black border border-white/10 items-center justify-center transition-all duration-300 cursor-pointer shadow-md"
            title={isCollapsed ? "Expandir" : "Encolher"}
            id="sidebar-toggle-btn"
          >
            {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
          </button>
        </div>

        {/* Main Navigation Menu */}
        <nav className={`flex-1 px-4 space-y-2 mt-6 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isDark = theme !== 'light';
            return (
              <button
                key={item.id}
                id={`sidebar-tab-${item.id}`}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsOpenMobile(false); // Auto close mobile menu on tab navigation
                }}
                className={`w-full group flex items-center gap-4 py-3.5 text-xs uppercase tracking-[0.14em] font-medium rounded-xl transition-all duration-300 cursor-pointer ${
                  (isCollapsed && !isOpenMobile)
                    ? 'justify-center px-0 w-12 h-12' 
                    : 'px-5'
                } ${
                  isActive
                    ? isDark
                      ? 'bg-white text-black shadow-lg shadow-white/5 border border-white'
                      : 'bg-black text-white keep-white shadow-md border border-black active-tab-light-fix'
                    : isDark
                      ? 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                      : 'text-gray-600 hover:text-black hover:bg-gray-100 border border-transparent'
                }`}
                title={(isCollapsed && !isOpenMobile) ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 transition-transform duration-300 group-hover:scale-110 ${
                  isActive 
                    ? isDark ? 'text-black' : 'text-white keep-white'
                    : isDark ? 'text-gray-400 group-hover:text-white' : 'text-gray-500 group-hover:text-black'
                }`} />
                {(!isCollapsed || isOpenMobile) && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Bottom Option Menu */}
        <div className={`px-4 py-8 space-y-2 border-t border-white/10 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
          {bottomItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isDark = theme !== 'light';
            return (
              <button
                key={item.id}
                id={`sidebar-tab-${item.id}`}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsOpenMobile(false); // Auto close mobile menu on tab navigation
                }}
                className={`w-full group flex items-center gap-4 py-3.5 text-xs uppercase tracking-[0.14em] font-medium rounded-xl transition-all duration-300 cursor-pointer ${
                  (isCollapsed && !isOpenMobile)
                    ? 'justify-center px-0 w-12 h-12' 
                    : 'px-5'
                } ${
                  isActive
                    ? isDark
                      ? 'bg-white text-black shadow-lg shadow-white/5 border border-white'
                      : 'bg-black text-white keep-white shadow-md border border-black active-tab-light-fix'
                    : isDark
                      ? 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                      : 'text-gray-600 hover:text-black hover:bg-gray-100 border border-transparent'
                }`}
                title={(isCollapsed && !isOpenMobile) ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 transition-transform duration-300 group-hover:scale-110 ${
                  isActive 
                    ? isDark ? 'text-black' : 'text-white keep-white'
                    : isDark ? 'text-gray-400 group-hover:text-white' : 'text-gray-500 group-hover:text-black'
                }`} />
                {(!isCollapsed || isOpenMobile) && <span>{item.label}</span>}
              </button>
            );
          })}

          {/* Permanent fixed Kairos Assistant selection button inside Sidebar */}
          <button
            onClick={() => {
              onOpenAssistant();
              setIsOpenMobile(false);
            }}
            className={`w-full group flex items-center gap-4 py-3.5 text-xs uppercase tracking-[0.14em] font-medium rounded-xl transition-all duration-300 cursor-pointer ${
              (isCollapsed && !isOpenMobile)
                ? 'justify-center px-0 w-12 h-12' 
                : 'px-5'
            } ${
              theme === 'light'
                ? 'text-gray-600 hover:text-black hover:bg-gray-100 border border-transparent'
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
            title={(isCollapsed && !isOpenMobile) ? "Assistente Kairos" : undefined}
          >
            <MessageSquare className="w-4 h-4 text-[#FF4D00] animate-pulse transition-transform duration-300 group-hover:scale-110" />
            {(!isCollapsed || isOpenMobile) && <span>Assistente Kairos</span>}
          </button>

          {/* Optional Install PWA App Button */}
          {isInstallable && (
            <button
              onClick={() => {
                promptInstall();
              }}
              className={`w-full group flex items-center gap-4 py-3.5 text-xs text-[#FF4D00] uppercase tracking-[0.14em] font-medium rounded-xl transition-all duration-300 cursor-pointer ${
                (isCollapsed && !isOpenMobile)
                  ? 'justify-center px-0 w-12 h-12' 
                  : 'px-5'
              } hover:bg-[#FF4D00]/10 border border-transparent hover:border-[#FF4D00]/20`}
              title={(isCollapsed && !isOpenMobile) ? "Instalar App" : undefined}
            >
              <DownloadCloud className="w-4 h-4 text-[#FF4D00] transition-transform duration-300 group-hover:scale-110" />
              {(!isCollapsed || isOpenMobile) && <span>Instalar App</span>}
            </button>
          )}
        </div>
      </aside>
      <IOSPwaPrompt isOpen={showIOSPrompt} onClose={closeIOSPrompt} theme={theme} />
    </>
  );
}
