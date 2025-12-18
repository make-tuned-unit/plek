# Verification System - Implementation Plan (Revised)

## Overview

Implement a multi-layered verification system for hosts and properties, with badges awarded after verification completion or Stripe payout setup. Yearly re-verification for dormant accounts.

---

## Verification Strategy

### For Hosts

1. **Email Verification** (Automated)
   - Already exists via Supabase Auth
   - Auto-verified when email confirmed
   - Tracked in `users.email_verified_at`

2. **Identity Verification** (Manual Admin Review)
   - Government ID upload (driver's license, passport)
   - Stored securely in `host_profiles.verification_documents`
   - Admin reviews and approves/rejects
   - Tracked in `users.identity_verified_at`

3. **Stripe Payout Setup** (Automated)
   - When host completes Stripe Connect onboarding
   - Tracked via `users.payouts_enabled` and `users.details_submitted`
   - Considered a trust indicator

### For Properties

1. **Photo Verification** (Automated + Manual)
   - Minimum 3 photos required
   - Admin reviews for quality/authenticity
   - Tracked in `properties.photos_verified_at`

2. **Location Verification** (Automated)
   - Verify coordinates match address
   - Check if location is valid parking space
   - Tracked in `properties.location_verified_at`

### Verification Badge Criteria

**Host gets "Verified" badge when:**
- Email verified AND
- Identity verified AND
- (Property photos verified OR Stripe payout setup completed)

**Property gets "Verified" badge when:**
- Photos verified AND
- Location verified AND
- Host is verified

### Yearly Re-verification

- Check accounts that haven't been active in 12+ months
- "Active" = booking created/received in last 12 months
- Send notification to re-verify
- Mark verification as expired if not re-verified within 30 days
- Badge removed until re-verified

---

## Database Schema

```sql
-- Add verification status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
    CREATE TYPE verification_status AS ENUM (
      'unverified', 
      'pending', 
      'verified', 
      'rejected',
      'expired'
    );
  END IF;
END $$;

-- Add verification type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_type') THEN
    CREATE TYPE verification_type AS ENUM (
      'email',
      'identity',
      'property_photos',
      'property_location',
      'stripe_payout'
    );
  END IF;
END $$;

-- Update users table
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS verification_status verification_status DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS identity_verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update properties table
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS verification_status verification_status DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS photos_verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS location_verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMP WITH TIME ZONE;

-- Create verification records table
CREATE TABLE IF NOT EXISTS public.verifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  verification_type verification_type NOT NULL,
  status verification_status DEFAULT 'pending',
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID REFERENCES public.users(id), -- Admin who verified
  rejection_reason TEXT,
  documents JSONB, -- Store verification documents/evidence
  metadata JSONB, -- Additional verification data
  expires_at TIMESTAMP WITH TIME ZONE, -- For yearly re-verification
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_verifications_user_id ON public.verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_verifications_property_id ON public.verifications(property_id);
CREATE INDEX IF NOT EXISTS idx_verifications_status ON public.verifications(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_verifications_expires_at ON public.verifications(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_verification_status ON public.users(verification_status);
CREATE INDEX IF NOT EXISTS idx_users_last_activity ON public.users(last_activity_at);
```

---

## Implementation Phases

### Phase 1: Database & Core Backend (Week 1)

1. **Database Migration**
   - Create verification tables and enums
   - Add verification columns to users/properties
   - Add indexes

2. **Verification Endpoints**
   - `POST /api/verification/submit-identity` - Upload ID documents
   - `GET /api/verification/status` - Get verification status
   - `GET /api/verification/history` - Get verification history

3. **Admin Endpoints**
   - `GET /api/admin/verifications/pending` - List pending verifications
   - `POST /api/admin/verifications/:id/approve` - Approve verification
   - `POST /api/admin/verifications/:id/reject` - Reject verification

4. **Badge Logic**
   - Function to check if host should have badge
   - Function to check if property should have badge
   - Auto-update badge status when criteria met

### Phase 2: Automated Verification (Week 1-2)

1. **Email Verification**
   - Hook into Supabase Auth email confirmation
   - Update `email_verified_at` when email confirmed
   - Trigger badge check

2. **Location Verification**
   - Use Google Maps Geocoding API
   - Verify coordinates match address
   - Auto-verify if match is close enough
   - Flag for manual review if mismatch

3. **Photo Verification**
   - Check minimum 3 photos uploaded
   - Validate photo format/size
   - Auto-approve if meets criteria, else flag for admin

4. **Stripe Payout Integration**
   - Hook into Stripe webhook `account.updated`
   - When `payouts_enabled = true`, mark as verified
   - Trigger badge check

### Phase 3: Frontend (Week 2)

1. **Verification Status Display**
   - Show verification status on profile page
   - Show what's verified vs pending
   - Show "Verified" badge when earned

2. **Identity Submission Form**
   - Upload ID documents
   - Show submission status
   - Show admin feedback if rejected

3. **Property Verification Display**
   - Show verification status on property listings
   - Show "Verified" badge on search results
   - Filter by verified properties

4. **Admin Dashboard**
   - List pending verifications
   - Review identity documents
   - Approve/reject with reason

### Phase 4: Yearly Re-verification (Week 3)

1. **Activity Tracking**
   - Update `last_activity_at` when:
     - Booking created/received
     - Property created/updated
     - Login (optional, less important)

2. **Re-verification Check**
   - Scheduled job (daily cron)
   - Find accounts with `last_activity_at` > 12 months ago
   - Check if verification expires soon (within 30 days)
   - Send notification to re-verify

3. **Expiration Logic**
   - Mark verification as expired if not re-verified
   - Remove badge
   - Require re-submission

4. **Re-verification Flow**
   - Simplified process (skip already-verified items)
   - Quick re-submission of identity if expired
   - Auto-approve if previous verification was recent

---

## Badge Assignment Logic

### Host Badge Criteria

```typescript
function shouldHaveHostBadge(user: User, properties: Property[]): boolean {
  // Must have email verified
  if (!user.email_verified_at) return false;
  
  // Must have identity verified
  if (!user.identity_verified_at) return false;
  
  // Must have either:
  // 1. At least one property with photos verified, OR
  // 2. Stripe payout setup completed
  const hasVerifiedProperty = properties.some(p => p.photos_verified_at);
  const hasStripePayout = user.payouts_enabled && user.details_submitted;
  
  return hasVerifiedProperty || hasStripePayout;
}
```

### Property Badge Criteria

```typescript
function shouldHavePropertyBadge(property: Property, host: User): boolean {
  // Must have photos verified
  if (!property.photos_verified_at) return false;
  
  // Must have location verified
  if (!property.location_verified_at) return false;
  
  // Host must be verified
  if (host.verification_status !== 'verified') return false;
  
  return true;
}
```

---

## API Endpoints

### Public Endpoints

**Submit Identity Verification**
```
POST /api/verification/submit-identity
Body: {
  documentType: 'drivers_license' | 'passport' | 'other',
  frontImage: File,
  backImage?: File,
  notes?: string
}
Response: {
  success: true,
  data: {
    verificationId: string,
    status: 'pending',
    message: 'Verification submitted. Admin will review within 24-48 hours.'
  }
}
```

**Get Verification Status**
```
GET /api/verification/status
Response: {
  success: true,
  data: {
    host: {
      emailVerified: boolean,
      identityVerified: boolean,
      stripePayoutVerified: boolean,
      badgeEarned: boolean,
      verificationStatus: 'unverified' | 'pending' | 'verified' | 'expired'
    },
    properties: [{
      id: string,
      photosVerified: boolean,
      locationVerified: boolean,
      badgeEarned: boolean
    }]
  }
}
```

### Admin Endpoints

**List Pending Verifications**
```
GET /api/admin/verifications/pending?type=identity&limit=50
Response: {
  success: true,
  data: {
    verifications: [{
      id: string,
      type: 'identity',
      user: { id, name, email },
      submittedAt: timestamp,
      documents: { frontImage, backImage },
      metadata: {}
    }]
  }
}
```

**Approve Verification**
```
POST /api/admin/verifications/:id/approve
Body: {
  notes?: string
}
Response: {
  success: true,
  data: {
    verificationId: string,
    status: 'verified',
    badgeUpdated: boolean
  }
}
```

**Reject Verification**
```
POST /api/admin/verifications/:id/reject
Body: {
  reason: string,
  notes?: string
}
Response: {
  success: true,
  data: {
    verificationId: string,
    status: 'rejected',
    rejectionReason: string
  }
}
```

---

## Yearly Re-verification Logic

### Scheduled Job (Daily)

```typescript
async function checkExpiringVerifications() {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  
  // Find users who:
  // 1. Haven't been active in 12+ months
  // 2. Have verified status
  // 3. Verification expires within 30 days (or already expired)
  const users = await supabase
    .from('users')
    .select('*')
    .eq('verification_status', 'verified')
    .lt('last_activity_at', oneYearAgo.toISOString())
    .or(`verification_expires_at.is.null,verification_expires_at.lt.${thirtyDaysFromNow.toISOString()}`);
  
  for (const user of users) {
    // Send notification
    await sendReVerificationNotification(user);
    
    // If already expired, mark as expired
    if (user.verification_expires_at && new Date(user.verification_expires_at) < new Date()) {
      await supabase
        .from('users')
        .update({ 
          verification_status: 'expired',
          verified_at: null 
        })
        .eq('id', user.id);
      
      // Remove badge from properties
      await supabase
        .from('properties')
        .update({ verification_status: 'expired' })
        .eq('host_id', user.id);
    }
  }
}
```

### Activity Tracking

Update `last_activity_at` when:
- Booking created (renter)
- Booking received (host)
- Property created/updated
- Login (optional, less critical)

---

## File Structure

```
backend/src/
  controllers/
    verificationController.ts    # Verification endpoints
    adminVerificationController.ts  # Admin verification endpoints
  services/
    verificationService.ts       # Badge logic, verification checks
    locationVerificationService.ts  # Google Maps geocoding
  jobs/
    reVerificationJob.ts        # Scheduled re-verification check
  middleware/
    activityTracker.ts          # Track user activity

frontend/
  app/
    profile/
      verification/             # Verification submission pages
        identity/page.tsx
    admin/
      verifications/            # Admin verification dashboard
        page.tsx
  components/
    VerificationBadge.tsx       # Badge component
    VerificationStatus.tsx      # Status display
```

---

## Success Metrics

- % of hosts who complete verification
- Average time to verification approval
- Verification approval rate
- Impact on booking conversion (verified vs unverified)
- Re-verification completion rate

---

## Next Steps

1. Create database migration
2. Implement core verification endpoints
3. Add badge logic
4. Integrate with Stripe webhook
5. Build frontend components
6. Add admin dashboard
7. Implement yearly re-verification

---

**Status:** Ready for Implementation  
**Priority:** High  
**Estimated Time:** 2-3 weeks

