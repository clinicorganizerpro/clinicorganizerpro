import { createSupabaseCrud, type SupabaseRecord } from '@/services/supabaseCrudService';

export type ClinicService = SupabaseRecord & {
  name?: string;
  description?: string;
  price?: number;
  durationMinutes?: number;
  active?: boolean;
};

const servicesCrud = createSupabaseCrud<ClinicService>('services');

export const listServices = () => servicesCrud.list();
export const getServiceById = (id: string) => servicesCrud.getById(id);
export const createService = (data: Partial<ClinicService>) => servicesCrud.create(data);
export const updateService = (id: string, data: Partial<ClinicService>) => servicesCrud.update(id, data);
export const removeService = (id: string) => servicesCrud.remove(id);
