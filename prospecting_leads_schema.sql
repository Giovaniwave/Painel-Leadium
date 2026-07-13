-- Módulo de Prospecção Leadium. Execute no SQL Editor do Supabase.
create table if not exists public.leadium_prospecting_leads (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  contact text not null,
  email text,
  phone text,
  service text,
  source text not null default 'Outro',
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

create index if not exists leadium_prospecting_leads_stage_idx on public.leadium_prospecting_leads(stage);
create index if not exists leadium_prospecting_leads_next_contact_idx on public.leadium_prospecting_leads(next_contact);
create index if not exists leadium_prospecting_leads_owner_idx on public.leadium_prospecting_leads(owner_email);

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
create policy "Authenticated users manage prospecting leads" on public.leadium_prospecting_leads
for all to authenticated
using (owner_email is null or owner_email = auth.jwt() ->> 'email')
with check (owner_email is null or owner_email = auth.jwt() ->> 'email');
