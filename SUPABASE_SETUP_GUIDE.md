# Supabase Setup Guide for Drive My Way

## 🚀 Step 1: Get Your Supabase Project Details

1. **Go to your Supabase project dashboard**
   - Visit [supabase.com](https://supabase.com)
   - Sign in and select your project

2. **Get your project URL and keys**
   - Go to **Settings** → **API** in the left sidebar
   - Copy these values:
     - **Project URL** (e.g., `https://abc123.supabase.co`)
     - **anon public** key (starts with `eyJ...`)
     - **service_role** key (starts with `eyJ...`)

## 🔑 Step 2: Get Your Database Connection String

1. **Go to Settings** → **Database**
2. **Find the connection string section**
3. **Copy the connection string** that looks like:
   ```
   postgresql://postgres.[YOUR-PASSWORD]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```

## 📝 Step 3: Update Your .env File

Create a `.env` file in your backend directory with these values:

```bash
# Supabase Configuration
SUPABASE_URL="https://your-actual-project.supabase.co"
SUPABASE_ANON_KEY="your-actual-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-actual-service-role-key"

# Database (Supabase PostgreSQL)
DATABASE_URL="your-actual-connection-string"
DIRECT_URL="your-actual-direct-connection-string"

# JWT (Supabase handles this automatically)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"

# Stripe
STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key"
STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_publishable_key"
STRIPE_WEBHOOK_SECRET="whsec_your_stripe_webhook_secret"

# AWS S3 (for file uploads)
AWS_ACCESS_KEY_ID="your_aws_access_key"
AWS_SECRET_ACCESS_KEY="your_aws_secret_key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="drivemyway-uploads"

# SendGrid
SENDGRID_API_KEY="your_sendgrid_api_key"
FROM_EMAIL="noreply@drivemyway.com"

# App Configuration
NODE_ENV="development"
PORT=8000
FRONTEND_URL="http://localhost:3000"
BACKEND_URL="http://localhost:8000"

# Google Maps
GOOGLE_MAPS_API_KEY="your_google_maps_api_key"

# File Upload
MAX_FILE_SIZE="10485760"
ALLOWED_FILE_TYPES="image/jpeg,image/png,image/webp"

# Supabase Storage (alternative to AWS S3)
SUPABASE_STORAGE_BUCKET="property-photos"
```

## 🔍 Step 4: Verify Your Setup

1. **Check your Supabase project**
   - Go to **Table Editor** → you should see all your tables
   - Go to **Authentication** → you should see the auth system ready

2. **Test the connection**
   ```bash
   cd backend
   npm install @supabase/supabase-js
   npx prisma db push
   ```

## ⚠️ Important Notes

- **Never commit your `.env` file** to git
- **Keep your service role key secret** - it has admin access
- **The anon key is safe** to expose in frontend code
- **Use the pooler connection string** for most operations
- **Use the direct connection string** for Prisma migrations

## 🎯 Next Steps

1. ✅ Update your `.env` file with real values
2. ✅ Test the database connection
3. ✅ Update your backend code to use Supabase
4. ✅ Deploy to production

## 🆘 Need Help?

If you get stuck:
1. Check the Supabase logs in your dashboard
2. Verify your connection strings are correct
3. Make sure you've run the SQL setup file
4. Check that your IP is allowed (if you have restrictions)
