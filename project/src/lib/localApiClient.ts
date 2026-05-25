import { apiFetch, createApiUrl } from './api';

type ApiError = { message?: string } | null;

type LocalApiListResponse<T> = { data: T[] | null; error: { message: string } | null };
type LocalApiItemResponse<T> = { data: T | null; error: { message: string } | null };
type LocalApiDeleteResponse = { data: unknown; error: { message: string } | null };

const getElectronLocalDb = () => {
  if (typeof window === 'undefined') return null;
  return window.clinicLocalDb?.isAvailable ? window.clinicLocalDb : null;
};

const safeJson = async <T,>(res: Response): Promise<T> => {
  const text = await res.text();
  if (!text) {
    return null as unknown as T;
  }
  return JSON.parse(text) as T;
};

export async function localApiList<T extends { id: string }>(
  relation: string,
  filters?: Array<{ col: string; val: unknown }>,
): Promise<T[]> {
  const electronDb = getElectronLocalDb();
  if (electronDb) {
    try {
      return await electronDb.records.list<T>(relation, filters?.map((filter) => ({ op: 'eq', ...filter })));
    } catch (error) {
      console.warn('[local-api] IPC list failed, falling back to HTTP:', error);
    }
  }

  const url = createApiUrl(`/api/${relation}`);

  if (filters) {
    filters.forEach((f, idx) => {
      url.searchParams.set(`f.${idx}.op`, 'eq');
      url.searchParams.set(`f.${idx}.col`, f.col);
      url.searchParams.set(`f.${idx}.val`, JSON.stringify(f.val));
    });
  }

  let res: Response;
  try {
    res = await apiFetch(url.toString(), { method: 'GET' });
  } catch (error) {
    throw error;
  }
  if (!res.ok) {
    const err = (await safeJson<{ error?: { message?: string } }>(res).catch(() => null)) as
      | { error?: { message?: string } }
      | null;
    throw new Error(err?.error?.message ?? `Falha ao listar ${relation}`);
  }

  const json = await safeJson<LocalApiListResponse<T>>(res);
  return (json?.data ?? []) as T[];
}

export async function localApiCreate<T extends { id: string }>(
  relation: string,
  payload: Omit<T, 'id'> & Partial<Pick<T, 'id'>>,
): Promise<T> {
  const electronDb = getElectronLocalDb();
  if (electronDb) {
    try {
      return await electronDb.records.create<T>(relation, payload as Record<string, unknown>);
    } catch (error) {
      console.warn('[local-api] IPC create failed, falling back to HTTP:', error);
    }
  }

  const url = createApiUrl(`/api/${relation}`);

  let res: Response;
  try {
    res = await apiFetch(url.toString(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ payload }),
    });
  } catch (error) {
    throw error;
  }

  const json = (await safeJson<LocalApiItemResponse<T>>(res).catch(() => null)) as
    | LocalApiItemResponse<T>
    | null;

  if (!res.ok) {
    const err = (json?.error as ApiError) ?? null;
    throw new Error(err?.message ?? `Falha ao criar em ${relation}`);
  }

  if (json?.error?.message) {
    throw new Error(json.error.message);
  }

  if (!json?.data) {
    throw new Error(`Falha ao criar em ${relation}: resposta vazia`);
  }

  return json.data;
}

export async function localApiUpdate<T extends { id: string }>(
  relation: string,
  id: string,
  payload: Partial<Omit<T, 'id'>> & Partial<Pick<T, 'id'>>,
): Promise<T> {
  const electronDb = getElectronLocalDb();
  if (electronDb) {
    try {
      return await electronDb.records.update<T>(relation, id, payload as Record<string, unknown>);
    } catch (error) {
      console.warn('[local-api] IPC update failed, falling back to HTTP:', error);
    }
  }

  const url = createApiUrl(`/api/${relation}`);
  url.searchParams.set('f.0.op', 'eq');
  url.searchParams.set('f.0.col', 'id');
  url.searchParams.set('f.0.val', JSON.stringify(id));

  let res: Response;
  try {
    res = await apiFetch(url.toString(), {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ payload: { ...payload, id } }),
    });
  } catch (error) {
    throw error;
  }

  const json = (await safeJson<LocalApiItemResponse<T>>(res).catch(() => null)) as
    | LocalApiItemResponse<T>
    | null;

  if (!res.ok) {
    const err = (json?.error as ApiError) ?? null;
    throw new Error(err?.message ?? `Falha ao atualizar ${relation}`);
  }

  if (json?.error?.message) {
    throw new Error(json.error.message);
  }

  if (!json?.data) {
    throw new Error(`Falha ao atualizar ${relation}: resposta vazia`);
  }

  return json.data;
}

export async function localApiDelete(
  relation: string,
  id: string,
): Promise<void> {
  const electronDb = getElectronLocalDb();
  if (electronDb) {
    try {
      await electronDb.records.delete(relation, id);
      return;
    } catch (error) {
      console.warn('[local-api] IPC delete failed, falling back to HTTP:', error);
    }
  }

  const url = createApiUrl(`/api/${relation}`);
  url.searchParams.set('f.0.op', 'eq');
  url.searchParams.set('f.0.col', 'id');
  url.searchParams.set('f.0.val', JSON.stringify(id));

  let res: Response;
  try {
    res = await apiFetch(url.toString(), { method: 'DELETE' });
  } catch (error) {
    throw error;
  }
  const json = (await safeJson<LocalApiDeleteResponse>(res).catch(() => null)) as
    | LocalApiDeleteResponse
    | null;

  if (!res.ok) {
    const err = (json?.error as ApiError) ?? null;
    throw new Error(err?.message ?? `Falha ao deletar ${relation}`);
  }

  if (json?.error?.message) {
    throw new Error(json.error.message);
  }
}
