import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import 'react-datepicker/dist/react-datepicker.css'
import { Providers } from '@/components/Providers'
import { BetaBanner } from '@/components/BetaBanner'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

// Base URL for absolute meta URLs (og:image, etc.). Set NEXT_PUBLIC_APP_URL in production (e.g. https://www.parkplekk.com).
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.parkplekk.com'

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'plekk - Rent Driveways by the Hour | Find Parking Near You',
    template: '%s | plekk',
  },
  description: 'Find and rent driveways, parking spaces, and storage by the hour in your neighbourhood. List your driveway and earn. Easy, local parking with plekk.',
  keywords: ['driveway rental', 'parking', 'hourly parking', 'parking space', 'rent driveway', 'parking near me', 'driveway sharing', 'parking marketplace', 'plekk'],
  authors: [{ name: 'plekk', url: appUrl }],
  creator: 'plekk',
  publisher: 'plekk',
  formatDetection: { email: false, address: false, telephone: false },
  viewport: 'width=device-width, initial-scale=1',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_CA',
    url: appUrl,
    siteName: 'plekk',
    title: 'plekk - Rent Driveways by the Hour | Find Parking Near You',
    description: 'Find and rent driveways, parking spaces, and storage by the hour in your neighbourhood. List your driveway and earn.',
    images: [
      {
        url: '/PlekkFeaturedImage.png',
        width: 1200,
        height: 630,
        alt: 'plekk - Rent driveways by the hour. Find parking near you.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'plekk - Rent Driveways by the Hour | Find Parking Near You',
    description: 'Find and rent driveways, parking spaces, and storage by the hour. List your driveway and earn.',
    images: ['/PlekkFeaturedImage.png'],
  },
  alternates: {
    canonical: appUrl,
  },
  category: 'marketplace',
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${appUrl}/#organization`,
      name: 'plekk',
      url: appUrl,
      logo: { '@type': 'ImageObject', url: `${appUrl}/logo.png` },
      description: 'Parking marketplace powered by local driveways. Rent driveways by the hour.',
    },
    {
      '@type': 'WebSite',
      '@id': `${appUrl}/#website`,
      url: appUrl,
      name: 'plekk - Rent Driveways by the Hour',
      description: 'Find and rent driveways, parking spaces, and storage by the hour. List your driveway and earn.',
      publisher: { '@id': `${appUrl}/#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${appUrl}/find-parking?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Providers>
          <BetaBanner />
          <Navigation />
          {children}
          <Footer />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
} 