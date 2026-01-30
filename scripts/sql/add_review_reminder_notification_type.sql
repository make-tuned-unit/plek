-- =====================================================
-- ADD REVIEW_REMINDER TO NOTIFICATION_TYPE ENUM
-- =====================================================
-- 
-- INSTRUCTIONS:
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to SQL Editor
-- 3. Run this SQL file
--
-- =====================================================

-- Add 'review_reminder' to the notification_type enum
-- Note: PostgreSQL doesn't support ALTER TYPE ... ADD VALUE in a transaction
-- So we need to add it directly
DO $$ 
BEGIN
  -- Check if 'review_reminder' already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'review_reminder' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')
  ) THEN
    ALTER TYPE notification_type ADD VALUE 'review_reminder';
  END IF;
END $$;

-- Verify the enum was updated
SELECT 
  t.typname AS enum_name,
  e.enumlabel AS enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid 
WHERE t.typname = 'notification_type'
ORDER BY e.enumsortorder;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

-- ✅ Review reminder notification type added!
-- 
-- The notification_type enum now includes:
-- - booking_request
-- - booking_confirmed
-- - booking_cancelled
-- - payment_received
-- - message_received
-- - review_received
-- - system_update
-- - property_approved
-- - property_rejected
-- - review_reminder (NEW)




