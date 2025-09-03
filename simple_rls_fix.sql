-- Simple RLS Fix - No Complex References
-- Run this in your Supabase SQL Editor

-- First, completely disable RLS to clear everything
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Service role can do everything" ON public.users;

-- Now create the simplest possible policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow all authenticated users to read their own profile
CREATE POLICY "allow_users_read_own" ON public.users
    FOR SELECT USING (auth.uid()::text = id::text);

-- Policy 2: Allow all authenticated users to update their own profile  
CREATE POLICY "allow_users_update_own" ON public.users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Policy 3: Allow all authenticated users to insert their own profile
CREATE POLICY "allow_users_insert_own" ON public.users
    FOR INSERT WITH CHECK (auth.uid()::text = id::text);

-- Policy 4: Allow service role (your backend) to do everything
CREATE POLICY "allow_service_role" ON public.users
    FOR ALL USING (auth.role() = 'service_role');

-- Test if it works
SELECT COUNT(*) FROM public.users;
