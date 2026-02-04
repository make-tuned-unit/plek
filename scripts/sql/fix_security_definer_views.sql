-- Fix Supabase Security Advisor warning 0010: security_definer_view
-- Run this in Supabase SQL Editor to make the three views use SECURITY INVOKER
-- so they run with the caller's privileges and RLS on underlying tables applies.
-- Requires PostgreSQL 15+ (Supabase provides this).

-- 1. property_search_results
CREATE OR REPLACE VIEW public.property_search_results WITH (security_invoker = on) AS
SELECT
  p.id,
  p.title,
  p.description,
  p.property_type,
  p.address,
  p.city,
  p.state,
  p.zip_code,
  p.latitude,
  p.longitude,
  p.hourly_rate,
  p.daily_rate,
  p.is_available,
  p.instant_booking,
  p.require_approval,
  p.features,
  p.restrictions,
  p.access_type,
  u.first_name AS host_first_name,
  u.last_name AS host_last_name,
  u.rating AS host_rating,
  u.review_count AS host_review_count,
  COALESCE(avg_reviews.avg_rating, 0) AS property_rating,
  COALESCE(avg_reviews.review_count, 0) AS property_review_count,
  p.created_at
FROM public.properties p
JOIN public.users u ON p.host_id = u.id
LEFT JOIN (
  SELECT
    property_id,
    AVG(rating) AS avg_rating,
    COUNT(*) AS review_count
  FROM public.reviews
  GROUP BY property_id
) avg_reviews ON p.id = avg_reviews.property_id
WHERE p.status = 'active' AND p.is_available = true;

-- 2. user_dashboard_stats
CREATE OR REPLACE VIEW public.user_dashboard_stats WITH (security_invoker = on) AS
SELECT
  u.id,
  u.first_name,
  u.last_name,
  u.email,
  u.is_host,
  u.total_bookings,
  u.total_earnings,
  u.rating,
  u.review_count,
  COUNT(DISTINCT p.id) AS total_properties,
  COUNT(DISTINCT b.id) AS total_bookings_as_renter,
  COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.id END) AS completed_bookings,
  COUNT(DISTINCT CASE WHEN b.status = 'pending' THEN b.id END) AS pending_bookings
FROM public.users u
LEFT JOIN public.properties p ON u.id = p.host_id AND p.status = 'active'
LEFT JOIN public.bookings b ON u.id = b.renter_id
GROUP BY u.id, u.first_name, u.last_name, u.email, u.is_host, u.total_bookings, u.total_earnings, u.rating, u.review_count;

-- 3. admin_dashboard
CREATE OR REPLACE VIEW public.admin_dashboard WITH (security_invoker = on) AS
SELECT
  COUNT(*) AS total_users,
  COUNT(CASE WHEN is_host = true THEN 1 END) AS total_hosts,
  COUNT(CASE WHEN is_verified = true THEN 1 END) AS verified_users,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) AS new_users_30d,
  SUM(total_earnings) AS total_platform_earnings
FROM public.users
WHERE role = 'user';
