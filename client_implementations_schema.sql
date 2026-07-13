-- Leadium CRM: projetos de implementação vinculados aos clientes
-- Pode ser executado mais de uma vez no SQL Editor do Supabase.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.leadium_client_implementations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL UNIQUE
    REFERENCES public.leadium_clients(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'review', 'completed', 'paused')),
  fee NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (fee >= 0),
  start_date DATE,
  deadline DATE,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT implementation_deadline_after_start
    CHECK (deadline IS NULL OR start_date IS NULL OR deadline >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_leadium_implementations_status
  ON public.leadium_client_implementations(status);
CREATE INDEX IF NOT EXISTS idx_leadium_implementations_deadline
  ON public.leadium_client_implementations(deadline);

CREATE OR REPLACE FUNCTION public.set_leadium_implementation_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leadium_implementation_updated_at
  ON public.leadium_client_implementations;
CREATE TRIGGER trg_leadium_implementation_updated_at
BEFORE UPDATE ON public.leadium_client_implementations
FOR EACH ROW EXECUTE FUNCTION public.set_leadium_implementation_updated_at();

ALTER TABLE public.leadium_client_implementations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select on leadium_client_implementations"
  ON public.leadium_client_implementations;
DROP POLICY IF EXISTS "Allow public insert on leadium_client_implementations"
  ON public.leadium_client_implementations;
DROP POLICY IF EXISTS "Allow public update on leadium_client_implementations"
  ON public.leadium_client_implementations;
DROP POLICY IF EXISTS "Allow public delete on leadium_client_implementations"
  ON public.leadium_client_implementations;

CREATE POLICY "Allow public select on leadium_client_implementations"
  ON public.leadium_client_implementations FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert on leadium_client_implementations"
  ON public.leadium_client_implementations FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update on leadium_client_implementations"
  ON public.leadium_client_implementations FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on leadium_client_implementations"
  ON public.leadium_client_implementations FOR DELETE TO public USING (true);
