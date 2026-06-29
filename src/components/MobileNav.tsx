import React from 'react';
import { Wallet, LayoutGrid, ArrowLeftRight } from 'lucide-react';
import { ActiveTab } from '../types';

interface MobileNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  theme: 'dark' | 'light';
}

export default function MobileNav({ activeTab, onTabChange, theme }: MobileNavProps) {
  const isDark = theme === 'dark';

  // Define tab items in the exact order requested by user:
  // 1. PAINEL (dashboard)
  // 2. CARTEIRA (budgeting)
  // 3. TRANSAÇÕES (transactions)
  const tabs = [
    { id: 'dashboard' as ActiveTab, label: 'PAINEL', icon: LayoutGrid },
    { id: 'budgeting' as ActiveTab, label: 'CARTEIRA', icon: Wallet },
    { id: 'transactions' as ActiveTab, label: 'TRANSAÇÕES', icon: ArrowLeftRight },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden px-4 pb-4 bg-transparent pointer-events-none">
      <div 
        className={`w-full max-w-sm mx-auto h-[60px] pointer-events-auto flex items-center justify-around px-2 rounded-2xl shadow-lg transition-colors duration-300 ${
          isDark 
            ? 'bg-[#141414]/95 backdrop-blur-md border border-neutral-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.5)]' 
            : 'bg-white/95 backdrop-blur-md border border-neutral-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.06)]'
        }`}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 h-[48px] px-3 min-w-[70px] transition-all duration-200 cursor-pointer rounded-xl ${
                isActive
                  ? isDark
                    ? 'bg-white text-black font-extrabold shadow-sm'
                    : 'bg-black text-white font-extrabold shadow-sm'
                  : isDark
                    ? 'text-neutral-500 hover:text-white bg-transparent'
                    : 'text-neutral-500 hover:text-black bg-transparent'
              }`}
            >
              <Icon 
                className={`w-4 h-4 shrink-0 ${
                  isActive
                    ? isDark ? '!text-black' : '!text-white'
                    : isDark ? 'text-neutral-500' : 'text-neutral-500'
                }`} 
                strokeWidth={isActive ? 2.5 : 2} 
              />
              <span className={`text-[8px] font-sans font-extrabold tracking-wider leading-none ${
                isActive
                  ? isDark ? '!text-black' : '!text-white'
                  : isDark ? 'text-neutral-500' : 'text-neutral-500'
              }`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
