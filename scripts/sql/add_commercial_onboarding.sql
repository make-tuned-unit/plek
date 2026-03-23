-- =====================================================
-- COMMERCIAL ONBOARDING
-- Low-touch commercial intake + draft commercial inventory model
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'commercial_submission_status') THEN
    CREATE TYPE commercial_submission_status AS ENUM ('new', 'reviewing', 'needs-info', 'approved', 'rejected');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'commercial_property_status') THEN
    CREATE TYPE commercial_property_status AS ENUM ('draft', 'reviewing', 'active', 'inactive');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.commercial_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status commercial_submission_status DEFAULT 'new',
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  approximate_space_count INTEGER,
  property_type TEXT NOT NULL,
  vehicle_types_allowed TEXT[] DEFAULT '{}',
  booking_types_supported TEXT[] DEFAULT '{}',
  has_spreadsheet BOOLEAN DEFAULT FALSE,
  spreadsheet_later BOOLEAN DEFAULT FALSE,
  stripe_readiness TEXT DEFAULT 'need_help',
  notes TEXT,
  authority_confirmation BOOLEAN NOT NULL DEFAULT FALSE,
  insurance_compliance_confirmation BOOLEAN NOT NULL DEFAULT FALSE,
  internal_notes TEXT,
  follow_up_state TEXT,
  uploaded_file_reference TEXT,
  uploaded_file_name TEXT,
  uploaded_file_url TEXT,
  submission_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(18), 'hex'),
  raw_submission JSONB DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_commercial_leads_submission_token
  ON public.commercial_leads(submission_token);

CREATE INDEX IF NOT EXISTS idx_commercial_leads_status_created_at
  ON public.commercial_leads(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_commercial_leads_email
  ON public.commercial_leads(email);

CREATE TABLE IF NOT EXISTS public.commercial_properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  lead_id UUID REFERENCES public.commercial_leads(id) ON DELETE CASCADE,
  host_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  postal_code TEXT,
  lat DECIMAL(10,8),
  lng DECIMAL(11,8),
  property_type TEXT NOT NULL,
  access_instructions TEXT,
  restrictions TEXT,
  is_commercial BOOLEAN NOT NULL DEFAULT TRUE,
  status commercial_property_status DEFAULT 'draft'
);

CREATE INDEX IF NOT EXISTS idx_commercial_properties_lead_id
  ON public.commercial_properties(lead_id);

CREATE TABLE IF NOT EXISTS public.commercial_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  property_id UUID NOT NULL REFERENCES public.commercial_properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  lat DECIMAL(10,8),
  lng DECIMAL(11,8),
  polygon_geojson JSONB,
  sort_order INTEGER,
  access_instructions TEXT,
  photo_url TEXT,
  is_default_zone BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_commercial_zones_property_id
  ON public.commercial_zones(property_id);

CREATE TABLE IF NOT EXISTS public.commercial_inventory_buckets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  property_id UUID NOT NULL REFERENCES public.commercial_properties(id) ON DELETE CASCADE,
  zone_id UUID REFERENCES public.commercial_zones(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  space_type TEXT,
  pricing_mode TEXT DEFAULT 'flexible',
  daily_price DECIMAL(10,2),
  monthly_price DECIMAL(10,2),
  access_type TEXT,
  availability_rules JSONB,
  restrictions TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_commercial_inventory_buckets_property_id
  ON public.commercial_inventory_buckets(property_id);

CREATE INDEX IF NOT EXISTS idx_commercial_inventory_buckets_zone_id
  ON public.commercial_inventory_buckets(zone_id);

CREATE OR REPLACE FUNCTION public.update_commercial_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_commercial_leads_updated_at ON public.commercial_leads;
CREATE TRIGGER trg_commercial_leads_updated_at
  BEFORE UPDATE ON public.commercial_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_commercial_updated_at();

DROP TRIGGER IF EXISTS trg_commercial_properties_updated_at ON public.commercial_properties;
CREATE TRIGGER trg_commercial_properties_updated_at
  BEFORE UPDATE ON public.commercial_properties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_commercial_updated_at();

DROP TRIGGER IF EXISTS trg_commercial_zones_updated_at ON public.commercial_zones;
CREATE TRIGGER trg_commercial_zones_updated_at
  BEFORE UPDATE ON public.commercial_zones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_commercial_updated_at();

DROP TRIGGER IF EXISTS trg_commercial_inventory_buckets_updated_at ON public.commercial_inventory_buckets;
CREATE TRIGGER trg_commercial_inventory_buckets_updated_at
  BEFORE UPDATE ON public.commercial_inventory_buckets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_commercial_updated_at();

ALTER TABLE public.commercial_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_inventory_buckets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage commercial leads" ON public.commercial_leads;
CREATE POLICY "Admins can manage commercial leads"
  ON public.commercial_leads
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can manage commercial properties" ON public.commercial_properties;
CREATE POLICY "Admins can manage commercial properties"
  ON public.commercial_properties
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can manage commercial zones" ON public.commercial_zones;
CREATE POLICY "Admins can manage commercial zones"
  ON public.commercial_zones
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can manage commercial inventory buckets" ON public.commercial_inventory_buckets;
CREATE POLICY "Admins can manage commercial inventory buckets"
  ON public.commercial_inventory_buckets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'super_admin')
    )
  );

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'commercial-intake',
      'commercial-intake',
      true,
      10485760,
      ARRAY[
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/pdf'
      ]
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
