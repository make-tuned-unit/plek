/**
 * Beta region gating: when enabled, only the configured province can create full accounts.
 * Others are added to the signup waitlist.
 */
const BETA_REGION_ENABLED = process.env.BETA_REGION_ENABLED === 'true';
const BETA_REGION_PROVINCE = (process.env.BETA_REGION_PROVINCE || 'NS').toUpperCase();

export function isBetaRegionEnabled(): boolean {
  return BETA_REGION_ENABLED;
}

export function getAllowedProvince(): string {
  return BETA_REGION_PROVINCE;
}

/** Normalized province (e.g. "NS", "ON") for comparison. */
export function isAllowedProvince(province: string | null | undefined): boolean {
  if (!province) return false;
  return province.toUpperCase().trim() === BETA_REGION_PROVINCE;
}
