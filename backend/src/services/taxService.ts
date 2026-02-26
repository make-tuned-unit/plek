/**
 * Tax config and small-supplier threshold (GST/HST).
 * Revenue is tracked from Stripe in CAD; when revenue_cad_cents >= threshold, tax_mode flips to "on".
 * Until then, no tax is shown or charged. When on, NS bookings get HST (15%).
 */
import { getSupabaseClient } from './supabaseService';
import { logger } from '../utils/logger';

const THRESHOLD_CAD_CENTS = Math.round(
  (Number(process.env.SMALL_SUPPLIER_THRESHOLD_CAD) || 30_000) * 100
);
const NS_HST_RATE = Number(process.env.NS_HST_RATE) || 0.15;
const TAX_CONFIG_ID = 'default';

export type TaxMode = 'off' | 'on';

export interface TaxConfigRow {
  id: string;
  tax_mode: TaxMode;
  tax_effective_at: string | null;
  revenue_cad_cents: number;
  revenue_last_synced_at: string | null;
  updated_at: string;
}

export async function getTaxConfig(): Promise<TaxConfigRow | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('tax_config')
    .select('*')
    .eq('id', TAX_CONFIG_ID)
    .single();
  if (error || !data) return null;
  return data as TaxConfigRow;
}

export async function getTaxConfigOrThrow(): Promise<TaxConfigRow> {
  const row = await getTaxConfig();
  if (!row) throw new Error('tax_config not found');
  return row;
}

/** Revenue in CAD cents. Threshold in CAD (for display). */
export function getThresholdCadCents(): number {
  return THRESHOLD_CAD_CENTS;
}

export function getThresholdCad(): number {
  return THRESHOLD_CAD_CENTS / 100;
}

/** True if tax_mode is "on". When on, show/charge HST (NS). */
export function isTaxEnabled(config: TaxConfigRow | null): boolean {
  return config?.tax_mode === 'on';
}

/** HST rate for province (0.15 for NS when enabled). Caller must gate by isTaxEnabled. */
export function getTaxRate(province: string | null | undefined): number {
  if (!province || String(province).toUpperCase().trim() !== 'NS') return 0;
  return NS_HST_RATE;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Compute tax amount (HST) for a subtotal. Returns 0 if province not NS or rate 0. */
export function computeTax(
  subtotalAmount: number,
  province: string | null | undefined
): number {
  const rate = getTaxRate(province);
  if (!rate || subtotalAmount <= 0) return 0;
  return round2(subtotalAmount * rate);
}

/** Add to revenue (e.g. charge.succeeded). Updates revenue_cad_cents and runs threshold check. */
export async function addRevenueCents(cents: number): Promise<void> {
  if (cents <= 0) return;
  const supabase = getSupabaseClient();
  const { data: row } = await supabase
    .from('tax_config')
    .select('revenue_cad_cents, tax_mode')
    .eq('id', TAX_CONFIG_ID)
    .single();
  if (!row) return;
  const newRevenue = Number(row.revenue_cad_cents || 0) + cents;
  await supabase
    .from('tax_config')
    .update({
      revenue_cad_cents: newRevenue,
      updated_at: new Date().toISOString(),
    })
    .eq('id', TAX_CONFIG_ID);
  await checkThreshold(supabase, newRevenue);
}

/** Subtract from revenue (refund). */
export async function subtractRevenueCents(cents: number): Promise<void> {
  if (cents <= 0) return;
  const supabase = getSupabaseClient();
  const { data: row } = await supabase
    .from('tax_config')
    .select('revenue_cad_cents')
    .eq('id', TAX_CONFIG_ID)
    .single();
  if (!row) return;
  const newRevenue = Math.max(0, Number(row.revenue_cad_cents || 0) - cents);
  await supabase
    .from('tax_config')
    .update({
      revenue_cad_cents: newRevenue,
      updated_at: new Date().toISOString(),
    })
    .eq('id', TAX_CONFIG_ID);
}

async function checkThreshold(
  supabase: ReturnType<typeof getSupabaseClient>,
  revenueCadCents: number
): Promise<void> {
  const { data: row } = await supabase
    .from('tax_config')
    .select('tax_mode')
    .eq('id', TAX_CONFIG_ID)
    .single();
  if (!row || row.tax_mode !== 'off') return;
  if (revenueCadCents < THRESHOLD_CAD_CENTS) return;
  const now = new Date().toISOString();
  await supabase
    .from('tax_config')
    .update({
      tax_mode: 'on',
      tax_effective_at: now,
      updated_at: now,
    })
    .eq('id', TAX_CONFIG_ID);
  logger.info('[Tax] Small-supplier threshold crossed; tax_mode set to on', {
    revenueCadCents,
    thresholdCadCents: THRESHOLD_CAD_CENTS,
  });
}

/** Idempotent: process charge.succeeded. Only CAD. */
export async function processChargeSucceeded(
  eventId: string,
  chargeId: string,
  amountCents: number,
  currency: string
): Promise<boolean> {
  if (currency.toLowerCase() !== 'cad') return false;
  const supabase = getSupabaseClient();
  const { data: existing } = await supabase
    .from('stripe_revenue_events')
    .select('event_id')
    .eq('event_id', eventId)
    .maybeSingle();
  if (existing) return false;
  await supabase.from('stripe_revenue_events').insert({
    event_id: eventId,
    stripe_charge_id: chargeId,
    type: 'charge',
    amount_cents: amountCents,
    currency: currency.toLowerCase(),
  });
  await addRevenueCents(amountCents);
  return true;
}

/** Idempotent: process charge.refunded. Apply only the delta for this refund event. */
export async function processChargeRefunded(
  eventId: string,
  chargeId: string,
  amountRefundedCents: number,
  currency: string
): Promise<boolean> {
  if (currency.toLowerCase() !== 'cad' || amountRefundedCents <= 0) return false;
  const supabase = getSupabaseClient();
  const { data: existing } = await supabase
    .from('stripe_revenue_events')
    .select('event_id')
    .eq('event_id', eventId)
    .maybeSingle();
  if (existing) return false;
  const { data: refundRow } = await supabase
    .from('stripe_charge_refunds')
    .select('amount_refunded_cents')
    .eq('charge_id', chargeId)
    .maybeSingle();
  const previousRefunded = refundRow ? Number(refundRow.amount_refunded_cents || 0) : 0;
  const delta = amountRefundedCents - previousRefunded;
  if (delta <= 0) return false;
  const now = new Date().toISOString();
  await supabase.from('stripe_revenue_events').insert({
    event_id: eventId,
    stripe_charge_id: chargeId,
    type: 'refund',
    amount_cents: -delta,
    currency: currency.toLowerCase(),
  });
  await supabase
    .from('stripe_charge_refunds')
    .upsert(
      { charge_id: chargeId, amount_refunded_cents: amountRefundedCents, updated_at: now },
      { onConflict: 'charge_id' }
    );
  await subtractRevenueCents(delta);
  return true;
}

/** Set revenue_last_synced_at after a backstop sync. */
export async function setRevenueLastSyncedAt(): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase
    .from('tax_config')
    .update({
      revenue_last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', TAX_CONFIG_ID);
}
