/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
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
  ChevronLeft,
  ChevronDown,
  Copy,
  Check,
  User,
  Sliders,
  FileText,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Calendar,
  Layers,
  BrainCircuit,
  BarChart3,
  Zap,
  Award,
  Eye,
  UploadCloud,
  Route,
  Share2,
  Fuel,
  Wallet,
  Gauge,
  MoreHorizontal
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
  status: 'Pendente' | 'Em análise' | 'Aprovada' | 'Reembolsada';
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

interface RouteAuditMapProps {
  startLat: number;
  startLng: number;
  endLat?: number;
  endLng?: number;
  startAddress?: string;
  endAddress?: string;
}

const RouteAuditMap: React.FC<RouteAuditMapProps> = ({
  startLat,
  startLng,
  endLat,
  endLng,
  startAddress,
  endAddress
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean up existing map instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    try {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false
      }).setView([startLat, startLng], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;

      // Add start marker
      const startIcon = L.divIcon({
        html: `<div class="w-6 h-6 rounded-full bg-zinc-500 border-2 border-white flex items-center justify-center text-white font-bold text-[10px] shadow-lg">A</div>`,
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      L.marker([startLat, startLng], { icon: startIcon })
        .addTo(map)
        .bindPopup(`<b>Ponto de Partida</b><br/>${startAddress || ''}`);

      if (endLat !== undefined && endLng !== undefined) {
        // Add end marker
        const endIcon = L.divIcon({
          html: `<div class="w-6 h-6 rounded-full bg-black border-2 border-white flex items-center justify-center text-white font-bold text-[10px] shadow-lg">B</div>`,
          className: '',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });
        L.marker([endLat, endLng], { icon: endIcon })
          .addTo(map)
          .bindPopup(`<b>Ponto de Chegada</b><br/>${endAddress || ''}`);

        // Draw polyline connecting them
        const polyline = L.polyline([[startLat, startLng], [endLat, endLng]], {
          color: '#111111',
          weight: 4,
          opacity: 0.8,
          dashArray: '5, 10'
        }).addTo(map);

        // Adjust bounds
        map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
      }
    } catch (err) {
      console.error("Error creating map:", err);
    }

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {}
        mapInstanceRef.current = null;
      }
    };
  }, [startLat, startLng, endLat, endLng, startAddress, endAddress]);

  return (
    <div 
      ref={mapContainerRef} 
      className="w-full h-full rounded-xl dark:brightness-95 dark:contrast-105 dark:invert dark:hue-rotate-180"
      style={{ minHeight: '350px', zIndex: 1 }}
    />
  );
};

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

  // Primary sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'entries' | 'fuel_reimbursement' | 'employees' | 'vehicles' | 'routes_audit'>('dashboard');

  // Filters state
  const [showFilters, setShowFilters] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState<string>('todos'); 
  const [filterEmployee, setFilterEmployee] = useState<string>('todos');
  const [filterCity, setFilterCity] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [collaboratorsPage, setCollaboratorsPage] = useState(1);
  const COLLABORATORS_PAGE_SIZE = 10;

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

  const [selectedAuditTripId, setSelectedAuditTripId] = useState<string | null>(null);

  const [tripMode, setTripMode] = useState<'gps' | 'manual'>('gps');
  const activeTrip = data.displacements.find(d => d.status === 'Pendente' && d.startLat != null && !d.endTime);

  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsStartCoords, setGpsStartCoords] = useState<{ lat: number, lng: number } | null>(null);
  const [gpsStartStreet, setGpsStartStreet] = useState<string>('');
  
  // Destination Tracking and Simulation states
  const [gpsEndCoords, setGpsEndCoords] = useState<{ lat: number, lng: number } | null>(null);
  const [endAddressInput, setEndAddressInput] = useState<string>('');
  const [calculatedDistance, setCalculatedDistance] = useState<number | null>(null);
  const [calculatedValue, setCalculatedValue] = useState<number | null>(null);
  const [geocodingEndLoading, setGeocodingEndLoading] = useState(false);
  const [geocodingError, setGeocodingError] = useState<string>('');
  const [testBypassDistance, setTestBypassDistance] = useState(true);
  const [showSqlPreview, setShowSqlPreview] = useState(false);

  const [finishedTripSummary, setFinishedTripSummary] = useState<{
    km: number;
    amount: number;
    address: string;
    payload: any;
  } | null>(null);

  const [statusForm, setStatusForm] = useState<'Pendente' | 'Em análise' | 'Aprovada' | 'Reembolsada'>('Em análise');

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

  const extractStreetName = (osmData: any): string => {
    if (!osmData) return '';
    const addr = osmData.address || {};
    const road = addr.road || addr.street || addr.pedestrian || addr.suburb || '';
    const houseNumber = addr.house_number ? `, ${addr.house_number}` : '';
    const city = addr.city || addr.town || addr.village || '';
    if (road) {
      return `${road}${houseNumber}${city ? ` - ${city}` : ''}`;
    }
    return osmData.display_name || '';
  };

  const fetchStartLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocalização não é suportada por este dispositivo.");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&addressdetails=1`);
          if (res.ok) {
            const data = await res.json();
            const cleanStreet = extractStreetName(data);
            setGpsStartStreet(cleanStreet);
            setGpsStartCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          } else {
            setGpsStartStreet(`Lat: ${pos.coords.latitude.toFixed(5)}, Lng: ${pos.coords.longitude.toFixed(5)}`);
            setGpsStartCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          }
        } catch (e) {
          console.error(e);
          setGpsStartStreet(`Lat: ${pos.coords.latitude.toFixed(5)}, Lng: ${pos.coords.longitude.toFixed(5)}`);
          setGpsStartCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => {
        setGpsLoading(false);
        alert("Erro de Geolocalização ao obter ponto de partida: " + err.message);
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const calculateRoute = (startLat: number, startLng: number, endLat: number, endLng: number) => {
    const dist = calculateDistanceKM(startLat, startLng, endLat, endLng);
    const finalDist = Number(dist.toFixed(2));
    setCalculatedDistance(finalDist);

    const vehicle = data.vehicles.find(v => v.id === displacementForm.vehicleId);
    const consumption = Number(vehicle?.avgConsumption) || 10;
    const liters = finalDist / consumption;
    const val = Number((liters * 6.29).toFixed(2));
    setCalculatedValue(val);
    setGeocodingError('');
  };

  const handleGeocodeDestination = async (address: string) => {
    if (!address || address.trim() === '') return;
    if (!gpsStartCoords) {
      setGeocodingError('Por favor, obtenha o Ponto de Partida (recarregar GPS) primeiro.');
      return;
    }
    setGeocodingEndLoading(true);
    setGeocodingError('');
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) {
          const first = results[0];
          const lat = parseFloat(first.lat);
          const lng = parseFloat(first.lon);
          setGpsEndCoords({ lat, lng });
          calculateRoute(gpsStartCoords.lat, gpsStartCoords.lng, lat, lng);
        } else {
          setGeocodingError('Endereço não encontrado no mapa. Tente digitar de forma mais simples (ex: Nome da Rua, Cidade).');
          setGpsEndCoords(null);
          setCalculatedDistance(null);
          setCalculatedValue(null);
        }
      } else {
        setGeocodingError('Erro na consulta do serviço de mapas.');
      }
    } catch (e) {
      console.error(e);
      setGeocodingError('Erro de rede ao buscar o endereço.');
    } finally {
      setGeocodingEndLoading(false);
    }
  };

  const startGpsTrip = async () => {
    if (!displacementForm.employeeId || !displacementForm.vehicleId) {
      alert("Selecione o colaborador e o veículo primeiro.");
      return;
    }
    if (!displacementForm.clientVisited || !displacementForm.reason) {
      alert("Por favor, informe o nome do cliente e o motivo da visita.");
      return;
    }
    if (!endAddressInput.trim()) {
      alert("Por favor, preencha o Endereço de Visita (destino).");
      return;
    }
    if (!gpsEndCoords) {
      alert("Por favor, certifique-se de calcular a rota para o endereço de visita clicando no botão de calcular.");
      return;
    }

    const payload = {
      date: new Date().toISOString().split('T')[0],
      employeeId: displacementForm.employeeId,
      vehicleId: displacementForm.vehicleId,
      status: 'Pendente',
      startLat: gpsStartCoords?.lat || -23.2178,
      startLng: gpsStartCoords?.lng || -47.5222,
      startAddress: gpsStartStreet || 'Porto Feliz - SP (Sede)',
      startTime: new Date().toISOString(),
      clientVisited: displacementForm.clientVisited,
      city: 'Localização GPS',
      reason: displacementForm.reason,
      endAddress: endAddressInput,
      endLat: gpsEndCoords.lat,
      endLng: gpsEndCoords.lng,
      kmTraveled: 0,
      amount: 0,
    };

    try {
      const res = await fetch('/api/expenses/displacements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await fetchExpenses();
        // Clear temp inputs/states
        setGpsStartCoords(null);
        setGpsStartStreet('');
        setGpsEndCoords(null);
        setEndAddressInput('');
        setCalculatedDistance(null);
        setCalculatedValue(null);
        setGeocodingError('');
      } else {
        const errJson = await res.json();
        alert('Erro ao iniciar a viagem: ' + (errJson.error || 'Erro desconhecido'));
      }
    } catch(e) {
      alert('Erro de rede ao iniciar a viagem');
    }
  };

  const finishGpsTrip = () => {
    if (!navigator.geolocation || !activeTrip) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        // Proximity check: verify we are at least 300m close to the destination
        if (activeTrip.endLat !== undefined && activeTrip.endLng !== undefined && activeTrip.endLat !== null && activeTrip.endLng !== null) {
          const proximityKm = calculateDistanceKM(activeTrip.endLat, activeTrip.endLng, pos.coords.latitude, pos.coords.longitude);
          const proximityMeters = Math.round(proximityKm * 1000);
          
          if (proximityMeters > 300) {
            if (!testBypassDistance) {
              setGpsLoading(false);
              alert(`🚫 VALIDAÇÃO DE GPS FALHOU:\n\nVocê está a ${proximityMeters}m de distância do endereço de destino cadastrado.\n\nPara finalizar esta viagem e receber o reembolso, você deve estar a pelo menos 300 metros (limite de proximidade) do local de destino.\n\nCaso esteja testando o aplicativo, você pode ativar o "Ignorar limite de distância para testes" para prosseguir.`);
              return;
            } else {
              console.log(`[Modo Simulação] Ignorando distância de ${proximityMeters}m do destino.`);
            }
          }
        }

        const startLat = activeTrip.startLat;
        const startLng = activeTrip.startLng;
        let distance = 0.5; // fallback
        if (startLat !== undefined && startLng !== undefined) {
          distance = calculateDistanceKM(startLat, startLng, pos.coords.latitude, pos.coords.longitude);
        }
        
        // Use the planned kmTraveled if available since it represents the official geocoded route distance
        const finalDistance = activeTrip.kmTraveled && activeTrip.kmTraveled > 0 
          ? activeTrip.kmTraveled 
          : (distance < 0.1 ? 0.1 : Number(distance.toFixed(2)));
        
        let address = '';
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&addressdetails=1`);
          if (res.ok) {
            const data = await res.json();
            address = extractStreetName(data);
          } else {
            address = activeTrip.endAddress || `Rua de Destino (Lat: ${pos.coords.latitude.toFixed(5)}, Lng: ${pos.coords.longitude.toFixed(5)})`;
          }
        } catch (e) {
          console.error(e);
          address = activeTrip.endAddress || `Rua de Destino (Lat: ${pos.coords.latitude.toFixed(5)}, Lng: ${pos.coords.longitude.toFixed(5)})`;
        }
        
        const durationMins = activeTrip.startTime ? Math.round((Date.now() - new Date(activeTrip.startTime).getTime()) / 60000) : 0;
        const payload = {
          id: activeTrip.id,
          date: activeTrip.date,
          employeeId: activeTrip.employeeId || displacementForm.employeeId,
          vehicleId: activeTrip.vehicleId || displacementForm.vehicleId,
          kmTraveled: finalDistance,
          status: 'Em análise',
          endLat: pos.coords.latitude,
          endLng: pos.coords.longitude,
          endAddress: address || activeTrip.endAddress,
          endTime: new Date().toISOString(),
          clientVisited: activeTrip.clientVisited || 'Cliente Não Especificado',
          city: activeTrip.city || 'Cidade Não Especificada',
          reason: activeTrip.reason || 'Deslocamento via GPS',
          notes: durationMins ? `Duração: ${durationMins} minutos.` : ''
        };

        // Automatic reimbursement value and consumption calculation
        const activeVehicle = data.vehicles.find(v => v.id === activeTrip.vehicleId);
        const consumption = Number(activeVehicle?.avgConsumption) || 12;
        const liters = Number((finalDistance / consumption).toFixed(2));
        const calculatedAmount = Number((liters * 6.29).toFixed(2));

        setFinishedTripSummary({
          km: finalDistance,
          amount: calculatedAmount,
          address: address || activeTrip.endAddress || 'Não especificado',
          payload: payload
        });
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        alert("Erro de GPS ao informar chegada: " + err.message);
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const saveFinishedTrip = async () => {
    if (!finishedTripSummary) return;
    setGpsLoading(true);
    try {
      const res = await fetch('/api/expenses/displacements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finishedTripSummary.payload)
      });
      if (res.ok) {
        await fetchExpenses();
        closeModals();
      } else {
        const errJson = await res.json();
        alert('Erro ao salvar a viagem finalizada: ' + (errJson.error || 'Erro desconhecido'));
      }
    } catch(e) {
      alert('Erro de rede ao salvar a viagem');
    } finally {
      setGpsLoading(false);
    }
  };

  const cancelGpsTrip = async () => {
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
    setRawData(prev => ({
      ...prev,
      employees: (prev.employees || []).filter((e: any) => String(e.id) !== String(id)),
      vehicles: (prev.vehicles || []).filter((v: any) => String(v.employeeId) !== String(id))
    }));
    try {
      const res = await fetch(`/api/expenses/employees/${id}`, { method: 'DELETE' });
      if (res.ok) await fetchExpenses();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteVehicle = async (id: string, name: string) => {
    setRawData(prev => ({
      ...prev,
      vehicles: (prev.vehicles || []).filter((v: any) => String(v.id) !== String(id))
    }));
    try {
      const res = await fetch(`/api/expenses/vehicles/${id}`, { method: 'DELETE' });
      if (res.ok) await fetchExpenses();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteDisplacement = async (id: string) => {
    setRawData(prev => ({
      ...prev,
      displacements: (prev.displacements || []).filter((d: any) => String(d.id) !== String(id))
    }));
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
    setGpsStartCoords(null);
    setGpsStartStreet('');
    setGpsEndCoords(null);
    setEndAddressInput('');
    setCalculatedDistance(null);
    setCalculatedValue(null);
    setGeocodingError('');
    setShowSqlPreview(false);
    setFinishedTripSummary(null);
    setActiveModal('displacement');
    
    // Auto-fetch start location when the modal/card opens
    setTimeout(() => {
      fetchStartLocation();
    }, 100);
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
    setFinishedTripSummary(null);
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

  // Real month-over-month deltas for the top KPI cards (derived from actual displacement dates,
  // since the fleet has no historical snapshots to compare against)
  const pctDelta = (curr: number, prev: number): number | null => {
    if (prev === 0 && curr === 0) return 0;
    if (prev === 0) return null;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const sumForMonthKey = (key: string) => {
    const list = data.displacements.filter(d => d.date && d.date.startsWith(key));
    const km = list.reduce((s, d) => s + (Number(d.kmTraveled) || 0), 0);
    const spent = list.reduce((s, d) => s + (Number(d.amount) || 0), 0);
    const visits = list.length;
    const liters = spent > 0 ? spent / 6.29 : 0;
    const efficiency = liters > 0 ? km / liters : 0;
    return { km, spent, visits, efficiency };
  };

  const nowRef = new Date();
  const currentMonthKey = `${nowRef.getFullYear()}-${String(nowRef.getMonth() + 1).padStart(2, '0')}`;
  const prevMonthDate = new Date(nowRef.getFullYear(), nowRef.getMonth() - 1, 1);
  const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const currentPeriodSums = sumForMonthKey(currentMonthKey);
  const previousPeriodSums = sumForMonthKey(prevMonthKey);
  const costPerKmCurrent = currentPeriodSums.km > 0 ? currentPeriodSums.spent / currentPeriodSums.km : 0;
  const costPerKmPrevious = previousPeriodSums.km > 0 ? previousPeriodSums.spent / previousPeriodSums.km : 0;

  // Monthly series (months with real trips only) driving the small trend lines on the right column
  const monthlySeries = (() => {
    const map: Record<string, { km: number; spent: number }> = {};
    data.displacements.forEach(d => {
      if (!d.date) return;
      const key = d.date.substring(0, 7);
      if (!map[key]) map[key] = { km: 0, spent: 0 };
      map[key].km += Number(d.kmTraveled) || 0;
      map[key].spent += Number(d.amount) || 0;
    });
    return Object.keys(map).sort().map(key => {
      const v = map[key];
      const liters = v.spent > 0 ? v.spent / 6.29 : 0;
      return {
        key,
        km: v.km,
        spent: v.spent,
        efficiency: liters > 0 ? v.km / liters : 0,
        costPerKm: v.km > 0 ? v.spent / v.km : 0
      };
    });
  })();

  const sparklinePoints = (values: number[]) => {
    if (values.length <= 1) return '0,20 60,20';
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;
    const step = 60 / (values.length - 1);
    return values.map((v, i) => `${(i * step).toFixed(1)},${(20 - ((v - min) / range) * 18).toFixed(1)}`).join(' ');
  };

  // Fleet status breakdown for the "Resumo da Frota" donut — there's no maintenance/inactive tracking
  // yet, so every registered vehicle counts as active
  const employeeAvgConsumption = (employeeId: string) => {
    const vehs = data.vehicles.filter(v => v.employeeId === employeeId);
    if (vehs.length === 0) return metrics.averageConsumption;
    return vehs.reduce((sum, v) => sum + (Number(v.avgConsumption) || 0), 0) / vehs.length;
  };

  const fleetActiveCount = data.vehicles.length;

  const cardWrap = `rounded-2xl border p-5 sm:p-6 ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-white border-gray-200/80'}`;

  const collaboratorsTotalPages = Math.max(1, Math.ceil(metrics.employeeBalances.length / COLLABORATORS_PAGE_SIZE));
  const paginatedCollaborators = metrics.employeeBalances.slice(
    (collaboratorsPage - 1) * COLLABORATORS_PAGE_SIZE,
    collaboratorsPage * COLLABORATORS_PAGE_SIZE
  );

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
              <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500 fill-zinc-500/10 shrink-0" /> Aprovada (Reembolsada)
            </>
          ) : (
            <>
              <Clock className="w-3.5 h-3.5 text-zinc-500 shrink-0" /> {status}
            </>
          )}
        </span>
      );
    } else {
      // Dark theme version
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium shrink-0 ${
          isApproved 
            ? 'bg-zinc-950/20 text-zinc-400 border border-zinc-900/40' 
            : 'bg-zinc-950/20 text-zinc-400 border border-zinc-800/40'
        }`}>
          {isApproved ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500 shrink-0" /> Aprovada (Reembolsada)
            </>
          ) : (
            <>
              <Clock className="w-3.5 h-3.5 text-zinc-500 animate-pulse shrink-0" /> {status}
            </>
          )}
        </span>
      );
    }
  };

  const kpiCards: Array<{
    key: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    iconBgClass: string;
    iconClass: string;
    value: string;
    sublabel: string;
    delta: number | null;
  }> = [
    {
      key: 'total',
      label: 'Total Acumulado',
      icon: Layers,
      iconBgClass: isDark ? 'bg-zinc-400/10' : 'bg-zinc-500/10',
      iconClass: isDark ? 'text-zinc-400' : 'text-zinc-600',
      value: `R$ ${metrics.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      sublabel: 'Total de reembolsos',
      delta: pctDelta(currentPeriodSums.spent, previousPeriodSums.spent)
    },
    {
      key: 'distancia',
      label: 'Distância Total',
      icon: Route,
      iconBgClass: isDark ? 'bg-zinc-400/10' : 'bg-zinc-500/10',
      iconClass: isDark ? 'text-zinc-400' : 'text-zinc-600',
      value: `${metrics.totalKm.toLocaleString('pt-BR')} km`,
      sublabel: 'Percorridos no período',
      delta: pctDelta(currentPeriodSums.km, previousPeriodSums.km)
    },
    {
      key: 'visitas',
      label: 'Total de Visitas',
      icon: Share2,
      iconBgClass: isDark ? 'bg-zinc-400/10' : 'bg-zinc-500/10',
      iconClass: isDark ? 'text-zinc-400' : 'text-zinc-600',
      value: `${metrics.totalVisits} visita${metrics.totalVisits === 1 ? '' : 's'}`,
      sublabel: 'Registradas no período',
      delta: pctDelta(currentPeriodSums.visits, previousPeriodSums.visits)
    },
    {
      key: 'consumo',
      label: 'Média de Consumo',
      icon: Fuel,
      iconBgClass: isDark ? 'bg-zinc-400/10' : 'bg-zinc-500/10',
      iconClass: isDark ? 'text-zinc-400' : 'text-zinc-600',
      value: `${metrics.averageConsumption.toFixed(1)} km/l`,
      sublabel: 'Rendimento médio',
      delta: pctDelta(currentPeriodSums.efficiency, previousPeriodSums.efficiency)
    }
  ];

  return (
    <div className={`space-y-6 ${isDark ? 'text-neutral-200' : 'text-neutral-800'} px-3 sm:px-6 py-4`}>
      {isLoading ? (
        <div className="py-20 text-center text-xs font-mono text-neutral-400 tracking-wider">
          CARREGANDO INFORMAÇÕES CORPORATIVAS DE VIAGEM...
        </div>
      ) : (
        <>
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={fetchExpenses}
              className={`h-9 rounded-xl border px-3.5 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer ${
                isDark ? 'bg-white/[0.03] border-white/10 hover:bg-white/[0.07] text-white' : 'bg-neutral-950 border-neutral-950 hover:bg-neutral-800 text-white keep-white'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="text-[9px] font-bold uppercase tracking-[0.14em]">Sincronizar dados</span>
            </button>
          </div>

          {/* Top KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiCards.map(card => {
              const Icon = card.icon;
              return (
                <div key={card.key} className={cardWrap}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${card.iconBgClass}`}>
                    <Icon className={`w-4.5 h-4.5 ${card.iconClass}`} />
                  </div>
                  <span className={`block text-[10px] font-medium ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                    {card.label}
                  </span>
                  <span className={`text-lg font-sans font-bold mt-1 block ${isDark ? 'text-white' : 'text-neutral-950'}`}>
                    {card.value}
                  </span>
                  <p className={`text-[10px] mt-1.5 ${isDark ? 'text-neutral-500' : 'text-neutral-500'}`}>
                    {card.sublabel}
                  </p>
                  <p className={`text-[10px] font-bold mt-0.5 ${
                    card.delta === null ? (isDark ? 'text-neutral-500' : 'text-neutral-400')
                      : card.delta > 0 ? 'text-zinc-500'
                      : card.delta < 0 ? 'text-zinc-500'
                      : (isDark ? 'text-neutral-500' : 'text-neutral-400')
                  }`}>
                    {card.delta === null ? 'Novo neste período' : `${card.delta > 0 ? '+' : ''}${card.delta}% vs mês anterior`}
                  </p>
                </div>
              );
            })}

          </div>

          {/* Sub-Navigation */}
          <div
            className={`grid grid-cols-2 gap-1.5 rounded-xl border p-1.5 sm:grid-cols-3 xl:grid-cols-6 ${
              isDark ? 'border-white/10 bg-white/[0.025]' : 'border-neutral-200 bg-neutral-100/70'
            }`}
            role="tablist"
            aria-label="Seções do controle de frota"
          >
            {([
              { id: 'dashboard' as const, label: 'Reembolso', detail: 'Colaborador', icon: Wallet },
              { id: 'entries' as const, label: 'Viagens', detail: `${filteredDisplacements.length} registros`, icon: Route },
              { id: 'fuel_reimbursement' as const, label: 'Combustível', detail: 'Reembolsos', icon: Fuel },
              { id: 'employees' as const, label: 'Equipe', detail: `${data.employees.length} colaboradores`, icon: User },
              { id: 'vehicles' as const, label: 'Veículos', detail: 'Gestão da frota', icon: Car },
              { id: 'routes_audit' as const, label: 'Auditoria', detail: 'Rotas e despesas', icon: ShieldCheck }
            ]).map(tab => {
              const TabIcon = tab.icon;
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveSubTab(tab.id)}
                  className={`group flex min-h-[52px] items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                    isActive
                      ? isDark
                        ? 'border-white/20 bg-white text-black shadow-[0_8px_24px_rgba(0,0,0,0.28)] focus-visible:ring-white focus-visible:ring-offset-black'
                        : 'border-neutral-950 bg-neutral-950 !text-white shadow-[0_6px_18px_rgba(0,0,0,0.14)] focus-visible:ring-neutral-950 focus-visible:ring-offset-white'
                      : isDark
                        ? 'border-transparent bg-black/20 text-neutral-300 hover:border-white/10 hover:bg-white/[0.06] focus-visible:ring-white/70 focus-visible:ring-offset-black'
                        : 'border-transparent bg-white/70 text-neutral-700 hover:border-neutral-300 hover:bg-white focus-visible:ring-neutral-900 focus-visible:ring-offset-white'
                  }`}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors ${
                    isActive
                      ? isDark ? 'border-black/10 bg-black/[0.06]' : 'border-white/20 bg-white/10 !text-white'
                      : isDark ? 'border-white/10 bg-white/[0.04] group-hover:bg-white/[0.08]' : 'border-neutral-200 bg-neutral-50'
                  }`}>
                    <TabIcon className={`h-3.5 w-3.5 ${isActive && !isDark ? '!text-white' : ''}`} strokeWidth={1.9} />
                  </span>
                  <span className="min-w-0">
                    <span className={`block truncate text-[11px] font-bold leading-tight ${isActive && !isDark ? '!text-white' : ''}`}>{tab.label}</span>
                    <span className={`mt-1 block truncate text-[9px] leading-tight ${
                      isActive
                        ? isDark ? 'text-black/55' : '!text-white/75'
                        : 'text-neutral-500'
                    }`}>
                      {tab.detail}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* ============================== */}
          {/* SUB-TAB: REEMBOLSO POR COLABORADOR */}
          {activeSubTab === 'dashboard' && (
            <div className="space-y-6">
              {activeTrip && (
                <div className={`p-5 rounded-2xl border-2 flex flex-col gap-4 shadow-lg transition-all duration-300 ${
                  isDark
                    ? 'border-white/40 bg-black/95 text-white shadow-[0_8px_30px_rgba(255,255,255,0.1)]'
                    : 'border-black/20 bg-neutral-100/90 text-neutral-900 shadow-[0_8px_30px_rgba(0,0,0,0.08)]'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#FFFFFF] animate-ping" />
                      <span className="text-xs font-bold uppercase tracking-wider text-[#FFFFFF] font-mono">
                        📍 Deslocamento Ativo (Viagem Iniciada)
                      </span>
                    </div>
                    {activeTrip.startTime && (
                      <span className="text-[10px] font-mono opacity-80">
                        Início: {new Date(activeTrip.startTime).toLocaleTimeString('pt-BR')}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <p className="text-[10px] font-mono opacity-60 uppercase">👤 Colaborador / Motorista</p>
                      <p className="font-bold text-sm">
                        {data.employees.find(e => String(e.id).toLowerCase() === String(activeTrip.employeeId).toLowerCase())?.name || 'Carregando...'}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] font-mono opacity-60 uppercase">🚗 Veículo Selecionado</p>
                      <p className="font-bold text-sm">
                        {(() => {
                          const v = data.vehicles.find(veh => String(veh.id).toLowerCase() === String(activeTrip.vehicleId).toLowerCase());
                          return v ? `${v.brand} ${v.model} (${v.plate})` : 'Não identificado';
                        })()}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] font-mono opacity-60 uppercase">🏢 Cliente a ser Visitado</p>
                      <p className="font-bold text-sm text-[#FFFFFF]">
                        {activeTrip.clientVisited}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] font-mono opacity-60 uppercase">📍 Ponto de Partida</p>
                      <p className="font-semibold truncate">
                        {activeTrip.startAddress || 'Localização GPS'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <button
                      type="button"
                      onClick={finishGpsTrip}
                      disabled={gpsLoading}
                      className="flex-1 bg-white hover:bg-neutral-200 text-black py-3 px-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-md transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                    >
                      {gpsLoading ? (
                        <>
                          <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Obtendo Localização / Calculando...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          🏁 CHEGUEI (Finalizar Viagem)
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={cancelGpsTrip}
                      className="sm:w-32 bg-transparent border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-500 hover:text-[#FFFFFF] dark:hover:text-[#FFFFFF] py-3 px-4 rounded-xl font-bold uppercase tracking-wider text-[10px] transition-all duration-200"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Saldos + Auditoria (main column) / Resumo & Desempenho da Frota (sidebar) */}
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.75fr)] gap-6 items-start">
                <div className="space-y-6">
                  {/* Controle de Saldos & Pagamentos por Colaborador */}
                  <div className={cardWrap}>
                    <div className="mb-4">
                      <h3 className={`text-sm font-sans font-bold ${isDark ? 'text-white' : 'text-neutral-950'}`}>
                        Controle de Saldos & Pagamentos por Colaborador
                      </h3>
                      <p className={`text-[11px] mt-0.5 ${isDark ? 'text-neutral-500' : 'text-neutral-500'}`}>
                        Acompanhe o saldo acumulado e os pagamentos realizados
                      </p>
                    </div>

                    <div className={`divide-y ${isDark ? 'divide-white/5' : 'divide-neutral-100'}`}>
                      {metrics.employeeBalances.map(emp => {
                        const initials = emp.name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase();
                        return (
                          <div
                            key={emp.id}
                            onClick={() => {
                              setSelectedEmployeeId(emp.id);
                              setActiveModal('employee-details');
                            }}
                            className={`py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all cursor-pointer active:scale-[0.98] ${
                              isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-neutral-50'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                                isDark ? 'bg-zinc-400/15 text-zinc-300' : 'bg-zinc-500/10 text-zinc-700'
                              }`}>
                                {initials || <User className="w-4 h-4" />}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`font-bold text-sm truncate ${isDark ? 'text-neutral-100' : 'text-neutral-900'}`}>
                                    {emp.name}
                                  </span>
                                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                    isDark ? 'bg-white/10 text-neutral-300' : 'bg-neutral-100 text-neutral-600'
                                  }`}>
                                    {emp.role || 'Colaborador'}
                                  </span>
                                </div>
                                <div className={`flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] mt-0.5 ${isDark ? 'text-neutral-500' : 'text-neutral-500'}`}>
                                  <span>{emp.km.toLocaleString('pt-BR')} km percorridos</span>
                                  <span>{emp.visitsCount} visitas registradas</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 shrink-0 pl-12 sm:pl-0">
                              <div className="text-left sm:text-right">
                                <span className={`block text-[9px] uppercase font-bold ${isDark ? 'text-neutral-500' : 'text-neutral-500'}`}>Saldo a pagar</span>
                                <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-neutral-950'}`}>
                                  R$ {emp.pendingReimbursement.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div className="text-left sm:text-right">
                                <span className={`block text-[9px] uppercase font-bold ${isDark ? 'text-neutral-500' : 'text-neutral-500'}`}>Pago</span>
                                <span className="font-bold text-sm text-zinc-500">
                                  R$ {emp.paidReimbursement.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                              <ChevronRight className={`w-4 h-4 hidden sm:block ${isDark ? 'text-neutral-600' : 'text-neutral-400'}`} />
                            </div>
                          </div>
                        );
                      })}

                      {metrics.employeeBalances.length === 0 && (
                        <div className="py-10 text-center text-xs text-neutral-400 font-mono">
                          Nenhum colaborador registrado. Cadastre profissionais na aba "Equipe".
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Auditoria & Validação Fiscal */}
                  <div className={cardWrap}>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className={`w-4.5 h-4.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`} />
                        <h3 className={`text-sm font-sans font-bold ${isDark ? 'text-white' : 'text-neutral-950'}`}>
                          Auditoria & Validação Fiscal
                        </h3>
                      </div>
                      <span className={`text-[10px] font-mono ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>Gasolina de referência: R$ 6,29/L</span>
                    </div>

                    <p className={`text-xs leading-relaxed mb-4 ${isDark ? 'text-neutral-400' : 'text-neutral-700'}`}>
                      Garanta conformidade e eficiência com nossa auditoria inteligente baseada em quilometragem e dados fiscais.
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                      {[
                        { icon: MapPin, label: 'Quilometragem declarada', sub: 'Validação com base em evidências' },
                        { icon: Fuel, label: 'Eficiência por veículo', sub: 'Análise de consumo e padrões' },
                        { icon: AlertTriangle, label: 'Despesas anômalas', sub: 'Detecção de inconsistências' },
                        { icon: FileText, label: 'Relatório completo', sub: 'Para auditoria e compliance' }
                      ].map(item => {
                        const ItemIcon = item.icon;
                        return (
                          <div key={item.label} className="space-y-1.5">
                            <ItemIcon className={`w-4 h-4 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`} />
                            <p className={`text-xs font-bold ${isDark ? 'text-neutral-200' : 'text-neutral-800'}`}>{item.label}</p>
                            <p className={`text-[10px] ${isDark ? 'text-neutral-500' : 'text-neutral-500'}`}>{item.sub}</p>
                          </div>
                        );
                      })}
                    </div>

                    <button
                      onClick={runAiAuditor}
                      disabled={isAnalyzing}
                      className={`w-full sm:w-auto px-3.5 py-2 rounded-lg font-sans font-normal text-[10px] uppercase tracking-[0.08em] transition inline-flex items-center ${
                        isDark
                          ? 'bg-white text-black !text-black hover:opacity-90'
                          : 'bg-neutral-950 text-white keep-white hover:opacity-90'
                      } disabled:opacity-50`}
                    >
                      {isAnalyzing ? 'Processando...' : 'AUDITORIA'}
                    </button>

                {aiReport && (() => {
                  const parsed = parseAuditReport(aiReport);
                  return (
                    <div className={`mt-5 pt-5 border-t ${
                      isDark ? 'border-neutral-800' : 'border-neutral-200'
                    } space-y-5 animate-scaleIn`}>
                      
                      {/* Header bar */}
                      <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                        <div className="flex items-center gap-2">
                          <BrainCircuit className="w-4.5 h-4.5 text-[#FFFFFF]" />
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
                            {copiedReport ? <Check className="w-3 text-zinc-500" /> : <Copy className="w-3" />}
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
                        <div className={`p-4 rounded-lg text-xs leading-relaxed border-l-2 border-[#FFFFFF] ${
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
                            <BarChart3 className="w-4 h-4 text-zinc-500" />
                            <h4 className={`text-xs font-mono uppercase tracking-wider font-bold ${isDark ? 'text-white' : 'text-neutral-800'}`}>
                              Painel Analítico Geral
                            </h4>
                          </div>
                          {parsed.general.length > 0 ? (
                            <ul className="space-y-1.5 text-xs">
                              {parsed.general.map((point, index) => (
                                <li key={index} className={`flex gap-1.5 items-start ${isDark ? 'text-neutral-300' : 'text-neutral-600'}`}>
                                  <span className="text-zinc-500 mt-0.5">•</span>
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
                            <Zap className="w-4 h-4 text-zinc-500" />
                            <h4 className={`text-xs font-mono uppercase tracking-wider font-bold ${isDark ? 'text-white' : 'text-neutral-800'}`}>
                              Eficiência Individual
                            </h4>
                          </div>
                          {parsed.efficiency.length > 0 ? (
                            <ul className="space-y-1.5 text-xs">
                              {parsed.efficiency.map((point, index) => (
                                <li key={index} className={`flex gap-1.5 items-start ${isDark ? 'text-neutral-300' : 'text-neutral-600'}`}>
                                  <span className="text-zinc-500 mt-0.5">⚡</span>
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
                          isDark ? 'bg-[#1C1616] border-zinc-950/40' : 'bg-zinc-50/30 border-zinc-100'
                        } space-y-2.5`}>
                          <div className="flex items-center gap-2 pb-1 border-b border-zinc-100/50 dark:border-zinc-950/20">
                            <AlertTriangle className="w-4 h-4 text-zinc-500 animate-pulse" />
                            <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-zinc-600 dark:text-zinc-450">
                              Desperdícios & Alertas
                            </h4>
                          </div>
                          {parsed.inconsistencies.length > 0 ? (
                            <ul className="space-y-1.5 text-xs">
                              {parsed.inconsistencies.map((point, index) => (
                                <li key={index} className="flex gap-1.5 items-start text-zinc-800 dark:text-zinc-300">
                                  <span className="text-zinc-500 mt-0.5">⚠️</span>
                                  <span>{point}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-zinc-700 dark:text-zinc-400 italic">Parabéns! Nenhuma inconsistência identificada nesta rodada.</p>
                          )}
                        </div>

                        {/* 4. Recomendações e Economia */}
                        <div className={`p-4 rounded-lg border ${
                          isDark ? 'bg-[#121A1A] border-zinc-950/40' : 'bg-zinc-50/20 border-zinc-100 animate-transition'
                        } space-y-2.5`}>
                          <div className="flex items-center gap-2 pb-1 border-b border-zinc-100/50 dark:border-zinc-950/20">
                            <Award className="w-4 h-4 text-zinc-500" />
                            <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-zinc-700 dark:text-zinc-400">
                              Oportunidades de Economia
                            </h4>
                          </div>
                          {parsed.recommendations.length > 0 ? (
                            <ul className="space-y-1.5 text-xs">
                              {parsed.recommendations.map((point, index) => (
                                <li key={index} className="flex gap-1.5 items-start text-zinc-800 dark:text-zinc-300">
                                  <span className="text-zinc-500 mt-0.5">💡</span>
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

                {/* Sidebar: desempenho operacional */}
                <div className="space-y-6">
                  <div className="hidden" aria-hidden="true">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className={`text-sm font-sans font-bold ${isDark ? 'text-white' : 'text-neutral-950'}`}>Resumo da Frota</h3>
                      <span className={`text-[10px] font-medium flex items-center gap-1 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                        Este mês <ChevronDown className="w-3 h-3" />
                      </span>
                    </div>

                    <div className="flex flex-col items-center gap-5">
                      <div className="relative w-36 h-36 shrink-0">
                        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                          <circle cx="50" cy="50" r="40" fill="transparent" stroke={isDark ? '#222222' : '#E5E7EB'} strokeWidth="10" />
                          {fleetActiveCount > 0 && (
                            <circle
                              cx="50" cy="50" r="40" fill="transparent"
                              stroke="#22c55e"
                              strokeWidth="10"
                              strokeDasharray={251.2}
                              strokeDashoffset={0}
                              strokeLinecap="round"
                            />
                          )}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-neutral-950'}`}>{data.vehicles.length}</span>
                          <span className={`text-[9px] uppercase tracking-wider font-bold ${isDark ? 'text-neutral-500' : 'text-neutral-500'}`}>Total</span>
                        </div>
                      </div>

                      <div className="w-full space-y-2.5">
                        {[
                          { label: 'Ativos', value: fleetActiveCount, color: 'bg-green-500 shadow-[0_0_7px_rgba(34,197,94,0.5)]' },
                          { label: 'Inativos', value: 0, color: 'bg-red-500 shadow-[0_0_7px_rgba(239,68,68,0.35)]' },
                          { label: 'Em manutenção', value: 0, color: 'bg-amber-400 shadow-[0_0_7px_rgba(251,191,36,0.4)]' }
                        ].map(row => {
                          const pct = data.vehicles.length > 0 ? Math.round((row.value / data.vehicles.length) * 100) : 0;
                          return (
                            <div key={row.label} className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${row.color}`} />
                                <span className={isDark ? 'text-neutral-300' : 'text-neutral-700'}>{row.label}</span>
                              </span>
                              <span className={`font-mono ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>{row.value} ({pct}%)</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className={cardWrap}>
                    <div className="flex items-center justify-between mb-5">
                      <h3 className={`text-sm font-sans font-bold ${isDark ? 'text-white' : 'text-neutral-950'}`}>Desempenho da Frota</h3>
                      <span className={`text-[10px] font-medium flex items-center gap-1 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                        Este mês <ChevronDown className="w-3 h-3" />
                      </span>
                    </div>

                    <div className="space-y-4">
                      {[
                        {
                          icon: Route, label: 'Distância total', value: `${metrics.totalKm.toLocaleString('pt-BR')} km`,
                          delta: pctDelta(currentPeriodSums.km, previousPeriodSums.km),
                          series: monthlySeries.map(m => m.km),
                          color: isDark ? '#FFFFFF' : '#6B6B6B', badgeBg: isDark ? 'bg-zinc-400/10' : 'bg-zinc-500/10', badgeText: isDark ? 'text-zinc-400' : 'text-zinc-600'
                        },
                        {
                          icon: Fuel, label: 'Consumo médio', value: `${metrics.averageConsumption.toFixed(1)} km/l`,
                          delta: pctDelta(currentPeriodSums.efficiency, previousPeriodSums.efficiency),
                          series: monthlySeries.map(m => m.efficiency),
                          color: isDark ? '#FFFFFF' : '#6B6B6B', badgeBg: isDark ? 'bg-zinc-400/10' : 'bg-zinc-500/10', badgeText: isDark ? 'text-zinc-400' : 'text-zinc-600'
                        },
                        {
                          icon: Gauge, label: 'Custo por km', value: `R$ ${costPerKmCurrent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                          delta: pctDelta(costPerKmCurrent, costPerKmPrevious),
                          series: monthlySeries.map(m => m.costPerKm),
                          color: isDark ? '#FFFFFF' : '#6B6B6B', badgeBg: isDark ? 'bg-zinc-400/10' : 'bg-zinc-500/10', badgeText: isDark ? 'text-zinc-400' : 'text-zinc-600'
                        },
                        {
                          icon: Wallet, label: 'Reembolsos', value: `R$ ${metrics.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                          delta: pctDelta(currentPeriodSums.spent, previousPeriodSums.spent),
                          series: monthlySeries.map(m => m.spent),
                          color: isDark ? '#FFFFFF' : '#6B6B6B', badgeBg: isDark ? 'bg-zinc-400/10' : 'bg-zinc-500/10', badgeText: isDark ? 'text-zinc-400' : 'text-zinc-600'
                        }
                      ].map(row => {
                        const RowIcon = row.icon;
                        return (
                          <div key={row.label} className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${row.badgeBg}`}>
                                <RowIcon className={`w-3.5 h-3.5 ${row.badgeText}`} />
                              </div>
                              <div className="min-w-0">
                                <p className={`text-[10px] ${isDark ? 'text-neutral-500' : 'text-neutral-500'}`}>{row.label}</p>
                                <p className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-neutral-950'}`}>{row.value}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-[10px] font-bold ${
                                row.delta === null ? (isDark ? 'text-neutral-500' : 'text-neutral-400')
                                  : row.delta > 0 ? 'text-zinc-500' : row.delta < 0 ? 'text-zinc-500' : (isDark ? 'text-neutral-500' : 'text-neutral-400')
                              }`}>
                                {row.delta === null ? '—' : `${row.delta > 0 ? '+' : ''}${row.delta}%`}
                              </span>
                              <svg viewBox="0 0 60 20" className="w-12 h-5 shrink-0">
                                <polyline points={sparklinePoints(row.series)} fill="none" stroke={row.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Colaboradores */}
              <div className={cardWrap}>
                <div className="mb-4">
                  <h3 className={`text-sm font-sans font-bold ${isDark ? 'text-white' : 'text-neutral-950'}`}>Colaboradores</h3>
                  <p className={`text-[11px] mt-0.5 ${isDark ? 'text-neutral-500' : 'text-neutral-500'}`}>Visão geral de colaboradores e seus indicadores</p>
                </div>

                <div className="overflow-x-auto -mx-2">
                  <table className="w-full min-w-[760px] text-left border-collapse">
                    <thead>
                      <tr className={`text-[9px] uppercase tracking-wider font-bold ${isDark ? 'text-neutral-500' : 'text-neutral-500'}`}>
                        <th className="px-2 py-2">Colaborador</th>
                        <th className="px-2 py-2">Distância</th>
                        <th className="px-2 py-2">Visitas</th>
                        <th className="px-2 py-2">Consumo médio</th>
                        <th className="px-2 py-2">Saldo a pagar</th>
                        <th className="px-2 py-2">Pago</th>
                        <th className="px-2 py-2">Status</th>
                        <th className="px-2 py-2 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedCollaborators.map(emp => {
                        const initials = emp.name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase();
                        const fullEmployee = data.employees.find(e => e.id === emp.id);
                        const isActive = (fullEmployee?.status || 'Ativo') === 'Ativo';
                        return (
                          <tr key={emp.id} className={`border-t text-xs ${isDark ? 'border-white/5' : 'border-neutral-100'}`}>
                            <td className="px-2 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                  isDark ? 'bg-zinc-400/15 text-zinc-300' : 'bg-zinc-500/10 text-zinc-700'
                                }`}>
                                  {initials || <User className="w-3.5 h-3.5" />}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className={`font-bold ${isDark ? 'text-neutral-100' : 'text-neutral-900'}`}>{emp.name}</span>
                                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${isDark ? 'bg-white/10 text-neutral-300' : 'bg-neutral-100 text-neutral-600'}`}>
                                      {emp.role || 'Colaborador'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className={`px-2 py-3 font-mono ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>{emp.km.toLocaleString('pt-BR')} km</td>
                            <td className={`px-2 py-3 font-mono ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>{emp.visitsCount}</td>
                            <td className={`px-2 py-3 font-mono ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>{employeeAvgConsumption(emp.id).toFixed(1)} km/l</td>
                            <td className={`px-2 py-3 font-mono ${isDark ? 'text-white' : 'text-neutral-950'}`}>R$ {emp.pendingReimbursement.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="px-2 py-3 font-mono text-zinc-500">R$ {emp.paidReimbursement.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="px-2 py-3">
                              <span className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider whitespace-nowrap ${
                                isActive
                                  ? (isDark ? 'bg-zinc-500/15 text-zinc-400' : 'bg-zinc-500/10 text-zinc-600')
                                  : (isDark ? 'bg-neutral-700/30 text-neutral-400' : 'bg-neutral-200 text-neutral-500')
                              }`}>
                                {isActive ? 'Ativo' : 'Inativo'}
                              </span>
                            </td>
                            <td className="px-2 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => { setSelectedEmployeeId(emp.id); setActiveModal('employee-details'); }}
                                  className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-neutral-400 hover:text-white' : 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900'}`}
                                  title="Ver detalhes"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                {fullEmployee && (
                                  <button
                                    type="button"
                                    onClick={() => openEditEmployee(fullEmployee)}
                                    className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-neutral-400 hover:text-white' : 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900'}`}
                                    title="Mais opções"
                                  >
                                    <MoreHorizontal className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {paginatedCollaborators.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-2 py-10 text-center text-xs text-neutral-400 font-mono">
                            Nenhum colaborador registrado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className={`flex items-center justify-between mt-4 pt-4 border-t text-[11px] ${isDark ? 'border-white/5 text-neutral-500' : 'border-neutral-100 text-neutral-500'}`}>
                  <span>Mostrando {paginatedCollaborators.length} de {metrics.employeeBalances.length} colaborador{metrics.employeeBalances.length === 1 ? '' : 'es'}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCollaboratorsPage(p => Math.max(1, p - 1))}
                      disabled={collaboratorsPage <= 1}
                      className={`px-2.5 py-1.5 rounded-lg font-bold disabled:opacity-40 disabled:cursor-not-allowed ${isDark ? 'hover:bg-white/10' : 'hover:bg-neutral-100'}`}
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className={`w-6 h-6 flex items-center justify-center rounded-lg font-bold ${isDark ? 'bg-white text-black' : 'bg-neutral-950 text-white keep-white'}`}>
                      {collaboratorsPage}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCollaboratorsPage(p => Math.min(collaboratorsTotalPages, p + 1))}
                      disabled={collaboratorsPage >= collaboratorsTotalPages}
                      className={`px-2.5 py-1.5 rounded-lg font-bold disabled:opacity-40 disabled:cursor-not-allowed ${isDark ? 'hover:bg-white/10' : 'hover:bg-neutral-100'}`}
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
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
                    className="w-full pl-9 pr-4 py-2 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-[#FFFFFF] transition"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-3 py-2 rounded-lg border text-xs font-sans font-medium flex items-center gap-1.5 transition ${
                      showFilters 
                        ? 'bg-[#FFFFFF]/10 border-[#FFFFFF] text-[#FFFFFF]' 
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Filtros</span>
                  </button>

                  <button
                    onClick={openAddDisplacement}
                    className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 font-medium shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md text-[10px] font-bold uppercase tracking-wider ${isDark ? 'bg-white border-zinc-200 text-zinc-950' : 'bg-zinc-950 border-zinc-600 text-slate-200'}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Lançar Viagem</span>
                  </button>
                </div>
              </div>

              {/* Expandable filters dropdown (highly contrastive text layouts) */}
              {showFilters && (
                <div className="py-4 border-t border-b border-neutral-900 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fadeIn">
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
                          : 'border-neutral-200 bg-white hover:border-neutral-300'
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
                          <span className="font-mono font-bold text-sm text-[#FFFFFF]">
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
                                ? (isDark ? 'bg-zinc-900/30 text-zinc-400 border border-zinc-800' : 'bg-zinc-100 text-zinc-700 border border-zinc-200')
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
                                  ? 'bg-[#FFFFFF]/10 text-[#FFFFFF] border border-[#FFFFFF]/20 hover:bg-[#FFFFFF]/20'
                                  : 'bg-[#FFFFFF]/10 text-[#FFFFFF] border border-[#FFFFFF]/20 hover:bg-[#FFFFFF]/20'
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
                                  ? 'bg-zinc-950/20 text-zinc-400 border border-zinc-900/50 hover:bg-zinc-900/10'
                                  : 'bg-zinc-50 text-zinc-750 border border-zinc-200 hover:bg-zinc-100'
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
                            className="p-1.5 sm:px-2.5 sm:py-1 rounded border border-zinc-200/50 hover:bg-zinc-500/10 text-xs font-sans text-neutral-500 hover:text-zinc-500 transition"
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
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg hover:opacity-90 transition text-xs font-mono font-bold uppercase tracking-wider ${
                    isDark ? 'bg-white text-black' : 'bg-neutral-900 text-white keep-white'
                  }`}
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
                        : 'border-neutral-200 bg-white hover:border-neutral-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm ${isDark ? 'text-neutral-100' : 'text-neutral-900'}`}>{emp.name}</span>
                        <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                          emp.status === 'Ativo' 
                            ? 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400' 
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
                        className="p-1 hover:bg-zinc-500/10 rounded text-neutral-400 hover:text-zinc-500 transition"
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
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg hover:opacity-90 transition text-xs font-mono font-bold uppercase tracking-wider ${
                    isDark ? 'bg-white text-black' : 'bg-neutral-900 text-white keep-white'
                  }`}
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
                          : 'border-neutral-200 bg-white hover:border-neutral-300'
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
                          className="p-1 hover:bg-zinc-500/10 rounded text-neutral-400 hover:text-zinc-500 transition"
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

          {/* ============================== */}
          {/* SUB-TAB: REEMBOLSO COMBUSTÍVEL */}
          {activeSubTab === 'fuel_reimbursement' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={`p-4 border-l-2 ${isDark ? 'border-white/20' : 'border-black/10'}`}>
                  <span className={`block text-[10px] font-mono uppercase tracking-wider ${isDark ? 'text-neutral-500' : 'text-neutral-500 font-bold'}`}>Litros Consumidos (Est.)</span>
                  <span className={`text-lg font-sans font-bold mt-1.5 block ${isDark ? 'text-white' : 'text-neutral-950'}`}>
                    {data.displacements.reduce((acc, d) => {
                      const v = data.vehicles.find(veh => veh.id === d.vehicleId);
                      const cons = Number(v?.avgConsumption) || 12;
                      return acc + (d.kmTraveled / cons);
                    }, 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L
                  </span>
                </div>

                <div className={`p-4 border-l-2 ${isDark ? 'border-white/20' : 'border-black/10'}`}>
                  <span className={`block text-[10px] font-mono uppercase tracking-wider ${isDark ? 'text-neutral-500' : 'text-neutral-500 font-bold'}`}>Preço Gasolina (Ref.)</span>
                  <span className={`text-lg font-sans font-bold mt-1.5 block ${isDark ? 'text-white' : 'text-neutral-950'}`}>
                    R$ 6,29 / L
                  </span>
                </div>

                <div className={`p-4 border-l-2 ${isDark ? 'border-white/20' : 'border-black/10'}`}>
                  <span className={`block text-[10px] font-mono uppercase tracking-wider ${isDark ? 'text-neutral-500' : 'text-neutral-500 font-bold'}`}>Reembolso de Combustível</span>
                  <span className={`text-lg font-sans font-bold mt-1.5 block ${isDark ? 'text-white' : 'text-neutral-950'}`}>
                    R$ {data.displacements.reduce((acc, d) => {
                      const v = data.vehicles.find(veh => veh.id === d.vehicleId);
                      const cons = Number(v?.avgConsumption) || 12;
                      const liters = d.kmTraveled / cons;
                      return acc + (liters * 6.29);
                    }, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Fuel Refund Table */}
              <div>
                <div className={`p-4 border-y ${isDark ? 'border-neutral-800' : 'border-neutral-200'}`}>
                  <h3 className={`text-xs font-mono uppercase tracking-wider ${isDark ? 'text-neutral-400' : 'text-neutral-700 font-bold'}`}>
                    Lista Detalhada de Reembolso de Combustível
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className={`border-b ${isDark ? 'border-neutral-800 text-neutral-400 bg-neutral-900/30' : 'border-neutral-200 text-neutral-500 bg-neutral-50'}`}>
                        <th className="p-3 font-mono font-bold uppercase text-[10px]">Colaborador / Data</th>
                        <th className="p-3 font-mono font-bold uppercase text-[10px]">Veículo / Eficiência</th>
                        <th className="p-3 font-mono font-bold uppercase text-[10px] text-right">KM Percorrido</th>
                        <th className="p-3 font-mono font-bold uppercase text-[10px] text-right">Litros Consumidos</th>
                        <th className="p-3 font-mono font-bold uppercase text-[10px] text-right text-[#FFFFFF]">Reembolso Comb.</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-neutral-800' : 'divide-neutral-200'}`}>
                      {data.displacements.map(d => {
                        const employee = data.employees.find(e => e.id === d.employeeId);
                        const vehicle = data.vehicles.find(v => v.id === d.vehicleId);
                        const consumption = Number(vehicle?.avgConsumption) || 12;
                        const liters = d.kmTraveled / consumption;
                        const fuelReimbursementAmount = liters * 6.29;

                        return (
                          <tr key={d.id} className={`${isDark ? 'hover:bg-neutral-900/40' : 'hover:bg-neutral-50'}`}>
                            <td className="p-3">
                              <span className={`font-bold block ${isDark ? 'text-neutral-100' : 'text-neutral-900'}`}>{employee?.name || 'Não cadastrado'}</span>
                              <span className="text-[10px] text-neutral-500 block font-mono mt-0.5">{d.date}</span>
                            </td>
                            <td className="p-3">
                              <span className="font-semibold block">{vehicle?.name || 'Não cadastrado'}</span>
                              <span className="text-[10px] text-neutral-500 block font-mono mt-0.5">{consumption} km/l</span>
                            </td>
                            <td className="p-3 text-right font-mono font-semibold">{d.kmTraveled.toFixed(1)} km</td>
                            <td className="p-3 text-right font-mono text-neutral-500">{liters.toFixed(1)} L</td>
                            <td className="p-3 text-right font-mono font-bold text-[#FFFFFF]">R$ {fuelReimbursementAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          </tr>
                        );
                      })}

                      {data.displacements.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-neutral-400 font-mono">
                            Nenhuma viagem cadastrada no sistema.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================== */}
          {/* SUB-TAB: AUDITORIA DE ROTAS */}
          {activeSubTab === 'routes_audit' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Sidebar: Travels List */}
              <div className="space-y-3">
                <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider font-bold block pb-1 border-b border-neutral-100 dark:border-neutral-800">
                  Viagens Registradas
                </span>

                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 no-scrollbar">
                  {data.displacements.map(d => {
                    const employee = data.employees.find(e => e.id === d.employeeId);
                    const isGps = d.startLat !== undefined && d.startLat !== null && d.endLat !== undefined && d.endLat !== null;
                    const isSelected = selectedAuditTripId === d.id;

                    return (
                      <div
                        key={d.id}
                        onClick={() => setSelectedAuditTripId(d.id)}
                        className={`p-3 rounded-lg border text-left cursor-pointer transition active:scale-[0.98] ${
                          isSelected
                            ? 'border-[#FFFFFF] bg-[#FFFFFF]/5'
                            : isDark
                            ? 'border-neutral-800 bg-[#141414] hover:border-neutral-700'
                            : 'border-neutral-200 bg-white hover:border-neutral-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`font-bold text-xs truncate ${isDark ? 'text-neutral-200' : 'text-neutral-900'}`}>
                            {employee?.name || 'Não cadastrado'}
                          </span>
                          {isGps ? (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-mono uppercase bg-zinc-500/10 text-zinc-500 border border-zinc-500/20 font-bold">
                              📍 GPS
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-mono uppercase bg-neutral-500/10 text-neutral-500 border border-neutral-500/20 font-bold">
                              ✍️ Manual
                            </span>
                          )}
                        </div>

                        <div className={`text-[11px] mt-1 truncate ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                          {d.city} &bull; {d.clientVisited}
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 mt-2">
                          <span>{d.date}</span>
                          <span className="font-bold">{d.kmTraveled} km</span>
                        </div>
                      </div>
                    );
                  })}

                  {data.displacements.length === 0 && (
                    <div className="p-8 text-center text-xs text-neutral-400 font-mono border border-dashed rounded-lg">
                      Nenhuma rota disponível.
                    </div>
                  )}
                </div>
              </div>

              {/* Main Map Panel */}
              <div className="md:col-span-2 space-y-4">
                {(() => {
                  const selectedTrip = data.displacements.find(d => d.id === selectedAuditTripId);
                  if (!selectedTrip) {
                    return (
                      <div className={`h-[400px] rounded-xl border border-dashed flex flex-col items-center justify-center p-8 text-center ${
                        isDark ? 'border-neutral-800 bg-[#111111]' : 'border-neutral-200 bg-white'
                      }`}>
                        <MapPin className="w-10 h-10 text-neutral-400 animate-bounce mb-3" />
                        <h4 className={`text-sm font-semibold ${isDark ? 'text-neutral-200' : 'text-neutral-800'}`}>Nenhuma Rota Selecionada</h4>
                        <p className="text-xs text-neutral-500 mt-1 max-w-sm">
                          Selecione um dos registros de viagens ao lado para visualizar a auditoria completa da rota e coordenadas no mapa interativo.
                        </p>
                      </div>
                    );
                  }

                  const employee = data.employees.find(e => e.id === selectedTrip.employeeId);
                  const vehicle = data.vehicles.find(v => v.id === selectedTrip.vehicleId);
                  const isGps = selectedTrip.startLat !== undefined && selectedTrip.endLat !== undefined;

                  return (
                    <div className="space-y-4">
                      {/* Interactive OpenStreetMap Map */}
                      <div className={`rounded-xl border overflow-hidden relative h-[350px] ${
                        isDark ? 'border-neutral-800' : 'border-neutral-200 bg-white'
                      }`}>
                        {isGps && selectedTrip.startLat !== undefined && selectedTrip.startLng !== undefined ? (
                          <RouteAuditMap
                            startLat={selectedTrip.startLat}
                            startLng={selectedTrip.startLng}
                            endLat={selectedTrip.endLat}
                            endLng={selectedTrip.endLng}
                            startAddress={selectedTrip.startAddress}
                            endAddress={selectedTrip.endAddress}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-neutral-50 dark:bg-neutral-900 text-center">
                            <AlertTriangle className="w-8 h-8 text-zinc-500 mb-2" />
                            <span className={`text-sm font-semibold ${isDark ? 'text-neutral-200' : 'text-neutral-800'}`}>Sem Dados de Georeferenciamento</span>
                            <span className="text-xs text-neutral-500 mt-1 max-w-xs leading-relaxed">
                              Esta rota foi preenchida de forma manual sem o uso de rastreamento por GPS nativo. A auditoria baseia-se na origem, destino informados e relatório da inteligência fiscal.
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Travel Detailed Analytics */}
                      <div className={`pt-4 border-t ${
                        isDark ? 'border-neutral-800' : 'border-neutral-200'
                      } space-y-4`}>
                        <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
                          <div>
                            <span className={`text-sm font-bold block ${isDark ? 'text-white' : 'text-neutral-900'}`}>{employee?.name || 'Colaborador'}</span>
                            <span className="text-[10px] text-neutral-500 block font-mono mt-0.5">{selectedTrip.date} &bull; {selectedTrip.city}</span>
                          </div>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase ${
                            selectedTrip.status === 'Aprovada' || selectedTrip.status === 'Reembolsada'
                              ? 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20'
                              : 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20'
                          }`}>
                            {selectedTrip.status}
                          </span>
                        </div>

                        {/* Audit Details Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                          <div className="space-y-3">
                            <div>
                              <span className="block text-neutral-400 text-[10px] uppercase font-bold">Endereço de Partida</span>
                              <span className={`block mt-0.5 text-[11px] leading-relaxed ${isDark ? 'text-neutral-200' : 'text-neutral-800'}`}>
                                {selectedTrip.startAddress || 'Não fornecido (Viagem Manual)'}
                              </span>
                            </div>

                            <div>
                              <span className="block text-neutral-400 text-[10px] uppercase font-bold">Endereço de Chegada</span>
                              <span className={`block mt-0.5 text-[11px] leading-relaxed ${isDark ? 'text-neutral-200' : 'text-neutral-800'}`}>
                                {selectedTrip.endAddress || 'Não fornecido (Viagem Manual)'}
                              </span>
                            </div>

                            {selectedTrip.startTime && (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="block text-neutral-400 text-[10px] uppercase font-bold font-mono">Início</span>
                                  <span className="block font-bold mt-0.5">{new Date(selectedTrip.startTime).toLocaleTimeString('pt-BR')}</span>
                                </div>
                                <div>
                                  <span className="block text-neutral-400 text-[10px] uppercase font-bold font-mono">Término</span>
                                  <span className="block font-bold mt-0.5">{selectedTrip.endTime ? new Date(selectedTrip.endTime).toLocaleTimeString('pt-BR') : '--'}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="space-y-3 pl-0 sm:pl-4 border-l-0 sm:border-l border-neutral-200 dark:border-neutral-800">
                            <div>
                              <span className="block text-neutral-400 text-[10px] uppercase font-bold">Veículo da Viagem</span>
                              <span className={`block mt-0.5 font-sans font-bold ${isDark ? 'text-neutral-200' : 'text-neutral-800'}`}>
                                {vehicle?.name || 'Não cadastrado'}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="block text-neutral-400 text-[10px] uppercase font-bold font-mono">Quilometragem</span>
                                <span className="block font-bold text-sm mt-0.5">{selectedTrip.kmTraveled} km</span>
                              </div>
                              <div>
                                <span className="block text-neutral-400 text-[10px] uppercase font-bold font-mono">Est. Consumo</span>
                                <span className="block font-bold text-sm mt-0.5">
                                  {(selectedTrip.kmTraveled / (Number(vehicle?.avgConsumption) || 12)).toFixed(1)} L
                                </span>
                              </div>
                            </div>

                            <div className="pt-2">
                              <span className="block text-[#FFFFFF] text-[10px] uppercase font-bold font-mono">Est. Reembolso Combustível</span>
                              <span className="block font-bold text-sm text-[#FFFFFF] mt-0.5">
                                R$ {((selectedTrip.kmTraveled / (Number(vehicle?.avgConsumption) || 12)) * 6.29).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        </div>

                        {selectedTrip.notes && (
                          <div className="p-3 bg-neutral-50 dark:bg-neutral-900/40 rounded-lg text-[11px] leading-relaxed border border-neutral-100 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200">
                            <strong className="block mb-0.5 text-neutral-500 dark:text-neutral-400 uppercase text-[10px] tracking-wider">Observações:</strong>
                            {selectedTrip.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
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
                  className="w-full p-2 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-transparent text-neutral-950 dark:text-white outline-none focus:border-[#FFFFFF]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono text-neutral-400">Função Comercial</label>
                <input
                  type="text"
                  value={employeeForm.role}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, role: e.target.value })}
                  placeholder="Ex: Consultor de Vendas"
                  className="w-full p-2 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-transparent text-neutral-950 dark:text-white outline-none focus:border-[#FFFFFF]"
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
                  className="w-full p-2 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-transparent text-neutral-950 dark:text-white outline-none focus:border-[#FFFFFF]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono text-neutral-400">Telefone celular</label>
                <input
                  type="text"
                  value={employeeForm.phone}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  className="w-full p-2 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-transparent text-neutral-950 dark:text-white outline-none focus:border-[#FFFFFF]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono text-neutral-400">Status Cadastral</label>
                <select
                  value={employeeForm.status}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, status: e.target.value as 'Ativo' | 'Inativo' })}
                  className="w-full p-2 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white outline-none focus:border-[#FFFFFF]"
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
                      : 'bg-neutral-100 border-neutral-200 text-neutral-700 hover:bg-neutral-200 font-bold'
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
                  className="w-full p-2 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white outline-none focus:border-[#FFFFFF]"
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
                    className="w-full p-2 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white outline-none focus:border-[#FFFFFF]"
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
                    className="w-full p-2 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white outline-none focus:border-[#FFFFFF] disabled:opacity-50"
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
                      : 'bg-neutral-100 border-neutral-200 text-neutral-700 hover:bg-neutral-200 font-bold'
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
          <div className="w-full max-w-sm rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 shadow-xl max-h-[85dvh] flex flex-col">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-900 pb-3 shrink-0">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider font-sans">
                {finishedTripSummary 
                  ? 'Resumo da Viagem' 
                  : activeTrip 
                    ? 'Viagem em Andamento' 
                    : editingId 
                      ? 'Editar Viagem' 
                      : 'Lançar Nova Viagem'
                }
              </h3>
              <button 
                type="button" 
                onClick={closeModals}
                className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto pr-2 pb-6 flex-1 space-y-4 mt-3 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-800">
            {finishedTripSummary ? (
              /* PHASE 1: COMPLETED TRIP SUMMARY SCREEN */
              <div className="space-y-4 animate-fadeIn">
                <div className="w-12 h-12 rounded-full bg-zinc-500/10 flex items-center justify-center mx-auto text-zinc-500">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                
                <div className="text-center space-y-1">
                  <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest font-mono">Chegada Confirmada!</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Verifique os dados calculados abaixo:</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 text-center">
                    <span className="text-[9px] uppercase font-mono text-neutral-400 font-bold block">KM Rodado</span>
                    <span className="text-lg font-extrabold text-neutral-900 dark:text-white">{finishedTripSummary.km} km</span>
                  </div>
                  <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 text-center">
                    <span className="text-[9px] uppercase font-mono text-neutral-400 font-bold block">Valor Reembolso</span>
                    <span className="text-lg font-extrabold text-[#FFFFFF]">R$ {finishedTripSummary.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 space-y-2 text-left text-xs">
                  <div>
                    <span className="text-[8px] uppercase font-mono text-neutral-400 font-bold block">🏢 Cliente</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">{activeTrip?.clientVisited}</span>
                  </div>
                  <div>
                    <span className="text-[8px] uppercase font-mono text-neutral-400 font-bold block">🏁 Partida</span>
                    <span className="text-neutral-600 dark:text-neutral-400 block truncate">{activeTrip?.startAddress}</span>
                  </div>
                  <div>
                    <span className="text-[8px] uppercase font-mono text-neutral-400 font-bold block">📍 Chegada</span>
                    <span className="text-neutral-600 dark:text-neutral-400 block truncate">{finishedTripSummary.address}</span>
                  </div>
                </div>

                <div className="pt-2 space-y-2 sticky bottom-0 bg-white dark:bg-neutral-950 pb-2 z-10 border-t border-neutral-100 dark:border-neutral-900 mt-4">
                  <button
                    type="button"
                    onClick={saveFinishedTrip}
                    disabled={gpsLoading}
                    className="w-full bg-white hover:bg-neutral-200 text-black py-3 rounded-lg font-bold uppercase tracking-wider text-xs shadow-md transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    {gpsLoading ? (
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    Gravar e Enviar Reembolso
                  </button>
                  <button
                    type="button"
                    onClick={() => setFinishedTripSummary(null)}
                    className="w-full bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 py-2 rounded-lg font-bold uppercase tracking-wider text-[10px] transition-colors duration-250"
                  >
                    Recalcular GPS / Voltar
                  </button>
                </div>
              </div>
            ) : activeTrip ? (
              /* PHASE 2: ACTIVE TRIP IN PROGRESS SCREEN */
              <div className="space-y-4 text-center py-2 animate-fadeIn">
                <div className="w-16 h-16 rounded-full bg-[#FFFFFF]/10 flex items-center justify-center mx-auto animate-pulse">
                  <MapPin className="w-8 h-8 text-[#FFFFFF]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">Viagem em Andamento</p>
                  {activeTrip.startTime && (
                    <p className="text-xs text-neutral-500 mt-1 font-mono">
                      Iniciada às {new Date(activeTrip.startTime).toLocaleTimeString('pt-BR')}
                    </p>
                  )}
                  
                  <div className="mt-4 p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 text-left space-y-2.5">
                    <div>
                      <span className="text-[9px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">🏢 Cliente Visitado</span>
                      <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">{activeTrip.clientVisited}</p>
                    </div>
                    {activeTrip.reason && (
                      <div>
                        <span className="text-[9px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">📝 Motivo da Visita</span>
                        <p className="text-xs text-neutral-700 dark:text-neutral-300">{activeTrip.reason}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-[9px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">📍 Ponto de Partida</span>
                      <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed truncate">
                        {activeTrip.startAddress || 'Localização GPS Obtida'}
                      </p>
                    </div>
                    {activeTrip.endAddress && (
                      <div>
                        <span className="text-[9px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">🎯 Endereço de Destino (Visita)</span>
                        <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed truncate">
                          {activeTrip.endAddress}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="pt-4 space-y-2 sticky bottom-0 bg-white dark:bg-neutral-950 pb-2 z-10 border-t border-neutral-100 dark:border-neutral-900 mt-4">
                  <button 
                    type="button" 
                    disabled={gpsLoading}
                    onClick={finishGpsTrip} 
                    className="w-full bg-white text-black py-3 rounded-lg font-bold uppercase tracking-wider text-xs shadow-md transition hover:bg-neutral-200 hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {gpsLoading ? (
                      <>
                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Obtendo GPS de Destino...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        🏁 CHEGUEI (Finalizar Viagem)
                      </>
                    )}
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
              /* PHASE 3: LAUNCH TRIP FORM */
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono text-neutral-400">Escolha o Colaborador</label>
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
                      className="w-full p-2 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white outline-none focus:border-[#FFFFFF]"
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
                      className="w-full p-2 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white outline-none focus:border-[#FFFFFF]"
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

                  {/* Departure address GPS segment */}
                  <div className="space-y-1.5 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40">
                    <label className="text-[10px] uppercase font-mono font-bold text-neutral-500 dark:text-neutral-400 block">
                      Ponto de Partida (Localização Atual)
                    </label>
                    
                    <div className="p-3 rounded border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-950 dark:text-white flex items-center gap-2 shadow-xs">
                      <MapPin className={`w-4 h-4 shrink-0 ${gpsLoading ? 'text-[#FFFFFF] animate-pulse' : gpsStartStreet ? 'text-zinc-500' : 'text-[#FFFFFF] animate-bounce'}`} />
                      <span className={`text-xs font-bold truncate ${!gpsStartStreet ? 'text-[#FFFFFF] animate-pulse' : 'text-neutral-800 dark:text-neutral-200'}`}>
                        {gpsLoading ? 'Obtendo localização GPS...' : (gpsStartStreet || 'Aperte em Recarregar GPS')}
                      </span>
                    </div>

                    <button 
                      type="button" 
                      onClick={fetchStartLocation}
                      disabled={gpsLoading}
                      className="w-full mt-2.5 py-3 px-4 rounded-xl font-extrabold uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 shadow-md bg-white hover:bg-neutral-200 text-black cursor-pointer active:scale-95"
                    >
                      {gpsLoading ? (
                        <>
                          <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          Buscando...
                        </>
                      ) : (
                        <>
                          <MapPin className="w-4 h-4 text-white" />
                          Obter Localização Atual (Recarregar GPS)
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-2 pt-1 border-t border-neutral-100 dark:border-neutral-900">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-mono text-neutral-400">Cliente a Visitar</label>
                      <input 
                        type="text"
                        required
                        placeholder="Nome do cliente/loja"
                        value={displacementForm.clientVisited}
                        onChange={(e) => setDisplacementForm({ ...displacementForm, clientVisited: e.target.value })}
                        className="w-full p-2 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-transparent text-neutral-950 dark:text-white outline-none focus:border-[#FFFFFF]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-mono text-neutral-400">Motivo da Visita</label>
                      <input 
                        type="text"
                        required
                        placeholder="Ex: Reunião"
                        value={displacementForm.reason}
                        onChange={(e) => setDisplacementForm({ ...displacementForm, reason: e.target.value })}
                        className="w-full p-2 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-transparent text-neutral-950 dark:text-white outline-none focus:border-[#FFFFFF]"
                      />
                    </div>

                    {/* NEW BLOCK: ENDEREÇO DE VISITA */}
                    <div className="space-y-1.5 pt-2 border-t border-neutral-100 dark:border-neutral-900">
                      <label className="text-[10px] uppercase font-mono font-bold text-neutral-500 dark:text-neutral-400 block">
                        Endereço de Visita (Destino)
                      </label>
                      
                      <div className="flex gap-1.5">
                        <input 
                          type="text"
                          required
                          placeholder="Ex: Av. Paulista, 1000 - São Paulo"
                          value={endAddressInput}
                          onChange={(e) => setEndAddressInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleGeocodeDestination(endAddressInput);
                            }
                          }}
                          className="flex-1 p-2 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-transparent text-neutral-950 dark:text-white outline-none focus:border-[#FFFFFF]"
                        />
                        <button
                          type="button"
                          onClick={() => handleGeocodeDestination(endAddressInput)}
                          disabled={geocodingEndLoading || !endAddressInput.trim()}
                          className="px-3 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 text-xs font-bold rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-800 dark:text-white transition disabled:opacity-50"
                        >
                          {geocodingEndLoading ? 'Buscando...' : 'Calcular'}
                        </button>
                      </div>

                      {geocodingError && (
                        <p className="text-[10px] text-zinc-500 font-medium">{geocodingError}</p>
                      )}

                      {/* Display of calculated metrics (KM and Value) */}
                      {calculatedDistance !== null && calculatedValue !== null && (
                        <div className="grid grid-cols-2 gap-2 mt-2 p-2.5 rounded border border-zinc-500/30 bg-zinc-500/5 text-xs animate-fadeIn">
                          <div className="text-center">
                            <span className="text-[8px] uppercase font-mono text-neutral-400 block">Distância Estimada</span>
                            <span className="font-extrabold text-neutral-900 dark:text-white text-sm">{calculatedDistance} KM</span>
                          </div>
                          <div className="text-center">
                            <span className="text-[8px] uppercase font-mono text-neutral-400 block">Valor Reembolso</span>
                            <span className="font-extrabold text-neutral-900 dark:text-white text-sm">R$ {calculatedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2 sticky bottom-0 bg-white dark:bg-neutral-950 pb-2 z-10 border-t border-neutral-100 dark:border-neutral-900 mt-4">
                  <button 
                    type="button" 
                    onClick={startGpsTrip} 
                    disabled={!displacementForm.employeeId || !displacementForm.vehicleId || !displacementForm.clientVisited || !displacementForm.reason || !gpsEndCoords}
                    className="w-full bg-white text-black py-3 rounded-lg font-bold uppercase tracking-wider text-xs shadow-md transition hover:bg-neutral-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Começar Viagem / Deslocamento
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
                  className="w-full p-2 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white outline-none focus:border-[#FFFFFF]"
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
                  className="w-full p-2 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white outline-none focus:border-[#FFFFFF]"
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
                    className="w-full p-2 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-transparent text-neutral-950 dark:text-white outline-none focus:border-[#FFFFFF]"
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
                    className="w-full p-2 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-transparent text-neutral-950 dark:text-white outline-none focus:border-[#FFFFFF]"
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
                  className="w-full p-2 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-transparent text-neutral-950 dark:text-white outline-none focus:border-[#FFFFFF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-neutral-400">Cidade</label>
                  <select
                    required
                    value={displacementForm.city || 'Porto Feliz - SP'}
                    onChange={(e) => setDisplacementForm({ ...displacementForm, city: e.target.value })}
                    className="w-full p-2 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white outline-none focus:border-[#FFFFFF]"
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
                    className="w-full p-2 text-xs rounded border border-neutral-300 dark:border-neutral-800 bg-transparent text-neutral-950 dark:text-white outline-none focus:border-[#FFFFFF]"
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
                <label className="text-[10px] uppercase font-mono text-neutral-400 block">Comprovante de Abastecimento</label>
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
                      className="text-[10px] font-mono px-2 py-1 text-zinc-650 hover:bg-zinc-50 dark:hover:bg-zinc-950/20 rounded border border-zinc-200 dark:border-zinc-900 font-semibold shrink-0"
                    >
                      Remover
                    </button>
                  </div>
                ) : (
                  <div 
                    className="border border-dashed border-neutral-300 dark:border-neutral-800 rounded-lg p-3 text-center cursor-pointer hover:border-[#FFFFFF] transition bg-neutral-50/50 dark:bg-neutral-900/25"
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

              <div className="flex gap-2 pt-3 sticky bottom-0 bg-white dark:bg-neutral-950 pb-2 z-10 border-t border-neutral-100 dark:border-neutral-900 mt-4">
                <button
                  type="button"
                  onClick={closeModals}
                  className={`flex-1 py-1.5 text-xs font-mono uppercase border rounded transition ${
                    isDark 
                      ? 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800 hover:text-white' 
                      : 'bg-neutral-100 border-neutral-200 text-neutral-700 hover:bg-neutral-200 font-bold'
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
                        ? 'border-[#FFFFFF] bg-[#FFFFFF]/5 text-neutral-950 dark:text-white font-semibold'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-900/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="statusOption"
                      checked={statusForm === statusOption || (statusOption === 'Aprovada' && statusForm === 'Reembolsada')}
                      onChange={() => setStatusForm(statusOption)}
                      className="accent-[#FFFFFF]"
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
                      : 'bg-neutral-100 border-neutral-200 text-neutral-700 hover:bg-neutral-200 font-bold'
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
                      <div className="absolute w-2 h-2 bg-[#FFFFFF] rounded-full -left-[5px] top-1.5 ring-4 ring-white dark:ring-neutral-950"></div>
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
                  className="border border-dashed border-neutral-300 dark:border-neutral-800 rounded-lg p-6 text-center cursor-pointer hover:border-[#FFFFFF] transition bg-neutral-50/50 dark:bg-neutral-900/25"
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
            <div className="w-full max-w-2xl max-h-[85dvh] flex flex-col rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-white uppercase tracking-wider">{emp.name}</h3>
                  <p className="text-[10px] text-neutral-500 font-mono mt-0.5">{emp.role} • Média: {metrics.employeeBalances.find(e => e.id === emp.id)?.km} km rodados</p>
                </div>
                <button onClick={closeModals} className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition">fechar</button>
              </div>
              <div className="p-4 pb-8 flex-1 overflow-y-auto space-y-3">
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
                          <span className="font-mono font-bold text-xs text-[#FFFFFF]">R$ {disp.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          <div className="flex items-center gap-1.5 mt-1 justify-end">{disp.kmTraveled} km
                            <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold ${
                              disp.status === 'Reembolsada' || disp.status === 'Aprovada'
                                ? 'bg-zinc-500 text-white dark:bg-zinc-900/30 dark:text-zinc-400' 
                                : 'bg-zinc-500 text-white dark:bg-zinc-900/30 dark:text-zinc-400'
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
