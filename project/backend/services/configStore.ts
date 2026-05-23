import { existsSync, promises as fs } from 'fs';
import path from 'path';

type JsonRecord = Record<string, unknown>;

const cwd = process.cwd();
const BASE_DIR = path.basename(cwd) === 'project'
  ? path.join(cwd, 'backend')
  : existsSync(path.join(cwd, 'project', 'backend'))
    ? path.join(cwd, 'project', 'backend')
    : path.join(cwd, 'backend');
const DATA_DIR = path.join(BASE_DIR, 'data');

const ensureDirs = async () => {
  await fs.mkdir(DATA_DIR, { recursive: true });
};

const readJson = async <T>(filePath: string, fallback: T): Promise<T> => {
  await ensureDirs();

  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    return (parsed ?? fallback) as T;
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = err as any;
    if (e?.code === 'ENOENT') return fallback;
    return fallback;
  }
};

const writeJson = async (filePath: string, data: JsonRecord): Promise<void> => {
  await ensureDirs();
  const raw = JSON.stringify(data, null, 2);
  await fs.writeFile(filePath, raw, 'utf8');
};

export type AiConfig = {
  enabled: boolean;
  apiUrl: string;
  apiKey: string;
  model: string;
};

export type StripeConfig = {
  enabled: boolean;
  stripeSecretKey: string;
  stripePublishableKey: string;
  stripeWebhookSecret: string;
};

export type WhatsappWorkflowConfig = {
  enabled: boolean;
  workflow: JsonRecord;
};

const AI_CONFIG_FILE = path.join(DATA_DIR, 'ai_config.json');
const STRIPE_CONFIG_FILE = path.join(DATA_DIR, 'stripe_config.json');
const WHATSAPP_WORKFLOW_CONFIG_FILE = path.join(DATA_DIR, 'whatsapp_workflow_config.json');

const defaultAiConfig: AiConfig = {
  enabled: false,
  apiUrl: '',
  apiKey: '',
  model: 'gpt-4o-mini',
};

const defaultStripeConfig: StripeConfig = {
  enabled: false,
  stripeSecretKey: '',
  stripePublishableKey: '',
  stripeWebhookSecret: '',
};

const defaultWhatsappWorkflowConfig: WhatsappWorkflowConfig = {
  enabled: false,
  workflow: {},
};

export async function getAiConfig(): Promise<AiConfig> {
  return readJson<AiConfig>(AI_CONFIG_FILE, defaultAiConfig);
}

export async function saveAiConfig(input: Partial<AiConfig>): Promise<AiConfig> {
  const current = await getAiConfig();
  const next: AiConfig = {
    ...current,
    ...input,
    enabled: Boolean(input.enabled ?? current.enabled),
    apiUrl: typeof input.apiUrl === 'string' ? input.apiUrl : current.apiUrl,
    apiKey: typeof input.apiKey === 'string' ? input.apiKey : current.apiKey,
    model: typeof input.model === 'string' ? input.model : current.model,
  };

  await writeJson(AI_CONFIG_FILE, next as unknown as JsonRecord);
  return next;
}

export async function getStripeConfig(): Promise<StripeConfig> {
  return readJson<StripeConfig>(STRIPE_CONFIG_FILE, defaultStripeConfig);
}

export async function saveStripeConfig(input: Partial<StripeConfig>): Promise<StripeConfig> {
  const current = await getStripeConfig();
  const next: StripeConfig = {
    ...current,
    ...input,
    enabled: Boolean(input.enabled ?? current.enabled),
    stripeSecretKey: typeof input.stripeSecretKey === 'string' ? input.stripeSecretKey : current.stripeSecretKey,
    stripePublishableKey:
      typeof input.stripePublishableKey === 'string' ? input.stripePublishableKey : current.stripePublishableKey,
    stripeWebhookSecret:
      typeof input.stripeWebhookSecret === 'string' ? input.stripeWebhookSecret : current.stripeWebhookSecret,
  };

  await writeJson(STRIPE_CONFIG_FILE, next as unknown as JsonRecord);
  return next;
}

export async function getWhatsappWorkflowConfig(): Promise<WhatsappWorkflowConfig> {
  return readJson<WhatsappWorkflowConfig>(WHATSAPP_WORKFLOW_CONFIG_FILE, defaultWhatsappWorkflowConfig);
}

export async function saveWhatsappWorkflowConfig(
  input: Partial<WhatsappWorkflowConfig> & { workflow?: unknown },
): Promise<WhatsappWorkflowConfig> {
  const current = await getWhatsappWorkflowConfig();
  const workflow = input.workflow;
  const next: WhatsappWorkflowConfig = {
    enabled: Boolean(input.enabled ?? current.enabled),
    workflow:
      workflow && typeof workflow === 'object' && !Array.isArray(workflow)
        ? (workflow as JsonRecord)
        : current.workflow,
  };

  await writeJson(WHATSAPP_WORKFLOW_CONFIG_FILE, next as unknown as JsonRecord);
  return next;
}
