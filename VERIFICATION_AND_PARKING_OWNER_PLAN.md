# Verification System & Parking Owner Flow - Implementation Plan

## Overview

This document outlines the plan for implementing:
1. **Verification System** - How to verify hosts and properties
2. **Parking Owner Flow** - Special flow for owners with multiple parking spaces

---

## Part 1: Verification System

### 1.1 Current State Analysis

**What exists:**
- `users.is_verified` (boolean, default false)
- `properties.is_verified` (boolean, default false)
- `properties.status` enum: 'pending_review', 'active', 'inactive', 'suspended', 'deleted'
- `host_profiles.verification_documents` (JSONB field, unused)

**What's missing:**
- No verification workflow/process
- No verification types or levels
- No admin interface for verification
- No automated verification checks
- No clear criteria for what "verified" means

### 1.2 Verification Strategy

#### Verification Types (Multi-layered approach)

**For Hosts:**
1. **Email Verification** (Automated)
   - Already exists via Supabase Auth
   - Auto-verified when email confirmed

2. **Phone Verification** (Automated)
   - SMS code verification
   - Use Twilio or similar service

3. **Identity Verification** (Manual Admin Review)
   - Government ID upload (driver's license, passport)
   - Stored securely in `host_profiles.verification_documents`
   - Admin reviews and approves/rejects

4. **Address Verification** (Automated + Manual)
   - Verify address matches property location
   - Can use Google Maps Geocoding API
   - For property ownership, may need manual review

**For Properties:**
1. **Photo Verification** (Automated + Manual)
   - Minimum 3 photos required
   - Admin reviews for quality/authenticity
   - AI could flag suspicious images

2. **Location Verification** (Automated)
   - Verify coordinates match address
   - Check if location is valid parking space
   - Flag if coordinates seem incorrect

3. **Property Ownership** (Manual Admin Review)
   - Proof of ownership (deed, lease, utility bill)
   - Admin verifies documents
   - Only for "verified" badge

#### Verification Levels

**Host Verification Levels:**
- `unverified` - No verification completed
- `email_verified` - Email confirmed
- `phone_verified` - Phone number verified
- `identity_verified` - ID verified by admin
- `fully_verified` - All checks passed (email + phone + identity)

**Property Verification Levels:**
- `unverified` - New listing, not reviewed
- `pending_review` - Submitted for review
- `photos_verified` - Photos approved
- `location_verified` - Location validated
- `fully_verified` - All checks passed (photos + location + ownership if provided)

### 1.3 Database Schema Changes

```sql
-- Add verification status enum
CREATE TYPE verification_status AS ENUM (
  'unverified', 
  'pending', 
  'verified', 
  'rejected',
  'expired'
);

-- Add verification type enum
CREATE TYPE verification_type AS ENUM (
  'email',
  'phone',
  'identity',
  'address',
  'property_photos',
  'property_location',
  'property_ownership'
);

-- Update users table
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS verification_status verification_status DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS identity_verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;

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
  expires_at TIMESTAMP WITH TIME ZONE, -- For time-sensitive verifications
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update properties table
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS verification_status verification_status DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS photos_verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS location_verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS ownership_verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;
```

### 1.4 Verification Workflow

#### Host Verification Flow

1. **Signup** → Email verification (automatic via Supabase)
2. **Become Host** → Prompt for phone verification
3. **List Property** → Prompt for identity verification (optional initially)
4. **After First Booking** → Require identity verification for payout
5. **Admin Review** → Admin reviews identity documents
6. **Approval** → Host gets "Verified" badge

#### Property Verification Flow

1. **Create Listing** → Status = 'pending_review'
2. **Upload Photos** → Minimum 3 photos required
3. **Location Check** → Automated geocoding verification
4. **Admin Review** → Admin reviews photos and location
5. **Approval** → Property gets "Verified" badge, status = 'active'
6. **Optional Ownership** → Host can submit ownership docs for extra trust

### 1.5 Implementation Steps

**Phase 1: Database & Backend**
1. Create database migration for verification tables
2. Add verification endpoints:
   - `POST /api/verification/submit-phone` - Submit phone for verification
   - `POST /api/verification/submit-identity` - Upload ID documents
   - `POST /api/verification/submit-property-ownership` - Upload ownership docs
   - `GET /api/verification/status` - Get verification status
3. Add admin endpoints:
   - `GET /api/admin/verifications/pending` - List pending verifications
   - `POST /api/admin/verifications/:id/approve` - Approve verification
   - `POST /api/admin/verifications/:id/reject` - Reject verification

**Phase 2: Automated Verification**
1. Integrate phone verification service (Twilio)
2. Add location verification using Google Maps Geocoding
3. Add photo validation (count, size, format)

**Phase 3: Frontend**
1. Add verification status to profile page
2. Create verification submission forms
3. Add "Verified" badges to UI
4. Create admin verification dashboard

**Phase 4: Trust Indicators**
1. Show verification badges on listings
2. Filter/search by verified hosts/properties
3. Higher ranking for verified listings

---

## Part 2: Parking Owner Flow

### 2.1 Use Case

**Scenario:** A parking lot owner wants to list 20 parking spaces at their location. They should be able to:
- List multiple spaces at once (bulk creation)
- Manage all spaces from one dashboard
- Set shared settings (address, pricing, availability)
- Track individual space availability
- See aggregate analytics

### 2.2 Design Decisions

#### Option A: New User Role
- Add `'parking_owner'` to `user_role` enum
- Separate flow from individual hosts
- Pros: Clear distinction, can have different features
- Cons: More complexity, code duplication

#### Option B: Host Type Flag (Recommended)
- Add `host_type` to `host_profiles`: 'individual' | 'parking_owner'
- Use existing host infrastructure
- Pros: Reuse existing code, simpler
- Cons: Need to handle both types in UI

**Recommendation: Option B** - Use a flag, not a separate role.

### 2.3 Database Schema Changes

```sql
-- Add host type to host_profiles
ALTER TABLE public.host_profiles
  ADD COLUMN IF NOT EXISTS host_type TEXT DEFAULT 'individual' CHECK (host_type IN ('individual', 'parking_owner'));

-- Create parking_lots table (for owners with multiple spaces)
CREATE TABLE IF NOT EXISTS public.parking_lots (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL, -- e.g., "Downtown Parking Lot"
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  country TEXT DEFAULT 'US',
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  total_spaces INTEGER NOT NULL,
  shared_pricing JSONB, -- Default pricing for all spaces
  shared_availability JSONB, -- Default availability schedule
  access_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add parking_lot_id to properties (for spaces that belong to a lot)
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS parking_lot_id UUID REFERENCES public.parking_lots(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS space_number TEXT; -- e.g., "A1", "B3", "1", "2"

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_properties_parking_lot_id ON public.properties(parking_lot_id);
CREATE INDEX IF NOT EXISTS idx_parking_lots_owner_id ON public.parking_lots(owner_id);
```

### 2.4 User Flow

#### Parking Owner Onboarding

1. **Sign Up** → Same as regular host
2. **Choose Host Type** → "I have multiple parking spaces" option
3. **Create Parking Lot** → Enter lot details:
   - Name (e.g., "Downtown Parking Lot")
   - Address (single address for all spaces)
   - Total number of spaces
   - Default pricing (can override per space)
   - Default availability schedule
4. **Bulk Create Spaces** → System creates N properties:
   - Each space gets auto-generated name: "Space 1", "Space 2", etc.
   - Can customize individual spaces later
   - All share same address, can have different pricing
5. **Manage Dashboard** → See all spaces, aggregate stats

#### Individual Space Management

- **Bulk Actions**: Enable/disable all, update pricing for all
- **Individual Overrides**: Custom pricing, availability per space
- **Space Numbering**: Auto-number or custom (A1, B2, etc.)
- **Availability**: Per-space or shared calendar

### 2.5 Implementation Steps

**Phase 1: Database & Backend**
1. Create database migration
2. Add `host_type` to host_profiles
3. Create `parking_lots` table
4. Add `parking_lot_id` to properties
5. Create parking lot endpoints:
   - `POST /api/parking-lots` - Create parking lot
   - `GET /api/parking-lots` - List user's parking lots
   - `POST /api/parking-lots/:id/spaces` - Bulk create spaces
   - `PUT /api/parking-lots/:id` - Update lot settings
   - `GET /api/parking-lots/:id/spaces` - List spaces in lot

**Phase 2: Bulk Operations**
1. Bulk space creation endpoint
2. Bulk pricing update
3. Bulk availability update
4. Aggregate analytics (total bookings, earnings across all spaces)

**Phase 3: Frontend - Parking Owner Dashboard**
1. "Create Parking Lot" flow
2. Bulk space creation UI
3. Parking lot management dashboard:
   - Overview of all spaces
   - Aggregate stats (total bookings, earnings)
   - Quick actions (enable/disable all)
4. Individual space management (override pricing, availability)

**Phase 4: Frontend - Space Listing**
1. Show parking lot name on space listings
2. Show space number (e.g., "Downtown Lot - Space A1")
3. Filter by parking lot
4. Show aggregate availability for lot

---

## Part 3: Combined Features

### 3.1 Verification for Parking Owners

Parking owners should have:
- **Business Verification** (instead of just identity)
  - Business license
  - Tax ID
  - Proof of lot ownership/lease
- **Bulk Verification** - Verify all spaces at once after lot verification
- **Trust Badge** - "Verified Parking Lot Owner"

### 3.2 UI/UX Considerations

**Verification Badges:**
- Individual Host: "✓ Verified Host"
- Parking Owner: "✓ Verified Parking Lot"
- Property: "✓ Verified Space"

**Search/Filter:**
- Filter by verified hosts only
- Filter by verified properties only
- Filter by parking lot vs individual spaces

**Trust Indicators:**
- Show verification badges prominently
- Higher ranking for verified listings
- "Verified" filter option in search

---

## Part 4: Implementation Priority

### Phase 1 (High Priority - Core Verification)
1. Database schema for verifications
2. Basic verification endpoints (submit, status)
3. Admin verification dashboard
4. Verification badges in UI
5. Phone verification integration

### Phase 2 (Medium Priority - Enhanced Verification)
1. Identity verification workflow
2. Property photo verification
3. Location verification
4. Trust indicators and filtering

### Phase 3 (Medium Priority - Parking Owner MVP)
1. Database schema for parking lots
2. Basic parking lot creation
3. Bulk space creation
4. Parking owner dashboard

### Phase 4 (Lower Priority - Advanced Features)
1. Property ownership verification
2. Bulk operations for parking owners
3. Advanced analytics for parking lots
4. Space numbering and management

---

## Part 5: Technical Considerations

### 5.1 Third-Party Services Needed

**Verification:**
- **Phone Verification**: Twilio Verify API (~$0.05 per verification)
- **Location Verification**: Google Maps Geocoding API (free tier available)
- **Document Storage**: Supabase Storage (for ID documents)
- **Image Analysis**: Optional - Google Vision API for photo verification

**Parking Owner:**
- No additional services needed (uses existing infrastructure)

### 5.2 Security Considerations

**Verification Documents:**
- Store in Supabase Storage with RLS
- Encrypt sensitive documents
- Admin-only access
- Auto-delete after verification (or after X days)

**Phone Verification:**
- Rate limiting (prevent abuse)
- Store phone numbers securely
- Comply with privacy regulations

### 5.3 Performance Considerations

**Bulk Operations:**
- Use database transactions for bulk space creation
- Batch updates for pricing/availability
- Cache verification status

**Verification Queries:**
- Index on verification status
- Efficient queries for admin dashboard

---

## Part 6: Success Metrics

### Verification System
- % of hosts who complete verification
- Average time to verification
- Verification approval rate
- Impact on booking conversion (verified vs unverified)

### Parking Owner Flow
- Number of parking lots created
- Average spaces per lot
- Booking rate for parking lot spaces vs individual
- Revenue from parking lot owners

---

## Questions to Answer Before Implementation

1. **Verification Requirements:**
   - Is identity verification required before first payout? (We already have Stripe KYC)
   - Should verification be optional or required?
   - What's the minimum verification level to show "Verified" badge?

2. **Parking Owner Features:**
   - Maximum spaces per lot? (to prevent abuse)
   - Can individual spaces have different pricing?
   - Should parking lots have different commission rates?

3. **Admin Workflow:**
   - How many admins will review verifications?
   - What's the SLA for verification review?
   - Should there be automated checks before admin review?

4. **Trust & Safety:**
   - What happens if verified host/property gets reported?
   - Should verification expire? (e.g., yearly re-verification)
   - How to handle verification fraud?

---

## Next Steps

1. **Review this plan** with team
2. **Answer questions** above
3. **Prioritize features** based on business needs
4. **Create detailed tickets** for each phase
5. **Start with Phase 1** (Core Verification)

---

**Document Version:** 1.0  
**Date:** 2025-01-27  
**Status:** Planning Phase - Awaiting Approval

