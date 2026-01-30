# 🗄️ Supabase Storage Setup Guide

## 📸 **Setting Up Photo Storage for Your Parking App**

### **Step 1: Create Storage Bucket in Supabase Dashboard**

1. **Go to your Supabase Dashboard**
   - Navigate to: `https://supabase.com/dashboard/project/[YOUR-PROJECT-ID]`

2. **Navigate to Storage**
   - Click on "Storage" in the left sidebar

3. **Create New Bucket**
   - Click "Create a new bucket"
   - **Bucket name:** `property-photos`
   - **Public bucket:** ✅ Check this (so photos can be viewed publicly)
   - **File size limit:** `10 MB` (or your preferred limit)
   - **Allowed MIME types:** `image/*` (allows jpg, png, gif, etc.)

4. **Click "Create bucket"**

### **Step 2: Configure Storage Policies**

After creating the bucket, we need to set up Row Level Security (RLS) policies.

**Option A: Run the SQL file (Recommended)**
1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open the file `scripts/sql/supabase_storage_setup.sql` in this project
4. Copy and paste the entire contents
5. Click **Run** to execute

**Option B: Manual Setup**
If you prefer to set up manually, run these SQL commands in the SQL Editor:

```sql
-- Enable RLS on the storage.objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Hosts can upload photos to their property folders
-- Photos are stored as: property-photos/{propertyId}/{filename}
CREATE POLICY "Hosts can upload to their property folders"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'property-photos' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text 
    FROM public.properties 
    WHERE host_id = auth.uid()
  )
);

-- Policy: Anyone can view property photos (public access)
CREATE POLICY "Anyone can view property photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'property-photos');

-- Policy: Hosts can update their property photos
CREATE POLICY "Hosts can update their property photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'property-photos' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text 
    FROM public.properties 
    WHERE host_id = auth.uid()
  )
);

-- Policy: Hosts can delete their property photos
CREATE POLICY "Hosts can delete their property photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'property-photos' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text 
    FROM public.properties 
    WHERE host_id = auth.uid()
  )
);
```

**Important:** The policies check that the user is the host of the property (not just matching user ID), since photos are organized by property ID in folders.

### **Step 3: Update Environment Variables**

Add these to your `backend/.env` file:

```env
# Supabase Storage
SUPABASE_STORAGE_BUCKET=property-photos
SUPABASE_STORAGE_URL=https://[YOUR-PROJECT-ID].supabase.co/storage/v1
```

### **Step 4: Test Photo Upload**

1. **Start your backend:** `cd backend && npm run dev`
2. **Start your frontend:** `cd frontend && npm run dev`
3. **Go to your profile page**
4. **Click "Add New Listing"**
5. **Try uploading a photo**

## 🔧 **Troubleshooting**

### **Common Issues:**

1. **"Bucket not found" error**
   - Make sure the bucket name matches exactly: `property-photos`
   - Check that you're in the right Supabase project

2. **"Permission denied" error**
   - Run the SQL policies above in your Supabase SQL Editor
   - Make sure RLS is enabled on storage.objects

3. **Photos not displaying**
   - Check that the bucket is set to "Public"
   - Verify the photo URLs are being generated correctly

### **Testing the Setup:**

```bash
# Test if storage is working
curl -X POST "https://[YOUR-PROJECT-ID].supabase.co/storage/v1/object/upload/property-photos/test.jpg" \
  -H "Authorization: Bearer [YOUR-ANON-KEY]" \
  -H "Content-Type: image/jpeg" \
  -d "test image data"
```

## 🎯 **What This Enables:**

- ✅ **Photo uploads** for property listings
- ✅ **Image storage** in the cloud
- ✅ **Public access** to view photos
- ✅ **User management** of their own photos
- ✅ **Scalable storage** for your app

## 🚀 **Next Steps After Setup:**

1. **Test photo upload** in the Add Listing modal
2. **Verify photos display** in property listings
3. **Add image preview** functionality
4. **Implement photo galleries** for multiple images
5. **Add photo compression** for better performance

---

**Need help?** Check the Supabase documentation or run into issues? Let me know!
