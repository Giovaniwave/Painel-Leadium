/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, User, FileText, DollarSign, Calendar, Tag, Plus, Sparkles, Repeat } from 'lucide-react';
import { Transaction, BudgetGoal, Client } from '../types';

function calculateNextOccurrence(startDateStr: string, freq: 'weekly' | 'monthly' | 'quarterly'): string {
  if (!startDateStr) return '';
  const dateObj = new Date(startDateStr + 'T12:00:00');
  if (isNaN(dateObj.getTime())) return '';

  if (freq === 'weekly') {
    dateObj.setDate(dateObj.getDate() + 7);
  } else if (freq === 'monthly') {
    dateObj.setMonth(dateObj.getMonth() + 1);
  } else if (freq === 'quarterly') {
    dateObj.setMonth(dateObj.getMonth() + 3);
  }

  return dateObj.toISOString().substring(0, 10);
}

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (transaction: Omit<Transaction, 'id'>) => void;
  budgetGoals: BudgetGoal[];
  clients?: Client[];
}

export default function AddTransactionModal({ isOpen, onClose, onAdd, budgetGoals, clients = [] }: AddTransactionModalProps) {
  const [sender, setSender] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState<string>('Custo Mensal');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [clientId, setClientId] = useState<string>('');
  const [error, setError] = useState('');
  const [isSuggestingCategory, setIsSuggestingCategory] = useState(false);
  const [suggestedByIA, setSuggestedByIA] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'weekly' | 'monthly' | 'quarterly'>('monthly');

  if (!isOpen) return null;

  const suggestCategory = async (descToUse?: string) => {
    const text = descToUse !== undefined ? descToUse : description;
    if (!text || text.trim().length < 3) return;

    setIsSuggestingCategory(true);
    try {
      const res = await fetch('/api/transactions/suggest-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: text, type })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.category) {
          setCategory(data.category);
          setSuggestedByIA(true);
        }
      }
    } catch (err) {
      console.error('Erro ao sugerir categoria:', err);
    } finally {
      setIsSuggestingCategory(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let resolvedSender = sender;
    if (clientId) {
      const client = clients.find(c => c.id === clientId);
      if (client && !resolvedSender.trim()) {
        resolvedSender = client.name;
      }
    }

    if (!resolvedSender.trim() || !description.trim() || !amount) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Por favor, insira um valor numérico válido.');
      return;
    }

    onAdd({
      sender: resolvedSender.trim(),
      description: description.trim(),
      type,
      category,
      amount: numericAmount,
      date,
      account: category, // Maintain backward compatibility
      clientId: clientId ? clientId : undefined,
      isRecurring,
      frequency: isRecurring ? frequency : undefined,
      nextOccurrenceDate: isRecurring ? calculateNextOccurrence(date, frequency) : undefined
    });

    // Reset Form fields
    setSender('');
    setDescription('');
    setAmount('');
    setDate(new Date().toISOString().substring(0, 10));
    setClientId('');
    setIsRecurring(false);
    setFrequency('monthly');
    setError('');
    onClose();
  };

  const handleTypeChange = (newType: 'income' | 'expense') => {
    setType(newType);
    setSuggestedByIA(false);
    if (newType === 'income') {
      setCategory('Venda de Serviços');
    } else {
      setCategory('Custo Mensal');
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn" 
      id="add-transaction-modal"
    >
      <div className="bg-[#0F0F0F] border border-white/10 w-full max-w-lg rounded-2xl overflow-hidden shadow-[0_15px_60px_rgba(0,0,0,0.9)] relative max-h-[92vh] flex flex-col">
        {/* Header Block */}
        <div className="px-6 py-5 bg-[#141414] border-b border-white/10 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-3 bg-[#6B6B6B] rounded-full"></span>
            <h3 className="text-[11px] uppercase tracking-[0.25em] font-bold text-white">
              Adicionar Transação Manual
            </h3>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors cursor-pointer p-1.5 rounded-full hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-3.5 rounded-xl text-xs font-semibold font-mono">
              {error}
            </div>
          )}

          {/* Type Select Component Block: Emerald for Income, Rose for Expense */}
          <div className="space-y-2">
            <label className="text-[9px] uppercase font-bold tracking-[0.25em] text-gray-500 text-left block">
              Tipo de Operação
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleTypeChange('expense')}
                className="py-4 px-4 rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold border transition-all duration-200 text-center flex items-center justify-center gap-2 cursor-pointer"
                style={{
                  backgroundColor: type === 'expense' ? '#DF3C3C' : 'transparent',
                  color: type === 'expense' ? '#FFFFFF' : '#888888',
                  borderColor: type === 'expense' ? '#DF3C3C' : 'rgba(128, 128, 128, 0.15)',
                }}
              >
                <span className={`w-2 h-2 rounded-full ${type === 'expense' ? 'bg-white' : 'bg-red-500'}`}></span>
                Saída (-)
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('income')}
                className="py-4 px-4 rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold border transition-all duration-200 text-center flex items-center justify-center gap-2 cursor-pointer"
                style={{
                  backgroundColor: type === 'income' ? '#0CA673' : 'transparent',
                  color: type === 'income' ? '#FFFFFF' : '#888888',
                  borderColor: type === 'income' ? '#0CA673' : 'rgba(128, 128, 128, 0.15)',
                }}
              >
                <span className={`w-2 h-2 rounded-full ${type === 'income' ? 'bg-white' : 'bg-emerald-500'}`}></span>
                Entrada (+)
              </button>
            </div>
          </div>

          {/* Conditional Layout Inputs */}
          <div className="space-y-4">
            
            {/* Payee / Client Input wrapper row */}
            <div className="space-y-1.5 text-left">
              <label className="text-[9px] uppercase font-bold tracking-[0.25em] text-gray-400 flex items-center gap-1.5 label-icon">
                <User className="w-3.5 h-3.5 text-[#6B6B6B]" />
                {type === 'income' ? 'Cliente / Pagador' : 'Favorecido / Cliente'}
              </label>
              {clients && clients.length > 0 && (
                <select
                  value={clientId}
                  onChange={(e) => {
                    setClientId(e.target.value);
                    const selectedClient = clients.find(c => c.id === e.target.value);
                    if (selectedClient && !sender) {
                      setSender(selectedClient.name);
                    }
                  }}
                  className="w-full bg-[#141414] border border-white/10 rounded-xl py-3 px-3.5 text-xs text-white focus:outline-none focus:border-[#6B6B6B] focus:ring-1 focus:ring-[#6B6B6B]/20 transition-all cursor-pointer font-sans mb-2"
                >
                  <option value="">-- Vincular a um Cliente (Opcional) --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
              <input
                type="text"
                required={!clientId}
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                placeholder={type === 'income' ? "Ex: Outra origem se não for cliente..." : "Ex: Fornecedor ou Favorecido..."}
                className="w-full bg-[#141414] border border-white/10 rounded-xl py-3 px-3.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#6B6B6B] focus:ring-1 focus:ring-[#6B6B6B]/20 transition-all font-sans"
              />
            </div>

            {/* Description Area */}
            <div className="space-y-1.5 text-left">
              <label className="text-[9px] uppercase font-bold tracking-[0.25em] text-gray-400 flex items-center gap-1.5 label-icon">
                <FileText className="w-3.5 h-3.5 text-[#6B6B6B]" />
                Descrição
              </label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setSuggestedByIA(false);
                }}
                onBlur={() => suggestCategory()}
                placeholder="Ex: Mensalidade de serviços ou despesas extras"
                className="w-full bg-[#141414] border border-white/10 rounded-xl py-3 px-3.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#6B6B6B] focus:ring-1 focus:ring-[#6B6B6B]/20 transition-all font-sans"
              />
            </div>

            {/* Double Row: Amount and Date */}
            <div className="grid grid-cols-2 gap-4">
              {/* Amount form input */}
              <div className="space-y-1.5 text-left">
                <label className="text-[9px] uppercase font-bold tracking-[0.25em] text-gray-400 flex items-center gap-1.5 label-icon">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                  Valor (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[#141414] border border-white/10 rounded-xl py-3 px-3.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#6B6B6B] focus:ring-1 focus:ring-[#6B6B6B]/20 transition-all font-mono"
                />
              </div>

              {/* Date selection input */}
              <div className="space-y-1.5 text-left">
                <label className="text-[9px] uppercase font-bold tracking-[0.25em] text-gray-400 flex items-center gap-1.5 label-icon">
                  <Calendar className="w-3.5 h-3.5 text-[#6B6B6B]" />
                  Data
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-[#141414] border border-white/10 rounded-xl py-3 px-3.5 text-xs text-white focus:outline-none focus:border-[#6B6B6B] focus:ring-1 focus:ring-[#6B6B6B]/20 transition-all font-sans"
                />
              </div>
            </div>

            {/* Category Select Block */}
            <div className="space-y-1.5 text-left">
              <div className="flex justify-between items-center">
                <label className="text-[9px] uppercase font-bold tracking-[0.25em] text-gray-400 flex items-center gap-1.5 label-icon">
                  <Tag className="w-3.5 h-3.5 text-[#6B6B6B]" />
                  Categoria
                </label>
                {description.trim().length >= 3 && (
                  <button
                    type="button"
                    onClick={() => suggestCategory()}
                    disabled={isSuggestingCategory}
                    className="flex items-center gap-1 text-[9px] uppercase font-bold tracking-wider text-[#FFFFFF] hover:text-[#FF661A] transition-colors bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className={`w-2.5 h-2.5 ${isSuggestingCategory ? 'animate-pulse' : ''}`} />
                    {isSuggestingCategory ? 'Sugerindo...' : 'Sugerir com IA'}
                  </button>
                )}
              </div>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setSuggestedByIA(false);
                }}
                className="w-full bg-[#141414] border border-white/10 rounded-xl py-3 px-3.5 text-xs text-white focus:outline-none focus:border-[#6B6B6B] focus:ring-1 focus:ring-[#6B6B6B]/20 transition-all cursor-pointer font-sans"
              >
                {type === 'income' ? (
                  <>
                    <option value="Venda de Serviços">Venda de Serviços</option>
                    <option value="Investimentos">Rendimento de Investimentos</option>
                    <option value="Other">Outras Receitas</option>
                  </>
                ) : (
                  <>
                    {/* The 5 main budget categories merged here */}
                    <option value="Custo Mensal">Custo Mensal</option>
                    <option value="Salários">Salários (Equipe/Luz/Escritório)</option>
                    <option value="Investimentos">Investimentos</option>
                    <option value="Emergências">Emergências</option>
                    <option value="Despesa Variável">Despesa Variável</option>
                    
                    {/* Previous general ledger tags */}
                    <option value="Cafe & Restaurants">Café e Restaurantes</option>
                    <option value="Groceries">Supermercado</option>
                    <option value="Money Transfer">Transferência</option>
                    <option value="Utilities">Serviços Públicos</option>
                    <option value="Other">Outras Despesas</option>
                  </>
                )}
              </select>
              {suggestedByIA && (
                <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono mt-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  Sugerido
                </span>
              )}
            </div>

            {/* Recurrency toggle and details */}
            <div className="border-t border-white/5 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                    <Repeat className="w-3.5 h-3.5 text-amber-500" />
                    Transação Recorrente
                  </span>
                  <p className="text-[9px] text-gray-500 font-sans">
                    Repetir automaticamente este lançamento no fluxo de caixa
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRecurring(!isRecurring)}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isRecurring ? 'bg-amber-500' : 'bg-white/10'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      isRecurring ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {isRecurring && (
                <div className="grid grid-cols-2 gap-4 animate-fadeIn">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[9px] uppercase font-bold tracking-[0.25em] text-gray-400">
                      Frequência
                    </label>
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value as any)}
                      className="w-full bg-[#141414] border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-[#6B6B6B] cursor-pointer"
                    >
                      <option value="weekly">Semanal</option>
                      <option value="monthly">Mensal</option>
                      <option value="quarterly">Trimestral</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-[9px] uppercase font-bold tracking-[0.25em] text-gray-400">
                      Próxima Ocorrência
                    </label>
                    <div className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 px-3 text-xs text-amber-500 font-mono flex items-center h-10">
                      {calculateNextOccurrence(date, frequency) ? (
                        <span>
                          {calculateNextOccurrence(date, frequency).split('-').reverse().join('/')}
                        </span>
                      ) : (
                        <span className="text-gray-500">--</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center px-4 py-3 bg-white text-black hover:bg-gray-200 font-medium rounded-lg transition-colors cursor-pointer mt-4 text-sm"
          >
            Salvar Lançamento
          </button>
        </form>
      </div>
    </div>
  );
}
