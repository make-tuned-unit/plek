# Stripe Integration Refactor - Implementation Summary

## Overview

This refactor implements an Airbnb-style payout flow where hosts can list properties without upfront Stripe setup, and only complete onboarding when they have earnings to withdraw.

---

## ✅ Completed Changes

### 1. Database Schema Updates
**File:** `migrations/add_payout_tracking_fields.sql`

Added fields to track earnings and payout status:
- `bookings.host_net_amount` - Amount host receives after fees
- `bookings.platform_fee` - Platform's service fee
- `bookings.payout_status` - Status: pending/eligible_for_payout/paid_out
- `bookings.payout_date` - When payout was processed
- `bookings.stripe_transfer_id` - Stripe transfer ID
- `users.payouts_enabled` - Whether host can receive payouts
- `users.details_submitted` - Whether host completed onboarding
- `users.pending_earnings` - Total earnings waiting to be paid
- `users.requirements_due` - Pending Stripe requirements

### 2. Account Creation Fixes
**File:** `backend/src/controllers/paymentController.ts:161-173`

**Changes:**
- ✅ Removed `card_payments` capability (only request `transfers`)
- ✅ Changed default country from `'US'` to `'CA'` (Canada)
- ✅ Country is still configurable from user profile

**Impact:** Reduces KYC friction, avoids business representative requirements for individuals.

### 3. Removed Stripe Requirement from Bookings
**File:** `backend/src/controllers/paymentController.ts:467-482`

**Changes:**
- ✅ Removed checks that blocked bookings without Stripe account
- ✅ Removed check for `stripe_account_status === 'active'`
- ✅ Added comment explaining delayed onboarding approach

**Impact:** Hosts can now list and receive bookings without Stripe setup.

### 4. Payment Intent Creation Updates
**File:** `backend/src/controllers/paymentController.ts:484-508`

**Changes:**
- ✅ Added `host_net_amount` and `platform_fee` to metadata
- ✅ Conditional logic: Use destination charge if host has active account, otherwise charge to platform
- ✅ Added `payout_method` metadata to track transfer method

**Impact:** Supports both immediate transfers (active accounts) and delayed transfers (pending accounts).

### 5. Delayed Onboarding Endpoint
**File:** `backend/src/controllers/paymentController.ts:336-428`

**New Endpoint:** `POST /api/payments/connect/onboarding-link`

**Features:**
- ✅ Checks for pending earnings before creating account
- ✅ Returns error if no earnings exist
- ✅ Creates Express account only when earnings are present
- ✅ Returns earnings amount in response
- ✅ Uses only `transfers` capability, defaults to `'CA'`

**Impact:** Onboarding is only prompted when host has money waiting.

### 6. Earnings Calculation & Tracking
**Files:**
- `backend/src/controllers/paymentController.ts:976-1001` (booking creation)
- `backend/src/controllers/paymentController.ts:1068-1105` (payment success)

**Changes:**
- ✅ Calculate `host_net_amount = baseAmount - hostServiceFee`
- ✅ Store earnings in `bookings` table
- ✅ Update `users.pending_earnings` when booking completes
- ✅ Mark bookings as `eligible_for_payout` or `paid_out`

**Impact:** Tracks all earnings and payout status accurately.

### 7. Payout Processing Logic
**File:** `backend/src/controllers/paymentController.ts:1150-1210`

**New Function:** `processPendingPayouts()`

**Features:**
- ✅ Finds all bookings eligible for payout
- ✅ Calculates total transfer amount
- ✅ Creates Stripe transfer to host account
- ✅ Updates booking status to `paid_out`
- ✅ Resets `pending_earnings` to 0
- ✅ Stores transfer ID in booking record

**Impact:** Automatically processes payouts when account becomes active.

### 8. Webhook Handler Updates
**File:** `backend/src/controllers/paymentController.ts:1124-1149`

**Changes:**
- ✅ Updates `payouts_enabled` field
- ✅ Updates `details_submitted` field
- ✅ Stores `requirements_due` array
- ✅ Calls `processPendingPayouts()` when account becomes active

**Impact:** Properly tracks account status and triggers payouts automatically.

### 9. Status Endpoint Updates
**File:** `backend/src/controllers/paymentController.ts:234-334`

**Changes:**
- ✅ Returns `pending_earnings` in response
- ✅ Returns `hasEarnings` boolean
- ✅ Calculates earnings from bookings if not in user record

**Impact:** Frontend can display earnings and prompt onboarding accordingly.

### 10. Route Updates
**File:** `backend/src/routes/payments.ts`

**Changes:**
- ✅ Added `POST /api/payments/connect/onboarding-link` route
- ✅ Exported `createOnboardingLink` function

**Impact:** New endpoint is accessible via API.

---

## 📋 Files Modified

1. `backend/src/controllers/paymentController.ts` - Main payment logic
2. `backend/src/routes/payments.ts` - Route definitions
3. `migrations/add_payout_tracking_fields.sql` - Database migration
4. `STRIPE_INTEGRATION_REVIEW.md` - Findings report
5. `STRIPE_IMPLEMENTATION_CHECKLIST.md` - Verification checklist
6. `STRIPE_REFACTOR_SUMMARY.md` - This file

---

## 🔄 Payment Flow Changes

### Before (Problematic)
```
1. Host must connect Stripe → Blocks listing creation
2. Host completes onboarding immediately
3. Driver books → Requires active Stripe account
4. Payment → Automatic transfer via destination charge
```

### After (Airbnb-style)
```
1. Host can list without Stripe account ✅
2. Driver books → No Stripe requirement ✅
3. Payment succeeds → Earnings tracked ✅
4. Booking completes → Check for Stripe account
5. If no account → Prompt onboarding with earnings amount ✅
6. Once account active → Transfer accumulated earnings ✅
7. Future bookings → Auto-transfer if account active ✅
```

---

## 🎯 Key Improvements

1. **Reduced Friction:** Hosts can list immediately, no upfront KYC
2. **Better UX:** Onboarding only when money is waiting (stronger motivation)
3. **Compliance:** Still uses Stripe-hosted onboarding, just delayed
4. **Flexibility:** Supports both immediate and delayed payouts
5. **Tracking:** Complete audit trail of earnings and payouts

---

## ⚠️ Important Notes

### Compliance
- We are **NOT** removing required KYC steps
- Stripe's hosted onboarding still collects all required information
- We're just delaying the prompt until earnings exist
- Express accounts (individuals) have fewer requirements than business accounts

### Backward Compatibility
- Existing hosts with Stripe accounts continue to work
- Destination charges still work for active accounts
- Old `/connect/create` endpoint still exists (for manual onboarding)
- New `/connect/onboarding-link` endpoint is for delayed onboarding

### Data Migration
- Existing bookings without `host_net_amount` will need calculation
- Consider running a migration script to backfill earnings data
- `pending_earnings` starts at 0 for all users

---

## 🚀 Next Steps

### Immediate (Required)
1. Run database migration: `migrations/add_payout_tracking_fields.sql`
2. Deploy backend changes
3. Test in Stripe test mode
4. Verify webhook processing

### Short-term (Recommended)
1. Update frontend to use new `/onboarding-link` endpoint
2. Add earnings display on profile page
3. Show "Add payout details" banner when earnings exist
4. Remove Stripe mentions from listing creation flow

### Long-term (Optional)
1. Add payout history page
2. Add earnings dashboard for hosts
3. Implement payout scheduling (weekly/monthly)
4. Add email notifications for payouts

---

## 🧪 Testing Recommendations

1. **Test Account Creation:**
   - Verify only `transfers` capability is requested
   - Verify country defaults to `'CA'`
   - Verify no `business_type` is set

2. **Test Booking Flow:**
   - Create booking without Stripe account
   - Verify earnings are tracked
   - Verify no transfer is created

3. **Test Onboarding:**
   - Call `/onboarding-link` without earnings → Should error
   - Call `/onboarding-link` with earnings → Should create account
   - Complete onboarding → Verify payouts are processed

4. **Test Webhooks:**
   - Trigger `account.updated` webhook
   - Verify all status fields are updated
   - Verify pending payouts are processed

---

## 📊 Success Metrics

Monitor these after deployment:

- **Onboarding Conversion:** % of hosts with earnings who complete onboarding
- **Time to Onboarding:** Average time from first booking to payout setup
- **Payout Success Rate:** % of payouts processed successfully
- **Error Rate:** Failed transfers or webhook processing errors
- **Support Tickets:** Reduction in "can't list without Stripe" tickets

---

**Implementation Date:** 2025-01-27  
**Status:** Backend complete, ready for testing  
**Frontend Updates:** Pending

