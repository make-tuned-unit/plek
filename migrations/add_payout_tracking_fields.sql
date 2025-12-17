-- Migration: Add payout tracking fields to support delayed onboarding
-- Date: 2025-01-27
-- Purpose: Track host earnings and payout status without requiring upfront Stripe setup

-- Add payout tracking fields to bookings table
ALTER TABLE public.bookings 
  ADD COLUMN IF NOT EXISTS host_net_amount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS payout_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payout_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT;

-- Add payout status fields to users table
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS payouts_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS details_submitted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pending_earnings DECIMAL(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS requirements_due JSONB DEFAULT '[]'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN public.bookings.host_net_amount IS 'Amount host should receive after platform fees (baseAmount - hostServiceFee)';
COMMENT ON COLUMN public.bookings.platform_fee IS 'Platform service fee (bookerServiceFee + hostServiceFee)';
COMMENT ON COLUMN public.bookings.payout_status IS 'Status: pending, eligible_for_payout, paid_out, failed';
COMMENT ON COLUMN public.bookings.payout_date IS 'Date when payout was processed';
COMMENT ON COLUMN public.bookings.stripe_transfer_id IS 'Stripe transfer ID if payout was processed';

COMMENT ON COLUMN public.users.payouts_enabled IS 'Whether host can receive payouts (from Stripe account.payouts_enabled)';
COMMENT ON COLUMN public.users.details_submitted IS 'Whether host has submitted required details (from Stripe account.details_submitted)';
COMMENT ON COLUMN public.users.pending_earnings IS 'Total amount of earnings waiting to be paid out';
COMMENT ON COLUMN public.users.requirements_due IS 'Array of pending Stripe requirements (from account.requirements.currently_due)';

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_bookings_payout_status ON public.bookings(payout_status) WHERE payout_status != 'paid_out';
CREATE INDEX IF NOT EXISTS idx_users_pending_earnings ON public.users(pending_earnings) WHERE pending_earnings > 0;

