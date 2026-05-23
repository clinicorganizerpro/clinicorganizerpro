import { apiFetch } from '../lib/api';

type AIResponse = {
  success?: boolean;
  summary?: string;
  result?: string;
  provider?: string;
  openai?: unknown;
  reply?: string;
  error?: string;
  [key: string]: unknown;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/$/, '') || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';
function configError(functionName: string) {
  const missing: string[] = [];
  if (!SUPABASE_URL) missing.push('VITE_SUPABASE_URL');
  if (!SUPABASE_ANON_KEY) missing.push('VITE_SUPABASE_ANON_KEY');

  if (missing.length === 0) return null;
  return `AI config incompleta: faltando ${missing.join(', ')}. Não foi possível chamar supabase Edge Function "${functionName}".`;
}

async function invoke(functionName: string, body: unknown): Promise<AIResponse> {
  const cfgErr = configError(functionName);
  if (cfgErr) return { success: false, error: cfgErr };
  const variants = functionName.includes('-')
    ? [functionName, functionName.replace(/-/g, '_')]
    : [functionName, functionName.replace(/_/g, '-')];

  let lastError: Error | null = null;

  for (const variant of variants) {
    const url = `${SUPABASE_URL}/functions/v1/${variant}`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(body),
      });

      const text = await res.text();
      let data: AIResponse = {};

      if (text) {
        try {
          data = JSON.parse(text) as AIResponse;
        } catch {
          data = { error: text };
        }
      }

      if (res.ok) {
        return data;
      }

      const message =
        typeof data.error === 'string' && data.error.trim()
          ? data.error
          : text || res.statusText;

      lastError = new Error(`AI function ${variant} failed: ${res.status} ${message}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError ?? new Error(`AI function ${functionName} failed`);
}

async function invokeLocalChat(body: unknown): Promise<AIResponse> {
  const res = await apiFetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data: AIResponse = {};

  if (text) {
    try {
      data = JSON.parse(text) as AIResponse;
    } catch {
      data = { error: text };
    }
  }

  if (!res.ok) {
    throw new Error(data.error || `AI local falhou: ${res.status} ${res.statusText}`);
  }

  return data;
}

export async function summarizeAppointment(appointmentId?: string, appointmentText?: string) {
  const response = await invoke('ai-insights', { appointmentId, appointmentText });

  return {
    summary: response.summary ?? response.result ?? '',
    result: response.result ?? response.summary ?? '',
    provider: response.provider,
    openai: response.openai,
    success: response.success,
    error: response.error,
    raw: response,
  };
}

export type ChatHistoryItem = { role?: string; content?: string };

export async function chat(params: {
  message: string;
  history?: ChatHistoryItem[];
  patientId?: string;
}) {
  const payload = {
    message: params.message,
    history: params.history ?? [],
    patientId: params.patientId,
  };

  let response: AIResponse;

  try {
    response = await invoke('ai_chatbot', payload);
    if (!response.reply && !response.result && !response.summary && response.error) {
      response = await invokeLocalChat(payload);
    }
  } catch {
    response = await invokeLocalChat(payload);
  }

  return {
    reply: response.reply ?? response.result ?? response.summary ?? '',
    provider: response.provider,
    openai: response.openai,
    success: response.success,
    error: response.error,
    raw: response,
  };
}

export default {
  summarizeAppointment,
  chat,
};
