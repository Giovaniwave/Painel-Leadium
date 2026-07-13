import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, X, Search, Receipt, CheckCircle, Clock, UploadCloud, Building2, Trash2,
  Wallet, TrendingDown, FileText, PieChart, Activity, ChevronLeft, ChevronRight,
  ChevronDown, ArrowUpRight, ArrowDownLeft, MoreVertical, Layers, RefreshCw
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

interface GeneralExpense {
  id: string;
  date: string;
  clientId: string;
  description: string;
  amount: number;
  status: 'pending' | 'reimbursed';
  billingType: 'monthly_fee' | 'separate';
  category?: string;
  notes?: string;
  receiptImage?: string;
}

interface Client {
  id: string;
  name: string;
}

interface GeneralExpensesViewProps {
  theme?: 'dark' | 'light';
  clients: Client[];
}

const CATEGORIES = ['Marketing', 'Infraestrutura', 'Software', 'Serviços', 'Outros'];
const PAGE_SIZE = 6;

const EMPTY_FORM: Partial<GeneralExpense> = {
  status: 'pending',
  billingType: 'separate',
  category: 'Outros'
};

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(val || 0);

export default function GeneralExpensesView({ theme, clients }: GeneralExpensesViewProps) {
  const isDark = theme !== 'light';
  const [expenses, setExpenses] = useState<GeneralExpense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'reimbursed'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [page, setPage] = useState(1);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<GeneralExpense>>(EMPTY_FORM);

  useEffect(() => { fetchExpenses(); }, []);

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/general-expenses');
      if (res.ok) setExpenses(await res.json());
    } catch (err) {
      console.error('Failed to fetch general expenses', err);
    } finally {
      setIsLoading(false);
    }
  };

  const openNewForm = () => {
    setFormData({ ...EMPTY_FORM, date: new Date().toISOString().split('T')[0] });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setFormData(EMPTY_FORM);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/general-expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        await fetchExpenses();
        closeForm();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleStatus = async (expense: GeneralExpense) => {
    try {
      const newStatus = expense.status === 'pending' ? 'reimbursed' : 'pending';
      const res = await fetch('/api/general-expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...expense, status: newStatus })
      });
      if (res.ok) fetchExpenses();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteExpense = async (id: string) => {
    setExpenses(prev => (prev || []).filter(e => String(e.id) !== String(id)));
    try {
      const res = await fetch(`/api/general-expenses/${id}`, { method: 'DELETE' });
      if (res.ok) fetchExpenses();
    } catch (err) {
      console.error(err);
    }
  };

  const clientName = (clientId: string) =>
    clientId === 'leadium' ? 'Leadium (Interno)' : (clients.find(c => c.id === clientId)?.name || '--');

  const handleReceiptFile = (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result) {
        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: event.target.result as string, filename: file.name })
          });
          const data = await res.json();
          if (data.url) setFormData(prev => ({ ...prev, receiptImage: data.url }));
          else alert('Erro no upload: ' + (data.error || 'Erro desconhecido'));
        } catch (err: any) {
          console.error(err);
          alert('Falha ao enviar imagem');
        }
      }
    };
    reader.readAsDataURL(file);
  };

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

  const ramp = ['#22c55e', '#3b82f6', '#f59e0b', '#a855f7', '#ef4444', '#06b6d4'];

  const monthKey = (d: string) => (d || '').slice(0, 7);
  const nowKey = new Date().toISOString().slice(0, 7);
  const prevKey = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7);
  })();

  // ---- KPIs ----
  const stats = useMemo(() => {
    const inMonth = (mk: string) => expenses.filter(e => monthKey(e.date) === mk);
    const sum = (arr: GeneralExpense[]) => arr.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const totalMonth = sum(inMonth(nowKey));
    const totalPrev = sum(inMonth(prevKey));
    const paid = sum(expenses.filter(e => e.status === 'reimbursed'));
    const pending = sum(expenses.filter(e => e.status === 'pending'));
    const onMonthlyFee = sum(expenses.filter(e => e.billingType === 'monthly_fee'));
    const delta = totalPrev === 0 ? null : Math.round(((totalMonth - totalPrev) / totalPrev) * 100);
    return { totalMonth, paid, pending, onMonthlyFee, count: expenses.length, delta };
  }, [expenses]);

  // ---- Category breakdown (donut) ----
  const categoryBreakdown = useMemo(() => {
    const groups: Record<string, number> = {};
    let total = 0;
    expenses.forEach(e => {
      const key = e.category || 'Outros';
      groups[key] = (groups[key] || 0) + (Number(e.amount) || 0);
      total += Number(e.amount) || 0;
    });
    const entries = Object.entries(groups)
      .map(([name, value]) => ({ name, value, percentage: total === 0 ? 0 : Math.round((value / total) * 100) }))
      .sort((a, b) => b.value - a.value);
    return { entries, total };
  }, [expenses]);

  // ---- Monthly evolution (last 6 months) ----
  const evolution = useMemo(() => {
    const months: { key: string; label: string; value: number }[] = [];
    const short = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: d.toISOString().slice(0, 7), label: `${short[d.getMonth()]}/${d.getFullYear()}`, value: 0 });
    }
    expenses.forEach(e => {
      const entry = months.find(m => m.key === monthKey(e.date));
      if (entry) entry.value += Number(e.amount) || 0;
    });
    return months;
  }, [expenses]);

  // ---- Filtering + pagination ----
  const filtered = useMemo(() => {
    return expenses
      .filter(e => {
        const q = search.toLowerCase();
        const matchesSearch =
          e.description.toLowerCase().includes(q) ||
          clientName(e.clientId).toLowerCase().includes(q) ||
          (e.category || '').toLowerCase().includes(q);
        const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, search, statusFilter, clients]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => { setPage(1); }, [search, statusFilter]);
  const pageClamped = Math.min(page, totalPages);
  const pageItems = filtered.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE);

  const pendingList = useMemo(
    () => expenses.filter(e => e.status === 'pending').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [expenses]
  );

  const EvoTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div className={`px-3 py-2 rounded-lg border text-[11px] font-mono ${isDark ? 'bg-[#161616] border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
        <p className="font-bold mb-1 uppercase tracking-wider text-[9px]">{label}</p>
        <p className="flex justify-between gap-4"><span className={t.textMuted}>Despesas:</span><span className="font-bold">{formatCurrency(payload[0].value)}</span></p>
      </div>
    );
  };

  const kpis = [
    { key: 'total', label: 'Total de Despesas (Mês)', value: formatCurrency(stats.totalMonth), icon: TrendingDown, delta: stats.delta },
    { key: 'paid', label: 'Despesas Pagas', value: formatCurrency(stats.paid), icon: CheckCircle, delta: null },
    { key: 'pending', label: 'Despesas Pendentes', value: formatCurrency(stats.pending), icon: Clock, delta: null },
    { key: 'fee', label: 'Na Mensalidade', value: formatCurrency(stats.onMonthlyFee), icon: RefreshCw, delta: null },
    { key: 'count', label: 'Total de Despesas', value: String(stats.count), icon: FileText, delta: null }
  ];

  const inputCls = `w-full p-2.5 text-sm rounded-lg border outline-none ${t.inputBg} ${t.inputBorder} ${t.textPrimary} focus:border-current`;

  return (
    <div className="space-y-8 py-4 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className={`text-3xl sm:text-4xl font-bold tracking-tight ${t.textPrimary}`}>Despesas Gerais</h2>
          <p className={`text-sm mt-1 ${t.textMuted}`}>Controle completo das despesas do negócio</p>
        </div>
        <button
          onClick={() => (isFormOpen ? closeForm() : openNewForm())}
          className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
            isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white keep-white hover:bg-gray-800'
          }`}
        >
          {isFormOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {isFormOpen ? 'Cancelar' : 'Nova Despesa'}
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map(card => {
          const Icon = card.icon;
          const up = (card.delta ?? 0) >= 0;
          return (
            <div key={card.key} className={`rounded-2xl border p-5 ${t.cardBg} ${t.cardBorder}`}>
              <div className="flex items-start justify-between mb-3">
                <span className={`text-[10px] uppercase tracking-[0.14em] font-bold ${t.textMuted}`}>{card.label}</span>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-100 border-black/5 text-gray-900'}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <h3 className={`text-xl font-bold tracking-tight ${t.textPrimary}`}>{card.value}</h3>
              {card.delta !== null && (
                <p className={`text-[11px] font-mono mt-2 flex items-center gap-1 ${t.textMuted}`}>
                  {up ? <ArrowUpRight className={`w-3.5 h-3.5 ${isDark ? 'text-white/70' : 'text-gray-700'}`} /> : <ArrowDownLeft className={`w-3.5 h-3.5 ${isDark ? 'text-white/70' : 'text-gray-700'}`} />}
                  <span className={t.textPrimary}>{up ? '+' : ''}{card.delta}%</span>
                  <span className={t.textFaint}>vs mês anterior</span>
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Inline form */}
      {isFormOpen && (
        <form onSubmit={handleSubmit} className={`rounded-2xl border p-5 sm:p-6 space-y-4 animate-fadeIn ${t.cardBg} ${t.cardBorder}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={`text-[10px] uppercase font-mono ${t.textMuted}`}>Cliente / Destino</label>
              <select required value={formData.clientId || ''} onChange={(e) => setFormData({ ...formData, clientId: e.target.value })} className={inputCls}>
                <option value="" disabled>Selecione um cliente...</option>
                <option value="leadium">Leadium (Interno)</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className={`text-[10px] uppercase font-mono ${t.textMuted}`}>Descrição do gasto</label>
              <input type="text" required value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Ex: Assinatura Google Workspace" className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className={`text-[10px] uppercase font-mono ${t.textMuted}`}>Data</label>
              <input type="date" required value={formData.date || ''} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className={`text-[10px] uppercase font-mono ${t.textMuted}`}>Valor (R$)</label>
              <input type="number" step="0.01" required value={formData.amount || ''} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })} placeholder="0.00" className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className={`text-[10px] uppercase font-mono ${t.textMuted}`}>Categoria</label>
              <select value={formData.category || 'Outros'} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className={inputCls}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className={`text-[10px] uppercase font-mono ${t.textMuted}`}>Status</label>
              <select value={formData.status || 'pending'} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className={inputCls}>
                <option value="pending">Pendente</option>
                <option value="reimbursed">Paga</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={`text-[10px] uppercase font-mono ${t.textMuted}`}>Modo de Cobrança</label>
              <select value={formData.billingType || 'separate'} onChange={(e) => setFormData({ ...formData, billingType: e.target.value as any })} className={inputCls}>
                <option value="separate">Cobrar Avulso</option>
                <option value="monthly_fee">Incluir na Mensalidade</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className={`text-[10px] uppercase font-mono ${t.textMuted}`}>Comprovante (URL / Link)</label>
              <div className="flex gap-2">
                <input type="text" value={formData.receiptImage || ''} onChange={(e) => setFormData({ ...formData, receiptImage: e.target.value })} placeholder="https://... ou arraste abaixo" className={inputCls} />
                {formData.receiptImage && (
                  <button type="button" onClick={() => setFormData({ ...formData, receiptImage: '' })} className={`px-3 text-xs uppercase font-mono font-bold rounded-lg border transition ${isDark ? 'border-white/10 text-white hover:bg-white/5' : 'border-black/10 text-gray-900 hover:bg-gray-50'}`}>Limpar</button>
                )}
              </div>
            </div>
          </div>

          <div
            className={`border border-dashed rounded-lg p-3 text-center cursor-pointer transition ${t.inputBorder} ${isDark ? 'hover:border-white/40 bg-white/[0.02]' : 'hover:border-black/40 bg-gray-50/50'}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) handleReceiptFile(file); }}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file'; input.accept = 'image/*';
              input.onchange = (e: any) => { const file = e.target.files[0]; if (file) handleReceiptFile(file); };
              input.click();
            }}
          >
            <UploadCloud className={`w-5 h-5 mx-auto mb-1 ${t.textFaint}`} />
            <p className={`text-[10px] font-mono ${t.textMuted}`}>Arraste a foto ou clique para fazer upload</p>
          </div>

          <div className="space-y-1">
            <label className={`text-[10px] uppercase font-mono ${t.textMuted}`}>Observações adicionais</label>
            <textarea value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Detalhes (Opcional)..." className={`${inputCls} resize-none h-16`} />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={closeForm} className={`flex-1 py-2.5 text-xs font-mono uppercase border rounded-lg transition ${t.cardBorder} ${t.textMuted} ${t.rowHover}`}>Cancelar</button>
            <button type="submit" className={`flex-1 py-2.5 text-xs font-bold font-mono uppercase tracking-wider rounded-lg transition-colors ${isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white keep-white hover:bg-gray-800'}`}>Salvar Despesa</button>
          </div>
        </form>
      )}

      {/* Main grid: table + right column */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Table card */}
        <div className={`xl:col-span-2 rounded-2xl border overflow-hidden ${t.cardBg} ${t.cardBorder}`}>
          <div className={`p-5 border-b space-y-1 ${t.cardBorder}`}>
            <h3 className={`text-sm font-bold ${t.textPrimary}`}>Despesas</h3>
            <p className={`text-xs ${t.textMuted}`}>Lista de todas as despesas registradas</p>
          </div>

          {/* Filters */}
          <div className={`flex flex-col sm:flex-row gap-3 p-5 border-b ${t.cardBorder}`}>
            <div className="relative flex-1">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${t.textFaint}`} />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar despesa ou cliente..." className={`w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border outline-none ${t.inputBg} ${t.inputBorder} ${t.textPrimary}`} />
            </div>
            <div className={`relative flex items-center gap-2 border rounded-xl px-3 sm:w-48 ${t.inputBg} ${t.inputBorder}`}>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className={`w-full bg-transparent text-sm py-2.5 appearance-none cursor-pointer focus:outline-none ${t.textPrimary}`}>
                <option value="all">Todos os status</option>
                <option value="pending">Pendentes</option>
                <option value="reimbursed">Pagas</option>
              </select>
              <ChevronDown className={`w-4 h-4 shrink-0 pointer-events-none ${t.textFaint}`} />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[680px]">
              <thead>
                <tr className={`text-[9px] uppercase tracking-[0.18em] font-bold ${t.textMuted} border-b ${t.cardBorder}`}>
                  <th className="py-3 px-5">Data</th>
                  <th className="py-3 px-5">Despesa</th>
                  <th className="py-3 px-5">Categoria</th>
                  <th className="py-3 px-5">Cliente / Setor</th>
                  <th className="py-3 px-5 text-right">Valor</th>
                  <th className="py-3 px-5 text-center">Status</th>
                  <th className="py-3 px-5 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${t.divide}`}>
                {pageItems.length === 0 ? (
                  <tr><td colSpan={7} className={`py-14 text-center text-sm ${t.textMuted}`}>Nenhuma despesa encontrada.</td></tr>
                ) : (
                  pageItems.map(exp => {
                    const isPaid = exp.status === 'reimbursed';
                    const [y, m, d] = (exp.date || '').slice(0, 10).split('-');
                    const monthAbbr = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'][parseInt(m, 10) - 1] || '';
                    return (
                      <tr key={exp.id} className={`transition-colors ${t.rowHover}`}>
                        <td className="py-4 px-5 whitespace-nowrap">
                          <span className={`text-sm font-semibold tabular-nums ${t.textPrimary}`}>{d || '--'} {monthAbbr} {y}</span>
                        </td>
                        <td className="py-4 px-5 max-w-[200px]">
                          <span className={`text-sm font-semibold block truncate ${t.textPrimary}`}>{exp.description}</span>
                          {exp.notes && <span className={`text-[11px] block truncate ${t.textFaint}`}>{exp.notes}</span>}
                        </td>
                        <td className="py-4 px-5">
                          <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${isDark ? 'border-white/10 text-gray-300' : 'border-black/10 text-gray-700'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-white/60' : 'bg-black/50'}`} />
                            {exp.category || 'Outros'}
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <span className={`text-sm block ${t.textPrimary}`}>{clientName(exp.clientId)}</span>
                          <span className={`text-[11px] ${t.textFaint}`}>{exp.billingType === 'monthly_fee' ? 'Na mensalidade' : 'Avulso'}</span>
                        </td>
                        <td className="py-4 px-5 text-right">
                          <span className={`font-mono font-bold text-sm ${t.textPrimary}`}>{formatCurrency(exp.amount)}</span>
                        </td>
                        <td className="py-4 px-5 text-center">
                          <button
                            onClick={() => handleToggleStatus(exp)}
                            title="Alternar status"
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold border transition-colors ${
                              isPaid
                                ? (isDark ? 'bg-white/10 border-white/15 text-white' : 'bg-black/5 border-black/10 text-gray-900')
                                : (isDark ? 'bg-transparent border-white/15 text-gray-400' : 'bg-transparent border-black/15 text-gray-500')
                            }`}
                          >
                            {isPaid ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {isPaid ? 'Paga' : 'Pendente'}
                          </button>
                        </td>
                        <td className="py-4 px-5 text-center relative">
                          {deletingId === exp.id ? (
                            <div className="flex items-center justify-center gap-1.5 animate-fadeIn">
                              <button onClick={() => { deleteExpense(exp.id); setDeletingId(null); }} className={`text-[10px] uppercase font-mono font-bold px-2 py-1 rounded border ${t.cardBorder} ${t.textPrimary} ${t.rowHover}`}>Confirmar?</button>
                              <button onClick={() => setDeletingId(null)} className={`text-[10px] uppercase font-mono font-bold ${t.textFaint} hover:underline`}>Não</button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={(event) => {
                                  if (openMenuId === exp.id) {
                                    setOpenMenuId(null);
                                    return;
                                  }
                                  const rect = event.currentTarget.getBoundingClientRect();
                                  const menuWidth = 170;
                                  const menuHeight = exp.receiptImage ? 118 : 82;
                                  const opensUpward = rect.bottom + menuHeight + 8 > window.innerHeight;
                                  setMenuPosition({
                                    top: opensUpward ? Math.max(8, rect.top - menuHeight - 6) : rect.bottom + 6,
                                    left: Math.max(8, Math.min(window.innerWidth - menuWidth - 8, rect.right - menuWidth))
                                  });
                                  setOpenMenuId(exp.id);
                                }}
                                className={`p-1.5 rounded-lg transition-colors ${t.rowHover} ${t.textMuted}`}
                                aria-label="Ações"
                                aria-expanded={openMenuId === exp.id}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                              {openMenuId === exp.id && createPortal(
                                <>
                                  <div className="fixed inset-0 z-[9998]" onClick={() => setOpenMenuId(null)} />
                                  <div
                                    className={`fixed z-[9999] w-[170px] rounded-xl border py-1.5 shadow-2xl ${isDark ? 'bg-[#161616] border-white/10' : 'bg-white border-black/10'}`}
                                    style={{ top: menuPosition.top, left: menuPosition.left }}
                                    role="menu"
                                  >
                                    <button onClick={() => { handleToggleStatus(exp); setOpenMenuId(null); }} className={`w-full flex items-center gap-2 px-3 py-2 text-xs ${t.textPrimary} ${t.rowHover}`}>
                                      <CheckCircle className="w-3.5 h-3.5" /> {isPaid ? 'Marcar pendente' : 'Marcar paga'}
                                    </button>
                                    {exp.receiptImage && (
                                      <a href={exp.receiptImage} target="_blank" rel="noopener noreferrer" onClick={() => setOpenMenuId(null)} className={`w-full flex items-center gap-2 px-3 py-2 text-xs ${t.textPrimary} ${t.rowHover}`}>
                                        <Receipt className="w-3.5 h-3.5" /> Comprovante
                                      </a>
                                    )}
                                    <button onClick={() => { setDeletingId(exp.id); setOpenMenuId(null); }} className={`w-full flex items-center gap-2 px-3 py-2 text-xs ${t.textPrimary} ${t.rowHover}`}>
                                      <Trash2 className="w-3.5 h-3.5" /> Excluir
                                    </button>
                                  </div>
                                </>,
                                document.body
                              )}
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
          <div className={`flex items-center justify-between px-5 py-4 border-t ${t.cardBorder}`}>
            <span className={`text-xs ${t.textMuted}`}>
              Mostrando {filtered.length === 0 ? 0 : (pageClamped - 1) * PAGE_SIZE + 1} a {Math.min(pageClamped * PAGE_SIZE, filtered.length)} de {filtered.length} despesas
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={pageClamped <= 1} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${t.cardBorder} ${t.textMuted} ${t.rowHover}`}><ChevronLeft className="w-3.5 h-3.5" /> Anterior</button>
              <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${isDark ? 'border-white/20 text-white' : 'border-black/20 text-black'}`}>{pageClamped}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={pageClamped >= totalPages} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${t.cardBorder} ${t.textMuted} ${t.rowHover}`}>Próximo <ChevronRight className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Donut */}
          <div className={`rounded-2xl border p-6 ${t.cardBg} ${t.cardBorder}`}>
            <h3 className={`text-sm font-bold flex items-center gap-2 mb-5 ${t.textPrimary}`}>
              <PieChart className={`w-4 h-4 ${isDark ? 'text-white/70' : 'text-gray-700'}`} /> Despesas por Categoria
            </h3>
            {categoryBreakdown.entries.length === 0 ? (
              <div className={`h-40 flex flex-col items-center justify-center text-xs ${t.textMuted}`}><Activity className="w-6 h-6 mb-2 opacity-50" />Nenhuma despesa registrada.</div>
            ) : (
              <div className="flex items-center gap-5">
                <div className="relative w-32 h-32 shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke={isDark ? '#222' : '#E5E7EB'} strokeWidth="10" />
                    {categoryBreakdown.entries.slice(0, 6).reduce((acc, cat, idx) => {
                      const circ = 251.2;
                      const pct = categoryBreakdown.total === 0 ? 0 : (cat.value / categoryBreakdown.total) * 100;
                      const len = (circ * pct) / 100;
                      const offset = circ - len + acc.running;
                      acc.nodes.push(<circle key={cat.name} cx="50" cy="50" r="40" fill="transparent" stroke={ramp[idx % ramp.length]} strokeWidth="10" strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={-acc.running} />);
                      acc.running -= len;
                      return acc;
                    }, { nodes: [] as React.ReactNode[], running: 0 }).nodes}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className={`text-sm font-bold ${t.textPrimary}`}>{formatCurrency(categoryBreakdown.total)}</span>
                    <span className={`text-[8px] uppercase tracking-widest ${t.textFaint}`}>Total</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2.5">
                  {categoryBreakdown.entries.slice(0, 5).map((cat, idx) => (
                    <div key={cat.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: ramp[idx % ramp.length] }} />
                        <span className={`truncate ${t.textMuted}`}>{cat.name}</span>
                      </div>
                      <span className={`font-mono shrink-0 ${t.textPrimary}`}>{formatCurrency(cat.value)} <span className={t.textFaint}>({cat.percentage}%)</span></span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Pending list */}
          <div className={`rounded-2xl border p-6 ${t.cardBg} ${t.cardBorder}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-sm font-bold flex items-center gap-2 ${t.textPrimary}`}>
                <Clock className={`w-4 h-4 ${isDark ? 'text-white/70' : 'text-gray-700'}`} /> Despesas Pendentes
              </h3>
              <span className={`text-[11px] font-mono ${t.textFaint}`}>{pendingList.length}</span>
            </div>
            {pendingList.length === 0 ? (
              <div className={`py-6 text-center text-xs ${t.textMuted}`}>Nenhuma despesa pendente. 🎉</div>
            ) : (
              <div className="space-y-3">
                {pendingList.slice(0, 5).map(exp => (
                  <div key={exp.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className={`text-sm font-semibold block truncate ${t.textPrimary}`}>{exp.description}</span>
                      <span className={`text-[11px] ${t.textFaint}`}>{clientName(exp.clientId)} • {exp.category || 'Outros'}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`font-mono font-bold text-sm block ${t.textPrimary}`}>{formatCurrency(exp.amount)}</span>
                      <span className={`text-[10px] font-mono ${t.textFaint}`}>{new Date(exp.date).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Evolution chart */}
      <div className={`rounded-2xl border p-6 ${t.cardBg} ${t.cardBorder}`}>
        <div className="mb-4">
          <h3 className={`text-sm font-bold flex items-center gap-2 ${t.textPrimary}`}>
            <Activity className={`w-4 h-4 ${isDark ? 'text-white/70' : 'text-gray-700'}`} /> Evolução de Despesas
          </h3>
          <p className={`text-xs mt-0.5 ${t.textMuted}`}>Comparativo mensal dos últimos 6 meses</p>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={evolution} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="expEvo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={t.accent} stopOpacity={isDark ? 0.35 : 0.18} />
                  <stop offset="100%" stopColor={t.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} vertical={false} />
              <XAxis dataKey="label" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v >= 1000 ? (v / 1000) + 'k' : v}`} />
              <Tooltip content={<EvoTooltip />} cursor={{ stroke: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }} />
              <Area type="monotone" dataKey="value" name="value" stroke={t.accent} strokeWidth={2.5} fill="url(#expEvo)" dot={{ r: 3, fill: t.accent }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
