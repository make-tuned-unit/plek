-- =====================================================
-- MESSAGES TABLE RLS POLICIES
-- Add UPDATE policy for marking messages as read
-- =====================================================
-- 
-- INSTRUCTIONS:
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to SQL Editor
-- 3. Run this SQL file
--
-- =====================================================

-- Add UPDATE policy for messages (to allow marking messages as read)
DROP POLICY IF EXISTS "Users can update messages they received" ON public.messages;

CREATE POLICY "Users can update messages they received" ON public.messages
  FOR UPDATE USING (
    receiver_id = (select auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE id = messages.booking_id 
      AND (renter_id = (select auth.uid()) OR host_id = (select auth.uid()))
    )
  )
  WITH CHECK (
    receiver_id = (select auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE id = messages.booking_id 
      AND (renter_id = (select auth.uid()) OR host_id = (select auth.uid()))
    )
  );

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'messages'
  AND schemaname = 'public'
ORDER BY policyname;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

-- ✅ Messages RLS policies complete!
-- 
-- What was set up:
-- 1. SELECT policy: Users can view messages from their bookings (already exists)
-- 2. INSERT policy: Users can send messages to their bookings (already exists)
-- 3. UPDATE policy: Users can update messages they received (mark as read) - NEW
--
-- Note: The messages table should already exist from supabase_database_setup.sql
-- This file only adds the missing UPDATE policy for marking messages as read.

