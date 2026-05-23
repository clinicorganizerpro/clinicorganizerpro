export const readEnv = (...names: string[]) => {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }

  return '';
};

export const normalizeSupabaseUrl = (value: string) => {
  const raw = value.trim();
  if (!raw) return '';

  try {
    const url = new URL(raw);
    url.pathname = url.pathname.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return raw.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
  }
};

export const readSupabaseUrl = () =>
  normalizeSupabaseUrl(readEnv('SUPABASE_URL', 'VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'));

export const readSupabaseServiceKey = () =>
  readEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_KEY');

export const readSupabaseAnonKey = () =>
  readEnv('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
