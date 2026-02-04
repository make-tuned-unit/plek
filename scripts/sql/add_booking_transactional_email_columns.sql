-- =====================================================
-- ADD COLUMNS TO TRACK TRANSACTIONAL EMAILS SENT
-- =====================================================
-- Used by cron job to avoid sending duplicate:
-- - Renter/Host upcoming booking reminders (e.g. 24h before start)
-- - Renter/Host review request emails (e.g. 24h after end)
--
-- Run in Supabase SQL Editor.
-- =====================================================

-- Renter reminder: sent when we email the renter about their upcoming reservation
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS reminder_renter_sent_at TIMESTAMP WITH TIME ZONE;

-- Host reminder: sent when we email the host about their upcoming booking
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS reminder_host_sent_at TIMESTAMP WITH TIME ZONE;

-- Renter review request: sent when we ask the renter to review the space/host
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS review_request_renter_sent_at TIMESTAMP WITH TIME ZONE;

-- Host review request: sent when we ask the host to review the renter
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS review_request_host_sent_at TIMESTAMP WITH TIME ZONE;

-- Optional: index to speed up cron queries (bookings in reminder/review window)
CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON public.bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_end_time ON public.bookings(end_time);
