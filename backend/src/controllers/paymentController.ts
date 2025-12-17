import { Request, Response } from 'express';
import Stripe from 'stripe';
import { getSupabaseClient } from '../services/supabaseService';

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
    console.log('[Stripe] Initializing with key length:', cleanKey.length);
    console.log('[Stripe] Key preview:', cleanKey.substring(0, 20) + '...');
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
      console.log('[Stripe Connect] Creating account link for existing account:', existingUser.stripe_account_id);
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
    // Only request transfers capability (not card_payments) to minimize KYC requirements
    // Default to CA (Canada) for easier onboarding, but allow override from user profile
    console.log('[Stripe Connect] Creating new Express account for user:', userId);
    const account = await getStripe().accounts.create({
      type: 'express',
      country: existingUser?.country || 'CA', // Default to Canada for easier onboarding
      email: existingUser?.email,
      capabilities: {
        // Only request transfers - we use destination charges, so hosts don't need card_payments
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
      console.error('[Stripe Connect] Error saving account ID:', updateError);
    } else {
      console.log('[Stripe Connect] Account ID saved successfully');
    }
    
    res.json({
      success: true,
      data: {
        url: accountLink.url,
        accountId: account.id,
      }
    });
  } catch (error: any) {
    console.error('Error creating Connect account:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create Stripe account',
      message: error.message,
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
      .select('stripe_account_id, pending_earnings, payouts_enabled, details_submitted')
      .eq('id', userId)
      .single();
    
    console.log('[Stripe Status] User query result:', { user, error: userError });
    
    // Get pending earnings from bookings if not in user record
    const { data: eligibleBookings } = await supabase
      .from('bookings')
      .select('host_net_amount')
      .eq('host_id', userId)
      .in('payout_status', ['pending', 'eligible_for_payout'])
      .gt('host_net_amount', 0);

    const totalEligible = eligibleBookings?.reduce((sum: number, b: any) => 
      sum + parseFloat(b.host_net_amount || 0), 0) || 0;
    const pendingEarnings = Math.max(parseFloat(user?.pending_earnings || '0'), totalEligible);

    if (!user?.stripe_account_id) {
      console.log('[Stripe Status] No account ID found for user:', userId);
      res.json({ 
        success: true,
        data: {
          connected: false,
          needsOnboarding: true,
          pendingEarnings: pendingEarnings,
          hasEarnings: pendingEarnings > 0,
        }
      });
      return;
    }
    
    console.log('[Stripe Status] Found account ID:', user.stripe_account_id);
    
    // Retrieve account from Stripe
    const account = await getStripe().accounts.retrieve(user.stripe_account_id);
    
    console.log('[Stripe Status] Account details:', {
      id: account.id,
      details_submitted: account.details_submitted,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      requirements: account.requirements
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
      console.log('[Stripe] Note: stripe_account_status column may not exist yet');
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
        console.error('[Stripe Status] Error creating verification link:', error);
      }
    }
    
    res.json({
      success: true,
      data: {
        connected: true,
        accountId: account.id,
        status: status,
        payoutsEnabled: account.payouts_enabled || false,
        chargesEnabled: account.charges_enabled || false,
        detailsSubmitted: account.details_submitted || false,
        needsVerification: hasPendingRequirements,
        verificationUrl: verificationUrl,
        requirements: account.requirements?.currently_due || [],
        pendingEarnings: pendingEarnings,
        hasEarnings: pendingEarnings > 0,
      }
    });
  } catch (error: any) {
    console.error('Error getting account status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get account status',
      message: error.message,
    });
  }
};

// @desc    Create onboarding link (delayed onboarding - only when earnings exist)
// @route   POST /api/payments/connect/onboarding-link
// @access  Private
export const createOnboardingLink = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const supabase = getSupabaseClient();
    
    // Get user with pending earnings
    const { data: user } = await supabase
      .from('users')
      .select('stripe_account_id, email, first_name, last_name, country, pending_earnings')
      .eq('id', userId)
      .single();

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    // Check if user has pending earnings
    const pendingEarnings = parseFloat(user.pending_earnings || '0');
    const hasEarnings = pendingEarnings > 0;

    // Also check for bookings eligible for payout
    const { data: eligibleBookings } = await supabase
      .from('bookings')
      .select('id, host_net_amount')
      .eq('host_id', userId)
      .in('payout_status', ['pending', 'eligible_for_payout'])
      .gt('host_net_amount', 0);

    const totalEligible = eligibleBookings?.reduce((sum: number, b: any) => 
      sum + parseFloat(b.host_net_amount || 0), 0) || 0;

    const totalEarnings = Math.max(pendingEarnings, totalEligible);

    // If no earnings, return error (onboarding should only be prompted when money is waiting)
    if (totalEarnings <= 0) {
      res.status(400).json({
        success: false,
        error: 'No earnings available. Set up payouts when you have earnings from bookings.',
        data: {
          pendingEarnings: 0,
          needsEarnings: true,
        },
      });
      return;
    }

    let accountId = user.stripe_account_id;
    let accountLink;

    if (!accountId) {
      // Create new Express account
      console.log('[Delayed Onboarding] Creating new Express account for user with earnings:', userId);
      const account = await getStripe().accounts.create({
        type: 'express',
        country: user.country || 'CA', // Default to Canada
        email: user.email,
        capabilities: {
          transfers: { requested: true }, // Only transfers, not card_payments
        },
        metadata: {
          user_id: userId,
          platform: 'plekk',
        },
      });

      accountId = account.id;

      // Save account ID to user
      await supabase
        .from('users')
        .update({
          stripe_account_id: account.id,
          stripe_account_status: 'pending',
        })
        .eq('id', userId);
    }

    // Create account link for onboarding
    accountLink = await getStripe().accountLinks.create({
      account: accountId,
      refresh_url: `${process.env['FRONTEND_URL']}/profile?tab=payments&stripe_refresh=true`,
      return_url: `${process.env['FRONTEND_URL']}/profile?tab=payments&stripe_success=true`,
      type: 'account_onboarding',
    });

    res.json({
      success: true,
      data: {
        url: accountLink.url,
        accountId: accountId,
        pendingEarnings: totalEarnings,
        message: `You have $${totalEarnings.toFixed(2)} ready to withdraw. Complete setup to get paid.`,
      },
    });
  } catch (error: any) {
    console.error('Error creating onboarding link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create onboarding link',
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

    // Booking is created only after payment succeeds
    // Payment intent is created directly from booking details
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

    // Allow bookings even if host hasn't set up Stripe account yet
    // Earnings will be tracked and host can set up payouts later
    // This enables Airbnb-style delayed onboarding

    const { baseAmount, totalAmount, bookerServiceFee, hostServiceFee } =
      calculateBookingPriceForProperty(property, startDate, endDate);

    const applicationFee = bookerServiceFee + hostServiceFee;
    const hostNetAmount = baseAmount - hostServiceFee; // Amount host should receive

    // Build payment intent metadata
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
      host_net_amount: serializeMetadataValue(hostNetAmount),
      platform_fee: serializeMetadataValue(applicationFee),
      total_amount: serializeMetadataValue(totalAmount),
      vehicle_info: serializeMetadataValue(vehicleInfo),
      special_requests: serializeMetadataValue(specialRequests),
      instant_booking: serializeMetadataValue(property.instant_booking),
      platform: 'plekk',
    };

    // If host has active Stripe account, use destination charge (automatic transfer)
    // Otherwise, charge to platform and track earnings for later payout
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: Math.round(totalAmount * 100), // Convert to cents
      currency: 'usd',
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    };

    if (property.host?.stripe_account_id && property.host?.stripe_account_status === 'active') {
      // Host has active account: use destination charge with automatic transfer
      paymentIntentParams.application_fee_amount = Math.round(applicationFee * 100);
      paymentIntentParams.on_behalf_of = property.host.stripe_account_id;
      paymentIntentParams.transfer_data = {
        destination: property.host.stripe_account_id,
      };
      metadata.payout_method = 'destination_charge';
    } else {
      // Host doesn't have account yet: charge to platform, track earnings
      // No transfer_data - we'll handle payout later when account is set up
      metadata.payout_method = 'delayed_transfer';
      metadata.host_stripe_account_id = property.host?.stripe_account_id || 'none';
    }

    const paymentIntent = await getStripe().paymentIntents.create(paymentIntentParams);

    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        pricing: {
          totalAmount,
          baseAmount,
          bookerServiceFee,
          hostServiceFee,
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
      // Update existing booking to confirmed status after successful payment
      await supabase
        .from('bookings')
        .update({ 
          status: 'confirmed',
          payment_status: 'completed' 
        })
        .eq('id', existingBookingId);
      
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
        status: 'confirmed', // Always confirmed after successful payment
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
      console.error('[Payments] Failed to create booking after payment', bookingError);
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
      type: 'booking_confirmed',
      title: 'New Booking Confirmed',
      message: `A driver just booked ${property.title}`,
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
        console.error('Failed to send booking confirmation email:', error);
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
        console.error('Failed to send booking notification email:', error);
      });
    }

    // Payment receipt email is sent from Stripe webhook handler to avoid duplicates
    // Removed from here to prevent duplicate emails

    res.json({
      success: true,
      data: {
        booking,
        paymentIntentId,
      },
    });
  } catch (error: any) {
    console.error('Error confirming payment:', error);
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
    console.error('Webhook signature verification failed:', err.message);
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
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    res.json({ received: true });
  } catch (error: any) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};

// Helper function to create booking from payment intent metadata
async function createBookingFromPaymentIntent(
  paymentIntent: Stripe.PaymentIntent,
  supabase: any
): Promise<any> {
  const propertyId = paymentIntent.metadata['property_id'];
  const startTime = paymentIntent.metadata['start_time'];
  const endTime = paymentIntent.metadata['end_time'];
  const renterId = paymentIntent.metadata['renter_id'];

  if (!propertyId || !startTime || !endTime || !renterId) {
    throw new Error('Payment metadata incomplete');
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
    throw new Error('Property no longer available');
  }

  const conflictExists = await checkBookingConflictsForRange(
    supabase,
    propertyId,
    startDate,
    endDate
  );

  if (conflictExists) {
    throw new Error('Time slot was just taken by another driver');
  }

  const { baseAmount, totalAmount, bookerServiceFee } = {
    baseAmount: parseFloat(paymentIntent.metadata['base_amount'] || '0'),
    totalAmount: parseFloat(paymentIntent.metadata['total_amount'] || '0'),
    bookerServiceFee: parseFloat(paymentIntent.metadata['booker_service_fee'] || '0'),
  };

  const hostServiceFee = parseFloat(paymentIntent.metadata['host_service_fee'] || '0');
  const platformFee = parseFloat(paymentIntent.metadata['platform_fee'] || '0');
  const hostNetAmount = parseFloat(paymentIntent.metadata['host_net_amount'] || (baseAmount - hostServiceFee).toString());
  const vehicleInfoMetadata = paymentIntent.metadata['vehicle_info'];
  const specialRequestsMetadata = paymentIntent.metadata['special_requests'];
  const totalHours = calculateTotalHours(startDate, endDate);
  const payoutMethod = paymentIntent.metadata['payout_method'] || 'delayed_transfer';

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      property_id: propertyId,
      renter_id: renterId,
      host_id: property.host_id,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      total_hours: totalHours,
      total_amount: totalAmount,
      service_fee: bookerServiceFee,
      host_net_amount: hostNetAmount,
      platform_fee: platformFee,
      payout_status: payoutMethod === 'destination_charge' ? 'paid_out' : 'eligible_for_payout',
      payout_date: payoutMethod === 'destination_charge' ? new Date().toISOString() : null,
      status: 'confirmed', // Always confirmed after successful payment
      payment_status: 'completed',
      special_requests: specialRequestsMetadata || null,
      vehicle_info: vehicleInfoMetadata ? { note: vehicleInfoMetadata } : null,
    } as any)
    .select(`
      *,
      property:properties(*),
      renter:users!bookings_renter_id_fkey(id, first_name, last_name, email),
      host:users!bookings_host_id_fkey(id, first_name, last_name, email)
    `)
    .single();

  if (bookingError || !booking) {
    throw new Error('Failed to create booking');
  }

  // Update payment intent metadata with booking_id
  await getStripe().paymentIntents.update(paymentIntent.id, {
    metadata: {
      ...paymentIntent.metadata,
      booking_id: booking.id,
    },
  });

  return booking;
}

// Helper function to handle successful payment
async function handlePaymentSuccess(
  paymentIntent: Stripe.PaymentIntent,
  supabase: any
): Promise<void> {
  let bookingId = paymentIntent.metadata['booking_id'];
  let booking: any = null;

  // If booking doesn't exist, create it
  if (!bookingId) {
    try {
      booking = await createBookingFromPaymentIntent(paymentIntent, supabase);
      bookingId = booking.id;
    } catch (error: any) {
      console.error('[Webhook] Failed to create booking after payment:', error);
      // Payment succeeded but booking creation failed - this is critical
      // In production, you might want to alert admins here
      return;
    }
  } else {
    // Update existing booking status to confirmed and payment status to completed
    await supabase
      .from('bookings')
      .update({ 
        status: 'confirmed',
        payment_status: 'completed' 
      })
      .eq('id', bookingId);
    
    // Get booking details
    const { data: bookingData } = await supabase
      .from('bookings')
      .select(`
        *,
        property:properties(title, address),
        renter:users!bookings_renter_id_fkey(id, first_name, last_name, email)
      `)
      .eq('id', bookingId)
      .single();
    
    booking = bookingData;
  }
  
  // Calculate earnings from payment intent metadata
  const baseAmount = parseFloat(paymentIntent.metadata['base_amount'] || '0');
  const hostServiceFee = parseFloat(paymentIntent.metadata['host_service_fee'] || '0');
  const platformFee = parseFloat(paymentIntent.metadata['platform_fee'] || '0');
  const hostNetAmount = baseAmount - hostServiceFee; // Amount host should receive
  const payoutMethod = paymentIntent.metadata['payout_method'] || 'delayed_transfer';
  const hostId = paymentIntent.metadata['host_id'];

  // Update booking with earnings information
  const bookingUpdateData: any = {
    host_net_amount: hostNetAmount,
    platform_fee: platformFee,
  };

  // If destination charge was used, transfer already happened automatically
  // Otherwise, mark as eligible for payout when account is set up
  if (payoutMethod === 'destination_charge') {
    bookingUpdateData.payout_status = 'paid_out';
    bookingUpdateData.payout_date = new Date().toISOString();
  } else {
    // Delayed transfer: mark as eligible for payout
    bookingUpdateData.payout_status = 'eligible_for_payout';
    
    // Increment host's pending earnings
    if (hostId) {
      const { data: host } = await supabase
        .from('users')
        .select('pending_earnings, stripe_account_id, payouts_enabled')
        .eq('id', hostId)
        .single();

      if (host) {
        const newPendingEarnings = (parseFloat(host.pending_earnings || 0) + hostNetAmount).toFixed(2);
        await supabase
          .from('users')
          .update({ pending_earnings: parseFloat(newPendingEarnings) })
          .eq('id', hostId);

        // If host has active account, process payout immediately
        if (host.stripe_account_id && host.payouts_enabled) {
          console.log(`Host has active account, processing immediate payout for booking ${bookingId}`);
          // Transfer will be handled by processPendingPayouts
          await processPendingPayouts(host.stripe_account_id, supabase);
        } else {
          console.log(`Host earnings tracked: $${hostNetAmount} (pending account setup)`);
        }
      }
    }
  }

  // Update booking with earnings data
  await supabase
    .from('bookings')
    .update(bookingUpdateData)
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
  
  // Send payment receipt email (don't wait - fire and forget)
  if (booking && booking.renter) {
    const { sendPaymentReceiptEmail } = await import('../services/emailService');
    sendPaymentReceiptEmail({
      bookingId: bookingId,
      userName: `${booking.renter.first_name} ${booking.renter.last_name}`,
      userEmail: booking.renter.email,
      propertyTitle: booking.property?.title || 'Parking Space',
      amount: paymentIntent.amount / 100,
      paymentDate: new Date().toISOString(),
      transactionId: paymentIntent.id,
    }).catch((error) => {
      console.error('Failed to send payment receipt email:', error);
    });
  }
  
  console.log(`Payment succeeded for booking ${bookingId}, host net: $${hostNetAmount}, payout method: ${payoutMethod}`);
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
  
  // Update all account status fields
  const updateData: any = {
    stripe_account_status: status,
    payouts_enabled: account.payouts_enabled || false,
    details_submitted: account.details_submitted || false,
  };

  // Store requirements if available
  if (account.requirements) {
    updateData.requirements_due = account.requirements.currently_due || [];
  }

  await supabase
    .from('users')
    .update(updateData)
    .eq('stripe_account_id', account.id);
  
  console.log(`Account ${account.id} status updated:`, {
    status,
    payouts_enabled: account.payouts_enabled,
    details_submitted: account.details_submitted,
  });

  // If account just became active and has pending earnings, process payouts
  if (account.payouts_enabled && account.details_submitted) {
    await processPendingPayouts(account.id, supabase);
  }
}

// Helper function to process pending payouts for a host
async function processPendingPayouts(
  stripeAccountId: string,
  supabase: any
): Promise<void> {
  try {
    // Get user with this Stripe account
    const { data: user } = await supabase
      .from('users')
      .select('id, pending_earnings')
      .eq('stripe_account_id', stripeAccountId)
      .single();

    if (!user || !user.pending_earnings || user.pending_earnings <= 0) {
      console.log(`No pending earnings for account ${stripeAccountId}`);
      return;
    }

    // Get all bookings eligible for payout
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, host_net_amount, payout_status')
      .eq('host_id', user.id)
      .in('payout_status', ['pending', 'eligible_for_payout'])
      .gt('host_net_amount', 0);

    if (!bookings || bookings.length === 0) {
      console.log(`No bookings eligible for payout for account ${stripeAccountId}`);
      return;
    }

    // Calculate total to transfer
    const totalAmount = bookings.reduce((sum: number, b: any) => sum + parseFloat(b.host_net_amount || 0), 0);
    const totalCents = Math.round(totalAmount * 100);

    if (totalCents <= 0) {
      return;
    }

    console.log(`Processing payout for account ${stripeAccountId}: $${totalAmount} (${bookings.length} bookings)`);

    // Create transfer to host
    const transfer = await getStripe().transfers.create({
      amount: totalCents,
      currency: 'usd',
      destination: stripeAccountId,
      metadata: {
        user_id: user.id,
        booking_count: String(bookings.length),
        platform: 'plekk',
      },
    });

    // Update bookings to mark as paid
    const bookingIds = bookings.map((b: any) => b.id);
    await supabase
      .from('bookings')
      .update({
        payout_status: 'paid_out',
        payout_date: new Date().toISOString(),
        stripe_transfer_id: transfer.id,
      })
      .in('id', bookingIds);

    // Update user's pending earnings
    await supabase
      .from('users')
      .update({ pending_earnings: 0 })
      .eq('id', user.id);

    console.log(`Payout processed: Transfer ${transfer.id} for $${totalAmount}`);
  } catch (error: any) {
    console.error(`Error processing pending payouts for account ${stripeAccountId}:`, error);
    // Don't throw - we'll retry on next account update
  }
}

