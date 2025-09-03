-- Temporary RLS Disable - Test Backend Without Restrictions
-- Run this in your Supabase SQL Editor

-- Completely disable RLS on the users table
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start completely fresh
DROP POLICY IF EXISTS "users_can_read_own" ON public.users;
DROP POLICY IF EXISTS "users_can_update_own" ON public.users;
DROP POLICY IF EXISTS "service_role_full_access" ON public.users;
DROP POLICY IF EXISTS "allow_auth_insert" ON public.users;

-- Test if the backend can now work without RLS restrictions
SELECT COUNT(*) FROM public.users;

-- This will allow your backend to work without any RLS restrictions
-- We can re-enable RLS later once we confirm the backend is working
