-- Add stripe_account_status column to users table
-- This tracks the status of the Stripe Connect account

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS stripe_account_status TEXT DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN public.users.stripe_account_status IS 'Status of Stripe Connect account: pending, active, restricted, or rejected';





