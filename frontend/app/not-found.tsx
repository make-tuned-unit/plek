import Link from 'next/link'
import { MapPin, ArrowLeft, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-mist-100 to-sand-100 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-mist-200 rounded-full flex items-center justify-center mb-6">
          <MapPin className="h-8 w-8 sm:h-10 sm:w-10 text-mist-500" />
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold text-charcoal-900 mb-3">404</h1>
        <p className="text-lg sm:text-xl text-charcoal-700 mb-2 font-medium">Page not found</p>
        <p className="text-charcoal-500 mb-8 text-sm sm:text-base">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center min-h-[48px] px-6 py-3 bg-accent-500 text-white font-semibold rounded-xl hover:bg-accent-600 transition-colors shadow-md shadow-accent-500/25"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
          <Link
            href="/find-parking"
            className="inline-flex items-center justify-center min-h-[48px] px-6 py-3 border border-mist-300 text-charcoal-700 font-semibold rounded-xl hover:bg-mist-50 transition-colors"
          >
            <Search className="h-4 w-4 mr-2" />
            Find Parking
          </Link>
        </div>
      </div>
    </div>
  )
}
