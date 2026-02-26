# Nova Scotia–only beta: integration plan

Analysis of how to integrate the prompt’s four areas into the Plek codebase with minimal refactors, config-driven behaviour, and clear touchpoints.

---

## 1. Global beta banner (above nav)

**Where it goes**
- **Single place:** `frontend/app/layout.tsx`. The app has one root layout; `<Navigation />` is rendered there and wraps all routes (including auth). No separate auth layout that omits nav.
- Add a `<BetaBanner />` component **above** `<Navigation />` inside `<Providers>`.

**Implementation**
- New component: `frontend/components/BetaBanner.tsx`.
  - Copy: “We’re in beta — please send feedback to [support@parkplekk.com](mailto:support@parkplekk.com)”.
  - Full width, subtle background (e.g. `bg-accent-600` or neutral), small/medium text, responsive padding so it doesn’t cause layout jump on mobile.
- In `layout.tsx`: render `<BetaBanner />` then `<Navigation />` (order matters so banner is above nav).

**Edge cases**
- If you later add a layout that does **not** render the root layout’s children (e.g. a full-screen auth layout with no nav), you’d add the same banner at the top of that layout. Current codebase does not have that.

**Files to add/change**
- Add: `frontend/components/BetaBanner.tsx`
- Edit: `frontend/app/layout.tsx` (one line: import + component above `<Navigation />`)

---

## 2. Limit signup to Nova Scotia (beta gating)

**Current state**
- **Frontend:** `frontend/app/auth/signup/page.tsx` — form has firstName, lastName, email, phone, isHost, password, confirmPassword, acceptTerms. No province or postal code.
- **API:** `POST /api/auth/register` in `backend/src/controllers/authController.ts`; body: email, password, firstName, lastName, phone, isHost. No province.
- **Service:** `backend/src/services/supabaseService.ts` — `registerUser(CreateUserData)`; `CreateUserData` has no province. Profile insert does not set `state`.
- **DB:** `users` has `state`, `zip_code` (Supabase schema in `scripts/sql/supabase_database_setup.sql`).

**Implementation**

**Config (single source of truth)**
- Add to backend env (and document in `env.example`):
  - `BETA_REGION_ENABLED=true` (or omit/false to disable gating)
  - `BETA_REGION_PROVINCE=NS`
- Add a small backend config module (e.g. `backend/src/config/beta.ts` or in existing constants) that reads these so you don’t scatter env reads.

**Server-side (mandatory)**
- In `authController.register`:
  - Read `province` and optionally `postalCode` from `req.body`.
  - If `BETA_REGION_ENABLED`:
    - Require `province === BETA_REGION_PROVINCE` (e.g. `'NS'`). If not, return 400: “Plekk is in private beta in Nova Scotia only right now.”
    - If `province` is missing but `postalCode` is provided: validate that postal code matches NS (Canadian NS postal codes start with `B`). If it doesn’t, reject with the same message. If it does, treat as NS.
  - Pass `province` (and optionally postalCode) into `SupabaseAuthService.registerUser`.
- In `SupabaseAuthService.registerUser`:
  - Extend `CreateUserData` with `province?: string` and optionally `postal_code?: string`.
  - On insert into `users`, set `state: userData.province || null` and `zip_code: userData.postal_code || null` (so profile has province from signup).

**Client-side**
- Signup form:
  - Add **province**: dropdown (Canadian provinces), default “Nova Scotia” and/or restrict to only NS for beta (simplest: dropdown with only “Nova Scotia” or a single hidden field `province: 'NS'`).
  - Optional: add **postal code**; if you add it, validate format and optionally that it starts with `B` when province is NS.
- Schema: extend `signUpSchema` with `province: z.enum(['NS'])` (or `z.string().min(1)` and validate in submit).
- `apiService.register`: add `province` (and optionally `postalCode`) to the payload.
- `AuthContext.signup`: add parameter `province` (and optionally `postalCode`) and pass through to `apiService.register`.
- On 400 with the beta message, show it in the UI (toast or inline error). No need for a separate “waitlist” unless you already have one; prompt says “otherwise just show the message and stop.”

**Postal code validation (NS)**
- Canadian NS postal codes: pattern `B\d[A-Z]\s?\d[A-Z]\d` (B + digit + letter + space + digit + letter + digit). Normalize (e.g. strip space, uppercase) and check first character is `B` for NS. Backend helper in the same config/beta module keeps logic in one place.

**Files to add/change**
- Add: `backend/src/config/beta.ts` (or `constants.ts`) — `BETA_REGION_ENABLED`, `BETA_REGION_PROVINCE`, `isAllowedProvince(province, postalCode?)`, NS postal regex.
- Edit: `backend/src/controllers/authController.ts` — read province/postalCode, call `isAllowedProvince`, return 400 with message if not allowed; pass province/postalCode to service.
- Edit: `backend/src/services/supabaseService.ts` — extend `CreateUserData`, set `state` and optionally `zip_code` on insert.
- Edit: `frontend/app/auth/signup/page.tsx` — add province (and optionally postal code) to form and schema, pass to signup, show API error message.
- Edit: `frontend/services/api.ts` — add `province` (and optional `postalCode`) to `register` body.
- Edit: `frontend/contexts/AuthContext.tsx` — add `province` (and optional `postalCode`) to `signup` and pass to API.
- Edit: `env.example` — document `BETA_REGION_ENABLED`, `BETA_REGION_PROVINCE`.

**Edge cases**
- Existing users: no change; only registration is gated.
- Google/other OAuth signup: if you have one, you’ll need to require province (and enforce NS) in that flow too (e.g. after OAuth callback, before creating/linking profile). Not in current flow described in the prompt.

---

## 3. Nova Scotia “tax reserve” fee (15%, like a service fee)

**Context**
- Property has `state` (e.g. `'NS'`). Booking is for a property, so “Nova Scotia transaction” = property in NS.
- Tax reserve: 15% of the **same base as the service fee** (subtotal / base amount), applied only when property is in NS. Shown as “Tax reserve (NS)”, not as HST.

**Current pricing flow**
- **Booking creation:** `backend/src/controllers/bookingController.ts` — `calculateBookingPrice(property, start, end)` returns baseAmount, totalAmount, bookerServiceFee, hostServiceFee. Booking row: `total_amount`, `service_fee` (booker portion). No tax reserve.
- **Payment intent:** `backend/src/controllers/paymentController.ts` — `calculateBookingPriceForProperty(property, start, end)` duplicates the same math; result drives Stripe amount and metadata. Booking is created in payment webhook/confirm flow with `total_amount`, `service_fee`.
- **Frontend:** `frontend/components/BookingModal.tsx` — local price breakdown (subtotal, bookerServiceFee, hostServiceFee, total). No tax reserve; no `property.state` in breakdown yet.

**DB change**
- Add column to `bookings`: `tax_reserve DECIMAL(8,2) DEFAULT 0` (or similar). Migration: `scripts/sql/add_booking_tax_reserve.sql` + apply to Supabase. Persist the computed tax reserve at booking/payment time so historical bookings don’t change if rate changes.

**Shared pricing logic (avoid duplication)**
- Add a single module used by both booking and payment controllers, e.g. `backend/src/lib/pricing.ts` (or `shared` if you prefer):
  - Constants: `NS_TAX_RESERVE_RATE = 0.15` (or from env `NS_TAX_RESERVE_RATE=0.15`).
  - `computeTaxReserve(amountBase: number, province: string | null | undefined): number` — returns 0 if province is not NS (or not in a list from config), otherwise `round(amountBase * NS_TAX_RESERVE_RATE, 2)` using the same rounding as existing fees (round to 2 decimals, e.g. `Math.round(x * 100) / 100`).
  - Optionally: one function that returns `{ baseAmount, bookerServiceFee, hostServiceFee, taxReserve, totalAmount }` so both controllers use the same contract. That keeps “totalAmount = base + bookerServiceFee + taxReserve” in one place.
- Use **property.state** (normalized to uppercase) to decide if tax reserve applies. Config: e.g. `TAX_RESERVE_PROVINCES=NS` or derive from same `BETA_REGION_PROVINCE` if it’s always the same.

**Where to apply**
- **bookingController:** When creating a booking, after computing base + service fees, call `computeTaxReserve(baseAmount, property.state)`. Add `taxReserve` to `totalAmount`; persist `tax_reserve` and updated `total_amount` on the booking row. Include taxReserve in any email breakdown if you show fees there.
- **paymentController:** In `createPaymentIntent`, after `calculateBookingPriceForProperty`, get `taxReserve = computeTaxReserve(baseAmount, property.state)`. Add to `totalAmount` and to Stripe `amount`. Put `tax_reserve` in metadata so webhook/confirm can persist it. When creating/updating the booking in the payment flow, set `tax_reserve` and use the same total (including tax reserve).
- **BookingModal (frontend):** In the price breakdown effect, if `property.state === 'NS'` (or from a small constant), add a line: “Tax reserve (NS): $X” and add X to total. Use the same rate (0.15) and same base (subtotal) as backend so UI matches. Prefer a shared constant (e.g. `NS_TAX_RESERVE_RATE`) in frontend config or from API if you ever need to change it without a deploy.

**Emails / receipts**
- Wherever you show a price breakdown (confirmation email, receipt, etc.), if `tax_reserve > 0`, add a line “Tax reserve (NS): $X”. Use the stored `booking.tax_reserve` when available so it matches what was charged.

**Files to add/change**
- Add: `backend/src/lib/pricing.ts` — `NS_TAX_RESERVE_RATE`, `computeTaxReserve(base, province)`, and optionally a single `calculateBookingPricing(property, start, end)` that returns all amounts including tax reserve.
- Edit: `backend/src/controllers/bookingController.ts` — use shared pricing; add tax reserve to total; persist `tax_reserve`; include in email data if breakdown is sent.
- Edit: `backend/src/controllers/paymentController.ts` — use same pricing + tax reserve; include in PaymentIntent amount and metadata; when creating/updating booking, set `tax_reserve`.
- Edit: `frontend/components/BookingModal.tsx` — add tax reserve line when `property.state === 'NS'`, same base and rate; add to total.
- Add: `scripts/sql/add_booking_tax_reserve.sql` — `ALTER TABLE bookings ADD COLUMN tax_reserve DECIMAL(8,2) DEFAULT 0;`
- Edit: email templates / booking email data in `backend/src/services/emailService.ts` (and any job that sends booking details) — add tax reserve line when present.
- Edit: `env.example` — document `NS_TAX_RESERVE_RATE=0.15` if you use env.

**Edge cases**
- Property in another province: `tax_reserve = 0`, no line item, total unchanged.
- Rounding: use the same 2-decimal rounding as existing fees everywhere (backend and frontend).
- Existing bookings: migration default 0; no backfill needed.

---

## 4. Tests and safety

**Current state**
- No `*.test.ts` / `vitest.config` / Jest in the repo. So “add unit tests” implies introducing a test setup.

**Recommendation**
- Add a minimal backend test setup (e.g. Vitest) in `backend/`:
  - Unit tests for:
    - **Signup gating:** `isAllowedProvince('ON')` → false, `isAllowedProvince('NS')` → true; with postal only, `B1A 1A1` → allowed, `M5V 1A1` → rejected.
    - **Tax reserve:** `computeTaxReserve(100, 'NS')` → 15; `computeTaxReserve(100, 'ON')` → 0; rounding (e.g. 10.33 * 0.15) matches 2 decimals.
  - No big refactors: test the small modules (beta config and pricing lib) with clear inputs/outputs.
- E2E: only if you already have Playwright/Cypress; one test that submits signup with province “ON” and sees the beta error message. Otherwise skip or add in a follow-up.

**Safety**
- Feature-flag signup gating with `BETA_REGION_ENABLED` so you can turn it off without code change.
- Tax reserve behind a single rate and province check; no change to non-NS bookings.
- Migration is additive (new column, default 0).

---

## 5. Deliverables checklist (after implementation)

When done, you should be able to list:

- **Files changed:** (list from sections 1–3)
- **Summary:** Banner above nav; NS-only signup with server-side guard and optional postal validation; tax reserve 15% for NS property bookings, persisted and shown in UI/emails; tests for gating, postal, and tax reserve.
- **Config / env:** `BETA_REGION_ENABLED`, `BETA_REGION_PROVINCE=NS`, optionally `NS_TAX_RESERVE_RATE=0.15`.
- **Edge cases:** Existing users unaffected; non-NS signups rejected; non-NS bookings unchanged; rounding consistent; tax reserve only for NS property.

---

## Order of implementation

1. **Config and banner** — config module, env.example, BetaBanner + layout. Quick win, no DB.
2. **Signup gating** — backend guard + frontend form + API/context. No new tables.
3. **Tax reserve** — migration, pricing module, then booking + payment controllers, then frontend breakdown and emails.
4. **Tests** — after pricing and beta modules exist, add Vitest and the unit tests above.

This keeps each change small and reviewable.
