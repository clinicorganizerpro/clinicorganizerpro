import { createSupabaseCrud } from '@/services/supabaseCrudService';
import type { Anamnesis } from '@/types';

const anamnesisCrud = createSupabaseCrud<Anamnesis>('anamneses');

export const listAnamneses = () => anamnesisCrud.list();
export const getAnamnesisById = (id: string) => anamnesisCrud.getById(id);
export const createAnamnesis = (data: Partial<Anamnesis>) => anamnesisCrud.create(data);
export const updateAnamnesis = (id: string, data: Partial<Anamnesis>) => anamnesisCrud.update(id, data);
export const removeAnamnesis = (id: string) => anamnesisCrud.remove(id);
