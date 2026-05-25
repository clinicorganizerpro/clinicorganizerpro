const DEFAULT_DEV_API_URL = 'http://localhost:8788';

export type ApiEnvelope<T> = {
  data: T | null;
  error: { message?: string } | null;
};

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.clinicLocalDb?.isAvailable) {
    return window.clinicLocalDb.localBackendUrl ?? 'http://127.0.0.1:8788';
  }

  const configured = (import.meta.env.VITE_API_URL as string | undefined)?.trim();

  if (configured) {
    return configured.replace(/\/$/, '');
  }

  return import.meta.env.DEV ? DEFAULT_DEV_API_URL : '';
};

export const createApiUrl = (path: string) => {
  if (path.startsWith('http')) {
    return new URL(path);
  }

  const baseUrl = getApiBaseUrl();
  const normalizedPath =
    baseUrl.endsWith('/functions/v1/api') && path.startsWith('/api/')
      ? path.slice('/api'.length)
      : path;
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
  return new URL(`${baseUrl}${normalizedPath}`, origin);
};

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const readStoredAccessToken = () => {
  if (typeof window === 'undefined') return null;

  try {
    const adminJwt = window.localStorage.getItem('clinic-organizer-pro-admin-jwt');
    if (adminJwt) {
      const parsed = JSON.parse(adminJwt) as { accessToken?: unknown };
      if (typeof parsed.accessToken === 'string' && parsed.accessToken.trim()) {
        return parsed.accessToken;
      }
    }
  } catch {
    return null;
  }

  return null;
};

export async function readApiJson<T>(response: Response): Promise<ApiEnvelope<T> | null> {
  const text = await response.text();
  if (!text) return null;
  return JSON.parse(text) as ApiEnvelope<T>;
}

export async function apiFetch(path: string, init: RequestInit = {}, retries = 1): Promise<Response> {
  const url = createApiUrl(path).toString();
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
          ...(readStoredAccessToken() ? { Authorization: `Bearer ${readStoredAccessToken()}` } : {}),
          ...(init.headers ?? {}),
        },
        signal: init.signal ?? AbortSignal.timeout(15000),
      });
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(350 * (attempt + 1));
      }
    }
  }

  throw new ApiError(
    lastError instanceof TypeError
      ? 'API temporariamente indisponível. Tentando reconectar ao backend de produção.'
      : 'Não foi possível conectar ao backend.',
  );
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, init);
  const payload = await readApiJson<T>(response).catch(() => null);

  if (!response.ok) {
    throw new ApiError(payload?.error?.message ?? `Falha na API (${response.status})`, response.status);
  }

  if (payload?.error?.message) {
    throw new ApiError(payload.error.message, response.status);
  }

  if (payload && 'data' in payload) {
    return payload.data as T;
  }

  return payload as T;
}

export async function apiHealth() {
  return apiRequest<{ ok: boolean; service: string; uptime?: number; env?: string }>('/health');
}
