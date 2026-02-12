-- Add timezone column to bookings so emails display times in the user's local timezone
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS timezone TEXT;
