/*
  # Fix Security Issues

  1. Fix handle_new_user function - remove mutable search_path
  2. Fix RLS policies with always-true conditions
  3. Implement proper data isolation policies
*/

-- Drop trigger first, then function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, is_admin)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.email IN ('max.trance@hotmail.com', 'teste@teste.com')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fix anamneses policies - require clinic_id ownership
DROP POLICY IF EXISTS "Users can create anamneses" ON public.anamneses;
DROP POLICY IF EXISTS "Users can update anamneses" ON public.anamneses;
DROP POLICY IF EXISTS "Users can delete anamneses" ON public.anamneses;
DROP POLICY IF EXISTS "Users can view anamneses" ON public.anamneses;

CREATE POLICY "Users can view own clinic anamneses"
  ON public.anamneses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = anamneses.patient_id
      AND patients.clinic_id IN (
        SELECT clinics.id FROM public.clinics
        WHERE clinics.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create anamneses for own clinics"
  ON public.anamneses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = patient_id
      AND patients.clinic_id IN (
        SELECT clinics.id FROM public.clinics
        WHERE clinics.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update anamneses in own clinics"
  ON public.anamneses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = anamneses.patient_id
      AND patients.clinic_id IN (
        SELECT clinics.id FROM public.clinics
        WHERE clinics.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = patient_id
      AND patients.clinic_id IN (
        SELECT clinics.id FROM public.clinics
        WHERE clinics.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete anamneses from own clinics"
  ON public.anamneses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = anamneses.patient_id
      AND patients.clinic_id IN (
        SELECT clinics.id FROM public.clinics
        WHERE clinics.user_id = auth.uid()
      )
    )
  );

-- Fix appointments policies
DROP POLICY IF EXISTS "Authenticated users can insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can delete appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can view appointments" ON public.appointments;

CREATE POLICY "Users can view appointments in own clinics"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (
    clinic_id IN (
      SELECT id FROM public.clinics
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create appointments in own clinics"
  ON public.appointments FOR INSERT
  TO authenticated
  WITH CHECK (
    clinic_id IN (
      SELECT id FROM public.clinics
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update appointments in own clinics"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (
    clinic_id IN (
      SELECT id FROM public.clinics
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    clinic_id IN (
      SELECT id FROM public.clinics
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete appointments in own clinics"
  ON public.appointments FOR DELETE
  TO authenticated
  USING (
    clinic_id IN (
      SELECT id FROM public.clinics
      WHERE user_id = auth.uid()
    )
  );

-- Fix campaigns policies
DROP POLICY IF EXISTS "Authenticated users can insert campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Authenticated users can update campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Authenticated users can delete campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Authenticated users can view campaigns" ON public.campaigns;

CREATE POLICY "Users can view campaigns in own clinics"
  ON public.campaigns FOR SELECT
  TO authenticated
  USING (
    clinic_id IN (
      SELECT id FROM public.clinics
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create campaigns in own clinics"
  ON public.campaigns FOR INSERT
  TO authenticated
  WITH CHECK (
    clinic_id IN (
      SELECT id FROM public.clinics
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update campaigns in own clinics"
  ON public.campaigns FOR UPDATE
  TO authenticated
  USING (
    clinic_id IN (
      SELECT id FROM public.clinics
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    clinic_id IN (
      SELECT id FROM public.clinics
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete campaigns in own clinics"
  ON public.campaigns FOR DELETE
  TO authenticated
  USING (
    clinic_id IN (
      SELECT id FROM public.clinics
      WHERE user_id = auth.uid()
    )
  );

-- Fix messages policies
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can update messages" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can delete messages" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can view messages" ON public.messages;

CREATE POLICY "Users can view messages in own clinics"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    clinic_id IN (
      SELECT id FROM public.clinics
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in own clinics"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    clinic_id IN (
      SELECT id FROM public.clinics
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update messages in own clinics"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (
    clinic_id IN (
      SELECT id FROM public.clinics
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    clinic_id IN (
      SELECT id FROM public.clinics
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages in own clinics"
  ON public.messages FOR DELETE
  TO authenticated
  USING (
    clinic_id IN (
      SELECT id FROM public.clinics
      WHERE user_id = auth.uid()
    )
  );

-- Fix notifications policies
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can update notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can delete notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can view notifications" ON public.notifications;

CREATE POLICY "Users can view notifications in own clinics"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (
    clinic_id IN (
      SELECT id FROM public.clinics
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create notifications in own clinics"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    clinic_id IN (
      SELECT id FROM public.clinics
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update notifications in own clinics"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (
    clinic_id IN (
      SELECT id FROM public.clinics
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    clinic_id IN (
      SELECT id FROM public.clinics
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete notifications in own clinics"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (
    clinic_id IN (
      SELECT id FROM public.clinics
      WHERE user_id = auth.uid()
    )
  );

-- Fix patients policies
DROP POLICY IF EXISTS "Authenticated users can insert patients" ON public.patients;
DROP POLICY IF EXISTS "Authenticated users can update patients" ON public.patients;
DROP POLICY IF EXISTS "Authenticated users can delete patients" ON public.patients;
DROP POLICY IF EXISTS "Authenticated users can view patients" ON public.patients;

CREATE POLICY "Users can view patients in own clinics"
  ON public.patients FOR SELECT
  TO authenticated
  USING (
    clinic_id IN (
      SELECT id FROM public.clinics
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create patients in own clinics"
  ON public.patients FOR INSERT
  TO authenticated
  WITH CHECK (
    clinic_id IN (
      SELECT id FROM public.clinics
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update patients in own clinics"
  ON public.patients FOR UPDATE
  TO authenticated
  USING (
    clinic_id IN (
      SELECT id FROM public.clinics
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    clinic_id IN (
      SELECT id FROM public.clinics
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete patients in own clinics"
  ON public.patients FOR DELETE
  TO authenticated
  USING (
    clinic_id IN (
      SELECT id FROM public.clinics
      WHERE user_id = auth.uid()
    )
  );

-- Fix prescriptions policies
DROP POLICY IF EXISTS "Authenticated users can insert prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Authenticated users can update prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Authenticated users can delete prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Authenticated users can view prescriptions" ON public.prescriptions;

CREATE POLICY "Users can view prescriptions in own clinics"
  ON public.prescriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = prescriptions.patient_id
      AND patients.clinic_id IN (
        SELECT clinics.id FROM public.clinics
        WHERE clinics.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create prescriptions for own clinics"
  ON public.prescriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = patient_id
      AND patients.clinic_id IN (
        SELECT clinics.id FROM public.clinics
        WHERE clinics.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update prescriptions in own clinics"
  ON public.prescriptions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = prescriptions.patient_id
      AND patients.clinic_id IN (
        SELECT clinics.id FROM public.clinics
        WHERE clinics.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = patient_id
      AND patients.clinic_id IN (
        SELECT clinics.id FROM public.clinics
        WHERE clinics.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete prescriptions in own clinics"
  ON public.prescriptions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = prescriptions.patient_id
      AND patients.clinic_id IN (
        SELECT clinics.id FROM public.clinics
        WHERE clinics.user_id = auth.uid()
      )
    )
  );

-- Fix procedure_photos policies
DROP POLICY IF EXISTS "Authenticated users can insert procedure_photos" ON public.procedure_photos;
DROP POLICY IF EXISTS "Authenticated users can update procedure_photos" ON public.procedure_photos;
DROP POLICY IF EXISTS "Authenticated users can delete procedure_photos" ON public.procedure_photos;
DROP POLICY IF EXISTS "Authenticated users can view procedure_photos" ON public.procedure_photos;

CREATE POLICY "Users can view procedure photos in own clinics"
  ON public.procedure_photos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = procedure_photos.patient_id
      AND patients.clinic_id IN (
        SELECT clinics.id FROM public.clinics
        WHERE clinics.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create procedure photos for own clinics"
  ON public.procedure_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = patient_id
      AND patients.clinic_id IN (
        SELECT clinics.id FROM public.clinics
        WHERE clinics.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update procedure photos in own clinics"
  ON public.procedure_photos FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = procedure_photos.patient_id
      AND patients.clinic_id IN (
        SELECT clinics.id FROM public.clinics
        WHERE clinics.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = patient_id
      AND patients.clinic_id IN (
        SELECT clinics.id FROM public.clinics
        WHERE clinics.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete procedure photos in own clinics"
  ON public.procedure_photos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = procedure_photos.patient_id
      AND patients.clinic_id IN (
        SELECT clinics.id FROM public.clinics
        WHERE clinics.user_id = auth.uid()
      )
    )
  );
