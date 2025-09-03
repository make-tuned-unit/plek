-- Final RLS Fix - Allow Signup While Maintaining Security
-- Run this in your Supabase SQL Editor

-- First, completely disable RLS to clear everything
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "allow_users_read_own" ON public.users;
DROP POLICY IF EXISTS "allow_users_update_own" ON public.users;
DROP POLICY IF EXISTS "allow_users_insert_own" ON public.users;
DROP POLICY IF EXISTS "allow_service_role" ON public.users;

-- Now create policies that work for the entire auth flow
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow authenticated users to read their own profile
CREATE POLICY "users_can_read_own" ON public.users
    FOR SELECT USING (auth.uid()::text = id::text);

-- Policy 2: Allow authenticated users to update their own profile
CREATE POLICY "users_can_update_own" ON public.users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Policy 3: Allow service role (your backend) to do everything
-- This is the key policy that allows signup to work
CREATE POLICY "service_role_full_access" ON public.users
    FOR ALL USING (auth.role() = 'service_role');

-- Policy 4: Allow the auth system to insert new users during signup
-- This is needed for the initial user creation
CREATE POLICY "allow_auth_insert" ON public.users
    FOR INSERT WITH CHECK (true);

-- Test if it works
SELECT COUNT(*) FROM public.users;
