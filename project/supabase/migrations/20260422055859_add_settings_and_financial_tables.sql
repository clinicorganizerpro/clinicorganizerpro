/*
  # Add settings and financial management tables

  1. New Tables
    - `clinic_settings` - Clinic configuration and preferences
    - `transactions` - Financial transactions and income/expense tracking
    - `payment_methods` - Saved payment methods for billing
    - `invoices` - Generated invoices

  2. Security
    - Enable RLS on all new tables
    - Add policies for data isolation by clinic
*/

CREATE TABLE IF NOT EXISTS clinic_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  clinic_name TEXT DEFAULT '',
  clinic_phone TEXT DEFAULT '',
  clinic_email TEXT DEFAULT '',
  clinic_address TEXT DEFAULT '',
  clinic_city TEXT DEFAULT '',
  clinic_state TEXT DEFAULT '',
  clinic_cnpj TEXT DEFAULT '',
  clinic_logo_url TEXT,
  
  notifications_email BOOLEAN DEFAULT true,
  notifications_sms BOOLEAN DEFAULT false,
  notifications_whatsapp BOOLEAN DEFAULT true,
  notifications_appointment BOOLEAN DEFAULT true,
  notifications_payment BOOLEAN DEFAULT true,
  
  team_members_limit INTEGER DEFAULT 1,
  security_two_factor BOOLEAN DEFAULT false,
  security_password_reset_required BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  description TEXT NOT NULL DEFAULT '',
  category TEXT DEFAULT 'other', -- 'procedure', 'product', 'service', 'expense', 'other'
  type TEXT NOT NULL, -- 'income' or 'expense'
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'BRL',
  
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  paid_date DATE,
  
  status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'overdue', 'cancelled'
  payment_method TEXT DEFAULT '', -- 'cash', 'card', 'transfer', 'check'
  
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  patient_name TEXT DEFAULT '',
  
  notes TEXT DEFAULT '',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  type TEXT NOT NULL, -- 'credit_card', 'debit_card', 'bank_account', 'pix'
  name TEXT NOT NULL, -- Display name
  
  -- Card info (encrypted in production)
  card_last_four TEXT,
  card_brand TEXT,
  card_expiry TEXT,
  
  -- Bank info
  bank_name TEXT,
  account_number TEXT,
  
  -- PIX info
  pix_key TEXT,
  pix_key_type TEXT, -- 'cpf', 'email', 'phone', 'random'
  
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  invoice_number TEXT UNIQUE NOT NULL,
  patient_id UUID REFERENCES patients(id),
  patient_name TEXT NOT NULL,
  
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  paid_date DATE,
  
  total_amount DECIMAL(10, 2) NOT NULL,
  paid_amount DECIMAL(10, 2) DEFAULT 0,
  
  status TEXT DEFAULT 'issued', -- 'issued', 'sent', 'viewed', 'paid', 'overdue', 'cancelled'
  description TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE clinic_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clinic_settings
CREATE POLICY "Users can view their clinic settings"
  ON clinic_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = clinic_settings.clinic_id
      AND clinics.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their clinic settings"
  ON clinic_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = clinic_settings.clinic_id
      AND clinics.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = clinic_settings.clinic_id
      AND clinics.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their clinic settings"
  ON clinic_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = clinic_id
      AND clinics.user_id = auth.uid()
    )
  );

-- RLS Policies for transactions
CREATE POLICY "Users can view their clinic transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = transactions.clinic_id
      AND clinics.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = clinic_id
      AND clinics.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update transactions"
  ON transactions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = transactions.clinic_id
      AND clinics.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = clinic_id
      AND clinics.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete transactions"
  ON transactions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = transactions.clinic_id
      AND clinics.user_id = auth.uid()
    )
  );

-- RLS Policies for payment_methods
CREATE POLICY "Users can view their payment methods"
  ON payment_methods FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = payment_methods.clinic_id
      AND clinics.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage payment methods"
  ON payment_methods FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = clinic_id
      AND clinics.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update payment methods"
  ON payment_methods FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = payment_methods.clinic_id
      AND clinics.user_id = auth.uid()
    )
  );

-- RLS Policies for invoices
CREATE POLICY "Users can view their invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = invoices.clinic_id
      AND clinics.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create invoices"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = clinic_id
      AND clinics.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = invoices.clinic_id
      AND clinics.user_id = auth.uid()
    )
  );