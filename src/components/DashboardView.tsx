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
  Target
} from 'lucide-react';
import { Transaction, BudgetGoal } from '../types';
import AnimatedCounter from './AnimatedCounter';
import { generateMonthlyReportPDF } from '../utils/pdfGenerator';
import { 
  BarChart as ReChartsBarChart, 
  Bar, 
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

  const remainingRevenueGoal = useMemo(() => {
    return Math.max(0, revenueGoal - totalIncome);
  }, [totalIncome, revenueGoal]);

  const percentageTrend = useMemo(() => {
    // Get income from past 30 days and compare to the 30 days before that
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(today.getDate() - 60);

    let recentIncome = 0;
    let priorIncome = 0;

    transactions.forEach(tx => {
      if (tx.type !== 'income' || !tx.date) return;
      if (tx.date >= thirtyDaysAgo.toISOString().split('T')[0] && tx.date <= today.toISOString().split('T')[0]) {
        recentIncome += tx.amount;
      } else if (tx.date >= sixtyDaysAgo.toISOString().split('T')[0] && tx.date < thirtyDaysAgo.toISOString().split('T')[0]) {
        priorIncome += tx.amount;
      }
    });

    if (priorIncome === 0) return 12; // fallback placeholder matching the mockup photo exactly!
    const change = ((recentIncome - priorIncome) / priorIncome) * 100;
    return Math.round(change);
  }, [transactions]);

  // Total allocated limit
  const totalAllocated = useMemo(() => {
    return budgetGoals.reduce((sum, g) => sum + g.allocated, 0);
  }, [budgetGoals]);

  const futureProjections = useMemo(() => {
    const recurringTxs = transactions.filter(t => t.isRecurring && t.nextOccurrenceDate);
    const today = new Date();
    const futureLimit = new Date();
    futureLimit.setDate(today.getDate() + 90);

    const projections: Array<{
      date: string;
      description: string;
      sender: string;
      type: 'income' | 'expense';
      category: string;
      amount: number;
    }> = [];

    recurringTxs.forEach(tx => {
      if (!tx.nextOccurrenceDate) return;
      let occurrenceDate = new Date(tx.nextOccurrenceDate + 'T12:00:00');
      
      for (let i = 0; i < 12; i++) {
        if (occurrenceDate > futureLimit) break;
        
        projections.push({
          date: occurrenceDate.toISOString().substring(0, 10),
          description: tx.description,
          sender: tx.sender,
          type: tx.type,
          category: tx.category,
          amount: tx.amount
        });

        if (tx.frequency === 'weekly') {
          occurrenceDate.setDate(occurrenceDate.getDate() + 7);
        } else if (tx.frequency === 'monthly') {
          occurrenceDate.setMonth(occurrenceDate.getMonth() + 1);
        } else if (tx.frequency === 'quarterly') {
          occurrenceDate.setMonth(occurrenceDate.getMonth() + 3);
        } else {
          break;
        }
      }
    });

    projections.sort((a, b) => a.date.localeCompare(b.date));

    let upcomingIncome = 0;
    let upcomingExpense = 0;
    projections.forEach(p => {
      if (p.type === 'income') {
        upcomingIncome += p.amount;
      } else {
        upcomingExpense += p.amount;
      }
    });

    return {
      list: projections,
      upcomingIncome,
      upcomingExpense,
      projectedNet: upcomingIncome - upcomingExpense
    };
  }, [transactions]);

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
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0
    }).format(val);
  };

  const rechartsData = useMemo(() => {
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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-3 rounded-lg border shadow-xl font-mono text-xs ${
          theme === 'dark' 
            ? 'bg-[#18181B]/95 border-white/10 text-white' 
            : 'bg-white border-gray-200 text-zinc-900'
        }`}>
          <p className="font-bold mb-1.5 uppercase text-[10px] tracking-wider">{label}</p>
          <div className="space-y-1">
            <p className="flex justify-between gap-4">
              <span className="text-blue-400">Planejado:</span>
              <span className="font-bold">{formatCurrency(payload[0].value)}</span>
            </p>
            <p className="flex justify-between gap-4">
              <span className="text-[#FF4D00]">Realizado:</span>
              <span className={`font-bold ${payload[1].value > payload[0].value ? 'text-rose-500 font-black' : 'text-emerald-400'}`}>
                {formatCurrency(payload[1].value)}
              </span>
            </p>
          </div>
        </div>
      );
    }
    return null;
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
                <span style={{ color: p.color || (p.name.includes('Atual') ? '#FF4D00' : '#888') }}>{p.name}:</span>
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

  return (
    <div className="space-y-10 py-4 animate-fadeIn">
      {/* Card 3: Progresso de Vendas with Nested Stats */}
      <div className="bg-[#121212]/90 border border-white/5 rounded-3xl p-6 sm:p-8 relative overflow-hidden group hover:border-white/10 transition-all duration-300 shadow-[0_12px_40px_rgba(0,0,0,0.6)] flex flex-col gap-6">
        {/* Curved decorative background lines matching the mockup */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M-50 150 C 100 120, 200 250, 450 170" stroke={theme === 'light' ? "rgba(0, 0, 0, 0.04)" : "rgba(255, 255, 255, 0.15)"} strokeWidth="1" />
            <path d="M-50 170 C 120 140, 180 270, 450 190" stroke={theme === 'light' ? "rgba(0, 0, 0, 0.03)" : "rgba(255, 255, 255, 0.1)"} strokeWidth="1" />
            <path d="M-50 130 C 80 100, 220 230, 450 150" stroke={theme === 'light' ? "rgba(0, 0, 0, 0.02)" : "rgba(255, 255, 255, 0.05)"} strokeWidth="1" />
          </svg>
        </div>

        {/* Top Label with Small Action Buttons */}
        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-2 z-10">
          <span className="text-[10px] uppercase tracking-[0.15em] font-extrabold text-gray-500 dark:text-gray-400">
            Progresso de Vendas
          </span>
          <div className="flex items-center gap-2">
            {/* Filtrar Período Button (Icon Only) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMobileDates(!showMobileDates)}
                className="p-1.5 bg-gray-100 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg text-gray-900 dark:text-gray-300 transition-all cursor-pointer shadow-sm dark:shadow-none flex items-center justify-center"
                title="Filtrar período"
              >
                <Calendar className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
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
                      className="bg-gray-50 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-lg px-2 py-1 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#FF4D00] w-full"
                    />
                    <span className="text-[9px] text-center text-gray-500 font-mono">até</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-gray-50 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-lg px-2 py-1 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#FF4D00] w-full"
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

            {/* Relatório Button (Small version) */}
            <button
              type="button"
              onClick={() => generateMonthlyReportPDF({
                transactions: filteredTransactions,
                budgetGoals,
                revenueGoal,
                startDate,
                endDate
              })}
              className="flex items-center gap-1 px-2 py-1.5 bg-black dark:bg-white text-white dark:text-black hover:bg-black/90 dark:hover:bg-white/90 rounded-lg text-[9px] font-bold transition-all cursor-pointer shadow-sm border border-transparent dark:border-white/10"
              title="Exportar relatório consolidado em PDF"
            >
              <Download className="w-3 h-3 animate-pulse shrink-0" />
              <span>RELATÓRIO</span>
            </button>
          </div>
        </div>

        {/* Clean layout merging Faturamento Realizado & Meta Objetiva de Vendas at the top of the gauge */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 z-10">
          {/* Block 1: Faturamento Realizado */}
          <div className={`border rounded-2xl p-4 flex items-center justify-between relative overflow-hidden transition-all duration-300 ${
            theme === 'light' 
              ? 'bg-gray-50 border-gray-200/80' 
              : 'bg-white/[0.02] border-white/5'
          }`}>
            <div className="flex items-center gap-4">
              {/* Icon Container */}
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center relative shrink-0 border ${
                theme === 'light' 
                  ? 'bg-gray-200/60 border-gray-300/50' 
                  : 'bg-white/[0.04] border-white/5'
              }`}>
                <span className={`absolute top-1 left-1 w-1.5 h-1.5 rounded-full ${
                  theme === 'light' ? 'bg-gray-800' : 'bg-white'
                }`}></span>
                <TrendingUp className={`w-5 h-5 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`} />
              </div>
              <div className="text-left">
                <span className={`text-[9px] uppercase tracking-[0.15em] font-bold block mb-0.5 ${
                  theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  Faturamento
                </span>
                <h2 className={`text-lg sm:text-xl font-bold tracking-tight leading-none font-sans ${
                  theme === 'light' ? 'text-gray-950' : 'text-white'
                }`}>
                  {formatCurrency(totalIncome)}
                </h2>
              </div>
            </div>
            <div className="text-right flex flex-col items-end shrink-0 pl-2">
              <span className={`text-[9px] font-bold px-2 py-1 rounded-full border ${
                theme === 'light' 
                  ? 'bg-gray-100 border-gray-300 text-gray-900' 
                  : 'bg-white/[0.06] border-white/5 text-white/90'
              }`}>
                {percentageTrend >= 0 ? `+${percentageTrend}%` : `${percentageTrend}%`}
              </span>
              <span className={`text-[8px] mt-1 block tracking-tight font-medium ${
                theme === 'light' ? 'text-gray-600' : 'text-gray-500'
              }`}>
                vs período anterior
              </span>
            </div>
          </div>

          {/* Block 2: Meta Objetiva de Vendas */}
          <div 
            onClick={!isEditingRevenue ? startEditingRevenue : undefined}
            className={`border rounded-2xl p-4 flex items-center justify-between relative overflow-hidden transition-all duration-300 ${
              theme === 'light' 
                ? 'bg-gray-50 border-gray-200/80' 
                : 'bg-white/[0.02] border-white/5'
            } ${
              !isEditingRevenue ? 'cursor-pointer hover:border-black/20 dark:hover:border-white/10' : ''
            }`}
          >
            <div className="flex items-center gap-4 min-w-0 flex-1">
              {/* Icon Container */}
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center relative shrink-0 border ${
                theme === 'light' 
                  ? 'bg-gray-200/60 border-gray-300/50' 
                  : 'bg-white/[0.04] border-white/5'
              }`}>
                <span className={`absolute top-1 left-1 w-1.5 h-1.5 rounded-full ${
                  theme === 'light' ? 'bg-gray-800' : 'bg-white'
                }`}></span>
                <Target className={`w-5 h-5 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`} />
              </div>
              <div className="text-left min-w-0 flex-1">
                <span className={`text-[9px] uppercase tracking-[0.15em] font-bold block mb-0.5 ${
                  theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  Meta de Vendas
                </span>
                {isEditingRevenue ? (
                  <div className="flex items-center gap-1 pt-0.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="number"
                      value={editingRevenueValue}
                      onChange={e => setEditingRevenueValue(e.target.value)}
                      className={`border rounded-lg px-2 py-0.5 text-xs font-mono w-20 focus:outline-none focus:border-[#FF4D00] ${
                        theme === 'light' 
                          ? 'bg-white border-gray-300 text-gray-900' 
                          : 'bg-black/60 border-white/10 text-white'
                      }`}
                      autoFocus
                    />
                    <button 
                      type="button"
                      onClick={saveEditingRevenue}
                      className={`p-0.5 px-2 text-[8px] font-bold rounded transition-colors cursor-pointer ${
                        theme === 'light'
                          ? 'bg-gray-900 text-white hover:bg-gray-800'
                          : 'bg-white text-black hover:bg-gray-200'
                      }`}
                    >
                      OK
                    </button>
                  </div>
                ) : (
                  <h2 className={`text-lg sm:text-xl font-bold tracking-tight leading-none font-sans truncate ${
                    theme === 'light' ? 'text-gray-950' : 'text-white'
                  }`}>
                    {formatCurrency(revenueGoal)}
                  </h2>
                )}
              </div>
            </div>
            <div className="text-right flex flex-col items-end shrink-0 pl-2">
              <span className={`text-[9px] font-bold px-2 py-1 rounded-full border ${
                theme === 'light' 
                  ? 'bg-gray-100 border-gray-300 text-gray-900' 
                  : 'bg-white/[0.06] border-white/5 text-white/90'
              }`}>
                {percentageRevenueReached}%
              </span>
              <span className={`text-[8px] mt-1 block tracking-tight font-medium ${
                theme === 'light' ? 'text-gray-600' : 'text-gray-500'
              }`}>
                da meta atingida
              </span>
            </div>
          </div>
        </div>

        {/* Circular gauge exactly like the mockup */}
        <div className="relative flex flex-col items-center justify-center py-4 z-10">
          <div className="relative w-44 h-44 flex items-center justify-center">
            {/* Outer high-tech rotating tick ring */}
            <motion.svg 
              className="w-44 h-44 absolute pointer-events-none"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 40, ease: "linear" }}
            >
              <circle
                cx="88"
                cy="88"
                r="82"
                fill="none"
                stroke={theme === 'light' ? 'rgba(255, 77, 0, 0.12)' : 'rgba(255, 77, 0, 0.15)'}
                strokeWidth="1.5"
                strokeDasharray="4 8"
              />
            </motion.svg>

            {/* Tachometer style tick marks behind the progress */}
            <svg className="w-44 h-44 absolute pointer-events-none">
              <circle
                cx="88"
                cy="88"
                r="76"
                fill="none"
                stroke={theme === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)'}
                strokeWidth="2.5"
                strokeDasharray="1 5"
              />
            </svg>

            {/* Ring Background Shadow / Central Sphere */}
            <div className={`absolute inset-2 rounded-full border shadow-[inset_0_2px_4px_rgba(0,0,0,0.03),0_10px_30px_rgba(0,0,0,0.05)] transition-all duration-300 ${
              theme === 'light'
                ? 'bg-gradient-to-b from-white to-gray-50/95 border-gray-200/80'
                : 'bg-gradient-to-b from-[#161618] to-[#0A0A0B] border-white/5'
            }`}></div>

            {/* SVG Circular Progress */}
            <svg className="w-44 h-44 absolute transform -rotate-90">
              <defs>
                <linearGradient id="circleProgressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  {theme === 'light' ? (
                    <>
                      <stop offset="0%" stopColor="#E03E00" />
                      <stop offset="100%" stopColor="#FF6A00" />
                    </>
                  ) : (
                    <>
                      <stop offset="0%" stopColor="#FF4D00" />
                      <stop offset="100%" stopColor="#FF9F00" />
                    </>
                  )}
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              {/* Background thin circle */}
              <circle
                cx="88"
                cy="88"
                r="70"
                fill="none"
                stroke={theme === 'light' ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.04)'}
                strokeWidth="6"
              />
              {/* Active animated indicator path with rounded ends */}
              <motion.circle
                cx="88"
                cy="88"
                r="70"
                fill="none"
                stroke="url(#circleProgressGradient)"
                strokeWidth="8"
                strokeDasharray="439.8"
                initial={{ strokeDashoffset: 439.8 }}
                animate={{ strokeDashoffset: 439.8 - (439.8 * Math.min(percentageRevenueReached, 100)) / 100 }}
                transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                strokeLinecap="round"
                filter={theme === 'light' ? undefined : 'url(#glow)'}
              />
            </svg>

            {/* Inner Content matching mockup */}
            <div className="text-center z-10 flex flex-col items-center justify-center">
              {/* Dynamic live status pulsing dot */}
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  percentageRevenueReached >= 100 
                    ? 'bg-emerald-500 animate-pulse' 
                    : 'bg-[#FF4D00] animate-pulse'
                }`} />
                <span className={`text-[8px] uppercase tracking-wider font-extrabold font-mono ${
                  theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  Progresso
                </span>
              </div>

              <span className={`text-4xl font-extrabold font-sans tracking-tighter leading-none ${
                theme === 'light' ? 'text-gray-950' : 'text-white'
              }`}>
                {percentageRevenueReached}%
              </span>

              <span className={`text-[9px] uppercase tracking-[0.2em] font-bold mt-2.5 block px-3 py-1 rounded-full ${
                theme === 'light' 
                  ? 'text-gray-800 bg-gray-100 border border-gray-200/85 shadow-sm' 
                  : 'text-gray-200 bg-white/5 border border-white/5 shadow-inner'
              }`}>
                Concluído
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Core Net stats grids */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-4 sm:mt-6 lg:mt-12">
        
        {/* Total Net Balance Card */}
        <div 
          className="metric-card-interactive glass-container p-5 border-l-2 border-l-emerald-500 shadow-lg text-left cursor-pointer order-4 lg:order-1"
          style={{ 
            '--card-highlight': '#10B981', 
            '--card-glow': 'rgba(16, 185, 129, 0.15)' 
          } as React.CSSProperties}
        >
          <div className="flex justify-between items-start text-[#999999] mb-3">
            <span className="text-[9px] uppercase font-bold tracking-[0.2em]">Saldo Líquido</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <h3 className={`text-3xl font-serif italic font-light ${netSavings >= 0 ? 'text-white' : 'text-rose-400'} flex items-center overflow-hidden h-9`}>
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
          <p className="text-[9px] uppercase tracking-wider text-[#666666] mt-2 font-mono">
            {netSavings >= 0 ? 'Superávit acumulado' : 'Déficit registrado'} neste período
          </p>
        </div>

        {/* Total Income Card */}
        <div 
          className="metric-card-interactive glass-container p-5 border-l-2 border-l-emerald-500 shadow-lg text-left cursor-pointer order-1 lg:order-2"
          style={{ 
            '--card-highlight': '#10B981', 
            '--card-glow': 'rgba(16, 185, 129, 0.15)' 
          } as React.CSSProperties}
        >
          <div className="flex justify-between items-start text-[#999999] mb-3">
            <span className="text-[9px] uppercase font-bold tracking-[0.2em]">Total de Entradas</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <h3 className="text-3xl font-serif italic font-light text-white">
            {formatCurrency(totalIncome)}
          </h3>
          <p className="text-[9px] uppercase tracking-wider text-emerald-400 mt-2 flex items-center gap-1 font-mono">
            <ArrowUpRight className="w-3 h-3" />
            <span>Receitas e faturamentos</span>
          </p>
        </div>

        {/* Total Expenses Card */}
        <div 
          className="metric-card-interactive glass-container p-5 border-l-2 border-l-rose-500 shadow-lg text-left cursor-pointer order-2 lg:order-3"
          style={{ 
            '--card-highlight': '#F43F5E', 
            '--card-glow': 'rgba(244, 63, 94, 0.15)' 
          } as React.CSSProperties}
        >
          <div className="flex justify-between items-start text-[#999999] mb-3">
            <span className="text-[9px] uppercase font-bold tracking-[0.2em]">Total de Saídas</span>
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <h3 className="text-3xl font-serif italic font-light text-white">
            {formatCurrency(totalExpenses)}
          </h3>
          <p className="text-[9px] uppercase tracking-wider text-rose-400 mt-2 flex items-center gap-1 font-mono">
            <ArrowDownLeft className="w-3 h-3" />
            <span>Despesas pagas</span>
          </p>
        </div>

        {/* Dedicated Monthly Plan KPI Card */}
        <div 
          className="metric-card-interactive glass-container p-5 border-l-2 border-l-blue-500 shadow-lg text-left cursor-pointer order-3 lg:order-4"
          style={{ 
            '--card-highlight': '#3B82F6', 
            '--card-glow': 'rgba(59, 130, 246, 0.15)' 
          } as React.CSSProperties}
        >
          <div className="flex justify-between items-start text-[#999999] mb-3">
            <span className="text-[9px] uppercase font-bold tracking-[0.2em]">Limite de Despesas</span>
            <Calendar className="w-4 h-4 text-blue-400" />
          </div>
          <h3 className="text-3xl font-serif italic font-light text-white">
            {formatCurrency(totalAllocated)}
          </h3>
          <p className="text-[9px] uppercase tracking-wider text-blue-400 mt-2 flex items-center gap-1 font-mono">
            <Activity className="w-3 h-3" />
            <span>Teto máximo delimitado</span>
          </p>
        </div>

      </div>

      {/* Real-time Budget Goals Progress Bars */}
      <div className="space-y-4 text-left">
        <div className="flex justify-between items-center">
          <h3 className={`text-xs uppercase font-bold tracking-widest flex items-center gap-2 ${
            theme === 'dark' ? 'text-[#F9FAFB]' : 'text-zinc-800'
          }`}>
            <Activity className="w-4 h-4 text-[#FF4D00]" />
            <span>Progresso das Metas Orçamentárias</span>
          </h3>
          <button
            type="button"
            onClick={() => onNavigateToTab('budgeting')}
            className="text-[10px] font-mono font-bold uppercase text-[#FF4D00] hover:underline cursor-pointer bg-transparent border-0"
          >
            Ajustar Alocações →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {budgetGoals.map((goal, idx) => {
            const spent = filteredTransactions
              .filter(tx => tx.type === 'expense' && tx.category === goal.name)
              .reduce((sum, tx) => sum + tx.amount, 0);
            
            const percent = goal.allocated > 0 ? Math.round((spent / goal.allocated) * 100) : 0;
            const cappedPercent = Math.min(100, percent);
            
            let barColor = 'bg-[#10B981]'; // Green default
            let textColor = 'text-emerald-400';
            if (percent > 100) {
              barColor = 'bg-rose-500';
              textColor = 'text-rose-400';
            } else if (percent > 80) {
              barColor = 'bg-amber-500';
              textColor = 'text-amber-400';
            }

            return (
              <div 
                key={goal.id} 
                className="glass-container rounded-xl p-5 flex flex-col justify-between hover:border-white/10 transition-all duration-300 relative overflow-hidden"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className={`text-[10px] uppercase font-bold tracking-wider truncate max-w-[120px] ${
                      theme === 'dark' ? 'text-gray-400' : 'text-zinc-600'
                    }`} title={goal.name}>
                      {goal.name}
                    </span>
                    <span className={`text-[11px] font-mono font-black ${textColor}`}>
                      <AnimatedCounter value={percent} formatter={(val) => `${Math.round(val)}%`} />
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {/* Progress Bar */}
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden relative border border-white/5">
                      <div 
                        className={`h-full ${barColor} rounded-full transition-all duration-500`}
                        style={{ width: `${cappedPercent}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between items-baseline pt-1">
                      <span className={`text-sm font-mono font-bold ${
                        theme === 'dark' ? 'text-white' : 'text-zinc-900'
                      }`}>
                        <AnimatedCounter value={spent} formatter={formatCurrency} />
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono">
                        limite {formatCurrency(goal.allocated)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>


      {/* Charts section with dynamic layouts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Dynamic Category Spending distribution custom chart graphic (LHS) */}
        <div className="lg:col-span-6 glass-container rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className={`text-xs uppercase font-bold tracking-widest flex items-center gap-2 text-left ${
              theme === 'dark' ? 'text-[#F9FAFB]' : 'text-zinc-800'
            }`}>
              <PieChart className="w-4 h-4 text-[#B43C00]" />
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
                    
                    const colors = ['#B43C00', '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', '#737373'];
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
                        strokeDasharray={strokeDash}
                        strokeDashoffset={offset}
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
                    <span className="text-[9px] font-mono text-emerald-500 font-semibold block mt-0.5">
                      {formatCurrency(hoveredCategory.value)}
                    </span>
                  )}
                </div>
              </div>

              {/* Categoric percentage side legend table lists */}
              <div className="flex-1 space-y-3.5 w-full">
                {categoryChartData.slice(0, 5).map((choice, idx) => {
                  const colors = ['bg-[#B43C00]', 'bg-[#10B981]', 'bg-[#3B82F6]', 'bg-[#8B5CF6]', 'bg-[#F59E0B]', 'bg-[#737373]'];
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
              <Activity className="w-4 h-4 text-[#B43C00] animate-pulse" />
              <span>Tendências de Fluxo</span>
            </h3>
            {hoveredTrend ? (
              <span className={`text-[10px] font-mono font-bold ${
                theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'
              }`}>
                {hoveredTrend.month}: <span className="text-emerald-500">+{formatCurrency(hoveredTrend.income)}</span> | <span className="text-rose-400">-{formatCurrency(hoveredTrend.expense)}</span>
              </span>
            ) : (
              <span className={`text-[10px] uppercase font-bold font-mono ${
                theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
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
                        className="bg-emerald-500/20 hover:bg-emerald-500/40 w-4 rounded-t transition-all relative"
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
                        className="bg-[#B43C00]/40 hover:bg-[#B43C00] w-4 rounded-t transition-all relative"
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
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/30"></span>
              <span>Entrada de Capital</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#B43C00]/40"></span>
              <span>Saída de Capital</span>
            </div>
          </div>
        </div>

      </div>

      {/* Trend Analysis Comparative Line Chart (Recharts Line Chart) */}
      <div className="glass-container rounded-xl p-6 text-left mt-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h3 className={`text-xs uppercase font-bold tracking-widest flex items-center gap-2 ${
              theme === 'dark' ? 'text-[#F9FAFB]' : 'text-zinc-800'
            }`}>
              <TrendingUp className="w-4 h-4 text-[#FF4D00]" />
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
                  ? 'bg-[#FF4D00] text-black font-black'
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
                  ? 'bg-[#FF4D00] text-black font-black'
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
                stroke={theme === 'dark' ? '#71717a' : '#a1a1aa'} 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line 
                name={`Mês Atual (${currentMonthLabel})`}
                type="monotone"
                dataKey="Mês Atual" 
                stroke="#FF4D00" 
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6 }}
              />
            </ReChartsLineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Comparative Budget Goals and Spent (Recharts Bar Chart) */}
      <div className="glass-container rounded-xl p-6 text-left mt-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
          <div>
            <h3 className={`text-xs uppercase font-bold tracking-widest flex items-center gap-2 ${
              theme === 'dark' ? 'text-[#F9FAFB]' : 'text-zinc-800'
            }`}>
              <Activity className="w-4 h-4 text-[#FF4D00]" />
              <span>Comparativa de Metas: Planejado vs. Realizado</span>
            </h3>
            <p className="text-[10px] text-gray-500 mt-1 font-mono">
              Visualização comparativa dos limites alocados em relação às despesas reais para cada categoria.
            </p>
          </div>
          <span className={`text-[10px] uppercase tracking-wider font-mono px-2.5 py-1 rounded-md bg-white/5 border border-white/10 ${
            theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'
          }`}>
            Recharts Ativo
          </span>
        </div>

        <div className="h-80 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <ReChartsBarChart
              data={rechartsData}
              margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
              <XAxis 
                dataKey="name" 
                stroke={theme === 'dark' ? '#71717a' : '#71717a'} 
                fontSize={10}
                tickLine={false}
              />
              <YAxis 
                stroke={theme === 'dark' ? '#71717a' : '#71717a'} 
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `R$ ${value}`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }} />
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
                fill={theme === 'dark' ? '#3B82F6' : '#2563EB'} 
                radius={[4, 4, 0, 0]} 
                maxBarSize={40}
              />
              <Bar 
                name="Realizado"
                dataKey="Realizado" 
                fill="#FF4D00" 
                radius={[4, 4, 0, 0]} 
                maxBarSize={40}
              />
            </ReChartsBarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
