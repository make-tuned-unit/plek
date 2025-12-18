import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import 'react-datepicker/dist/react-datepicker.css'
import { Providers } from '@/components/Providers'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'plekk - Rent Driveways by the Hour',
  description: 'Find and rent driveways, parking spaces, and storage solutions in your neighborhood.',
  keywords: 'driveway rental, parking, storage, parking space, hourly parking',
  authors: [{ name: 'plekk Team' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
  openGraph: {
    title: 'plekk - Rent Driveways by the Hour',
    description: 'Find and rent driveways, parking spaces, and storage solutions in your neighborhood.',
    images: ['/logo.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'plekk - Rent Driveways by the Hour',
    description: 'Find and rent driveways, parking spaces, and storage solutions in your neighborhood.',
    images: ['/logo.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
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