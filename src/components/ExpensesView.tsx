/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  X,
  Plus, 
  Trash2, 
  Edit, 
  Car, 
  RefreshCw, 
  MapPin, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  ChevronRight,
  Copy,
  Check,
  User,
  Sliders,
  FileText,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Calendar,
  Layers,
  BrainCircuit,
  BarChart3,
  Zap,
  Award,
  Eye,
  UploadCloud
} from 'lucide-react';

const COMMON_CARS = [
  { name: 'Chevrolet Onix 1.0', brand: 'Chevrolet', model: 'Onix', consumption: 13.5, fuelType: 'Flex' },
  { name: 'Hyundai HB20 1.0', brand: 'Hyundai', model: 'HB20', consumption: 12.8, fuelType: 'Flex' },
  { name: 'Fiat Strada 1.4', brand: 'Fiat', model: 'Strada', consumption: 11.5, fuelType: 'Flex' },
  { name: 'Volkswagen Gol 1.0', brand: 'Volkswagen', model: 'Gol', consumption: 13.0, fuelType: 'Flex' },
  { name: 'Volkswagen Polo 1.0 TSI', brand: 'Volkswagen', model: 'Polo', consumption: 12.5, fuelType: 'Flex' },
  { name: 'Toyota Corolla 2.0', brand: 'Toyota', model: 'Corolla', consumption: 11.0, fuelType: 'Flex' },
  { name: 'Jeep Compass 1.3 Turbo', brand: 'Jeep', model: 'Compass', consumption: 9.5, fuelType: 'Gasolina' },
  { name: 'Honda Civic 2.0', brand: 'Honda', model: 'Civic', consumption: 11.2, fuelType: 'Gasolina' },
  { name: 'Fiat Argo 1.0', brand: 'Fiat', model: 'Argo', consumption: 13.5, fuelType: 'Flex' },
  { name: 'Renault Kwid 1.0', brand: 'Renault', model: 'Kwid', consumption: 15.0, fuelType: 'Flex' },
];

interface Employee {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  status: 'Ativo' | 'Inativo';
}

interface Vehicle {
  id: string;
  employeeId: string;
  owner: string;
  name: string;
  brand: string;
  model: string;
  year: string;
  plate: string;
  fuelType: string;
  avgConsumption: number;
  notes: string;
}

interface DisplacementHistory {
  status: string;
  date: string;
}

interface Displacement {
  id: string;
  date: string;
  employeeId: string;
  clientVisited: string;
  city: string;
  reason: string;
  vehicleId: string;
  vehicleName: string;
  kmTraveled: number;
  litersConsumed: number;
  amount: number;
  status: 'Em andamento' | 'Pendente' | 'Em análise' | 'Aprovada' | 'Reembolsada';
  notes?: string;
  receiptImage?: string;
  refundReceiptImage?: string;
  history?: DisplacementHistory[];
  startLat?: number;
  startLng?: number;
  endLat?: number;
  endLng?: number;
  startAddress?: string;
  endAddress?: string;
  startTime?: string;
  endTime?: string;
}

interface ExpensesData {
  employees: Employee[];
  vehicles: Vehicle[];
  displacements: Displacement[];
}

interface ExpensesViewProps {
  theme: 'dark' | 'light';
}

interface ParsedAudit {
  summary: string;
  general: string[];
  efficiency: string[];
  inconsistencies: string[];
  recommendations: string[];
}

function parseAuditReport(rawReport: string): ParsedAudit {
  const sections: ParsedAudit = {
    summary: "",
    general: [],
    efficiency: [],
    inconsistencies: [],
    recommendations: []
  };
  
  if (!rawReport) return sections;
  
  // Split by line to analyze segments
  const lines = rawReport.split('\n');
  let currentSection: 'general' | 'efficiency' | 'inconsistencies' | 'recommendations' | null = null;
  const introLines: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Check if line matches section header markers
    if (trimmed.includes('📊') || trimmed.toLowerCase().includes('painel analítico')) {
      currentSection = 'general';
      continue;
    } else if (trimmed.includes('🚗') || trimmed.toLowerCase().includes('eficiência da frota') || trimmed.toLowerCase().includes('eficiência individual')) {
      currentSection = 'efficiency';
      continue;
    } else if (trimmed.includes('⚠️') || trimmed.toLowerCase().includes('inconsistências') || trimmed.toLowerCase().includes('desperdícios')) {
      currentSection = 'inconsistencies';
      continue;
    } else if (trimmed.includes('💡') || trimmed.toLowerCase().includes('recomendações') || trimmed.toLowerCase().includes('oportunidades')) {
      currentSection = 'recommendations';
      continue;
    }
    
    // If we haven't entered any specific h3 section, build general introduction
    if (currentSection === null) {
      if (!trimmed.startsWith('#')) {
        introLines.push(trimmed);
      }
    } else {
      // Format bullet points elegantly
      let cleanLine = trimmed
        .replace(/^[-*+•]\s+/, '') // remove symbols
        .replace(/^\d+[\.\)]\s+/, '') // remove numbering
        .replace(/\*\*/g, ''); // remove bold asterisks for clean rendering
      
      if (cleanLine.length > 2) {
        sections[currentSection].push(cleanLine);
      }
    }
  }
  
  sections.summary = introLines.join(' ');
  return sections;
}

export default function ExpensesView({ theme }: ExpensesViewProps) {
  const isDark = theme !== 'light';

  // Core list state
  const [rawData, setRawData] = useState<ExpensesData>({
    employees: [],
    vehicles: [],
    displacements: []
  });

  const data = {
    employees: rawData?.employees || [],
    vehicles: rawData?.vehicles || [],
    displacements: rawData?.displacements || []
  };

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Primary sub-tabs: 'dashboard' (Métricas) | 'entries' (Viagens) | 'employees' (Equipe) | 'vehicles' (Frota)
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'entries' | 'employees' | 'vehicles'>('dashboard');

  // Filters state
  const [showFilters, setShowFilters] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState<string>('todos'); 
  const [filterEmployee, setFilterEmployee] = useState<string>('todos');
  const [filterCity, setFilterCity] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');

  // AI Auditor results state (simplified without unrequested starry fluff)
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);

  // Modals targeting state
  const [activeModal, setActiveModal] = useState<null | 'employee' | 'vehicle' | 'displacement' | 'status-update' | 'employee-details'>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusUpdateTargetId, setStatusUpdateTargetId] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // Form hooks equivalents
  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    role: '',
    email: '',
    phone: '',
    status: 'Ativo' as 'Ativo' | 'Inativo'
  });

  const [vehicleForm, setVehicleForm] = useState({
    employeeId: '',
    name: '',
    brand: '',
    model: '',
    year: '',
    plate: '',
    fuelType: 'Gasolina',
    avgConsumption: '10',
    notes: ''
  });

  const [displacementForm, setDisplacementForm] = useState({
    date: new Date().toISOString().substring(0, 10),
    employeeId: '',
    clientVisited: '',
    city: '',
    reason: '',
    vehicleId: '',
    kmTraveled: '',
    notes: '',
    receiptImage: ''
  });

  const [selectedReceiptImage, setSelectedReceiptImage] = useState<string | null>(null);
  const [selectedHistoryDisp, setSelectedHistoryDisp] = useState<Displacement | null>(null);
  const [refundReceiptTargetId, setRefundReceiptTargetId] = useState<string | null>(null);

  const [tripMode, setTripMode] = useState<'gps' | 'manual'>('gps');
  const activeTrip = data.displacements.find(d => d.status === 'Em andamento');

  const [statusForm, setStatusForm] = useState<'Pendente' | 'Em análise' | 'Aprovada' | 'Reembolsada'>('Pendente');

  const [fipeBrands, setFipeBrands] = useState<{codigo: string, nome: string}[]>([]);
  const [fipeModels, setFipeModels] = useState<{codigo: string, nome: string}[]>([]);
  const [selectedFipeBrand, setSelectedFipeBrand] = useState('');

  useEffect(() => {
    fetch('https://parallelum.com.br/fipe/api/v1/carros/marcas')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setFipeBrands(data);
      })
      .catch(err => console.error("FIPE API Error:", err));
  }, []);

  useEffect(() => {
    if (!selectedFipeBrand) {
      setFipeModels([]);
      return;
    }
    fetch(`https://parallelum.com.br/fipe/api/v1/carros/marcas/${selectedFipeBrand}/modelos`)
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.modelos)) setFipeModels(data.modelos);
      })
      .catch(err => console.error("FIPE API Error:", err));
  }, [selectedFipeBrand]);

  // Load backend content
  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/expenses');
      if (!response.ok) throw new Error('Não foi possível se comunicar com o banco de dados.');
      const resData = await response.json();
      setRawData(resData);
      setError('');
    } catch (err: any) {
      console.error(err);
      setError('Sincronização offline.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  // CRUD events
  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeForm.name.trim() || !employeeForm.email.trim()) return;
    try {
      const payload = editingId ? { id: editingId, ...employeeForm } : employeeForm;
      const res = await fetch('/api/expenses/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await fetchExpenses();
        closeModals();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleForm.name.trim() || !vehicleForm.employeeId) return;
    try {
      const payload = editingId ? { id: editingId, ...vehicleForm } : vehicleForm;
      const res = await fetch('/api/expenses/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await fetchExpenses();
        closeModals();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDisplacementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displacementForm.employeeId || !displacementForm.vehicleId || !displacementForm.kmTraveled) return;
    try {
      const payload = editingId ? { id: editingId, ...displacementForm } : displacementForm;
      const res = await fetch('/api/expenses/displacements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await fetchExpenses();
        closeModals();
      } else {
        const errData = await res.json();
        alert('Erro ao salvar viagem: ' + (errData.error || 'Erro desconhecido do servidor'));
      }
    } catch (err: any) {
      console.error(err);
      alert('Erro de conexão ou sistema ao salvar viagem: ' + (err.message || err));
    }
  };

  const calculateDistanceKM = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c;
  };

  const startGpsTrip = () => {
    if (!displacementForm.employeeId || !displacementForm.vehicleId) {
      alert("Selecione o colaborador e o veículo primeiro.");
      return;
    }
    if (!navigator.geolocation) {
      alert("Geolocalização não suportada no seu navegador.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        let address = '';
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
          if (res.ok) {
            const data = await res.json();
            address = data.display_name;
          }
        } catch (e) {
          console.error(e);
        }

        const payload = {
          date: new Date().toISOString().split('T')[0],
          employeeId: displacementForm.employeeId,
          vehicleId: displacementForm.vehicleId,
          status: 'Em andamento',
          startLat: pos.coords.latitude,
          startLng: pos.coords.longitude,
          startAddress: address,
          startTime: new Date().toISOString(),
          clientVisited: 'Em andamento (GPS)',
          city: 'Localização GPS',
        };

        try {
          const res = await fetch('/api/expenses/displacements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (res.ok) {
            await fetchExpenses();
          } else {
            alert('Erro ao iniciar a viagem');
          }
        } catch(e) {
          alert('Erro de rede ao iniciar a viagem');
        }
      },
      (err) => alert("Erro ao obter localização. Verifique as permissões. " + err.message),
      { enableHighAccuracy: true }
    );
  };

  const finishGpsTrip = () => {
    if (!navigator.geolocation || !activeTrip) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const startLat = activeTrip.startLat;
        const startLng = activeTrip.startLng;
        if (startLat === undefined || startLng === undefined) return;
        const distance = calculateDistanceKM(startLat, startLng, pos.coords.latitude, pos.coords.longitude);
        const finalDistance = distance < 0.1 ? 0.1 : Number(distance.toFixed(2));
        
        let address = '';
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
          if (res.ok) {
            const data = await res.json();
            address = data.display_name;
          }
        } catch (e) {
          console.error(e);
        }
        
        const payload = {
          id: activeTrip.id,
          date: activeTrip.date,
          employeeId: activeTrip.employeeId,
          vehicleId: activeTrip.vehicleId,
          kmTraveled: finalDistance,
          status: 'Pendente',
          endLat: pos.coords.latitude,
          endLng: pos.coords.longitude,
          endAddress: address,
          endTime: new Date().toISOString(),
          clientVisited: 'Viagem Rastreada (GPS)',
          city: 'Localização GPS',
          reason: 'Deslocamento Registrado via GPS',
          notes: activeTrip.startTime ? `Duração: ${Math.round((Date.now() - new Date(activeTrip.startTime).getTime()) / 60000)} minutos.` : ''
        };

        try {
          const res = await fetch('/api/expenses/displacements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (res.ok) {
            await fetchExpenses();
            closeModals();
          } else {
            alert('Erro ao finalizar a viagem');
          }
        } catch(e) {
          alert('Erro de rede ao finalizar a viagem');
        }
      },
      (err) => alert("Erro de GPS: " + err.message),
      { enableHighAccuracy: true }
    );
  };

  const cancelGpsTrip = async () => {
    if(confirm("Deseja cancelar a viagem em andamento?")) {
      if (activeTrip) {
        try {
          const res = await fetch(`/api/expenses/displacements/${activeTrip.id}`, { method: 'DELETE' });
          if (res.ok) {
            await fetchExpenses();
            closeModals();
          }
        } catch (e) {
          alert('Erro ao cancelar viagem');
        }
      }
    }
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusUpdateTargetId) return;
    try {
      const res = await fetch(`/api/expenses/displacements/${statusUpdateTargetId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: statusForm })
      });
      if (res.ok) {
        await fetchExpenses();
        closeModals();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteEmployee = async (id: string, name: string) => {
    if (!confirm(`Remover "${name}"? Veículos vinculados serão desligados.`)) return;
    try {
      const res = await fetch(`/api/expenses/employees/${id}`, { method: 'DELETE' });
      if (res.ok) await fetchExpenses();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteVehicle = async (id: string, name: string) => {
    if (!confirm(`Remover veículo "${name}"?`)) return;
    try {
      const res = await fetch(`/api/expenses/vehicles/${id}`, { method: 'DELETE' });
      if (res.ok) await fetchExpenses();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteDisplacement = async (id: string) => {
    if (!confirm(`Excluir este lançamento de viagem?`)) return;
    try {
      const res = await fetch(`/api/expenses/displacements/${id}`, { method: 'DELETE' });
      if (res.ok) await fetchExpenses();
    } catch (err) {
      console.error(err);
    }
  };

  // Modal launchers
  const openAddEmployee = () => {
    setEmployeeForm({ name: '', role: '', email: '', phone: '', status: 'Ativo' });
    setEditingId(null);
    setActiveModal('employee');
  };

  const openEditEmployee = (emp: Employee) => {
    setEmployeeForm({
      name: emp.name,
      role: emp.role,
      email: emp.email,
      phone: emp.phone,
      status: emp.status
    });
    setEditingId(emp.id);
    setActiveModal('employee');
  };

  const openAddVehicle = () => {
    setVehicleForm({
      employeeId: data.employees[0]?.id || '',
      name: '',
      brand: '',
      model: '',
      year: '',
      plate: '',
      fuelType: 'Gasolina',
      avgConsumption: '12',
      notes: ''
    });
    setEditingId(null);
    setActiveModal('vehicle');
  };

  const openEditVehicle = (v: Vehicle) => {
    setVehicleForm({
      employeeId: v.employeeId,
      name: v.name,
      brand: v.brand,
      model: v.model,
      year: v.year,
      plate: v.plate,
      fuelType: v.fuelType,
      avgConsumption: String(v.avgConsumption),
      notes: v.notes
    });
    setEditingId(v.id);
    setActiveModal('vehicle');
  };

  const openAddDisplacement = () => {
    const firstEmp = data.employees[0]?.id || '';
    const filteredVehicles = data.vehicles.filter(v => v.employeeId === firstEmp);
    setDisplacementForm({
      date: new Date().toISOString().substring(0, 10),
      employeeId: firstEmp,
      clientVisited: '',
      city: '',
      reason: '',
      vehicleId: filteredVehicles[0]?.id || '',
      kmTraveled: '',
      notes: '',
      receiptImage: ''
    });
    setEditingId(null);
    setActiveModal('displacement');
  };

  const openStatusUpdate = (disp: Displacement) => {
    setStatusUpdateTargetId(disp.id);
    setStatusForm(disp.status);
    setActiveModal('status-update');
  };

  const closeModals = () => {
    setActiveModal(null);
    setEditingId(null);
    setStatusUpdateTargetId(null);
    setRefundReceiptTargetId(null);
  };

  // Clean, fast report generator (no glitter/sparkle AI indicators, pure audit report)
  const runAiAuditor = async () => {
    setIsAnalyzing(true);
    setAiReport(null);
    try {
      const res = await fetch('/api/expenses/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const report = await res.json();
        setAiReport(report.analysis);
      } else {
        alert('Erro ao carregar análise.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopyReport = () => {
    if (!aiReport) return;
    navigator.clipboard.writeText(aiReport);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  // Business-centric KPI Calculations
  const getCorporateMetrics = () => {
    const displacements = data.displacements;
    
    const totalSpent = displacements.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
    const totalKm = displacements.reduce((acc, d) => acc + (Number(d.kmTraveled) || 0), 0);
    const totalVisits = displacements.length;
    
    // Unpaid/Pending reimbursement list by collaborator (Important for payout controls)
    const employeeBalances: { 
      [id: string]: { 
        name: string; 
        role: string;
        km: number; 
        pendingReimbursement: number; 
        approvedReimbursement: number;
        paidReimbursement: number; 
        visitsCount: number;
      } 
    } = {};

    // Initialize all active employees to prevent empty states
    data.employees.forEach(emp => {
      employeeBalances[emp.id] = {
        name: emp.name,
        role: emp.role,
        km: 0,
        pendingReimbursement: 0,
        approvedReimbursement: 0,
        paidReimbursement: 0,
        visitsCount: 0
      };
    });

    // Populate balances from displacements
    displacements.forEach(d => {
      if (!employeeBalances[d.employeeId]) {
        // Fallback or legacy employee
        employeeBalances[d.employeeId] = {
          name: 'Colaborador Antigo',
          role: 'Externo',
          km: 0,
          pendingReimbursement: 0,
          approvedReimbursement: 0,
          paidReimbursement: 0,
          visitsCount: 0
        };
      }
      
      const target = employeeBalances[d.employeeId];
      target.km += Number(d.kmTraveled) || 0;
      target.visitsCount += 1;

      if (d.status === 'Pendente' || d.status === 'Em análise') {
        target.pendingReimbursement += Number(d.amount) || 0;
      } else if (d.status === 'Aprovada' || d.status === 'Reembolsada') {
        target.paidReimbursement += Number(d.amount) || 0;
      } else {
        target.pendingReimbursement += Number(d.amount) || 0;
      }
    });

    const averageConsumption = data.vehicles.length > 0
      ? data.vehicles.reduce((acc, v) => acc + v.avgConsumption, 0) / data.vehicles.length
      : 11;

    return {
      totalSpent,
      totalKm,
      totalVisits,
      averageConsumption,
      employeeBalances: Object.entries(employeeBalances).map(([id, val]) => ({ id, ...val }))
    };
  };

  const metrics = getCorporateMetrics();

  // Search filter
  const getFilteredDisplacements = () => {
    let list = [...data.displacements];
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(d => 
        d.clientVisited.toLowerCase().includes(term) ||
        d.city.toLowerCase().includes(term) ||
        (data.employees.find(e => e.id === d.employeeId)?.name || '').toLowerCase().includes(term) ||
        d.reason.toLowerCase().includes(term)
      );
    }

    if (filterPeriod === 'este_mes') {
      const currentMonth = new Date().toISOString().substring(0, 7);
      list = list.filter(d => d.date.startsWith(currentMonth));
    } else if (filterPeriod === 'pendentes') {
      list = list.filter(d => d.status === 'Pendente' || d.status === 'Em análise');
    } else if (filterPeriod === 'aprovadas') {
      list = list.filter(d => d.status === 'Aprovada');
    }

    if (filterEmployee !== 'todos') {
      list = list.filter(d => d.employeeId === filterEmployee);
    }
    
    if (filterCity !== 'todos') {
      list = list.filter(d => d.city === filterCity);
    }

    return list.sort((a, b) => b.date.localeCompare(a.date));
  };

  const filteredDisplacements = getFilteredDisplacements();

  // Highlight badge mappings
  const renderBadge = (status: Displacement['status']) => {
    const isApproved = status === 'Aprovada' || status === 'Reembolsada';
    if (!isDark) {
      // White version (light mode): buttons/badges are solid black with clear symbol colors, keeping text white
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium bg-black text-white keep-white border border-neutral-900 shadow-sm shrink-0">
          {isApproved ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500/10 shrink-0" /> Aprovada (Reembolsada)
            </>
          ) : (
            <>
              <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" /> Pendente
            </>
          )}
        </span>
      );
    } else {
      // Dark theme version
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium shrink-0 ${
          isApproved 
            ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/40' 
            : 'bg-amber-950/20 text-amber-400 border border-amber-800/40'
        }`}>
          {isApproved ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Aprovada (Reembolsada)
            </>
          ) : (
            <>
              <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse shrink-0" /> Pendente
            </>
          )}
        </span>
      );
    }
  };

  return (
    <div className={`space-y-6 ${isDark ? 'text-neutral-200' : 'text-neutral-800'} px-3 sm:px-6 max-w-4xl mx-auto py-4`}>
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-5">
        <div className="space-y-1">
          <h2 className={`text-2xl font-sans tracking-tight font-bold flex items-center gap-2.5 ${isDark ? 'text-neutral-50' : 'text-black'}`}>
            <span>Consumo da Frota</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Controle integrado de rotas, consumo médio de combustível e reembolsos da frota.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchExpenses}
            className="flex items-center gap-2 text-xs font-medium px-3.5 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition active:scale-95"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sincronizar</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-xs font-mono text-neutral-400 tracking-wider">
          CARREGANDO INFORMAÇÕES CORPORATIVAS DE VIAGEM...
        </div>
      ) : (
        <>
          {/* Main Core Dashboard Numbers (Minimalist, Large typography, No neon effects) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`p-4 rounded-xl border ${
              isDark 
                ? 'border-neutral-800 bg-[#141414] text-neutral-100' 
                : 'border-neutral-200 bg-white text-neutral-900 shadow-xs'
            }`}>
              <span className={`block text-[10px] font-mono uppercase tracking-wider ${isDark ? 'text-neutral-500' : 'text-neutral-500 font-bold'}`}>Total Acumulado</span>
              <span className={`text-xl font-sans font-bold mt-1.5 block ${isDark ? 'text-white' : 'text-neutral-950'}`}>
                R$ {metrics.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className={`p-4 rounded-xl border ${
              isDark 
                ? 'border-neutral-800 bg-[#141414] text-neutral-100' 
                : 'border-neutral-200 bg-white text-neutral-900 shadow-xs'
            }`}>
              <span className={`block text-[10px] font-mono uppercase tracking-wider ${isDark ? 'text-neutral-500' : 'text-neutral-500 font-bold'}`}>Distância Total</span>
              <span className={`text-xl font-sans font-bold mt-1.5 block ${isDark ? 'text-white' : 'text-neutral-950'}`}>
                {metrics.totalKm.toLocaleString('pt-BR')} km
              </span>
            </div>

            <div className={`p-4 rounded-xl border ${
              isDark 
                ? 'border-neutral-800 bg-[#141414] text-neutral-100' 
                : 'border-neutral-200 bg-white text-neutral-900 shadow-xs'
            }`}>
              <span className={`block text-[10px] font-mono uppercase tracking-wider ${isDark ? 'text-neutral-500' : 'text-neutral-500 font-bold'}`}>Total de Visitas</span>
              <span className={`text-xl font-sans font-bold mt-1.5 block ${isDark ? 'text-white' : 'text-neutral-950'}`}>
                {metrics.totalVisits} visitas
              </span>
            </div>

            <div className={`p-4 rounded-xl border ${
              isDark 
                ? 'border-neutral-800 bg-neutral-850 text-white' 
                : 'border-neutral-200 bg-neutral-950 text-white'
            }`}>
              <span className={`block text-[10px] font-mono uppercase tracking-wider ${isDark ? 'text-neutral-400' : 'text-neutral-300'}`}>Média Consumo Frota</span>
              <span className="text-xl font-sans font-bold mt-1.5 block text-white !text-white">
                {metrics.averageConsumption.toFixed(1)} km/l
              </span>
            </div>
          </div>

          {/* Sub-Navigation (Crisp button tabs, full visual contrast) */}
          <div className={`flex border-b overflow-x-auto no-scrollbar gap-2 p-0.5 ${
            isDark ? 'border-neutral-800' : 'border-neutral-200'
          }`}>
            <button
              onClick={() => setActiveSubTab('dashboard')}
              className={`pb-3 px-3 text-sm font-sans font-medium transition-all relative border-b-2 whitespace-nowrap ${
                activeSubTab === 'dashboard'
                  ? `border-[#FF4D00] font-bold ${isDark ? 'text-neutral-100' : 'text-neutral-950'}`
                  : `border-transparent ${isDark ? 'text-neutral-500 hover:text-neutral-300' : 'text-neutral-500 hover:text-neutral-900'}`
              }`}
            >
              Reembolso por Colaborador
            </button>
            <button
              onClick={() => setActiveSubTab('entries')}
              className={`pb-3 px-3 text-sm font-sans font-medium transition-all relative border-b-2 whitespace-nowrap ${
                activeSubTab === 'entries'
                  ? `border-[#FF4D00] font-bold ${isDark ? 'text-neutral-100' : 'text-neutral-950'}`
                  : `border-transparent ${isDark ? 'text-neutral-500 hover:text-neutral-300' : 'text-neutral-500 hover:text-neutral-900'}`
              }`}
            >
              Registro de Viagens ({filteredDisplacements.length})
            </button>
            <button
              onClick={() => setActiveSubTab('employees')}
              className={`pb-3 px-3 text-sm font-sans font-medium transition-all relative border-b-2 whitespace-nowrap ${
                activeSubTab === 'employees'
                  ? `border-[#FF4D00] font-bold ${isDark ? 'text-neutral-100' : 'text-neutral-950'}`
                  : `border-transparent ${isDark ? 'text-neutral-500 hover:text-neutral-300' : 'text-neutral-500 hover:text-neutral-900'}`
              }`}
            >
              Equipe ({data.employees.length})
            </button>
            <button
              onClick={() => setActiveSubTab('vehicles')}
              className={`pb-3 px-3 text-sm font-sans font-medium transition-all relative border-b-2 whitespace-nowrap ${
                activeSubTab === 'vehicles'
                  ? `border-[#FF4D00] font-bold ${isDark ? 'text-neutral-100' : 'text-neutral-950'}`
                  : `border-transparent ${isDark ? 'text-neutral-500 hover:text-neutral-300' : 'text-neutral-500 hover:text-neutral-900'}`
              }`}
            >
              Veículos Cadastrados
            </button>
          </div>

          {/* ============================== */}
          {/* SUB-TAB: REEMBOLSO POR COLABORADOR */}
          {activeSubTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Card - Direct payout visual list by dynamic stats */}
              <div className={`rounded-xl border overflow-hidden ${
                isDark ? 'border-neutral-800 bg-[#111111]' : 'border-neutral-200 bg-white shadow-xs'
              }`}>
                <div className={`p-4 border-b ${
                  isDark ? 'bg-neutral-900/50 border-neutral-800' : 'bg-neutral-100 border-neutral-200'
                }`}>
                  <h3 className={`text-xs font-mono uppercase tracking-wider ${isDark ? 'text-neutral-400' : 'text-neutral-700 font-bold'}`}>
                    Controle de Saldos & Pagamento por Colaborador
                  </h3>
                </div>

                <div className={`divide-y ${isDark ? 'divide-neutral-800' : 'divide-neutral-200'}`}>
                  {metrics.employeeBalances.map(emp => {
                    const totalOwed = emp.pendingReimbursement;
                    return (
                      <div 
                        key={emp.id} 
                        onClick={() => {
                          setSelectedEmployeeId(emp.id);
                          setActiveModal('employee-details');
                        }}
                        className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all cursor-pointer active:scale-[0.98] ${
                          isDark ? 'hover:bg-neutral-900/40' : 'hover:bg-neutral-50'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold text-sm ${isDark ? 'text-neutral-100' : 'text-neutral-900'}`}>
                              {emp.name}
                            </span>
                            <span className={`text-[11px] font-mono ${isDark ? 'text-neutral-500' : 'text-neutral-600'}`}>
                              ({emp.role})
                            </span>
                          </div>
                          
                          <div className={`flex flex-wrap gap-x-4 gap-y-1 text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                            <span>🚗 <strong>{emp.km} km</strong> percorridos</span>
                            <span>📍 <strong>{emp.visitsCount} visitas</strong> registradas</span>
                          </div>
                        </div>

                        {/* Reimbursement columns (clean alignment) */}
                        <div className="flex items-start sm:items-center gap-4 text-xs font-mono">
                          <div className="space-y-0.5">
                            <span className={`block text-[9px] uppercase font-bold ${isDark ? 'text-neutral-500' : 'text-neutral-500'}`}>A pagar</span>
                            <span className="font-bold text-sm text-[#FF4D00] block text-left sm:text-right">
                              R$ {totalOwed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          <div className={`space-y-0.5 border-l pl-4 ${isDark ? 'border-neutral-800' : 'border-neutral-200'}`}>
                            <span className={`block text-[9px] uppercase font-bold ${isDark ? 'text-neutral-500' : 'text-neutral-500'}`}>Pago</span>
                            <span className={`font-bold text-sm block text-left sm:text-right ${isDark ? 'text-neutral-400' : 'text-neutral-700'}`}>
                              R$ {emp.paidReimbursement.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {metrics.employeeBalances.length === 0 && (
                    <div className="p-10 text-center text-xs text-neutral-400 font-mono">
                      Nenhum colaborador registrado. Cadastre profissionais na aba "Equipe".
                    </div>
                  )}
                </div>
              </div>

              {/* Professional Minimalist Auditor Analysis */}
              <div className={`p-5 rounded-xl border ${
                isDark ? 'border-neutral-800 bg-[#111111]/40' : 'border-neutral-200 bg-neutral-50 shadow-xs'
              } space-y-3`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4.5 h-4.5 text-[#FF4D00]" />
                    <span className={`text-xs font-mono font-bold uppercase tracking-wider ${isDark ? 'text-neutral-200' : 'text-neutral-900'}`}>
                      Auditoria e Validação Fiscal
                    </span>
                  </div>
                  <span className={`text-[10px] font-mono ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>Gasolina de referência: R$ 6,29/L</span>
                </div>
                
                <p className={`text-xs leading-relaxed ${isDark ? 'text-neutral-400' : 'text-neutral-750'}`}>
                  Avalie o cumprimento de rotas com base na quilometragem declarada e na eficiência cadastrada de cada veículo. O auditor inteligente analisa desperdícios ou faturamentos anômalos.
                </p>

                <button
                  onClick={runAiAuditor}
                  disabled={isAnalyzing}
                  className={`w-full sm:w-auto px-4 py-2 rounded-lg font-mono font-bold text-xs uppercase tracking-wider transition ${
                    isDark 
                      ? 'bg-white text-black !text-black hover:opacity-90' 
                      : 'bg-neutral-950 text-white !text-white hover:opacity-90'
                  } disabled:opacity-50`}
                >
                  {isAnalyzing ? 'Processando auditoria...' : 'Emitir Relatório de Auditoria'}
                </button>

                {aiReport && (() => {
                  const parsed = parseAuditReport(aiReport);
                  return (
                    <div className={`mt-5 p-5 rounded-xl border ${
                      isDark ? 'border-neutral-800 bg-[#141414]' : 'border-neutral-200 bg-white shadow-sm'
                    } space-y-5 animate-scaleIn`}>
                      
                      {/* Header bar */}
                      <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                        <div className="flex items-center gap-2">
                          <BrainCircuit className="w-4.5 h-4.5 text-[#FF4D00]" />
                          <span className={`text-[11px] font-mono font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                            Análise de Inteligência Leadium
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={handleCopyReport}
                            className={`text-[10px] uppercase font-mono font-bold flex items-center gap-1 ${
                              isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-500 hover:text-neutral-900'
                            }`}
                          >
                            {copiedReport ? <Check className="w-3 text-emerald-500" /> : <Copy className="w-3" />}
                            {copiedReport ? 'Copiado' : 'Copiar'}
                          </button>
                          <button 
                            onClick={() => setAiReport(null)}
                            className={`text-[10px] uppercase font-mono ${isDark ? 'text-neutral-500 hover:text-neutral-300' : 'text-neutral-400 hover:text-neutral-600'}`}
                          >
                            Fechar
                          </button>
                        </div>
                      </div>

                      {/* Exec Summary Block */}
                      {parsed.summary && (
                        <div className={`p-4 rounded-lg text-xs leading-relaxed border-l-2 border-[#FF4D00] ${
                          isDark ? 'bg-neutral-900/30 text-neutral-300' : 'bg-neutral-50 text-neutral-700'
                        }`}>
                          {parsed.summary}
                        </div>
                      )}

                      {/* Visual Dashboard Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* 1. Painel Analítico Geral */}
                        <div className={`p-4 rounded-lg border ${
                          isDark ? 'bg-[#111111] border-neutral-800/60' : 'bg-neutral-50/50 border-neutral-200/80'
                        } space-y-2.5`}>
                          <div className="flex items-center gap-2 pb-1 border-b border-neutral-200 dark:border-neutral-800/40">
                            <BarChart3 className="w-4 h-4 text-emerald-500" />
                            <h4 className={`text-xs font-mono uppercase tracking-wider font-bold ${isDark ? 'text-white' : 'text-neutral-800'}`}>
                              Painel Analítico Geral
                            </h4>
                          </div>
                          {parsed.general.length > 0 ? (
                            <ul className="space-y-1.5 text-xs">
                              {parsed.general.map((point, index) => (
                                <li key={index} className={`flex gap-1.5 items-start ${isDark ? 'text-neutral-300' : 'text-neutral-600'}`}>
                                  <span className="text-emerald-500 mt-0.5">•</span>
                                  <span>{point}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-neutral-400 italic">Nenhum dado analítico encontrado.</p>
                          )}
                        </div>

                        {/* 2. Eficiência da Frota */}
                        <div className={`p-4 rounded-lg border ${
                          isDark ? 'bg-[#111111] border-neutral-800/60' : 'bg-neutral-50/50 border-neutral-200/80'
                        } space-y-2.5`}>
                          <div className="flex items-center gap-2 pb-1 border-b border-neutral-200 dark:border-neutral-800/40">
                            <Zap className="w-4 h-4 text-amber-500" />
                            <h4 className={`text-xs font-mono uppercase tracking-wider font-bold ${isDark ? 'text-white' : 'text-neutral-800'}`}>
                              Eficiência Individual
                            </h4>
                          </div>
                          {parsed.efficiency.length > 0 ? (
                            <ul className="space-y-1.5 text-xs">
                              {parsed.efficiency.map((point, index) => (
                                <li key={index} className={`flex gap-1.5 items-start ${isDark ? 'text-neutral-300' : 'text-neutral-600'}`}>
                                  <span className="text-amber-500 mt-0.5">⚡</span>
                                  <span>{point}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-neutral-400 italic">Nenhuma eficiência individual calculada.</p>
                          )}
                        </div>

                        {/* 3. Inconsistências & Desperdiços */}
                        <div className={`p-4 rounded-lg border ${
                          isDark ? 'bg-[#1C1616] border-red-950/40' : 'bg-rose-50/30 border-red-100'
                        } space-y-2.5`}>
                          <div className="flex items-center gap-2 pb-1 border-b border-rose-100/50 dark:border-red-950/20">
                            <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />
                            <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-rose-600 dark:text-rose-450">
                              Desperdícios & Alertas
                            </h4>
                          </div>
                          {parsed.inconsistencies.length > 0 ? (
                            <ul className="space-y-1.5 text-xs">
                              {parsed.inconsistencies.map((point, index) => (
                                <li key={index} className="flex gap-1.5 items-start text-rose-800 dark:text-rose-300">
                                  <span className="text-rose-500 mt-0.5">⚠️</span>
                                  <span>{point}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-emerald-700 dark:text-emerald-400 italic">Parabéns! Nenhuma inconsistência identificada nesta rodada.</p>
                          )}
                        </div>

                        {/* 4. Recomendações e Economia */}
                        <div className={`p-4 rounded-lg border ${
                          isDark ? 'bg-[#121A1A] border-emerald-950/40' : 'bg-emerald-50/20 border-emerald-100 animate-transition'
                        } space-y-2.5`}>
                          <div className="flex items-center gap-2 pb-1 border-b border-emerald-100/50 dark:border-emerald-950/20">
                            <Award className="w-4 h-4 text-emerald-500" />
                            <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-emerald-700 dark:text-emerald-400">
                              Oportunidades de Economia
                            </h4>
                          </div>
                          {parsed.recommendations.length > 0 ? (
                            <ul className="space-y-1.5 text-xs">
                              {parsed.recommendations.map((point, index) => (
                                <li key={index} className="flex gap-1.5 items-start text-emerald-800 dark:text-emerald-300">
                                  <span className="text-emerald-500 mt-0.5">💡</span>
                                  <span>{point}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-neutral-400 italic">Nenhuma oportunidade identificada.</p>
                          )}
                        </div>

                      </div>

                      {/* Technical Details summary drawer */}
                      <details className={`text-xs border rounded-lg overflow-hidden ${
                        isDark ? 'border-neutral-800 bg-neutral-900/10' : 'border-neutral-200 bg-neutral-50/40'
                      }`}>
                        <summary className={`px-3.5 py-2 cursor-pointer font-mono text-[10px] uppercase font-bold select-none hover:bg-neutral-100 dark:hover:bg-neutral-800/30 ${
                          isDark ? 'text-neutral-400' : 'text-neutral-600'
                        }`}>
                          Ver Relatório Completo Gerado de IA (Texto Markdown)
                        </summary>
                        <div className={`p-3 border-t text-[11px] font-mono whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed ${
                          isDark ? 'bg-neutral-950 border-neutral-800 text-neutral-300' : 'bg-white border-neutral-200 text-neutral-600'
                        }`}>
                          {aiReport}
                        </div>
                      </details>

                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ============================== */}
          {/* SUB-TAB: TIMELINE DE VIAGENS REGISTRADAS */}
          {activeSubTab === 'entries' && (
            <div className="space-y-4">
              {/* Clean Filter Form Tray */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 justify-between">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filtrar por data, cliente visitado, cidade, motivo..."
                    className="w-full pl-9 pr-4 py-2 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-[#FF4D00] transition"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-3 py-2 rounded-lg border text-xs font-sans font-medium flex items-center gap-1.5 transition ${
                      showFilters 
                        ? 'bg-[#FF4D00]/10 border-[#FF4D00] text-[#FF4D00]' 
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Filtros</span>
                  </button>

                  <button
                    onClick={openAddDisplacement}
                    className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border-[1.58px] px-5 py-3 font-medium shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl text-xs font-bold uppercase tracking-wider ${isDark ? 'bg-white border-zinc-200 text-zinc-950' : 'bg-zinc-950 border-zinc-600 text-slate-200'}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Lançar Viagem</span>
                  </button>
                </div>
              </div>

              {/* Expandable filters dropdown (highly contrastive text layouts) */}
              {showFilters && (
                <div className="p-4 rounded-xl border border-neutral-900 bg-black grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fadeIn">
                  <div className="space-y-1.5 text-left">
                    <label className="inline-block bg-white text-black text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded leading-none">Período de Tempo</label>
                    <select
                      value={filterPeriod}
                      onChange={(e) => setFilterPeriod(e.target.value)}
                      className="w-full p-2 rounded-lg border border-neutral-700 bg-white text-xs text-black font-semibold outline-none focus:border-neutral-400 !text-black !bg-white"
                    >
                      <option value="todos" className="text-black bg-white">Todos os lançamentos</option>
                      <option value="este_mes" className="text-black bg-white">Este Mês</option>
                      <option value="pendentes" className="text-black bg-white">Apenas Pendentes (A pagar)</option>
                      <option value="aprovadas" className="text-black bg-white">Aprovadas para Reembolso</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="inline-block bg-white text-black text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded leading-none">Colaborador</label>
                    <select
                      value={filterEmployee}
                      onChange={(e) => setFilterEmployee(e.target.value)}
                      className="w-full p-2 rounded-lg border border-neutral-700 bg-white text-xs text-black font-semibold outline-none focus:border-neutral-400 !text-black !bg-white"
                    >
                      <option value="todos" className="text-black bg-white">Todos</option>
                      {data.employees.map(e => (
                        <option key={e.id} value={e.id} className="text-black bg-white">{e.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="inline-block bg-white text-black text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded leading-none">Filtrar por Cidade</label>
                    <select
                      value={filterCity}
                      onChange={(e) => setFilterCity(e.target.value)}
                      className="w-full p-2 rounded-lg border border-neutral-700 bg-white text-xs text-black font-semibold outline-none focus:border-neutral-400 !text-black !bg-white"
                    >
                      <option value="todos" className="text-black bg-white">Todas</option>
                      {Array.from(new Set(data.displacements.map(d => d.city))).filter(Boolean).map(city => (
                        <option key={city} value={city} className="text-black bg-white">{city}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Minimalist Timeline List (Perfect for direct smartphone viewing) */}
              <div className="space-y-3">
                {filteredDisplacements.map(disp => {
                  const emp = data.employees.find(e => e.id === disp.employeeId);
                  return (
                    <div 
                      key={disp.id} 
                      className={`p-4 rounded-xl border transition ${
                        isDark 
                          ? 'border-neutral-800 bg-[#141414] hover:border-neutral-700' 
                          : 'border-neutral-200 bg-white hover:border-neutral-300 shadow-xs'
                      }`}
                    >
                      {/* Flex main info block header */}
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-0.5">
                          <span className="text-[11px] font-mono text-neutral-400">{disp.date}</span>
                          <span className={`font-bold text-sm block ${isDark ? 'text-neutral-100' : 'text-neutral-900'}`}>
                            {emp ? emp.name : 'Colaborador Desconhecido'}
                          </span>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <span className="font-mono font-bold text-sm text-[#FF4D00]">
                            R$ {disp.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="block text-[10px] font-mono text-neutral-400 mt-0.5">{disp.kmTraveled} km declarados</span>
                          <button
                            onClick={() => {
                              if (disp.refundReceiptImage) {
                                setSelectedReceiptImage(disp.refundReceiptImage);
                              } else {
                                setRefundReceiptTargetId(disp.id);
                                setActiveModal('refund-receipt');
                              }
                            }}
                            className={`mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono font-bold transition cursor-pointer ${
                              disp.refundReceiptImage
                                ? (isDark ? 'bg-green-900/30 text-green-400 border border-green-800' : 'bg-green-100 text-green-700 border border-green-200')
                                : (isDark ? 'bg-neutral-800 text-neutral-300 border border-neutral-700' : 'bg-neutral-100 text-neutral-600 border border-neutral-200')
                            }`}
                            title={disp.refundReceiptImage ? "Visualizar Comprovante de Reembolso" : "Anexar Comprovante de Reembolso"}
                          >
                            {disp.refundReceiptImage ? <Check className="w-2.5 h-2.5" /> : <UploadCloud className="w-2.5 h-2.5" />}
                            <span>{disp.refundReceiptImage ? 'Reembolso Anexado' : '+ Reembolso'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Travel path details */}
                      <div className={`mt-3 py-2 px-3 rounded space-y-1.5 ${
                        isDark ? 'bg-neutral-900/50' : 'bg-neutral-50'
                      }`}>
                        <div className={`flex items-center gap-1.5 text-xs ${isDark ? 'text-neutral-300' : 'text-neutral-800'}`}>
                          <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          <span>
                            <strong>Visita:</strong> {disp.clientVisited} - {disp.city}
                          </span>
                        </div>
                        <div className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                          <strong>Motivo:</strong> {disp.reason || 'Não definido'}
                        </div>
                        {disp.notes && (
                          <div className={`text-[11px] italic ${isDark ? 'text-neutral-500' : 'text-neutral-500'}`}>
                            Observação: "{disp.notes}"
                          </div>
                        )}
                        <div className={`text-[10px] border-t pt-1 flex justify-between ${
                          isDark ? 'border-neutral-800 text-neutral-500' : 'border-neutral-200 text-neutral-500 font-medium'
                        }`}>
                          <span>Veículo utilizado: {disp.vehicleName || 'Frota Geral'}</span>
                          <span>Combustível consumido: ~{(disp.litersConsumed || 0).toFixed(1)} L</span>
                        </div>
                      </div>

                      {/* Control buttons with visible boundaries */}
                      <div className={`mt-3.5 flex justify-between items-center border-t pt-3 ${
                        isDark ? 'border-neutral-800' : 'border-neutral-200'
                      }`}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button 
                            onClick={() => openStatusUpdate(disp)}
                            className="hover:scale-[1.02] active:scale-95 transition shrink-0"
                            title="Clique para alterar status de reembolso"
                          >
                            {renderBadge(disp.status)}
                          </button>

                          {disp.startLat !== undefined && disp.endLat !== undefined && (
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&origin=${disp.startLat},${disp.startLng}&destination=${disp.endLat},${disp.endLng}`}
                              target="_blank"
                              rel="noreferrer"
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-mono font-medium transition cursor-pointer ${
                                isDark
                                  ? 'bg-[#FF4D00]/10 text-[#FF4D00] border border-[#FF4D00]/20 hover:bg-[#FF4D00]/20'
                                  : 'bg-[#FF4D00]/10 text-[#FF4D00] border border-[#FF4D00]/20 hover:bg-[#FF4D00]/20'
                              }`}
                              title="Visualizar Rota no Mapa"
                            >
                              <MapPin className="w-3 h-3" />
                              <span>Ver Rota</span>
                            </a>
                          )}

                          {disp.receiptImage && (
                            <button
                              onClick={() => setSelectedReceiptImage(disp.receiptImage || '')}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-mono font-medium transition cursor-pointer ${
                                isDark
                                  ? 'bg-blue-950/20 text-blue-400 border border-blue-900/50 hover:bg-blue-900/10'
                                  : 'bg-blue-50 text-blue-750 border border-blue-200 hover:bg-blue-100'
                              }`}
                              title="Visualizar Comprovante de Abastecimento"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Comprovante</span>
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedHistoryDisp(disp)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-mono font-medium transition cursor-pointer ${
                              isDark
                                ? 'bg-neutral-800 text-neutral-300 border border-neutral-700 hover:bg-neutral-700'
                                : 'bg-neutral-100 text-neutral-600 border border-neutral-200 hover:bg-neutral-200'
                            }`}
                            title="Histórico de Status"
                          >
                            <Clock className="w-3 h-3" />
                            <span>Histórico</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => deleteDisplacement(disp.id)}
                            className="p-1.5 sm:px-2.5 sm:py-1 rounded border border-red-200/50 hover:bg-rose-500/10 text-xs font-sans text-neutral-500 hover:text-rose-500 transition"
                            title="Excluir"
                          >
                            <Trash2 className="w-3 h-3 block sm:inline" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredDisplacements.length === 0 && (
                  <div className="py-20 text-center text-xs text-neutral-400 font-mono">
                    Nenhum deslocamento localizado com os filtros selecionados.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================== */}
          {/* SUB-TAB: GESTÃO DE COLABORADORES */}
          {activeSubTab === 'employees' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-neutral-100 dark:border-neutral-800">
                <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider font-bold">Colaboradores no sistema</span>
                <button
                  onClick={openAddEmployee}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-black hover:opacity-90 transition text-xs font-mono font-bold uppercase tracking-wider"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Colaborador
                </button>
              </div>

              <div className="space-y-2">
                {data.employees.map(emp => (
                  <div 
                    key={emp.id} 
                    className={`p-4 rounded-xl border flex items-center justify-between transition ${
                      isDark 
                        ? 'border-neutral-800 bg-[#141414] hover:border-neutral-700' 
                        : 'border-neutral-200 bg-white hover:border-neutral-300 shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm ${isDark ? 'text-neutral-100' : 'text-neutral-900'}`}>{emp.name}</span>
                        <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                          emp.status === 'Ativo' 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                            : 'bg-neutral-200 text-neutral-700'
                        }`}>{emp.status}</span>
                      </div>
                      <span className={`text-xs block mt-1 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>{emp.role} • {emp.email} • {emp.phone || 'Sem telefone'}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditEmployee(emp)}
                        className={`p-1 px-2.5 py-1 text-xs border rounded transition ${
                          isDark 
                            ? 'border-neutral-800 text-neutral-400 hover:bg-neutral-800 hover:text-white' 
                            : 'border-neutral-200 text-neutral-600 hover:bg-neutral-100 hover:text-black font-semibold'
                        }`}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => deleteEmployee(emp.id, emp.name)}
                        className="p-1 hover:bg-rose-500/10 rounded text-neutral-450 hover:text-rose-500 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================== */}
          {/* SUB-TAB: VEÍCULOS DA FROTA */}
          {activeSubTab === 'vehicles' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-neutral-100 dark:border-neutral-800">
                <span className={`text-xs font-mono uppercase tracking-widest font-bold ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>Veículos cadastrados</span>
                <button
                  onClick={openAddVehicle}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-black hover:opacity-90 transition text-xs font-mono font-bold uppercase tracking-wider"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Veículo
                </button>
              </div>

              <div className="space-y-2">
                {data.vehicles.map(v => {
                  const employee = data.employees.find(e => e.id === v.employeeId);
                  return (
                    <div 
                      key={v.id} 
                      className={`p-4 rounded-xl border flex items-center justify-between transition ${
                        isDark 
                          ? 'border-neutral-800 bg-[#141414] hover:border-neutral-700' 
                          : 'border-neutral-200 bg-white hover:border-neutral-300 shadow-xs'
                      }`}
                    >
                      <div>
                        <span className={`font-bold text-sm block ${isDark ? 'text-neutral-100' : 'text-neutral-900'}`}>{v.name}</span>
                        <span className={`text-xs block mt-1 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                          Placa: {v.plate || 'Não cadastrada'} • Combustível: {v.fuelType} • Consumo: {v.avgConsumption} km/l
                        </span>
                        <span className={`text-xs block mt-1 ${isDark ? 'text-neutral-500' : 'text-neutral-600'}`}>Responsável: {employee ? employee.name : v.owner}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEditVehicle(v)}
                          className={`p-1 px-2.5 py-1 text-xs border rounded transition ${
                            isDark 
                              ? 'border-neutral-800 text-neutral-400 hover:bg-neutral-800 hover:text-white' 
                              : 'border-neutral-200 text-neutral-600 hover:bg-neutral-100 hover:text-black font-semibold'
                          }`}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => deleteVehicle(v.id, v.name)}
                          className="p-1 hover:bg-rose-500/10 rounded text-neutral-450 hover:text-rose-500 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ======================================================== */}
      {/* PROFESSIONAL MINIMALIST REGULAR DIALOGS */}

      {/* Modal 1: Colaborador */}
      {activeModal === 'employee' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-sm rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white uppercase tracking-wider">
              {editingId ? 'Editar Profissional' : 'Novo Profissional'}
            </h3>
            
            <form onSubmit={handleEmployeeSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono text-neutral-400">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={employeeForm.name}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                  placeholder="Nome do colaborador"
                  className="w-full p-2 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-transparent text-neutral-950 dark:text-white outline-none focus:border-[#FF4D00]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono text-neutral-400">Função Comercial</label>
                <input
                  type="text"
                  value={employeeForm.role}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, role: e.target.value })}
                  placeholder="Ex: Consultor de Vendas"
                  className="w-full p-2 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-transparent text-neutral-950 dark:text-white outline-none focus:border-[#FF4D00]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono text-neutral-400">E-mail Corporativo</label>
                <input
                  type="email"
                  required
                  value={employeeForm.email}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                  placeholder="nome@leadium.com.br"
                  className="w-full p-2 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-transparent text-neutral-950 dark:text-white outline-none focus:border-[#FF4D00]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono text-neutral-400">Telefone celular</label>
                <input
                  type="text"
                  value={employeeForm.phone}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  className="w-full p-2 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-transparent text-neutral-950 dark:text-white outline-none focus:border-[#FF4D00]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono text-neutral-400">Status Cadastral</label>
                <select
                  value={employeeForm.status}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, status: e.target.value as 'Ativo' | 'Inativo' })}
                  className="w-full p-2 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white outline-none focus:border-[#FF4D00]"
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={closeModals}
                  className={`flex-1 py-1.5 text-xs font-mono uppercase border rounded transition ${
                    isDark 
                      ? 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800 hover:text-white' 
                      : 'bg-neutral-100 border-neutral-250 text-neutral-700 hover:bg-neutral-200 font-bold'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border-[1.58px] px-5 py-3 font-medium shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl text-xs font-bold uppercase tracking-wider ${isDark ? 'bg-white border-zinc-200 text-zinc-950' : 'bg-zinc-950 border-zinc-600 text-slate-200'}`}
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Veículo */}
      {activeModal === 'vehicle' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-sm rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white uppercase tracking-wider">
              {editingId ? 'Editar veículo' : 'Cadastrar veículo'}
            </h3>

            <form onSubmit={handleVehicleSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono text-neutral-400">Proprietário (Responsável)</label>
                <select
                  value={vehicleForm.employeeId}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, employeeId: e.target.value })}
                  className="w-full p-2 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white outline-none focus:border-[#FF4D00]"
                >
                  {data.employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-neutral-400">Marca (FIPE)</label>
                  <select
                    value={selectedFipeBrand}
                    onChange={(e) => {
                      const brandCode = e.target.value;
                      setSelectedFipeBrand(brandCode);
                      const brandName = fipeBrands.find(b => b.codigo === brandCode)?.nome || '';
                      setVehicleForm({ ...vehicleForm, brand: brandName, name: '', model: '' });
                    }}
                    className="w-full p-2 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white outline-none focus:border-[#FF4D00]"
                  >
                    <option value="" disabled>Selecione a marca</option>
                    {fipeBrands.map(b => (
                      <option key={b.codigo} value={b.codigo}>{b.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-neutral-400">Modelo (FIPE)</label>
                  <select
                    value={vehicleForm.name}
                    onChange={(e) => {
                      const modelName = e.target.value;
                      setVehicleForm({ ...vehicleForm, name: modelName, model: modelName });
                    }}
                    disabled={!selectedFipeBrand || fipeModels.length === 0}
                    className="w-full p-2 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white outline-none focus:border-[#FF4D00] disabled:opacity-50"
                  >
                    <option value="" disabled>Selecione o modelo</option>
                    {fipeModels.map(m => (
                      <option key={m.codigo} value={m.nome}>{m.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-neutral-400">Ano</label>
                  <input
                    type="text"
                    value={vehicleForm.year || ''}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, year: e.target.value })}
                    placeholder="Ex: 2021"
                    className="w-full p-2 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-transparent text-neutral-950 dark:text-white outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-neutral-400">Placa</label>
                  <input
                    type="text"
                    value={vehicleForm.plate}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, plate: e.target.value })}
                    placeholder="Ex: ABC1D23"
                    className="w-full p-2 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-transparent text-neutral-950 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-neutral-400">Combustível</label>
                  <select
                    value={vehicleForm.fuelType}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, fuelType: e.target.value })}
                    className="w-full p-2 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white outline-none"
                  >
                    <option value="Gasolina">Gasolina</option>
                    <option value="Flex">Flex (Álcool/Gasolina)</option>
                    <option value="Diesel">Diesel</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-neutral-400">Consumo (km/l)</label>
                  <input
                    type="number"
                    required
                    value={vehicleForm.avgConsumption}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, avgConsumption: e.target.value })}
                    placeholder="Ex: 11"
                    className="w-full p-2 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-transparent text-neutral-950 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={closeModals}
                  className={`flex-1 py-1.5 text-xs font-mono uppercase border rounded transition ${
                    isDark 
                      ? 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800 hover:text-white' 
                      : 'bg-neutral-100 border-neutral-250 text-neutral-700 hover:bg-neutral-200 font-bold'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border-[1.58px] px-5 py-3 font-medium shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl text-xs font-bold uppercase tracking-wider ${isDark ? 'bg-white border-zinc-200 text-zinc-950' : 'bg-zinc-950 border-zinc-600 text-slate-200'}`}
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Lançar Viagem */}
      {activeModal === 'displacement' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-sm rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white uppercase tracking-wider">
                {editingId ? 'Editar Viagem' : 'Lançar Nova Viagem'}
              </h3>
              <button 
                type="button" 
                onClick={closeModals}
                className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {activeTrip ? (
              <div className="space-y-4 text-center py-4">
                <div className="w-16 h-16 rounded-full bg-[#FF4D00]/10 flex items-center justify-center mx-auto animate-pulse">
                  <MapPin className="w-8 h-8 text-[#FF4D00]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-white">Viagem em Andamento</p>
                  {activeTrip.startTime && (
                    <p className="text-xs text-neutral-500 mt-1 font-mono">
                      Iniciada às {new Date(activeTrip.startTime).toLocaleTimeString('pt-BR')}
                    </p>
                  )}
                  
                  {activeTrip.startLat !== undefined && activeTrip.startLng !== undefined && (
                    <div className="mt-4 p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 text-left">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Ponto de Partida</p>
                      {activeTrip.startAddress ? (
                        <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                          {activeTrip.startAddress}
                        </p>
                      ) : (
                        <p className="text-xs text-neutral-700 dark:text-neutral-300 font-mono">
                          Lat: {activeTrip.startLat.toFixed(6)} <br/>
                          Lng: {activeTrip.startLng.toFixed(6)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="pt-4 space-y-2">
                  <button 
                    type="button" 
                    onClick={finishGpsTrip} 
                    className="w-full bg-[#FF4D00] text-white py-3 rounded-lg font-bold uppercase tracking-wider text-xs shadow-md transition hover:bg-[#E64500] hover:shadow-lg"
                  >
                    Finalizar Viagem e Salvar
                  </button>
                  <button 
                    type="button" 
                    onClick={cancelGpsTrip} 
                    className="w-full bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 py-3 rounded-lg font-bold uppercase tracking-wider text-xs hover:bg-neutral-200 dark:hover:bg-neutral-800 transition"
                  >
                    Cancelar Viagem
                  </button>
                </div>
              </div>
            ) : !editingId ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-neutral-400">Selecionar Colaborador</label>
                  <select
                    required
                    value={displacementForm.employeeId}
                    onChange={(e) => {
                      const empId = e.target.value;
                      const linked = data.vehicles.filter(v => v.employeeId === empId);
                      setDisplacementForm({
                        ...displacementForm,
                        employeeId: empId,
                        vehicleId: linked[0]?.id || ''
                      });
                    }}
                    className="w-full p-2 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white outline-none focus:border-[#FF4D00]"
                  >
                    <option value="" disabled>--- Escolha o colaborador ---</option>
                    {data.employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-neutral-400">Veículo Utilizado</label>
                  <select
                    required
                    value={displacementForm.vehicleId}
                    onChange={(e) => setDisplacementForm({ ...displacementForm, vehicleId: e.target.value })}
                    className="w-full p-2 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white outline-none focus:border-[#FF4D00]"
                  >
                    <option value="" disabled>--- Escolha o veículo ---</option>
                    {data.vehicles
                      .filter(v => !displacementForm.employeeId || v.employeeId === displacementForm.employeeId)
                      .map(v => (
                        <option key={v.id} value={v.id}>{v.name} ({v.plate || '---'})</option>
                      ))
                    }
                  </select>
                </div>

                <div className="pt-2">
                  <button 
                    type="button" 
                    onClick={startGpsTrip} 
                    className="w-full bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 py-3 rounded-lg font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <MapPin className="w-4 h-4" /> Ativar Localização e Iniciar
                  </button>
                </div>
              </div>
            ) : (
            <form onSubmit={handleDisplacementSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono text-neutral-400">Selecionar Colaborador</label>
                <select
                  required
                  value={displacementForm.employeeId}
                  onChange={(e) => {
                    const empId = e.target.value;
                    const linked = data.vehicles.filter(v => v.employeeId === empId);
                    setDisplacementForm({
                      ...displacementForm,
                      employeeId: empId,
                      vehicleId: linked[0]?.id || ''
                    });
                  }}
                  className="w-full p-2 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white outline-none focus:border-[#FF4D00]"
                >
                  <option value="" disabled>--- Escolha o colaborador ---</option>
                  {data.employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono text-neutral-400">Veículo Utilizado</label>
                <select
                  required
                  value={displacementForm.vehicleId}
                  onChange={(e) => setDisplacementForm({ ...displacementForm, vehicleId: e.target.value })}
                  className="w-full p-2 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white outline-none focus:border-[#FF4D00]"
                >
                  <option value="" disabled>--- Escolha o veículo ---</option>
                  {data.vehicles
                    .filter(v => !displacementForm.employeeId || v.employeeId === displacementForm.employeeId)
                    .map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.plate || '---'}) - {v.avgConsumption} km/l</option>
                    ))
                  }
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-neutral-400">Data</label>
                  <input
                    type="date"
                    required
                    value={displacementForm.date}
                    onChange={(e) => setDisplacementForm({ ...displacementForm, date: e.target.value })}
                    className="w-full p-2 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-transparent text-neutral-950 dark:text-white outline-none focus:border-[#FF4D00]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-neutral-400">KM Rodados</label>
                  <input
                    type="number"
                    required
                    value={displacementForm.kmTraveled}
                    onChange={(e) => setDisplacementForm({ ...displacementForm, kmTraveled: e.target.value })}
                    placeholder="Ex: 54"
                    className="w-full p-2 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-transparent text-neutral-950 dark:text-white outline-none focus:border-[#FF4D00]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono text-neutral-400">Cliente Visitado</label>
                <input
                  type="text"
                  required
                  value={displacementForm.clientVisited}
                  onChange={(e) => setDisplacementForm({ ...displacementForm, clientVisited: e.target.value })}
                  placeholder="Nome do cliente/loja"
                  className="w-full p-2 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-transparent text-neutral-950 dark:text-white outline-none focus:border-[#FF4D00]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-neutral-400">Cidade</label>
                  <select
                    required
                    value={displacementForm.city || 'Porto Feliz - SP'}
                    onChange={(e) => setDisplacementForm({ ...displacementForm, city: e.target.value })}
                    className="w-full p-2 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white outline-none focus:border-[#FF4D00]"
                  >
                    <option value="Porto Feliz - SP">Porto Feliz - SP</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-neutral-400">Motivo</label>
                  <input
                    type="text"
                    required
                    value={displacementForm.reason}
                    onChange={(e) => setDisplacementForm({ ...displacementForm, reason: e.target.value })}
                    placeholder="Suporte, Venda..."
                    className="w-full p-2 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-transparent text-neutral-950 dark:text-white outline-none focus:border-[#FF4D00]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono text-neutral-400">Observações adicionais</label>
                <textarea
                  value={displacementForm.notes}
                  onChange={(e) => setDisplacementForm({ ...displacementForm, notes: e.target.value })}
                  placeholder="Observações complementares..."
                  className="w-full p-2 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-transparent text-neutral-950 dark:text-white outline-none resize-none h-16"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono text-neutral-450 block">Comprovante de Abastecimento</label>
                {displacementForm.receiptImage ? (
                  <div className="relative rounded-lg border border-neutral-200 dark:border-neutral-800 p-2 bg-neutral-50 dark:bg-neutral-900 flex items-center justify-between">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <img 
                        src={displacementForm.receiptImage} 
                        alt="Comprovante" 
                        className="w-10 h-10 object-cover rounded border border-neutral-200 dark:border-neutral-800"
                        referrerPolicy="no-referrer"
                      />
                      <span className="text-[10px] text-neutral-500 font-mono truncate">Foto carregada</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDisplacementForm({ ...displacementForm, receiptImage: '' })}
                      className="text-[10px] font-mono px-2 py-1 text-red-650 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded border border-rose-200 dark:border-rose-900 font-semibold shrink-0"
                    >
                      Remover
                    </button>
                  </div>
                ) : (
                  <div 
                    className="border border-dashed border-neutral-300 dark:border-neutral-800 rounded-lg p-3 text-center cursor-pointer hover:border-[#FF4D00] transition bg-neutral-50/50 dark:bg-neutral-900/25"
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
                                setDisplacementForm(prev => ({
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
                                  setDisplacementForm(prev => ({
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
                )}
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={closeModals}
                  className={`flex-1 py-1.5 text-xs font-mono uppercase border rounded transition ${
                    isDark 
                      ? 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800 hover:text-white' 
                      : 'bg-neutral-100 border-neutral-250 text-neutral-700 hover:bg-neutral-200 font-bold'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border-[1.58px] px-5 py-3 font-medium shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl text-xs font-bold uppercase tracking-wider ${isDark ? 'bg-white border-zinc-200 text-zinc-950' : 'bg-zinc-950 border-zinc-600 text-slate-200'}`}
                >
                  Lançar
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}

      {/* Modal 4: Alterar Status de Reembolso */}
      {activeModal === 'status-update' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-sm rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 space-y-4 shadow-xl animate-scaleIn">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-900 dark:text-white">
              Status do Reembolso
            </h3>

            <p className="text-xs text-neutral-500">
              Altere o fluxo de pagamento para esta despesa comercial.
            </p>

            <form onSubmit={handleStatusSubmit} className="space-y-4">
              <div className="flex flex-col gap-2">
                {(['Pendente', 'Aprovada'] as const).map((statusOption) => (
                  <label 
                    key={statusOption} 
                    className={`flex items-center gap-3 p-3 rounded-lg border text-xs cursor-pointer transition ${
                      statusForm === statusOption
                        ? 'border-[#FF4D00] bg-[#FF4D00]/5 text-neutral-950 dark:text-white font-semibold'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-900/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="statusOption"
                      checked={statusForm === statusOption || (statusOption === 'Aprovada' && statusForm === 'Reembolsada')}
                      onChange={() => setStatusForm(statusOption)}
                      className="accent-[#FF4D00]"
                    />
                    <span>{statusOption === 'Pendente' ? '🟡 Pendente' : '🟢 Aprovada (Reembolsada)'}</span>
                  </label>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModals}
                  className={`flex-1 py-1.5 text-xs font-mono uppercase border rounded transition ${
                    isDark 
                      ? 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800 hover:text-white' 
                      : 'bg-neutral-100 border-neutral-250 text-neutral-700 hover:bg-neutral-200 font-bold'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border-[1.58px] px-5 py-3 font-medium shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl text-xs font-bold uppercase tracking-wider ${isDark ? 'bg-white border-zinc-200 text-zinc-950' : 'bg-zinc-950 border-zinc-600 text-slate-200'}`}
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 5: Visualizar Comprovante Ampliado */}
      {selectedReceiptImage && (
        <div 
          className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn" 
          onClick={() => setSelectedReceiptImage(null)}
        >
          <div 
            className="relative max-w-lg w-full rounded-xl bg-neutral-900 border border-neutral-800 p-4 space-y-4 shadow-2xl" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">Comprovante de Abastecimento</span>
              <button
                onClick={() => setSelectedReceiptImage(null)}
                className="text-xs font-mono font-bold px-2 py-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition"
              >
                Fechar
              </button>
            </div>
            <div className="flex items-center justify-center bg-[#0d0d0d] rounded-lg overflow-hidden border border-neutral-800 max-h-[70vh]">
              <img 
                src={selectedReceiptImage} 
                alt="Comprovante de Abastecimento Ampliado" 
                className="max-w-full max-h-[65vh] object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}
      {/* Modal: Status History */}
      {selectedHistoryDisp && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn" 
          onClick={() => setSelectedHistoryDisp(null)}
        >
          <div 
            className="w-full max-w-sm rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5 shadow-2xl" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3 mb-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-900 dark:text-white">
                Histórico de Status
              </h3>
              <button 
                onClick={() => setSelectedHistoryDisp(null)}
                className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {selectedHistoryDisp.history && selectedHistoryDisp.history.length > 0 ? (
                <div className="relative border-l-2 border-neutral-200 dark:border-neutral-800 ml-2 space-y-4">
                  {selectedHistoryDisp.history.map((h, i) => (
                    <div key={i} className="relative pl-4">
                      <div className="absolute w-2 h-2 bg-[#FF4D00] rounded-full -left-[5px] top-1.5 ring-4 ring-white dark:ring-neutral-950"></div>
                      <span className="block text-xs font-bold text-neutral-900 dark:text-neutral-100">{h.status}</span>
                      <span className="block text-[10px] font-mono text-neutral-500 mt-0.5">
                        {new Date(h.date).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-center text-neutral-500 font-mono py-4">Sem histórico registrado.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Refund Receipt Upload */}
      {activeModal === 'refund-receipt' && refundReceiptTargetId && (() => {
        const targetDisp = data.displacements.find(d => d.id === refundReceiptTargetId);
        if (!targetDisp) return null;
        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn" onClick={closeModals}>
            <div className="w-full max-w-sm rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 space-y-4 shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white uppercase tracking-wider">Comprovante de Reembolso</h3>
                <button onClick={closeModals} className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-neutral-500">Faça o upload do comprovante de pagamento / PIX (Financeiro Leadium).</p>
              
              <div className="mt-4">
                <div 
                  className="border border-dashed border-neutral-300 dark:border-neutral-800 rounded-lg p-6 text-center cursor-pointer hover:border-[#FF4D00] transition bg-neutral-50/50 dark:bg-neutral-900/25"
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
                              // Save straight to displacement
                              await fetch('/api/expenses/displacements', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ ...targetDisp, refundReceiptImage: data.url })
                              });
                              await fetchExpenses();
                              closeModals();
                            }
                          } catch (err) {
                            console.error(err);
                            alert('Falha ao enviar comprovante');
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
                                await fetch('/api/expenses/displacements', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ ...targetDisp, refundReceiptImage: data.url })
                                });
                                await fetchExpenses();
                                closeModals();
                              }
                            } catch (err) {
                              console.error(err);
                              alert('Falha ao enviar comprovante');
                            }
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    };
                    input.click();
                  }}
                >
                  <UploadCloud className="w-6 h-6 mx-auto text-neutral-400 mb-2" />
                  <p className="text-[11px] font-mono font-semibold text-neutral-500">Arraste ou clique para anexar comprovante</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal 6: Employee Details */}
      {activeModal === 'employee-details' && selectedEmployeeId && (() => {
        const emp = data.employees.find(e => e.id === selectedEmployeeId);
        const empDisplacements = data.displacements.filter(d => d.employeeId === selectedEmployeeId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        if (!emp) return null;
        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn" onClick={closeModals}>
            <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-white uppercase tracking-wider">{emp.name}</h3>
                  <p className="text-[10px] text-neutral-500 font-mono mt-0.5">{emp.role} • Média: {metrics.employeeBalances.find(e => e.id === emp.id)?.km} km rodados</p>
                </div>
                <button onClick={closeModals} className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition">fechar</button>
              </div>
              <div className="p-4 flex-1 overflow-y-auto space-y-3">
                {empDisplacements.length === 0 ? (
                  <p className="text-xs text-center text-neutral-500 py-10 font-mono">Nenhuma viagem registrada.</p>
                ) : empDisplacements.map(disp => (
                    <div 
                      key={disp.id} 
                      className={`p-3 rounded-lg border transition ${
                        isDark 
                          ? 'border-neutral-800 bg-[#141414]' 
                          : 'border-neutral-200 bg-neutral-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-mono text-neutral-400">{new Date(disp.date).toLocaleDateString('pt-BR')}</span>
                          <span className={`block font-bold text-xs mt-0.5 ${isDark ? 'text-white' : 'text-black'}`}>{disp.clientVisited} - {disp.city}</span>
                          <p className="text-[10px] text-neutral-500 mt-1">{disp.reason} {disp.notes && `• ${disp.notes}`}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-xs text-[#FF4D00]">R$ {disp.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          <div className="flex items-center gap-1.5 mt-1 justify-end">{disp.kmTraveled} km
                            <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold ${
                              disp.status === 'Reembolsada' || disp.status === 'Aprovada'
                                ? 'bg-emerald-500 text-white dark:bg-emerald-900/30 dark:text-emerald-400' 
                                : 'bg-amber-500 text-white dark:bg-amber-900/30 dark:text-amber-400'
                            }`}>
                              {disp.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
