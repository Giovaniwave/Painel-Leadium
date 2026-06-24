/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import BudgetingView from './components/BudgetingView';
import TransactionsView from './components/TransactionsView';
import ClientsView from './components/ClientsView';
import SettingsView from './components/SettingsView';
import ExpensesView from './components/ExpensesView';
import GeneralExpensesView from './components/GeneralExpensesView';
import AddTransactionModal from './components/AddTransactionModal';
import FinanceAssistant from './components/FinanceAssistant';
import LoginView from './components/LoginView';
import MobileNav from './components/MobileNav';

import { ActiveTab, Transaction, BudgetGoal, Client } from './types';
import { INITIAL_TRANSACTIONS } from './data/seedData';
import { LayoutDashboard, Wallet, ArrowLeftRight, Settings as SettingsIcon, MessageSquare, X, Users, Receipt } from 'lucide-react';

// Default "Caixinha" budget goals limits config
const DEFAULT_GOALS: BudgetGoal[] = [
  { id: 'Investimentos', name: 'Investimentos', allocated: 2000, spent: 0 },
  { id: 'Salários', name: 'Salários', allocated: 5000, spent: 0 },
  { id: 'Custo Mensal', name: 'Custo Mensal', allocated: 3000, spent: 0 },
  { id: 'Emergências', name: 'Emergências', allocated: 1500, spent: 0 },
  { id: 'Despesa Variável', name: 'Despesa Variável', allocated: 1000, spent: 0 }
];

export default function App() {
  // Authentication Session State with caching
  const [userEmail, setUserEmail] = useState<string | null>(() => {
    return localStorage.getItem('leadiumfy_session_email_v2');
  });

  // Theme settings state with caching
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('leadiumfy_theme') as 'dark' | 'light') || 'dark';
  });

  // Stateful User profile structure (Editable in Settings)
  const [userProfile, setUserProfile] = useState(() => {
    const cached = localStorage.getItem('leadiumfy_user_profile_v2');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
    return {
      name: 'Nome do Titular',
      avatarUrl: '',
      email: ''
    };
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  const [budgetGoals, setBudgetGoals] = useState<BudgetGoal[]>(DEFAULT_GOALS);

  const [revenueGoal, setRevenueGoal] = useState<number>(100000);

  // Sync user profile from db when email is present
  useEffect(() => {
    async function fetchUserProfile() {
      if (!userEmail) return;
      try {
        const res = await fetch(`/api/user-profile?email=${encodeURIComponent(userEmail)}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.name) {
            const profile = {
              name: data.name,
              avatarUrl: data.avatar_url || '',
              email: data.email
            };
            setUserProfile(profile);
            localStorage.setItem('leadiumfy_user_profile_v2', JSON.stringify(profile));
          }
        }
      } catch (err) {
        console.error('Failed to load user profile from server:', err);
      }
    }
    fetchUserProfile();
  }, [userEmail]);

  const handleUpdateRevenueGoal = async (val: number) => {
    setRevenueGoal(val);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: val })
      });
    } catch (err) {
      console.error('Error writing faturamento meta setting:', err);
    }
  };

  // Sync on startup from database / Supabase
  useEffect(() => {
    async function loadFullStackData() {
      try {
        const txRes = await fetch('/api/transactions');
        if (txRes.ok) {
          const txData = await txRes.json();
          if (Array.isArray(txData)) {
            setTransactions(txData);
          }
        }
        
        const goalsRes = await fetch('/api/budget-goals');
        if (goalsRes.ok) {
          const goalsData = await goalsRes.json();
          if (Array.isArray(goalsData)) {
            setBudgetGoals(goalsData.length > 0 ? goalsData : DEFAULT_GOALS);
          }
        }

        const settingsRes = await fetch('/api/settings');
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          if (settingsData && typeof settingsData.faturamento_meta !== 'undefined') {
            const num = Number(settingsData.faturamento_meta);
            setRevenueGoal(num);
          }
        }

        const clientsRes = await fetch('/api/clients');
        if (clientsRes.ok) {
          const clientsData = await clientsRes.json();
          if (Array.isArray(clientsData)) {
            setClients(clientsData);
          }
        }
      } catch (err) {
        console.error('Failed to sync initial state from database server:', err);
      }
    }
    loadFullStackData();
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  
  // Sidebar collapsing & mobile drawer responsive states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  
  // Overlay modals state flags
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [hasUnreadMessage, setHasUnreadMessage] = useState(true); // AI badge notification glow

  // Draggable floating assistant icon settings
  const [isFloatingVisible, setIsFloatingVisible] = useState(true);
  const [floatPos, setFloatPos] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 155 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showFloatingMenu, setShowFloatingMenu] = useState(false);

  // Mouse and Touch Dragging logic for Assistant bubble
  const handleFloatMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setDragging(true);
    setDragStart({
      x: e.clientX - floatPos.x,
      y: e.clientY - floatPos.y
    });
    // Prevent default selection text behavior during drag
    e.preventDefault();
  };

  const handleFloatTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setDragging(true);
    setDragStart({
      x: touch.clientX - floatPos.x,
      y: touch.clientY - floatPos.y
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging) return;
      let newX = e.clientX - dragStart.x;
      let newY = e.clientY - dragStart.y;
      
      // Boundaries
      newX = Math.max(10, Math.min(window.innerWidth - 70, newX));
      newY = Math.max(10, Math.min(window.innerHeight - 70, newY));
      
      setFloatPos({ x: newX, y: newY });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!dragging) return;
      const touch = e.touches[0];
      let newX = touch.clientX - dragStart.x;
      let newY = touch.clientY - dragStart.y;
      
      newX = Math.max(10, Math.min(window.innerWidth - 70, newX));
      newY = Math.max(10, Math.min(window.innerHeight - 70, newY));
      
      setFloatPos({ x: newX, y: newY });
    };

    const handleDragEnd = () => {
      setDragging(false);
    };

    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleDragEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [dragging, dragStart]);

  // Save changes to cached storage
  useEffect(() => {
    localStorage.setItem('leadiumfy_theme', theme);
  }, [theme]);

  // Auth logins action to session cache
  const handleLogin = (email: string) => {
    setUserEmail(email);
    localStorage.setItem('leadiumfy_session_email_v2', email);
    
    // Sync email with internal profile state
    const updatedProfile = { ...userProfile, email };
    setUserProfile(updatedProfile);
    localStorage.setItem('leadiumfy_user_profile_v2', JSON.stringify(updatedProfile));
  };

  // Auth signouts action
  const handleLogout = () => {
    setUserEmail(null);
    localStorage.removeItem('leadiumfy_session_email_v2');
  };

  // Command CRUD Operations: Add new transaction
  const handleAddClient = async (newClientData: Omit<Client, 'id'>) => {
    const uuid = typeof window !== 'undefined' && window.crypto && typeof window.crypto.randomUUID === 'function'
      ? window.crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
    const newClient: Client = {
      ...newClientData,
      id: uuid
    };
    
    const updated = [newClient, ...clients];
    setClients(updated);

    try {
      await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clients: updated })
      });
    } catch (err) {
      console.error('Failed to sync added client:', err);
    }
  };

  const handleUpdateClient = async (updatedClient: Client) => {
    const updated = clients.map(c => c.id === updatedClient.id ? updatedClient : c);
    setClients(updated);

    try {
      await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clients: updated })
      });
    } catch (err) {
      console.error('Failed to sync updated client:', err);
    }
  };

  // Command CRUD Operations: Add new transaction
  const handleAddTransaction = async (newTxData: Omit<Transaction, 'id'>) => {
    const uuid = typeof window !== 'undefined' && window.crypto && typeof window.crypto.randomUUID === 'function'
      ? window.crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
    const newTx: Transaction = {
      ...newTxData,
      id: uuid
    };
    
    const updated = [newTx, ...transactions];
    setTransactions(updated);

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ transactions: updated })
      });
      if (!res.ok) {
        const errObj = await res.json().catch(() => ({}));
        alert("Erro no Supabase: " + (errObj.error || "Falha ao sincronizar"));
        setTransactions(transactions); // revert
      }
    } catch (err) {
      console.error('Error syncing transactions to server:', err);
    }
  };

  // Command CRUD Operations: Delete manual entry
  const handleDeleteTransaction = async (id: string) => {
    const updated = transactions.filter((t) => t.id !== id);
    setTransactions(updated);

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ transactions: updated })
      });
      if (!res.ok) {
        const errObj = await res.json().catch(() => ({}));
        alert("Erro no Supabase: " + (errObj.error || "Falha ao sincronizar a deleção"));
        setTransactions(transactions); // revert
      }
    } catch (err) {
      console.error('Error syncing transactions to server:', err);
    }
  };

  // Command CRUD Operations: Update whole transactions roster (for linking clients, etc.)
  const handleUpdateTransactions = async (updatedList: Transaction[]) => {
    setTransactions(updatedList);

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ transactions: updatedList })
      });
      if (!res.ok) {
        const errObj = await res.json().catch(() => ({}));
        alert("Erro no Supabase: " + (errObj.error || "Falha ao sincronizar as transações"));
        setTransactions(transactions); // revert
      }
    } catch (err) {
      console.error('Error syncing transactions to server:', err);
    }
  };

  // Command CRUD Operations: Update targets/goals values
  const handleUpdateGoal = async (id: string, updates: Partial<BudgetGoal>) => {
    const updated = budgetGoals.map((g) => {
      if (g.id === id) {
        return { ...g, ...updates };
      }
      return g;
    });
    setBudgetGoals(updated);

    try {
      const res = await fetch('/api/budget-goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ budgetGoals: updated })
      });
      if (!res.ok) {
        const errObj = await res.json().catch(() => ({}));
        alert("Erro no Supabase: " + (errObj.error || "Falha ao sincronizar metas."));
        setBudgetGoals(budgetGoals);
      }
    } catch (err) {
      console.error('Error syncing goals to server:', err);
    }
  };

  // Wipe application caching
  const handleResetAllData = async () => {
    setTransactions([]);
    setBudgetGoals(DEFAULT_GOALS);
    setRevenueGoal(100000);

    try {
      await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: [] })
      });
      await fetch('/api/budget-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budgetGoals: DEFAULT_GOALS })
      });
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: 100000 })
      });
    } catch (err) {
      console.error('Error resetting database data:', err);
    }
  };

  // Dynamic Header Title Calculation
  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Painel Financeiro';
      case 'budgeting': return 'Plano de Carteira';
      case 'transactions': return 'Transações';
      case 'expenses': return 'Controle de Frota';
      case 'clients': return 'Gestão de Clientes';
      case 'settings': return 'Configurações do Sistema';
      default: return 'Gestão Leadium';
    }
  };

  // Redirect to secure login if session is absent
  if (!userEmail) {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <div className={`flex h-screen bg-[#0D0D0D] text-[#E2E2EB] font-sans overflow-hidden relative selection:bg-white selection:text-black ${theme === 'light' ? 'light-theme' : ''}`}>
      
      {/* Side navigation rail - hidden on mobile cells, shown on md and up */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab);
        }} 
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isOpenMobile={isSidebarOpenMobile}
        setIsOpenMobile={setIsSidebarOpenMobile}
        onOpenAssistant={() => {
          setIsAssistantOpen(true);
          setHasUnreadMessage(false);
        }}
        theme={theme}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Persistent top application banner menu */}
        <Header 
          title={getHeaderTitle()} 
          searchQuery={searchQuery}
          setSearchQuery={(q) => {
            setSearchQuery(q);
            if (activeTab !== 'transactions' && activeTab !== 'budgeting') {
              setActiveTab('transactions'); // redirect search inquiries to transaction ledger automatically
            }
          }}
          onOpenAssistant={() => {
            setIsAssistantOpen(true);
            setHasUnreadMessage(false);
          }}
          hasUnreadMessage={hasUnreadMessage}
          onToggleMobileMenu={() => setIsSidebarOpenMobile(!isSidebarOpenMobile)}
          userProfile={userProfile}
          theme={theme}
          onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          onLogout={handleLogout}
          onNavigateToTab={(tab) => setActiveTab(tab)}
        />

        {/* Central main routing panels */}
        <main className="p-4 sm:p-8 max-w-7xl w-full mx-auto flex-1 min-h-0">
          <div className="pb-24 sm:pb-8">
            {activeTab === 'dashboard' && (
              <DashboardView 
                transactions={transactions} 
                budgetGoals={budgetGoals} 
                onOpenAddModal={() => setIsAddModalOpen(true)}
                onNavigateToTab={(tab) => setActiveTab(tab)}
                onUpdateGoal={handleUpdateGoal}
                theme={theme}
                revenueGoal={revenueGoal}
                onUpdateRevenueGoal={handleUpdateRevenueGoal}
              />
            )}
            {activeTab === 'budgeting' && (
              <BudgetingView 
                transactions={transactions}
                onOpenAddModal={() => setIsAddModalOpen(true)}
                onDeleteTransaction={handleDeleteTransaction}
                budgetGoals={budgetGoals}
                onUpdateGoal={handleUpdateGoal}
                revenueGoal={revenueGoal}
                onUpdateRevenueGoal={handleUpdateRevenueGoal}
                theme={theme}
              />
            )}
            {activeTab === 'transactions' && (
              <TransactionsView 
                transactions={transactions}
                onOpenAddModal={() => setIsAddModalOpen(true)}
                onDeleteTransaction={handleDeleteTransaction}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                budgetGoals={budgetGoals}
                theme={theme}
              />
            )}
            {activeTab === 'clients' && (
              <ClientsView 
                clients={clients}
                transactions={transactions}
                onAddClient={handleAddClient}
                onUpdateClient={handleUpdateClient}
                onAddTransaction={handleAddTransaction}
                onUpdateTransactions={handleUpdateTransactions}
                theme={theme}
              />
            )}
            {activeTab === 'expenses' && (
              <ExpensesView theme={theme} />
            )}
            {activeTab === 'general_expenses' && (
              <GeneralExpensesView theme={theme} clients={clients} />
            )}
            {activeTab === 'settings' && (
              <SettingsView 
                budgetGoals={budgetGoals}
                onUpdateGoal={handleUpdateGoal}
                onResetAllData={handleResetAllData}
                userProfile={userProfile}
                onUpdateProfile={async (updatedProfile) => {
                  setUserProfile(updatedProfile);
                  localStorage.setItem('leadiumfy_user_profile_v2', JSON.stringify(updatedProfile));
                  try {
                    await fetch('/api/user-profile', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        email: updatedProfile.email,
                        name: updatedProfile.name,
                        avatar_url: updatedProfile.avatarUrl
                      })
                    });
                  } catch (err) {
                    console.error('Failed to sync profile updates to server', err);
                  }
                }}
                theme={theme}
                setTheme={setTheme}
              />
            )}
            {/* Elegant footer */}
            <footer className={`mt-16 pt-8 pb-4 border-t text-center text-[10px] uppercase tracking-[0.2em] font-medium transition-colors ${
              theme === 'light' ? 'border-gray-200 text-gray-400' : 'border-white/5 text-gray-650'
            }`}>
              Leadium © 2026. Todos os direitos reservados.
            </footer>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Menu */}
      <div 
        className={`md:hidden fixed bottom-6 left-6 right-6 z-45 flex justify-around items-center py-2 px-2 rounded-2xl shadow-2xl transition-all ${
          theme === 'light' 
            ? 'bg-[#FFFFFF]/95 backdrop-blur-md border border-[#E5E7EB]' 
            : 'bg-[#1A1A1A]/95 backdrop-blur-md border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)]'
        }`}
        id="mobile-bottom-tabs"
      >
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-xl transition-all cursor-pointer active:scale-95 ${
            activeTab === 'dashboard' 
              ? 'text-[#FF4D00] bg-[#FF4D00]/10 border border-[#FF4D00]/20 font-bold scale-105 shadow-sm' 
              : 'text-gray-500 hover:text-gray-400 border border-transparent'
          }`}
        >
          <LayoutDashboard className="w-[22px] h-[22px]" />
          <span className="text-[9px] uppercase tracking-wider font-semibold font-sans">Painel</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('budgeting')}
          className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-xl transition-all cursor-pointer active:scale-95 ${
            activeTab === 'budgeting' 
              ? 'text-[#FF4D00] bg-[#FF4D00]/10 border border-[#FF4D00]/20 font-bold scale-105 shadow-sm' 
              : 'text-gray-500 hover:text-gray-400 border border-transparent'
          }`}
        >
          <Wallet className="w-[22px] h-[22px]" />
          <span className="text-[9px] uppercase tracking-wider font-semibold font-sans">Carteira</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('transactions')}
          className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-xl transition-all cursor-pointer active:scale-95 ${
            activeTab === 'transactions' 
              ? 'text-[#FF4D00] bg-[#FF4D00]/10 border border-[#FF4D00]/20 font-bold scale-105 shadow-sm' 
              : 'text-gray-500 hover:text-gray-400 border border-transparent'
          }`}
        >
          <ArrowLeftRight className="w-[22px] h-[22px]" />
          <span className="text-[9px] uppercase tracking-wider font-semibold font-sans">Transações</span>
        </button>
      </div>

      {/* Draggable & Removable Floating Assistente Button (Kairos Chat Trigger) */}
      {isFloatingVisible && (
        <div 
          style={{ left: `${floatPos.x}px`, top: `${floatPos.y}px` }}
          className="fixed z-50 select-none animate-fadeIn"
        >
          <div 
            onMouseDown={handleFloatMouseDown}
            onTouchStart={handleFloatTouchStart}
            onClick={() => setShowFloatingMenu(!showFloatingMenu)}
            className={`w-11 h-11 rounded-full flex items-center justify-center shadow-md border relative transition-colors duration-200 cursor-pointer ${
              theme === 'light' ? 'bg-[#18181B] hover:bg-[#27272A] border-black/10' : 'bg-white hover:bg-gray-100 border-white/10'
            }`}
            title="Clique para abrir opções"
          >
            <img 
              src={theme === 'light' ? 'https://i.ibb.co/k245JhFM/logotipooficialleadium.png' : 'https://i.ibb.co/M5kWMmTJ/logo-para-versao-white-removebg-preview.png'} 
              alt="Leadium" 
              className="w-5 h-5 object-contain" 
            />
            {hasUnreadMessage && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#FF4D00] rounded-full flex items-center justify-center border border-white/25"></span>
            )}
          </div>

          {/* Micro choices menu overlay */}
          {showFloatingMenu && (
            <div className="absolute bottom-16 right-0 w-44 bg-[#141414]/95 backdrop-blur-md border border-white/10 rounded-xl p-2 shadow-2xl space-y-1.5 animate-fadeIn">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAssistantOpen(true);
                  setHasUnreadMessage(false);
                  setShowFloatingMenu(false);
                }}
                className="w-full text-left bg-white/5 hover:bg-[#FF4D00] hover:text-black text-white keep-white px-3 py-2 rounded-lg text-[9px] uppercase tracking-wider font-extrabold transition-all flex items-center gap-2 cursor-pointer border border-transparent hover:border-white/10"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Abrir Chat</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFloatingVisible(false);
                  setShowFloatingMenu(false);
                }}
                className="w-full text-left bg-red-500/10 hover:bg-red-500 hover:text-black text-red-500 hover:text-white px-3 py-2 rounded-lg text-[9px] uppercase tracking-wider font-extrabold transition-all flex items-center gap-2 cursor-pointer border border-transparent hover:border-red-500/20"
              >
                <X className="w-3.5 h-3.5" />
                <span>Ocultar Ícone</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Mobile Navigation Bar */}
      <MobileNav 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        theme={theme} 
      />

      {/* Manual Addition Trigger Modal overlay Form */}
      <AddTransactionModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onAdd={handleAddTransaction}
        budgetGoals={budgetGoals}
        clients={clients}
      />

      {/* Conversational AI sliding sidebar block */}
      <FinanceAssistant 
        isOpen={isAssistantOpen} 
        onClose={() => setIsAssistantOpen(false)}
        transactions={transactions}
        budgetGoals={budgetGoals}
        theme={theme}
        userEmail={userEmail}
      />
    </div>
  );
}
