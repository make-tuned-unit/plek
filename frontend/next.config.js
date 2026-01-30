// dotenv is optional - Railway provides environment variables directly
try {
  const path = require('path')
  require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
} catch (e) {
  // dotenv not available, which is fine in production
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strip all console.* in production to avoid leaking secrets or user data
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? true : false,
  },
  images: {
    domains: ['localhost', 'drivemyway-uploads.s3.amazonaws.com'],
  },
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://www.parkplekk.com',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL || 'http://localhost:8000',
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || '',
    NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN || process.env.MAPBOX_TOKEN || '',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
  },
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
}

module.exports = nextConfig 