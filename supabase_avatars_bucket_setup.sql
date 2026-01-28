-- =====================================================
-- SUPABASE STORAGE SETUP FOR USER AVATARS
-- Complete storage bucket and RLS policies setup
-- =====================================================
-- 
-- INSTRUCTIONS:
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to Storage
-- 3. Create a new bucket manually:
--    - Name: user-avatars
--    - Public: Yes
--    - File size limit: 5 MB
--    - Allowed MIME types: image/*
-- 4. Then run this SQL in the SQL Editor
--
-- =====================================================

-- =====================================================
-- STEP 1: DROP EXISTING POLICIES (if any)
-- =====================================================

DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;

-- =====================================================
-- STEP 2: CREATE RLS POLICIES FOR AVATARS BUCKET
-- =====================================================

-- Policy: Users can upload their own avatars
-- Avatars are stored as: user-avatars/{userId}/{filename}
CREATE POLICY "Users can upload their own avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Anyone can view avatars (public access)
CREATE POLICY "Anyone can view avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'user-avatars');

-- Policy: Users can update their own avatars
CREATE POLICY "Users can update their own avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own avatars
CREATE POLICY "Users can delete their own avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check if policies were created successfully
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND policyname LIKE '%avatar%'
ORDER BY policyname;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

-- ✅ Avatar storage setup complete!
-- 
-- What was set up:
-- 1. Upload policy: Users can upload to their own avatar folder
-- 2. View policy: Anyone can view avatars (public)
-- 3. Update policy: Users can update their own avatars
-- 4. Delete policy: Users can delete their own avatars
--
-- Note: The bucket must be created manually in the Supabase Dashboard:
-- - Name: user-avatars
-- - Public: Yes
-- - File size limit: 5 MB
-- - Allowed MIME types: image/*




