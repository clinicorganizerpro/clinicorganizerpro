import type { Patient } from '../types';
import { localApiCreate, localApiDelete, localApiUpdate } from './localApiClient';

const RELATION = 'patients';
const DEFAULT_USER_ID_FALLBACK = '';

type PatientDbRow = Patient & { user_id?: string };

const normalizePatient = (value: PatientDbRow): Patient => {
  // As structs do backend local vão trazer campos extras (ex.: user_id).
  // Aqui mantemos só o que o front precisa tipar.
  return {
    id: value.id,
    name: value.name,
    email: value.email,
    phone: value.phone,
    whatsapp: value.whatsapp,
    profilePhoto: value.profilePhoto,
    birthDate: value.birthDate,
    cpf: value.cpf,
    sex: value.sex,
    address: value.address,
    zipCode: value.zipCode,
    street: value.street,
    number: value.number,
    complement: value.complement,
    neighborhood: value.neighborhood,
    city: value.city,
    state: value.state,
    emergencyContact: value.emergencyContact,
    emergencyRelation: value.emergencyRelation,
    emergencyPhone: value.emergencyPhone,
    allergies: value.allergies,
    currentMedications: value.currentMedications,
    medicalHistory: value.medicalHistory,
    observations: value.observations,
    lastVisit: value.lastVisit,
    nextAppointment: value.nextAppointment,
    status: value.status,
    totalSpent: value.totalSpent,
    procedures: value.procedures,
    createdAt: value.createdAt ?? new Date().toISOString(),
  };
};

const PATIENTS_STORAGE_KEY = 'patients';

const getPatientsStorageKey = (userId?: string) => {
  const uid = userId ?? DEFAULT_USER_ID_FALLBACK;
  return uid ? `${PATIENTS_STORAGE_KEY}:${uid}` : PATIENTS_STORAGE_KEY;
};

const readStoredPatients = (userId?: string): Patient[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(getPatientsStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) return [];

    // já está no formato Patient (sem id extra user_id), então só valida campos básicos
    return parsed.filter((v): v is Patient => {
      return (
        v &&
        typeof v === 'object' &&
        typeof (v as Patient).id === 'string' &&
        typeof (v as Patient).name === 'string'
      );
    });
  } catch {
    return [];
  }
};

const writeStoredPatients = (patients: Patient[], userId?: string) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getPatientsStorageKey(userId), JSON.stringify(patients));
};

export function carregarPacientes(userId?: string): Patient[] {
  return readStoredPatients(userId);
}

export async function salvarPaciente(paciente: Patient, userId?: string): Promise<Patient> {
  const payload: Omit<PatientDbRow, 'id'> & Partial<Pick<PatientDbRow, 'id'>> = {
    ...(paciente as PatientDbRow),
    user_id: userId ?? DEFAULT_USER_ID_FALLBACK,
  };

  let normalized: Patient;
  try {
    const created = await localApiCreate<PatientDbRow>(RELATION, {
      ...(payload as unknown as Omit<PatientDbRow, 'id'>),
    });
    normalized = normalizePatient(created);
  } catch {
    // Fallback: persiste ao menos no cache local quando a API local estiver indisponível.
    normalized = normalizePatient(payload as PatientDbRow);
  }

  // sincroniza cache local (localStorage) para o App refletir imediatamente
  const prev = readStoredPatients(userId);
  const next = [...prev.filter((p) => p.id !== normalized.id), normalized];
  writeStoredPatients(next, userId);

  return normalized;
}

export async function atualizarPaciente(
  patientId: string,
  updates: Partial<Patient>,
  userId?: string,
): Promise<Patient | null> {
  const uid = userId ?? DEFAULT_USER_ID_FALLBACK;

  // Mantém assinatura compat, mas agora é async.
  // Se não existir no backend, o localApiUpdate vai lançar erro.
  let normalized: Patient;
  try {
    const updated = await localApiUpdate<PatientDbRow>(
      RELATION,
      patientId,
      {
        ...(updates as PatientDbRow),
        user_id: uid,
      } as unknown as Omit<PatientDbRow, 'id'>,
    );
    normalized = normalizePatient(updated);
  } catch {
    const prev = readStoredPatients(userId);
    const current = prev.find((p) => p.id === patientId);
    if (!current) {
      return null;
    }
    normalized = normalizePatient({
      ...(current as PatientDbRow),
      ...(updates as PatientDbRow),
      id: patientId,
      user_id: uid,
    });
  }

  // sincroniza cache local (localStorage)
  const prev = readStoredPatients(userId);
  const index = prev.findIndex((p) => p.id === normalized.id);
  if (index === -1) {
    // se não existia em cache, adiciona pra não perder a atualização
    writeStoredPatients([...prev, normalized], userId);
  } else {
    const next = [...prev];
    next[index] = normalized;
    writeStoredPatients(next, userId);
  }

  return normalized;
}

export async function removerPaciente(patientId: string, userId?: string): Promise<boolean> {
  const uid = userId ?? DEFAULT_USER_ID_FALLBACK;
  void uid;

  try {
    await localApiDelete(RELATION, patientId);
  } catch {
    // Fallback: remove localmente mesmo sem API local.
  }

  // sincroniza cache local (localStorage)
  const prev = readStoredPatients(userId);
  const next = prev.filter((p) => p.id !== patientId);
  writeStoredPatients(next, userId);

  return true;
}

/**
 * Mantém as exports anteriores que o AppContext espera.
 * Para persistência em arquivo, o caminho crítico é salvarPaciente/atualizarPaciente/removerPaciente.
 */
export function salvarPacientes(pacientes: Patient[], userId?: string): Patient[] {
  // Usa também como cache local quando o AppContext faz fallback/merge.
  writeStoredPatients(pacientes, userId);
  return pacientes;
}
