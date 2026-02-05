# Host Payouts & Why You Might See $0

## How it’s set up

- **Stripe Connect** is used so hosts get paid automatically.
- When a **guest pays** for a booking:
  - The **full payment** is charged to the guest.
  - **Plekk** keeps the **service fee** (e.g. 5% from guest + 5% from host share = application fee).
  - The **host’s share** (booking amount minus host service fee) is **sent to the host’s Stripe Connect account** via a **destination charge** (automatic transfer when the payment is captured).

So: **host gets their payout**, and **Plekk keeps only the service fee** in the platform Stripe account. No extra step is needed for “splitting” — Stripe does it at payment time.

---

## Why a host might see $0 in their connected account

1. **Payout setup wasn’t “active” when the payment was made**  
   We only send money to the host’s connected account if, **at the time we create the payment**:
   - The host has a **Stripe Connect account** (`stripe_account_id` in the DB), and  
   - That account is **active** (`stripe_account_status === 'active'`), i.e. onboarding is complete and Stripe has enabled payouts.

   If the host hadn’t finished onboarding yet, or their status was still `pending`, we **don’t** set a destination on the charge. Then the **entire payment** goes to the **Plekk platform** Stripe account, and **nothing** is transferred to the host’s connected account — so the host sees **$0** and “No payouts” for that payment.

2. **No (completed) payments yet**  
   If there haven’t been any successful charges for that host’s listings, their connected account will also show $0 and no payouts.

3. **Account status not updated in our DB**  
   We set `stripe_account_status` to `active` when:
   - The host visits **Profile → Payout account** and we call the Connect status API, or  
   - Stripe sends an `account.updated` webhook and we process it.

   If the webhook failed or the host never hit the profile page after completing Stripe onboarding, our DB might still say `pending`, so we’d keep sending new payments to the platform instead of the host.

---

## What to do so the host gets payouts

1. **Complete Stripe Connect onboarding**  
   - In the app: **Profile → Payout account**.  
   - Add payout details (e.g. bank account) and complete any verification Stripe asks for.

2. **Make sure our app shows “active”**  
   - After finishing Stripe’s flow, either:  
     - Return to **Profile** (we refresh status from Stripe and update the DB), or  
     - Ensure the **Stripe webhook** `account.updated` is configured and working so we can set `stripe_account_status = 'active'` when Stripe enables the account.

3. **Future bookings**  
   Once the connected account is **active** in our system, **all new payments** for that host’s listings will use a destination charge and the host’s share will go to their connected account and show up in their Stripe Express dashboard (and then in their bank per Stripe’s payout schedule).

4. **Past payments that already went to the platform**  
   If a payment was taken **before** the host’s Connect was active, that money is in the **platform** Stripe account, not the host’s. There is no automatic “retroactive transfer” in the current implementation. Handling that would require a separate process (e.g. manual transfer, or a “payout to host” feature that creates a Transfer to the host’s connected account for that booking).

---

## Platform (Plekk) payouts and thresholds

- **Plekk’s Stripe account** only receives the **application fee** (service fee) on each payment. The rest is sent to the host via the destination charge.
- To avoid getting many tiny payouts (e.g. a few cents at a time), configure **Stripe Dashboard**:
  - **Settings → Payouts** (for the **platform** account, not the connected accounts).
  - You can set a **minimum payout amount** and/or a **payout schedule** (e.g. weekly, or “manual”) so payouts only happen when the balance meets your threshold.

Host connected accounts have their **own** payout schedule in Stripe (per connected account); we don’t control that in code.

---

## Quick checklist for “I’m a host and I see $0”

- [ ] I completed **Stripe Connect onboarding** (bank details, any verification).
- [ ] In the app, **Profile → Payout account** shows **“Stripe Account Connected”** (or equivalent “active” state), not “Pending” or “Complete verification”.
- [ ] At least one **successful payment** has been made for a booking on my listing **after** my Connect was active.
- [ ] If I completed onboarding **after** a payment was already made, that earlier payment went to the platform; only **new** payments will go to my connected account.

If all of the above are true and the host still sees $0, check backend logs for `[Stripe] Payment intent will go to platform only` vs `Destination charge: host will receive payout` for the relevant booking to confirm whether the payment was created with or without a destination.
