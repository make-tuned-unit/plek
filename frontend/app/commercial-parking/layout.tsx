import type { Metadata } from 'next'
import { breadcrumbList, jsonLdScript, APP_URL } from '@/lib/seo'

const baseUrl = APP_URL

export const metadata: Metadata = {
  title: 'List Commercial Parking in Bulk | plekk',
  description:
    'Onboard commercial parking supply with pooled inventory, simple lot zones, spreadsheet imports, and manual review. Built for businesses, landlords, and lot operators.',
  alternates: {
    canonical: `${baseUrl}/commercial-parking`,
  },
  openGraph: {
    title: 'List Commercial Parking in Bulk | plekk',
    description:
      'Bring commercial parking inventory online with pooled counts by vehicle type, optional zones, and a low-touch manual review flow.',
    url: `${baseUrl}/commercial-parking`,
  },
}

const breadcrumbJsonLd = breadcrumbList([
  { name: 'Home', url: `${baseUrl}/` },
  { name: 'Commercial Parking', url: `${baseUrl}/commercial-parking` },
])

export default function CommercialParkingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd) }}
      />
      {children}
    </>
  )
}
