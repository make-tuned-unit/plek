-- Remove default 'US' from users.country so new users don't get US by mistake.
-- Application code (signup/profile) sets country; Stripe Connect requires profile country to be set.
-- Run in Supabase SQL Editor.

ALTER TABLE users
  ALTER COLUMN country DROP DEFAULT;

-- Optional: set existing users with country = 'US' to NULL so they are prompted to set it
-- (only if you want to force re-selection; otherwise leave as-is)
-- UPDATE users SET country = NULL WHERE country = 'US';
