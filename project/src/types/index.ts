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
  birthDate: string;
  cpf: string;
  sex: string;
  address: string;
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
  observations: string;
  createdAt?: string;
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
  createdAt?: string;
};

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'appointment' | 'payment' | 'alert' | 'info';
};

export type Toast = {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
};
