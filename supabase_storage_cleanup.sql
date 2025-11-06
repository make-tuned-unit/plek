-- =====================================================
-- SUPABASE STORAGE CLEANUP
-- Remove conflicting default policies
-- =====================================================
-- 
-- This script removes the default Supabase policies that check
-- for user ID in folder names, since we use property ID instead.
--
-- Run this ONLY if you want to remove the default policies.
-- Your backend will work fine either way (uses service_role).
-- This is mainly for cleaner policy management.
--
-- =====================================================

-- Drop the default "Give users access to own folder" policies
-- These check for user ID, but we organize by property ID
-- Note: Policy names may vary, adjust based on your actual policy names

-- Find policies that match the pattern (run this first to see what exists):
-- SELECT policyname FROM pg_policies 
-- WHERE tablename = 'objects' 
-- AND schemaname = 'storage' 
-- AND policyname LIKE '%own folder%';

-- Drop policies (adjust names based on what you see above)
DROP POLICY IF EXISTS "Give users access to own folder 1p78gax_0" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1p78gax_1" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1p78gax_2" ON storage.objects;

-- Alternative: Drop all policies that check for user ID in folder name
-- (More aggressive - use with caution)
-- This will drop any policy that uses auth.uid() in the folder check
-- You may need to adjust this based on your specific policies

-- =====================================================
-- VERIFY CLEANUP
-- =====================================================

-- Check remaining policies
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
ORDER BY policyname;

-- You should now only see:
-- - "Anyone can view property photos" (SELECT, public)
-- - "Hosts can upload to their property folders" (INSERT, authenticated)
-- - "Hosts can update their property photos" (UPDATE, authenticated)
-- - "Hosts can delete their property photos" (DELETE, authenticated)

