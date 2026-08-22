-- Leadium CRM: integração Asaas (cobranças e assinaturas de clientes)
-- Requer public.leadium_clients, public.leadium_client_payments e public.leadium_transactions já existentes.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Cliente Asaas: documento e id do customer vinculado
ALTER TABLE public.leadium_clients
  ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT,
  ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;

-- 2. Parcela/cobrança: rastreio da cobrança/assinatura Asaas correspondente
ALTER TABLE public.leadium_client_payments
  ADD COLUMN IF NOT EXISTS asaas_charge_id TEXT,
  ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS billing_type TEXT,
  ADD COLUMN IF NOT EXISTS invoice_url TEXT;

CREATE INDEX IF NOT EXISTS idx_leadium_client_payments_asaas_charge
  ON public.leadium_client_payments(asaas_charge_id);

-- 3. Transação: evita lançar a mesma cobrança confirmada duas vezes no livro-caixa
ALTER TABLE public.leadium_transactions
  ADD COLUMN IF NOT EXISTS asaas_charge_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_leadium_transactions_asaas_charge
  ON public.leadium_transactions(asaas_charge_id)
  WHERE asaas_charge_id IS NOT NULL;

-- 4. Log/idempotência dos eventos de webhook recebidos do Asaas
CREATE TABLE IF NOT EXISTS public.leadium_asaas_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asaas_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  payment_id TEXT,
  raw_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leadium_asaas_webhook_events_payment
  ON public.leadium_asaas_webhook_events(payment_id);

ALTER TABLE public.leadium_asaas_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select on leadium_asaas_webhook_events" ON public.leadium_asaas_webhook_events;
DROP POLICY IF EXISTS "Allow public insert on leadium_asaas_webhook_events" ON public.leadium_asaas_webhook_events;

CREATE POLICY "Allow public select on leadium_asaas_webhook_events"
  ON public.leadium_asaas_webhook_events FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert on leadium_asaas_webhook_events"
  ON public.leadium_asaas_webhook_events FOR INSERT TO public WITH CHECK (true);
