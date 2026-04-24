// ============================================
// LOCAL DATABASE - Clinic Organizer Pro
// ============================================
// Armazena dados localmente no navegador (localStorage)
// ============================================

export interface Patient {
  id: string;
  name: string;
  email?: string;
  phone: string;
  birthDate?: string;
  cpf?: string;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  medicalHistory?: string;
  allergies?: string;
  medications?: string;
  notes?: string;
  photoUrl?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  patientId?: string;
  patientName: string;
  patientPhone?: string;
  procedure: string;
  date: string;
  time: string;
  duration: number;
  professional: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
  value: number;
  notes?: string;
  reminderSent: number;
  createdAt: string;
  updatedAt: string;
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

export interface Campaign {
  id: string;
  name: string;
  type: 'sms' | 'whatsapp' | 'email';
  audience: 'all' | 'inactive' | 'no-appointment' | 'completed-treatment';
  message: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  scheduledDate?: string;
  sentDate?: string;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Professional {
  id: string;
  name: string;
  specialty?: string;
  phone?: string;
  email?: string;
  cro?: string;
  color: string;
  active: number;
  createdAt: string;
  updatedAt: string;
}

export interface Procedure {
  id: string;
  name: string;
  description?: string;
  duration: number;
  price: number;
  color: string;
  active: number;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  clinicName: string;
  clinicPhone: string;
  clinicAddress: string;
  appointmentDuration: number;
  workingHoursStart: string;
  workingHoursEnd: string;
  theme: 'light' | 'dark';
  currency: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: number;
  link?: string;
  createdAt: string;
}

// ============================================
// CLASSE PRINCIPAL
// ============================================

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
    const patients = this.getPatients();
    return patients.find(p => p.id === id);
  }

  savePatient(patient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>): Patient {
    const patients = this.getPatients();
    const newPatient: Patient = {
      ...patient,
      id: this.generateId(),
      createdAt: this.now(),
      updatedAt: this.now(),
    };
    patients.push(newPatient);
    localStorage.setItem(this.getKey('patients'), JSON.stringify(patients));
    return newPatient;
  }

  updatePatient(id: string, updates: Partial<Patient>): Patient | undefined {
    const patients = this.getPatients();
    const index = patients.findIndex(p => p.id === id);
    if (index === -1) return undefined;

    patients[index] = { ...patients[index], ...updates, updatedAt: this.now() };
    localStorage.setItem(this.getKey('patients'), JSON.stringify(patients));
    return patients[index];
  }

  deletePatient(id: string): boolean {
    const patients = this.getPatients();
    const filtered = patients.filter(p => p.id !== id);
    if (filtered.length === patients.length) return false;
    localStorage.setItem(this.getKey('patients'), JSON.stringify(filtered));
    return true;
  }

  searchPatients(query: string): Patient[] {
    const patients = this.getPatients();
    const q = query.toLowerCase();
    return patients.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      (p.email && p.email.toLowerCase().includes(q))
    );
  }

  // ============================================
  // CONSULTAS
  // ============================================

  getAppointments(): Appointment[] {
    const data = localStorage.getItem(this.getKey('appointments'));
    return data ? JSON.parse(data) : [];
  }

  getAppointment(id: string): Appointment | undefined {
    const appointments = this.getAppointments();
    return appointments.find(a => a.id === id);
  }

  getAppointmentsByDate(date: string): Appointment[] {
    const appointments = this.getAppointments();
    return appointments.filter(a => a.date === date);
  }

  getAppointmentsByPatient(patientId: string): Appointment[] {
    const appointments = this.getAppointments();
    return appointments.filter(a => a.patientId === patientId);
  }

  saveAppointment(appointment: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>): Appointment {
    const appointments = this.getAppointments();
    const newAppointment: Appointment = {
      ...appointment,
      id: this.generateId(),
      createdAt: this.now(),
      updatedAt: this.now(),
    };
    appointments.push(newAppointment);
    localStorage.setItem(this.getKey('appointments'), JSON.stringify(appointments));
    return newAppointment;
  }

  updateAppointment(id: string, updates: Partial<Appointment>): Appointment | undefined {
    const appointments = this.getAppointments();
    const index = appointments.findIndex(a => a.id === id);
    if (index === -1) return undefined;

    appointments[index] = { ...appointments[index], ...updates, updatedAt: this.now() };
    localStorage.setItem(this.getKey('appointments'), JSON.stringify(appointments));
    return appointments[index];
  }

  deleteAppointment(id: string): boolean {
    const appointments = this.getAppointments();
    const filtered = appointments.filter(a => a.id !== id);
    if (filtered.length === appointments.length) return false;
    localStorage.setItem(this.getKey('appointments'), JSON.stringify(filtered));
    return true;
  }

  // ============================================
  // FINANÇAS - RECEITAS
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

  deleteIncome(id: string): boolean {
    const incomes = this.getIncomes();
    const filtered = incomes.filter(i => i.id !== id);
    if (filtered.length === incomes.length) return false;
    localStorage.setItem(this.getKey('incomes'), JSON.stringify(filtered));
    return true;
  }

  getIncomesByDateRange(startDate: string, endDate: string): Income[] {
    const incomes = this.getIncomes();
    return incomes.filter(i => i.date >= startDate && i.date <= endDate);
  }

  // ============================================
  // FINANÇAS - DESPESAS
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

  deleteExpense(id: string): boolean {
    const expenses = this.getExpenses();
    const filtered = expenses.filter(e => e.id !== id);
    if (filtered.length === expenses.length) return false;
    localStorage.setItem(this.getKey('expenses'), JSON.stringify(filtered));
    return true;
  }

  getExpensesByDateRange(startDate: string, endDate: string): Expense[] {
    const expenses = this.getExpenses();
    return expenses.filter(e => e.date >= startDate && e.date <= endDate);
  }

  // ============================================
  // CAMPANHAS
  // ============================================

  getCampaigns(): Campaign[] {
    const data = localStorage.getItem(this.getKey('campaigns'));
    return data ? JSON.parse(data) : [];
  }

  saveCampaign(campaign: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>): Campaign {
    const campaigns = this.getCampaigns();
    const newCampaign: Campaign = {
      ...campaign,
      id: this.generateId(),
      createdAt: this.now(),
      updatedAt: this.now(),
    };
    campaigns.push(newCampaign);
    localStorage.setItem(this.getKey('campaigns'), JSON.stringify(campaigns));
    return newCampaign;
  }

  updateCampaign(id: string, updates: Partial<Campaign>): Campaign | undefined {
    const campaigns = this.getCampaigns();
    const index = campaigns.findIndex(c => c.id === id);
    if (index === -1) return undefined;

    campaigns[index] = { ...campaigns[index], ...updates, updatedAt: this.now() };
    localStorage.setItem(this.getKey('campaigns'), JSON.stringify(campaigns));
    return campaigns[index];
  }

  deleteCampaign(id: string): boolean {
    const campaigns = this.getCampaigns();
    const filtered = campaigns.filter(c => c.id !== id);
    if (filtered.length === campaigns.length) return false;
    localStorage.setItem(this.getKey('campaigns'), JSON.stringify(filtered));
    return true;
  }

  // ============================================
  // PROFISSIONAIS
  // ============================================

  getProfessionals(): Professional[] {
    const data = localStorage.getItem(this.getKey('professionals'));
    return data ? JSON.parse(data) : this.getDefaultProfessionals();
  }

  private getDefaultProfessionals(): Professional[] {
    const defaults: Professional[] = [
      {
        id: this.generateId(),
        name: 'Dr. João Silva',
        specialty: 'Clínico Geral',
        phone: '',
        email: '',
        cro: '',
        color: '#6366f1',
        active: 1,
        createdAt: this.now(),
        updatedAt: this.now(),
      },
    ];
    localStorage.setItem(this.getKey('professionals'), JSON.stringify(defaults));
    return defaults;
  }

  saveProfessional(professional: Omit<Professional, 'id' | 'createdAt' | 'updatedAt'>): Professional {
    const professionals = this.getProfessionals();
    const newProfessional: Professional = {
      ...professional,
      id: this.generateId(),
      createdAt: this.now(),
      updatedAt: this.now(),
    };
    professionals.push(newProfessional);
    localStorage.setItem(this.getKey('professionals'), JSON.stringify(professionals));
    return newProfessional;
  }

  updateProfessional(id: string, updates: Partial<Professional>): Professional | undefined {
    const professionals = this.getProfessionals();
    const index = professionals.findIndex(p => p.id === id);
    if (index === -1) return undefined;

    professionals[index] = { ...professionals[index], ...updates, updatedAt: this.now() };
    localStorage.setItem(this.getKey('professionals'), JSON.stringify(professionals));
    return professionals[index];
  }

  deleteProfessional(id: string): boolean {
    const professionals = this.getProfessionals();
    const filtered = professionals.filter(p => p.id !== id);
    if (filtered.length === professionals.length) return false;
    localStorage.setItem(this.getKey('professionals'), JSON.stringify(filtered));
    return true;
  }

  // ============================================
  // PROCEDIMENTOS
  // ============================================

  getProcedures(): Procedure[] {
    const data = localStorage.getItem(this.getKey('procedures'));
    return data ? JSON.parse(data) : this.getDefaultProcedures();
  }

  private getDefaultProcedures(): Procedure[] {
    const defaults: Procedure[] = [
      {
        id: this.generateId(),
        name: 'Consulta Geral',
        description: 'Consulta médica geral',
        duration: 60,
        price: 150,
        color: '#6366f1',
        active: 1,
        createdAt: this.now(),
        updatedAt: this.now(),
      },
      {
        id: this.generateId(),
        name: 'Retorno',
        description: 'Retorno de consulta',
        duration: 30,
        price: 100,
        color: '#10b981',
        active: 1,
        createdAt: this.now(),
        updatedAt: this.now(),
      },
    ];
    localStorage.setItem(this.getKey('procedures'), JSON.stringify(defaults));
    return defaults;
  }

  saveProcedure(procedure: Omit<Procedure, 'id' | 'createdAt' | 'updatedAt'>): Procedure {
    const procedures = this.getProcedures();
    const newProcedure: Procedure = {
      ...procedure,
      id: this.generateId(),
      createdAt: this.now(),
      updatedAt: this.now(),
    };
    procedures.push(newProcedure);
    localStorage.setItem(this.getKey('procedures'), JSON.stringify(procedures));
    return newProcedure;
  }

  updateProcedure(id: string, updates: Partial<Procedure>): Procedure | undefined {
    const procedures = this.getProcedures();
    const index = procedures.findIndex(p => p.id === id);
    if (index === -1) return undefined;

    procedures[index] = { ...procedures[index], ...updates, updatedAt: this.now() };
    localStorage.setItem(this.getKey('procedures'), JSON.stringify(procedures));
    return procedures[index];
  }

  deleteProcedure(id: string): boolean {
    const procedures = this.getProcedures();
    const filtered = procedures.filter(p => p.id !== id);
    if (filtered.length === procedures.length) return false;
    localStorage.setItem(this.getKey('procedures'), JSON.stringify(filtered));
    return true;
  }

  // ============================================
  // CONFIGURAÇÕES
  // ============================================

  getSettings(): Settings {
    const data = localStorage.getItem(this.getKey('settings'));
    if (data) return JSON.parse(data);

    const defaults: Settings = {
      clinicName: 'Clínica Organizador Pro',
      clinicPhone: '',
      clinicAddress: '',
      appointmentDuration: 60,
      workingHoursStart: '08:00',
      workingHoursEnd: '18:00',
      theme: 'light',
      currency: 'BRL',
    };
    this.saveSettings(defaults);
    return defaults;
  }

  saveSettings(settings: Settings): void {
    localStorage.setItem(this.getKey('settings'), JSON.stringify(settings));
  }

  updateSettings(updates: Partial<Settings>): Settings {
    const settings = this.getSettings();
    const updated = { ...settings, ...updates };
    this.saveSettings(updated);
    return updated;
  }

  // ============================================
  // NOTIFICAÇÕES
  // ============================================

  getNotifications(): Notification[] {
    const data = localStorage.getItem(this.getKey('notifications'));
    return data ? JSON.parse(data) : [];
  }

  getUnreadNotifications(): Notification[] {
    return this.getNotifications().filter(n => n.read === 0);
  }

  addNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Notification {
    const notifications = this.getNotifications();
    const newNotification: Notification = {
      ...notification,
      id: this.generateId(),
      createdAt: this.now(),
    };
    notifications.unshift(newNotification);
    localStorage.setItem(this.getKey('notifications'), JSON.stringify(notifications));
    return newNotification;
  }

  markNotificationAsRead(id: string): void {
    const notifications = this.getNotifications();
    const index = notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      notifications[index].read = 1;
      localStorage.setItem(this.getKey('notifications'), JSON.stringify(notifications));
    }
  }

  markAllNotificationsAsRead(): void {
    const notifications = this.getNotifications();
    notifications.forEach(n => n.read = 1);
    localStorage.setItem(this.getKey('notifications'), JSON.stringify(notifications));
  }

  deleteNotification(id: string): boolean {
    const notifications = this.getNotifications();
    const filtered = notifications.filter(n => n.id !== id);
    if (filtered.length === notifications.length) return false;
    localStorage.setItem(this.getKey('notifications'), JSON.stringify(filtered));
    return true;
  }

  // ============================================
  // LIMPEZA E UTILIDADES
  // ============================================

  clearAllData(): void {
    const keys = ['patients', 'appointments', 'incomes', 'expenses', 'campaigns', 'professionals', 'procedures', 'settings', 'notifications'];
    keys.forEach(key => localStorage.removeItem(this.getKey(key)));
  }

  exportData(): string {
    const data = {
      patients: this.getPatients(),
      appointments: this.getAppointments(),
      incomes: this.getIncomes(),
      expenses: this.getExpenses(),
      campaigns: this.getCampaigns(),
      professionals: this.getProfessionals(),
      procedures: this.getProcedures(),
      settings: this.getSettings(),
      notifications: this.getNotifications(),
      exportedAt: this.now(),
    };
    return JSON.stringify(data, null, 2);
  }

  importData(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.patients) localStorage.setItem(this.getKey('patients'), JSON.stringify(data.patients));
      if (data.appointments) localStorage.setItem(this.getKey('appointments'), JSON.stringify(data.appointments));
      if (data.incomes) localStorage.setItem(this.getKey('incomes'), JSON.stringify(data.incomes));
      if (data.expenses) localStorage.setItem(this.getKey('expenses'), JSON.stringify(data.expenses));
      if (data.campaigns) localStorage.setItem(this.getKey('campaigns'), JSON.stringify(data.campaigns));
      if (data.professionals) localStorage.setItem(this.getKey('professionals'), JSON.stringify(data.professionals));
      if (data.procedures) localStorage.setItem(this.getKey('procedures'), JSON.stringify(data.procedures));
      if (data.settings) localStorage.setItem(this.getKey('settings'), JSON.stringify(data.settings));
      if (data.notifications) localStorage.setItem(this.getKey('notifications'), JSON.stringify(data.notifications));
      return true;
    } catch {
      return false;
    }
  }
}

// Instância única para exportar
const DB = new LocalDatabase();
export default DB;
