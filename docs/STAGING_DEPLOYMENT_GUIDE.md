# 🚀 Staging Deployment Guide - Step by Step

**Goal:** Deploy frontend to Vercel and backend to Railway with custom domain `staging.parkplekk.com`

---

## 📋 Prerequisites Checklist

Before starting, make sure you have:
- [ ] GitHub account (or GitLab/Bitbucket)
- [ ] Vercel account (sign up at vercel.com - free tier works)
- [ ] Railway account (sign up at railway.app - free tier works)
- [ ] Domain `parkplekk.com` with DNS access
- [ ] All environment variables ready (see below)

---

## Part 1: Prepare Your Code (5 minutes)

### Step 1.1: Push code to GitHub
1. Open terminal in your project folder
2. Check if you have a git remote:
   ```bash
   git remote -v
   ```
3. If no remote exists, add one:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   ```
4. Commit and push your code:
   ```bash
   git add .
   git commit -m "Prepare for staging deployment"
   git push origin master
   ```

---

## Part 2: Deploy Backend to Railway (15-20 minutes)

### Step 2.1: Create Railway Project
1. Go to https://railway.app
2. Click **"Login"** (use GitHub to sign in)
3. Click **"New Project"**
4. Select **"Deploy from GitHub repo"**
5. Choose your repository
6. Railway will detect it's a Node.js project

### Step 2.2: Configure Backend Service
1. Railway will create a service - click on it
2. Click **"Settings"** tab
3. Under **"Root Directory"**, set it to: `backend`
4. Under **"Build Command"**, set it to: `npm install && npm run build`
5. Under **"Start Command"**, set it to: `npm start`

### Step 2.3: Set Environment Variables
1. Still in Settings, scroll to **"Variables"** section
2. Click **"New Variable"** and add each of these (use your actual values):

```
NODE_ENV=production
PORT=8000
FRONTEND_URL=https://staging.parkplekk.com
BACKEND_URL=https://your-backend-url.railway.app
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
DATABASE_URL=your-database-url
DIRECT_URL=your-direct-database-url
JWT_SECRET=your-jwt-secret
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
RESEND_API_KEY=your-resend-api-key
FROM_EMAIL=noreply@parkplekk.com
```

**Important:** 
- Replace `your-backend-url.railway.app` with Railway's generated URL (you'll get this after first deploy)
- For `FROM_EMAIL`, use your verified Resend domain email
- For `FRONTEND_URL`, use `https://staging.parkplekk.com` (we'll set this up later)

### Step 2.4: Deploy
1. Railway will automatically start deploying
2. Wait for deployment to complete (watch the logs)
3. Once done, click **"Settings"** → **"Generate Domain"**
4. Copy the generated URL (e.g., `your-app.railway.app`)
5. **Update `BACKEND_URL` variable** with this new URL
6. Railway will redeploy automatically

### Step 2.5: Get Railway URL
1. In Railway, go to your service
2. Click **"Settings"** → **"Networking"**
3. Copy the **"Public Domain"** (this is your backend URL)
4. Save this URL - you'll need it for frontend configuration

---

## Part 3: Deploy Frontend to Vercel (15-20 minutes)

### Step 3.1: Create Vercel Project
1. Go to https://vercel.com
2. Click **"Login"** (use GitHub to sign in)
3. Click **"Add New..."** → **"Project"**
4. Import your GitHub repository
5. Vercel will auto-detect Next.js

### Step 3.2: Configure Build Settings
1. In the project setup page, find **"Root Directory"**
2. Click **"Edit"** and set it to: `frontend`
3. **Framework Preset:** Next.js (should be auto-detected)
4. **Build Command:** `npm run build` (default is fine)
5. **Output Directory:** `.next` (default is fine)
6. **Install Command:** `npm install` (default is fine)

### Step 3.3: Set Environment Variables
1. Scroll down to **"Environment Variables"** section
2. Click **"Add"** for each variable:

```
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app/api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token
```

**Important:** 
- Replace `your-backend-url.railway.app` with the Railway URL from Step 2.5
- Add `/api` at the end of the backend URL

### Step 3.4: Deploy
1. Click **"Deploy"** button
2. Wait for deployment (2-3 minutes)
3. Once done, you'll get a Vercel URL like `your-app.vercel.app`

### Step 3.5: Configure Custom Domain
1. In Vercel project, go to **"Settings"** → **"Domains"**
2. Enter: `staging.parkplekk.com`
3. Click **"Add"**
4. Vercel will show you DNS records to add

---

## Part 4: Configure DNS (10 minutes)

### Step 4.1: Add DNS Records
1. Go to your domain registrar (where you bought parkplekk.com)
2. Find DNS management section
3. Add these records:

**For Frontend (Vercel):**
- **Type:** CNAME
- **Name:** staging
- **Value:** `cname.vercel-dns.com`
- **TTL:** 3600 (or default)

**For Backend (Railway) - Optional (if you want custom domain):**
- Railway doesn't support custom domains on free tier, so we'll use the Railway URL

### Step 4.2: Wait for DNS Propagation
1. DNS changes can take 5 minutes to 48 hours
2. Usually takes 5-15 minutes
3. Check status in Vercel dashboard (it will show "Valid Configuration" when ready)

---

## Part 5: Update Environment Variables (5 minutes)

### Step 5.1: Update Backend Variables
1. Go back to Railway
2. Update `FRONTEND_URL` to: `https://staging.parkplekk.com`
3. Update `BACKEND_URL` to your Railway URL (if not already set)
4. Railway will redeploy automatically

### Step 5.2: Update Frontend Variables
1. Go back to Vercel
2. Update `NEXT_PUBLIC_API_URL` if needed (should already be set)
3. Vercel will redeploy automatically

---

## Part 6: Configure Stripe Webhook (5 minutes)

### Step 6.1: Update Stripe Webhook URL
1. Go to https://dashboard.stripe.com
2. Go to **"Developers"** → **"Webhooks"**
3. Find your webhook endpoint
4. Click **"Edit"**
5. Update **"Endpoint URL"** to: `https://your-backend-url.railway.app/api/payments/webhook`
6. Save
7. Copy the new **"Signing secret"** (if it changed)
8. Update `STRIPE_WEBHOOK_SECRET` in Railway if needed

---

## Part 7: Test Your Deployment (10 minutes)

### Step 7.1: Test Frontend
1. Visit `https://staging.parkplekk.com`
2. Check if page loads
3. Try logging in/registering
4. Check browser console for errors

### Step 7.2: Test Backend
1. Visit `https://your-backend-url.railway.app/api/health` (if you have a health endpoint)
2. Or test an API endpoint like `/api/auth/me` (will require auth)

### Step 7.3: Test Email
1. Try registering a new user
2. Check if confirmation email arrives
3. Check Resend dashboard for delivery status

### Step 7.4: Test Payment Flow
1. Create a test booking
2. Try the payment flow (use Stripe test cards)
3. Check if webhook receives events

---

## Part 8: Verify Everything Works

### Checklist:
- [ ] Frontend loads at `https://staging.parkplekk.com`
- [ ] Backend API responds at Railway URL
- [ ] User registration works
- [ ] Email confirmation works
- [ ] Login works
- [ ] Booking creation works
- [ ] Payment flow works (test mode)
- [ ] Emails are being sent
- [ ] Logo displays correctly in emails

---

## 🔧 Troubleshooting

### Frontend shows "API Error"
- Check `NEXT_PUBLIC_API_URL` in Vercel
- Make sure it includes `/api` at the end
- Check Railway backend is running

### Backend not responding
- Check Railway logs (click on service → "Deployments" → latest → "View Logs")
- Verify all environment variables are set
- Check if build completed successfully

### DNS not working
- Wait longer (up to 48 hours, but usually 5-15 min)
- Check DNS records are correct
- Use `dig staging.parkplekk.com` to check DNS propagation

### Emails not sending
- Check Resend API key is correct
- Verify `FROM_EMAIL` is using verified domain
- Check Resend dashboard for errors

### CORS errors
- Make sure `FRONTEND_URL` in backend matches `https://staging.parkplekk.com`
- Check Railway allows CORS from your frontend domain

---

## 📝 Important Notes

1. **Railway Free Tier:**
   - $5 free credit per month
   - Sleeps after inactivity (wakes up on first request)
   - May need to upgrade for production

2. **Vercel Free Tier:**
   - Unlimited deployments
   - 100GB bandwidth
   - Perfect for staging

3. **Environment Variables:**
   - Never commit `.env` files
   - Always set in platform dashboards
   - Use different values for staging vs production

4. **Database:**
   - Supabase is already hosted, so no changes needed
   - Just make sure `DATABASE_URL` points to your Supabase instance

5. **Stripe:**
   - Use test mode keys for staging
   - Update webhook URL to Railway backend
   - Test with test cards: `4242 4242 4242 4242`

---

## 🎉 Next Steps After Deployment

1. Share `https://staging.parkplekk.com` with your cofounder
2. Set up monitoring (optional):
   - Vercel Analytics
   - Railway Metrics
   - Sentry for error tracking
3. Document any issues found during testing
4. Plan production deployment (similar process, different domain)

---

## 📞 Quick Reference

**Frontend URL:** `https://staging.parkplekk.com`  
**Backend URL:** `https://your-app.railway.app`  
**Vercel Dashboard:** https://vercel.com/dashboard  
**Railway Dashboard:** https://railway.app/dashboard  
**Stripe Dashboard:** https://dashboard.stripe.com  
**Resend Dashboard:** https://resend.com/emails  

---

**Need help?** Check the logs in Railway and Vercel dashboards - they usually show what's wrong!




