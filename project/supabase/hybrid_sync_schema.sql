create extension if not exists "pgcrypto";

create table if not exists public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  sync_status text not null default 'synced',
  last_synced_at timestamptz
);

create table if not exists public.users_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  email text not null,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  sync_status text not null default 'synced',
  last_synced_at timestamptz
);

create table if not exists public.patients (
  id text primary key,
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  sync_status text not null default 'synced',
  last_synced_at timestamptz
);

create table if not exists public.appointments (like public.patients including all);
create table if not exists public.financial_transactions (like public.patients including all);
create table if not exists public.professionals (like public.patients including all);
create table if not exists public.services (like public.patients including all);
create table if not exists public.anamnesis (like public.patients including all);
create table if not exists public.notifications (like public.patients including all);
create table if not exists public.settings (like public.patients including all);

create table if not exists public.sync_conflicts (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid,
  table_name text not null,
  record_id text not null,
  local_data jsonb,
  remote_data jsonb,
  reason text not null,
  created_at timestamptz not null default now()
);

alter table public.clinics add column if not exists deleted_at timestamptz;
alter table public.clinics add column if not exists sync_status text not null default 'synced';
alter table public.clinics add column if not exists last_synced_at timestamptz;
alter table public.users_profiles add column if not exists deleted_at timestamptz;
alter table public.users_profiles add column if not exists sync_status text not null default 'synced';
alter table public.users_profiles add column if not exists last_synced_at timestamptz;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'patients','appointments','financial_transactions','professionals','services',
    'anamnesis','notifications','settings'
  ] loop
    execute format('alter table public.%I add column if not exists deleted_at timestamptz', table_name);
    execute format('alter table public.%I add column if not exists sync_status text not null default ''synced''', table_name);
    execute format('alter table public.%I add column if not exists last_synced_at timestamptz', table_name);
    execute format('alter table public.%I add column if not exists data jsonb not null default ''{}''::jsonb', table_name);
  end loop;
end $$;

alter table public.clinics enable row level security;
alter table public.users_profiles enable row level security;
alter table public.patients enable row level security;
alter table public.appointments enable row level security;
alter table public.financial_transactions enable row level security;
alter table public.professionals enable row level security;
alter table public.services enable row level security;
alter table public.anamnesis enable row level security;
alter table public.notifications enable row level security;
alter table public.settings enable row level security;
alter table public.sync_conflicts enable row level security;

create or replace function public.user_clinic_ids()
returns setof uuid
language sql
security invoker
stable
as $$
  select clinic_id from public.users_profiles where id = (select auth.uid()) and deleted_at is null
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'patients','appointments','financial_transactions','professionals','services',
    'anamnesis','notifications','settings','sync_conflicts'
  ] loop
    execute format('drop policy if exists "%1$s select own clinic" on public.%1$I', table_name);
    execute format('create policy "%1$s select own clinic" on public.%1$I for select to authenticated using (clinic_id in (select public.user_clinic_ids()))', table_name);
    execute format('drop policy if exists "%1$s insert own clinic" on public.%1$I', table_name);
    execute format('create policy "%1$s insert own clinic" on public.%1$I for insert to authenticated with check (clinic_id in (select public.user_clinic_ids()))', table_name);
    execute format('drop policy if exists "%1$s update own clinic" on public.%1$I', table_name);
    execute format('create policy "%1$s update own clinic" on public.%1$I for update to authenticated using (clinic_id in (select public.user_clinic_ids())) with check (clinic_id in (select public.user_clinic_ids()))', table_name);
  end loop;
end $$;

drop policy if exists "profiles self select" on public.users_profiles;
create policy "profiles self select" on public.users_profiles for select to authenticated using (id = (select auth.uid()) or clinic_id in (select public.user_clinic_ids()));
drop policy if exists "profiles self insert" on public.users_profiles;
create policy "profiles self insert" on public.users_profiles for insert to authenticated with check (id = (select auth.uid()));
drop policy if exists "profiles self update" on public.users_profiles;
create policy "profiles self update" on public.users_profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "clinics member select" on public.clinics;
create policy "clinics member select" on public.clinics for select to authenticated using (id in (select public.user_clinic_ids()));
drop policy if exists "clinics bootstrap insert" on public.clinics;
create policy "clinics bootstrap insert" on public.clinics for insert to authenticated with check (true);
drop policy if exists "clinics member update" on public.clinics;
create policy "clinics member update" on public.clinics for update to authenticated using (id in (select public.user_clinic_ids())) with check (id in (select public.user_clinic_ids()));
