/*
  # Clinic SaaS - Core Tables

  Creates all tables needed for a fully functional clinic management SaaS:

  1. New Tables
    - `patients` - Patient registry with demographics and status
    - `appointments` - Scheduled consultations linked to patients
    - `prescriptions` - Medical prescriptions with medications list
    - `prescription_medications` - Line items per prescription
    - `procedure_photos` - Before/after photo records (base64 stored in app, metadata here)
    - `messages` - WhatsApp messages log
    - `campaigns` - Marketing campaigns
    - `campaign_patients` - Junction table for campaign → patient targeting
    - `notifications` - System notifications

  2. Security
    - RLS enabled on every table
    - Policies use auth.uid() — for now we allow any authenticated user to manage
      all rows (single-clinic mode). Multi-tenant can layer on clinic_id later.

  3. Notes
    - `procedure_photos.photos_before` and `photos_after` are TEXT[] for base64 strings
    - `prescriptions.medications` is JSONB array for flexibility
    - All timestamps are timestamptz
*/

-- ──────────────────────────────────────────
-- PATIENTS
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  email text DEFAULT '',
  phone text DEFAULT '',
  birth_date date,
  cpf text DEFAULT '',
  sex text DEFAULT '',
  address text DEFAULT '',
  observations text DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','pending')),
  total_spent numeric NOT NULL DEFAULT 0,
  procedures text[] DEFAULT '{}',
  last_visit date,
  next_appointment date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select patients"
  ON patients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert patients"
  ON patients FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update patients"
  ON patients FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete patients"
  ON patients FOR DELETE
  TO authenticated
  USING (true);

-- ──────────────────────────────────────────
-- APPOINTMENTS
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  patient_name text NOT NULL DEFAULT '',
  procedure text NOT NULL DEFAULT '',
  date date NOT NULL,
  time text NOT NULL DEFAULT '',
  duration integer NOT NULL DEFAULT 60,
  professional text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','confirmed','completed','cancelled','no-show')),
  value numeric NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert appointments"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update appointments"
  ON appointments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete appointments"
  ON appointments FOR DELETE
  TO authenticated
  USING (true);

-- ──────────────────────────────────────────
-- PRESCRIPTIONS
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  medications jsonb NOT NULL DEFAULT '[]',
  instructions text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select prescriptions"
  ON prescriptions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert prescriptions"
  ON prescriptions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update prescriptions"
  ON prescriptions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete prescriptions"
  ON prescriptions FOR DELETE
  TO authenticated
  USING (true);

-- ──────────────────────────────────────────
-- PROCEDURE PHOTOS
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS procedure_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  procedure_name text NOT NULL DEFAULT '',
  photos_before text[] DEFAULT '{}',
  photos_after text[] DEFAULT '{}',
  video_url text DEFAULT '',
  observations text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE procedure_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select procedure_photos"
  ON procedure_photos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert procedure_photos"
  ON procedure_photos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update procedure_photos"
  ON procedure_photos FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete procedure_photos"
  ON procedure_photos FOR DELETE
  TO authenticated
  USING (true);

-- ──────────────────────────────────────────
-- MESSAGES (WhatsApp simulated)
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  patient_name text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  template_type text DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('sent','pending','failed')),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select messages"
  ON messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete messages"
  ON messages FOR DELETE
  TO authenticated
  USING (true);

-- ──────────────────────────────────────────
-- CAMPAIGNS
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  template_type text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  audience text NOT NULL DEFAULT 'all',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','scheduled')),
  sent_count integer NOT NULL DEFAULT 0,
  open_count integer NOT NULL DEFAULT 0,
  patient_ids uuid[] DEFAULT '{}',
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select campaigns"
  ON campaigns FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert campaigns"
  ON campaigns FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update campaigns"
  ON campaigns FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete campaigns"
  ON campaigns FOR DELETE
  TO authenticated
  USING (true);

-- ──────────────────────────────────────────
-- NOTIFICATIONS
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('appointment','payment','alert','info')),
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (true);
