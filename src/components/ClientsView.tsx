import React, { useState, useEffect, useMemo } from 'react';
import { Client, Transaction } from '../types';
import { formatSystemDate, newestDateFirst } from '../utils/date';
import ClientPaymentsPanel from './ClientPaymentsPanel';
import {
  Plus, Users, Search, Edit2, CheckCircle2, XCircle, ChevronDown, ChevronRight,
  Activity, Mail, Phone, Briefcase, Calendar, FileText, Check, Link,
  TrendingUp, Sparkles, DollarSign, ArrowUpRight, Building2, HelpCircle, FileCheck2, Trash2, Sliders, Image, X,
  Eye, MoreVertical, LayoutGrid, List, ArrowRight, Clock
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

interface ClientsViewProps {
  clients: Client[];
  transactions?: Transaction[];
  onAddClient: (client: Omit<Client, 'id'>) => void;
  onUpdateClient: (client: Client) => void;
  onAddTransaction?: (transaction: Omit<Transaction, 'id'>) => void;
  onUpdateTransactions?: (transactions: Transaction[]) => void;
  theme: 'dark' | 'light';
}

const PORTUGUESE_MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const formatBRL = (value: number) => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}).format(Number(value) || 0);

function getPaymentInfo(nextPaymentDate: string | undefined): {
  displayStr: string;
  daysLeft: number | null;
  isFixedDay: boolean;
  targetDate: Date | null;
} {
  if (!nextPaymentDate) {
    return { displayStr: '--', daysLeft: null, isFixedDay: false, targetDate: null };
  }

  // Check if it's a fixed day of month (either "day:10", "10", or "Todo dia 10")
  let fixedDayNum: number | null = null;
  if (nextPaymentDate.startsWith('day:')) {
    fixedDayNum = parseInt(nextPaymentDate.replace('day:', ''), 10);
  } else if (!isNaN(Number(nextPaymentDate)) && Number(nextPaymentDate) >= 1 && Number(nextPaymentDate) <= 31) {
    fixedDayNum = parseInt(nextPaymentDate, 10);
  } else if (nextPaymentDate.toLowerCase().includes('todo dia')) {
    const matched = nextPaymentDate.match(/\d+/);
    if (matched) {
      fixedDayNum = parseInt(matched[0], 10);
    }
  }

  if (fixedDayNum !== null && fixedDayNum >= 1 && fixedDayNum <= 31) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Adjust day for months with fewer days
    let targetMonth = currentMonth;
    let targetYear = currentYear;
    let target = new Date(targetYear, targetMonth, fixedDayNum);
    target.setHours(0,0,0,0);

    const today = new Date();
    today.setHours(0,0,0,0);

    if (target.getTime() < today.getTime()) {
      targetMonth += 1;
      if (targetMonth > 11) {
        targetMonth = 0;
        targetYear += 1;
      }
    }

    // Find maximum days in target month
    const maxDays = new Date(targetYear, targetMonth + 1, 0).getDate();
    const actualDay = Math.min(fixedDayNum, maxDays);
    target = new Date(targetYear, targetMonth, actualDay);
    target.setHours(0,0,0,0);

    const daysLeft = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    const dayFormatted = actualDay.toString().padStart(2, '0');
    const monthFormatted = (target.getMonth() + 1).toString().padStart(2, '0');
    return {
      displayStr: `Todo dia ${fixedDayNum} (Prox: ${dayFormatted}/${monthFormatted})`,
      daysLeft,
      isFixedDay: true,
      targetDate: target
    };
  }

  // Fallback to standard calendar date string
  try {
    const target = new Date(nextPaymentDate);
    if (!isNaN(target.getTime())) {
      target.setHours(0,0,0,0);
      const now = new Date();
      now.setHours(0,0,0,0);
      const daysLeft = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      const dayFormatted = target.getDate().toString().padStart(2, '0');
      const monthFormatted = (target.getMonth() + 1).toString().padStart(2, '0');
      return {
        displayStr: `${dayFormatted}/${monthFormatted}/${target.getFullYear()}`,
        daysLeft,
        isFixedDay: false,
        targetDate: target
      };
    }
  } catch (e) {}

  return { displayStr: nextPaymentDate, daysLeft: null, isFixedDay: false, targetDate: null };
}

export default function ClientsView({
  clients,
  transactions = [],
  onAddClient,
  onUpdateClient,
  onAddTransaction,
  onUpdateTransactions,
  theme
}: ClientsViewProps) {

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [dueDateType, setDueDateType] = useState<'fixed' | 'specific'>('fixed');

  // Collapsible and expanded toggles
  const [showDesktopFilters, setShowDesktopFilters] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [mrrChartRange, setMrrChartRange] = useState<3 | 6 | 12>(6);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);

  const toggleNotesExpanded = (id: string) => {
    setExpandedNotes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Advanced filters state
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'churned'>('all');
  const [contractFilter, setContractFilter] = useState<'all' | 'recurring' | 'fixed'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'ltv' | 'contract_value' | 'recent'>('ltv');

  // Interactive inline quick-payment state
  const [quickAmount, setQuickAmount] = useState('');
  const [quickDescription, setQuickDescription] = useState('Mensalidade de Serviços');
  const [quickDate, setQuickDate] = useState(new Date().toISOString().substring(0, 10));
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [unlinkingTxId, setUnlinkingTxId] = useState<string | null>(null);

  const [generalExpenses, setGeneralExpenses] = useState<any[]>([]);

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const res = await fetch('/api/general-expenses');
        if (res.ok) {
          const data = await res.json();
          setGeneralExpenses(data);
        }
      } catch (err) {}
    };
    fetchExpenses();
  }, []);

  // CRM Metadata Form state
  const [formData, setFormData] = useState({
    name: '',
    contract_value: '',
    is_recurring: true,
    status: 'active' as 'active' | 'churned',
    email: '',
    phone: '',
    segment: '',
    start_date: new Date().toISOString().substring(0, 10),
    notes: '',
    nextPaymentDate: '',
    logo: '',
    cpf_cnpj: '',
    hasImplementation: false,
    implementationStatus: 'pending',
    implementationFee: '',
    implementationDeadline: '',
    implementationNotes: '',
    paymentReceived: false,
    paymentScope: 'recurring',
    paymentPlan: 'full',
    paymentDate: new Date().toISOString().substring(0, 10),
    secondPaymentDate: ''
  });

  const isDark = theme === 'dark';

  // Load enriched client metadata from database first, merging with localStorage cache if not yet synced
  const getEnrichedClients = (): Client[] => {
    return clients.map(c => {
      const cacheKey = `leadiumfy_crm_meta_v3_${c.id}`;
      const cached = localStorage.getItem(cacheKey);
      let localData = {} as any;
      if (cached) {
        try {
          localData = JSON.parse(cached);
        } catch (e) {
          console.warn('Error reading CRM cache:', e);
        }
      }
      return {
        ...c,
        email: c.email || localData.email || '',
        phone: c.phone || localData.phone || '',
        segment: c.segment || localData.segment || '',
        start_date: c.start_date || localData.start_date || new Date().toISOString().substring(0, 10),
        notes: c.notes || localData.notes || '',
        nextPaymentDate: c.nextPaymentDate || localData.nextPaymentDate || '',
        logo: c.logo || localData.logo || ''
      };
    });
  };

  const enrichedClients = getEnrichedClients();

  const resetForm = () => {
    setFormData({
      name: '',
      contract_value: '',
      is_recurring: true,
      status: 'active',
      email: '',
      phone: '',
      segment: '',
      start_date: new Date().toISOString().substring(0, 10),
      notes: '',
      nextPaymentDate: '',
      logo: '',
      cpf_cnpj: '',
      hasImplementation: false,
      implementationStatus: 'pending',
      implementationFee: '',
      implementationDeadline: '',
      implementationNotes: '',
      paymentReceived: false,
      paymentScope: 'recurring',
      paymentPlan: 'full',
      paymentDate: new Date().toISOString().substring(0, 10),
      secondPaymentDate: ''
    });
    setDueDateType('fixed');
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.contract_value) return;
    if (formData.paymentReceived && formData.paymentPlan === 'split_50_50' && !formData.secondPaymentDate) {
      window.alert('Informe o vencimento dos 50% restantes.');
      return;
    }
    if (formData.paymentReceived && (formData.paymentScope === 'implementation' || formData.paymentScope === 'both') && (!formData.hasImplementation || Number(formData.implementationFee) <= 0)) {
      window.alert('Informe um valor de implementação maior que zero.');
      return;
    }

    const clientData = {
      name: formData.name.trim(),
      contract_value: Number(formData.contract_value),
      is_recurring: formData.is_recurring,
      status: formData.status
    };

    const extraMetadata = {
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      segment: formData.segment.trim(),
      start_date: formData.start_date,
      notes: formData.notes.trim(),
      nextPaymentDate: formData.nextPaymentDate,
      logo: formData.logo,
      cpf_cnpj: formData.cpf_cnpj.trim()
    };

    let savedClientId = editingId;
    if (editingId) {
      // Save primary and metadata fields to DB
      const updatedClient: Client = {
        id: editingId,
        ...clientData,
        ...extraMetadata
      };
      onUpdateClient(updatedClient);

      // Save full enrichment CRM fields to safe hybrid localStorage local to user
      localStorage.setItem(`leadiumfy_crm_meta_v3_${editingId}`, JSON.stringify(extraMetadata));
    } else {
      // For new clients, generate visual UUID to link metadata correctly
      const tempId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
      savedClientId = tempId;

      const newClientWithId: Client = {
        id: tempId,
        ...clientData,
        ...extraMetadata
      };

      // Call parent creator
      onAddClient(newClientWithId);

      // Cache details instantly
      localStorage.setItem(`leadiumfy_crm_meta_v3_${tempId}`, JSON.stringify(extraMetadata));
    }

    if (formData.hasImplementation && savedClientId) {
      try {
        await fetch('/api/client-implementations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: savedClientId,
            status: formData.implementationStatus,
            fee: Number(formData.implementationFee) || 0,
            start_date: formData.start_date || null,
            deadline: formData.implementationDeadline || null,
            notes: formData.implementationNotes.trim()
          })
        });
      } catch (error) {
        console.error('Não foi possível salvar a implementação:', error);
      }
    }

    if (!editingId && formData.paymentReceived && savedClientId && onAddTransaction) {
      const paymentParts: Array<{ type: 'recurring' | 'implementation'; label: string; total: number }> = [];
      if (formData.paymentScope === 'recurring' || formData.paymentScope === 'both') {
        paymentParts.push({ type: 'recurring', label: 'Recorrência', total: Number(formData.contract_value) || 0 });
      }
      if ((formData.paymentScope === 'implementation' || formData.paymentScope === 'both') && formData.hasImplementation) {
        paymentParts.push({ type: 'implementation', label: 'Implementação', total: Number(formData.implementationFee) || 0 });
      }

      const schedule: any[] = [];
      const paidLabels: string[] = [];
      let totalReceived = 0;
      for (const part of paymentParts.filter(item => item.total > 0)) {
        const firstAmount = formData.paymentPlan === 'split_50_50' ? part.total / 2 : part.total;
        paidLabels.push(part.label);
        totalReceived += firstAmount;
        schedule.push({
          client_id: savedClientId,
          payment_type: part.type,
          installment_number: 1,
          total_installments: formData.paymentPlan === 'split_50_50' ? 2 : 1,
          amount: firstAmount,
          due_date: formData.paymentDate,
          paid_at: formData.paymentDate,
          status: 'paid',
          notes: `${part.label} recebida no cadastro do cliente.`
        });
        if (formData.paymentPlan === 'split_50_50') {
          schedule.push({
            client_id: savedClientId,
            payment_type: part.type,
            installment_number: 2,
            total_installments: 2,
            amount: part.total - firstAmount,
            due_date: formData.secondPaymentDate || null,
            paid_at: null,
            status: 'pending',
            notes: `Segunda parcela de ${part.label.toLowerCase()}.`
          });
        }

      }

      if (totalReceived > 0) {
        await onAddTransaction({
          date: formData.paymentDate,
          description: `${paidLabels.join(' + ')} - ${formData.name.trim()}${formData.paymentPlan === 'split_50_50' ? ' (1/2)' : ''}`,
          type: 'income',
          amount: totalReceived,
          category: formData.paymentScope === 'implementation' ? 'Implementação' : 'Receita de Cliente',
          account: 'Carteira de Clientes',
          notes: `Pagamento confirmado: ${paidLabels.join(' e ')}.`,
          clientId: savedClientId,
          isRecurring: (formData.paymentScope === 'recurring' || formData.paymentScope === 'both') && formData.is_recurring,
          frequency: (formData.paymentScope === 'recurring' || formData.paymentScope === 'both') && formData.is_recurring ? 'monthly' : undefined,
          nextOccurrenceDate: formData.paymentScope !== 'implementation' ? formData.nextPaymentDate : undefined
        });
      }

      if (schedule.length > 0) {
        try {
          await fetch('/api/client-payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payments: schedule })
          });
        } catch (error) {
          console.error('Não foi possível salvar o cronograma de pagamentos:', error);
        }
      }
    }

    resetForm();
  };

  const startEdit = async (c: Client) => {
    // Read from DB values first, fallback to cached metadata in localStorage
    let cachedMeta = {
      email: c.email || '',
      phone: c.phone || '',
      segment: c.segment || '',
      start_date: c.start_date || new Date().toISOString().substring(0, 10),
      notes: c.notes || '',
      nextPaymentDate: c.nextPaymentDate || '',
      logo: c.logo || ''
    };

    if (!cachedMeta.email || !cachedMeta.phone || !cachedMeta.segment || !cachedMeta.notes) {
      const cacheKey = `leadiumfy_crm_meta_v3_${c.id}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          cachedMeta = {
            email: cachedMeta.email || parsed.email || '',
            phone: cachedMeta.phone || parsed.phone || '',
            segment: cachedMeta.segment || parsed.segment || '',
            start_date: cachedMeta.start_date || parsed.start_date || new Date().toISOString().substring(0, 10),
            notes: cachedMeta.notes || parsed.notes || '',
            nextPaymentDate: cachedMeta.nextPaymentDate || parsed.nextPaymentDate || '',
            logo: cachedMeta.logo || parsed.logo || ''
          };
        } catch (e) {}
      }
    }

    const dateVal = c.nextPaymentDate || cachedMeta.nextPaymentDate || '';
    const isFixed = dateVal.startsWith('day:') || (!isNaN(Number(dateVal)) && Number(dateVal) >= 1 && Number(dateVal) <= 31);
    setDueDateType(isFixed ? 'fixed' : 'specific');

    let implementation: any = null;
    try {
      const response = await fetch(`/api/client-implementations/${c.id}`);
      if (response.ok) implementation = await response.json();
    } catch (error) {
      console.warn('Implementação indisponível para edição:', error);
    }

    setFormData({
      name: c.name,
      contract_value: c.contract_value.toString(),
      is_recurring: c.is_recurring,
      status: c.status,
      email: cachedMeta.email,
      phone: cachedMeta.phone,
      segment: cachedMeta.segment,
      start_date: cachedMeta.start_date,
      notes: cachedMeta.notes,
      nextPaymentDate: dateVal,
      logo: cachedMeta.logo,
      cpf_cnpj: c.cpf_cnpj || '',
      hasImplementation: Boolean(implementation),
      implementationStatus: implementation?.status || 'pending',
      implementationFee: implementation?.fee?.toString() || '',
      implementationDeadline: implementation?.deadline || '',
      implementationNotes: implementation?.notes || '',
      paymentReceived: false,
      paymentScope: 'recurring',
      paymentPlan: 'full',
      paymentDate: new Date().toISOString().substring(0, 10),
      secondPaymentDate: ''
    });
    setEditingId(c.id);
    setIsAdding(true);
  };

  // Live Quick Payment Recorder (In-place invoice collection)
  const handleRecordQuickPayment = (clientId: string, clientName: string) => {
    if (!quickAmount || isNaN(Number(quickAmount)) || Number(quickAmount) <= 0) {
      alert("Por favor, preencha um valor de recebimento válido.");
      return;
    }

    if (!onAddTransaction) {
      alert("Ação de transação indisponível.")
      return;
    }

    setIsRecordingPayment(true);

    onAddTransaction({
      description: quickDescription.trim() || 'Faturamento de Contrato',
      type: 'income',
      category: 'Venda de Serviços',
      amount: Number(quickAmount),
      date: quickDate,
      account: 'Venda de Serviços',
      clientId: clientId
    });

    // Reset indicator
    setQuickAmount('');
    setQuickDescription('Mensalidade de Serviços');
    setIsRecordingPayment(false);
  };

  // Live Linker for orphaned income transactions
  const handleLinkOrphanTransaction = (transactionId: string, clientId: string) => {
    if (!onUpdateTransactions || !transactions) return;

    const modifiedTxs = transactions.map(t => {
      if (t.id === transactionId) {
        return { ...t, clientId: clientId };
      }
      return t;
    });

    onUpdateTransactions(modifiedTxs);
  };

  const handleUnlinkTransaction = (transactionId: string) => {
    if (!onUpdateTransactions || !transactions) return;

    const modifiedTxs = transactions.map(t => {
      if (t.id === transactionId) {
        const { clientId, ...rest } = t;
        return rest as Transaction;
      }
      return t;
    });

    onUpdateTransactions(modifiedTxs);
  };

  // AGGREGATE FINANCIALS & SAAS INTERACTIVE KPIs
  const activeClientsList = clients.filter(c => c.status === 'active');
  const totalClientsCount = clients.length;

  // MRR: Real active monthly commitments
  const mrr = activeClientsList
    .filter(c => c.is_recurring)
    .reduce((acc, c) => acc + c.contract_value, 0);

  // ARR: Projected Annualized Recurring commits
  const arr = mrr * 12;

  // LTV Total: Sum of actual income paid by ANY client
  const clientIncomes = transactions.filter(t => t.type === 'income' && t.clientId);
  const totalHistoricalRevenue = clientIncomes.reduce((acc, t) => acc + t.amount, 0);

  // Average LTV per Client
  const averageLtv = activeClientsList.length > 0
    ? totalHistoricalRevenue / activeClientsList.length
    : 0;

  // Ticket Médio de Contrato (Commitment ARPU)
  const averageContractValue = activeClientsList.length > 0
    ? activeClientsList.reduce((acc, c) => acc + c.contract_value, 0) / activeClientsList.length
    : 0;

  // Retention Ratio: Active clients vs Total Clients registered
  const retentionRate = totalClientsCount > 0
    ? (activeClientsList.length / totalClientsCount) * 100
    : 100;

  const churnRate = 100 - retentionRate;

  // Search & Filter & Sort Processing Pipeline
  const filtered = enrichedClients
    .filter(c => {
      // Search term
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.segment && c.segment.toLowerCase().includes(search.toLowerCase())) ||
        (c.email && c.email.toLowerCase().includes(search.toLowerCase()));

      // Status filter
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;

      // Contract style filter
      const matchesContract = contractFilter === 'all' ||
        (contractFilter === 'recurring' && c.is_recurring) ||
        (contractFilter === 'fixed' && !c.is_recurring);

      return matchesSearch && matchesStatus && matchesContract;
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'contract_value') {
        return b.contract_value - a.contract_value;
      }
      if (sortBy === 'ltv') {
        const aLtv = transactions.filter(t => t.type === 'income' && t.clientId === a.id).reduce((sum, t) => sum + t.amount, 0);
        const bLtv = transactions.filter(t => t.type === 'income' && t.clientId === b.id).reduce((sum, t) => sum + t.amount, 0);
        return bLtv - aLtv;
      }
      if (sortBy === 'recent') {
        // approximate by list sequence or default to alphabetical if empty
        return a.id.localeCompare(b.id);
      }
      return 0;
    });

  // Find orphaned income transactions (Income sem clientId vinculado)
  const orphanedTransactions = transactions.filter(t => {
    if (t.type !== 'income') return false;
    // Unassigned transactions
    if (!t.clientId || t.clientId === '') return true;
    return false;
  });

  // Monthly revenue trend for the "Receita Mensal (MRR)" chart
  const mrrTrendData = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; value: number }[] = [];
    for (let i = mrrChartRange - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: `${PORTUGUESE_MONTHS_SHORT[d.getMonth()]}/${d.getFullYear()}`,
        value: 0
      });
    }
    clientIncomes.forEach(t => {
      if (!t.date) return;
      const key = t.date.substring(0, 7);
      const entry = months.find(m => m.key === key);
      if (entry) entry.value += t.amount;
    });
    return months;
  }, [clientIncomes, mrrChartRange]);

  // Clients with an upcoming (non-overdue) payment date, soonest first
  const upcomingPayments = useMemo(() => {
    return enrichedClients
      .filter(c => c.status === 'active' && c.nextPaymentDate)
      .map(c => ({ client: c, info: getPaymentInfo(c.nextPaymentDate) }))
      .filter(x => x.info.daysLeft !== null && (x.info.daysLeft as number) >= 0)
      .sort((a, b) => (a.info.daysLeft as number) - (b.info.daysLeft as number));
  }, [enrichedClients]);

  const visibleUpcomingPayments = showAllUpcoming ? upcomingPayments : upcomingPayments.slice(0, 5);

  // Resumo Financeiro: open balance and payment health
  const overdueActiveClients = activeClientsList.filter(c => {
    const info = getPaymentInfo(c.nextPaymentDate);
    return info.daysLeft !== null && info.daysLeft < 0;
  });
  const emAberto = overdueActiveClients.reduce((acc, c) => acc + c.contract_value, 0);
  const adimplenciaRate = activeClientsList.length > 0
    ? ((activeClientsList.length - overdueActiveClients.length) / activeClientsList.length) * 100
    : 100;

  const toggleActionMenu = (id: string) => {
    setOpenMenuId(prev => prev === id ? null : id);
  };

  const handleToggleStatus = (c: Client) => {
    onUpdateClient({ ...c, status: c.status === 'active' ? 'churned' : 'active' });
    setOpenMenuId(null);
  };

  // Shared expanded detail panel — reused by both the table and the grid view
  const renderClientDetail = (c: Client) => {
    const clientPayments = transactions
      .filter(t => t.clientId === c.id && t.type === 'income')
      .sort(newestDateFirst);
    const totalPaidAmount = clientPayments.reduce((acc, t) => acc + t.amount, 0);
    const segmentText = c.segment || 'Ramo não informado';
    const joinDateText = c.start_date ? new Date(c.start_date).toLocaleDateString('pt-BR') : '';

    return (
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Pillar A: Ficha do Cliente */}
        <div className="space-y-4">
          <h4 className={`text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-white/5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} style={{ borderColor: !isDark ? 'rgba(0,0,0,0.06)' : '' }}>
            <Building2 className="w-3.5 h-3.5" />
            Ficha do Cliente
          </h4>

          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />
              {c.email ? (
                <a href={`mailto:${c.email}`} className={`hover:underline font-mono ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {c.email}
                </a>
              ) : (
                <span className="text-gray-500 italic">E-mail não cadastrado</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
              {c.phone ? (
                <span className={`font-mono ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{c.phone}</span>
              ) : (
                <span className="text-gray-500 italic">Telefone não informado</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Setor: <strong>{segmentText}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Iniciou em: <strong>{joinDateText || 'Indefinida'}</strong></span>
            </div>
          </div>

          {/* Notes block */}
          <div className="pt-3 border-t border-white/5 space-y-1 text-xs" style={{ borderColor: !isDark ? 'rgba(0,0,0,0.06)' : '' }}>
            <span className="text-[9px] font-extrabold uppercase tracking-wide text-gray-500 block">Observação Interna:</span>
            <p
              onClick={() => toggleNotesExpanded(c.id)}
              className={`p-2.5 rounded-lg text-xs leading-relaxed italic cursor-pointer select-none transition-all duration-300 break-words ${
                isDark
                  ? 'bg-[#181818] text-gray-400 hover:text-white hover:bg-[#202020]'
                  : 'bg-gray-50 text-gray-600 border border-gray-200 hover:text-black hover:bg-gray-100'
              } ${expandedNotes[c.id] ? 'whitespace-pre-wrap' : 'line-clamp-2 overflow-hidden'}`}
              title="Clique para expandir / ocultar"
            >
              {c.notes || "Sem observações críticas registradas no contrato deste cliente."}
            </p>
            {c.notes && (
              <button
                type="button"
                onClick={() => toggleNotesExpanded(c.id)}
                className="text-[9px] text-[#FFFFFF]/70 cursor-pointer block mt-0.5 hover:underline"
              >
                {expandedNotes[c.id] ? '[- Recolher Observação]' : '[+ Ver Observação Completa]'}
              </button>
            )}
          </div>

          <button
            onClick={() => startEdit(c)}
            className={`text-[10px] uppercase font-bold tracking-wider underline ${
              isDark ? 'text-gray-400 hover:text-white' : 'text-gray-650 hover:text-black'
            }`}
          >
            Editar Ficha Cadastral
          </button>
        </div>

        {/* Pillar B: Recebimentos + ferramentas rápidas */}
        <div className="xl:col-span-2 xl:border-l xl:pl-6 space-y-4" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)' }}>
          <div className="flex justify-between items-center pb-2 border-b border-white/5" style={{ borderColor: !isDark ? 'rgba(0,0,0,0.06)' : '' }}>
            <h4 className={`text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              <Activity className="w-3.5 h-3.5" />
              Recebimentos Desse Cliente ({clientPayments.length})
            </h4>
            <span className={`text-xs font-mono font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              LTV Acumulado: R$ {totalPaidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {clientPayments.length > 0 ? (
            <div className={`divide-y max-h-[200px] overflow-y-auto ${isDark ? 'divide-white/5' : 'divide-gray-100'}`}>
              {clientPayments.map(t => (
                <div key={t.id} className="flex items-center justify-between py-2 text-xs">
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className={`font-semibold tracking-tight truncate ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{t.description}</span>
                    <span className="text-[10px] text-gray-500 mt-0.5 font-mono">
                      {formatSystemDate(t.date)} • {t.account}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-zinc-500 font-mono font-bold">
                      + R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    {unlinkingTxId === t.id ? (
                      <div className="flex items-center gap-1.5 animate-fadeIn">
                        <button
                          onClick={() => {
                            handleUnlinkTransaction(t.id);
                            setUnlinkingTxId(null);
                          }}
                          className="text-[10px] text-zinc-500 font-bold hover:underline"
                        >
                          Desvincular?
                        </button>
                        <button
                          onClick={() => setUnlinkingTxId(null)}
                          className="text-[10px] text-gray-400 font-bold hover:underline"
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setUnlinkingTxId(t.id)}
                        className="text-gray-500 hover:text-zinc-400 transition-colors p-1"
                        title="Desvincular do Cliente (Tornar Avulso)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-xs italic text-gray-500 space-y-1">
              <p>Nenhuma transação de entrada associada a este cliente.</p>
              <p className="text-[10px] opacity-70">Para aumentar o LTV, registre um pagamento para ele ou vincule despesas avulsas abaixo.</p>
            </div>
          )}

          {/* Despesas a Reembolsar Incluídas na Mensalidade */}
          {(() => {
            const items = generalExpenses.filter(e => e.clientId === c.id && e.billingType === 'monthly_fee' && e.status !== 'reimbursed');
            if (items.length === 0) return null;

            const total = items.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

            return (
              <div className="space-y-2">
                <h4 className={`text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1.5 ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
                  Despesas Pendentes na Próxima Mensalidade
                </h4>
                <div className={`p-3 rounded-lg border text-xs space-y-2 ${isDark ? 'bg-zinc-900/10 border-zinc-900/30' : 'bg-zinc-50 border-zinc-200'}`}>
                  {items.map(e => (
                    <div key={`exp-${e.id}`} className="flex justify-between items-center text-[11px]">
                      <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                        {e.description} <span className="opacity-50">({new Date(e.date).toLocaleDateString('pt-BR')})</span>
                      </span>
                      <span className="font-mono font-bold text-zinc-500/90 gap-1 flex items-center">
                        R$ {Number(e.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                  <div className={`pt-2 border-t flex justify-between font-bold mt-2 ${isDark ? 'border-zinc-900/30 text-zinc-400' : 'border-zinc-200 text-zinc-700'}`}>
                    <span className="text-[10px] uppercase tracking-wider">Adicional na Fatura:</span>
                    <span className="font-mono text-xs">+ R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Intelligent Linker and Quick Recorder Panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/5 text-xs" style={{ borderColor: !isDark ? 'rgba(0,0,0,0.06)' : '' }}>
            {onAddTransaction && (
              <div className="space-y-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDark ? 'text-gray-350' : 'text-gray-650'}`}>
                  <Check className="w-3.5 h-3.5" />
                  Registrar Recebimento Expresso
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Valor R$ (ex: 1500)"
                    value={quickAmount}
                    onChange={(e) => setQuickAmount(e.target.value)}
                    className={`col-span-2 px-2.5 py-1.5 rounded text-xs border outline-none font-mono ${
                      isDark ? 'bg-black/50 border-white/10 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                  <input
                    type="text"
                    placeholder="Descrição do faturamento"
                    value={quickDescription}
                    onChange={(e) => setQuickDescription(e.target.value)}
                    className={`px-2.5 py-1.5 rounded text-xs border outline-none ${
                      isDark ? 'bg-black/50 border-white/10 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                  <input
                    type="date"
                    value={quickDate}
                    onChange={(e) => setQuickDate(e.target.value)}
                    className={`px-2.5 py-1.5 rounded text-xs border outline-none ${
                      isDark ? 'bg-black/50 border-white/10 text-white' : 'bg-white border-gray-300 text-gray-900 font-mono'
                    }`}
                  />
                </div>

                <button
                  onClick={() => handleRecordQuickPayment(c.id, c.name)}
                  disabled={isRecordingPayment}
                  className={`w-full py-1.5 rounded text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer ${
                    isDark ? 'bg-white text-black hover:bg-neutral-200' : 'bg-black text-white keep-white hover:bg-gray-800'
                  }`}
                >
                  {isRecordingPayment ? 'Registrando...' : 'Registrar e Creditar LTV'}
                </button>
              </div>
            )}

            {onUpdateTransactions && (
              <div className="space-y-2 font-sans">
                <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDark ? 'text-gray-350' : 'text-gray-650'}`}>
                  <Link className="w-3.5 h-3.5" />
                  Vincular Receitas Avulsas
                </span>

                {orphanedTransactions.length > 0 ? (
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleLinkOrphanTransaction(e.target.value, c.id);
                        e.target.value = '';
                      }
                    }}
                    className={`w-full px-2 py-1.5 rounded text-xs border cursor-pointer outline-none ${
                      isDark ? 'bg-black/50 border-white/10 text-white' : 'bg-white border-gray-300 text-gray-950 font-mono'
                    }`}
                  >
                    <option value="">-- Selecione uma Receita --</option>
                    {orphanedTransactions.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.description ? `${t.description} - ` : ''}R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({formatSystemDate(t.date)})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="py-3 text-center italic text-[10px] text-gray-500 leading-normal">
                    Não há receitas avulsas.
                  </div>
                )}
              </div>
            )}
          </div>

          <ClientPaymentsPanel client={c} isDark={isDark} />
        </div>
      </div>
    );
  };

  return (
    <div className="clients-workspace space-y-6 animate-fadeIn" id="clients-view-master">
      {/* 1. Header and Welcome Area */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div className="text-left animate-fadeIn">
          <h2 className={`text-2xl sm:text-3xl font-semibold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Carteira de clientes</h2>
          <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Contratos, recorrência e relacionamento em um só lugar</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className={`primary-action inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-2.5 transition-all duration-200 text-xs font-semibold ${theme === 'dark' ? 'bg-white border-white text-zinc-950' : 'bg-zinc-950 border-zinc-950 text-white keep-white'}`}
          id="btn-new-client"
        >
          <Plus className="w-4 h-4" />
          Adicionar cliente
        </button>
      </div>

      {/* 2. Premium Business HUD Analytics Meter Roster (6 high-density cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4" id="clients-kpi-hud">
        {/* Card 1: MRR */}
        <div
          className="metric-card-interactive p-4 rounded-xl flex flex-col justify-between relative overflow-hidden group cursor-pointer"
          style={{
            '--card-highlight': '#FFFFFF',
            '--card-glow': 'rgba(255,255,255,0.12)'
          } as React.CSSProperties}
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-zinc-500/5 rounded-full filter blur-xl group-hover:bg-zinc-500/10 transition-colors"></div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[9px] uppercase tracking-wider font-extrabold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>MRR Contratos</span>
              <TrendingUp className="w-3.5 h-3.5 text-zinc-500" />
            </div>
            <h3 className={`text-lg sm:text-lg font-mono font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
              R$ {mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <p className={`text-[10px] mt-1 font-sans ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Recebimento mensal</p>
        </div>

        {/* Card 2: ARR */}
        <div
          className="metric-card-interactive p-4 rounded-xl flex flex-col justify-between relative overflow-hidden group cursor-pointer"
          style={{
            '--card-highlight': '#FFFFFF',
            '--card-glow': 'rgba(255,255,255,0.12)'
          } as React.CSSProperties}
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-zinc-500/5 rounded-full filter blur-xl group-hover:bg-zinc-500/10 transition-colors"></div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[9px] uppercase tracking-wider font-extrabold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>ARR Projetado</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500" />
            </div>
            <h3 className={`text-lg sm:text-lg font-mono font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
              R$ {arr.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <p className={`text-[10px] mt-1 font-sans ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Múltiplo anual (MRR * 12)</p>
        </div>

        {/* Card 3: LTV Acumulado */}
        <div
          className="metric-card-interactive p-4 rounded-xl flex flex-col justify-between relative overflow-hidden group cursor-pointer"
          style={{
            '--card-highlight': '#FFFFFF',
            '--card-glow': 'rgba(255,255,255,0.12)'
          } as React.CSSProperties}
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-zinc-500/5 rounded-full filter blur-xl group-hover:bg-zinc-500/10 transition-colors"></div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[9px] uppercase tracking-wider font-extrabold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>LTV Acumulado</span>
              <Sparkles className="w-3.5 h-3.5 text-zinc-500" />
            </div>
            <h3 className={`text-lg sm:text-lg font-mono font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
              R$ {totalHistoricalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <p className={`text-[10px] mt-1 font-sans ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Soma de recebimentos</p>
        </div>

        {/* Card 4: Ticket Médio */}
        <div
          className="metric-card-interactive p-4 rounded-xl flex flex-col justify-between relative overflow-hidden group cursor-pointer"
          style={{
            '--card-highlight': '#FFFFFF',
            '--card-glow': 'rgba(255,255,255,0.12)'
          } as React.CSSProperties}
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-zinc-500/5 rounded-full filter blur-xl group-hover:bg-zinc-500/10 transition-colors"></div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[9px] uppercase tracking-wider font-extrabold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Ticket Médio</span>
              <DollarSign className="w-3.5 h-3.5 text-zinc-500" />
            </div>
            <h3 className={`text-lg sm:text-lg font-mono font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
              R$ {averageContractValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <p className={`text-[10px] mt-1 font-sans ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Valor médio mensal</p>
        </div>

        {/* Card 5: Clientes Ativos */}
        <div
          className="metric-card-interactive p-4 rounded-xl flex flex-col justify-between relative overflow-hidden group cursor-pointer"
          style={{
            '--card-highlight': '#FFFFFF',
            '--card-glow': 'rgba(255,255,255,0.12)'
          } as React.CSSProperties}
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-zinc-500/5 rounded-full filter blur-xl group-hover:bg-zinc-500/10 transition-colors"></div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[9px] uppercase tracking-wider font-extrabold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Carteira</span>
              <Users className="w-3.5 h-3.5 text-zinc-500" />
            </div>
            <h3 className={`text-xl sm:text-lg font-mono font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {activeClientsList.length} <span className="text-[10px] text-gray-500">/ {totalClientsCount}</span>
            </h3>
          </div>
          <p className={`text-[10px] mt-1 font-sans ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Clientes ativos hoje</p>
        </div>

        {/* Card 6: Churn Rate */}
        <div
          className="metric-card-interactive p-4 rounded-xl flex flex-col justify-between relative overflow-hidden group cursor-pointer"
          style={{
            '--card-highlight': '#FFFFFF',
            '--card-glow': 'rgba(255,255,255,0.12)'
          } as React.CSSProperties}
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-zinc-500/5 rounded-full filter blur-xl group-hover:bg-zinc-500/10 transition-colors"></div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[9px] uppercase tracking-wider font-extrabold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Retention / Churn</span>
              <Activity className="w-3.5 h-3.5 text-zinc-500" />
            </div>
            <h3 className={`text-lg sm:text-lg font-mono font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {retentionRate.toFixed(0)}% <span className={`text-[10px] ${churnRate > 0 ? 'text-zinc-500' : 'text-gray-500'}`}>({churnRate.toFixed(0)}% ch.)</span>
            </h3>
          </div>
          <p className={`text-[10px] mt-1 font-sans ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Taxa de permanência</p>
        </div>
      </div>

      {/* 3. CRM Addition/Editing Form */}
      {isAdding && (
        <div className={`rounded-2xl border p-5 sm:p-6 space-y-4 ${isDark ? 'bg-black/90 border-white/5' : 'bg-white border-black/5 shadow-[0_4px_20px_rgba(0,0,0,0.03)]'}`} id="add-client-collapsible-form">
          <div className="flex justify-between items-center pb-2 border-b border-white/5" style={{ borderColor: !isDark ? 'rgba(0,0,0,0.06)' : '' }}>
            <h4 className={`font-semibold uppercase tracking-wider text-xs flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Building2 className="w-4 h-4 text-gray-400" />
              {editingId ? 'Editar Detalhes do Cliente' : 'Cadastrar Novo Cliente na Carteira'}
            </h4>
            <button
              onClick={resetForm}
              className={`text-xs uppercase font-extrabold tracking-wider ${isDark ? 'text-gray-500 hover:text-white' : 'text-gray-500 hover:text-black'}`}
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Core metrics */}
            <div>
              <label className={`block text-[9px] uppercase font-bold tracking-wider mb-1 opacity-70 ${isDark ? 'text-white' : 'text-gray-900'}`}>Nome da Empresa / Cliente *</label>
              <input
                type="text"
                required
                placeholder="Ex: Coca-Cola Brasil"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg text-sm border focus:ring-1 focus:ring-zinc-500 outline-none ${
                  isDark ? 'bg-[#161616] border-white/10 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>

            <div>
              <label className={`block text-[9px] uppercase font-bold tracking-wider mb-1 opacity-70 ${isDark ? 'text-white' : 'text-gray-900'}`}>Valor do Contrato (R$) *</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="Ex: 5000"
                value={formData.contract_value}
                onChange={(e) => setFormData({ ...formData, contract_value: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg text-sm border focus:ring-1 focus:ring-zinc-500 outline-none ${
                  isDark ? 'bg-[#161616] border-white/10 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>

            <div>
              <label className={`block text-[9px] uppercase font-bold tracking-wider mb-1 opacity-70 ${isDark ? 'text-white' : 'text-gray-900'}`}>Tipo de Faturamento</label>
              <select
                value={formData.is_recurring ? 'true' : 'false'}
                onChange={(e) => setFormData({ ...formData, is_recurring: e.target.value === 'true' })}
                className={`w-full px-3 py-2 rounded-lg text-sm border focus:ring-1 focus:ring-zinc-500 outline-none ${
                  isDark ? 'bg-[#161616] border-white/10 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="true">Pagamento Mensal (Recorrente / MRR)</option>
                <option value="false">Projeto Fechado / Valor Único (Fixo)</option>
              </select>
            </div>

            <div className={`md:col-span-3 rounded-xl border p-4 ${isDark ? 'border-white/10 bg-white/[0.025]' : 'border-gray-200 bg-gray-50'}`}>
              <label className="flex items-center justify-between gap-4 cursor-pointer">
                <span>
                  <span className={`block text-xs font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Implementação</span>
                  <span className={`block text-[10px] mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Vincular um projeto de implantação a este cliente</span>
                </span>
                <input
                  type="checkbox"
                  checked={formData.hasImplementation}
                  onChange={(e) => setFormData({ ...formData, hasImplementation: e.target.checked })}
                  className="h-4 w-4 accent-emerald-500"
                />
              </label>

              {formData.hasImplementation && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/10">
                  <div>
                    <label className={`block text-[9px] uppercase font-bold tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Status</label>
                    <select value={formData.implementationStatus} onChange={(e) => setFormData({ ...formData, implementationStatus: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm border">
                      <option value="pending">A iniciar</option>
                      <option value="in_progress">Em andamento</option>
                      <option value="review">Em validação</option>
                      <option value="completed">Concluída</option>
                      <option value="paused">Pausada</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-[9px] uppercase font-bold tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Valor da implementação</label>
                    <input type="number" min="0" step="0.01" placeholder="R$ 0,00" value={formData.implementationFee} onChange={(e) => setFormData({ ...formData, implementationFee: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm border" />
                  </div>
                  <div>
                    <label className={`block text-[9px] uppercase font-bold tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Prazo</label>
                    <input type="date" value={formData.implementationDeadline} onChange={(e) => setFormData({ ...formData, implementationDeadline: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm border" />
                  </div>
                  <div className="sm:col-span-3">
                    <label className={`block text-[9px] uppercase font-bold tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Escopo e observações</label>
                    <textarea rows={2} placeholder="Etapas, responsáveis, acessos e entregáveis..." value={formData.implementationNotes} onChange={(e) => setFormData({ ...formData, implementationNotes: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm border resize-none" />
                  </div>
                </div>
              )}
            </div>

            {!editingId && (
              <div className={`md:col-span-3 rounded-xl border p-4 ${isDark ? 'border-emerald-500/20 bg-emerald-500/[0.035]' : 'border-emerald-200 bg-emerald-50'}`}>
                <label className="flex items-center justify-between gap-4 cursor-pointer">
                  <span>
                    <span className={`block text-xs font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>O cliente já realizou algum pagamento?</span>
                    <span className={`block text-[10px] mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Somente valores confirmados entram no faturamento e no saldo.</span>
                  </span>
                  <input type="checkbox" checked={formData.paymentReceived} onChange={(e) => setFormData({ ...formData, paymentReceived: e.target.checked })} className="h-4 w-4 accent-emerald-500" />
                </label>

                {formData.paymentReceived && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-emerald-500/15">
                    <div>
                      <label className={`block text-[9px] uppercase font-bold tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Referente a</label>
                      <select value={formData.paymentScope} onChange={(e) => setFormData({ ...formData, paymentScope: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm border">
                        <option value="recurring">Recorrência</option>
                        {formData.hasImplementation && <option value="implementation">Implementação</option>}
                        {formData.hasImplementation && <option value="both">Implementação + recorrência</option>}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-[9px] uppercase font-bold tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Forma de pagamento</label>
                      <select value={formData.paymentPlan} onChange={(e) => setFormData({ ...formData, paymentPlan: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm border">
                        <option value="full">100% pago</option>
                        <option value="split_50_50">50% agora + 50% depois</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-[9px] uppercase font-bold tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Data do recebimento</label>
                      <input type="date" value={formData.paymentDate} onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm border" />
                    </div>
                    {formData.paymentPlan === 'split_50_50' && (
                      <div>
                        <label className={`block text-[9px] uppercase font-bold tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Vencimento dos 50% restantes</label>
                        <input type="date" required value={formData.secondPaymentDate} onChange={(e) => setFormData({ ...formData, secondPaymentDate: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm border" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Extra CRM Fields */}
            <div>
              <label className={`block text-[9px] uppercase font-bold tracking-wider mb-1 opacity-70 ${isDark ? 'text-white' : 'text-gray-900'}`}>E-mail de Contato</label>
              <input
                type="email"
                placeholder="Ex: financeiro@empresa.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg text-sm border focus:ring-1 focus:ring-zinc-500 outline-none ${
                  isDark ? 'bg-[#161616] border-white/10 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>

            <div>
              <label className={`block text-[9px] uppercase font-bold tracking-wider mb-1 opacity-70 ${isDark ? 'text-white' : 'text-gray-900'}`}>Telefone principal</label>
              <input
                type="text"
                placeholder="Ex: (11) 99999-9999"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg text-sm border focus:ring-1 focus:ring-zinc-500 outline-none ${
                  isDark ? 'bg-[#161616] border-white/10 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>

            <div>
              <label className={`block text-[9px] uppercase font-bold tracking-wider mb-1 opacity-70 ${isDark ? 'text-white' : 'text-gray-900'}`}>CPF/CNPJ (necessário pra gerar cobrança Asaas)</label>
              <input
                type="text"
                placeholder="Ex: 12.345.678/0001-90"
                value={formData.cpf_cnpj}
                onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg text-sm border focus:ring-1 focus:ring-zinc-500 outline-none ${
                  isDark ? 'bg-[#161616] border-white/10 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>

            <div>
              <label className={`block text-[9px] uppercase font-bold tracking-wider mb-1 opacity-70 ${isDark ? 'text-white' : 'text-gray-900'}`}>Nicho / Setor de atuação</label>
              <input
                type="text"
                placeholder="Ex: Marketing Digital, Advocacia, SaaS..."
                value={formData.segment}
                onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg text-sm border focus:ring-1 focus:ring-zinc-500 outline-none ${
                  isDark ? 'bg-[#161616] border-white/10 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-[9px] uppercase font-bold tracking-wider mb-1 opacity-70 ${isDark ? 'text-white' : 'text-gray-900'}`}>Data de início</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg text-sm border focus:ring-1 focus:ring-zinc-500 outline-none ${
                    isDark ? 'bg-[#161616] border-white/10 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-[9px] uppercase font-bold tracking-wider mb-1 opacity-70 ${isDark ? 'text-white' : 'text-gray-900'}`}>Data de Vencimento</label>
                <div className="flex gap-1.5 mb-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setDueDateType('fixed');
                      if (!formData.nextPaymentDate || formData.nextPaymentDate.includes('-')) {
                        setFormData(prev => ({ ...prev, nextPaymentDate: 'day:10' }));
                      }
                    }}
                    className={`flex-1 py-1 px-1.5 rounded text-[10px] font-bold uppercase transition-all ${
                      dueDateType === 'fixed'
                        ? 'bg-zinc-500/20 text-zinc-500 border border-zinc-500/40'
                        : isDark ? 'bg-white/5 text-gray-400 border border-transparent' : 'bg-gray-100 text-gray-650 border border-transparent'
                    }`}
                  >
                    Dia Fixo Mensal
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDueDateType('specific');
                      if (!formData.nextPaymentDate || !formData.nextPaymentDate.includes('-')) {
                        setFormData(prev => ({ ...prev, nextPaymentDate: new Date().toISOString().substring(0, 10) }));
                      }
                    }}
                    className={`flex-1 py-1 px-1.5 rounded text-[10px] font-bold uppercase transition-all ${
                      dueDateType === 'specific'
                        ? 'bg-zinc-500/20 text-zinc-500 border border-zinc-500/40'
                        : isDark ? 'bg-white/5 text-gray-400 border border-transparent' : 'bg-gray-100 text-gray-650 border border-transparent'
                    }`}
                  >
                    Data Específica
                  </button>
                </div>

                {dueDateType === 'fixed' ? (
                  <select
                    value={formData.nextPaymentDate.startsWith('day:') ? formData.nextPaymentDate.replace('day:', '') : (isNaN(Number(formData.nextPaymentDate)) || Number(formData.nextPaymentDate) < 1 || Number(formData.nextPaymentDate) > 31 ? '10' : formData.nextPaymentDate)}
                    onChange={(e) => setFormData({ ...formData, nextPaymentDate: `day:${e.target.value}` })}
                    className={`w-full px-3 py-1.5 rounded-lg text-sm border focus:ring-1 focus:ring-zinc-500 outline-none cursor-pointer ${
                      isDark ? 'bg-[#161616] border-white/10 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <option key={`day-option-${day}`} value={day}>
                        Todo dia {day}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="date"
                    value={formData.nextPaymentDate.startsWith('day:') ? new Date().toISOString().substring(0, 10) : formData.nextPaymentDate}
                    onChange={(e) => setFormData({ ...formData, nextPaymentDate: e.target.value })}
                    className={`w-full px-3 py-1.5 rounded-lg text-sm border focus:ring-1 focus:ring-zinc-500 outline-none ${
                      isDark ? 'bg-[#161616] border-white/10 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                )}
              </div>
            </div>

            <div>
              <label className={`block text-[9px] uppercase font-bold tracking-wider mb-1 opacity-70 ${isDark ? 'text-white' : 'text-gray-900'}`}>Status do Contrato</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'churned' })}
                className={`w-full px-3 py-2 rounded-lg text-sm border focus:ring-1 focus:ring-zinc-500 outline-none ${
                  isDark ? 'bg-[#161616] border-white/10 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="active">Ativo (Na Base de Operações)</option>
                <option value="churned">Cancelado (Ex-Cliente / Churn)</option>
              </select>
            </div>

            <div>
              <label className={`block text-[9px] uppercase font-bold tracking-wider mb-1 opacity-70 ${isDark ? 'text-white' : 'text-gray-900'}`}>Logotipo do Cliente</label>
              {formData.logo ? (
                <div className="relative inline-block">
                  <img src={formData.logo} alt="Logo" className="h-10 w-10 object-contain rounded border border-neutral-300 dark:border-neutral-800 bg-white/5" />
                  <button
                    onClick={() => setFormData({ ...formData, logo: '' })}
                    className="absolute -top-1.5 -right-1.5 bg-zinc-500 text-white rounded-full p-0.5 hover:bg-zinc-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className={`w-full flex items-center justify-center p-2 border border-dashed rounded-lg cursor-pointer transition ${isDark ? 'border-white/20 hover:border-white/40' : 'border-gray-300 hover:border-gray-500'}`}>
                  <label className="cursor-pointer text-xs flex items-center gap-1.5">
                    <Image className="w-3.5 h-3.5" />
                    <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Fazer upload (Opcional)</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e: any) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = async (event) => {
                            if (event.target?.result) {
                              try {
                                const res = await fetch('/api/upload', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ image: event.target.result as string })
                                });
                                const data = await res.json();
                                if (data.url) setFormData({ ...formData, logo: data.url });
                              } catch (err) {
                                console.error(err);
                              }
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
              )}
            </div>

            <div>
              <label className={`block text-[9px] uppercase font-bold tracking-wider mb-1 opacity-70 ${isDark ? 'text-white' : 'text-gray-900'}`}>Notas e Acordos Gerais</label>
              <textarea
                placeholder="Especificações do projeto, datas críticas ou histórico..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className={`w-full px-3 py-1.5 rounded-lg text-sm border focus:ring-1 focus:ring-zinc-500 outline-none resize-none ${
                  isDark ? 'bg-[#161616] border-white/10 text-white' : 'bg-white border-gray-300 text-gray-900 font-sans'
                }`}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-2 border-t border-white/5">
            <button
              onClick={resetForm}
              className={`px-4 py-2 rounded-lg text-xs uppercase font-extrabold tracking-wider transition-colors cursor-pointer ${
                isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-600 hover:text-black hover:bg-gray-100'
              }`}
            >
              Voltar
            </button>
            <button
              onClick={handleSave}
              className={`flex items-center justify-center px-6 py-2.5 font-bold rounded-lg transition-all cursor-pointer text-xs uppercase tracking-wider ${
                !isDark
                  ? 'bg-black text-[#FFFFFF] hover:bg-gray-805'
                  : 'bg-white text-black hover:bg-gray-200'
              }`}
            >
              Salvar Cadastro
            </button>
          </div>
        </div>
      )}

      {/* 4. Receita Mensal (MRR) + Vencimentos Próximos — lado a lado, acima da carteira */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Receita Mensal (MRR) */}
        <div className={`rounded-2xl border p-5 sm:p-6 ${isDark ? 'bg-black/90 border-white/5' : 'bg-white border-black/5 shadow-[0_4px_20px_rgba(0,0,0,0.03)]'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Receita Mensal (MRR)</h3>
            <select
              value={mrrChartRange}
              onChange={(e) => setMrrChartRange(Number(e.target.value) as 3 | 6 | 12)}
              className={`px-2 py-1 rounded-lg text-[10px] font-semibold border cursor-pointer outline-none ${
                isDark ? 'bg-[#161616] border-white/10 text-gray-300' : 'bg-white border-gray-300 text-gray-700'
              }`}
            >
              <option value={3}>Últimos 3 meses</option>
              <option value={6}>Últimos 6 meses</option>
              <option value={12}>Últimos 12 meses</option>
            </select>
          </div>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mrrTrendData} margin={{ top: 5, right: 5, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                <XAxis
                  dataKey="label"
                  tickFormatter={(v: string) => v.split('/')[0]}
                  stroke="#71717a"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#71717a"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => formatBRL(v)}
                />
                <Tooltip
                  content={({ active, payload }: any) => {
                    if (!active || !payload || !payload.length) return null;
                    const point = payload[0].payload;
                    return (
                      <div className={`p-2.5 rounded-lg border shadow-xl font-mono text-[10px] ${
                        isDark ? 'bg-[#18181B]/95 border-white/10 text-white' : 'bg-white border-gray-200 text-zinc-900'
                      }`}>
                        <p className="font-bold mb-1">{point.label}</p>
                        <p>R$ {point.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                    );
                  }}
                  cursor={{ stroke: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', strokeWidth: 1 }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={isDark ? '#FFFFFF' : '#111111'}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Vencimentos Próximos */}
        <div className={`rounded-2xl border p-5 sm:p-6 ${isDark ? 'bg-black/90 border-white/5' : 'bg-white border-black/5 shadow-[0_4px_20px_rgba(0,0,0,0.03)]'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Vencimentos Próximos</h3>
            {upcomingPayments.length > 5 && (
              <button
                onClick={() => setShowAllUpcoming(v => !v)}
                className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black'}`}
              >
                {showAllUpcoming ? 'Ver menos' : 'Ver todos'}
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {visibleUpcomingPayments.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-500 flex flex-col items-center gap-2">
              <Clock className="w-6 h-6 opacity-40" />
              <span>Nenhum vencimento agendado.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleUpcomingPayments.map(({ client, info }) => {
                const day = info.targetDate ? String(info.targetDate.getDate()).padStart(2, '0') : '--';
                const monthAbbrev = info.targetDate ? PORTUGUESE_MONTHS_SHORT[info.targetDate.getMonth()].toUpperCase() : '';
                const daysLeft = info.daysLeft as number;
                return (
                  <div key={client.id} className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-lg flex flex-col items-center justify-center shrink-0 ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                      <span className={`text-sm font-bold leading-none ${isDark ? 'text-white' : 'text-gray-900'}`}>{day}</span>
                      <span className={`text-[8px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{monthAbbrev}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`font-semibold text-xs block truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{client.name}</span>
                      <span className={`text-[10px] block ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {client.is_recurring ? 'Pagamento recorrente' : 'Pagamento único'}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`font-mono font-bold text-xs block ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        R$ {client.contract_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        daysLeft === 0 ? 'bg-zinc-500/10 text-zinc-500' : 'bg-zinc-500/10 text-zinc-500'
                      }`}>
                        {daysLeft === 0 ? 'Hoje' : `Em ${daysLeft} dia${daysLeft !== 1 ? 's' : ''}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 5. Carteira de Clientes — largura total */}
      <div className={`rounded-2xl border p-5 sm:p-6 ${isDark ? 'bg-black/90 border-white/5' : 'bg-white border-black/5 shadow-[0_4px_20px_rgba(0,0,0,0.03)]'}`} id="clients-roster-panel">
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Carteira de Clientes</h3>
          </div>

          {/* Search + status filter + advanced filter + view toggle */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                type="text"
                placeholder="Buscar por cliente, e-mail ou setor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full pl-9 pr-4 py-2 rounded-lg text-sm border focus:ring-1 focus:ring-zinc-500 focus:outline-none transition-all ${
                  isDark ? 'bg-[#161616] border-white/10 text-white placeholder-gray-500' : 'bg-[#FAFAFA] border-gray-205 text-gray-950 placeholder-gray-400'
                }`}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'churned')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold border cursor-pointer outline-none ${
                isDark ? 'bg-[#161616] border-white/10 text-white' : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">Todos os status</option>
              <option value="active">Ativos</option>
              <option value="churned">Cancelados</option>
            </select>

            <button
              type="button"
              onClick={() => setShowDesktopFilters(prev => !prev)}
              title="Mais filtros"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer border transition-all ${
                showDesktopFilters
                  ? (isDark ? 'bg-white text-black border-white' : 'bg-black text-white border-black keep-white')
                  : (isDark ? 'bg-[#161616] border-white/10 text-gray-300 hover:text-white hover:border-white/20' : 'bg-white border-gray-200 text-gray-600 hover:text-black hover:bg-gray-100')
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>

            <div className={`flex items-center rounded-lg border p-0.5 shrink-0 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                title="Visualização em lista"
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  viewMode === 'table' ? (isDark ? 'bg-white text-black' : 'bg-black text-white keep-white') : (isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black')
                }`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title="Visualização em grade"
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  viewMode === 'grid' ? (isDark ? 'bg-white text-black' : 'bg-black text-white keep-white') : (isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black')
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Advanced filters: contract type + sort */}
          {showDesktopFilters && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-4 mt-4 border-t text-xs animate-fadeIn" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)' }}>
              {/* Contract Type Pills */}
              <div className="flex items-center gap-1.5">
                <span className={`${isDark ? 'text-gray-500' : 'text-gray-400'} font-semibold uppercase text-[9px]`}>Formato:</span>
                <div className="flex bg-[#141414] border border-white/5 rounded-lg p-0.5" style={{ backgroundColor: !isDark ? '#F3F4F6' : '', borderColor: !isDark ? '#E5E7EB' : '' }}>
                  {(['all', 'recurring', 'fixed'] as const).map(option => (
                    <button
                      key={option}
                      onClick={() => setContractFilter(option)}
                      className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-all uppercase tracking-wider cursor-pointer ${
                        contractFilter === option
                          ? isDark ? 'bg-white text-black' : 'bg-black text-white keep-white'
                          : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'
                      }`}
                    >
                      {option === 'all' ? 'Todos' : option === 'recurring' ? 'Mensal' : 'Fixo'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2">
                <span className={`${isDark ? 'text-gray-500' : 'text-gray-400'} font-semibold uppercase text-[9px]`}>Ordenar por:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] uppercase font-bold border transition-all cursor-pointer ${
                    isDark ? 'bg-[#1A1A1A] border-white/10 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="ltv">Faturamento (LTV)</option>
                  <option value="contract_value">Investimento Contrato</option>
                  <option value="name">Alfabética (A-Z)</option>
                  <option value="recent">ID (Ordem Criação)</option>
                </select>
              </div>
            </div>
          )}

          {/* Client roster */}
          <div className="mt-4">
            <span className={`text-[10px] uppercase tracking-wider font-semibold block mb-2 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
              Mostrando {filtered.length} de {clients.length} cliente{clients.length !== 1 ? 's' : ''}
            </span>

            {viewMode === 'table' ? (
              <div className="overflow-x-auto -mx-1 px-1">
                <table className="w-full text-xs sm:text-sm border-collapse min-w-[620px]">
                  <thead>
                    <tr className={`text-left border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                      <th className={`pb-3 pr-4 font-bold uppercase text-[9px] tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Cliente</th>
                      <th className={`pb-3 pr-4 font-bold uppercase text-[9px] tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Status</th>
                      <th className={`pb-3 pr-4 font-bold uppercase text-[9px] tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>MRR</th>
                      <th className={`pb-3 pr-4 font-bold uppercase text-[9px] tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>LTV</th>
                      <th className={`pb-3 pr-4 font-bold uppercase text-[9px] tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Próx. Pgto</th>
                      <th className={`pb-3 pr-2 font-bold uppercase text-[9px] tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Retenção</th>
                      <th className={`pb-3 pl-2 font-bold uppercase text-[9px] tracking-wider text-right ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Ações</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-gray-100'}`}>
                    {filtered.map(c => {
                      const clientPayments = transactions.filter(t => t.clientId === c.id && t.type === 'income');
                      const totalPaidAmount = clientPayments.reduce((acc, t) => acc + t.amount, 0);
                      const isExpanded = expandedClientId === c.id;
                      const paymentInfo = getPaymentInfo(c.nextPaymentDate);
                      const paymentDaysLeft = paymentInfo.daysLeft;
                      const retention = c.status === 'active' ? 100 : 0;

                      return (
                        <React.Fragment key={c.id}>
                          <tr
                            className={`transition-colors cursor-pointer ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50'}`}
                            onClick={() => setExpandedClientId(isExpanded ? null : c.id)}
                          >
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-[10px] shrink-0 overflow-hidden ${
                                  c.status === 'active' ? 'bg-zinc-500/10 text-zinc-500' : 'bg-gray-500/10 text-gray-500'
                                }`}>
                                  {c.logo ? (
                                    <img src={c.logo} alt={c.name} className="w-full h-full object-cover" />
                                  ) : (
                                    c.name.slice(0, 2).toUpperCase()
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <span className={`font-semibold tracking-tight block truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{c.name}</span>
                                  <span className={`text-[10px] font-mono truncate block ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{c.segment || 'Ramo não informado'}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 pr-4">
                              {c.status === 'active' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 whitespace-nowrap">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.65)]"></span>
                                  Ativo
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-zinc-500/10 text-zinc-500 whitespace-nowrap">
                                  Cancelado
                                </span>
                              )}
                            </td>
                            <td className="py-3 pr-4 whitespace-nowrap">
                              <span className={`font-mono font-semibold block ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                                R$ {c.contract_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                              <span className={`text-[9px] font-semibold uppercase tracking-wider ${
                                c.is_recurring ? (isDark ? 'text-zinc-400' : 'text-zinc-600') : (isDark ? 'text-zinc-500/80' : 'text-zinc-600')
                              }`}>
                                {c.is_recurring ? 'Mensal' : 'Fixo'}
                              </span>
                            </td>
                            <td className="py-3 pr-4 whitespace-nowrap">
                              <span className="font-mono font-bold text-zinc-500 block">
                                R$ {totalPaidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                              <span className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                {clientPayments.length} recebimento{clientPayments.length !== 1 ? 's' : ''}
                              </span>
                            </td>
                            <td className="py-3 pr-4 whitespace-nowrap">
                              {c.nextPaymentDate ? (
                                <>
                                  <span className={`font-mono font-bold block ${
                                    paymentDaysLeft !== null && paymentDaysLeft < 0 ? 'text-zinc-500' : paymentDaysLeft !== null && paymentDaysLeft <= 5 ? 'text-zinc-500' : (isDark ? 'text-gray-300' : 'text-gray-700')
                                  }`}>
                                    {paymentInfo.displayStr}
                                  </span>
                                  {paymentDaysLeft !== null && (
                                    <span className={`text-[9px] uppercase font-bold tracking-wider ${
                                      paymentDaysLeft < 0 ? 'text-zinc-500/70' : paymentDaysLeft <= 5 ? 'text-zinc-500/70' : 'text-gray-500'
                                    }`}>
                                      {paymentDaysLeft < 0 ? 'Vencido' : paymentDaysLeft === 0 ? 'Hoje' : `Em ${paymentDaysLeft} dia${paymentDaysLeft !== 1 ? 's' : ''}`}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-gray-500 font-mono">--</span>
                              )}
                            </td>
                            <td className="py-3 pr-2 min-w-[90px]">
                              <div className="flex items-center gap-1.5">
                                <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}>
                                  <div
                                    className="h-full rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.45)]"
                                    style={{ width: `${retention}%` }}
                                  />
                                </div>
                                <span className={`text-[10px] font-mono font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{retention}%</span>
                              </div>
                            </td>
                            <td className="py-3 pl-2">
                              <div className="flex items-center justify-end gap-0.5 relative">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setExpandedClientId(isExpanded ? null : c.id); }}
                                  title="Ver detalhes"
                                  className={`p-1 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-black hover:bg-gray-100'}`}
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); startEdit(c); }}
                                  title="Editar Ficha"
                                  className={`p-1 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-600 hover:text-black hover:bg-gray-100'}`}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleActionMenu(c.id); }}
                                  title="Mais opções"
                                  className={`p-1 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-600 hover:text-black hover:bg-gray-100'}`}
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>
                                {openMenuId === c.id && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    className={`absolute right-0 top-full mt-1 w-48 rounded-lg border shadow-2xl z-20 py-1 text-xs animate-fadeIn ${isDark ? 'bg-[#161616] border-white/10' : 'bg-white border-gray-200'}`}
                                  >
                                    <button
                                      onClick={() => handleToggleStatus(c)}
                                      className={`w-full text-left px-3 py-2 transition-colors ${isDark ? 'text-gray-300 hover:bg-white/5 hover:text-white' : 'text-gray-700 hover:bg-gray-50 hover:text-black'}`}
                                    >
                                      {c.status === 'active' ? 'Marcar como Cancelado' : 'Marcar como Ativo'}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={7} className="p-0">
                                <div className={`p-4 sm:p-5 border-b ${isDark ? 'bg-white/[0.015] border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                                  {renderClientDetail(c)}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map(c => {
                  const clientPayments = transactions.filter(t => t.clientId === c.id && t.type === 'income');
                  const totalPaidAmount = clientPayments.reduce((acc, t) => acc + t.amount, 0);
                  const isExpanded = expandedClientId === c.id;
                  const paymentInfo = getPaymentInfo(c.nextPaymentDate);

                  return (
                    <div
                      key={c.id}
                      className={`${isExpanded ? 'sm:col-span-2 xl:col-span-3' : ''} rounded-xl border p-4 cursor-pointer transition-all ${
                        isDark ? 'bg-white/[0.015] border-white/5 hover:border-white/10' : 'bg-white border-gray-100 hover:border-gray-200'
                      }`}
                      onClick={() => setExpandedClientId(isExpanded ? null : c.id)}
                    >
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 overflow-hidden ${
                            c.status === 'active' ? 'bg-zinc-500/10 text-zinc-500' : 'bg-gray-500/10 text-gray-500'
                          }`}>
                            {c.logo ? (
                              <img src={c.logo} alt={c.name} className="w-full h-full object-cover" />
                            ) : (
                              c.name.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className={`font-semibold tracking-tight block truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{c.name}</span>
                            <span className={`text-[10px] font-mono truncate block ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{c.segment || 'Ramo não informado'}</span>
                          </div>
                        </div>
                        {c.status === 'active' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 whitespace-nowrap shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.65)]" />
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-zinc-500/10 text-zinc-500 whitespace-nowrap shrink-0">Cancelado</span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className={`block text-[9px] uppercase tracking-wider font-extrabold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>MRR</span>
                          <span className={`font-mono font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>R$ {c.contract_value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div>
                          <span className={`block text-[9px] uppercase tracking-wider font-extrabold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>LTV</span>
                          <span className="font-mono font-bold text-zinc-500">R$ {totalPaidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="col-span-2">
                          <span className={`block text-[9px] uppercase tracking-wider font-extrabold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Próx. Pgto</span>
                          <span className={`font-mono ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{paymentInfo.displayStr}</span>
                        </div>
                      </div>

                      {isExpanded && (
                        <div
                          className={`mt-4 pt-4 border-t ${isDark ? 'border-white/5' : 'border-gray-100'}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {renderClientDetail(c)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {filtered.length === 0 && (
              <div className="py-16 text-center">
                <div className="flex flex-col items-center justify-center space-y-2 text-gray-400">
                  <HelpCircle className="w-7 h-7 opacity-50" />
                  <p className="font-semibold">Nenhum cliente atende aos parâmetros de filtro aplicados.</p>
                  <p className="text-xs font-normal opacity-70">Tente buscar por termos diferentes ou cadastre novos clientes acima.</p>
                </div>
              </div>
            )}
          </div>
        </div>

      {/* 5. Resumo Financeiro */}
      <div className={`rounded-2xl border p-5 sm:p-6 ${isDark ? 'bg-black/90 border-white/5' : 'bg-white border-black/5 shadow-[0_4px_20px_rgba(0,0,0,0.03)]'}`}>
        <h3 className={`text-sm font-bold mb-5 ${isDark ? 'text-white' : 'text-gray-900'}`}>Resumo Financeiro</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
          <div>
            <span className={`block text-[9px] uppercase tracking-wider font-extrabold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Faturamento Mensal</span>
            <span className={`text-lg font-mono font-bold block mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              R$ {mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Receita recorrente atual</span>
          </div>
          <div>
            <span className={`block text-[9px] uppercase tracking-wider font-extrabold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Faturamento Anual</span>
            <span className={`text-lg font-mono font-bold block mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              R$ {arr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Projetado (MRR x 12)</span>
          </div>
          <div>
            <span className={`block text-[9px] uppercase tracking-wider font-extrabold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Recebido Total</span>
            <span className="text-lg font-mono font-bold block mt-1 text-zinc-500">
              R$ {totalHistoricalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Total de recebimentos</span>
          </div>
          <div>
            <span className={`block text-[9px] uppercase tracking-wider font-extrabold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Em Aberto</span>
            <span className={`text-lg font-mono font-bold block mt-1 ${emAberto > 0 ? 'text-zinc-500' : (isDark ? 'text-white' : 'text-gray-900')}`}>
              R$ {emAberto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Valores pendentes</span>
          </div>
          <div>
            <span className={`block text-[9px] uppercase tracking-wider font-extrabold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Taxa de Adimplência</span>
            <span className="text-lg font-mono font-bold block mt-1 text-zinc-500">{adimplenciaRate.toFixed(0)}%</span>
            <span className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Pagamentos em dia</span>
          </div>
        </div>
      </div>
    </div>
  );
}
