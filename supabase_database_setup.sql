-- =====================================================
-- DRIVE MY WAY - SUPABASE DATABASE SETUP
-- Complete database schema for parking app backend
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- ENUMS
-- =====================================================

-- Property types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'property_type') THEN
    CREATE TYPE property_type AS ENUM ('driveway', 'garage', 'street', 'storage', 'event_space');
  END IF;
END $$;

-- Property status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'property_status') THEN
    CREATE TYPE property_status AS ENUM ('active', 'inactive', 'suspended', 'deleted', 'pending_review');
  END IF;
END $$;

-- Access types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'access_type') THEN
    CREATE TYPE access_type AS ENUM ('remote', 'key_pickup', 'code', 'in_person');
  END IF;
END $$;

-- Booking status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
    CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed', 'disputed', 'expired');
  END IF;
END $$;

-- Payment status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded', 'partially_refunded');
  END IF;
END $$;

-- Payment types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_type') THEN
    CREATE TYPE payment_type AS ENUM ('booking', 'security_deposit', 'service_fee', 'refund');
  END IF;
END $$;

-- Message types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_type') THEN
    CREATE TYPE message_type AS ENUM ('text', 'image', 'file');
  END IF;
END $$;

-- Notification types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE notification_type AS ENUM (
      'booking_request', 'booking_confirmed', 'booking_cancelled', 
      'payment_received', 'message_received', 'review_received', 
      'system_update', 'property_approved', 'property_rejected'
    );
  END IF;
END $$;

-- User roles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('user', 'host', 'admin', 'super_admin');
  END IF;
END $$;

-- Vehicle sizes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vehicle_size') THEN
    CREATE TYPE vehicle_size AS ENUM ('compact', 'sedan', 'suv', 'truck', 'any');
  END IF;
END $$;

-- =====================================================
-- TABLES
-- =====================================================

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  avatar TEXT,
  bio TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'US',
  is_verified BOOLEAN DEFAULT FALSE,
  is_host BOOLEAN DEFAULT FALSE,
  role user_role DEFAULT 'user',
  stripe_customer_id TEXT,
  stripe_account_id TEXT,
  total_bookings INTEGER DEFAULT 0,
  total_earnings DECIMAL(10,2) DEFAULT 0.00,
  rating DECIMAL(3,2) DEFAULT 0.00,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Host profiles for additional host-specific information
CREATE TABLE IF NOT EXISTS public.host_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  business_name TEXT,
  tax_id TEXT,
  bank_account_info JSONB, -- Encrypted bank account information
  payout_schedule TEXT DEFAULT 'weekly', -- weekly, monthly
  auto_accept_bookings BOOLEAN DEFAULT FALSE,
  response_time INTEGER, -- Average response time in hours
  verification_documents JSONB, -- For KYC/verification
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Properties table
CREATE TABLE IF NOT EXISTS public.properties (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  host_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Basic information
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  property_type property_type DEFAULT 'driveway',
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  country TEXT DEFAULT 'US',
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  
  -- Property details
  size DECIMAL(8,2), -- in square feet
  max_vehicles INTEGER DEFAULT 1,
  max_vehicle_size vehicle_size DEFAULT 'sedan',
  height DECIMAL(5,2), -- in feet, for storage spaces
  width DECIMAL(5,2), -- in feet
  length DECIMAL(5,2), -- in feet
  
  -- Amenities and features
  features TEXT[], -- Array of features
  restrictions TEXT[], -- Array of restrictions
  access_type access_type DEFAULT 'remote',
  access_instructions TEXT,
  
  -- Pricing
  hourly_rate DECIMAL(8,2),
  daily_rate DECIMAL(8,2),
  weekly_rate DECIMAL(8,2),
  monthly_rate DECIMAL(8,2),
  security_deposit DECIMAL(8,2) DEFAULT 0,
  service_fee_percentage DECIMAL(5,2) DEFAULT 10.00,
  
  -- Availability
  is_available BOOLEAN DEFAULT TRUE,
  instant_booking BOOLEAN DEFAULT TRUE,
  require_approval BOOLEAN DEFAULT FALSE,
  min_booking_hours INTEGER DEFAULT 1,
  max_booking_days INTEGER DEFAULT 30,
  
  -- Weekly availability
  monday_available BOOLEAN DEFAULT TRUE,
  tuesday_available BOOLEAN DEFAULT TRUE,
  wednesday_available BOOLEAN DEFAULT TRUE,
  thursday_available BOOLEAN DEFAULT TRUE,
  friday_available BOOLEAN DEFAULT TRUE,
  saturday_available BOOLEAN DEFAULT TRUE,
  sunday_available BOOLEAN DEFAULT TRUE,
  
  -- Daily availability
  start_time TIME DEFAULT '00:00',
  end_time TIME DEFAULT '23:59',
  
  -- Status
  status property_status DEFAULT 'pending_review',
  is_verified BOOLEAN DEFAULT FALSE,
  admin_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Property photos
CREATE TABLE IF NOT EXISTS public.property_photos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  caption TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Availability calendar (for specific date overrides)
CREATE TABLE IF NOT EXISTS public.availability (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  price_override DECIMAL(8,2), -- Override price for specific date
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(property_id, date)
);

-- Bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  renter_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  host_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Booking details
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  total_hours DECIMAL(5,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  security_deposit DECIMAL(8,2) DEFAULT 0,
  service_fee DECIMAL(8,2) DEFAULT 0,
  
  -- Status
  status booking_status DEFAULT 'pending',
  payment_status payment_status DEFAULT 'pending',
  
  -- Special requests
  special_requests TEXT,
  vehicle_info JSONB, -- Vehicle details
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Payment details
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  payment_method TEXT, -- Stripe payment method ID
  stripe_payment_id TEXT UNIQUE,
  stripe_refund_id TEXT,
  
  -- Status
  status payment_status NOT NULL,
  type payment_type NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table for communication
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Message content
  content TEXT NOT NULL,
  message_type message_type DEFAULT 'text',
  is_read BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE UNIQUE,
  reviewer_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  reviewed_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  
  -- Review content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  cleanliness INTEGER CHECK (cleanliness >= 1 AND cleanliness <= 5),
  communication INTEGER CHECK (communication >= 1 AND communication <= 5),
  check_in INTEGER CHECK (check_in >= 1 AND check_in <= 5),
  accuracy INTEGER CHECK (accuracy >= 1 AND accuracy <= 5),
  value INTEGER CHECK (value >= 1 AND value <= 5),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Notification details
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB, -- Additional data
  is_read BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin actions log
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_host ON public.users(is_host);
CREATE INDEX IF NOT EXISTS idx_users_city_state ON public.users(city, state);

-- Properties
CREATE INDEX IF NOT EXISTS idx_properties_host_id ON public.properties(host_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_location ON public.properties(city, state, zip_code);
CREATE INDEX IF NOT EXISTS idx_properties_coordinates ON public.properties(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_properties_type ON public.properties(property_type);
CREATE INDEX IF NOT EXISTS idx_properties_available ON public.properties(is_available, status);

-- Bookings
CREATE INDEX IF NOT EXISTS idx_bookings_property_id ON public.bookings(property_id);
CREATE INDEX IF NOT EXISTS idx_bookings_renter_id ON public.bookings(renter_id);
CREATE INDEX IF NOT EXISTS idx_bookings_host_id ON public.bookings(host_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON public.bookings(start_time, end_time);

-- Payments
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_id ON public.payments(stripe_payment_id);

-- Messages
CREATE INDEX IF NOT EXISTS idx_messages_booking_id ON public.messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON public.messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

-- Reviews
CREATE INDEX IF NOT EXISTS idx_reviews_property_id ON public.reviews(property_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON public.reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_user_id ON public.reviews(reviewed_user_id);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.host_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Users table policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Admins can view all users" ON public.users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = (select auth.uid()) AND role IN ('admin', 'super_admin')
    )
  );

-- Properties table policies
DROP POLICY IF EXISTS "Anyone can view active properties" ON public.properties;
CREATE POLICY "Anyone can view active properties" ON public.properties
  FOR SELECT USING (status = 'active' AND is_available = true);

DROP POLICY IF EXISTS "Hosts can view their own properties" ON public.properties;
CREATE POLICY "Hosts can view their own properties" ON public.properties
  FOR SELECT USING (host_id = (select auth.uid()));

DROP POLICY IF EXISTS "Hosts can insert their own properties" ON public.properties;
CREATE POLICY "Hosts can insert their own properties" ON public.properties
  FOR INSERT WITH CHECK (host_id = (select auth.uid()));

DROP POLICY IF EXISTS "Hosts can update their own properties" ON public.properties;
CREATE POLICY "Hosts can update their own properties" ON public.properties
  FOR UPDATE USING (host_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all properties" ON public.properties;
CREATE POLICY "Admins can manage all properties" ON public.properties
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = (select auth.uid()) AND role IN ('admin', 'super_admin')
    )
  );

-- Bookings table policies
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
CREATE POLICY "Users can view their own bookings" ON public.bookings
  FOR SELECT USING (renter_id = (select auth.uid()) OR host_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
CREATE POLICY "Users can create bookings" ON public.bookings
  FOR INSERT WITH CHECK (renter_id = (select auth.uid()));

DROP POLICY IF EXISTS "Hosts can update their property bookings" ON public.bookings;
CREATE POLICY "Hosts can update their property bookings" ON public.bookings
  FOR UPDATE USING (host_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all bookings" ON public.bookings;
CREATE POLICY "Admins can manage all bookings" ON public.bookings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = (select auth.uid()) AND role IN ('admin', 'super_admin')
    )
  );

-- Messages table policies
DROP POLICY IF EXISTS "Users can view messages from their bookings" ON public.messages;
CREATE POLICY "Users can view messages from their bookings" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE id = messages.booking_id 
      AND (renter_id = (select auth.uid()) OR host_id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can send messages to their bookings" ON public.messages;
CREATE POLICY "Users can send messages to their bookings" ON public.messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE id = messages.booking_id 
      AND (renter_id = (select auth.uid()) OR host_id = (select auth.uid()))
    )
  );

-- Reviews table policies
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
CREATE POLICY "Anyone can view reviews" ON public.reviews
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create reviews for their completed bookings" ON public.reviews;
CREATE POLICY "Users can create reviews for their completed bookings" ON public.reviews
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE id = reviews.booking_id 
      AND renter_id = (select auth.uid()) 
      AND status = 'completed'
    )
  );

-- Notifications table policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (user_id = (select auth.uid()));

-- Admin logs table policies
DROP POLICY IF EXISTS "Only admins can view admin logs" ON public.admin_logs;
CREATE POLICY "Only admins can view admin logs" ON public.admin_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = (select auth.uid()) AND role IN ('admin', 'super_admin')
    )
  );

-- System settings table policies
DROP POLICY IF EXISTS "Only admins can manage system settings" ON public.system_settings;
CREATE POLICY "Only admins can manage system settings" ON public.system_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = (select auth.uid()) AND role IN ('admin', 'super_admin')
    )
  );

-- Host profiles table policies
DROP POLICY IF EXISTS "Users can manage their own host profile" ON public.host_profiles;
CREATE POLICY "Users can manage their own host profile" ON public.host_profiles
  FOR ALL USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can view all host profiles" ON public.host_profiles;
CREATE POLICY "Admins can view all host profiles" ON public.host_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = (select auth.uid()) AND role IN ('admin', 'super_admin')
    )
  );

-- Availability table policies
DROP POLICY IF EXISTS "Anyone can view availability" ON public.availability;
CREATE POLICY "Anyone can view availability" ON public.availability
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Hosts can manage availability for their properties" ON public.availability;
CREATE POLICY "Hosts can manage availability for their properties" ON public.availability
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = availability.property_id
      AND host_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = availability.property_id
      AND host_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can manage all availability" ON public.availability;
CREATE POLICY "Admins can manage all availability" ON public.availability
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = (select auth.uid()) AND role IN ('admin', 'super_admin')
    )
  );

-- Payments table policies
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
CREATE POLICY "Users can view their own payments" ON public.payments
  FOR SELECT USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.bookings
      WHERE id = payments.booking_id
      AND (renter_id = (select auth.uid()) OR host_id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Service role and admins can manage payments" ON public.payments;
CREATE POLICY "Service role and admins can manage payments" ON public.payments
  FOR INSERT WITH CHECK (
    (select auth.role()) = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = (select auth.uid()) AND role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Service role and admins can update payments" ON public.payments;
CREATE POLICY "Service role and admins can update payments" ON public.payments
  FOR UPDATE USING (
    (select auth.role()) = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = (select auth.uid()) AND role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    (select auth.role()) = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = (select auth.uid()) AND role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
CREATE POLICY "Admins can view all payments" ON public.payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = (select auth.uid()) AND role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- Apply updated_at trigger to all tables
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_host_profiles_updated_at ON public.host_profiles;
CREATE TRIGGER update_host_profiles_updated_at BEFORE UPDATE ON public.host_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_properties_updated_at ON public.properties;
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_availability_updated_at ON public.availability;
CREATE TRIGGER update_availability_updated_at BEFORE UPDATE ON public.availability
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reviews_updated_at ON public.reviews;
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notifications_updated_at ON public.notifications;
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_system_settings_updated_at ON public.system_settings;
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate property rating
CREATE OR REPLACE FUNCTION calculate_property_rating(property_uuid UUID)
RETURNS DECIMAL(3,2) AS $$
DECLARE
  avg_rating DECIMAL(3,2);
BEGIN
  SELECT AVG(rating) INTO avg_rating
  FROM public.reviews
  WHERE property_id = property_uuid;
  
  RETURN COALESCE(avg_rating, 0.00);
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- Function to calculate user rating
CREATE OR REPLACE FUNCTION calculate_user_rating(user_uuid UUID)
RETURNS DECIMAL(3,2) AS $$
DECLARE
  avg_rating DECIMAL(3,2);
BEGIN
  SELECT AVG(rating) INTO avg_rating
  FROM public.reviews
  WHERE reviewed_user_id = user_uuid;
  
  RETURN COALESCE(avg_rating, 0.00);
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- Function to update user stats after booking completion
CREATE OR REPLACE FUNCTION update_user_stats_after_booking()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Update host earnings
    UPDATE public.users 
    SET total_earnings = total_earnings + NEW.total_amount
    WHERE id = NEW.host_id;
    
    -- Update renter booking count
    UPDATE public.users 
    SET total_bookings = total_bookings + 1
    WHERE id = NEW.renter_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- Apply booking stats trigger
DROP TRIGGER IF EXISTS update_user_stats_after_booking_trigger ON public.bookings;
CREATE TRIGGER update_user_stats_after_booking_trigger
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION update_user_stats_after_booking();

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
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
$$ LANGUAGE plpgsql
SET search_path = public;

-- Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
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
$$ LANGUAGE plpgsql
SET search_path = public;

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert default system settings
INSERT INTO public.system_settings (key, value, description) VALUES
('platform_fee_percentage', '"10.00"', 'Default platform fee percentage'),
('min_booking_hours', '"1"', 'Minimum booking duration in hours'),
('max_booking_days', '"30"', 'Maximum booking duration in days'),
('auto_approval_threshold', '"4.5"', 'Rating threshold for auto-approval'),
('support_email', '"support@plekk.com"', 'Support contact email'),
('max_property_photos', '"10"', 'Maximum photos per property'),
('instant_booking_enabled', '"true"', 'Whether instant booking is enabled globally')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    description = EXCLUDED.description;

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

CREATE OR REPLACE VIEW property_search_results
SECURITY INVOKER
AS
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
  u.first_name as host_first_name,
  u.last_name as host_last_name,
  u.rating as host_rating,
  u.review_count as host_review_count,
  COALESCE(avg_reviews.avg_rating, 0) as property_rating,
  COALESCE(avg_reviews.review_count, 0) as property_review_count,
  p.created_at
FROM public.properties p
JOIN public.users u ON p.host_id = u.id
LEFT JOIN (
  SELECT 
    property_id,
    AVG(rating) as avg_rating,
    COUNT(*) as review_count
  FROM public.reviews
  GROUP BY property_id
) avg_reviews ON p.id = avg_reviews.property_id
WHERE p.status = 'active' AND p.is_available = true;

CREATE OR REPLACE VIEW user_dashboard_stats
SECURITY INVOKER
AS
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
  COUNT(DISTINCT p.id) as total_properties,
  COUNT(DISTINCT b.id) as total_bookings_as_renter,
  COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.id END) as completed_bookings,
  COUNT(DISTINCT CASE WHEN b.status = 'pending' THEN b.id END) as pending_bookings
FROM public.users u
LEFT JOIN public.properties p ON u.id = p.host_id AND p.status = 'active'
LEFT JOIN public.bookings b ON u.id = b.renter_id
GROUP BY u.id, u.first_name, u.last_name, u.email, u.is_host, u.total_bookings, u.total_earnings, u.rating, u.review_count;

CREATE OR REPLACE VIEW admin_dashboard
SECURITY INVOKER
AS
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN is_host = true THEN 1 END) as total_hosts,
  COUNT(CASE WHEN is_verified = true THEN 1 END) as verified_users,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_users_30d,
  SUM(total_earnings) as total_platform_earnings
FROM public.users
WHERE role = 'user';

-- =====================================================
-- GRANTS AND PERMISSIONS
-- =====================================================

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant admin permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.users IS 'User accounts and profiles';
COMMENT ON TABLE public.host_profiles IS 'Additional information for property hosts';
COMMENT ON TABLE public.properties IS 'Parking properties available for booking';
COMMENT ON TABLE public.property_photos IS 'Photos associated with properties';
COMMENT ON TABLE public.availability IS 'Specific date availability overrides';
COMMENT ON TABLE public.bookings IS 'Parking space bookings';
COMMENT ON TABLE public.payments IS 'Payment transactions';
COMMENT ON TABLE public.messages IS 'Communication between users';
COMMENT ON TABLE public.reviews IS 'User reviews and ratings';
COMMENT ON TABLE public.notifications IS 'User notifications';
COMMENT ON TABLE public.admin_logs IS 'Audit log for admin actions';
COMMENT ON TABLE public.system_settings IS 'System configuration settings';

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

-- This completes the database setup for Drive My Way parking app
-- The database now supports:
-- ✅ User authentication and profiles
-- ✅ Property listings with photos and availability
-- ✅ Booking system with payments
-- ✅ Messaging between users
-- ✅ Review and rating system
-- ✅ Notification system
-- ✅ Admin roles and management
-- ✅ Row Level Security (RLS)
-- ✅ Performance indexes
-- ✅ Audit logging
-- ✅ System settings

-- Next steps:
-- 1. Set up Supabase project
-- 2. Run this SQL file in Supabase SQL editor
-- 3. Configure environment variables
-- 4. Test the database connection
-- 5. Deploy your backend
