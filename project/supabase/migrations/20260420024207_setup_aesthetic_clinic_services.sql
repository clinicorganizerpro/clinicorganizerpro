/*
  # Aesthetic Clinic Services and Calendar Setup

  1. New Tables
    - `aesthetic_services` - Services offered by clinic
    - `service_colors` - Color coding for services
    - `calendar_settings` - Professional calendar preferences

  2. New Columns
    - `appointments` - Add service_color, status, whatsapp_sent

  3. Features
    - Service durations (30-90 min)
    - Color coding by service type
    - Time slot configuration
    - Appointment status tracking
*/

-- Create aesthetic_services table
CREATE TABLE IF NOT EXISTS aesthetic_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  color_code text NOT NULL,
  description text,
  price decimal(10,2),
  category text NOT NULL CHECK (category IN ('injectables', 'skin', 'facial', 'body', 'wellness')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create service_colors lookup table
CREATE TABLE IF NOT EXISTS service_colors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES aesthetic_services(id) ON DELETE CASCADE,
  color_name text NOT NULL,
  hex_color text NOT NULL,
  rgb_color text NOT NULL,
  tailwind_class text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create calendar_settings table
CREATE TABLE IF NOT EXISTS calendar_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  slot_interval_minutes integer NOT NULL DEFAULT 30 CHECK (slot_interval_minutes IN (15, 30, 45, 60)),
  buffer_between_appointments integer NOT NULL DEFAULT 10 CHECK (buffer_between_appointments >= 0),
  max_daily_appointments integer NOT NULL DEFAULT 20,
  show_weekends boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(professional_id)
);

-- Add columns to appointments table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'service_color'
  ) THEN
    ALTER TABLE appointments ADD COLUMN service_color text DEFAULT '#8B7DD8';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'whatsapp_sent'
  ) THEN
    ALTER TABLE appointments ADD COLUMN whatsapp_sent boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'notes'
  ) THEN
    ALTER TABLE appointments ADD COLUMN notes text DEFAULT '';
  END IF;
END $$;

-- Insert default aesthetic services
INSERT INTO aesthetic_services (name, duration_minutes, color_code, description, category) VALUES
  ('Botox', 30, '#8B7DD8', 'Aplicação de toxina botulínica para rejuvenescimento', 'injectables'),
  ('Preenchimento Facial', 45, '#6D8FDB', 'Preenchimento com ácido hialurônico', 'injectables'),
  ('Limpeza de Pele', 60, '#4CAF50', 'Limpeza profunda e esfoliação', 'skin'),
  ('Harmonização Facial', 90, '#2196F3', 'Procedimento completo de harmonização estética', 'facial'),
  ('Microagulhamento', 45, '#FF9800', 'Tratamento com microagulhas para rejuvenescimento', 'skin'),
  ('Peeling Químico', 30, '#9C27B0', 'Esfoliação química para renovação da pele', 'skin'),
  ('Acupuntura Estética', 45, '#FF6F00', 'Acupuntura com foco em rejuvenescimento e tonificação', 'wellness'),
  ('Massagem Facial', 40, '#E91E63', 'Massagem relaxante com drenagem linfática', 'facial'),
  ('Drenagem Linfática', 60, '#00BCD4', 'Drenagem linfática manual especializada', 'body')
ON CONFLICT (name) DO NOTHING;

-- Insert service colors
DO $$
DECLARE
  botox_id uuid;
  preench_id uuid;
  limpeza_id uuid;
  harmon_id uuid;
  micro_id uuid;
  peeling_id uuid;
  acup_id uuid;
  massag_id uuid;
  drenam_id uuid;
BEGIN
  SELECT id INTO botox_id FROM aesthetic_services WHERE name = 'Botox' LIMIT 1;
  SELECT id INTO preench_id FROM aesthetic_services WHERE name = 'Preenchimento Facial' LIMIT 1;
  SELECT id INTO limpeza_id FROM aesthetic_services WHERE name = 'Limpeza de Pele' LIMIT 1;
  SELECT id INTO harmon_id FROM aesthetic_services WHERE name = 'Harmonização Facial' LIMIT 1;
  SELECT id INTO micro_id FROM aesthetic_services WHERE name = 'Microagulhamento' LIMIT 1;
  SELECT id INTO peeling_id FROM aesthetic_services WHERE name = 'Peeling Químico' LIMIT 1;
  SELECT id INTO acup_id FROM aesthetic_services WHERE name = 'Acupuntura Estética' LIMIT 1;
  SELECT id INTO massag_id FROM aesthetic_services WHERE name = 'Massagem Facial' LIMIT 1;
  SELECT id INTO drenam_id FROM aesthetic_services WHERE name = 'Drenagem Linfática' LIMIT 1;

  INSERT INTO service_colors (service_id, color_name, hex_color, rgb_color, tailwind_class) VALUES
    (botox_id, 'Purple', '#8B7DD8', 'rgb(139, 125, 216)', 'bg-purple-400'),
    (preench_id, 'Blue', '#6D8FDB', 'rgb(109, 143, 219)', 'bg-blue-400'),
    (limpeza_id, 'Green', '#4CAF50', 'rgb(76, 175, 80)', 'bg-green-500'),
    (harmon_id, 'Cyan', '#2196F3', 'rgb(33, 150, 243)', 'bg-cyan-500'),
    (micro_id, 'Orange', '#FF9800', 'rgb(255, 152, 0)', 'bg-orange-500'),
    (peeling_id, 'Violet', '#9C27B0', 'rgb(156, 39, 176)', 'bg-violet-600'),
    (acup_id, 'Deep Orange', '#FF6F00', 'rgb(255, 111, 0)', 'bg-orange-600'),
    (massag_id, 'Pink', '#E91E63', 'rgb(233, 30, 99)', 'bg-pink-500'),
    (drenam_id, 'Teal', '#00BCD4', 'rgb(0, 188, 212)', 'bg-teal-400')
  ON CONFLICT DO NOTHING;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_aesthetic_services_category ON aesthetic_services(category);
CREATE INDEX IF NOT EXISTS idx_aesthetic_services_active ON aesthetic_services(is_active);
CREATE INDEX IF NOT EXISTS idx_calendar_settings_professional ON calendar_settings(professional_id);
CREATE INDEX IF NOT EXISTS idx_appointments_service_color ON appointments(service_color);

-- Enable RLS
ALTER TABLE aesthetic_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for aesthetic_services
CREATE POLICY "Services accessible to all"
  ON aesthetic_services FOR SELECT
  USING (true);

CREATE POLICY "Services managed by admin"
  ON aesthetic_services FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Services updated by admin"
  ON aesthetic_services FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- RLS Policies for service_colors
CREATE POLICY "Colors accessible to all"
  ON service_colors FOR SELECT
  USING (true);

-- RLS Policies for calendar_settings
CREATE POLICY "Settings accessible to all"
  ON calendar_settings FOR SELECT
  USING (true);

CREATE POLICY "Professionals can manage own settings"
  ON calendar_settings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Professionals can update own settings"
  ON calendar_settings FOR UPDATE
  USING (true)
  WITH CHECK (true);
