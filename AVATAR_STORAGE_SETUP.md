# 🖼️ Avatar Storage Setup Guide

## 📸 **Setting Up Avatar Storage for User Profile Pictures**

### **Step 1: Create Storage Bucket in Supabase Dashboard**

1. **Go to your Supabase Dashboard**
   - Navigate to: `https://supabase.com/dashboard/project/[YOUR-PROJECT-ID]`

2. **Navigate to Storage**
   - Click on "Storage" in the left sidebar

3. **Create New Bucket**
   - Click "Create a new bucket"
   - **Bucket name:** `user-avatars`
   - **Public bucket:** ✅ Check this (so avatars can be viewed publicly)
   - **File size limit:** `5 MB` (or your preferred limit)
   - **Allowed MIME types:** `image/*` (allows jpg, png, gif, etc.)

4. **Click "Create bucket"**

### **Step 2: Configure Storage Policies**

After creating the bucket, run the SQL setup file:

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open the file `supabase_avatars_bucket_setup.sql` in this project
4. Copy and paste the entire contents
5. Click **Run** to execute

This will create the following policies:
- ✅ Users can upload their own avatars
- ✅ Anyone can view avatars (public access)
- ✅ Users can update their own avatars
- ✅ Users can delete their own avatars

### **Step 3: Update Environment Variables**

Add this to your `backend/.env` file:

```env
# Supabase Storage - Avatars
SUPABASE_AVATARS_BUCKET=user-avatars
```

**Note:** If `SUPABASE_AVATARS_BUCKET` is not set, it defaults to `user-avatars`.

### **Step 4: Test Avatar Upload**

1. **Start your backend:** `cd backend && npm run dev`
2. **Start your frontend:** `cd frontend && npm run dev`
3. **Go to your profile page**
4. **Click the camera icon on your profile picture**
5. **Try uploading a photo or taking a photo with webcam**

## 🔧 **Troubleshooting**

### **Common Issues:**

1. **"Bucket not found" error**
   - Make sure the bucket name matches exactly: `user-avatars`
   - Check that you're in the right Supabase project
   - Verify the bucket was created in the Storage section

2. **"Permission denied" error**
   - Run the SQL policies in `supabase_avatars_bucket_setup.sql`
   - Make sure RLS is enabled on storage.objects

3. **Avatars not displaying**
   - Check that the bucket is set to "Public"
   - Verify the avatar URLs are being generated correctly

4. **Webcam not working on desktop**
   - Make sure you've granted camera permissions in your browser
   - Try a different browser (Chrome, Firefox, Safari, Edge all supported)
   - Check that your device has a camera connected

## 🎯 **Features:**

- ✅ **File upload** from device (desktop and mobile)
- ✅ **Webcam capture** on desktop and mobile
- ✅ **Image resizing** (auto-resized to 800x800px max)
- ✅ **File validation** (type and size)
- ✅ **Preview before upload**
- ✅ **Cross-platform support** (all modern browsers)

## 📱 **Browser Support:**

- **Desktop:** Chrome, Firefox, Safari, Edge (webcam via MediaDevices API)
- **Mobile:** iOS Safari, Chrome Mobile (camera via `capture` attribute or MediaDevices API)
- **File Upload:** All modern browsers

---

**Need help?** Check the Supabase documentation or run into issues? Let me know!

