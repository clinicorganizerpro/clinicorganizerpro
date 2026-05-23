import { Router } from 'express';
import type { Request } from 'express';
import type Stripe from 'stripe';
import { requireAuth } from '../middlewares/auth.js';
import { requireAdmin } from '../middlewares/admin.js';
import {
  ensureStripeCustomer,
  findClinicForBilling,
  getBillingSubscription,
  getStripeClient,
  getStripePriceIdForPlan,
  getStripeWebhookSecret,
  updateClinicSubscriptionFromStripe,
} from '../services/billingService.js';

const billingRouter = Router();

type CheckoutBody = {
  planId?: string;
  clinicId?: string;
};

const getAppUrl = (req: Request) => {
  const configured =
    process.env.APP_URL?.trim() ||
    process.env.VITE_APP_URL?.trim() ||
    process.env.PUBLIC_APP_URL?.trim() ||
    `${req.protocol}://${req.get('host')}`;

  return configured.replace(/\/$/, '');
};

const getRawBody = (req: Request) => {
  const candidate = req as typeof req & { rawBody?: Buffer };
  return candidate.rawBody;
};

const asString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

billingRouter.post('/billing/create-checkout-session', requireAuth, async (req, res) => {
  try {
    const stripe = await getStripeClient();
    if (!stripe) {
      return res.status(503).json({ data: null, error: { message: 'Stripe não configurado no backend.' } });
    }

    const body = req.body as CheckoutBody;
    const planId = asString(body.planId);
    if (!planId) {
      return res.status(400).json({ data: null, error: { message: 'Informe o plano para iniciar o checkout.' } });
    }

    const priceId = await getStripePriceIdForPlan(planId);
    if (!priceId) {
      return res.status(400).json({
        data: null,
        error: { message: `Preço Stripe não configurado para o plano ${planId}.` },
      });
    }

    const user = req.auth?.user;
    if (!user) {
      return res.status(401).json({ data: null, error: { message: 'Unauthorized' } });
    }

    const clinic = await findClinicForBilling({
      userId: user.id,
      role: user.role,
      clinicId: user.clinicId,
      requestedClinicId: asString(body.clinicId),
    });
    const customerId = await ensureStripeCustomer({
      stripe,
      clinic,
      userId: user.id,
      email: user.email,
    });

    const appUrl = getAppUrl(req);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/?billing=success`,
      cancel_url: `${appUrl}/?billing=cancelled`,
      client_reference_id: String(clinic.id),
      metadata: {
        clinicId: String(clinic.id),
        userId: user.id,
        planId,
      },
      subscription_data: {
        metadata: {
          clinicId: String(clinic.id),
          userId: user.id,
          planId,
        },
      },
      allow_promotion_codes: true,
    });

    return res.json({ data: { checkoutUrl: session.url }, error: null });
  } catch (error) {
    return res.status(400).json({
      data: null,
      error: { message: error instanceof Error ? error.message : 'Falha ao criar checkout Stripe.' },
    });
  }
});

billingRouter.post('/billing/create-portal-session', requireAuth, async (req, res) => {
  try {
    const stripe = await getStripeClient();
    if (!stripe) {
      return res.status(503).json({ data: null, error: { message: 'Stripe não configurado no backend.' } });
    }

    const user = req.auth?.user;
    if (!user) {
      return res.status(401).json({ data: null, error: { message: 'Unauthorized' } });
    }

    const clinic = await findClinicForBilling({
      userId: user.id,
      role: user.role,
      clinicId: user.clinicId,
      requestedClinicId: asString((req.body as CheckoutBody)?.clinicId),
    });
    const customerId = await ensureStripeCustomer({
      stripe,
      clinic,
      userId: user.id,
      email: user.email,
    });

    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${getAppUrl(req)}/?billing=portal`,
    });

    return res.json({ data: { portalUrl: portal.url }, error: null });
  } catch (error) {
    return res.status(400).json({
      data: null,
      error: { message: error instanceof Error ? error.message : 'Falha ao abrir portal de cobrança.' },
    });
  }
});

billingRouter.get('/billing/subscription', requireAuth, async (req, res) => {
  try {
    const user = req.auth?.user;
    if (!user) {
      return res.status(401).json({ data: null, error: { message: 'Unauthorized' } });
    }

    const data = await getBillingSubscription({
      userId: user.id,
      role: user.role,
      clinicId: user.clinicId,
      requestedClinicId: asString(req.query.clinicId),
    });

    return res.json({ data, error: null });
  } catch (error) {
    return res.status(400).json({
      data: null,
      error: { message: error instanceof Error ? error.message : 'Falha ao carregar assinatura.' },
    });
  }
});

billingRouter.post('/billing/webhook', async (req, res) => {
  const stripe = await getStripeClient();
  const webhookSecret = await getStripeWebhookSecret();

  if (!stripe || !webhookSecret) {
    return res.status(503).json({ data: null, error: { message: 'Stripe webhook não configurado.' } });
  }

  const signature = req.headers['stripe-signature'];
  const rawBody = getRawBody(req);

  if (!signature || !rawBody) {
    return res.status(400).json({ data: null, error: { message: 'Webhook Stripe sem assinatura ou corpo bruto.' } });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    return res.status(400).json({
      data: null,
      error: { message: error instanceof Error ? error.message : 'Assinatura do webhook inválida.' },
    });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await updateClinicSubscriptionFromStripe(subscription);
      }
    }

    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      await updateClinicSubscriptionFromStripe(event.data.object as Stripe.Subscription);
    }

    if (event.type === 'invoice.payment_succeeded' || event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice & {
        subscription?: string | { id?: string };
      };
      const subscriptionId =
        typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;

      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await updateClinicSubscriptionFromStripe(subscription);
      }
    }

    return res.json({ received: true });
  } catch (error) {
    return res.status(500).json({
      data: null,
      error: { message: error instanceof Error ? error.message : 'Falha ao processar webhook Stripe.' },
    });
  }
});

// Compatibility with the existing Configuracoes.tsx admin checkout placeholder.
billingRouter.post(
  '/admin/billing/checkout/stripe-create-checkout-session',
  requireAdmin(['admin']),
  async (req, res) => {
    req.url = '/billing/create-checkout-session';
    return (billingRouter as unknown as { handle: (request: typeof req, response: typeof res) => void }).handle(req, res);
  },
);

export default billingRouter;
