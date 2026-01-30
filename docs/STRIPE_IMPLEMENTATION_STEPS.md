# 🚀 Stripe Implementation Steps - What You Need to Do

## Step 1: Add Stripe Keys to Environment Variables

### Backend `.env` file:
```bash
# Get these from Stripe Dashboard → Developers → API keys (Test mode)
STRIPE_SECRET_KEY=sk_test_... # Your test secret key
STRIPE_PUBLISHABLE_KEY=pk_test_... # Your test publishable key

# Get from Stripe Dashboard → Settings → Connect
STRIPE_CONNECT_CLIENT_ID=ca_... # Your Connect Client ID

# Get from Stripe Dashboard → Developers → Webhooks (after creating webhook)
STRIPE_WEBHOOK_SECRET=whsec_... # Webhook signing secret

# Your app URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
```

### Frontend `.env.local` file:
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

---

## Step 2: Set Up Webhook Endpoint in Stripe Dashboard

1. **Go to Stripe Dashboard** → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. **Endpoint URL:** `http://localhost:8000/api/payments/webhook` (for local testing)
   - For production: `https://your-api-domain.com/api/payments/webhook`
4. **Description:** plekk Marketplace Webhooks
5. **Select events to listen to:**
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `account.updated`
   - `transfer.created`
6. Click **Add endpoint**
7. **Copy the Signing secret** (starts with `whsec_`)
8. Add to backend `.env`: `STRIPE_WEBHOOK_SECRET=whsec_...`

**For Local Testing:**
- Use Stripe CLI: `stripe listen --forward-to localhost:8000/api/payments/webhook`
- This gives you a webhook secret for local development

---

## Step 3: Install Frontend Stripe Package

```bash
cd frontend
npm install @stripe/react-stripe-js
```

---

## Step 4: Test the Implementation

### Test Host Onboarding:
1. Go to Profile page
2. Click "Connect Stripe Account" (if you're a host)
3. Should redirect to Stripe onboarding
4. Complete test onboarding
5. Return to profile - should show "Connected"

### Test Payment Flow:
1. Create a booking
2. Should see payment form
3. Use test card: `4242 4242 4242 4242`
4. Complete payment
5. Check Stripe Dashboard for payment and transfer

---

## What I've Already Implemented:

✅ **Backend:**
- Payment controller with all Connect functions
- Host onboarding endpoints
- Payment intent creation with Connect
- Payment confirmation
- Webhook handler
- Payment history

✅ **Frontend API Service:**
- All payment and Connect API methods

---

## What Still Needs to Be Done:

1. **Install @stripe/react-stripe-js** in frontend
2. **Add Stripe Elements Provider** to app layout
3. **Update BookingModal** to include payment form
4. **Add host onboarding UI** to profile page
5. **Add your Stripe keys** to environment variables

---

## Next: I'll implement the frontend components now!





