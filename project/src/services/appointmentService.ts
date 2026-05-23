import { supabase } from '../lib/supabase';


export interface AppointmentData {
  patientId: string;
  professionalId: string;
  serviceId: string;
  appointmentDate: string;
  appointmentTime: string;
  notes?: string;
}

export interface AvailableSlot {
  time: string;
  available: boolean;
}

type AppointmentRow = {
  id: string;
  patient_id?: string;
  professional_id: string;
  service_id: string;
  appointment_date: string;
  appointment_time: string;
  end_time: string;
  duration_minutes: number;
  status: string;
  notes?: string | null;
};

type ProfessionalRow = {
  id: string;
  start_time: string;
  end_time: string;
  lunch_start: string;
  lunch_end: string;
  available_days: string[];
};

type ServiceRow = {
  duration_minutes?: number;
};

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function addMinutes(time: string, minutes: number): string {
  return minutesToTime(timeToMinutes(time) + minutes);
}

function isTimeOverlap(slot1Start: string, slot1End: string, slot2Start: string, slot2End: string): boolean {
  const s1 = timeToMinutes(slot1Start);
  const e1 = timeToMinutes(slot1End);
  const s2 = timeToMinutes(slot2Start);
  const e2 = timeToMinutes(slot2End);

  return s1 < e2 && s2 < e1;
}

function isWeekday(dateStr: string, availableDays: string[]): boolean {
  const date = new Date(dateStr);
  const dayOfWeek = String(date.getDay());
  return availableDays.includes(dayOfWeek);
}

async function getConflictingAppointments(
  professionalId: string,
  appointmentDate: string,
  appointmentTime: string,
  endTime: string
): Promise<boolean> {
  const { data: conflicts } = (await supabase
    .from('appointments')
    .select('appointment_time, end_time, status')
    .eq('professional_id', professionalId)
    .eq('appointment_date', appointmentDate)
    .eq('status', 'confirmed')
    .neq('status', 'cancelled')) as { data: AppointmentRow[] | null };

  if (!conflicts) return false;

  return conflicts.some((conf) => isTimeOverlap(appointmentTime, endTime, conf.appointment_time, conf.end_time));
}

async function getProfessionalAvailability(professionalId: string) {
  const { data: professional } = (await supabase
    .from('professionals')
    .select('start_time, end_time, lunch_start, lunch_end, available_days')
    .eq('id', professionalId)
    .maybeSingle()) as { data: ProfessionalRow | null };

  return professional;
}

async function getServiceDuration(serviceId: string): Promise<number> {
  const { data: service } = (await supabase
    .from('services')
    .select('duration_minutes')
    .eq('id', serviceId)
    .maybeSingle()) as { data: ServiceRow | null };

  return service?.duration_minutes || 30;
}

export async function createAppointment(data: AppointmentData) {
  try {
    const professional = await getProfessionalAvailability(data.professionalId);
    if (!professional) {
      throw new Error('Professional not found');
    }

    if (!isWeekday(data.appointmentDate, professional.available_days)) {
      throw new Error('Professional not available on this day');
    }

    const duration = await getServiceDuration(data.serviceId);
    const endTime = addMinutes(data.appointmentTime, duration);

    const appointmentStart = timeToMinutes(data.appointmentTime);
    const appointmentEnd = timeToMinutes(endTime);
    const profStart = timeToMinutes(professional.start_time);
    const profEnd = timeToMinutes(professional.end_time);
    if (appointmentStart < profStart || appointmentEnd > profEnd) {
      throw new Error('Appointment time outside professional working hours');
    }

    if (isTimeOverlap(data.appointmentTime, endTime, professional.lunch_start, professional.lunch_end)) {
      throw new Error('Appointment conflicts with lunch break');
    }

    const hasConflict = await getConflictingAppointments(
      data.professionalId,
      data.appointmentDate,
      data.appointmentTime,
      endTime
    );

    if (hasConflict) {
      throw new Error('Time slot already booked');
    }

    const { data: appointment, error: appointmentError } = (await supabase
      .from('appointments')
      .insert({
        patient_id: data.patientId,
        professional_id: data.professionalId,
        service_id: data.serviceId,
        appointment_date: data.appointmentDate,
        appointment_time: data.appointmentTime,
        end_time: endTime,
        duration_minutes: duration,
        status: 'confirmed',
        notes: data.notes,
      })
      .select()
      .maybeSingle()) as { data: AppointmentRow | null; error: { message: string } | null };

    if (appointmentError) throw appointmentError;

    if (appointment) {
      await supabase.from('appointment_slots').insert({
        appointment_id: appointment.id,
        professional_id: data.professionalId,
        slot_date: data.appointmentDate,
        slot_start: data.appointmentTime,
        slot_end: endTime,
      });
    }

    return { success: true, appointment };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function cancelAppointment(appointmentId: string, reason?: string) {
  try {
    const { error: updateError } = await supabase
      .from('appointments')
      .update({ status: 'cancelled', notes: reason })
      .eq('id', appointmentId);

    if (updateError) throw updateError;

    await supabase
      .from('appointment_slots')
      .delete()
      .eq('appointment_id', appointmentId);

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function rescheduleAppointment(
  appointmentId: string,
  newDate: string,
  newTime: string
) {
  try {
    const { data: appointment } = (await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .maybeSingle()) as { data: AppointmentRow | null };

    if (!appointment) throw new Error('Appointment not found');

    const professional = await getProfessionalAvailability(appointment.professional_id);
    if (!professional) throw new Error('Professional not found');

    if (!isWeekday(newDate, professional.available_days)) {
      throw new Error('Professional not available on this day');
    }

    const endTime = addMinutes(newTime, appointment.duration_minutes);

    const hasConflict = await getConflictingAppointments(
      appointment.professional_id,
      newDate,
      newTime,
      endTime
    );

    if (hasConflict) throw new Error('Time slot already booked');

    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        appointment_date: newDate,
        appointment_time: newTime,
        end_time: endTime,
      })
      .eq('id', appointmentId);

    if (updateError) throw updateError;

    await supabase
      .from('appointment_slots')
      .delete()
      .eq('appointment_id', appointmentId);

    await supabase.from('appointment_slots').insert({
      appointment_id: appointmentId,
      professional_id: appointment.professional_id,
      slot_date: newDate,
      slot_start: newTime,
      slot_end: endTime,
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getAvailableSlots(
  professionalId: string,
  date: string,
  intervalMinutes: number = 30
): Promise<AvailableSlot[]> {
  try {
    const professional = await getProfessionalAvailability(professionalId);
    if (!professional) throw new Error('Professional not found');

    if (!isWeekday(date, professional.available_days)) {
      return [];
    }

    const { data: appointments } = (await supabase
      .from('appointments')
      .select('appointment_time, end_time, status')
      .eq('professional_id', professionalId)
      .eq('appointment_date', date)
      .eq('status', 'confirmed')) as { data: AppointmentRow[] | null };

    const slots: AvailableSlot[] = [];
    let currentTime = timeToMinutes(professional.start_time);
    const endTime = timeToMinutes(professional.end_time);
    while (currentTime + intervalMinutes <= endTime) {
      const slotEnd = currentTime + intervalMinutes;
      const slotStartStr = minutesToTime(currentTime);
      const slotEndStr = minutesToTime(slotEnd);

      if (isTimeOverlap(slotStartStr, slotEndStr, professional.lunch_start, professional.lunch_end)) {
        currentTime += intervalMinutes;
        continue;
      }

      const isBooked = appointments?.some(apt =>
        isTimeOverlap(slotStartStr, slotEndStr, apt.appointment_time, apt.end_time)
      ) || false;

      slots.push({
        time: slotStartStr,
        available: !isBooked,
      });

      currentTime += intervalMinutes;
    }

    return slots;
  } catch (error) {
    console.error('Error getting available slots:', error);
    return [];
  }
}

export async function addToWaitlist(
  patientId: string,
  professionalId: string,
  serviceId: string,
  preferredDateStart: string,
  preferredDateEnd?: string,
  preferredTime?: string,
  notes?: string
) {
  try {
    const { data: waitlistCount } = (await supabase
      .from('waitlist')
      .select('id', { count: 'exact' })
      .eq('professional_id', professionalId)) as { data: Array<{ id: string }> | null };

    const position = (waitlistCount?.length || 0) + 1;

    const { data: waitlistEntry, error } = (await supabase
      .from('waitlist')
      .insert({
        patient_id: patientId,
        professional_id: professionalId,
        service_id: serviceId,
        preferred_date_start: preferredDateStart,
        preferred_date_end: preferredDateEnd,
        preferred_time: preferredTime,
        notes,
        position,
      })
      .select()
      .maybeSingle()) as { data: { id: string } | null; error: { message: string } | null };

    if (error) throw error;

    return { success: true, position, waitlistEntry };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getWaitlist(professionalId: string) {
  try {
    const { data: waitlist } = (await supabase
      .from('waitlist')
      .select('*, patients(name, email, phone), services(name)')
      .eq('professional_id', professionalId)
      .order('position', { ascending: true })) as { data: unknown[] | null };

    return { success: true, waitlist };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function removeFromWaitlist(waitlistId: string) {
  try {
    const { error } = await supabase
      .from('waitlist')
      .delete()
      .eq('id', waitlistId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getPatientAppointments(patientId: string) {
  try {
    const { data: appointments } = (await supabase
      .from('appointments')
      .select('*, professionals(name, specialty), services(name, duration_minutes)')
      .eq('patient_id', patientId)
      .order('appointment_date', { ascending: false })) as { data: unknown[] | null };

    return { success: true, appointments };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getProfessionalSchedule(professionalId: string, date: string) {
  try {
    const { data: appointments } = (await supabase
      .from('appointments')
      .select('*, patients(name, email, phone), services(name, duration_minutes)')
      .eq('professional_id', professionalId)
      .eq('appointment_date', date)
      .neq('status', 'cancelled')
      .order('appointment_time', { ascending: true })) as { data: unknown[] | null };

    return { success: true, appointments };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
