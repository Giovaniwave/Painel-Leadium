// Cliente HTTP fino para a API do Asaas (gateway de pagamentos).
// Docs: https://docs.asaas.com/reference

// Alguns painéis de hospedagem salvam variáveis de ambiente com aspas
// literais incluídas no valor (ex: ASAAS_ENV vira `"production"` em vez de
// `production`). Isso já causou um bug silencioso — o app caía pra sandbox
// mesmo com ASAAS_ENV=production configurado. Tira aspas acidentais na borda.
export function cleanEnvValue(value: string | undefined): string {
  if (!value) return "";
  let v = value.trim();
  if (
    v.length >= 2 &&
    ((v[0] === '"' && v[v.length - 1] === '"') ||
      (v[0] === "'" && v[v.length - 1] === "'"))
  ) {
    v = v.slice(1, -1);
  }
  // O mesmo painel também escapa um `$` solto com uma barra invertida
  // (provável proteção contra injeção) — desfaz isso também.
  v = v.replace(/\\\$/g, "$");
  return v;
}

function baseUrl() {
  return cleanEnvValue(process.env.ASAAS_ENV) === "production"
    ? "https://api.asaas.com/v3"
    : "https://api-sandbox.asaas.com/v3";
}

async function asaasFetch(path: string, options: RequestInit = {}) {
  const apiKey = cleanEnvValue(process.env.ASAAS_API_KEY);
  if (!apiKey) {
    throw new Error("ASAAS_API_KEY não configurada no .env");
  }
  const res = await fetch(`${baseUrl()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey,
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}) as any);
  if (!res.ok) {
    const message =
      data?.errors?.[0]?.description ||
      data?.message ||
      `Asaas API error (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export interface AsaasCustomer {
  id: string;
  name: string;
  cpfCnpj: string;
  email?: string;
  phone?: string;
  externalReference?: string;
}

export interface AsaasPayment {
  id: string;
  customer: string;
  subscription?: string;
  value: number;
  netValue?: number;
  status: string;
  dueDate: string;
  billingType: string;
  invoiceUrl: string;
  externalReference?: string;
  description?: string;
}

export interface AsaasSubscription {
  id: string;
  customer: string;
  value: number;
  status: string;
  nextDueDate: string;
  cycle: string;
  billingType: string;
  externalReference?: string;
}

export async function createCustomer(params: {
  name: string;
  cpfCnpj: string;
  email?: string;
  phone?: string;
  externalReference?: string;
}): Promise<AsaasCustomer> {
  return asaasFetch("/customers", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function createPayment(params: {
  customer: string;
  value: number;
  dueDate: string;
  description?: string;
  billingType?: "PIX" | "BOLETO" | "CREDIT_CARD" | "UNDEFINED";
  externalReference?: string;
}): Promise<AsaasPayment> {
  return asaasFetch("/payments", {
    method: "POST",
    body: JSON.stringify({ billingType: "UNDEFINED", ...params }),
  });
}

export async function createSubscription(params: {
  customer: string;
  value: number;
  nextDueDate: string;
  cycle?:
    | "WEEKLY"
    | "BIWEEKLY"
    | "MONTHLY"
    | "BIMONTHLY"
    | "QUARTERLY"
    | "SEMIANNUALLY"
    | "YEARLY";
  description?: string;
  billingType?: "PIX" | "BOLETO" | "CREDIT_CARD" | "UNDEFINED";
  externalReference?: string;
}): Promise<AsaasSubscription> {
  return asaasFetch("/subscriptions", {
    method: "POST",
    body: JSON.stringify({ billingType: "UNDEFINED", cycle: "MONTHLY", ...params }),
  });
}

export async function getPayment(id: string): Promise<AsaasPayment> {
  return asaasFetch(`/payments/${id}`);
}
