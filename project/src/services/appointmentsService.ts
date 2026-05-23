import { createSupabaseCrud } from '@/services/supabaseCrudService';
import type { Appointment } from '@/types';

const appointmentsCrud = createSupabaseCrud<Appointment>('appointments');

export const listAppointments = () => appointmentsCrud.list();
export const getAppointmentById = (id: string) => appointmentsCrud.getById(id);
export const createAppointment = (data: Partial<Appointment>) => appointmentsCrud.create(data);
export const updateAppointment = (id: string, data: Partial<Appointment>) => appointmentsCrud.update(id, data);
export const removeAppointment = (id: string) => appointmentsCrud.remove(id);
