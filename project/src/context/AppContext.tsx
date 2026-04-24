import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
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
import {
  type AdminClinic,
  type AdminData,
  type AdminIntegrationSettings,
  type AdminLogin,
  type AdminPlan,
  type CreateClinicInput,
  type CreateLoginInput,
  type CreatePlanInput,
  addClinic,
  addLogin,
  addPlan,
  deleteClinic,
  deleteLogin,
  getIntegrationSettings,
  loadAdminData,
  persistAdminData,
  createDefaultAdminData,
  updateClinic,
  updateIntegrationSettings as updateStoredIntegrationSettings,
  updateLogin,
  updatePlan,
} from '../lib/adminStore';
import { getCurrentSession, supabase } from '../lib/supabase';

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
};

type OAuthProvider = 'google' | 'azure';

const ADMIN_EMAIL = 'maxwel_dias@yahoo.com.br';
const ADMIN_PASSWORD = 'max3941';
const ADMIN_SESSION_STORAGE_KEY = 'clinic-organizer-pro-admin-session';

export type AppContextType = RecordsState & {
  procedure_photos?: ProcedurePhoto[];
  session: Session | null;
  user: User | null;
  adminSession: AdminSession | null;
  adminData: AdminData;
  refreshAdminData: () => void;
  integrationSettings: AdminIntegrationSettings | null;
  updateIntegrationSettings: (
    updates: Partial<Omit<AdminIntegrationSettings, 'updatedAt'>>,
  ) => void;
  updateAdminPlan: (
    planId: string,
    updates: Partial<Pick<AdminPlan, 'name' | 'monthlyPrice' | 'description' | 'features' | 'active'>>,
  ) => void;
  addAdminPlan: (input: CreatePlanInput) => void;
  updateAdminClinic: (
    clinicId: string,
    updates: Partial<Pick<AdminClinic, 'name' | 'email' | 'phone' | 'city' | 'planId' | 'status' | 'notes'>>,
  ) => void;
  addAdminClinic: (input: CreateClinicInput) => void;
  deleteAdminClinic: (clinicId: string) => void;
  updateAdminLogin: (
    loginId: string,
    updates: Partial<
      Pick<
        AdminLogin,
        'name' | 'email' | 'clinicId' | 'planId' | 'role' | 'status' | 'protected' | 'lastAccess'
      >
    >,
  ) => void;
  addAdminLogin: (input: CreateLoginInput) => void;
  deleteAdminLogin: (loginId: string) => void;
  authReady: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<AuthResult>;
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
  [key: string]: unknown;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

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

const prepareRecordForDatabase = (table: TableKey, payload: AnyRecord, userId: string) => {
  const transformed = transformKeys(payload, camelToSnake) as AnyRecord;
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

const buildDemoPatients = (userId: string) => {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const daysAgo = (days: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() - days);
    return date.toISOString().slice(0, 10);
  };

  return [
    {
      name: 'Ana Ferreira',
      email: 'ana.ferreira@example.com',
      phone: '(11) 98888-1000',
      birthDate: '1990-04-12',
      cpf: '123.456.789-00',
      sex: 'F',
      address: 'Rua das Flores, 123',
      observations: 'Paciente de demonstração para triagem e retorno.',
      lastVisit: today,
      nextAppointment: today,
      status: 'active' as const,
      totalSpent: 1450,
      procedures: ['Consulta inicial', 'Limpeza'],
      userId,
    },
    {
      name: 'Bruno Almeida',
      email: 'bruno.almeida@example.com',
      phone: '(11) 97777-2000',
      birthDate: '1985-09-03',
      cpf: '234.567.890-11',
      sex: 'M',
      address: 'Av. Paulista, 900',
      observations: 'Acompanhamento de rotina com foco em prevenção.',
      lastVisit: daysAgo(4),
      nextAppointment: daysAgo(-7),
      status: 'active' as const,
      totalSpent: 980,
      procedures: ['Avaliação clínica', 'Check-up'],
      userId,
    },
    {
      name: 'Carla Souza',
      email: 'carla.souza@example.com',
      phone: '(11) 96666-3000',
      birthDate: '1992-01-21',
      cpf: '345.678.901-22',
      sex: 'F',
      address: 'Rua das Acácias, 45',
      observations: 'Paciente aguardando confirmação de retorno.',
      lastVisit: daysAgo(12),
      status: 'pending' as const,
      totalSpent: 320,
      procedures: ['Avaliação estética'],
      userId,
    },
    {
      name: 'Diego Martins',
      email: 'diego.martins@example.com',
      phone: '(11) 95555-4000',
      birthDate: '1979-07-18',
      cpf: '456.789.012-33',
      sex: 'M',
      address: 'Rua do Comércio, 18',
      observations: 'Histórico de tratamento finalizado.',
      lastVisit: daysAgo(28),
      status: 'inactive' as const,
      totalSpent: 2840,
      procedures: ['Consulta odontológica', 'Restauração'],
      userId,
    },
    {
      name: 'Fernanda Lima',
      email: 'fernanda.lima@example.com',
      phone: '(11) 94444-5000',
      birthDate: '1995-11-09',
      cpf: '567.890.123-44',
      sex: 'F',
      address: 'Alameda Santos, 210',
      observations: 'Paciente em acompanhamento pós-procedimento.',
      lastVisit: daysAgo(2),
      nextAppointment: daysAgo(-5),
      status: 'active' as const,
      totalSpent: 2160,
      procedures: ['Consulta inicial', 'Aplicação'],
      userId,
    },
  ];
};

const buildRelatedSeedData = (userId: string, patientId: string, patientName: string) => {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const timestamp = now.toISOString();

  return {
    appointment: {
      patientId,
      patientName,
      procedure: 'Consulta inicial',
      date: today,
      time: '09:00',
      duration: 60,
      professional: 'Dra. Paula',
      status: 'scheduled' as const,
      value: 250,
      notes: 'Primeiro atendimento',
      userId,
    },
    prescription: {
      patientId,
      date: today,
      medications: [
        {
          name: 'Amoxicilina',
          dosage: '500mg',
          frequency: '8/8h',
          duration: '7 dias',
        },
      ],
      instructions: 'Tomar após as refeições',
      userId,
    },
    procedurePhoto: {
      patientId,
      procedureName: 'Foto inicial',
      photosBefore: ['https://placehold.co/600x400'],
      photosAfter: [],
      videoUrl: '',
      observations: 'Registro inicial',
      userId,
    },
    message: {
      patientId,
      patientName,
      message: 'Olá! Sua próxima consulta foi confirmada.',
      templateType: 'confirmation',
      status: 'sent' as const,
      sentAt: timestamp,
      userId,
    },
    campaign: {
      name: 'Retorno de pacientes',
      templateType: 'follow-up',
      message: 'Agende seu retorno com a nossa equipe.',
      audience: 'inactive' as const,
      status: 'draft' as const,
      sentCount: 0,
      openCount: 0,
      patientIds: patientId ? [patientId] : [],
      scheduledAt: timestamp,
      sentAt: timestamp,
      userId,
    },
    notification: {
      title: 'Novo agendamento',
      message: 'Você tem uma consulta marcada para hoje.',
      time: timestamp,
      read: false,
      type: 'appointment' as const,
      userId,
    },
    anamnesis: {
      patientId,
      date: today,
      mainComplaint: 'Avaliação inicial',
      medicalHistory: 'Sem doenças relatadas.',
      allergies: 'Nenhuma relatada.',
      currentMedications: 'Nenhum uso contínuo.',
      familyHistory: 'Sem histórico relevante.',
      socialHistory: 'Sem informações adicionais.',
      previousSurgeries: 'Nenhuma cirurgia prévia.',
      vitalSigns: {
        bloodPressure: '120/80',
        heartRate: '72 bpm',
        temperature: '36.6°C',
        weight: '68 kg',
      },
      observations: 'Paciente de demonstração',
      userId,
    },
    income: {
      patientId,
      patientName,
      service: 'Consulta particular',
      paymentMethod: 'pix' as const,
      amount: 250,
      status: 'paid' as const,
      attendanceDate: today,
      observations: 'Pagamento recebido',
      userId,
    },
    expense: {
      description: 'Material de escritório',
      category: 'fixa' as const,
      amount: 80,
      date: today,
      paymentMethod: 'pix' as const,
      status: 'paid' as const,
      observations: 'Compra inicial',
      userId,
    },
  };
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [adminSession, setAdminSession] = useState<AdminSession | null>(null);
  const adminSessionRef = useRef<AdminSession | null>(null);
  const [adminData, setAdminData] = useState<AdminData>(() => loadAdminData());
  const [adminStateReady, setAdminStateReady] = useState(false);
  const integrationSettings = useMemo(
    () => getIntegrationSettings(adminData, adminSession?.email ?? user?.email),
    [adminData, adminSession, user?.email],
  );
  const [authReady, setAuthReady] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(getStoredTheme());
  const [currentPageTitle, setCurrentPageTitle] = useState('Clinic Organizer Pro');
  const [activePageTitle, setActivePageTitle] = useState('Clinic Organizer Pro');
  const [pageTitle, setPageTitle] = useState('Clinic Organizer Pro');
  const [currentPageName, setCurrentPageName] = useState('Clinic Organizer Pro');
  const [records, setRecords] = useState<RecordsState>(initialRecords);
  const seededUsersRef = useRef<Set<string>>(new Set());

  const setEmptyRecords = useCallback(() => {
    setRecords(createEmptyRecords());
  }, []);

  const syncAdminSession = useCallback((nextAdminSession: AdminSession | null) => {
    adminSessionRef.current = nextAdminSession;
    setAdminSession(nextAdminSession);

    if (typeof window === 'undefined') {
      return;
    }

    if (nextAdminSession) {
      window.localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(nextAdminSession));
      return;
    }

    window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
  }, []);

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
    const dbTable = getDatabaseTableName(table);
    const { data, error } = await supabase
      .from(dbTable)
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error(`Failed to load ${dbTable}:`, error.message);
      return [];
    }

    return ((data ?? []) as AnyRecord[]).map((row) => mapRecordForState(table, row));
  }, []);

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

  const seedInitialData = useCallback(
    async (userId: string, isCancelled: () => boolean = () => false) => {
      if (seededUsersRef.current.has(userId)) {
        return;
      }

      const { count, error } = await supabase
        .from('patients')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to inspect initial patient records:', error.message);
        return;
      }

      if (isCancelled()) {
        return;
      }

      if ((count ?? 0) > 0) {
        seededUsersRef.current.add(userId);
        return;
      }

      const seedPatients = buildDemoPatients(userId);

      const { data: createdPatients, error: patientError } = await supabase
        .from('patients')
        .insert(seedPatients.map((patient) => prepareRecordForDatabase('patients', patient, userId)))
        .select('*');

      if (patientError) {
        console.error('Failed to seed patient data:', patientError.message);
        return;
      }

      if (isCancelled()) {
        return;
      }

      seededUsersRef.current.add(userId);

      const patientRecords = ((createdPatients ?? []) as AnyRecord[]).map((record) =>
        mapRecordForState('patients', record),
      );
      const primaryPatient = patientRecords[0];
      const patientId = (primaryPatient?.id as string | undefined) ?? '';

      if (!patientId) {
        return;
      }

      const seededRecords = buildRelatedSeedData(
        userId,
        patientId,
        String(primaryPatient?.name ?? 'Ana Ferreira'),
      );

      if (isCancelled()) {
        return;
      }

      const insertPromises = [
        async () => {
          const { error: appointmentError } = await supabase
            .from('appointments')
            .insert([prepareRecordForDatabase('appointments', seededRecords.appointment, userId)]);

          if (appointmentError) {
            throw appointmentError;
          }
        },
        async () => {
          const { error: prescriptionError } = await supabase
            .from('prescriptions')
            .insert([prepareRecordForDatabase('prescriptions', seededRecords.prescription, userId)]);

          if (prescriptionError) {
            throw prescriptionError;
          }
        },
        async () => {
          const { error: procedurePhotoError } = await supabase
            .from('procedure_photos')
            .insert([
              prepareRecordForDatabase('procedurePhotos', seededRecords.procedurePhoto, userId),
            ]);

          if (procedurePhotoError) {
            throw procedurePhotoError;
          }
        },
        async () => {
          const { error: messageError } = await supabase
            .from('messages')
            .insert([prepareRecordForDatabase('messages', seededRecords.message, userId)]);

          if (messageError) {
            throw messageError;
          }
        },
        async () => {
          const { error: campaignError } = await supabase
            .from('campaigns')
            .insert([prepareRecordForDatabase('campaigns', seededRecords.campaign, userId)]);

          if (campaignError) {
            throw campaignError;
          }
        },
        async () => {
          const { error: notificationError } = await supabase
            .from('notifications')
            .insert([prepareRecordForDatabase('notifications', seededRecords.notification, userId)]);

          if (notificationError) {
            throw notificationError;
          }
        },
        async () => {
          const { error: anamnesisError } = await supabase
            .from('anamneses')
            .insert([prepareRecordForDatabase('anamneses', seededRecords.anamnesis, userId)]);

          if (anamnesisError) {
            throw anamnesisError;
          }
        },
        async () => {
          const { error: incomeError } = await supabase
            .from('incomes')
            .insert([prepareRecordForDatabase('incomes', seededRecords.income, userId)]);

          if (incomeError) {
            throw incomeError;
          }
        },
        async () => {
          const { error: expenseError } = await supabase
            .from('expenses')
            .insert([prepareRecordForDatabase('expenses', seededRecords.expense, userId)]);

          if (expenseError) {
            throw expenseError;
          }
        },
      ];

      const results = await Promise.allSettled(insertPromises.map((insert) => insert()));

      results.forEach((result) => {
        if (result.status === 'rejected') {
          console.error('Seed insert failed:', result.reason);
        }
      });
    },
    [],
  );

  const loadUserData = useCallback(
    async (userId: string, isCancelled: () => boolean = () => false) => {
      setEmptyRecords();

      if (isCancelled()) {
        return;
      }

      const nextRecords = await fetchAllRecords(userId);

      if (isCancelled()) {
        return;
      }

      setRecords(nextRecords);

      if ((nextRecords.patients?.length ?? 0) > 0) {
        return;
      }

      await seedInitialData(userId, isCancelled);

      if (isCancelled()) {
        return;
      }

      const seededRecords = await fetchAllRecords(userId);

      if (isCancelled()) {
        return;
      }

      setRecords(seededRecords);
    },
    [fetchAllRecords, seedInitialData, setEmptyRecords],
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

      const dbTable = getDatabaseTableName(resolvedTable);
      const { data, error } = await supabase
        .from(dbTable)
        .insert([prepareRecordForDatabase(resolvedTable, payload, user.id)])
        .select('*')
        .single();

      if (error) {
        console.error(`Failed to insert into ${dbTable}:`, error.message);
        return null;
      }

      await refreshAllRecords();
      return mapRecordForState(resolvedTable, data as AnyRecord);
    },
    [refreshAllRecords, user?.id],
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

      const dbTable = getDatabaseTableName(resolvedTable);
      const { data, error } = await supabase
        .from(dbTable)
        .update(prepareRecordForDatabase(resolvedTable, payload, user.id))
        .eq('id', id)
        .eq('user_id', user.id)
        .select('*')
        .single();

      if (error) {
        console.error(`Failed to update ${dbTable}:`, error.message);
        return null;
      }

      await refreshAllRecords();
      return mapRecordForState(resolvedTable, data as AnyRecord);
    },
    [refreshAllRecords, user?.id],
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

      const dbTable = getDatabaseTableName(resolvedTable);
      const { error } = await supabase
        .from(dbTable)
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error(`Failed to delete from ${dbTable}:`, error.message);
        return false;
      }

      await refreshAllRecords();
      return true;
    },
    [refreshAllRecords, user?.id],
  );

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const trimmedEmail = email.trim().toLowerCase();

    if (trimmedEmail === ADMIN_EMAIL) {
      if (password !== ADMIN_PASSWORD) {
        return { ok: false, error: 'Credenciais administrativas inválidas.' };
      }

      syncAdminSession({
        email: ADMIN_EMAIL,
        role: 'admin',
      });
      setSession(null);
      setUser(null);
      setEmptyRecords();
      setAuthReady(true);

      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.error('Failed to clear active Supabase session before admin login:', error);
      }

      return { ok: true };
    }

    syncAdminSession(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    if (data.session) {
      setSession(data.session);
      setUser(data.session.user);
      setAuthReady(true);
    }

    return { ok: true };
  }, [setEmptyRecords, syncAdminSession]);

  const signUp = useCallback(async (email: string, password: string): Promise<SignUpResult> => {
    const trimmedEmail = email.trim().toLowerCase();

    if (trimmedEmail === ADMIN_EMAIL) {
      return { ok: false, error: 'Este e-mail é reservado para o administrador.' };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    if (data.session) {
      syncAdminSession(null);
      setSession(data.session);
      setUser(data.session.user);
      setAuthReady(true);
    }

    return {
      ok: true,
      needsConfirmation: !data.session,
    };
  }, [syncAdminSession]);

  const signInWithOAuth = useCallback(async (provider: OAuthProvider): Promise<AuthResult> => {
    if (typeof window === 'undefined') {
      return { ok: false, error: 'OAuth sign-in is only available in the browser.' };
    }

    const options =
      provider === 'azure'
        ? { redirectTo: window.location.origin, scopes: 'email openid profile offline_access' }
        : { redirectTo: window.location.origin };

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    if (data.url) {
      window.location.href = data.url;
    }

    return { ok: true };
  }, []);

  const signOut = useCallback(async () => {
    if (adminSessionRef.current) {
      syncAdminSession(null);
      setSession(null);
      setUser(null);
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

    setSession(null);
    setUser(null);
    setEmptyRecords();
  }, [setEmptyRecords, syncAdminSession]);

  const refreshAdminData = useCallback(() => {
    if (!user?.id || adminSessionRef.current) {
      setAdminData(loadAdminData());
      return;
    }

    void (async () => {
      const { data, error } = await supabase
        .from('admin_state')
        .select('data, updated_at')
        .eq('user_id', user.id)
        .maybeSingle();

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
  }, [user?.id]);

  const updateIntegrationSettings = useCallback(
    (updates: Partial<Omit<AdminIntegrationSettings, 'updatedAt'>>) => {
      const targetEmail = adminSession?.email ?? user?.email;

      if (!targetEmail) {
        return;
      }

      setAdminData((current) => updateStoredIntegrationSettings(current, targetEmail, updates));
    },
    [adminSession?.email, user?.email],
  );

  const updateAdminPlan = useCallback(
    (planId: string, updates: Partial<Pick<AdminPlan, 'name' | 'monthlyPrice' | 'description' | 'features' | 'active'>>) => {
      setAdminData((current) => updatePlan(current, planId, updates));
    },
    [],
  );

  const addAdminPlan = useCallback((input: CreatePlanInput) => {
    setAdminData((current) => addPlan(current, input));
  }, []);

  const updateAdminClinic = useCallback(
    (clinicId: string, updates: Partial<Pick<AdminClinic, 'name' | 'email' | 'phone' | 'city' | 'planId' | 'status' | 'notes'>>) => {
      setAdminData((current) => updateClinic(current, clinicId, updates));
    },
    [],
  );

  const addAdminClinic = useCallback((input: CreateClinicInput) => {
    setAdminData((current) => addClinic(current, input));
  }, []);

  const deleteAdminClinic = useCallback((clinicId: string) => {
    setAdminData((current) => deleteClinic(current, clinicId));
  }, []);

  const updateAdminLogin = useCallback(
    (
      loginId: string,
      updates: Partial<
        Pick<
          AdminLogin,
          'name' | 'email' | 'clinicId' | 'planId' | 'role' | 'status' | 'protected' | 'lastAccess'
        >
      >,
    ) => {
      setAdminData((current) => updateLogin(current, loginId, updates));
    },
    [],
  );

  const addAdminLogin = useCallback((input: CreateLoginInput) => {
    setAdminData((current) => addLogin(current, input));
  }, []);

  const deleteAdminLogin = useCallback((loginId: string) => {
    setAdminData((current) => deleteLogin(current, loginId));
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const storedAdminSession =
          typeof window === 'undefined'
            ? null
            : window.localStorage.getItem(ADMIN_SESSION_STORAGE_KEY);

        if (storedAdminSession) {
          try {
            const parsedAdminSession = JSON.parse(storedAdminSession) as Partial<AdminSession> | null;

            if (
              parsedAdminSession?.email?.toLowerCase() === ADMIN_EMAIL &&
              parsedAdminSession?.role === 'admin'
            ) {
              syncAdminSession({
                email: ADMIN_EMAIL,
                role: 'admin',
              });

              if (!isMounted) {
                return;
              }

              setSession(null);
              setUser(null);
              setAuthReady(true);

              try {
                await supabase.auth.signOut();
              } catch (error) {
                console.error('Failed to clear Supabase session for admin access:', error);
              }

              return;
            }
          } catch (parseError) {
            console.error('Failed to parse stored admin session:', parseError);
          }

          if (typeof window !== 'undefined') {
            window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
          }
        }

        const nextSession = await getCurrentSession();

        if (!isMounted) {
          return;
        }

        setSession(nextSession);
        setUser(nextSession?.user ?? null);
      } catch (error) {
        console.error('Failed to read auth session:', error);

        if (!isMounted) {
          return;
        }

        setSession(null);
        setUser(null);
      } finally {
        if (isMounted) {
          setAuthReady(true);
        }
      }
    };

    void initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (adminSessionRef.current) {
        return;
      }

      const activeSession = nextSession ?? null;
      setSession(activeSession);
      setUser(activeSession?.user ?? null);
      setAuthReady(true);

      if (!activeSession?.user) {
        setEmptyRecords();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [setEmptyRecords, syncAdminSession]);

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

    if (!authReady || !user?.id || adminSessionRef.current) {
      setAdminStateReady(false);
      return;
    }

    let cancelled = false;

    const loadRemoteAdminState = async () => {
      const { data, error } = await supabase
        .from('admin_state')
        .select('data, updated_at')
        .eq('user_id', user.id)
        .maybeSingle();

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

    if (!authReady || !user?.id || adminSessionRef.current || !adminStateReady) {
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
      procedure_photos: records.procedurePhotos,
      session,
      user,
      adminSession,
      adminData,
      refreshAdminData,
      integrationSettings,
      updateIntegrationSettings,
      updateAdminPlan,
      addAdminPlan,
      updateAdminClinic,
      addAdminClinic,
      deleteAdminClinic,
      updateAdminLogin,
      addAdminLogin,
      deleteAdminLogin,
      authReady,
      loading: !authReady,
      signIn,
      signUp,
      signInWithOAuth,
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
      currentPageName,
      currentPageTitle,
      createRecord,
      deleteAdminClinic,
      deleteAdminLogin,
      deleteRecord,
      navigate,
      pageTitle,
      records,
      refreshAdminData,
      integrationSettings,
      updateIntegrationSettings,
      refreshAllRecords,
      session,
      signIn,
      signUp,
      signInWithOAuth,
      signOut,
      theme,
      t,
      toggleTheme,
      updateAdminClinic,
      updateAdminLogin,
      updateAdminPlan,
      updateRecord,
      user,
    ],
  );

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }

  return context;
}

export default useApp;
