-- =====================================================
-- FIX REVIEWS TABLE SCHEMA
-- =====================================================
-- 
-- INSTRUCTIONS:
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to SQL Editor
-- 3. Run this SQL file
--
-- This fixes the reviews table to allow both renter and host
-- to review each other for the same booking.
--
-- =====================================================

-- Drop the incorrect UNIQUE constraint on booking_id
-- (This allows multiple reviews per booking - one from renter, one from host)
ALTER TABLE public.reviews 
DROP CONSTRAINT IF EXISTS reviews_booking_id_key;

-- Add a composite unique constraint on (booking_id, reviewer_id)
-- This ensures each reviewer can only review a booking once,
-- but allows both renter and host to review the same booking
ALTER TABLE public.reviews 
ADD CONSTRAINT reviews_booking_reviewer_unique 
UNIQUE (booking_id, reviewer_id);

-- Verify the constraint was created
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.reviews'::regclass
  AND conname = 'reviews_booking_reviewer_unique';

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

-- ✅ Reviews schema fixed!
-- 
-- What changed:
-- - Removed UNIQUE constraint on booking_id alone
-- - Added composite UNIQUE constraint on (booking_id, reviewer_id)
-- 
-- This allows:
-- - Renter can review the host for a booking
-- - Host can review the renter for the same booking
-- - Each person can only review once per booking
--
-- Note: If you have existing reviews, they should still work.
-- The new constraint will prevent duplicate reviews from the same reviewer.




