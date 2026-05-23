import { useCallback, useMemo, useState } from 'react';
import { createSupabaseCrud, type SupabaseRecord } from '@/services/supabaseCrudService';

export function useSupabaseCrud<TRecord extends SupabaseRecord = SupabaseRecord>(tableName: string) {
  const crud = useMemo(() => createSupabaseCrud<TRecord>(tableName), [tableName]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const run = useCallback(async <T,>(operation: () => Promise<T>) => {
    setLoading(true);
    setError(null);
    try {
      return await operation();
    } catch (caught) {
      const nextError = caught instanceof Error ? caught : new Error(String(caught));
      setError(nextError);
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    list: () => run(() => crud.list()),
    getById: (id: string) => run(() => crud.getById(id)),
    create: (data: SupabaseRecord) => run(() => crud.create(data)),
    update: (id: string, data: SupabaseRecord) => run(() => crud.update(id, data)),
    remove: (id: string) => run(() => crud.remove(id)),
  };
}
