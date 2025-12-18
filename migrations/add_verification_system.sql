-- Migration: Add verification system for hosts and properties
-- Date: 2025-01-27
-- Purpose: Enable multi-layered verification with badges and yearly re-verification

-- Add verification status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
    CREATE TYPE verification_status AS ENUM (
      'unverified', 
      'pending', 
      'verified', 
      'rejected',
      'expired'
    );
  END IF;
END $$;

-- Add verification type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_type') THEN
    CREATE TYPE verification_type AS ENUM (
      'email',
      'identity',
      'property_photos',
      'property_location',
      'stripe_payout'
    );
  END IF;
END $$;

-- Update users table with verification fields
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS verification_status verification_status DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS identity_verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update properties table with verification fields
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS verification_status verification_status DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS photos_verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS location_verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMP WITH TIME ZONE;

-- Create verification records table
CREATE TABLE IF NOT EXISTS public.verifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  verification_type verification_type NOT NULL,
  status verification_status DEFAULT 'pending',
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID REFERENCES public.users(id), -- Admin who verified
  rejection_reason TEXT,
  documents JSONB, -- Store verification documents/evidence (e.g., ID images)
  metadata JSONB, -- Additional verification data
  expires_at TIMESTAMP WITH TIME ZONE, -- For yearly re-verification
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure at least one of user_id or property_id is set
  CONSTRAINT verifications_user_or_property CHECK (
    (user_id IS NOT NULL) OR (property_id IS NOT NULL)
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_verifications_user_id ON public.verifications(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_verifications_property_id ON public.verifications(property_id) WHERE property_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_verifications_status ON public.verifications(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_verifications_type ON public.verifications(verification_type);
CREATE INDEX IF NOT EXISTS idx_verifications_expires_at ON public.verifications(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_verification_status ON public.users(verification_status);
CREATE INDEX IF NOT EXISTS idx_users_last_activity ON public.users(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_properties_verification_status ON public.properties(verification_status);

-- Add comments for documentation
COMMENT ON COLUMN public.users.verification_status IS 'Overall verification status: unverified, pending, verified, rejected, expired';
COMMENT ON COLUMN public.users.email_verified_at IS 'Timestamp when email was verified (via Supabase Auth)';
COMMENT ON COLUMN public.users.identity_verified_at IS 'Timestamp when identity documents were approved by admin';
COMMENT ON COLUMN public.users.verified_at IS 'Timestamp when user earned verified badge';
COMMENT ON COLUMN public.users.verification_expires_at IS 'When verification expires (for yearly re-verification)';
COMMENT ON COLUMN public.users.last_activity_at IS 'Last activity timestamp (booking, property update, etc.) for re-verification checks';

COMMENT ON COLUMN public.properties.verification_status IS 'Property verification status';
COMMENT ON COLUMN public.properties.photos_verified_at IS 'Timestamp when property photos were verified';
COMMENT ON COLUMN public.properties.location_verified_at IS 'Timestamp when property location was verified';

COMMENT ON TABLE public.verifications IS 'Tracks all verification submissions and their status';
COMMENT ON COLUMN public.verifications.documents IS 'JSONB storing verification documents (e.g., {frontImage: url, backImage: url, documentType: string})';
COMMENT ON COLUMN public.verifications.metadata IS 'Additional verification metadata (e.g., geocoding results, photo analysis)';

-- Create function to update verification status when email is verified
-- This will be called from Supabase Auth trigger or application code
CREATE OR REPLACE FUNCTION update_email_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- When email is confirmed in auth.users, update public.users
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE public.users
    SET email_verified_at = NEW.email_confirmed_at
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: The trigger on auth.users would need to be created via Supabase Dashboard
-- or via a migration that has superuser privileges. For now, we'll handle this in application code.

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_verifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_verifications_updated_at
  BEFORE UPDATE ON public.verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_verifications_updated_at();

