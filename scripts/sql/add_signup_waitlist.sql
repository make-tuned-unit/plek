-- Waitlist for users who sign up from regions where plekk is not yet available (e.g. outside Nova Scotia during beta)
CREATE TABLE IF NOT EXISTS public.signup_waitlist (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT NOT NULL,
  province TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (email, province)
);

COMMENT ON TABLE public.signup_waitlist IS 'Users who signed up from regions not yet supported; we will contact them when plekk is available.';
