import { supabase } from '../lib/supabase';

export interface SmartSuggestion {
  type: 'next_available' | 'priority_slots' | 'urgency_warning' | 'last_slots';
  title: string;
  description: string;
  icon: string;
  urgencyLevel: 'high' | 'medium' | 'low';
  slots: SuggestionSlot[];
  professionalId: string;
  serviceId: string;
}

export interface SuggestionSlot {
  date: string;
  time: string;
  availableSlotsInDay: number;
  totalSlotsInDay: number;
  recommendationScore: number;
}

export interface AvailabilityAlert {
  professionalId: string;
  date: string;
  availableSlots: number;
  totalSlots: number;
  urgencyLevel: 'high' | 'medium' | 'low';
  slotsPercentage: number;
  message: string;
}

type ProfessionalRow = {
  start_time: string;
  end_time: string;
  lunch_start: string;
  lunch_end: string;
  available_days: string[];
};

type AppointmentRow = {
  appointment_time: string;
  end_time: string;
  conversion_source?: 'waitlist' | 'suggestion' | 'urgency_trigger' | string | null;
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

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function isToday(date: Date): boolean {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

function isTomorrow(date: Date): boolean {
  const tomorrow = addDays(new Date(), 1);
  return date.toDateString() === tomorrow.toDateString();
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function isTimeOverlap(slot1Start: string, slot1End: string, slot2Start: string, slot2End: string): boolean {
  const s1 = timeToMinutes(slot1Start);
  const e1 = timeToMinutes(slot1End);
  const s2 = timeToMinutes(slot2Start);
  const e2 = timeToMinutes(slot2End);
  return s1 < e2 && s2 < e1;
}

async function getProfessionalAvailability(professionalId: string): Promise<ProfessionalRow | null> {
  const { data: professional } = (await supabase
    .from('professionals')
    .select('start_time, end_time, lunch_start, lunch_end, available_days')
    .eq('id', professionalId)
    .maybeSingle()) as { data: ProfessionalRow | null };

  return professional;
}

async function getAvailableSlotsForDate(
  professionalId: string,
  date: string,
  intervalMinutes: number = 30
): Promise<{ available: number; total: number; slots: string[] }> {
  const professional = await getProfessionalAvailability(professionalId);
  if (!professional) return { available: 0, total: 0, slots: [] };

  const { data: appointments } = (await supabase
    .from('appointments')
    .select('appointment_time, end_time, status')
    .eq('professional_id', professionalId)
    .eq('appointment_date', date)
    .eq('status', 'confirmed')) as { data: AppointmentRow[] | null };

  const slots: string[] = [];
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

    if (!isBooked) {
      slots.push(slotStartStr);
    }

    currentTime += intervalMinutes;
  }

  return { available: slots.length, total: Math.floor((endTime - timeToMinutes(professional.start_time)) / intervalMinutes), slots };
}

export async function getSmartSuggestions(
  professionalId: string,
  serviceId: string,
  daysAhead: number = 7
): Promise<SmartSuggestion[]> {
  try {
    const professional = await getProfessionalAvailability(professionalId);
    if (!professional) throw new Error('Professional not found');

    const suggestions: SmartSuggestion[] = [];
    const today = new Date();
    const nextSlots: SuggestionSlot[] = [];

    for (let i = 0; i < daysAhead; i++) {
      const checkDate = addDays(today, i);
      const dateStr = formatDate(checkDate);
      const dayOfWeek = String(checkDate.getDay());

      if (!professional.available_days.includes(dayOfWeek)) continue;

      const result = await getAvailableSlotsForDate(professionalId, dateStr, 30);

      if (result.available > 0 && result.slots.length > 0) {
        const slotScore = calculateRecommendationScore(
          i,
          result.available,
          result.total,
          isToday(checkDate),
          isTomorrow(checkDate)
        );

        nextSlots.push({
          date: dateStr,
          time: result.slots[0],
          availableSlotsInDay: result.available,
          totalSlotsInDay: result.total,
          recommendationScore: slotScore,
        });
      }
    }

    nextSlots.sort((a, b) => b.recommendationScore - a.recommendationScore);

    if (nextSlots.length > 0) {
      const topSlots = nextSlots.slice(0, 3);
      const urgencyLevel = nextSlots[0].availableSlotsInDay <= 2 ? 'high' : 'medium';

      suggestions.push({
        type: 'next_available',
        title: 'Próximo horário disponível',
        description: `${isToday(new Date(nextSlots[0].date)) ? 'Hoje às' : 'Amanhã às'} ${nextSlots[0].time}`,
        icon: 'Clock',
        urgencyLevel,
        slots: topSlots,
        professionalId,
        serviceId,
      });

      if (nextSlots[0].availableSlotsInDay <= 2) {
        suggestions.push({
          type: 'last_slots',
          title: 'Últimas vagas',
          description: `Apenas ${nextSlots[0].availableSlotsInDay} horário${nextSlots[0].availableSlotsInDay === 1 ? '' : 's'} disponível${nextSlots[0].availableSlotsInDay === 1 ? '' : 's'} em ${nextSlots[0].date}`,
          icon: 'AlertCircle',
          urgencyLevel: 'high',
          slots: topSlots,
          professionalId,
          serviceId,
        });
      }

      if (nextSlots.length >= 3 && nextSlots.every(s => s.availableSlotsInDay <= 3)) {
        suggestions.push({
          type: 'urgency_warning',
          title: 'Horários quase esgotando',
          description: `Os próximos dias têm alta demanda. Escolha com antecedência`,
          icon: 'Zap',
          urgencyLevel: 'high',
          slots: nextSlots.slice(0, 5),
          professionalId,
          serviceId,
        });
      }
    }

    return suggestions;
  } catch (error) {
    console.error('Error getting smart suggestions:', error);
    return [];
  }
}

export async function checkAvailabilityUrgency(professionalId: string, date: string): Promise<AvailabilityAlert | null> {
  try {
    const result = await getAvailableSlotsForDate(professionalId, date);

    if (result.total === 0) return null;

    const percentage = (result.available / result.total) * 100;
    const urgencyLevel = percentage <= 10 ? 'high' : percentage <= 25 ? 'medium' : 'low';

    let message = '';
    if (percentage <= 10) {
      message = `⚠️ Apenas ${result.available} vagas disponível${result.available === 1 ? '' : 's'} - Reserve agora!`;
    } else if (percentage <= 25) {
      message = `${result.available} vagas disponíveis - Escolha logo`;
    } else {
      message = `${result.available} horários disponíveis`;
    }

    await captureAvailabilitySnapshot(professionalId, date, result.total, result.available, urgencyLevel);

    return {
      professionalId,
      date,
      availableSlots: result.available,
      totalSlots: result.total,
      urgencyLevel,
      slotsPercentage: percentage,
      message,
    };
  } catch (error) {
    console.error('Error checking urgency:', error);
    return null;
  }
}

async function captureAvailabilitySnapshot(
  professionalId: string,
  date: string,
  totalSlots: number,
  availableSlots: number,
  urgencyLevel: 'high' | 'medium' | 'low'
) {
  try {
    await supabase
      .from('availability_snapshots')
      .upsert({
        professional_id: professionalId,
        snapshot_date: date,
        total_slots: totalSlots,
        available_slots: availableSlots,
        urgency_level: urgencyLevel,
      }, { onConflict: 'professional_id,snapshot_date' });
  } catch (error) {
    console.error('Error capturing snapshot:', error);
  }
}

function calculateRecommendationScore(
  daysAhead: number,
  availableSlots: number,
  totalSlots: number,
  isToday: boolean,
  isTomorrow: boolean
): number {
  let score = 0;

  if (isToday) score += 100;
  else if (isTomorrow) score += 80;
  else score += Math.max(0, 60 - daysAhead * 5);

  const availabilityRatio = availableSlots / totalSlots;
  if (availabilityRatio > 0.7) score += 30;
  else if (availabilityRatio > 0.4) score += 20;
  else if (availabilityRatio > 0.1) score += 10;

  if (availableSlots <= 2) score += 40;
  else if (availableSlots <= 5) score += 20;

  return score;
}

export async function sendWaitlistNotification(
  waitlistId: string,
  patientId: string,
  professionalId: string,
  message: string,
  notificationType: 'slot_available' | 'urgency_warning' | 'reminder'
) {
  try {
    const { data, error } = await supabase
      .from('waitlist_notifications')
      .insert({
        waitlist_id: waitlistId,
        patient_id: patientId,
        professional_id: professionalId,
        notification_type: notificationType,
        message,
      })
      .select()
      .maybeSingle();

    if (error) throw error;

    await supabase
      .from('waitlist')
      .update({ notification_sent: true })
      .eq('id', waitlistId);

    return { success: true, notification: data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getWaitlistNotifications(patientId: string) {
  try {
    const { data: notifications } = await supabase
      .from('waitlist_notifications')
      .select('*, professionals(name, specialty)')
      .eq('patient_id', patientId)
      .order('sent_at', { ascending: false });

    return { success: true, notifications };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function markNotificationAsRead(notificationId: string) {
  try {
    const { error } = await supabase
      .from('waitlist_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function trackConversionFromWaitlist(
  waitlistId: string,
  appointmentId: string
) {
  try {
    await supabase
      .from('waitlist')
      .update({
        conversion_slot_id: appointmentId,
        converted_at: new Date().toISOString(),
      })
      .eq('id', waitlistId);

    await supabase
      .from('appointments')
      .update({ conversion_source: 'waitlist' })
      .eq('id', appointmentId);

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getProfessionalAvailabilityMetrics(
  professionalId: string,
  daysAhead: number = 7
) {
  try {
    const today = new Date();
    const metrics = {
      totalAvailableSlots: 0,
      totalSlots: 0,
      occupancyRate: 0,
      nextAvailableDate: null as string | null,
      urgencyDays: 0,
      daysWithSlots: [] as string[],
    };

    const professional = await getProfessionalAvailability(professionalId);
    if (!professional) throw new Error('Professional not found');

    for (let i = 0; i < daysAhead; i++) {
      const checkDate = addDays(today, i);
      const dateStr = formatDate(checkDate);
      const dayOfWeek = String(checkDate.getDay());

      if (!professional.available_days.includes(dayOfWeek)) continue;

      const result = await getAvailableSlotsForDate(professionalId, dateStr, 30);
      metrics.totalSlots += result.total;
      metrics.totalAvailableSlots += result.available;

      if (result.available > 0 && !metrics.nextAvailableDate) {
        metrics.nextAvailableDate = dateStr;
      }

      if (result.available > 0) {
        metrics.daysWithSlots.push(dateStr);
      }

      const occupancy = ((result.total - result.available) / result.total) * 100;
      if (occupancy >= 90) {
        metrics.urgencyDays++;
      }
    }

    if (metrics.totalSlots > 0) {
      metrics.occupancyRate = ((metrics.totalSlots - metrics.totalAvailableSlots) / metrics.totalSlots) * 100;
    }

    return { success: true, metrics };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getConversionMetrics(professionalId: string) {
  try {
    const { data: conversions } = (await supabase
      .from('appointments')
      .select('id, conversion_source, created_at')
      .eq('professional_id', professionalId)
      .in('conversion_source', ['waitlist', 'suggestion', 'urgency_trigger'])) as {
      data: AppointmentRow[] | null;
    };

    const totalAppointmentsResponse = (await supabase
      .from('appointments')
      .select('id', { count: 'exact' })
      .eq('professional_id', professionalId)) as {
      data: Array<{ id: string }> | null;
      count?: number;
    };

    const totalAppointments = totalAppointmentsResponse.count ?? totalAppointmentsResponse.data?.length ?? 0;

    const metrics = {
      totalConversions: conversions?.length || 0,
      totalAppointments,
      conversionRate: 0,
      conversionBySource: {
        waitlist: 0,
        suggestion: 0,
        urgency_trigger: 0,
      },
    };

    if (metrics.totalAppointments > 0) {
      metrics.conversionRate = (metrics.totalConversions / metrics.totalAppointments) * 100;
    }

    conversions?.forEach((appt) => {
      const source = appt.conversion_source;
      if (source === 'waitlist' || source === 'suggestion' || source === 'urgency_trigger') {
        metrics.conversionBySource[source]++;
      }
    });

    return { success: true, metrics };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
