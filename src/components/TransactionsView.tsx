/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Calendar, 
  Tag, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Download,
  ChevronDown
} from 'lucide-react';
import { Transaction, BudgetGoal } from '../types';
import { formatSystemDate } from '../utils/date';

interface TransactionsViewProps {
  transactions: Transaction[];
  onOpenAddModal: () => void;
  onDeleteTransaction: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  budgetGoals: BudgetGoal[];
  theme?: 'light' | 'dark';
}

export default function TransactionsView({
  transactions,
  onOpenAddModal,
  onDeleteTransaction,
  searchQuery,
  setSearchQuery,
  budgetGoals,
  theme = 'dark'
}: TransactionsViewProps) {
  const isDark = theme === 'dark';
  const [internalCategoryFilter, setInternalCategoryFilter] = useState('All');
  const [internalSortDirection, setInternalSortDirection] = useState<'desc' | 'asc'>('desc');
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  // Multi-tier filtering
  const filteredList = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = (t.sender || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
        (t.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = internalCategoryFilter === 'All' || t.category === internalCategoryFilter;

      return matchesSearch && matchesCategory;
    }).sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return internalSortDirection === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [transactions, searchQuery, internalCategoryFilter, internalSortDirection]);

  // Export JSON of current list
  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredList, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "leadiumfy_transactions.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-10 py-4 animate-fadeIn">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/10 pb-5 gap-4">
        <div>
          <h2 className="text-4xl font-serif italic text-white tracking-tighter font-light"></h2>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#666666] mt-1">Histórico de transações financeiras</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleExport}
            className={`flex-1 sm:flex-none flex items-center justify-center px-4 py-2 font-medium rounded-lg transition-colors cursor-pointer text-sm ${
              theme === 'light'
                ? 'bg-black text-[#FFFFFF] hover:bg-gray-800'
                : 'bg-white text-black hover:bg-gray-200'
            }`}
            title="Exportar JSON"
          >
            Exportar Dados
          </button>

          <button
            onClick={onOpenAddModal}
            className={`flex-1 sm:flex-none flex items-center justify-center px-6 py-2 font-medium rounded-lg transition-colors cursor-pointer text-sm ${
              theme === 'light'
                ? 'bg-black text-[#FFFFFF] hover:bg-gray-800'
                : 'bg-white text-black hover:bg-gray-200'
            }`}
          >
            Adicionar
          </button>
        </div>
      </div>

      {/* Advanced Filters Drawer */}
      <div className={`p-5 grid grid-cols-1 md:grid-cols-3 gap-4 items-center rounded-2xl border ${
        isDark ? 'bg-black/40 border-white/5' : 'bg-white border-black/5 shadow-sm'
      }`}>
        {/* Search Input inline */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar favorecido, descrição..."
            className={`w-full border rounded-xl py-2 pl-9 pr-3 text-xs placeholder-gray-500 focus:outline-none transition-all font-sans ${
              isDark 
                ? 'bg-[#141414] border-white/10 text-white focus:border-[#FF4D00]/50' 
                : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-[#FF4D00]/50'
            }`}
          />
        </div>

        {/* Category Filter */}
        <div className={`flex items-center gap-2 border rounded-xl py-1 px-3 focus-within:border-[#FF4D00]/50 transition-all ${
          isDark ? 'bg-[#141414] border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
        }`}>
          <Tag className="w-3.5 h-3.5 text-gray-500 shrink-0" />
          <select
            value={internalCategoryFilter}
            onChange={(e) => setInternalCategoryFilter(e.target.value)}
            className={`w-full bg-transparent text-xs focus:ring-0 focus:outline-none focus:border-none focus-visible:outline-none border-none outline-none ring-0 appearance-none cursor-pointer py-1.5 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}
            style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
          >
            <option value="All" style={{ backgroundColor: isDark ? '#141414' : '#ffffff', color: isDark ? '#ffffff' : '#000000' }}>Todas as Categorias</option>
            {/* Core budgeting categories */}
            <option value="Custo Mensal" style={{ backgroundColor: isDark ? '#141414' : '#ffffff', color: isDark ? '#ffffff' : '#000000' }}>Custo Mensal</option>
            <option value="Salários" style={{ backgroundColor: isDark ? '#141414' : '#ffffff', color: isDark ? '#ffffff' : '#000000' }}>Salários (Contas/Equipe)</option>
            <option value="Investimentos" style={{ backgroundColor: isDark ? '#141414' : '#ffffff', color: isDark ? '#ffffff' : '#000000' }}>Investimentos</option>
            <option value="Emergências" style={{ backgroundColor: isDark ? '#141414' : '#ffffff', color: isDark ? '#ffffff' : '#000000' }}>Emergências</option>
            <option value="Despesa Variável" style={{ backgroundColor: isDark ? '#141414' : '#ffffff', color: isDark ? '#ffffff' : '#000000' }}>Despesa Variável</option>
            {/* Standard tags */}
            <option value="Venda de Serviços" style={{ backgroundColor: isDark ? '#141414' : '#ffffff', color: isDark ? '#ffffff' : '#000000' }}>Venda de Serviços</option>
            <option value="Cafe & Restaurants" style={{ backgroundColor: isDark ? '#141414' : '#ffffff', color: isDark ? '#ffffff' : '#000000' }}>Café e Restaurantes</option>
            <option value="Groceries" style={{ backgroundColor: isDark ? '#141414' : '#ffffff', color: isDark ? '#ffffff' : '#000000' }}>Supermercado</option>
            <option value="Money Transfer" style={{ backgroundColor: isDark ? '#141414' : '#ffffff', color: isDark ? '#ffffff' : '#000000' }}>Transferência</option>
            <option value="Utilities" style={{ backgroundColor: isDark ? '#141414' : '#ffffff', color: isDark ? '#ffffff' : '#000000' }}>Serviços Públicos</option>
            <option value="Other" style={{ backgroundColor: isDark ? '#141414' : '#ffffff', color: isDark ? '#ffffff' : '#000000' }}>Outras Despesas</option>
          </select>
        </div>

        {/* Sort order date toggle */}
        <button
          onClick={() => setInternalSortDirection(internalSortDirection === 'desc' ? 'asc' : 'desc')}
          className={`flex items-center justify-between text-xs border rounded-xl py-2.5 px-3 transition-colors text-left cursor-pointer font-medium ${
            isDark 
              ? 'bg-[#141414] border-white/10 text-white hover:bg-white/5' 
              : 'bg-gray-50 border-gray-200 text-gray-900 hover:bg-gray-100'
          }`}
        >
          <span>Ordenar por Data: {internalSortDirection === 'desc' ? 'Mais Recente' : 'Mais Antiga'}</span>
          <Calendar className="w-3.5 h-3.5 text-gray-500" />
        </button>
      </div>

      {/* Matching table length statistics */}
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>Exibindo {filteredList.length} de {transactions.length} registros</span>
        {searchQuery && <button onClick={() => setSearchQuery('')} className="text-white font-semibold underline hover:text-[#999999] cursor-pointer">Limpar filtros</button>}
      </div>

      {/* Main List Table render */}
      <div className={`border rounded-2xl overflow-hidden shadow-xl ${
        isDark ? 'bg-[#12141C]/50 border-white/10' : 'bg-white border-gray-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`${isDark ? 'bg-[#141414] border-white/10 text-[#999999]' : 'bg-gray-50 border-gray-200 text-gray-500'} border-b text-[9px] uppercase tracking-[0.25em] font-bold`}>
                <th className="py-4 px-6 text-left">Favorecido</th>
                <th className="py-4 px-6 text-center">Tipo</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-gray-100'}`}>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={2} className="py-12 text-center text-xs text-gray-500">
                    Nenhuma transação financeira correspondente encontrada. Ajuste os filtros ou critérios de busca.
                  </td>
                </tr>
              ) : (
                filteredList.map((tx) => {
                  const isIncome = tx.type === 'income';
                  const isExpanded = expandedTxId === tx.id;
                  return (
                    <React.Fragment key={tx.id}>
                      {/* Interactive row */}
                      <tr 
                        onClick={() => setExpandedTxId(isExpanded ? null : tx.id)}
                        className={`group cursor-pointer transition-colors ${
                          isExpanded 
                            ? (isDark ? 'bg-white/[0.04]' : 'bg-gray-100/70') 
                            : (isDark ? 'hover:bg-white/2' : 'hover:bg-gray-50/70')
                        } ${!tx.avatarUrl ? 'opacity-90 hover:opacity-100' : ''}`}
                      >
                        {/* Column 1: Favorecido info */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            {tx.avatarUrl ? (
                              <img
                                src={tx.avatarUrl}
                                alt={tx.sender || 'Sender'}
                                className="w-10 h-10 rounded-lg object-cover bg-white/5 border border-white/5 grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-300"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-mono font-bold uppercase shrink-0 border ${
                                isDark ? 'bg-white/5 border-white/5 text-white' : 'bg-gray-100 border-gray-200 text-gray-800'
                              }`}>
                                {((tx.sender || 'TX').substring(0, 2)).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <span className={`text-xs font-bold block truncate max-w-44 ${
                                isDark ? 'text-white' : 'text-gray-900'
                              }`}>
                                {tx.sender || 'Favorecido Desconhecido'}
                              </span>
                              <span className="text-[10px] text-gray-400 font-mono block">
                                {formatSystemDate(tx.date)}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Column 2: Status Tag */}
                        <td className="py-4 px-6 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-extrabold ${
                            isIncome 
                              ? 'bg-emerald-500/10 text-emerald-500' 
                              : 'bg-rose-500/10 text-rose-500'
                          }`}>
                            <span className={`w-1 h-1 rounded-full ${isIncome ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                            {isIncome ? 'Entrada' : 'Saída'}
                          </span>
                        </td>
                      </tr>

                      {/* Expanded Subrow detail panel */}
                      {isExpanded && (
                        <tr className={isDark ? 'bg-white/[0.015]' : 'bg-gray-50/50'}>
                          <td colSpan={2} className="py-4 px-6 border-l-2 border-[#FF4D00]">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left py-2 animate-fadeIn">
                              
                              {/* Option A: Description details */}
                              <div>
                                <span className="text-gray-500 block uppercase tracking-wider text-[9px] font-bold mb-1">Descrição</span>
                                <span className={`text-xs ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                                  {tx.description || '(Não informada)'}
                                </span>
                              </div>

                              {/* Option B: Category label */}
                              <div>
                                <span className="text-gray-500 block uppercase tracking-wider text-[9px] font-bold mb-1">Categoria</span>
                                <span className={`text-xs inline-block px-1.5 py-0.5 rounded ${
                                  isDark ? 'bg-white/5 text-gray-200' : 'bg-gray-150/70 text-gray-800'
                                }`}>
                                  {tx.category === 'Cafe & Restaurants' ? 'Café e Restaurantes' : tx.category === 'Groceries' ? 'Supermercado' : tx.category === 'Money Transfer' ? 'Transferência' : tx.category === 'Salary' ? 'Salário/Depósito' : tx.category === 'Utilities' ? 'Serviços Públicos' : tx.category === 'Other' ? 'Outros' : tx.category}
                                </span>
                              </div>

                              {/* Option C: Real value + quick delete controls */}
                              <div className="flex translate-y-[-2px] justify-between items-center sm:items-start md:items-center">
                                <div>
                                  <span className="text-gray-500 block uppercase tracking-wider text-[9px] font-bold mb-0.5">Valor</span>
                                  <span className={`font-mono font-bold text-sm ${
                                    isIncome ? 'text-emerald-500' : 'text-rose-500'
                                  }`}>
                                    {isIncome ? 'Faturamento (LTV): +' : 'Saída (Custo): -'}{formatCurrency(tx.amount)}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteTransaction(tx.id);
                                  }}
                                  className="p-1.5 text-xs text-rose-500 hover:text-white hover:bg-rose-500 border border-rose-500/10 hover:border-transparent rounded-lg transition-all flex items-center gap-1 bg-rose-500/5 cursor-pointer"
                                  title="Excluir definitivo"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Excluir</span>
                                </button>
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
