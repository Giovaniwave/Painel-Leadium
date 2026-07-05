/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { ChevronDown, Activity, Pencil, Check, X } from 'lucide-react';
import {
  BarChart as ReChartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Transaction, BudgetGoal, ActiveTab } from '../types';

interface BudgetingViewProps {
  transactions: Transaction[];
  onOpenAddModal: () => void;
  budgetGoals: BudgetGoal[];
  onUpdateGoal?: (id: string, updates: Partial<BudgetGoal>) => void;
  onNavigateToTab?: (tab: ActiveTab) => void;
  theme?: 'light' | 'dark';
}

export default function BudgetingView({
  transactions,
  onOpenAddModal,
  budgetGoals,
  onUpdateGoal,
  onNavigateToTab,
  theme = 'dark'
}: BudgetingViewProps) {
  const isLight = theme === 'light';

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

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('Todas as Categorias');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('Todas as Transações');

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

  // Planejado vs. Realizado per budget goal (moved here from the Dashboard to avoid showing this comparison twice)
  const budgetComparisonData = useMemo(() => {
    return budgetGoals.map(goal => {
      const spent = filteredTransactions
        .filter(tx => tx.type === 'expense' && tx.category === goal.name)
        .reduce((sum, tx) => sum + tx.amount, 0);
      return {
        name: goal.name,
        Planejado: goal.allocated,
        Realizado: spent
      };
    });
  }, [budgetGoals, filteredTransactions]);

  // Format currency
  const formatValue = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0
    }).format(val);
  };

  const BudgetTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-3 rounded-lg border shadow-xl font-mono text-xs ${
          isLight
            ? 'bg-white border-gray-200 text-zinc-900'
            : 'bg-[#18181B]/95 border-white/10 text-white'
        }`}>
          <p className="font-bold mb-1.5 uppercase text-[10px] tracking-wider">{label}</p>
          <div className="space-y-1">
            <p className="flex justify-between gap-4">
              <span className={isLight ? 'text-zinc-500' : 'text-zinc-400'}>Planejado:</span>
              <span className="font-bold">{formatValue(payload[0].value)}</span>
            </p>
            <p className="flex justify-between gap-4">
              <span className={isLight ? 'text-zinc-900' : 'text-white'}>Realizado:</span>
              <span className={`font-bold ${payload[1].value > payload[0].value ? 'text-rose-500 font-black' : (isLight ? 'text-zinc-600' : 'text-zinc-300')}`}>
                {formatValue(payload[1].value)}
              </span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const selectClass = `w-full border rounded-xl py-3 px-4 text-xs tracking-wider appearance-none focus:outline-none transition-colors cursor-pointer ${
    isLight
      ? 'bg-white border-gray-200/80 text-gray-950 focus:border-black/30'
      : 'bg-[#141414] border-white/10 text-white focus:border-white/40'
  }`;

  return (
    <div className="space-y-10 py-4 animate-fadeIn">
      {/* Header & Action Trigger */}
      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-end border-b pb-6 gap-4 ${
        isLight ? 'border-black/10' : 'border-white/10'
      }`}>
        <div>
          <h2 className={`text-4xl font-serif italic font-light tracking-tighter ${isLight ? 'text-gray-950' : 'text-white'}`}>
            {currentFormattedMonthAndYear}
          </h2>
          <p className={`text-[10px] uppercase tracking-[0.2em] mt-1 ${isLight ? 'text-gray-500' : 'text-[#666666]'}`}>
            Visão geral de Planos de Carteira
          </p>
        </div>
        <button
          id="btn-add-manual-transaction"
          onClick={onOpenAddModal}
          className={`px-6 py-2 font-medium rounded-lg transition-colors cursor-pointer text-sm ${
            isLight
              ? 'bg-black text-[#FFFFFF] hover:bg-gray-800'
              : 'bg-white text-black hover:bg-gray-200'
          }`}
        >
          Adicionar
        </button>
      </div>

      {/* Filters Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category selection filter dropdown */}
        <div className="space-y-1.5 text-left">
          <label className={`text-[9px] uppercase tracking-[0.2em] font-bold block ${isLight ? 'text-gray-500' : 'text-[#999999]'}`}>
            Categoria Alvo
          </label>
          <div className="relative group">
            <select
              id="filter-category-select"
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className={selectClass}
            >
              <option value="Todas as Categorias">Todas as Categorias</option>
              {/* Core Limits */}
              <option value="Custo Mensal">Custo Mensal</option>
              <option value="Salários">Salários (Contas/Equipe)</option>
              <option value="Investimentos">Investimentos</option>
              <option value="Emergências">Emergências</option>
              <option value="Despesa Variável">Despesa Variável</option>
              {/* Ledgers options */}
              <option value="Venda de Serviços">Venda de Serviços</option>
              <option value="Cafe & Restaurants">Café e Restaurantes</option>
              <option value="Groceries">Supermercado</option>
              <option value="Money Transfer">Transferência</option>
              <option value="Utilities">Serviços Públicos</option>
              <option value="Other">Outras Despesas</option>
            </select>
            <ChevronDown className={`w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${
              isLight ? 'text-gray-400 group-hover:text-gray-900' : 'text-gray-400 group-hover:text-white'
            }`} />
          </div>
        </div>

        {/* Type selection filter dropdown */}
        <div className="space-y-1.5 text-left">
          <label className={`text-[9px] uppercase tracking-[0.2em] font-bold block ${isLight ? 'text-gray-500' : 'text-[#999999]'}`}>
            Tipo
          </label>
          <div className="relative group">
            <select
              id="filter-type-select"
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className={selectClass}
            >
              <option value="Todas as Transações">Todas as Transações</option>
              <option value="Income">Entradas (+)</option>
              <option value="Expense">Saídas (-)</option>
            </select>
            <ChevronDown className={`w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${
              isLight ? 'text-gray-400 group-hover:text-gray-900' : 'text-gray-400 group-hover:text-white'
            }`} />
          </div>
        </div>
      </div>

      {/* Target Budgets List Title */}
      <div className="space-y-4 text-left">
        <h3 className={`text-sm font-semibold uppercase tracking-wider ${isLight ? 'text-gray-950' : 'text-white'}`}>
          Alocação Planejada
        </h3>

        {/* Progress Circles Grid items */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {budgetGoals.map((goal, idx) => {
            // Dynamic calculation based on transactions
            const matchedExpenses = transactions
              .filter(tx => tx.type === 'expense' && tx.category === goal.name)
              .reduce((sum, tx) => sum + tx.amount, 0);

            const percent = goal.allocated > 0 ? Math.min(100, Math.round((matchedExpenses / goal.allocated) * 100)) : 0;

            // Outer ring radius computations
            const strokeDash = 175; // Circumference calculation
            const offset = strokeDash - (strokeDash * percent) / 100;

            // Rotate beautiful custom gradient colors representing each of the 5 goals
            const colors = isLight
              ? ['stroke-[#111111]', 'stroke-emerald-600', 'stroke-blue-600', 'stroke-purple-600', 'stroke-amber-600']
              : ['stroke-[#FFFFFF]', 'stroke-emerald-500', 'stroke-blue-500', 'stroke-purple-500', 'stroke-amber-500'];
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
                      stroke={isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)'}
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
                  <div className={`absolute inset-0 flex items-center justify-center text-xs font-mono font-bold ${isLight ? 'text-gray-950' : 'text-white'}`}>
                    {percent}%
                  </div>
                </div>

                <div className="flex-1 min-w-0 text-left">
                  <p className={`text-[9px] uppercase tracking-wider font-bold mb-1 truncate ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>
                    Limite de {goal.name}
                  </p>
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <h4 className={`text-xl font-light tracking-tight ${isLight ? 'text-gray-950' : 'text-white'}`}>
                      {formatValue(matchedExpenses)}
                    </h4>
                    {editingGoalId === goal.id ? (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs text-gray-500">/</span>
                        <input
                          type="number"
                          value={editingValue}
                          onChange={e => setEditingValue(e.target.value)}
                          className={`w-16 border rounded px-1.5 py-0.5 text-xs font-mono focus:outline-none focus:border-emerald-500 ${
                            isLight ? 'bg-white text-gray-950 border-gray-300' : 'bg-black/60 text-white border-white/20'
                          }`}
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => saveEditing(goal.id)}
                          className={`p-1 hover:text-emerald-400 rounded ${isLight ? 'bg-black/5' : 'bg-white/5'}`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className={`p-1 hover:text-rose-400 rounded ${isLight ? 'bg-black/5' : 'bg-white/5'}`}
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
                            className="opacity-0 group-hover/lim:opacity-100 transition-opacity p-0.5"
                            title="Alterar Limite"
                          >
                            <Pencil className={`w-3 h-3 ${isLight ? 'text-gray-400 hover:text-gray-950' : 'text-gray-400 hover:text-white'}`} />
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

      {/* Planejado vs. Realizado detail chart (moved from Dashboard to avoid duplicating the same metric twice) */}
      <div className="glass-container rounded-xl p-6 text-left">
        <div className="mb-6">
          <h3 className={`text-xs uppercase font-bold tracking-widest flex items-center gap-2 ${isLight ? 'text-zinc-800' : 'text-[#F9FAFB]'}`}>
            <Activity className={`w-4 h-4 ${isLight ? 'text-zinc-700' : 'text-white/70'}`} />
            <span>Comparativa de Metas: Planejado vs. Realizado</span>
          </h3>
          <p className="text-[10px] text-gray-500 mt-1 font-mono">
            Visualização comparativa dos limites alocados em relação às despesas reais para cada categoria.
          </p>
        </div>

        <div className="h-80 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <ReChartsBarChart
              data={budgetComparisonData}
              margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'} />
              <XAxis
                dataKey="name"
                stroke="#71717a"
                fontSize={10}
                tickLine={false}
              />
              <YAxis
                stroke="#71717a"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `R$ ${value}`}
              />
              <Tooltip content={<BudgetTooltip />} cursor={{ fill: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)' }} />
              <Legend
                verticalAlign="top"
                height={36}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase' }}
              />
              <Bar
                name="Planejado"
                dataKey="Planejado"
                fill={isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.18)'}
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                name="Realizado"
                dataKey="Realizado"
                fill={isLight ? '#111111' : '#FFFFFF'}
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </ReChartsBarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* CTA linking to the full transaction ledger, instead of duplicating a short list of it here */}
      <button
        type="button"
        onClick={() => onNavigateToTab && onNavigateToTab('transactions')}
        className={`w-full glass-container rounded-xl p-5 flex items-center justify-between text-left transition-all duration-200 cursor-pointer ${
          isLight ? 'hover:border-black/15' : 'hover:border-white/10'
        }`}
      >
        <span className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-gray-950' : 'text-white'}`}>
          Ver todas as transações
        </span>
        <span className={`text-xs font-mono ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>→</span>
      </button>
    </div>
  );
}
