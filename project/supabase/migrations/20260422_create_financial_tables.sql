/*
  # Sistema Financeiro Completo
  
  Cria tabelas para gerenciar entradas, despesas e resumos financeiros da clínica.
  
  Inclui:
  - `incomes` - Receitas/Entradas (de serviços/procedimentos)
  - `expenses` - Despesas operacionais
  - RLS policies para isolamento por usuário
*/

-- ──────────────────────────────────────────
-- INCOMES (Entradas/Receitas)
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS incomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES patients(id) ON DELETE SET NULL,
  patient_name text NOT NULL,
  service text NOT NULL,
  payment_method text NOT NULL DEFAULT 'pix' CHECK (payment_method IN ('pix','cartao','dinheiro','stripe')),
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('paid','pending')),
  attendance_date date NOT NULL,
  observations text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own incomes"
  ON incomes FOR SELECT
  TO authenticated
  USING (auth.uid() = clinic_id);

CREATE POLICY "Users can insert their own incomes"
  ON incomes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = clinic_id);

CREATE POLICY "Users can update their own incomes"
  ON incomes FOR UPDATE
  TO authenticated
  USING (auth.uid() = clinic_id)
  WITH CHECK (auth.uid() = clinic_id);

CREATE POLICY "Users can delete their own incomes"
  ON incomes FOR DELETE
  TO authenticated
  USING (auth.uid() = clinic_id);

CREATE INDEX idx_incomes_clinic_id ON incomes(clinic_id);
CREATE INDEX idx_incomes_attendance_date ON incomes(attendance_date);
CREATE INDEX idx_incomes_status ON incomes(status);

-- ──────────────────────────────────────────
-- EXPENSES (Despesas)
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN ('fixa','variavel')),
  amount numeric NOT NULL,
  date date NOT NULL,
  payment_method text NOT NULL DEFAULT 'pix' CHECK (payment_method IN ('pix','cartao','dinheiro','transferencia','outro')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('paid','pending')),
  observations text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (auth.uid() = clinic_id);

CREATE POLICY "Users can insert their own expenses"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = clinic_id);

CREATE POLICY "Users can update their own expenses"
  ON expenses FOR UPDATE
  TO authenticated
  USING (auth.uid() = clinic_id)
  WITH CHECK (auth.uid() = clinic_id);

CREATE POLICY "Users can delete their own expenses"
  ON expenses FOR DELETE
  TO authenticated
  USING (auth.uid() = clinic_id);

CREATE INDEX idx_expenses_clinic_id ON expenses(clinic_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_expenses_category ON expenses(category);
