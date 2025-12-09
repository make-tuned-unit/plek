# 🚂 Deploy Both Frontend & Backend on Railway

**Yes! Railway can host both your frontend and backend.** This is actually easier than splitting them!

---

## ✅ Benefits of Using Railway for Both

1. **Single Dashboard** - Manage everything in one place
2. **Shared Environment Variables** - Easier to manage
3. **Internal Networking** - Services can talk to each other securely
4. **Simpler Setup** - No need to configure CORS between different platforms
5. **Cost Effective** - One platform, one bill

---

## 🚀 Quick Setup (15 minutes)

### Step 1: Fix Backend Service

1. In Railway, click on **"drivemyway-backend"** service
2. Go to **"Settings"** tab
3. Set these values:
   - **Root Directory:** `backend`
   - **Build Command:** `cd backend && npm install && npm run build`
   - **Start Command:** `cd backend && npm start`
4. Go to **"Variables"** and add all backend environment variables (see below)
5. Click **"Redeploy"**

### Step 2: Configure Frontend Service

1. Click on **"drivemyway-frontend"** service
2. Go to **"Settings"** tab
3. Set these values:
   - **Root Directory:** `frontend`
   - **Build Command:** `cd frontend && npm install && npm run build`
   - **Start Command:** `cd frontend && npm start`
4. Go to **"Variables"** and add frontend environment variables (see below)

### Step 3: Get Service URLs

1. For **Backend:**
   - Go to backend service → **Settings** → **Networking**
   - Click **"Generate Domain"** if not already done
   - Copy the URL (e.g., `drivemyway-backend-production.up.railway.app`)

2. For **Frontend:**
   - Go to frontend service → **Settings** → **Networking**
   - Click **"Generate Domain"** if not already done
   - Copy the URL (e.g., `drivemyway-frontend-production.up.railway.app`)

### Step 4: Update Environment Variables

**Backend Variables:**
```
NODE_ENV=production
PORT=8000
FRONTEND_URL=https://drivemyway-frontend-production.up.railway.app
BACKEND_URL=https://drivemyway-backend-production.up.railway.app
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-key
SUPABASE_SERVICE_ROLE_KEY=your-key
DATABASE_URL=your-database-url
DIRECT_URL=your-direct-url
JWT_SECRET=your-jwt-secret
STRIPE_SECRET_KEY=your-stripe-key
STRIPE_PUBLISHABLE_KEY=your-stripe-key
STRIPE_WEBHOOK_SECRET=your-webhook-secret
RESEND_API_KEY=your-resend-key
FROM_EMAIL=noreply@parkplekk.com
```

**Frontend Variables:**
```
NEXT_PUBLIC_API_URL=https://drivemyway-backend-production.up.railway.app/api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token
NODE_ENV=production
```

**Important:** Replace the URLs with your actual Railway URLs from Step 3!

### Step 5: Add Custom Domain (Optional)

1. In **Frontend** service → **Settings** → **Networking**
2. Click **"Custom Domain"**
3. Add: `staging.parkplekk.com`
4. Railway will show you DNS records to add
5. Add CNAME record: `staging` → Railway's provided value

---

## 🔧 Troubleshooting Backend Deployment

If backend is still failing, check:

1. **View Logs:**
   - Click backend service → **"Deployments"** → Latest deployment → **"View Logs"**
   - Look for error messages

2. **Common Issues:**

   **Issue: "Cannot find module"**
   - Make sure Root Directory is set to `backend`
   - Make sure Build Command includes `cd backend`

   **Issue: "Port already in use"**
   - Railway sets PORT automatically, make sure your code uses `process.env.PORT`

   **Issue: "Build failed"**
   - Check that all dependencies are in `package.json`
   - Make sure TypeScript compiles successfully

3. **Check Environment Variables:**
   - Make sure all required variables are set
   - Check for typos in variable names

---

## 📋 Railway Service Configuration

### Backend Service Settings:
```
Root Directory: backend
Build Command: cd backend && npm install && npm run build
Start Command: cd backend && npm start
```

### Frontend Service Settings:
```
Root Directory: frontend
Build Command: cd frontend && npm install && npm run build
Start Command: cd frontend && npm start
```

---

## 🔗 Internal Service Communication

Railway services can communicate using:
- **Service URL:** `https://drivemyway-backend-production.up.railway.app`
- **Or use Railway's internal networking** (if both services are in same project)

For now, use the public URLs - they work perfectly!

---

## ✅ Verification Checklist

- [ ] Backend service shows "Online" (green dot)
- [ ] Frontend service shows "Online" (green dot)
- [ ] Backend URL accessible: `https://your-backend-url/health`
- [ ] Frontend URL accessible: `https://your-frontend-url`
- [ ] Frontend can make API calls to backend
- [ ] Custom domain working (if configured)

---

## 🎯 Next Steps

1. **Fix the backend deployment** using the steps above
2. **Test both services** are working
3. **Add custom domain** for staging
4. **Share the staging URL** with your cofounder

---

## 💡 Pro Tips

1. **Use Railway's Deploy Logs** - They show exactly what's failing
2. **Check Build Logs First** - Most failures happen during build
3. **Environment Variables** - Make sure they're set in the correct service
4. **Redeploy After Changes** - Railway auto-deploys, but you can manually trigger

---

**Need help?** Check the deployment logs in Railway - they're very detailed and will show exactly what's wrong!

