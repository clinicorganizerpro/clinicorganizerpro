const express = require('express');
const cors = require('cors');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');

const PORT = 8788;
const HOST = '127.0.0.1';

const SYNC_RELATIONS = [
  'clinics',
  'users_profiles',
  'patients',
  'appointments',
  'financial_transactions',
  'professionals',
  'services',
  'anamnesis',
  'notifications',
  'settings',
  'incomes',
  'expenses',
  'anamneses',
];

const RELATION_ALIASES = {
  financial: 'financial_transactions',
  financeiro: 'financial_transactions',
  financial_transactions: 'financial_transactions',
  anamnesis: 'anamnesis',
  anamneses: 'anamnesis',
  clinic_settings: 'settings',
  system_settings: 'settings',
};

const REMOTE_RELATION_ALIASES = {
  users_profiles: 'profiles',
  financial_transactions: 'transactions',
  anamnesis: 'anamneses',
  settings: 'clinic_settings',
};

const nowIso = () => new Date().toISOString();

function normalizeRelation(relation) {
  const value = String(relation || '').trim();
  return RELATION_ALIASES[value] || value;
}

function normalizeRemoteRelation(relation) {
  const localRelation = normalizeRelation(relation);
  return REMOTE_RELATION_ALIASES[localRelation] || localRelation;
}

function parseFilters(query = {}) {
  const filters = [];
  const indices = new Set();
  for (const key of Object.keys(query)) {
    const match = key.match(/^f\.(\d+)\./);
    if (match) indices.add(Number(match[1]));
  }

  for (const index of Array.from(indices).sort((a, b) => a - b)) {
    const op = query[`f.${index}.op`];
    const col = query[`f.${index}.col`];
    const raw = query[`f.${index}.val`];
    if (op !== 'eq' || typeof col !== 'string') continue;
    let val = raw;
    try {
      val = JSON.parse(raw);
    } catch {
      // keep raw
    }
    filters.push({ op: 'eq', col, val });
  }
  return filters;
}

function createLogger(baseDir, fileName) {
  const logsDir = path.join(baseDir, 'logs');
  fs.mkdirSync(logsDir, { recursive: true });
  const filePath = path.join(logsDir, fileName);
  return {
    path: filePath,
    write(message, error) {
      const line = `[${nowIso()}] ${message}${error ? ` ${error.stack || error.message || String(error)}` : ''}`;
      console.log(`[local-backend] ${message}`, error || '');
      fs.appendFileSync(filePath, `${line}\n`, 'utf8');
    },
  };
}

function createCryptoHelpers(baseDir) {
  const keyPath = path.join(baseDir, 'database', '.session.key');
  fs.mkdirSync(path.dirname(keyPath), { recursive: true });
  let key;
  if (fs.existsSync(keyPath)) {
    key = fs.readFileSync(keyPath);
  } else {
    key = crypto.randomBytes(32);
    fs.writeFileSync(keyPath, key);
  }

  return {
    encrypt(value) {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
      const tag = cipher.getAuthTag();
      return Buffer.concat([iv, tag, encrypted]).toString('base64');
    },
  };
}

function createSupabaseClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !anonKey) return null;

  if (process.env.SUPABASE_STRICT_TLS !== 'true') {
    try {
      const { Agent, setGlobalDispatcher } = require('undici');
      setGlobalDispatcher(new Agent({ connect: { rejectUnauthorized: false } }));
    } catch {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }
  }

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

function loadRuntimeEnv(baseDir) {
  for (const fileName of ['.env', '.env.local']) {
    const filePath = path.join(baseDir, fileName);
    if (!fs.existsSync(filePath)) continue;
    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const index = trimmed.indexOf('=');
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, '');
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

function envelope(data, error = null) {
  return { data, error };
}

async function createLocalBackend({ database, baseDir }) {
  loadRuntimeEnv(baseDir);
  const app = express();
  const appLog = createLogger(baseDir, 'app.log');
  const syncLog = createLogger(baseDir, 'sync.log');
  const cryptoHelpers = createCryptoHelpers(baseDir);
  const supabase = createSupabaseClient();

  let server = null;
  let syncTimer = null;
  let lastSyncAt = null;
  let lastSyncError = null;
  let online = false;
  let currentAuthUser = null;

  app.use(cors({ origin: ['file://', 'http://localhost:5173', 'http://127.0.0.1:5173'], credentials: true }));
  app.use(express.json({ limit: '25mb' }));

  async function checkOnline() {
    if (!supabase) {
      online = false;
      return false;
    }
    try {
      const { error } = await supabase.auth.getSession();
      online = !error;
      return online;
    } catch {
      online = false;
      return false;
    }
  }

  async function syncPush() {
    if (!supabase) {
      appLog.write('Sync push ignorado: Supabase nao configurado.');
      return { pushed: 0 };
    }
    await checkOnline();
    if (!online) {
      appLog.write('Sync push ignorado: offline.');
      return { pushed: 0 };
    }

    const pending = await database.listPending();
    let pushed = 0;

    for (const [table, rows] of Object.entries(pending)) {
      const remoteTable = normalizeRemoteRelation(table);
      for (const row of rows) {
        const payload = { ...row };
        delete payload.sync_status;
        delete payload.last_synced_at;
        const { data, error } = await supabase.from(remoteTable).upsert(payload, { onConflict: 'id' }).select('*').maybeSingle();
        if (error) {
          syncLog.write(`Erro push ${remoteTable}/${row.id}:`, error);
          throw error;
        }
        await database.markSynced(table, row.id, data || {});
        pushed += 1;
      }
    }

    return { pushed };
  }

  async function syncPull() {
    if (!supabase) {
      appLog.write('Sync pull ignorado: Supabase nao configurado.');
      return { pulled: 0 };
    }
    await checkOnline();
    if (!online) {
      appLog.write('Sync pull ignorado: offline.');
      return { pulled: 0 };
    }

    let pulled = 0;
    for (const relation of SYNC_RELATIONS) {
      const remoteTable = normalizeRemoteRelation(relation);
      const { data, error } = await supabase.from(remoteTable).select('*').order('updated_at', { ascending: true });
      if (error) {
        syncLog.write(`Erro pull ${remoteTable}:`, error);
        continue;
      }
      for (const remote of data || []) {
        const local = await database.findById(relation, remote.id);
        if (local?.sync_status === 'pending' && local.updated_at > remote.updated_at) {
          await database.saveConflict(remoteTable, remote.id, local, remote, 'local_newer_pending');
          continue;
        }
        await database.saveRemote(relation, remote);
        pulled += 1;
      }
    }
    return { pulled };
  }

  async function syncRun() {
    try {
      const push = await syncPush();
      const pull = await syncPull();
      lastSyncAt = nowIso();
      lastSyncError = null;
      syncLog.write(`Sync concluido: push=${push.pushed} pull=${pull.pulled}`);
      return { ...push, ...pull, lastSyncAt };
    } catch (error) {
      lastSyncError = error.message || String(error);
      syncLog.write('Erro no sync:', error);
      throw error;
    }
  }

  app.get('/health', async (_req, res) => {
    res.json({
      ok: true,
      service: 'clinic-organizer-local-backend',
      online: await checkOnline(),
      db: database.getInfo(),
      lastSyncAt,
    });
  });

  app.post(['/auth/login', '/api/auth/login'], async (req, res) => {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const password = String(req.body?.password || '');

      // Tenta login local primeiro (funciona sempre que houver usuário criado)
      try {
        const localResult = await database.signIn(email, password);
        const { accessToken } = localResult;
        const encrypted = cryptoHelpers.encrypt({ access_token: accessToken, user: localResult });

        await database.run(
          `INSERT INTO local_sessions (id, user_id, email, clinic_id, encrypted_session, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET encrypted_session = excluded.encrypted_session, updated_at = excluded.updated_at`,
          ['current', localResult.id, email, localResult.clinicId, encrypted, nowIso(), nowIso()],
        );

        currentAuthUser = {
          id: localResult.id,
          email,
          role: localResult.role,
          clinicId: localResult.clinicId,
          responsibleName: localResult.user_metadata?.name || '',
          clinic: { id: localResult.clinicId, name: 'Clinica Local' },
        };

        res.json(envelope({ accessToken, refreshToken: null }));
        return;
      } catch (localError) {
        appLog.write('Login local falhou, tentando Supabase:', localError.message);
      }

      // Se login local falhar e Supabase estiver configurado, tenta login online
      if (!supabase) {
        throw new Error('Supabase nao configurado e login local falhou.');
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.session || !data.user) throw error || new Error('Sessao Supabase ausente.');
      const clinicId = data.user.user_metadata?.clinicId || data.user.user_metadata?.clinic_id || data.user.id;
      const encrypted = cryptoHelpers.encrypt(data.session);
      await database.run(
        `INSERT INTO local_sessions (id, user_id, email, clinic_id, encrypted_session, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET encrypted_session = excluded.encrypted_session, updated_at = excluded.updated_at`,
        ['current', data.user.id, email, clinicId, encrypted, nowIso(), nowIso()],
      );
      await database.saveRemote('users_profiles', {
        id: data.user.id,
        email,
        clinic_id: clinicId,
        role: data.user.user_metadata?.role || 'owner',
      });
      currentAuthUser = {
        id: data.user.id,
        email,
        role: data.user.user_metadata?.role || 'owner',
        clinicId,
        responsibleName: data.user.user_metadata?.name || '',
        clinic: { id: clinicId, name: data.user.user_metadata?.clinicName || 'Clinica' },
      };
      res.json(envelope({ accessToken: data.session.access_token, refreshToken: data.session.refresh_token }));
    } catch (error) {
      appLog.write('Falha login:', error);
      res.status(401).json(envelope(null, { message: error.message || 'Falha no login.' }));
    }
  });

  app.get('/api/auth/me', async (_req, res) => {
    if (currentAuthUser) {
      res.json(envelope(currentAuthUser));
      return;
    }

    const row = await database.get('SELECT user_id, email, clinic_id FROM local_sessions WHERE id = ?', ['current']);
    if (!row) {
      res.status(401).json(envelope(null, { message: 'Sessao local ausente.' }));
      return;
    }

    const user = {
      id: row.user_id,
      email: row.email,
      role: 'owner',
      clinicId: row.clinic_id,
      clinic: { id: row.clinic_id, name: 'Clinica Local' },
    };
    currentAuthUser = user;
    res.json(envelope(user));
  });

  app.post(['/auth/register', '/api/auth/signup'], async (req, res) => {
    try {
      if (!supabase) throw new Error('Supabase nao configurado.');
      const email = String(req.body?.email || '').trim().toLowerCase();
      const password = String(req.body?.password || '');
      const clinicName = String(req.body?.clinicName || req.body?.clinic_name || 'Clinica');
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: req.body?.name || '', clinicName } },
      });
      if (error) throw error;
      const userId = data.user?.id || crypto.randomUUID();
      const clinicId = crypto.randomUUID();
      await database.create('clinics', { id: clinicId, user_id: userId, clinic_id: clinicId, name: clinicName, email });
      await database.create('users_profiles', { id: userId, user_id: userId, clinic_id: clinicId, email, role: 'owner' });
      res.json(envelope({ user: { id: userId, email, clinicId } }));
    } catch (error) {
      appLog.write('Falha cadastro:', error);
      res.status(400).json(envelope(null, { message: error.message || 'Falha no cadastro.' }));
    }
  });

  app.post(['/auth/logout', '/api/auth/logout'], async (_req, res) => {
    res.json(envelope({ ok: true }));
  });

  app.get('/sync/status', async (_req, res) => {
    res.json(envelope({ online: await checkOnline(), lastSyncAt, pending: await database.pendingCount(), error: lastSyncError }));
  });
  app.post('/sync/push', async (_req, res) => {
    try { res.json(envelope(await syncPush())); } catch (error) { res.status(500).json(envelope(null, { message: error.message })); }
  });
  app.post('/sync/pull', async (_req, res) => {
    try { res.json(envelope(await syncPull())); } catch (error) { res.status(500).json(envelope(null, { message: error.message })); }
  });
  app.post('/sync/run', async (_req, res) => {
    try { res.json(envelope(await syncRun())); } catch (error) { res.status(500).json(envelope(null, { message: error.message })); }
  });

  async function listHandler(req, res) {
    const relation = normalizeRelation(req.params.relation);
    const data = await database.list(relation, parseFilters(req.query));
    res.json(envelope(data));
  }
  async function createHandler(req, res) {
    const relation = normalizeRelation(req.params.relation);
    const data = await database.create(relation, req.body?.payload || req.body || {});
    res.json(envelope(data));
  }
  async function updateHandler(req, res) {
    const relation = normalizeRelation(req.params.relation);
    const id = req.params.id || parseFilters(req.query).find((f) => f.col === 'id')?.val || req.body?.payload?.id || req.body?.id;
    const data = await database.update(relation, String(id), req.body?.payload || req.body || {});
    res.json(envelope(data));
  }
  async function deleteHandler(req, res) {
    const relation = normalizeRelation(req.params.relation);
    const id = req.params.id || parseFilters(req.query).find((f) => f.col === 'id')?.val;
    const data = await database.delete(relation, String(id));
    res.json(envelope(data));
  }

  for (const prefix of ['', '/api']) {
    app.get(`${prefix}/:relation`, (req, res) => listHandler(req, res).catch((error) => res.status(500).json(envelope(null, { message: error.message }))));
    app.post(`${prefix}/:relation`, (req, res) => createHandler(req, res).catch((error) => res.status(500).json(envelope(null, { message: error.message }))));
    app.put(`${prefix}/:relation/:id?`, (req, res) => updateHandler(req, res).catch((error) => res.status(500).json(envelope(null, { message: error.message }))));
    app.delete(`${prefix}/:relation/:id?`, (req, res) => deleteHandler(req, res).catch((error) => res.status(500).json(envelope(null, { message: error.message }))));
  }

  return {
    start() {
      return new Promise((resolve, reject) => {
        server = app.listen(PORT, HOST, () => {
          appLog.write(`Backend local iniciado em http://${HOST}:${PORT}`);
          syncTimer = setInterval(() => void syncRun().catch(() => {}), 120000);
          void syncRun().catch(() => {});
          resolve({ url: `http://${HOST}:${PORT}`, appLog: appLog.path, syncLog: syncLog.path });
        });
        server.on('error', reject);
      });
    },
    stop() {
      if (syncTimer) clearInterval(syncTimer);
      if (server) server.close();
    },
  };
}

module.exports = { createLocalBackend };
