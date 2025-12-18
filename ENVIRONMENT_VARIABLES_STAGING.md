# 🔐 Environment Variables for Staging

Copy these into Railway (backend) and Vercel (frontend) dashboards.

---

## Backend (Railway) - All Variables

```
NODE_ENV=production
PORT=8000
FRONTEND_URL=https://staging.parkplekk.com
BACKEND_URL=https://your-app.railway.app
```

### Supabase
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
DATABASE_URL=postgresql://postgres.[PASSWORD]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres.[PASSWORD]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```

### JWT
```
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
```

### Stripe
```
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret
```

### Email (Resend)
```
RESEND_API_KEY=re_your_resend_api_key
FROM_EMAIL=noreply@parkplekk.com
```

**Note:** Replace `your-app.railway.app` with your actual Railway URL after first deployment.

---

## Frontend (Vercel) - All Variables

```
NEXT_PUBLIC_API_URL=https://your-app.railway.app/api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
```

**Note:** Replace `your-app.railway.app` with your actual Railway URL.

---

## Quick Copy Template

### Railway Variables (copy all at once):
```
NODE_ENV=production
PORT=8000
FRONTEND_URL=https://staging.parkplekk.com
BACKEND_URL=https://REPLACE_WITH_RAILWAY_URL
SUPABASE_URL=REPLACE
SUPABASE_ANON_KEY=REPLACE
SUPABASE_SERVICE_ROLE_KEY=REPLACE
DATABASE_URL=REPLACE
DIRECT_URL=REPLACE
JWT_SECRET=REPLACE
STRIPE_SECRET_KEY=REPLACE
STRIPE_PUBLISHABLE_KEY=REPLACE
STRIPE_WEBHOOK_SECRET=REPLACE
RESEND_API_KEY=REPLACE
FROM_EMAIL=noreply@parkplekk.com
```

### Vercel Variables (copy all at once):
```
NEXT_PUBLIC_API_URL=https://REPLACE_WITH_RAILWAY_URL/api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=REPLACE
NEXT_PUBLIC_MAPBOX_TOKEN=REPLACE
```

---

## ⚠️ Important Notes

1. **Use test/staging keys** for Stripe (keys starting with `sk_test_` and `pk_test_`)
2. **FROM_EMAIL** must be from a verified Resend domain
3. **BACKEND_URL** in Railway should match your Railway domain
4. **FRONTEND_URL** in Railway should be `https://staging.parkplekk.com`
5. **NEXT_PUBLIC_API_URL** in Vercel should be Railway URL + `/api`

---

## 🔄 After First Deployment

1. Get Railway URL from Railway dashboard
2. Update `BACKEND_URL` in Railway
3. Update `NEXT_PUBLIC_API_URL` in Vercel
4. Update Stripe webhook URL to: `https://your-railway-url.railway.app/api/payments/webhook`
5. Redeploy both services



