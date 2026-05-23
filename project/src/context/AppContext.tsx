import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '../types/supabase';
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
  Toast,
} from '../types';
import {
  type AdminClinic,
  type AdminData,
  type AdminIntegrationSettings,
  type AdminLogin,
  type AdminPlan,
  type AdminProfessional,
  type ClinicProfile,
  type ClinicOperationalSecuritySettings,
  type CreateClinicInput,
  type CreateLoginInput,
  type CreatePlanInput,
  type CreateProfessionalInput,
  ADMIN_LOGIN_EMAIL,
  addClinic,
  addLogin,
  addPlan,
  addProfessional as addStoredProfessional,
  deleteClinic,
  deleteLogin,
  deleteProfessional as deleteStoredProfessional,
  getIntegrationSettings,
  loadAdminData,
  persistAdminData,
  createDefaultAdminData,
  updateClinic,
  updateClinicProfile as updateStoredClinicProfile,
  updateIntegrationSettings as updateStoredIntegrationSettings,
  updateLogin,
  updateOperationalSettings,
  updatePlan,
  updateProfessional as updateStoredProfessional,
} from '../lib/adminStore';
import {
  carregarPacientes,
  salvarPaciente,
  atualizarPaciente,
  removerPaciente,
} from '../lib/patientStorage';
import {
  carregarAgendamentos,
  criarAgendamentoLocal,
  salvarAgendamento,
  atualizarAgendamento,
  removerAgendamento,
} from '../lib/appointmentStorage';
import {
  carregarReceitas,
  carregarDespesas,
  criarReceitaLocal,
  criarDespesaLocal,
  salvarReceita,
  salvarDespesa,
  atualizarReceita,
  atualizarDespesa,
  removerReceita,
  removerDespesa,
} from '../lib/financialStorage';
import {
  carregarReceitasClinicas,
  carregarFotosProcedimento,
  carregarAnamnesesClinicas,
  criarReceitaClinicaLocal,
  criarFotoProcedimentoLocal,
  criarAnamneseClinicaLocal,
  salvarReceitaClinica,
  salvarFotoProcedimento,
  salvarAnamneseClinica,
  removerReceitaClinica,
  removerFotoProcedimento,
  removerAnamneseClinica,
} from '../lib/patientClinicalStorage';
import { HAS_SUPABASE_CONFIG } from '../config/supabase';
import { getCurrentSession, supabase } from '../lib/supabase';
import { localApiCreate, localApiDelete, localApiList, localApiUpdate } from '../lib/localApiClient';
import { apiRequest } from '../lib/api';
import { getCurrentClinicId as getSupabaseClinicId } from '../services/supabaseCrudService';
import {
  deleteBackendAuthUser,
  fetchBackendMe,
  loginWithBackend,
  logoutBackend,
  registerBackendUser,
  type SignupInput,
  upsertBackendAuthUser,
} from '../lib/authApiClient';

type AnyRecord = Record<string, unknown>;

type AuthResult = {
  ok: boolean;
  error?: string;
};

type SignUpResult = AuthResult & {
  needsConfirmation?: boolean;
};

type RecordsState = {
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

const tableNames = [
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

type TableKey = (typeof tableNames)[number];

type DatabaseTableName =
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

type AdminStateRow = {
  data: unknown;
  updated_at?: string;
};

const tableToDatabaseTable: Record<TableKey, DatabaseTableName> = {
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

type AdminSession = {
  email: string;
  role: 'admin';
  source: 'local' | 'supabase';
  accessToken?: string;
   refreshToken?: string;
};


const SESSION_RESET_STORAGE_PREFIX = 'clinic-organizer-pro-session-reset:';

const getSessionResetKey = (userId: string) => `${SESSION_RESET_STORAGE_PREFIX}${userId}`;

const clearSessionReset = (userId: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(getSessionResetKey(userId));
};

const normalizeAuthEmail = (email: string) => email.trim().toLowerCase();

const findAdminLoginMetadata = (email: string, logins: AdminLogin[]) => {
  const normalizedEmail = email.trim().toLowerCase();

  return logins.find((login) => login.email.trim().toLowerCase() === normalizedEmail) ?? null;
};

export type AppContextType = RecordsState & {
  toasts: Toast[];
  showToast: (message: string, type?: Toast['type']) => void;
  procedure_photos?: ProcedurePhoto[];
  session: Session | null;
  user: User | null;
  authAccessToken: string | null;
  adminSession: AdminSession | null;
  adminData: AdminData;
  clinicProfile: ClinicProfile;
  currentClinic: AdminClinic | null;
  currentPlan: AdminPlan | null;
  professionals: AdminProfessional[];
  refreshAdminData: () => void;
  integrationSettings: AdminIntegrationSettings | null;
  updateIntegrationSettings: (
    updates: Partial<Omit<AdminIntegrationSettings, 'updatedAt'>>,
  ) => void;
  updateClinicProfile: (updates: Partial<ClinicProfile>) => void;
  updateAdminPlan: (
    planId: string,
    updates: Partial<Pick<AdminPlan, 'name' | 'monthlyPrice' | 'description' | 'features' | 'active'>>,
  ) => void;
  addAdminPlan: (input: CreatePlanInput) => void;
  updateAdminClinic: (
    clinicId: string,
    updates: Partial<
      Pick<AdminClinic, 'name' | 'email' | 'phone' | 'city' | 'planId' | 'status' | 'notes' | 'accessPassword'>
    >,
  ) => Promise<void>;
  addAdminClinic: (input: CreateClinicInput) => Promise<void>;
  deleteAdminClinic: (clinicId: string) => Promise<void>;
  updateAdminLogin: (
    loginId: string,
    updates: Partial<
      Pick<
        AdminLogin,
        'name' | 'email' | 'password' | 'clinicId' | 'planId' | 'role' | 'status' | 'protected' | 'lastAccess'
      >
    >,
  ) => Promise<void>;
  addAdminLogin: (input: CreateLoginInput) => Promise<void>;
  deleteAdminLogin: (loginId: string) => Promise<void>;
  addProfessional: (input: CreateProfessionalInput) => void;
  updateProfessional: (professionalId: string, updates: Partial<CreateProfessionalInput>) => void;
  deleteProfessional: (professionalId: string) => void;
  authReady: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (input: SignupInput) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  theme: 'light' | 'dark';
  t: (key: string, fallback?: string) => string;
  toggleTheme: () => void;
  currentPageTitle: string;
  activePageTitle: string;
  pageTitle: string;
  currentPageName: string;
  setCurrentPageTitle: (title: string) => void;
  setActivePageTitle: (title: string) => void;
  setPageTitle: (title: string) => void;
  setCurrentPageName: (name: string) => void;
  navigate: (page: string) => void;
  setPage: (page: string) => void;
  addPatient: (patient: AnyRecord) => Promise<AnyRecord | null>;
  createPatient: (patient: AnyRecord) => Promise<AnyRecord | null>;
  updatePatient: (id: string, patient: AnyRecord) => Promise<AnyRecord | null>;
  deletePatient: (id: string) => Promise<boolean>;
  addAppointment: (appointment: AnyRecord) => Promise<AnyRecord | null>;
  createAppointment: (appointment: AnyRecord) => Promise<AnyRecord | null>;
  updateAppointment: (id: string, appointment: AnyRecord) => Promise<AnyRecord | null>;
  deleteAppointment: (id: string) => Promise<boolean>;
  addPrescription: (prescription: AnyRecord) => Promise<AnyRecord | null>;
  createPrescription: (prescription: AnyRecord) => Promise<AnyRecord | null>;
  updatePrescription: (id: string, prescription: AnyRecord) => Promise<AnyRecord | null>;
  deletePrescription: (id: string) => Promise<boolean>;
  addProcedurePhoto: (procedurePhoto: AnyRecord) => Promise<AnyRecord | null>;
  createProcedurePhoto: (procedurePhoto: AnyRecord) => Promise<AnyRecord | null>;
  updateProcedurePhoto: (id: string, procedurePhoto: AnyRecord) => Promise<AnyRecord | null>;
  deleteProcedurePhoto: (id: string) => Promise<boolean>;
  addMessage: (message: AnyRecord) => Promise<AnyRecord | null>;
  createMessage: (message: AnyRecord) => Promise<AnyRecord | null>;
  updateMessage: (id: string, message: AnyRecord) => Promise<AnyRecord | null>;
  deleteMessage: (id: string) => Promise<boolean>;
  addCampaign: (campaign: AnyRecord) => Promise<AnyRecord | null>;
  createCampaign: (campaign: AnyRecord) => Promise<AnyRecord | null>;
  updateCampaign: (id: string, campaign: AnyRecord) => Promise<AnyRecord | null>;
  deleteCampaign: (id: string) => Promise<boolean>;
  addNotification: (notification: AnyRecord) => Promise<AnyRecord | null>;
  createNotification: (notification: AnyRecord) => Promise<AnyRecord | null>;
  updateNotification: (id: string, notification: AnyRecord) => Promise<AnyRecord | null>;
  deleteNotification: (id: string) => Promise<boolean>;
  addAnamnesis: (anamnesis: AnyRecord) => Promise<AnyRecord | null>;
  createAnamnesis: (anamnesis: AnyRecord) => Promise<AnyRecord | null>;
  updateAnamnesis: (id: string, anamnesis: AnyRecord) => Promise<AnyRecord | null>;
  deleteAnamnesis: (id: string) => Promise<boolean>;
  addIncome: (income: AnyRecord) => Promise<AnyRecord | null>;
  createIncome: (income: AnyRecord) => Promise<AnyRecord | null>;
  updateIncome: (id: string, income: AnyRecord) => Promise<AnyRecord | null>;
  deleteIncome: (id: string) => Promise<boolean>;
  addExpense: (expense: AnyRecord) => Promise<AnyRecord | null>;
  createExpense: (expense: AnyRecord) => Promise<AnyRecord | null>;
  updateExpense: (id: string, expense: AnyRecord) => Promise<AnyRecord | null>;
  deleteExpense: (id: string) => Promise<boolean>;
  createRecord: (table: string, payload: AnyRecord) => Promise<AnyRecord | null>;
  updateRecord: (table: string, id: string, payload: AnyRecord) => Promise<AnyRecord | null>;
  deleteRecord: (table: string, id: string) => Promise<boolean>;
  refreshAllRecords: () => Promise<RecordsState>;
  updateOperationalSecuritySettings: (updates: Partial<ClinicOperationalSecuritySettings>) => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<AuthResult>;
  [key: string]: unknown;
};

export const AppContext = createContext<AppContextType | undefined>(undefined);

function getStoredTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const storedTheme = window.localStorage.getItem('theme');
  return storedTheme === 'dark' ? 'dark' : 'light';
}

const createEmptyRecords = (): RecordsState => ({
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

const initialRecords = createEmptyRecords();

const normalizeAdminData = (value: unknown): AdminData => {
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

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return Object.prototype.toString.call(value) === '[object Object]';
};

const camelToSnake = (value: string) => {
  return value.replace(/([A-Z])/g, '_$1').toLowerCase();
};

const snakeToCamel = (value: string) => {
  return value.replace(/_([a-z0-9])/g, (_match, group: string) => group.toUpperCase());
};

const transformKeys = (value: unknown, keyTransform: (key: string) => string): unknown => {
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

const removeKeys = (record: AnyRecord, keys: string[]) => {
  const nextRecord = { ...record };

  keys.forEach((key) => {
    delete nextRecord[key];
  });

  return nextRecord;
};

const PATIENT_PLACEHOLDER_PREFIX = '__clinic_patient_placeholder__';

const createPatientPlaceholder = (kind: 'email' | 'phone', userId: string) => {
  const randomSuffix = Math.random().toString(36).slice(2, 10);
  return `${PATIENT_PLACEHOLDER_PREFIX}${kind}__${userId}__${Date.now()}__${randomSuffix}${
    kind === 'email' ? '@local.invalid' : ''
  }`;
};

const isPatientPlaceholder = (value: unknown) => {
  return typeof value === 'string' && value.startsWith(PATIENT_PLACEHOLDER_PREFIX);
};

const readPatientString = (value: unknown) => {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();

  if (!trimmed || isPatientPlaceholder(trimmed)) {
    return '';
  }

  return trimmed;
};

const readPatientNumber = (value: unknown, fallback = 0) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getCurrentTimestamp = () => new Date().toISOString();

const normalizeProcedures = (value: unknown): string[] => {
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

const normalizePatientStatus = (value: unknown): Patient['status'] => {
  if (value === 'inactive' || value === 'pending') {
    return value;
  }

  return 'active';
};

const createLocalPatientRecord = (
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

const resolveTableName = (table: string): TableKey | null => {
  if (table === 'procedure_photos') {
    return 'procedurePhotos';
  }

  if (tableNames.includes(table as TableKey)) {
    return table as TableKey;
  }

  return null;
};

const getDatabaseTableName = (table: TableKey): DatabaseTableName => {
  return tableToDatabaseTable[table];
};

const mapRecordForState = (table: TableKey, record: AnyRecord): AnyRecord => {
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

const prepareRecordForDatabase = (table: TableKey, payload: AnyRecord, userId: string, clinicId: string) => {
  const transformed = transformKeys(payload, camelToSnake) as AnyRecord;

  if (table === 'patients') {
    const record: AnyRecord = {
      name: readPatientString(transformed.name) || String(transformed.name ?? '').trim(),
      email: readPatientString(transformed.email) || createPatientPlaceholder('email', userId),
      phone: readPatientString(transformed.phone) || createPatientPlaceholder('phone', userId),
      status: normalizePatientStatus(transformed.status),
      total_spent: readPatientNumber(transformed.total_spent ?? transformed.totalSpent),
      user_id: userId,
      clinic_id: clinicId,
      created_by: userId,
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

  if (table === 'anamneses') {
    [
      'vital_signs',
      'facial_assessment',
      'esthetic_procedures',
      'procedure_details',
      'aesthetic_photos_before',
      'aesthetic_photos_after',
    ].forEach((key) => {
      if (key in sanitized && typeof sanitized[key] === 'string') {
        try {
          sanitized[key] = JSON.parse(sanitized[key] as string) as unknown;
        } catch {
          sanitized[key] = key === 'esthetic_procedures' ? [] : {};
        }
      }
    });
  }

  sanitized.user_id = userId;
  sanitized.clinic_id = clinicId;
  sanitized.created_by = userId;

  return sanitized;
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authAccessToken, setAuthAccessToken] = useState<string | null>(null);
  const [adminSession, setAdminSession] = useState<AdminSession | null>(null);
  const adminSessionRef = useRef<AdminSession | null>(null);
  const [adminData, setAdminData] = useState<AdminData>(() => loadAdminData());
  const [adminStateReady, setAdminStateReady] = useState(false);
  const currentLogin = useMemo(() => {
    const email = user?.email?.trim().toLowerCase();
    const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>;
    const loginId = typeof metadata.loginId === 'string' ? metadata.loginId : '';

    return (
      adminData.logins.find((login) => loginId && login.id === loginId) ??
      adminData.logins.find((login) => email && login.email.trim().toLowerCase() === email) ??
      null
    );
  }, [adminData.logins, user?.email, user?.user_metadata]);
  const currentClinic = useMemo(() => {
    const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>;
    const metadataClinicId = typeof metadata.clinicId === 'string' ? metadata.clinicId : '';
    const candidateIds = [currentLogin?.clinicId, metadataClinicId, user?.id].filter(Boolean);

    return adminData.clinics.find((clinic) => candidateIds.includes(clinic.id)) ?? null;
  }, [adminData.clinics, currentLogin?.clinicId, user?.id, user?.user_metadata]);
  const currentPlan = useMemo(() => {
    const planId = currentClinic?.planId ?? currentLogin?.planId ?? '';
    return adminData.plans.find((plan) => plan.id === planId) ?? null;
  }, [adminData.plans, currentClinic?.planId, currentLogin?.planId]);
  const effectiveClinicProfile = useMemo<ClinicProfile>(() => {
    const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>;
    const backendClinic = isPlainObject(metadata.clinic) ? (metadata.clinic as Record<string, unknown>) : null;

    if (adminSession) {
      return adminData.clinicProfile;
    }

    if (!currentClinic && backendClinic) {
      return {
        ...adminData.clinicProfile,
        clinicName:
          typeof backendClinic.name === 'string' && backendClinic.name.trim()
            ? backendClinic.name.trim()
            : adminData.clinicProfile.clinicName,
        email:
          typeof backendClinic.email === 'string' && backendClinic.email.trim()
            ? backendClinic.email.trim()
            : adminData.clinicProfile.email,
        city:
          typeof backendClinic.city === 'string' && backendClinic.city.trim()
            ? backendClinic.city.trim()
            : adminData.clinicProfile.city,
        phone:
          typeof backendClinic.phone === 'string' && backendClinic.phone.trim()
            ? backendClinic.phone.trim()
            : adminData.clinicProfile.phone,
        cnpj:
          typeof backendClinic.cnpj === 'string' && backendClinic.cnpj.trim()
            ? backendClinic.cnpj.trim()
            : adminData.clinicProfile.cnpj,
        address:
          typeof backendClinic.address === 'string' && backendClinic.address.trim()
            ? backendClinic.address.trim()
            : adminData.clinicProfile.address,
        responsibleName:
          typeof metadata.responsibleName === 'string' && metadata.responsibleName.trim()
            ? metadata.responsibleName.trim()
            : currentLogin?.name || adminData.clinicProfile.responsibleName,
      };
    }

    if (!currentClinic) {
      return adminData.clinicProfile;
    }

    return {
      ...adminData.clinicProfile,
      clinicName: currentClinic.name || adminData.clinicProfile.clinicName,
      email: currentClinic.email || adminData.clinicProfile.email,
      city: currentClinic.city || adminData.clinicProfile.city,
      phone: currentClinic.phone || adminData.clinicProfile.phone,
      responsibleName: currentLogin?.name || adminData.clinicProfile.responsibleName,
    };
  }, [adminData.clinicProfile, adminSession, currentClinic, currentLogin?.name, user?.user_metadata]);
  const integrationSettings = useMemo(
    () => {
      const targetEmail = adminSession?.email ?? user?.email;
      const direct = getIntegrationSettings(adminData, targetEmail);
      const hasDirectSettings = Boolean(targetEmail && adminData.integrationsByUser[targetEmail]);

      if (adminSession || hasDirectSettings) {
        return direct;
      }

      const adminConfigured = adminData.integrationsByUser[ADMIN_LOGIN_EMAIL]
        ? getIntegrationSettings(adminData, ADMIN_LOGIN_EMAIL)
        : null;
      const firstConfiguredEmail = Object.keys(adminData.integrationsByUser)[0];
      return adminConfigured ?? getIntegrationSettings(adminData, firstConfiguredEmail);
    },
    [adminData, adminSession, user?.email],
  );
  const [authReady, setAuthReady] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(getStoredTheme());
  const [currentPageTitle, setCurrentPageTitle] = useState('Clinic Organizer Pro');
  const [activePageTitle, setActivePageTitle] = useState('Clinic Organizer Pro');
  const [pageTitle, setPageTitle] = useState('Clinic Organizer Pro');
  const [currentPageName, setCurrentPageName] = useState('Clinic Organizer Pro');
  const [records, setRecords] = useState<RecordsState>(initialRecords);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const toast: Toast = {
      id: `toast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      message,
      type,
    };

    setToasts((current) => [...current, toast].slice(-5));
  }, []);
  const setEmptyRecords = useCallback(() => {
    setRecords(createEmptyRecords());
  }, []);

  const syncAdminSession = useCallback((nextAdminSession: AdminSession | null) => {
    adminSessionRef.current = nextAdminSession;
    setAdminSession(nextAdminSession);
  }, []);

  const isAdminEmail = useCallback((email: string | null | undefined) => {
    if (!email) return false;

    try {
      const normalized = email.trim().toLowerCase();
      return normalized === ADMIN_LOGIN_EMAIL.toLowerCase();
    } catch {
      return false;
    }
  }, []);

  const requireLocalAdminAccessToken = useCallback(() => {
    const accessToken = adminSessionRef.current?.accessToken;
    if (!accessToken) {
      throw new Error('Sessão admin local sem token JWT. Entre novamente como administrador.');
    }

    return accessToken;
  }, []);

  const syncAdminStateToBackend = useCallback(async (nextAdminData: AdminData) => {
    try {
      const accessToken = requireLocalAdminAccessToken();
      await apiRequest('/api/admin/state', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ data: nextAdminData }),
      });
    } catch (error) {
      console.error('Failed to sync admin state to backend:', error);
    }
  }, [requireLocalAdminAccessToken]);

  const showAdminSavedToast = useCallback(() => {
    showToast('Dados salvos também no admin.', 'success');
  }, [showToast]);

  const toggleTheme = useCallback(() => {
    setTheme((currentTheme) => (currentTheme === 'light' ? 'dark' : 'light'));
  }, []);

  const t = useCallback((key: string, fallback?: string) => {
    return fallback ?? key;
  }, []);

  const navigate = useCallback((page: string) => {
    void page;
    // Intentionally left as a compatibility no-op for the existing shell.
  }, []);

  const fetchTable = useCallback(async (table: TableKey, userId: string) => {
    if (!HAS_SUPABASE_CONFIG) {
      const localPatients = carregarPacientes(userId);
      const localPrescriptions = carregarReceitasClinicas(userId);
      const localProcedurePhotos = carregarFotosProcedimento(userId);
      const localAnamneses = carregarAnamnesesClinicas(userId);
      const localIncomes = carregarReceitas(userId);
      const localExpenses = carregarDespesas(userId);
      const localAppointments = carregarAgendamentos(userId);
      const localRows =
        table === 'patients'
          ? localPatients
          : table === 'appointments'
            ? localAppointments
            : table === 'prescriptions'
              ? localPrescriptions
              : table === 'procedurePhotos'
                ? localProcedurePhotos
                : table === 'anamneses'
                  ? localAnamneses
                  : table === 'incomes'
                    ? localIncomes
                    : table === 'expenses'
                      ? localExpenses
                      : [];

      try {
        if (table === 'patients') {
          const rows = await localApiList<{ id: string } & Record<string, unknown>>('patients', [
            { col: 'user_id', val: userId },
          ]);
          const mappedRows = rows.map((row) => mapRecordForState(table, row));
          return mappedRows as unknown as Patient[];
        }

        if (table === 'incomes') {
          const { listIncomesFromBackend } = await import('../lib/financialStorage');
          const rows = await listIncomesFromBackend(userId);
          return rows;
        }

        if (table === 'expenses') {
          const { listExpensesFromBackend } = await import('../lib/financialStorage');
          const rows = await listExpensesFromBackend(userId);
          return rows;
        }
      } catch {
        // fallback: continua usando localStorage
      }

      return localRows;
    }

    const dbTable = getDatabaseTableName(table);
    const clinicId = await getSupabaseClinicId();
    const { data, error } = await supabase
      .from(dbTable)
      .select('*')
      .eq('clinic_id', clinicId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error || !Array.isArray(data)) {
      if (error) {
        console.error(`Failed to load ${dbTable}:`, error.message);
        showToast(`Falha ao carregar ${dbTable}: ${error.message}`, 'error');
      }

      return [];
    }

    const mappedRows = (data as AnyRecord[]).map((row) => mapRecordForState(table, row));

    if (table === 'patients') {
      const nextPatients = mappedRows as Patient[];
      return nextPatients;
    }

    if (table === 'prescriptions') {
      const nextPrescriptions = mappedRows as Prescription[];
      return nextPrescriptions;
    }

    if (table === 'procedurePhotos') {
      const nextProcedurePhotos = mappedRows as ProcedurePhoto[];
      return nextProcedurePhotos;
    }

    if (table === 'anamneses') {
      const nextAnamneses = mappedRows as Anamnesis[];
      return nextAnamneses;
    }

    if (table === 'incomes') {
      const nextIncomes = mappedRows as Income[];
      return nextIncomes;
    }

    if (table === 'expenses') {
      const nextExpenses = mappedRows as Expense[];
      return nextExpenses;
    }

    return mappedRows;
  }, [showToast]);

  const fetchAllRecords = useCallback(
    async (userId: string): Promise<RecordsState> => {
      const entries = await Promise.all(
        tableNames.map(async (table) => [table, await fetchTable(table, userId)] as const),
      );

      return entries.reduce((accumulator, [table, rows]) => {
        accumulator[table] = rows as never;
        return accumulator;
      }, createEmptyRecords());
    },
    [fetchTable],
  );

  const refreshAllRecords = useCallback(async (): Promise<RecordsState> => {
    if (!user?.id) {
      const emptyRecords = createEmptyRecords();
      setRecords(emptyRecords);
      return emptyRecords;
    }

    const nextRecords = await fetchAllRecords(user.id);
    setRecords(nextRecords);
    return nextRecords;
  }, [fetchAllRecords, user?.id]);

  const loadUserData = useCallback(
    async (userId: string, isCancelled: () => boolean = () => false) => {
      if (isCancelled()) {
        return;
      }

      const nextRecords = await fetchAllRecords(userId);

      if (isCancelled()) {
        return;
      }

      setRecords(nextRecords);
    },
    [fetchAllRecords],
  );

  const createRecord = useCallback(
    async (table: string, payload: AnyRecord): Promise<AnyRecord | null> => {
      if (!user?.id) {
        return null;
      }

      const resolvedTable = resolveTableName(table);

      if (!resolvedTable) {
        return null;
      }

      if (resolvedTable === 'appointments' && !HAS_SUPABASE_CONFIG) {
        const nextAppointment = salvarAgendamento(criarAgendamentoLocal(payload), user.id);
        await refreshAllRecords();
        return nextAppointment;
      }

      if (resolvedTable === 'incomes' && !HAS_SUPABASE_CONFIG) {
        const nextIncome = salvarReceita(criarReceitaLocal(payload), user.id);
        await refreshAllRecords();
        return nextIncome;
      }

      if (resolvedTable === 'expenses' && !HAS_SUPABASE_CONFIG) {
        const nextExpense = salvarDespesa(criarDespesaLocal(payload), user.id);
        await refreshAllRecords();
        return nextExpense;
      }

      if (resolvedTable === 'patients' && !HAS_SUPABASE_CONFIG) {
        const nextPatient = createLocalPatientRecord(payload);
        await salvarPaciente(nextPatient, user.id);
        await refreshAllRecords();
        return nextPatient;
      }

      if (resolvedTable === 'prescriptions' && !HAS_SUPABASE_CONFIG) {
        const nextPrescription = salvarReceitaClinica(criarReceitaClinicaLocal(payload), user.id);
        await refreshAllRecords();
        return nextPrescription;
      }

      if (resolvedTable === 'procedurePhotos' && !HAS_SUPABASE_CONFIG) {
        const nextProcedurePhoto = salvarFotoProcedimento(criarFotoProcedimentoLocal(payload), user.id);
        await refreshAllRecords();
        return nextProcedurePhoto;
      }

      if (resolvedTable === 'anamneses' && !HAS_SUPABASE_CONFIG) {
        const nextAnamnesis = salvarAnamneseClinica(criarAnamneseClinicaLocal(payload), user.id);
        await refreshAllRecords();
        return nextAnamnesis;
      }

      const dbTable = getDatabaseTableName(resolvedTable);
      const clinicId = await getSupabaseClinicId();
      const { data, error } = await supabase
        .from(dbTable)
        .insert([prepareRecordForDatabase(resolvedTable, payload, user.id, clinicId)])
        .select('*')
        .single();

      if (error || !data) {
        if (error) {
          console.error(`Failed to insert into ${dbTable}:`, error.message);
          showToast(`Falha ao salvar em ${dbTable}: ${error.message}`, 'error');
        }

        if (HAS_SUPABASE_CONFIG) {
          try {
            const fallbackPayload = prepareRecordForDatabase(resolvedTable, payload, user.id, user.id);
            const created = await localApiCreate<{ id: string } & AnyRecord>(
              dbTable,
              fallbackPayload as Omit<{ id: string } & AnyRecord, 'id'> & Partial<Pick<{ id: string } & AnyRecord, 'id'>>,
            );
            await refreshAllRecords();
            showToast('Registro salvo no backend.', 'success');
            return mapRecordForState(resolvedTable, created as AnyRecord);
          } catch (fallbackError) {
            console.error(`Failed backend fallback insert into ${dbTable}:`, fallbackError);
            showToast('Não foi possível salvar no backend de produção.', 'error');
            return null;
          }
        }

        const recoveryTable = table;

        if (recoveryTable === 'patients') {
          const nextPatient = createLocalPatientRecord(payload);
          salvarPaciente(nextPatient, user.id);
          await refreshAllRecords();
          return nextPatient;
        }

        if (recoveryTable === 'prescriptions') {
          const nextPrescription = salvarReceitaClinica(criarReceitaClinicaLocal(payload), user.id);
          await refreshAllRecords();
          return nextPrescription;
        }

        if (recoveryTable === 'procedurePhotos') {
          const nextProcedurePhoto = salvarFotoProcedimento(criarFotoProcedimentoLocal(payload), user.id);
          await refreshAllRecords();
          return nextProcedurePhoto;
        }

        if (recoveryTable === 'anamneses') {
          const nextAnamnesis = salvarAnamneseClinica(criarAnamneseClinicaLocal(payload), user.id);
          await refreshAllRecords();
          return nextAnamnesis;
        }

        if (recoveryTable === 'incomes') {
          const nextIncome = salvarReceita(criarReceitaLocal(payload), user.id);
          await refreshAllRecords();
          return nextIncome;
        }

        if (recoveryTable === 'expenses') {
          const nextExpense = salvarDespesa(criarDespesaLocal(payload), user.id);
          await refreshAllRecords();
          return nextExpense;
        }

        return null;
      }

      await refreshAllRecords();
      showToast('Registro salvo no Supabase.', 'success');

      if (resolvedTable === 'patients') {
        const nextPatient = mapRecordForState(resolvedTable, data as AnyRecord) as Patient;
        return nextPatient;
      }

      if (resolvedTable === 'prescriptions') {
        const nextPrescription = mapRecordForState(resolvedTable, data as AnyRecord) as Prescription;
        return nextPrescription;
      }

      if (resolvedTable === 'procedurePhotos') {
        const nextProcedurePhoto = mapRecordForState(resolvedTable, data as AnyRecord) as ProcedurePhoto;
        return nextProcedurePhoto;
      }

      if (resolvedTable === 'anamneses') {
        const nextAnamnesis = mapRecordForState(resolvedTable, data as AnyRecord) as Anamnesis;
        return nextAnamnesis;
      }

      if (resolvedTable === 'incomes') {
        const nextIncome = mapRecordForState(resolvedTable, data as AnyRecord) as Income;
        return nextIncome;
      }

      if (resolvedTable === 'expenses') {
        const nextExpense = mapRecordForState(resolvedTable, data as AnyRecord) as Expense;
        return nextExpense;
      }

      return mapRecordForState(resolvedTable, data as AnyRecord);
    },
    [refreshAllRecords, showToast, user?.id],
  );

  const updateRecord = useCallback(
    async (table: string, id: string, payload: AnyRecord): Promise<AnyRecord | null> => {
      if (!user?.id) {
        return null;
      }

      const resolvedTable = resolveTableName(table);

      if (!resolvedTable) {
        return null;
      }

      if (resolvedTable === 'appointments' && !HAS_SUPABASE_CONFIG) {
        const currentAppointment = carregarAgendamentos(user.id).find((appointment) => appointment.id === id) ?? null;

        if (!currentAppointment) {
          return null;
        }

        const nextAppointment = atualizarAgendamento(
          id,
          criarAgendamentoLocal({ ...payload, id }, { id, createdAt: currentAppointment.createdAt }),
          user.id,
        );

        // Ao concluir uma consulta, registrar a receita no financeiro.
        // Regras:
        // - Somente na transição para "completed" (evitar duplicar se salvar várias vezes)
        // - Ignorar se não houver valor/valor > 0
        const nextStatus = payload.status ?? nextAppointment?.status ?? currentAppointment.status;
        const shouldCreateIncome =
          nextAppointment &&
          nextStatus === 'completed' &&
          currentAppointment.status !== 'completed' &&
          Number.isFinite(nextAppointment.value) &&
          nextAppointment.value > 0;
        const shouldUpdatePatientAfterCompletion =
          nextAppointment &&
          nextStatus === 'completed' &&
          currentAppointment.status !== 'completed';

        if (shouldUpdatePatientAfterCompletion) {
          const storedPatients = carregarPacientes(user.id);
          const currentPatient =
            storedPatients.find((patient) => patient.id === nextAppointment.patientId) ??
            storedPatients.find((patient) => patient.name.trim().toLowerCase() === nextAppointment.patientName.trim().toLowerCase()) ??
            null;

          if (currentPatient) {
            const appointmentValue = Number.isFinite(nextAppointment.value) && nextAppointment.value > 0 ? nextAppointment.value : 0;
            const nextProcedures = nextAppointment.procedure.trim()
              ? Array.from(new Set([...(currentPatient.procedures ?? []), nextAppointment.procedure.trim()]))
              : currentPatient.procedures ?? [];
            const nextPatient = createLocalPatientRecord(
              {
                ...currentPatient,
                totalSpent: (currentPatient.totalSpent ?? 0) + appointmentValue,
                lastVisit: nextAppointment.date || currentPatient.lastVisit,
                procedures: nextProcedures,
              },
              { id: currentPatient.id, createdAt: currentPatient.createdAt },
            );

            await atualizarPaciente(currentPatient.id, nextPatient, user.id);

            if (HAS_SUPABASE_CONFIG) {
              const patientTable = getDatabaseTableName('patients');
              const { error: patientUpdateError } = await supabase
                .from(patientTable)
                .update({
                  total_spent: nextPatient.totalSpent,
                  last_visit: nextPatient.lastVisit,
                })
                .eq('id', currentPatient.id)
                .eq('user_id', user.id);

              if (patientUpdateError) {
                console.error(`Failed to update patient totals:`, patientUpdateError.message);
              }
            }
          }
        }

        if (shouldCreateIncome) {
          const incomePayload: AnyRecord = {
            patientId: nextAppointment.patientId,
            patientName: nextAppointment.patientName,
            service: nextAppointment.procedure,
            paymentMethod: 'pix',
            amount: nextAppointment.value,
            status: 'paid',
            attendanceDate: nextAppointment.date,
            observations: nextAppointment.notes ?? '',
          };

          if (!HAS_SUPABASE_CONFIG) {
            // modo local: grava direto em incomes via financialStorage
            // (createRecord() também faria isso, mas aqui fica explícito e evita dependências).
            void salvarReceita(criarReceitaLocal(incomePayload), user.id);
          } else {
            // modo Supabase: insere na tabela incomes
            const dbTable = getDatabaseTableName('incomes');

            const { data: inserted } = await supabase
              .from(dbTable)
              .insert({
                patient_id: String(nextAppointment.patientId ?? ''),
                patient_name: String(nextAppointment.patientName ?? ''),
                service: String(nextAppointment.procedure ?? ''),
                payment_method: 'pix',
                amount: nextAppointment.value,
                status: 'paid',
                attendance_date: nextAppointment.date,
                observations: nextAppointment.notes ?? '',
                clinic_id: user.id,
              })
              .select('*')
              .maybeSingle();

            if (inserted) {
              // No-op: o refreshAllRecords já vai sincronizar.
            }
          }
        }

        await refreshAllRecords();
        return nextAppointment;
      }

      if (resolvedTable === 'incomes' && !HAS_SUPABASE_CONFIG) {
        const currentIncome = carregarReceitas(user.id).find((income) => income.id === id) ?? null;

        if (!currentIncome) {
          return null;
        }

        const nextIncome = atualizarReceita(
          id,
          criarReceitaLocal({ ...currentIncome, ...payload, id }, { id, createdAt: currentIncome.createdAt }),
          user.id,
        );

        await refreshAllRecords();
        return nextIncome;
      }

      if (resolvedTable === 'expenses' && !HAS_SUPABASE_CONFIG) {
        const currentExpense = carregarDespesas(user.id).find((expense) => expense.id === id) ?? null;

        if (!currentExpense) {
          return null;
        }

        const nextExpense = atualizarDespesa(
          id,
          criarDespesaLocal({ ...currentExpense, ...payload, id }, { id, createdAt: currentExpense.createdAt }),
          user.id,
        );

        await refreshAllRecords();
        return nextExpense;
      }

      if (resolvedTable === 'patients' && !HAS_SUPABASE_CONFIG) {
        const currentPatient = carregarPacientes(user.id).find((patient) => patient.id === id) ?? null;

        if (!currentPatient) {
          return null;
        }

        const nextPatient = atualizarPaciente(
          id,
          createLocalPatientRecord(
            { ...payload, id, createdAt: currentPatient.createdAt ?? currentPatient.createdAt },
            { id, createdAt: currentPatient.createdAt },
          ),
          user.id,
        );

        await refreshAllRecords();
        return nextPatient;
      }

      const dbTable = getDatabaseTableName(resolvedTable);
      const clinicId = await getSupabaseClinicId();
      const { data, error } = await supabase
        .from(dbTable)
        .update(prepareRecordForDatabase(resolvedTable, payload, user.id, clinicId))
        .eq('id', id)
        .eq('clinic_id', clinicId)
        .select('*')
        .single();

      if (error || !data) {
        if (error) {
          console.error(`Failed to update ${dbTable}:`, error.message);
          showToast(`Falha ao atualizar ${dbTable}: ${error.message}`, 'error');
        }

        if (HAS_SUPABASE_CONFIG) {
          try {
            const fallbackPayload = prepareRecordForDatabase(resolvedTable, payload, user.id, user.id);
            const updated = await localApiUpdate<{ id: string } & AnyRecord>(
              dbTable,
              id,
              fallbackPayload as Omit<{ id: string } & AnyRecord, 'id'> & Partial<Pick<{ id: string } & AnyRecord, 'id'>>,
            );
            await refreshAllRecords();
            showToast('Registro atualizado no backend.', 'success');
            return mapRecordForState(resolvedTable, updated as AnyRecord);
          } catch (fallbackError) {
            console.error(`Failed backend fallback update ${dbTable}:`, fallbackError);
            showToast('Não foi possível atualizar no backend de produção.', 'error');
            return null;
          }
        }

        const recoveryTable = table;

        if (recoveryTable === 'patients') {
          const currentPatient = carregarPacientes(user.id).find((patient) => patient.id === id) ?? null;

          if (!currentPatient) {
            return null;
          }

          const nextPatient = atualizarPaciente(
            id,
            createLocalPatientRecord({ ...payload, id }, { id, createdAt: currentPatient.createdAt }),
            user.id,
          );

          await refreshAllRecords();
          return nextPatient;
        }

        if (recoveryTable === 'incomes') {
          const currentIncome = carregarReceitas(user.id).find((income) => income.id === id) ?? null;

          if (!currentIncome) {
            return null;
          }

          const nextIncome = atualizarReceita(
            id,
            criarReceitaLocal({ ...currentIncome, ...payload, id }, { id, createdAt: currentIncome.createdAt }),
            user.id,
          );

          await refreshAllRecords();
          return nextIncome;
        }

        if (recoveryTable === 'expenses') {
          const currentExpense = carregarDespesas(user.id).find((expense) => expense.id === id) ?? null;

          if (!currentExpense) {
            return null;
          }

          const nextExpense = atualizarDespesa(
            id,
            criarDespesaLocal({ ...currentExpense, ...payload, id }, { id, createdAt: currentExpense.createdAt }),
            user.id,
          );

          await refreshAllRecords();
          return nextExpense;
        }

        return null;
      }

      await refreshAllRecords();
      showToast('Registro atualizado no Supabase.', 'success');

      if (resolvedTable === 'patients') {
        const nextPatient = mapRecordForState(resolvedTable, data as AnyRecord) as Patient;
        return nextPatient;
      }

      if (resolvedTable === 'incomes') {
        const nextIncome = mapRecordForState(resolvedTable, data as AnyRecord) as Income;
        return nextIncome;
      }

      if (resolvedTable === 'expenses') {
        const nextExpense = mapRecordForState(resolvedTable, data as AnyRecord) as Expense;
        return nextExpense;
      }

      return mapRecordForState(resolvedTable, data as AnyRecord);
    },
    [refreshAllRecords, showToast, user?.id],
  );

  const deleteRecord = useCallback(
    async (table: string, id: string): Promise<boolean> => {
      if (!user?.id) {
        return false;
      }

      const resolvedTable = resolveTableName(table);

      if (!resolvedTable) {
        return false;
      }

      if (resolvedTable === 'appointments' && !HAS_SUPABASE_CONFIG) {
        const removed = removerAgendamento(id, user.id);
        await refreshAllRecords();
        return removed;
      }

      if (resolvedTable === 'incomes' && !HAS_SUPABASE_CONFIG) {
        const removed = removerReceita(id, user.id);
        await refreshAllRecords();
        return removed;
      }

      if (resolvedTable === 'expenses' && !HAS_SUPABASE_CONFIG) {
        const removed = removerDespesa(id, user.id);
        await refreshAllRecords();
        return removed;
      }

      if (resolvedTable === 'patients' && !HAS_SUPABASE_CONFIG) {
        const removed = removerPaciente(id, user.id);
        await refreshAllRecords();
        return removed;
      }

      if (resolvedTable === 'prescriptions' && !HAS_SUPABASE_CONFIG) {
        const removed = removerReceitaClinica(id, user.id);
        await refreshAllRecords();
        return removed;
      }

      if (resolvedTable === 'procedurePhotos' && !HAS_SUPABASE_CONFIG) {
        const removed = removerFotoProcedimento(id, user.id);
        await refreshAllRecords();
        return removed;
      }

      if (resolvedTable === 'anamneses' && !HAS_SUPABASE_CONFIG) {
        const removed = removerAnamneseClinica(id, user.id);
        await refreshAllRecords();
        return removed;
      }

      const dbTable = getDatabaseTableName(resolvedTable);
      const clinicId = await getSupabaseClinicId();
      const { error } = await supabase
        .from(dbTable)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('clinic_id', clinicId);

      if (error) {
        console.error(`Failed to delete from ${dbTable}:`, error.message);
        showToast(`Falha ao remover ${dbTable}: ${error.message}`, 'error');

        if (HAS_SUPABASE_CONFIG) {
          try {
            await localApiDelete(dbTable, id);
            await refreshAllRecords();
            showToast('Registro removido no backend.', 'success');
            return true;
          } catch (fallbackError) {
            console.error(`Failed backend fallback delete from ${dbTable}:`, fallbackError);
          }
        }

        return false;
      }

      await refreshAllRecords();
      showToast('Registro removido no Supabase.', 'success');

      return true;
    },
    [refreshAllRecords, showToast, user?.id],
  );

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    syncAdminSession(null);
    setAuthAccessToken(null);

    const localLogin = findAdminLoginMetadata(email, adminData.logins);


    const isDefaultLocalAdmin = email.trim().toLowerCase() === ADMIN_LOGIN_EMAIL.trim().toLowerCase();

    if (localLogin || isDefaultLocalAdmin || email.trim()) {
      // Login real no backend local JWT
      const debug = {
        localLoginFound: Boolean(localLogin),
        isDefaultLocalAdmin,
        email,
      };
      console.log('[auth/local] using local JWT', debug);

      try {
        const tokens = await loginWithBackend(email, password);
        const userInfo = await fetchBackendMe(tokens.accessToken);
        const isJwtAdmin = userInfo.role === 'admin';
        let supabaseSession: Session | null = null;
        let supabaseUser: User | null = null;

        if (HAS_SUPABASE_CONFIG) {
          const supabaseResult = await supabase.auth.signInWithPassword({ email, password });

          if (supabaseResult.error || !supabaseResult.data?.session || !supabaseResult.data.user) {
            if (isJwtAdmin) {
              console.warn('[auth/supabase] admin session unavailable, continuing with backend JWT:', supabaseResult.error?.message);
            } else {
              return {
                ok: false,
                error: supabaseResult.error?.message ?? 'Login validado no backend, mas sem sessão Supabase para persistir dados.',
              };
            }
          } else {
            supabaseSession = supabaseResult.data.session as Session;
            supabaseUser = supabaseResult.data.user as User;
          }
        }

        const nextUser: User = {
          ...(supabaseUser ?? {}),
          id: supabaseUser?.id ?? userInfo.id,
          aud: 'authenticated',
          role: 'authenticated',
          email: userInfo.email,
          created_at: supabaseUser?.created_at ?? new Date().toISOString(),
          updated_at: supabaseUser?.updated_at ?? new Date().toISOString(),
          app_metadata: {
            ...(supabaseUser?.app_metadata ?? {}),
            provider: 'jwt',
            providers: ['jwt'],
          },
          user_metadata: {
            ...(supabaseUser?.user_metadata ?? {}),
            source: 'local-api',
            loginId: localLogin?.id ?? userInfo.id,
            clinicId: localLogin?.clinicId ?? userInfo.clinicId,
            planId: localLogin?.planId ?? '',
            role: userInfo.role ?? localLogin?.role ?? 'staff',
            clinic: userInfo.clinic ?? null,
            responsibleName: userInfo.responsibleName ?? '',
          },
        } as User;

        setSession(supabaseSession);
        setUser(nextUser);
        setAuthAccessToken(supabaseSession?.access_token ?? tokens.accessToken);

        if (isJwtAdmin) {
          try {
            window.localStorage.setItem(
              'clinic-organizer-pro-admin-jwt',
              JSON.stringify({
                email: userInfo.email,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                storedAt: Date.now(),
              }),
            );
          } catch {
            // ignore storage errors
          }
        }

        syncAdminSession(
          isJwtAdmin
            ? {
                email: userInfo.email,
                role: 'admin',
                source: 'local',
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
              }
            : null,
        );

        setAuthReady(true);

        if (!isJwtAdmin) {
          await loadUserData(userInfo.id);
        }

        return { ok: true };
      } catch (backendError) {
        const backendMessage = backendError instanceof Error ? backendError.message : '';
        if (!HAS_SUPABASE_CONFIG) {
          return {
            ok: false,
            error:
              backendMessage === 'Email not registered' || backendMessage === 'Invalid credentials'
                ? 'E-mail não cadastrado ou senha inválida. Crie a conta antes de entrar.'
                : backendMessage || 'Backend local indisponível para autenticação.',
          };
        }

        // Backend local não acessível (ex: server local não rodando).
        // Fallback somente quando há Supabase real configurado.
        const supabaseResult = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (supabaseResult.error) {
          return { ok: false, error: supabaseResult.error.message };
        }

        if (supabaseResult.data?.session) {
          const signInUser = supabaseResult.data.user;

          if (!signInUser) {
            return { ok: false, error: 'Falha ao autenticar no Supabase (usuário ausente).' };
          }

          setSession(supabaseResult.data.session);
          setUser(signInUser);
          setAuthAccessToken(supabaseResult.data.session.access_token ?? null);

          if (isAdminEmail(signInUser.email)) {
            syncAdminSession({
              email: signInUser.email ?? ADMIN_LOGIN_EMAIL,
              role: 'admin',
              source: 'supabase',
            });
          } else {
            await loadUserData(signInUser.id);
          }

          setAuthReady(true);
          return { ok: true };
        }

        // Alguns cenários retornam "session ausente" no signIn, mas a sessão pode existir logo depois.
        // Tentamos recuperar e, se ainda falhar, mostramos uma mensagem de validação genérica.
        const sessionResult = await supabase.auth.getSession();
        const recoveredSession = sessionResult.data?.session ?? null;

        if (recoveredSession?.user) {
          setSession(recoveredSession);
          setUser(recoveredSession.user);
          setAuthAccessToken(recoveredSession.access_token ?? null);

          if (isAdminEmail(recoveredSession.user.email)) {
            syncAdminSession({
              email: recoveredSession.user.email ?? ADMIN_LOGIN_EMAIL,
              role: 'admin',
              source: 'supabase',
            });
          } else {
            await loadUserData(recoveredSession.user.id);
          }

          setAuthReady(true);
          return { ok: true };
        }

        if (backendMessage === 'Email not registered' || backendMessage === 'Invalid credentials') {
          return { ok: false, error: 'E-mail não cadastrado ou senha inválida. Crie a conta antes de entrar.' };
        }

        return {
          ok: false,
          error: backendMessage || 'Falha ao autenticar no Supabase (credenciais inválidas ou confirmação pendente).',
        };
      }
    }

    let authData: { session: Session | null; user: User | null } | null = null;
    let authError: { message: string } | null = null;

    try {
      const response = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      authData = response.data;
      authError = response.error;
    } catch (caughtError) {
      authError =
        caughtError instanceof Error
          ? { message: caughtError.message }
          : { message: 'Não foi possível validar suas credenciais no Supabase.' };
    }

    if (authData?.session) {
      setSession(authData.session);
      setUser(authData.session.user);
      setAuthAccessToken(authData.session.access_token ?? null);

      if (isAdminEmail(authData.session.user.email)) {
        syncAdminSession({
          email: authData.session.user.email ?? ADMIN_LOGIN_EMAIL,
          role: 'admin',
          source: 'supabase',
        });
      } else {
        await loadUserData(authData.session.user.id);
      }

      setAuthReady(true);
      return { ok: true };
    }

    if (authError) {
      return { ok: false, error: authError.message };
    }

    return { ok: false, error: 'Credenciais inválidas. Verifique o e-mail e a senha.' };
  }, [adminData.logins, loadUserData, syncAdminSession, isAdminEmail]);

  const signUp = useCallback(async (input: SignupInput): Promise<SignUpResult> => {
    const normalizedEmail = normalizeAuthEmail(input.email);

    try {
      await registerBackendUser({
        name: input.name,
        email: normalizedEmail,
        password: input.password,
        clinicId: input.clinicId,
        clinicName: input.clinicName,
        phone: input.phone,
        cnpj: input.cnpj,
        cep: input.cep,
        address: input.address,
        addressNumber: input.addressNumber,
        city: input.city,
        state: input.state,
      });

      const loginResult = await signIn(normalizedEmail, input.password);
      return loginResult.ok ? { ok: true, needsConfirmation: false } : loginResult;
    } catch (error) {
      if (error instanceof Error && error.message === 'Email already registered') {
        return { ok: false, error: 'Este e-mail já está cadastrado. Entre com a senha criada.' };
      }

      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Backend local indisponível para cadastro.',
      };
    }
  }, [signIn]);

  const signOut = useCallback(async () => {
    const currentUserId = user?.id ?? session?.user?.id ?? null;

    if (currentUserId) {
      clearSessionReset(currentUserId);
    }

    // Logout admin (local JWT ou supabase)
    if (adminSessionRef.current) {
      const currentAdmin = adminSessionRef.current;

      // Se for JWT local do backend, revoga a sessão também
      if (currentAdmin.source === 'local' && currentAdmin.refreshToken) {
        try {
          await logoutBackend(currentAdmin.refreshToken);
        } catch (error) {
          console.error('Failed to logout local JWT session:', error);
        }
      }

      // Limpa restore do admin local (evita entrar automaticamente com sessão antiga em outro navegador)
      try {
        window.localStorage.removeItem('clinic-organizer-pro-admin-jwt');
      } catch {
        // ignore
      }

      syncAdminSession(null);
      setSession(null);
      setUser(null);
      setAuthAccessToken(null);
      setEmptyRecords();

      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.error('Failed to clear active Supabase session during admin sign out:', error);
      }

      return;
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    // Também limpa em qualquer logout (caso admin local tenha sido setado)
    try {
      window.localStorage.removeItem('clinic-organizer-pro-admin-jwt');
    } catch {
      // ignore
    }

    setSession(null);
    setUser(null);
    setAuthAccessToken(null);
    setEmptyRecords();
  }, [session?.user?.id, setEmptyRecords, syncAdminSession, user?.id]);

  const refreshAdminData = useCallback(() => {
    if (adminSessionRef.current?.source === 'local') {
      void (async () => {
        try {
          const accessToken = requireLocalAdminAccessToken();
          const data = await apiRequest<unknown>('/api/admin/state', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (data) {
            const nextAdminData = normalizeAdminData(data);
            setAdminData(nextAdminData);
            persistAdminData(nextAdminData);
            return;
          }
        } catch (error) {
          console.error('Failed to refresh backend admin state:', error);
        }

        const localAdminData = loadAdminData();
        setAdminData(localAdminData);
        void syncAdminStateToBackend(localAdminData);
      })();
      return;
    }

    if (!user?.id || adminSessionRef.current?.source !== 'supabase') {
      setAdminData(loadAdminData());
      return;
    }

    void (async () => {
      const { data, error } = (await supabase
        .from('admin_state')
        .select('data, updated_at')
        .eq('user_id', user.id)
        .maybeSingle()) as {
        data: AdminStateRow | null;
        error: { message: string } | null;
      };

      if (error) {
        console.error('Failed to refresh admin state:', error.message);
        setAdminData(loadAdminData());
        return;
      }

      if (data?.data) {
        const nextAdminData = normalizeAdminData(data.data);
        setAdminData(nextAdminData);
        persistAdminData(nextAdminData);
        return;
      }

      setAdminData(loadAdminData());
    })();
  }, [requireLocalAdminAccessToken, syncAdminStateToBackend, user?.id]);

  useEffect(() => {
    if (!authReady || adminSession?.source !== 'local') {
      return;
    }

    refreshAdminData();
  }, [adminSession?.source, authReady, refreshAdminData]);

  const updateIntegrationSettings = useCallback(
    (updates: Partial<Omit<AdminIntegrationSettings, 'updatedAt'>>) => {
      const targetEmail = adminSession?.email ?? user?.email;

      if (!targetEmail) {
        return;
      }

      setAdminData((current) => {
        const next = updateStoredIntegrationSettings(current, targetEmail, updates);
        persistAdminData(next);
        showAdminSavedToast();

        // Attempt an immediate remote upsert when running with a Supabase admin session.
        // This ensures integration changes are pushed to the backend right away.
        const shouldSyncRemote = authReady && user?.id && adminSessionRef.current?.source === 'supabase' && HAS_SUPABASE_CONFIG;

        if (shouldSyncRemote) {
          (async () => {
            try {
              const { error } = await supabase.from('admin_state').upsert({
                user_id: user.id,
                data: next,
                updated_at: new Date().toISOString(),
              });

              if (error) {
                console.error('Failed to upsert admin state:', error.message);
              }
            } catch (err) {
              console.error('Failed to upsert admin state:', err);
            }
          })();
        }

        return next;
      });
    },
    [adminSession?.email, user?.email, authReady, user?.id, showAdminSavedToast],
  );

  const updateClinicProfile = useCallback((updates: Partial<ClinicProfile>) => {
    setAdminData((current) => {
      const next = updateStoredClinicProfile(current, updates);
      persistAdminData(next);
      void syncAdminStateToBackend(next);
      showAdminSavedToast();
      return next;
    });
  }, [showAdminSavedToast, syncAdminStateToBackend]);

    const updateOperationalSecuritySettings = useCallback((updates: Partial<ClinicOperationalSecuritySettings>) => {
      setAdminData((current) => {
        const mergedSecurity: ClinicOperationalSecuritySettings = {
          ...current.operationalSettings.security,
          ...(updates as Partial<ClinicOperationalSecuritySettings>),
        } as ClinicOperationalSecuritySettings;

        const next = updateOperationalSettings(current, { security: mergedSecurity });
        persistAdminData(next);
        showAdminSavedToast();

        const shouldSyncRemote = authReady && user?.id && adminSessionRef.current?.source === 'supabase' && HAS_SUPABASE_CONFIG;

        if (shouldSyncRemote) {
          (async () => {
            try {
              const { error } = await supabase.from('admin_state').upsert({
                user_id: user.id,
                data: next,
                updated_at: new Date().toISOString(),
              });

              if (error) {
                console.error('Failed to upsert admin state (operational settings):', error.message);
              }
            } catch (err) {
              console.error('Failed to upsert admin state (operational settings):', err);
            }
          })();
        }

        return next;
      });
    }, [authReady, showAdminSavedToast, user?.id]);

    const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<AuthResult> => {
      // Try local admin login first
      const targetEmail = adminSessionRef.current?.email ?? user?.email ?? ADMIN_LOGIN_EMAIL;

      const storedLogin = adminData.logins.find((l) => (l.email ?? '').trim().toLowerCase() === (targetEmail ?? '').trim().toLowerCase());

      if (storedLogin) {
        if (storedLogin.password !== currentPassword) {
          return { ok: false, error: 'Senha atual incorreta' };
        }

        setAdminData((current) => {
          const next = updateLogin(current, storedLogin.id, { password: newPassword });
          persistAdminData(next);
          void syncAdminStateToBackend(next);
          showAdminSavedToast();
          return next;
        });

        return { ok: true };
      }

      // Fallback to Supabase password change when available
      if (session) {
        try {
          const { error } = await supabase.auth.updateUser({ password: newPassword });
          if (error) {
            return { ok: false, error: error.message ?? 'Falha ao alterar a senha.' };
          }
          return { ok: true };
        } catch (err) {
          return { ok: false, error: err instanceof Error ? err.message : String(err) };
        }
      }

      return { ok: false, error: 'Não foi possível alterar a senha' };
    }, [adminData, session, showAdminSavedToast, syncAdminStateToBackend, user]);

  const updateAdminPlan = useCallback(
    (planId: string, updates: Partial<Pick<AdminPlan, 'name' | 'monthlyPrice' | 'description' | 'features' | 'active'>>) => {
      setAdminData((current) => {
        const next = updatePlan(current, planId, updates);
        persistAdminData(next);
        void syncAdminStateToBackend(next);
        showAdminSavedToast();
        return next;
      });
    },
    [showAdminSavedToast, syncAdminStateToBackend],
  );

  const addAdminPlan = useCallback((input: CreatePlanInput) => {
    setAdminData((current) => {
      const next = addPlan(current, input);
      persistAdminData(next);
      void syncAdminStateToBackend(next);
      showAdminSavedToast();
      return next;
    });
  }, [showAdminSavedToast, syncAdminStateToBackend]);

  const updateAdminClinic = useCallback(
    async (
      clinicId: string,
      updates: Partial<
        Pick<AdminClinic, 'name' | 'email' | 'phone' | 'city' | 'planId' | 'status' | 'notes' | 'accessPassword'>
      >,
    ) => {
      const currentClinicRow = adminData.clinics.find((clinic) => clinic.id === clinicId);
      if (!currentClinicRow) return;

      const currentOwnerLogin = adminData.logins.find(
        (login) => login.clinicId === clinicId && login.protected,
      );
      const nextClinic = { ...currentClinicRow, ...updates };
      const nextOwnerLogin = currentOwnerLogin
        ? {
            ...currentOwnerLogin,
            email: updates.email ?? currentOwnerLogin.email,
            password: updates.accessPassword || currentOwnerLogin.password,
            planId: updates.planId ?? currentOwnerLogin.planId,
          }
        : null;

      if (nextOwnerLogin) {
        const accessToken = requireLocalAdminAccessToken();
        await upsertBackendAuthUser(accessToken, {
          email: nextOwnerLogin.email,
          password: updates.accessPassword,
          role: nextOwnerLogin.role,
          clinicId,
        });

        if (
          currentOwnerLogin &&
          updates.email &&
          updates.email.trim().toLowerCase() !== currentOwnerLogin.email.trim().toLowerCase()
        ) {
          await deleteBackendAuthUser(accessToken, currentOwnerLogin.email);
        }
      }

      setAdminData((current) => {
        let next = updateClinic(current, clinicId, {
          ...updates,
          email: nextClinic.email,
        });

        if (nextOwnerLogin) {
          next = updateLogin(next, nextOwnerLogin.id, {
            email: nextOwnerLogin.email,
            password: nextOwnerLogin.password,
            planId: nextOwnerLogin.planId,
          });
        }

        persistAdminData(next);
        void syncAdminStateToBackend(next);
        showAdminSavedToast();
        return next;
      });
    },
    [adminData.clinics, adminData.logins, requireLocalAdminAccessToken, showAdminSavedToast, syncAdminStateToBackend],
  );

  const addAdminClinic = useCallback(async (input: CreateClinicInput) => {
    const accessToken = requireLocalAdminAccessToken();
    const next = addClinic(adminData, input);
    const generatedLogin =
      next.logins.find((login) => !adminData.logins.some((existingLogin) => existingLogin.id === login.id)) ?? null;

    if (!generatedLogin) {
      throw new Error('Não foi possível gerar o login da clínica.');
    }

    await upsertBackendAuthUser(accessToken, {
      email: generatedLogin.email,
      password: generatedLogin.password,
      role: generatedLogin.role,
      clinicId: generatedLogin.clinicId,
    });

    setAdminData(next);
    persistAdminData(next);
    void syncAdminStateToBackend(next);
    showAdminSavedToast();
  }, [adminData, requireLocalAdminAccessToken, showAdminSavedToast, syncAdminStateToBackend]);

  const deleteAdminClinic = useCallback(async (clinicId: string) => {
    const accessToken = requireLocalAdminAccessToken();
    const clinicLogins = adminData.logins.filter((login) => login.clinicId === clinicId);

    await Promise.all(
      clinicLogins.map((login) => deleteBackendAuthUser(accessToken, login.email).catch(() => undefined)),
    );

    setAdminData((current) => {
      const next = deleteClinic(current, clinicId);
      persistAdminData(next);
      void syncAdminStateToBackend(next);
      showAdminSavedToast();
      return next;
    });
  }, [adminData.logins, requireLocalAdminAccessToken, showAdminSavedToast, syncAdminStateToBackend]);

  const updateAdminLogin = useCallback(
    async (
      loginId: string,
      updates: Partial<
        Pick<
          AdminLogin,
          'name' | 'email' | 'password' | 'clinicId' | 'planId' | 'role' | 'status' | 'protected' | 'lastAccess'
        >
      >,
    ) => {
      const currentLogin = adminData.logins.find((login) => login.id === loginId);
      if (!currentLogin) return;

      const nextLogin = { ...currentLogin, ...updates };
      const accessToken = requireLocalAdminAccessToken();

      await upsertBackendAuthUser(accessToken, {
        email: nextLogin.email,
        password: updates.password,
        role: nextLogin.role,
        clinicId: nextLogin.clinicId,
      });

      if (updates.email && updates.email.trim().toLowerCase() !== currentLogin.email.trim().toLowerCase()) {
        await deleteBackendAuthUser(accessToken, currentLogin.email);
      }

      setAdminData((current) => {
        const next = updateLogin(current, loginId, updates);
        persistAdminData(next);
        void syncAdminStateToBackend(next);
        showAdminSavedToast();
        return next;
      });
    },
    [adminData.logins, requireLocalAdminAccessToken, showAdminSavedToast, syncAdminStateToBackend],
  );

  const addAdminLogin = useCallback(async (input: CreateLoginInput) => {
    const accessToken = requireLocalAdminAccessToken();

    await upsertBackendAuthUser(accessToken, {
      email: input.email,
      password: input.password,
      role: input.role,
      clinicId: input.clinicId,
    });

    setAdminData((current) => {
      const next = addLogin(current, input);
      persistAdminData(next);
      void syncAdminStateToBackend(next);
      showAdminSavedToast();
      return next;
    });
  }, [requireLocalAdminAccessToken, showAdminSavedToast, syncAdminStateToBackend]);

  const deleteAdminLogin = useCallback(async (loginId: string) => {
    const currentLogin = adminData.logins.find((login) => login.id === loginId);
    if (!currentLogin || currentLogin.protected) return;

    const accessToken = requireLocalAdminAccessToken();
    await deleteBackendAuthUser(accessToken, currentLogin.email);

    setAdminData((current) => {
      const next = deleteLogin(current, loginId);
      persistAdminData(next);
      void syncAdminStateToBackend(next);
      showAdminSavedToast();
      return next;
    });
  }, [adminData.logins, requireLocalAdminAccessToken, showAdminSavedToast, syncAdminStateToBackend]);

  const addProfessional = useCallback((input: CreateProfessionalInput) => {
    setAdminData((current) => {
      const next = addStoredProfessional(current, input);
      persistAdminData(next);
      void syncAdminStateToBackend(next);
      showAdminSavedToast();
      return next;
    });
  }, [showAdminSavedToast, syncAdminStateToBackend]);

  const updateProfessional = useCallback(
    (professionalId: string, updates: Partial<CreateProfessionalInput>) => {
      setAdminData((current) => {
        const next = updateStoredProfessional(current, professionalId, updates);
        persistAdminData(next);
        void syncAdminStateToBackend(next);
        showAdminSavedToast();
        return next;
      });
    },
    [showAdminSavedToast, syncAdminStateToBackend],
  );

  const deleteProfessional = useCallback((professionalId: string) => {
    setAdminData((current) => {
      const next = deleteStoredProfessional(current, professionalId);
      persistAdminData(next);
      void syncAdminStateToBackend(next);
      showAdminSavedToast();
      return next;
    });
  }, [showAdminSavedToast, syncAdminStateToBackend]);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        // Restore local admin JWT (for new browsers / fresh sessions).
        const localAdminJwtRaw = window.localStorage.getItem('clinic-organizer-pro-admin-jwt');
        if (!adminSessionRef.current) {
          if (localAdminJwtRaw) {
            try {
              const parsed = JSON.parse(localAdminJwtRaw) as {
                email?: string;
                accessToken?: string;
                refreshToken?: string;
                storedAt?: number;
              };

              const accessToken = typeof parsed.accessToken === 'string' ? parsed.accessToken : '';
              const refreshToken = typeof parsed.refreshToken === 'string' ? parsed.refreshToken : '';
              const email = typeof parsed.email === 'string' ? parsed.email : '';

              if (accessToken) {
                try {
                  const me = await fetchBackendMe(accessToken);
                  const role = me.role;
                  const isAdmin = String(role ?? '').toLowerCase() === 'admin' || isAdminEmail(email);

                  if (isAdmin) {
                    syncAdminSession({
                      email: me.email ?? email,
                      role: 'admin',
                      source: 'local',
                      accessToken,
                      refreshToken: refreshToken || undefined,
                    });
                    setAuthAccessToken(accessToken);
                    setAuthReady(true);
                  }
                } catch {
                  window.localStorage.removeItem('clinic-organizer-pro-admin-jwt');
                }
              }
            } catch {
              // ignore restore errors and fall back to supabase init
            }
          }
        }

        const nextSession = await getCurrentSession();

        if (!isMounted) {
          return;
        }

        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        setAuthAccessToken(nextSession?.access_token ?? null);
        syncAdminSession(
          isAdminEmail(nextSession?.user.email)
            ? { email: nextSession?.user.email ?? ADMIN_LOGIN_EMAIL, role: 'admin', source: 'supabase' }
            : null,
        );
      } catch (error) {
        console.error('Failed to read auth session:', error);

        if (!isMounted) {
          return;
        }

        setSession(null);
        setUser(null);
        syncAdminSession(null);
      } finally {
        if (isMounted) {
          setAuthReady(true);
        }
      }
    };

    void initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, nextSession: Session | null) => {
      const activeSession = nextSession ?? null;
      setSession(activeSession);
      setUser(activeSession?.user ?? null);
      setAuthAccessToken(activeSession?.access_token ?? null);
      syncAdminSession(
        isAdminEmail(activeSession?.user.email)
          ? { email: activeSession?.user.email ?? ADMIN_LOGIN_EMAIL, role: 'admin', source: 'supabase' }
          : null,
      );
      setAuthReady(true);

      if (!activeSession?.user) {
        setEmptyRecords();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [setEmptyRecords, syncAdminSession, isAdminEmail]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    persistAdminData(adminData);
  }, [adminData]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!authReady || !user?.id || adminSessionRef.current?.source !== 'supabase') {
      setAdminStateReady(false);
      return;
    }

    let cancelled = false;

    const loadRemoteAdminState = async () => {
      const { data, error } = (await supabase
        .from('admin_state')
        .select('data, updated_at')
        .eq('user_id', user.id)
        .maybeSingle()) as {
        data: AdminStateRow | null;
        error: { message: string } | null;
      };

      if (cancelled) {
        return;
      }

      if (error) {
        console.error('Failed to load admin state:', error.message);
        setAdminStateReady(false);
        return;
      }

      if (data?.data) {
        const nextAdminData = normalizeAdminData(data.data);
        setAdminData(nextAdminData);
        persistAdminData(nextAdminData);
      }

      setAdminStateReady(true);
    };

    void loadRemoteAdminState();

    return () => {
      cancelled = true;
    };
  }, [authReady, user?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!authReady || !user?.id || adminSessionRef.current?.source !== 'supabase' || !adminStateReady) {
      return;
    }

    let cancelled = false;

    const syncRemoteAdminState = async () => {
      const { error } = await supabase.from('admin_state').upsert({
        user_id: user.id,
        data: adminData,
        updated_at: new Date().toISOString(),
      });

      if (cancelled) {
        return;
      }

      if (error) {
        console.error('Failed to sync admin state:', error.message);
      }
    };

    void syncRemoteAdminState();

    return () => {
      cancelled = true;
    };
  }, [adminData, adminStateReady, authReady, user?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    if (adminSessionRef.current) {
      return;
    }

    if (!user?.id) {
      setEmptyRecords();
      return;
    }

    let cancelled = false;

    const run = async () => {
      await loadUserData(user.id, () => cancelled);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [authReady, loadUserData, setEmptyRecords, user?.id]);

  const contextValue = useMemo<AppContextType>(
    () => ({
      ...records,
      toasts,
      showToast,
      procedure_photos: records.procedurePhotos,
      session,
      user,
      authAccessToken,
      adminSession,
      adminData,
      clinicProfile: effectiveClinicProfile,
      currentClinic,
      currentPlan,
      professionals: adminData.professionals,
      refreshAdminData,
      integrationSettings,
      updateIntegrationSettings,
      updateOperationalSecuritySettings,
      changePassword,
      updateClinicProfile,
      updateAdminPlan,
      addAdminPlan,
      updateAdminClinic,
      addAdminClinic,
      deleteAdminClinic,
      updateAdminLogin,
      addAdminLogin,
      deleteAdminLogin,
      addProfessional,
      updateProfessional,
      deleteProfessional,
      authReady,
      loading: !authReady,
      signIn,
      signUp,
      signOut,
      theme,
      t,
      toggleTheme,
      currentPageTitle,
      activePageTitle,
      pageTitle,
      currentPageName,
      setCurrentPageTitle,
      setActivePageTitle,
      setPageTitle,
      setCurrentPageName,
      navigate,
      setPage: navigate,
      addPatient: (patient) => createRecord('patients', patient),
      createPatient: (patient) => createRecord('patients', patient),
      updatePatient: (id, patient) => updateRecord('patients', id, patient),
      deletePatient: (id) => deleteRecord('patients', id),
      addAppointment: (appointment) => createRecord('appointments', appointment),
      createAppointment: (appointment) => createRecord('appointments', appointment),
      updateAppointment: (id, appointment) => updateRecord('appointments', id, appointment),
      deleteAppointment: (id) => deleteRecord('appointments', id),
      addPrescription: (prescription) => createRecord('prescriptions', prescription),
      createPrescription: (prescription) => createRecord('prescriptions', prescription),
      updatePrescription: (id, prescription) => updateRecord('prescriptions', id, prescription),
      deletePrescription: (id) => deleteRecord('prescriptions', id),
      addProcedurePhoto: (procedurePhoto) => createRecord('procedurePhotos', procedurePhoto),
      createProcedurePhoto: (procedurePhoto) => createRecord('procedurePhotos', procedurePhoto),
      updateProcedurePhoto: (id, procedurePhoto) =>
        updateRecord('procedurePhotos', id, procedurePhoto),
      deleteProcedurePhoto: (id) => deleteRecord('procedurePhotos', id),
      addMessage: (message) => createRecord('messages', message),
      createMessage: (message) => createRecord('messages', message),
      updateMessage: (id, message) => updateRecord('messages', id, message),
      deleteMessage: (id) => deleteRecord('messages', id),
      addCampaign: (campaign) => createRecord('campaigns', campaign),
      createCampaign: (campaign) => createRecord('campaigns', campaign),
      updateCampaign: (id, campaign) => updateRecord('campaigns', id, campaign),
      deleteCampaign: (id) => deleteRecord('campaigns', id),
      addNotification: (notification) => createRecord('notifications', notification),
      createNotification: (notification) => createRecord('notifications', notification),
      updateNotification: (id, notification) => updateRecord('notifications', id, notification),
      deleteNotification: (id) => deleteRecord('notifications', id),
      addAnamnesis: (anamnesis) => createRecord('anamneses', anamnesis),
      createAnamnesis: (anamnesis) => createRecord('anamneses', anamnesis),
      updateAnamnesis: (id, anamnesis) => updateRecord('anamneses', id, anamnesis),
      deleteAnamnesis: (id) => deleteRecord('anamneses', id),
      addIncome: (income) => createRecord('incomes', income),
      createIncome: (income) => createRecord('incomes', income),
      updateIncome: (id, income) => updateRecord('incomes', id, income),
      deleteIncome: (id) => deleteRecord('incomes', id),
      addExpense: (expense) => createRecord('expenses', expense),
      createExpense: (expense) => createRecord('expenses', expense),
      updateExpense: (id, expense) => updateRecord('expenses', id, expense),
      deleteExpense: (id) => deleteRecord('expenses', id),
      createRecord,
      updateRecord,
      deleteRecord,
      refreshAllRecords,
    }),
    [
      activePageTitle,
      addAdminClinic,
      addAdminLogin,
      addAdminPlan,
      adminData,
      authReady,
      currentClinic,
      currentPageName,
      currentPageTitle,
      currentPlan,
      createRecord,
      deleteAdminClinic,
      deleteAdminLogin,
      deleteRecord,
      navigate,
      pageTitle,
      records,
      effectiveClinicProfile,
      refreshAdminData,
      integrationSettings,
      updateIntegrationSettings,
      refreshAllRecords,
      session,
      adminSession,
      authAccessToken,
      signIn,
      signUp,
      signOut,
      theme,
      t,
      toggleTheme,
      updateAdminClinic,
      updateAdminLogin,
      updateAdminPlan,
      updateRecord,
      updateClinicProfile,
      addProfessional,
      updateProfessional,
      deleteProfessional,
      updateOperationalSecuritySettings,
      changePassword,
      user,
      showToast,
      toasts,
    ],
  );

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

// prefer named export to avoid Fast Refresh issues
