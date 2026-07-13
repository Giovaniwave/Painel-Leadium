import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BarChart3,
  Building2,
  CalendarDays,
  ChevronRight,
  Flame,
  Globe2,
  Instagram,
  LayoutGrid,
  Mail,
  Phone,
  Plus,
  Search,
  Tag,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

type Stage = "new" | "qualification" | "meeting" | "proposal";
type ViewTab = "pipeline" | "leads" | "agenda" | "intelligence";

interface ProspectLead {
  id: string;
  company: string;
  contact: string;
  email: string;
  phone: string;
  instagram?: string;
  niche?: string;
  monthlyRevenueRange?: string;
  eventName?: string;
  interest?: string;
  formName?: string;
  pageUrl?: string;
  submittedAt?: string;
  device?: string;
  service: string;
  source: string;
  value: number;
  stage: Stage;
  temperature: "cold" | "warm" | "hot";
  nextContact: string;
  notes: string;
  createdAt: string;
}

interface ProspectingViewProps {
  theme: "dark" | "light";
  searchQuery?: string;
}

const stages: Array<{ id: Stage; label: string; hint: string }> = [
  { id: "new", label: "Novo lead", hint: "Entrada e pesquisa" },
  { id: "qualification", label: "Qualificação", hint: "Fit e oportunidade" },
  { id: "meeting", label: "Reunião", hint: "Diagnóstico agendado" },
  { id: "proposal", label: "Proposta", hint: "Negociação ativa" },
];

const initialLeads: ProspectLead[] = [
  {
    id: "demo-1",
    company: "Studio Atlas",
    contact: "Marina Rocha",
    email: "marina@studioatlas.com",
    phone: "(11) 99942-8170",
    service: "Growth + IA",
    source: "Indicação",
    value: 8500,
    stage: "new",
    temperature: "warm",
    nextContact: "2026-07-14",
    notes: "Busca previsibilidade comercial.",
    createdAt: "2026-07-12",
  },
  {
    id: "demo-2",
    company: "Nexo Educação",
    contact: "Rafael Lima",
    email: "rafael@nexoedu.com",
    phone: "(15) 99811-2450",
    service: "Funil de vendas",
    source: "Instagram",
    value: 12000,
    stage: "qualification",
    temperature: "hot",
    nextContact: "2026-07-13",
    notes: "Decisor já envolvido na conversa.",
    createdAt: "2026-07-10",
  },
  {
    id: "demo-3",
    company: "Clínica Vivere",
    contact: "Carolina Mendes",
    email: "carol@vivere.com",
    phone: "(11) 99670-3102",
    service: "Marketing completo",
    source: "Outbound",
    value: 15000,
    stage: "meeting",
    temperature: "hot",
    nextContact: "2026-07-15",
    notes: "Reunião de diagnóstico confirmada.",
    createdAt: "2026-07-08",
  },
  {
    id: "demo-4",
    company: "Orbe Tech",
    contact: "Lucas Prado",
    email: "lucas@orbetech.io",
    phone: "(19) 99120-4831",
    service: "Automação IA",
    source: "Evento",
    value: 18500,
    stage: "proposal",
    temperature: "warm",
    nextContact: "2026-07-16",
    notes: "Proposta enviada; retorno do financeiro.",
    createdAt: "2026-07-05",
  },
];

const blankLead = (): ProspectLead => ({
  id: crypto.randomUUID(),
  company: "",
  contact: "",
  email: "",
  phone: "",
  service: "",
  source: "Instagram",
  value: 0,
  stage: "new",
  temperature: "warm",
  nextContact: new Date().toISOString().slice(0, 10),
  notes: "",
  createdAt: new Date().toISOString().slice(0, 10),
});
const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
const dateTime = (value?: string | null) => {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
};
const instagramUrl = (handle?: string) => {
  const username = String(handle || "")
    .trim()
    .replace(/^https?:\/\/(?:www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/[/?#].*$/, "");
  return username
    ? `https://www.instagram.com/${encodeURIComponent(username)}/`
    : "";
};

export default function ProspectingView({
  theme,
  searchQuery = "",
}: ProspectingViewProps) {
  const dark = theme === "dark";
  const [tab, setTab] = useState<ViewTab>("pipeline");
  const [leads, setLeads] = useState<ProspectLead[]>(() => {
    try {
      const saved = localStorage.getItem("leadium_prospecting_leads_v1");
      return saved ? JSON.parse(saved) : initialLeads;
    } catch {
      return initialLeads;
    }
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<ProspectLead | null>(null);
  const [draft, setDraft] = useState<ProspectLead>(blankLead());
  const [localSearch, setLocalSearch] = useState("");
  useEffect(() => {
    const refresh = () =>
      fetch("/api/prospecting-leads")
        .then((response) => (response.ok ? response.json() : Promise.reject()))
        .then((remote: ProspectLead[]) => {
          if (remote.length) {
            setLeads(remote);
            localStorage.setItem(
              "leadium_prospecting_leads_v1",
              JSON.stringify(remote),
            );
          }
        })
        .catch(() => undefined);
    refresh();
    const events = new EventSource("/api/realtime");
    const sync = () => refresh();
    events.addEventListener("lead-created", sync);
    events.addEventListener("lead-updated", sync);
    events.addEventListener("lead-deleted", sync);
    const timer = window.setInterval(refresh, 30000);
    return () => {
      window.clearInterval(timer);
      events.close();
    };
  }, []);
  const query = (searchQuery || localSearch).trim().toLowerCase();
  const filtered = useMemo(
    () =>
      leads.filter(
        (l) =>
          !query ||
          [l.company, l.contact, l.service, l.source].some((v) =>
            v.toLowerCase().includes(query),
          ),
      ),
    [leads, query],
  );
  const total = leads.reduce((sum, l) => sum + l.value, 0);
  const operationShare = 0.5;
  const projectedTotal = total * operationShare;
  const hot = leads.filter((l) => l.temperature === "hot").length;
  const proposalValue = leads
    .filter((l) => l.stage === "proposal")
    .reduce((sum, l) => sum + l.value, 0);
  const conversion = leads.length
    ? Math.round(
        (leads.filter((l) => l.stage === "proposal").length / leads.length) *
          100,
      )
    : 0;
  const persist = (next: ProspectLead[]) => {
    setLeads(next);
    localStorage.setItem("leadium_prospecting_leads_v1", JSON.stringify(next));
  };
  const move = (id: string, stage: Stage) => {
    const temperature: ProspectLead["temperature"] =
      stage === "meeting" || stage === "proposal" ? "hot" : "warm";
    persist(leads.map((l) => (l.id === id ? { ...l, stage, temperature } : l)));
    fetch(`/api/prospecting-leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage, temperature }),
    }).catch(() => undefined);
  };
  const remove = (id: string) => {
    persist(leads.filter((l) => l.id !== id));
    fetch(`/api/prospecting-leads/${id}`, { method: "DELETE" }).catch(
      () => undefined,
    );
  };
  const save = async () => {
    if (!draft.company.trim() || !draft.contact.trim()) return;
    let created = draft;
    try {
      const response = await fetch("/api/prospecting-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (response.ok) created = await response.json();
    } catch {}
    persist([created, ...leads]);
    setDraft(blankLead());
    setModalOpen(false);
  };
  const surface = dark
    ? "bg-[#111113] border-white/10"
    : "bg-white border-black/10";
  const muted = dark ? "text-neutral-500" : "text-neutral-500";

  return (
    <div className="space-y-6 animate-fadeIn">
      <section
        className={`relative overflow-hidden rounded-[28px] border p-5 sm:p-7 ${surface}`}
      >
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-white/[.04] blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div
              className={`mb-2 text-[9px] font-bold uppercase tracking-[.24em] ${muted}`}
            >
              Leadium Sales OS
            </div>
            <h2
              className={`text-2xl sm:text-3xl font-black tracking-tight ${dark ? "text-white" : "text-neutral-950"}`}
            >
              Central de prospecção
            </h2>
            <p className={`mt-2 max-w-xl text-sm ${muted}`}>
              Transforme oportunidades dispersas em um processo comercial claro,
              mensurável e consistente.
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-[10px] font-extrabold uppercase tracking-[.14em] transition-transform hover:-translate-y-0.5 ${dark ? "bg-white text-black" : "bg-black text-white keep-white"}`}
          >
            <Plus className="h-4 w-4" />
            Novo lead
          </button>
        </div>
        <div className="relative mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ["Pipeline", money(total)],
            ["Oportunidades", String(leads.length)],
            ["Leads quentes", String(hot)],
            ["Em proposta", money(proposalValue)],
          ].map(([label, value], i) => (
            <div
              key={label}
              className={`rounded-2xl border px-4 py-3.5 ${dark ? "border-white/[.07] bg-white/[.025]" : "border-black/[.07] bg-neutral-50"}`}
            >
              <div
                className={`text-[8px] font-bold uppercase tracking-[.18em] ${muted}`}
              >
                {label}
              </div>
              <div
                className={`mt-2 text-lg font-black ${dark ? "text-white" : "text-black"}`}
              >
                {value}
              </div>
              {i === 3 && (
                <div className="mt-1 text-[9px] text-emerald-500">
                  {conversion}% da base
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <div
        className={`flex gap-1 overflow-x-auto rounded-2xl border p-1.5 ${surface}`}
      >
        {(
          [
            { id: "pipeline", label: "Pipeline", icon: LayoutGrid },
            { id: "leads", label: "Leads", icon: UserRound },
            { id: "agenda", label: "Agenda", icon: CalendarDays },
            { id: "intelligence", label: "Inteligência", icon: BarChart3 },
          ] as const
        ).map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`relative flex min-w-max flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[10px] font-bold uppercase tracking-[.12em] ${active ? (dark ? "bg-white text-black" : "bg-black text-white keep-white") : muted}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === "pipeline" && (
        <div className="grid gap-4 xl:grid-cols-4">
          {stages.map((stage, index) => {
            const items = filtered.filter((l) => l.stage === stage.id);
            const stageTotal = items.reduce((s, l) => s + l.value, 0);
            return (
              <section
                key={stage.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) =>
                  move(e.dataTransfer.getData("lead-id"), stage.id)
                }
                className={`min-h-[420px] rounded-[22px] border p-3 ${surface}`}
              >
                <header className="mb-3 flex items-start justify-between px-1 py-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-md text-[8px] font-black ${dark ? "bg-white/10 text-white" : "bg-black/5 text-black"}`}
                      >
                        0{index + 1}
                      </span>
                      <h3
                        className={`text-xs font-extrabold ${dark ? "text-white" : "text-black"}`}
                      >
                        {stage.label}
                      </h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[8px] ${dark ? "bg-white/5 text-neutral-400" : "bg-black/5 text-neutral-500"}`}
                      >
                        {items.length}
                      </span>
                    </div>
                    <p className={`ml-7 mt-1 text-[9px] ${muted}`}>
                      {stage.hint}
                    </p>
                  </div>
                  <div className={`text-right text-[9px] font-bold ${muted}`}>
                    {money(stageTotal)}
                  </div>
                </header>
                <div className="space-y-2.5">
                  {items.map((lead) => (
                    <motion.article
                      layout
                      draggable
                      onDragStart={(e) =>
                        e.dataTransfer.setData("lead-id", lead.id)
                      }
                      onClick={() => setSelectedLead(lead)}
                      key={lead.id}
                      className={`group relative cursor-pointer overflow-hidden rounded-xl border p-3 transition-all hover:-translate-y-0.5 hover:shadow-lg ${dark ? "border-white/[.09] bg-gradient-to-br from-[#1a1a1e] to-[#141416] hover:border-white/20 hover:shadow-black/20" : "border-black/[.08] bg-gradient-to-br from-white to-neutral-50 hover:border-black/20 hover:shadow-black/10"}`}
                    >
                      <div
                        className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${lead.stage === "meeting" || lead.stage === "proposal" ? "via-orange-400/70" : "via-amber-400/60"} to-transparent`}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(lead.id);
                        }}
                        className={`absolute right-2 top-2 rounded-lg p-1.5 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100 ${muted}`}
                        title="Excluir lead"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                      <h4
                        className={`pr-6 text-[13px] font-extrabold leading-tight ${dark ? "text-white" : "text-black"}`}
                      >
                        {lead.contact || lead.company}
                      </h4>
                      <div
                        className={`mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[8px] ${muted}`}
                      >
                        <span className="inline-flex items-center gap-1">
                          <Instagram className="h-3 w-3" />
                          {lead.instagram || lead.company}
                        </span>
                        {lead.niche && (
                          <span className="inline-flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            {lead.niche}
                          </span>
                        )}
                      </div>
                      <div className="mt-3 flex items-end justify-between">
                        <div>
                          <div
                            className={`text-[7px] font-bold uppercase tracking-widest ${muted}`}
                          >
                            Faturamento
                          </div>
                          <div
                            className={`mt-0.5 text-[11px] font-black ${dark ? "text-white" : "text-black"}`}
                          >
                            {lead.monthlyRevenueRange || money(lead.value)}
                          </div>
                        </div>
                        <span
                          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[7px] font-bold ${lead.temperature === "hot" ? "bg-orange-500/10 text-orange-500" : lead.temperature === "warm" ? "bg-amber-500/10 text-amber-500" : "bg-sky-500/10 text-sky-500"}`}
                        >
                          <Flame className="h-2.5 w-2.5" />
                          {lead.temperature === "hot"
                            ? "Quente"
                            : lead.temperature === "warm"
                              ? "Morno"
                              : "Frio"}
                        </span>
                      </div>
                      <div
                        className={`mt-2.5 flex items-center justify-between border-t pt-2.5 text-[8px] ${dark ? "border-white/[.06] text-neutral-500" : "border-black/[.06] text-neutral-500"}`}
                      >
                        <span className="flex items-center gap-1.5">
                          <CalendarDays className="h-3 w-3" />
                          {new Date(
                            `${lead.nextContact}T12:00:00`,
                          ).toLocaleDateString("pt-BR")}
                        </span>
                        <span className="font-semibold">Ver detalhes →</span>
                      </div>
                    </motion.article>
                  ))}
                  {items.length === 0 && (
                    <div
                      className={`flex h-28 items-center justify-center rounded-2xl border border-dashed text-[9px] uppercase tracking-widest ${dark ? "border-white/10 text-neutral-700" : "border-black/10 text-neutral-400"}`}
                    >
                      Arraste um lead
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {tab === "leads" && (
        <section className={`overflow-hidden rounded-[22px] border ${surface}`}>
          <div
            className={`flex items-center gap-2 border-b p-4 ${dark ? "border-white/10" : "border-black/10"}`}
          >
            <Search className={`h-4 w-4 ${muted}`} />
            <input
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Buscar empresa, contato, serviço ou origem..."
              className={`w-full bg-transparent text-sm outline-none ${dark ? "text-white placeholder:text-neutral-700" : "text-black placeholder:text-neutral-400"}`}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left">
              <thead>
                <tr
                  className={`text-[8px] uppercase tracking-[.16em] ${muted}`}
                >
                  {[
                    "Nome / Instagram",
                    "Serviço",
                    "Origem",
                    "Etapa",
                    "Faturamento",
                    "Próximo contato",
                    "",
                  ].map((h) => (
                    <th key={h} className="px-5 py-3 font-bold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr
                    key={l.id}
                    onClick={() => setSelectedLead(l)}
                    className={`cursor-pointer border-t text-xs transition-colors ${dark ? "border-white/[.06] hover:bg-white/[.03]" : "border-black/[.06] hover:bg-black/[.02]"}`}
                  >
                    <td className="px-5 py-4">
                      <div
                        className={`font-bold ${dark ? "text-white" : "text-black"}`}
                      >
                        {l.contact}
                      </div>
                      <div className={`mt-1 text-[10px] ${muted}`}>
                        {l.instagram || l.company}
                      </div>
                    </td>
                    <td className={`px-5 py-4 ${muted}`}>{l.service}</td>
                    <td className={`px-5 py-4 ${muted}`}>{l.source}</td>
                    <td className="px-5 py-4">
                      <select
                        value={l.stage}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => move(l.id, e.target.value as Stage)}
                        className={`rounded-lg border px-2 py-1.5 text-[10px] outline-none ${dark ? "border-white/10 bg-[#18181b] text-white" : "border-black/10 bg-white text-black"}`}
                      >
                        {stages.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td
                      className={`px-5 py-4 font-bold ${dark ? "text-white" : "text-black"}`}
                    >
                      {l.monthlyRevenueRange || money(l.value)}
                    </td>
                    <td className={`px-5 py-4 ${muted}`}>
                      {new Date(`${l.nextContact}T12:00:00`).toLocaleDateString(
                        "pt-BR",
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <button onClick={() => remove(l.id)} className={muted}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "agenda" && (
        <section className={`rounded-[22px] border p-5 ${surface}`}>
          <div className="mb-5">
            <h3
              className={`text-base font-black ${dark ? "text-white" : "text-black"}`}
            >
              Próximas ações
            </h3>
            <p className={`mt-1 text-xs ${muted}`}>
              Follow-ups e reuniões que mantêm o pipeline em movimento.
            </p>
          </div>
          <div className="space-y-2">
            {[...filtered]
              .sort((a, b) => a.nextContact.localeCompare(b.nextContact))
              .map((l) => (
                <div
                  key={l.id}
                  className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center ${dark ? "border-white/[.07] bg-white/[.02]" : "border-black/[.07] bg-neutral-50"}`}
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl ${dark ? "bg-white text-black" : "bg-black text-white"}`}
                  >
                    <span className="text-[8px] font-bold uppercase">
                      {new Date(`${l.nextContact}T12:00:00`)
                        .toLocaleDateString("pt-BR", { month: "short" })
                        .replace(".", "")}
                    </span>
                    <strong className="text-base leading-none">
                      {new Date(`${l.nextContact}T12:00:00`).getDate()}
                    </strong>
                  </div>
                  <div className="flex-1">
                    <div
                      className={`text-sm font-bold ${dark ? "text-white" : "text-black"}`}
                    >
                      {l.company}
                    </div>
                    <div className={`mt-1 text-[10px] ${muted}`}>
                      {l.contact} ·{" "}
                      {stages.find((s) => s.id === l.stage)?.label}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={`tel:${l.phone}`}
                      className={`rounded-lg border p-2 ${dark ? "border-white/10 text-neutral-400" : "border-black/10 text-neutral-600"}`}
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </a>
                    <a
                      href={`mailto:${l.email}`}
                      className={`rounded-lg border p-2 ${dark ? "border-white/10 text-neutral-400" : "border-black/10 text-neutral-600"}`}
                    >
                      <Mail className="h-3.5 w-3.5" />
                    </a>
                    <button
                      onClick={() =>
                        move(
                          l.id,
                          stages[
                            Math.min(
                              stages.findIndex((s) => s.id === l.stage) + 1,
                              3,
                            )
                          ].id,
                        )
                      }
                      className={`flex items-center gap-1 rounded-lg px-3 text-[9px] font-bold ${dark ? "bg-white text-black" : "bg-black text-white"}`}
                    >
                      Avançar
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      {tab === "intelligence" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <section
            className={`rounded-[22px] border p-5 lg:col-span-2 ${surface}`}
          >
            <h3
              className={`text-sm font-black ${dark ? "text-white" : "text-black"}`}
            >
              Distribuição do pipeline
            </h3>
            <p className={`mt-1 text-[10px] ${muted}`}>
              Receita potencial da Leadium considerando 50% da operação mensal
              de cada lead.
            </p>
            <div className="mt-7 space-y-5">
              {stages.map((s) => {
                const amount = leads
                  .filter((l) => l.stage === s.id)
                  .reduce((a, l) => a + l.value * operationShare, 0);
                const pct = projectedTotal
                  ? Math.round((amount / projectedTotal) * 100)
                  : 0;
                return (
                  <div key={s.id}>
                    <div className="mb-2 flex justify-between text-[10px]">
                      <span className={muted}>{s.label}</span>
                      <strong className={dark ? "text-white" : "text-black"}>
                        {money(amount)} · {pct}%
                      </strong>
                    </div>
                    <div
                      className={`h-2 overflow-hidden rounded-full ${dark ? "bg-white/[.06]" : "bg-black/[.06]"}`}
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        className={`h-full rounded-full ${dark ? "bg-white" : "bg-black"}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          <section className={`rounded-[22px] border p-5 ${surface}`}>
            <h3
              className={`text-sm font-black ${dark ? "text-white" : "text-black"}`}
            >
              Leitura comercial
            </h3>
            <div
              className={`mt-4 rounded-xl border px-3 py-2.5 ${dark ? "border-white/[.07] bg-white/[.025]" : "border-black/[.07] bg-neutral-50"}`}
            >
              <div className={`text-[8px] uppercase tracking-widest ${muted}`}>
                Modelo de participação
              </div>
              <div
                className={`mt-1 text-xs font-black ${dark ? "text-white" : "text-black"}`}
              >
                50% da operação mensal
              </div>
            </div>
            <div className="mt-6 space-y-6">
              {[
                ["Conversão em proposta", `${conversion}%`],
                [
                  "Ticket médio projetado",
                  money(leads.length ? projectedTotal / leads.length : 0),
                ],
                ["Leads de alta intenção", String(hot)],
              ].map(([a, b]) => (
                <div key={a}>
                  <div
                    className={`text-[9px] uppercase tracking-widest ${muted}`}
                  >
                    {a}
                  </div>
                  <div
                    className={`mt-2 text-2xl font-black ${dark ? "text-white" : "text-black"}`}
                  >
                    {b}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      <AnimatePresence>
        {selectedLead && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedLead(null)}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 20, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 15, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border ${surface}`}
            >
              <header
                className={`relative overflow-hidden border-b p-6 sm:p-8 ${dark ? "border-white/[.08]" : "border-black/[.08]"}`}
              >
                <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-amber-400/10 blur-3xl" />
                <div className="relative flex items-start justify-between gap-5">
                  <div className="flex min-w-0 items-start gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${dark ? "border-white/10 bg-white/[.06] text-white" : "border-black/10 bg-neutral-50 text-black"}`}
                    >
                      <UserRound className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3
                          className={`truncate text-xl font-black ${dark ? "text-white" : "text-black"}`}
                        >
                          {selectedLead.contact}
                        </h3>
                        <span
                          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[8px] font-bold ${selectedLead.temperature === "hot" ? "bg-orange-500/10 text-orange-500" : "bg-amber-500/10 text-amber-500"}`}
                        >
                          <Flame className="h-2.5 w-2.5" />
                          {selectedLead.temperature === "hot"
                            ? "Quente"
                            : "Morno"}
                        </span>
                      </div>
                      <p className={`mt-1.5 text-xs ${muted}`}>
                        {selectedLead.instagram ? (
                          <a
                            href={instagramUrl(selectedLead.instagram)}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold underline decoration-current/30 underline-offset-2 transition-opacity hover:opacity-70"
                            title="Abrir perfil no Instagram"
                          >
                            {selectedLead.instagram}
                          </a>
                        ) : (
                          selectedLead.company
                        )}
                        {selectedLead.niche ? ` · ${selectedLead.niche}` : ""}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedLead(null)}
                    className={`rounded-xl border p-2 ${dark ? "border-white/10 text-neutral-400 hover:text-white" : "border-black/10 text-neutral-500 hover:text-black"}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </header>
              <div className="p-6 sm:p-8">
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    [
                      "Faturamento",
                      selectedLead.monthlyRevenueRange ||
                        money(selectedLead.value),
                    ],
                    [
                      "Etapa",
                      stages.find((s) => s.id === selectedLead.stage)?.label ||
                        "Novo lead",
                    ],
                    ["Origem", selectedLead.source || "Não informada"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className={`rounded-2xl border p-4 ${dark ? "border-white/[.07] bg-white/[.025]" : "border-black/[.07] bg-neutral-50"}`}
                    >
                      <div
                        className={`text-[8px] font-bold uppercase tracking-[.16em] ${muted}`}
                      >
                        {label}
                      </div>
                      <div
                        className={`mt-2 text-sm font-black ${dark ? "text-white" : "text-black"}`}
                      >
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                  {[
                    [Mail, "E-mail", selectedLead.email],
                    [Phone, "WhatsApp", selectedLead.phone],
                    [Instagram, "Instagram", selectedLead.instagram],
                    [Tag, "Nicho", selectedLead.niche],
                    [Building2, "Empresa / perfil", selectedLead.company],
                    [Globe2, "Página de origem", selectedLead.pageUrl],
                    [
                      CalendarDays,
                      "Data do envio",
                      dateTime(
                        selectedLead.submittedAt || selectedLead.createdAt,
                      ),
                    ],
                    [
                      CalendarDays,
                      "Próximo contato",
                      selectedLead.nextContact
                        ? new Date(
                            `${selectedLead.nextContact}T12:00:00`,
                          ).toLocaleDateString("pt-BR")
                        : "",
                    ],
                  ].map(([Icon, label, value]) => (
                    <div key={String(label)} className="flex gap-3">
                      <div
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${dark ? "bg-white/[.05] text-neutral-400" : "bg-black/[.04] text-neutral-600"}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div
                          className={`text-[8px] font-bold uppercase tracking-widest ${muted}`}
                        >
                          {label as string}
                        </div>
                        {label === "Instagram" && value ? (
                          <a
                            href={instagramUrl(value as string)}
                            target="_blank"
                            rel="noreferrer"
                            className={`mt-1 inline-flex break-words text-xs font-semibold underline decoration-current/30 underline-offset-2 transition-opacity hover:opacity-65 ${dark ? "text-neutral-200" : "text-neutral-800"}`}
                            title="Abrir perfil no Instagram"
                          >
                            {value as string}
                          </a>
                        ) : (
                          <div
                            className={`mt-1 break-words text-xs font-semibold ${dark ? "text-neutral-200" : "text-neutral-800"}`}
                          >
                            {(value as string) || "Não informado"}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {(selectedLead.interest ||
                  selectedLead.service ||
                  selectedLead.notes) && (
                  <div
                    className={`mt-7 rounded-2xl border p-5 ${dark ? "border-white/[.07] bg-white/[.02]" : "border-black/[.07] bg-neutral-50"}`}
                  >
                    <div
                      className={`text-[8px] font-bold uppercase tracking-[.16em] ${muted}`}
                    >
                      Contexto e interesse
                    </div>
                    <p
                      className={`mt-3 text-sm leading-6 ${dark ? "text-neutral-300" : "text-neutral-700"}`}
                    >
                      {selectedLead.interest || selectedLead.service}
                    </p>
                    {selectedLead.notes && (
                      <p
                        className={`mt-3 border-t pt-3 text-xs leading-5 ${dark ? "border-white/[.07] text-neutral-500" : "border-black/[.07] text-neutral-500"}`}
                      >
                        {selectedLead.notes}
                      </p>
                    )}
                  </div>
                )}
                <div className="mt-7 flex flex-wrap justify-end gap-2">
                  <a
                    href={`mailto:${selectedLead.email}`}
                    className={`rounded-xl border px-4 py-3 text-[9px] font-bold uppercase tracking-wider ${dark ? "border-white/10 text-white" : "border-black/10 text-black"}`}
                  >
                    Enviar e-mail
                  </a>
                  <a
                    href={`https://wa.me/${selectedLead.phone?.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className={`rounded-xl px-4 py-3 text-[9px] font-extrabold uppercase tracking-wider ${dark ? "bg-white text-black" : "keep-white bg-black !text-white"}`}
                  >
                    Abrir WhatsApp
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 20, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 15, opacity: 0 }}
              className={`max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[26px] border p-6 ${surface}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3
                    className={`text-xl font-black ${dark ? "text-white" : "text-black"}`}
                  >
                    Novo lead
                  </h3>
                  <p className={`mt-1 text-xs ${muted}`}>
                    Registre uma oportunidade no pipeline comercial.
                  </p>
                </div>
                <button onClick={() => setModalOpen(false)} className={muted}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ["company", "Empresa *", "text"],
                    ["contact", "Contato *", "text"],
                    ["email", "E-mail", "email"],
                    ["phone", "WhatsApp", "text"],
                    ["service", "Serviço de interesse", "text"],
                    ["value", "Faturamento atual (R$)", "number"],
                    ["nextContact", "Próximo contato", "date"],
                  ] as const
                ).map(([key, label, type]) => (
                  <label key={key} className="space-y-2">
                    <span
                      className={`text-[9px] font-bold uppercase tracking-widest ${muted}`}
                    >
                      {label}
                    </span>
                    <input
                      type={type}
                      value={draft[key]}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          [key]:
                            type === "number"
                              ? Number(e.target.value)
                              : e.target.value,
                        })
                      }
                      className={`h-11 w-full rounded-xl border bg-transparent px-3 text-sm outline-none focus:border-current ${dark ? "border-white/10 text-white" : "border-black/10 text-black"}`}
                    />
                  </label>
                ))}
                <label className="space-y-2">
                  <span
                    className={`text-[9px] font-bold uppercase tracking-widest ${muted}`}
                  >
                    Origem
                  </span>
                  <select
                    value={draft.source}
                    onChange={(e) =>
                      setDraft({ ...draft, source: e.target.value })
                    }
                    className={`h-11 w-full rounded-xl border px-3 text-sm outline-none ${dark ? "border-white/10 bg-[#111113] text-white" : "border-black/10 bg-white text-black"}`}
                  >
                    {[
                      "Instagram",
                      "Indicação",
                      "Outbound",
                      "Evento",
                      "Site",
                      "LinkedIn",
                      "Outro",
                    ].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span
                    className={`text-[9px] font-bold uppercase tracking-widest ${muted}`}
                  >
                    Temperatura
                  </span>
                  <select
                    value={draft.temperature}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        temperature: e.target
                          .value as ProspectLead["temperature"],
                      })
                    }
                    className={`h-11 w-full rounded-xl border px-3 text-sm outline-none ${dark ? "border-white/10 bg-[#111113] text-white" : "border-black/10 bg-white text-black"}`}
                  >
                    <option value="cold">Frio</option>
                    <option value="warm">Morno</option>
                    <option value="hot">Quente</option>
                  </select>
                </label>
                <label className="space-y-2 sm:col-span-2">
                  <span
                    className={`text-[9px] font-bold uppercase tracking-widest ${muted}`}
                  >
                    Observações
                  </span>
                  <textarea
                    value={draft.notes}
                    onChange={(e) =>
                      setDraft({ ...draft, notes: e.target.value })
                    }
                    rows={3}
                    className={`w-full rounded-xl border bg-transparent p-3 text-sm outline-none ${dark ? "border-white/10 text-white" : "border-black/10 text-black"}`}
                  />
                </label>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setModalOpen(false)}
                  className={`rounded-xl px-4 py-3 text-[10px] font-bold uppercase ${muted}`}
                >
                  Cancelar
                </button>
                <button
                  onClick={save}
                  className={`rounded-xl px-5 py-3 text-[10px] font-extrabold uppercase ${dark ? "bg-white text-black" : "bg-black text-white"}`}
                >
                  Adicionar ao pipeline
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
