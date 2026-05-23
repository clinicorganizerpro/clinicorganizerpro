/*
  Serviço leve para operações administrativas simples contra o PostgREST do Supabase.
  Usa fetch direto para evitar acoplamento com o cliente @supabase/supabase-js nas partes admin.

  Funções exportadas:
  - testSupabaseConnection(url, key): Promise<boolean>
  - fetchTableRows(url, key, table, limit): Promise<unknown[]>
  - insertRow(url, key, table, payload): Promise<unknown>
  - updateRow(url, key, table, id, payload): Promise<unknown>
  - deleteRow(url, key, table, id): Promise<void>

  Observações: espera que as tabelas possuam uma coluna `id` primária.
*/

type NoopMutationResponse<T = null> = Promise<{ data: T; error: null }>;

type NoopQueryBuilder<T = unknown> = {
  select: (...args: unknown[]) => NoopQueryBuilder<T>;
  order: (...args: unknown[]) => NoopQueryBuilder<T>;
  eq: (...args: unknown[]) => NoopQueryBuilder<T>;
  neq: (...args: unknown[]) => NoopQueryBuilder<T>;
  gt: (...args: unknown[]) => NoopQueryBuilder<T>;
  gte: (...args: unknown[]) => NoopQueryBuilder<T>;
  lt: (...args: unknown[]) => NoopQueryBuilder<T>;
  lte: (...args: unknown[]) => NoopQueryBuilder<T>;
  like: (...args: unknown[]) => NoopQueryBuilder<T>;
  ilike: (...args: unknown[]) => NoopQueryBuilder<T>;
  in: (...args: unknown[]) => NoopQueryBuilder<T>;
  contains: (...args: unknown[]) => NoopQueryBuilder<T>;
  overlaps: (...args: unknown[]) => NoopQueryBuilder<T>;
  limit: (...args: unknown[]) => NoopQueryBuilder<T>;
  range: (...args: unknown[]) => NoopQueryBuilder<T>;
  insert: (...args: unknown[]) => NoopQueryBuilder<T>;
  update: (...args: unknown[]) => NoopQueryBuilder<T>;
  delete: (...args: unknown[]) => NoopQueryBuilder<T>;
  upsert: (...args: unknown[]) => NoopQueryBuilder<T>;
  single: () => Promise<{ data: T | null; error: null }>;
  maybeSingle: () => Promise<{ data: T | null; error: null }>;
};

type NoopChannel = {
  on: (...args: unknown[]) => NoopChannel;
  subscribe: (...args: unknown[]) => Promise<NoopChannel>;
  unsubscribe: () => void;
};

type NoopAuth = {
  getSession: () => Promise<{ data: { session: null }; error: null }>;
  getUser: () => Promise<{ data: { user: null }; error: null }>;
  signOut: () => Promise<{ error: null }>;
  signInWithPassword: (credentials: unknown) => Promise<{ data: { session: null; user: null }; error: null }>;
  signUp: (credentials: unknown) => Promise<{ data: { session: null; user: null }; error: null }>;
  signInWithOAuth: (options: unknown) => Promise<{ data: { provider: null; url: null }; error: null }>;
  onAuthStateChange: (callback: (event: string, session: unknown) => void) => {
    data: {
      subscription: {
        unsubscribe: () => void;
      };
    };
  };
};

type NoopStorageBucket = {
  upload: (...args: unknown[]) => NoopMutationResponse;
  download: (...args: unknown[]) => NoopMutationResponse;
  list: (...args: unknown[]) => Promise<{ data: []; error: null }>;
  remove: (...args: unknown[]) => NoopMutationResponse;
  getPublicUrl: (...args: unknown[]) => { data: { publicUrl: string } };
};

type NoopSupabaseClient = {
  auth: NoopAuth;
  from: <T = unknown>() => NoopQueryBuilder<T>;
  rpc: (...args: unknown[]) => NoopMutationResponse;
  channel: (...args: unknown[]) => NoopChannel;
  removeChannel: (...args: unknown[]) => NoopMutationResponse;
  storage: {
    from: (...args: unknown[]) => NoopStorageBucket;
  };
};

const normalizeSupabaseUrl = (url: string) =>
  url
    .trim()
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/$/, '');

async function request<T>(url: string, key: string, path: string, opts: RequestInit = {}): Promise<T> {
  const full = normalizeSupabaseUrl(url) + (path.startsWith('/') ? path : `/${path}`);

  const headers: Record<string, string> = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };

  const res = await fetch(full, { headers, ...opts });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase request failed: ${res.status} ${res.statusText} - ${text}`);
  }

  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return (await res.json()) as T;
  }

  return (await res.text()) as unknown as T;
}

const createNoopQueryBuilder = <T = unknown>(): NoopQueryBuilder<T> => {
  const builder: NoopQueryBuilder<T> = {
    select: () => builder,
    order: () => builder,
    eq: () => builder,
    neq: () => builder,
    gt: () => builder,
    gte: () => builder,
    lt: () => builder,
    lte: () => builder,
    like: () => builder,
    ilike: () => builder,
    in: () => builder,
    contains: () => builder,
    overlaps: () => builder,
    limit: () => builder,
    range: () => builder,
    insert: () => builder,
    update: () => builder,
    delete: () => builder,
    upsert: () => builder,
    single: async () => ({ data: null, error: null }),
    maybeSingle: async () => ({ data: null, error: null }),
  };

  return builder;
};

const createNoopChannel = (): NoopChannel => {
  const channel: NoopChannel = {
    on: () => channel,
    subscribe: async () => channel,
    unsubscribe: () => undefined,
  };

  return channel;
};

const createNoopAuth = (): NoopAuth => ({
  getSession: async () => ({ data: { session: null }, error: null }),
  getUser: async () => ({ data: { user: null }, error: null }),
  signOut: async () => ({ error: null }),
  signInWithPassword: async () => ({ data: { session: null, user: null }, error: null }),
  signUp: async () => ({ data: { session: null, user: null }, error: null }),
  signInWithOAuth: async () => ({ data: { provider: null, url: null }, error: null }),
  onAuthStateChange: () => ({
    data: {
      subscription: {
        unsubscribe: () => undefined,
      },
    },
  }),
});

export const createNoopSupabaseClient = (): NoopSupabaseClient => ({
  auth: createNoopAuth(),
  from: <T = unknown>() => createNoopQueryBuilder<T>(),
  rpc: async () => ({ data: null, error: null }),
  channel: () => createNoopChannel(),
  removeChannel: async () => ({ data: null, error: null }),
  storage: {
    from: () => ({
      upload: async () => ({ data: null, error: null }),
      download: async () => ({ data: null, error: null }),
      list: async () => ({ data: [], error: null }),
      remove: async () => ({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
    }),
  },
});

export async function testSupabaseConnection(url: string, key: string): Promise<boolean> {
  try {
    await request(url, key, '/rest/v1/', { method: 'GET' });
    return true;
  } catch {
    try {
      const res = await fetch(normalizeSupabaseUrl(url) + '/auth/v1/settings', {
        method: 'GET',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      });

      return res.ok;
    } catch {
      return false;
    }
  }
}

export async function fetchTableRows(url: string, key: string, table: string, limit = 100): Promise<unknown[]> {
  const params = new URLSearchParams({ select: '*', limit: String(limit) });
  const path = `/rest/v1/${encodeURIComponent(table)}?${params.toString()}`;
  return request<unknown[]>(url, key, path, { method: 'GET' });
}

export async function insertRow(url: string, key: string, table: string, payload: unknown): Promise<unknown> {
  const path = `/rest/v1/${encodeURIComponent(table)}`;
  return request<unknown>(url, key, path, { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateRow(url: string, key: string, table: string, id: string, payload: unknown): Promise<unknown> {
  const path = `/rest/v1/${encodeURIComponent(table)}?id=eq.${encodeURIComponent(id)}`;
  return request<unknown>(url, key, path, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function deleteRow(url: string, key: string, table: string, id: string): Promise<void> {
  const path = `/rest/v1/${encodeURIComponent(table)}?id=eq.${encodeURIComponent(id)}`;
  await request<string>(url, key, path, { method: 'DELETE' });
}

export default {
  testSupabaseConnection,
  fetchTableRows,
  insertRow,
  updateRow,
  deleteRow,
};
