# 🔗 Stripe Webhook Setup Guide

## Option 1: Local Development (Recommended for Testing)

### Step 1: Install Stripe CLI

**Mac:**
```bash
brew install stripe/stripe-cli/stripe
```

**Windows/Linux:**
Download from: https://github.com/stripe/stripe-cli/releases

### Step 2: Login to Stripe
```bash
stripe login
```
This will open your browser to authenticate.

### Step 3: Forward Webhooks to Your Local Server
```bash
stripe listen --forward-to localhost:8000/api/payments/webhook
```

### Step 4: Copy the Webhook Secret
When you run the command above, you'll see output like:
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx (^C to quit)
```

**Copy that `whsec_...` value** and add it to your backend `.env`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### Step 5: Keep Stripe CLI Running
Keep that terminal window open while testing. It will forward webhook events from Stripe to your local server.

---

## Option 2: Production Webhook (Stripe Dashboard)

### Step 1: Go to Stripe Dashboard
1. Visit https://dashboard.stripe.com
2. Make sure you're in **Test mode** (toggle in top right)
3. Go to **Developers** → **Webhooks** (left sidebar)

### Step 2: Add Endpoint
1. Click **"Add endpoint"** button
2. **Endpoint URL:** `http://localhost:8000/api/payments/webhook` (for local) or `https://your-api-domain.com/api/payments/webhook` (for production)
3. **Description:** plekk Marketplace Webhooks
4. Click **"Add endpoint"**

### Step 3: Select Events
After creating the endpoint, you'll see a list of events. Select these:
- ✅ `payment_intent.succeeded` (required: updates booking/payment; idempotent and resolves `booking_id` from payments table when missing)
- ✅ `payment_intent.payment_failed`
- ✅ `account.updated` (required: keeps host `stripe_account_status` in sync so destination charges are used when host is ready)
- ✅ `transfer.created` (optional: for logging transfers to hosts)

Click **"Add events"**

### Step 4: Get Webhook Secret
1. Click on your newly created webhook endpoint
2. In the **"Signing secret"** section, click **"Reveal"**
3. Copy the secret (starts with `whsec_`)
4. Add to your backend `.env`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

### Step 5: Test Webhook
1. In the webhook details page, click **"Send test webhook"**
2. Select an event (e.g., `payment_intent.succeeded`)
3. Click **"Send test webhook"**
4. Check your backend logs to see if it was received

---

## Quick Start for Local Testing

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Stripe CLI (for webhooks):**
```bash
stripe listen --forward-to localhost:8000/api/payments/webhook
```
Copy the `whsec_...` secret it shows and add to `.env`

**Terminal 3 - Frontend:**
```bash
cd frontend
npm run dev
```

---

## Important Notes

1. **Different secrets for local vs production:**
   - Local: Get from Stripe CLI (`stripe listen`)
   - Production: Get from Stripe Dashboard

2. **Test mode vs Live mode:**
   - Webhooks are separate for test and live modes
   - Make sure you're in the right mode when getting the secret

3. **Keep Stripe CLI running:**
   - For local testing, keep `stripe listen` running
   - It forwards webhooks in real-time

---

## Troubleshooting

**"Webhook signature verification failed"**
- Make sure `STRIPE_WEBHOOK_SECRET` is set correctly
- Restart backend after adding the secret
- For local: Make sure Stripe CLI is running

**"Webhook not received"**
- Check that Stripe CLI is running (for local)
- Check backend logs for errors
- Verify webhook URL is correct
- Make sure backend is accessible (not blocked by firewall)

---

**For now, use Option 1 (Stripe CLI) for local testing!**





