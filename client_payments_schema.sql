-- Leadium CRM: recebimentos e parcelas de clientes
-- Requer public.leadium_clients e, opcionalmente, leadium_client_implementations.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.leadium_client_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.leadium_clients(id) ON DELETE CASCADE,
  implementation_id UUID REFERENCES public.leadium_client_implementations(id) ON DELETE SET NULL,
  payment_type TEXT NOT NULL
    CHECK (payment_type IN ('recurring', 'implementation')),
  installment_number INTEGER NOT NULL DEFAULT 1 CHECK (installment_number > 0),
  total_installments INTEGER NOT NULL DEFAULT 1 CHECK (total_installments > 0),
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  due_date DATE,
  paid_at DATE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  transaction_id UUID REFERENCES public.leadium_transactions(id) ON DELETE SET NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_installment_position CHECK (installment_number <= total_installments),
  CONSTRAINT paid_payment_has_date CHECK (status <> 'paid' OR paid_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_leadium_client_payments_client
  ON public.leadium_client_payments(client_id);
CREATE INDEX IF NOT EXISTS idx_leadium_client_payments_status_due
  ON public.leadium_client_payments(status, due_date);
CREATE INDEX IF NOT EXISTS idx_leadium_client_payments_type
  ON public.leadium_client_payments(payment_type);

CREATE OR REPLACE FUNCTION public.set_leadium_client_payment_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leadium_client_payment_updated_at
  ON public.leadium_client_payments;
CREATE TRIGGER trg_leadium_client_payment_updated_at
BEFORE UPDATE ON public.leadium_client_payments
FOR EACH ROW EXECUTE FUNCTION public.set_leadium_client_payment_updated_at();

ALTER TABLE public.leadium_client_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select on leadium_client_payments" ON public.leadium_client_payments;
DROP POLICY IF EXISTS "Allow public insert on leadium_client_payments" ON public.leadium_client_payments;
DROP POLICY IF EXISTS "Allow public update on leadium_client_payments" ON public.leadium_client_payments;
DROP POLICY IF EXISTS "Allow public delete on leadium_client_payments" ON public.leadium_client_payments;

CREATE POLICY "Allow public select on leadium_client_payments"
  ON public.leadium_client_payments FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert on leadium_client_payments"
  ON public.leadium_client_payments FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update on leadium_client_payments"
  ON public.leadium_client_payments FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on leadium_client_payments"
  ON public.leadium_client_payments FOR DELETE TO public USING (true);
