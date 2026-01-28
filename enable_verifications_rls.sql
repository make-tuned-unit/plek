-- =====================================================
-- ENABLE RLS ON VERIFICATIONS TABLE
-- =====================================================
-- This file enables Row Level Security (RLS) on the verifications table
-- and adds appropriate security policies.
--
-- INSTRUCTIONS:
-- 1. Run this file in your Supabase SQL Editor
-- 2. This will enable RLS and add policies to secure the verifications table
-- =====================================================

-- Enable RLS on verifications table
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- VERIFICATIONS TABLE POLICIES
-- =====================================================

-- Users can view verifications for their own properties
DROP POLICY IF EXISTS "Users can view verifications for their properties" ON public.verifications;
CREATE POLICY "Users can view verifications for their properties" ON public.verifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = verifications.property_id
      AND host_id = (select auth.uid())
    )
  );

-- Service role can manage all verifications (for backend operations)
DROP POLICY IF EXISTS "Service role can manage all verifications" ON public.verifications;
CREATE POLICY "Service role can manage all verifications" ON public.verifications
  FOR ALL USING (
    (select auth.role()) = 'service_role'
  );

-- Admins can view all verifications
DROP POLICY IF EXISTS "Admins can view all verifications" ON public.verifications;
CREATE POLICY "Admins can view all verifications" ON public.verifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = (select auth.uid()) AND role IN ('admin', 'super_admin')
    )
  );

-- Admins can manage all verifications
DROP POLICY IF EXISTS "Admins can manage all verifications" ON public.verifications;
CREATE POLICY "Admins can manage all verifications" ON public.verifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = (select auth.uid()) AND role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

-- ✅ RLS enabled on verifications table!
-- 
-- What was set up:
-- 1. RLS enabled on public.verifications table
-- 2. Users can view verifications for their own properties (via property ownership)
-- 3. Service role can manage all verifications (for backend operations)
-- 4. Admins can view and manage all verifications
--
-- All policies use optimized (select auth.uid()) syntax for performance.
