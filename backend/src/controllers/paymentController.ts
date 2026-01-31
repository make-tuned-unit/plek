import { Request, Response } from 'express';
import Stripe from 'stripe';
import geoip from 'geoip-lite';
import { getSupabaseClient } from '../services/supabaseService';

/** Get country code from request IP (fallback when user profile has no country). */
function getCountryFromRequest(req: Request): string | null {
  const ip = req.ip || (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress;
  if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('::ffff:127.')) return null;
  const cleanIp = ip.replace(/^::ffff:/, '');
  const geo = geoip.lookup(cleanIp);
  return geo?.country ?? null;
}

// Initialize Stripe lazily to ensure env vars are loaded
let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env['STRIPE_SECRET_KEY'];
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
    }
    // Remove quotes if present (sometimes .env files have quotes)
    const cleanKey = secretKey.replace(/^["']|["']$/g, '');
    logger.info('[Stripe] Initializing (key length omitted in prod)');
    stripeInstance = new Stripe(cleanKey, {
      apiVersion: '2023-10-16',
    });
  }
  return stripeInstance;
}

function calculateTotalHours(startTime: Date, endTime: Date): number {
  const diffMs = endTime.getTime() - startTime.getTime();
  return diffMs / (1000 * 60 * 60);
}

// Map user country (ISO 3166-1 alpha-2) to Stripe currency (ISO 4217 lowercase)
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  US: 'usd', CA: 'cad', GB: 'gbp', UK: 'gbp', AU: 'aud', NZ: 'nzd',
  IE: 'eur', DE: 'eur', FR: 'eur', ES: 'eur', IT: 'eur', NL: 'eur', BE: 'eur', AT: 'eur', PT: 'eur',
  JP: 'jpy', KR: 'krw', CN: 'cny', IN: 'inr', MX: 'mxn', BR: 'brl', ZA: 'zar', CH: 'chf', SE: 'sek', NO: 'nok', DK: 'dkk',
};
const ZERO_DECIMAL_CURRENCIES = new Set(['jpy', 'krw', 'vnd', 'clp', 'pyg', 'jod', 'kwd', 'bif', 'djf', 'gnf', 'kmf', 'mga', 'rwf', 'xof', 'xpf']);

function countryToCurrency(country: string | null | undefined): string {
  if (!country || typeof country !== 'string') return 'usd';
  const code = country.toUpperCase().trim();
  return COUNTRY_TO_CURRENCY[code] || 'usd';
}

/** Infer country code from province/state name when profile has no country set. */
function inferCountryFromState(state: string | null | undefined): string | null {
  if (!state || typeof state !== 'string') return null;
  const normalized = state.trim().toLowerCase();
  if (!normalized) return null;
  // Canadian provinces and territories
  const caProvinces = [
    'alberta', 'british columbia', 'manitoba', 'new brunswick', 'newfoundland and labrador',
    'nova scotia', 'northwest territories', 'nunavut', 'ontario', 'prince edward island',
    'quebec', 'saskatchewan', 'yukon', 'nl', 'ns', 'nb', 'pe', 'qc', 'on', 'mb', 'sk', 'ab', 'bc', 'nt', 'yt', 'nu',
  ];
  if (caProvinces.some(p => normalized === p || normalized.startsWith(p + ' ') || normalized.endsWith(' ' + p))) return 'CA';
  // US states (abbreviations and common names)
  const usStates: string[] = [
    'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut',
    'delaware', 'florida', 'georgia', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa',
    'kansas', 'kentucky', 'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan',
    'minnesota', 'mississippi', 'missouri', 'montana', 'nebraska', 'nevada', 'new hampshire',
    'new jersey', 'new mexico', 'new york', 'north carolina', 'north dakota', 'ohio',
    'oklahoma', 'oregon', 'pennsylvania', 'rhode island', 'south carolina', 'south dakota',
    'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington', 'west virginia',
    'wisconsin', 'wyoming', 'district of columbia', 'dc',
    'al', 'ak', 'az', 'ar', 'ca', 'co', 'ct', 'de', 'fl', 'ga', 'hi', 'id', 'il', 'in', 'ia',
    'ks', 'ky', 'la', 'me', 'md', 'ma', 'mi', 'mn', 'ms', 'mo', 'mt', 'ne', 'nv', 'nh', 'nj', 'nm', 'ny', 'nc', 'nd', 'oh', 'ok', 'or', 'pa', 'ri', 'sc', 'sd', 'tn', 'tx', 'ut', 'vt', 'va', 'wa', 'wv', 'wi', 'wy', 'dc',
  ];
  if (usStates.some(s => normalized === s || normalized.startsWith(s + ' ') || normalized.endsWith(' ' + s))) return 'US';
  // Australian states/territories
  const auStates = ['nsw', 'vic', 'qld', 'wa', 'sa', 'tas', 'act', 'nt', 'new south wales', 'victoria', 'queensland', 'western australia', 'south australia', 'tasmania', 'australian capital territory', 'northern territory'];
  if (auStates.some(s => normalized === s || normalized.includes(s))) return 'AU';
  return null;
}

function amountInSmallestUnit(amount: number, currency: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toLowerCase())
    ? Math.round(amount)
    : Math.round(amount * 100);
}

function calculateBookingPriceForProperty(
  property: any,
  startTime: Date,
  endTime: Date
): {
  baseAmount: number;
  totalAmount: number;
  bookerServiceFee: number;
  hostServiceFee: number;
} {
  const totalHours = calculateTotalHours(startTime, endTime);
  const totalDays = Math.ceil(totalHours / 24);

  let baseAmount = 0;

  if (property.hourly_rate && totalHours < 24) {
    baseAmount = property.hourly_rate * totalHours;
  } else if (property.daily_rate && totalDays >= 1) {
    baseAmount = property.daily_rate * totalDays;
  } else if (property.weekly_rate && totalDays >= 7) {
    const weeks = Math.ceil(totalDays / 7);
    baseAmount = property.weekly_rate * weeks;
  } else if (property.monthly_rate && totalDays >= 30) {
    const months = Math.ceil(totalDays / 30);
    baseAmount = property.monthly_rate * months;
  } else if (property.hourly_rate) {
    baseAmount = property.hourly_rate * totalHours;
  } else {
    throw new Error('Property has no pricing configured');
  }

  const totalFeePercentage = property.service_fee_percentage || 10;
  const hostFeePercentage = totalFeePercentage / 2;
  const bookerFeePercentage = totalFeePercentage / 2;

  const hostServiceFee = (baseAmount * hostFeePercentage) / 100;
  const bookerServiceFee = (baseAmount * bookerFeePercentage) / 100;
  const totalAmount = baseAmount + bookerServiceFee;

  return {
    baseAmount: Math.round(baseAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    bookerServiceFee: Math.round(bookerServiceFee * 100) / 100,
    hostServiceFee: Math.round(hostServiceFee * 100) / 100,
  };
}

async function checkBookingConflictsForRange(
  supabase: ReturnType<typeof getSupabaseClient>,
  propertyId: string,
  startTime: Date,
  endTime: Date
): Promise<boolean> {
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, start_time, end_time, status')
    .eq('property_id', propertyId)
    .in('status', ['pending', 'confirmed']);

  if (error) {
    throw error;
  }

  const hasConflict = (bookings || []).some((booking: any) => {
    const bookingStart = new Date(booking.start_time);
    const bookingEnd = new Date(booking.end_time);

    return (
      (startTime >= bookingStart && startTime < bookingEnd) ||
      (endTime > bookingStart && endTime <= bookingEnd) ||
      (startTime <= bookingStart && endTime >= bookingEnd)
    );
  });

  return hasConflict;
}

function serializeMetadataValue(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

// @desc    Create Stripe Connect account for host
// @route   POST /api/payments/connect/create
// @access  Private
export const createConnectAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const supabase = getSupabaseClient();
    
    // Check if user already has a Stripe account
    const { data: existingUser } = await supabase
      .from('users')
      .select('stripe_account_id, email, first_name, last_name, country')
      .eq('id', userId)
      .single();
    
    if (existingUser?.stripe_account_id) {
      // Account already exists, create new account link for updates
      logger.info('[Stripe Connect] Creating account link for existing account');
      const accountLink = await getStripe().accountLinks.create({
        account: existingUser.stripe_account_id,
        refresh_url: `${process.env['FRONTEND_URL']}/profile?stripe_refresh=true`,
        return_url: `${process.env['FRONTEND_URL']}/profile?stripe_success=true`,
        type: 'account_onboarding',
      });
      
    res.json({
      success: true,
      data: {
        url: accountLink.url,
        accountId: existingUser.stripe_account_id,
      }
    });
      return;
    }
    
    // Create new Express account
    logger.info('[Stripe Connect] Creating new Express account');
    const account = await getStripe().accounts.create({
      type: 'express',
      country: existingUser?.country || 'CA',
      email: existingUser?.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: {
        user_id: userId,
        platform: 'plekk',
      },
    });
    
    // Create account link for onboarding
    const accountLink = await getStripe().accountLinks.create({
      account: account.id,
      refresh_url: `${process.env['FRONTEND_URL']}/profile?stripe_refresh=true`,
      return_url: `${process.env['FRONTEND_URL']}/profile?stripe_success=true`,
      type: 'account_onboarding',
    });
    
    // Save account ID to user
    const updateData: any = { 
      stripe_account_id: account.id
    };
    
    // Only add status if column exists
    try {
      updateData.stripe_account_status = 'pending';
    } catch (e) {
      // Column might not exist - that's okay
    }
    
    console.log('[Stripe Connect] Saving account ID to database:', {
      userId,
      accountId: account.id,
      updateData
    });
    
    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId);
    
    if (updateError) {
      logger.error('[Stripe Connect] Error saving account ID', updateError);
    } else {
      logger.info('[Stripe Connect] Account ID saved successfully');
    }
    
    res.json({
      success: true,
      data: {
        url: accountLink.url,
        accountId: account.id,
      }
    });
  } catch (error: any) {
    logger.error('Error creating Connect account', error);
    // Platform (plekk) must complete Stripe Connect signup in Dashboard before connected accounts can be created
    const isConnectNotEnabled =
      error?.type === 'StripeInvalidRequestError' &&
      typeof error?.message === 'string' &&
      error.message.toLowerCase().includes('signed up for connect');
    if (isConnectNotEnabled) {
      res.status(503).json({
        success: false,
        error: 'Payout setup is not available yet',
        code: 'connect_not_enabled',
        message:
          'Payout setup is temporarily unavailable. Please try again later or contact support.',
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: 'Failed to create Stripe account',
      message: error?.message || 'Something went wrong',
    });
  }
};

// @desc    Get Stripe Connect account status
// @route   GET /api/payments/connect/status
// @access  Private
export const getConnectAccountStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const supabase = getSupabaseClient();
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('stripe_account_id')
      .eq('id', userId)
      .single();
    
    logger.info('[Stripe Status] User query result');
    
    if (!user?.stripe_account_id) {
      logger.info('[Stripe Status] No account ID found');
      res.json({ 
        success: true,
        data: {
          connected: false,
          needsOnboarding: true 
        }
      });
      return;
    }
    
    logger.info('[Stripe Status] Found account ID');
    
    // Retrieve account from Stripe
    const account = await getStripe().accounts.retrieve(user.stripe_account_id);
    
    logger.info('[Stripe Status] Account details', {
      details_submitted: account.details_submitted,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
    });
    
    // Check if there are pending requirements
    const hasPendingRequirements = (account.requirements?.currently_due?.length ?? 0) > 0 || 
                                   (account.requirements?.past_due?.length ?? 0) > 0;
    
    // Determine status from Stripe account
    const status = account.details_submitted && account.charges_enabled && account.payouts_enabled
      ? 'active'
      : account.details_submitted
      ? 'pending'
      : 'pending';
    
    console.log('[Stripe Status] Determined status:', status, 'hasPendingRequirements:', hasPendingRequirements);
    
    // Update status in database if column exists (gracefully handle if it doesn't)
    try {
      await supabase
        .from('users')
        .update({ stripe_account_status: status })
        .eq('id', userId);
    } catch (error: any) {
      // Column might not exist yet - that's okay, we'll still return the status
      logger.info('[Stripe] Note: stripe_account_status column may not exist yet');
    }
    
    // Create account link if verification is needed
    let verificationUrl = null;
    if (hasPendingRequirements) {
      try {
        const accountLink = await getStripe().accountLinks.create({
          account: account.id,
          refresh_url: `${process.env['FRONTEND_URL']}/profile?stripe_refresh=true`,
          return_url: `${process.env['FRONTEND_URL']}/profile?stripe_success=true`,
          type: 'account_onboarding',
        });
        verificationUrl = accountLink.url;
      } catch (error: any) {
        logger.error('[Stripe Status] Error creating verification link', error);
      }
    }
    
    res.json({
      success: true,
      data: {
        connected: true,
        accountId: account.id,
        status: status,
        payoutsEnabled: account.payouts_enabled,
        chargesEnabled: account.charges_enabled,
        detailsSubmitted: account.details_submitted,
        needsVerification: hasPendingRequirements,
        verificationUrl: verificationUrl,
        requirements: account.requirements?.currently_due || [],
      }
    });
  } catch (error: any) {
    logger.error('[Stripe Status] Error', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to get Connect status' });
  }
};

// @desc    Disconnect Stripe Connect account (clear link so user can reconnect with different country)
// @route   POST /api/payments/connect/disconnect
// @access  Private
export const disconnectConnectAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('users')
      .update({
        stripe_account_id: null,
        stripe_account_status: null,
      })
      .eq('id', userId);

    if (error) {
      logger.error('[Stripe Connect] Disconnect error', error);
      res.status(500).json({ success: false, error: 'Failed to disconnect payout account' });
      return;
    }

    logger.info('[Stripe Connect] Account disconnected for user', userId);
    res.json({ success: true, data: { disconnected: true } });
  } catch (error: any) {
    logger.error('[Stripe Connect] Disconnect error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect payout account',
      message: error.message,
    });
  }
};

// Host service fee is 5% of base (half of 10% total fee; booker pays the other 5%)
const HOST_SERVICE_FEE_PERCENT = 0.05;

// @desc    Get host earnings summary (for Payments tab: gross, platform fee, net)
// @route   GET /api/payments/earnings
// @access  Private
export const getHostEarnings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const supabase = getSupabaseClient();

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        id,
        total_amount,
        service_fee,
        start_time,
        end_time,
        status,
        payment_status,
        property:properties(id, title, address)
      `)
      .eq('host_id', userId)
      .eq('payment_status', 'completed')
      .in('status', ['confirmed', 'completed'])
      .order('start_time', { ascending: false });

    if (error) throw error;

    let totalGross = 0;
    let totalPlatformFee = 0;
    const breakdown: Array<{
      bookingId: string;
      propertyTitle: string;
      totalAmount: number;
      bookerServiceFee: number;
      grossAmount: number;
      platformFee: number;
      yourEarnings: number;
      startTime: string;
    }> = [];

    for (const b of bookings || []) {
      const totalAmount = Number(b.total_amount) || 0;
      const bookerServiceFee = Number(b.service_fee) || 0;
      const grossAmount = totalAmount - bookerServiceFee; // base amount (what renter paid for the space)
      const platformFee = Math.round(grossAmount * HOST_SERVICE_FEE_PERCENT * 100) / 100;
      const yourEarnings = Math.round((grossAmount - platformFee) * 100) / 100;

      totalGross += grossAmount;
      totalPlatformFee += platformFee;
      breakdown.push({
        bookingId: b.id,
        propertyTitle: (b.property as any)?.title || 'Parking space',
        totalAmount,
        bookerServiceFee,
        grossAmount,
        platformFee,
        yourEarnings,
        startTime: b.start_time,
      });
    }

    const netEarnings = Math.round((totalGross - totalPlatformFee) * 100) / 100;

    res.json({
      success: true,
      data: {
        totalGross: Math.round(totalGross * 100) / 100,
        totalPlatformFee: Math.round(totalPlatformFee * 100) / 100,
        netEarnings,
        pendingPayout: netEarnings, // same as net; Stripe handles payout schedule
        breakdown,
      },
    });
  } catch (error: any) {
    logger.error('Error getting host earnings', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get earnings',
      message: error.message,
    });
  }
};

// @desc    Create payment intent for booking
// @route   POST /api/payments/create-intent
// @access  Private
export const createPaymentIntent = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      propertyId,
      startTime,
      endTime,
      vehicleInfo,
      specialRequests,
    }: {
      propertyId?: string;
      startTime?: string;
      endTime?: string;
      vehicleInfo?: any;
      specialRequests?: string;
    } = req.body;
    const renterId = (req as any).user.id;
    const supabase = getSupabaseClient();

    // Fetch renter's country to charge in their local currency (profile, then province/state, then IP)
    const { data: renter } = await supabase
      .from('users')
      .select('country, state')
      .eq('id', renterId)
      .single();
    const country =
      renter?.country ||
      inferCountryFromState(renter?.state) ||
      getCountryFromRequest(req);
    const currency = countryToCurrency(country);

    if (!propertyId || !startTime || !endTime) {
      res.status(400).json({
        success: false,
        error: 'Property ID, start time, and end time are required',
      });
      return;
    }

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      res.status(400).json({
        success: false,
        error: 'Invalid start or end time provided',
      });
      return;
    }

    const now = new Date();
    if (startDate < now) {
      res.status(400).json({
        success: false,
        error: 'Start time cannot be in the past',
      });
      return;
    }

    if (endDate <= startDate) {
      res.status(400).json({
        success: false,
        error: 'End time must be after the start time',
      });
      return;
    }

    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select(`
        *,
        host:users!properties_host_id_fkey(
          id,
          email,
          first_name,
          last_name,
          phone,
          stripe_account_id,
          stripe_account_status
        )
      `)
      .eq('id', propertyId)
      .eq('status', 'active')
      .single();

    if (propertyError || !property) {
      res.status(404).json({
        success: false,
        error: 'Property not found or not available',
      });
      return;
    }

    if (!property.is_available) {
      res.status(400).json({
        success: false,
        error: 'This property is not accepting bookings right now',
      });
      return;
    }

    if (property.host_id === renterId) {
      res.status(400).json({
        success: false,
        error: 'You cannot book your own property',
      });
      return;
    }

    const totalHours = calculateTotalHours(startDate, endDate);
    if (totalHours < (property.min_booking_hours || 1)) {
      res.status(400).json({
        success: false,
        error: `Minimum booking duration is ${property.min_booking_hours || 1} hour(s)`,
      });
      return;
    }

    const totalDays = totalHours / 24;
    if (totalDays > (property.max_booking_days || 30)) {
      res.status(400).json({
        success: false,
        error: `Maximum booking duration is ${property.max_booking_days || 30} day(s)`,
      });
      return;
    }

    const hasConflict = await checkBookingConflictsForRange(
      supabase,
      propertyId,
      startDate,
      endDate
    );

    if (hasConflict) {
      res.status(400).json({
        success: false,
        error: 'This property is no longer available for the selected dates',
      });
      return;
    }

    const { baseAmount, totalAmount, bookerServiceFee, hostServiceFee } =
      calculateBookingPriceForProperty(property, startDate, endDate);

    const applicationFee = bookerServiceFee + hostServiceFee;
    const hostHasConnect =
      property.host?.stripe_account_id && property.host?.stripe_account_status === 'active';
    const hostPayoutAmount = baseAmount - hostServiceFee;

    const metadata: Record<string, string> = {
      renter_id: renterId,
      property_id: propertyId,
      host_id: property.host_id,
      property_title: serializeMetadataValue(property.title),
      property_address: serializeMetadataValue(property.address),
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      total_hours: serializeMetadataValue(totalHours),
      base_amount: serializeMetadataValue(baseAmount),
      booker_service_fee: serializeMetadataValue(bookerServiceFee),
      host_service_fee: serializeMetadataValue(hostServiceFee),
      total_amount: serializeMetadataValue(totalAmount),
      vehicle_info: serializeMetadataValue(vehicleInfo),
      special_requests: serializeMetadataValue(specialRequests),
      instant_booking: serializeMetadataValue(property.instant_booking),
      platform: 'plekk',
      host_connect_pending: hostHasConnect ? 'false' : 'true',
      host_payout_amount: serializeMetadataValue(hostPayoutAmount),
    };

    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: Math.round(totalAmount * 100), // Convert to cents
      currency: 'usd',
      metadata,
      automatic_payment_methods: { enabled: true },
    };

    if (hostHasConnect) {
      paymentIntentParams.application_fee_amount = Math.round(applicationFee * 100);
      paymentIntentParams.transfer_data = {
        destination: property.host!.stripe_account_id!,
      };
    }
    // If host has not set up Connect yet, charge goes to platform; host can connect later to receive payouts

    const paymentIntent = await getStripe().paymentIntents.create(paymentIntentParams);

    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        currency,
        pricing: {
          totalAmount,
          baseAmount,
          bookerServiceFee,
          hostServiceFee,
          currency,
        },
      },
    });
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create payment intent',
      message: error.message,
    });
  }
};

// @desc    Confirm payment
// @route   POST /api/payments/confirm
// @access  Private
export const confirmPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { paymentIntentId } = req.body;
    const userId = (req as any).user.id;
    const supabase = getSupabaseClient();

    if (!paymentIntentId) {
      res.status(400).json({
        success: false,
        error: 'Payment intent ID is required',
      });
      return;
    }

    const paymentIntent = await getStripe().paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.metadata['renter_id'] !== userId) {
      res.status(403).json({
        success: false,
        error: 'Not authorized to confirm this payment',
      });
      return;
    }

    if (paymentIntent.status !== 'succeeded') {
      res.status(400).json({
        success: false,
        error: 'Payment not completed',
        status: paymentIntent.status,
      });
      return;
    }

    const existingBookingId = paymentIntent.metadata['booking_id'];
    if (existingBookingId) {
      const { data: existingBooking } = await supabase
        .from('bookings')
        .select(`
          *,
          property:properties(*, host:users!properties_host_id_fkey(*)),
          renter:users!bookings_renter_id_fkey(*),
          host:users!bookings_host_id_fkey(*)
        `)
        .eq('id', existingBookingId)
        .single();

      res.json({
        success: true,
        data: {
          booking: existingBooking,
          paymentIntentId,
        },
      });
      return;
    }

    const propertyId = paymentIntent.metadata['property_id'];
    const startTime = paymentIntent.metadata['start_time'];
    const endTime = paymentIntent.metadata['end_time'];

    if (!propertyId || !startTime || !endTime) {
      res.status(400).json({
        success: false,
        error: 'Payment metadata incomplete. Please contact support.',
      });
      return;
    }

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select(`
        *,
        host:users!properties_host_id_fkey(
          id,
          email,
          first_name,
          last_name,
          phone,
          stripe_account_id,
          stripe_account_status
        )
      `)
      .eq('id', propertyId)
      .single();

    if (propertyError || !property) {
      res.status(404).json({
        success: false,
        error: 'Property no longer available. Payment will be reviewed by support.',
      });
      return;
    }

    const conflictExists = await checkBookingConflictsForRange(
      supabase,
      propertyId,
      startDate,
      endDate
    );

    if (conflictExists) {
      res.status(409).json({
        success: false,
        error:
          'This time slot was just taken by another driver. Our team will reach out to complete a refund.',
      });
      return;
    }

    const { baseAmount, totalAmount, bookerServiceFee } = {
      baseAmount: parseFloat(paymentIntent.metadata['base_amount'] || '0'),
      totalAmount: parseFloat(paymentIntent.metadata['total_amount'] || '0'),
      bookerServiceFee: parseFloat(paymentIntent.metadata['booker_service_fee'] || '0'),
    };

    const hostServiceFee = parseFloat(paymentIntent.metadata['host_service_fee'] || '0');
    const vehicleInfoMetadata = paymentIntent.metadata['vehicle_info'];
    const specialRequestsMetadata = paymentIntent.metadata['special_requests'];
    const instantBooking = paymentIntent.metadata['instant_booking'] === 'true';

    const totalHours = calculateTotalHours(startDate, endDate);

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        property_id: propertyId,
        renter_id: userId,
        host_id: property.host_id,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        total_hours: totalHours,
        total_amount: totalAmount,
        service_fee: bookerServiceFee,
        status: instantBooking ? 'confirmed' : 'pending',
        payment_status: 'completed',
        special_requests: specialRequestsMetadata || null,
        vehicle_info: vehicleInfoMetadata ? { note: vehicleInfoMetadata } : null,
      } as any)
      .select(`
        *,
        property:properties(*),
        renter:users!bookings_renter_id_fkey(id, first_name, last_name, email, phone),
        host:users!bookings_host_id_fkey(id, first_name, last_name, email, phone)
      `)
      .single();

    if (bookingError || !booking) {
      logger.error('[Payments] Failed to create booking after payment', bookingError);
      res.status(500).json({
        success: false,
        error: 'Payment captured but booking failed to save. Support has been notified.',
      });
      return;
    }

    await getStripe().paymentIntents.update(paymentIntentId, {
      metadata: {
        ...paymentIntent.metadata,
        booking_id: booking.id,
      },
    });

    const { error: paymentRecordError } = await supabase.from('payments').insert({
      booking_id: booking.id,
      user_id: userId,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      payment_method: paymentIntent.payment_method as string,
      stripe_payment_id: paymentIntentId,
      status: 'completed',
      type: 'booking',
    });

    if (paymentRecordError) {
      console.error('[Payments] Failed to record payment', paymentRecordError);
    }

    await supabase.from('notifications').insert({
      user_id: property.host_id,
      type: instantBooking ? 'booking_confirmed' : 'booking_request',
      title: instantBooking ? 'New Booking Confirmed' : 'New Booking Request',
      message: instantBooking
        ? `A driver just booked ${property.title}`
        : `You have a new booking request for ${property.title}`,
      data: { booking_id: booking.id, property_id: propertyId },
      is_read: false,
    } as any);

    const { sendBookingConfirmationEmail, sendBookingNotificationEmail, sendPaymentReceiptEmail } =
      await import('../services/emailService');

    const vehicleInfoText = vehicleInfoMetadata || undefined;

    if (booking.renter?.email) {
      sendBookingConfirmationEmail({
        bookingId: booking.id,
        renterName: `${booking.renter.first_name} ${booking.renter.last_name}`,
        renterEmail: booking.renter.email,
        hostName: booking.host ? `${booking.host.first_name} ${booking.host.last_name}` : 'Host',
        hostEmail: booking.host?.email || '',
        propertyTitle: booking.property?.title || 'Parking Space',
        propertyAddress: booking.property?.address || '',
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        totalHours,
        baseAmount,
        totalAmount,
        serviceFee: bookerServiceFee,
        bookerServiceFee,
        hostServiceFee,
        securityDeposit: 0,
        vehicleInfo: vehicleInfoText,
        specialRequests: specialRequestsMetadata || undefined,
      }).catch((error) => {
        logger.error('Failed to send booking confirmation email', error);
      });
    }

    if (booking.host?.email) {
      sendBookingNotificationEmail({
        bookingId: booking.id,
        renterName: `${booking.renter.first_name} ${booking.renter.last_name}`,
        renterEmail: booking.renter.email,
        hostName: `${booking.host.first_name} ${booking.host.last_name}`,
        hostEmail: booking.host.email,
        propertyTitle: booking.property?.title || 'Parking Space',
        propertyAddress: booking.property?.address || '',
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        totalHours,
        baseAmount,
        totalAmount,
        serviceFee: bookerServiceFee,
        bookerServiceFee,
        hostServiceFee,
        securityDeposit: 0,
        vehicleInfo: vehicleInfoText,
        specialRequests: specialRequestsMetadata || undefined,
      }).catch((error) => {
        logger.error('Failed to send booking notification email', error);
      });
    }

    if (booking.renter?.email) {
      sendPaymentReceiptEmail({
        bookingId: booking.id,
        userName: `${booking.renter.first_name} ${booking.renter.last_name}`,
        userEmail: booking.renter.email,
        propertyTitle: booking.property?.title || 'Parking Space',
        amount: paymentIntent.amount / 100,
        paymentDate: new Date().toISOString(),
        transactionId: paymentIntent.id,
      }).catch((error) => {
        logger.error('Failed to send payment receipt email', error);
      });
    }

    res.json({
      success: true,
      data: {
        booking,
        paymentIntentId,
      },
    });
  } catch (error: any) {
    logger.error('Error confirming payment', error);
    res.status(500).json({
      success: false,
      error: 'Failed to confirm payment',
      message: error.message,
    });
  }
};

// @desc    Get payment history
// @route   GET /api/payments
// @access  Private
export const getPaymentHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const supabase = getSupabaseClient();
    
    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        *,
        booking:bookings(
          id,
          start_time,
          end_time,
          property:properties(
            id,
            title,
            address
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: { payments: payments || [] },
    });
  } catch (error: any) {
    console.error('Error getting payment history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment history',
      message: error.message,
    });
  }
};

// @desc    Handle Stripe webhook
// @route   POST /api/payments/webhook
// @access  Public (Stripe calls this)
export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET'] || '';
  
  let event: Stripe.Event;
  
  try {
    // Verify webhook signature
    event = getStripe().webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    logger.error('Webhook signature verification failed', err);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }
  
  const supabase = getSupabaseClient();
  
  // Handle the event
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSuccess(paymentIntent, supabase);
        break;
        
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailure(failedPayment, supabase);
        break;
        
      case 'account.updated':
        const account = event.data.object as Stripe.Account;
        await handleAccountUpdate(account, supabase);
        break;
        
      case 'transfer.created':
        const transfer = event.data.object as Stripe.Transfer;
        console.log('Transfer created:', transfer.id);
        // You can track transfers here if needed
        break;
        
      default:
        logger.info('Unhandled webhook event type', { type: event.type });
    }
    
    res.json({ received: true });
  } catch (error: any) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};

// Helper function to handle successful payment
async function handlePaymentSuccess(
  paymentIntent: Stripe.PaymentIntent,
  supabase: any
): Promise<void> {
  const bookingId = paymentIntent.metadata['booking_id'];
  
  if (!bookingId) {
    logger.error('No booking_id in payment intent metadata');
    return;
  }
  
  // Update booking status
  await supabase
    .from('bookings')
    .update({ payment_status: 'completed' })
    .eq('id', bookingId);
  
  // Create or update payment record
  const { data: existingPayment } = await supabase
    .from('payments')
    .select('id')
    .eq('stripe_payment_id', paymentIntent.id)
    .single();
  
  if (!existingPayment) {
    await supabase.from('payments').insert({
      booking_id: bookingId,
      user_id: paymentIntent.metadata['renter_id'],
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      payment_method: paymentIntent.payment_method as string,
      stripe_payment_id: paymentIntent.id,
      status: 'completed',
      type: 'booking',
    });
  }
  
  // Get booking details for email
  const { data: bookingData } = await supabase
    .from('bookings')
    .select(`
      *,
      property:properties(title, address),
      renter:users!bookings_renter_id_fkey(id, first_name, last_name, email)
    `)
    .eq('id', bookingId)
    .single();
  
  // Send payment receipt email (don't wait - fire and forget)
  if (bookingData && bookingData.renter) {
    const { sendPaymentReceiptEmail } = await import('../services/emailService');
    sendPaymentReceiptEmail({
      bookingId: bookingId,
      userName: `${bookingData.renter.first_name} ${bookingData.renter.last_name}`,
      userEmail: bookingData.renter.email,
      propertyTitle: bookingData.property?.title || 'Parking Space',
      amount: paymentIntent.amount / 100,
      paymentDate: new Date().toISOString(),
      transactionId: paymentIntent.id,
    }).catch((error) => {
      console.error('Failed to send payment receipt email:', error);
    });
  }
  
  logger.info('Payment succeeded for booking');
}

// Helper function to handle failed payment
async function handlePaymentFailure(
  paymentIntent: Stripe.PaymentIntent,
  supabase: any
): Promise<void> {
  const bookingId = paymentIntent.metadata['booking_id'];
  
  if (bookingId) {
    await supabase
      .from('bookings')
      .update({ payment_status: 'failed' })
      .eq('id', bookingId);
  }
  
  console.log(`Payment failed for booking ${bookingId}`);
}

// Helper function to handle account updates
async function handleAccountUpdate(
  account: Stripe.Account,
  supabase: any
): Promise<void> {
  const status = account.details_submitted && account.charges_enabled && account.payouts_enabled
    ? 'active'
    : account.details_submitted
    ? 'pending'
    : 'pending';
  
  await supabase
    .from('users')
    .update({ stripe_account_status: status })
    .eq('stripe_account_id', account.id);
  
  logger.info('Account status updated', { status });
}

