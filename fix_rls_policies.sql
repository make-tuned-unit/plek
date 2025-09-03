-- Fix RLS Policies for Infinite Recursion Issue
-- Run this in your Supabase SQL Editor

-- First, disable RLS temporarily to see what's happening
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;

-- Create new, safe RLS policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own profile (simple, no recursion)
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id::uuid);

-- Policy 2: Users can update their own profile (simple, no recursion)
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id::uuid);

-- Policy 3: Users can insert their own profile (simple, no recursion)
CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id::uuid);

-- Policy 4: Admins can view all users (simple, no recursion)
CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id::uuid = auth.uid() 
            AND role = 'admin'
        )
    );

-- Policy 5: Admins can update all users (simple, no recursion)
CREATE POLICY "Admins can update all users" ON public.users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id::uuid = auth.uid() 
            AND role = 'admin'
        )
    );

-- Policy 6: Service role can do everything (for your backend)
CREATE POLICY "Service role can do everything" ON public.users
    FOR ALL USING (auth.role() = 'service_role');

-- Test the policies
-- This should now work without infinite recursion
SELECT * FROM public.users LIMIT 1;
