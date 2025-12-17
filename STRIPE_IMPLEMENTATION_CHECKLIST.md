# Stripe Integration Implementation Checklist

## Pre-Deployment Verification

### Database Migration
- [ ] Run `migrations/add_payout_tracking_fields.sql` on database
- [ ] Verify columns added to `bookings` table:
  - `host_net_amount`
  - `platform_fee`
  - `payout_status`
  - `payout_date`
  - `stripe_transfer_id`
- [ ] Verify columns added to `users` table:
  - `payouts_enabled`
  - `details_submitted`
  - `pending_earnings`
  - `requirements_due`

### Backend Code Changes
- [ ] Account creation removes `card_payments` capability
- [ ] Account creation defaults to `'CA'` country
- [ ] Payment intent creation allows bookings without Stripe account
- [ ] Delayed onboarding endpoint `/api/payments/connect/onboarding-link` exists
- [ ] Webhook handler updates all account status fields
- [ ] Payment success handler calculates and stores earnings
- [ ] Payout processing function exists and is called on account activation

### API Endpoints
- [ ] `POST /api/payments/connect/create` - Still works (for manual onboarding)
- [ ] `POST /api/payments/connect/onboarding-link` - New endpoint (delayed onboarding)
- [ ] `GET /api/payments/connect/status` - Returns pending earnings
- [ ] `POST /api/payments/create-intent` - Works without Stripe account requirement

---

## Testing in Stripe Test Mode

### Test 1: Account Creation
1. Create a new host account
2. Call `POST /api/payments/connect/onboarding-link` without earnings
   - Should return error: "No earnings available"
3. Complete a booking as driver (host has no Stripe account)
4. Call `POST /api/payments/connect/onboarding-link` again
   - Should return onboarding URL with earnings amount
5. Check Stripe Dashboard:
   - Account type: Express
   - Country: CA
   - Capabilities: Only "Transfers" (not "Card payments")
   - Business type: Not set (individual)

### Test 2: Booking Without Stripe Account
1. Host creates property listing (no Stripe account)
2. Driver books property
3. Payment succeeds
4. Check database:
   - `bookings.host_net_amount` is set
   - `bookings.payout_status = 'eligible_for_payout'`
   - `users.pending_earnings` is incremented
5. Verify no transfer was created (host has no account)

### Test 3: Onboarding and Payout
1. Host has pending earnings
2. Host completes Stripe onboarding via `/onboarding-link`
3. Verify `account.updated` webhook is received
4. Check database:
   - `users.payouts_enabled = true`
   - `users.details_submitted = true`
5. Verify `processPendingPayouts` was called
6. Check Stripe Dashboard:
   - Transfer was created to host account
   - Transfer amount matches `pending_earnings`
7. Check database:
   - `bookings.payout_status = 'paid_out'`
   - `bookings.payout_date` is set
   - `bookings.stripe_transfer_id` is set
   - `users.pending_earnings = 0`

### Test 4: Booking With Active Account
1. Host has active Stripe account (`payouts_enabled = true`)
2. Driver books property
3. Payment succeeds
4. Check database:
   - `bookings.payout_status = 'paid_out'` (immediate)
   - `bookings.payout_date` is set
5. Check Stripe Dashboard:
   - Transfer was created automatically (destination charge)

### Test 5: Webhook Processing
1. Manually trigger `account.updated` webhook in Stripe Dashboard
2. Verify webhook handler:
   - Updates `payouts_enabled`
   - Updates `details_submitted`
   - Updates `requirements_due`
   - Calls `processPendingPayouts` if account became active

---

## Frontend Updates (To Be Implemented)

### Profile Page - Payments Tab
- [ ] Remove "Connect Stripe Account" button if no earnings
- [ ] Show earnings banner: "You have $X ready to withdraw"
- [ ] Add "Add payout details" button (only when earnings exist)
- [ ] Display pending earnings amount
- [ ] Show payout history (completed transfers)

### Listing Creation
- [ ] Remove any Stripe account requirement checks
- [ ] Allow listing creation without Stripe setup
- [ ] No mentions of "Stripe" in UI (use "payout account" or "bank account")

### Earnings Display
- [ ] Show total earnings on profile
- [ ] Show pending earnings separately
- [ ] Show paid out earnings
- [ ] Link to payout history

---

## Stripe Dashboard Verification

### Account Verification Checklist
For each test Express account created:

- [ ] **Account Type:** Express (not Standard or Custom)
- [ ] **Country:** CA (Canada) - unless user profile specifies otherwise
- [ ] **Capabilities:**
  - ✅ Transfers: Enabled
  - ❌ Card payments: NOT requested (should not appear)
- [ ] **Business Type:** Not set (individual by default)
- [ ] **Business Representative:** Not required (unless Stripe requests it)
- [ ] **Onboarding Status:** Complete (if host finished onboarding)
- [ ] **Payouts Enabled:** Yes (after onboarding)

### Transfer Verification
For each payout:

- [ ] **Transfer Type:** Standard transfer (not instant)
- [ ] **Destination:** Host's Express account
- [ ] **Amount:** Matches `host_net_amount` from booking
- [ ] **Status:** Paid (after processing)
- [ ] **Metadata:** Contains `user_id` and `booking_count`

---

## Production Deployment Steps

1. **Database Migration**
   ```bash
   # Run migration on production database
   psql $DATABASE_URL -f migrations/add_payout_tracking_fields.sql
   ```

2. **Deploy Backend**
   - Deploy updated `paymentController.ts`
   - Deploy updated `payments.ts` routes
   - Verify environment variables are set

3. **Update Frontend** (when ready)
   - Deploy updated profile page
   - Update API service to use new endpoints

4. **Stripe Webhook Configuration**
   - Verify webhook endpoint is configured
   - Ensure `account.updated` event is enabled
   - Test webhook signature verification

5. **Monitor**
   - Check logs for account creation
   - Monitor payout processing
   - Track pending earnings
   - Watch for errors in webhook processing

---

## Rollback Plan

If issues arise:

1. **Database:** Migration can be reversed (columns can be dropped, but data will be lost)
2. **Backend:** Revert to previous version that requires Stripe account
3. **Frontend:** Revert to previous version with Stripe requirement

**Note:** Existing bookings with `payout_status = 'eligible_for_payout'` will need manual processing if rollback occurs.

---

## Success Metrics

After deployment, monitor:

- **Onboarding Conversion:** % of hosts with earnings who complete onboarding
- **Time to Onboarding:** Average time from first booking to payout setup
- **Payout Processing:** Success rate of automatic payouts
- **Error Rate:** Failed transfers or webhook processing errors
- **Support Tickets:** Reduction in "can't list without Stripe" tickets

---

**Last Updated:** 2025-01-27  
**Status:** Backend implementation complete, frontend updates pending

