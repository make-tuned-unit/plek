# Stripe Integration Review - Plekk Marketplace

## Executive Summary

This review identifies critical issues preventing Plekk from implementing an Airbnb-style payout flow where hosts can list properties without upfront Stripe setup, and only complete onboarding when they have earnings to withdraw.

---

## 🔍 Findings

### Critical Issues

#### 1. **Account Creation Requests Unnecessary Capability**
**Location:** `backend/src/controllers/paymentController.ts:165-168`

**Problem:**
```typescript
capabilities: {
  card_payments: { requested: true },  // ❌ NOT NEEDED
  transfers: { requested: true },
}
```

**Impact:** Requesting `card_payments` on Express accounts can trigger business representative requirements and additional KYC steps, especially for US accounts. This increases friction and may require business registration documents.

**Fix:** Remove `card_payments` capability. Only request `transfers` since we're using destination charges (platform charges, then transfers to hosts).

---

#### 2. **Country Defaults to US Instead of CA**
**Location:** `backend/src/controllers/paymentController.ts:163`

**Problem:**
```typescript
country: existingUser?.country || 'US',  // ❌ Should be 'CA'
```

**Impact:** US accounts have stricter requirements (business representative, tax forms) compared to Canadian Express accounts for individuals. This creates unnecessary friction.

**Fix:** Default to `'CA'` for Canadian hosts, but keep it configurable via user profile.

---

#### 3. **Payment Intent Creation Blocks Bookings Without Stripe Account**
**Location:** `backend/src/controllers/paymentController.ts:468-482`

**Problem:**
```typescript
if (!property.host?.stripe_account_id) {
  res.status(400).json({
    success: false,
    error: 'Host has not set up payment account. Please contact support.',
  });
  return;
}

if (property.host?.stripe_account_status !== 'active') {
  res.status(400).json({
    success: false,
    error: 'Host payment account is not yet active. Please try again later.',
  });
  return;
}
```

**Impact:** Hosts **cannot** list properties or receive bookings until they complete Stripe onboarding. This violates the requirement to allow listings without payout setup.

**Fix:** Remove these checks. Allow bookings to proceed. Track earnings separately and prompt onboarding only when host has money to withdraw.

---

#### 4. **Onboarding Triggered Manually, Not Based on Earnings**
**Location:** `frontend/app/profile/page.tsx:680-696`, `backend/src/controllers/paymentController.ts:127`

**Problem:** Onboarding is triggered manually from the "Payments" tab. There's no logic to:
- Check if host has pending earnings
- Only prompt when money is waiting
- Automatically trigger after first completed booking

**Impact:** Hosts may complete onboarding unnecessarily, or miss the prompt when they actually have earnings.

**Fix:** Create a new endpoint `/api/payments/connect/onboarding-link` that:
1. Checks if host has pending earnings
2. Only creates account/link if earnings exist
3. Returns earnings amount in response

---

#### 5. **Missing Database Fields for Earnings Tracking**
**Location:** `supabase_database_setup.sql`

**Problem:** The `bookings` table doesn't track:
- `host_net_amount` (amount host should receive after fees)
- `platform_fee` (platform's share)
- `payout_status` (pending/eligible_for_payout/paid_out)
- `payout_date` (when payout was processed)

**Impact:** Cannot determine which hosts have money waiting, or track payout status.

**Fix:** Add columns to `bookings` table:
```sql
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS host_net_amount DECIMAL(10,2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10,2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payout_status TEXT DEFAULT 'pending';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payout_date TIMESTAMP WITH TIME ZONE;
```

Also add to `users` table:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS payouts_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS details_submitted BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_earnings DECIMAL(10,2) DEFAULT 0.00;
```

---

#### 6. **Webhook Handler Doesn't Update All Account Status Fields**
**Location:** `backend/src/controllers/paymentController.ts:1114-1131`

**Problem:**
```typescript
async function handleAccountUpdate(account: Stripe.Account, supabase: any): Promise<void> {
  const status = account.details_submitted && account.charges_enabled && account.payouts_enabled
    ? 'active'
    : account.details_submitted
    ? 'pending'
    : 'pending';
  
  await supabase
    .from('users')
    .update({ stripe_account_status: status })
    .eq('stripe_account_id', account.id);
}
```

**Impact:** Doesn't update `payouts_enabled` or `details_submitted` fields separately. These are needed to determine if host can receive payouts.

**Fix:** Update to store all relevant fields:
```typescript
await supabase
  .from('users')
  .update({ 
    stripe_account_status: status,
    payouts_enabled: account.payouts_enabled,
    details_submitted: account.details_submitted,
    requirements_due: account.requirements?.currently_due || []
  })
  .eq('stripe_account_id', account.id);
```

---

#### 7. **No Payout Triggering Logic After Booking Completion**
**Location:** Payment webhook handlers

**Problem:** When a booking is completed, there's no logic to:
- Calculate host's net amount
- Check if host has `payouts_enabled`
- Trigger transfer if enabled, or mark as `payout_pending` if not

**Impact:** Hosts don't automatically receive payouts after bookings complete.

**Fix:** Add logic in `handlePaymentSuccess` or create a separate function that:
1. Calculates `host_net_amount = baseAmount - hostServiceFee`
2. If `payouts_enabled` and account is active: create transfer
3. If not: mark booking as `payout_pending` and increment `pending_earnings`

---

#### 8. **Payment Model Uses Destination Charges (Correct)**
**Location:** `backend/src/controllers/paymentController.ts:489-496`

**Status:** ✅ **CORRECT**

The current implementation uses destination charges with `transfer_data.destination`, which is appropriate for a marketplace model. The payment goes to the platform, and Stripe automatically transfers to the host (minus application fee).

**Note:** This is fine, but we need to handle the case where the host doesn't have a connected account yet. In that case, we should:
- Charge the driver normally (to platform)
- Store the host's share in `pending_earnings`
- Prompt host to set up payouts
- Transfer accumulated earnings once account is active

---

## 📋 Current Payment Flow

### Current Flow (Problematic)
1. Host must connect Stripe account before listing
2. Host completes onboarding immediately
3. Driver books → Payment intent created (requires active Stripe account)
4. Payment succeeds → Transfer happens automatically via destination charge
5. Host receives payout

### Desired Flow (Airbnb-style)
1. Host can list property **without** Stripe account
2. Driver books → Payment intent created (no Stripe requirement)
3. Payment succeeds → Booking confirmed, earnings tracked
4. **After booking completes** → Check if host has Stripe account
5. If no account OR account not active → Prompt onboarding with earnings amount
6. Once account active → Transfer accumulated earnings
7. Future bookings → Auto-transfer if account active

---

## 🎯 Implementation Plan

### Phase 1: Database Schema Updates
1. Add earnings/payout tracking columns to `bookings` table
2. Add payout status fields to `users` table
3. Create migration script

### Phase 2: Account Creation Fixes
1. Remove `card_payments` capability
2. Change default country to `'CA'`
3. Make country configurable from user profile

### Phase 3: Remove Stripe Requirement from Bookings
1. Remove Stripe account checks from `createPaymentIntent`
2. Allow bookings to proceed without connected account
3. Track earnings separately

### Phase 4: Delayed Onboarding Logic
1. Create `/api/payments/connect/onboarding-link` endpoint
2. Check for pending earnings before creating account
3. Return earnings amount in response
4. Update frontend to show earnings and prompt accordingly

### Phase 5: Earnings Calculation & Tracking
1. Calculate `host_net_amount` and `platform_fee` in payment handlers
2. Store in `bookings` table
3. Update `users.pending_earnings` when booking completes
4. Decrement when payout is processed

### Phase 6: Payout Triggering
1. After booking completion, check host account status
2. If `payouts_enabled`: create transfer immediately
3. If not: mark as `payout_pending` and increment `pending_earnings`
4. When account becomes active (via webhook): process pending payouts

### Phase 7: Webhook Updates
1. Update `handleAccountUpdate` to store all status fields
2. When account becomes active: trigger pending payout processing
3. Update `pending_earnings` accordingly

### Phase 8: Frontend Updates
1. Remove Stripe connection requirement from listing creation
2. Add earnings display on profile page
3. Show banner: "You have $X ready to withdraw — add payout details"
4. Update "Payments" tab to show earnings and pending payouts
5. Only show "Connect Account" when earnings exist

---

## 🔒 Compliance Notes

**Important:** We are NOT removing required KYC steps. Stripe's hosted onboarding will still collect:
- Identity verification (when required by Stripe)
- Bank account details
- Tax information (when required)

We're simply:
- Delaying the prompt until money is earned
- Using Express accounts (individuals by default)
- Requesting only `transfers` capability (not `card_payments`)
- Using Canada as default country (less strict requirements)

This approach minimizes friction while maintaining compliance.

---

## ✅ Verification Checklist

After implementation, verify:

### Account Creation
- [ ] Created Express accounts have `type: 'express'`
- [ ] Only `transfers` capability is requested (not `card_payments`)
- [ ] Default country is `'CA'` (or from user profile)
- [ ] No `business_type` is set unless user explicitly chooses business
- [ ] Account creation happens only when earnings exist (or manually requested)

### Onboarding Flow
- [ ] Hosts can create listings without Stripe account
- [ ] Bookings can be made for properties without connected accounts
- [ ] Onboarding is prompted only when:
  - Booking completes AND host has positive earnings, OR
  - Host clicks "Get paid" with pending earnings
- [ ] Onboarding link shows earnings amount

### Payout Flow
- [ ] Earnings are calculated correctly: `host_net_amount = baseAmount - hostServiceFee`
- [ ] Earnings are tracked in `bookings.host_net_amount` and `users.pending_earnings`
- [ ] Transfers are created only if `payouts_enabled = true` and account is active
- [ ] Pending earnings are transferred when account becomes active
- [ ] `payout_status` is updated correctly: `pending` → `eligible_for_payout` → `paid_out`

### Webhooks
- [ ] `account.updated` webhook updates:
  - `stripe_account_status`
  - `payouts_enabled`
  - `details_submitted`
  - `requirements_due`
- [ ] When account becomes active, pending payouts are processed
- [ ] `payment_intent.succeeded` calculates and stores earnings

### Frontend
- [ ] No Stripe prompts during listing creation
- [ ] Earnings are displayed on profile page
- [ ] Banner shows when money is waiting: "You have $X ready to withdraw"
- [ ] "Add payout details" button appears only when earnings exist
- [ ] Copy doesn't mention "Stripe" (use "payout account" or "bank account")

---

## 🧪 Testing Plan

### Test Scenario 1: New Host Without Account
1. Create host account
2. Create property listing (should succeed)
3. Complete a booking as driver
4. Verify booking is confirmed
5. Check host's `pending_earnings` is updated
6. Verify onboarding prompt appears with earnings amount

### Test Scenario 2: Host Completes Onboarding
1. Host has pending earnings
2. Host clicks "Add payout details"
3. Completes Stripe onboarding
4. Verify `payouts_enabled = true` in database
5. Verify pending earnings are transferred
6. Verify `payout_status = 'paid_out'` for completed bookings

### Test Scenario 3: Account Creation in Stripe Dashboard
1. Create account via API
2. Check Stripe Dashboard:
   - Account type: Express
   - Country: CA
   - Capabilities: Only Transfers (not Card Payments)
   - Business type: Not set (individual by default)

### Test Scenario 4: Webhook Processing
1. Complete onboarding in Stripe
2. Verify `account.updated` webhook is received
3. Check database: `payouts_enabled = true`, `details_submitted = true`
4. Verify pending payouts are processed

---

## 📝 Next Steps

1. Review this document with team
2. Prioritize implementation phases
3. Create database migration script
4. Implement backend changes
5. Update frontend UI
6. Test in Stripe test mode
7. Deploy to staging
8. Verify with real Stripe accounts
9. Deploy to production

---

**Document Version:** 1.0  
**Date:** 2025-01-27  
**Reviewed By:** Senior Payments Engineer

