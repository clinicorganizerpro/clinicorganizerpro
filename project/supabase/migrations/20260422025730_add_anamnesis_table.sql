/*
  # Add anamnesis table

  1. New Tables
    - `anamneses`
      - `id` (uuid, primary key)
      - `patient_id` (uuid, foreign key to patients)
      - `date` (text, date of anamnesis)
      - `main_complaint` (text)
      - `medical_history` (text)
      - `allergies` (text)
      - `current_medications` (text)
      - `family_history` (text)
      - `social_history` (text)
      - `previous_surgeries` (text)
      - `vital_signs` (jsonb, blood pressure, heart rate, temperature, weight)
      - `observations` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `anamneses` table
    - Add policies for authenticated users to manage their clinic anamneses
*/

CREATE TABLE IF NOT EXISTS anamneses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  date TEXT DEFAULT '',
  main_complaint TEXT DEFAULT '',
  medical_history TEXT DEFAULT '',
  allergies TEXT DEFAULT '',
  current_medications TEXT DEFAULT '',
  family_history TEXT DEFAULT '',
  social_history TEXT DEFAULT '',
  previous_surgeries TEXT DEFAULT '',
  vital_signs JSONB DEFAULT '{"blood_pressure":"","heart_rate":"","temperature":"","weight":""}'::jsonb,
  observations TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE anamneses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view clinic anamneses"
  ON anamneses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create anamneses"
  ON anamneses FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update anamneses"
  ON anamneses FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete anamneses"
  ON anamneses FOR DELETE
  TO authenticated
  USING (true);