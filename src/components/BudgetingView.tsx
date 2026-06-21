/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Plus, ChevronDown, Calendar, Percent, CheckSquare, Square, Trash, Star, Coffee, Utensils, ArrowUpRight, ArrowDownLeft, Pencil, Check, X } from 'lucide-react';
import { Transaction, BudgetGoal } from '../types';
import { formatSystemDate } from '../utils/date';

interface BudgetingViewProps {
  transactions: Transaction[];
  onOpenAddModal: () => void;
  onDeleteTransaction: (id: string) => void;
  budgetGoals: BudgetGoal[];
  onUpdateGoal?: (id: string, updates: Partial<BudgetGoal>) => void;
  revenueGoal: number;
  onUpdateRevenueGoal: (val: number) => void;
  theme?: 'light' | 'dark';
}

export default function BudgetingView({ 
  transactions, 
  onOpenAddModal, 
  onDeleteTransaction,
  budgetGoals,
  onUpdateGoal,
  revenueGoal,
  onUpdateRevenueGoal,
  theme = 'dark'
}: BudgetingViewProps) {
  const currentFormattedMonthAndYear = useMemo(() => {
    const ptMonths = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const now = new Date();
    const monthName = ptMonths[now.getMonth()];
    const year = now.getFullYear();
    return `${monthName} de ${year}`;
  }, []);

  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');

  const [isEditingRevenue, setIsEditingRevenue] = useState(false);
  const [editingRevenueValue, setEditingRevenueValue] = useState(revenueGoal.toString());

  const startEditing = (id: string, val: number) => {
    setEditingGoalId(id);
    setEditingValue(val.toString());
  };

  const cancelEditing = () => {
    setEditingGoalId(null);
    setEditingValue('');
  };

  const saveEditing = (id: string) => {
    const num = parseFloat(editingValue);
    if (!isNaN(num) && num >= 0 && onUpdateGoal) {
      onUpdateGoal(id, { allocated: num });
    }
    setEditingGoalId(null);
    setEditingValue('');
  };

  const startEditingRevenue = () => {
    setIsEditingRevenue(true);
    setEditingRevenueValue(revenueGoal.toString());
  };

  const saveEditingRevenue = () => {
    const num = parseFloat(editingRevenueValue);
    if (!isNaN(num) && num >= 0) {
      onUpdateRevenueGoal(num);
    }
    setIsEditingRevenue(false);
  };

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('Todas as Categorias');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('Todas as Transações');
  
  // Stats toggle checkboxes
  const [showUsed, setShowUsed] = useState(true);
  const [showRemaining, setShowRemaining] = useState(true);

  // Compute stats
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchCategory = selectedCategoryFilter === 'Todas as Categorias' || tx.category === selectedCategoryFilter;
      const matchType = selectedTypeFilter === 'Todas as Transações' || 
        (selectedTypeFilter === 'Income' && tx.type === 'income') ||
        (selectedTypeFilter === 'Expense' && tx.type === 'expense');
      return matchCategory && matchType;
    });
  }, [transactions, selectedCategoryFilter, selectedTypeFilter]);

  // Sum total budget allocated
  const totalAllocated = useMemo(() => {
    if (selectedCategoryFilter === 'Todas as Categorias') {
      return budgetGoals.reduce((sum, g) => sum + g.allocated, 0);
    }
    const found = budgetGoals.find(g => g.name === selectedCategoryFilter);
    return found ? found.allocated : 0;
  }, [budgetGoals, selectedCategoryFilter]);

  // Sum total spent (expenses)
  const totalSpent = useMemo(() => {
    const expenses = transactions.filter(tx => tx.type === 'expense');
    if (selectedCategoryFilter === 'Todas as Categorias') {
      return expenses.reduce((sum, tx) => sum + tx.amount, 0);
    }
    return expenses
      .filter(tx => tx.category === selectedCategoryFilter)
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [transactions, selectedCategoryFilter]);

  // Sum total income (faturamento)
  const totalIncome = useMemo(() => {
    return transactions
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [transactions]);

  // Sum total remaining
  const remainingBudget = Math.max(0, totalAllocated - totalSpent);

  // Spend percentage
  const usagePercentage = useMemo(() => {
    if (totalAllocated === 0) return 0;
    return Math.min(100, Math.round((totalSpent / totalAllocated) * 100));
  }, [totalSpent, totalAllocated]);

  // Revenue reached percentage
  const percentageRevenueReached = useMemo(() => {
    if (revenueGoal === 0) return 0;
    return Math.min(100, Math.round((totalIncome / revenueGoal) * 100));
  }, [totalIncome, revenueGoal]);

  const remainingRevenueGoal = Math.max(0, revenueGoal - totalIncome);

  // Calculate dynamic "Most Expense" ranking
  const expenseRankings = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    
    // Seed default categories list
    const defaultCategories = ['Investimentos', 'Salários', 'Custo Mensal', 'Emergências', 'Despesa Variável'];
    defaultCategories.forEach(cat => {
      categoryTotals[cat] = 0;
    });

    transactions
      .filter(tx => tx.type === 'expense' && (selectedCategoryFilter === 'Todas as Categorias' || tx.category === selectedCategoryFilter))
      .forEach(tx => {
        if (categoryTotals[tx.category] !== undefined) {
          categoryTotals[tx.category] += tx.amount;
        } else {
          categoryTotals[tx.category] = tx.amount;
        }
      });

    // Sort descending
    return Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category,
        amount,
        percentChange: category === 'Custo Mensal' ? '+12%' : category === 'Investimentos' ? '+8%' : '-3%'
      }))
      .filter(item => item.amount > 0 || defaultCategories.includes(item.category))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions, selectedCategoryFilter]);

  // Format currency
  const formatValue = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-10 py-4 animate-fadeIn">
      {/* Date Selector & Action Trigger */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-white/10 pb-6 gap-4">
        <div>
          <h2 className="text-4xl font-serif italic font-light text-white tracking-tighter">{currentFormattedMonthAndYear}</h2>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#666666] mt-1">Visão geral de Planos de Carteira</p>
        </div>
        <button
          id="btn-add-manual-transaction"
          onClick={onOpenAddModal}
          className={`px-6 py-2 font-medium rounded-lg transition-colors cursor-pointer text-sm ${
            theme === 'light'
              ? 'bg-black text-[#FFFFFF] hover:bg-gray-800'
              : 'bg-white text-black hover:bg-gray-200'
          }`}
        >
          Adicionar
        </button>
      </div>

      {/* Filters Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Category selection filter dropdown */}
        <div className="space-y-1.5 text-left">
          <label className="text-[9px] uppercase tracking-[0.2em] text-[#999999] font-bold block">
            Categoria Alvo
          </label>
          <div className="relative group">
            <select
              id="filter-category-select"
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="w-full bg-[#141414] border border-white/10 rounded-xl py-3 px-4 text-xs tracking-wider text-white appearance-none focus:outline-none focus:border-leadium-orange/50 transition-colors cursor-pointer"
              style={{ backgroundColor: '#141414', color: '#ffffff' }}
            >
              <option value="Todas as Categorias" style={{ backgroundColor: '#141414', color: '#ffffff' }}>Todas as Categorias</option>
              {/* Core Limits */}
              <option value="Custo Mensal" style={{ backgroundColor: '#141414', color: '#ffffff' }}>Custo Mensal</option>
              <option value="Salários" style={{ backgroundColor: '#141414', color: '#ffffff' }}>Salários (Contas/Equipe)</option>
              <option value="Investimentos" style={{ backgroundColor: '#141414', color: '#ffffff' }}>Investimentos</option>
              <option value="Emergências" style={{ backgroundColor: '#141414', color: '#ffffff' }}>Emergências</option>
              <option value="Despesa Variável" style={{ backgroundColor: '#141414', color: '#ffffff' }}>Despesa Variável</option>
              {/* Ledgers options */}
              <option value="Venda de Serviços" style={{ backgroundColor: '#141414', color: '#ffffff' }}>Venda de Serviços</option>
              <option value="Cafe & Restaurants" style={{ backgroundColor: '#141414', color: '#ffffff' }}>Café e Restaurantes</option>
              <option value="Groceries" style={{ backgroundColor: '#141414', color: '#ffffff' }}>Supermercado</option>
              <option value="Money Transfer" style={{ backgroundColor: '#141414', color: '#ffffff' }}>Transferência</option>
              <option value="Utilities" style={{ backgroundColor: '#141414', color: '#ffffff' }}>Serviços Públicos</option>
              <option value="Other" style={{ backgroundColor: '#141414', color: '#ffffff' }}>Outras Despesas</option>
            </select>
            <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-white transition-colors" />
          </div>
        </div>

        {/* Type selection filter dropdown */}
        <div className="space-y-1.5 text-left">
          <label className="text-[9px] uppercase tracking-[0.2em] text-[#999999] font-bold block">
            Tipo
          </label>
          <div className="relative group">
            <select
              id="filter-type-select"
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="w-full bg-[#141414] border border-white/10 rounded-xl py-3 px-4 text-xs tracking-wider text-white appearance-none focus:outline-none focus:border-leadium-orange/50 transition-colors cursor-pointer"
              style={{ backgroundColor: '#141414', color: '#ffffff' }}
            >
              <option value="Todas as Transações" style={{ backgroundColor: '#141414', color: '#ffffff' }}>Todas as Transações</option>
              <option value="Income" style={{ backgroundColor: '#141414', color: '#ffffff' }}>Entradas (+)</option>
              <option value="Expense" style={{ backgroundColor: '#141414', color: '#ffffff' }}>Saídas (-)</option>
            </select>
            <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-white transition-colors" />
          </div>
        </div>

        {/* Date Filter Visual Card */}
        <div className="space-y-1.5 text-left">
          <label className="text-[9px] uppercase tracking-[0.2em] text-[#999999] font-bold block">
            Intervalo de Datas
          </label>
          <div className="w-full bg-[#141414] border border-white/10 rounded-xl py-3 px-4 text-xs flex justify-between items-center text-white hover:border-white/15 transition-colors cursor-default group">
            <span className="font-medium tracking-wide">{currentFormattedMonthAndYear}</span>
            <Calendar className="w-4 h-4 text-gray-400 group-hover:text-leadium-orange transition-colors" />
          </div>
        </div>
      </div>

      {/* Main Budget Layout Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Most Expense Dashboard block ranking details (Formerly RHS, expanded to full layout) */}
        <div className="lg:col-span-12 glass-container p-8 hover:border-[#3B82F6]/30 transition-all duration-300">
          <h3 className="text-[9px] uppercase tracking-[0.25em] font-bold text-[#999999] mb-6 flex items-center gap-2 text-left">
            <span className="w-1.5 h-1.5 bg-ai-blue rounded-full"></span>
            Maiores Categorias de Gastos
          </h3>
          
          <div className="space-y-4">
            {expenseRankings.map((entity, index) => {
              const rankStr = `0${index + 1}`;
              const isPositive = entity.percentChange.startsWith('+');
              return (
                <div 
                  key={entity.category}
                  className="group flex items-center justify-between p-3 rounded-xl bg-white/2 hover:bg-white/5 border border-white/0 hover:border-white/10 transition-all duration-200 cursor-default"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] bg-[#161616] border border-white/10 w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 font-mono group-hover:border-leadium-orange/50 group-hover:text-white transition-colors">
                      {rankStr}
                    </span>
                    <div className="text-left">
                      <div className="text-base font-bold text-white tracking-wide">
                        {formatValue(entity.amount)}
                      </div>
                      <div className="text-[9px] text-[#666666] uppercase tracking-widest font-bold mt-0.5">
                        {entity.category === 'Cafe & Restaurants' ? 'Café e Restaurantes' : entity.category === 'Groceries' ? 'Supermercado' : entity.category === 'Money Transfer' ? 'Transferência' : entity.category}
                      </div>
                    </div>
                  </div>
                  
                  <div className={`text-xs font-mono font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {entity.percentChange}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Target Budgets List Title */}
      <div className="space-y-4 text-left">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
          Alocação Planejada
        </h3>
        
        {/* Progress Circles Grid items */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          
          {budgetGoals.map((goal, idx) => {
            // Dynamic calculation based on transactions
            const matchedExpenses = transactions
              .filter(tx => tx.type === 'expense' && tx.category === goal.name)
              .reduce((sum, tx) => sum + tx.amount, 0);
            
            const percent = Math.min(100, Math.round((matchedExpenses / goal.allocated) * 100));
            
            // Outer ring radius computations
            const strokeDash = 175; // Circumference calculation
            const offset = strokeDash - (strokeDash * percent) / 100;
            
            // Rotate beautiful custom gradient colors representing each of the 5 goals
            const colors = ['stroke-[#FF4D00]', 'stroke-emerald-500', 'stroke-blue-500', 'stroke-purple-500', 'stroke-amber-500'];
            const colorClass = colors[idx % colors.length];

            return (
              <div 
                key={goal.id} 
                className="glass-container rounded-xl p-5 flex flex-col sm:flex-row items-center gap-6 hover:border-white/10 transition-all duration-200"
              >
                <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90">
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      fill="transparent"
                      stroke="rgba(255,255,255,0.04)"
                      strokeWidth="4"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      fill="transparent"
                      strokeWidth="4"
                      strokeDasharray={strokeDash}
                      strokeDashoffset={offset}
                      className={`${colorClass} gauge-transition`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-mono font-bold text-white">
                    {percent}%
                  </div>
                </div>

                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[9px] uppercase tracking-wider text-gray-500 font-bold mb-1 truncate">
                    Limite de {goal.name}
                  </p>
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <h4 className="text-xl font-light text-white tracking-tight">
                      {formatValue(matchedExpenses)}
                    </h4>
                    {editingGoalId === goal.id ? (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs text-gray-500">/</span>
                        <input
                          type="number"
                          value={editingValue}
                          onChange={e => setEditingValue(e.target.value)}
                          className="w-16 bg-black/60 text-white border border-white/20 rounded px-1.5 py-0.5 text-xs font-mono focus:outline-none focus:border-emerald-500"
                          autoFocus
                        />
                        <button 
                          type="button"
                          onClick={() => saveEditing(goal.id)}
                          className="p-1 hover:text-emerald-400 bg-white/5 rounded"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          type="button"
                          onClick={cancelEditing}
                          className="p-1 hover:text-rose-400 bg-white/5 rounded"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 group/lim">
                        <span className="text-xs text-gray-500">
                          / {formatValue(goal.allocated)}
                        </span>
                        {onUpdateGoal && (
                          <button
                            type="button"
                            onClick={() => startEditing(goal.id, goal.allocated)}
                            className="opacity-0 group-hover/lim:opacity-100 hover:text-white transition-opacity p-0.5"
                            title="Alterar Limite"
                          >
                            <Pencil className="w-3 h-3 text-gray-400 hover:text-white" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mini Transactions History list */}
      <div className="space-y-4 pt-4 border-t border-white/5">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
            Atividades Recentes
          </h3>
          <span className="text-[10px] text-gray-500 capitalize tracking-wider font-mono">
            Ações filtradas
          </span>
        </div>

        <div className="divide-y divide-white/5 bg-[#12141C]/50 border border-white/5 rounded-xl overflow-hidden">
          {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">
              Nenhuma transação correspondente aos filtros ativos.
            </div>
          ) : (
            filteredTransactions.slice(0, 3).map((tx) => {
              return (
                <div 
                  key={tx.id} 
                  className="p-4 flex items-center justify-between hover:bg-white/2 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    {tx.avatarUrl ? (
                      <img 
                        src={tx.avatarUrl} 
                        alt={tx.sender || 'Sender'} 
                        className="w-10 h-10 rounded-lg object-cover bg-white/5"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-white text-xs font-mono font-bold">
                        {((tx.sender || 'TX').substring(0, 2)).toUpperCase()}
                      </div>
                    )}

                    <div className="text-left">
                      <h4 className="text-xs font-bold text-white group-hover:text-[#B43C00] transition-colors">
                        {tx.sender || 'Pagador Desconhecido'}
                      </h4>
                      <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1.5 font-mono">
                        <span>{formatSystemDate(tx.date)}</span>
                        <span className="w-1 h-1 bg-white/10 rounded-full"></span>
                        <span>{tx.description}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-4">
                    <div>
                      <div className={`text-sm font-bold font-mono ${tx.type === 'income' ? 'text-emerald-400' : 'text-white'}`}>
                        {tx.type === 'income' ? '+' : '-'}{formatValue(tx.amount)}
                      </div>
                      <div className="text-[8px] uppercase font-bold tracking-wider text-gray-500 font-mono mt-0.5">
                        {tx.category === 'Receita / Faturamento' ? 'Receita / Faturamento' : tx.category === 'Cafe & Restaurants' ? 'Café e Restaurantes' : tx.category === 'Groceries' ? 'Supermercado' : tx.category === 'Money Transfer' ? 'Transferência' : tx.category}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteTransaction(tx.id)}
                      className="p-1 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all cursor-pointer bg-transparent border-0"
                      title="Excluir entrada manual"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
