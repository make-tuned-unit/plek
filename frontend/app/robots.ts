import type { MetadataRoute } from 'next'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.parkplekk.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/auth/', '/profile', '/admin', '/booking-success'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
