-- User notification and privacy preferences for Account Settings.
-- Run in Supabase SQL Editor.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_notifications_bookings boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sms_notifications boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS marketing_emails boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS profile_visible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_reviews boolean NOT NULL DEFAULT true;
