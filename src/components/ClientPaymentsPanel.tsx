/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { CreditCard, Repeat, ExternalLink, Loader2 } from 'lucide-react';
import type { Client } from '../types';

interface ClientPaymentRow {
  id: string;
  client_id: string;
  payment_type: 'recurring' | 'implementation';
  installment_number: number;
  total_installments: number;
  amount: number;
  due_date: string | null;
  paid_at: string | null;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  invoice_url?: string | null;
  billing_type?: string | null;
  notes?: string;
}

interface ClientPaymentsPanelProps {
  client: Client;
  isDark: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  overdue: 'Vencido',
  cancelled: 'Cancelado',
};

const STATUS_CLASS: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-500',
  paid: 'bg-emerald-500/10 text-emerald-500',
  overdue: 'bg-red-500/10 text-red-500',
  cancelled: 'bg-gray-500/10 text-gray-500',
};

export default function ClientPaymentsPanel({ client, isDark }: ClientPaymentsPanelProps) {
  const [payments, setPayments] = useState<ClientPaymentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [formMode, setFormMode] = useState<'none' | 'charge' | 'subscription'>('none');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().substring(0, 10));
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const hasCpfCnpj = Boolean(client.cpf_cnpj && client.cpf_cnpj.trim());

  const loadPayments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/client-payments/${client.id}`);
      if (res.ok) setPayments(await res.json());
    } catch (err) {
      console.warn('Falha ao carregar cobranças Asaas do cliente:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.id]);

  const openForm = (mode: 'charge' | 'subscription') => {
    setFormMode(mode);
    setAmount(client.contract_value ? String(client.contract_value) : '');
    setDueDate(new Date().toISOString().substring(0, 10));
    setDescription(mode === 'subscription' ? `Mensalidade — ${client.name}` : `Cobrança — ${client.name}`);
    setError('');
  };

  const submit = async () => {
    if (!amount || Number(amount) <= 0 || !dueDate) {
      setError('Informe um valor e uma data válidos.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const endpoint = formMode === 'subscription' ? '/api/asaas/subscriptions' : '/api/asaas/charges';
      const body =
        formMode === 'subscription'
          ? { client_id: client.id, amount: Number(amount), next_due_date: dueDate, description }
          : { client_id: client.id, amount: Number(amount), due_date: dueDate, description };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao gerar cobrança no Asaas');
      setFormMode('none');
      await loadPayments();
    } catch (err: any) {
      setError(err.message || 'Falha ao gerar cobrança no Asaas');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`mt-4 pt-4 border-t ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
      <div className="flex flex-wrap justify-between items-center gap-2 pb-2">
        <h4 className={`text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          <CreditCard className="w-3.5 h-3.5" />
          Cobranças Asaas
        </h4>
        <div className="flex gap-2">
          <button
            onClick={() => openForm('charge')}
            className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1.5 rounded-lg transition-colors ${
              isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-900 text-white keep-white hover:bg-gray-700'
            }`}
          >
            Gerar cobrança
          </button>
          <button
            onClick={() => openForm('subscription')}
            className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${
              isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            <Repeat className="w-3 h-3" />
            Gerar assinatura
          </button>
        </div>
      </div>

      {!hasCpfCnpj && (
        <p className="text-[10px] italic text-amber-500 pb-2">
          Cadastre o CPF/CNPJ na ficha do cliente antes de gerar a primeira cobrança — o Asaas exige esse dado.
        </p>
      )}

      {formMode !== 'none' && (
        <div className={`mb-3 p-3 rounded-lg border space-y-2 ${isDark ? 'bg-[#161616] border-white/10' : 'bg-gray-50 border-gray-200'}`}>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Valor R$"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`px-2.5 py-1.5 rounded text-xs border outline-none font-mono ${
                isDark ? 'bg-black/50 border-white/10 text-white' : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={`px-2.5 py-1.5 rounded text-xs border outline-none font-mono ${
                isDark ? 'bg-black/50 border-white/10 text-white' : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>
          <input
            type="text"
            placeholder="Descrição da cobrança"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`w-full px-2.5 py-1.5 rounded text-xs border outline-none ${
              isDark ? 'bg-black/50 border-white/10 text-white' : 'bg-white border-gray-300 text-gray-900'
            }`}
          />
          {error && <p className="text-[10px] text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={submitting || !hasCpfCnpj}
              className={`flex-1 py-1.5 rounded text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer disabled:opacity-50 ${
                isDark ? 'bg-white text-black hover:bg-neutral-200' : 'bg-black text-white keep-white hover:bg-gray-800'
              }`}
            >
              {submitting ? 'Gerando...' : formMode === 'subscription' ? 'Criar assinatura' : 'Criar cobrança'}
            </button>
            <button
              onClick={() => setFormMode('none')}
              className={`px-3 py-1.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'
              }`}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-4 flex items-center justify-center text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      ) : payments.length > 0 ? (
        <div className={`divide-y max-h-[180px] overflow-y-auto ${isDark ? 'divide-white/5' : 'divide-gray-100'}`}>
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-2 text-xs">
              <div className="flex flex-col min-w-0 pr-2">
                <span className={`font-mono ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  R$ {Number(p.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  {p.total_installments > 1 ? ` (${p.installment_number}/${p.total_installments})` : ''}
                </span>
                <span className="text-[10px] text-gray-500">
                  Vencimento: {p.due_date ? new Date(p.due_date).toLocaleDateString('pt-BR') : '--'}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${STATUS_CLASS[p.status] || STATUS_CLASS.pending}`}>
                  {STATUS_LABEL[p.status] || p.status}
                </span>
                {p.invoice_url && (
                  <a
                    href={p.invoice_url}
                    target="_blank"
                    rel="noreferrer"
                    title="Abrir fatura no Asaas"
                    className="text-gray-500 hover:text-zinc-400 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-3 text-center text-[10px] italic text-gray-500">
          Nenhuma cobrança Asaas gerada pra este cliente ainda.
        </p>
      )}
    </div>
  );
}
