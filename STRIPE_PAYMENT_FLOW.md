# 💳 Stripe Payment Flow - Marketplace Payments

## Overview
This document explains how payments work in plekk using **Stripe Connect Marketplace** model.

**plekk is the merchant of record** - we process payments, handle disputes, and manage refunds. Hosts are connected accounts that receive payouts.

---

## 🏗️ Architecture: Stripe Connect Marketplace

### Marketplace Model (What We're Using)
✅ **You (plekk) are the merchant of record**
- Legally responsible for goods/services
- Customers see "plekk" on their receipt
- You pay Stripe fees
- You manage disputes and refunds

✅ **Stripe handles onboarding**
- Express accounts for hosts
- Stripe manages the onboarding flow

✅ **Express Dashboard for hosts**
- Each host gets their own Stripe Express dashboard
- They can see earnings, payouts, etc.

✅ **Application fees**
- You collect per-payment fees (total 10%: 5% charged to the renter and 5% deducted from the host payout)
- Fees cover your costs and generate revenue

✅ **Destination charges**
- Payment goes to platform first
- Platform automatically transfers to host (minus fee)

### Two Types of Accounts:
1. **Platform Account** (plekk - Your Account)
   - Receives all payments from renters
   - Takes platform service fee (5% from renter + 5% from host)
   - Transfers remaining amount to hosts
   - Handles all Stripe fees
   - Manages disputes and refunds

2. **Connected Accounts** (Host Accounts - Express)
   - Each host has a Stripe Express account
   - Receives transfers from platform
   - Can withdraw to their bank account
   - Has their own Express Dashboard

---

## 💰 Payment Flow Step-by-Step

### Step 1: Host Onboarding (One-Time Setup)

```
1. Host signs up and wants to list property
2. Host clicks "Connect Stripe Account" or "Set up payouts"
3. Redirect host to Stripe Connect Onboarding
4. Host completes Stripe Express account setup:
   - Business information
   - Bank account details
   - Tax information
5. Stripe returns connected account ID
6. Save `stripe_account_id` to user's profile in database
```

**Database Update Needed:**
```sql
ALTER TABLE users ADD COLUMN stripe_account_id TEXT;
ALTER TABLE users ADD COLUMN stripe_account_status TEXT; -- 'pending', 'active', 'restricted'
```

---

### Step 2: User Books & Pays (Booking Flow)

```
1. User selects property and dates
2. User clicks "Book Now"
3. Frontend calculates total:
   - Base amount (hours × hourly_rate)
   - Renter service fee (5% of base)
   - Total = base + renter_service_fee

4. Frontend calls: POST /api/payments/create-intent
   - Backend creates PaymentIntent with:
     - amount: total (in cents)
     - currency: 'usd'
     - application_fee_amount: service_fee (in cents)
     - transfer_data.destination: host's stripe_account_id
     - metadata: booking_id, property_id, etc.

5. Frontend receives client_secret
6. Frontend shows Stripe Elements payment form
7. User enters card details and pays
8. Frontend calls: POST /api/payments/confirm
   - Backend confirms payment
   - Updates booking status to 'confirmed'
   - Creates payment record in database
   - Sends confirmation emails
```

---

### Step 3: Payment Processing (Automatic)

```
When payment succeeds:
1. Stripe charges user's card
2. Stripe holds funds in platform account
3. Platform fee (renter + host service fees) stays with platform
4. Remaining amount automatically transfers to host's Stripe account (base minus host service fee)
5. Stripe sends webhook: payment_intent.succeeded
6. Backend webhook handler:
   - Updates payment status in database
   - Updates booking payment_status
   - Creates notification for host
```

---

### Step 4: Host Receives Payout (Automatic)

```
1. Funds are in host's Stripe Express account
2. Stripe automatically transfers to host's bank account:
   - Default: Daily payouts
   - Can be configured: Weekly, Monthly, or Manual
3. Host receives email from Stripe when payout completes
```

---

## 🔧 Implementation Steps

### Phase 1: Stripe Connect Setup

#### 1.1 Enable Stripe Connect in Dashboard
1. Go to Stripe Dashboard → Settings → Connect
2. Enable Stripe Connect
3. Choose "Express accounts" (easiest for hosts)
4. Set up your platform branding
5. Get your **Connect Client ID** (starts with `ca_`)

#### 1.2 Update Environment Variables
```bash
# Backend .env
STRIPE_SECRET_KEY=sk_live_... # Production key
STRIPE_PUBLISHABLE_KEY=pk_live_... # Production key
STRIPE_WEBHOOK_SECRET=whsec_... # Webhook secret
STRIPE_CONNECT_CLIENT_ID=ca_... # Connect Client ID
```

```bash
# Frontend .env.local
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

---

### Phase 2: Host Onboarding Implementation

#### 2.1 Create Stripe Connect Account Link
```typescript
// backend/src/controllers/paymentController.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

// Create account link for host onboarding
export const createConnectAccount = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  
  // Create Express account for host
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'US', // or get from user profile
    email: req.user.email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });
  
  // Create account link for onboarding
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${process.env.FRONTEND_URL}/profile?stripe_refresh=true`,
    return_url: `${process.env.FRONTEND_URL}/profile?stripe_success=true`,
    type: 'account_onboarding',
  });
  
  // Save account ID to user
  await supabase
    .from('users')
    .update({ 
      stripe_account_id: account.id,
      stripe_account_status: 'pending'
    })
    .eq('id', userId);
  
  res.json({
    success: true,
    url: accountLink.url, // Redirect host to this URL
  });
};
```

#### 2.2 Check Account Status
```typescript
export const getConnectAccountStatus = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const user = await getUser(userId);
  
  if (!user.stripe_account_id) {
    return res.json({ 
      connected: false,
      needsOnboarding: true 
    });
  }
  
  const account = await stripe.accounts.retrieve(user.stripe_account_id);
  
  res.json({
    connected: true,
    status: account.details_submitted ? 'active' : 'pending',
    payoutsEnabled: account.payouts_enabled,
  });
};
```

---

### Phase 3: Payment Intent Creation

#### 3.1 Create Payment Intent with Connect
```typescript
// backend/src/controllers/paymentController.ts
export const createPaymentIntent = async (req: Request, res: Response) => {
  const { bookingId } = req.body;
  const renterId = (req as any).user.id;
  
  // Get booking details
  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      *,
      property:properties(
        *,
        host:users(stripe_account_id, stripe_account_status)
      )
    `)
    .eq('id', bookingId)
    .single();
  
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }
  
  // Verify host has Stripe account
  if (!booking.property.host.stripe_account_id) {
    return res.status(400).json({ 
      error: 'Host has not set up payment account' 
    });
  }
  
  const totalAmount = booking.total_amount; // in dollars
  const serviceFee = booking.service_fee; // in dollars
  const hostAmount = totalAmount - serviceFee; // amount to transfer to host
  
  // Create PaymentIntent with Connect (Destination Charge)
  // This is the recommended marketplace model
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(totalAmount * 100), // Convert to cents
    currency: 'usd',
    application_fee_amount: Math.round(serviceFee * 100), // Platform fee (you keep this)
    transfer_data: {
      destination: booking.property.host.stripe_account_id, // Host's account (auto-transfer)
    },
    // Customer sees "plekk" on their receipt
    // You are the merchant of record
    metadata: {
      booking_id: bookingId,
      property_id: booking.property_id,
      renter_id: renterId,
      host_id: booking.host_id,
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
};
```

---

### Phase 4: Payment Confirmation

#### 4.1 Confirm Payment
```typescript
export const confirmPayment = async (req: Request, res: Response) => {
  const { paymentIntentId, bookingId } = req.body;
  
  // Retrieve payment intent to verify status
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  
  if (paymentIntent.status !== 'succeeded') {
    return res.status(400).json({ 
      error: 'Payment not completed',
      status: paymentIntent.status 
    });
  }
  
  // Update booking and create payment record
  await supabase.transaction(async (trx) => {
    // Update booking
    await trx
      .from('bookings')
      .update({ 
        payment_status: 'completed',
        status: 'confirmed' // If instant booking, or keep as 'pending' for approval
      })
      .eq('id', bookingId);
    
    // Create payment record
    await trx.from('payments').insert({
      booking_id: bookingId,
      user_id: paymentIntent.metadata.renter_id,
      amount: paymentIntent.amount / 100, // Convert from cents
      currency: paymentIntent.currency,
      stripe_payment_id: paymentIntentId,
      status: 'completed',
      type: 'booking',
    });
  });
  
  res.json({
    success: true,
    message: 'Payment confirmed',
  });
};
```

---

### Phase 5: Webhook Handling

#### 5.1 Stripe Webhook Endpoint
```typescript
// backend/src/routes/payments.ts
import express from 'express';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']!;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await handlePaymentSuccess(paymentIntent);
      break;
      
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object as Stripe.PaymentIntent;
      await handlePaymentFailure(failedPayment);
      break;
      
    case 'account.updated':
      const account = event.data.object as Stripe.Account;
      await handleAccountUpdate(account);
      break;
      
    default:
      console.log(`Unhandled event type ${event.type}`);
  }
  
  res.json({ received: true });
});

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const bookingId = paymentIntent.metadata.booking_id;
  
  // Update booking status
  await supabase
    .from('bookings')
    .update({ payment_status: 'completed' })
    .eq('id', bookingId);
  
  // Send notifications
  // ... email notifications
}

async function handleAccountUpdate(account: Stripe.Account) {
  // Update user's Stripe account status
  await supabase
    .from('users')
    .update({ 
      stripe_account_status: account.details_submitted ? 'active' : 'pending'
    })
    .eq('stripe_account_id', account.id);
}
```

---

## 🎨 Frontend Integration

### Step 1: Install Stripe.js
```bash
cd frontend
npm install @stripe/stripe-js @stripe/react-stripe-js
```

### Step 2: Add Stripe Provider
```typescript
// frontend/app/layout.tsx or Providers.tsx
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export function Providers({ children }) {
  return (
    <Elements stripe={stripePromise}>
      {children}
    </Elements>
  );
}
```

### Step 3: Update BookingModal with Payment
```typescript
// frontend/components/BookingModal.tsx
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

export function BookingModal({ property, isOpen, onClose, onSuccess }: BookingModalProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [clientSecret, setClientSecret] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // After booking is created, create payment intent
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Create booking first
    const bookingResponse = await apiService.createBooking({...});
    
    if (!bookingResponse.success) return;
    
    // 2. Create payment intent
    const paymentResponse = await apiService.createPaymentIntent({
      bookingId: bookingResponse.data.booking.id
    });
    
    setClientSecret(paymentResponse.data.clientSecret);
    // Show payment form
  };
  
  // Handle payment submission
  const handlePayment = async () => {
    if (!stripe || !elements) return;
    
    setIsProcessing(true);
    
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/booking-success`,
      },
      redirect: 'if_required',
    });
    
    if (error) {
      toast.error(error.message);
    } else if (paymentIntent.status === 'succeeded') {
      // Confirm payment on backend
      await apiService.confirmPayment({
        paymentIntentId: paymentIntent.id,
        bookingId: booking.id
      });
      
      toast.success('Payment successful!');
      onSuccess();
      onClose();
    }
    
    setIsProcessing(false);
  };
  
  return (
    // ... booking form ...
    {clientSecret && (
      <PaymentElement />
      <button onClick={handlePayment} disabled={isProcessing}>
        {isProcessing ? 'Processing...' : 'Pay Now'}
      </button>
    )}
  );
}
```

---

## 📊 Payment Breakdown Example

### Example Booking:
- **Property Rate:** $20/hour
- **Duration:** 3 hours
- **Base Amount:** $60.00
- **Renter Service Fee (5%):** $3.00 (included in customer charge)
- **Host Service Fee (5%):** $3.00 (deducted from host payout)
- **Security Deposit (20%):** $12.00 (held, refundable)
- **Total Charged to Renter:** $75.00

### What Happens:
1. **Renter pays:** $75.00
2. **Platform receives:** $75.00
3. **Platform keeps:** $6.00 (combined renter + host service fees)
4. **Transferred to host:** $57.00 (base amount minus host service fee)
5. **(No security deposit is collected in this flow)**

---

## 🔐 Security Considerations

1. **Never expose secret keys** in frontend
2. **Always verify webhook signatures**
3. **Validate payment amounts** on backend
4. **Use idempotency keys** for payment intents
5. **Store payment records** for audit trail
6. **Handle refunds** properly (return to original payment method)

---

## 🧪 Testing

### Test Mode:
1. Use Stripe test keys (`sk_test_...`, `pk_test_...`)
2. Use test cards: `4242 4242 4242 4242`
3. Create test connected accounts
4. Test payment flow end-to-end

### Test Cards:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

---

## 📝 Next Steps

1. **Enable Stripe Connect** in Stripe Dashboard
   - Go to Settings → Connect
   - Enable Connect
   - Choose "Express accounts"
   - Get your Connect Client ID

2. **Database is ready** ✅
   - `stripe_account_id` column already exists in users table

3. **Implement host onboarding** flow
   - Create Express account for hosts
   - Redirect to Stripe onboarding
   - Save account ID when complete

4. **Implement payment intent creation** with Connect
   - Use destination charges
   - Set application_fee_amount
   - Auto-transfer to host account

5. **Add Stripe Elements** to frontend
   - Install @stripe/react-stripe-js
   - Add payment form to BookingModal

6. **Set up webhook endpoint**
   - Handle payment_intent.succeeded
   - Handle account.updated
   - Verify webhook signatures

7. **Set up Radar for Platforms**
   - Prevent fraud
   - Monitor risky accounts
   - Protect against chargebacks

8. **Test complete flow** in test mode
   - Use test cards
   - Create test connected accounts
   - Test end-to-end

9. **Switch to live mode** for production
   - Use live API keys
   - Complete Stripe account verification
   - Enable live mode in dashboard

---

## 🔗 Useful Resources

- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Express Accounts Guide](https://stripe.com/docs/connect/express-accounts)
- [Payment Intents with Connect](https://stripe.com/docs/payments/payment-intents/use-cases#connected-accounts)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)

---

**Questions?** Check Stripe Dashboard → Developers → Logs for debugging.

