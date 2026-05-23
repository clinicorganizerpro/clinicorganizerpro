import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/useApp';
import {
  createBillingPortalSession,
  createCheckoutSession,
  fetchBillingSubscription,
  type BillingSubscription,
} from '../services/billingService';

type SubscriptionAppContext = ReturnType<typeof useApp> & {
  authAccessToken?: string | null;
  currentClinic?: { id?: string } | null;
};

export const PLAN_ORDER = ['essencial', 'pro', 'clinic'] as const;
export type PlanKey = (typeof PLAN_ORDER)[number];

const normalizePlan = (value?: string | null): PlanKey => {
  const normalized = String(value ?? '').toLowerCase();
  if (normalized.includes('clinic') || normalized.includes('clinica')) return 'clinic';
  if (normalized.includes('pro') || normalized.includes('profissional')) return 'pro';
  return 'essencial';
};

export const hasPlanAccess = (currentPlan: string | null | undefined, requiredPlan: PlanKey) => {
  const currentIndex = PLAN_ORDER.indexOf(normalizePlan(currentPlan));
  const requiredIndex = PLAN_ORDER.indexOf(requiredPlan);
  return currentIndex >= requiredIndex;
};

export function useSubscription() {
  const app = useApp() as SubscriptionAppContext;
  const token = app.authAccessToken ?? '';
  const clinicId = app.currentClinic?.id ?? '';
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return null;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchBillingSubscription(token, clinicId);
      setSubscription(data);
      return data;
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Falha ao carregar assinatura.';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [clinicId, token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const startCheckout = useCallback(
    async (planId: string) => {
      const data = await createCheckoutSession(token, { planId, clinicId });
      window.location.href = data.checkoutUrl;
    },
    [clinicId, token],
  );

  const openBillingPortal = useCallback(async () => {
    const data = await createBillingPortalSession(token, { clinicId });
    window.location.href = data.portalUrl;
  }, [clinicId, token]);

  const activePlan = useMemo(
    () => normalizePlan(subscription?.plan ?? subscription?.planId),
    [subscription?.plan, subscription?.planId],
  );

  return {
    subscription,
    activePlan,
    loading,
    error,
    refresh,
    startCheckout,
    openBillingPortal,
    hasAccess: (requiredPlan: PlanKey) => hasPlanAccess(activePlan, requiredPlan),
  };
}
