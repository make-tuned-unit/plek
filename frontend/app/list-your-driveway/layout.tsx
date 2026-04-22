import type { Metadata } from 'next'
import { howTo, breadcrumbList, jsonLdScript, APP_URL } from '@/lib/seo'

const baseUrl = APP_URL

export const metadata: Metadata = {
  title: 'List Your Driveway & Earn | Rent Your Parking Space',
  description: 'List your driveway or parking space and start earning. Join the parking marketplace: set your rates, choose availability, and get paid for driveway sharing with plekk.',
  alternates: {
    canonical: `${baseUrl}/list-your-driveway`,
  },
  openGraph: {
    title: 'List Your Driveway & Earn | plekk',
    description: 'List your parking space and earn. Set your rates and availability. Driveway sharing made simple.',
    url: `${baseUrl}/list-your-driveway`,
  },
}

const howToJsonLd = howTo({
  name: 'How to list your driveway on plekk',
  description:
    'Turn an unused driveway or parking space into income. List on plekk in four steps: add your details, set pricing and availability, upload photos, and publish.',
  url: `${baseUrl}/list-your-driveway`,
  totalTime: 'PT10M',
  steps: [
    {
      name: 'Add basic info and location',
      text: 'Enter a title, description, and the address of your driveway, garage, or parking space. Your exact address is kept private until a booking is confirmed.',
    },
    {
      name: 'Set pricing and availability',
      text: 'Choose an hourly rate, a daily rate, or both. Pick the days and hours you want your space bookable, and set a lead time if you need advance notice.',
    },
    {
      name: 'Upload photos',
      text: 'Add clear photos of the parking space and the approach. Good photos help drivers feel confident and book your space faster.',
    },
    {
      name: 'Review and publish',
      text: 'Review your listing, connect Stripe to receive payouts, and publish. Once approved, drivers can book and you earn automatically.',
    },
  ],
})

const breadcrumbJsonLd = breadcrumbList([
  { name: 'Home', url: `${baseUrl}/` },
  { name: 'List Your Driveway', url: `${baseUrl}/list-your-driveway` },
])

export default function ListYourDrivewayLayout({
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
