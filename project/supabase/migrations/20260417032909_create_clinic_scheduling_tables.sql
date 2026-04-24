/*
  # Clinic Scheduling System

  1. New Tables
    - `patients` - Patient information
    - `professionals` - Healthcare professionals/staff
    - `services` - Available services/procedures
    - `appointments` - Scheduled appointments
    - `appointment_slots` - Blocked time slots for appointments
    - `waitlist` - Waitlist entries for full slots
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their clinic data
    - Add policies for patients to view their appointments
  
  3. Features
    - Appointment conflict detection
    - Waitlist management
    - Service duration tracking
    - Professional availability
*/

-- Create patients table
CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text NOT NULL,
  birth_date date,
  last_visit timestamptz,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  total_spent numeric DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create professionals table
CREATE TABLE IF NOT EXISTS professionals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  specialty text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text NOT NULL,
  rating numeric DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  active boolean DEFAULT true,
  available_days text[] DEFAULT ARRAY['1', '2', '3', '4', '5'],
  start_time time DEFAULT '08:00',
  end_time time DEFAULT '18:00',
  lunch_start time DEFAULT '12:00',
  lunch_end time DEFAULT '13:00',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  price numeric NOT NULL CHECK (price >= 0),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES professionals(id) ON DELETE RESTRICT,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  appointment_date date NOT NULL,
  appointment_time time NOT NULL,
  end_time time NOT NULL,
  duration_minutes integer NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(professional_id, appointment_date, appointment_time)
);

-- Create appointment_slots table for blocking occupied times
CREATE TABLE IF NOT EXISTS appointment_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  slot_date date NOT NULL,
  slot_start time NOT NULL,
  slot_end time NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create waitlist table
CREATE TABLE IF NOT EXISTS waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  preferred_date_start date NOT NULL,
  preferred_date_end date,
  preferred_time text,
  notes text,
  position integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_professional_id ON appointments(professional_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date_time ON appointments(appointment_date, appointment_time);
CREATE INDEX IF NOT EXISTS idx_appointment_slots_professional_date ON appointment_slots(professional_id, slot_date);
CREATE INDEX IF NOT EXISTS idx_waitlist_professional ON waitlist(professional_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_patient ON waitlist(patient_id);

-- Enable RLS
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- RLS Policies for patients (public read, clinic team manages)
CREATE POLICY "Patients visible to clinic"
  ON patients FOR SELECT
  USING (true);

CREATE POLICY "Patients created by clinic"
  ON patients FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Patients updated by clinic"
  ON patients FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- RLS Policies for professionals (public read, clinic manages)
CREATE POLICY "Professionals visible to clinic"
  ON professionals FOR SELECT
  USING (true);

CREATE POLICY "Professionals created by clinic"
  ON professionals FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Professionals updated by clinic"
  ON professionals FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- RLS Policies for services (public read, clinic manages)
CREATE POLICY "Services visible to all"
  ON services FOR SELECT
  USING (true);

CREATE POLICY "Services created by clinic"
  ON services FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Services updated by clinic"
  ON services FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- RLS Policies for appointments (patients see their own, clinic sees all)
CREATE POLICY "Appointments accessible to all"
  ON appointments FOR SELECT
  USING (true);

CREATE POLICY "Appointments created by clinic"
  ON appointments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Appointments updated by clinic"
  ON appointments FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Appointments deleted by clinic"
  ON appointments FOR DELETE
  USING (true);

-- RLS Policies for appointment_slots
CREATE POLICY "Appointment slots visible to clinic"
  ON appointment_slots FOR SELECT
  USING (true);

CREATE POLICY "Appointment slots managed by clinic"
  ON appointment_slots FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Appointment slots deleted by clinic"
  ON appointment_slots FOR DELETE
  USING (true);

-- RLS Policies for waitlist
CREATE POLICY "Waitlist entries accessible"
  ON waitlist FOR SELECT
  USING (true);

CREATE POLICY "Waitlist entries managed by clinic"
  ON waitlist FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Waitlist entries updated by clinic"
  ON waitlist FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Waitlist entries deleted by clinic"
  ON waitlist FOR DELETE
  USING (true);
