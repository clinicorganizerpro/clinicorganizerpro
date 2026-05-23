import Stripe from 'stripe';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getStripeConfig } from './configStore.js';

type BillingPlanKey = 'essencial' | 'pro' | 'clinic';

export type BillingSubscription = {
  clinicId: string;
  plan: BillingPlanKey | string | null;
  planId: string | null;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
};

const readEnv = (...names: string[]) => {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }

  return '';
};

const getSupabaseUrl = () => readEnv('SUPABASE_URL', 'VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL');
const getSupabaseServiceKey = () =>
  readEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_KEY');

let cachedSupabaseAdmin: SupabaseClient | null = null;
let cachedStripe: Stripe | null = null;
let cachedStripeKey = '';

export const getSupabaseAdmin = () => {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceKey();

  if (!url || !key) return null;
  if (!cachedSupabaseAdmin) {
    cachedSupabaseAdmin = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  return cachedSupabaseAdmin;
};

export const getStripeWebhookSecret = async () => {
  const stored = await getStripeConfig().catch(() => null);
  return readEnv('STRIPE_WEBHOOK_SECRET') || stored?.stripeWebhookSecret || '';
};

export const getStripeClient = async () => {
  const stored = await getStripeConfig().catch(() => null);
  const key = readEnv('STRIPE_SECRET_KEY') || stored?.stripeSecretKey || '';

  if (!key) return null;
  if (!cachedStripe || cachedStripeKey !== key) {
    cachedStripe = new Stripe(key, {
      apiVersion: '2026-02-25.clover' as never,
    });
    cachedStripeKey = key;
  }

  return cachedStripe;
};

export const planIdToKey = (planId: string): BillingPlanKey => {
  const normalized = planId.trim().toLowerCase();

  if (normalized.includes('clinic') || normalized.includes('clinica')) return 'clinic';
  if (normalized.includes('pro') || normalized.includes('profissional')) return 'pro';
  return 'essencial';
};

const timestampToIso = (value?: number | null) => (value ? new Date(value * 1000).toISOString() : null);

const getPriceIdFromEnv = (planId: string) => {
  const key = planIdToKey(planId);

  const envByPlan: Record<BillingPlanKey, string[]> = {
    essencial: ['STRIPE_PRICE_ESSENCIAL', 'STRIPE_PRICE_ESSENTIAL', 'VITE_STRIPE_PRICE_ESSENCIAL'],
    pro: ['STRIPE_PRICE_PRO', 'STRIPE_PRICE_PROFISSIONAL', 'VITE_STRIPE_PRICE_PRO'],
    clinic: ['STRIPE_PRICE_CLINIC', 'STRIPE_PRICE_CLINICA', 'STRIPE_PRICE_CLINICA_PRO', 'VITE_STRIPE_PRICE_CLINIC'],
  };

  return readEnv(...envByPlan[key]);
};

export const getStripePriceIdForPlan = async (planId: string) => {
  const fromEnv = getPriceIdFromEnv(planId);
  if (fromEnv) return fromEnv;

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return '';

  const { data } = await supabaseAdmin
    .from('subscription_plans')
    .select('stripe_price_id')
    .eq('id', planId)
    .maybeSingle();

  return typeof data?.stripe_price_id === 'string' ? data.stripe_price_id : '';
};

export const findClinicForBilling = async (params: {
  userId: string;
  role: string;
  clinicId?: string;
  requestedClinicId?: string;
}) => {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    throw new Error('Supabase service role não configurado no backend.');
  }

  const clinicId = params.role === 'admin' ? params.requestedClinicId || params.clinicId : params.clinicId;

  let query = supabaseAdmin
    .from('clinics')
    .select(
      'id, user_id, email, name, plan_id, stripe_customer_id, stripe_subscription_id, plan, subscription_status, current_period_start, current_period_end, trial_ends_at',
    );

  if (clinicId) {
    query = query.eq('id', clinicId);
  } else {
    query = query.eq('user_id', params.userId).order('created_at', { ascending: true }).limit(1);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Clínica não encontrada para faturamento.');
  }

  if (params.role !== 'admin' && String(data.user_id) !== params.userId && String(data.id) !== params.clinicId) {
    throw new Error('Clínica não pertence ao usuário autenticado.');
  }

  return data as Record<string, string | null>;
};

export const ensureStripeCustomer = async (params: {
  stripe: Stripe;
  clinic: Record<string, string | null>;
  userId: string;
  email: string;
}) => {
  const existing = params.clinic.stripe_customer_id;
  if (existing) return existing;

  const customer = await params.stripe.customers.create({
    email: params.clinic.email || params.email,
    name: params.clinic.name || undefined,
    metadata: {
      clinicId: String(params.clinic.id),
      userId: params.userId,
    },
  });

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return customer.id;

  await supabaseAdmin
    .from('clinics')
    .update({ stripe_customer_id: customer.id, updated_at: new Date().toISOString() })
    .eq('id', params.clinic.id);

  await supabaseAdmin.from('stripe_customers').upsert({
    user_id: params.userId,
    clinic_id: params.clinic.id,
    stripe_customer_id: customer.id,
  });

  return customer.id;
};

export const updateClinicSubscriptionFromStripe = async (subscription: Stripe.Subscription) => {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return;

  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
  const firstItem = subscription.items.data[0];
  const stripePriceId = firstItem?.price.id ?? null;
  const metadataClinicId = subscription.metadata?.clinicId;
  const metadataPlanId = subscription.metadata?.planId;
  let clinicId = metadataClinicId || '';
  let planId = metadataPlanId || '';
  let userId = subscription.metadata?.userId || '';

  if (!clinicId) {
    const { data: clinicByCustomer } = await supabaseAdmin
      .from('clinics')
      .select('id, user_id, plan_id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();

    clinicId = typeof clinicByCustomer?.id === 'string' ? clinicByCustomer.id : '';
    planId = planId || (typeof clinicByCustomer?.plan_id === 'string' ? clinicByCustomer.plan_id : '');
    userId = userId || (typeof clinicByCustomer?.user_id === 'string' ? clinicByCustomer.user_id : '');
  }

  if (!planId && stripePriceId) {
    const { data: plan } = await supabaseAdmin
      .from('subscription_plans')
      .select('id')
      .eq('stripe_price_id', stripePriceId)
      .maybeSingle();
    planId = typeof plan?.id === 'string' ? plan.id : '';
  }

  if (!clinicId) return;

  const plan = planId ? planIdToKey(planId) : null;
  const firstItemPeriod = firstItem as Stripe.SubscriptionItem | undefined;
  const currentPeriodStart = timestampToIso(firstItemPeriod?.current_period_start ?? subscription.start_date);
  const currentPeriodEnd = timestampToIso(firstItemPeriod?.current_period_end ?? null);
  const trialEndsAt = timestampToIso(subscription.trial_end);
  const now = new Date().toISOString();

  await supabaseAdmin
    .from('clinics')
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      plan,
      plan_id: planId || undefined,
      subscription_status: subscription.status,
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
      trial_ends_at: trialEndsAt,
      status: subscription.status === 'canceled' ? 'paused' : 'active',
      updated_at: now,
    })
    .eq('id', clinicId);

  if (userId) {
    await supabaseAdmin.from('clinic_subscriptions').upsert(
      {
        clinic_id: clinicId,
        user_id: userId,
        plan_id: planId || null,
        stripe_subscription_id: subscription.id,
        status: subscription.status,
        start_date: currentPeriodStart || now,
        end_date: subscription.status === 'canceled' ? now : currentPeriodEnd,
        auto_renew: !subscription.cancel_at_period_end,
        updated_at: now,
      },
      { onConflict: 'stripe_subscription_id' },
    );
  }
};

export const getBillingSubscription = async (params: {
  userId: string;
  role: string;
  clinicId?: string;
  requestedClinicId?: string;
}): Promise<BillingSubscription> => {
  const clinic = await findClinicForBilling(params);

  return {
    clinicId: String(clinic.id),
    plan: clinic.plan ?? (clinic.plan_id ? planIdToKey(clinic.plan_id) : null),
    planId: clinic.plan_id,
    subscriptionStatus: clinic.subscription_status,
    stripeCustomerId: clinic.stripe_customer_id,
    stripeSubscriptionId: clinic.stripe_subscription_id,
    currentPeriodStart: clinic.current_period_start,
    currentPeriodEnd: clinic.current_period_end,
    trialEndsAt: clinic.trial_ends_at,
  };
};
