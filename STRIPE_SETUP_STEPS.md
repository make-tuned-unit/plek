# 🚀 Stripe Connect Marketplace Setup - Step by Step

## Overview
This guide walks you through setting up Stripe Connect for plekk marketplace, where you are the merchant of record.

---

## Step 1: Enable Stripe Connect in Dashboard

1. **Log into Stripe Dashboard**
   - Go to https://dashboard.stripe.com
   - Select your account (or create one if needed)

2. **Navigate to Connect Settings**
   - Click **Settings** → **Connect** in left sidebar
   - Click **Get started** or **Enable Connect**

3. **Choose Account Type**
   - Select **Express accounts** (recommended for marketplaces)
   - This gives hosts their own Stripe dashboard
   - Stripe handles most of the onboarding

4. **Configure Platform Settings**
   - **Platform name:** plekk
   - **Support email:** support@drivemyway.com (or your email)
   - **Support phone:** (optional)
   - **Support URL:** https://drivemyway.com/support (or your site)

5. **Get Your Connect Client ID**
   - After enabling, you'll see your **Connect Client ID** (starts with `ca_`)
   - Save this - you'll need it for onboarding

6. **Set Up Branding** (Optional but recommended)
   - Upload your logo
   - Set brand colors
   - This appears in host onboarding

---

## Step 2: Configure Environment Variables

### Backend `.env`
```bash
# Stripe Keys (get from Dashboard → Developers → API keys)
STRIPE_SECRET_KEY=sk_live_... # Use sk_test_... for testing
STRIPE_PUBLISHABLE_KEY=pk_live_... # Use pk_test_... for testing

# Stripe Connect
STRIPE_CONNECT_CLIENT_ID=ca_... # From Connect settings

# Stripe Webhook (set up in Step 5)
STRIPE_WEBHOOK_SECRET=whsec_... # From webhook settings

# App URLs
FRONTEND_URL=https://drivemyway.com
BACKEND_URL=https://api.drivemyway.com
```

### Frontend `.env.local`
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_API_URL=https://api.drivemyway.com/api
```

---

## Step 3: Database Setup

✅ **Already Done!** Your `users` table already has:
- `stripe_account_id` - Stores host's Stripe account ID
- `stripe_customer_id` - For renters (optional)

**Optional:** Add status tracking:
```sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS stripe_account_status TEXT DEFAULT NULL;
-- Values: 'pending', 'active', 'restricted', 'rejected'
```

---

## Step 4: Implement Host Onboarding

### 4.1 Create Backend Endpoint

```typescript
// backend/src/controllers/paymentController.ts
import Stripe from 'stripe';
import { getSupabaseClient } from '../services/supabaseService';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

// Create Stripe Connect account for host
export const createConnectAccount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const supabase = getSupabaseClient();
    
    // Get user info
    const { data: user } = await supabase
      .from('users')
      .select('email, first_name, last_name, country')
      .eq('id', userId)
      .single();
    
    // Create Express account
    const account = await stripe.accounts.create({
      type: 'express',
      country: user.country || 'US',
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: {
        user_id: userId,
        platform: 'drivemyway',
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
      accountId: account.id,
    });
  } catch (error: any) {
    console.error('Error creating Connect account:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Check account status
export const getConnectAccountStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const supabase = getSupabaseClient();
    
    const { data: user } = await supabase
      .from('users')
      .select('stripe_account_id, stripe_account_status')
      .eq('id', userId)
      .single();
    
    if (!user.stripe_account_id) {
      return res.json({ 
        connected: false,
        needsOnboarding: true 
      });
    }
    
    // Retrieve account from Stripe
    const account = await stripe.accounts.retrieve(user.stripe_account_id);
    
    res.json({
      connected: true,
      accountId: account.id,
      status: account.details_submitted ? 'active' : 'pending',
      payoutsEnabled: account.payouts_enabled,
      chargesEnabled: account.charges_enabled,
    });
  } catch (error: any) {
    console.error('Error getting account status:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
```

### 4.2 Add Routes

```typescript
// backend/src/routes/payments.ts
import { Router } from 'express';
import { protect } from '../middleware/auth';
import { createConnectAccount, getConnectAccountStatus } from '../controllers/paymentController';

const router = Router();

// Connect account routes
router.post('/connect/create', protect, createConnectAccount);
router.get('/connect/status', protect, getConnectAccountStatus);

export { router as paymentRoutes };
```

### 4.3 Frontend Integration

```typescript
// frontend/app/profile/page.tsx
// Add button to connect Stripe account

const handleConnectStripe = async () => {
  try {
    const response = await apiService.createConnectAccount();
    if (response.success) {
      // Redirect to Stripe onboarding
      window.location.href = response.data.url;
    }
  } catch (error) {
    toast.error('Failed to start Stripe setup');
  }
};

// Check status on page load
useEffect(() => {
  const checkStripeStatus = async () => {
    const response = await apiService.getConnectAccountStatus();
    if (response.data.connected) {
      setStripeConnected(true);
      setStripeStatus(response.data.status);
    }
  };
  checkStripeStatus();
}, []);
```

---

## Step 5: Set Up Webhook Endpoint

### 5.1 Create Webhook in Stripe Dashboard

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. **Endpoint URL:** `https://api.drivemyway.com/api/payments/webhook`
4. **Description:** plekk Marketplace Webhooks
5. **Events to listen to:**
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `account.updated`
   - `transfer.created`
   - `payout.paid`
6. Click **Add endpoint**
7. **Copy the Signing secret** (starts with `whsec_`)
8. Add to backend `.env`: `STRIPE_WEBHOOK_SECRET=whsec_...`

### 5.2 Implement Webhook Handler

See `STRIPE_PAYMENT_FLOW.md` for full webhook implementation code.

---

## Step 6: Implement Payment Intent Creation

See `STRIPE_PAYMENT_FLOW.md` for the full payment intent implementation.

**Key Points:**
- Use `application_fee_amount` for your platform fee
- Use `transfer_data.destination` to auto-transfer to host
- You are the merchant of record (customer sees your name)

---

## Step 7: Set Up Radar for Platforms

### Why Radar?
- Prevents fraud and chargebacks
- Protects your platform from risky accounts
- Helps you comply with regulations

### Setup:
1. Go to **Radar** → **Settings** in Stripe Dashboard
2. Enable **Radar for Platforms**
3. Configure risk rules
4. Set up alerts for high-risk transactions

---

## Step 8: Test Everything

### Test Mode Setup:
1. Use **test mode** in Stripe Dashboard (toggle in top right)
2. Use test API keys (`sk_test_...`, `pk_test_...`)
3. Create test connected accounts
4. Use test cards: `4242 4242 4242 4242`

### Test Flow:
1. Create test host account
2. Onboard host to Stripe (test mode)
3. Create booking
4. Process test payment
5. Verify funds transfer to host account
6. Check webhook events

---

## Step 9: Go Live

### Before Going Live:
- [ ] Complete Stripe account verification
- [ ] Switch to live API keys
- [ ] Test with real card (small amount)
- [ ] Verify webhook endpoint is accessible
- [ ] Set up monitoring and alerts
- [ ] Have support process ready

### Going Live:
1. Switch to **live mode** in Stripe Dashboard
2. Update environment variables with live keys
3. Deploy to production
4. Monitor first transactions closely

---

## 💰 Fee Structure Example

### What You Pay Stripe:
- **Payment processing:** 2.9% + $0.30 per transaction
- **Connect fee:** $0 (no per-account fee for Express)
- **Payout fee:** $0 (free for standard payouts)

### What You Charge Hosts & Renters:
- **Service fee (plekk):** Total 10% of the booking amount
  - 5% is added to the renter's checkout total
  - 5% is deducted from the host's payout
- This covers your Stripe fees + platform costs + profit

### Example:
- Booking: $100
- Stripe fee: $3.20 (2.9% + $0.30)
- Renter service fee (5%): $5.00
- Host service fee (5%): $5.00
- **Your gross margin:** $10.00 per booking (before Stripe fees)
- **After Stripe fees:** ~$6.80 retained by plekk
- **Host receives:** $95.00 (before Stripe processing fees)

---

## 🔒 Security Checklist

- [ ] Never expose secret keys in frontend
- [ ] Always verify webhook signatures
- [ ] Validate payment amounts on backend
- [ ] Use HTTPS for all API calls
- [ ] Implement rate limiting
- [ ] Monitor for suspicious activity
- [ ] Set up fraud detection rules

---

## 📞 Support Resources

- **Stripe Dashboard:** https://dashboard.stripe.com
- **Stripe Docs:** https://stripe.com/docs/connect
- **Stripe Support:** Available in dashboard
- **Marketplace Blueprint:** Use the guided API Blueprint in Dashboard

---

**Ready to implement?** Start with Step 1 (Enable Connect) and work through each step sequentially.


