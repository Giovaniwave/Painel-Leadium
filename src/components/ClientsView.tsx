import React, { useState, useEffect } from 'react';
import { Client, Transaction } from '../types';
import { formatSystemDate } from '../utils/date';
import { 
  Plus, Users, Search, Edit2, CheckCircle2, XCircle, ChevronDown, ChevronRight, 
  Activity, Mail, Phone, Briefcase, Calendar, FileText, Check, Link, 
  TrendingUp, Sparkles, DollarSign, ArrowUpRight, Building2, HelpCircle, FileCheck2, Trash2, Sliders
} from 'lucide-react';

interface ClientsViewProps {
  clients: Client[];
  transactions?: Transaction[];
  onAddClient: (client: Omit<Client, 'id'>) => void;
  onUpdateClient: (client: Client) => void;
  onAddTransaction?: (transaction: Omit<Transaction, 'id'>) => void;
  onUpdateTransactions?: (transactions: Transaction[]) => void;
  theme: 'dark' | 'light';
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
  
  // Collapsible and expanded toggles
  const [showDesktopFilters, setShowDesktopFilters] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  
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
    notes: ''
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
        notes: c.notes || localData.notes || ''
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
      notes: ''
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSave = () => {
    if (!formData.name.trim() || !formData.contract_value) return;
    
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
      notes: formData.notes.trim()
    };
    
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
    
    resetForm();
  };

  const startEdit = (c: Client) => {
    // Read from DB values first, fallback to cached metadata in localStorage
    let cachedMeta = { 
      email: c.email || '', 
      phone: c.phone || '', 
      segment: c.segment || '', 
      start_date: c.start_date || new Date().toISOString().substring(0, 10), 
      notes: c.notes || '' 
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
            notes: cachedMeta.notes || parsed.notes || ''
          };
        } catch (e) {}
      }
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
      notes: cachedMeta.notes
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
      sender: clientName,
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

  // Calculate top historical client dynamically
  const getTopClient = () => {
    if (clients.length === 0) return null;
    let maxLtv = -1;
    let topC: Client | null = null;
    clients.forEach(c => {
      const cLtv = transactions.filter(t => t.type === 'income' && t.clientId === c.id).reduce((sum, t) => sum + t.amount, 0);
      if (cLtv > maxLtv) {
        maxLtv = cLtv;
        topC = c;
      }
    });
    return topC ? { client: topC, ltv: maxLtv } : null;
  };

  const topClientInfo = getTopClient();

  // Find orphaned income transactions (Income with sender matching client name but no id, or no clientId at all)
  const orphanedTransactions = transactions.filter(t => {
    if (t.type !== 'income') return false;
    // Unassigned transactions
    if (!t.clientId || t.clientId === '') return true;
    return false;
  });

  return (
    <div className="space-y-6 animate-fadeIn" id="clients-view-master">
      {/* 1. Header and Welcome Area */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-white/10 pb-6 gap-4">
        <div className="text-left animate-fadeIn">
          <h2 className={`text-4xl font-serif italic font-light tracking-tighter ${isDark ? 'text-white' : 'text-gray-900'}`}>Carteira de Clientes</h2>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#666666] mt-1">Acompanhamento de contratos e LTV acumulado</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className={`px-6 py-2.5 font-medium rounded-lg transition-all cursor-pointer text-xs uppercase tracking-widest shadow-md hover:scale-[1.02] active:scale-[0.98] ${
            theme === 'light'
              ? 'bg-black text-[#FFFFFF] hover:bg-gray-800'
              : 'bg-white text-black hover:bg-gray-200'
          }`}
          id="btn-new-client"
        >
          Novo Cliente
        </button>
      </div>

      {/* 2. Premium Business HUD Analytics Meter Roster (6 high-density cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4" id="clients-kpi-hud">
        {/* Card 1: MRR */}
        <div 
          className="metric-card-interactive p-4 rounded-xl border shadow-sm flex flex-col justify-between relative overflow-hidden group cursor-pointer"
          style={{ 
            '--card-highlight': '#10B981', 
            '--card-glow': 'rgba(16, 185, 129, 0.15)' 
          } as React.CSSProperties}
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full filter blur-xl group-hover:bg-emerald-500/10 transition-colors"></div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[9px] uppercase tracking-wider font-extrabold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>MRR Contratos</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <h3 className={`text-lg sm:text-lg font-mono font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
              R$ {mrr.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </h3>
          </div>
          <p className={`text-[10px] mt-1 font-sans ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Recebimento mensal</p>
        </div>

        {/* Card 2: ARR */}
        <div 
          className="metric-card-interactive p-4 rounded-xl border shadow-sm flex flex-col justify-between relative overflow-hidden group cursor-pointer"
          style={{ 
            '--card-highlight': '#3B82F6', 
            '--card-glow': 'rgba(59, 130, 246, 0.15)' 
          } as React.CSSProperties}
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full filter blur-xl group-hover:bg-blue-500/10 transition-colors"></div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[9px] uppercase tracking-wider font-extrabold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>ARR Projetado</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <h3 className={`text-lg sm:text-lg font-mono font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
              R$ {arr.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </h3>
          </div>
          <p className={`text-[10px] mt-1 font-sans ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Múltiplo anual (MRR * 12)</p>
        </div>

        {/* Card 3: LTV Acumulado */}
        <div 
          className="metric-card-interactive p-4 rounded-xl border shadow-sm flex flex-col justify-between relative overflow-hidden group cursor-pointer"
          style={{ 
            '--card-highlight': '#F59E0B', 
            '--card-glow': 'rgba(245, 158, 11, 0.15)' 
          } as React.CSSProperties}
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full filter blur-xl group-hover:bg-amber-500/10 transition-colors"></div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[9px] uppercase tracking-wider font-extrabold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>LTV Acumulado</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <h3 className={`text-lg sm:text-lg font-mono font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
              R$ {totalHistoricalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </h3>
          </div>
          <p className={`text-[10px] mt-1 font-sans ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Soma de recebimentos</p>
        </div>

        {/* Card 4: Ticket Médio */}
        <div 
          className="metric-card-interactive p-4 rounded-xl border shadow-sm flex flex-col justify-between relative overflow-hidden group cursor-pointer"
          style={{ 
            '--card-highlight': '#8B5CF6', 
            '--card-glow': 'rgba(139, 92, 246, 0.15)' 
          } as React.CSSProperties}
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full filter blur-xl group-hover:bg-purple-500/10 transition-colors"></div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[9px] uppercase tracking-wider font-extrabold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Ticket Médio</span>
              <DollarSign className="w-3.5 h-3.5 text-purple-500" />
            </div>
            <h3 className={`text-lg sm:text-lg font-mono font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
              R$ {averageContractValue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </h3>
          </div>
          <p className={`text-[10px] mt-1 font-sans ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Valor médio mensal</p>
        </div>

        {/* Card 5: Clientes Ativos */}
        <div 
          className="metric-card-interactive p-4 rounded-xl border shadow-sm flex flex-col justify-between relative overflow-hidden group cursor-pointer"
          style={{ 
            '--card-highlight': '#F59E0B', 
            '--card-glow': 'rgba(245, 158, 11, 0.15)' 
          } as React.CSSProperties}
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full filter blur-xl group-hover:bg-amber-500/10 transition-colors"></div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[9px] uppercase tracking-wider font-extrabold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Carteira</span>
              <Users className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <h3 className={`text-xl sm:text-lg font-mono font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {activeClientsList.length} <span className="text-[10px] text-gray-500">/ {totalClientsCount}</span>
            </h3>
          </div>
          <p className={`text-[10px] mt-1 font-sans ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Clientes ativos hoje</p>
        </div>

        {/* Card 6: Churn Rate */}
        <div 
          className="metric-card-interactive p-4 rounded-xl border shadow-sm flex flex-col justify-between relative overflow-hidden group cursor-pointer"
          style={{ 
            '--card-highlight': '#EF4444', 
            '--card-glow': 'rgba(239, 68, 68, 0.15)' 
          } as React.CSSProperties}
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/5 rounded-full filter blur-xl group-hover:bg-red-500/10 transition-colors"></div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[9px] uppercase tracking-wider font-extrabold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Retention / Churn</span>
              <Activity className="w-3.5 h-3.5 text-red-500" />
            </div>
            <h3 className={`text-lg sm:text-lg font-mono font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {retentionRate.toFixed(0)}% <span className={`text-[10px] ${churnRate > 0 ? 'text-red-500' : 'text-gray-500'}`}>({churnRate.toFixed(0)}% ch.)</span>
            </h3>
          </div>
          <p className={`text-[10px] mt-1 font-sans ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Taxa de permanência</p>
        </div>
      </div>

      {/* 3. Segment Filter & Search Control Panel */}
      <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#121212] border-white/10' : 'bg-white border-black/5'} shadow-sm space-y-4`} id="clients-filter-card">
        <div className="flex flex-col gap-4">
          <div className="flex gap-3 items-center">
            {/* Search bar */}
            <div className="relative flex-1">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                type="text"
                placeholder="Buscar por cliente, e-mail, setor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full pl-9 pr-4 py-2 rounded-lg text-sm border focus:ring-1 focus:ring-amber-500 focus:outline-none transition-all ${
                  isDark ? 'bg-[#161616] border-white/10 text-white placeholder-gray-500' : 'bg-[#FAFAFA] border-gray-205 text-gray-950 placeholder-gray-400'
                }`}
              />
            </div>

            {/* Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setShowDesktopFilters(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer border transition-all ${
                showDesktopFilters
                  ? (isDark ? 'bg-white text-black border-white' : 'bg-black text-white border-black keep-white')
                  : (isDark ? 'bg-[#161616] border-white/10 text-gray-300 hover:text-white hover:border-white/20' : 'bg-white border-gray-200 text-gray-600 hover:text-black hover:bg-gray-100')
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{showDesktopFilters ? 'Ocultar Filtros' : 'Filtrar'}</span>
            </button>
          </div>

          {/* Filtering Pillars: Rendered conditionally based on toggle */}
          {showDesktopFilters && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-4 pt-4 border-t border-white/5 text-xs animate-fadeIn" style={{ borderColor: !isDark ? 'rgba(0,0,0,0.06)' : '' }}>
              {/* Status Selector Pills */}
              <div className="flex items-center gap-1.5">
                <span className={`${isDark ? 'text-gray-500' : 'text-gray-400'} font-semibold uppercase text-[9px]`}>Status:</span>
                <div className="flex bg-[#141414] border border-white/5 rounded-lg p-0.5" style={{ backgroundColor: !isDark ? '#F3F4F6' : '', borderColor: !isDark ? '#E5E7EB' : '' }}>
                  {(['all', 'active', 'churned'] as const).map(option => (
                    <button
                      key={option}
                      onClick={() => setStatusFilter(option)}
                      className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-all uppercase tracking-wider cursor-pointer ${
                        statusFilter === option
                          ? isDark ? 'bg-white text-black' : 'bg-black text-white keep-white'
                          : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'
                      }`}
                    >
                      {option === 'all' ? 'Todos' : option === 'active' ? 'Ativos' : 'Cancelados'}
                    </button>
                  ))}
                </div>
              </div>

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
        </div>

        {/* Removed dynamic banner for top contributing customer as per user feedback */}

        {/* 4. CRM Addition/Editing Modal UI */}
        {isAdding && (
          <div className={`p-4 sm:p-5 rounded-2xl border ${isDark ? 'bg-black/50 border-white/10' : 'bg-gray-50 border-gray-200'} space-y-4`} id="add-client-collapsible-form">
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
                  className={`w-full px-3 py-2 rounded-lg text-sm border focus:ring-1 focus:ring-amber-500 outline-none ${
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
                  className={`w-full px-3 py-2 rounded-lg text-sm border focus:ring-1 focus:ring-amber-500 outline-none ${
                    isDark ? 'bg-[#161616] border-white/10 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-[9px] uppercase font-bold tracking-wider mb-1 opacity-70 ${isDark ? 'text-white' : 'text-gray-900'}`}>Tipo de Faturamento</label>
                <select
                  value={formData.is_recurring ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, is_recurring: e.target.value === 'true' })}
                  className={`w-full px-3 py-2 rounded-lg text-sm border focus:ring-1 focus:ring-amber-500 outline-none ${
                    isDark ? 'bg-[#161616] border-white/10 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="true">Pagamento Mensal (Recorrente / MRR)</option>
                  <option value="false">Projeto Fechado / Valor Único (Fixo)</option>
                </select>
              </div>

              {/* Extra CRM Fields */}
              <div>
                <label className={`block text-[9px] uppercase font-bold tracking-wider mb-1 opacity-70 ${isDark ? 'text-white' : 'text-gray-900'}`}>E-mail de Contato</label>
                <input
                  type="email"
                  placeholder="Ex: financeiro@empresa.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg text-sm border focus:ring-1 focus:ring-amber-500 outline-none ${
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
                  className={`w-full px-3 py-2 rounded-lg text-sm border focus:ring-1 focus:ring-amber-500 outline-none ${
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
                  className={`w-full px-3 py-2 rounded-lg text-sm border focus:ring-1 focus:ring-amber-500 outline-none ${
                    isDark ? 'bg-[#161616] border-white/10 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-[9px] uppercase font-bold tracking-wider mb-1 opacity-70 ${isDark ? 'text-white' : 'text-gray-900'}`}>Data de início de contrato</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg text-sm border focus:ring-1 focus:ring-amber-500 outline-none ${
                    isDark ? 'bg-[#161616] border-white/10 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-[9px] uppercase font-bold tracking-wider mb-1 opacity-70 ${isDark ? 'text-white' : 'text-gray-900'}`}>Status do Contrato</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'churned' })}
                  className={`w-full px-3 py-2 rounded-lg text-sm border focus:ring-1 focus:ring-amber-500 outline-none ${
                    isDark ? 'bg-[#161616] border-white/10 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="active">Ativo (Na Base de Operações)</option>
                  <option value="churned">Cancelado (Ex-Cliente / Churn)</option>
                </select>
              </div>

              <div>
                <label className={`block text-[9px] uppercase font-bold tracking-wider mb-1 opacity-70 ${isDark ? 'text-white' : 'text-gray-900'}`}>Notas e Acordos Gerais</label>
                <textarea
                  placeholder="Especificações do projeto, datas críticas ou histórico..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className={`w-full px-3 py-1.5 rounded-lg text-sm border focus:ring-1 focus:ring-amber-500 outline-none resize-none ${
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

        {/* 5. Clientes Core Responsive Views */}

        {/* MOBILE RESPONSIVE CARDS VIEW (Clean & interactive for Smartphones) */}
        <div className="block md:hidden space-y-4" id="clients-mobile-list">
          {filtered.map(c => {
            const clientPayments = transactions.filter(t => t.clientId === c.id && t.type === 'income');
            const totalPaidAmount = clientPayments.reduce((acc, t) => acc + t.amount, 0);
            const isExpanded = expandedClientId === c.id;

            const segmentText = c.segment || 'Ramo não informado';
            const joinDateText = c.start_date ? new Date(c.start_date).toLocaleDateString('pt-BR') : '';
            const shareOfLtv = totalHistoricalRevenue > 0 
              ? (totalPaidAmount / totalHistoricalRevenue) * 100 
              : 0;

            return (
              <div 
                key={`mobile-client-${c.id}`}
                className={`p-4 rounded-xl border transition-all duration-300 ${
                  isExpanded 
                    ? isDark ? 'bg-white/[0.03] border-white/20 shadow-lg' : 'bg-gray-50 border-gray-300 shadow-md' 
                    : isDark ? 'bg-[#121212] border-white/10 hover:bg-white/[0.01]' : 'bg-white border-gray-200 hover:bg-gray-50 shadow-xs'
                }`}
              >
                {/* Mobile Card Header */}
                <div 
                  className="flex items-start justify-between gap-3 cursor-pointer"
                  onClick={() => setExpandedClientId(isExpanded ? null : c.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                      c.status === 'active'
                        ? 'bg-amber-500/10 text-amber-500'
                        : 'bg-gray-500/10 text-gray-500'
                    }`}>
                      {c.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className={`font-semibold tracking-tight ${isDark ? 'text-white' : 'text-gray-900 text-sm'}`}>
                        {c.name}
                      </h4>
                      <p className={`text-[10px] font-mono mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {segmentText}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {c.status === 'active' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8.5px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500">
                        <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                        Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[8.5px] font-bold uppercase tracking-wider bg-red-500/10 text-red-500">
                        Cancelado
                      </span>
                    )}
                    <span className="text-gray-400 mt-1">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </span>
                  </div>
                </div>

                {/* Compact Financial Highlights */}
                <div className="grid grid-cols-2 gap-2 mt-3.5 pt-3 border-t border-dashed border-white/5" style={{ borderColor: !isDark ? 'rgba(0,0,0,0.06)' : '' }}>
                  <div>
                    <span className={`text-[8.5px] uppercase tracking-wider font-extrabold block mb-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      Valor Contrato:
                    </span>
                    <div className={`font-mono font-bold text-xs ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                      R$ {c.contract_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <div className={`text-[9px] font-semibold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                      {c.is_recurring ? 'RECORRENTE MENSAL' : 'PROJETO FIXO'}
                    </div>
                  </div>

                  <div>
                    <span className={`text-[8.5px] uppercase tracking-wider font-extrabold block mb-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      Total Pago (LTV):
                    </span>
                    <div className={`font-mono font-bold text-xs ${isDark ? 'text-white font-bold' : 'text-gray-900 font-bold'}`}>
                      R$ {totalPaidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <div className={`text-[9px] font-semibold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      {clientPayments.length} recebimentos
                    </div>
                  </div>
                </div>

                {/* Touch Tap targets for Client Sheet Drawer */}
                <div className="flex gap-2.5 mt-3.5 pt-3 border-t border-dashed border-white/5" style={{ borderColor: !isDark ? 'rgba(0,0,0,0.06)' : '' }}>
                  <button
                    onClick={() => setExpandedClientId(isExpanded ? null : c.id)}
                    className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer border flex justify-center items-center gap-1 transition-all ${
                      isDark 
                        ? 'bg-white/5 text-gray-200 border-white/10 hover:bg-white/10' 
                        : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {isExpanded ? 'Ocultar Detalhes' : 'Analisar Ficha'}
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(c);
                    }}
                    className={`px-4 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer border flex items-center justify-center gap-1 transition-all ${
                      isDark 
                        ? 'bg-white/5 text-white border-white/10 hover:bg-white/10' 
                        : 'bg-gray-100 text-gray-750 border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    <Edit2 className="w-3 h-3" />
                    Editar
                  </button>
                </div>

                {/* MOBILE DETAILED SUB-PANEL EXPAND ACCORDION */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-dashed border-white/5 space-y-4 animate-fadeIn" style={{ borderColor: !isDark ? 'rgba(0,0,0,0.06)' : '' }}>
                    {/* CRM Client specs */}
                    <div className={`p-4 rounded-xl border space-y-4 ${isDark ? 'bg-black/30 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                      <h5 className={`text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-white/5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} style={{ borderColor: !isDark ? 'rgba(0,0,0,0.06)' : '' }}>
                        <Building2 className="w-3.5 h-3.5" />
                        Ficha Cadastral
                      </h5>
                      
                      <div className="space-y-3 text-[11px] font-mono leading-none">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-500 shrink-0" />
                          {c.email ? (
                            <a href={`mailto:${c.email}`} className={`hover:underline break-all ${isDark ? 'text-gray-300' : 'text-gray-750'}`}>
                              {c.email}
                            </a>
                          ) : (
                            <span className="text-gray-500 italic">Sem e-mail cadastrado</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-500 shrink-0" />
                          {c.phone ? (
                            <span className={isDark ? 'text-gray-300' : 'text-gray-750'}>{c.phone}</span>
                          ) : (
                            <span className="text-gray-500 italic">Sem telefone informado</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
                          <span className={`${isDark ? 'text-gray-350' : 'text-gray-600'}`}>
                            Início: <strong className={isDark ? 'text-white' : 'text-gray-900'}>{joinDateText || 'Indefinido'}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Notes Section */}
                      <div className="pt-2 border-t border-white/5 space-y-1 text-xs" style={{ borderColor: !isDark ? 'rgba(0,0,0,0.06)' : '' }}>
                        <span className="text-[9px] font-extrabold uppercase tracking-wide text-gray-500 block">Notas de Observação:</span>
                        <p 
                          onClick={() => toggleNotesExpanded(c.id)}
                          className={`p-2.5 rounded-lg text-xs leading-relaxed italic cursor-pointer select-none transition-all duration-300 break-words ${
                            isDark 
                              ? 'bg-[#181818] text-gray-400 hover:text-white hover:bg-[#202020]' 
                              : 'bg-white text-gray-650 border border-gray-150 hover:text-black hover:bg-gray-100'
                          } ${expandedNotes[c.id] ? 'whitespace-pre-wrap' : 'line-clamp-2 overflow-hidden'}`}
                          title="Clique para expandir / ocultar"
                        >
                          {c.notes || "Sem observações críticas registradas no contrato deste cliente."}
                        </p>
                        {c.notes && (
                          <button 
                            type="button"
                            onClick={() => toggleNotesExpanded(c.id)}
                            className="text-[9px] text-[#FF4D00]/70 cursor-pointer block mt-0.5 hover:underline"
                          >
                            {expandedNotes[c.id] ? '[- Recolher Observação]' : '[+ Ver Observação Completa]'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Received Invoices on Mobile */}
                    <div className={`p-4 rounded-xl border space-y-3.5 ${isDark ? 'bg-black/30 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex justify-between items-center pb-2 border-b border-white/5" style={{ borderColor: !isDark ? 'rgba(0,0,0,0.06)' : '' }}>
                        <h5 className={`text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          <Activity className="w-3.5 h-3.5" />
                          Histórico ({clientPayments.length})
                        </h5>
                        <span className={`text-xs font-mono font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          R$ {totalPaidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {clientPayments.length > 0 ? (
                        <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                          {clientPayments.map(t => (
                            <div 
                              key={`mobile-payments-ledger-${t.id}`}
                              className={`flex items-center justify-between p-2 rounded-lg border text-xs ${
                                isDark ? 'bg-[#141414] border-white/5' : 'bg-white border-black/5'
                              }`}
                            >
                              <div className="flex flex-col min-w-0 pr-2">
                                <span className={`font-semibold tracking-tight truncate ${isDark ? 'text-gray-250' : 'text-gray-800'}`}>{t.description}</span>
                                <span className="text-[9.5px] text-gray-500 mt-0.5 font-mono">
                                  {formatSystemDate(t.date)} • {t.account}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-emerald-500 font-mono font-bold">
                                  + R$ {t.amount}
                                </span>
                                <button
                                  onClick={() => {
                                    if (confirm("Deseja realmente desvincular este faturamento desta ficha?")) {
                                      handleUnlinkTransaction(t.id);
                                    }
                                  }}
                                  className="text-gray-500 hover:text-red-400 p-1 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-4 text-center text-xs italic text-gray-500">
                          Nenhum faturamento registrado.
                        </div>
                      )}
                    </div>

                     {/* Quick Recebimento & link blocks on Mobile */}
                     <div className="space-y-3.5">
                       {onAddTransaction && (
                         <div className={`space-y-2 p-3.5 rounded-lg border ${isDark ? 'bg-white/[0.015] border-white/5' : 'bg-gray-50 border-gray-250/65'}`}>
                           <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDark ? 'text-gray-350' : 'text-gray-650'}`}>
                             <Check className="w-3.5 h-3.5" />
                             Registrar Recebimento Expresso
                           </span>
                           
                           <div className="grid grid-cols-1 gap-2">
                             <input
                               type="number"
                               placeholder="Valor R$ (ex: 1500)"
                               value={quickAmount}
                               onChange={(e) => setQuickAmount(e.target.value)}
                               className={`w-full px-3 py-2.5 rounded text-xs border outline-none font-mono ${
                                 isDark ? 'bg-black/50 border-white/10 text-white' : 'bg-white border-gray-300 text-gray-900'
                               }`}
                             />
                             <input
                               type="text"
                               placeholder="Descrição do faturamento"
                               value={quickDescription}
                               onChange={(e) => setQuickDescription(e.target.value)}
                               className={`w-full px-3 py-2.5 rounded text-xs border outline-none ${
                                 isDark ? 'bg-black/50 border-white/10 text-white' : 'bg-white border-gray-300 text-gray-900'
                               }`}
                             />
                             <input
                               type="date"
                               value={quickDate}
                               onChange={(e) => setQuickDate(e.target.value)}
                               className={`w-full px-3 py-2.5 rounded text-xs border outline-none ${
                                 isDark ? 'bg-black/50 border-white/10 text-white' : 'bg-white border-gray-300 text-gray-900 font-mono'
                               }`}
                             />
                           </div>
                           
                           <button
                             onClick={() => handleRecordQuickPayment(c.id, c.name)}
                             disabled={isRecordingPayment}
                             className={`w-full py-2.5 rounded-lg text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer ${
                               isDark 
                                 ? 'bg-white text-black hover:bg-gray-200' 
                                 : 'bg-black text-white hover:bg-gray-800 !text-white'
                             }`}
                           >
                             {isRecordingPayment ? 'Registrando...' : 'Registrar e Creditar LTV'}
                           </button>
                         </div>
                       )}
 
                       {onUpdateTransactions && (
                         <div className={`space-y-2 p-3.5 rounded-lg border font-sans ${isDark ? 'bg-white/[0.015] border-white/5' : 'bg-gray-50 border-gray-250/65'}`}>
                           <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDark ? 'text-gray-350' : 'text-gray-650'}`}>
                             <Link className="w-3.5 h-3.5" />
                             Vincular Receitas Avulsas
                           </span>
                          
                          {orphanedTransactions.length > 0 ? (
                            <div className="space-y-2">
                              <select
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleLinkOrphanTransaction(e.target.value, c.id);
                                    e.target.value = '';
                                  }
                                }}
                                className={`w-full px-2.5 py-2.5 rounded text-xs border cursor-pointer outline-none ${
                                  isDark ? 'bg-black/50 border-white/10 text-white' : 'bg-white border-gray-300 text-gray-950 font-mono'
                                }`}
                              >
                                <option value="">-- Selecione uma Receita --</option>
                                {orphanedTransactions.map(t => (
                                  <option key={`mobile-orphan-transaction-${t.id}`} value={t.id}>
                                    {t.sender ? `${t.sender} - ` : ''}R$ {t.amount} ({formatSystemDate(t.date)})
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <div className="py-2 text-center italic text-[10px] text-gray-500">
                              Não há faturamentos avulsos pendentes.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm border border-dashed rounded-xl border-white/10" style={{ borderColor: !isDark ? 'rgba(0,0,0,0.1)' : '' }}>
              <div className="flex flex-col items-center justify-center space-y-2 text-gray-400">
                <HelpCircle className="w-7 h-7 opacity-50" />
                <p className="font-semibold">Nenhum cliente atende aos parâmetros.</p>
              </div>
            </div>
          )}
        </div>

        {/* DESKTOP CORE GRID-TABLE (Hidden on Mobile) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-[700px]">
            <thead className={`border-b ${isDark ? 'border-white/10 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
              <tr>
                <th className="py-3.5 px-4 font-extrabold uppercase tracking-widest text-[9px]">Cliente / Setor</th>
                <th className="py-3.5 px-4 font-extrabold uppercase tracking-widest text-[9px]">Status</th>
                <th className="py-3.5 px-4 font-extrabold uppercase tracking-widest text-[9px]">Valor Contrato</th>
                <th className="py-3.5 px-4 font-extrabold uppercase tracking-widest text-[9px]">Total Pago (LTV R$)</th>
                <th className="py-3.5 px-4 font-extrabold uppercase tracking-widest text-[9px] text-center">Faturas</th>
                <th className="py-3.5 px-4 text-right font-extrabold uppercase tracking-widest text-[9px]">Ação</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-gray-100'}`}>
              {filtered.map(c => {
                const clientPayments = transactions.filter(t => t.clientId === c.id && t.type === 'income');
                const totalPaidAmount = clientPayments.reduce((acc, t) => acc + t.amount, 0);
                const isExpanded = expandedClientId === c.id;

                // Sector badge or default
                const segmentText = c.segment || 'Ramo não informado';
                const joinDateText = c.start_date ? new Date(c.start_date).toLocaleDateString('pt-BR') : '';

                // Calculate company LTV share
                const shareOfLtv = totalHistoricalRevenue > 0 
                  ? (totalPaidAmount / totalHistoricalRevenue) * 100 
                  : 0;

                return (
                  <React.Fragment key={c.id}>
                    <tr 
                      className={`transition-all cursor-pointer group ${
                        isExpanded 
                          ? isDark ? 'bg-white/[0.03]' : 'bg-amber-50/20' 
                          : isDark ? 'hover:bg-white/[0.01]' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setExpandedClientId(isExpanded ? null : c.id)}
                    >
                      {/* Name Col */}
                      <td className="py-4 px-4 font-medium">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                            c.status === 'active'
                              ? 'bg-amber-500/10 text-amber-500'
                              : 'bg-gray-500/10 text-gray-500'
                          }`}>
                            {c.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className={`font-semibold tracking-tight ${isDark ? 'text-white' : 'text-gray-900 text-sm'}`}>
                                {c.name}
                              </span>
                              {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-500" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-500" />}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-[10px] font-mono ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                {segmentText}
                              </span>
                              {joinDateText && (
                                <>
                                  <span className="text-gray-600 font-sans">•</span>
                                  <span className={`text-[10px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`} title="Joined Date">
                                    Iniciou em {joinDateText}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Status Col */}
                      <td className="py-4 px-4">
                        {c.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-red-500/10 text-red-500">
                            Cancelado (Churn)
                          </span>
                        )}
                      </td>

                      {/* Contract value */}
                      <td className="py-4 px-4">
                        <div className={`font-mono font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                          R$ {c.contract_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <div className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          {c.is_recurring ? (
                            <span className="text-blue-400 font-semibold text-[9px] uppercase tracking-wider">Recorrência Mensal</span>
                          ) : (
                            <span className="text-amber-500/80 font-semibold text-[9px] uppercase tracking-wider">Projeto Fechado</span>
                          )}
                        </div>
                      </td>

                      {/* LTV aggregate */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-amber-500">
                            R$ {totalPaidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          {totalPaidAmount > 0 ? (
                            <div className="flex items-center gap-1.5 mt-1">
                              <div className="w-12 bg-gray-800 rounded-full h-1 overflow-hidden" style={{ backgroundColor: !isDark ? '#E5E7EB' : '' }}>
                                <div className="bg-amber-500 h-1 rounded-full" style={{ width: `${Math.min(100, shareOfLtv)}%` }}></div>
                              </div>
                              <span className={`text-[9px] font-mono ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                {shareOfLtv.toFixed(1)}% do total
                              </span>
                            </div>
                          ) : (
                            <span className={`text-[9px] italic ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Nenhum pagamento</span>
                          )}
                        </div>
                      </td>

                      {/* Payments counter */}
                      <td className="py-4 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded font-mono text-xs font-semibold ${
                          clientPayments.length > 0
                            ? isDark ? 'bg-amber-500/10 text-amber-500' : 'bg-amber-50 text-amber-600'
                            : isDark ? 'bg-white/5 text-gray-500' : 'bg-gray-100 text-gray-400'
                        }`}>
                          {clientPayments.length} pgto(s)
                        </span>
                      </td>

                      {/* Edit actions */}
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(c);
                          }}
                          className={`p-2 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider border border-transparent ${
                            isDark 
                              ? 'text-gray-400 hover:text-white hover:bg-white/10' 
                              : 'text-gray-600 hover:text-black hover:bg-gray-100'
                          }`}
                          title="Editar Ficha"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Editar
                        </button>
                      </td>
                    </tr>

                    {/* EXPANDED PROFILE DASHBOARD ACCORDION */}
                    {isExpanded && (
                      <tr className={`${isDark ? 'bg-white/[0.02]' : 'bg-gray-50/80'} border-none`}>
                        <td colSpan={6} className="p-0">
                          <div className={`p-4 sm:p-6 border-l-2 ${isDark ? 'border-l-white/20' : 'border-l-gray-300'} ml-4 my-2 space-y-6 animate-fadeIn`}>
                            
                            {/* Grid layout inside expanded hub */}
                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                              
                              {/* Pillar A: CRM Client Metadata specifications */}
                              <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                                isDark ? 'bg-black/40 border-white/5' : 'bg-white border-black/5 shadow-sm'
                              }`}>
                                <div className="space-y-4">
                                  <h4 className={`text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-white/5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    <Building2 className="w-3.5 h-3.5" />
                                    Ficha do Cliente
                                  </h4>
                                  
                                  {/* Coordinates */}
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
                                        className="text-[9px] text-[#FF4D00]/70 cursor-pointer block mt-0.5 hover:underline"
                                      >
                                        {expandedNotes[c.id] ? '[- Recolher Observação]' : '[+ Ver Observação Completa]'}
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <div className="pt-4 flex justify-start">
                                  <button
                                    onClick={() => startEdit(c)}
                                    className={`text-[10px] uppercase font-bold tracking-wider underline ${
                                      isDark ? 'text-gray-400 hover:text-white' : 'text-gray-650 hover:text-black'
                                    }`}
                                  >
                                    Editar Ficha Cadastral
                                  </button>
                                </div>
                              </div>

                              {/* Pillar B: Enrolled Invoices & Historical Payments Ledger */}
                              <div className={`p-4 rounded-xl border flex flex-col justify-between xl:col-span-2 ${
                                isDark ? 'bg-black/40 border-white/5' : 'bg-white border-black/5 shadow-sm'
                              }`}>
                                <div className="space-y-4">
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
                                    <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                                      {clientPayments.map(t => (
                                        <div 
                                          key={t.id} 
                                          className={`flex items-center justify-between p-2.5 rounded-lg border text-xs ${
                                            isDark ? 'bg-[#141414] border-white/5' : 'bg-white border-black/5 shadow-sm'
                                          }`}
                                        >
                                          <div className="flex flex-col">
                                            <span className={`font-semibold tracking-tight ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{t.description}</span>
                                            <span className="text-[10px] text-gray-500 mt-0.5 font-mono">
                                              {formatSystemDate(t.date)} • {t.account}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-3">
                                            <span className="text-emerald-500 font-mono font-bold">
                                              + R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </span>
                                            <button
                                              onClick={() => {
                                                if (confirm("Deseja desvincular este faturamento do faturamento oficial deste cliente?")) {
                                                  handleUnlinkTransaction(t.id);
                                                }
                                              }}
                                              className="text-gray-500 hover:text-red-400 transition-colors p-1"
                                              title="Desvincular do Cliente (Tornar Avulso)"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
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
                                </div>

                                {/* Intelligent Linker and Quick Recorder Panels */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/5 mt-4 text-xs">
                                  {/* 1. Quick Payment recorder */}
                                  {onAddTransaction && (
                                    <div className={`space-y-2 p-3 rounded-lg border ${isDark ? 'bg-white/[0.015] border-white/5' : 'bg-gray-50 border-gray-250/65'}`}>
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
                                          isDark 
                                            ? 'bg-white text-black hover:bg-gray-200' 
                                            : 'bg-black text-white hover:bg-gray-800 !text-white'
                                        } !text-white`}
                                      >
                                        {isRecordingPayment ? 'Registrando...' : 'Registrar e Creditar LTV'}
                                      </button>
                                    </div>
                                  )}

                                  {/* 2. Orphaned Linker Dropdown */}
                                  {onUpdateTransactions && (
                                    <div className={`space-y-2 p-3 rounded-lg border font-sans ${isDark ? 'bg-white/[0.015] border-white/5' : 'bg-gray-50 border-gray-250/65'}`}>
                                      <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDark ? 'text-gray-350' : 'text-gray-650'}`}>
                                        <Link className="w-3.5 h-3.5" />
                                        Vincular Receitas Avulsas
                                      </span>
                                      
                                      {orphanedTransactions.length > 0 ? (
                                        <div className="space-y-1.5">
                                          <select
                                            onChange={(e) => {
                                              if (e.target.value) {
                                                handleLinkOrphanTransaction(e.target.value, c.id);
                                                e.target.value = ''; // Reset select placeholder
                                              }
                                            }}
                                            className={`w-full px-2 py-1.5 rounded text-xs border cursor-pointer outline-none ${
                                              isDark ? 'bg-black/50 border-white/10 text-white' : 'bg-white border-gray-300 text-gray-950 font-mono'
                                            }`}
                                          >
                                            <option value="">-- Selecione uma Receita --</option>
                                            {orphanedTransactions.map(t => (
                                              <option key={t.id} value={t.id}>
                                                {t.sender ? `${t.sender} - ` : ''}R$ {t.amount.toLocaleString('pt-BR')} ({formatSystemDate(t.date)})
                                              </option>
                                            ))}
                                          </select>
                                          <p className="text-[9px] text-gray-500 italic block leading-snug">
                                          </p>
                                        </div>
                                      ) : (
                                        <div className="py-3 text-center italic text-[10px] text-gray-500 leading-normal">
                                          Não há receitas avulsas dadas como pendentes na carteira atualmente.
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                              </div>

                            </div>

                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className={`py-12 text-center text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <HelpCircle className="w-8 h-8 opacity-40 text-gray-500" />
                      <p className="font-semibold">Nenhum cliente atende aos parâmetros de filtro aplicados.</p>
                      <p className="text-xs font-normal opacity-70">Tente buscar por termos diferentes ou cadastre novos clientes acima.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
