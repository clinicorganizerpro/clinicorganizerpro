import { existsSync, promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

type JsonRecord = Record<string, unknown>;

export type DbErrorCode = 'FILE_NOT_FOUND' | 'JSON_CORRUPTED' | 'ITEM_NOT_FOUND';

export class LocalDatabaseError extends Error {
  public readonly code: DbErrorCode;

  constructor(code: DbErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

type LoggerEvent = 'create' | 'update' | 'delete' | 'error';

export type DatabaseLog = {
  id: string;
  at: string;
  event: LoggerEvent;
  entity: string;
  entityId?: string;
  message?: string;
  meta?: JsonRecord;
};

const cwd = process.cwd();
const BACKEND_ROOT_DIR = path.basename(cwd) === 'project'
  ? path.join(cwd, 'backend')
  : fsSyncExists(path.join(cwd, 'project', 'backend'))
    ? path.join(cwd, 'project', 'backend')
    : path.join(cwd, 'backend');

const DATA_DIR = path.join(BACKEND_ROOT_DIR, 'data');
const BACKUPS_DIR = path.join(BACKEND_ROOT_DIR, 'backups');
const LOGS_DIR = path.join(BACKEND_ROOT_DIR, 'logs');

function fsSyncExists(target: string) {
  return existsSync(target);
}

const ensureDirs = async () => {
  await Promise.all([fs.mkdir(DATA_DIR, { recursive: true }), fs.mkdir(BACKUPS_DIR, { recursive: true }), fs.mkdir(LOGS_DIR, { recursive: true })]);
};

const getDataPath = (file: string) => path.join(DATA_DIR, file);
const getBackupPath = (file: string, at: string) =>
  path.join(BACKUPS_DIR, `${file}.${at.replaceAll(':', '-').replaceAll('.', '-')}.bak.json`);
const getLogPath = () => path.join(LOGS_DIR, 'events.log.jsonl');

const nowIso = () => new Date().toISOString();
const createId = () => randomUUID();

const appendLog = async (log: DatabaseLog) => {
  try {
    await ensureDirs();
    await fs.appendFile(getLogPath(), `${JSON.stringify(log)}\n`, 'utf8');
  } catch {
    // logging deve ser best-effort: não quebrar o fluxo principal
  }
};

const safeParseJson = (raw: string): unknown => {
  return JSON.parse(raw) as unknown;
};

/**
 * Formato esperado dos JSONs:
 * - pacientes.json, agendamentos.json, anamneses.json, usuarios.json, financeiro.json
 * Cada um deve ser um array de items ([]), para facilitar CRUD genérico.
 */
export async function readData<T extends JsonRecord>(file: string): Promise<T[]> {
  await ensureDirs();

  const dataPath = getDataPath(file);

  try {
    const raw = await fs.readFile(dataPath, 'utf8');

    try {
      const parsed = safeParseJson(raw);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch (err) {
      await appendLog({
        id: createId(),
        at: nowIso(),
        event: 'error',
        entity: file,
        message: 'JSON corrompido',
        meta: { details: err instanceof Error ? err.message : String(err) },
      });
      throw new LocalDatabaseError('JSON_CORRUPTED', `JSON corrompido em ${file}`);
    }
  } catch (err) {
    const isNotFound = err instanceof Error && 'code' in err && (err as { code?: string }).code === 'ENOENT';

    if (isNotFound) {
      await appendLog({
        id: createId(),
        at: nowIso(),
        event: 'error',
        entity: file,
        message: 'Arquivo inexistente',
      });

      // Requisito: arquivo inexistente deve ser tratado.
      // Para compatibilidade com rotas, retornamos [].
      return [];
    }

    throw err;
  }
}

export async function writeData<T extends JsonRecord>(file: string, data: T[]): Promise<void> {
  await ensureDirs();

  const dataPath = getDataPath(file);

  // Backup automático antes de sobrescrever
  const at = nowIso();
  try {
    // backup best-effort
    await fs.copyFile(dataPath, getBackupPath(file, at));
  } catch {
    // se ainda não existe, ignora backup
  }

  const raw = JSON.stringify(data, null, 2);
  await fs.writeFile(dataPath, raw, 'utf8');
}

export async function createItem<T extends JsonRecord & { id: string }>(
  file: string,
  item: Omit<T, 'id'> & { id?: string },
): Promise<T> {
  const data = await readData<T>(file);

  const nextItem: T = {
    ...(item as T),
    id: item.id && typeof item.id === 'string' && item.id.trim() ? item.id : createId(),
  };

  data.push(nextItem);

  await writeData(file, data);

  await appendLog({
    id: createId(),
    at: nowIso(),
    event: 'create',
    entity: file,
    entityId: nextItem.id,
    message: 'Item criado',
  });

  return nextItem;
}

export async function updateItem<T extends JsonRecord & { id: string }>(
  file: string,
  id: string,
  item: Omit<T, 'id'> & { id?: string },
): Promise<T> {
  const data = await readData<T>(file);

  const index = data.findIndex((entry) => entry.id === id);
  if (index === -1) {
    await appendLog({
      id: createId(),
      at: nowIso(),
      event: 'error',
      entity: file,
      entityId: id,
      message: 'Item não encontrado para edição',
    });
    throw new LocalDatabaseError('ITEM_NOT_FOUND', `Item ${id} não encontrado em ${file}`);
  }

  const nextItem: T = {
    ...data[index],
    ...(item as T),
    id,
  };

  data[index] = nextItem;

  await writeData(file, data);

  await appendLog({
    id: createId(),
    at: nowIso(),
    event: 'update',
    entity: file,
    entityId: nextItem.id,
    message: 'Item atualizado',
  });

  return nextItem;
}

export async function deleteItem<T extends JsonRecord & { id: string }>(file: string, id: string): Promise<void> {
  const data = await readData<T>(file);

  const next = data.filter((entry) => entry.id !== id);
  if (next.length === data.length) {
    await appendLog({
      id: createId(),
      at: nowIso(),
      event: 'error',
      entity: file,
      entityId: id,
      message: 'Item não encontrado para exclusão',
    });
    throw new LocalDatabaseError('ITEM_NOT_FOUND', `Item ${id} não encontrado em ${file}`);
  }

  await writeData(file, next);

  await appendLog({
    id: createId(),
    at: nowIso(),
    event: 'delete',
    entity: file,
    entityId: id,
    message: 'Item excluído',
  });
}

export async function getAll<T extends JsonRecord>(file: string): Promise<T[]> {
  return readData<T>(file);
}

export async function getById<T extends JsonRecord & { id: string }>(file: string, id: string): Promise<T> {
  const data = await readData<T>(file);
  const found = data.find((entry) => entry.id === id);
  if (!found) {
    await appendLog({
      id: createId(),
      at: nowIso(),
      event: 'error',
      entity: file,
      entityId: id,
      message: 'Item não encontrado',
    });
    throw new LocalDatabaseError('ITEM_NOT_FOUND', `Item ${id} não encontrado em ${file}`);
  }
  return found;
}
