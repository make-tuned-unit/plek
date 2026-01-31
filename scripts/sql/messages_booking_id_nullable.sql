-- Allow admin-to-user direct messages (support) without a booking.
-- Run in Supabase SQL Editor.

ALTER TABLE messages
  ALTER COLUMN booking_id DROP NOT NULL;

-- Optional: add a check so either booking_id is set OR it's a direct message
-- (sender/receiver still required). No constraint needed for now.
