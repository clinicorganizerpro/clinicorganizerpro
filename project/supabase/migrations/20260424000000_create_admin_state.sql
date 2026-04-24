/*
  # Create admin state persistence

  Stores the admin dashboard state as JSON per authenticated user so the
  frontend can sync the admin panel with Supabase instead of relying only on
  localStorage.
*/

CREATE TABLE IF NOT EXISTS admin_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE admin_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their admin state"
  ON admin_state FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their admin state"
  ON admin_state FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their admin state"
  ON admin_state FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their admin state"
  ON admin_state FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
