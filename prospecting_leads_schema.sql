-- Módulo de Prospecção Leadium. Execute no SQL Editor do Supabase.
create table if not exists public.leadium_prospecting_leads (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  contact text not null,
  email text,
  phone text,
  instagram text,
  niche text,
  monthly_revenue_range text,
  event_name text,
  service text,
  source text not null default 'Outro',
  interest text,
  form_name text,
  page_url text,
  submitted_at timestamptz,
  device text,
  raw_payload jsonb not null default '{}'::jsonb,
  estimated_value numeric(14,2) not null default 0 check (estimated_value >= 0),
  stage text not null default 'new' check (stage in ('new','qualification','meeting','proposal')),
  temperature text not null default 'warm' check (temperature in ('cold','warm','hot')),
  next_contact date,
  notes text,
  owner_email text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migração idempotente: adiciona os campos do formulário caso a tabela já exista.
alter table public.leadium_prospecting_leads add column if not exists instagram text;
alter table public.leadium_prospecting_leads add column if not exists niche text;
alter table public.leadium_prospecting_leads add column if not exists monthly_revenue_range text;
alter table public.leadium_prospecting_leads add column if not exists event_name text;
alter table public.leadium_prospecting_leads add column if not exists interest text;
alter table public.leadium_prospecting_leads add column if not exists form_name text;
alter table public.leadium_prospecting_leads add column if not exists page_url text;
alter table public.leadium_prospecting_leads add column if not exists submitted_at timestamptz;
alter table public.leadium_prospecting_leads add column if not exists device text;
alter table public.leadium_prospecting_leads add column if not exists raw_payload jsonb not null default '{}'::jsonb;

create index if not exists leadium_prospecting_leads_stage_idx on public.leadium_prospecting_leads(stage);
create index if not exists leadium_prospecting_leads_next_contact_idx on public.leadium_prospecting_leads(next_contact);
create index if not exists leadium_prospecting_leads_owner_idx on public.leadium_prospecting_leads(owner_email);
create index if not exists leadium_prospecting_leads_source_idx on public.leadium_prospecting_leads(source);
create index if not exists leadium_prospecting_leads_submitted_at_idx on public.leadium_prospecting_leads(submitted_at desc);

create or replace function public.set_leadium_prospecting_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists leadium_prospecting_updated_at on public.leadium_prospecting_leads;
create trigger leadium_prospecting_updated_at before update on public.leadium_prospecting_leads
for each row execute function public.set_leadium_prospecting_updated_at();

alter table public.leadium_prospecting_leads enable row level security;
drop policy if exists "Authenticated users manage prospecting leads" on public.leadium_prospecting_leads;

-- Dados pessoais são acessados exclusivamente pelo backend com service_role.
-- Nenhum lead fica disponível diretamente para anon/authenticated na Data API.
revoke all on public.leadium_prospecting_leads from public, anon, authenticated;
grant all on public.leadium_prospecting_leads to service_role;
