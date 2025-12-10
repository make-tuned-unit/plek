-- Fix RLS policies for property_photos table
-- This allows hosts to upload photos to their properties

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view property photos" ON public.property_photos;
DROP POLICY IF EXISTS "Hosts can insert photos for their properties" ON public.property_photos;
DROP POLICY IF EXISTS "Hosts can update photos for their properties" ON public.property_photos;
DROP POLICY IF EXISTS "Hosts can delete photos for their properties" ON public.property_photos;
DROP POLICY IF EXISTS "Admins can manage all property photos" ON public.property_photos;

-- Policy 1: Anyone can view property photos (for public listings)
CREATE POLICY "Anyone can view property photos" ON public.property_photos
  FOR SELECT
  USING (true);

-- Policy 2: Hosts can insert photos for their own properties
CREATE POLICY "Hosts can insert photos for their properties" ON public.property_photos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = property_photos.property_id
      AND host_id = (select auth.uid())
    )
  );

-- Policy 3: Hosts can update photos for their own properties
CREATE POLICY "Hosts can update photos for their properties" ON public.property_photos
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = property_photos.property_id
      AND host_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = property_photos.property_id
      AND host_id = (select auth.uid())
    )
  );

-- Policy 4: Hosts can delete photos for their own properties
CREATE POLICY "Hosts can delete photos for their properties" ON public.property_photos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = property_photos.property_id
      AND host_id = (select auth.uid())
    )
  );

-- Policy 5: Admins can manage all property photos
CREATE POLICY "Admins can manage all property photos" ON public.property_photos
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'super_admin')
    )
  );





