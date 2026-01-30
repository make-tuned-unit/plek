-- =====================================================
-- ADD MISSING RLS POLICIES
-- =====================================================
-- This file adds RLS policies for tables that have RLS enabled
-- but were missing policies: availability, host_profiles, and payments
--
-- INSTRUCTIONS:
-- 1. Run this file in your Supabase SQL Editor
-- =====================================================

-- =====================================================
-- HOST PROFILES TABLE POLICIES
-- =====================================================

-- Users can view and update their own host profile
DROP POLICY IF EXISTS "Users can manage their own host profile" ON public.host_profiles;
CREATE POLICY "Users can manage their own host profile" ON public.host_profiles
  FOR ALL USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Admins can view all host profiles
DROP POLICY IF EXISTS "Admins can view all host profiles" ON public.host_profiles;
CREATE POLICY "Admins can view all host profiles" ON public.host_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = (select auth.uid()) AND role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- AVAILABILITY TABLE POLICIES
-- =====================================================

-- Anyone can view availability (needed for booking searches)
DROP POLICY IF EXISTS "Anyone can view availability" ON public.availability;
CREATE POLICY "Anyone can view availability" ON public.availability
  FOR SELECT USING (true);

-- Hosts can manage availability for their properties
DROP POLICY IF EXISTS "Hosts can manage availability for their properties" ON public.availability;
CREATE POLICY "Hosts can manage availability for their properties" ON public.availability
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = availability.property_id
      AND host_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = availability.property_id
      AND host_id = (select auth.uid())
    )
  );

-- Admins can manage all availability
DROP POLICY IF EXISTS "Admins can manage all availability" ON public.availability;
CREATE POLICY "Admins can manage all availability" ON public.availability
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = (select auth.uid()) AND role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- PAYMENTS TABLE POLICIES
-- =====================================================

-- Users can view their own payments (as renter or host)
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
CREATE POLICY "Users can view their own payments" ON public.payments
  FOR SELECT USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.bookings
      WHERE id = payments.booking_id
      AND (renter_id = (select auth.uid()) OR host_id = (select auth.uid()))
    )
  );

-- Only service role and admins can create/update payments (for security)
-- This prevents users from manipulating payment records
DROP POLICY IF EXISTS "Service role and admins can manage payments" ON public.payments;
CREATE POLICY "Service role and admins can manage payments" ON public.payments
  FOR INSERT WITH CHECK (
    (select auth.role()) = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = (select auth.uid()) AND role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Service role and admins can update payments" ON public.payments;
CREATE POLICY "Service role and admins can update payments" ON public.payments
  FOR UPDATE USING (
    (select auth.role()) = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = (select auth.uid()) AND role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    (select auth.role()) = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = (select auth.uid()) AND role IN ('admin', 'super_admin')
    )
  );

-- Admins can view all payments
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
CREATE POLICY "Admins can view all payments" ON public.payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = (select auth.uid()) AND role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

-- ✅ Missing RLS policies added!
-- 
-- What was set up:
-- 1. host_profiles: Users can manage their own profile, admins can view all
-- 2. availability: Anyone can view, hosts can manage their properties, admins can manage all
-- 3. payments: Users can view their own, only service role/admins can create/update
--
-- All policies use optimized (select auth.uid()) syntax for performance.



