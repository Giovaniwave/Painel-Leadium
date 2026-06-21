/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
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
  Plus
} from 'lucide-react';
import { Transaction, BudgetGoal } from '../types';

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

  // Calculations for total numbers
  const { totalIncome, totalExpenses, netSavings } = useMemo(() => {
    let incomeSum = 0;
    let expenseSum = 0;
    
    transactions.forEach(tx => {
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
  }, [transactions]);

  const percentageRevenueReached = useMemo(() => {
    if (revenueGoal === 0) return 0;
    return Math.min(100, Math.round((totalIncome / revenueGoal) * 100));
  }, [totalIncome, revenueGoal]);

  const remainingRevenueGoal = useMemo(() => {
    return Math.max(0, revenueGoal - totalIncome);
  }, [totalIncome, revenueGoal]);

  // Total allocated limit
  const totalAllocated = useMemo(() => {
    return budgetGoals.reduce((sum, g) => sum + g.allocated, 0);
  }, [budgetGoals]);

  // Compute dynamic trend dates list from actual manual transaction logs only
  const trendData = useMemo(() => {
    const PortugueseMonths = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const groups: Record<string, { monthLabel: string; income: number; expense: number; parsedDate: Date }> = {};
    
    transactions.forEach(tx => {
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
  }, [transactions]);

  const maxVal = useMemo(() => {
    if (trendData.length === 0) return 100;
    const values = trendData.flatMap(d => [d.income, d.expense]);
    return Math.max(...values, 100);
  }, [trendData]);

  // Calculations for category breakdowns for the chart representation
  const categoryChartData = useMemo(() => {
    const categories: Record<string, number> = {};
    let totalExps = 0;

    transactions
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
  }, [transactions]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0
    }).format(val);
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
      {/* Objetivo de Faturamento (Billing Goal) Spotlight Card */}
      <div className="glass-container px-6 pt-6 pb-6 sm:p-8 flex flex-col md:flex-row gap-4 md:gap-8 justify-between relative overflow-hidden group hover:border-[#FF4D00]/25 transition-all duration-300 mb-4 sm:mb-0">
        {/* Animated decorative corner aura */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-radial from-[#FF4D00]/5 to-transparent rounded-full opacity-60 pointer-events-none"></div>
        
        <div className="flex-1 space-y-3 sm:space-y-6 z-10 text-left">
          <h3 className="text-[10px] uppercase tracking-[0.25em] font-bold text-[#999999] flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[#FF4D00] rounded-full animate-pulse"></span>
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-1 sm:pt-2">
            {/* Realized Billing Column */}
            <div className="space-y-1 sm:space-y-2 border-l border-[#FF4D00]/10 pl-3">
              <span className="text-[10px] uppercase tracking-[0.14em] font-bold text-gray-500 block">
                Faturamento Realizado
              </span>
              <div className="text-2xl sm:text-4xl font-mono font-black text-emerald-500 tracking-tight transition-all">
                {formatCurrency(totalIncome)}
              </div>
              <span className="text-[9px] text-gray-500 block font-sans">
              </span>
            </div>
            {/* Target Goal Column */}
            <div className="space-y-1 sm:space-y-2 relative group/meta border-l-2 border-[#FF4D00] bg-[#FF4D00]/5 rounded-r-xl p-3 pl-4">
              <span className="text-[10px] uppercase tracking-[0.14em] font-bold text-gray-400 block">
                Meta Objetiva de Vendas
              </span>
              {isEditingRevenue ? (
                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="number"
                    value={editingRevenueValue}
                    onChange={e => setEditingRevenueValue(e.target.value)}
                    className={`bg-black/60 border rounded-lg px-2.5 py-1 text-xs font-mono w-32 focus:outline-none focus:border-[#FF4D00] ${
                      theme === 'dark' ? 'text-white border-white/20' : 'text-black border-black/20'
                    }`}
                    autoFocus
                  />
                  <button 
                    type="button"
                    onClick={saveEditingRevenue}
                    className="p-1 px-3 bg-[#FF4D00] text-white hover:bg-[#e04500] text-[10px] font-bold rounded-md transition-colors cursor-pointer"
                  >
                    Confirmar
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsEditingRevenue(false)}
                    className="p-1 px-2 text-gray-400 hover:text-white text-[10px] transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className="flex items-baseline gap-2 pt-0.5">
                  <span className="text-2xl sm:text-4xl font-mono font-black text-[#FF4D00] tracking-tight">
                    {formatCurrency(revenueGoal)}
                  </span>
                  <button
                    type="button"
                    onClick={startEditingRevenue}
                    className="opacity-100 md:opacity-0 group-hover/meta:opacity-100 p-1 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-md transition-all cursor-pointer"
                    title="Definir nova meta de faturamento"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
              )}
              <span className="text-[9px] text-[#FF4D00] block font-sans">
              </span>
            </div>
          </div>

          {/* Action buttons inside the Objetivo de Faturamento block (Visible ONLY on Desktop, below the columns) */}
          <div className="hidden md:flex gap-3 pt-4 border-t border-white/5 mt-6">
            <button
              type="button"
              onClick={() => onNavigateToTab('budgeting')}
              className={`flex items-center justify-center px-4 py-2 font-medium rounded-lg transition-all cursor-pointer text-xs uppercase tracking-wider ${
                theme === 'light'
                  ? 'bg-black text-white keep-white hover:bg-gray-800 shadow'
                  : 'bg-white text-black hover:bg-gray-200 shadow'
              }`}
            >
              Carteira
            </button>
            <button
              type="button"
              onClick={onOpenAddModal}
              className={`flex items-center justify-center px-4 py-2 font-medium rounded-lg transition-all cursor-pointer text-xs uppercase tracking-wider ${
                theme === 'light'
                  ? 'bg-black text-white keep-white hover:bg-gray-800 shadow'
                  : 'bg-white text-black hover:bg-gray-200 shadow'
              }`}
            >
              Lançamento
            </button>
          </div>
        </div>

        {/* SVG Gauge Implementation: Center/Right Align */}
        <div className="relative flex flex-col items-center justify-center pt-2 md:pt-0 z-10 shrink-0 w-full md:w-auto">
          {/* Label explaining graph above the gauge */}
          <span className="text-[9px] uppercase tracking-[0.15em] font-bold text-gray-500 mb-1.5 md:mb-3 block text-center">
            Progresso de Vendas
          </span>

          <div className="relative w-72 h-[135px] sm:w-60 sm:h-[120px] overflow-hidden flex justify-center scale-115 sm:scale-100 transition-all pt-1">
            {/* SVG Background Path arc */}
            <svg className="w-56 h-56 absolute transform -rotate-180">
              <defs>
                <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#FF4D00" />
                  <stop offset="100%" stopColor="#FFA000" />
                </linearGradient>
              </defs>
              <circle
                cx="112"
                cy="112"
                r="90"
                fill="none"
                stroke={theme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)'}
                strokeWidth="12"
                strokeDasharray="283 283"
              />
              {/* SVG Active Fill path */}
              <circle
                cx="112"
                cy="112"
                r="90"
                fill="none"
                stroke="url(#gaugeGradient)"
                strokeWidth="12"
                strokeDasharray="283 283"
                strokeDashoffset={283 - (283 * Math.min(percentageRevenueReached, 100)) / 100}
                className="gauge-transition"
                strokeLinecap="round"
              />
            </svg>
            
            <div className="absolute top-[52px] text-center">
              <span className={`text-4xl sm:text-5xl font-extrabold font-mono tracking-tighter ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {percentageRevenueReached}%
              </span>
              <p className="text-[9px] uppercase tracking-widest text-[#999999] font-bold mt-1">Concluído</p>
            </div>
          </div>

          {/* Micro display info of actual sums */}
          <div className="text-[11px] text-gray-400 mt-4 text-center flex gap-3 font-mono justify-center items-center">
            <span className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'} font-extrabold`}>
              {formatCurrency(totalIncome)} faturados
            </span>
            <span className="text-gray-600">|</span>
            <span className="text-gray-400">
              {remainingRevenueGoal > 0 ? `Falta ${formatCurrency(remainingRevenueGoal)}` : 'Meta superada! 🎉'}
            </span>
          </div>

          {/* Mobile Action Buttons: Rendered strictly BELOW the gauge on smartphone screens */}
          <div className="flex md:hidden gap-3 pt-12 border-t border-white/5 mt-12 w-full">
            <button
              type="button"
              onClick={() => onNavigateToTab('budgeting')}
              className={`flex-1 flex items-center justify-center px-4 py-3 font-light rounded-lg transition-all cursor-pointer text-xs uppercase tracking-widest ${
                theme === 'light'
                  ? 'bg-black text-[#FFFFFF] hover:bg-gray-800'
                  : 'bg-white text-black hover:bg-gray-200'
              }`}
              style={theme === 'light' ? { color: '#FFFFFF', fontWeight: 200 } : { fontWeight: 200 }}
            >
              Carteira
            </button>
            <button
              type="button"
              onClick={onOpenAddModal}
              className={`flex-1 flex items-center justify-center px-4 py-3 font-light rounded-lg transition-all cursor-pointer text-xs uppercase tracking-widest ${
                theme === 'light'
                  ? 'bg-black text-[#FFFFFF] hover:bg-gray-800'
                  : 'bg-white text-black hover:bg-gray-200'
              }`}
              style={theme === 'light' ? { color: '#FFFFFF', fontWeight: 200 } : { fontWeight: 200 }}
            >
              Lançamento
            </button>
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
          <h3 className={`text-3xl font-serif italic font-light ${netSavings >= 0 ? 'text-white' : 'text-rose-400'}`}>
            {netSavings < 0 ? '-' : ''}{formatCurrency(Math.abs(netSavings))}
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
    </div>
  );
}
