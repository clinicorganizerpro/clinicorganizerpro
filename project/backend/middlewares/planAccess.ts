import type { NextFunction, Request, Response } from 'express';
import { requireAuth } from './auth.js';
import { getBillingSubscription, planIdToKey } from '../services/billingService.js';

type PlanKey = 'essencial' | 'pro' | 'clinic';

const order: PlanKey[] = ['essencial', 'pro', 'clinic'];

const normalizePlan = (value?: string | null): PlanKey => {
  if (!value) return 'essencial';
  return planIdToKey(value);
};

export const requirePlan = (minimumPlan: PlanKey) => {
  return (req: Request, res: Response, next: NextFunction) => {
    requireAuth(req, res, async () => {
      const user = req.auth?.user;
      if (!user) {
        return res.status(401).json({ data: null, error: { message: 'Unauthorized' } });
      }

      if (user.role === 'admin') {
        return next();
      }

      try {
        const subscription = await getBillingSubscription({
          userId: user.id,
          role: user.role,
          clinicId: user.clinicId,
        });
        const currentPlan = normalizePlan(subscription.plan ?? subscription.planId);
        const status = subscription.subscriptionStatus ?? 'active';
        const hasStatusAccess = ['active', 'trialing', 'past_due'].includes(status);
        const hasPlanLevel = order.indexOf(currentPlan) >= order.indexOf(minimumPlan);

        if (!hasStatusAccess || !hasPlanLevel) {
          return res.status(402).json({
            data: null,
            error: { message: `Recurso disponível a partir do plano ${minimumPlan}.` },
          });
        }

        return next();
      } catch (error) {
        return res.status(402).json({
          data: null,
          error: { message: error instanceof Error ? error.message : 'Plano da clínica não disponível.' },
        });
      }
    });
  };
};
