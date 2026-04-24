import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AppointmentRequest {
  action: string;
  patientId?: string;
  professionalId?: string;
  serviceId?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  newDate?: string;
  newTime?: string;
  appointmentId?: string;
  reason?: string;
  date?: string;
  intervalMinutes?: number;
  preferredDateStart?: string;
  preferredDateEnd?: string;
  preferredTime?: string;
  notes?: string;
  waitlistId?: string;
}

interface AppointmentSlot {
  appointment_time: string;
  end_time: string;
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
  const date = new Date(dateStr + 'T00:00:00');
  const dayOfWeek = String(date.getDay());
  return availableDays.includes(dayOfWeek);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body: AppointmentRequest = await req.json();
    const action = body.action;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    let result = { success: false, error: "Unknown action" };

    switch (action) {
      case "create_appointment": {
        const createRes = await fetch(`${supabaseUrl}/rest/v1/professionals?id=eq.${body.professionalId}&select=start_time,end_time,lunch_start,lunch_end,available_days`, {
          headers: { apikey: supabaseKey },
        });
        const professionals = await createRes.json();
        const professional = professionals[0];

        if (!professional) {
          result = { success: false, error: "Professional not found" };
          break;
        }

        if (!isWeekday(body.appointmentDate || "", professional.available_days)) {
          result = { success: false, error: "Professional not available on this day" };
          break;
        }

        const serviceRes = await fetch(`${supabaseUrl}/rest/v1/services?id=eq.${body.serviceId}&select=duration_minutes`, {
          headers: { apikey: supabaseKey },
        });
        const services = await serviceRes.json();
        const duration = services[0]?.duration_minutes || 30;

        const endTime = addMinutes(body.appointmentTime || "", duration);

        const appointmentStart = timeToMinutes(body.appointmentTime || "");
        const appointmentEnd = timeToMinutes(endTime);
        const profStart = timeToMinutes(professional.start_time);
        const profEnd = timeToMinutes(professional.end_time);

        if (appointmentStart < profStart || appointmentEnd > profEnd) {
          result = { success: false, error: "Appointment time outside professional working hours" };
          break;
        }

        if (isTimeOverlap(body.appointmentTime || "", endTime, professional.lunch_start, professional.lunch_end)) {
          result = { success: false, error: "Appointment conflicts with lunch break" };
          break;
        }

        const conflictRes = await fetch(
          `${supabaseUrl}/rest/v1/appointments?professional_id=eq.${body.professionalId}&appointment_date=eq.${body.appointmentDate}&status=eq.confirmed`,
          { headers: { apikey: supabaseKey } }
        );
        const conflicts: AppointmentSlot[] = await conflictRes.json();

        const hasConflict = conflicts.some((conf) =>
          isTimeOverlap(body.appointmentTime || "", endTime, conf.appointment_time, conf.end_time)
        );

        if (hasConflict) {
          result = { success: false, error: "Time slot already booked" };
          break;
        }

        const appointmentRes = await fetch(`${supabaseUrl}/rest/v1/appointments`, {
          method: "POST",
          headers: {
            apikey: supabaseKey,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify({
            patient_id: body.patientId,
            professional_id: body.professionalId,
            service_id: body.serviceId,
            appointment_date: body.appointmentDate,
            appointment_time: body.appointmentTime,
            end_time: endTime,
            duration_minutes: duration,
            status: "confirmed",
            notes: body.notes,
          }),
        });

        const appointment = await appointmentRes.json();

        if (appointment[0]) {
          await fetch(`${supabaseUrl}/rest/v1/appointment_slots`, {
            method: "POST",
            headers: {
              apikey: supabaseKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              appointment_id: appointment[0].id,
              professional_id: body.professionalId,
              slot_date: body.appointmentDate,
              slot_start: body.appointmentTime,
              slot_end: endTime,
            }),
          });
        }

        result = { success: true, appointment: appointment[0] };
        break;
      }

      case "cancel_appointment": {
        await fetch(`${supabaseUrl}/rest/v1/appointments?id=eq.${body.appointmentId}`, {
          method: "PATCH",
          headers: {
            apikey: supabaseKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "cancelled",
            notes: body.reason,
          }),
        });

        await fetch(`${supabaseUrl}/rest/v1/appointment_slots?appointment_id=eq.${body.appointmentId}`, {
          method: "DELETE",
          headers: { apikey: supabaseKey },
        });

        result = { success: true };
        break;
      }

      case "reschedule_appointment": {
        const appointmentRes = await fetch(`${supabaseUrl}/rest/v1/appointments?id=eq.${body.appointmentId}`, {
          headers: { apikey: supabaseKey },
        });
        const appointments = await appointmentRes.json();
        const appointment = appointments[0];

        if (!appointment) {
          result = { success: false, error: "Appointment not found" };
          break;
        }

        const profRes = await fetch(`${supabaseUrl}/rest/v1/professionals?id=eq.${appointment.professional_id}`, {
          headers: { apikey: supabaseKey },
        });
        const profs = await profRes.json();
        const prof = profs[0];

        if (!isWeekday(body.newDate || "", prof.available_days)) {
          result = { success: false, error: "Professional not available on this day" };
          break;
        }

        const newEndTime = addMinutes(body.newTime || "", appointment.duration_minutes);

        const conflictRes = await fetch(
          `${supabaseUrl}/rest/v1/appointments?professional_id=eq.${appointment.professional_id}&appointment_date=eq.${body.newDate}&status=eq.confirmed&id=neq.${body.appointmentId}`,
          { headers: { apikey: supabaseKey } }
        );
        const conflicts: AppointmentSlot[] = await conflictRes.json();

        const hasConflict = conflicts.some((conf) =>
          isTimeOverlap(body.newTime || "", newEndTime, conf.appointment_time, conf.end_time)
        );

        if (hasConflict) {
          result = { success: false, error: "Time slot already booked" };
          break;
        }

        await fetch(`${supabaseUrl}/rest/v1/appointments?id=eq.${body.appointmentId}`, {
          method: "PATCH",
          headers: {
            apikey: supabaseKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            appointment_date: body.newDate,
            appointment_time: body.newTime,
            end_time: newEndTime,
          }),
        });

        await fetch(`${supabaseUrl}/rest/v1/appointment_slots?appointment_id=eq.${body.appointmentId}`, {
          method: "DELETE",
          headers: { apikey: supabaseKey },
        });

        await fetch(`${supabaseUrl}/rest/v1/appointment_slots`, {
          method: "POST",
          headers: {
            apikey: supabaseKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            appointment_id: body.appointmentId,
            professional_id: appointment.professional_id,
            slot_date: body.newDate,
            slot_start: body.newTime,
            slot_end: newEndTime,
          }),
        });

        result = { success: true };
        break;
      }

      case "get_available_slots": {
        const profRes = await fetch(`${supabaseUrl}/rest/v1/professionals?id=eq.${body.professionalId}`, {
          headers: { apikey: supabaseKey },
        });
        const profs = await profRes.json();
        const prof = profs[0];

        if (!prof) {
          result = { success: false, error: "Professional not found" };
          break;
        }

        if (!isWeekday(body.date || "", prof.available_days)) {
          result = { success: true, slots: [] };
          break;
        }

        const appointmentRes = await fetch(
          `${supabaseUrl}/rest/v1/appointments?professional_id=eq.${body.professionalId}&appointment_date=eq.${body.date}&status=eq.confirmed`,
          { headers: { apikey: supabaseKey } }
        );
        const appointments = await appointmentRes.json();

        const slots = [];
        const interval = body.intervalMinutes || 30;
        let currentTime = timeToMinutes(prof.start_time);
        const endTime = timeToMinutes(prof.end_time);
        while (currentTime + interval <= endTime) {
          const slotEnd = currentTime + interval;
          const slotStartStr = minutesToTime(currentTime);
          const slotEndStr = minutesToTime(slotEnd);

          if (isTimeOverlap(slotStartStr, slotEndStr, prof.lunch_start, prof.lunch_end)) {
            currentTime += interval;
            continue;
          }

          const isBooked = (appointments as AppointmentSlot[]).some((apt) =>
            isTimeOverlap(slotStartStr, slotEndStr, apt.appointment_time, apt.end_time)
          );

          slots.push({
            time: slotStartStr,
            available: !isBooked,
          });

          currentTime += interval;
        }

        result = { success: true, slots };
        break;
      }

      case "add_to_waitlist": {
        const countRes = await fetch(
          `${supabaseUrl}/rest/v1/waitlist?professional_id=eq.${body.professionalId}`,
          { headers: { apikey: supabaseKey } }
        );
        const waitlistEntries = await countRes.json();
        const position = waitlistEntries.length + 1;

        const waitlistRes = await fetch(`${supabaseUrl}/rest/v1/waitlist`, {
          method: "POST",
          headers: {
            apikey: supabaseKey,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify({
            patient_id: body.patientId,
            professional_id: body.professionalId,
            service_id: body.serviceId,
            preferred_date_start: body.preferredDateStart,
            preferred_date_end: body.preferredDateEnd,
            preferred_time: body.preferredTime,
            notes: body.notes,
            position,
          }),
        });

        const waitlist = await waitlistRes.json();
        result = { success: true, position, waitlistEntry: waitlist[0] };
        break;
      }

      case "get_waitlist": {
        const waitlistRes = await fetch(
          `${supabaseUrl}/rest/v1/waitlist?professional_id=eq.${body.professionalId}&order=position.asc`,
          { headers: { apikey: supabaseKey } }
        );
        const waitlist = await waitlistRes.json();
        result = { success: true, waitlist };
        break;
      }

      case "remove_from_waitlist": {
        await fetch(`${supabaseUrl}/rest/v1/waitlist?id=eq.${body.waitlistId}`, {
          method: "DELETE",
          headers: { apikey: supabaseKey },
        });
        result = { success: true };
        break;
      }

      case "get_patient_appointments": {
        const appointmentRes = await fetch(
          `${supabaseUrl}/rest/v1/appointments?patient_id=eq.${body.patientId}&order=appointment_date.desc`,
          { headers: { apikey: supabaseKey } }
        );
        const appointments = await appointmentRes.json();
        result = { success: true, appointments };
        break;
      }

      case "get_professional_schedule": {
        const appointmentRes = await fetch(
          `${supabaseUrl}/rest/v1/appointments?professional_id=eq.${body.professionalId}&appointment_date=eq.${body.date}&status=neq.cancelled&order=appointment_time.asc`,
          { headers: { apikey: supabaseKey } }
        );
        const appointments = await appointmentRes.json();
        result = { success: true, appointments };
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
