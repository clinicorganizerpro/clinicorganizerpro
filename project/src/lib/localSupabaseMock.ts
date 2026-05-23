import type { Session, User } from '@supabase/supabase-js';

const MOCK_SESSION_KEY = 'mock_session';
const MOCK_REGISTERED_USERS_KEY = 'clinic-organizer-pro-registered-users';

type MockUser = User & { role: string };
type MockRow = Record<string, unknown>;
type MockRegisteredUser = {
  id: string;
  email: string;
  password: string;
  createdAt: string;
  updatedAt: string;
};

const normalizeEmail = (email: unknown) => (typeof email === 'string' ? email.trim().toLowerCase() : '');

const getUserIdForEmail = (email: string) => `local-user-${email.replace(/[^a-z0-9]+/gi, '_')}`;

const readRegisteredUsers = (): MockRegisteredUser[] => {
  try {
    const data = localStorage.getItem(MOCK_REGISTERED_USERS_KEY);
    const parsed = data ? (JSON.parse(data) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as MockRegisteredUser[]) : [];
  } catch {
    return [];
  }
};

const writeRegisteredUsers = (users: MockRegisteredUser[]) => {
  localStorage.setItem(MOCK_REGISTERED_USERS_KEY, JSON.stringify(users));
};

const findRegisteredUser = (email: string) => {
  const normalizedEmail = normalizeEmail(email);
  return readRegisteredUsers().find((user) => normalizeEmail(user.email) === normalizedEmail) ?? null;
};

const createSessionForRegisteredUser = (registeredUser: MockRegisteredUser): MockUser => ({
  id: registeredUser.id,
  email: registeredUser.email,
  role: 'authenticated',
  aud: 'authenticated',
  created_at: registeredUser.createdAt,
  updated_at: registeredUser.updatedAt,
  app_metadata: {},
  user_metadata: {
    source: 'local-signup',
  },
});

const getMockUser = (): MockUser | null => {
  try {
    const data = localStorage.getItem(MOCK_SESSION_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

const auth = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signInWithPassword: async (credentials: any) => {
    const email = normalizeEmail(credentials?.email);
    const password = credentials?.password || '';

    if (!email || !password) {
      return {
        data: { user: null, session: null },
        error: { message: 'Informe e-mail e senha' },
      };
    }

    const registeredUser = findRegisteredUser(email);
    if (!registeredUser) {
      return {
        data: { user: null, session: null },
        error: { message: 'E-mail não cadastrado' },
      };
    }

    if (registeredUser.password !== password) {
      return {
        data: { user: null, session: null },
        error: { message: 'Credenciais inválidas' },
      };
    }

    const mockUser = createSessionForRegisteredUser(registeredUser);
    localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(mockUser));
    return {
      data: {
        user: mockUser,
        session: { user: mockUser, access_token: 'mock-token' } as unknown as Session,
      },
      error: null,
    };
  },
  signOut: async () => {
    localStorage.removeItem(MOCK_SESSION_KEY);
    return { data: null, error: null };
  },
  getSession: async () => {
    const user = getMockUser();
    return {
      data: {
        session: user ? ({ user, access_token: 'mock-token' } as unknown as Session) : null,
      },
      error: null,
    };
  },
  getUser: async () => {
    return { data: { user: getMockUser() }, error: null };
  },
  onAuthStateChange: () => {
    return { data: { subscription: { unsubscribe: () => {} } } };
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signUp: async (credentials: any) => {
    const email = normalizeEmail(credentials?.email);
    const password = typeof credentials?.password === 'string' ? credentials.password : '';

    if (!email || !password) {
      return {
        data: { user: null, session: null },
        error: { message: 'Informe e-mail e senha' },
      };
    }

    if (findRegisteredUser(email)) {
      return {
        data: { user: null, session: null },
        error: { message: 'E-mail já cadastrado' },
      };
    }

    const timestamp = new Date().toISOString();
    const registeredUser: MockRegisteredUser = {
      id: getUserIdForEmail(email),
      email,
      password,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    writeRegisteredUsers([...readRegisteredUsers(), registeredUser]);

    return {
      data: {
        user: createSessionForRegisteredUser(registeredUser),
        session: null,
      },
      error: null,
    };
  },
  signInWithOAuth: async () => ({ data: { provider: null, url: null }, error: null }),
  updateUser: async () => ({ data: null, error: null }),
};

class LocalQueryBuilder {
  table: string;
  operation: 'select' | 'insert' | 'update' | 'delete' = 'select';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filters: Array<{ key: string; val: any; op: string }> = [];
  orderConfig?: { column: string; ascending: boolean };

  constructor(table: string) {
    this.table = table;
  }

  select() {
    if (this.operation !== 'insert' && this.operation !== 'update') {
      this.operation = 'select';
    }
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  insert(payload: any) {
    this.operation = 'insert';
    this.payload = payload;
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update(payload: any) {
    this.operation = 'update';
    this.payload = payload;
    return this;
  }

  delete() {
    this.operation = 'delete';
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  eq(key: string, val: any) {
    this.filters.push({ key, val, op: 'eq' });
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  neq(key: string, val: any) {
    this.filters.push({ key, val, op: 'neq' });
    return this;
  }

  order(column: string, opts?: { ascending?: boolean }) {
    this.orderConfig = { column, ascending: opts?.ascending ?? true };
    return this;
  }

  // Outros métodos para mock (encadeamento sem efeito real, exceto o then)
  gt() { return this; }
  gte() { return this; }
  lt() { return this; }
  lte() { return this; }
  like() { return this; }
  ilike() { return this; }
  in() { return this; }
  contains() { return this; }
  overlaps() { return this; }
  limit() { return this; }
  range() { return this; }
  upsert() { return this; }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  single(): Promise<{ data: any; error: any }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.execute().then((res: any) => {
      if (res.error) return res;
      if (Array.isArray(res.data) && res.data.length > 0) {
        return { data: res.data[0], error: null };
      }
      return { data: null, error: { message: 'Row not found' } };
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  maybeSingle(): Promise<{ data: any; error: any }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.execute().then((res: any) => {
      if (res.error) return res;
      if (Array.isArray(res.data) && res.data.length > 0) {
        return { data: res.data[0], error: null };
      }
      return { data: null, error: null };
    });
  }

  async execute() {
    const storageKey = `local_db_${this.table}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data: any[] = [];
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) data = JSON.parse(raw);
    } catch {
      // Ignore
    }

    if (this.operation === 'select') {
      let result = [...data];
      for (const f of this.filters) {
        if (f.op === 'eq') {
          result = result.filter((item: MockRow) => item[f.key] === f.val);
        } else if (f.op === 'neq') {
          result = result.filter((item: MockRow) => item[f.key] !== f.val);
        }
      }

      if (this.orderConfig) {
        const { column, ascending } = this.orderConfig;
        result.sort((a, b) => {
          if (a[column] < b[column]) return ascending ? -1 : 1;
          if (a[column] > b[column]) return ascending ? 1 : -1;
          return 0;
        });
      }

      return { data: result, error: null };
    }

    if (this.operation === 'insert') {
      const isArray = Array.isArray(this.payload);
      const itemsToInsert = isArray ? this.payload : [this.payload];

      const newItems = itemsToInsert.map((item: MockRow) => ({
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random().toString(36).substring(7),
        ...item,
      }));

      data.push(...newItems);
      localStorage.setItem(storageKey, JSON.stringify(data));

      return { data: isArray ? newItems : newItems[0], error: null };
    }

    if (this.operation === 'update') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatedItems: MockRow[] = [];
      data = data.map((item: MockRow) => {
        let matches = true;
        for (const f of this.filters) {
          if (f.op === 'eq' && item[f.key] !== f.val) matches = false;
          if (f.op === 'neq' && item[f.key] === f.val) matches = false;
        }
        if (matches) {
          const updated = { ...item, ...this.payload };
          updatedItems.push(updated);
          return updated;
        }
        return item;
      });
      localStorage.setItem(storageKey, JSON.stringify(data));
      return { data: updatedItems, error: null };
    }

    if (this.operation === 'delete') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data = data.filter((item: MockRow) => {
        let matches = true;
        for (const f of this.filters) {
          if (f.op === 'eq' && item[f.key] !== f.val) matches = false;
          if (f.op === 'neq' && item[f.key] === f.val) matches = false;
        }
        return !matches; // keep if it doesn't match the deletion criteria
      });
      localStorage.setItem(storageKey, JSON.stringify(data));
      return { data: null, error: null };
    }
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

export const localSupabaseMock = {
  auth,
  from: (table: string) => new LocalQueryBuilder(table),
  storage: {
    from: () => ({
      upload: async () => ({ data: null, error: null }),
      download: async () => ({ data: null, error: null }),
      list: async () => ({ data: [], error: null }),
      remove: async () => ({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
    }),
  },
  rpc: async () => ({ data: null, error: null }),
  channel: () => ({
    on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
    unsubscribe: () => {},
  }),
  removeChannel: async () => ({ data: null, error: null }),
};
