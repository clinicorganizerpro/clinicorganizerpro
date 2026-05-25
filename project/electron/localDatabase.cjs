const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const RELATION_TABLES = new Map([
  ['clinics', 'clinics'],
  ['users_profiles', 'users_profiles'],
  ['patients', 'patients'],
  ['appointments', 'appointments'],
  ['professionals', 'professionals'],
  ['services', 'services'],
  ['procedures', 'services'],
  ['anamneses', 'anamneses'],
  ['anamnesis', 'anamnesis'],
  ['incomes', 'incomes'],
  ['expenses', 'expenses'],
  ['financial_transactions', 'financial_transactions'],
  ['financial', 'financial'],
  ['financeiro', 'financial'],
  ['plans', 'plans'],
  ['subscription_plans', 'plans'],
  ['settings', 'settings'],
  ['system_settings', 'settings'],
  ['clinic_settings', 'settings'],
  ['users', 'users'],
  ['logins', 'users'],
  ['notifications', 'notifications'],
  ['messages', 'messages'],
  ['campaigns', 'campaigns'],
  ['prescriptions', 'prescriptions'],
  ['procedure_photos', 'procedure_photos'],
  ['procedurePhotos', 'procedure_photos'],
]);

const DATA_TABLES = Array.from(new Set(RELATION_TABLES.values()));
const SYNC_COLUMNS = [
  ['sync_status', "TEXT NOT NULL DEFAULT 'synced'"],
  ['last_synced_at', 'TEXT'],
];

const nowIso = () => new Date().toISOString();

const makeId = (prefix = 'row') => {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const resolveBaseDir = (app, isDev) => {
  if (!isDev && app.isPackaged) {
    return path.dirname(process.execPath);
  }

  return path.resolve(__dirname, '..');
};

const getTableName = (relation) => {
  const safeRelation = String(relation || '').trim();
  const mapped = RELATION_TABLES.get(safeRelation);
  if (!mapped) {
    throw new Error(`Tabela local nao mapeada: ${safeRelation}`);
  }
  return mapped;
};

class LocalDatabase {
  constructor(app, isDev) {
    this.baseDir = resolveBaseDir(app, isDev);
    this.databaseDir = path.join(this.baseDir, 'database');
    this.backupDir = path.join(this.baseDir, 'backups');
    this.dbPath = path.join(this.databaseDir, 'clinic-organizer.db');
    this.logPath = path.join(this.databaseDir, 'clinic-organizer.log');

    fs.mkdirSync(this.backupDir, { recursive: true });
    this.log(`SQLite local iniciando em: ${this.dbPath}`);

    let sqlite3;
    try {
      sqlite3 = require('sqlite3');
    } catch (error) {
      this.log('Erro ao carregar sqlite3:', error);
      throw error;
    }

    this.db = new sqlite3.Database(this.dbPath);
    this.ready = this.initialize();
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function onRun(error) {
        if (error) reject(error);
        else resolve(this);
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (error, row) => {
        if (error) reject(error);
        else resolve(row);
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (error, rows) => {
        if (error) reject(error);
        else resolve(rows);
      });
    });
  }

  exec(sql) {
    return new Promise((resolve, reject) => {
      this.db.exec(sql, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  async initialize() {
    await this.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    await this.ensureSchema();
    this.createBackup();
  }

  log(message, error) {
    const line = `[${nowIso()}] ${message}${error ? ` ${error.stack || error.message || String(error)}` : ''}`;
    console.log(`[local-db] ${message}`, error || '');
    try {
      fs.mkdirSync(this.databaseDir, { recursive: true });
      fs.appendFileSync(this.logPath, `${line}\n`, 'utf8');
    } catch {
      // Logging must never block app startup.
    }
  }

  async ensureSchema() {
    for (const table of DATA_TABLES) {
      await this.exec(`
        CREATE TABLE IF NOT EXISTS ${table} (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          clinic_id TEXT,
          data TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT,
          sync_status TEXT NOT NULL DEFAULT 'synced',
          last_synced_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_${table}_user_id ON ${table}(user_id);
        CREATE INDEX IF NOT EXISTS idx_${table}_clinic_id ON ${table}(clinic_id);
        CREATE INDEX IF NOT EXISTS idx_${table}_deleted_at ON ${table}(deleted_at);
      `);
      await this.ensureSyncColumns(table);
      this.log(`Tabela garantida: ${table}`);
    }

    await this.exec(`
      CREATE TABLE IF NOT EXISTS local_users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'owner',
        clinic_id TEXT,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_local_users_email ON local_users(email);
    `);
    this.log('Tabela garantida: local_users');

    await this.exec(`
      CREATE TABLE IF NOT EXISTS local_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        email TEXT NOT NULL,
        clinic_id TEXT,
        encrypted_session TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sync_conflicts (
        id TEXT PRIMARY KEY,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        local_data TEXT,
        remote_data TEXT,
        reason TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
    this.log('Tabelas garantidas: local_sessions, sync_conflicts');
  }

  async ensureSyncColumns(table) {
    const columns = await this.all(`PRAGMA table_info(${table})`);
    const names = new Set(columns.map((column) => column.name));
    for (const [name, definition] of SYNC_COLUMNS) {
      if (!names.has(name)) {
        await this.run(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
        this.log(`Coluna de sync criada: ${table}.${name}`);
      }
    }
  }

  createBackup() {
    try {
      if (!fs.existsSync(this.dbPath)) return null;

      const stamp = new Date().toISOString().slice(0, 10);
      const backupPath = path.join(this.backupDir, `clinic-organizer-backup-${stamp}.db`);

      if (!fs.existsSync(backupPath)) {
        fs.copyFileSync(this.dbPath, backupPath);
        this.log(`Backup criado: ${backupPath}`);
      }

      return backupPath;
    } catch (error) {
      this.log('Erro ao criar backup:', error);
      return null;
    }
  }

  rowToRecord(row) {
    const data = JSON.parse(row.data || '{}');
    return {
      ...data,
      id: row.id,
      user_id: row.user_id ?? data.user_id,
      clinic_id: row.clinic_id ?? data.clinic_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at,
      sync_status: row.sync_status,
      last_synced_at: row.last_synced_at,
    };
  }

  matchesFilters(record, filters = []) {
    return filters.every((filter) => {
      if (!filter || filter.op !== 'eq') return true;
      return record[filter.col] === filter.val;
    });
  }

  async list(relation, filters = []) {
    try {
      await this.ready;
      const table = getTableName(relation);
      this.log(`Buscando registros: ${relation}`);
      const rows = await this.all(`SELECT * FROM ${table} WHERE deleted_at IS NULL ORDER BY created_at ASC`);
      return rows.map((row) => this.rowToRecord(row)).filter((record) => this.matchesFilters(record, filters));
    } catch (error) {
      this.log(`Erro ao buscar dados em ${relation}:`, error);
      throw error;
    }
  }

  async findById(relation, id) {
    try {
      await this.ready;
      const table = getTableName(relation);
      const row = await this.get(`SELECT * FROM ${table} WHERE id = ? AND deleted_at IS NULL`, [id]);
      return row ? this.rowToRecord(row) : null;
    } catch (error) {
      this.log(`Erro ao buscar registro em ${relation}:`, error);
      throw error;
    }
  }

  async create(relation, payload = {}) {
    try {
      await this.ready;
      const table = getTableName(relation);
      const id = String(payload.id || makeId(relation));
      const createdAt = String(payload.created_at || payload.createdAt || nowIso());
      const updatedAt = nowIso();

      // Get default user/clinic from the most recently created user if not provided
      let userId = typeof payload.user_id === 'string' ? payload.user_id : typeof payload.userId === 'string' ? payload.userId : null;
      let clinicId = typeof payload.clinic_id === 'string' ? payload.clinic_id : typeof payload.clinicId === 'string' ? payload.clinicId : null;

      if (!userId || !clinicId) {
        const defaultUser = await this.get('SELECT id, clinic_id FROM local_users ORDER BY created_at DESC LIMIT 1');
        if (defaultUser) {
          userId = userId || defaultUser.id;
          clinicId = clinicId || defaultUser.clinic_id;
        }
      }

      if (!userId) userId = 'local-user';
      if (!clinicId) clinicId = userId;

      const syncStatus = String(payload.sync_status || 'pending');
      const lastSyncedAt = typeof payload.last_synced_at === 'string' ? payload.last_synced_at : null;
      const data = { ...payload, id, user_id: userId, clinic_id: clinicId, created_at: createdAt, updated_at: updatedAt, sync_status: syncStatus, last_synced_at: lastSyncedAt };

      this.log(`Recebeu POST local em ${relation}: ${id}`);
      await this.run(`
        INSERT INTO ${table} (id, user_id, clinic_id, data, created_at, updated_at, deleted_at, sync_status, last_synced_at)
        VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          user_id = excluded.user_id,
          clinic_id = excluded.clinic_id,
          data = excluded.data,
          updated_at = excluded.updated_at,
          deleted_at = NULL,
          sync_status = excluded.sync_status,
          last_synced_at = excluded.last_synced_at
      `, [
        id,
        userId,
        clinicId,
        JSON.stringify(data),
        createdAt,
        updatedAt,
        syncStatus,
        lastSyncedAt,
      ]);

      this.log(`Salvo no SQLite em ${relation}: ${id}`);
      return await this.findById(relation, id);
    } catch (error) {
      this.log(`Erro ao salvar em ${relation}:`, error);
      throw error;
    }
  }

  async update(relation, id, payload = {}) {
    try {
      await this.ready;
      const current = await this.findById(relation, id);
      if (!current) {
        return await this.create(relation, { ...payload, id });
      }

      const table = getTableName(relation);
      const updatedAt = nowIso();
      const data = { ...current, ...payload, id, updated_at: updatedAt, updatedAt };
      const userId = typeof data.user_id === 'string' ? data.user_id : typeof data.userId === 'string' ? data.userId : null;
      const clinicId = typeof data.clinic_id === 'string' ? data.clinic_id : typeof data.clinicId === 'string' ? data.clinicId : userId;
      const syncStatus = String(payload.sync_status || 'pending');
      const lastSyncedAt = typeof payload.last_synced_at === 'string' ? payload.last_synced_at : null;
      data.sync_status = syncStatus;
      data.last_synced_at = lastSyncedAt;

      await this.run(`
        UPDATE ${table}
        SET user_id = ?, clinic_id = ?, data = ?, updated_at = ?, deleted_at = NULL, sync_status = ?, last_synced_at = ?
        WHERE id = ?
      `, [userId, clinicId, JSON.stringify(data), updatedAt, syncStatus, lastSyncedAt, id]);

      this.log(`Atualizado no SQLite em ${relation}: ${id}`);
      return await this.findById(relation, id);
    } catch (error) {
      this.log(`Erro ao atualizar em ${relation}:`, error);
      throw error;
    }
  }

  async delete(relation, id) {
    try {
      await this.ready;
      const table = getTableName(relation);
      const deletedAt = nowIso();
      await this.run(`UPDATE ${table} SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?`, [deletedAt, deletedAt, id]);
      this.log(`Removido no SQLite em ${relation}: ${id}`);
      return true;
    } catch (error) {
      this.log(`Erro ao excluir em ${relation}:`, error);
      throw error;
    }
  }

  async listPending() {
    await this.ready;
    const result = {};
    for (const table of DATA_TABLES) {
      const rows = await this.all(`SELECT * FROM ${table} WHERE sync_status = 'pending' ORDER BY updated_at ASC`);
      result[table] = rows.map((row) => this.rowToRecord(row));
    }
    return result;
  }

  async pendingCount() {
    await this.ready;
    let total = 0;
    for (const table of DATA_TABLES) {
      const row = await this.get(`SELECT COUNT(*) as total FROM ${table} WHERE sync_status = 'pending'`);
      total += Number(row?.total ?? 0);
    }
    return total;
  }

  async markSynced(relation, id, remoteData = {}) {
    await this.ready;
    const table = getTableName(relation);
    const current = await this.findById(relation, id);
    if (!current) return null;
    const syncedAt = nowIso();
    const data = { ...current, ...remoteData, sync_status: 'synced', last_synced_at: syncedAt };
    await this.run(
      `UPDATE ${table} SET data = ?, updated_at = ?, sync_status = 'synced', last_synced_at = ? WHERE id = ?`,
      [JSON.stringify(data), data.updated_at || syncedAt, syncedAt, id],
    );
    return await this.findById(relation, id);
  }

  async saveRemote(relation, payload = {}) {
    return await this.create(relation, {
      ...payload,
      sync_status: 'synced',
      last_synced_at: nowIso(),
    });
  }

  async saveConflict(tableName, recordId, localData, remoteData, reason) {
    await this.ready;
    const id = makeId('conflict');
    await this.run(
      `INSERT INTO sync_conflicts (id, table_name, record_id, local_data, remote_data, reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, tableName, recordId, JSON.stringify(localData ?? null), JSON.stringify(remoteData ?? null), reason, nowIso()],
    );
    return id;
  }

  hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
    const hash = crypto.pbkdf2Sync(String(password), salt, 120000, 64, 'sha512').toString('hex');
    return { hash, salt };
  }

  async signIn(email, password) {
    await this.ready;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail || !password) {
      throw new Error('E-mail e senha sao obrigatorios.');
    }

    const count = (await this.get('SELECT COUNT(*) as total FROM local_users')).total;
    let user = await this.get('SELECT * FROM local_users WHERE email = ?', [normalizedEmail]);

    if (!user && count === 0) {
      const id = makeId('local_user');
      const clinicId = makeId('clinic');
      const { hash, salt } = this.hashPassword(password);
      const createdAt = nowIso();
      const data = {
        id,
        email: normalizedEmail,
        role: 'owner',
        clinicId,
        name: normalizedEmail.split('@')[0],
      };

      await this.run(`
        INSERT INTO local_users (id, email, password_hash, salt, role, clinic_id, data, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [id, normalizedEmail, hash, salt, 'owner', clinicId, JSON.stringify(data), createdAt, createdAt]);

      await this.create('clinics', {
        id: clinicId,
        user_id: id,
        clinic_id: clinicId,
        name: 'Clinica Local',
        email: normalizedEmail,
        status: 'active',
      });

      user = await this.get('SELECT * FROM local_users WHERE id = ?', [id]);
      this.log(`Primeiro usuario local criado: ${normalizedEmail}`);
    }

    if (!user) {
      throw new Error('Credenciais locais invalidas.');
    }

    const { hash } = this.hashPassword(password, user.salt);
    if (hash !== user.password_hash) {
      throw new Error('Credenciais locais invalidas.');
    }

    const data = JSON.parse(user.data || '{}');
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      clinicId: user.clinic_id,
      user_metadata: {
        ...data,
        source: 'sqlite',
        clinicId: user.clinic_id,
        role: user.role,
      },
      accessToken: `local-${crypto.randomBytes(24).toString('hex')}`,
    };
  }

  getInfo() {
    return {
      dbPath: this.dbPath,
      databaseDir: this.databaseDir,
      backupDir: this.backupDir,
      logPath: this.logPath,
    };
  }
}

module.exports = { LocalDatabase };
