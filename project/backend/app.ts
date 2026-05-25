import './loadEnv.js';
import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { localApiRouter } from './routes/localApi.js';
import authRouter from './routes/auth.js';
import { requireAdmin } from './middlewares/admin.js';
import adminBillingRouter from './routes/adminBilling.js';
import adminConfigRouter from './routes/adminConfig.js';
import adminUsersRouter from './routes/adminUsers.js';
import aiRouter from './routes/ai.js';
import { readEnv, readSupabaseAnonKey, readSupabaseServiceKey, readSupabaseUrl } from './utils/supabaseEnv.js';

const app = express();
const API_VERSION = '2026-05-23-netlify-auth-fixed';

const readCsvEnv = (...names: string[]) =>
  names
    .flatMap((name) => (process.env[name] ?? '').split(','))
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

const allowedOrigins = new Set([
  ...readCsvEnv('CORS_ORIGIN', 'FRONTEND_URL', 'APP_URL', 'PUBLIC_APP_URL', 'NETLIFY_URL', 'VERCEL_URL'),
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
  'https://clinicorganizerpro.netlify.app',
  'https://clinicorganzerpro.netlify.app',
]);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.size === 0 || allowedOrigins.has(origin.replace(/\/$/, ''))) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origem não permitida pelo CORS: ${origin}`));
    },
    credentials: true,
  }),
);
app.use(cookieParser());
app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    // eslint-disable-next-line no-console
    console.info(`[api] ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - startedAt}ms`);
  });
  next();
});
app.use(
  express.json({
    limit: '2mb',
    verify: (req, _res, buf) => {
      const originalUrl = (req as typeof req & { originalUrl?: string }).originalUrl ?? '';
      if (originalUrl.endsWith('/billing/webhook')) {
        (req as typeof req & { rawBody?: Buffer }).rawBody = Buffer.from(buf);
      }
    },
  }),
);

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'clinic-organizer-api',
    version: API_VERSION,
    env: process.env.NODE_ENV ?? 'development',
    commit: process.env.COMMIT_REF ?? process.env.HEAD ?? null,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/_diag', (_req, res) => {
  const supabaseUrl = readSupabaseUrl();
  let supabaseHost = '';
  let supabasePath = '';

  try {
    const parsed = new URL(supabaseUrl);
    supabaseHost = parsed.host;
    supabasePath = parsed.pathname;
  } catch {
    supabasePath = supabaseUrl ? 'invalid-url' : '';
  }

  res.json({
    data: {
      ok: true,
      version: API_VERSION,
      netlify: Boolean(process.env.NETLIFY),
      commit: process.env.COMMIT_REF ?? process.env.HEAD ?? null,
      supabase: {
        hasUrl: Boolean(supabaseUrl),
        host: supabaseHost,
        path: supabasePath,
        hasAnonKey: Boolean(readSupabaseAnonKey()),
        hasServiceKey: Boolean(readSupabaseServiceKey()),
      },
      admin: {
        hasLoginEmail: Boolean(readEnv('ADMIN_LOGIN_EMAIL')),
        hasLoginPassword: Boolean(readEnv('ADMIN_LOGIN_PASSWORD', 'ADMIN_PASSWORD')),
      },
    },
    error: null,
  });
});

app.use('/api/auth', authRouter);

app.get('/api/admin/health', requireAdmin(), (_req, res) => {
  res.json({ data: { ok: true }, error: null });
});

app.use('/api', adminBillingRouter);
app.use('/api/admin', adminConfigRouter);
app.use('/api/admin', adminUsersRouter);
app.use('/api/admin/data', requireAdmin(['admin']), localApiRouter);
app.use('/api/ai', aiRouter);
app.use('/api', localApiRouter);

// Netlify rewrites may invoke this function with the function prefix stripped.
app.use('/auth', authRouter);
app.get('/admin/health', requireAdmin(), (_req, res) => {
  res.json({ data: { ok: true }, error: null });
});
app.use('/', adminBillingRouter);
app.use('/admin', adminConfigRouter);
app.use('/admin', adminUsersRouter);
app.use('/admin/data', requireAdmin(['admin']), localApiRouter);
app.use('/ai', aiRouter);
app.use('/', localApiRouter);

app.use('/api', (_req, res) => {
  res.status(404).json({ data: null, error: { message: 'Rota de API não encontrada.' } });
});

const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error('[api] erro não tratado', err);

  if (res.headersSent) {
    return;
  }

  const rawMessage = err instanceof Error ? err.message : String(err ?? '');
  const status = typeof (err as { status?: unknown }).status === 'number' ? (err as { status: number }).status : 500;
  if (status === 400 && rawMessage.toLowerCase().includes('json')) {
    res.status(400).json({
      data: null,
      error: { message: 'JSON inválido na requisição.' },
    });
    return;
  }

  const isAuthLogin = req.originalUrl.includes('/auth/login');
  const safeMessage = rawMessage
    .replace(/sb_(?:secret|publishable)_[A-Za-z0-9._-]+/g, '[supabase-key]')
    .replace(/eyJ[A-Za-z0-9._-]+/g, '[jwt]');

  res.status(500).json({
    data: null,
    error: {
      message: isAuthLogin && safeMessage ? `Falha no login: ${safeMessage}` : 'Falha interna na API. Verifique os logs do backend.',
    },
  });
};

app.use(errorHandler);

export default app;
