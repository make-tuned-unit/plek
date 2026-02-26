-- Tax mode and small-supplier threshold (GST/HST). Revenue tracked from Stripe in CAD.
CREATE TABLE IF NOT EXISTS public.tax_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  tax_mode TEXT NOT NULL DEFAULT 'off' CHECK (tax_mode IN ('off', 'on')),
  tax_effective_at TIMESTAMP WITH TIME ZONE,
  revenue_cad_cents BIGINT NOT NULL DEFAULT 0,
  revenue_last_synced_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO public.tax_config (id, tax_mode) VALUES ('default', 'off')
ON CONFLICT (id) DO NOTHING;

-- Idempotency and revenue delta log (charge = positive, refund = negative)
CREATE TABLE IF NOT EXISTS public.stripe_revenue_events (
  event_id TEXT PRIMARY KEY,
  stripe_charge_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('charge', 'refund')),
  amount_cents BIGINT NOT NULL,
  currency TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_revenue_events_charge_id ON public.stripe_revenue_events (stripe_charge_id);

-- Track total refunds per charge so we only apply refund delta on partial refunds
CREATE TABLE IF NOT EXISTS public.stripe_charge_refunds (
  charge_id TEXT PRIMARY KEY,
  amount_refunded_cents BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.tax_config IS 'Singleton: GST/HST mode (off until revenue >= threshold); revenue_cad_cents from Stripe.';
COMMENT ON TABLE public.stripe_revenue_events IS 'Stripe webhook idempotency and revenue deltas (CAD only).';
