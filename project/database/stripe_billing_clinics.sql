-- Stripe recurring billing columns for Clinic Organizer Pro.
-- Safe to run more than once in Supabase SQL editor.

alter table if exists public.clinics
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists plan text,
  add column if not exists subscription_status text,
  add column if not exists current_period_start timestamptz,
  add column if not exists current_period_end timestamptz,
  add column if not exists trial_ends_at timestamptz;

create index if not exists idx_clinics_stripe_customer_id
  on public.clinics(stripe_customer_id);

create index if not exists idx_clinics_stripe_subscription_id
  on public.clinics(stripe_subscription_id);

create index if not exists idx_clinics_subscription_status
  on public.clinics(subscription_status);
