import { getSupabaseClient } from './supabaseService';

export interface VerificationStatus {
  host: {
    emailVerified: boolean;
    identityVerified: boolean;
    stripePayoutVerified: boolean;
    badgeEarned: boolean;
    verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected' | 'expired';
  };
  properties: Array<{
    id: string;
    photosVerified: boolean;
    locationVerified: boolean;
    badgeEarned: boolean;
    verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected' | 'expired';
  }>;
}

/**
 * Check if host should have verified badge
 * Criteria:
 * - Email verified AND
 * - Identity verified AND
 * - (Property photos verified OR Stripe payout setup completed)
 */
export async function shouldHaveHostBadge(
  userId: string,
  supabase: ReturnType<typeof getSupabaseClient>
): Promise<boolean> {
  const { data: user, error } = await supabase
    .from('users')
    .select(`
      email_verified_at,
      identity_verified_at,
      payouts_enabled,
      details_submitted
    `)
    .eq('id', userId)
    .single();

  if (error || !user) {
    return false;
  }

  // Must have email verified
  if (!user.email_verified_at) {
    return false;
  }

  // Must have identity verified
  if (!user.identity_verified_at) {
    return false;
  }

  // Check if has verified property
  const { data: properties } = await supabase
    .from('properties')
    .select('photos_verified_at')
    .eq('host_id', userId)
    .not('photos_verified_at', 'is', null)
    .limit(1);

  const hasVerifiedProperty = properties && properties.length > 0;

  // Check if Stripe payout is set up
  const hasStripePayout = user.payouts_enabled && user.details_submitted;

  // Must have either verified property OR Stripe payout
  return hasVerifiedProperty || hasStripePayout;
}

/**
 * Check if property should have verified badge
 * Criteria:
 * - Photos verified AND
 * - Location verified AND
 * - Host is verified
 */
export async function shouldHavePropertyBadge(
  propertyId: string,
  supabase: ReturnType<typeof getSupabaseClient>
): Promise<boolean> {
  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .select(`
      photos_verified_at,
      location_verified_at,
      host_id,
      host:users!properties_host_id_fkey(
        verification_status
      )
    `)
    .eq('id', propertyId)
    .single();

  if (propertyError || !property) {
    return false;
  }

  // Must have photos verified
  if (!property.photos_verified_at) {
    return false;
  }

  // Must have location verified
  if (!property.location_verified_at) {
    return false;
  }

  // Host must be verified
  const host = property.host as any;
  if (!host || host.verification_status !== 'verified') {
    return false;
  }

  return true;
}

/**
 * Update host verification badge status
 */
export async function updateHostBadgeStatus(
  userId: string,
  supabase: ReturnType<typeof getSupabaseClient>
): Promise<void> {
  const shouldHaveBadge = await shouldHaveHostBadge(userId, supabase);

  const { data: user } = await supabase
    .from('users')
    .select('verification_status')
    .eq('id', userId)
    .single();

  const currentStatus = user?.verification_status;

  if (shouldHaveBadge && currentStatus !== 'verified') {
    // Award badge
    await supabase
      .from('users')
      .update({
        verification_status: 'verified',
        verified_at: new Date().toISOString(),
        verification_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
      })
      .eq('id', userId);
  } else if (!shouldHaveBadge && currentStatus === 'verified') {
    // Remove badge if criteria no longer met
    await supabase
      .from('users')
      .update({
        verification_status: 'unverified',
        verified_at: null,
      })
      .eq('id', userId);
  }
}

/**
 * Update property verification badge status
 */
export async function updatePropertyBadgeStatus(
  propertyId: string,
  supabase: ReturnType<typeof getSupabaseClient>
): Promise<void> {
  const shouldHaveBadge = await shouldHavePropertyBadge(propertyId, supabase);

  const { data: property } = await supabase
    .from('properties')
    .select('verification_status')
    .eq('id', propertyId)
    .single();

  const currentStatus = property?.verification_status;

  if (shouldHaveBadge && currentStatus !== 'verified') {
    // Award badge
    await supabase
      .from('properties')
      .update({
        verification_status: 'verified',
        verified_at: new Date().toISOString(),
        verification_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
      })
      .eq('id', propertyId);
  } else if (!shouldHaveBadge && currentStatus === 'verified') {
    // Remove badge if criteria no longer met
    await supabase
      .from('properties')
      .update({
        verification_status: 'unverified',
        verified_at: null,
      })
      .eq('id', propertyId);
  }
}

/**
 * Get verification status for a user
 */
export async function getVerificationStatus(
  userId: string,
  supabase: ReturnType<typeof getSupabaseClient>
): Promise<VerificationStatus> {
  // Get user verification info
  const { data: user } = await supabase
    .from('users')
    .select(`
      email_verified_at,
      identity_verified_at,
      payouts_enabled,
      details_submitted,
      verification_status
    `)
    .eq('id', userId)
    .single();

  // Get user's properties
  const { data: properties } = await supabase
    .from('properties')
    .select(`
      id,
      photos_verified_at,
      location_verified_at,
      verification_status
    `)
    .eq('host_id', userId);

  const hostStatus = {
    emailVerified: !!user?.email_verified_at,
    identityVerified: !!user?.identity_verified_at,
    stripePayoutVerified: !!(user?.payouts_enabled && user?.details_submitted),
    badgeEarned: user?.verification_status === 'verified',
    verificationStatus: (user?.verification_status || 'unverified') as VerificationStatus['host']['verificationStatus'],
  };

  const propertiesStatus = (properties || []).map((p: any) => ({
    id: p.id,
    photosVerified: !!p.photos_verified_at,
    locationVerified: !!p.location_verified_at,
    badgeEarned: p.verification_status === 'verified',
    verificationStatus: (p.verification_status || 'unverified') as VerificationStatus['properties'][0]['verificationStatus'],
  }));

  return {
    host: hostStatus,
    properties: propertiesStatus,
  };
}

/**
 * Update user's last activity timestamp
 */
export async function updateUserActivity(
  userId: string,
  supabase: ReturnType<typeof getSupabaseClient>
): Promise<void> {
  await supabase
    .from('users')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('id', userId);
}

