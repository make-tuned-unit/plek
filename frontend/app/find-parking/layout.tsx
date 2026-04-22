import type { Metadata } from 'next'
import { howTo, breadcrumbList, jsonLdScript, APP_URL } from '@/lib/seo'

const baseUrl = APP_URL

export const metadata: Metadata = {
  title: 'Find Parking Near You | Hourly & Daily Spots',
  description: 'Find and book hourly or daily parking near you. Compare driveway rental and parking spaces by location, price, and availability. Easy parking near me with plekk.',
  alternates: {
    canonical: `${baseUrl}/find-parking`,
  },
  openGraph: {
    title: 'Find Parking Near You | Hourly & Daily | plekk',
    description: 'Find and book hourly or daily parking near you. Driveway rental and parking spaces by location. Easy parking near me.',
    url: `${baseUrl}/find-parking`,
  },
}

const howToJsonLd = howTo({
  name: 'How to find and book parking on plekk',
  description:
    'Find hourly or daily parking near you on plekk in four steps: search by location, pick a date and time, choose a space, and pay securely.',
  url: `${baseUrl}/find-parking`,
  totalTime: 'PT2M',
  steps: [
    {
      name: 'Search by location',
      text: 'Enter the address or neighbourhood where you need parking. plekk shows driveways and parking spaces near your destination on a map.',
    },
    {
      name: 'Pick your date and time',
      text: 'Choose a start and end time. Filter for hourly or daily parking, vehicle size, and amenities to narrow your results.',
    },
    {
      name: 'Choose a space',
      text: 'Compare spaces by price, photos, reviews, and distance. Open a listing to see access instructions and the exact location after booking.',
    },
    {
      name: 'Book and pay securely',
      text: 'Reserve your parking space and pay securely with Stripe. Your spot is guaranteed for the time window you booked.',
    },
  ],
})

const breadcrumbJsonLd = breadcrumbList([
  { name: 'Home', url: `${baseUrl}/` },
  { name: 'Find Parking', url: `${baseUrl}/find-parking` },
])

export default function FindParkingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(howToJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd) }}
      />
      {children}
    </>
  )
}
