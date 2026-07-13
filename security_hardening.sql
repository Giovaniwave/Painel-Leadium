-- Leadium CRM — endurecimento de segurança do Supabase
-- Execute no SQL Editor APÓS todos os demais schemas.
-- O CRM acessa estas relações somente pelo backend usando service_role.

begin;

-- Corrige o alerta "Security Definer View" e faz a view obedecer RLS.
alter view if exists public.leadium_monthly_metrics
  set (security_invoker = true, security_barrier = true);

-- Remove políticas que concedem acesso direto a public/anon/authenticated.
do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and roles && array['public', 'anon', 'authenticated']::name[]
      and tablename = any(array[
        'leadium_transactions', 'leadium_budget_goals', 'system_settings',
        'leadium_users', 'leadium_clients', 'leadium_growth_metrics',
        'leadium_employees', 'leadium_vehicles', 'leadium_displacements',
        'leadium_general_expenses', 'leadium_reimbursements',
        'leadium_client_implementations', 'leadium_client_payments',
        'leadium_prospecting_leads'
      ])
  loop
    execute format('drop policy if exists %I on %I.%I',
      policy_row.policyname, policy_row.schemaname, policy_row.tablename);
  end loop;
end $$;

-- Bloqueia a Data API pública e libera somente o backend. Relações ausentes são ignoradas.
do $$
declare
  relation_name text;
  sensitive_relations constant text[] := array[
    'leadium_transactions', 'leadium_budget_goals', 'system_settings',
    'leadium_users', 'leadium_clients', 'leadium_growth_metrics',
    'leadium_employees', 'leadium_vehicles', 'leadium_displacements',
    'leadium_general_expenses', 'leadium_reimbursements',
    'leadium_client_implementations', 'leadium_client_payments',
    'leadium_prospecting_leads', 'leadium_monthly_metrics'
  ];
begin
  foreach relation_name in array sensitive_relations loop
    if to_regclass(format('public.%I', relation_name)) is not null then
      execute format('revoke all on table public.%I from public, anon, authenticated', relation_name);
      if relation_name = 'leadium_monthly_metrics' then
        execute format('grant select on table public.%I to service_role', relation_name);
      else
        execute format('grant all on table public.%I to service_role', relation_name);
      end if;
    end if;
  end loop;
end $$;

-- Defesa adicional para novas tabelas criadas pelo usuário que executa a migração.
alter default privileges in schema public revoke all on tables from public, anon, authenticated;
alter default privileges in schema public revoke all on sequences from public, anon, authenticated;

commit;
