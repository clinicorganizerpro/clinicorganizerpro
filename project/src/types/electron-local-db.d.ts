export {};

declare global {
  interface Window {
    clinicLocalDb?: {
      isAvailable: boolean;
      localBackendUrl?: string;
      info: () => Promise<{
        dbPath: string;
        databaseDir: string;
        backupDir: string;
        logPath: string;
      }>;
      auth: {
        signIn: (
          email: string,
          password: string,
        ) => Promise<{
          id: string;
          email: string;
          role: string;
          clinicId: string;
          user_metadata: Record<string, unknown>;
          accessToken: string;
        }>;
      };
      records: {
        list: <T = Record<string, unknown>>(
          relation: string,
          filters?: Array<{ op: 'eq'; col: string; val: unknown }>,
        ) => Promise<T[]>;
        findById: <T = Record<string, unknown>>(relation: string, id: string) => Promise<T | null>;
        create: <T = Record<string, unknown>>(relation: string, payload: Record<string, unknown>) => Promise<T>;
        update: <T = Record<string, unknown>>(
          relation: string,
          id: string,
          payload: Record<string, unknown>,
        ) => Promise<T>;
        delete: (relation: string, id: string) => Promise<boolean>;
      };
    };
  }
}
