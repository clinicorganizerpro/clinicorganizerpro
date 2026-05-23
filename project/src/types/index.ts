export type NavItem = {
  id: string;
  label: string;
  icon: string;
  path: string;
};

export type Patient = {
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsapp?: string;
  profilePhoto?: string;
  birthDate: string;
  cpf: string;
  sex: string;
  address: string; // Keeping for backward compatibility or full address string
  zipCode?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  emergencyContact?: string;
  emergencyRelation?: string;
  emergencyPhone?: string;
  allergies?: string;
  currentMedications?: string;
  medicalHistory?: string;
  observations: string;
  lastVisit: string;
  nextAppointment?: string;
  status: 'active' | 'inactive' | 'pending';
  totalSpent: number;
  procedures: string[];
  createdAt?: string;
};

export type Appointment = {
  id: string;
  patientName: string;
  patientId: string;
  procedure: string;
  date: string;
  time: string;
  duration: number;
  professional: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
  value: number;
  notes?: string;
  createdAt?: string;
};

export type Medication = {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
};

export type Prescription = {
  id: string;
  patientId: string;
  date: string;
  medications: Medication[];
  instructions: string;
  createdAt?: string;
};

export type ProcedurePhoto = {
  id: string;
  patientId: string;
  procedureName: string;
  photosBefore: string[];
  photosAfter: string[];
  videoUrl: string;
  videosBefore?: string[];
  videosAfter?: string[];
  observations: string;
  createdAt?: string;
};

export type FacialAssessment = {
  skinType?: string;
  fitzpatrick?: string;
  acne?: string;
  melasma?: boolean;
  rosacea?: boolean;
  sagging?: boolean;
  fineLines?: boolean;
  deepWrinkles?: boolean;
  facialAsymmetry?: boolean;
  doubleChin?: boolean;
  facialVolumeLoss?: boolean;
  skinQuality?: string;
  sensitivity?: string;
  scars?: boolean;
  enlargedPores?: boolean;
  oiliness?: string;
  agingDegree?: string;
};

export type EstheticProcedureDetails = {
  botox?: {
    region?: string;
    units?: string;
    brand?: string;
    followUp?: string;
  };
  pdoThreads?: {
    threadType?: string;
    quantity?: string;
    region?: string;
    objective?: string;
  };
  fullFace?: {
    strategy?: string;
    treatedAreas?: string;
    productAmount?: string;
  };
  skinCleaning?: {
    acneDegree?: string;
    extractionPerformed?: string;
    productsUsed?: string;
    skinReaction?: string;
  };
  [key: string]: Record<string, string | undefined> | undefined;
};

export type Message = {
  id: string;
  patientId: string;
  patientName: string;
  message: string;
  templateType: string;
  status: 'sent' | 'pending' | 'failed';
  sentAt?: string;
  createdAt?: string;
};

export type Campaign = {
  id: string;
  name: string;
  templateType: string;
  message: string;
  audience: 'all' | 'inactive' | 'recent' | 'vip';
  status: 'draft' | 'sent' | 'scheduled';
  sentCount: number;
  openCount: number;
  patientIds: string[];
  scheduledAt?: string;
  sentAt?: string;
  createdAt?: string;
};

export type Transaction = {
  id: string;
  description: string;
  category: string;
  type: 'income' | 'expense';
  amount: number;
  date: string;
  status: 'paid' | 'pending' | 'overdue';
  patient?: string;
  procedure?: string;
};

export type Income = {
  id: string;
  patientId?: string;
  patientName: string;
  service: string;
  paymentMethod: 'pix' | 'cartao' | 'dinheiro' | 'stripe';
  amount: number;
  status: 'paid' | 'pending';
  attendanceDate: string;
  observations: string;
  createdAt?: string;
};

export type Expense = {
  id: string;
  description: string;
  category: 'fixa' | 'variavel';
  amount: number;
  date: string;
  paymentMethod: 'pix' | 'cartao' | 'dinheiro' | 'transferencia' | 'outro';
  status: 'paid' | 'pending';
  observations: string;
  createdAt?: string;
};

export type FinancialSummary = {
  totalIncome: number;
  totalExpense: number;
  totalIncomePending: number;
  totalExpensePending: number;
  netProfit: number;
  profitMargin: number;
};

export type Professional = {
  id: string;
  name: string;
  specialty: string;
  email: string;
  phone: string;
  avatar?: string;
  active: boolean;
};

export type Anamnesis = {
  id: string;
  patientId: string;
  date: string;
  mainComplaint: string;
  medicalHistory: string;
  allergies: string;
  currentMedications: string;
  familyHistory: string;
  socialHistory: string;
  previousSurgeries: string;
  vitalSigns: {
    bloodPressure?: string;
    heartRate?: string;
    temperature?: string;
    weight?: string;
  };
  observations: string;
  facialAssessment?: FacialAssessment;
  estheticProcedures?: string[];
  procedureDetails?: EstheticProcedureDetails;
  clinicalNotes?: string;
  aestheticPhotosBefore?: string[];
  aestheticPhotosAfter?: string[];
  digitalSignature?: string;
  signatureDate?: string;
  createdAt?: string;
};

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export type NotificationCategory =
  | 'appointment'
  | 'patient'
  | 'financial'
  | 'reminder'
  | 'system'
  | 'update'
  | 'security'
  | 'sync'
  | 'ai'
  | 'marketing';

export type NotificationType = 'event' | 'reminder' | 'system' | 'update' | 'alert' | 'sync';

export type AppNotification = {
  id: string;
  type: NotificationType;
  category: NotificationCategory;

  title: string;
  message: string;

  createdAt: string;
  read: boolean;
  priority: NotificationPriority;

  relatedId?: string;
  relatedType?: string;

  actionUrl?: string;
  icon?: string;
};

export type Toast = {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
};
