import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus, X, Search, FileText, CheckCircle, Clock, UploadCloud, HandCoins,
  Building2, Trash2, Download, MoreHorizontal, ThumbsUp, XCircle,
  DollarSign, CreditCard, Layers, ChevronLeft, ChevronRight
} from 'lucide-react';

interface Reimbursement {
  id: string;
  date: string;
  employeeId: string;
  description: string;
  amount: number;
  expenseType: 'fixed' | 'one_off';
  category: string;
  clientId?: string;
  status: string;
  receiptFile?: string;
  notes?: string;
}

interface Employee {
  id: string;
  name: string;
}

interface Client {
  id: string;
  name: string;
}

interface ReimbursementViewProps {
  theme?: 'dark' | 'light';
  clients: Client[];
}

// Canonical status workflow. The backend stores `status` as a free string, so we
// normalize both the new keys and the legacy values ('pending'/'reimbursed').
type StatusKey = 'analise' | 'aprovado' | 'pago' | 'recusado';

const STATUS_ORDER: StatusKey[] = ['pago', 'analise', 'aprovado', 'recusado'];

const STATUS_META: Record<StatusKey, {
  label: string;
  hex: string;               // donut / legend accent
  badge: (dark: boolean) => string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  pago: {
    label: 'Pago',
    hex: '#34d399',
    badge: (d) => (d ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-800'),
    icon: CheckCircle
  },
  analise: {
    label: 'Em análise',
    hex: '#fbbf24',
    badge: (d) => (d ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-800'),
    icon: Clock
  },
  aprovado: {
    label: 'Aprovado',
    hex: '#60a5fa',
    badge: (d) => (d ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800'),
    icon: ThumbsUp
  },
  recusado: {
    label: 'Recusado',
    hex: '#f87171',
    badge: (d) => (d ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-800'),
    icon: XCircle
  }
};

const normalizeStatus = (raw?: string): StatusKey => {
  const s = (raw || '').toLowerCase();
  if (['pago', 'reimbursed', 'paid'].includes(s)) return 'pago';
  if (['aprovado', 'approved'].includes(s)) return 'aprovado';
  if (['recusado', 'rejected', 'rejeitado'].includes(s)) return 'recusado';
  return 'analise'; // includes 'pending' and anything unknown
};

const EMPTY_FORM: Partial<Reimbursement> = {
  status: 'analise',
  expenseType: 'one_off'
};

const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const monthKey = (dateStr: string) => (dateStr || '').slice(0, 7); // YYYY-MM

// Uploaded receipts are stored as "<uuid>-<original-filename>" so the URL stays
// unique; strip the uuid prefix back off when showing the name to the user.
const getReceiptDisplayName = (url?: string) => {
  if (!url) return '';
  const name = decodeURIComponent(url.split('/').pop() || '');
  return name.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i, '');
};

const PAGE_SIZE = 6;

export default function ReimbursementView({ theme, clients }: ReimbursementViewProps) {
  const isDark = theme !== 'light';
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeTab, setActiveTab] = useState<'todos' | StatusKey>('todos');
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Reimbursement>>(EMPTY_FORM);
  const [isUploading, setIsUploading] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchReimbursements();
    fetchEmployees();
  }, []);

  // Close the per-row action menu when clicking elsewhere.
  useEffect(() => {
    if (!openMenuId) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
        setConfirmDeleteId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenuId]);

  // Reset to first page whenever the working set changes.
  useEffect(() => setPage(1), [search, startDate, endDate, activeTab]);

  const fetchReimbursements = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/reimbursements');
      if (res.ok) setReimbursements(await res.json());
    } catch (err) {
      console.error('Failed to fetch reimbursements', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/expenses');
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
      }
    } catch (err) {
      console.error('Failed to fetch employees', err);
    }
  };

  const employeeName = (id: string) =>
    employees.find(e => e.id === id)?.name || 'Colaborador não encontrado';

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
      const res = await fetch('/api/reimbursements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        await fetchReimbursements();
        closeForm();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetStatus = async (reimbursement: Reimbursement, status: StatusKey) => {
    setOpenMenuId(null);
    // Optimistic update so the table reacts instantly.
    setReimbursements(prev => prev.map(r => (r.id === reimbursement.id ? { ...r, status } : r)));
    try {
      const res = await fetch('/api/reimbursements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...reimbursement, status })
      });
      if (res.ok) fetchReimbursements();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteReimbursement = async (id: string) => {
    setOpenMenuId(null);
    setConfirmDeleteId(null);
    setReimbursements(prev => (prev || []).filter(r => String(r.id) !== String(id)));
    try {
      const res = await fetch(`/api/reimbursements/${id}`, { method: 'DELETE' });
      if (res.ok) fetchReimbursements();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReceiptFile = (file: File) => {
    if (!file || file.type !== 'application/pdf') {
      alert('Apenas arquivos PDF são aceitos como comprovante.');
      return;
    }
    setIsUploading(true);
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
          if (data.url) setFormData(prev => ({ ...prev, receiptFile: data.url }));
          else alert('Erro no upload: ' + (data.error || 'Erro desconhecido'));
        } catch (err) {
          console.error(err);
          alert('Falha ao enviar o comprovante');
        } finally {
          setIsUploading(false);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // ---- Derived data --------------------------------------------------------

  // Filtered by search + date range (NOT by the status tab). Feeds the KPIs and
  // the right-hand summaries; the table applies the tab filter on top of this.
  const baseFiltered = useMemo(() => {
    const q = search.toLowerCase();
    return reimbursements.filter(r => {
      const matchesSearch =
        !q ||
        r.description.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        employeeName(r.employeeId).toLowerCase().includes(q);
      const afterStart = !startDate || r.date >= startDate;
      const beforeEnd = !endDate || r.date <= endDate;
      return matchesSearch && afterStart && beforeEnd;
    });
  }, [reimbursements, employees, search, startDate, endDate]);

  const stats = useMemo(() => {
    const thisMonth = new Date().toISOString().slice(0, 7);
    let monthTotal = 0;
    let paidTotal = 0;
    let analiseTotal = 0;
    const counts: Record<StatusKey, number> = { pago: 0, analise: 0, aprovado: 0, recusado: 0 };

    baseFiltered.forEach(r => {
      const s = normalizeStatus(r.status);
      counts[s]++;
      if (monthKey(r.date) === thisMonth) monthTotal += r.amount;
      if (s === 'pago') paidTotal += r.amount;
      if (s === 'analise') analiseTotal += r.amount;
    });

    return { monthTotal, paidTotal, analiseTotal, counts, total: baseFiltered.length };
  }, [baseFiltered]);

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    let total = 0;
    baseFiltered.forEach(r => {
      const cat = r.category || 'Sem categoria';
      map[cat] = (map[cat] || 0) + r.amount;
      total += r.amount;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value, pct: total ? Math.round((value / total) * 100) : 0 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [baseFiltered]);

  const recentActivity = useMemo(
    () => [...baseFiltered]
      .sort((a, b) => (b.date > a.date ? 1 : -1))
      .slice(0, 4),
    [baseFiltered]
  );

  const tableRows = useMemo(() => {
    const rows = activeTab === 'todos'
      ? baseFiltered
      : baseFiltered.filter(r => normalizeStatus(r.status) === activeTab);
    return [...rows].sort((a, b) => (b.date > a.date ? 1 : -1));
  }, [baseFiltered, activeTab]);

  const totalPages = Math.max(1, Math.ceil(tableRows.length / PAGE_SIZE));
  const pageRows = tableRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const exportCSV = () => {
    const header = ['Data', 'Descrição', 'Colaborador', 'Categoria', 'Valor', 'Status'];
    const lines = tableRows.map(r => [
      new Date(r.date).toLocaleDateString('pt-BR'),
      r.description,
      employeeName(r.employeeId),
      r.category,
      String(r.amount).replace('.', ','),
      STATUS_META[normalizeStatus(r.status)].label
    ].map(c => `"${String(c).replace(/"/g, '""')}"`).join(';'));
    const csv = [header.join(';'), ...lines].join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `reembolsos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---- Shared style tokens -------------------------------------------------
  const card = isDark
    ? 'bg-white/[0.02] border-white/5'
    : 'bg-white border-black/5 shadow-[0_4px_20px_rgba(0,0,0,0.03)]';
  const labelMuted = isDark ? 'text-neutral-400' : 'text-neutral-500';
  const heading = isDark ? 'text-neutral-50' : 'text-black';

  const kpiCards = [
    {
      key: 'month',
      label: 'Total Reembolsado (Mês)',
      value: brl(stats.monthTotal),
      icon: DollarSign,
      sub: `${new Date().toLocaleDateString('pt-BR', { month: 'long' })}`
    },
    {
      key: 'paid',
      label: 'Reembolsos Pagos',
      value: brl(stats.paidTotal),
      icon: CreditCard,
      sub: `${stats.counts.pago} solicitações`
    },
    {
      key: 'analise',
      label: 'Em Análise',
      value: brl(stats.analiseTotal),
      icon: Clock,
      sub: `${stats.counts.analise} aguardando`
    },
    {
      key: 'total',
      label: 'Total de Solicitações',
      value: String(stats.total),
      icon: Layers,
      sub: `${stats.counts.aprovado} aprovados`
    }
  ];

  const tabs: Array<{ key: 'todos' | StatusKey; label: string }> = [
    { key: 'todos', label: 'Todos' },
    { key: 'analise', label: 'Em Análise' },
    { key: 'aprovado', label: 'Aprovados' },
    { key: 'pago', label: 'Pagos' },
    { key: 'recusado', label: 'Recusados' }
  ];

  return (
    <div className={`${isDark ? 'text-neutral-200' : 'text-neutral-800'} px-3 sm:px-6 max-w-7xl mx-auto py-4 space-y-6 animate-fadeIn`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className={`text-2xl font-sans tracking-tight font-bold flex items-center gap-2.5 ${heading}`}>
            <HandCoins className="w-5 h-5" />
            <span>Reembolso</span>
          </h2>
          <p className={`text-xs ${labelMuted}`}>Solicitações e pagamentos de reembolso.</p>
        </div>
        <button
          onClick={() => (isFormOpen ? closeForm() : openNewForm())}
          className={`inline-flex cursor-pointer items-center justify-center rounded-lg border px-3.5 py-2 transition-colors text-[10px] font-normal uppercase tracking-[0.08em] ${
            isDark
              ? 'bg-white border-zinc-200 text-zinc-950 hover:bg-zinc-50'
              : 'bg-zinc-950 border-zinc-600 text-slate-200 hover:bg-zinc-900 keep-white text-keep-white'
          }`}
        >
          {isFormOpen ? 'Cancelar' : 'Novo Reembolso'}
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpiCards.map(c => {
          const Icon = c.icon;
          return (
            <div key={c.key} className={`rounded-2xl border p-4 sm:p-5 ${card}`}>
              <div className={`flex items-center gap-2 text-[9px] uppercase font-bold tracking-[0.15em] ${labelMuted}`}>
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                  <Icon className={`w-4 h-4 ${isDark ? 'text-white/70' : 'text-zinc-700'}`} />
                </span>
                <span className="truncate">{c.label}</span>
              </div>
              <h3 className={`mt-3 text-2xl sm:text-[1.7rem] font-bold tracking-tight leading-none ${heading}`}>
                {c.value}
              </h3>
              <p className={`mt-1.5 text-[10px] font-mono uppercase tracking-wider capitalize ${isDark ? 'text-zinc-500' : 'text-neutral-500'}`}>
                {c.sub}
              </p>
            </div>
          );
        })}
      </div>

      {/* Inline registration form */}
      {isFormOpen && (
        <form
          onSubmit={handleSubmit}
          className={`space-y-4 rounded-2xl border p-5 sm:p-6 animate-fadeIn ${card}`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono text-neutral-400">Colaborador</label>
              <select
                required
                value={formData.employeeId || ''}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className="w-full p-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white outline-none focus:border-[#FFFFFF]"
              >
                <option value="" disabled>Selecione um colaborador...</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono text-neutral-400">Descrição da despesa</label>
              <input
                type="text"
                required
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ex: Hospedagem do cliente, material de escritório..."
                className="w-full p-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-800 bg-transparent text-neutral-950 dark:text-white outline-none focus:border-[#FFFFFF]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono text-neutral-400">Data</label>
              <input
                type="date"
                required
                value={formData.date || ''}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full p-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-800 bg-transparent text-neutral-950 dark:text-white outline-none focus:border-[#FFFFFF]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono text-neutral-400">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                placeholder="0.00"
                className="w-full p-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-800 bg-transparent text-neutral-950 dark:text-white outline-none focus:border-[#FFFFFF]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono text-neutral-400">Tipo de despesa</label>
              <select
                value={formData.expenseType || 'one_off'}
                onChange={(e) => setFormData({ ...formData, expenseType: e.target.value as any })}
                className="w-full p-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white outline-none focus:border-[#FFFFFF]"
              >
                <option value="one_off">Avulsa</option>
                <option value="fixed">Despesa Fixa</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono text-neutral-400">Categoria</label>
              <input
                type="text"
                required
                value={formData.category || ''}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Ex: Alimentação, Transporte..."
                className="w-full p-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-800 bg-transparent text-neutral-950 dark:text-white outline-none focus:border-[#FFFFFF]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono text-neutral-400">Cliente vinculado (opcional)</label>
              <select
                value={formData.clientId || ''}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                className="w-full p-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white outline-none focus:border-[#FFFFFF]"
              >
                <option value="">Nenhum (interno)</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono text-neutral-400">Status</label>
              <select
                value={formData.status || 'analise'}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full p-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white outline-none focus:border-[#FFFFFF]"
              >
                {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-mono text-neutral-400">Comprovante (PDF)</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={isUploading ? 'Enviando...' : getReceiptDisplayName(formData.receiptFile)}
                placeholder="Nenhum arquivo enviado ainda"
                className="flex-1 p-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-800 bg-transparent text-neutral-950 dark:text-white outline-none"
              />
              {formData.receiptFile && !isUploading && (
                <>
                  <a
                    href={formData.receiptFile}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 flex items-center text-xs uppercase font-mono font-bold bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/20 rounded-lg transition"
                  >
                    Ver
                  </a>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, receiptFile: '' })}
                    className="px-3 text-xs uppercase font-mono font-bold bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg transition"
                  >
                    Limpar
                  </button>
                </>
              )}
            </div>

            <div
              className="border border-dashed border-neutral-300 dark:border-neutral-800 rounded-lg p-3 text-center cursor-pointer hover:border-[#FFFFFF] transition bg-neutral-50/50 dark:bg-neutral-900/25 mt-1"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) handleReceiptFile(file);
              }}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'application/pdf';
                input.onchange = (e: any) => {
                  const file = e.target.files[0];
                  if (file) handleReceiptFile(file);
                };
                input.click();
              }}
            >
              <UploadCloud className="w-5 h-5 mx-auto text-neutral-400 mb-1" />
              <p className="text-[10px] font-mono text-neutral-500">Arraste o PDF do comprovante ou clique para fazer upload</p>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-mono text-neutral-400">Observações adicionais</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Detalhes (Opcional)..."
              className="w-full p-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-800 bg-transparent text-neutral-950 dark:text-white outline-none resize-none h-16 focus:border-[#FFFFFF]"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={closeForm}
              className={`flex-1 py-2.5 text-xs font-mono uppercase border rounded-lg transition active:scale-95 ${
                isDark
                  ? 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800 hover:text-white'
                  : 'bg-neutral-100 border-neutral-200 text-neutral-700 hover:bg-neutral-200 font-bold'
              }`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className={`flex-1 inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border-[1.58px] px-5 py-2.5 font-medium shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl text-xs font-bold font-mono uppercase tracking-wider disabled:opacity-50 disabled:hover:translate-y-0 ${
                isDark
                  ? 'bg-white border-zinc-200 text-zinc-950 hover:bg-zinc-50'
                  : 'bg-zinc-950 border-zinc-600 text-slate-200 hover:bg-zinc-900 keep-white text-keep-white'
              }`}
            >
              Salvar Reembolso
            </button>
          </div>
        </form>
      )}

      {/* Main grid: table (left) + summary sidebar (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ---- Left: filters + table ---- */}
        <div className={`lg:col-span-8 rounded-2xl border ${card}`}>
          {/* Filter bar */}
          <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center gap-3 border-b border-black/5 dark:border-white/5">
            <div className="relative flex-1 min-w-0">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${labelMuted}`} />
              <input
                type="text"
                placeholder="Buscar por colaborador, descrição ou categoria..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full pl-9 pr-4 py-2 text-sm rounded-xl border outline-none ${
                  isDark
                    ? 'border-neutral-800 bg-neutral-900/60 text-white focus:border-white'
                    : 'border-neutral-200 bg-white text-black focus:border-black'
                }`}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                title="Data inicial"
                className={`px-2.5 py-2 text-xs rounded-xl border outline-none ${
                  isDark ? 'border-neutral-800 bg-neutral-900/60 text-white focus:border-white' : 'border-neutral-200 bg-white text-black focus:border-black'
                }`}
              />
              <span className={`text-xs ${labelMuted}`}>–</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                title="Data final"
                className={`px-2.5 py-2 text-xs rounded-xl border outline-none ${
                  isDark ? 'border-neutral-800 bg-neutral-900/60 text-white focus:border-white' : 'border-neutral-200 bg-white text-black focus:border-black'
                }`}
              />
              <button
                onClick={exportCSV}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider border transition active:scale-95 ${
                  isDark ? 'border-neutral-800 bg-neutral-900/60 text-neutral-200 hover:bg-neutral-800' : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                <Download className="w-3.5 h-3.5" /> Exportar
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-4 sm:px-5 pt-3 flex items-center gap-1 overflow-x-auto border-b border-black/5 dark:border-white/5">
            {tabs.map(t => {
              const active = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`px-3 py-2 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap border-b-2 -mb-px transition-colors ${
                    active
                      ? (isDark ? 'border-white text-white' : 'border-black text-black')
                      : `border-transparent ${labelMuted} hover:${isDark ? 'text-neutral-200' : 'text-neutral-700'}`
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Table */}
          {pageRows.length === 0 ? (
            <div className="py-16 text-center text-neutral-500 text-sm">Nenhum reembolso encontrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`text-[10px] uppercase font-bold tracking-wider ${labelMuted}`}>
                    <th className="text-left font-bold px-4 sm:px-5 py-3">Data</th>
                    <th className="text-left font-bold px-2 py-3">Solicitação</th>
                    <th className="text-left font-bold px-2 py-3 hidden sm:table-cell">Colaborador</th>
                    <th className="text-left font-bold px-2 py-3 hidden md:table-cell">Categoria</th>
                    <th className="text-right font-bold px-2 py-3">Valor</th>
                    <th className="text-left font-bold px-2 py-3">Status</th>
                    <th className="text-right font-bold px-4 sm:px-5 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {pageRows.map(r => {
                    const s = normalizeStatus(r.status);
                    const meta = STATUS_META[s];
                    const StatusIcon = meta.icon;
                    const d = new Date(r.date);
                    const clientName = r.clientId ? (clients.find(c => c.id === r.clientId)?.name || null) : null;
                    return (
                      <tr key={r.id} className={`transition-colors ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-neutral-50'}`}>
                        <td className="px-4 sm:px-5 py-3 align-top">
                          <div className={`font-bold leading-none ${heading}`}>{String(d.getDate()).padStart(2, '0')}</div>
                          <div className={`text-[10px] uppercase font-mono ${labelMuted}`}>
                            {d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')} {d.getFullYear()}
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${heading}`}>{r.description}</span>
                            {r.receiptFile && (
                              <a
                                href={r.receiptFile}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={getReceiptDisplayName(r.receiptFile)}
                                className="text-blue-500 hover:text-blue-600 shrink-0"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                          <div className={`text-[11px] ${labelMuted} flex items-center gap-2`}>
                            <span>{r.expenseType === 'fixed' ? 'Despesa fixa' : 'Avulsa'}</span>
                            {clientName && (
                              <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {clientName}</span>
                            )}
                          </div>
                        </td>
                        <td className={`px-2 py-3 hidden sm:table-cell ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                          {employeeName(r.employeeId)}
                        </td>
                        <td className="px-2 py-3 hidden md:table-cell">
                          {r.category && (
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${isDark ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-100 text-neutral-700'}`}>
                              {r.category}
                            </span>
                          )}
                        </td>
                        <td className={`px-2 py-3 text-right font-mono font-bold whitespace-nowrap ${heading}`}>{brl(r.amount)}</td>
                        <td className="px-2 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold whitespace-nowrap ${meta.badge(isDark)}`}>
                            <StatusIcon className="w-3 h-3" /> {meta.label}
                          </span>
                        </td>
                        <td className="px-4 sm:px-5 py-3 text-right">
                          <div className="relative inline-block" ref={openMenuId === r.id ? menuRef : undefined}>
                            <button
                              onClick={() => { setOpenMenuId(openMenuId === r.id ? null : r.id); setConfirmDeleteId(null); }}
                              className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-white/10 text-neutral-300' : 'hover:bg-black/5 text-neutral-600'}`}
                              title="Ações"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            {openMenuId === r.id && (
                              <div className={`absolute right-0 mt-1 w-52 rounded-xl border shadow-2xl z-30 p-1.5 animate-fadeIn text-left ${
                                isDark ? 'bg-[#161616] border-white/10' : 'bg-white border-black/10'
                              }`}>
                                <p className={`px-2 py-1 text-[9px] uppercase font-bold tracking-wider ${labelMuted}`}>Alterar status</p>
                                {STATUS_ORDER.map(key => {
                                  const m = STATUS_META[key];
                                  const MIcon = m.icon;
                                  return (
                                    <button
                                      key={key}
                                      onClick={() => handleSetStatus(r, key)}
                                      disabled={key === s}
                                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition disabled:opacity-40 ${
                                        isDark ? 'hover:bg-white/10 text-neutral-200' : 'hover:bg-black/5 text-neutral-700'
                                      }`}
                                    >
                                      <MIcon className="w-3.5 h-3.5" style={{ color: m.hex }} />
                                      {m.label}
                                      {key === s && <CheckCircle className="w-3 h-3 ml-auto opacity-60" />}
                                    </button>
                                  );
                                })}
                                <div className={`my-1 border-t ${isDark ? 'border-white/10' : 'border-black/10'}`} />
                                {confirmDeleteId === r.id ? (
                                  <button
                                    onClick={() => deleteReimbursement(r.id)}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 text-red-500 hover:bg-red-500/20 transition"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Confirmar exclusão?
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setConfirmDeleteId(r.id)}
                                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition ${isDark ? 'hover:bg-white/10 text-red-400' : 'hover:bg-black/5 text-red-600'}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Excluir
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {tableRows.length > 0 && (
            <div className="p-4 sm:px-5 flex items-center justify-between border-t border-black/5 dark:border-white/5">
              <span className={`text-[11px] font-mono ${labelMuted}`}>
                Mostrando {(page - 1) * PAGE_SIZE + 1} a {Math.min(page * PAGE_SIZE, tableRows.length)} de {tableRows.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={`p-1.5 rounded-lg border transition disabled:opacity-30 ${isDark ? 'border-neutral-800 hover:bg-neutral-800' : 'border-neutral-200 hover:bg-neutral-100'}`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition ${
                      p === page
                        ? (isDark ? 'bg-white text-black' : 'bg-black text-white')
                        : (isDark ? 'text-neutral-400 hover:bg-neutral-800' : 'text-neutral-500 hover:bg-neutral-100')
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className={`p-1.5 rounded-lg border transition disabled:opacity-30 ${isDark ? 'border-neutral-800 hover:bg-neutral-800' : 'border-neutral-200 hover:bg-neutral-100'}`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ---- Right: summary sidebar ---- */}
        <div className="lg:col-span-4 space-y-5">
          {/* Resumo por Status (donut) */}
          <div className={`rounded-2xl border p-5 ${card}`}>
            <h3 className={`text-xs uppercase font-bold tracking-widest mb-5 ${heading}`}>Resumo por Status</h3>
            <div className="flex items-center gap-5">
              <StatusDonut counts={stats.counts} total={stats.total} isDark={isDark} heading={heading} />
              <div className="flex-1 space-y-2.5">
                {STATUS_ORDER.map(key => {
                  const count = stats.counts[key];
                  const pct = stats.total ? Math.round((count / stats.total) * 100) : 0;
                  return (
                    <div key={key} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: STATUS_META[key].hex }} />
                        <span className={isDark ? 'text-neutral-300' : 'text-neutral-700'}>{STATUS_META[key].label}</span>
                      </span>
                      <span className={`font-mono ${labelMuted}`}>
                        <span className={`font-bold ${heading}`}>{count}</span> ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Despesas por Categoria */}
          <div className={`rounded-2xl border p-5 ${card}`}>
            <h3 className={`text-xs uppercase font-bold tracking-widest mb-4 ${heading}`}>Despesas por Categoria</h3>
            {categoryData.length === 0 ? (
              <p className={`text-xs ${labelMuted}`}>Sem dados no período.</p>
            ) : (
              <div className="space-y-3.5">
                {categoryData.map(c => (
                  <div key={c.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-medium truncate max-w-[60%] ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>{c.name}</span>
                      <span className={`font-mono ${labelMuted}`}>
                        <span className={`font-bold ${heading}`}>{brl(c.value)}</span> · {c.pct}%
                      </span>
                    </div>
                    <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                      <div
                        className={`h-full rounded-full ${isDark ? 'bg-white/80' : 'bg-zinc-900/80'}`}
                        style={{ width: `${Math.max(4, c.pct)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Atividade Recente */}
          <div className={`rounded-2xl border p-5 ${card}`}>
            <h3 className={`text-xs uppercase font-bold tracking-widest mb-4 ${heading}`}>Atividade Recente</h3>
            {recentActivity.length === 0 ? (
              <p className={`text-xs ${labelMuted}`}>Nenhuma atividade.</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map(r => {
                  const s = normalizeStatus(r.status);
                  const meta = STATUS_META[s];
                  const Icon = meta.icon;
                  return (
                    <div key={r.id} className="flex items-start gap-3">
                      <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${meta.hex}22` }}>
                        <Icon className="w-3.5 h-3.5" style={{ color: meta.hex }} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs leading-tight ${isDark ? 'text-neutral-200' : 'text-neutral-700'}`}>
                          <span className="font-semibold">{brl(r.amount)}</span> · {r.description}
                        </p>
                        <p className={`text-[10px] font-mono ${labelMuted}`}>
                          {meta.label} · {new Date(r.date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Donut chart ----------------------------------------------------------
function StatusDonut({ counts, total, isDark, heading }: {
  counts: Record<StatusKey, number>;
  total: number;
  isDark: boolean;
  heading: string;
}) {
  const C = 2 * Math.PI * 40; // circumference for r=40
  let offsetAccum = 0;
  const segments = STATUS_ORDER
    .filter(k => counts[k] > 0)
    .map(k => {
      const frac = total ? counts[k] / total : 0;
      const len = C * frac;
      const seg = { key: k, len, offset: C - offsetAccum };
      offsetAccum += len;
      return seg;
    });

  return (
    <div className="relative w-28 h-28 shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="transparent" stroke={isDark ? '#ffffff12' : '#00000010'} strokeWidth="10" />
        {segments.map(seg => (
          <circle
            key={seg.key}
            cx="50" cy="50" r="40"
            fill="transparent"
            stroke={STATUS_META[seg.key].hex}
            strokeWidth="10"
            strokeDasharray={`${seg.len} ${C - seg.len}`}
            strokeDashoffset={seg.offset}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold leading-none ${heading}`}>{total}</span>
        <span className={`text-[9px] uppercase tracking-widest font-bold ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>Total</span>
      </div>
    </div>
  );
}
