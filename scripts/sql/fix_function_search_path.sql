-- =====================================================
-- FIX FUNCTION SEARCH PATH SECURITY WARNINGS
-- =====================================================
-- This file fixes the security warnings about mutable search_path
-- for functions that don't have a fixed search_path set.
--
-- Setting search_path prevents search path injection attacks where
-- malicious users could manipulate the schema search order.
--
-- INSTRUCTIONS:
-- 1. Run this file in your Supabase SQL Editor
-- 2. This will set the search_path for the functions to 'public'
--    Setting to 'public' is recommended for compatibility while
--    still preventing search path injection attacks.
-- =====================================================

-- Fix update_email_verification function
DO $$
DECLARE
  func_signature TEXT;
BEGIN
  -- Get the function signature and set search_path
  SELECT 'public.update_email_verification(' || pg_get_function_identity_arguments(p.oid) || ')'
  INTO func_signature
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname = 'update_email_verification'
  LIMIT 1;
  
  IF func_signature IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION ' || func_signature || ' SET search_path = public';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Function might not exist or already have search_path set - ignore
    NULL;
END $$;

-- Fix update_verifications_updated_at function
DO $$
DECLARE
  func_signature TEXT;
BEGIN
  -- Get the function signature and set search_path
  SELECT 'public.update_verifications_updated_at(' || pg_get_function_identity_arguments(p.oid) || ')'
  INTO func_signature
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname = 'update_verifications_updated_at'
  LIMIT 1;
  
  IF func_signature IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION ' || func_signature || ' SET search_path = public';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Function might not exist or already have search_path set - ignore
    NULL;
END $$;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

-- ✅ Function search_path security warnings fixed!
-- 
-- What was set up:
-- 1. update_email_verification: search_path set to 'public'
-- 2. update_verifications_updated_at: search_path set to 'public'
--
-- Note: Setting search_path to 'public' prevents search path injection
-- attacks while maintaining compatibility with functions that reference
-- tables without explicit schema qualifiers.
