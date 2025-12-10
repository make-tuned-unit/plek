-- =====================================================
-- CREATE DATABASE TRIGGER FOR REVIEW REMINDERS
-- =====================================================
-- 
-- INSTRUCTIONS:
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to SQL Editor
-- 3. Run this SQL file
--
-- This trigger will automatically create review reminder
-- notifications when a booking is marked as completed,
-- even if done manually in Supabase.
--
-- =====================================================

-- Function to create review reminder notifications
CREATE OR REPLACE FUNCTION create_review_reminder_notifications()
RETURNS TRIGGER AS $$
DECLARE
  property_title TEXT;
  host_name TEXT;
  renter_name TEXT;
  existing_reviewer_ids UUID[];
  has_existing_notifications BOOLEAN;
BEGIN
  -- Only process when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Get property title
    SELECT title INTO property_title
    FROM public.properties
    WHERE id = NEW.property_id;
    
    IF property_title IS NULL THEN
      property_title := 'property';
    END IF;
    
    -- Get existing reviewer IDs
    SELECT ARRAY_AGG(reviewer_id) INTO existing_reviewer_ids
    FROM public.reviews
    WHERE booking_id = NEW.id;
    
    -- Check if review reminder notifications already exist
    SELECT EXISTS(
      SELECT 1 FROM public.notifications
      WHERE type = 'review_reminder'
      AND (data->>'booking_id' = NEW.id::text OR data->>'bookingId' = NEW.id::text)
    ) INTO has_existing_notifications;
    
    -- Only create notifications if they don't already exist
    IF NOT has_existing_notifications THEN
      
      -- Notify renter to review host (if not already reviewed)
      IF existing_reviewer_ids IS NULL OR NOT (NEW.renter_id = ANY(existing_reviewer_ids)) THEN
        -- Get host name
        SELECT COALESCE(
          TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))),
          'the host'
        ) INTO host_name
        FROM public.users
        WHERE id = NEW.host_id;
        
        -- Create notification for renter
        INSERT INTO public.notifications (
          user_id,
          type,
          title,
          message,
          data,
          is_read
        ) VALUES (
          NEW.renter_id,
          'review_reminder',
          'Leave a Review',
          'How was your experience with ' || host_name || '? Leave a review for ' || property_title,
          jsonb_build_object(
            'booking_id', NEW.id,
            'property_id', NEW.property_id,
            'reviewed_user_id', NEW.host_id
          ),
          false
        );
      END IF;
      
      -- Notify host to review renter (if not already reviewed)
      IF existing_reviewer_ids IS NULL OR NOT (NEW.host_id = ANY(existing_reviewer_ids)) THEN
        -- Get renter name
        SELECT COALESCE(
          TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))),
          'the renter'
        ) INTO renter_name
        FROM public.users
        WHERE id = NEW.renter_id;
        
        -- Create notification for host
        INSERT INTO public.notifications (
          user_id,
          type,
          title,
          message,
          data,
          is_read
        ) VALUES (
          NEW.host_id,
          'review_reminder',
          'Leave a Review',
          'How was your experience with ' || renter_name || '? Leave a review for your booking at ' || property_title,
          jsonb_build_object(
            'booking_id', NEW.id,
            'property_id', NEW.property_id,
            'reviewed_user_id', NEW.renter_id
          ),
          false
        );
      END IF;
      
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS create_review_reminders_on_booking_complete ON public.bookings;
CREATE TRIGGER create_review_reminders_on_booking_complete
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION create_review_reminder_notifications();

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

-- ✅ Review reminder trigger created!
-- 
-- What this does:
-- - Automatically creates review reminder notifications when a booking
--   status is set to 'completed' (even if done manually in Supabase)
-- - Checks for existing reviews before creating notifications
-- - Checks for existing notifications to avoid duplicates
-- - Creates notifications for both renter and host
--
-- Note: This trigger will fire for both INSERT and UPDATE operations,
-- but will only create notifications when status changes to 'completed'.

