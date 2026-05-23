// Local Database - Clinic Organizer Pro
// Armazena dados no localStorage do navegador - SEM SUPABASE

export interface Patient {
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
  createdAt: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  procedure: string;
  date: string;
  time: string;
  duration: number;
  professional: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
  value: number;
  notes: string;
  createdAt: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  date: string;
  medications: { name: string; dosage: string; frequency: string; duration: string }[];
  instructions: string;
  createdAt: string;
}

export interface ProcedurePhoto {
  id: string;
  patientId: string;
  procedureName: string;
  photosBefore: string[];
  photosAfter: string[];
  videoUrl: string;
  videosBefore?: string[];
  videosAfter?: string[];
  observations: string;
  createdAt: string;
}

export interface Anamnesis {
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
    bloodPressure: string;
    heartRate: string;
    temperature: string;
    weight: string;
  };
  observations: string;
  createdAt: string;
}

export interface Message {
  id: string;
  patientId: string;
  patientName: string;
  message: string;
  templateType: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  sentAt?: string;
  createdAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  templateType: string;
  message: string;
  audience: 'all' | 'inactive' | 'no-appointment' | 'completed-treatment';
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  sentCount: number;
  openCount: number;
  patientIds: string[];
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface Income {
  id: string;
  description: string;
  amount: number;
  date: string;
  category?: string;
  paymentMethod?: string;
  patientId?: string;
  patientName?: string;
  appointmentId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category?: string;
  paymentMethod?: string;
  supplier?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

class LocalDatabase {
  private prefix = 'clinic_pro_';

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private now(): string {
    return new Date().toISOString();
  }

  // ============================================
  // PACIENTES
  // ============================================

  getPatients(): Patient[] {
    const data = localStorage.getItem(this.getKey('patients'));
    return data ? JSON.parse(data) : [];
  }

  getPatient(id: string): Patient | undefined {
    return this.getPatients().find(p => p.id === id);
  }

  savePatient(patient: Omit<Patient, 'id' | 'createdAt'>): Patient {
    const patients = this.getPatients();
    const newPatient: Patient = {
      ...patient,
      id: this.generateId(),
      createdAt: this.now(),
    };
    patients.push(newPatient);
    localStorage.setItem(this.getKey('patients'), JSON.stringify(patients));
    return newPatient;
  }

  updatePatient(id: string, updates: Partial<Patient>): Patient | undefined {
    const patients = this.getPatients();
    const index = patients.findIndex(p => p.id === id);
    if (index === -1) return undefined;
    patients[index] = { ...patients[index], ...updates };
    localStorage.setItem(this.getKey('patients'), JSON.stringify(patients));
    return patients[index];
  }

  deletePatient(id: string): void {
    const patients = this.getPatients();
    const filtered = patients.filter(p => p.id !== id);
    localStorage.setItem(this.getKey('patients'), JSON.stringify(filtered));
  }

  // ============================================
  // CONSULTAS
  // ============================================

  getAppointments(): Appointment[] {
    const data = localStorage.getItem(this.getKey('appointments'));
    return data ? JSON.parse(data) : [];
  }

  getAppointment(id: string): Appointment | undefined {
    return this.getAppointments().find(a => a.id === id);
  }

  saveAppointment(appointment: Omit<Appointment, 'id' | 'createdAt'>): Appointment {
    const appointments = this.getAppointments();
    const newAppointment: Appointment = {
      ...appointment,
      id: this.generateId(),
      createdAt: this.now(),
    };
    appointments.push(newAppointment);
    localStorage.setItem(this.getKey('appointments'), JSON.stringify(appointments));
    return newAppointment;
  }

  updateAppointment(id: string, updates: Partial<Appointment>): Appointment | undefined {
    const appointments = this.getAppointments();
    const index = appointments.findIndex(a => a.id === id);
    if (index === -1) return undefined;
    appointments[index] = { ...appointments[index], ...updates };
    localStorage.setItem(this.getKey('appointments'), JSON.stringify(appointments));
    return appointments[index];
  }

  deleteAppointment(id: string): void {
    const appointments = this.getAppointments();
    const filtered = appointments.filter(a => a.id !== id);
    localStorage.setItem(this.getKey('appointments'), JSON.stringify(filtered));
  }

  // ============================================
  // RECEITAS
  // ============================================

  getPrescriptions(): Prescription[] {
    const data = localStorage.getItem(this.getKey('prescriptions'));
    return data ? JSON.parse(data) : [];
  }

  savePrescription(prescription: Omit<Prescription, 'id' | 'createdAt'>): Prescription {
    const prescriptions = this.getPrescriptions();
    const newPrescription: Prescription = {
      ...prescription,
      id: this.generateId(),
      createdAt: this.now(),
    };
    prescriptions.push(newPrescription);
    localStorage.setItem(this.getKey('prescriptions'), JSON.stringify(prescriptions));
    return newPrescription;
  }

  deletePrescription(id: string): void {
    const prescriptions = this.getPrescriptions();
    const filtered = prescriptions.filter(p => p.id !== id);
    localStorage.setItem(this.getKey('prescriptions'), JSON.stringify(filtered));
  }

  // ============================================
  // FOTOS DE PROCEDIMENTOS
  // ============================================

  getProcedurePhotos(): ProcedurePhoto[] {
    const data = localStorage.getItem(this.getKey('procedure_photos'));
    return data ? JSON.parse(data) : [];
  }

  saveProcedurePhoto(photo: Omit<ProcedurePhoto, 'id' | 'createdAt'>): ProcedurePhoto {
    const photos = this.getProcedurePhotos();
    const newPhoto: ProcedurePhoto = {
      ...photo,
      id: this.generateId(),
      createdAt: this.now(),
    };
    photos.push(newPhoto);
    localStorage.setItem(this.getKey('procedure_photos'), JSON.stringify(photos));
    return newPhoto;
  }

  deleteProcedurePhoto(id: string): void {
    const photos = this.getProcedurePhotos();
    const filtered = photos.filter(p => p.id !== id);
    localStorage.setItem(this.getKey('procedure_photos'), JSON.stringify(filtered));
  }

  // ============================================
  // ANAMNESES
  // ============================================

  getAnamneses(): Anamnesis[] {
    const data = localStorage.getItem(this.getKey('anamneses'));
    return data ? JSON.parse(data) : [];
  }

  saveAnamnesis(anamnesis: Omit<Anamnesis, 'id' | 'createdAt'>): Anamnesis {
    const anamneses = this.getAnamneses();
    const newAnamnesis: Anamnesis = {
      ...anamnesis,
      id: this.generateId(),
      createdAt: this.now(),
    };
    anamneses.push(newAnamnesis);
    localStorage.setItem(this.getKey('anamneses'), JSON.stringify(anamneses));
    return newAnamnesis;
  }

  updateAnamnesis(id: string, updates: Partial<Anamnesis>): Anamnesis | undefined {
    const anamneses = this.getAnamneses();
    const index = anamneses.findIndex(a => a.id === id);
    if (index === -1) return undefined;
    anamneses[index] = { ...anamneses[index], ...updates };
    localStorage.setItem(this.getKey('anamneses'), JSON.stringify(anamneses));
    return anamneses[index];
  }

  deleteAnamnesis(id: string): void {
    const anamneses = this.getAnamneses();
    const filtered = anamneses.filter(a => a.id !== id);
    localStorage.setItem(this.getKey('anamneses'), JSON.stringify(filtered));
  }

  // ============================================
  // MENSAGENS
  // ============================================

  getMessages(): Message[] {
    const data = localStorage.getItem(this.getKey('messages'));
    return data ? JSON.parse(data) : [];
  }

  saveMessage(message: Omit<Message, 'id' | 'createdAt'>): Message {
    const messages = this.getMessages();
    const newMessage: Message = {
      ...message,
      id: this.generateId(),
      createdAt: this.now(),
    };
    messages.push(newMessage);
    localStorage.setItem(this.getKey('messages'), JSON.stringify(messages));
    return newMessage;
  }

  // ============================================
  // CAMPANHAS
  // ============================================

  getCampaigns(): Campaign[] {
    const data = localStorage.getItem(this.getKey('campaigns'));
    return data ? JSON.parse(data) : [];
  }

  saveCampaign(campaign: Omit<Campaign, 'id' | 'createdAt'>): Campaign {
    const campaigns = this.getCampaigns();
    const newCampaign: Campaign = {
      ...campaign,
      id: this.generateId(),
      createdAt: this.now(),
    };
    campaigns.push(newCampaign);
    localStorage.setItem(this.getKey('campaigns'), JSON.stringify(campaigns));
    return newCampaign;
  }

  updateCampaign(id: string, updates: Partial<Campaign>): Campaign | undefined {
    const campaigns = this.getCampaigns();
    const index = campaigns.findIndex(c => c.id === id);
    if (index === -1) return undefined;
    campaigns[index] = { ...campaigns[index], ...updates };
    localStorage.setItem(this.getKey('campaigns'), JSON.stringify(campaigns));
    return campaigns[index];
  }

  // ============================================
  // NOTIFICAÇÕES
  // ============================================

  getNotifications(): AppNotification[] {
    const data = localStorage.getItem(this.getKey('notifications'));
    return data ? JSON.parse(data) : [];
  }

  saveNotification(notification: Omit<AppNotification, 'id' | 'time' | 'read'>): AppNotification {
    const notifications = this.getNotifications();
    const newNotification: AppNotification = {
      ...notification,
      id: this.generateId(),
      time: this.now(),
      read: false,
    };
    notifications.unshift(newNotification);
    localStorage.setItem(this.getKey('notifications'), JSON.stringify(notifications));
    return newNotification;
  }

  markNotificationRead(id: string): void {
    const notifications = this.getNotifications();
    const index = notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      notifications[index].read = true;
      localStorage.setItem(this.getKey('notifications'), JSON.stringify(notifications));
    }
  }

  // ============================================
  // RECEITAS FINANCEIRAS
  // ============================================

  getIncomes(): Income[] {
    const data = localStorage.getItem(this.getKey('incomes'));
    return data ? JSON.parse(data) : [];
  }

  saveIncome(income: Omit<Income, 'id' | 'createdAt' | 'updatedAt'>): Income {
    const incomes = this.getIncomes();
    const newIncome: Income = {
      ...income,
      id: this.generateId(),
      createdAt: this.now(),
      updatedAt: this.now(),
    };
    incomes.push(newIncome);
    localStorage.setItem(this.getKey('incomes'), JSON.stringify(incomes));
    return newIncome;
  }

  updateIncome(id: string, updates: Partial<Income>): Income | undefined {
    const incomes = this.getIncomes();
    const index = incomes.findIndex(i => i.id === id);
    if (index === -1) return undefined;
    incomes[index] = { ...incomes[index], ...updates, updatedAt: this.now() };
    localStorage.setItem(this.getKey('incomes'), JSON.stringify(incomes));
    return incomes[index];
  }

  deleteIncome(id: string): void {
    const incomes = this.getIncomes();
    const filtered = incomes.filter(i => i.id !== id);
    localStorage.setItem(this.getKey('incomes'), JSON.stringify(filtered));
  }

  // ============================================
  // DESPESAS
  // ============================================

  getExpenses(): Expense[] {
    const data = localStorage.getItem(this.getKey('expenses'));
    return data ? JSON.parse(data) : [];
  }

  saveExpense(expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Expense {
    const expenses = this.getExpenses();
    const newExpense: Expense = {
      ...expense,
      id: this.generateId(),
      createdAt: this.now(),
      updatedAt: this.now(),
    };
    expenses.push(newExpense);
    localStorage.setItem(this.getKey('expenses'), JSON.stringify(expenses));
    return newExpense;
  }

  updateExpense(id: string, updates: Partial<Expense>): Expense | undefined {
    const expenses = this.getExpenses();
    const index = expenses.findIndex(e => e.id === id);
    if (index === -1) return undefined;
    expenses[index] = { ...expenses[index], ...updates, updatedAt: this.now() };
    localStorage.setItem(this.getKey('expenses'), JSON.stringify(expenses));
    return expenses[index];
  }

  deleteExpense(id: string): void {
    const expenses = this.getExpenses();
    const filtered = expenses.filter(e => e.id !== id);
    localStorage.setItem(this.getKey('expenses'), JSON.stringify(filtered));
  }

  // ============================================
  // EXPORTAR/IMPORTAR
  // ============================================

  exportAll(): string {
    return JSON.stringify({
      patients: this.getPatients(),
      appointments: this.getAppointments(),
      prescriptions: this.getPrescriptions(),
      procedurePhotos: this.getProcedurePhotos(),
      anamneses: this.getAnamneses(),
      messages: this.getMessages(),
      campaigns: this.getCampaigns(),
      notifications: this.getNotifications(),
      incomes: this.getIncomes(),
      expenses: this.getExpenses(),
      exportedAt: this.now(),
    }, null, 2);
  }

  importAll(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.patients) localStorage.setItem(this.getKey('patients'), JSON.stringify(data.patients));
      if (data.appointments) localStorage.setItem(this.getKey('appointments'), JSON.stringify(data.appointments));
      if (data.prescriptions) localStorage.setItem(this.getKey('prescriptions'), JSON.stringify(data.prescriptions));
      if (data.procedurePhotos) localStorage.setItem(this.getKey('procedure_photos'), JSON.stringify(data.procedurePhotos));
      if (data.anamneses) localStorage.setItem(this.getKey('anamneses'), JSON.stringify(data.anamneses));
      if (data.messages) localStorage.setItem(this.getKey('messages'), JSON.stringify(data.messages));
      if (data.campaigns) localStorage.setItem(this.getKey('campaigns'), JSON.stringify(data.campaigns));
      if (data.notifications) localStorage.setItem(this.getKey('notifications'), JSON.stringify(data.notifications));
      if (data.incomes) localStorage.setItem(this.getKey('incomes'), JSON.stringify(data.incomes));
      if (data.expenses) localStorage.setItem(this.getKey('expenses'), JSON.stringify(data.expenses));
      return true;
    } catch { return false; }
  }

  clearAll(): void {
    ['patients', 'appointments', 'prescriptions', 'procedure_photos', 'anamneses', 'messages', 'campaigns', 'notifications', 'incomes', 'expenses'].forEach(k => {
      localStorage.removeItem(this.getKey(k));
    });
  }
}

const DB = new LocalDatabase();
export default DB;
