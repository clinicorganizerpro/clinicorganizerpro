-- Clinic Organizer Pro - persistencia real por clinica
-- Execute no SQL Editor do Supabase antes de testar os CRUDs no frontend.

create extension if not exists pgcrypto;

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  name text not null,
  sku text,
  category text,
  quantity numeric(12,2) not null default 0,
  minimum_quantity numeric(12,2) not null default 0,
  unit text,
  cost numeric(12,2) not null default 0,
  active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'clinics', 'clinic_settings', 'clinic_subscriptions', 'stripe_customers',
    'saas_payments', 'services', 'professionals', 'patients', 'appointments',
    'prescriptions', 'procedure_photos', 'anamneses', 'messages', 'campaigns',
    'notifications', 'incomes', 'expenses', 'transactions', 'invoices',
    'payment_methods', 'clinic_financial_data', 'waitlist', 'availability_snapshots',
    'calendar_settings', 'appointment_slots', 'waitlist_notifications', 'inventory_items'
  ]
  loop
    execute format('alter table public.%I add column if not exists created_by uuid references auth.users(id) on delete set null', table_name);
    execute format('alter table public.%I add column if not exists deleted_at timestamptz', table_name);
  end loop;

  foreach table_name in array array[
    'clinic_settings', 'clinic_subscriptions', 'stripe_customers',
    'saas_payments', 'services', 'professionals', 'patients', 'appointments',
    'prescriptions', 'procedure_photos', 'anamneses', 'messages', 'campaigns',
    'notifications', 'incomes', 'expenses', 'transactions', 'invoices',
    'payment_methods', 'clinic_financial_data', 'waitlist', 'availability_snapshots',
    'calendar_settings', 'appointment_slots', 'waitlist_notifications', 'inventory_items'
  ]
  loop
    execute format('alter table public.%I add column if not exists clinic_id uuid references public.clinics(id) on delete set null', table_name);
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

create or replace function public.current_user_clinic_ids()
returns setof uuid
language sql
stable
set search_path = public
as $$
  select p.clinic_id
  from public.profiles p
  where p.id = auth.uid() and p.clinic_id is not null
  union
  select c.id
  from public.clinics c
  where c.user_id = auth.uid()
$$;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

drop policy if exists "clinics_owner_all" on public.clinics;
drop policy if exists "clinics_clinic_select" on public.clinics;
drop policy if exists "clinics_clinic_insert" on public.clinics;
drop policy if exists "clinics_clinic_update" on public.clinics;
drop policy if exists "clinics_clinic_delete" on public.clinics;

create policy "clinics_clinic_select" on public.clinics
  for select to authenticated
  using (public.is_admin() or id in (select public.current_user_clinic_ids()) or (select auth.uid()) = user_id);

create policy "clinics_clinic_insert" on public.clinics
  for insert to authenticated
  with check (public.is_admin() or (select auth.uid()) = user_id);

create policy "clinics_clinic_update" on public.clinics
  for update to authenticated
  using (public.is_admin() or id in (select public.current_user_clinic_ids()) or (select auth.uid()) = user_id)
  with check (public.is_admin() or id in (select public.current_user_clinic_ids()) or (select auth.uid()) = user_id);

create policy "clinics_clinic_delete" on public.clinics
  for delete to authenticated
  using (public.is_admin() or (select auth.uid()) = user_id);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'clinic_settings', 'clinic_subscriptions', 'stripe_customers',
    'saas_payments', 'services', 'professionals', 'patients', 'appointments',
    'prescriptions', 'procedure_photos', 'anamneses', 'messages', 'campaigns',
    'notifications', 'incomes', 'expenses', 'transactions', 'invoices',
    'payment_methods', 'clinic_financial_data', 'waitlist', 'availability_snapshots',
    'calendar_settings', 'appointment_slots', 'waitlist_notifications', 'inventory_items'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', table_name || '_owner_all', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_clinic_select', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_clinic_insert', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_clinic_update', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_clinic_delete', table_name);

    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_admin() or clinic_id in (select public.current_user_clinic_ids()))',
      table_name || '_clinic_select',
      table_name
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.is_admin() or ((select auth.uid()) = user_id and clinic_id in (select public.current_user_clinic_ids())))',
      table_name || '_clinic_insert',
      table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.is_admin() or clinic_id in (select public.current_user_clinic_ids())) with check (public.is_admin() or clinic_id in (select public.current_user_clinic_ids()))',
      table_name || '_clinic_update',
      table_name
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.is_admin() or clinic_id in (select public.current_user_clinic_ids()))',
      table_name || '_clinic_delete',
      table_name
    );
  end loop;
end;
$$;
