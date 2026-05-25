import type { Appointment } from '../types';
import { notificationService } from '../services/notificationService';
import { localApiCreate, localApiDelete, localApiUpdate } from './localApiClient';

const DEFAULT_STORAGE_KEY = 'appointments';

type AppointmentInput = Record<string, unknown>;

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return Object.prototype.toString.call(value) === '[object Object]';
};

const getStorageKey = (userId?: string) => {
  return userId ? `${DEFAULT_STORAGE_KEY}:${userId}` : DEFAULT_STORAGE_KEY;
};

const getCurrentTimestamp = () => new Date().toISOString();

const readString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }

  return '';
};

const readNumber = (fallback: number, ...values: unknown[]) => {
  for (const value of values) {
    const parsed = typeof value === 'number' ? value : Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

const normalizeAppointmentStatus = (value: unknown): Appointment['status'] => {
  if (value === 'confirmed' || value === 'completed' || value === 'cancelled' || value === 'no-show') {
    return value;
  }

  if (value === 'no_show') {
    return 'no-show';
  }

  return 'scheduled';
};

const normalizeAppointment = (value: unknown): Appointment | null => {
  if (!isPlainObject(value)) {
    return null;
  }

  if (typeof value.id !== 'string' || !value.id.trim()) {
    return null;
  }

  const createdAt = readString(value.createdAt, value.created_at) || getCurrentTimestamp();

  return {
    id: value.id,
    patientId: readString(value.patientId, value.patient_id),
    patientName: readString(value.patientName, value.patient_name),
    procedure: readString(value.procedure),
    date: readString(value.date, value.appointmentDate, value.appointment_date),
    time: readString(value.time, value.appointmentTime, value.appointment_time),
    duration: readNumber(60, value.duration, value.durationMinutes, value.duration_minutes),
    professional: readString(value.professional, value.professionalName, value.professional_name),
    status: normalizeAppointmentStatus(value.status),
    value: readNumber(0, value.value),
    notes: readString(value.notes) || undefined,
    createdAt,
  };
};

const readStoredAppointments = (userId?: string): Appointment[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(getStorageKey(userId));

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map(normalizeAppointment).filter((appointment): appointment is Appointment => appointment !== null);
  } catch {
    return [];
  }
};

const writeStoredAppointments = (appointments: Appointment[], userId?: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(getStorageKey(userId), JSON.stringify(appointments));
};

const buildAppointment = (
  payload: AppointmentInput,
  overrides: { id?: string; createdAt?: string } = {},
): Appointment => {
  const id =
    overrides.id ??
    (readString(payload.id) ||
      (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `appointment_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`));

  const createdAt =
    overrides.createdAt ??
    (readString(payload.createdAt, payload.created_at) || getCurrentTimestamp());

  return {
    id,
    patientId: readString(payload.patientId, payload.patient_id),
    patientName: readString(payload.patientName, payload.patient_name),
    procedure: readString(payload.procedure),
    date: readString(payload.date, payload.appointmentDate, payload.appointment_date),
    time: readString(payload.time, payload.appointmentTime, payload.appointment_time),
    duration: readNumber(60, payload.duration, payload.durationMinutes, payload.duration_minutes),
    professional: readString(payload.professional, payload.professionalName, payload.professional_name),
    status: normalizeAppointmentStatus(payload.status),
    value: readNumber(0, payload.value),
    notes: readString(payload.notes) || undefined,
    createdAt,
  };
};

const LOCAL_RELATION = 'appointments';

const bestEffortSyncToBackend = async (userId: string, action: 'upsert' | 'delete', appointment: Appointment): Promise<void> => {
  // O backend local espera fields em formato "snake_case" (via localApiClient -> /api/:relation).
  // O AppContext já usa user_id como filtro em patients/incomes/expenses; para appointments
  // a rota localApi vai simplesmente gravar payload que você manda.
  const payload = {
    id: appointment.id,
    user_id: userId,
    patient_id: appointment.patientId,
    patient_name: appointment.patientName,
    procedure: appointment.procedure,
    appointment_date: appointment.date,
    appointment_time: appointment.time,
    duration: appointment.duration,
    professional: appointment.professional,
    status: appointment.status,
    value: appointment.value,
    notes: appointment.notes ?? '',
    created_at: appointment.createdAt ?? getCurrentTimestamp(),
  };

  if (action === 'delete') {
    await localApiDelete(LOCAL_RELATION, appointment.id);
    return;
  }

  try {
    await localApiUpdate(LOCAL_RELATION, appointment.id, payload as never);
  } catch {
    await localApiCreate(LOCAL_RELATION, payload as never);
  }
};

export function carregarAgendamentos(userId?: string): Appointment[] {
  return readStoredAppointments(userId);
}

export function salvarAgendamentos(agendamentos: Appointment[], userId?: string): Appointment[] {
  writeStoredAppointments(agendamentos, userId);

  // best-effort: tenta sincronizar também no backend local via API
  if (typeof userId === 'string' && userId.trim()) {
    void (async () => {
      try {
        for (const appointment of agendamentos) {
          await bestEffortSyncToBackend(userId, 'upsert', appointment);
        }
      } catch (err) {
        console.error('[appointmentStorage] sync salvarAgendamentos failed:', err);
      }
    })();
  }

  return agendamentos;
}

export function salvarAgendamento(agendamento: Appointment, userId?: string): Appointment {
  const agendamentos = readStoredAppointments(userId);
  const nextAgendamento = {
    ...agendamento,
    createdAt: agendamento.createdAt ?? getCurrentTimestamp(),
  };

  const index = agendamentos.findIndex((storedAppointment) => storedAppointment.id === nextAgendamento.id);
  const isNew = index === -1;

  if (isNew) {
    agendamentos.push(nextAgendamento);
  } else {
    agendamentos[index] = nextAgendamento;
  }

  writeStoredAppointments(agendamentos, userId);

  if (typeof userId === 'string' && userId.trim()) {
    void (async () => {
      try {
        await bestEffortSyncToBackend(userId, 'upsert', nextAgendamento);
      } catch (err) {
        console.error('[appointmentStorage] sync salvarAgendamento failed:', err);
      }
    })();
  }

  if (isNew) {
    void (async () => {
      try {
        await notificationService.createNotification({
          category: 'appointment',
          type: 'event',
          title: 'Novo agendamento criado',
          message: `Novo agendamento para ${nextAgendamento.patientName} às ${nextAgendamento.time}.`,
          priority: 'high',
          relatedId: nextAgendamento.id,
          relatedType: 'appointment',
          actionUrl: '/agenda',
          icon: 'calendar',
          read: false,
          createdAt: nextAgendamento.createdAt ?? getCurrentTimestamp(),
        });
      } catch (err) {
        console.error('[appointmentStorage] Falha ao criar notificação automática:', err);
      }
    })();
  }

  return nextAgendamento;
}

export function atualizarAgendamento(
  appointmentId: string,
  updates: Partial<Appointment>,
  userId?: string,
): Appointment | null {
  const agendamentos = readStoredAppointments(userId);
  const index = agendamentos.findIndex((appointment) => appointment.id === appointmentId);

  if (index === -1) {
    return null;
  }

  const updatedAppointment: Appointment = {
    ...agendamentos[index],
    ...updates,
    duration: typeof updates.duration === 'number' && Number.isFinite(updates.duration)
      ? updates.duration
      : agendamentos[index].duration,
    value: typeof updates.value === 'number' && Number.isFinite(updates.value)
      ? updates.value
      : agendamentos[index].value,
    status: updates.status ? normalizeAppointmentStatus(updates.status) : agendamentos[index].status,
    notes: typeof updates.notes === 'string' ? updates.notes : agendamentos[index].notes,
    createdAt: updates.createdAt ?? agendamentos[index].createdAt,
  };

  agendamentos[index] = updatedAppointment;
  writeStoredAppointments(agendamentos, userId);

  if (typeof userId === 'string' && userId.trim()) {
    void (async () => {
      try {
        await bestEffortSyncToBackend(userId, 'upsert', updatedAppointment);
      } catch (err) {
        console.error('[appointmentStorage] sync atualizarAgendamento failed:', err);
      }
    })();
  }

  return updatedAppointment;
}

export function removerAgendamento(appointmentId: string, userId?: string): boolean {
  const agendamentos = readStoredAppointments(userId);
  const nextAppointments = agendamentos.filter((appointment) => appointment.id !== appointmentId);

  if (nextAppointments.length === agendamentos.length) {
    return false;
  }

  writeStoredAppointments(nextAppointments, userId);

  if (typeof userId === 'string' && userId.trim()) {
    const removed = agendamentos.find((a) => a.id === appointmentId);
    if (removed) {
      void (async () => {
        try {
          await bestEffortSyncToBackend(userId, 'delete', removed);
        } catch (err) {
          console.error('[appointmentStorage] sync removerAgendamento failed:', err);
        }
      })();
    }
  }

  return true;
}

export function criarAgendamentoLocal(
  payload: AppointmentInput,
  overrides: { id?: string; createdAt?: string } = {},
): Appointment {
  return buildAppointment(payload, overrides);
}
