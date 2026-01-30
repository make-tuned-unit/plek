-- =====================================================
-- MAKE USER ADMIN
-- Run this in Supabase SQL Editor to make yourself an admin
-- =====================================================
-- 
-- INSTRUCTIONS:
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to SQL Editor
-- 3. Replace 'YOUR_EMAIL_HERE' with your actual email address
-- 4. Run this query
-- 5. You'll now have admin access!
--
-- =====================================================

-- Option 1: Make yourself admin by email
UPDATE public.users
SET role = 'admin'
WHERE email = 'YOUR_EMAIL_HERE';

-- Verify the update
SELECT id, email, first_name, last_name, role, is_host
FROM public.users
WHERE email = 'YOUR_EMAIL_HERE';

-- =====================================================
-- ALTERNATIVE: Make yourself admin by user ID
-- =====================================================
-- If you know your user ID (from auth.users table), use this instead:

-- First, find your user ID:
-- SELECT id, email FROM auth.users;

-- Then update by ID:
-- UPDATE public.users
-- SET role = 'admin'
-- WHERE id = 'YOUR_USER_ID_HERE';

-- =====================================================
-- ALTERNATIVE: Make yourself super_admin
-- =====================================================
-- For even more permissions, use super_admin:
-- UPDATE public.users
-- SET role = 'super_admin'
-- WHERE email = 'YOUR_EMAIL_HERE';

-- =====================================================
-- VERIFY YOUR ROLE
-- =====================================================
-- After running the update, verify your role:
-- SELECT id, email, role, is_host, is_verified
-- FROM public.users
-- WHERE email = 'YOUR_EMAIL_HERE';

-- You should see role = 'admin' or 'super_admin'
-- =====================================================

