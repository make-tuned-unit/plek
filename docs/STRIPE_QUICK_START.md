# 🚀 Stripe Implementation - Quick Start Guide

## ✅ What's Been Implemented

### Backend (Complete)
- ✅ Payment controller with Stripe Connect
- ✅ Host onboarding endpoints (`/api/payments/connect/create`, `/api/payments/connect/status`)
- ✅ Payment intent creation with destination charges
- ✅ Payment confirmation
- ✅ Webhook handler for payment events
- ✅ Payment history endpoint

### Frontend (Complete)
- ✅ Stripe Elements provider added to app
- ✅ BookingModal updated with 2-step flow (booking → payment)
- ✅ Payment form with Stripe Elements
- ✅ API service methods for all payment endpoints

---

## 📋 What You Need to Do Now

### Step 1: Add Stripe Keys to Environment Variables

#### Backend `.env`:
```bash
# Get from Stripe Dashboard → Developers → API keys (Test mode)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Get from Stripe Dashboard → Settings → Connect
STRIPE_CONNECT_CLIENT_ID=ca_...

# Get from Stripe Dashboard → Developers → Webhooks (after Step 2)
STRIPE_WEBHOOK_SECRET=whsec_...

# Your URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
```

#### Frontend `.env.local`:
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

---

### Step 2: Set Up Webhook Endpoint

**For Local Testing:**
1. Install Stripe CLI: `brew install stripe/stripe-cli/stripe` (Mac) or see https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward webhooks: `stripe listen --forward-to localhost:8000/api/payments/webhook`
4. Copy the webhook secret (starts with `whsec_`) and add to backend `.env`

**For Production:**
1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. URL: `https://your-api-domain.com/api/payments/webhook`
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `account.updated`
   - `transfer.created`
5. Copy webhook secret to backend `.env`

---

### Step 3: Test Host Onboarding

1. **Start your servers:**
   ```bash
   # Terminal 1 - Backend
   cd backend && npm run dev
   
   # Terminal 2 - Frontend
   cd frontend && npm run dev
   
   # Terminal 3 - Stripe CLI (for webhooks)
   stripe listen --forward-to localhost:8000/api/payments/webhook
   ```

2. **Test as a host:**
   - Go to Profile page
   - Look for "Connect Stripe Account" button (I'll add this next)
   - Click it → Should redirect to Stripe onboarding
   - Complete test onboarding
   - Return to profile → Should show "Connected"

---

### Step 4: Test Payment Flow

1. **Create a test booking:**
   - Go to Find Parking
   - Click "Book Now" on a property
   - Fill in booking details
   - Click "Continue to Payment"

2. **Complete payment:**
   - Use test card: `4242 4242 4242 4242`
   - Any future expiry date (e.g., 12/34)
   - Any CVC (e.g., 123)
   - Any ZIP (e.g., 12345)
   - Click "Pay"

3. **Verify:**
   - Check Stripe Dashboard → Payments (should see payment)
   - Check Stripe Dashboard → Connect → Accounts (should see transfer to host)
   - Check your database (booking should have `payment_status: 'completed'`)

---

## 🎯 Next: Add Host Onboarding UI

I need to add a "Connect Stripe Account" button to the profile page. Should I add it to:
- The "Listings" tab (for hosts who want to list properties)?
- A new "Payouts" or "Earnings" tab?
- The "Settings" tab?

Let me know and I'll implement it!

---

## 📝 Important Notes

1. **Test Mode:** Make sure you're using test keys (`sk_test_...`, `pk_test_...`)
2. **Webhook Secret:** Different for local (from Stripe CLI) vs production (from Dashboard)
3. **Host Account:** Hosts need to complete Stripe onboarding before they can receive payouts
4. **Payment Flow:** Booking is created first, then payment is processed

---

## 🔍 Troubleshooting

**"Payment system not ready"**
- Check that `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set in frontend `.env.local`
- Restart frontend dev server after adding env vars

**"Host has not set up payment account"**
- Host needs to complete Stripe onboarding first
- Check that `stripe_account_id` is saved in database

**Webhook not working**
- Make sure Stripe CLI is running (for local)
- Check webhook secret matches in `.env`
- Check backend logs for webhook errors

---

**Ready to test!** Add your Stripe keys and let me know if you want me to add the host onboarding UI to the profile page.





