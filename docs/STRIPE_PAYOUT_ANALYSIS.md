# Stripe Payout Analysis: Why Platform Got Full Amount and Host Got Nothing

## What You Observed

- **You (platform/owner)** received a payout from Stripe for the **full cost** of the booking.
- **The host** (with a connected Stripe account) received **nothing**.

## Intended Flow

- **Guest** pays the full booking amount.
- **Platform** keeps only the **service fee** (e.g. 5% from guest + 5% from host = application fee) in the platform Stripe balance.
- **Host** receives their share (booking amount minus host service fee) **immediately** via a **destination charge** to their Stripe Connect account.

This is implemented using Stripe Connect **destination charges**: when creating the PaymentIntent we set `application_fee_amount` (your fee) and `transfer_data.destination` (host’s Connect account). Stripe then splits the charge at capture time.

---

## Root Cause

**The PaymentIntent for this booking was created without `transfer_data` and without `application_fee_amount`.** (We now require the host to have an active Connect account before any payment, so only destination charges are created and the platform never receives the host's share.)

When that happens, Stripe treats the charge as a normal platform charge: the **entire amount** goes to the platform account, and **nothing** is transferred to the host’s connected account. So you saw a full payout to the platform and the host saw $0.

In code, we only add `transfer_data` and `application_fee_amount` when the host is considered “ready” for payouts at **the moment we create the PaymentIntent**:

- Host has `stripe_account_id` in the DB, and  
- Host is “active”: either `stripe_account_status === 'active'` in the DB, or we call Stripe’s API (`ensureConnectStatusFromStripe`) and Stripe reports the account as ready (`details_submitted`, `charges_enabled`, `payouts_enabled`).

If **any** of these are false at payment-creation time, we create a **platform-only** charge (no destination, no application fee), and the full amount stays on the platform.

So the payout issue is **not** a webhook bug: the split is determined when the PaymentIntent is created, not when the webhook fires.

---

## Why “Host Has Connect” Might Have Been False at Payment Time

1. **Host had not finished Connect onboarding**  
   They had started (or you thought they had) but hadn’t completed Stripe’s flow (e.g. bank details, verification). So either there was no `stripe_account_id`, or Stripe had not yet set `charges_enabled` / `payouts_enabled`.

2. **DB status was stale**  
   The host completed onboarding in Stripe, but our `stripe_account_status` was never set to `'active'` because:
   - The `account.updated` webhook failed, wasn’t configured, or wasn’t received, or  
   - The host never visited Profile → Payout after completing onboarding (we also sync status when they hit that page).  
   We do call `ensureConnectStatusFromStripe` when the host has `stripe_account_id` but DB status isn’t `'active'`, so we can still use a destination charge if Stripe says the account is ready. If Stripe’s API returned that the account was **not** yet ready (e.g. still in verification), we would still create a platform-only charge.

3. **Host connected after this booking**  
   If the host completed Connect **after** this payment was created, that doesn’t change the existing PaymentIntent. That payment was already created as platform-only.

4. **Host relation or data missing**  
   In rare cases, the property’s host might not have been loaded correctly (e.g. relation returns null or wrong shape). Then we’d treat “no Connect” and create a platform-only charge.

---

## How to Confirm for This Booking

1. **Backend logs**  
   For the request that created the PaymentIntent for this booking, check for either:
   - `[Stripe] Payment intent will go to platform only (no transfer to host)` → confirms we did **not** add a destination.
   - `[Stripe] Destination charge: host will receive payout` → we did add a destination (so that log would not match the case where the host got nothing).

2. **Stripe Dashboard**  
   - Open the PaymentIntent (or the charge) for this booking.
   - Check whether it has **Transfer** and **Application fee**.
   - If there is no transfer and no application fee, the intent was created as platform-only.

3. **Database**  
   For the host user at the time of the booking:  
   - Did they have `stripe_account_id` set?  
   - What was `stripe_account_status`?  
   If status was `NULL` or `'pending'` and Stripe had not yet enabled the account, we would have created a platform-only charge.

---

## Changes Made in Code

1. **Block payment when host has Connect but isn’t active**  
   If the host has a `stripe_account_id` but after syncing with Stripe they are still not “active”, we now **reject** creating the PaymentIntent and return a clear error (e.g. “This host hasn’t completed payout setup. They need to finish Stripe Connect before accepting payments.”).  
   This prevents a guest from paying and the host receiving nothing when we know the host isn’t ready.

2. **Webhook: handle missing `booking_id`**  
   The webhook handler expected `metadata.booking_id` on `payment_intent.succeeded`. The booking is actually created in `confirmPayment` (after the client confirms), so the webhook often runs before `booking_id` exists. We now:
   - If `booking_id` is missing, try to resolve it from the `payments` table by `stripe_payment_id` (in case `confirmPayment` already ran).
   - Only then update the booking and insert the payment record (idempotent).  
   This makes the webhook reliable regardless of whether it runs before or after `confirmPayment`.

3. **Webhook: always acknowledge receipt**  
   We always respond with success to the webhook so Stripe doesn’t retry unnecessarily, even when we can’t find a booking (e.g. not yet created).

4. **Host object handling**  
   We normalize the host from the property so that whether the API returns a single object or an array, we use the correct host for `stripe_account_id` and status checks.

---

## What You Can Do for This Specific Payout

- **This booking:** The money is already in the **platform** Stripe account. There is no automatic “retroactive transfer” in the current implementation. To make the host whole you would need to:
  - Manually send the host’s share (e.g. booking amount minus host service fee) to their Connect account via Stripe Dashboard (Transfers), or  
  - Implement a one-off or support flow that creates a **Transfer** to the host’s `stripe_account_id` for that amount (and optionally record it so you don’t double-pay).

- **Future bookings:**  
  - Ensure the host has completed Stripe Connect and that our DB (or Stripe) shows them as active before accepting new payments.  
  - With the new logic, we **block** creating a payment when the host has started Connect but isn’t active, so the “full amount to platform, $0 to host” case should not repeat for new payments.

---

## Webhook Setup Checklist

To keep Connect and payment state in sync, ensure:

- [ ] **Production webhook** in Stripe Dashboard points to `https://your-api-domain.com/api/payments/webhook`.
- [ ] **Events** include: `payment_intent.succeeded`, `payment_intent.payment_failed`, `account.updated`, and optionally `transfer.created`.
- [ ] **Signing secret** is set in backend env as `STRIPE_WEBHOOK_SECRET` (use the one for the correct mode: test vs live).
- [ ] **Raw body** for the webhook route is preserved (your app already uses `express.raw({ type: 'application/json' })` for this route).
- [ ] **Retries:** Stripe will retry failed webhooks; our handler now resolves `booking_id` when possible and always acknowledges receipt, so retries are safe and idempotent.

---

## References

- `docs/HOST_PAYOUTS_AND_STRIPE.md` – Why a host might see $0 and what to do.
- `docs/STRIPE_PAYMENT_FLOW.md` – High-level payment and Connect flow.
- `docs/STRIPE_WEBHOOK_SETUP.md` – How to configure and test webhooks.
- Backend: `backend/src/controllers/paymentController.ts` – `createPaymentIntent`, `handleWebhook`, `handlePaymentSuccess`, `ensureConnectStatusFromStripe`.
