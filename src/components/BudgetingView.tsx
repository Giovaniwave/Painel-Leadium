/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Activity,
  Pencil,
  Check,
  X,
  Calendar,
  Landmark,
  TrendingUp,
  TrendingDown,
  ArrowDownToLine,
  Clock,
  PiggyBank
} from 'lucide-react';
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
import { Transaction, BudgetGoal, Client, ActiveTab } from '../types';

interface BudgetingViewProps {
  transactions: Transaction[];
  onOpenAddModal: () => void;
  budgetGoals: BudgetGoal[];
  onUpdateGoal?: (id: string, updates: Partial<BudgetGoal>) => void;
  onNavigateToTab?: (tab: ActiveTab) => void;
  theme?: 'light' | 'dark';
  clients: Client[];
  revenueGoal: number;
  onUpdateRevenueGoal: (val: number) => void;
}

const PT_MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
const PT_MONTHS_SHORT = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

interface RevenueCategory {
  id: string;
  name: string;
  allocated: number;
}

// Default breakdown mirrors the three Leadium service lines (tráfego, social, CRM/automação)
const DEFAULT_REVENUE_CATEGORIES: RevenueCategory[] = [
  { id: 'trafego', name: 'Gestão de Tráfego', allocated: 10000 },
  { id: 'social', name: 'Social Media', allocated: 5000 },
  { id: 'crm', name: 'CRM & Automação', allocated: 3000 }
];

export default function BudgetingView({
  transactions,
  onOpenAddModal,
  budgetGoals,
  onUpdateGoal,
  onNavigateToTab,
  theme = 'dark',
  clients,
  revenueGoal,
  onUpdateRevenueGoal
}: BudgetingViewProps) {
  const isLight = theme === 'light';

  // Selected reference month for the whole view (defaults to the current calendar month)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const changeMonth = (delta: number) => {
    setSelectedMonth(prev => {
      let m = prev.month + delta;
      let y = prev.year;
      if (m < 0) { m = 11; y--; }
      if (m > 11) { m = 0; y++; }
      return { year: y, month: m };
    });
  };

  const monthKey = `${selectedMonth.year}-${String(selectedMonth.month + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(selectedMonth.year, selectedMonth.month + 1, 0).getDate();
  const periodStartLabel = `01/${String(selectedMonth.month + 1).padStart(2, '0')}/${selectedMonth.year}`;
  const periodEndLabel = `${String(daysInMonth).padStart(2, '0')}/${String(selectedMonth.month + 1).padStart(2, '0')}/${selectedMonth.year}`;

  // Revenue categories (Leadium service lines) — persisted locally, edited inline below
  const [revenueCategories, setRevenueCategories] = useState<RevenueCategory[]>(() => {
    try {
      const cached = localStorage.getItem('leadium_revenue_categories');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return DEFAULT_REVENUE_CATEGORIES;
  });

  useEffect(() => {
    localStorage.setItem('leadium_revenue_categories', JSON.stringify(revenueCategories));
  }, [revenueCategories]);

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
    if (!isNaN(num) && num >= 0) {
      setRevenueCategories(prev => prev.map(c => c.id === id ? { ...c, allocated: num } : c));
    }
    setEditingGoalId(null);
    setEditingValue('');
  };

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('Todas as Categorias');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('Todas as Transações');
  const [chartMode, setChartMode] = useState<'weekly' | 'category'>('weekly');

  // Transactions belonging to the selected reference month
  const periodTransactions = useMemo(() => {
    return transactions.filter(tx => tx.date && tx.date.startsWith(monthKey));
  }, [transactions, monthKey]);

  const filteredTransactions = useMemo(() => {
    return periodTransactions.filter(tx => {
      const matchCategory = selectedCategoryFilter === 'Todas as Categorias' || tx.category === selectedCategoryFilter;
      const matchType = selectedTypeFilter === 'Todas as Transações' ||
        (selectedTypeFilter === 'Income' && tx.type === 'income') ||
        (selectedTypeFilter === 'Expense' && tx.type === 'expense');
      return matchCategory && matchType;
    });
  }, [periodTransactions, selectedCategoryFilter, selectedTypeFilter]);

  // Resumo do Período — core financial figures for the selected month
  const faturamentoPrevisto = revenueGoal;

  const receitaPrevista = useMemo(() => {
    return clients
      .filter(c => c.status === 'active' && c.is_recurring)
      .reduce((sum, c) => sum + c.contract_value, 0);
  }, [clients]);

  const recebidoAteAgora = useMemo(() => {
    return filteredTransactions
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [filteredTransactions]);

  const aReceber = Math.max(0, receitaPrevista - recebidoAteAgora);

  const despesasPrevistas = useMemo(() => {
    return budgetGoals.reduce((sum, g) => sum + g.allocated, 0);
  }, [budgetGoals]);

  const lucroProjetado = receitaPrevista - despesasPrevistas;

  const pct = (num: number, den: number) => den > 0 ? Math.round((num / den) * 100) : 0;

  const receitaPct = pct(receitaPrevista, faturamentoPrevisto);
  const recebidoPct = pct(recebidoAteAgora, receitaPrevista);
  const aReceberPct = pct(aReceber, receitaPrevista);
  const despesasPct = pct(despesasPrevistas, receitaPrevista);
  const lucroPct = pct(lucroProjetado, receitaPrevista);

  const formatValue = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0
    }).format(val);
  };

  const [isEditingRevenue, setIsEditingRevenue] = useState(false);
  const [editingRevenueValue, setEditingRevenueValue] = useState(revenueGoal.toString());

  const startEditingRevenue = () => {
    setEditingRevenueValue(revenueGoal.toString());
    setIsEditingRevenue(true);
  };

  const saveEditingRevenue = () => {
    const num = parseFloat(editingRevenueValue);
    if (!isNaN(num) && num >= 0) {
      onUpdateRevenueGoal(num);
    }
    setIsEditingRevenue(false);
  };

  const statCards: Array<{
    key: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    iconClass: string;
    iconBgClass: string;
    value: number;
    sublabel: string;
    editable?: boolean;
  }> = [
    {
      key: 'faturamento',
      label: 'Faturamento Previsto',
      icon: Landmark,
      iconClass: isLight ? 'text-gray-900' : 'text-white',
      iconBgClass: isLight ? 'bg-gray-900/5' : 'bg-white/10',
      value: faturamentoPrevisto,
      sublabel: 'Meta mensal',
      editable: true
    },
    {
      key: 'receita',
      label: 'Receita Prevista',
      icon: TrendingUp,
      iconClass: isLight ? 'text-zinc-600' : 'text-zinc-400',
      iconBgClass: isLight ? 'bg-zinc-500/10' : 'bg-zinc-400/10',
      value: receitaPrevista,
      sublabel: `${receitaPct}% da meta`
    },
    {
      key: 'recebido',
      label: 'Recebido até Agora',
      icon: ArrowDownToLine,
      iconClass: isLight ? 'text-zinc-600' : 'text-zinc-400',
      iconBgClass: isLight ? 'bg-zinc-500/10' : 'bg-zinc-400/10',
      value: recebidoAteAgora,
      sublabel: `${recebidoPct}% da meta`
    },
    {
      key: 'a_receber',
      label: 'A Receber',
      icon: Clock,
      iconClass: isLight ? 'text-zinc-600' : 'text-zinc-400',
      iconBgClass: isLight ? 'bg-zinc-500/10' : 'bg-zinc-400/10',
      value: aReceber,
      sublabel: `${aReceberPct}% da meta`
    },
    {
      key: 'despesas',
      label: 'Despesas Previstas',
      icon: TrendingDown,
      iconClass: isLight ? 'text-zinc-600' : 'text-zinc-400',
      iconBgClass: isLight ? 'bg-zinc-500/10' : 'bg-zinc-400/10',
      value: despesasPrevistas,
      sublabel: `${despesasPct}% da receita`
    },
    {
      key: 'lucro',
      label: 'Lucro Projetado',
      icon: PiggyBank,
      iconClass: isLight ? 'text-zinc-600' : 'text-zinc-400',
      iconBgClass: isLight ? 'bg-zinc-500/10' : 'bg-zinc-400/10',
      value: lucroProjetado,
      sublabel: `${lucroPct}% de margem`
    }
  ];

  // Weekly split of the selected month, used by the "Semanal" chart mode
  const weeksInPeriod = useMemo(() => {
    const weeks: Array<{ label: string; start: number; end: number }> = [];
    let day = 1;
    let weekNum = 1;
    while (day <= daysInMonth) {
      const end = Math.min(day + 6, daysInMonth);
      weeks.push({ label: `Semana ${weekNum}`, start: day, end });
      day = end + 1;
      weekNum++;
    }
    return weeks;
  }, [daysInMonth]);

  const weeklyComparisonData = useMemo(() => {
    const numWeeks = weeksInPeriod.length || 1;
    const planejadoPerWeek = receitaPrevista / numWeeks;
    return weeksInPeriod.map(w => {
      const realizado = filteredTransactions
        .filter(tx => tx.type === 'income')
        .filter(tx => {
          const parts = tx.date.split('-');
          const d = parseInt(parts[2], 10);
          return d >= w.start && d <= w.end;
        })
        .reduce((sum, tx) => sum + tx.amount, 0);
      return { name: w.label, Planejado: Math.round(planejadoPerWeek), Realizado: realizado };
    });
  }, [weeksInPeriod, filteredTransactions, receitaPrevista]);

  // Planejado vs. Realizado per budget goal (expense discipline view)
  const categoryComparisonData = useMemo(() => {
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

  const chartData = chartMode === 'weekly' ? weeklyComparisonData : categoryComparisonData;

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
              <span className={`font-bold ${payload[1].value > payload[0].value ? 'text-zinc-500 font-black' : (isLight ? 'text-zinc-600' : 'text-zinc-300')}`}>
                {formatValue(payload[1].value)}
              </span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Visão do Mês — collection progress against the operative revenue target (Receita Prevista)
  const percentRecebido = receitaPrevista > 0 ? Math.min(100, Math.round((recebidoAteAgora / receitaPrevista) * 100)) : 0;
  const gaugeRadius = 70;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;

  // Detalhamento por categoria — receita prevista/recebida por linha de serviço, com ritmo esperado no mês
  const expectedCollectionPct = useMemo(() => {
    const today = new Date();
    const firstOfSelected = new Date(selectedMonth.year, selectedMonth.month, 1);
    const firstOfCurrent = new Date(today.getFullYear(), today.getMonth(), 1);
    if (firstOfSelected < firstOfCurrent) return 100;
    if (firstOfSelected > firstOfCurrent) return 0;
    return Math.round((today.getDate() / daysInMonth) * 100);
  }, [selectedMonth, daysInMonth]);

  const categoryDetails = useMemo(() => {
    return revenueCategories.map(cat => {
      // Receita prevista da categoria é o próprio alvo definido — ainda não há atribuição de contrato por linha de serviço
      const receita = cat.allocated;
      const recebido = filteredTransactions
        .filter(tx => tx.type === 'income' && tx.category === cat.name)
        .reduce((sum, tx) => sum + tx.amount, 0);
      const aReceberCat = Math.max(0, receita - recebido);
      const percent = receita > 0 ? Math.round((recebido / receita) * 100) : 0;
      const status: 'ok' | 'warn' = receita > 0 && percent < expectedCollectionPct ? 'warn' : 'ok';
      return { ...cat, receita, recebido, aReceber: aReceberCat, percent, status };
    });
  }, [revenueCategories, filteredTransactions, expectedCollectionPct]);

  const statusLabel: Record<string, string> = {
    ok: 'Dentro do previsto',
    warn: 'Atenção'
  };

  const statusClass = (status: string) => {
    if (status === 'over') return isLight ? 'bg-zinc-500/10 text-zinc-600' : 'bg-zinc-500/15 text-zinc-400';
    if (status === 'warn') return isLight ? 'bg-zinc-500/10 text-zinc-600' : 'bg-zinc-500/15 text-zinc-400';
    return isLight ? 'bg-zinc-500/10 text-zinc-600' : 'bg-zinc-500/15 text-zinc-400';
  };

  const cardClass = isLight
    ? 'bg-white border border-gray-200/80 rounded-2xl'
    : 'bg-white/[0.02] border border-white/5 rounded-2xl';

  const selectClass = `w-full border rounded-xl py-3 px-4 text-xs tracking-wider appearance-none focus:outline-none transition-colors cursor-pointer ${
    isLight
      ? 'bg-white border-gray-200/80 text-gray-950 focus:border-black/30'
      : 'bg-[#141414] border-white/10 text-white focus:border-white/40'
  }`;

  return (
    <div className="space-y-8 py-4 animate-fadeIn">
      {/* Month Header & Period Summary */}
      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-6 gap-4 ${
        isLight ? 'border-black/10' : 'border-white/10'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`shrink-0 flex flex-col items-center justify-center rounded-xl w-14 h-14 border ${
            isLight ? 'bg-gray-900 border-gray-900 text-white keep-white' : 'bg-white border-white text-black'
          }`}>
            <span className="text-[9px] font-bold uppercase tracking-wider leading-none">{PT_MONTHS_SHORT[selectedMonth.month]}</span>
            <span className="text-sm font-extrabold leading-tight mt-1">{selectedMonth.year}</span>
          </div>
          <div>
            <h2 className={`text-2xl sm:text-3xl font-light tracking-tight ${isLight ? 'text-gray-950' : 'text-white'}`}>
              {PT_MONTHS[selectedMonth.month]} de {selectedMonth.year}
            </h2>
            <p className={`text-[11px] mt-1 ${isLight ? 'text-gray-500' : 'text-[#999999]'}`}>
              Período de {periodStartLabel} até {periodEndLabel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 relative">
          <button
            id="btn-add-manual-transaction"
            onClick={onOpenAddModal}
            className={`px-5 py-2.5 font-medium rounded-lg transition-colors cursor-pointer text-xs uppercase tracking-wider ${
              isLight
                ? 'bg-black text-white keep-white hover:bg-gray-800'
                : 'bg-white text-black hover:bg-gray-200'
            }`}
          >
            Adicionar
          </button>
          <button
            type="button"
            onClick={() => setShowMonthPicker(v => !v)}
            className={`flex items-center gap-2 px-5 py-2.5 font-medium rounded-lg transition-colors cursor-pointer text-xs uppercase tracking-wider border ${
              isLight
                ? 'bg-white border-gray-200/80 text-gray-900 hover:bg-gray-50'
                : 'bg-[#141414] border-white/10 text-white hover:bg-white/5'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Alterar Mês
          </button>

          {showMonthPicker && (
            <div className={`absolute right-0 top-full mt-2 p-3 rounded-xl border shadow-2xl z-50 flex items-center gap-3 animate-fadeIn ${
              isLight ? 'bg-white border-gray-200' : 'bg-[#141414] border-white/10'
            }`}>
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isLight ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-white/10 text-gray-300'}`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className={`text-xs font-bold uppercase tracking-wider whitespace-nowrap ${isLight ? 'text-gray-900' : 'text-white'}`}>
                {PT_MONTHS[selectedMonth.month]} {selectedMonth.year}
              </span>
              <button
                type="button"
                onClick={() => changeMonth(1)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isLight ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-white/10 text-gray-300'}`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filters Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1.5 text-left">
          <label className={`text-[9px] uppercase tracking-[0.2em] font-bold block ${isLight ? 'text-gray-500' : 'text-[#999999]'}`}>
            Visualizar Por
          </label>
          <div className="relative group">
            <select
              id="filter-category-select"
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className={selectClass}
            >
              <option value="Todas as Categorias">Todas as Categorias</option>
              <option value="Gestão de Tráfego">Gestão de Tráfego</option>
              <option value="Social Media">Social Media</option>
              <option value="CRM & Automação">CRM & Automação</option>
              <option value="Custo Mensal">Custo Mensal</option>
              <option value="Salários">Salários (Contas/Equipe)</option>
              <option value="Investimentos">Investimentos</option>
              <option value="Emergências">Emergências</option>
              <option value="Despesa Variável">Despesa Variável</option>
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

        <div className="space-y-1.5 text-left">
          <label className={`text-[9px] uppercase tracking-[0.2em] font-bold block ${isLight ? 'text-gray-500' : 'text-[#999999]'}`}>
            Filtro
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

      {/* Resumo do Período */}
      <div className="space-y-4 text-left">
        <h3 className={`text-xs font-bold uppercase tracking-[0.2em] ${isLight ? 'text-gray-950' : 'text-white'}`}>
          Resumo do Período
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map(card => {
            const Icon = card.icon;
            return (
              <div key={card.key} className={`${cardClass} p-4 flex flex-col gap-2`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.iconBgClass}`}>
                  <Icon className={`w-4 h-4 ${card.iconClass}`} />
                </div>
                <span className={`text-[9px] uppercase tracking-wider font-bold ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>
                  {card.label}
                </span>
                {card.editable && isEditingRevenue ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={editingRevenueValue}
                      onChange={e => setEditingRevenueValue(e.target.value)}
                      className={`w-20 border rounded px-1.5 py-0.5 text-sm font-mono focus:outline-none focus:border-zinc-500 ${
                        isLight ? 'bg-white text-gray-950 border-gray-300' : 'bg-black/60 text-white border-white/20'
                      }`}
                      autoFocus
                    />
                    <button type="button" onClick={saveEditingRevenue} className={`p-1 rounded hover:text-zinc-400 ${isLight ? 'bg-black/5' : 'bg-white/5'}`}>
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => setIsEditingRevenue(false)} className={`p-1 rounded hover:text-zinc-400 ${isLight ? 'bg-black/5' : 'bg-white/5'}`}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 group/stat">
                    <span className={`text-lg font-bold tracking-tight ${isLight ? 'text-gray-950' : 'text-white'}`}>
                      {formatValue(card.value)}
                    </span>
                    {card.editable && (
                      <button
                        type="button"
                        onClick={startEditingRevenue}
                        className="opacity-0 group-hover/stat:opacity-100 transition-opacity p-0.5"
                        title="Alterar meta mensal"
                      >
                        <Pencil className={`w-3 h-3 ${isLight ? 'text-gray-400 hover:text-gray-950' : 'text-gray-400 hover:text-white'}`} />
                      </button>
                    )}
                  </div>
                )}
                <span className={`text-[10px] ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>
                  {card.sublabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comparativo de Metas + Visão do Mês */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className={`lg:col-span-8 ${cardClass} p-6 text-left`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h3 className={`text-xs uppercase font-bold tracking-widest flex items-center gap-2 ${isLight ? 'text-zinc-800' : 'text-[#F9FAFB]'}`}>
                <Activity className={`w-4 h-4 ${isLight ? 'text-zinc-700' : 'text-white/70'}`} />
                <span>Comparativo de Metas: Planejado vs. Realizado</span>
              </h3>
              <p className="text-[10px] text-gray-500 mt-1 font-mono">
                {chartMode === 'weekly'
                  ? 'Evolução do faturamento previsto vs. recebido no período selecionado'
                  : 'Limites alocados em relação às despesas reais para cada categoria'}
              </p>
            </div>
            <div className="relative group shrink-0">
              <select
                value={chartMode}
                onChange={(e) => setChartMode(e.target.value as 'weekly' | 'category')}
                className={`text-[10px] uppercase font-bold tracking-wider rounded-lg py-2 pl-3 pr-8 appearance-none focus:outline-none cursor-pointer border ${
                  isLight ? 'bg-white border-gray-200 text-gray-900' : 'bg-white/5 border-white/10 text-white'
                }`}
              >
                <option value="weekly">Semanal</option>
                <option value="category">Por Categoria</option>
              </select>
              <ChevronDown className={`w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                isLight ? 'text-gray-400' : 'text-gray-400'
              }`} />
            </div>
          </div>

          <div className="h-80 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ReChartsBarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={10} tickLine={false} />
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

        {/* Visão do Mês */}
        <div className={`lg:col-span-4 ${cardClass} p-6 flex flex-col`}>
          <h3 className={`text-xs uppercase font-bold tracking-widest mb-4 ${isLight ? 'text-zinc-800' : 'text-[#F9FAFB]'}`}>
            Visão do Mês
          </h3>

          <div className="relative w-40 h-40 mx-auto shrink-0">
            <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
              <circle
                cx="80" cy="80" r={gaugeRadius}
                fill="none"
                strokeWidth="12"
                className={isLight ? 'stroke-gray-100' : 'stroke-white/[0.06]'}
              />
              <circle
                cx="80" cy="80" r={gaugeRadius}
                fill="none"
                strokeWidth="12"
                strokeLinecap="round"
                stroke="url(#gaugePurpleGradient)"
                strokeDasharray={gaugeCircumference}
                strokeDashoffset={gaugeCircumference * (1 - percentRecebido / 100)}
                className="gauge-transition"
              />
              <defs>
                <linearGradient id="gaugePurpleGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="100%" stopColor="#8A8A8A" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-extrabold tracking-tighter leading-none ${isLight ? 'text-gray-950' : 'text-white'}`}>
                {percentRecebido}%
              </span>
              <span className={`text-[9px] uppercase tracking-[0.2em] font-bold mt-2 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                da meta recebida
              </span>
            </div>
          </div>

          <div className={`mt-6 space-y-3 border-t pt-4 ${isLight ? 'border-black/5' : 'border-white/5'}`}>
            <div className="flex justify-between items-center text-xs">
              <span className={isLight ? 'text-gray-500' : 'text-gray-500'}>Meta mensal</span>
              <span className={`font-bold ${isLight ? 'text-gray-950' : 'text-white'}`}>{formatValue(receitaPrevista)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className={isLight ? 'text-gray-500' : 'text-gray-500'}>Recebido até agora</span>
              <span className={`font-bold ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>{formatValue(recebidoAteAgora)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className={isLight ? 'text-gray-500' : 'text-gray-500'}>Faltam receber</span>
              <span className={`font-bold ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>{formatValue(aReceber)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateToTab && onNavigateToTab('transactions')}
            className={`mt-6 w-full py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2 ${
              isLight ? 'bg-gray-900 text-white keep-white hover:bg-gray-800' : 'bg-white text-black hover:bg-gray-200'
            }`}
          >
            Ver Detalhes Completos
          </button>
        </div>
      </div>

      {/* Detalhamento por Categoria */}
      <div className={`${cardClass} p-6 text-left`}>
        <div className="mb-5">
          <h3 className={`text-xs uppercase font-bold tracking-widest ${isLight ? 'text-zinc-800' : 'text-[#F9FAFB]'}`}>
            Detalhamento por Categoria
          </h3>
          <p className="text-[10px] text-gray-500 mt-1 font-mono">
            Desempenho de cada linha de serviço no período selecionado
          </p>
        </div>

        <div className="overflow-x-auto -mx-2">
          <table className="w-full min-w-[720px] text-left border-collapse">
            <thead>
              <tr className={`text-[9px] uppercase tracking-wider font-bold ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>
                <th className="px-2 py-2 font-bold">Categoria</th>
                <th className="px-2 py-2 font-bold text-right">Meta (R$)</th>
                <th className="px-2 py-2 font-bold text-right">Receita (R$)</th>
                <th className="px-2 py-2 font-bold text-right">Recebido (R$)</th>
                <th className="px-2 py-2 font-bold text-right">A Receber (R$)</th>
                <th className="px-2 py-2 font-bold">% Recebido</th>
                <th className="px-2 py-2 font-bold">Situação</th>
              </tr>
            </thead>
            <tbody>
              {categoryDetails.map((row, idx) => {
                const dotColors = isLight
                  ? ['bg-zinc-600', 'bg-zinc-600', 'bg-zinc-600', 'bg-zinc-600']
                  : ['bg-zinc-500', 'bg-zinc-500', 'bg-zinc-500', 'bg-zinc-500'];
                const barColors = dotColors;
                const dotColor = dotColors[idx % dotColors.length];
                const barColor = barColors[idx % barColors.length];
                return (
                  <tr key={row.id} className={`border-t text-xs ${isLight ? 'border-black/5' : 'border-white/5'}`}>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                        <span className={`font-medium ${isLight ? 'text-gray-900' : 'text-gray-200'}`}>{row.name}</span>
                      </div>
                    </td>
                    <td className={`px-2 py-3 text-right font-mono ${isLight ? 'text-gray-900' : 'text-gray-200'}`}>
                      {editingGoalId === row.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            value={editingValue}
                            onChange={e => setEditingValue(e.target.value)}
                            className={`w-20 border rounded px-1.5 py-0.5 text-xs font-mono focus:outline-none focus:border-zinc-500 ${
                              isLight ? 'bg-white text-gray-950 border-gray-300' : 'bg-black/60 text-white border-white/20'
                            }`}
                            autoFocus
                          />
                          <button type="button" onClick={() => saveEditing(row.id)} className={`p-1 rounded hover:text-zinc-400 ${isLight ? 'bg-black/5' : 'bg-white/5'}`}>
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={cancelEditing} className={`p-1 rounded hover:text-zinc-400 ${isLight ? 'bg-black/5' : 'bg-white/5'}`}>
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1 group/lim">
                          <span>{formatValue(row.allocated)}</span>
                          <button
                            type="button"
                            onClick={() => startEditing(row.id, row.allocated)}
                            className="opacity-0 group-hover/lim:opacity-100 transition-opacity p-0.5"
                            title="Alterar meta da categoria"
                          >
                            <Pencil className={`w-3 h-3 ${isLight ? 'text-gray-400 hover:text-gray-950' : 'text-gray-400 hover:text-white'}`} />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className={`px-2 py-3 text-right font-mono ${isLight ? 'text-gray-900' : 'text-gray-200'}`}>
                      {formatValue(row.receita)}
                    </td>
                    <td className={`px-2 py-3 text-right font-mono ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>
                      {formatValue(row.recebido)}
                    </td>
                    <td className={`px-2 py-3 text-right font-mono ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>
                      {formatValue(row.aReceber)}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-20 h-1.5 rounded-full overflow-hidden ${isLight ? 'bg-gray-100' : 'bg-white/10'}`}>
                          <div className={`h-full ${barColor}`} style={{ width: `${Math.min(100, row.percent)}%` }} />
                        </div>
                        <span className={`font-mono text-[10px] ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{row.percent}%</span>
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <span className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider whitespace-nowrap ${statusClass(row.status)}`}>
                        {statusLabel[row.status]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CTA linking to the full transaction ledger */}
      <button
        type="button"
        onClick={() => onNavigateToTab && onNavigateToTab('transactions')}
        className={`w-full ${cardClass} p-5 flex items-center justify-between text-left transition-all duration-200 cursor-pointer ${
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
