import type { Metadata } from 'next'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.parkplekk.com'

export const metadata: Metadata = {
  title: 'Find Parking Near You | Hourly & Daily Spots',
  description: 'Find and book hourly or daily parking near you. Compare driveway rental and parking spaces by location, price, and availability. Easy parking near me with plekk.',
  openGraph: {
    title: 'Find Parking Near You | Hourly & Daily | plekk',
    description: 'Find and book hourly or daily parking near you. Driveway rental and parking spaces by location. Easy parking near me.',
    url: `${baseUrl}/find-parking`,
  },
}

export default function FindParkingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
