-- Nova Scotia tax (15%): collected as part of Plekk fees until HST number; shown as "Tax" to customer
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS tax_reserve DECIMAL(8,2) DEFAULT 0;

COMMENT ON COLUMN public.bookings.tax_reserve IS 'Tax amount (e.g. 15% for NS) collected for future remittance; shown as Tax to customer.';
