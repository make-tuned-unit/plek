import type { Metadata } from 'next'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.parkplekk.com'

export const metadata: Metadata = {
  title: 'List Your Driveway & Earn | Rent Your Parking Space',
  description: 'List your driveway or parking space and start earning. Join the parking marketplace: set your rates, choose availability, and get paid for driveway sharing with plekk.',
  openGraph: {
    title: 'List Your Driveway & Earn | plekk',
    description: 'List your parking space and earn. Set your rates and availability. Driveway sharing made simple.',
    url: `${baseUrl}/list-your-driveway`,
  },
}

export default function ListYourDrivewayLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
