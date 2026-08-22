-- Corrige "permission denied for table leadium_client_payments" em produção.
-- Tabelas criadas via SQL direto não recebem GRANT automático pros papéis
-- que a aplicação usa (anon/authenticated/service_role) — só as policies de
-- RLS, que checam DEPOIS do GRANT. Sem o GRANT de base, dá permission denied
-- mesmo com a policy certa.

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.leadium_client_payments
  TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.leadium_asaas_webhook_events
  TO anon, authenticated, service_role;

-- Garante que futuras tabelas criadas no schema public também recebam esses
-- grants automaticamente, evitando repetir esse problema.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;
