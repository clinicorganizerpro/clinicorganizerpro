import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { HAS_SUPABASE_CONFIG, SUPABASE_ANON_KEY, SUPABASE_URL } from '../../config/supabase';
import { localSupabaseMock } from '../../lib/localSupabaseMock';

let cachedClient: SupabaseClient | null = null;

export function createSupabaseClient(): SupabaseClient {
  if (!HAS_SUPABASE_CONFIG) {
    return localSupabaseMock as unknown as SupabaseClient;
  }

  if (!cachedClient) {
    cachedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return cachedClient;
}
