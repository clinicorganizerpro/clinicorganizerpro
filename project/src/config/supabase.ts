/**
 * CONFIGURAÇÃO DO SUPABASE
 * 
 * Para ativar o Supabase:
 * 1. Crie uma conta em https://supabase.com
 * 2. Crie um novo projeto
 * 3. Copie a URL e a chave anônima (anon key) do projeto
 * 4. Cole os valores abaixo
 * 5. Descomente o código do SupabaseClient
 * 6. Implemente as funções de API usando o cliente
 */

// ─── Credenciais do Supabase ────────────────────────────────────────────────

export const SUPABASE_URL = 'SUA_URL_DO_SUPABASE';
export const SUPABASE_ANON_KEY = 'SUA_CHAVE_ANONIMA_DO_SUPABASE';

// ─── Tabelas do Banco de Dados ──────────────────────────────────────────────

/**
 * ESTRUTURA DO BANCO DE DADOS
 *
 * Execute os scripts SQL abaixo no SQL Editor do Supabase para criar as tabelas.
 */

/*
-- ============================================
-- TABELA: patients (Pacientes)
-- ============================================
CREATE TABLE patients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  birthDate TEXT,
  cpf TEXT,
  gender TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postalCode TEXT,
  medicalHistory TEXT,
  allergies TEXT,
  medications TEXT,
  notes TEXT,
  photoUrl TEXT,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABELA: appointments (Consultas)
-- ============================================
CREATE TABLE appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patientId UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  patientName TEXT NOT NULL,
  procedure TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  duration INTEGER DEFAULT 60,
  professional TEXT NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no-show')),
  value DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABELA: financial_incomes (Receitas)
-- ============================================
CREATE TABLE financial_incomes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  date TEXT NOT NULL,
  category TEXT,
  paymentMethod TEXT,
  patientId UUID REFERENCES patients(id) ON DELETE SET NULL,
  patientName TEXT,
  notes TEXT,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABELA: financial_expenses (Despesas)
-- ============================================
CREATE TABLE financial_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  date TEXT NOT NULL,
  category TEXT,
  paymentMethod TEXT,
  supplier TEXT,
  notes TEXT,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABELA: campaigns (Campanhas de Marketing)
-- ============================================
CREATE TABLE campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sms', 'whatsapp', 'email')),
  audience TEXT NOT NULL CHECK (audience IN ('all', 'inactive', 'no-appointment', 'completed-treatment')),
  message TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'failed')),
  scheduledDate TEXT,
  sentDate TIMESTAMP WITH TIME ZONE,
  sentCount INTEGER DEFAULT 0,
  failedCount INTEGER DEFAULT 0,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABELA: notifications (Notificações)
-- ============================================
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  read INTEGER DEFAULT 0,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABELA: anamnesis (Anamneses)
-- ============================================
CREATE TABLE anamnesis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patientId UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  answers JSONB,
  notes TEXT,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- POLICIES DE SEGURANÇA (RLS)
-- ============================================
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE anamnesis ENABLE ROW LEVEL SECURITY;

-- Permissão para usuários autenticados (usuários podem ver/editar apenas seus próprios dados)
CREATE POLICY "Usuários autenticados gerenciam seus próprios pacientes"
  ON patients FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados gerenciam suas próprias consultas"
  ON appointments FOR ALL
  TO authenticated
  USING (true);

-- Permissão pública para dados (descomente se quiser que funcione sem login)
CREATE POLICY "Dados públicos - pacientes"
  ON patients FOR ALL
  TO public
  USING (true);

CREATE POLICY "Dados públicos - consultas"
  ON appointments FOR ALL
  TO public
  USING (true);

CREATE POLICY "Dados públicos - receitas"
  ON financial_incomes FOR ALL
  TO public
  USING (true);

CREATE POLICY "Dados públicos - despesas"
  ON financial_expenses FOR ALL
  TO public
  USING (true);

CREATE POLICY "Dados públicos - campanhas"
  ON campaigns FOR ALL
  TO public
  USING (true);

CREATE POLICY "Dados públicos - notificações"
  ON notifications FOR ALL
  TO public
  USING (true);

CREATE POLICY "Dados públicos - anamneses"
  ON anamnesis FOR ALL
  TO public
  USING (true);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================
CREATE INDEX idx_appointments_date ON appointments(date);
CREATE INDEX idx_appointments_patientId ON appointments(patientId);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_financial_incomes_date ON financial_incomes(date);
CREATE INDEX idx_financial_expenses_date ON financial_expenses(date);
CREATE INDEX idx_anamnesis_patientId ON anamnesis(patientId);
*/

// ─── Cliente Supabase (descomente quando tiver as credenciais) ─────────────

/*
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Funções de API de Exemplo ─────────────────────────────────────────────

// Pacientes
export async function fetchPatients() {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .order('createdAt', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function createPatient(patient: any) {
  const { data, error } = await supabase
    .from('patients')
    .insert([patient])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updatePatient(id: string, patient: any) {
  const { data, error } = await supabase
    .from('patients')
    .update(patient)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deletePatient(id: string) {
  const { error } = await supabase
    .from('patients')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// Consultas
export async function fetchAppointments() {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .order('date', { ascending: true });
  
  if (error) throw error;
  return data;
}

export async function createAppointment(appointment: any) {
  const { data, error } = await supabase
    .from('appointments')
    .insert([appointment])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateAppointment(id: string, appointment: any) {
  const { data, error } = await supabase
    .from('appointments')
    .update(appointment)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteAppointment(id: string) {
  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// Receitas
export async function fetchIncomes() {
  const { data, error } = await supabase
    .from('financial_incomes')
    .select('*')
    .order('date', { ascending: false });
  
  if (error) throw error;
  return data;
}

// Despesas
export async function fetchExpenses() {
  const { data, error } = await supabase
    .from('financial_expenses')
    .select('*')
    .order('date', { ascending: false });
  
  if (error) throw error;
  return data;
}

// Campanhas
export async function fetchCampaigns() {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .order('createdAt', { ascending: false });
  
  if (error) throw error;
  return data;
}

// Notificações
export async function fetchNotifications() {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('createdAt', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function markNotificationAsRead(id: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: 1 })
    .eq('id', id);
  
  if (error) throw error;
}
*/
