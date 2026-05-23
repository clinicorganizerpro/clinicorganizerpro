import type { Session, User } from '@supabase/supabase-js';
import { apiFetch, createApiUrl } from './api';

type NoopError = {
  message: string;
};

type QueryResult<T> = {
  data: T;
  error: NoopError | null;
};

type InsertResponse<T> = Promise<QueryResult<T>>;

type AuthResult<T> = Promise<QueryResult<T>>;

type SupabaseAuthLike = {
  getSession: () => AuthResult<{ session: Session | null }>;
  getUser: () => AuthResult<{ user: User | null }>;
  signOut: () => AuthResult<null>;
  signInWithPassword: (credentials: unknown) => AuthResult<{ session: Session | null; user: User | null }>;
  signUp: (credentials: unknown) => AuthResult<{ session: Session | null; user: User | null }>;
  signInWithOAuth: (options: unknown) => AuthResult<{ provider: string | null; url: string | null }>;
  updateUser: (payload: { password?: string }) => AuthResult<null>;
  onAuthStateChange: (callback: (event: string, session: Session | null) => void) => {
    data: {
      subscription: {
        unsubscribe: () => void;
      };
    };
  };
};

type SupabaseStorageLike = {
  upload: (...args: unknown[]) => InsertResponse<null>;
  download: (...args: unknown[]) => InsertResponse<null>;
  list: (...args: unknown[]) => Promise<QueryResult<[]>>;
  remove: (...args: unknown[]) => InsertResponse<null>;
  getPublicUrl: (...args: unknown[]) => { data: { publicUrl: string } };
};

type SupabaseStorageBucketLike = {
  from: (...args: unknown[]) => SupabaseStorageLike;
};

type NoopChannel = {
  on: (...args: unknown[]) => NoopChannel;
  subscribe: (...args: unknown[]) => Promise<NoopChannel>;
  unsubscribe: () => void;
};

type SupabaseQueryBuilder<T> = {
  select: (...args: unknown[]) => SupabaseQueryBuilder<T>;
  order: (...args: unknown[]) => SupabaseQueryBuilder<T>;
  eq: (...args: unknown[]) => SupabaseQueryBuilder<T>;
  neq: (...args: unknown[]) => SupabaseQueryBuilder<T>;
  gt: (...args: unknown[]) => SupabaseQueryBuilder<T>;
  gte: (...args: unknown[]) => SupabaseQueryBuilder<T>;
  lt: (...args: unknown[]) => SupabaseQueryBuilder<T>;
  lte: (...args: unknown[]) => SupabaseQueryBuilder<T>;
  like: (...args: unknown[]) => SupabaseQueryBuilder<T>;
  ilike: (...args: unknown[]) => SupabaseQueryBuilder<T>;
  in: (...args: unknown[]) => SupabaseQueryBuilder<T>;
  contains: (...args: unknown[]) => SupabaseQueryBuilder<T>;
  overlaps: (...args: unknown[]) => SupabaseQueryBuilder<T>;
  limit: (...args: unknown[]) => SupabaseQueryBuilder<T>;
  range: (...args: unknown[]) => SupabaseQueryBuilder<T>;
  insert: (...args: unknown[]) => SupabaseQueryBuilder<T>;
  update: (...args: unknown[]) => SupabaseQueryBuilder<T>;
  delete: (...args: unknown[]) => SupabaseQueryBuilder<T>;
  upsert: (...args: unknown[]) => SupabaseQueryBuilder<T>;
  single: () => Promise<QueryResult<T>>;
  maybeSingle: () => Promise<QueryResult<T>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  then: <TResult1 = QueryResult<T>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<T>) => TResult1 | PromiseLike<TResult1>) | null | undefined,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null | undefined,
  ) => PromiseLike<TResult1 | TResult2>;
};

type SupabaseLike = {
  auth: SupabaseAuthLike;
  from: <T = unknown>(relation: string) => SupabaseQueryBuilder<T>;
  rpc: (...args: unknown[]) => InsertResponse<null>;
  channel: (...args: unknown[]) => NoopChannel;
  removeChannel: (...args: unknown[]) => InsertResponse<null>;
  storage: SupabaseStorageBucketLike;
};

type JsonValue = string | number | boolean | null | Record<string, unknown> | JsonValue[];

// Minimal auth: mantém AppContext funcionando como “sem login supabase” no local.
// Admin login local continua via admin_state e armazenamento local atual; este adapter só precisa existir
// para os requests CRUD.
const createNoopAuth = (): SupabaseAuthLike => ({
  getSession: async () => ({ data: { session: null }, error: null }),
  getUser: async () => ({ data: { user: null }, error: null }),
  signOut: async () => ({ data: null, error: null }),
  signInWithPassword: async () => ({ data: { session: null, user: null }, error: null }),
  signUp: async () => ({ data: { session: null, user: null }, error: null }),
  signInWithOAuth: async () => ({ data: { provider: null, url: null }, error: null }),
  updateUser: async () => ({ data: null, error: null }),
  onAuthStateChange: () => ({
    data: { subscription: { unsubscribe: () => undefined } },
  }),
});

const createNoopStorageBucket = (): SupabaseStorageBucketLike => ({
  from: () => ({
    upload: async () => ({ data: null, error: null }),
    download: async () => ({ data: null, error: null }),
    list: async () => ({ data: [], error: null }),
    remove: async () => ({ data: null, error: null }),
    getPublicUrl: () => ({ data: { publicUrl: '' } }),
  }),
});

type OpState = {
  type: 'select' | 'insert' | 'update' | 'delete';
  relation: string;
  order?: { column: string; ascending: boolean } | undefined;
  limit?: unknown;
  range?: unknown;
  filters: Array<{ op: string; column: string; value: unknown }>;
  payload?: unknown;
};

const toJson = (value: unknown): JsonValue => {
  // Para o nosso uso (AppContext) basta aceitar objetos simples.
  return value as JsonValue;
};

const createSupabaseQueryBuilder = <T>(state: OpState): SupabaseQueryBuilder<T> => {
  const run = async (): Promise<QueryResult<T>> => {
    const url = createApiUrl(`/api/${state.relation}`);

    // query params de filters
    state.filters.forEach((f, idx) => {
      url.searchParams.set(`f.${idx}.op`, f.op);
      url.searchParams.set(`f.${idx}.col`, f.column);
      url.searchParams.set(`f.${idx}.val`, JSON.stringify(toJson(f.value)));
    });

    if (state.order) {
      url.searchParams.set('order.col', state.order.column);
      url.searchParams.set('order.ascending', String(state.order.ascending));
    }

    if (state.type === 'insert' || state.type === 'update') {
      // payload no body
      const res = await apiFetch(url.toString(), {
        method: state.type === 'insert' ? 'POST' : 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ payload: state.payload }),
      });

      const json: { data: T; error: NoopError | null } = (await res.json()) as unknown as {
        data: T;
        error: NoopError | null;
      };

      if (!res.ok) {
        return { data: json.data, error: { message: json.error?.message ?? 'Request failed' } };
      }
      return { data: json.data, error: json.error };
    }

    if (state.type === 'delete') {
      const res = await apiFetch(url.toString(), { method: 'DELETE' });

      const json: { data: T; error: NoopError | null } = (await res.json()) as unknown as {
        data: T;
        error: NoopError | null;
      };

      if (!res.ok) {
        return { data: json.data, error: { message: json.error?.message ?? 'Request failed' } };
      }
      return { data: json.data, error: json.error };
    }

    // select
    const res = await apiFetch(url.toString(), { method: 'GET' });

    const json: { data: T; error: NoopError | null } = (await res.json()) as unknown as {
      data: T;
      error: NoopError | null;
    };

    if (!res.ok) {
      return { data: json.data, error: { message: json.error?.message ?? 'Request failed' } };
    }

    return { data: json.data, error: json.error };
  };

  const builder: SupabaseQueryBuilder<T> = {
    select: () => builder,
    order: (column: unknown, opts: unknown) => {
      if (typeof column === 'string') {
        const ascending =
          typeof opts === 'object' && opts !== null && 'ascending' in opts ? Boolean((opts as { ascending?: unknown }).ascending) : true;

        state.order = { column, ascending };
      }
      return builder;
    },
    eq: (...args: unknown[]) => {
      const [col, value] = args;
      if (typeof col === 'string') {
        state.filters.push({ op: 'eq', column: col, value });
      }
      return builder;
    },
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
    insert: (payload: unknown) => {
      state.type = 'insert';
      state.payload = payload;
      return builder;
    },
    update: (payload: unknown) => {
      state.type = 'update';
      state.payload = payload;
      return builder;
    },
    delete: () => {
      state.type = 'delete';
      return builder;
    },
    upsert: () => builder,
    single: async () => run(),
    maybeSingle: async () => run(),
    then: (onfulfilled, onrejected) => run().then(onfulfilled, onrejected),
  };

  return builder;
};

export const createSupabaseLocalAdapter = (): SupabaseLike => {
  const noopChannel: NoopChannel = {
    on: () => noopChannel,
    subscribe: async () => noopChannel,
    unsubscribe: () => undefined,
  };

  const supabase: SupabaseLike = {
    auth: createNoopAuth(),
    from: <T = unknown>(relation: string) =>
      createSupabaseQueryBuilder<T>({
        type: 'select',
        relation,
        filters: [],
      }),
    rpc: async () => ({ data: null, error: null }),
    channel: () => noopChannel,
    removeChannel: async () => ({ data: null, error: null }),
    storage: createNoopStorageBucket(),
  };

  return supabase;
};
