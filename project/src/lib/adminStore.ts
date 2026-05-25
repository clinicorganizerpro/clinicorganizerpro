import { HAS_SUPABASE_CONFIG, SUPABASE_ANON_KEY, SUPABASE_URL } from '../config/supabase';
import type { Professional } from '../types';

export const ADMIN_DATA_STORAGE_KEY = 'clinic-organizer-pro-admin-data';
export const ADMIN_LOGIN_EMAIL = 'clinicorganizerpro@gmail.com';
export const DEFAULT_ADMIN_LOGIN_PASSWORD = 'max,play2';

export type AdminPlan = {
  id: string;
  name: string;
  monthlyPrice: number;
  description: string;
  features: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminClinicStatus = 'active' | 'paused';

export type AdminClinic = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  planId: string;
  status: AdminClinicStatus;
  notes: string;
  accessPassword?: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminLoginRole = 'owner' | 'admin' | 'reception' | 'doctor' | 'finance' | 'support';

export type AdminLoginStatus = 'active' | 'suspended';

export type AdminLogin = {
  id: string;
  name: string;
  email: string;
  password: string;
  clinicId: string;
  planId: string;
  role: AdminLoginRole;
  status: AdminLoginStatus;
  protected: boolean;
  lastAccess: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminProfessional = Professional & {
  role?: string;
  color?: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ClinicProfile = {
  clinicName: string;
  responsibleName: string;
  email: string;
  city: string;
  phone: string;
  cnpj: string;
  address: string;
};

export type ClinicOperationalNotificationSettings = {
  appointments: boolean;
  confirmations: boolean;
  cancellations: boolean;
  financialAlerts: boolean;
  whatsappSummary: boolean;
  marketingReports: boolean;
};

export type ClinicOperationalBillingSettings = {
  plan: string;
  cycle: 'monthly' | 'yearly';
  paymentMethod: string;
  nextCharge: string;
  autoRenew: boolean;
  invoiceEmail: string;
};

export type ClinicOperationalSecuritySettings = {
  twoFactor: boolean;
  loginAlerts: boolean;
  allowMultipleSessions: boolean;
  sessionTimeout: '15' | '30' | '60';
};

export type ClinicOperationalSettings = {
  notifications: ClinicOperationalNotificationSettings;
  billing: ClinicOperationalBillingSettings;
  security: ClinicOperationalSecuritySettings;
};

export type AdminIntegrationSettings = {
  clinicName: string;
  clinicAddress: string;
  clinicCity: string;
  clinicEmail: string;
  clinicPhone: string;
  appName: string;
  siteUrl: string;
  whatsappApiUrl: string;
  whatsappApiKey: string;
  whatsappEnabled: boolean;
  emailSmtpHost: string;
  emailSmtpPort: string;
  emailSmtpUser: string;
  emailSmtpPassword: string;
  emailSmtpSecure: boolean;
  aiApiUrl: string;
  aiApiKey: string;
  aiModel: string;
  aiEnabled: boolean;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseEnabled: boolean;
  stripeSecretKey: string;
  stripePublishableKey: string;
  stripeWebhookSecret: string;
  stripeEnabled: boolean;
  updatedAt: string;
};

export type AdminData = {
  plans: AdminPlan[];
  clinics: AdminClinic[];
  logins: AdminLogin[];
  clinicProfile: ClinicProfile;
  operationalSettings: ClinicOperationalSettings;
  professionals: AdminProfessional[];
  integrationsByUser: Record<string, AdminIntegrationSettings>;
  updatedAt: string;
};

export type CreatePlanInput = {
  name: string;
  monthlyPrice: number;
  description: string;
  features: string[];
  active?: boolean;
};

export type CreateClinicInput = {
  name: string;
  email: string;
  phone: string;
  city: string;
  planId: string;
  status?: AdminClinicStatus;
  notes?: string;
  accessPassword?: string;
};

export type CreateLoginInput = {
  name: string;
  email: string;
  password: string;
  clinicId: string;
  planId: string;
  role: AdminLoginRole;
  status?: AdminLoginStatus;
  protected?: boolean;
};

export type CreateProfessionalInput = Partial<AdminProfessional> & {
  name: string;
  specialty: string;
  email?: string;
  phone?: string;
  color?: string;
  isActive?: boolean;
  active?: boolean;
};

const DEFAULT_PLAN_IDS = {
  essencial: 'plan-essencial',
  profissional: 'plan-profissional',
  clinicaPro: 'plan-clinica-pro',
} as const;

const now = () => new Date().toISOString();

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return Object.prototype.toString.call(value) === '[object Object]';
};

const createDefaultIntegrationSettings = (timestamp: string): AdminIntegrationSettings => ({
  clinicName: 'Clinic Organizer Pro',
  clinicAddress: '',
  clinicCity: '',
  clinicEmail: '',
  clinicPhone: '',
  appName: 'Clinic Organizer Pro SaaS',
  siteUrl: '',
  whatsappApiUrl: '',
  whatsappApiKey: '',
  whatsappEnabled: false,
  emailSmtpHost: '',
  emailSmtpPort: '587',
  emailSmtpUser: '',
  emailSmtpPassword: '',
  emailSmtpSecure: true,
  aiApiUrl: '',
  aiApiKey: '',
  aiModel: 'gpt-4o-mini',
  aiEnabled: false,
  supabaseUrl: SUPABASE_URL,
  supabaseAnonKey: SUPABASE_ANON_KEY,
  supabaseEnabled: HAS_SUPABASE_CONFIG,
  stripeSecretKey: '',
  stripePublishableKey: '',
  stripeWebhookSecret: '',
  stripeEnabled: false,
  updatedAt: timestamp,
});

const createDefaultClinicProfile = (): ClinicProfile => ({
  clinicName: 'Clinic Organizer Pro',
  responsibleName: '',
  email: '',
  city: '',
  phone: '',
  cnpj: '',
  address: '',
});

const createDefaultOperationalSettings = (): ClinicOperationalSettings => ({
  notifications: {
    appointments: true,
    confirmations: true,
    cancellations: true,
    financialAlerts: false,
    whatsappSummary: true,
    marketingReports: false,
  },
  billing: {
    plan: '',
    cycle: 'monthly',
    paymentMethod: '',
    nextCharge: '',
    autoRenew: false,
    invoiceEmail: '',
  },
  security: {
    twoFactor: false,
    loginAlerts: true,
    allowMultipleSessions: false,
    sessionTimeout: '30',
  },
});

const normalizeOperationalNotificationSettings = (
  value: unknown,
): ClinicOperationalNotificationSettings => {
  const defaults = createDefaultOperationalSettings().notifications;

  if (!isPlainObject(value)) {
    return defaults;
  }

  return {
    appointments: typeof value['appointments'] === 'boolean' ? value['appointments'] : defaults.appointments,
    confirmations: typeof value['confirmations'] === 'boolean' ? value['confirmations'] : defaults.confirmations,
    cancellations: typeof value['cancellations'] === 'boolean' ? value['cancellations'] : defaults.cancellations,
    financialAlerts:
      typeof value['financialAlerts'] === 'boolean' ? value['financialAlerts'] : defaults.financialAlerts,
    whatsappSummary:
      typeof value['whatsappSummary'] === 'boolean' ? value['whatsappSummary'] : defaults.whatsappSummary,
    marketingReports:
      typeof value['marketingReports'] === 'boolean' ? value['marketingReports'] : defaults.marketingReports,
  };
};

const normalizeOperationalBillingSettings = (value: unknown): ClinicOperationalBillingSettings => {
  const defaults = createDefaultOperationalSettings().billing;

  if (!isPlainObject(value)) {
    return defaults;
  }

  const cycle = value['cycle'] === 'yearly' ? 'yearly' : 'monthly';

  return {
    plan: typeof value['plan'] === 'string' ? value['plan'].trim() : defaults.plan,
    cycle,
    paymentMethod: typeof value['paymentMethod'] === 'string' ? value['paymentMethod'].trim() : defaults.paymentMethod,
    nextCharge: typeof value['nextCharge'] === 'string' ? value['nextCharge'].trim() : defaults.nextCharge,
    autoRenew: typeof value['autoRenew'] === 'boolean' ? value['autoRenew'] : defaults.autoRenew,
    invoiceEmail: typeof value['invoiceEmail'] === 'string' ? value['invoiceEmail'].trim() : defaults.invoiceEmail,
  };
};

const normalizeOperationalSecuritySettings = (value: unknown): ClinicOperationalSecuritySettings => {
  const defaults = createDefaultOperationalSettings().security;

  if (!isPlainObject(value)) {
    return defaults;
  }

  const sessionTimeout =
    value['sessionTimeout'] === '15' || value['sessionTimeout'] === '30' || value['sessionTimeout'] === '60'
      ? value['sessionTimeout']
      : defaults.sessionTimeout;

  return {
    twoFactor: typeof value['twoFactor'] === 'boolean' ? value['twoFactor'] : defaults.twoFactor,
    loginAlerts: typeof value['loginAlerts'] === 'boolean' ? value['loginAlerts'] : defaults.loginAlerts,
    allowMultipleSessions:
      typeof value['allowMultipleSessions'] === 'boolean' ? value['allowMultipleSessions'] : defaults.allowMultipleSessions,
    sessionTimeout,
  };
};

const normalizeOperationalSettings = (value: unknown): ClinicOperationalSettings => {
  const defaults = createDefaultOperationalSettings();

  if (!isPlainObject(value)) {
    return defaults;
  }

  return {
    notifications: normalizeOperationalNotificationSettings(value['notifications']),
    billing: normalizeOperationalBillingSettings(value['billing']),
    security: normalizeOperationalSecuritySettings(value['security']),
  };
};

const createId = (prefix: string) => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

const createClinicLogin = (
  clinic: AdminClinic,
  input: CreateClinicInput,
  timestamp: string,
): AdminLogin => {
  const email = clinic.email.trim() || `clinic-${clinic.id}@local.invalid`;
  const password = input.accessPassword?.trim() || clinic.accessPassword?.trim() || createId('access');

  return {
    id: createId('login'),
    name: `Acesso ${clinic.name.trim() || 'da clínica'}`,
    email,
    password,
    clinicId: clinic.id,
    planId: clinic.planId,
    role: 'owner',
    status: 'active',
    protected: true,
    lastAccess: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

const createDefaultPlans = (timestamp: string): AdminPlan[] => [
  {
    id: DEFAULT_PLAN_IDS.essencial,
    name: 'Essencial',
    monthlyPrice: 29.9,
    description: 'Plano de entrada para clínicas que precisam do essencial para organizar pacientes e agenda.',
    features: ['Até 50 pacientes', 'Painel básico', '1 usuário'],
    active: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  },
  {
    id: DEFAULT_PLAN_IDS.profissional,
    name: 'Profissional',
    monthlyPrice: 79.9,
    description: 'Ideal para clínicas em crescimento com todos os recursos e suporte prioritário.',
    features: ['Até 500 pacientes', 'Todos os recursos', '3 usuários', 'Suporte prioritário'],
    active: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  },
  {
    id: DEFAULT_PLAN_IDS.clinicaPro,
    name: 'Clínica Pro',
    monthlyPrice: 199.9,
    description: 'Plano completo para operações avançadas com integrações e suporte 24/7.',
    features: ['Pacientes ilimitados', 'API access', '10 usuários', 'Suporte 24/7', 'Integrações avançadas'],
    active: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  },
];

const createDefaultClinics = (): AdminClinic[] => {
  // Seed local para facilitar testes de cadastro/login no modo sem Supabase
  const timestamp = now();
  return [
    {
      id: createId('clinic'),
      name: 'Clinica Bioface Itatiba',
      email: 'clinicabiofaceitatiba@gmail.com',
      phone: '',
      city: 'Itatiba',
      planId: DEFAULT_PLAN_IDS.clinicaPro,
      status: 'active',
      notes: '',
      accessPassword: 'guta.buda',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
};

const createDefaultAdminLogin = (timestamp: string): AdminLogin => ({
  id: createId('login'),
  name: 'Admin User',
  email: ADMIN_LOGIN_EMAIL,
  password: DEFAULT_ADMIN_LOGIN_PASSWORD,
  clinicId: '',
  planId: DEFAULT_PLAN_IDS.clinicaPro,
  role: 'admin',
  status: 'active',
  protected: true,
  lastAccess: null,
  createdAt: timestamp,
  updatedAt: timestamp,
});

const createDefaultLogins = (timestamp: string): AdminLogin[] => [createDefaultAdminLogin(timestamp)];

const createDefaultProfessionals = (): AdminProfessional[] => [];

const normalizeProfessional = (value: unknown, fallbackTimestamp: string): AdminProfessional => {
  const candidate = isPlainObject(value) ? value : {};

  const name = typeof candidate['name'] === 'string' ? candidate['name'].trim() : '';
  const specialty =
    typeof candidate['specialty'] === 'string'
      ? candidate['specialty'].trim()
      : typeof candidate['role'] === 'string'
        ? candidate['role'].trim()
        : '';
  const email = typeof candidate['email'] === 'string' ? candidate['email'].trim() : '';
  const phone = typeof candidate['phone'] === 'string' ? candidate['phone'].trim() : '';
  const avatar = typeof candidate['avatar'] === 'string' && candidate['avatar'].trim() ? candidate['avatar'].trim() : undefined;
  const color = typeof candidate['color'] === 'string' && candidate['color'].trim() ? candidate['color'].trim() : undefined;
  const active =
    typeof candidate['active'] === 'boolean'
      ? candidate['active']
      : typeof candidate['isActive'] === 'boolean'
        ? candidate['isActive']
        : true;
  const id =
    typeof candidate['id'] === 'string' && candidate['id'].trim()
      ? candidate['id'].trim()
      : createId('professional');
  const createdAt =
    typeof candidate['createdAt'] === 'string' && candidate['createdAt'].trim() ? candidate['createdAt'].trim() : fallbackTimestamp;
  const updatedAt =
    typeof candidate['updatedAt'] === 'string' && candidate['updatedAt'].trim() ? candidate['updatedAt'].trim() : fallbackTimestamp;

  return {
    id,
    name,
    specialty,
    email,
    phone,
    avatar,
    active,
    isActive: active,
    color,
    role: specialty || undefined,
    createdAt,
    updatedAt,
  };
};

const cloneDefaultAdminData = (): AdminData => {
  const timestamp = now();

  return {
    plans: createDefaultPlans(timestamp),
    clinics: createDefaultClinics(),
    logins: createDefaultLogins(timestamp),
    clinicProfile: createDefaultClinicProfile(),
    operationalSettings: createDefaultOperationalSettings(),
    professionals: createDefaultProfessionals(),
    integrationsByUser: {},
    updatedAt: timestamp,
  };
};

const safeParse = (value: string | null): AdminData | null => {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<AdminData>;
    const defaults = cloneDefaultAdminData();

    if (!Array.isArray(parsed.plans) || !Array.isArray(parsed.clinics) || !Array.isArray(parsed.logins)) {
      return null;
    }

    const timestamp = parsed.updatedAt ?? now();
    const logins = parsed.logins as AdminLogin[];
    const hasDefaultAdminLogin = logins.some((login) => login.email.trim().toLowerCase() === ADMIN_LOGIN_EMAIL.toLowerCase());

    const nextLogins = hasDefaultAdminLogin
      ? logins.map((login) => {
          const isDefaultAdmin = login.email.trim().toLowerCase() === ADMIN_LOGIN_EMAIL.trim().toLowerCase();
          if (!isDefaultAdmin) return login;

          return {
            ...login,
            password: DEFAULT_ADMIN_LOGIN_PASSWORD,
            clinicId: login.clinicId ?? '',
            planId: login.planId ?? DEFAULT_PLAN_IDS.clinicaPro,
            role: login.role ?? 'admin',
            status: login.status ?? 'active',
            protected: login.protected ?? true,
          };
        })
      : [...logins, createDefaultAdminLogin(timestamp)];

    return {
      ...defaults,
      plans: parsed.plans as AdminPlan[],
      clinics: parsed.clinics as AdminClinic[],
      logins: nextLogins,
      clinicProfile: isPlainObject(parsed.clinicProfile)
        ? {
            ...defaults.clinicProfile,
            ...(parsed.clinicProfile as Partial<ClinicProfile>),
          }
        : defaults.clinicProfile,
      operationalSettings: normalizeOperationalSettings(parsed.operationalSettings),
      professionals: Array.isArray(parsed.professionals)
        ? parsed.professionals.map((professional) => normalizeProfessional(professional, timestamp))
        : defaults.professionals,
      integrationsByUser: (parsed.integrationsByUser as Record<string, AdminIntegrationSettings>) ?? defaults.integrationsByUser,
      updatedAt: timestamp,
    };
  } catch {
    return null;
  }
};

export function createDefaultAdminData(): AdminData {
  return cloneDefaultAdminData();
}

export function loadAdminData(): AdminData {
  if (typeof window === 'undefined') {
    return cloneDefaultAdminData();
  }

  const stored = safeParse(window.localStorage.getItem(ADMIN_DATA_STORAGE_KEY));
  return stored ?? cloneDefaultAdminData();
}

export function persistAdminData(data: AdminData): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(ADMIN_DATA_STORAGE_KEY, JSON.stringify(data));
    if (window.clinicLocalDb?.isAvailable) {
      void window.clinicLocalDb.records.create('settings', {
        id: 'admin_state',
        type: 'admin_state',
        data,
        updatedAt: data.updatedAt,
      });
    }
  } catch (error) {
    console.error('Failed to persist admin data:', error);
  }
}

export function updatePlan(data: AdminData, planId: string, updates: Partial<Pick<AdminPlan, 'name' | 'monthlyPrice' | 'description' | 'features' | 'active'>>): AdminData {
  const timestamp = now();

  return {
    ...data,
    plans: data.plans.map((plan) =>
      plan.id === planId
        ? {
            ...plan,
            ...updates,
            updatedAt: timestamp,
          }
        : plan,
    ),
    updatedAt: timestamp,
  };
}

export function addPlan(data: AdminData, input: CreatePlanInput): AdminData {
  const timestamp = now();
  const newPlan: AdminPlan = {
    id: createId('plan'),
    name: input.name,
    monthlyPrice: input.monthlyPrice,
    description: input.description,
    features: input.features,
    active: input.active ?? true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return {
    ...data,
    plans: [...data.plans, newPlan],
    updatedAt: timestamp,
  };
}

export function updateClinic(
  data: AdminData,
  clinicId: string,
  updates: Partial<Pick<AdminClinic, 'name' | 'email' | 'phone' | 'city' | 'planId' | 'status' | 'notes' | 'accessPassword'>>,
): AdminData {
  const timestamp = now();

  return {
    ...data,
    clinics: data.clinics.map((clinic) =>
      clinic.id === clinicId
        ? {
            ...clinic,
            ...updates,
            updatedAt: timestamp,
          }
        : clinic,
    ),
    updatedAt: timestamp,
  };
}

export function addClinic(data: AdminData, input: CreateClinicInput): AdminData {
  const timestamp = now();
  const planId = data.plans.some((plan) => plan.id === input.planId) ? input.planId : data.plans[0]?.id ?? '';
  const newClinic: AdminClinic = {
    id: createId('clinic'),
    name: input.name,
    email: input.email,
    phone: input.phone,
    city: input.city,
    planId,
    status: input.status ?? 'active',
    notes: input.notes ?? '',
    accessPassword: input.accessPassword?.trim() ?? '',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const generatedLogin = createClinicLogin(newClinic, input, timestamp);

  return {
    ...data,
    clinics: [...data.clinics, newClinic],
    logins: [...data.logins, generatedLogin],
    updatedAt: timestamp,
  };
}

export function deleteClinic(data: AdminData, clinicId: string): AdminData {
  const timestamp = now();
  const remainingClinics = data.clinics.filter((clinic) => clinic.id !== clinicId);
  const fallbackClinicId = remainingClinics[0]?.id ?? '';

  return {
    ...data,
    clinics: remainingClinics,
    logins: data.logins.map((login) =>
      login.clinicId === clinicId
        ? {
            ...login,
            clinicId: fallbackClinicId,
            updatedAt: timestamp,
          }
        : login,
    ),
    updatedAt: timestamp,
  };
}

export function updateLogin(
  data: AdminData,
  loginId: string,
  updates: Partial<
    Pick<AdminLogin, 'name' | 'email' | 'password' | 'clinicId' | 'planId' | 'role' | 'status' | 'protected' | 'lastAccess'>
  >,
): AdminData {
  const timestamp = now();

  return {
    ...data,
    logins: data.logins.map((login) =>
      login.id === loginId
        ? {
            ...login,
            ...updates,
            updatedAt: timestamp,
          }
        : login,
    ),
    updatedAt: timestamp,
  };
}

export function addLogin(data: AdminData, input: CreateLoginInput): AdminData {
  const timestamp = now();
  const clinicId = data.clinics.some((clinic) => clinic.id === input.clinicId) ? input.clinicId : data.clinics[0]?.id ?? '';
  const planId = data.plans.some((plan) => plan.id === input.planId) ? input.planId : data.plans[0]?.id ?? '';

  const newLogin: AdminLogin = {
    id: createId('login'),
    name: input.name,
    email: input.email,
    password: input.password,
    clinicId,
    planId,
    role: input.role,
    status: input.status ?? 'active',
    protected: input.protected ?? false,
    lastAccess: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return {
    ...data,
    logins: [...data.logins, newLogin],
    updatedAt: timestamp,
  };
}

export function deleteLogin(data: AdminData, loginId: string): AdminData {
  const timestamp = now();

  return {
    ...data,
    logins: data.logins.filter((login) => {
      if (login.id !== loginId) {
        return true;
      }

      return login.protected;
    }),
    updatedAt: timestamp,
  };
}

export function updateClinicProfile(data: AdminData, updates: Partial<ClinicProfile>): AdminData {
  const timestamp = now();

  return {
    ...data,
    clinicProfile: {
      ...data.clinicProfile,
      ...updates,
    },
    updatedAt: timestamp,
  };
}

export function updateOperationalSettings(
  data: AdminData,
  updates: Partial<ClinicOperationalSettings>,
): AdminData {
  const timestamp = now();

  return {
    ...data,
    operationalSettings: {
      notifications: updates.notifications
        ? {
            ...data.operationalSettings.notifications,
            ...updates.notifications,
          }
        : data.operationalSettings.notifications,
      billing: updates.billing
        ? {
            ...data.operationalSettings.billing,
            ...updates.billing,
          }
        : data.operationalSettings.billing,
      security: updates.security
        ? {
            ...data.operationalSettings.security,
            ...updates.security,
          }
        : data.operationalSettings.security,
    },
    updatedAt: timestamp,
  };
}

export function addProfessional(data: AdminData, input: CreateProfessionalInput): AdminData {
  const timestamp = now();
  const professional = normalizeProfessional(
    {
      ...input,
      active: input.active ?? input.isActive ?? true,
      isActive: input.isActive ?? input.active ?? true,
      color: input.color ?? '#06b6d4',
    },
    timestamp,
  );

  return {
    ...data,
    professionals: [...data.professionals, professional],
    updatedAt: timestamp,
  };
}

export function updateProfessional(
  data: AdminData,
  professionalId: string,
  updates: Partial<CreateProfessionalInput>,
): AdminData {
  const timestamp = now();

  return {
    ...data,
    professionals: data.professionals.map((professional) => {
      if (professional.id !== professionalId) {
        return professional;
      }

      const active = typeof updates.active === 'boolean'
        ? updates.active
        : typeof updates.isActive === 'boolean'
          ? updates.isActive
          : professional.active;

      return normalizeProfessional(
        {
          ...professional,
          ...updates,
          active,
          isActive: active,
          role: updates.specialty ?? updates.role ?? professional.role ?? professional.specialty,
          color: updates.color ?? professional.color,
        },
        timestamp,
      );
    }),
    updatedAt: timestamp,
  };
}

export function deleteProfessional(data: AdminData, professionalId: string): AdminData {
  return {
    ...data,
    professionals: data.professionals.filter((professional) => professional.id !== professionalId),
    updatedAt: now(),
  };
}

export function getPlanName(data: AdminData, planId: string): string {
  return data.plans.find((plan) => plan.id === planId)?.name ?? 'Plano não definido';
}

export function getClinicName(data: AdminData, clinicId: string): string {
  return data.clinics.find((clinic) => clinic.id === clinicId)?.name ?? 'Clínica não definida';
}

export function getIntegrationSettings(data: AdminData, userEmail: string | null | undefined): AdminIntegrationSettings | null {
  if (!userEmail) {
    return null;
  }

  const defaults = createDefaultIntegrationSettings(data.updatedAt);
  const storedSettings = data.integrationsByUser[userEmail];

  if (!storedSettings) {
    return defaults;
  }

  return {
    ...defaults,
    ...storedSettings,
    updatedAt: storedSettings.updatedAt ?? defaults.updatedAt,
  };
}

export function updateIntegrationSettings(
  data: AdminData,
  userEmail: string,
  updates: Partial<Omit<AdminIntegrationSettings, 'updatedAt'>>,
): AdminData {
  const timestamp = now();
  const currentSettings = data.integrationsByUser[userEmail] ?? createDefaultIntegrationSettings(timestamp);

  return {
    ...data,
    integrationsByUser: {
      ...data.integrationsByUser,
      [userEmail]: {
        ...currentSettings,
        ...updates,
        updatedAt: timestamp,
      },
    },
    updatedAt: timestamp,
  };
}

export function formatPlanLabel(data: AdminData, planId: string): string {
  const plan = data.plans.find((item) => item.id === planId);

  if (!plan) {
    return 'Plano não definido';
  }

  return `${plan.name} — R$ ${plan.monthlyPrice.toFixed(2).replace('.', ',')}`;
}
