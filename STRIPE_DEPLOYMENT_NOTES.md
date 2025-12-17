# Stripe Refactor - Deployment Notes

## Files Changed for Stripe Refactor

### Backend Changes
- `backend/src/controllers/paymentController.ts` - Main payment logic updates
- `backend/src/routes/payments.ts` - Added new onboarding-link route
- `migrations/add_payout_tracking_fields.sql` - Database migration (NEW FILE)

### Frontend Changes
- `frontend/app/profile/page.tsx` - Updated to use delayed onboarding
- `frontend/services/api.ts` - Added createOnboardingLink method

### Documentation (NEW FILES)
- `STRIPE_INTEGRATION_REVIEW.md` - Detailed findings
- `STRIPE_IMPLEMENTATION_CHECKLIST.md` - Verification checklist
- `STRIPE_REFACTOR_SUMMARY.md` - Implementation summary

---

## Deployment Steps

### 1. Commit and Push Changes
```bash
git add backend/src/controllers/paymentController.ts
git add backend/src/routes/payments.ts
git add frontend/app/profile/page.tsx
git add frontend/services/api.ts
git add migrations/add_payout_tracking_fields.sql
git add STRIPE_*.md

git commit -m "feat: Implement Airbnb-style delayed Stripe onboarding

- Remove Stripe requirement from listing creation
- Add delayed onboarding (only when earnings exist)
- Update account creation to CA country, transfers-only
- Add earnings tracking and payout processing
- Update frontend to show earnings-based prompts"

git push origin master
```

### 2. Run Database Migration on Staging
**IMPORTANT:** You must run the migration on your staging database before deploying:

```bash
# Connect to staging database and run:
psql $STAGING_DATABASE_URL -f migrations/add_payout_tracking_fields.sql
```

Or via Supabase Dashboard:
1. Go to SQL Editor
2. Copy contents of `migrations/add_payout_tracking_fields.sql`
3. Run the migration

### 3. Auto-Deploy (if configured)
If you have Railway/Vercel connected to GitHub:
- **Railway** will automatically deploy backend changes
- **Vercel** will automatically deploy frontend changes

### 4. Manual Deploy (if needed)
If auto-deploy is not set up:
- **Railway:** Go to dashboard → Click "Redeploy"
- **Vercel:** Go to dashboard → Click "Redeploy"

---

## Post-Deployment Verification

### 1. Database Migration
- [ ] Verify new columns exist in `bookings` table
- [ ] Verify new columns exist in `users` table

### 2. Backend API
- [ ] Test `POST /api/payments/connect/onboarding-link` without earnings → Should error
- [ ] Test `POST /api/payments/connect/onboarding-link` with earnings → Should work
- [ ] Test `POST /api/payments/create-intent` without Stripe account → Should work

### 3. Frontend
- [ ] Profile page shows "No earnings yet" when no bookings
- [ ] Profile page shows earnings amount when bookings exist
- [ ] "Add Payout Details" button only appears when earnings > 0

### 4. Stripe Dashboard
- [ ] New accounts are Express type
- [ ] New accounts default to CA country
- [ ] New accounts only have "Transfers" capability (not Card payments)

---

## Rollback Plan

If issues occur:

1. **Database:** Migration can be reversed (but data will be lost):
   ```sql
   ALTER TABLE bookings DROP COLUMN IF EXISTS host_net_amount;
   ALTER TABLE bookings DROP COLUMN IF EXISTS platform_fee;
   -- etc.
   ```

2. **Code:** Revert to previous commit:
   ```bash
   git revert HEAD
   git push origin master
   ```

---

## Important Notes

⚠️ **Database migration is required** - The new payout tracking fields must be added before the code will work properly.

⚠️ **Test in Stripe test mode first** - Verify the flow works before using live mode.

⚠️ **Existing bookings** - Old bookings won't have `host_net_amount` calculated. Consider running a backfill script if needed.

