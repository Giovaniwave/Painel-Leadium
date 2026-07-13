import React from 'react';
import { motion } from 'motion/react';
import { Wallet, LayoutGrid, ArrowLeftRight, Radar } from 'lucide-react';
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
    { id: 'prospecting' as ActiveTab, label: 'PROSPECÇÃO', icon: Radar },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden px-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-transparent pointer-events-none">
      <div
        className={`w-full max-w-xs mx-auto h-16 pointer-events-auto flex items-center justify-around gap-1 px-2 rounded-full shadow-lg transition-colors duration-300 ${
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
              className={`relative flex items-center justify-center gap-1.5 h-11 rounded-full transition-all duration-300 cursor-pointer overflow-hidden ${
                isActive ? 'flex-1 px-4' : 'w-11 shrink-0'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="mobileNavActivePill"
                  className={`absolute inset-0 rounded-full ${isDark ? 'bg-white' : 'bg-black'}`}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <Icon
                className={`relative w-[18px] h-[18px] shrink-0 ${
                  isActive
                    ? isDark ? 'text-black' : 'text-white keep-white'
                    : isDark ? 'text-neutral-500' : 'text-neutral-400'
                }`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              {isActive && (
                <span className={`relative text-[10px] font-sans font-extrabold tracking-wider leading-none whitespace-nowrap ${
                  isDark ? 'text-black' : 'text-white keep-white'
                }`}>
                  {tab.label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
