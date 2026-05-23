import { createSupabaseCrud } from '@/services/supabaseCrudService';
import type { Patient } from '@/types';

const patientsCrud = createSupabaseCrud<Patient>('patients');

export const listPatients = () => patientsCrud.list();
export const getPatientById = (id: string) => patientsCrud.getById(id);
export const createPatient = (data: Partial<Patient>) => patientsCrud.create(data);
export const updatePatient = (id: string, data: Partial<Patient>) => patientsCrud.update(id, data);
export const removePatient = (id: string) => patientsCrud.remove(id);
