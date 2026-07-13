/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Search,
  Trash2,
  Download,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  TrendingDown,
  Wallet,
  Layers,
  Check,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  PieChart,
  Activity,
  Repeat,
  Tag,
  ChevronDown,
  X,
  Building2,
  Calendar,
  CreditCard
} from 'lucide-react';
import { Transaction, BudgetGoal, Client } from '../types';
import { formatSystemDate, newestDateFirst } from '../utils/date';
import { generateTransactionsPDF } from '../utils/pdfGenerator';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface TransactionsViewProps {
  transactions: Transaction[];
  clients?: Client[];
  onOpenAddModal: () => void;
  onDeleteTransaction: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  budgetGoals: BudgetGoal[];
  theme?: 'light' | 'dark';
}

const PAGE_SIZE = 6;

// Translate internal category slugs to friendly PT-BR labels
const categoryLabel = (cat: string): string => {
  const map: Record<string, string> = {
    'Cafe & Restaurants': 'Café e Restaurantes',
    'Groceries': 'Supermercado',
    'Money Transfer': 'Transferência',
    'Salary': 'Salário/Depósito',
    'Utilities': 'Serviços Públicos',
    'Other': 'Outros',
    'Venda de Serviços': 'Venda de Serviços'
  };
  return map[cat] || cat || 'Sem categoria';
};

export default function TransactionsView({
  transactions,
  clients = [],
  onOpenAddModal,
  onDeleteTransaction,
  searchQuery,
  setSearchQuery,
  budgetGoals,
  theme = 'dark'
}: TransactionsViewProps) {
  const isDark = theme === 'dark';

  const [categoryFilter, setCategoryFilter] = useState('All');
  const [typeTab, setTypeTab] = useState<'all' | 'income' | 'expense'>('all');
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const getOrigin = (tx: Transaction) => {
    if (tx.clientId) {
      const client = clients.find(item => item.id === tx.clientId);
      return client ? client.name : 'Cliente vinculado';
    }
    return tx.account || 'Lançamento manual';
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 2
    }).format(val);

  // ---- Monochrome theme tokens ----
  const t = {
    cardBg: isDark ? 'bg-[#0F0F0F]' : 'bg-white',
    cardBorder: isDark ? 'border-white/10' : 'border-black/10',
    inputBg: isDark ? 'bg-[#141414]' : 'bg-gray-50',
    inputBorder: isDark ? 'border-white/10' : 'border-gray-200',
    textPrimary: isDark ? 'text-white' : 'text-gray-900',
    textMuted: isDark ? 'text-[#888888]' : 'text-gray-500',
    textFaint: isDark ? 'text-[#666666]' : 'text-gray-400',
    rowHover: isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-gray-50',
    divide: isDark ? 'divide-white/5' : 'divide-gray-100',
    accent: isDark ? '#FFFFFF' : '#111111',
    accentMuted: isDark ? '#8A8A8A' : '#6B7280'
  };

  // ---- Aggregate KPIs + month-over-month deltas ----
  const stats = useMemo(() => {
    const monthKey = (d: string) => (d || '').slice(0, 7); // YYYY-MM
    const months = Array.from(new Set(transactions.map(tx => monthKey(tx.date)).filter(Boolean))).sort();
    const current = months[months.length - 1];
    const previous = months[months.length - 2];

    const bucket = (mk?: string) => {
      let income = 0, expense = 0, count = 0;
      transactions.forEach(tx => {
        if (mk && monthKey(tx.date) !== mk) return;
        count++;
        if (tx.type === 'income') income += tx.amount;
        else expense += tx.amount;
      });
      return { income, expense, count, net: income - expense };
    };

    const total = bucket();
    const cur = current ? bucket(current) : total;
    const prev = previous ? bucket(previous) : null;

    const delta = (now: number, before: number | undefined) => {
      if (before === undefined || before === 0) return null;
      return Math.round(((now - before) / Math.abs(before)) * 100);
    };

    return {
      income: total.income,
      expense: total.expense,
      net: total.net,
      count: total.count,
      dIncome: prev ? delta(cur.income, prev.income) : null,
      dExpense: prev ? delta(cur.expense, prev.expense) : null,
      dNet: prev ? delta(cur.net, prev.net) : null,
      dCount: prev ? delta(cur.count, prev.count) : null
    };
  }, [transactions]);

  // ---- Filtering for the table ----
  const filteredList = useMemo(() => {
    return transactions
      .filter(tx => {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          (tx.description || '').toLowerCase().includes(q) ||
          (categoryLabel(tx.category) || '').toLowerCase().includes(q) ||
          getOrigin(tx).toLowerCase().includes(q) ||
          String(tx.amount).includes(q);
        const matchesCategory = categoryFilter === 'All' || tx.category === categoryFilter;
        const matchesType = typeTab === 'all' || tx.type === typeTab;
        return matchesSearch && matchesCategory && matchesType;
      })
      .sort(newestDateFirst);
  }, [transactions, clients, searchQuery, categoryFilter, typeTab]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
  useEffect(() => { setPage(1); }, [searchQuery, categoryFilter, typeTab]);
  const pageClamped = Math.min(page, totalPages);
  const pageItems = filteredList.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE);

  // ---- Category breakdown (donut) across all transactions ----
  const categoryBreakdown = useMemo(() => {
    const groups: Record<string, number> = {};
    let total = 0;
    transactions.forEach(tx => {
      const key = tx.category || 'Other';
      groups[key] = (groups[key] || 0) + tx.amount;
      total += tx.amount;
    });
    const entries = Object.entries(groups)
      .map(([name, value]) => ({
        name,
        value,
        percentage: total === 0 ? 0 : Math.round((value / total) * 1000) / 10
      }))
      .sort((a, b) => b.value - a.value);
    return { entries, total };
  }, [transactions]);

  // Categorical palette: color improves recognition across donut segments.
  const ramp = ['#22c55e', '#3b82f6', '#f59e0b', '#a855f7', '#ef4444', '#06b6d4'];

  // ---- Daily flow (area chart) ----
  const flowData = useMemo(() => {
    const days: Record<string, { entradas: number; saidas: number; sort: number }> = {};
    transactions.forEach(tx => {
      if (!tx.date) return;
      const parts = tx.date.split('-'); // YYYY-MM-DD
      if (parts.length < 3) return;
      const label = `${parts[2]}/${parts[1]}`;
      const sort = new Date(tx.date).getTime();
      if (!days[label]) days[label] = { entradas: 0, saidas: 0, sort };
      if (tx.type === 'income') days[label].entradas += tx.amount;
      else days[label].saidas += tx.amount;
    });
    return Object.entries(days)
      .map(([label, v]) => ({ label, ...v }))
      .sort((a, b) => a.sort - b.sort);
  }, [transactions]);

  const handleExport = () => {
    generateTransactionsPDF({
      transactions: filteredList,
      categoryFilter,
      searchQuery
    });
  };

  const FlowTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div className={`px-3 py-2 rounded-lg border text-[11px] font-mono ${
        isDark ? 'bg-[#161616] border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'
      }`}>
        <p className="font-bold mb-1 uppercase tracking-wider text-[9px]">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} className="flex justify-between gap-4">
            <span className={t.textMuted}>{p.name === 'entradas' ? 'Entradas' : 'Saídas'}:</span>
            <span className="font-bold">{formatCurrency(p.value)}</span>
          </p>
        ))}
      </div>
    );
  };

  const kpis: Array<{
    key: string;
    label: string;
    value: number;
    delta: number | null;
    icon: React.ComponentType<{ className?: string }>;
    trendIcon: React.ComponentType<{ className?: string }>;
    isCount?: boolean;
  }> = [
    {
      key: 'income',
      label: 'Receitas',
      value: stats.income,
      delta: stats.dIncome,
      icon: TrendingUp,
      trendIcon: ArrowUpRight
    },
    {
      key: 'expense',
      label: 'Despesas',
      value: stats.expense,
      delta: stats.dExpense,
      icon: TrendingDown,
      trendIcon: ArrowDownLeft
    },
    {
      key: 'net',
      label: 'Saldo Líquido',
      value: stats.net,
      delta: stats.dNet,
      icon: Wallet,
      trendIcon: stats.net >= 0 ? ArrowUpRight : ArrowDownLeft
    },
    {
      key: 'count',
      label: 'Transações',
      value: stats.count,
      delta: stats.dCount,
      icon: Layers,
      trendIcon: ArrowUpRight,
      isCount: true
    }
  ];

  return (
    <div className="space-y-8 py-4 animate-fadeIn">
      {/* Page title */}
      <div>
        <h2 className={`text-3xl sm:text-4xl font-bold tracking-tight ${t.textPrimary}`}>Transações</h2>
        <p className={`text-sm mt-1 ${t.textMuted}`}>Acompanhe todo o fluxo financeiro da sua operação</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(card => {
          const Icon = card.icon;
          const Trend = card.trendIcon;
          const hasDelta = card.delta !== null && card.delta !== undefined;
          const up = (card.delta ?? 0) >= 0;
          return (
            <div key={card.key} className={`rounded-2xl border p-5 ${t.cardBg} ${t.cardBorder}`}>
              <div className="flex items-start justify-between mb-3">
                <span className={`text-[10px] uppercase tracking-[0.18em] font-bold ${t.textMuted}`}>{card.label}</span>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                  isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-100 border-black/5 text-gray-900'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <h3 className={`text-2xl font-bold tracking-tight ${t.textPrimary}`}>
                {card.isCount ? card.value : formatCurrency(card.value as number)}
              </h3>
              {hasDelta && (
                <p className={`text-[11px] font-mono mt-2 flex items-center gap-1 ${t.textMuted}`}>
                  <Trend className={`w-3.5 h-3.5 ${isDark ? 'text-white/70' : 'text-gray-700'}`} />
                  <span className={t.textPrimary}>{up ? '+' : ''}{card.delta}%</span>
                  <span className={t.textFaint}>vs mês anterior</span>
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Toolbar: search + filters + actions */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 md:grid-cols-[minmax(280px,1fr)_240px_210px]">
          <div className="relative min-w-0">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${t.textFaint}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por descrição, categoria ou valor..."
              className={`w-full border rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none transition-colors ${t.inputBg} ${t.inputBorder} ${t.textPrimary} placeholder:${t.textFaint} focus:border-current`}
            />
          </div>

          <div className={`relative flex min-w-0 items-center gap-2 border rounded-xl px-3 ${t.inputBg} ${t.inputBorder}`}>
            <Tag className={`w-4 h-4 shrink-0 ${t.textFaint}`} />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={`w-full min-w-0 bg-transparent text-sm py-3 appearance-none cursor-pointer focus:outline-none ${t.textPrimary}`}
            >
              <option value="All" style={{ backgroundColor: isDark ? '#141414' : '#fff', color: isDark ? '#fff' : '#000' }}>Todas as Categorias</option>
              {categoryBreakdown.entries.map(c => (
                <option key={c.name} value={c.name} style={{ backgroundColor: isDark ? '#141414' : '#fff', color: isDark ? '#fff' : '#000' }}>
                  {categoryLabel(c.name)}
                </option>
              ))}
            </select>
            <ChevronDown className={`w-4 h-4 shrink-0 pointer-events-none ${t.textFaint}`} />
          </div>

          <div className={`flex min-w-0 items-center justify-between gap-2 border rounded-xl px-4 py-3 text-sm ${t.inputBg} ${t.inputBorder} ${t.textPrimary}`}>
            <span className="truncate">Data: Mais recente</span>
            <ChevronDown className={`w-4 h-4 shrink-0 ${t.textFaint}`} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider border transition-colors ${
              isDark ? 'border-white/10 text-white hover:bg-white/5' : 'border-black/10 text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Exportar</span>
          </button>
          <button
            onClick={onOpenAddModal}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
              isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white keep-white hover:bg-gray-800'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Nova Transação</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex items-center gap-1 border-b ${t.cardBorder}`}>
        {([
          { key: 'all', label: 'Todas' },
          { key: 'income', label: 'Receitas' },
          { key: 'expense', label: 'Despesas' }
        ] as const).map(tab => {
          const active = typeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setTypeTab(tab.key)}
              className={`relative px-4 py-3 text-xs uppercase tracking-[0.15em] font-bold transition-colors ${
                active ? t.textPrimary : `${t.textFaint} hover:${t.textMuted}`
              }`}
            >
              {tab.label}
              {active && (
                <span className={`absolute left-0 right-0 -bottom-px h-0.5 ${isDark ? 'bg-white' : 'bg-black'}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Transactions table */}
      <div className={`rounded-2xl border overflow-hidden ${t.cardBg} ${t.cardBorder}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[980px]">
            <thead>
              <tr className={`text-[9px] uppercase tracking-[0.2em] font-bold ${t.textMuted} border-b ${t.cardBorder}`}>
                <th className="py-4 px-6">Data</th>
                <th className="py-4 px-6">Origem</th>
                <th className="py-4 px-6">Categoria</th>
                <th className="py-4 px-6">Descrição</th>
                <th className="py-4 px-6 text-center">Tipo</th>
                <th className="py-4 px-6 text-right">Valor</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${t.divide}`}>
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className={`py-16 text-center text-sm ${t.textMuted}`}>
                    Nenhuma transação encontrada. Ajuste os filtros ou a busca.
                  </td>
                </tr>
              ) : (
                pageItems.map(tx => {
                  const isIncome = tx.type === 'income';
                  const [y, m, d] = (tx.date || '').slice(0, 10).split('-');
                  const monthAbbr = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'][parseInt(m, 10) - 1] || '';
                  return (
                    <tr key={tx.id} onClick={() => setSelectedTransaction(tx)} className={`transition-colors cursor-pointer ${t.rowHover}`}>
                      {/* Data */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className={`text-sm font-semibold tabular-nums ${t.textPrimary}`}>
                          {d || '--'} {monthAbbr} {y}
                        </span>
                      </td>

                      {/* Origem */}
                      <td className="py-4 px-6 max-w-[180px]">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${tx.clientId ? t.textPrimary : t.textMuted}`}>
                          {tx.clientId ? <Building2 className="w-3.5 h-3.5 text-blue-500" /> : <CreditCard className="w-3.5 h-3.5" />}
                          <span className="truncate" title={getOrigin(tx)}>{getOrigin(tx)}</span>
                        </span>
                      </td>

                      {/* Categoria */}
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
                          isDark ? 'border-white/10 text-gray-300' : 'border-black/10 text-gray-700'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-white/60' : 'bg-black/50'}`} />
                          {categoryLabel(tx.category)}
                        </span>
                      </td>

                      {/* Descrição */}
                      <td className="py-4 px-6 max-w-[220px]">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs block truncate ${t.textMuted}`} title={tx.description}>
                            {tx.description || '—'}
                          </span>
                          {tx.isRecurring && (
                            <Repeat className={`w-3 h-3 shrink-0 ${t.textFaint}`} />
                          )}
                        </div>
                      </td>

                      {/* Tipo */}
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold border ${
                          isIncome
                            ? (isDark ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700')
                            : (isDark ? 'bg-red-500/10 border-red-500/25 text-red-400' : 'bg-red-50 border-red-200 text-red-700')
                        }`}>
                          {isIncome ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                          {isIncome ? 'Entrada' : 'Saída'}
                        </span>
                      </td>

                      {/* Valor */}
                      <td className="py-4 px-6 text-right">
                        <span className={`font-mono font-bold text-sm ${isIncome ? t.textPrimary : t.textMuted}`}>
                          {isIncome ? '+' : '−'} {formatCurrency(tx.amount)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold ${t.textMuted}`}>
                          <Check className={`w-3.5 h-3.5 ${isDark ? 'text-white/70' : 'text-gray-700'}`} />
                          Concluída
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-4 px-6 text-center relative">
                        <button
                          onClick={(event) => { event.stopPropagation(); setOpenMenuId(openMenuId === tx.id ? null : tx.id); }}
                          className={`p-1.5 rounded-lg transition-colors ${t.rowHover} ${t.textMuted}`}
                          aria-label="Ações"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {openMenuId === tx.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={(event) => { event.stopPropagation(); setOpenMenuId(null); }} />
                            <div className={`absolute right-6 top-12 z-20 rounded-xl border py-1 min-w-[140px] shadow-xl ${
                              isDark ? 'bg-[#161616] border-white/10' : 'bg-white border-black/10'
                            }`}>
                              <button
                                onClick={(event) => { event.stopPropagation(); onDeleteTransaction(tx.id); setOpenMenuId(null); }}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-xs ${t.textPrimary} ${t.rowHover}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Excluir
                              </button>
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className={`flex items-center justify-between px-6 py-4 border-t ${t.cardBorder}`}>
          <span className={`text-xs ${t.textMuted}`}>
            Mostrando {filteredList.length === 0 ? 0 : (pageClamped - 1) * PAGE_SIZE + 1} a {Math.min(pageClamped * PAGE_SIZE, filteredList.length)} de {filteredList.length} registros
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={pageClamped <= 1}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${t.cardBorder} ${t.textMuted} ${t.rowHover}`}
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Anterior
            </button>
            <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
              isDark ? 'border-white/20 text-white' : 'border-black/20 text-black'
            }`}>{pageClamped}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={pageClamped >= totalPages}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${t.cardBorder} ${t.textMuted} ${t.rowHover}`}
            >
              Próximo <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {selectedTransaction && (() => {
        const tx = selectedTransaction;
        const linkedClient = tx.clientId ? clients.find(client => client.id === tx.clientId) : undefined;
        const isIncome = tx.type === 'income';
        return (
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedTransaction(null)}>
            <div className={`w-full max-w-lg rounded-2xl border p-5 sm:p-6 shadow-2xl ${isDark ? 'bg-[#111114] border-white/10' : 'bg-white border-black/10'}`} onClick={(event) => event.stopPropagation()}>
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <span className={`text-[10px] uppercase tracking-[0.16em] font-semibold ${t.textMuted}`}>Detalhes da transação</span>
                  <h3 className={`text-lg font-semibold mt-1 ${t.textPrimary}`}>{tx.description || 'Transação sem descrição'}</h3>
                </div>
                <button onClick={() => setSelectedTransaction(null)} className={`p-2 rounded-lg ${t.rowHover} ${t.textMuted}`} aria-label="Fechar detalhes">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className={`rounded-xl border p-4 mb-4 ${isDark ? 'bg-white/[0.025] border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                <span className={`text-[10px] uppercase tracking-wider ${t.textMuted}`}>{isIncome ? 'Receita' : 'Despesa'}</span>
                <div className={`text-2xl font-semibold mt-1 ${isIncome ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : (isDark ? 'text-red-400' : 'text-red-600')}`}>
                  {isIncome ? '+' : '−'} {formatCurrency(tx.amount)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className={`block text-[9px] uppercase tracking-wider mb-1 ${t.textMuted}`}>Origem</span>
                  <span className={`flex items-center gap-1.5 font-medium ${t.textPrimary}`}><Building2 className="w-3.5 h-3.5" />{getOrigin(tx)}</span>
                </div>
                <div>
                  <span className={`block text-[9px] uppercase tracking-wider mb-1 ${t.textMuted}`}>Data</span>
                  <span className={`flex items-center gap-1.5 font-medium ${t.textPrimary}`}><Calendar className="w-3.5 h-3.5" />{formatSystemDate(tx.date)}</span>
                </div>
                <div>
                  <span className={`block text-[9px] uppercase tracking-wider mb-1 ${t.textMuted}`}>Categoria</span>
                  <span className={`font-medium ${t.textPrimary}`}>{categoryLabel(tx.category)}</span>
                </div>
                <div>
                  <span className={`block text-[9px] uppercase tracking-wider mb-1 ${t.textMuted}`}>Conta</span>
                  <span className={`font-medium ${t.textPrimary}`}>{tx.account || 'Não informada'}</span>
                </div>
                <div>
                  <span className={`block text-[9px] uppercase tracking-wider mb-1 ${t.textMuted}`}>Recorrência</span>
                  <span className={`font-medium ${t.textPrimary}`}>{tx.isRecurring ? `Sim${tx.frequency === 'monthly' ? ', mensal' : ''}` : 'Não recorrente'}</span>
                </div>
                <div>
                  <span className={`block text-[9px] uppercase tracking-wider mb-1 ${t.textMuted}`}>Cliente</span>
                  <span className={`font-medium ${t.textPrimary}`}>{linkedClient?.name || (tx.clientId ? 'Cliente vinculado' : 'Sem vínculo')}</span>
                </div>
              </div>

              {tx.notes && (
                <div className={`mt-4 pt-4 border-t ${t.cardBorder}`}>
                  <span className={`block text-[9px] uppercase tracking-wider mb-1 ${t.textMuted}`}>Observações</span>
                  <p className={`text-xs leading-relaxed ${t.textPrimary}`}>{tx.notes}</p>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Bottom: category donut + daily flow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resumo por categoria */}
        <div className={`rounded-2xl border p-6 ${t.cardBg} ${t.cardBorder}`}>
          <div className="mb-6">
            <h3 className={`text-sm font-bold flex items-center gap-2 ${t.textPrimary}`}>
              <PieChart className={`w-4 h-4 ${isDark ? 'text-white/70' : 'text-gray-700'}`} />
              Resumo por categoria
            </h3>
            <p className={`text-xs mt-0.5 ${t.textMuted}`}>Total movimentado no período</p>
          </div>

          {categoryBreakdown.entries.length === 0 ? (
            <div className={`h-48 flex flex-col items-center justify-center text-xs ${t.textMuted}`}>
              <Activity className="w-6 h-6 mb-2 opacity-50" />
              Nenhuma transação registrada.
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-8">
              <div className="relative w-40 h-40 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke={isDark ? '#222' : '#E5E7EB'} strokeWidth="10" />
                  {categoryBreakdown.entries.slice(0, 6).reduce((acc, cat, idx) => {
                    const circ = 251.2;
                    const pct = categoryBreakdown.total === 0 ? 0 : (cat.value / categoryBreakdown.total) * 100;
                    const len = (circ * pct) / 100;
                    const offset = circ - len + acc.running;
                    acc.nodes.push(
                      <circle
                        key={cat.name}
                        cx="50" cy="50" r="40"
                        fill="transparent"
                        stroke={ramp[idx % ramp.length]}
                        strokeWidth="10"
                        strokeDasharray={`${len} ${circ - len}`}
                        strokeDashoffset={-acc.running}
                      />
                    );
                    acc.running -= len;
                    return acc;
                  }, { nodes: [] as React.ReactNode[], running: 0 }).nodes}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className={`text-base font-bold ${t.textPrimary}`}>{formatCurrency(categoryBreakdown.total)}</span>
                  <span className={`text-[9px] uppercase tracking-widest ${t.textFaint}`}>Total Geral</span>
                </div>
              </div>

              <div className="flex-1 w-full space-y-3">
                {categoryBreakdown.entries.slice(0, 5).map((cat, idx) => (
                  <div key={cat.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: ramp[idx % ramp.length] }} />
                      <span className={`truncate ${t.textMuted}`}>{categoryLabel(cat.name)}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`font-mono ${t.textPrimary}`}>{formatCurrency(cat.value)}</span>
                      <span className={`font-mono w-12 text-right ${t.textFaint}`}>{cat.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Fluxo financeiro */}
        <div className={`rounded-2xl border p-6 ${t.cardBg} ${t.cardBorder}`}>
          <div className="mb-4">
            <h3 className={`text-sm font-bold flex items-center gap-2 ${t.textPrimary}`}>
              <Activity className={`w-4 h-4 ${isDark ? 'text-white/70' : 'text-gray-700'}`} />
              Fluxo financeiro
            </h3>
            <p className={`text-xs mt-0.5 ${t.textMuted}`}>Evolução diária no período</p>
          </div>

          {flowData.length === 0 ? (
            <div className={`h-56 flex flex-col items-center justify-center text-xs ${t.textMuted}`}>
              <Activity className="w-6 h-6 mb-2 opacity-50" />
              Nenhum lançamento no período.
            </div>
          ) : (
            <>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={flowData} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="flowIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={t.accent} stopOpacity={isDark ? 0.35 : 0.18} />
                        <stop offset="100%" stopColor={t.accent} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} vertical={false} />
                    <XAxis dataKey="label" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v >= 1000 ? (v / 1000) + 'k' : v}`} />
                    <Tooltip content={<FlowTooltip />} cursor={{ stroke: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }} />
                    <Area
                      name="saidas"
                      type="monotone"
                      dataKey="saidas"
                      stroke={t.accentMuted}
                      strokeWidth={2}
                      strokeDasharray="4 3"
                      fill="transparent"
                      dot={false}
                    />
                    <Area
                      name="entradas"
                      type="monotone"
                      dataKey="entradas"
                      stroke={t.accent}
                      strokeWidth={2.5}
                      fill="url(#flowIncome)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className={`flex items-center gap-5 justify-center mt-4 pt-4 border-t text-[10px] uppercase tracking-widest font-bold ${t.textMuted} ${t.cardBorder}`}>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 rounded" style={{ backgroundColor: t.accent }} />
                  Entradas
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 border-t-2 border-dashed" style={{ borderColor: t.accentMuted }} />
                  Saídas
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
