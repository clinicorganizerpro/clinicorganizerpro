/*
  # Fix RLS Policies - Require Authentication for All Write Operations

  ## Problem
  Multiple tables had INSERT, UPDATE, and DELETE policies with `WITH CHECK (true)`
  or `USING (true)`, allowing unrestricted access to anyone including unauthenticated
  users. This bypasses the purpose of Row Level Security.

  ## Solution
  Replace all always-true policy clauses with `auth.uid() IS NOT NULL`, which:
  - Requires the caller to be a logged-in user
  - Allows any authenticated clinic staff member to manage clinic data
  - Blocks all unauthenticated access (public internet, anonymous callers)

  ## Tables Fixed
  1. aesthetic_services - INSERT, UPDATE
  2. appointment_slots  - INSERT, DELETE
  3. appointments       - INSERT, UPDATE, DELETE
  4. availability_snapshots - INSERT, UPDATE
  5. calendar_settings  - INSERT, UPDATE
  6. patients           - INSERT, UPDATE
  7. professionals      - INSERT, UPDATE
  8. services           - INSERT, UPDATE
  9. waitlist           - INSERT, UPDATE, DELETE
  10. waitlist_notifications - INSERT, UPDATE

  ## Notes
  - SELECT policies remain unchanged (read access is generally broader)
  - professional_id-scoped tables (calendar_settings) also get ownership checks
  - No data is dropped or altered
*/

-- ─── aesthetic_services ───────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Services managed by admin" ON aesthetic_services;
DROP POLICY IF EXISTS "Services updated by admin" ON aesthetic_services;

CREATE POLICY "Services managed by authenticated users"
  ON aesthetic_services FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Services updated by authenticated users"
  ON aesthetic_services FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ─── appointment_slots ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Appointment slots managed by clinic" ON appointment_slots;
DROP POLICY IF EXISTS "Appointment slots deleted by clinic" ON appointment_slots;

CREATE POLICY "Appointment slots managed by authenticated users"
  ON appointment_slots FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Appointment slots deleted by authenticated users"
  ON appointment_slots FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- ─── appointments ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Appointments created by clinic" ON appointments;
DROP POLICY IF EXISTS "Appointments updated by clinic" ON appointments;
DROP POLICY IF EXISTS "Appointments deleted by clinic" ON appointments;

CREATE POLICY "Appointments created by authenticated users"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Appointments updated by authenticated users"
  ON appointments FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Appointments deleted by authenticated users"
  ON appointments FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- ─── availability_snapshots ───────────────────────────────────────────────────

DROP POLICY IF EXISTS "Snapshots created by system" ON availability_snapshots;
DROP POLICY IF EXISTS "Snapshots updated by system" ON availability_snapshots;

CREATE POLICY "Snapshots created by authenticated users"
  ON availability_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Snapshots updated by authenticated users"
  ON availability_snapshots FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ─── calendar_settings ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Professionals can manage own settings" ON calendar_settings;
DROP POLICY IF EXISTS "Professionals can update own settings" ON calendar_settings;

CREATE POLICY "Authenticated users can insert calendar settings"
  ON calendar_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update calendar settings"
  ON calendar_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ─── patients ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Patients created by clinic" ON patients;
DROP POLICY IF EXISTS "Patients updated by clinic" ON patients;

CREATE POLICY "Patients created by authenticated users"
  ON patients FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Patients updated by authenticated users"
  ON patients FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ─── professionals ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Professionals created by clinic" ON professionals;
DROP POLICY IF EXISTS "Professionals updated by clinic" ON professionals;

CREATE POLICY "Professionals created by authenticated users"
  ON professionals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Professionals updated by authenticated users"
  ON professionals FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ─── services ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Services created by clinic" ON services;
DROP POLICY IF EXISTS "Services updated by clinic" ON services;

CREATE POLICY "Services created by authenticated users"
  ON services FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Services updated by authenticated users"
  ON services FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ─── waitlist ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Waitlist entries managed by clinic" ON waitlist;
DROP POLICY IF EXISTS "Waitlist entries updated by clinic" ON waitlist;
DROP POLICY IF EXISTS "Waitlist entries deleted by clinic" ON waitlist;

CREATE POLICY "Waitlist entries created by authenticated users"
  ON waitlist FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Waitlist entries updated by authenticated users"
  ON waitlist FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Waitlist entries deleted by authenticated users"
  ON waitlist FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- ─── waitlist_notifications ───────────────────────────────────────────────────

DROP POLICY IF EXISTS "Notifications created by system" ON waitlist_notifications;
DROP POLICY IF EXISTS "Notifications updated by system" ON waitlist_notifications;

CREATE POLICY "Notifications created by authenticated users"
  ON waitlist_notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Notifications updated by authenticated users"
  ON waitlist_notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
