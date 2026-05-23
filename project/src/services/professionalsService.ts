import { createSupabaseCrud } from '@/services/supabaseCrudService';
import type { Professional } from '@/types';

const professionalsCrud = createSupabaseCrud<Professional>('professionals');

export const listProfessionals = () => professionalsCrud.list();
export const getProfessionalById = (id: string) => professionalsCrud.getById(id);
export const createProfessional = (data: Partial<Professional>) => professionalsCrud.create(data);
export const updateProfessional = (id: string, data: Partial<Professional>) => professionalsCrud.update(id, data);
export const removeProfessional = (id: string) => professionalsCrud.remove(id);
