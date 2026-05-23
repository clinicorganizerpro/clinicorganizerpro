import { apiRequest } from '../lib/api';

export type BillingSubscription = {
  clinicId: string;
  plan: string | null;
  planId: string | null;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
};

const request = async <T,>(path: string, accessToken: string, init?: RequestInit): Promise<T> => {
  if (!accessToken) {
    throw new Error('Sessão JWT ausente. Faça login novamente.');
  }

  return apiRequest<T>(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });
};

export async function fetchBillingSubscription(accessToken: string, clinicId?: string): Promise<BillingSubscription> {
  const params = new URLSearchParams();
  if (clinicId) params.set('clinicId', clinicId);
  const suffix = params.toString() ? `?${params.toString()}` : '';

  return request<BillingSubscription>(`/api/billing/subscription${suffix}`, accessToken);
}

export async function createCheckoutSession(
  accessToken: string,
  input: { planId: string; clinicId?: string },
): Promise<{ checkoutUrl: string }> {
  return request<{ checkoutUrl: string }>('/api/billing/create-checkout-session', accessToken, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function createBillingPortalSession(
  accessToken: string,
  input: { clinicId?: string } = {},
): Promise<{ portalUrl: string }> {
  return request<{ portalUrl: string }>('/api/billing/create-portal-session', accessToken, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
