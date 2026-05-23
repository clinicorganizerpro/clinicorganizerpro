-- Schema for CliniManager with LibSQL/Bolt Database

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  is_admin INTEGER DEFAULT 0,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Clinics table
CREATE TABLE IF NOT EXISTS clinics (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  cnpj TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT,
  subscription_status TEXT,
  current_period_start TEXT,
  current_period_end TEXT,
  trial_ends_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- Services table
CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL,
  name TEXT NOT NULL,
  price REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(clinic_id) REFERENCES clinics(id)
);

-- Financial data table
CREATE TABLE IF NOT EXISTS clinic_financial_data (
  id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  to_receive REAL DEFAULT 0,
  received REAL DEFAULT 0,
  pending REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(clinic_id) REFERENCES clinics(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- Stripe customers table
CREATE TABLE IF NOT EXISTS stripe_customers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  clinic_id TEXT,
  stripe_customer_id TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(clinic_id) REFERENCES clinics(id)
);

-- Payments table
CREATE TABLE IF NOT EXISTS saas_payments (
  id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  stripe_payment_id TEXT UNIQUE,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'BRL',
  status TEXT DEFAULT 'pending',
  description TEXT,
  customer_name TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(clinic_id) REFERENCES clinics(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  clinic_id TEXT,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  birth_date TEXT,
  status TEXT DEFAULT 'active',
  total_spent REAL DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(clinic_id) REFERENCES clinics(id)
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  clinic_id TEXT,
  patient_id TEXT,
  service_id TEXT,
  appointment_date TEXT NOT NULL,
  appointment_time TEXT NOT NULL,
  end_time TEXT,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(clinic_id) REFERENCES clinics(id),
  FOREIGN KEY(patient_id) REFERENCES patients(id),
  FOREIGN KEY(service_id) REFERENCES services(id)
);

-- Prescriptions table
CREATE TABLE IF NOT EXISTS prescriptions (
  id TEXT PRIMARY KEY,
  clinic_id TEXT,
  patient_id TEXT,
  date TEXT DEFAULT CURRENT_DATE,
  medications TEXT,
  instructions TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(clinic_id) REFERENCES clinics(id),
  FOREIGN KEY(patient_id) REFERENCES patients(id)
);

-- Procedure photos table
CREATE TABLE IF NOT EXISTS procedure_photos (
  id TEXT PRIMARY KEY,
  clinic_id TEXT,
  patient_id TEXT,
  procedure_name TEXT,
  photos_before TEXT,
  photos_after TEXT,
  video_url TEXT,
  observations TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(clinic_id) REFERENCES clinics(id),
  FOREIGN KEY(patient_id) REFERENCES patients(id)
);

-- Anamneses table
CREATE TABLE IF NOT EXISTS anamneses (
  id TEXT PRIMARY KEY,
  clinic_id TEXT,
  patient_id TEXT,
  date TEXT,
  main_complaint TEXT,
  medical_history TEXT,
  allergies TEXT,
  current_medications TEXT,
  family_history TEXT,
  social_history TEXT,
  previous_surgeries TEXT,
  vital_signs TEXT,
  observations TEXT,
  facial_assessment TEXT,
  esthetic_procedures TEXT,
  procedure_details TEXT,
  clinical_notes TEXT,
  aesthetic_photos_before TEXT,
  aesthetic_photos_after TEXT,
  digital_signature TEXT,
  signature_date TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(clinic_id) REFERENCES clinics(id),
  FOREIGN KEY(patient_id) REFERENCES patients(id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  clinic_id TEXT,
  patient_id TEXT,
  patient_name TEXT,
  message TEXT,
  template_type TEXT,
  status TEXT DEFAULT 'pending',
  sent_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(clinic_id) REFERENCES clinics(id),
  FOREIGN KEY(patient_id) REFERENCES patients(id)
);

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  clinic_id TEXT,
  name TEXT,
  template_type TEXT,
  message TEXT,
  audience TEXT DEFAULT 'all',
  status TEXT DEFAULT 'draft',
  sent_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  patient_ids TEXT,
  scheduled_at TEXT,
  sent_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(clinic_id) REFERENCES clinics(id)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  clinic_id TEXT,
  title TEXT,
  message TEXT,
  type TEXT DEFAULT 'info',
  read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(clinic_id) REFERENCES clinics(id)
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  clinic_id TEXT,
  description TEXT,
  category TEXT,
  type TEXT,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'BRL',
  transaction_date TEXT DEFAULT CURRENT_DATE,
  due_date TEXT,
  paid_date TEXT,
  status TEXT DEFAULT 'pending',
  payment_method TEXT,
  patient_id TEXT,
  patient_name TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(clinic_id) REFERENCES clinics(id),
  FOREIGN KEY(patient_id) REFERENCES patients(id)
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  clinic_id TEXT,
  invoice_number TEXT UNIQUE,
  patient_id TEXT,
  patient_name TEXT,
  issue_date TEXT DEFAULT CURRENT_DATE,
  due_date TEXT,
  paid_date TEXT,
  total_amount REAL NOT NULL,
  paid_amount REAL DEFAULT 0,
  status TEXT DEFAULT 'issued',
  description TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(clinic_id) REFERENCES clinics(id),
  FOREIGN KEY(patient_id) REFERENCES patients(id)
);

-- Payment methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id TEXT PRIMARY KEY,
  clinic_id TEXT,
  type TEXT,
  name TEXT,
  card_last_four TEXT,
  card_brand TEXT,
  is_default INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(clinic_id) REFERENCES clinics(id)
);

-- Professionals table
CREATE TABLE IF NOT EXISTS professionals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  specialty TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  rating REAL DEFAULT 0,
  active INTEGER DEFAULT 1,
  available_days TEXT,
  start_time TEXT DEFAULT '08:00:00',
  end_time TEXT DEFAULT '18:00:00',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Waitlist table
CREATE TABLE IF NOT EXISTS waitlist (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  professional_id TEXT,
  service_id TEXT,
  preferred_date_start TEXT,
  preferred_date_end TEXT,
  preferred_time TEXT,
  notes TEXT,
  position INTEGER,
  contact_phone TEXT,
  contact_email TEXT,
  notification_sent INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(patient_id) REFERENCES patients(id),
  FOREIGN KEY(professional_id) REFERENCES professionals(id),
  FOREIGN KEY(service_id) REFERENCES services(id)
);

-- Availability snapshots table
CREATE TABLE IF NOT EXISTS availability_snapshots (
  id TEXT PRIMARY KEY,
  professional_id TEXT,
  snapshot_date TEXT,
  total_slots INTEGER,
  available_slots INTEGER,
  urgency_level TEXT,
  captured_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(professional_id) REFERENCES professionals(id)
);

-- Calendar settings table
CREATE TABLE IF NOT EXISTS calendar_settings (
  id TEXT PRIMARY KEY,
  professional_id TEXT UNIQUE,
  slot_interval_minutes INTEGER DEFAULT 30,
  buffer_between_appointments INTEGER DEFAULT 10,
  max_daily_appointments INTEGER DEFAULT 20,
  show_weekends INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(professional_id) REFERENCES professionals(id)
);

-- Appointment slots table
CREATE TABLE IF NOT EXISTS appointment_slots (
  id TEXT PRIMARY KEY,
  appointment_id TEXT,
  professional_id TEXT,
  slot_date TEXT,
  slot_start TEXT,
  slot_end TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(appointment_id) REFERENCES appointments(id),
  FOREIGN KEY(professional_id) REFERENCES professionals(id)
);

-- Waitlist notifications table
CREATE TABLE IF NOT EXISTS waitlist_notifications (
  id TEXT PRIMARY KEY,
  waitlist_id TEXT,
  patient_id TEXT,
  professional_id TEXT,
  notification_type TEXT,
  message TEXT,
  sent_at TEXT DEFAULT CURRENT_TIMESTAMP,
  read_at TEXT,
  conversion_success INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(waitlist_id) REFERENCES waitlist(id),
  FOREIGN KEY(patient_id) REFERENCES patients(id),
  FOREIGN KEY(professional_id) REFERENCES professionals(id)
);

-- Clinic subscriptions table
CREATE TABLE IF NOT EXISTS clinic_subscriptions (
  id TEXT PRIMARY KEY,
  clinic_id TEXT,
  plan_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT DEFAULT 'active',
  start_date TEXT DEFAULT CURRENT_TIMESTAMP,
  end_date TEXT,
  auto_renew INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(clinic_id) REFERENCES clinics(id)
);

-- Subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE,
  stripe_price_id TEXT UNIQUE,
  monthly_price REAL,
  annual_price REAL,
  features TEXT,
  max_users INTEGER DEFAULT 1,
  max_patients INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Clinic settings table
CREATE TABLE IF NOT EXISTS clinic_settings (
  id TEXT PRIMARY KEY,
  clinic_id TEXT UNIQUE,
  clinic_name TEXT,
  clinic_phone TEXT,
  clinic_email TEXT,
  clinic_address TEXT,
  clinic_city TEXT,
  clinic_state TEXT,
  clinic_cnpj TEXT,
  clinic_logo_url TEXT,
  notifications_email INTEGER DEFAULT 1,
  notifications_sms INTEGER DEFAULT 0,
  notifications_whatsapp INTEGER DEFAULT 1,
  notifications_appointment INTEGER DEFAULT 1,
  notifications_payment INTEGER DEFAULT 1,
  team_members_limit INTEGER DEFAULT 1,
  security_two_factor INTEGER DEFAULT 0,
  security_password_reset_required INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(clinic_id) REFERENCES clinics(id)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_clinics_user_id ON clinics(user_id);
CREATE INDEX IF NOT EXISTS idx_services_clinic_id ON services(clinic_id);
CREATE INDEX IF NOT EXISTS idx_financial_data_clinic_id ON clinic_financial_data(clinic_id);
CREATE INDEX IF NOT EXISTS idx_financial_data_user_id ON clinic_financial_data(user_id);
CREATE INDEX IF NOT EXISTS idx_saas_payments_clinic_id ON saas_payments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_saas_payments_user_id ON saas_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_user_id ON stripe_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_patients_clinic_id ON patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id ON appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_transactions_clinic_id ON transactions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_messages_clinic_id ON messages(clinic_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_clinic_id ON campaigns(clinic_id);
CREATE INDEX IF NOT EXISTS idx_notifications_clinic_id ON notifications(clinic_id);

-- Clear any existing test transactions
DELETE FROM transactions WHERE patient_id IS NULL;

-- Insert default admin users
INSERT OR IGNORE INTO users (id, email, full_name, is_admin, password_hash)
VALUES
  ('admin_001', 'max.trance@hotmail.com', 'Admin User', 1, '3b9a8e'),
  ('user_001', 'teste@teste.com', 'Test User', 0, '18f0e6');
