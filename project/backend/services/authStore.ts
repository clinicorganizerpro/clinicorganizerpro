import { existsSync, promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readSupabaseServiceKey, readSupabaseUrl } from '../utils/supabaseEnv.js';

type JsonRecord = Record<string, unknown>;

const cwd = process.cwd();
const BASE_DIR = path.basename(cwd) === 'project'
  ? path.join(cwd, 'backend')
  : existsSync(path.join(cwd, 'project', 'backend'))
    ? path.join(cwd, 'project', 'backend')
    : path.join(cwd, 'backend');
const DATA_DIR = path.join(BASE_DIR, 'data');

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

const ensureDirs = async () => {
  await fs.mkdir(DATA_DIR, { recursive: true });
};

const safeReadJsonArray = async (filePath: string): Promise<JsonRecord[]> => {
  await ensureDirs();

  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as JsonRecord[]) : [];
  } catch (err) {
    // arquivo inexistente => []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = err as any;
    if (e?.code === 'ENOENT') return [];
    return [];
  }
};

const safeWriteJsonArray = async (filePath: string, data: JsonRecord[]): Promise<void> => {
  await ensureDirs();
  const raw = JSON.stringify(data, null, 2);
  await fs.writeFile(filePath, raw, 'utf8');
};

const createId = (prefix: string) => `${prefix}_${randomUUID()}`;

let cachedSupabaseAdmin: SupabaseClient | null = null;

const getSupabaseAdmin = () => {
  const url = readSupabaseUrl();
  const key = readSupabaseServiceKey();

  if (!url || !key) return null;
  if (!cachedSupabaseAdmin) {
    cachedSupabaseAdmin = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  return cachedSupabaseAdmin;
};

const normalizeRole = (role: unknown): UserRole => {
  if (role === 'admin' || role === 'doctor') return role;
  return 'staff';
};

const mapProfileToUser = (row: Record<string, unknown>): AuthUser => ({
  id: String(row.id ?? ''),
  email: String(row.email ?? '').trim().toLowerCase(),
  passwordHash: String(row.password_hash ?? ''),
  role: normalizeRole(row.role),
  clinicId: typeof row.clinic_id === 'string' ? row.clinic_id : undefined,
  created_at: String(row.created_at ?? new Date().toISOString()),
  updated_at: String(row.updated_at ?? new Date().toISOString()),
});

const mapSession = (row: Record<string, unknown>): AuthSession => ({
  id: String(row.id ?? ''),
  userId: String(row.user_id ?? ''),
  refreshTokenJtiHash: String(row.refresh_token_jti_hash ?? ''),
  accessTokenJti: String(row.access_token_jti ?? ''),
  created_at: String(row.created_at ?? new Date().toISOString()),
  updated_at: String(row.updated_at ?? new Date().toISOString()),
});

export type UserRole = 'admin' | 'doctor' | 'staff';

export type AuthUser = {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  clinicId?: string;
  created_at: string;
  updated_at: string;
};

export type AuthSession = {
  id: string;
  userId: string;
  refreshTokenJtiHash: string;
  accessTokenJti: string;
  created_at: string;
  updated_at: string;
};

export async function listUsers(): Promise<AuthUser[]> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, role, clinic_id, created_at, updated_at');

      if (error) return [];
      return ((data ?? []) as Record<string, unknown>[]).map(mapProfileToUser).filter((user) => user.id && user.email);
    } catch {
      return [];
    }
  }

  const rows = await safeReadJsonArray(USERS_FILE);
  return rows as AuthUser[];
}

export async function findLocalUserByEmail(email: string): Promise<AuthUser | null> {
  const normalized = email.trim().toLowerCase();
  const rows = await safeReadJsonArray(USERS_FILE);
  const users = rows as AuthUser[];

  const matches = users.filter((u) => u.email.trim().toLowerCase() === normalized);
  if (matches.length === 0) return null;

  matches.sort((a, b) => {
    const at = typeof a.updated_at === 'string' ? Date.parse(a.updated_at) : 0;
    const bt = typeof b.updated_at === 'string' ? Date.parse(b.updated_at) : 0;
    return bt - at;
  });

  return matches[0] ?? null;
}

export async function findUserByEmail(email: string): Promise<AuthUser | null> {
  const normalized = email.trim().toLowerCase();
  const supabase = getSupabaseAdmin();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, role, clinic_id, created_at, updated_at')
        .eq('email', normalized)
        .maybeSingle();

      if (error || !data) return null;
      return mapProfileToUser(data as Record<string, unknown>);
    } catch {
      return null;
    }
  }

  return findLocalUserByEmail(normalized);
}

export async function findUserById(userId: string): Promise<AuthUser | null> {
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, role, clinic_id, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) return null;
    return mapProfileToUser(data as Record<string, unknown>);
  }

  const users = await listUsers();
  const found = users.find((u) => u.id === userId) ?? null;
  return found;
}

export async function upsertUser(user: AuthUser): Promise<void> {
  const supabase = getSupabaseAdmin();

  if (supabase) {
    await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email.trim().toLowerCase(),
      role: user.role,
      clinic_id: user.clinicId ?? null,
      updated_at: user.updated_at,
    });
    return;
  }

  const users = await listUsers();
  const normalizedEmail = user.email.trim().toLowerCase();
  const idx = users.findIndex((u) => u.id === user.id || u.email.trim().toLowerCase() === normalizedEmail);
  const existing = idx === -1 ? null : users[idx];
  const nextUser = {
    ...user,
    id: existing?.id ?? user.id,
    email: normalizedEmail,
    created_at: existing?.created_at ?? user.created_at,
  };

  if (idx === -1) users.push(nextUser);
  else users[idx] = nextUser;

  await safeWriteJsonArray(USERS_FILE, users);
}

export async function deleteUserByEmail(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const existing = await findUserByEmail(normalized);
    if (!existing) return false;

    const { error } = await supabase.from('profiles').delete().eq('email', normalized);
    return !error;
  }

  const users = await listUsers();
  const next = users.filter((u) => u.email.trim().toLowerCase() !== normalized);

  if (next.length === users.length) {
    return false;
  }

  await safeWriteJsonArray(USERS_FILE, next);
  return true;
}

export async function createSession(params: {
  userId: string;
  refreshTokenJtiHash: string;
  accessTokenJti: string;
}): Promise<AuthSession> {
  const now = new Date().toISOString();
  const session: AuthSession = {
    id: createId('sess'),
    userId: params.userId,
    refreshTokenJtiHash: params.refreshTokenJtiHash,
    accessTokenJti: params.accessTokenJti,
    created_at: now,
    updated_at: now,
  };

  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { data, error } = await supabase
      .from('auth_sessions')
      .insert({
        id: session.id,
        user_id: session.userId,
        refresh_token_jti_hash: session.refreshTokenJtiHash,
        access_token_jti: session.accessTokenJti,
        created_at: session.created_at,
        updated_at: session.updated_at,
      })
      .select('id, user_id, refresh_token_jti_hash, access_token_jti, created_at, updated_at')
      .single();

    if (!error && data) {
      return mapSession(data as Record<string, unknown>);
    }
  }

  const sessions = await (async () => {
    const rows = await safeReadJsonArray(SESSIONS_FILE);
    return rows as AuthSession[];
  })();

  sessions.push(session);
  try {
    await safeWriteJsonArray(SESSIONS_FILE, sessions);
  } catch {
    // Em serverless, o pacote pode estar em filesystem somente leitura; o JWT de acesso ainda é válido.
  }

  return session;
}

export async function listSessionsByUserId(userId: string): Promise<AuthSession[]> {
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { data, error } = await supabase
      .from('auth_sessions')
      .select('id, user_id, refresh_token_jti_hash, access_token_jti, created_at, updated_at')
      .eq('user_id', userId);

    if (error) return [];
    return ((data ?? []) as Record<string, unknown>[]).map(mapSession).filter((session) => session.id);
  }

  const sessions = (await safeReadJsonArray(SESSIONS_FILE)) as AuthSession[];
  return sessions.filter((s) => s.userId === userId);
}

export async function findSessionByRefreshTokenJtiHash(hash: string): Promise<AuthSession | null> {
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { data, error } = await supabase
      .from('auth_sessions')
      .select('id, user_id, refresh_token_jti_hash, access_token_jti, created_at, updated_at')
      .eq('refresh_token_jti_hash', hash)
      .maybeSingle();

    if (error || !data) return null;
    return mapSession(data as Record<string, unknown>);
  }

  const sessions = (await safeReadJsonArray(SESSIONS_FILE)) as AuthSession[];
  const found = sessions.find((s) => s.refreshTokenJtiHash === hash) ?? null;
  return found;
}

export async function revokeSessionByRefreshTokenJtiHash(hash: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  if (supabase) {
    await supabase.from('auth_sessions').delete().eq('refresh_token_jti_hash', hash);
    return;
  }

  const sessions = (await safeReadJsonArray(SESSIONS_FILE)) as AuthSession[];
  const next = sessions.filter((s) => s.refreshTokenJtiHash !== hash);
  await safeWriteJsonArray(SESSIONS_FILE, next);
}

export async function revokeSessionById(sessionId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  if (supabase) {
    await supabase.from('auth_sessions').delete().eq('id', sessionId);
    return;
  }

  const sessions = (await safeReadJsonArray(SESSIONS_FILE)) as AuthSession[];
  const next = sessions.filter((s) => s.id !== sessionId);
  await safeWriteJsonArray(SESSIONS_FILE, next);
}

export async function revokeAllSessionsForUser(userId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  if (supabase) {
    await supabase.from('auth_sessions').delete().eq('user_id', userId);
    return;
  }

  const sessions = (await safeReadJsonArray(SESSIONS_FILE)) as AuthSession[];
  const next = sessions.filter((s) => s.userId !== userId);
  await safeWriteJsonArray(SESSIONS_FILE, next);
}
