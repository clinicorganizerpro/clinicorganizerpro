-- Clinic Organizer Pro SaaS - Supabase/Postgres schema
-- Execute este arquivo no SQL Editor do Supabase antes de conectar o frontend.
-- O app usa Supabase Auth; por isso as tabelas de negócio apontam para auth.users(id).

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

-- =========================
-- Auth/Profile/Admin State
-- =========================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  avatar_url text,
  role text not null default 'staff' check (role in ('admin', 'owner', 'doctor', 'reception', 'finance', 'support', 'staff')),
  clinic_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.auth_sessions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  refresh_token_jti_hash text not null,
  access_token_jti text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists auth_sessions_user_id_idx on public.auth_sessions(user_id);
create index if not exists auth_sessions_refresh_token_jti_hash_idx on public.auth_sessions(refresh_token_jti_hash);

-- =========================
-- SaaS/Admin
-- =========================

create table if not exists public.subscription_plans (
  id text primary key default gen_random_uuid()::text,
  name text not null unique,
  description text,
  monthly_price numeric(12,2) not null default 0,
  annual_price numeric(12,2) not null default 0,
  stripe_price_id text unique,
  features jsonb not null default '[]'::jsonb,
  max_users integer not null default 1,
  max_patients integer,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clinics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text references public.subscription_plans(id) on delete set null,
  name text not null,
  email text,
  phone text,
  address text,
  city text,
  state text,
  cnpj text,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text,
  subscription_status text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  status text not null default 'active' check (status in ('active', 'paused', 'inactive')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clinic_settings (
  id text primary key default gen_random_uuid()::text,
  clinic_id uuid not null unique references public.clinics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  clinic_name text,
  clinic_phone text,
  clinic_email text,
  clinic_address text,
  clinic_city text,
  clinic_state text,
  clinic_cnpj text,
  clinic_logo_url text,
  notifications_email boolean not null default true,
  notifications_sms boolean not null default false,
  notifications_whatsapp boolean not null default true,
  notifications_appointment boolean not null default true,
  notifications_payment boolean not null default true,
  team_members_limit integer not null default 1,
  security_two_factor boolean not null default false,
  security_password_reset_required boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table if not exists public.clinic_subscriptions (
  id text primary key default gen_random_uuid()::text,
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text references public.subscription_plans(id) on delete set null,
  stripe_subscription_id text unique,
  status text not null default 'active',
  start_date timestamptz not null default now(),
  end_date timestamptz,
  auto_renew boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stripe_customers (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  clinic_id uuid references public.clinics(id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.saas_payments (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  clinic_id uuid references public.clinics(id) on delete cascade,
  stripe_payment_id text unique,
  amount numeric(12,2) not null,
  currency text not null default 'BRL',
  status text not null default 'pending',
  description text,
  customer_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================
-- Clinic Operations
-- =========================

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  clinic_id uuid references public.clinics(id) on delete cascade,
  name text not null,
  description text,
  price numeric(12,2) not null default 0,
  duration_minutes integer not null default 60,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.professionals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  clinic_id uuid references public.clinics(id) on delete cascade,
  name text not null,
  specialty text,
  email text,
  phone text,
  avatar text,
  color text,
  rating numeric(3,2) not null default 0,
  active boolean not null default true,
  is_active boolean not null default true,
  available_days jsonb not null default '[]'::jsonb,
  start_time time not null default '08:00',
  end_time time not null default '18:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, email)
);

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  clinic_id uuid references public.clinics(id) on delete set null,
  name text not null,
  email text,
  phone text,
  whatsapp text,
  profile_photo text,
  birth_date date,
  cpf text,
  sex text,
  address text,
  zip_code text,
  street text,
  number text,
  complement text,
  neighborhood text,
  city text,
  state text,
  emergency_contact text,
  emergency_relation text,
  emergency_phone text,
  allergies text,
  current_medications text,
  medical_history text,
  notes text,
  observations text,
  last_visit date,
  next_appointment timestamptz,
  status text not null default 'active' check (status in ('active', 'inactive', 'pending')),
  total_spent numeric(12,2) not null default 0,
  procedures jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, email)
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  clinic_id uuid references public.clinics(id) on delete set null,
  patient_id uuid references public.patients(id) on delete set null,
  patient_name text,
  service_id uuid references public.services(id) on delete set null,
  procedure text,
  appointment_date date,
  appointment_time time,
  date date,
  time time,
  end_time time,
  duration integer not null default 60,
  duration_minutes integer not null default 60,
  professional text,
  professional_id uuid references public.professionals(id) on delete set null,
  status text not null default 'scheduled' check (status in ('scheduled', 'confirmed', 'completed', 'cancelled', 'no-show', 'pending')),
  value numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prescriptions (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  clinic_id uuid references public.clinics(id) on delete set null,
  patient_id uuid references public.patients(id) on delete cascade,
  date date not null default current_date,
  medications jsonb not null default '[]'::jsonb,
  instructions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.procedure_photos (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  clinic_id uuid references public.clinics(id) on delete set null,
  patient_id uuid references public.patients(id) on delete cascade,
  procedure_name text,
  photos_before jsonb not null default '[]'::jsonb,
  photos_after jsonb not null default '[]'::jsonb,
  videos_before jsonb not null default '[]'::jsonb,
  videos_after jsonb not null default '[]'::jsonb,
  video_url text,
  observations text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.anamneses (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  clinic_id uuid references public.clinics(id) on delete set null,
  patient_id uuid references public.patients(id) on delete cascade,
  date date,
  main_complaint text,
  medical_history text,
  allergies text,
  current_medications text,
  family_history text,
  social_history text,
  previous_surgeries text,
  vital_signs jsonb not null default '{}'::jsonb,
  observations text,
  facial_assessment jsonb not null default '{}'::jsonb,
  esthetic_procedures jsonb not null default '[]'::jsonb,
  procedure_details jsonb not null default '{}'::jsonb,
  clinical_notes text,
  aesthetic_photos_before jsonb not null default '[]'::jsonb,
  aesthetic_photos_after jsonb not null default '[]'::jsonb,
  digital_signature text,
  signature_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================
-- Marketing/Notifications
-- =========================

create table if not exists public.messages (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  clinic_id uuid references public.clinics(id) on delete set null,
  patient_id uuid references public.patients(id) on delete set null,
  patient_name text,
  message text,
  template_type text,
  status text not null default 'pending' check (status in ('sent', 'pending', 'failed')),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  clinic_id uuid references public.clinics(id) on delete set null,
  name text,
  template_type text,
  message text,
  audience text not null default 'all' check (audience in ('all', 'inactive', 'recent', 'vip')),
  status text not null default 'draft' check (status in ('draft', 'sent', 'scheduled')),
  sent_count integer not null default 0,
  open_count integer not null default 0,
  patient_ids jsonb not null default '[]'::jsonb,
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  clinic_id uuid references public.clinics(id) on delete set null,
  type text not null default 'event',
  category text not null default 'system',
  title text,
  message text,
  read boolean not null default false,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  related_id text,
  related_type text,
  action_url text,
  icon text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================
-- Financial
-- =========================

create table if not exists public.incomes (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  clinic_id uuid references public.clinics(id) on delete set null,
  patient_id uuid references public.patients(id) on delete set null,
  patient_name text,
  service text,
  payment_method text not null default 'pix' check (payment_method in ('pix', 'cartao', 'dinheiro', 'stripe')),
  amount numeric(12,2) not null default 0,
  status text not null default 'pending' check (status in ('paid', 'pending')),
  attendance_date date,
  observations text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  clinic_id uuid references public.clinics(id) on delete set null,
  description text,
  category text not null default 'variavel' check (category in ('fixa', 'variavel')),
  amount numeric(12,2) not null default 0,
  date date,
  payment_method text not null default 'pix' check (payment_method in ('pix', 'cartao', 'dinheiro', 'transferencia', 'outro')),
  status text not null default 'pending' check (status in ('paid', 'pending')),
  observations text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  clinic_id uuid references public.clinics(id) on delete set null,
  description text,
  category text,
  type text check (type in ('income', 'expense')),
  amount numeric(12,2) not null default 0,
  currency text not null default 'BRL',
  transaction_date date not null default current_date,
  due_date date,
  paid_date date,
  status text not null default 'pending',
  payment_method text,
  patient_id uuid references public.patients(id) on delete set null,
  patient_name text,
  procedure text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  clinic_id uuid references public.clinics(id) on delete set null,
  invoice_number text unique,
  patient_id uuid references public.patients(id) on delete set null,
  patient_name text,
  issue_date date not null default current_date,
  due_date date,
  paid_date date,
  total_amount numeric(12,2) not null default 0,
  paid_amount numeric(12,2) not null default 0,
  status text not null default 'issued',
  description text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_methods (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  clinic_id uuid references public.clinics(id) on delete set null,
  type text,
  name text,
  card_last_four text,
  card_brand text,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clinic_financial_data (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  clinic_id uuid references public.clinics(id) on delete cascade,
  to_receive numeric(12,2) not null default 0,
  received numeric(12,2) not null default 0,
  pending numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================
-- Agenda Advanced
-- =========================

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  clinic_id uuid references public.clinics(id) on delete set null,
  patient_id uuid references public.patients(id) on delete cascade,
  professional_id uuid references public.professionals(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  preferred_date_start date,
  preferred_date_end date,
  preferred_time time,
  notes text,
  position integer,
  contact_phone text,
  contact_email text,
  notification_sent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.availability_snapshots (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  professional_id uuid references public.professionals(id) on delete cascade,
  snapshot_date date,
  total_slots integer not null default 0,
  available_slots integer not null default 0,
  urgency_level text,
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.calendar_settings (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  professional_id uuid not null unique references public.professionals(id) on delete cascade,
  slot_interval_minutes integer not null default 30,
  buffer_between_appointments integer not null default 10,
  max_daily_appointments integer not null default 20,
  show_weekends boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.appointment_slots (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete cascade,
  professional_id uuid references public.professionals(id) on delete set null,
  slot_date date,
  slot_start time,
  slot_end time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.waitlist_notifications (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  waitlist_id uuid references public.waitlist(id) on delete cascade,
  patient_id uuid references public.patients(id) on delete set null,
  professional_id uuid references public.professionals(id) on delete set null,
  notification_type text,
  message text,
  sent_at timestamptz not null default now(),
  read_at timestamptz,
  conversion_success boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================
-- Indexes
-- =========================

create index if not exists idx_profiles_clinic_id on public.profiles(clinic_id);
create index if not exists idx_admin_state_user_id on public.admin_state(user_id);
create index if not exists idx_clinics_user_id on public.clinics(user_id);
create index if not exists idx_clinics_plan_id on public.clinics(plan_id);
create index if not exists idx_clinics_stripe_customer_id on public.clinics(stripe_customer_id);
create index if not exists idx_clinics_stripe_subscription_id on public.clinics(stripe_subscription_id);
create index if not exists idx_clinics_subscription_status on public.clinics(subscription_status);
create index if not exists idx_services_user_id on public.services(user_id);
create index if not exists idx_services_clinic_id on public.services(clinic_id);
create index if not exists idx_inventory_items_user_id on public.inventory_items(user_id);
create index if not exists idx_inventory_items_clinic_id on public.inventory_items(clinic_id);
create index if not exists idx_professionals_user_id on public.professionals(user_id);
create index if not exists idx_professionals_clinic_id on public.professionals(clinic_id);
create index if not exists idx_patients_user_id on public.patients(user_id);
create index if not exists idx_patients_clinic_id on public.patients(clinic_id);
create index if not exists idx_patients_name on public.patients using gin (to_tsvector('portuguese', coalesce(name, '')));
create index if not exists idx_appointments_user_id on public.appointments(user_id);
create index if not exists idx_appointments_clinic_id on public.appointments(clinic_id);
create index if not exists idx_appointments_patient_id on public.appointments(patient_id);
create index if not exists idx_appointments_date on public.appointments(date, appointment_date);
create index if not exists idx_prescriptions_user_id on public.prescriptions(user_id);
create index if not exists idx_procedure_photos_user_id on public.procedure_photos(user_id);
create index if not exists idx_anamneses_user_id on public.anamneses(user_id);
create index if not exists idx_messages_user_id on public.messages(user_id);
create index if not exists idx_campaigns_user_id on public.campaigns(user_id);
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_read on public.notifications(user_id, read);
create index if not exists idx_incomes_user_id on public.incomes(user_id);
create index if not exists idx_expenses_user_id on public.expenses(user_id);
create index if not exists idx_transactions_user_id on public.transactions(user_id);
create index if not exists idx_invoices_user_id on public.invoices(user_id);
create index if not exists idx_payment_methods_user_id on public.payment_methods(user_id);
create index if not exists idx_stripe_customers_user_id on public.stripe_customers(user_id);
create index if not exists idx_saas_payments_user_id on public.saas_payments(user_id);
create index if not exists idx_waitlist_user_id on public.waitlist(user_id);

-- =========================
-- Updated_at triggers
-- =========================

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'admin_state', 'auth_sessions', 'subscription_plans', 'clinics', 'clinic_settings',
    'inventory_items',
    'clinic_subscriptions', 'saas_payments', 'services', 'professionals', 'patients',
    'appointments', 'prescriptions', 'procedure_photos', 'anamneses', 'messages',
    'campaigns', 'notifications', 'incomes', 'expenses', 'transactions', 'invoices',
    'payment_methods', 'clinic_financial_data', 'waitlist', 'availability_snapshots',
    'calendar_settings', 'appointment_slots', 'waitlist_notifications'
  ]
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format(
      'create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name,
      table_name
    );
  end loop;
end;
$$;

-- =========================
-- RLS helpers/policies
-- =========================

alter table public.profiles enable row level security;
alter table public.admin_state enable row level security;
alter table public.auth_sessions enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.clinics enable row level security;
alter table public.clinic_settings enable row level security;
alter table public.inventory_items enable row level security;
alter table public.clinic_subscriptions enable row level security;
alter table public.stripe_customers enable row level security;
alter table public.saas_payments enable row level security;
alter table public.services enable row level security;
alter table public.professionals enable row level security;
alter table public.patients enable row level security;
alter table public.appointments enable row level security;
alter table public.prescriptions enable row level security;
alter table public.procedure_photos enable row level security;
alter table public.anamneses enable row level security;
alter table public.messages enable row level security;
alter table public.campaigns enable row level security;
alter table public.notifications enable row level security;
alter table public.incomes enable row level security;
alter table public.expenses enable row level security;
alter table public.transactions enable row level security;
alter table public.invoices enable row level security;
alter table public.payment_methods enable row level security;
alter table public.clinic_financial_data enable row level security;
alter table public.waitlist enable row level security;
alter table public.availability_snapshots enable row level security;
alter table public.calendar_settings enable row level security;
alter table public.appointment_slots enable row level security;
alter table public.waitlist_notifications enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.subscription_plans to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

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
end;
$$;

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
    execute format('alter table public.%I add column if not exists clinic_id uuid references public.clinics(id) on delete set null', table_name);
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

drop policy if exists "profiles_owner_select" on public.profiles;
create policy "profiles_owner_select" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id or public.is_admin());

drop policy if exists "profiles_owner_insert" on public.profiles;
create policy "profiles_owner_insert" on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id or public.is_admin());

drop policy if exists "profiles_owner_update" on public.profiles;
create policy "profiles_owner_update" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id or public.is_admin())
  with check ((select auth.uid()) = id or public.is_admin());

drop policy if exists "admin_state_owner_all" on public.admin_state;
create policy "admin_state_owner_all" on public.admin_state
  for all to authenticated
  using ((select auth.uid()) = user_id or public.is_admin())
  with check ((select auth.uid()) = user_id or public.is_admin());

drop policy if exists "subscription_plans_read_all" on public.subscription_plans;
create policy "subscription_plans_read_all" on public.subscription_plans
  for select to anon, authenticated
  using (active = true or public.is_admin());

drop policy if exists "subscription_plans_admin_write" on public.subscription_plans;
create policy "subscription_plans_admin_write" on public.subscription_plans
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

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

-- =========================
-- Optional seed data
-- =========================

insert into public.subscription_plans (id, name, monthly_price, annual_price, description, features, max_users, max_patients, active)
values
  ('plan-essencial', 'Essencial', 29.90, 299.00, 'Plano de entrada para clínicas que precisam do essencial.', '["Até 50 pacientes", "Painel básico", "1 usuário"]'::jsonb, 1, 50, true),
  ('plan-profissional', 'Profissional', 79.90, 799.00, 'Plano para clínicas em crescimento.', '["Até 500 pacientes", "Todos os recursos", "3 usuários", "Suporte prioritário"]'::jsonb, 3, 500, true),
  ('plan-clinica-pro', 'Clínica Pro', 199.90, 1990.00, 'Plano completo para operações avançadas.', '["Pacientes ilimitados", "API access", "10 usuários", "Suporte 24/7", "Integrações avançadas"]'::jsonb, 10, null, true)
on conflict (id) do update set
  name = excluded.name,
  monthly_price = excluded.monthly_price,
  annual_price = excluded.annual_price,
  description = excluded.description,
  features = excluded.features,
  max_users = excluded.max_users,
  max_patients = excluded.max_patients,
  active = excluded.active,
  updated_at = now();
