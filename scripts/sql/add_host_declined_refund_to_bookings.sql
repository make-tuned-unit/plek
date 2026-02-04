-- =====================================================
-- ADD host_declined_refund TO BOOKINGS
-- =====================================================
-- When a booking is cancelled within 24h of start, the host can
-- issue full/partial refund or decline. This flag hides the booking
-- from "pending refund" list when host chooses no refund.
-- Run in Supabase SQL Editor.
-- =====================================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS host_declined_refund BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.bookings.host_declined_refund IS 'Set when host explicitly declines to issue a refund (cancelled within 24h); hides from refund management list';
