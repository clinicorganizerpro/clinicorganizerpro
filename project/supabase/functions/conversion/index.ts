import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ConversionRequest {
  action: string;
  professionalId?: string;
  serviceId?: string;
  date?: string;
  daysAhead?: number;
  patientId?: string;
  waitlistId?: string;
  message?: string;
  notificationType?: string;
  appointmentId?: string;
}

interface AppointmentSlot {
  appointment_time: string;
  end_time: string;
}

type ConversionSource = 'waitlist' | 'suggestion' | 'urgency_trigger';

interface ConversionAppointment {
  conversion_source?: ConversionSource;
}

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

async function getAvailableSlotsForDate(
  supabaseUrl: string,
  apiKey: string,
  professionalId: string,
  date: string,
  intervalMinutes: number = 30
): Promise<{ available: number; total: number; slots: string[] }> {
  const profRes = await fetch(
    `${supabaseUrl}/rest/v1/professionals?id=eq.${professionalId}`,
    { headers: { apikey: apiKey } }
  );
  const profs = await profRes.json();
  const professional = profs[0];

  if (!professional) return { available: 0, total: 0, slots: [] };

  const appointmentRes = await fetch(
    `${supabaseUrl}/rest/v1/appointments?professional_id=eq.${professionalId}&appointment_date=eq.${date}&status=eq.confirmed`,
    { headers: { apikey: apiKey } }
  );
  const appointments = await appointmentRes.json();

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

    const isBooked = (appointments as AppointmentSlot[]).some((apt) =>
      isTimeOverlap(slotStartStr, slotEndStr, apt.appointment_time, apt.end_time)
    );

    if (!isBooked) {
      slots.push(slotStartStr);
    }

    currentTime += intervalMinutes;
  }

  return { available: slots.length, total: Math.floor((endTime - timeToMinutes(professional.start_time)) / intervalMinutes), slots };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body: ConversionRequest = await req.json();
    const action = body.action;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    let result = { success: false, error: "Unknown action" };

    switch (action) {
      case "get_smart_suggestions": {
        const today = new Date();
        const daysAhead = body.daysAhead || 7;
        const nextSlots: Array<{
          date: string;
          time: string;
          availableSlotsInDay: number;
          totalSlotsInDay: number;
          recommendationScore: number;
        }> = [];

        const profRes = await fetch(
          `${supabaseUrl}/rest/v1/professionals?id=eq.${body.professionalId}`,
          { headers: { apikey: supabaseKey } }
        );
        const profs = await profRes.json();
        const professional = profs[0];

        if (!professional) {
          result = { success: false, error: "Professional not found" };
          break;
        }

        for (let i = 0; i < daysAhead; i++) {
          const checkDate = addDays(today, i);
          const dateStr = formatDate(checkDate);
          const dayOfWeek = String(checkDate.getDay());

          if (!professional.available_days.includes(dayOfWeek)) continue;

          const slotResult = await getAvailableSlotsForDate(
            supabaseUrl,
            supabaseKey,
            body.professionalId || "",
            dateStr,
            30
          );

          if (slotResult.available > 0 && slotResult.slots.length > 0) {
            const slotScore = calculateRecommendationScore(
              i,
              slotResult.available,
              slotResult.total,
              isToday(checkDate),
              isTomorrow(checkDate)
            );

            nextSlots.push({
              date: dateStr,
              time: slotResult.slots[0],
              availableSlotsInDay: slotResult.available,
              totalSlotsInDay: slotResult.total,
              recommendationScore: slotScore,
            });
          }
        }

        nextSlots.sort((a, b) => b.recommendationScore - a.recommendationScore);

        const suggestions: Array<Record<string, unknown>> = [];

        if (nextSlots.length > 0) {
          const topSlots = nextSlots.slice(0, 3);
          const checkDate = new Date(nextSlots[0].date);
          const urgencyLevel = nextSlots[0].availableSlotsInDay <= 2 ? 'high' : 'medium';

          suggestions.push({
            type: 'next_available',
            title: 'Próximo horário disponível',
            description: `${isToday(checkDate) ? 'Hoje às' : isTomorrow(checkDate) ? 'Amanhã às' : 'Em ' + nextSlots[0].date + ' às'} ${nextSlots[0].time}`,
            icon: 'Clock',
            urgencyLevel,
            slots: topSlots,
            professionalId: body.professionalId,
            serviceId: body.serviceId,
          });

          if (nextSlots[0].availableSlotsInDay <= 2) {
            suggestions.push({
              type: 'last_slots',
              title: 'Últimas vagas',
              description: `Apenas ${nextSlots[0].availableSlotsInDay} horário${nextSlots[0].availableSlotsInDay === 1 ? '' : 's'} disponível${nextSlots[0].availableSlotsInDay === 1 ? '' : 's'} em ${nextSlots[0].date}`,
              icon: 'AlertCircle',
              urgencyLevel: 'high',
              slots: topSlots,
              professionalId: body.professionalId,
              serviceId: body.serviceId,
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
              professionalId: body.professionalId,
              serviceId: body.serviceId,
            });
          }
        }

        result = { success: true, suggestions };
        break;
      }

      case "check_availability_urgency": {
        const slotResult = await getAvailableSlotsForDate(
          supabaseUrl,
          supabaseKey,
          body.professionalId || "",
          body.date || ""
        );

        if (slotResult.total === 0) {
          result = { success: true, alert: null };
          break;
        }

        const percentage = (slotResult.available / slotResult.total) * 100;
        const urgencyLevel = percentage <= 10 ? 'high' : percentage <= 25 ? 'medium' : 'low';

        let message = '';
        if (percentage <= 10) {
          message = `⚠️ Apenas ${slotResult.available} vagas disponível${slotResult.available === 1 ? '' : 's'} - Reserve agora!`;
        } else if (percentage <= 25) {
          message = `${slotResult.available} vagas disponíveis - Escolha logo`;
        } else {
          message = `${slotResult.available} horários disponíveis`;
        }

        await fetch(
          `${supabaseUrl}/rest/v1/availability_snapshots`,
          {
            method: "POST",
            headers: {
              apikey: supabaseKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              professional_id: body.professionalId,
              snapshot_date: body.date,
              total_slots: slotResult.total,
              available_slots: slotResult.available,
              urgency_level: urgencyLevel,
            }),
          }
        ).catch(() => {});

        const alert = {
          professionalId: body.professionalId,
          date: body.date,
          availableSlots: slotResult.available,
          totalSlots: slotResult.total,
          urgencyLevel,
          slotsPercentage: percentage,
          message,
        };

        result = { success: true, alert };
        break;
      }

      case "send_waitlist_notification": {
        const notificationRes = await fetch(
          `${supabaseUrl}/rest/v1/waitlist_notifications`,
          {
            method: "POST",
            headers: {
              apikey: supabaseKey,
              "Content-Type": "application/json",
              Prefer: "return=representation",
            },
            body: JSON.stringify({
              waitlist_id: body.waitlistId,
              patient_id: body.patientId,
              professional_id: body.professionalId,
              notification_type: body.notificationType,
              message: body.message,
            }),
          }
        );

        await fetch(
          `${supabaseUrl}/rest/v1/waitlist?id=eq.${body.waitlistId}`,
          {
            method: "PATCH",
            headers: {
              apikey: supabaseKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              notification_sent: true,
            }),
          }
        );

        const notification = await notificationRes.json();
        result = { success: true, notification: notification[0] };
        break;
      }

      case "track_conversion": {
        await fetch(
          `${supabaseUrl}/rest/v1/waitlist?id=eq.${body.waitlistId}`,
          {
            method: "PATCH",
            headers: {
              apikey: supabaseKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              conversion_slot_id: body.appointmentId,
              converted_at: new Date().toISOString(),
            }),
          }
        );

        await fetch(
          `${supabaseUrl}/rest/v1/appointments?id=eq.${body.appointmentId}`,
          {
            method: "PATCH",
            headers: {
              apikey: supabaseKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              conversion_source: 'waitlist',
            }),
          }
        );

        result = { success: true };
        break;
      }

      case "get_waitlist_notifications": {
        const notificationRes = await fetch(
          `${supabaseUrl}/rest/v1/waitlist_notifications?patient_id=eq.${body.patientId}&order=sent_at.desc`,
          { headers: { apikey: supabaseKey } }
        );
        const notifications = await notificationRes.json();
        result = { success: true, notifications };
        break;
      }

      case "mark_notification_read": {
        await fetch(
          `${supabaseUrl}/rest/v1/waitlist_notifications?id=eq.${body.patientId}`,
          {
            method: "PATCH",
            headers: {
              apikey: supabaseKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              read_at: new Date().toISOString(),
            }),
          }
        );

        result = { success: true };
        break;
      }

      case "get_professional_metrics": {
        const today = new Date();
        const daysAhead = body.daysAhead || 7;
        const metrics: {
          totalAvailableSlots: number;
          totalSlots: number;
          occupancyRate: number;
          nextAvailableDate: string | null;
          urgencyDays: number;
          daysWithSlots: string[];
        } = {
          totalAvailableSlots: 0,
          totalSlots: 0,
          occupancyRate: 0,
          nextAvailableDate: null,
          urgencyDays: 0,
          daysWithSlots: [],
        };

        const profRes = await fetch(
          `${supabaseUrl}/rest/v1/professionals?id=eq.${body.professionalId}`,
          { headers: { apikey: supabaseKey } }
        );
        const profs = await profRes.json();
        const professional = profs[0];

        if (!professional) {
          result = { success: false, error: "Professional not found" };
          break;
        }

        for (let i = 0; i < daysAhead; i++) {
          const checkDate = addDays(today, i);
          const dateStr = formatDate(checkDate);
          const dayOfWeek = String(checkDate.getDay());

          if (!professional.available_days.includes(dayOfWeek)) continue;

          const slotResult = await getAvailableSlotsForDate(
            supabaseUrl,
            supabaseKey,
            body.professionalId || "",
            dateStr,
            30
          );

          metrics.totalSlots += slotResult.total;
          metrics.totalAvailableSlots += slotResult.available;

          if (slotResult.available > 0 && !metrics.nextAvailableDate) {
            metrics.nextAvailableDate = dateStr;
          }

          if (slotResult.available > 0) {
            metrics.daysWithSlots.push(dateStr);
          }

          const occupancy = ((slotResult.total - slotResult.available) / slotResult.total) * 100;
          if (occupancy >= 90) {
            metrics.urgencyDays++;
          }
        }

        if (metrics.totalSlots > 0) {
          metrics.occupancyRate = ((metrics.totalSlots - metrics.totalAvailableSlots) / metrics.totalSlots) * 100;
        }

        result = { success: true, metrics };
        break;
      }

      case "get_conversion_metrics": {
        const conversionRes = await fetch(
          `${supabaseUrl}/rest/v1/appointments?professional_id=eq.${body.professionalId}&conversion_source=in.("waitlist","suggestion","urgency_trigger")`,
          { headers: { apikey: supabaseKey } }
        );
        const conversions = await conversionRes.json();

        const totalRes = await fetch(
          `${supabaseUrl}/rest/v1/appointments?professional_id=eq.${body.professionalId}`,
          { headers: { apikey: supabaseKey } }
        );
        const allAppointments = await totalRes.json();

        const metrics: {
          totalConversions: number;
          totalAppointments: number;
          conversionRate: number;
          conversionBySource: Record<ConversionSource, number>;
        } = {
          totalConversions: conversions?.length || 0,
          totalAppointments: allAppointments?.length || 0,
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

        (conversions as ConversionAppointment[] | null)?.forEach((appt) => {
          const source = appt.conversion_source;
          if (source && source in metrics.conversionBySource) {
            metrics.conversionBySource[source]++;
          }
        });

        result = { success: true, metrics };
        break;
      }
    }

    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
