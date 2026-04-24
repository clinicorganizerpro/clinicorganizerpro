-- Add authenticated user ownership to the core application tables so each
-- signed-in user only sees and mutates their own clinic data.

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.patients
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.appointments
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.prescriptions
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.procedure_photos
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.procedure_photos
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.messages
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.campaigns
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.notifications
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.anamneses
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.anamneses
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.incomes
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.incomes
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.expenses
  ALTER COLUMN user_id SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_patients_user_id ON public.patients (user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON public.appointments (user_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_user_id ON public.prescriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_procedure_photos_user_id ON public.procedure_photos (user_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages (user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON public.campaigns (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_anamneses_user_id ON public.anamneses (user_id);
CREATE INDEX IF NOT EXISTS idx_incomes_user_id ON public.incomes (user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses (user_id);

DO $$
DECLARE
  table_name text;
  policy_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'patients',
    'appointments',
    'prescriptions',
    'procedure_photos',
    'messages',
    'campaigns',
    'notifications',
    'anamneses',
    'incomes',
    'expenses'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);

    FOR policy_name IN
      SELECT p.polname
      FROM pg_policy p
      JOIN pg_class c ON c.oid = p.polrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = table_name
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, table_name);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY %I_select_own_rows ON public.%I FOR SELECT TO authenticated USING (user_id = auth.uid())',
      table_name,
      table_name
    );

    EXECUTE format(
      'CREATE POLICY %I_insert_own_rows ON public.%I FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid())',
      table_name,
      table_name
    );

    EXECUTE format(
      'CREATE POLICY %I_update_own_rows ON public.%I FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())',
      table_name,
      table_name
    );

    EXECUTE format(
      'CREATE POLICY %I_delete_own_rows ON public.%I FOR DELETE TO authenticated USING (user_id = auth.uid())',
      table_name,
      table_name
    );
  END LOOP;
END
$$;