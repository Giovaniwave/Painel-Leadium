import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart3, Building2, CalendarDays, ChevronRight, Flame, LayoutGrid, Mail, Phone, Plus, Search, Trash2, UserRound, X } from 'lucide-react';

type Stage = 'new' | 'qualification' | 'meeting' | 'proposal';
type ViewTab = 'pipeline' | 'leads' | 'agenda' | 'intelligence';

interface ProspectLead {
  id: string;
  company: string;
  contact: string;
  email: string;
  phone: string;
  service: string;
  source: string;
  value: number;
  stage: Stage;
  temperature: 'cold' | 'warm' | 'hot';
  nextContact: string;
  notes: string;
  createdAt: string;
}

interface ProspectingViewProps { theme: 'dark' | 'light'; searchQuery?: string; }

const stages: Array<{ id:Stage; label:string; hint:string }> = [
  { id:'new', label:'Novo lead', hint:'Entrada e pesquisa' },
  { id:'qualification', label:'Qualificação', hint:'Fit e oportunidade' },
  { id:'meeting', label:'Reunião', hint:'Diagnóstico agendado' },
  { id:'proposal', label:'Proposta', hint:'Negociação ativa' },
];

const initialLeads: ProspectLead[] = [
  { id:'demo-1', company:'Studio Atlas', contact:'Marina Rocha', email:'marina@studioatlas.com', phone:'(11) 99942-8170', service:'Growth + IA', source:'Indicação', value:8500, stage:'new', temperature:'warm', nextContact:'2026-07-14', notes:'Busca previsibilidade comercial.', createdAt:'2026-07-12' },
  { id:'demo-2', company:'Nexo Educação', contact:'Rafael Lima', email:'rafael@nexoedu.com', phone:'(15) 99811-2450', service:'Funil de vendas', source:'Instagram', value:12000, stage:'qualification', temperature:'hot', nextContact:'2026-07-13', notes:'Decisor já envolvido na conversa.', createdAt:'2026-07-10' },
  { id:'demo-3', company:'Clínica Vivere', contact:'Carolina Mendes', email:'carol@vivere.com', phone:'(11) 99670-3102', service:'Marketing completo', source:'Outbound', value:15000, stage:'meeting', temperature:'hot', nextContact:'2026-07-15', notes:'Reunião de diagnóstico confirmada.', createdAt:'2026-07-08' },
  { id:'demo-4', company:'Orbe Tech', contact:'Lucas Prado', email:'lucas@orbetech.io', phone:'(19) 99120-4831', service:'Automação IA', source:'Evento', value:18500, stage:'proposal', temperature:'warm', nextContact:'2026-07-16', notes:'Proposta enviada; retorno do financeiro.', createdAt:'2026-07-05' },
];

const blankLead = (): ProspectLead => ({ id:crypto.randomUUID(), company:'', contact:'', email:'', phone:'', service:'', source:'Instagram', value:0, stage:'new', temperature:'warm', nextContact:new Date().toISOString().slice(0,10), notes:'', createdAt:new Date().toISOString().slice(0,10) });
const money = (value:number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(value);

export default function ProspectingView({ theme, searchQuery='' }:ProspectingViewProps) {
  const dark = theme === 'dark';
  const [tab,setTab] = useState<ViewTab>('pipeline');
  const [leads,setLeads] = useState<ProspectLead[]>(() => {
    try { const saved=localStorage.getItem('leadium_prospecting_leads_v1'); return saved ? JSON.parse(saved) : initialLeads; } catch { return initialLeads; }
  });
  const [modalOpen,setModalOpen] = useState(false);
  const [draft,setDraft] = useState<ProspectLead>(blankLead());
  const [localSearch,setLocalSearch] = useState('');
  useEffect(() => {
    const refresh = () => fetch('/api/prospecting-leads').then(response => response.ok ? response.json() : Promise.reject())
      .then((remote: ProspectLead[]) => { if (remote.length) { setLeads(remote); localStorage.setItem('leadium_prospecting_leads_v1', JSON.stringify(remote)); } })
      .catch(() => undefined);
    refresh();
    const timer = window.setInterval(refresh, 10000);
    return () => window.clearInterval(timer);
  }, []);
  const query=(searchQuery || localSearch).trim().toLowerCase();
  const filtered=useMemo(()=>leads.filter(l=>!query || [l.company,l.contact,l.service,l.source].some(v=>v.toLowerCase().includes(query))),[leads,query]);
  const total=leads.reduce((sum,l)=>sum+l.value,0);
  const hot=leads.filter(l=>l.temperature==='hot').length;
  const proposalValue=leads.filter(l=>l.stage==='proposal').reduce((sum,l)=>sum+l.value,0);
  const conversion=leads.length ? Math.round((leads.filter(l=>l.stage==='proposal').length/leads.length)*100) : 0;
  const persist=(next:ProspectLead[])=>{setLeads(next);localStorage.setItem('leadium_prospecting_leads_v1',JSON.stringify(next));};
  const move=(id:string,stage:Stage)=>{persist(leads.map(l=>l.id===id?{...l,stage}:l));fetch(`/api/prospecting-leads/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({stage})}).catch(()=>undefined);};
  const remove=(id:string)=>{persist(leads.filter(l=>l.id!==id));fetch(`/api/prospecting-leads/${id}`,{method:'DELETE'}).catch(()=>undefined);};
  const save=async()=>{if(!draft.company.trim()||!draft.contact.trim())return;let created=draft;try{const response=await fetch('/api/prospecting-leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(draft)});if(response.ok)created=await response.json();}catch{}persist([created,...leads]);setDraft(blankLead());setModalOpen(false);};
  const surface=dark?'bg-[#111113] border-white/10':'bg-white border-black/10';
  const muted=dark?'text-neutral-500':'text-neutral-500';

  return <div className="space-y-6 animate-fadeIn">
    <section className={`relative overflow-hidden rounded-[28px] border p-5 sm:p-7 ${surface}`}>
      <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-white/[.04] blur-3xl" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div><div className={`mb-2 text-[9px] font-bold uppercase tracking-[.24em] ${muted}`}>Leadium Sales OS</div><h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${dark?'text-white':'text-neutral-950'}`}>Central de prospecção</h2><p className={`mt-2 max-w-xl text-sm ${muted}`}>Transforme oportunidades dispersas em um processo comercial claro, mensurável e consistente.</p></div>
        <button onClick={()=>setModalOpen(true)} className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-[10px] font-extrabold uppercase tracking-[.14em] transition-transform hover:-translate-y-0.5 ${dark?'bg-white text-black':'bg-black text-white keep-white'}`}><Plus className="h-4 w-4"/>Novo lead</button>
      </div>
      <div className="relative mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[['Pipeline',money(total)],['Oportunidades',String(leads.length)],['Leads quentes',String(hot)],['Em proposta',money(proposalValue)]].map(([label,value],i)=><div key={label} className={`rounded-2xl border px-4 py-3.5 ${dark?'border-white/[.07] bg-white/[.025]':'border-black/[.07] bg-neutral-50'}`}><div className={`text-[8px] font-bold uppercase tracking-[.18em] ${muted}`}>{label}</div><div className={`mt-2 text-lg font-black ${dark?'text-white':'text-black'}`}>{value}</div>{i===3&&<div className="mt-1 text-[9px] text-emerald-500">{conversion}% da base</div>}</div>)}
      </div>
    </section>

    <div className={`flex gap-1 overflow-x-auto rounded-2xl border p-1.5 ${surface}`}>
      {([{id:'pipeline',label:'Pipeline',icon:LayoutGrid},{id:'leads',label:'Leads',icon:UserRound},{id:'agenda',label:'Agenda',icon:CalendarDays},{id:'intelligence',label:'Inteligência',icon:BarChart3}] as const).map(item=>{const Icon=item.icon;const active=tab===item.id;return <button key={item.id} onClick={()=>setTab(item.id)} className={`relative flex min-w-max flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[10px] font-bold uppercase tracking-[.12em] ${active?(dark?'bg-white text-black':'bg-black text-white keep-white'):muted}`}><Icon className="h-3.5 w-3.5"/>{item.label}</button>})}
    </div>

    {tab==='pipeline'&&<div className="grid gap-4 xl:grid-cols-4">
      {stages.map((stage,index)=>{const items=filtered.filter(l=>l.stage===stage.id);const stageTotal=items.reduce((s,l)=>s+l.value,0);return <section key={stage.id} onDragOver={e=>e.preventDefault()} onDrop={e=>move(e.dataTransfer.getData('lead-id'),stage.id)} className={`min-h-[420px] rounded-[22px] border p-3 ${surface}`}>
        <header className="mb-3 flex items-start justify-between px-1 py-2"><div><div className="flex items-center gap-2"><span className={`flex h-5 w-5 items-center justify-center rounded-md text-[8px] font-black ${dark?'bg-white/10 text-white':'bg-black/5 text-black'}`}>0{index+1}</span><h3 className={`text-xs font-extrabold ${dark?'text-white':'text-black'}`}>{stage.label}</h3><span className={`rounded-full px-2 py-0.5 text-[8px] ${dark?'bg-white/5 text-neutral-400':'bg-black/5 text-neutral-500'}`}>{items.length}</span></div><p className={`ml-7 mt-1 text-[9px] ${muted}`}>{stage.hint}</p></div><div className={`text-right text-[9px] font-bold ${muted}`}>{money(stageTotal)}</div></header>
        <div className="space-y-2.5">{items.map(lead=><motion.article layout draggable onDragStart={e=>e.dataTransfer.setData('lead-id',lead.id)} key={lead.id} className={`group cursor-grab rounded-2xl border p-4 active:cursor-grabbing ${dark?'border-white/[.08] bg-[#18181b] hover:border-white/20':'border-black/[.08] bg-neutral-50 hover:border-black/20'}`}>
          <div className="flex items-start justify-between gap-2"><div className={`flex h-8 w-8 items-center justify-center rounded-xl ${dark?'bg-white/10':'bg-black/5'}`}><Building2 className="h-3.5 w-3.5"/></div><button onClick={()=>remove(lead.id)} className={`opacity-0 transition-opacity group-hover:opacity-100 ${muted}`} title="Excluir lead"><Trash2 className="h-3.5 w-3.5"/></button></div>
          <h4 className={`mt-3 text-sm font-extrabold ${dark?'text-white':'text-black'}`}>{lead.company}</h4><p className={`mt-1 text-[10px] ${muted}`}>{lead.contact} · {lead.service}</p>
          <div className="mt-4 flex items-end justify-between"><div><div className={`text-[8px] uppercase tracking-widest ${muted}`}>Potencial</div><div className={`mt-1 text-xs font-black ${dark?'text-white':'text-black'}`}>{money(lead.value)}</div></div><span className={`flex items-center gap-1 rounded-full px-2 py-1 text-[8px] font-bold ${lead.temperature==='hot'?'bg-orange-500/10 text-orange-500':lead.temperature==='warm'?'bg-amber-500/10 text-amber-500':'bg-sky-500/10 text-sky-500'}`}><Flame className="h-2.5 w-2.5"/>{lead.temperature==='hot'?'Quente':lead.temperature==='warm'?'Morno':'Frio'}</span></div>
          <div className={`mt-3 flex items-center gap-1.5 border-t pt-3 text-[9px] ${dark?'border-white/[.06] text-neutral-500':'border-black/[.06] text-neutral-500'}`}><CalendarDays className="h-3 w-3"/>{new Date(`${lead.nextContact}T12:00:00`).toLocaleDateString('pt-BR')}</div>
        </motion.article>)}{items.length===0&&<div className={`flex h-28 items-center justify-center rounded-2xl border border-dashed text-[9px] uppercase tracking-widest ${dark?'border-white/10 text-neutral-700':'border-black/10 text-neutral-400'}`}>Arraste um lead</div>}</div>
      </section>})}
    </div>}

    {tab==='leads'&&<section className={`overflow-hidden rounded-[22px] border ${surface}`}><div className={`flex items-center gap-2 border-b p-4 ${dark?'border-white/10':'border-black/10'}`}><Search className={`h-4 w-4 ${muted}`}/><input value={localSearch} onChange={e=>setLocalSearch(e.target.value)} placeholder="Buscar empresa, contato, serviço ou origem..." className={`w-full bg-transparent text-sm outline-none ${dark?'text-white placeholder:text-neutral-700':'text-black placeholder:text-neutral-400'}`}/></div><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left"><thead><tr className={`text-[8px] uppercase tracking-[.16em] ${muted}`}>{['Empresa / contato','Serviço','Origem','Etapa','Potencial','Próximo contato',''].map(h=><th key={h} className="px-5 py-3 font-bold">{h}</th>)}</tr></thead><tbody>{filtered.map(l=><tr key={l.id} className={`border-t text-xs ${dark?'border-white/[.06]':'border-black/[.06]'}`}><td className="px-5 py-4"><div className={`font-bold ${dark?'text-white':'text-black'}`}>{l.company}</div><div className={`mt-1 text-[10px] ${muted}`}>{l.contact}</div></td><td className={`px-5 py-4 ${muted}`}>{l.service}</td><td className={`px-5 py-4 ${muted}`}>{l.source}</td><td className="px-5 py-4"><select value={l.stage} onChange={e=>move(l.id,e.target.value as Stage)} className={`rounded-lg border px-2 py-1.5 text-[10px] outline-none ${dark?'border-white/10 bg-[#18181b] text-white':'border-black/10 bg-white text-black'}`}>{stages.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></td><td className={`px-5 py-4 font-bold ${dark?'text-white':'text-black'}`}>{money(l.value)}</td><td className={`px-5 py-4 ${muted}`}>{new Date(`${l.nextContact}T12:00:00`).toLocaleDateString('pt-BR')}</td><td className="px-5 py-4"><button onClick={()=>remove(l.id)} className={muted}><Trash2 className="h-3.5 w-3.5"/></button></td></tr>)}</tbody></table></div></section>}

    {tab==='agenda'&&<section className={`rounded-[22px] border p-5 ${surface}`}><div className="mb-5"><h3 className={`text-base font-black ${dark?'text-white':'text-black'}`}>Próximas ações</h3><p className={`mt-1 text-xs ${muted}`}>Follow-ups e reuniões que mantêm o pipeline em movimento.</p></div><div className="space-y-2">{[...filtered].sort((a,b)=>a.nextContact.localeCompare(b.nextContact)).map(l=><div key={l.id} className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center ${dark?'border-white/[.07] bg-white/[.02]':'border-black/[.07] bg-neutral-50'}`}><div className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl ${dark?'bg-white text-black':'bg-black text-white'}`}><span className="text-[8px] font-bold uppercase">{new Date(`${l.nextContact}T12:00:00`).toLocaleDateString('pt-BR',{month:'short'}).replace('.','')}</span><strong className="text-base leading-none">{new Date(`${l.nextContact}T12:00:00`).getDate()}</strong></div><div className="flex-1"><div className={`text-sm font-bold ${dark?'text-white':'text-black'}`}>{l.company}</div><div className={`mt-1 text-[10px] ${muted}`}>{l.contact} · {stages.find(s=>s.id===l.stage)?.label}</div></div><div className="flex gap-2"><a href={`tel:${l.phone}`} className={`rounded-lg border p-2 ${dark?'border-white/10 text-neutral-400':'border-black/10 text-neutral-600'}`}><Phone className="h-3.5 w-3.5"/></a><a href={`mailto:${l.email}`} className={`rounded-lg border p-2 ${dark?'border-white/10 text-neutral-400':'border-black/10 text-neutral-600'}`}><Mail className="h-3.5 w-3.5"/></a><button onClick={()=>move(l.id,stages[Math.min(stages.findIndex(s=>s.id===l.stage)+1,3)].id)} className={`flex items-center gap-1 rounded-lg px-3 text-[9px] font-bold ${dark?'bg-white text-black':'bg-black text-white'}`}>Avançar<ChevronRight className="h-3 w-3"/></button></div></div>)}</div></section>}

    {tab==='intelligence'&&<div className="grid gap-4 lg:grid-cols-3"><section className={`rounded-[22px] border p-5 lg:col-span-2 ${surface}`}><h3 className={`text-sm font-black ${dark?'text-white':'text-black'}`}>Distribuição do pipeline</h3><div className="mt-7 space-y-5">{stages.map(s=>{const amount=leads.filter(l=>l.stage===s.id).reduce((a,l)=>a+l.value,0);const pct=total?Math.round(amount/total*100):0;return <div key={s.id}><div className="mb-2 flex justify-between text-[10px]"><span className={muted}>{s.label}</span><strong className={dark?'text-white':'text-black'}>{money(amount)} · {pct}%</strong></div><div className={`h-2 overflow-hidden rounded-full ${dark?'bg-white/[.06]':'bg-black/[.06]'}`}><motion.div initial={{width:0}} animate={{width:`${pct}%`}} className={`h-full rounded-full ${dark?'bg-white':'bg-black'}`}/></div></div>})}</div></section><section className={`rounded-[22px] border p-5 ${surface}`}><h3 className={`text-sm font-black ${dark?'text-white':'text-black'}`}>Leitura comercial</h3><div className="mt-6 space-y-6">{[['Conversão em proposta',`${conversion}%`],['Ticket médio',money(leads.length?total/leads.length:0)],['Leads de alta intenção',String(hot)]].map(([a,b])=><div key={a}><div className={`text-[9px] uppercase tracking-widest ${muted}`}>{a}</div><div className={`mt-2 text-2xl font-black ${dark?'text-white':'text-black'}`}>{b}</div></div>)}</div></section></div>}

    <AnimatePresence>{modalOpen&&<motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"><motion.div initial={{y:20,scale:.98}} animate={{y:0,scale:1}} exit={{y:15,opacity:0}} className={`max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[26px] border p-6 ${surface}`}><div className="flex items-start justify-between"><div><h3 className={`text-xl font-black ${dark?'text-white':'text-black'}`}>Novo lead</h3><p className={`mt-1 text-xs ${muted}`}>Registre uma oportunidade no pipeline comercial.</p></div><button onClick={()=>setModalOpen(false)} className={muted}><X className="h-5 w-5"/></button></div><div className="mt-6 grid gap-4 sm:grid-cols-2">{([['company','Empresa *','text'],['contact','Contato *','text'],['email','E-mail','email'],['phone','WhatsApp','text'],['service','Serviço de interesse','text'],['value','Potencial (R$)','number'],['nextContact','Próximo contato','date']] as const).map(([key,label,type])=><label key={key} className="space-y-2"><span className={`text-[9px] font-bold uppercase tracking-widest ${muted}`}>{label}</span><input type={type} value={draft[key]} onChange={e=>setDraft({...draft,[key]:type==='number'?Number(e.target.value):e.target.value})} className={`h-11 w-full rounded-xl border bg-transparent px-3 text-sm outline-none focus:border-current ${dark?'border-white/10 text-white':'border-black/10 text-black'}`}/></label>)}<label className="space-y-2"><span className={`text-[9px] font-bold uppercase tracking-widest ${muted}`}>Origem</span><select value={draft.source} onChange={e=>setDraft({...draft,source:e.target.value})} className={`h-11 w-full rounded-xl border px-3 text-sm outline-none ${dark?'border-white/10 bg-[#111113] text-white':'border-black/10 bg-white text-black'}`}>{['Instagram','Indicação','Outbound','Evento','Site','LinkedIn','Outro'].map(v=><option key={v}>{v}</option>)}</select></label><label className="space-y-2"><span className={`text-[9px] font-bold uppercase tracking-widest ${muted}`}>Temperatura</span><select value={draft.temperature} onChange={e=>setDraft({...draft,temperature:e.target.value as ProspectLead['temperature']})} className={`h-11 w-full rounded-xl border px-3 text-sm outline-none ${dark?'border-white/10 bg-[#111113] text-white':'border-black/10 bg-white text-black'}`}><option value="cold">Frio</option><option value="warm">Morno</option><option value="hot">Quente</option></select></label><label className="space-y-2 sm:col-span-2"><span className={`text-[9px] font-bold uppercase tracking-widest ${muted}`}>Observações</span><textarea value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})} rows={3} className={`w-full rounded-xl border bg-transparent p-3 text-sm outline-none ${dark?'border-white/10 text-white':'border-black/10 text-black'}`}/></label></div><div className="mt-6 flex justify-end gap-2"><button onClick={()=>setModalOpen(false)} className={`rounded-xl px-4 py-3 text-[10px] font-bold uppercase ${muted}`}>Cancelar</button><button onClick={save} className={`rounded-xl px-5 py-3 text-[10px] font-extrabold uppercase ${dark?'bg-white text-black':'bg-black text-white'}`}>Adicionar ao pipeline</button></div></motion.div></motion.div>}</AnimatePresence>
  </div>;
}
