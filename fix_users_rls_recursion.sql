-- =====================================================
-- FIX: Infinite recursion in policy for relation "users"
-- =====================================================
-- The "Admins can view all users" policy does SELECT FROM public.users
-- to check if the current user is admin, which re-triggers RLS on users
-- and causes infinite recursion.
--
-- Fix: Use a SECURITY DEFINER function so the admin check reads users
-- with definer privileges (no RLS), and add explicit service_role policy
-- so the backend always has access.
--
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor).
-- =====================================================

-- 1) Helper: check if current user is admin without triggering RLS on users
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  );
$$;

-- 2) Drop the recursive "Admins can view all users" policy
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;

-- 3) Recreate admin policy using the helper (no recursion)
CREATE POLICY "Admins can view all users" ON public.users
  FOR ALL
  USING (public.current_user_is_admin());

-- 4) Ensure service role (backend) can always access users (no RLS recursion)
DROP POLICY IF EXISTS "Service role full access on users" ON public.users;
CREATE POLICY "Service role full access on users" ON public.users
  FOR ALL
  USING (auth.role() = 'service_role');

-- Optional: if you use different policy names from other scripts, drop duplicates
DROP POLICY IF EXISTS "service_role_full_access" ON public.users;
DROP POLICY IF EXISTS "allow_service_role" ON public.users;
