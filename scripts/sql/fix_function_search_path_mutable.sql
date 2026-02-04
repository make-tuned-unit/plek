-- Fix Supabase Security Advisor warning 0011: function_search_path_mutable
-- Run this in Supabase SQL Editor to set search_path on the six functions.
-- This prevents search path injection (e.g. malicious user setting search_path
-- to resolve unqualified names to their own objects).

-- 1. update_updated_at_column()
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 2. calculate_property_rating(property_uuid UUID)
CREATE OR REPLACE FUNCTION public.calculate_property_rating(property_uuid UUID)
RETURNS DECIMAL(3,2) AS $$
DECLARE
  avg_rating DECIMAL(3,2);
BEGIN
  SELECT AVG(rating) INTO avg_rating
  FROM public.reviews
  WHERE property_id = property_uuid;
  RETURN COALESCE(avg_rating, 0.00);
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 3. calculate_user_rating(user_uuid UUID)
CREATE OR REPLACE FUNCTION public.calculate_user_rating(user_uuid UUID)
RETURNS DECIMAL(3,2) AS $$
DECLARE
  avg_rating DECIMAL(3,2);
BEGIN
  SELECT AVG(rating) INTO avg_rating
  FROM public.reviews
  WHERE reviewed_user_id = user_uuid;
  RETURN COALESCE(avg_rating, 0.00);
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 4. update_user_stats_after_booking()
CREATE OR REPLACE FUNCTION public.update_user_stats_after_booking()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE public.users SET total_earnings = total_earnings + NEW.total_amount WHERE id = NEW.host_id;
    UPDATE public.users SET total_bookings = total_bookings + 1 WHERE id = NEW.renter_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 5. create_notification(...)
CREATE OR REPLACE FUNCTION public.create_notification(
  user_uuid UUID,
  notif_type notification_type,
  notif_title TEXT,
  notif_message TEXT,
  notif_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (user_uuid, notif_type, notif_title, notif_message, notif_data)
  RETURNING id INTO notification_id;
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 6. log_admin_action(...)
CREATE OR REPLACE FUNCTION public.log_admin_action(
  admin_uuid UUID,
  action_text TEXT,
  table_name TEXT DEFAULT NULL,
  record_uuid UUID DEFAULT NULL,
  old_vals JSONB DEFAULT NULL,
  new_vals JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.admin_logs (admin_id, action, table_name, record_id, old_values, new_values)
  VALUES (admin_uuid, action_text, table_name, record_uuid, old_vals, new_vals)
  RETURNING id INTO log_id;
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SET search_path = public;
