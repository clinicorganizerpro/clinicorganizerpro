import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  createSession,
  findLocalUserByEmail,
  findUserByEmail,
  upsertUser,
  type UserRole,
} from '../services/authStore.js';
import { requireAuth } from '../middlewares/auth.js';
import { readEnv, readSupabaseAnonKey, readSupabaseServiceKey, readSupabaseUrl } from '../utils/supabaseEnv.js';

const authRouter = Router();

type LoginBody = {
  email?: string;
  password?: string;
};

type RegisterBody = LoginBody & {
  name?: string;
  fullName?: string;
  clinicId?: string;
  clinicName?: string;
  phone?: string;
  cnpj?: string;
  cep?: string;
  address?: string;
  addressNumber?: string;
  city?: string;
  state?: string;
};

type RefreshBody = {
  refreshToken?: string;
};

const getAccessSecret = () => process.env.ACCESS_TOKEN_SECRET ?? process.env.JWT_SECRET ?? 'dev_access_secret_change_me';
const getRefreshSecret = () =>
  process.env.REFRESH_TOKEN_SECRET ?? process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET ?? 'dev_refresh_secret_change_me';

const ACCESS_TTL_SECONDS = Number(process.env.ACCESS_TTL_SECONDS ?? 60 * 15); // 15min
const REFRESH_TTL_SECONDS = Number(process.env.REFRESH_TTL_SECONDS ?? 60 * 60 * 24 * 7); // 7d

const getSupabaseUrl = readSupabaseUrl;
const getSupabaseServiceKey = readSupabaseServiceKey;
const getSupabaseAnonKey = readSupabaseAnonKey;
const getAdminLoginEmail = () => readEnv('ADMIN_LOGIN_EMAIL') || 'clinicorganizerpro@gmail.com';
const getAdminLoginPassword = () => readEnv('ADMIN_LOGIN_PASSWORD', 'ADMIN_PASSWORD');

let cachedSupabaseAdmin: SupabaseClient | null = null;
let cachedSupabaseAuth: SupabaseClient | null = null;

const hasSupabaseAdminConfig = () => Boolean(getSupabaseUrl() && getSupabaseServiceKey());
const hasSupabaseAuthConfig = () => Boolean(getSupabaseUrl() && getSupabaseAnonKey());

const getSupabaseAdmin = () => {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceKey();

  if (!url || !key) return null;
  if (!cachedSupabaseAdmin) {
    cachedSupabaseAdmin = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  return cachedSupabaseAdmin;
};

const getSupabaseAuth = () => {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!url || !key) return null;
  if (!cachedSupabaseAuth) {
    cachedSupabaseAuth = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
  }

  return cachedSupabaseAuth;
};

const sanitizeString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const onlyDigits = (value: string) => value.replace(/\D/g, '');
const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const mapSupabaseAuthError = (message: string) => {
  const normalized = message.toLowerCase();

  if (normalized.includes('already') || normalized.includes('registered') || normalized.includes('exists')) {
    return { status: 409, message: 'Email already registered' };
  }

  if (normalized.includes('fetch failed') || normalized.includes('network') || normalized.includes('econnrefused')) {
    return { status: 503, message: 'API indisponível: não foi possível conectar ao Supabase.' };
  }

  if (normalized.includes('invalid api key') || normalized.includes('api key')) {
    return { status: 503, message: 'Supabase mal configurado: verifique a service role key do backend.' };
  }

  if (normalized.includes('password')) {
    return { status: 400, message: 'Senha inválida. Use uma senha mais forte.' };
  }

  return { status: 400, message };
};

const signAccessToken = (payload: { sub: string; email: string; role: string; clinicId?: string }, jti: string) => {
  return jwt.sign(
    {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      clinicId: payload.clinicId,
      jti,
      typ: 'access',
    },
    getAccessSecret(),
    { expiresIn: ACCESS_TTL_SECONDS },
  );
};

const signRefreshToken = (payload: { sub: string; jti: string }) => {
  return jwt.sign(
    {
      sub: payload.sub,
      jti: payload.jti,
      typ: 'refresh',
    },
    getRefreshSecret(),
    { expiresIn: REFRESH_TTL_SECONDS },
  );
};

type ClinicAuthProfile = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  cnpj?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
};

const findSupabaseAuthUserByEmail = async (supabaseAdmin: SupabaseClient, email: string) => {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) return null;

    const found = data.users.find((candidate) => candidate.email?.trim().toLowerCase() === email);
    if (found) return found;
    if (data.users.length < 100) return null;
  }

  return null;
};

const ensureEnvAdminSupabaseUser = async (email: string, password: string) => {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return null;

  const existing = await findSupabaseAuthUserByEmail(supabaseAdmin, email);
  const appMetadata = { role: 'admin' };
  const userMetadata = { name: 'Clinic Organizer Pro Admin' };

  const authUser = existing
    ? (
        await supabaseAdmin.auth.admin.updateUserById(existing.id, {
          password,
          app_metadata: {
            ...(existing.app_metadata ?? {}),
            ...appMetadata,
          },
          user_metadata: {
            ...(existing.user_metadata ?? {}),
            ...userMetadata,
          },
          email_confirm: true,
        })
      ).data.user
    : (
        await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          app_metadata: appMetadata,
          user_metadata: userMetadata,
        })
      ).data.user;

  if (!authUser?.id) return null;

  const now = new Date().toISOString();
  const { data: existingClinic } = await supabaseAdmin
    .from('clinics')
    .select('id')
    .eq('user_id', authUser.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  let clinicId = typeof existingClinic?.id === 'string' ? existingClinic.id : '';

  if (!clinicId) {
    const { data: plan } = await supabaseAdmin
      .from('subscription_plans')
      .select('id')
      .eq('active', true)
      .order('monthly_price', { ascending: true })
      .limit(1)
      .maybeSingle();

    const { data: clinic } = await supabaseAdmin
      .from('clinics')
      .insert({
        user_id: authUser.id,
        plan_id: typeof plan?.id === 'string' ? plan.id : null,
        name: 'Clinic Organizer Pro',
        email,
        status: 'active',
      })
      .select('id')
      .single();

    clinicId = typeof clinic?.id === 'string' ? clinic.id : '';
  }

  await supabaseAdmin.from('profiles').upsert({
    id: authUser.id,
    email,
    full_name: 'Clinic Organizer Pro Admin',
    role: 'admin',
    clinic_id: clinicId || null,
    updated_at: now,
  });

  return {
    id: authUser.id,
    email,
    clinicId: clinicId || undefined,
    created_at: authUser.created_at ?? now,
    updated_at: now,
  };
};

const safelyEnsureEnvAdminSupabaseUser = async (email: string, password: string) => {
  try {
    return await ensureEnvAdminSupabaseUser(email, password);
  } catch (error) {
    console.error('[auth] Failed to ensure env admin in Supabase', error);
    return null;
  }
};

const loadClinicProfile = async (clinicId?: string): Promise<ClinicAuthProfile | null> => {
  if (!clinicId) return null;

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return null;

  const { data, error } = await supabaseAdmin
    .from('clinics')
    .select('id, name, email, phone, cnpj, address, city, state')
    .eq('id', clinicId)
    .maybeSingle();

  if (error || !data) return null;

  return data as ClinicAuthProfile;
};



authRouter.post('/login', async (req, res) => {
  try {
  const body = req.body as LoginBody;

  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!email || !password) {
    return res.status(400).json({ data: null, error: { message: 'Missing email/password' } });
  }

  const adminLoginEmail = getAdminLoginEmail().trim().toLowerCase();
  let user = await findUserByEmail(email).catch((error) => {
    console.error('[auth] Failed to load user profile before login', error);
    return null;
  });

  if (hasSupabaseAuthConfig()) {
    const supabaseAuth = getSupabaseAuth();
    const supabaseAdmin = getSupabaseAdmin();

    if (!supabaseAuth) {
      return res.status(503).json({ data: null, error: { message: 'API indisponível: Supabase Auth não configurado.' } });
    }

    const { data, error } = await supabaseAuth.auth
      .signInWithPassword({ email, password })
      .catch((loginError) => {
        console.error('[auth] Supabase password login failed unexpectedly', loginError);
        return { data: { user: null }, error: loginError };
      });

    if (error || !data.user) {
      const fallbackUser = email === adminLoginEmail ? user ?? (await findLocalUserByEmail(email)) : null;
      const localPasswordOk = fallbackUser ? await bcrypt.compare(password, fallbackUser.passwordHash) : false;
      const envAdminPassword = email === adminLoginEmail ? getAdminLoginPassword() : '';
      const envAdminPasswordOk = Boolean(envAdminPassword && password === envAdminPassword);

      if (!localPasswordOk && !envAdminPasswordOk) {
        return res.status(401).json({ data: null, error: { message: 'Invalid credentials' } });
      }

      const ensuredAdmin = envAdminPasswordOk ? await safelyEnsureEnvAdminSupabaseUser(adminLoginEmail, password) : null;
      const now = new Date().toISOString();
      user =
        fallbackUser ??
        ({
          id: ensuredAdmin?.id ?? `admin_${Buffer.from(adminLoginEmail).toString('base64url')}`,
          email: adminLoginEmail,
          passwordHash: await bcrypt.hash(password, 10),
          role: 'admin',
          clinicId: ensuredAdmin?.clinicId,
          created_at: ensuredAdmin?.created_at ?? now,
          updated_at: ensuredAdmin?.updated_at ?? now,
        } satisfies NonNullable<typeof user>);
    } else {
      let clinicId: string | undefined;
      const ensuredAdmin = email === adminLoginEmail ? await safelyEnsureEnvAdminSupabaseUser(email, password) : null;

      if (supabaseAdmin) {
        const { data: clinic } = await supabaseAdmin
          .from('clinics')
          .select('id')
          .eq('user_id', data.user.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        clinicId = typeof clinic?.id === 'string' ? clinic.id : undefined;

        if (!clinicId) {
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('clinic_id')
            .eq('id', data.user.id)
            .maybeSingle();

          clinicId = typeof profile?.clinic_id === 'string' ? profile.clinic_id : undefined;
        }
      }

      const metadataClinicId = data.user.user_metadata?.clinicId;
      clinicId = ensuredAdmin?.clinicId || clinicId || (typeof metadataClinicId === 'string' ? metadataClinicId : undefined);

      const now = new Date().toISOString();
      const role: UserRole = email === adminLoginEmail ? 'admin' : 'staff';
      user = {
        id: data.user.id,
        email,
        passwordHash: await bcrypt.hash(password, 10),
        role,
        clinicId,
        created_at: data.user.created_at ?? now,
        updated_at: now,
      };

      await upsertUser(user);
    }
  }

  if (!user) {
    return res.status(401).json({ data: null, error: { message: 'Email not registered' } });
  }

  if (!hasSupabaseAuthConfig()) {
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ data: null, error: { message: 'Invalid credentials' } });
    }
  }

  const accessJti = `${Date.now()}_access`;
  const refreshTokenJti = `${Date.now()}_refresh_${Math.random().toString(36).slice(2)}`;

  // Regra de segurança: o JWT só carrega admin se o e-mail for o e-mail de admin.
  const roleForJwt: UserRole = user.email.trim().toLowerCase() === adminLoginEmail ? 'admin' : 'staff';

  const accessToken = signAccessToken(
    { sub: user.id, email: user.email, role: roleForJwt, clinicId: user.clinicId },
    accessJti,
  );
  const refreshToken = signRefreshToken({ sub: user.id, jti: refreshTokenJti });

  const refreshTokenJtiHash = await bcrypt.hash(refreshTokenJti, 10);
  await createSession({
    userId: user.id,
    refreshTokenJtiHash,
    accessTokenJti: accessJti,
  });

  return res.json({ data: { accessToken, refreshToken }, error: null });
  } catch (error) {
    console.error('[auth] Login failed with an unhandled error', error);

    const body = req.body as LoginBody;
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const adminLoginEmail = getAdminLoginEmail().trim().toLowerCase();
    const envAdminPassword = email === adminLoginEmail ? getAdminLoginPassword() : '';

    if (email === adminLoginEmail && envAdminPassword && password === envAdminPassword) {
      const accessJti = `${Date.now()}_access`;
      const refreshTokenJti = `${Date.now()}_refresh_${Math.random().toString(36).slice(2)}`;
      const fallbackAdminId = `admin_${Buffer.from(adminLoginEmail).toString('base64url')}`;
      const accessToken = signAccessToken({ sub: fallbackAdminId, email: adminLoginEmail, role: 'admin' }, accessJti);
      const refreshToken = signRefreshToken({ sub: fallbackAdminId, jti: refreshTokenJti });

      return res.json({ data: { accessToken, refreshToken }, error: null });
    }

    return res.status(500).json({
      data: null,
      error: { message: 'Falha interna na API. Verifique as variáveis do Supabase/Auth no Netlify.' },
    });
  }
});

const handleSignup = async (req: Request, res: Response) => {
  const body = req.body as RegisterBody;

  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const name = sanitizeString(body?.name || body?.fullName);
  const clinicName = sanitizeString(body?.clinicName);
  const requestedClinicId = sanitizeString(body?.clinicId);
  const phone = sanitizeString(body?.phone);
  const cnpj = sanitizeString(body?.cnpj);
  const cep = sanitizeString(body?.cep);
  const address = sanitizeString(body?.address);
  const addressNumber = sanitizeString(body?.addressNumber);
  const city = sanitizeString(body?.city);
  const state = sanitizeString(body?.state).toUpperCase().slice(0, 2);

  if (!name || !email || !password || (!clinicName && !requestedClinicId) || !phone || !cep || !address || !addressNumber || !city || !state) {
    return res.status(400).json({
      data: null,
      error: { message: 'Preencha nome, email, senha, clínica, telefone, CEP, rua, número, cidade e estado.' },
    });
  }

  if (password.length < 6) {
    return res.status(400).json({ data: null, error: { message: 'Senha inválida. Use pelo menos 6 caracteres.' } });
  }

  const phoneDigits = onlyDigits(phone);
  if (phoneDigits.length < 10 || phoneDigits.length > 11) {
    return res.status(400).json({ data: null, error: { message: 'Telefone deve ter 10 ou 11 números.' } });
  }

  const cepDigits = onlyDigits(cep);
  if (cepDigits.length !== 8) {
    return res.status(400).json({ data: null, error: { message: 'CEP deve ter exatamente 8 números.' } });
  }

  const cnpjDigits = onlyDigits(cnpj);
  if (cnpj && cnpjDigits.length !== 14) {
    return res.status(400).json({ data: null, error: { message: 'CNPJ deve ter exatamente 14 números.' } });
  }

  const addressWithNumber = `${address}, ${addressNumber}`;
  const addressWithCep = addressWithNumber.toLowerCase().includes('cep')
    ? addressWithNumber
    : `${addressWithNumber} - CEP ${cep}`;

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return res.status(503).json({
      data: null,
      error: { message: 'API indisponível: configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.' },
    });
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    return res.status(409).json({ data: null, error: { message: 'Email already registered' } });
  }

  const now = new Date().toISOString();

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name,
      clinicId: requestedClinicId,
      clinicName,
      phone,
      cnpj,
      cep,
      address: addressWithCep,
      addressNumber,
      city,
      state,
    },
  });

  if (createError || !created.user) {
    const mapped = mapSupabaseAuthError(createError?.message ?? 'Falha ao criar usuário no Supabase Auth.');
    return res.status(mapped.status).json({ data: null, error: { message: mapped.message } });
  }

  const existingClinicResult = requestedClinicId
    ? await supabaseAdmin
        .from('clinics')
        .select('id, name, email, phone, cnpj, address, city, state')
        .eq('id', requestedClinicId)
        .maybeSingle()
    : { data: null, error: null };

  const { data: clinic, error: clinicError } = existingClinicResult.data
    ? existingClinicResult
    : await supabaseAdmin
        .from('clinics')
        .insert({
          user_id: created.user.id,
          name: clinicName,
          email,
          phone,
          cnpj: cnpj || null,
          address: addressWithCep,
          city,
          state,
          status: 'active',
        })
        .select('id, name, email, phone, cnpj, address, city, state')
        .single();

  if (clinicError || !clinic) {
    await supabaseAdmin.auth.admin.deleteUser(created.user.id).catch(() => undefined);
    return res.status(500).json({
      data: null,
      error: { message: clinicError?.message ?? 'Usuário criado, mas falhou ao salvar os dados da clínica.' },
    });
  }

  await supabaseAdmin.from('clinic_settings').upsert({
    clinic_id: clinic.id,
    user_id: created.user.id,
    clinic_name: clinicName || clinic.name,
    clinic_email: email,
    clinic_phone: phone,
    clinic_address: addressWithCep,
    clinic_city: city,
    clinic_state: state,
    clinic_cnpj: cnpj || null,
  }, { onConflict: 'clinic_id' });

  const user = {
    id: created.user.id,
    email,
    passwordHash: await bcrypt.hash(password, 10),
    role: 'staff' as UserRole,
    clinicId: clinic.id,
    created_at: now,
    updated_at: now,
  };

  await upsertUser(user);

  return res.status(201).json({
    data: {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        clinicId: user.clinicId,
        name,
        clinic,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    },
    error: null,
  });
};

authRouter.post('/signup', handleSignup);
authRouter.post('/register', handleSignup);

authRouter.post('/refresh', async (req, res) => {
  const body = req.body as RefreshBody;
  const refreshToken = typeof body?.refreshToken === 'string' ? body.refreshToken : '';

  if (!refreshToken) {
    return res.status(400).json({ data: null, error: { message: 'Missing refreshToken' } });
  }

  try {
    const decoded = jwt.verify(refreshToken, getRefreshSecret()) as {
      sub?: string;
      jti?: string;
      typ?: string;
    };

    if (decoded.typ !== 'refresh') {
      return res.status(401).json({ data: null, error: { message: 'Invalid token type' } });
    }

    const userId = String(decoded.sub ?? '');
    const refreshJti = String(decoded.jti ?? '');

    if (!userId || !refreshJti) {
      return res.status(401).json({ data: null, error: { message: 'Invalid refresh token payload' } });
    }

    const [user, sessions] = await Promise.all([
      // precisa existir no store
      (await import('../services/authStore.js')).findUserById?.(userId) ?? null,
      (await import('../services/authStore.js')).listSessionsByUserId?.(userId) ?? [],
    ]);

    if (!user) {
      return res.status(401).json({ data: null, error: { message: 'Unknown user' } });
    }

    const resolvedUser = user;

    const validSession =
      (await Promise.all(
        sessions.map(async (s) => {
          const ok = await bcrypt.compare(refreshJti, s.refreshTokenJtiHash);
          return ok ? s : null;
        }),
      ))
        .find(Boolean) ?? null;

    if (!validSession) {
      return res.status(401).json({ data: null, error: { message: 'Refresh token revoked/invalid' } });
    }

    const newAccessJti = `${Date.now()}_access`;
    const accessToken = signAccessToken(
      {
        sub: resolvedUser.id,
        email: resolvedUser.email,
        role: resolvedUser.role,
        clinicId: resolvedUser.clinicId,
      },
      newAccessJti,
    );

    return res.json({ data: { accessToken }, error: null });
  } catch {
    return res.status(401).json({ data: null, error: { message: 'Invalid/expired refresh token' } });
  }
});

authRouter.post('/logout', async (req, res) => {
  const refreshToken = (req.body as RefreshBody)?.refreshToken;
  if (typeof refreshToken !== 'string' || !refreshToken) {
    return res.status(400).json({ data: null, error: { message: 'Missing refreshToken' } });
  }

  try {
    const decoded = jwt.verify(refreshToken, getRefreshSecret()) as {
      sub?: string;
      jti?: string;
      typ?: string;
    };

    if (decoded.typ !== 'refresh') {
      return res.status(401).json({ data: null, error: { message: 'Invalid token type' } });
    }

    const userId = String(decoded.sub ?? '');
    const refreshJti = String(decoded.jti ?? '');

    if (!userId || !refreshJti) {
      return res.status(401).json({ data: null, error: { message: 'Invalid refresh token payload' } });
    }

    const { listSessionsByUserId, revokeSessionById } = await import('../services/authStore.js');
    const sessions = await listSessionsByUserId(userId);

    const matched = await Promise.all(
      sessions.map(async (s) => {
        const ok = await bcrypt.compare(refreshJti, s.refreshTokenJtiHash);
        return ok ? s : null;
      }),
    );

    const session = matched.find(Boolean) ?? null;
    if (!session) {
      // já revogado: tratamos como sucesso idempotente
      return res.json({ data: { ok: true }, error: null });
    }

    await revokeSessionById(session.id);
    return res.json({ data: { ok: true }, error: null });
  } catch {
    return res.status(401).json({ data: null, error: { message: 'Invalid/expired refresh token' } });
  }
});

authRouter.get('/me', requireAuth, async (req, res) => {
  if (!req.auth?.user) {
    return res.status(401).json({ data: null, error: { message: 'Unauthorized' } });
  }

  const clinic = await loadClinicProfile(req.auth.user.clinicId);
  const supabaseAdmin = getSupabaseAdmin();
  const authUser =
    supabaseAdmin && isUuid(req.auth.user.id) ? await supabaseAdmin.auth.admin.getUserById(req.auth.user.id) : null;
  const rawMetadata = authUser?.data?.user?.user_metadata as Record<string, unknown> | undefined;
  const responsibleName = typeof rawMetadata?.name === 'string' ? rawMetadata.name : '';

  return res.json({
    data: {
      ...req.auth.user,
      clinic,
      responsibleName,
    },
    error: null,
  });
});

export default authRouter;
