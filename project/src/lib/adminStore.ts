export const ADMIN_DATA_STORAGE_KEY = 'clinic-organizer-pro-admin-data';
export const ADMIN_LOGIN_EMAIL = 'maxwel_dias@yahoo.com.br';

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
  createdAt: string;
  updatedAt: string;
};

export type AdminLoginRole = 'owner' | 'admin' | 'reception' | 'doctor' | 'finance' | 'support';

export type AdminLoginStatus = 'active' | 'suspended';

export type AdminLogin = {
  id: string;
  name: string;
  email: string;
  clinicId: string;
  planId: string;
  role: AdminLoginRole;
  status: AdminLoginStatus;
  protected: boolean;
  lastAccess: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminIntegrationSettings = {
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
  googleClientId: string;
  googleClientSecret: string;
  googleEnabled: boolean;
  hotmailClientId: string;
  hotmailClientSecret: string;
  hotmailEnabled: boolean;
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
};

export type CreateLoginInput = {
  name: string;
  email: string;
  clinicId: string;
  planId: string;
  role: AdminLoginRole;
  status?: AdminLoginStatus;
  protected?: boolean;
};

const DEFAULT_PLAN_IDS = {
  essencial: 'plan-essencial',
  profissional: 'plan-profissional',
  clinicaPro: 'plan-clinica-pro',
} as const;

const DEFAULT_CLINIC_IDS = {
  matriz: 'clinic-matriz',
  jardins: 'clinic-jardins',
  elite: 'clinic-elite',
} as const;

const now = () => new Date().toISOString();

const createDefaultIntegrationSettings = (timestamp: string): AdminIntegrationSettings => ({
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
  supabaseUrl: '',
  supabaseAnonKey: '',
  supabaseEnabled: false,
  googleClientId: '',
  googleClientSecret: '',
  googleEnabled: false,
  hotmailClientId: '',
  hotmailClientSecret: '',
  hotmailEnabled: false,
  stripeSecretKey: '',
  stripePublishableKey: '',
  stripeWebhookSecret: '',
  stripeEnabled: false,
  updatedAt: timestamp,
});

const createId = (prefix: string) => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

const createDefaultPlans = (timestamp: string): AdminPlan[] => [
  {
    id: DEFAULT_PLAN_IDS.essencial,
    name: 'Essencial',
    monthlyPrice: 149,
    description: 'Agenda, pacientes e financeiro básico.',
    features: ['Agenda', 'Pacientes', 'Financeiro básico'],
    active: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  },
  {
    id: DEFAULT_PLAN_IDS.profissional,
    name: 'Profissional',
    monthlyPrice: 249,
    description: 'Tudo do Essencial com automações e marketing.',
    features: ['Tudo do Essencial', 'WhatsApp', 'Marketing'],
    active: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  },
  {
    id: DEFAULT_PLAN_IDS.clinicaPro,
    name: 'Clínica Pro',
    monthlyPrice: 399,
    description: 'Multiunidades, permissões avançadas e suporte premium.',
    features: ['Multiunidades', 'Permissões avançadas', 'Suporte premium'],
    active: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  },
];

const createDefaultClinics = (timestamp: string): AdminClinic[] => [
  {
    id: DEFAULT_CLINIC_IDS.matriz,
    name: 'Clínica Matriz',
    email: 'contato@clinicamatriz.com.br',
    phone: '(11) 3456-7890',
    city: 'São Paulo',
    planId: DEFAULT_PLAN_IDS.clinicaPro,
    status: 'active',
    notes: 'Unidade principal e referência da rede.',
    createdAt: timestamp,
    updatedAt: timestamp,
  },
  {
    id: DEFAULT_CLINIC_IDS.jardins,
    name: 'Clínica Jardins',
    email: 'recepcao@clinicajardins.com.br',
    phone: '(11) 3344-7788',
    city: 'São Paulo',
    planId: DEFAULT_PLAN_IDS.profissional,
    status: 'active',
    notes: 'Unidade com foco em atendimento premium.',
    createdAt: timestamp,
    updatedAt: timestamp,
  },
  {
    id: DEFAULT_CLINIC_IDS.elite,
    name: 'Clínica Elite',
    email: 'contato@clinicaelite.com.br',
    phone: '(21) 3222-5566',
    city: 'Rio de Janeiro',
    planId: DEFAULT_PLAN_IDS.essencial,
    status: 'paused',
    notes: 'Unidade em fase de expansão comercial.',
    createdAt: timestamp,
    updatedAt: timestamp,
  },
];

const createDefaultLogins = (timestamp: string): AdminLogin[] => [
  {
    id: 'login-admin',
    name: 'Maxwel Dias',
    email: ADMIN_LOGIN_EMAIL,
    clinicId: DEFAULT_CLINIC_IDS.matriz,
    planId: DEFAULT_PLAN_IDS.clinicaPro,
    role: 'owner',
    status: 'active',
    protected: true,
    lastAccess: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  },
  {
    id: 'login-recepcao',
    name: 'Paula Ribeiro',
    email: 'paula@clinicamatriz.com.br',
    clinicId: DEFAULT_CLINIC_IDS.matriz,
    planId: DEFAULT_PLAN_IDS.profissional,
    role: 'reception',
    status: 'active',
    protected: false,
    lastAccess: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  },
  {
    id: 'login-medico',
    name: 'Dr. André Santos',
    email: 'andre@clinicajardins.com.br',
    clinicId: DEFAULT_CLINIC_IDS.jardins,
    planId: DEFAULT_PLAN_IDS.profissional,
    role: 'doctor',
    status: 'active',
    protected: false,
    lastAccess: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  },
  {
    id: 'login-financeiro',
    name: 'Camila Rocha',
    email: 'financeiro@clinicaelite.com.br',
    clinicId: DEFAULT_CLINIC_IDS.elite,
    planId: DEFAULT_PLAN_IDS.essencial,
    role: 'finance',
    status: 'suspended',
    protected: false,
    lastAccess: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  },
];

const cloneDefaultAdminData = (): AdminData => {
  const timestamp = now();

  return {
    plans: createDefaultPlans(timestamp),
    clinics: createDefaultClinics(timestamp),
    logins: createDefaultLogins(timestamp),
    integrationsByUser: {
      [ADMIN_LOGIN_EMAIL]: createDefaultIntegrationSettings(timestamp),
    },
    updatedAt: timestamp,
  };
};

const safeParse = (value: string | null): AdminData | null => {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<AdminData>;

    if (!Array.isArray(parsed.plans) || !Array.isArray(parsed.clinics) || !Array.isArray(parsed.logins)) {
      return null;
    }

    return {
      plans: parsed.plans as AdminPlan[],
      clinics: parsed.clinics as AdminClinic[],
      logins: parsed.logins as AdminLogin[],
      integrationsByUser: (parsed.integrationsByUser as Record<string, AdminIntegrationSettings>) ?? {},
      updatedAt: parsed.updatedAt ?? now(),
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

  const stored = window.localStorage.getItem(ADMIN_DATA_STORAGE_KEY);
  const parsed = safeParse(stored);

  if (parsed) {
    return parsed;
  }

  const defaults = cloneDefaultAdminData();
  window.localStorage.setItem(ADMIN_DATA_STORAGE_KEY, JSON.stringify(defaults));
  return defaults;
}

export function persistAdminData(data: AdminData): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(ADMIN_DATA_STORAGE_KEY, JSON.stringify(data));
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
  updates: Partial<Pick<AdminClinic, 'name' | 'email' | 'phone' | 'city' | 'planId' | 'status' | 'notes'>>,
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
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return {
    ...data,
    clinics: [...data.clinics, newClinic],
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
  updates: Partial<Pick<AdminLogin, 'name' | 'email' | 'clinicId' | 'planId' | 'role' | 'status' | 'protected' | 'lastAccess'>>,
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

  return data.integrationsByUser[userEmail] ?? createDefaultIntegrationSettings(data.updatedAt);
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
