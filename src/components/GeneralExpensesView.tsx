import React, { useState, useEffect } from 'react';
import { Plus, Search, Receipt, CheckCircle, Clock, UploadCloud } from 'lucide-react';

interface GeneralExpense {
  id: string;
  date: string;
  clientId: string;
  description: string;
  amount: number;
  status: 'pending' | 'reimbursed';
  billingType: 'monthly_fee' | 'separate';
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

export default function GeneralExpensesView({ theme, clients }: GeneralExpensesViewProps) {
  const isDark = theme !== 'light';
  const [expenses, setExpenses] = useState<GeneralExpense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<GeneralExpense>>({
    status: 'pending',
    billingType: 'separate'
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/general-expenses');
      if (res.ok) {
        const data = await res.json();
        setExpenses(data);
      }
    } catch (err) {
      console.error('Failed to fetch general expenses', err);
    } finally {
      setIsLoading(false);
    }
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
        setIsModalOpen(false);
        setFormData({ status: 'pending', billingType: 'separate' });
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
    if(!confirm('Deseja excluir esta despesa?')) return;
    try {
      const res = await fetch(`/api/general-expenses/${id}`, { method: 'DELETE' });
      if (res.ok) fetchExpenses();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = expenses.filter(e => 
    e.description.toLowerCase().includes(search.toLowerCase()) ||
    clients.find(c => c.id === e.clientId)?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={`space-y-6 ${isDark ? 'text-neutral-200' : 'text-neutral-800'} px-3 sm:px-6 max-w-5xl mx-auto py-4`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800 pb-5">
        <div className="space-y-1">
          <h2 className={`text-2xl font-sans tracking-tight font-bold flex items-center gap-2.5 ${isDark ? 'text-neutral-50' : 'text-black'}`}>
            <span>Despesas Gerais</span>
          </h2>
          <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
            Controle de despesas vinculadas a clientes, reembolsos e cobranças na mensalidade.
          </p>
        </div>
        <button 
          onClick={() => {
            setFormData({ status: 'pending', billingType: 'separate', date: new Date().toISOString().split('T')[0] });
            setIsModalOpen(true);
          }}
          className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border-[1.58px] px-5 py-2.5 font-medium shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl text-xs font-bold font-mono uppercase tracking-wider ${
            isDark 
              ? 'bg-white border-zinc-200 text-zinc-950 hover:bg-zinc-50' 
              : 'bg-zinc-950 border-zinc-600 text-slate-200 hover:bg-zinc-900 keep-white text-keep-white'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Nova Despesa</span>
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`} />
          <input 
            type="text"
            placeholder="Buscar despesa ou cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 text-sm rounded-xl border outline-none ${
              isDark 
                ? 'border-neutral-800 bg-neutral-900 text-white focus:border-white' 
                : 'border-neutral-200 bg-white text-black focus:border-black'
            }`}
          />
        </div>
      </div>

      <div className={`border rounded-2xl overflow-hidden shadow-sm ${isDark ? 'bg-[#0A0A0A] border-white/5' : 'bg-white border-neutral-200'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b text-[10px] uppercase font-mono tracking-wider ${
                isDark ? 'border-white/5 bg-white/[0.02] text-neutral-400' : 'border-neutral-200 bg-neutral-50 text-neutral-600'
              }`}>
                <th className="p-4 font-medium whitespace-nowrap">Data</th>
                <th className="p-4 font-medium">Cliente</th>
                <th className="p-4 font-medium">Descrição</th>
                <th className="p-4 font-medium">Comprovante</th>
                <th className="p-4 font-medium text-right">Valor</th>
                <th className="p-4 font-medium text-center">Cobrança</th>
                <th className="p-4 font-medium text-center">Status</th>
                <th className="p-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className={`divide-y text-sm ${isDark ? 'divide-white/5' : 'divide-neutral-100'}`}>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-neutral-500 text-sm">Nenhuma despesa encontrada.</td>
                </tr>
              ) : filtered.map(expense => (
                <tr key={expense.id} className={`transition-colors group ${isDark ? 'hover:bg-white/[0.02] text-neutral-300' : 'hover:bg-neutral-50 text-neutral-700'}`}>
                  <td className="p-4 whitespace-nowrap">
                    {new Date(expense.date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="p-4 font-medium">
                    {expense.clientId === 'leadium' ? 'Leadium' : clients.find(c => c.id === expense.clientId)?.name || '--'}
                  </td>
                  <td className="p-4">
                    {expense.description}
                  </td>
                  <td className="p-4 text-center">
                    {expense.receiptImage ? (
                      <a href={expense.receiptImage} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 flex justify-center items-center gap-1 text-[10px] uppercase font-bold tracking-wider group-hover:underline">
                        <Receipt className="w-3.5 h-3.5" /> VER
                      </a>
                    ) : (
                      <span className="text-[10px] text-neutral-400 uppercase font-mono">--</span>
                    )}
                  </td>
                  <td className={`p-4 text-right font-mono font-bold ${isDark ? 'text-white' : 'text-black'}`}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(expense.amount)}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold ${
                      expense.billingType === 'monthly_fee' 
                        ? (isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800')
                        : (isDark ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-100 text-neutral-800')
                    }`}>
                      {expense.billingType === 'monthly_fee' ? 'Na Mensalidade' : 'Cobrar Avulso'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => handleToggleStatus(expense)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold transition-all active:scale-95 ${
                        expense.status === 'reimbursed'
                          ? (isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-800')
                          : (isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-800')
                      }`}
                    >
                      {expense.status === 'reimbursed' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {expense.status === 'reimbursed' ? 'Reembolsado' : 'Pendente'}
                    </button>
                  </td>
                  <td className="p-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => deleteExpense(expense.id)} className="text-[10px] text-red-500 uppercase font-mono font-bold hover:underline active:scale-95">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white uppercase tracking-wider">
              Registrar Despesa
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono text-neutral-400">Cliente / Destino</label>
                <select
                  required
                  value={formData.clientId || ''}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  className="w-full p-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white outline-none focus:border-[#FF4D00]"
                >
                  <option value="" disabled>Selecione um cliente...</option>
                  <option value="leadium">Leadium (Interno)</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono text-neutral-400">Descrição do gasto</label>
                <input
                  type="text"
                  required
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ex: Almoço com diretoria, Brindes..."
                  className="w-full p-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-800 bg-transparent text-neutral-950 dark:text-white outline-none focus:border-[#FF4D00]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-neutral-400">Data</label>
                  <input
                    type="date"
                    required
                    value={formData.date || ''}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full p-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-800 bg-transparent text-neutral-950 dark:text-white outline-none focus:border-[#FF4D00]"
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
                    className="w-full p-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-800 bg-transparent text-neutral-950 dark:text-white outline-none focus:border-[#FF4D00]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-neutral-400">Modo de Cobrança</label>
                  <select
                    value={formData.billingType || 'separate'}
                    onChange={(e) => setFormData({ ...formData, billingType: e.target.value as any })}
                    className="w-full p-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white outline-none focus:border-[#FF4D00]"
                  >
                    <option value="separate">Cobrar Avulso</option>
                    <option value="monthly_fee">Incluir na Mensalidade</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-neutral-400">Status</label>
                  <select
                    value={formData.status || 'pending'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full p-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white outline-none focus:border-[#FF4D00]"
                  >
                    <option value="pending">Pendente</option>
                    <option value="reimbursed">Reembolsado</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono text-neutral-400">Comprovante (URL / Link Imagem)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.receiptImage || ''}
                    onChange={(e) => setFormData({ ...formData, receiptImage: e.target.value })}
                    placeholder="https://sua-imagem.com ou faça drag & drop abaixo"
                    className="flex-1 p-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-800 bg-transparent text-neutral-950 dark:text-white outline-none focus:border-[#FF4D00]"
                  />
                  {formData.receiptImage && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, receiptImage: '' })}
                      className="px-3 text-xs uppercase font-mono font-bold bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg transition"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                {/* Upload drag & click zone */}
                <div 
                  className="border border-dashed border-neutral-300 dark:border-neutral-800 rounded-lg p-3 text-center cursor-pointer hover:border-[#FF4D00] transition bg-neutral-50/50 dark:bg-neutral-900/25 mt-1"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file && file.type.startsWith('image/')) {
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
                            if (data.url) {
                              setFormData(prev => ({
                                ...prev,
                                receiptImage: data.url
                              }));
                            } else {
                              alert('Erro no upload: ' + (data.error || 'Erro desconhecido'));
                            }
                          } catch (err: any) {
                            console.error(err);
                            alert('Falha ao enviar imagem');
                          }
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e: any) => {
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
                              if (data.url) {
                                setFormData(prev => ({
                                  ...prev,
                                  receiptImage: data.url
                                }));
                              } else {
                                alert('Erro no upload: ' + (data.error || 'Erro desconhecido'));
                              }
                            } catch (err: any) {
                              console.error(err);
                              alert('Falha ao enviar imagem');
                            }
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    };
                    input.click();
                  }}
                >
                  <UploadCloud className="w-5 h-5 mx-auto text-neutral-400 mb-1" />
                  <p className="text-[10px] font-mono text-neutral-500">Arraste a foto ou clique para fazer upload</p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono text-neutral-400">Observações adicionais</label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Detalhes (Opcional)..."
                  className="w-full p-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-800 bg-transparent text-neutral-950 dark:text-white outline-none resize-none h-16 focus:border-[#FF4D00]"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
                  className={`flex-1 inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border-[1.58px] px-5 py-2.5 font-medium shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl text-xs font-bold font-mono uppercase tracking-wider ${
                    isDark 
                      ? 'bg-white border-zinc-200 text-zinc-950 hover:bg-zinc-50' 
                      : 'bg-zinc-950 border-zinc-600 text-slate-200 hover:bg-zinc-900 keep-white text-keep-white'
                  }`}
                >
                  Salvar Despesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
