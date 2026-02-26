/**
 * Cron: sync Stripe revenue for tax threshold (small-supplier).
 * GET/POST /api/cron/sync-tax-revenue with Authorization: Bearer <CRON_SECRET>
 * Recomputes revenue from Stripe charges (CAD, last 120 days) and updates tax_config.
 */

import { Request, Response } from 'express';
import { getSupabaseClient } from '../services/supabaseService';
import { getThresholdCadCents } from '../services/taxService';
import { logger } from '../utils/logger';

function getStripe() {
  const stripe = require('stripe')(process.env['STRIPE_SECRET_KEY']?.replace(/^["']|["']$/g, ''));
  if (!stripe) throw new Error('STRIPE_SECRET_KEY not set');
  return stripe;
}

function isAuthorized(req: Request): boolean {
  const secret = process.env['CRON_SECRET'];
  if (!secret) return false;
  if (req.headers.authorization?.startsWith('Bearer ') && req.headers.authorization.slice(7) === secret) return true;
  return req.query?.secret === secret;
}

const LOOKBACK_DAYS = 120;

export async function runTaxRevenueSync(req: Request, res: Response): Promise<void> {
  if (!isAuthorized(req)) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  try {
    const stripe = getStripe();
    const since = Math.floor((Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000) / 1000);
    let totalCadCents = 0;
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const list: any = await stripe.charges.list({
        created: { gte: since },
        limit: 100,
        ...(startingAfter && { starting_after: startingAfter }),
      });
      const charges = list.data || [];
      for (const ch of charges) {
        if (ch.currency?.toLowerCase() !== 'cad') continue;
        if (ch.status !== 'succeeded') continue;
        const amount = ch.amount ?? 0;
        const refunded = ch.amount_refunded ?? 0;
        totalCadCents += amount - refunded;
      }
      hasMore = list.has_more === true && charges.length > 0;
      if (hasMore) startingAfter = charges[charges.length - 1]?.id;
    }

    const supabase = getSupabaseClient();
    const { data: row } = await supabase.from('tax_config').select('tax_mode').eq('id', 'default').single();
    const taxMode = row?.tax_mode ?? 'off';
    await supabase
      .from('tax_config')
      .update({
        revenue_cad_cents: totalCadCents,
        revenue_last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', 'default');

    if (taxMode === 'off' && totalCadCents >= getThresholdCadCents()) {
      const now = new Date().toISOString();
      await supabase
        .from('tax_config')
        .update({ tax_mode: 'on', tax_effective_at: now, updated_at: now })
        .eq('id', 'default');
      logger.info('[Tax] Sync: threshold crossed, tax_mode set to on', {
        revenueCadCents: totalCadCents,
        thresholdCadCents: getThresholdCadCents(),
      });
    }

    res.json({
      success: true,
      revenue_cad_cents: totalCadCents,
      revenue_last_synced_at: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('[Tax] Sync failed', { message: error?.message });
    res.status(500).json({ success: false, error: error?.message || 'Sync failed' });
  }
}
