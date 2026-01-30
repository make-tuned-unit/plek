-- =====================================================
-- CREATE TRIGGER TO UPDATE USER RATINGS AND REVIEW COUNTS
-- =====================================================
-- 
-- INSTRUCTIONS:
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to SQL Editor
-- 3. Run this SQL file
--
-- This trigger will automatically update user ratings and
-- review counts when reviews are created, updated, or deleted.
--
-- =====================================================

-- Function to update user rating and review count
CREATE OR REPLACE FUNCTION update_user_rating_on_review()
RETURNS TRIGGER AS $$
DECLARE
  avg_rating DECIMAL(3,2);
  total_reviews INTEGER;
  reviewed_user_uuid UUID;
BEGIN
  -- Get the reviewed user ID
  reviewed_user_uuid := COALESCE(NEW.reviewed_user_id, OLD.reviewed_user_id);
  
  -- Calculate new average rating and count for the reviewed user
  SELECT 
    COALESCE(AVG(rating), 0.00),
    COUNT(*)
  INTO avg_rating, total_reviews
  FROM public.reviews
  WHERE reviewed_user_id = reviewed_user_uuid;
  
  -- Update the reviewed user's rating and review count
  UPDATE public.users
  SET 
    rating = avg_rating,
    review_count = total_reviews,
    updated_at = NOW()
  WHERE id = reviewed_user_uuid;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- Create trigger for INSERT (when review is created)
DROP TRIGGER IF EXISTS update_user_rating_on_review_insert ON public.reviews;
CREATE TRIGGER update_user_rating_on_review_insert
  AFTER INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_user_rating_on_review();

-- Create trigger for UPDATE (when review is updated)
DROP TRIGGER IF EXISTS update_user_rating_on_review_update ON public.reviews;
CREATE TRIGGER update_user_rating_on_review_update
  AFTER UPDATE ON public.reviews
  FOR EACH ROW
  WHEN (OLD.rating IS DISTINCT FROM NEW.rating OR OLD.reviewed_user_id IS DISTINCT FROM NEW.reviewed_user_id)
  EXECUTE FUNCTION update_user_rating_on_review();

-- Create trigger for DELETE (when review is deleted)
DROP TRIGGER IF EXISTS update_user_rating_on_review_delete ON public.reviews;
CREATE TRIGGER update_user_rating_on_review_delete
  AFTER DELETE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_user_rating_on_review();

-- =====================================================
-- BACKFILL EXISTING REVIEWS
-- =====================================================
-- Update all users who have reviews to have correct ratings and counts

DO $$
DECLARE
  user_record RECORD;
  avg_rating DECIMAL(3,2);
  total_reviews INTEGER;
BEGIN
  -- Loop through all users who have been reviewed
  FOR user_record IN 
    SELECT DISTINCT reviewed_user_id 
    FROM public.reviews
  LOOP
    -- Calculate rating and count for this user
    SELECT 
      COALESCE(AVG(rating), 0.00),
      COUNT(*)
    INTO avg_rating, total_reviews
    FROM public.reviews
    WHERE reviewed_user_id = user_record.reviewed_user_id;
    
    -- Update the user
    UPDATE public.users
    SET 
      rating = avg_rating,
      review_count = total_reviews,
      updated_at = NOW()
    WHERE id = user_record.reviewed_user_id;
  END LOOP;
END $$;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

-- ✅ User rating update trigger created!
-- 
-- What this does:
-- - Automatically updates user rating (average of all reviews) when reviews are created
-- - Automatically updates review_count when reviews are created/deleted
-- - Works for INSERT, UPDATE, and DELETE operations
-- - Backfills existing reviews to update all users' ratings
--
-- Note: The triggers will fire automatically for all future review operations.
-- The backfill script updates all existing users who have reviews.

