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

const app = express();

const readCsvEnv = (...names: string[]) =>
  names
    .flatMap((name) => (process.env[name] ?? '').split(','))
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

const allowedOrigins = new Set([
  ...readCsvEnv('CORS_ORIGIN', 'FRONTEND_URL', 'APP_URL', 'PUBLIC_APP_URL', 'NETLIFY_URL', 'VERCEL_URL'),
  ...(process.env.NODE_ENV !== 'production'
    ? ['http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:5173', 'http://127.0.0.1:4173']
    : []),
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
    env: process.env.NODE_ENV ?? 'development',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', localApiRouter);
app.use('/api/auth', authRouter);

app.get('/api/admin/health', requireAdmin(), (_req, res) => {
  res.json({ data: { ok: true }, error: null });
});

app.use('/api', adminBillingRouter);
app.use('/api/admin', adminConfigRouter);
app.use('/api/admin', adminUsersRouter);
app.use('/api/ai', aiRouter);

// Netlify rewrites may invoke this function with the function prefix stripped.
app.use('/auth', authRouter);
app.get('/admin/health', requireAdmin(), (_req, res) => {
  res.json({ data: { ok: true }, error: null });
});
app.use('/', adminBillingRouter);
app.use('/admin', adminConfigRouter);
app.use('/admin', adminUsersRouter);
app.use('/ai', aiRouter);
app.use('/', localApiRouter);

app.use('/api', (_req, res) => {
  res.status(404).json({ data: null, error: { message: 'Rota de API não encontrada.' } });
});

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error('[api] erro não tratado', err);

  if (res.headersSent) {
    return;
  }

  res.status(500).json({
    data: null,
    error: { message: 'Falha interna na API. Verifique os logs do backend.' },
  });
};

app.use(errorHandler);

export default app;
