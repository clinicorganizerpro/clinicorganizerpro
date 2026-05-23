const readEnv = (viteName: string, nextName: string) => {
  const env = import.meta.env as Record<string, string | undefined>;
  return (env[viteName] ?? env[nextName] ?? '').trim();
};

export const normalizeSupabaseUrl = (url: string) =>
  url
    .trim()
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/$/, '');

export const SUPABASE_URL = normalizeSupabaseUrl(readEnv('VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'));
export const SUPABASE_ANON_KEY = readEnv('VITE_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');

export const HAS_SUPABASE_CONFIG = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
