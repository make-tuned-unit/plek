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
    console.log('[Stripe Connect] Creating new Express account for user:', userId);
    const account = await getStripe().accounts.create({
      type: 'express',
      country: existingUser?.country || 'US',
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
      .select('stripe_account_id')
      .eq('id', userId)
      .single();
    
    console.log('[Stripe Status] User query result:', { user, error: userError });
    
    if (!user?.stripe_account_id) {
      console.log('[Stripe Status] No account ID found for user:', userId);
      res.json({ 
        success: true,
        data: {
          connected: false,
          needsOnboarding: true 
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
        payoutsEnabled: account.payouts_enabled,
        chargesEnabled: account.charges_enabled,
        detailsSubmitted: account.details_submitted,
        needsVerification: hasPendingRequirements,
        verificationUrl: verificationUrl,
        requirements: account.requirements?.currently_due || [],
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

// @desc    Create payment intent for booking
// @route   POST /api/payments/create-intent
// @access  Private
export const createPaymentIntent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bookingId } = req.body;
    const renterId = (req as any).user.id;
    const supabase = getSupabaseClient();
    
    if (!bookingId) {
      res.status(400).json({
        success: false,
        error: 'Booking ID is required',
      });
      return;
    }
    
    // Get booking details with property and host info
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        property:properties(
          *,
          host:users!properties_host_id_fkey(
            stripe_account_id,
            stripe_account_status
          )
        )
      `)
      .eq('id', bookingId)
      .eq('renter_id', renterId)
      .single();
    
    if (bookingError || !booking) {
      res.status(404).json({
        success: false,
        error: 'Booking not found',
      });
      return;
    }
    
    // Verify host has Stripe account
    if (!booking.property.host.stripe_account_id) {
      res.status(400).json({
        success: false,
        error: 'Host has not set up payment account. Please contact support.',
      });
      return;
    }
    
    // Check if host account is active
    if (booking.property.host.stripe_account_status !== 'active') {
      res.status(400).json({
        success: false,
        error: 'Host payment account is not yet active. Please try again later.',
      });
      return;
    }
    
    // Verify booking hasn't already been paid
    if (booking.payment_status === 'completed') {
      res.status(400).json({
        success: false,
        error: 'Booking has already been paid',
      });
      return;
    }
    
    const totalAmount = booking.total_amount; // in dollars (includes booker fee)
    const bookerServiceFee = booking.service_fee; // in dollars (5% charged to booker)
    const propertyFeePercentage = booking.property?.service_fee_percentage ?? 10;
    const hostFeePercentage = propertyFeePercentage / 2;
    const baseAmount = totalAmount - bookerServiceFee;
    const hostServiceFee = Math.round(baseAmount * (hostFeePercentage / 100) * 100) / 100;
    const applicationFee = bookerServiceFee + hostServiceFee;
    
    // Create PaymentIntent with Connect (Destination Charge)
    const paymentIntent = await getStripe().paymentIntents.create({
      amount: Math.round(totalAmount * 100), // Convert to cents
      currency: 'usd',
      application_fee_amount: Math.round(applicationFee * 100), // Platform share from booker + host fees
      transfer_data: {
        destination: booking.property.host.stripe_account_id, // Host's account (auto-transfer)
      },
      metadata: {
        booking_id: bookingId,
        property_id: booking.property_id,
        renter_id: renterId,
        host_id: booking.host_id,
        platform: 'drivemyway',
        base_amount: baseAmount.toString(),
        booker_service_fee: bookerServiceFee.toString(),
        host_service_fee: hostServiceFee.toString(),
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });
    
    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
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
    const { paymentIntentId, bookingId } = req.body;
    const userId = (req as any).user.id;
    const supabase = getSupabaseClient();
    
    if (!paymentIntentId || !bookingId) {
      res.status(400).json({
        success: false,
        error: 'Payment intent ID and booking ID are required',
      });
      return;
    }
    
    // Retrieve payment intent to verify status
    const paymentIntent = await getStripe().paymentIntents.retrieve(paymentIntentId);
    
    // Verify this payment belongs to the user
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
    
    // Update booking and create payment record
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ 
        payment_status: 'completed',
        // If instant booking, confirm immediately; otherwise keep as pending for host approval
        // Note: instant_booking check would need to come from booking data, not metadata
      })
      .eq('id', bookingId);
    
    if (updateError) throw updateError;
    
    // Create payment record
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        booking_id: bookingId,
        user_id: userId,
        amount: paymentIntent.amount / 100, // Convert from cents
        currency: paymentIntent.currency,
        payment_method: paymentIntent.payment_method as string,
        stripe_payment_id: paymentIntentId,
        status: 'completed',
        type: 'booking',
      });
    
    if (paymentError) throw paymentError;
    
    // Get booking and user details for email
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
    
    res.json({
      success: true,
      message: 'Payment confirmed successfully',
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
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

// Helper function to handle successful payment
async function handlePaymentSuccess(
  paymentIntent: Stripe.PaymentIntent,
  supabase: any
): Promise<void> {
  const bookingId = paymentIntent.metadata['booking_id'];
  
  if (!bookingId) {
    console.error('No booking_id in payment intent metadata');
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
  
  console.log(`Payment succeeded for booking ${bookingId}`);
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
  
  console.log(`Account ${account.id} status updated to ${status}`);
}

