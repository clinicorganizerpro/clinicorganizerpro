import { supabase } from '@/lib/supabase';
import {
  getCurrentClinicId,
  getCurrentSupabaseUser,
  mapFromDatabase,
  transformKeys,
  camelToSnake,
  type SupabaseRecord,
} from '@/services/supabaseCrudService';

export type ClinicSettings = SupabaseRecord;

export async function getSettings(): Promise<ClinicSettings | null> {
  const clinicId = await getCurrentClinicId();
  const { data, error } = await supabase
    .from('clinic_settings')
    .select('*')
    .eq('clinic_id', clinicId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapFromDatabase<ClinicSettings>(data as SupabaseRecord) : null;
}

export async function upsertSettings(settings: ClinicSettings): Promise<ClinicSettings> {
  const [user, clinicId] = await Promise.all([getCurrentSupabaseUser(), getCurrentClinicId()]);
  const payload = {
    ...(transformKeys(settings, camelToSnake) as SupabaseRecord),
    clinic_id: clinicId,
    user_id: user.id,
    created_by: user.id,
  };

  const { data, error } = await supabase
    .from('clinic_settings')
    .upsert(payload, { onConflict: 'clinic_id' })
    .select('*')
    .single();

  if (error) throw error;
  return mapFromDatabase<ClinicSettings>(data as SupabaseRecord);
}
