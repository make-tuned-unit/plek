-- =====================================================
-- SUPABASE STORAGE SETUP FOR DRIVE MY WAY
-- Complete storage bucket and RLS policies setup
-- =====================================================
-- 
-- INSTRUCTIONS:
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to SQL Editor
-- 3. Paste and run this entire file
-- 4. Verify the bucket was created in Storage section
--
-- =====================================================

-- =====================================================
-- STEP 1: CREATE STORAGE BUCKET
-- =====================================================
-- Note: Buckets are typically created via the dashboard,
-- but we'll set up the policies here.
-- If the bucket doesn't exist, create it manually:
-- Dashboard > Storage > New Bucket
-- Name: property-photos
-- Public: Yes
-- File size limit: 10 MB
-- Allowed MIME types: image/*

-- =====================================================
-- STEP 2: ENABLE RLS ON STORAGE (if needed)
-- =====================================================

-- Note: RLS is typically already enabled on storage.objects by default in Supabase
-- If you need to enable it manually, you would need superuser permissions
-- For most Supabase projects, RLS is already enabled, so we'll skip this step
-- and proceed directly to creating policies

-- Uncomment the line below ONLY if you have superuser access and RLS is not enabled:
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 3: DROP EXISTING POLICIES (if any)
-- =====================================================
-- This ensures a clean setup if you're re-running this script

-- Drop our custom policies (if re-running)
DROP POLICY IF EXISTS "Users can upload photos to their properties" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view property photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Hosts can upload to their property folders" ON storage.objects;
DROP POLICY IF EXISTS "Hosts can manage their property photos" ON storage.objects;
DROP POLICY IF EXISTS "Hosts can update their property photos" ON storage.objects;
DROP POLICY IF EXISTS "Hosts can delete their property photos" ON storage.objects;

-- Drop Supabase default policies (if they exist and conflict)
-- These check for user ID in folder name, but we use property ID
-- Note: These policy names are auto-generated, so adjust if needed
-- You may need to find the exact policy names in your Supabase dashboard
-- and drop them manually if they cause conflicts

-- =====================================================
-- STEP 4: CREATE STORAGE POLICIES
-- =====================================================

-- Policy 1: Allow authenticated users to upload photos to property folders
-- Photos are stored as: property-photos/{propertyId}/{filename}
-- Users can only upload if they own the property (are the host)
CREATE POLICY "Hosts can upload to their property folders"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'property-photos' AND
  -- Extract property ID from path (first folder in path)
  (storage.foldername(name))[1] IN (
    SELECT id::text 
    FROM public.properties 
    WHERE host_id = auth.uid()
  )
);

-- Policy 2: Allow anyone (including unauthenticated) to view photos
-- This makes property photos publicly accessible
CREATE POLICY "Anyone can view property photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'property-photos');

-- Policy 3: Allow hosts to update photos in their property folders
CREATE POLICY "Hosts can update their property photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'property-photos' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text 
    FROM public.properties 
    WHERE host_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'property-photos' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text 
    FROM public.properties 
    WHERE host_id = auth.uid()
  )
);

-- Policy 4: Allow hosts to delete photos from their property folders
CREATE POLICY "Hosts can delete their property photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'property-photos' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text 
    FROM public.properties 
    WHERE host_id = auth.uid()
  )
);

-- =====================================================
-- STEP 5: ALTERNATIVE POLICIES (If using user-based folders)
-- =====================================================
-- If you prefer to organize photos by user ID instead of property ID,
-- uncomment these policies and comment out the ones above.

/*
-- Alternative: User-based folder structure (property-photos/{userId}/{filename})

-- Upload policy for user folders
CREATE POLICY "Users can upload to their own folders"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'property-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Update policy for user folders
CREATE POLICY "Users can update their own photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'property-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'property-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Delete policy for user folders
CREATE POLICY "Users can delete their own photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'property-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
*/

-- =====================================================
-- STEP 6: VERIFY SETUP
-- =====================================================

-- Check if policies were created successfully
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
ORDER BY policyname;

-- =====================================================
-- IMPORTANT NOTES
-- =====================================================

-- Note 1: Service Role Key
-- Your backend uses the service_role key which bypasses RLS policies.
-- This means backend uploads will work regardless of these policies.
-- These policies are important for:
-- - Client-side uploads (if implemented)
-- - Security best practices
-- - Future-proofing your application

-- Note 2: Photo Organization
-- Photos are stored in the following structure:
-- property-photos/{propertyId}/{timestamp}-{random}.{ext}
-- Example: property-photos/abc123/1704067200000-xyz789.jpg
--
-- The policies verify that:
-- - The property ID in the path belongs to the authenticated user (as host)
-- - This prevents users from uploading to other people's property folders

-- Note 3: Public Access
-- Photos are publicly viewable (anyone can access the URLs).
-- This is intentional for property listings.
-- If you need private photos, create a separate bucket with different policies.

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

-- ✅ Storage setup complete!
-- 
-- What was set up:
-- 1. RLS is already enabled on storage.objects (default in Supabase)
-- 2. Upload policy: Hosts can upload to their property folders
-- 3. View policy: Anyone can view property photos (public)
-- 4. Update policy: Hosts can update their property photos
-- 5. Delete policy: Hosts can delete their property photos
--
-- Next steps:
-- 1. Verify bucket exists: Dashboard > Storage > property-photos
--    - If it doesn't exist, create it manually:
--      * Name: property-photos
--      * Public: Yes
--      * File size limit: 10 MB
--      * Allowed MIME types: image/*
-- 2. Test upload via your backend API
-- 3. Verify photos are accessible via public URLs
--
-- Testing:
-- You can test the setup by:
-- 1. Creating a property as a host
-- 2. Uploading a photo via the property creation endpoint
-- 3. Checking the Storage section in Supabase dashboard
-- 4. Verifying the photo URL is publicly accessible
--
-- Troubleshooting:
-- - If uploads fail, check that the bucket exists and is public
-- - Verify your backend .env has SUPABASE_STORAGE_BUCKET=property-photos
-- - Check backend logs for specific error messages
-- - Ensure the property exists and the user is the host

