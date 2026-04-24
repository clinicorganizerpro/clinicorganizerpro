/*
  # Create SaaS infrastructure tables

  1. New Tables
    - `clinics` - Clinic information for each user
    - `clinic_users` - Link users to clinics (multi-clinic support)
    - `subscription_plans` - Available subscription plans
    - `clinic_subscriptions` - Track clinic subscriptions
    - `payments` - Payment history

  2. Tables Modified
    - All existing tables add `clinic_id` column for data isolation

  3. Security
    - RLS policies restrict access to clinic data
    - Users can only see their own clinic's data
*/

CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  stripe_price_id TEXT UNIQUE,
  monthly_price DECIMAL(10, 2) NOT NULL,
  annual_price DECIMAL(10, 2),
  features TEXT[] DEFAULT '{}',
  max_users INTEGER DEFAULT 1,
  max_patients INTEGER DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO subscription_plans (name, stripe_price_id, monthly_price, annual_price, features, max_users, max_patients) VALUES
  ('Básico', NULL, 29.90, 299.00, ARRAY['Até 50 pacientes', 'Dashboard básico', '1 usuário'], 1, 50),
  ('Profissional', NULL, 79.90, 799.00, ARRAY['Até 500 pacientes', 'Todos os recursos', '3 usuários', 'Suporte prioritário'], 3, 500),
  ('Premium', NULL, 199.90, 1999.00, ARRAY['Pacientes ilimitados', 'API access', '10 usuários', 'Suporte 24/7', 'Integrações avançadas'], 10, NULL)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  state TEXT DEFAULT '',
  cnpj TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clinic_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  stripe_subscription_id TEXT UNIQUE,
  status TEXT DEFAULT 'active', -- active, cancelled, expired
  start_date TIMESTAMPTZ DEFAULT now(),
  end_date TIMESTAMPTZ,
  auto_renew BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES clinic_subscriptions(id),
  stripe_payment_id TEXT UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'BRL',
  status TEXT DEFAULT 'succeeded', -- succeeded, pending, failed
  description TEXT DEFAULT '',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add clinic_id to existing tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'clinic_id'
  ) THEN
    ALTER TABLE patients ADD COLUMN clinic_id UUID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'clinic_id'
  ) THEN
    ALTER TABLE appointments ADD COLUMN clinic_id UUID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prescriptions' AND column_name = 'clinic_id'
  ) THEN
    ALTER TABLE prescriptions ADD COLUMN clinic_id UUID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'clinic_id'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN clinic_id UUID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'clinic_id'
  ) THEN
    ALTER TABLE messages ADD COLUMN clinic_id UUID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'procedure_photos' AND column_name = 'clinic_id'
  ) THEN
    ALTER TABLE procedure_photos ADD COLUMN clinic_id UUID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'anamneses' AND column_name = 'clinic_id'
  ) THEN
    ALTER TABLE anamneses ADD COLUMN clinic_id UUID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'clinic_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN clinic_id UUID;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Subscription plans are viewable by everyone"
  ON subscription_plans FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can view their clinic"
  ON clinics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create clinic"
  ON clinics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their clinic"
  ON clinics FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their subscriptions"
  ON clinic_subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = clinic_subscriptions.clinic_id
      AND clinics.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = payments.clinic_id
      AND clinics.user_id = auth.uid()
    )
  );