# plekk Frontend

Your frontend has been updated to work with your new Supabase-powered backend!

## 🚀 **Setup Instructions**

### 1. **Create Environment File**
Copy the example environment file and update it:

```bash
cp env.example .env.local
```

Your `.env.local` should contain:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NODE_ENV=development
```

### 2. **Install Dependencies** (if needed)
```bash
npm install
```

### 3. **Start the Frontend**
```bash
npm run dev
```

## 🔗 **Backend Connection**

Your frontend now connects to your backend at:
- **Local Development**: `http://localhost:8000/api`
- **Production**: Update `NEXT_PUBLIC_API_URL` in your environment file

## 🆕 **What's New**

### **Real Authentication**
- ✅ **No more demo mode** - Real user registration and login
- ✅ **JWT token management** - Secure authentication with your backend
- ✅ **Profile management** - Update user profiles through the API
- ✅ **Automatic token validation** - Checks auth status on app load

### **API Integration**
- ✅ **Properties** - List, create, and manage parking spots
- ✅ **Bookings** - Handle parking reservations
- ✅ **Messages** - User communication system
- ✅ **Notifications** - Real-time updates

### **New Files Created**
- `services/api.ts` - Centralized API service
- `hooks/useApi.ts` - Custom hooks for API calls
- `env.example` - Environment configuration template

## 🧪 **Testing Your Setup**

### **1. Test User Registration**
1. Go to `/auth/signup`
2. Fill out the form with real information
3. Submit and check your backend logs

### **2. Test User Login**
1. Go to `/auth/signin`
2. Use the credentials from registration
3. Check that you're redirected to `/profile`

### **3. Check Backend Logs**
Your backend should show:
```
POST /api/auth/register 201
POST /api/auth/login 200
GET /api/auth/me 200
```

## 🔧 **Troubleshooting**

### **Frontend Can't Connect to Backend**
- ✅ Ensure backend is running on port 8000
- ✅ Check `.env.local` has correct API URL
- ✅ Verify backend health endpoint: `http://localhost:8000/health`

### **Authentication Issues**
- ✅ Check backend logs for auth requests
- ✅ Verify Supabase is properly configured
- ✅ Check browser console for API errors

### **CORS Issues**
- ✅ Backend has CORS enabled for localhost:3000-3002
- ✅ Frontend is making requests to correct backend URL

## 🚀 **Next Steps**

1. **Test all auth flows** - Registration, login, logout
2. **Update other pages** - Remove mock data, use real API calls
3. **Add error handling** - Improve user experience
4. **Deploy to production** - Update environment variables

## 📱 **API Endpoints Available**

Your backend provides these endpoints:
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile
- `GET /api/properties` - List properties
- `POST /api/properties` - Create property
- `GET /api/bookings` - User bookings
- `POST /api/bookings` - Create booking
- `GET /api/messages` - User messages
- `GET /api/notifications` - User notifications

## 🎉 **You're Ready!**

Your frontend is now fully connected to your Supabase backend and ready for real users!
