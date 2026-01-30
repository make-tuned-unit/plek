# 📧 Transactional Emails Overview

## Current Status Summary

**Email Service:** Resend (fully integrated)  
**Total Email Templates:** 6  
**Actively Sending:** 4  
**Defined but Not Triggered:** 2  

---

## ✅ Active Transactional Emails

### 1. **Email Confirmation Email** ✅
**Status:** ✅ Fully implemented and active  
**Trigger:** User registration (`POST /api/auth/register`)  
**Location:** `backend/src/controllers/authController.ts:64`

**Details:**
- **Recipient:** New user
- **Subject:** "Confirm your plekk account"
- **Content:**
  - Welcome message with user's first name
  - Confirmation button/link
  - Link expiration warning (24 hours)
  - Fallback plain text link
- **Branding:** Full plekk branding with logo header and footer
- **Error Handling:** Throws error if send fails (critical for registration)

**Flow:**
```
User Registration → Generate Supabase confirmation link → Send via Resend → User clicks link → Email confirmed
```

---

### 2. **Booking Confirmation Email (Renter)** ✅
**Status:** ✅ Fully implemented and active  
**Triggers:**
1. Payment confirmation (`POST /api/payments/confirm`) - `backend/src/controllers/paymentController.ts:740`
2. Booking creation (`POST /api/bookings`) - `backend/src/controllers/bookingController.ts:348`
3. Stripe webhook (`payment_intent.succeeded`) - Not currently sending this email, but could be added

**Details:**
- **Recipient:** Renter (person booking the parking)
- **Subject:** "Booking Confirmed: [Property Title]"
- **Content:**
  - Booking details (property, address, dates, duration)
  - Vehicle information (if provided)
  - Payment summary:
    - Parking fee
    - plekk service fee (5%)
    - Security deposit
    - Total charged
  - Special requests (if any)
  - Link to view booking in profile
- **Branding:** Full plekk branding

**Flow:**
```
Payment Confirmed → Create Booking → Send confirmation email to renter
```

---

### 3. **Booking Notification Email (Host)** ✅
**Status:** ✅ Fully implemented and active  
**Triggers:**
1. Payment confirmation (`POST /api/payments/confirm`) - `backend/src/controllers/paymentController.ts:765`
2. Booking creation (`POST /api/bookings`) - `backend/src/controllers/bookingController.ts:361`

**Details:**
- **Recipient:** Host (property owner)
- **Subject:** "New Booking: [Property Title]"
- **Content:**
  - New booking notification
  - Renter information
  - Booking details (dates, duration, vehicle)
  - Estimated payout breakdown:
    - Booking subtotal
    - plekk host fee (5%)
    - Estimated payout amount
  - Special requests (if any)
  - Link to manage booking
- **Branding:** Full plekk branding

**Flow:**
```
Payment Confirmed → Create Booking → Send notification email to host
```

---

### 4. **Payment Receipt Email** ✅
**Status:** ✅ Fully implemented and active  
**Triggers:**
1. Payment confirmation (`POST /api/payments/confirm`) - `backend/src/controllers/paymentController.ts:790`
2. Stripe webhook handler (`payment_intent.succeeded`) - `backend/src/controllers/paymentController.ts:968`

**Details:**
- **Recipient:** Renter (person who paid)
- **Subject:** "Payment Receipt - [Property Title]"
- **Content:**
  - Payment confirmation
  - Property title
  - Amount paid
  - Payment date
  - Transaction ID (Stripe payment intent ID)
  - Booking ID
  - Link to view booking
- **Branding:** Full plekk branding

**Flow:**
```
Payment Succeeds → Send receipt email to renter
```

**Note:** This email is sent from both the payment confirmation endpoint AND the Stripe webhook handler, which could result in duplicate emails. Consider consolidating to only send from one location.

---

## ⚠️ Defined but Not Triggered

### 5. **Welcome Email** ⚠️
**Status:** ⚠️ Template exists but NOT being sent  
**Location:** `backend/src/services/emailService.ts:202`

**Details:**
- **Intended Recipient:** New user (after email confirmation)
- **Subject:** "Welcome to plekk!"
- **Content:**
  - Welcome message
  - Overview of platform features:
    - Find secure parking spaces
    - List driveway and earn money
    - Book parking by the hour
  - CTA button to "Find Parking"
  - Support contact information
- **Branding:** Full plekk branding

**Recommendation:**
- Should be sent after successful email confirmation
- Add call to `sendWelcomeEmail()` in `confirmEmail` controller after user is verified
- Location: `backend/src/controllers/authController.ts:347` (after setting `is_verified: true`)

**Implementation Needed:**
```typescript
// In confirmEmail controller, after user is verified:
await sendWelcomeEmail(user.email, user.first_name);
```

---

### 6. **Password Reset Email** ⚠️
**Status:** ⚠️ Template exists but NOT being sent  
**Location:** `backend/src/services/emailService.ts:486`

**Details:**
- **Intended Recipient:** User requesting password reset
- **Subject:** "Reset Your plekk Password"
- **Content:**
  - Password reset request confirmation
  - Reset button/link with token
  - Security warning (link expires in 1 hour)
  - Instructions if user didn't request reset
- **Branding:** Full plekk branding

**Recommendation:**
- Need to implement password reset endpoints:
  - `POST /api/auth/forgot-password` - Request reset (sends email)
  - `POST /api/auth/reset-password` - Reset with token
- Frontend already has link to `/auth/forgot-password` page (needs to be created)

**Implementation Needed:**
1. Create forgot password route in `backend/src/routes/auth.ts`
2. Create reset password route in `backend/src/routes/auth.ts`
3. Create forgot password controller in `backend/src/controllers/authController.ts`
4. Create reset password controller in `backend/src/controllers/authController.ts`
5. Create frontend page: `frontend/app/auth/forgot-password/page.tsx`
6. Create frontend page: `frontend/app/auth/reset-password/page.tsx`

---

## 📊 Email Service Configuration

### Resend Setup
- **Service:** Resend (`resend` package v6.4.1)
- **API Key:** `RESEND_API_KEY` environment variable
- **From Email:** `FROM_EMAIL` environment variable (defaults to `onboarding@resend.dev` for testing)
- **Frontend URL:** `FRONTEND_URL` environment variable (for confirmation, password reset, and other links in emails). **In production/staging this must be your public app URL** (e.g. `https://www.parkplekk.com`), not localhost, so links work for all users.

### Receiving emails (support@parkplekk.com, partners@parkplekk.com)

The site shows **support@parkplekk.com** and **partners@parkplekk.com** for contact. To actually receive mail at those addresses, use **Resend Inbound**:

1. **Resend Dashboard → Receiving (Inbound)**  
   - Add your domain **parkplekk.com** if it isn’t already verified for sending.  
   - Enable **Inbound** for that domain.

2. **DNS (MX records)**  
   - Resend will show the MX records to add at your DNS provider (e.g. `mx1.resend.com`, `mx2.resend.com`).  
   - Point mail for `parkplekk.com` (or the subdomain you use for inbound) to Resend so that `support@parkplekk.com`, `partners@parkplekk.com`, etc. are received by Resend.

3. **Forward to your inbox**  
   - The backend forwards all received emails to **INBOUND_FORWARD_TO** (default: `jesse.sharratt@gmail.com`).  
   - **Webhook URL:** `https://<your-backend-host>/api/webhooks/resend-inbound` (e.g. Railway backend URL).  
   - In Resend → **Webhooks** → Add Webhook: URL = that endpoint, event = `email.received`. Copy the **Signing secret** and set **RESEND_WEBHOOK_SECRET** in the backend env.  
   - Set **INBOUND_FORWARD_TO** and **RESEND_WEBHOOK_SECRET** in the backend (e.g. Railway).

4. **Replying from Gmail**  
   - When you reply from Gmail, the reply is sent **from your Gmail address** (e.g. jesse.sharratt@gmail.com), so the customer sees that.  
   - To have replies show as **support@parkplekk.com**, use Gmail **Settings → Accounts → Send mail as** and add `support@parkplekk.com` (you’ll need to use Resend SMTP or your domain’s SMTP for “Send mail as” verification).

Docs: [Resend – Receiving emails](https://resend.com/docs/dashboard/receiving/introduction).

### Current Configuration Notes
⚠️ **Important for Staging/Production:**
- Currently using `onboarding@resend.dev` (test mode) - can only send to verified email
- For staging/production, need to:
  1. Verify a domain at https://resend.com/domains
  2. Set `FROM_EMAIL` to use verified domain (e.g., `noreply@yourdomain.com`)

### Email Branding
All emails include:
- **Header:** plekk logo and title
- **Colors:** Brand colors (accent: #3dbb85, primary: #242f3f)
- **Footer:** 
  - Company tagline
  - Location (Halifax, Nova Scotia, Canada)
  - Links to visit plekk and contact support

---

## 🔄 Email Flow Diagrams

### Registration Flow
```
User Registers
    ↓
Send Email Confirmation Email ✅
    ↓
User Clicks Confirmation Link
    ↓
Email Verified
    ↓
[Missing: Send Welcome Email] ⚠️
```

### Booking Flow
```
User Books & Pays
    ↓
Payment Confirmed
    ↓
Create Booking
    ↓
Send Booking Confirmation (Renter) ✅
Send Booking Notification (Host) ✅
Send Payment Receipt (Renter) ✅
```

### Password Reset Flow (Not Implemented)
```
User Requests Password Reset
    ↓
[Missing: Send Password Reset Email] ⚠️
    ↓
User Clicks Reset Link
    ↓
[Missing: Reset Password Endpoint] ⚠️
```

---

## 🧪 Testing Checklist for Staging

### Email Delivery Testing
- [ ] **Email Confirmation**
  - [ ] Register new user
  - [ ] Verify email received
  - [ ] Verify confirmation link works
  - [ ] Verify email branding displays correctly

- [ ] **Booking Emails**
  - [ ] Create a booking with payment
  - [ ] Verify renter receives booking confirmation
  - [ ] Verify host receives booking notification
  - [ ] Verify renter receives payment receipt
  - [ ] Check for duplicate payment receipts (webhook vs endpoint)

- [ ] **Welcome Email** (after implementation)
  - [ ] Confirm email
  - [ ] Verify welcome email received

- [ ] **Password Reset** (after implementation)
  - [ ] Request password reset
  - [ ] Verify reset email received
  - [ ] Verify reset link works

### Email Content Testing
- [ ] All emails display correctly in:
  - [ ] Gmail (desktop)
  - [ ] Gmail (mobile)
  - [ ] Outlook
  - [ ] Apple Mail
  - [ ] Other common email clients

- [ ] All links in emails work correctly
- [ ] All images (logo) load correctly
- [ ] Email formatting looks good on mobile

### Resend Configuration for Staging
- [ ] Verify domain in Resend dashboard
- [ ] Set `FROM_EMAIL` to verified domain email
- [ ] Test sending to various email providers
- [ ] Monitor Resend dashboard for delivery rates
- [ ] Set up bounce/complaint handling

---

## 🚀 Recommendations for Staging Setup

### 1. **Complete Missing Email Implementations**
- [ ] Implement welcome email trigger
- [ ] Implement password reset flow

### 2. **Fix Potential Duplicate Emails**
- [ ] Review payment receipt email - currently sent from both:
  - Payment confirmation endpoint
  - Stripe webhook handler
- [ ] Decide on single source of truth (recommend webhook only)

### 3. **Resend Domain Setup**
- [ ] Verify domain for staging environment
- [ ] Set up `FROM_EMAIL` for staging
- [ ] Test email delivery to various providers
- [ ] Set up SPF/DKIM records (Resend provides instructions)

### 4. **Email Monitoring**
- [ ] Set up Resend webhook for email events (bounces, complaints)
- [ ] Monitor email delivery rates
- [ ] Set up alerts for high bounce rates

### 5. **Error Handling**
- [ ] Review email error handling (currently some emails don't throw errors)
- [ ] Consider email queue for reliability
- [ ] Add retry logic for failed sends

---

## 📝 Email Template Locations

All email templates are in: `backend/src/services/emailService.ts`

**Functions:**
1. `sendEmailConfirmationEmail()` - Line 113
2. `sendWelcomeEmail()` - Line 202
3. `sendBookingConfirmationEmail()` - Line 256
4. `sendBookingNotificationEmail()` - Line 345
5. `sendPaymentReceiptEmail()` - Line 428
6. `sendPasswordResetEmail()` - Line 486

---

## 🔗 Related Files

- **Email Service:** `backend/src/services/emailService.ts`
- **Auth Controller:** `backend/src/controllers/authController.ts`
- **Booking Controller:** `backend/src/controllers/bookingController.ts`
- **Payment Controller:** `backend/src/controllers/paymentController.ts`
- **Auth Routes:** `backend/src/routes/auth.ts`
- **Environment Config:** `env.example`

---

**Last Updated:** $(date)  
**Next Steps:** Implement welcome email and password reset flow before staging deployment




