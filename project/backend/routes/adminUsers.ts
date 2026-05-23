import { Router } from 'express';
import bcrypt from 'bcrypt';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { requireAdmin } from '../middlewares/admin.js';
import { deleteUserByEmail, findUserByEmail, revokeAllSessionsForUser, upsertUser, type UserRole } from '../services/authStore.js';
import { readSupabaseServiceKey, readSupabaseUrl } from '../utils/supabaseEnv.js';

const adminUsersRouter = Router();

type UpsertAdminUserBody = {
  email?: string;
  password?: string;
  role?: string;
  clinicId?: string;
};

const sanitizeEmail = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
};

const sanitizeString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const normalizeRole = (role: unknown): UserRole => {
  const value = typeof role === 'string' ? role.trim().toLowerCase() : '';
  if (value === 'admin') return 'admin';
  if (value === 'doctor') return 'doctor';
  return 'staff';
};

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

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const findSupabaseAuthUserByEmail = async (supabase: SupabaseClient, email: string): Promise<User | null> => {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) return null;

    const found = data.users.find((user) => user.email?.trim().toLowerCase() === email);
    if (found) return found;
    if (data.users.length < 100) return null;
  }

  return null;
};

const upsertSupabaseAuthUser = async (
  supabase: SupabaseClient,
  params: { existingId?: string; email: string; password?: string; role: UserRole; clinicId?: string },
) => {
  const metadata = {
    role: params.role,
    clinicId: params.clinicId ?? '',
  };

  const existingAuthUser =
    params.existingId && isUuid(params.existingId)
      ? (await supabase.auth.admin.getUserById(params.existingId)).data.user
      : await findSupabaseAuthUserByEmail(supabase, params.email);

  if (existingAuthUser) {
    const { data, error } = await supabase.auth.admin.updateUserById(existingAuthUser.id, {
      email: params.email,
      ...(params.password ? { password: params.password } : {}),
      user_metadata: metadata,
    });

    if (error || !data.user) {
      throw new Error(error?.message ?? 'Falha ao atualizar usuário no Supabase Auth.');
    }

    return data.user;
  }

  if (!params.password) {
    throw new Error('Missing password for new Supabase Auth user');
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: true,
    user_metadata: metadata,
  });

  if (error || !data.user) {
    throw new Error(error?.message ?? 'Falha ao criar usuário no Supabase Auth.');
  }

  return data.user;
};

adminUsersRouter.post('/users/upsert', requireAdmin(['admin']), async (req, res) => {
  const body = req.body as UpsertAdminUserBody;

  const email = sanitizeEmail(body?.email);
  const password = typeof body?.password === 'string' ? body.password : '';
  const role = normalizeRole(body?.role);
  const clinicId = sanitizeString(body?.clinicId);

  if (!email) {
    return res.status(400).json({ data: null, error: { message: 'Missing email' } });
  }

  const existing = await findUserByEmail(email);
  const supabaseAdmin = getSupabaseAdmin();

  if (!existing && !password) {
    return res.status(400).json({ data: null, error: { message: 'Missing password for new user' } });
  }

  const now = new Date().toISOString();
  const passwordHash = password ? await bcrypt.hash(password, 10) : existing?.passwordHash;

  if (!passwordHash) {
    if (!supabaseAdmin) {
      return res.status(400).json({ data: null, error: { message: 'Missing password hash' } });
    }
  }

  const supabaseAuthUser = supabaseAdmin
    ? await upsertSupabaseAuthUser(supabaseAdmin, {
        existingId: existing?.id,
        email,
        password: password || undefined,
        role,
        clinicId: clinicId || undefined,
      })
    : null;

  await upsertUser({
    id: supabaseAuthUser?.id ?? existing?.id ?? `user_${email.replace(/[^a-z0-9]+/gi, '_')}`,
    email,
    passwordHash: passwordHash ?? '',
    role,
    clinicId: clinicId ? clinicId : undefined,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  });

  return res.json({ data: { ok: true }, error: null });
});

adminUsersRouter.delete('/users', requireAdmin(['admin']), async (req, res) => {
  const email = sanitizeEmail(req.query.email);

  if (!email) {
    return res.status(400).json({ data: null, error: { message: 'Missing email' } });
  }

  const existing = await findUserByEmail(email);
  const supabaseAdmin = getSupabaseAdmin();
  const authUser = supabaseAdmin
    ? existing?.id && isUuid(existing.id)
      ? (await supabaseAdmin.auth.admin.getUserById(existing.id)).data.user
      : await findSupabaseAuthUserByEmail(supabaseAdmin, email)
    : null;

  if (supabaseAdmin && authUser) {
    await supabaseAdmin.auth.admin.deleteUser(authUser.id).catch(() => undefined);
  }

  const removed = await deleteUserByEmail(email);

  if (existing) {
    await revokeAllSessionsForUser(existing.id);
  }

  return res.json({ data: { ok: true, removed }, error: null });
});

export default adminUsersRouter;
