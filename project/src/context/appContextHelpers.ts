import type {
  Anamnesis,
  AppNotification,
  Appointment,
  Campaign,
  Expense,
  Income,
  Message,
  Patient,
  Prescription,
  ProcedurePhoto,
} from '../types';
import type {
  AdminClinic,
  AdminData,
  AdminIntegrationSettings,
  AdminLogin,
  AdminPlan,
} from '../lib/adminStore';

export type AnyRecord = Record<string, unknown>;

export type AuthResult = {
  ok: boolean;
  error?: string;
};

export type SignUpResult = AuthResult & {
  needsConfirmation?: boolean;
};

export type RecordsState = {
  patients: Patient[];
  appointments: Appointment[];
  prescriptions: Prescription[];
  procedurePhotos: ProcedurePhoto[];
  messages: Message[];
  campaigns: Campaign[];
  notifications: AppNotification[];
  anamneses: Anamnesis[];
  incomes: Income[];
  expenses: Expense[];
};

export const tableNames = [
  'patients',
  'appointments',
  'prescriptions',
  'procedurePhotos',
  'messages',
  'campaigns',
  'notifications',
  'anamneses',
  'incomes',
  'expenses',
] as const;

export type TableKey = (typeof tableNames)[number];

export type DatabaseTableName =
  | 'patients'
  | 'appointments'
  | 'prescriptions'
  | 'procedure_photos'
  | 'messages'
  | 'campaigns'
  | 'notifications'
  | 'anamneses'
  | 'incomes'
  | 'expenses';

export type AdminStateRow = {
  data: unknown;
  updated_at?: string;
};

export const tableToDatabaseTable: Record<TableKey, DatabaseTableName> = {
  patients: 'patients',
  appointments: 'appointments',
  prescriptions: 'prescriptions',
  procedurePhotos: 'procedure_photos',
  messages: 'messages',
  campaigns: 'campaigns',
  notifications: 'notifications',
  anamneses: 'anamneses',
  incomes: 'incomes',
  expenses: 'expenses',
};

export type AdminSession = {
  email: string;
  role: 'admin';
  source: 'local' | 'supabase';
  accessToken?: string;
  refreshToken?: string;
};

export const SESSION_RESET_STORAGE_PREFIX = 'clinic-organizer-pro-session-reset:';

export const getSessionResetKey = (userId: string) => `${SESSION_RESET_STORAGE_PREFIX}${userId}`;

export const clearSessionReset = (userId: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(getSessionResetKey(userId));
};

export const findLocalAdminLogin = (email: string, password: string, logins: AdminLogin[]) => {
  const normalizedEmail = email.trim().toLowerCase();
  return logins.find((login) => login.email.trim().toLowerCase() === normalizedEmail && login.password === password) ?? null;
};

export const createEmptyRecords = (): RecordsState => ({
  patients: [],
  appointments: [],
  prescriptions: [],
  procedurePhotos: [],
  messages: [],
  campaigns: [],
  notifications: [],
  anamneses: [],
  incomes: [],
  expenses: [],
});

export const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return Object.prototype.toString.call(value) === '[object Object]';
};

export const normalizeAdminData = (value: unknown, createDefaultAdminData: () => AdminData): AdminData => {
  const defaults = createDefaultAdminData();

  if (!isPlainObject(value)) {
    return defaults;
  }

  const candidate = value as Partial<AdminData>;

  return {
    ...defaults,
    ...candidate,
    plans: Array.isArray(candidate.plans) ? (candidate.plans as AdminPlan[]) : defaults.plans,
    clinics: Array.isArray(candidate.clinics) ? (candidate.clinics as AdminClinic[]) : defaults.clinics,
    logins: Array.isArray(candidate.logins) ? (candidate.logins as AdminLogin[]) : defaults.logins,
    integrationsByUser: isPlainObject(candidate.integrationsByUser)
      ? (candidate.integrationsByUser as Record<string, AdminIntegrationSettings>)
      : defaults.integrationsByUser,
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : defaults.updatedAt,
  };
};

export const camelToSnake = (value: string) => {
  return value.replace(/([A-Z])/g, '_$1').toLowerCase();
};

export const snakeToCamel = (value: string) => {
  return value.replace(/_([a-z0-9])/g, (_match, group: string) => group.toUpperCase());
};

export const transformKeys = (value: unknown, keyTransform: (key: string) => string): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => transformKeys(item, keyTransform));
  }

  if (isPlainObject(value)) {
    return Object.entries(value).reduce<Record<string, unknown>>((accumulator, [key, entry]) => {
      accumulator[keyTransform(key)] = transformKeys(entry, keyTransform);
      return accumulator;
    }, {});
  }

  return value;
};

export const removeKeys = (record: AnyRecord, keys: string[]) => {
  const nextRecord = { ...record };

  keys.forEach((key) => {
    delete nextRecord[key];
  });

  return nextRecord;
};

const PATIENT_PLACEHOLDER_PREFIX = '__clinic_patient_placeholder__';

export const createPatientPlaceholder = (kind: 'email' | 'phone', userId: string) => {
  const randomSuffix = Math.random().toString(36).slice(2, 10);
  return `${PATIENT_PLACEHOLDER_PREFIX}${kind}__${userId}__${Date.now()}__${randomSuffix}${
    kind === 'email' ? '@local.invalid' : ''
  }`;
};

export const isPatientPlaceholder = (value: unknown) => {
  return typeof value === 'string' && value.startsWith(PATIENT_PLACEHOLDER_PREFIX);
};

export const readPatientString = (value: unknown) => {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();

  if (!trimmed || isPatientPlaceholder(trimmed)) {
    return '';
  }

  return trimmed;
};

export const readPatientNumber = (value: unknown, fallback = 0) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const getCurrentTimestamp = () => new Date().toISOString();

export const normalizeProcedures = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : String(entry ?? '').trim()))
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
};

export const normalizePatientStatus = (value: unknown): Patient['status'] => {
  if (value === 'inactive' || value === 'pending') {
    return value;
  }

  return 'active';
};

export const createLocalPatientRecord = (
  payload: AnyRecord,
  overrides: { id?: string; createdAt?: string } = {},
): Patient => {
  const transformed = transformKeys(payload, camelToSnake) as AnyRecord;
  const id =
    overrides.id ??
    (typeof transformed.id === 'string' && transformed.id.trim() ? transformed.id : `patient_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`);
  const createdAt =
    overrides.createdAt ??
    (typeof transformed.created_at === 'string'
      ? transformed.created_at
      : typeof transformed.createdAt === 'string'
        ? transformed.createdAt
        : getCurrentTimestamp());

  return {
    id,
    name: String(transformed.name ?? '').trim(),
    email: readPatientString(transformed.email),
    phone: readPatientString(transformed.phone),
    whatsapp: readPatientString(transformed.whatsapp) || undefined,
    profilePhoto: readPatientString(transformed.profile_photo ?? transformed.profilePhoto) || undefined,
    birthDate: readPatientString(transformed.birth_date ?? transformed.birthDate),
    cpf: readPatientString(transformed.cpf),
    sex: typeof transformed.sex === 'string' ? transformed.sex.trim() : '',
    address: readPatientString(transformed.address),
    zipCode: readPatientString(transformed.zip_code ?? transformed.zipCode) || undefined,
    street: readPatientString(transformed.street) || undefined,
    number: readPatientString(transformed.number) || undefined,
    complement: readPatientString(transformed.complement) || undefined,
    neighborhood: readPatientString(transformed.neighborhood) || undefined,
    city: readPatientString(transformed.city) || undefined,
    state: readPatientString(transformed.state) || undefined,
    emergencyContact: readPatientString(transformed.emergency_contact ?? transformed.emergencyContact) || undefined,
    emergencyRelation: readPatientString(transformed.emergency_relation ?? transformed.emergencyRelation) || undefined,
    emergencyPhone: readPatientString(transformed.emergency_phone ?? transformed.emergencyPhone) || undefined,
    allergies: readPatientString(transformed.allergies) || undefined,
    currentMedications: readPatientString(transformed.current_medications ?? transformed.currentMedications) || undefined,
    medicalHistory: readPatientString(transformed.medical_history ?? transformed.medicalHistory) || undefined,
    observations: readPatientString(transformed.notes ?? transformed.observations),
    lastVisit: readPatientString(transformed.last_visit ?? transformed.lastVisit),
    nextAppointment: readPatientString(transformed.next_appointment ?? transformed.nextAppointment) || undefined,
    status: normalizePatientStatus(transformed.status),
    totalSpent: readPatientNumber(transformed.total_spent ?? transformed.totalSpent),
    procedures: normalizeProcedures(transformed.procedures),
    createdAt,
  };
};

export const resolveTableName = (table: string): TableKey | null => {
  if (table === 'procedure_photos') {
    return 'procedurePhotos';
  }

  if (tableNames.includes(table as TableKey)) {
    return table as TableKey;
  }

  return null;
};

export const getDatabaseTableName = (table: TableKey): DatabaseTableName => {
  return tableToDatabaseTable[table];
};

export const mapRecordForState = (table: TableKey, record: AnyRecord): AnyRecord => {
  const transformed = transformKeys(record, snakeToCamel) as AnyRecord;
  const sanitized = removeKeys(transformed, [
    'userId',
    'user_id',
    'clinicId',
    'clinic_id',
    'updatedAt',
    'updated_at',
  ]);

  if (table === 'notifications') {
    const nextRecord = { ...sanitized };

    if (!nextRecord.time && typeof nextRecord.createdAt === 'string') {
      nextRecord.time = nextRecord.createdAt;
    }

    delete nextRecord.createdAt;
    delete nextRecord.created_at;

    return nextRecord;
  }

  return sanitized;
};

export const prepareRecordForDatabase = (table: TableKey, payload: AnyRecord, userId: string) => {
  const transformed = transformKeys(payload, camelToSnake) as AnyRecord;

  if (table === 'patients') {
    const record: AnyRecord = {
      name: readPatientString(transformed.name) || String(transformed.name ?? '').trim(),
      email: readPatientString(transformed.email) || createPatientPlaceholder('email', userId),
      phone: readPatientString(transformed.phone) || createPatientPlaceholder('phone', userId),
      status: normalizePatientStatus(transformed.status),
      total_spent: readPatientNumber(transformed.total_spent ?? transformed.totalSpent),
      user_id: userId,
    };

    const birthDate = readPatientString(transformed.birth_date ?? transformed.birthDate);
    if (birthDate) {
      record.birth_date = birthDate;
    }

    const lastVisit = readPatientString(transformed.last_visit ?? transformed.lastVisit);
    if (lastVisit) {
      record.last_visit = lastVisit;
    }

    const notes = readPatientString(transformed.notes ?? transformed.observations);
    if (notes) {
      record.notes = notes;
    }

    return record;
  }

  const sanitized = removeKeys(transformed, [
    'id',
    'createdAt',
    'created_at',
    'updatedAt',
    'updated_at',
    'userId',
    'user_id',
    'clinicId',
    'clinic_id',
  ]);

  if (table === 'notifications') {
    delete sanitized.time;
  }

  sanitized.user_id = userId;

  if (table === 'incomes' || table === 'expenses') {
    sanitized.clinic_id = userId;
  }

  return sanitized;
};
