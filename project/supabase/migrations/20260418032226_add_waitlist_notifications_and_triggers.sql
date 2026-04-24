/*
  # Waitlist Notifications and Conversion Optimization

  1. New Tables
    - `waitlist_notifications` - Track notification history and conversion
    - `availability_snapshots` - Capture availability for urgency triggers
  
  2. New Columns
    - `waitlist` - Add contact_phone, email_verified, notification_sent
    - `appointments` - Add conversion_source to track origin
  
  3. Features
    - Smart notifications when slots open
    - Availability snapshot for urgency display
    - Conversion tracking
    - Automatic urgency detection
*/

-- Add columns to waitlist for notifications and contact info
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'waitlist' AND column_name = 'contact_phone'
  ) THEN
    ALTER TABLE waitlist ADD COLUMN contact_phone text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'waitlist' AND column_name = 'contact_email'
  ) THEN
    ALTER TABLE waitlist ADD COLUMN contact_email text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'waitlist' AND column_name = 'notification_sent'
  ) THEN
    ALTER TABLE waitlist ADD COLUMN notification_sent boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'waitlist' AND column_name = 'conversion_slot_id'
  ) THEN
    ALTER TABLE waitlist ADD COLUMN conversion_slot_id uuid REFERENCES appointments(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'waitlist' AND column_name = 'converted_at'
  ) THEN
    ALTER TABLE waitlist ADD COLUMN converted_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'conversion_source'
  ) THEN
    ALTER TABLE appointments ADD COLUMN conversion_source text DEFAULT 'direct' CHECK (conversion_source IN ('direct', 'waitlist', 'suggestion', 'urgency_trigger'));
  END IF;
END $$;

-- Create waitlist_notifications table
CREATE TABLE IF NOT EXISTS waitlist_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  waitlist_id uuid NOT NULL REFERENCES waitlist(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  notification_type text NOT NULL CHECK (notification_type IN ('slot_available', 'urgency_warning', 'reminder')),
  message text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  read_at timestamptz,
  conversion_success boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create availability_snapshots table for tracking slot urgency
CREATE TABLE IF NOT EXISTS availability_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL,
  total_slots integer NOT NULL,
  available_slots integer NOT NULL,
  urgency_level text NOT NULL CHECK (urgency_level IN ('high', 'medium', 'low')),
  captured_at timestamptz DEFAULT now(),
  UNIQUE(professional_id, snapshot_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_waitlist_notifications_waitlist_id ON waitlist_notifications(waitlist_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_notifications_patient_id ON waitlist_notifications(patient_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_notifications_professional_id ON waitlist_notifications(professional_id);
CREATE INDEX IF NOT EXISTS idx_availability_snapshots_professional_date ON availability_snapshots(professional_id, snapshot_date);

-- Enable RLS
ALTER TABLE waitlist_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for waitlist_notifications
CREATE POLICY "Notifications accessible"
  ON waitlist_notifications FOR SELECT
  USING (true);

CREATE POLICY "Notifications created by system"
  ON waitlist_notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Notifications updated by system"
  ON waitlist_notifications FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- RLS Policies for availability_snapshots
CREATE POLICY "Snapshots accessible to all"
  ON availability_snapshots FOR SELECT
  USING (true);

CREATE POLICY "Snapshots created by system"
  ON availability_snapshots FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Snapshots updated by system"
  ON availability_snapshots FOR UPDATE
  USING (true)
  WITH CHECK (true);
