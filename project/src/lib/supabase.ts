import { localSupabaseMock } from './localSupabaseMock';
import { createClient } from '@supabase/supabase-js';
import { HAS_SUPABASE_CONFIG, SUPABASE_ANON_KEY, SUPABASE_URL } from '../config/supabase';
import type { Session, User } from '../types/supabase';

const ADMIN_JWT_STORAGE_KEY = 'clinic-organizer-pro-admin-jwt';

type StoredAdminJwt = {
  email?: string;
  accessToken?: string;
  refreshToken?: string;
  storedAt?: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: any = HAS_SUPABASE_CONFIG
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : localSupabaseMock;

const readStoredAdminSession = (): Session | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(ADMIN_JWT_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as StoredAdminJwt;
    const email = typeof parsed.email === 'string' ? parsed.email.trim() : '';
    const accessToken = typeof parsed.accessToken === 'string' ? parsed.accessToken : '';
    const refreshToken = typeof parsed.refreshToken === 'string' ? parsed.refreshToken : '';

    if (!email || !accessToken) {
      return null;
    }

    const user: User = {
      id: email,
      email,
      role: 'admin',
      aud: 'authenticated',
      created_at: new Date((parsed.storedAt ?? Date.now())).toISOString(),
      updated_at: new Date((parsed.storedAt ?? Date.now())).toISOString(),
      app_metadata: {
        provider: 'local',
        providers: ['local'],
      },
      user_metadata: {
        source: 'local-jwt',
      },
    };

    return {
      access_token: accessToken,
      refresh_token: refreshToken || undefined,
      expires_at: undefined,
      token_type: 'bearer',
      user,
    };
  } catch {
    return null;
  }
};

export const getCurrentSession = async (): Promise<Session | null> => {
  if (HAS_SUPABASE_CONFIG) {
    const { data } = await supabase.auth.getSession();
    return (data?.session ?? null) as Session | null;
  }

  return readStoredAdminSession();
};

export const getCurrentUser = async (): Promise<User | null> => {
  const session = await getCurrentSession();
  return session?.user ?? null;
};

export const isAuthenticatedSession = (session: Session | null): session is Session => {
  return Boolean(session?.user?.id);
};
