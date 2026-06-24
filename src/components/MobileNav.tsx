import React from 'react';
import { Wallet, LayoutDashboard, ArrowLeftRight } from 'lucide-react';
import { ActiveTab } from '../types';

interface MobileNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  theme: 'dark' | 'light';
}

export default function MobileNav({ activeTab, onTabChange, theme }: MobileNavProps) {
  const isDark = theme === 'dark';
  const bgColor = isDark ? '#141414' : '#FFFFFF';
  const borderColor = isDark ? '#262626' : '#E5E5E5';
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden pointer-events-none" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="relative w-full h-[72px] pointer-events-auto mt-2">
        {/* The curved background */}
        <svg 
          className="absolute bottom-0 w-full h-[64px] drop-shadow-[0_-4px_16px_rgba(0,0,0,0.05)]"
          viewBox="0 0 375 64" 
          preserveAspectRatio="none"
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M0 16C0 7.16344 7.16344 0 16 0H125.105C132.88 0 139.638 5.48512 141.229 13.1259L143.5 24C145.418 33.2091 153.582 40 163 40H212C221.418 40 229.582 33.2091 231.5 24L233.771 13.1259C235.362 5.48512 242.12 0 249.895 0H359C367.837 0 375 7.16344 375 16V64H0V16Z" 
            fill={bgColor}
          />
          <path 
            d="M0 16C0 7.16344 7.16344 0 16 0H125.105C132.88 0 139.638 5.48512 141.229 13.1259L143.5 24C145.418 33.2091 153.582 40 163 40H212C221.418 40 229.582 33.2091 231.5 24L233.771 13.1259C235.362 5.48512 242.12 0 249.895 0H359C367.837 0 375 7.16344 375 16V64" 
            stroke={borderColor}
            strokeWidth="1"
          />
        </svg>

        {/* Left Tab: Carteira */}
        <button 
          onClick={() => onTabChange('budgeting')}
          className="absolute left-0 bottom-0 w-[40%] h-[64px] flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform cursor-pointer"
        >
          <div className={`p-1.5 rounded-full transition-colors ${activeTab === 'budgeting' ? (isDark ? 'bg-white/10' : 'bg-black/5') : 'bg-transparent'}`}>
            <Wallet 
              className={`w-5 h-5 transition-colors ${activeTab === 'budgeting' ? (isDark ? 'text-white' : 'text-black') : (isDark ? 'text-neutral-500' : 'text-neutral-400')}`} 
              strokeWidth={activeTab === 'budgeting' ? 2.5 : 2}
            />
          </div>
          {activeTab === 'budgeting' && <div className={`w-1 h-1 rounded-full ${isDark ? 'bg-white' : 'bg-black'} absolute bottom-2`} />}
        </button>

        {/* Center FAB: Painel */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-5 w-[60px] h-[60px]">
          <button 
            onClick={() => onTabChange('dashboard')}
            className={`w-full h-full rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all border-[4px] cursor-pointer ${
              isDark 
                ? 'bg-white text-black border-[#0D0D0D]' 
                : 'bg-black text-white border-neutral-100'
            } ${activeTab === 'dashboard' ? 'scale-105' : 'scale-100'}`}
          >
            <LayoutDashboard className="w-6 h-6" strokeWidth={activeTab === 'dashboard' ? 2.5 : 2} />
          </button>
        </div>

        {/* Right Tab: Transações */}
        <button 
          onClick={() => onTabChange('transactions')}
          className="absolute right-0 bottom-0 w-[40%] h-[64px] flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform cursor-pointer"
        >
          <div className={`p-1.5 rounded-full transition-colors ${activeTab === 'transactions' ? (isDark ? 'bg-white/10' : 'bg-black/5') : 'bg-transparent'}`}>
            <ArrowLeftRight 
              className={`w-5 h-5 transition-colors ${activeTab === 'transactions' ? (isDark ? 'text-white' : 'text-black') : (isDark ? 'text-neutral-500' : 'text-neutral-400')}`} 
              strokeWidth={activeTab === 'transactions' ? 2.5 : 2}
            />
          </div>
          {activeTab === 'transactions' && <div className={`w-1 h-1 rounded-full ${isDark ? 'bg-white' : 'bg-black'} absolute bottom-2`} />}
        </button>
      </div>
    </div>
  );
}
