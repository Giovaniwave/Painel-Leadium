/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity, 
  PieChart, 
  ArrowUpRight, 
  ArrowDownLeft,
  Calendar,
  Pencil,
  Check,
  X,
  Plus,
  Download,
  Target,
  Eye,
  EyeOff
} from 'lucide-react';
import { Transaction, BudgetGoal } from '../types';
import AnimatedCounter from './AnimatedCounter';
import NeuralNetworkBackground from './NeuralNetworkBackground';
import { newestDateFirst } from '../utils/date';
import { generateMonthlyReportPDF } from '../utils/pdfGenerator';
import {
  LineChart as ReChartsLineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

interface DashboardViewProps {
  transactions: Transaction[];
  budgetGoals: BudgetGoal[];
  onOpenAddModal: () => void;
  onNavigateToTab: (tab: 'dashboard' | 'transactions' | 'budgeting') => void;
  onUpdateGoal?: (id: string, updates: Partial<BudgetGoal>) => void;
  theme?: 'dark' | 'light';
  revenueGoal: number;
  onUpdateRevenueGoal: (val: number) => void;
}

export default function DashboardView({ 
  transactions, 
  budgetGoals, 
  onOpenAddModal,
  onNavigateToTab,
  onUpdateGoal,
  theme = 'dark',
  revenueGoal,
  onUpdateRevenueGoal
}: DashboardViewProps) {

  const [hoveredCategory, setHoveredCategory] = useState<{ name: string; value: number; percentage: number } | null>(null);
  const [hoveredTrend, setHoveredTrend] = useState<{ month: string; income: number; expense: number } | null>(null);
  const [lineChartType, setLineChartType] = useState<'cumulative' | 'daily'>('cumulative');

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showMobileDates, setShowMobileDates] = useState(false);

  const [isEditingRevenue, setIsEditingRevenue] = useState(false);
  const [editingRevenueValue, setEditingRevenueValue] = useState(revenueGoal.toString());
  const [showValues, setShowValues] = useState(true);

  const setPresetRange = (preset: 'all' | 'this_month' | 'last_30' | 'this_year') => {
    const today = new Date();
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'this_month') {
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      setStartDate(`${year}-${month}-01`);
      
      const lastDay = new Date(year, today.getMonth() + 1, 0).getDate();
      setEndDate(`${year}-${month}-${String(lastDay).padStart(2, '0')}`);
    } else if (preset === 'last_30') {
      const past30 = new Date();
      past30.setDate(today.getDate() - 30);
      
      setStartDate(past30.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (preset === 'this_year') {
      const year = today.getFullYear();
      setStartDate(`${year}-01-01`);
      setEndDate(`${year}-12-31`);
    }
  };

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

  // Filtered transactions based on the selected date interval
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (!tx.date) return true;
      if (startDate && tx.date < startDate) return false;
      if (endDate && tx.date > endDate) return false;
      return true;
    });
  }, [transactions, startDate, endDate]);

  // Calculations for total numbers
  const { totalIncome, totalExpenses, netSavings } = useMemo(() => {
    let incomeSum = 0;
    let expenseSum = 0;
    
    filteredTransactions.forEach(tx => {
      if (tx.type === 'income') {
        incomeSum += tx.amount;
      } else {
        expenseSum += tx.amount;
      }
    });

    return {
      totalIncome: incomeSum,
      totalExpenses: expenseSum,
      netSavings: incomeSum - expenseSum
    };
  }, [filteredTransactions]);

  const percentageRevenueReached = useMemo(() => {
    if (revenueGoal === 0) return 0;
    return Math.min(100, Math.round((totalIncome / revenueGoal) * 100));
  }, [totalIncome, revenueGoal]);

  // Total allocated limit
  const totalAllocated = useMemo(() => {
    return budgetGoals.reduce((sum, g) => sum + g.allocated, 0);
  }, [budgetGoals]);

  // Compute dynamic trend dates list from actual manual transaction logs only
  const trendData = useMemo(() => {
    const PortugueseMonths = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const groups: Record<string, { monthLabel: string; income: number; expense: number; parsedDate: Date }> = {};
    
    filteredTransactions.forEach(tx => {
      if (!tx.date) return;
      const dateParts = tx.date.split('-');
      if (dateParts.length < 2) return;
      const year = parseInt(dateParts[0], 10);
      const monthIndex = parseInt(dateParts[1], 10) - 1; // 0-11
      if (isNaN(year) || isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) return;
      
      const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
      if (!groups[key]) {
        groups[key] = {
          monthLabel: `${PortugueseMonths[monthIndex]} ${String(year).slice(-2)}`,
          income: 0,
          expense: 0,
          parsedDate: new Date(year, monthIndex, 1)
        };
      }
      
      if (tx.type === 'income') {
        groups[key].income += tx.amount;
      } else {
        groups[key].expense += tx.amount;
      }
    });
    
    return Object.values(groups)
      .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime())
      .map(g => ({
        month: g.monthLabel,
        income: g.income,
        expense: g.expense
      }));
  }, [filteredTransactions]);

  const maxVal = useMemo(() => {
    if (trendData.length === 0) return 100;
    const values = trendData.flatMap(d => [d.income, d.expense]);
    return Math.max(...values, 100);
  }, [trendData]);

  // Calculations for category breakdowns for the chart representation
  const categoryChartData = useMemo(() => {
    const categories: Record<string, number> = {};
    let totalExps = 0;

    filteredTransactions
      .filter(tx => tx.type === 'expense')
      .forEach(tx => {
        categories[tx.category] = (categories[tx.category] || 0) + tx.amount;
        totalExps += tx.amount;
      });

    if (totalExps === 0) return [];

    return Object.entries(categories).map(([name, val]) => ({
      name,
      value: val,
      percentage: Math.min(100, Math.round((val / totalExps) * 100))
    })).sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  // Identify the current month and previous month for comparative line chart
  const { currentMonthKey, prevMonthKey, currentMonthLabel, prevMonthLabel } = useMemo(() => {
    const PortugueseMonths = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    
    // Find latest month with transactions as Mês Atual, or use real calendar month as fallback
    let latestKey = "";
    let latestDate = new Date(0);
    
    filteredTransactions.forEach(tx => {
      if (!tx.date) return;
      const d = new Date(tx.date);
      if (!isNaN(d.getTime()) && d.getTime() > latestDate.getTime()) {
        latestDate = d;
        const year = d.getFullYear();
        const month = d.getMonth() + 1;
        latestKey = `${year}-${String(month).padStart(2, '0')}`;
      }
    });

    if (!latestKey) {
      const today = new Date();
      latestKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    }

    // Previous month key
    const [yStr, mStr] = latestKey.split('-');
    let y = parseInt(yStr, 10);
    let m = parseInt(mStr, 10);
    
    let prevM = m - 1;
    let prevY = y;
    if (prevM === 0) {
      prevM = 12;
      prevY--;
    }
    const previousKey = `${prevY}-${String(prevM).padStart(2, '0')}`;

    const currentLabel = `${PortugueseMonths[m - 1]} ${y}`;
    const prevLabel = `${PortugueseMonths[prevM - 1]} ${prevY}`;

    return {
      currentMonthKey: latestKey,
      prevMonthKey: previousKey,
      currentMonthLabel: currentLabel,
      prevMonthLabel: prevLabel
    };
  }, [filteredTransactions]);

  const comparativeLineData = useMemo(() => {
    // We will generate data for days 1 to 31
    const daysData: any[] = [];
    
    // Sum up expenses per day of the month for current and previous month
    const currentDailySums = Array(32).fill(0);
    const prevDailySums = Array(32).fill(0);

    filteredTransactions.forEach(tx => {
      if (tx.type !== 'expense' || !tx.date) return;
      const dateParts = tx.date.split('-');
      if (dateParts.length < 3) return;
      const year = dateParts[0];
      const month = dateParts[1];
      const day = parseInt(dateParts[2], 10);
      if (isNaN(day) || day < 1 || day > 31) return;

      const key = `${year}-${month}`;
      if (key === currentMonthKey) {
        currentDailySums[day] += tx.amount;
      } else if (key === prevMonthKey) {
        prevDailySums[day] += tx.amount;
      }
    });

    // Check if the currentMonthKey is the actual calendar month to hide future days
    const today = new Date();
    const realYear = today.getFullYear();
    const realMonth = today.getMonth() + 1;
    const realDay = today.getDate();
    const realMonthKey = `${realYear}-${String(realMonth).padStart(2, '0')}`;
    const isCurrentRealMonth = currentMonthKey === realMonthKey;

    let currentAccum = 0;
    let prevAccum = 0;

    for (let day = 1; day <= 31; day++) {
      // For current month: only include up to today's date if it's the current real month
      const isFutureDayOfCurrentMonth = isCurrentRealMonth && day > realDay;

      currentAccum += currentDailySums[day];
      prevAccum += prevDailySums[day];

      const currentVal = isFutureDayOfCurrentMonth 
        ? undefined 
        : (lineChartType === 'cumulative' ? currentAccum : currentDailySums[day]);
        
      const prevVal = lineChartType === 'cumulative' ? prevAccum : prevDailySums[day];

      daysData.push({
        dayLabel: `Dia ${day}`,
        "Mês Atual": currentVal,
        "Mês Anterior": prevVal,
        dayNum: day
      });
    }

    return daysData;
  }, [filteredTransactions, currentMonthKey, prevMonthKey, lineChartType]);

  const formatCurrency = (val: number) => {
    if (!showValues) return 'R$ ••••••';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0
    }).format(val);
  };

  const LineTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-3 rounded-lg border shadow-xl font-mono text-xs ${
          theme === 'dark' 
            ? 'bg-[#18181B]/95 border-white/10 text-white' 
            : 'bg-white border-gray-200 text-zinc-900'
        }`}>
          <p className="font-bold mb-1.5 uppercase text-[10px] tracking-wider">{label}</p>
          <div className="space-y-1.5">
            {payload.map((p: any) => (
              <p key={p.name} className="flex justify-between gap-4">
                <span style={{ color: p.color || (p.name.includes('Atual') ? '#FFFFFF' : '#888') }}>{p.name}:</span>
                <span className="font-bold">
                  {p.value !== undefined ? formatCurrency(p.value) : 'Sem dados'}
                </span>
              </p>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');

  const startEditing = (e: React.MouseEvent, id: string, val: number) => {
    e.stopPropagation();
    setEditingGoalId(id);
    setEditingValue(val.toString());
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingGoalId(null);
    setEditingValue('');
  };

  const saveEditing = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const num = parseFloat(editingValue);
    if (!isNaN(num) && num >= 0 && onUpdateGoal) {
      onUpdateGoal(id, { allocated: num });
    }
    setEditingGoalId(null);
    setEditingValue('');
  };

  const kpiCards: Array<{
    key: string;
    order: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    iconClass?: string;
    valueNode: React.ReactNode;
    sublabel: string;
    subIcon?: React.ComponentType<{ className?: string }>;
    subIconClass?: string;
  }> = [
    {
      key: 'saldo',
      order: 'order-4 lg:order-1',
      label: 'Saldo Líquido',
      icon: DollarSign,
      valueNode: (
        <h3 className={`text-3xl font-serif italic font-light flex items-center overflow-hidden h-9 ${
          netSavings >= 0
            ? (theme === 'light' ? 'text-gray-950' : 'text-white')
            : (theme === 'light' ? 'text-rose-600' : 'text-rose-400')
        }`}>
          <AnimatePresence mode="popLayout">
            <motion.span
              key={netSavings}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="inline-block"
            >
              {netSavings < 0 ? '-' : ''}{formatCurrency(Math.abs(netSavings))}
            </motion.span>
          </AnimatePresence>
        </h3>
      ),
      sublabel: `${netSavings >= 0 ? 'Superávit acumulado' : 'Déficit registrado'} neste período`
    },
    {
      key: 'entradas',
      order: 'order-1 lg:order-2',
      label: 'Total de Entradas',
      icon: TrendingUp,
      iconClass: theme === 'light' ? 'text-emerald-600' : 'text-emerald-400/80',
      valueNode: (
        <h3 className={`text-3xl font-serif italic font-light ${theme === 'light' ? 'text-gray-950' : 'text-white'}`}>
          {formatCurrency(totalIncome)}
        </h3>
      ),
      sublabel: 'Receitas e faturamentos',
      subIcon: ArrowUpRight,
      subIconClass: theme === 'light' ? 'text-emerald-600' : 'text-emerald-400/80'
    },
    {
      key: 'saidas',
      order: 'order-2 lg:order-3',
      label: 'Total de Saídas',
      icon: TrendingDown,
      iconClass: theme === 'light' ? 'text-rose-600' : 'text-rose-400/80',
      valueNode: (
        <h3 className={`text-3xl font-serif italic font-light ${theme === 'light' ? 'text-gray-950' : 'text-white'}`}>
          {formatCurrency(totalExpenses)}
        </h3>
      ),
      sublabel: 'Despesas pagas',
      subIcon: ArrowDownLeft,
      subIconClass: theme === 'light' ? 'text-rose-600' : 'text-rose-400/80'
    },
    {
      key: 'limite',
      order: 'order-3 lg:order-4',
      label: 'Limite de Despesas',
      icon: Calendar,
      valueNode: (
        <h3 className={`text-3xl font-serif italic font-light ${theme === 'light' ? 'text-gray-950' : 'text-white'}`}>
          {formatCurrency(totalAllocated)}
        </h3>
      ),
      sublabel: 'Teto máximo delimitado',
      subIcon: Activity
    }
  ];


  return (
    <div className="dashboard-view space-y-8 py-2 animate-fadeIn">
      {/* Card 3: Faturamento vs Meta */}
      <div className={`dashboard-hero border rounded-3xl p-6 sm:p-8 relative overflow-hidden group transition-all duration-300 flex flex-col gap-6 ${
        theme === 'light'
          ? 'bg-white border-black/5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:border-black/10'
          : 'bg-black/90 border-white/5 shadow-[0_12px_40px_rgba(0,0,0,0.6)] hover:border-white/10'
      }`}>
        <div className="dashboard-neural-layer" aria-hidden="true">
          <NeuralNetworkBackground theme={theme} />
        </div>

        {/* Top Label with Small Action Buttons */}
        <div className="relative flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-2 z-10">
          <span className="text-[10px] uppercase tracking-[0.15em] font-extrabold text-gray-500 dark:text-gray-400">
            Faturamento vs Meta
          </span>
          <div className="flex items-center gap-2">
            {/* Filtrar Período Button (Icon Only) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMobileDates(!showMobileDates)}
                className={`p-1.5 rounded-lg transition-all cursor-pointer shadow-sm border flex items-center justify-center ${
                  theme === 'light'
                    ? 'bg-gray-100 border-black/10 hover:bg-gray-200 text-gray-900'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300'
                }`}
                title="Filtrar período"
              >
                <Calendar className="w-3.5 h-3.5" />
              </button>

              {/* Dropdown for dates when active - positioned right aligned */}
              {showMobileDates && (
                <div className="absolute right-0 mt-2 p-3 bg-white dark:bg-[#121212] border border-black/10 dark:border-white/10 rounded-xl shadow-2xl flex flex-col gap-2 z-50 animate-fadeIn min-w-[240px]">
                  <span className="text-[9px] uppercase font-bold tracking-wider text-gray-500">Customizar Intervalo</span>
                  <div className="flex flex-col gap-2">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-gray-50 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-lg px-2 py-1 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-white/60 w-full"
                    />
                    <span className="text-[9px] text-center text-gray-500 font-mono">até</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-gray-50 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-lg px-2 py-1 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-white/60 w-full"
                    />
                  </div>
                  <div className="border-t border-black/5 dark:border-white/5 my-1" />
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPresetRange('this_month')}
                      className="text-[9px] font-bold uppercase bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 py-1 rounded text-gray-900 dark:text-white"
                    >
                      Este Mês
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresetRange('last_30')}
                      className="text-[9px] font-bold uppercase bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 py-1 rounded text-gray-900 dark:text-white"
                    >
                      Últimos 30d
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresetRange('this_year')}
                      className="text-[9px] font-bold uppercase bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 py-1 rounded text-gray-900 dark:text-white"
                    >
                      Este Ano
                    </button>
                    <button
                      type="button"
                      onClick={() => { setStartDate(''); setEndDate(''); }}
                      className="text-[9px] font-bold uppercase bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 py-1 rounded text-gray-900 dark:text-white"
                    >
                      Limpar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Toggle: esconder/exibir valores */}
            <button
              type="button"
              onClick={() => setShowValues(v => !v)}
              className={`p-1.5 rounded-lg transition-all cursor-pointer shadow-sm border flex items-center justify-center ${
                theme === 'light'
                  ? 'bg-gray-100 border-black/10 hover:bg-gray-200 text-gray-900'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300'
              }`}
              title={showValues ? 'Ocultar valores' : 'Exibir valores'}
              aria-label={showValues ? 'Ocultar valores' : 'Exibir valores'}
            >
              {showValues ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>

            {/* Relatório Button (icon-only) */}
            <button
              type="button"
              onClick={() => generateMonthlyReportPDF({
                transactions: filteredTransactions,
                budgetGoals,
                revenueGoal,
                startDate,
                endDate
              })}
              className={`p-1.5 rounded-lg transition-all cursor-pointer shadow-sm border flex items-center justify-center ${
                theme === 'light'
                  ? 'bg-gray-100 border-black/10 hover:bg-gray-200 text-gray-900'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300'
              }`}
              title="Exportar relatório consolidado em PDF"
              aria-label="Exportar relatório consolidado em PDF"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Data core: a living matrix represents progress without a conventional chart. */}
        <div className="relative flex flex-col items-center gap-8 py-4 z-10">
          <div className="goal-iris" aria-label={`${Math.round(percentageRevenueReached)}% da meta de faturamento`}>
            <div className="goal-iris-halo" aria-hidden="true" />
            <div
              className="goal-orbital-progress"
              style={{ '--goal-progress': `${Math.min(Math.max(percentageRevenueReached, 0), 100) * 3.6}deg` } as React.CSSProperties}
              aria-hidden="true"
            />
            <div className="goal-orbital-field" aria-hidden="true">
              <span className="goal-orbital-track goal-orbital-track-a"><i /></span>
              <span className="goal-orbital-track goal-orbital-track-b"><i /></span>
              <span className="goal-orbital-track goal-orbital-track-c"><i /></span>
              <span className="goal-orbital-axis goal-orbital-axis-a" />
              <span className="goal-orbital-axis goal-orbital-axis-b" />
            </div>
            <div className="goal-iris-readout goal-brand-core goal-brand-core-minimal">
              <div className="goal-brand-pulses" aria-hidden="true"><i /><i /><i /></div>
              <div className="goal-brand-mark">
                <span className="goal-brand-glow" aria-hidden="true" />
                <img
                  src={theme === 'light'
                    ? 'https://i.ibb.co/M5kWMmTJ/logo-para-versao-white-removebg-preview.png'
                    : 'https://i.ibb.co/k245JhFM/logotipooficialleadium.png'}
                  alt="Leadium"
                  decoding="async"
                />
              </div>
            </div>
          </div>

          <div className="w-full grid grid-cols-2 gap-3 max-w-sm">
            {/* Faturamento */}
            <div className={`rounded-2xl border p-4 flex flex-col gap-1.5 ${
              theme === 'light' ? 'bg-gray-50 border-gray-200/80' : 'bg-white/[0.02] border-white/5'
            }`}>
              <span className={`text-[9px] uppercase tracking-[0.15em] font-bold flex items-center gap-1.5 ${
                theme === 'light' ? 'text-gray-500' : 'text-gray-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${theme === 'light' ? 'bg-gray-900' : 'bg-white'}`} />
                Faturamento
              </span>
              <span className={`text-lg sm:text-xl font-bold tracking-tight leading-none font-sans ${
                theme === 'light' ? 'text-gray-950' : 'text-white'
              }`}>
                {formatCurrency(totalIncome)}
              </span>
            </div>

            {/* Meta */}
            <div
              onClick={!isEditingRevenue ? startEditingRevenue : undefined}
              className={`rounded-2xl border p-4 flex flex-col gap-1.5 transition-all duration-300 ${
                theme === 'light' ? 'bg-gray-50 border-gray-200/80' : 'bg-white/[0.02] border-white/5'
              } ${!isEditingRevenue ? 'cursor-pointer hover:border-black/20 dark:hover:border-white/10' : ''}`}
            >
              <span className={`text-[9px] uppercase tracking-[0.15em] font-bold flex items-center gap-1.5 ${
                theme === 'light' ? 'text-gray-500' : 'text-gray-400'
              }`}>
                <Target className={`w-3 h-3 shrink-0 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`} />
                Meta
              </span>
              {isEditingRevenue ? (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="number"
                    value={editingRevenueValue}
                    onChange={e => setEditingRevenueValue(e.target.value)}
                    className={`border rounded-lg px-2 py-0.5 text-xs font-mono w-20 focus:outline-none focus:border-white/60 ${
                      theme === 'light' ? 'bg-white border-gray-300 text-gray-900' : 'bg-black/60 border-white/10 text-white'
                    }`}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={saveEditingRevenue}
                    className={`p-0.5 px-2 text-[8px] font-bold rounded transition-colors cursor-pointer ${
                      theme === 'light' ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-white text-black hover:bg-gray-200'
                    }`}
                  >
                    OK
                  </button>
                </div>
              ) : (
                <span className={`text-lg sm:text-xl font-bold tracking-tight leading-none font-sans truncate ${
                  theme === 'light' ? 'text-gray-950' : 'text-white'
                }`}>
                  {formatCurrency(revenueGoal)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Core Net stats grids */}
      <div className="dashboard-kpis grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          const SubIcon = card.subIcon;
          return (
            <div
              key={card.key}
              className={`metric-card-interactive glass-container p-5 border-l-2 text-left cursor-pointer ${card.order} ${
                theme === 'light' ? 'border-l-black/10' : 'border-l-white/20'
              }`}
              style={{
                '--card-highlight': theme === 'light' ? '#111111' : '#FFFFFF',
                '--card-glow': theme === 'light' ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.1)'
              } as React.CSSProperties}
            >
              <div className={`flex justify-between items-start mb-3 ${theme === 'light' ? 'text-gray-500' : 'text-[#999999]'}`}>
                <span className="text-[9px] uppercase font-bold tracking-[0.2em]">{card.label}</span>
                <Icon className={`w-4 h-4 ${card.iconClass || (theme === 'light' ? 'text-gray-900/50' : 'text-white/60')}`} />
              </div>
              {card.valueNode}
              <p className={`text-[9px] uppercase tracking-wider mt-2 flex items-center gap-1 font-mono ${theme === 'light' ? 'text-gray-500' : 'text-zinc-500'}`}>
                {SubIcon && <SubIcon className={`w-3 h-3 ${card.subIconClass || (theme === 'light' ? 'text-gray-900/50' : 'text-white/60')}`} />}
                <span>{card.sublabel}</span>
              </p>
            </div>
          );
        })}
      </div>

      <section className={`recent-transactions rounded-2xl border overflow-hidden ${theme === 'dark' ? 'bg-[#111114] border-white/10' : 'bg-white border-black/10'}`}>
        <div className={`flex items-center justify-between gap-4 px-5 py-4 border-b ${theme === 'dark' ? 'border-white/10' : 'border-black/10'}`}>
          <div>
            <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Transações recentes</h3>
            <p className={`text-[10px] mt-0.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>Todas as entradas e saídas registradas</p>
          </div>
          <button type="button" onClick={() => onNavigateToTab('transactions')} className={`text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${theme === 'dark' ? 'border-white/10 text-gray-300 hover:bg-white/5 hover:text-white' : 'border-black/10 text-gray-600 hover:bg-gray-50 hover:text-black'}`}>
            Ver transações
          </button>
        </div>

        <div className="max-h-[520px] overflow-y-auto">
          {filteredTransactions.length === 0 ? (
            <div className={`py-14 text-center text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>Nenhuma transação registrada neste período.</div>
          ) : (
            filteredTransactions
              .slice()
              .sort(newestDateFirst)
              .map((tx) => {
                const isIncome = tx.type === 'income';
                const date = tx.date ? new Date(`${tx.date.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR') : '--';
                return (
                  <button key={tx.id} type="button" onClick={() => onNavigateToTab('transactions')} className={`w-full grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[110px_minmax(0,1fr)_170px_auto] items-center gap-3 px-5 py-3.5 text-left border-b last:border-b-0 transition-colors ${theme === 'dark' ? 'border-white/5 hover:bg-white/[0.025]' : 'border-black/5 hover:bg-gray-50'}`}>
                    <span className={`hidden sm:block text-xs font-mono ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>{date}</span>
                    <span className="min-w-0">
                      <span className={`block text-xs font-medium truncate ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>{tx.description || 'Sem descrição'}</span>
                      <span className={`block text-[10px] mt-0.5 truncate ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>{tx.category} · {tx.account || 'Sem origem'}</span>
                    </span>
                    <span className={`hidden sm:inline-flex justify-self-start items-center px-2 py-1 rounded-full text-[9px] font-bold uppercase border ${isIncome ? (theme === 'dark' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-emerald-700 bg-emerald-50 border-emerald-200') : (theme === 'dark' ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-red-700 bg-red-50 border-red-200')}`}>{isIncome ? 'Entrada' : 'Saída'}</span>
                    <span className={`text-sm font-mono font-semibold whitespace-nowrap ${isIncome ? (theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700') : (theme === 'dark' ? 'text-red-400' : 'text-red-700')}`}>{isIncome ? '+' : '−'} {formatCurrency(tx.amount)}</span>
                  </button>
                );
              })
          )}
        </div>
      </section>

      {/* Charts section with dynamic layouts */}
      <div className="dashboard-insights hidden grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Dynamic Category Spending distribution custom chart graphic (LHS) */}
        <div className="lg:col-span-6 glass-container rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className={`text-xs uppercase font-bold tracking-widest flex items-center gap-2 text-left ${
              theme === 'dark' ? 'text-[#F9FAFB]' : 'text-zinc-800'
            }`}>
              <PieChart className={`w-4 h-4 ${theme === 'dark' ? 'text-white/70' : 'text-zinc-700'}`} />
              <span>Saídas por Categoria</span>
            </h3>
            <span className={`text-[10px] uppercase tracking-wider font-mono ${
              theme === 'dark' ? 'text-zinc-500' : 'text-zinc-600'
            }`}>
              Distribuição Relativa
            </span>
          </div>

          {categoryChartData.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-500 flex flex-col items-center justify-center h-64">
              <Activity className="w-8 h-8 mb-3 text-gray-600 animate-pulse" />
              <span>Não há dados de despesas registrados neste período.</span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-8 justify-around min-h-64">
              {/* Complex Responsive SVG Segment Donut representation */}
              <div className="relative w-40 h-40 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke={theme === 'dark' ? '#222222' : '#E5E7EB'}
                    strokeWidth="8"
                  />
                  {/* Category outline colors segments calculations */}
                  {categoryChartData.reduce((acc, cat, idx) => {
                    const strokeDash = 251.2; // 2 * pi * r (40)
                    const percentScaled = (cat.value / totalExpenses) * 100;
                    const strokeLength = (strokeDash * percentScaled) / 100;
                    const offset = strokeDash - strokeLength + acc.runningOffset;
                    
                    const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#a855f7', '#ef4444', '#06b6d4'];
                    const color = colors[idx % colors.length];

                    acc.elements.push(
                      <circle
                        key={cat.name}
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke={color}
                        strokeWidth="10"
                        strokeDasharray={`${strokeLength} ${strokeDash - strokeLength}`}
                        strokeDashoffset={-acc.runningOffset}
                        className="gauge-transition hover:stroke-[12px] cursor-help transition-all duration-150"
                        onMouseEnter={() => setHoveredCategory(cat)}
                        onMouseLeave={() => setHoveredCategory(null)}
                      />
                    );

                    acc.runningOffset -= strokeLength;
                    return acc;
                  }, { elements: [] as React.ReactNode[], runningOffset: 0 }).elements}
                </svg>
                
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 overflow-hidden">
                  <span className={`text-xl font-bold font-mono ${
                    theme === 'dark' ? 'text-white' : 'text-zinc-800'
                  }`}>
                    {hoveredCategory ? `${hoveredCategory.percentage}%` : `${categoryChartData[0]?.percentage || 0}%`}
                  </span>
                  <span className={`text-[8px] uppercase tracking-widest font-bold truncate max-w-[85px] block ${
                    theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'
                  }`}>
                    {hoveredCategory ? (hoveredCategory.name === 'Cafe & Restaurants' ? 'Restaurantes' : hoveredCategory.name === 'Groceries' ? 'Supermercado' : hoveredCategory.name === 'Money Transfer' ? 'Transf.' : hoveredCategory.name) : (categoryChartData[0]?.name === 'Cafe & Restaurants' ? 'Restaurantes' : categoryChartData[0]?.name === 'Groceries' ? 'Supermercado' : categoryChartData[0]?.name === 'Money Transfer' ? 'Transf.' : categoryChartData[0]?.name || 'Categorias')}
                  </span>
                  {hoveredCategory && (
                    <span className={`text-[9px] font-mono font-semibold block mt-0.5 ${
                      theme === 'dark' ? 'text-white/80' : 'text-zinc-700'
                    }`}>
                      {formatCurrency(hoveredCategory.value)}
                    </span>
                  )}
                </div>
              </div>

              {/* Categoric percentage side legend table lists */}
              <div className="flex-1 space-y-3.5 w-full">
                {categoryChartData.slice(0, 5).map((choice, idx) => {
                  const colors = ['bg-green-500', 'bg-blue-500', 'bg-amber-500', 'bg-purple-500', 'bg-red-500', 'bg-cyan-500'];
                  const colorDot = colors[idx % colors.length];
                  return (
                    <div key={choice.name} className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded ${colorDot}`}></span>
                        <span className={`font-medium truncate max-w-44 text-left ${
                          theme === 'dark' ? 'text-gray-300' : 'text-zinc-700'
                        }`}>
                          {choice.name === 'Cafe & Restaurants' ? 'Café e Restaurantes' : choice.name === 'Groceries' ? 'Supermercado' : choice.name === 'Money Transfer' ? 'Transferência' : choice.name}
                        </span>
                      </div>
                      <div className={`text-right font-mono ${
                        theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'
                      }`}>
                        <span className={`font-bold block ${
                          theme === 'dark' ? 'text-white' : 'text-zinc-800'
                        }`}>{formatCurrency(choice.value)}</span>
                        <span className="text-[10px]">{choice.percentage}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Expense tracker trend diagram (RHS) */}
        <div className="lg:col-span-6 glass-container rounded-xl p-6 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <h3 className={`text-xs uppercase font-bold tracking-widest flex items-center gap-2 text-left ${
              theme === 'dark' ? 'text-[#F9FAFB]' : 'text-zinc-800'
            }`}>
              <Activity className={`w-4 h-4 ${theme === 'dark' ? 'text-white/70' : 'text-zinc-700'}`} />
              <span>Tendências de Fluxo</span>
            </h3>
            {hoveredTrend ? (
              <span className={`text-[10px] font-mono font-bold ${
                theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'
              }`}>
                {hoveredTrend.month}: <span className={theme === 'dark' ? 'text-white' : 'text-zinc-950'}>+{formatCurrency(hoveredTrend.income)}</span> | <span className="text-zinc-500">-{formatCurrency(hoveredTrend.expense)}</span>
              </span>
            ) : (
              <span className={`text-[10px] uppercase font-bold font-mono ${
                theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'
              }`}>
                Entradas vs Saídas por Mês
              </span>
            )}
          </div>

          {trendData.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-center text-xs text-gray-500 font-mono">
              <Activity className="w-6 h-6 mb-2 text-gray-700" />
              <span>Nenhum dado real registrado.</span>
              <span className="text-[9px] text-[#666666] mt-1">Adicione lançamentos manuais para iniciar.</span>
            </div>
          ) : (
            /* Simple custom visual bar columns representing each month portion with non-clipped scroll container padded layout */
            <div className="flex justify-start gap-4 items-end h-48 px-2 mt-4 overflow-x-auto min-w-full pt-8">
              {trendData.map((d) => {
                const hInc = `${Math.min(100, Math.round((d.income / maxVal) * 100))}%`;
                const hExp = `${Math.min(100, Math.round((d.expense / maxVal) * 100))}%`;
                return (
                  <div 
                    key={d.month} 
                    className="flex flex-col items-center gap-2 group w-12 shrink-0 cursor-pointer"
                    onMouseEnter={() => setHoveredTrend(d)}
                    onMouseLeave={() => setHoveredTrend(null)}
                  >
                    <div className="flex gap-1.5 h-32 items-end w-full relative">
                      {/* Income Column */}
                      <div
                        style={{ height: hInc }}
                        className={`w-4 rounded-t transition-all relative ${
                          theme === 'dark' ? 'bg-white/70 hover:bg-white' : 'bg-zinc-900/70 hover:bg-zinc-900'
                        }`}
                        title={`Inflow ${d.month}: ${formatCurrency(d.income)}`}
                      >
                        <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block text-[10px] font-mono font-bold py-1 px-2 rounded-lg whitespace-nowrap z-20 shadow-md ${
                          theme === 'dark' 
                            ? 'bg-zinc-800 text-zinc-100 border border-zinc-750' 
                            : 'bg-white text-zinc-900 border border-zinc-200'
                        }`}>
                          +{formatCurrency(d.income)}
                        </div>
                      </div>
                      {/* Expense Column */}
                      <div
                        style={{ height: hExp }}
                        className={`w-4 rounded-t transition-all relative border ${
                          theme === 'dark'
                            ? 'bg-white/10 border-white/20 hover:bg-white/20'
                            : 'bg-zinc-900/10 border-zinc-900/20 hover:bg-zinc-900/20'
                        }`}
                        title={`Outflow ${d.month}: ${formatCurrency(d.expense)}`}
                      >
                        <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block text-[10px] font-mono font-bold py-1 px-2 rounded-lg whitespace-nowrap z-20 shadow-md ${
                          theme === 'dark' 
                            ? 'bg-zinc-800 text-zinc-100 border border-zinc-750' 
                            : 'bg-white text-zinc-900 border border-zinc-200'
                        }`}>
                          -{formatCurrency(d.expense)}
                        </div>
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono font-bold uppercase select-none ${
                      theme === 'dark' ? 'text-zinc-500' : 'text-zinc-600'
                    }`}>{d.month}</span>
                  </div>
                );
              })}
            </div>
          )}

          <div className={`flex gap-4 justify-center items-center text-[10px] tracking-widest uppercase font-bold mt-6 pt-4 border-t ${
            theme === 'dark' ? 'text-zinc-500 border-white/5' : 'text-zinc-600 border-black/5'
          }`}>
            <div className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-sm ${theme === 'dark' ? 'bg-white/70' : 'bg-zinc-900/70'}`}></span>
              <span>Entrada de Capital</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-sm border ${
                theme === 'dark' ? 'bg-white/10 border-white/20' : 'bg-zinc-900/10 border-zinc-900/20'
              }`}></span>
              <span>Saída de Capital</span>
            </div>
          </div>
        </div>

      </div>

      {/* Trend Analysis Comparative Line Chart (Recharts Line Chart) */}
      <div className="dashboard-comparison hidden glass-container rounded-xl p-6 text-left">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h3 className={`text-xs uppercase font-bold tracking-widest flex items-center gap-2 ${
              theme === 'dark' ? 'text-[#F9FAFB]' : 'text-zinc-800'
            }`}>
              <TrendingUp className={`w-4 h-4 ${theme === 'dark' ? 'text-white/70' : 'text-zinc-700'}`} />
              <span>Tendência de Consumo: {currentMonthLabel} vs. {prevMonthLabel}</span>
            </h3>
            <p className="text-[10px] text-gray-500 mt-1 font-mono">
              Comparação diária das despesas totais do mês atual em relação ao mês anterior.
            </p>
          </div>
          
          <div className="flex items-center gap-2 self-stretch sm:self-auto bg-white/5 p-1 rounded-lg border border-white/10" style={{ backgroundColor: theme !== 'dark' ? 'rgba(0,0,0,0.03)' : '', borderColor: theme !== 'dark' ? 'rgba(0,0,0,0.08)' : '' }}>
            <button
              type="button"
              onClick={() => setLineChartType('cumulative')}
              className={`px-3 py-1 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                lineChartType === 'cumulative'
                  ? (theme === 'dark' ? 'bg-white text-black font-black' : 'bg-zinc-900 text-white font-black')
                  : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Acumulado
            </button>
            <button
              type="button"
              onClick={() => setLineChartType('daily')}
              className={`px-3 py-1 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                lineChartType === 'daily'
                  ? (theme === 'dark' ? 'bg-white text-black font-black' : 'bg-zinc-900 text-white font-black')
                  : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Diário
            </button>
          </div>
        </div>

        <div className="h-80 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <ReChartsLineChart
              data={comparativeLineData}
              margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
              <XAxis 
                dataKey="dayLabel" 
                stroke={theme === 'dark' ? '#71717a' : '#71717a'} 
                fontSize={10}
                tickLine={false}
                tickFormatter={(value) => value.replace('Dia ', '')}
              />
              <YAxis 
                stroke={theme === 'dark' ? '#71717a' : '#71717a'} 
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `R$ ${value}`}
              />
              <Tooltip 
                content={<LineTooltip />} 
                cursor={{ stroke: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', strokeWidth: 1 }} 
              />
              <Legend 
                verticalAlign="top" 
                height={36} 
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase' }}
              />
              <Line
                name={`Mês Anterior (${prevMonthLabel})`}
                type="monotone"
                dataKey="Mês Anterior"
                stroke={theme === 'dark' ? '#52525b' : '#a1a1aa'}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                name={`Mês Atual (${currentMonthLabel})`}
                type="monotone"
                dataKey="Mês Atual"
                stroke={theme === 'dark' ? '#FFFFFF' : '#111111'}
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6 }}
              />
            </ReChartsLineChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
