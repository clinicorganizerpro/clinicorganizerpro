import { type SupabaseClient } from '@supabase/supabase-js';
import { createServerClient as createSsrsClient } from '@supabase/ssr';
import { HAS_SUPABASE_CONFIG, SUPABASE_ANON_KEY, SUPABASE_URL } from '../../config/supabase';

type ReadonlyRequestCookies = {
  getAll: () => Array<{ name: string; value: string }>;
  set?: (opts: { name: string; value: string; maxAge?: number; path?: string }) => void;
};

export function createSupabaseServerClient(
  cookieStore: ReadonlyRequestCookies,
): SupabaseClient {
  if (!HAS_SUPABASE_CONFIG) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local.',
    );
  }

  return createSsrsClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const cookie of cookiesToSet) {
          cookieStore.set?.({
            name: cookie.name,
            value: cookie.value,
            maxAge: cookie.options?.maxAge,
            path: cookie.options?.path ?? '/',
          });
        }
      },
    },
  });
}
