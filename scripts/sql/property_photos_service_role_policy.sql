-- Allow the Supabase service role to manage property photos without RLS blocking admin inserts

DROP POLICY IF EXISTS "Service role can manage property photos" ON public.property_photos;

CREATE POLICY "Service role can manage property photos" ON public.property_photos
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');






