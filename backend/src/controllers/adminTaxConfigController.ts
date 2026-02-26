import { Request, Response } from 'express';
import { getSupabaseClient } from '../services/supabaseService';
import { getTaxConfig, getThresholdCad, getThresholdCadCents } from '../services/taxService';

export async function getAdminTaxConfig(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const supabase = getSupabaseClient();
    const { data: user } = await supabase.from('users').select('role').eq('id', userId).single();
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      res.status(403).json({ success: false, error: 'Admin access required' });
      return;
    }

    const config = await getTaxConfig();
    if (!config) {
      res.json({
        success: true,
        tax_mode: 'off',
        tax_effective_at: null,
        revenue_cad_cents: 0,
        revenue_cad: 0,
        threshold_cad: getThresholdCad(),
        threshold_cad_cents: getThresholdCadCents(),
        revenue_last_synced_at: null,
      });
      return;
    }

    res.json({
      success: true,
      tax_mode: config.tax_mode,
      tax_effective_at: config.tax_effective_at ?? null,
      revenue_cad_cents: Number(config.revenue_cad_cents) || 0,
      revenue_cad: (Number(config.revenue_cad_cents) || 0) / 100,
      threshold_cad: getThresholdCad(),
      threshold_cad_cents: getThresholdCadCents(),
      revenue_last_synced_at: config.revenue_last_synced_at ?? null,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to load tax config' });
  }
}
