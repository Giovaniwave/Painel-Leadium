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
        className={`w-full max-w-md mx-auto h-[72px] pointer-events-auto flex items-center justify-around px-3 rounded-[24px] shadow-lg transition-colors duration-300 ${
          isDark 
            ? 'bg-[#141414] border border-neutral-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.5)]' 
            : 'bg-white border border-neutral-100/90 shadow-[0_8px_30px_rgb(0,0,0,0.06)]'
        }`}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center gap-1.5 h-[56px] px-4 min-w-[90px] transition-all duration-200 cursor-pointer rounded-[18px] ${
                isActive
                  ? isDark
                    ? 'bg-white text-black font-extrabold shadow-sm scale-100'
                    : 'bg-black text-white font-extrabold shadow-sm scale-100'
                  : isDark
                    ? 'text-[#8E8E93] hover:text-white bg-transparent scale-95'
                    : 'text-[#555555] hover:text-black bg-transparent scale-95'
              }`}
            >
              <Icon 
                className="w-5 h-5 shrink-0" 
                strokeWidth={isActive ? 2.5 : 2} 
              />
              <span className="text-[9px] font-sans font-extrabold tracking-wider leading-none">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
