import { Router } from 'express';
import { requireAdmin } from '../middlewares/admin.js';
import { readData, writeData } from '../services/database.js';
import {
  getAiConfig,
  saveAiConfig,
  getStripeConfig,
  saveStripeConfig,
  getWhatsappWorkflowConfig,
  saveWhatsappWorkflowConfig,
  type AiConfig,
  type StripeConfig,
  type WhatsappWorkflowConfig,
} from '../services/configStore.js';

const adminConfigRouter = Router();
const ADMIN_STATE_FILE = 'admin_state.json';

const parseBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value === 'true') return true;
    if (value === 'false') return false;
  }
  return undefined;
};

const sanitizeString = (value: unknown, fallback = ''): string => {
  if (typeof value !== 'string') return fallback;
  return value.trim();
};

const parseJsonObject = (value: unknown): Record<string, unknown> | null => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value !== 'string') {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }

  return null;
};

const readAdminState = async () => {
  const rows = await readData<Record<string, unknown> & { id: string }>(ADMIN_STATE_FILE);
  return rows[0]?.data ?? null;
};

const writeAdminState = async (data: unknown) => {
  const row = {
    id: 'global',
    data,
    updated_at: new Date().toISOString(),
  };

  await writeData(ADMIN_STATE_FILE, [row]);
  return row;
};

adminConfigRouter.get('/public/clinics', async (_req, res) => {
  const state = await readAdminState();
  const clinics = parseJsonObject(state)?.clinics;

  res.json({
    data: Array.isArray(clinics)
      ? clinics.map((clinic) => {
          const row = parseJsonObject(clinic) ?? {};
          return {
            id: sanitizeString(row.id),
            name: sanitizeString(row.name),
            email: sanitizeString(row.email),
            phone: sanitizeString(row.phone),
            city: sanitizeString(row.city),
            planId: sanitizeString(row.planId),
            status: sanitizeString(row.status, 'active'),
          };
        }).filter((clinic) => clinic.id && clinic.name && clinic.status !== 'paused')
      : [],
    error: null,
  });
});

adminConfigRouter.get('/state', requireAdmin(['admin']), async (_req, res) => {
  const data = await readAdminState();
  res.json({ data, error: null });
});

adminConfigRouter.post('/state', requireAdmin(['admin']), async (req, res) => {
  const body = req.body as { data?: unknown };

  if (!body || typeof body !== 'object' || !body.data) {
    return res.status(400).json({ data: null, error: { message: 'Invalid admin state payload' } });
  }

  const row = await writeAdminState(body.data);
  res.json({ data: row.data, error: null });
});

adminConfigRouter.get('/config/ai', requireAdmin(['admin']), async (_req, res) => {
  const data = await getAiConfig();
  res.json({ data, error: null });
});

adminConfigRouter.post('/config/ai', requireAdmin(['admin']), async (req, res) => {
  const body = req.body as Partial<AiConfig> & { enabled?: boolean };

  const next = {
    enabled: parseBoolean(body.enabled) ?? false,
    apiUrl: sanitizeString(body.apiUrl, ''),
    apiKey: sanitizeString(body.apiKey, ''),
    model: sanitizeString(body.model, 'gpt-4o-mini'),
  };

  const data = await saveAiConfig(next);
  res.json({ data, error: null });
});

adminConfigRouter.get('/config/stripe', requireAdmin(['admin']), async (_req, res) => {
  const data = await getStripeConfig();
  res.json({ data, error: null });
});

adminConfigRouter.post('/config/stripe', requireAdmin(['admin']), async (req, res) => {
  const body = req.body as Partial<StripeConfig> & { enabled?: boolean };

  const next = {
    enabled: parseBoolean(body.enabled) ?? false,
    stripeSecretKey: sanitizeString(body.stripeSecretKey, ''),
    stripePublishableKey: sanitizeString(body.stripePublishableKey, ''),
    stripeWebhookSecret: sanitizeString(body.stripeWebhookSecret, ''),
  };

  const data = await saveStripeConfig(next);
  res.json({ data, error: null });
});

adminConfigRouter.get('/config/whatsapp-workflow', requireAdmin(['admin']), async (_req, res) => {
  const data = await getWhatsappWorkflowConfig();
  res.json({ data, error: null });
});

adminConfigRouter.post('/config/whatsapp-workflow', requireAdmin(['admin']), async (req, res) => {
  const body = req.body as Partial<WhatsappWorkflowConfig> & { workflow?: unknown };

  const workflow = parseJsonObject(body.workflow);

  if (!workflow) {
    return res.status(400).json({ data: null, error: { message: 'Invalid workflow payload' } });
  }

  const next = {
    enabled: parseBoolean(body.enabled) ?? false,
    workflow,
  };

  const data = await saveWhatsappWorkflowConfig(next);
  res.json({ data, error: null });
});

export default adminConfigRouter;
