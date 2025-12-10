-- =====================================================
-- FIX RLS PERFORMANCE WARNINGS
-- =====================================================
-- This file fixes the auth_rls_initplan warnings by wrapping
-- auth.uid() and auth.role() calls in (select ...) to ensure
-- they are evaluated once per query instead of per row.
--
-- INSTRUCTIONS:
-- 1. Run this file in your Supabase SQL Editor
-- 2. This will update all RLS policies to use optimized auth function calls
-- =====================================================

-- =====================================================
-- USERS TABLE POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Admins can view all users" ON public.users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = (select auth.uid()) AND role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- PROPERTIES TABLE POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Hosts can view their own properties" ON public.properties;
CREATE POLICY "Hosts can view their own properties" ON public.properties
  FOR SELECT USING (host_id = (select auth.uid()));

DROP POLICY IF EXISTS "Hosts can insert their own properties" ON public.properties;
CREATE POLICY "Hosts can insert their own properties" ON public.properties
  FOR INSERT WITH CHECK (host_id = (select auth.uid()));

DROP POLICY IF EXISTS "Hosts can update their own properties" ON public.properties;
CREATE POLICY "Hosts can update their own properties" ON public.properties
  FOR UPDATE USING (host_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all properties" ON public.properties;
CREATE POLICY "Admins can manage all properties" ON public.properties
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = (select auth.uid()) AND role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- BOOKINGS TABLE POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
CREATE POLICY "Users can view their own bookings" ON public.bookings
  FOR SELECT USING (renter_id = (select auth.uid()) OR host_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
CREATE POLICY "Users can create bookings" ON public.bookings
  FOR INSERT WITH CHECK (renter_id = (select auth.uid()));

DROP POLICY IF EXISTS "Hosts can update their property bookings" ON public.bookings;
CREATE POLICY "Hosts can update their property bookings" ON public.bookings
  FOR UPDATE USING (host_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all bookings" ON public.bookings;
CREATE POLICY "Admins can manage all bookings" ON public.bookings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = (select auth.uid()) AND role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- MESSAGES TABLE POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view messages from their bookings" ON public.messages;
CREATE POLICY "Users can view messages from their bookings" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE id = messages.booking_id 
      AND (renter_id = (select auth.uid()) OR host_id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can send messages to their bookings" ON public.messages;
CREATE POLICY "Users can send messages to their bookings" ON public.messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE id = messages.booking_id 
      AND (renter_id = (select auth.uid()) OR host_id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can update messages they received" ON public.messages;
CREATE POLICY "Users can update messages they received" ON public.messages
  FOR UPDATE USING (receiver_id = (select auth.uid()));

-- =====================================================
-- REVIEWS TABLE POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can create reviews for their completed bookings" ON public.reviews;
CREATE POLICY "Users can create reviews for their completed bookings" ON public.reviews
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE id = reviews.booking_id 
      AND renter_id = (select auth.uid()) 
      AND status = 'completed'
    )
  );

-- =====================================================
-- NOTIFICATIONS TABLE POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (user_id = (select auth.uid()));

-- =====================================================
-- ADMIN LOGS TABLE POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Only admins can view admin logs" ON public.admin_logs;
CREATE POLICY "Only admins can view admin logs" ON public.admin_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = (select auth.uid()) AND role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- SYSTEM SETTINGS TABLE POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Only admins can manage system settings" ON public.system_settings;
CREATE POLICY "Only admins can manage system settings" ON public.system_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = (select auth.uid()) AND role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- PROPERTY PHOTOS TABLE POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Hosts can insert photos for their properties" ON public.property_photos;
CREATE POLICY "Hosts can insert photos for their properties" ON public.property_photos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = property_photos.property_id
      AND host_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Hosts can update photos for their properties" ON public.property_photos;
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

DROP POLICY IF EXISTS "Hosts can delete photos for their properties" ON public.property_photos;
CREATE POLICY "Hosts can delete photos for their properties" ON public.property_photos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = property_photos.property_id
      AND host_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can manage all property photos" ON public.property_photos;
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

DROP POLICY IF EXISTS "Service role can manage property photos" ON public.property_photos;
CREATE POLICY "Service role can manage property photos" ON public.property_photos
  FOR ALL
  USING ((select auth.role()) = 'service_role')
  WITH CHECK ((select auth.role()) = 'service_role');

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

-- ✅ RLS performance warnings fixed!
-- 
-- All auth.uid() and auth.role() calls have been wrapped in
-- (select ...) to ensure they are evaluated once per query
-- instead of per row, improving query performance at scale.
--
-- Note: The "multiple permissive policies" warnings are expected
-- and acceptable for your security model. They indicate that
-- multiple policies apply to the same role/action (e.g., admins
-- can manage all + users can manage their own), which is necessary
-- for proper access control. The performance impact is minimal
-- compared to the security benefits.

