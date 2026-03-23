ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS host_type TEXT;

COMMENT ON COLUMN public.users.host_type IS
  'Optional host segment for onboarding and permissions. Expected values: residential or commercial.';
