import { supabase } from '@/lib/supabase';

export type SupabaseRecord = Record<string, unknown> & { id?: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID_RE.test(value);

export const camelToSnake = (value: string) => value.replace(/([A-Z])/g, '_$1').toLowerCase();
export const snakeToCamel = (value: string) => value.replace(/_([a-z0-9])/g, (_match, group: string) => group.toUpperCase());

export const transformKeys = (value: unknown, keyTransform: (key: string) => string): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => transformKeys(entry, keyTransform));
  }

  if (value && Object.prototype.toString.call(value) === '[object Object]') {
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((accumulator, [key, entry]) => {
      accumulator[keyTransform(key)] = transformKeys(entry, keyTransform);
      return accumulator;
    }, {});
  }

  return value;
};

const removeUndefined = (record: SupabaseRecord) =>
  Object.entries(record).reduce<SupabaseRecord>((accumulator, [key, value]) => {
    if (value !== undefined) {
      accumulator[key] = value;
    }
    return accumulator;
  }, {});

const normalizeForDatabase = (data: SupabaseRecord) => {
  const transformed = transformKeys(data, camelToSnake) as SupabaseRecord;
  delete transformed.created_at;
  delete transformed.createdAt;
  delete transformed.updated_at;
  delete transformed.updatedAt;
  delete transformed.user_id;
  delete transformed.userId;
  delete transformed.clinic_id;
  delete transformed.clinicId;
  delete transformed.created_by;
  delete transformed.createdBy;
  return removeUndefined(transformed);
};

export const mapFromDatabase = <T = SupabaseRecord>(record: SupabaseRecord): T => {
  return transformKeys(record, snakeToCamel) as T;
};

export async function getCurrentSupabaseUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw error ?? new Error('Usuário Supabase não autenticado.');
  }
  return data.user;
}

export async function getCurrentClinicId(): Promise<string> {
  const user = await getCurrentSupabaseUser();
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const metadataClinicId = metadata.clinicId ?? metadata.clinic_id;

  if (isUuid(metadataClinicId)) {
    return metadataClinicId;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('clinic_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profileError && isUuid(profile?.clinic_id)) {
    return profile.clinic_id;
  }

  const { data: clinic, error: clinicError } = await supabase
    .from('clinics')
    .select('id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!clinicError && isUuid(clinic?.id)) {
    return clinic.id;
  }

  throw new Error('Clínica atual não encontrada para o usuário logado.');
}

export function createSupabaseCrud<TRecord extends SupabaseRecord = SupabaseRecord>(tableName: string) {
  return {
    async list(): Promise<TRecord[]> {
      const clinicId = await getCurrentClinicId();
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('clinic_id', clinicId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return ((data ?? []) as SupabaseRecord[]).map((row) => mapFromDatabase<TRecord>(row));
    },

    async getById(id: string): Promise<TRecord | null> {
      const clinicId = await getCurrentClinicId();
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('id', id)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) throw error;
      return data ? mapFromDatabase<TRecord>(data as SupabaseRecord) : null;
    },

    async create(data: SupabaseRecord): Promise<TRecord> {
      const [user, clinicId] = await Promise.all([getCurrentSupabaseUser(), getCurrentClinicId()]);
      const payload = {
        ...normalizeForDatabase(data),
        clinic_id: clinicId,
        user_id: user.id,
        created_by: user.id,
      };

      const { data: created, error } = await supabase.from(tableName).insert(payload).select('*').single();
      if (error) throw error;
      return mapFromDatabase<TRecord>(created as SupabaseRecord);
    },

    async update(id: string, data: SupabaseRecord): Promise<TRecord> {
      const clinicId = await getCurrentClinicId();
      const payload = normalizeForDatabase(data);
      const { data: updated, error } = await supabase
        .from(tableName)
        .update(payload)
        .eq('clinic_id', clinicId)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      return mapFromDatabase<TRecord>(updated as SupabaseRecord);
    },

    async remove(id: string): Promise<boolean> {
      const clinicId = await getCurrentClinicId();
      const { error } = await supabase
        .from(tableName)
        .update({ deleted_at: new Date().toISOString() })
        .eq('clinic_id', clinicId)
        .eq('id', id);

      if (error) throw error;
      return true;
    },
  };
}
