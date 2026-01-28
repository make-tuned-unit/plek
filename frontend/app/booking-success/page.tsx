'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, Calendar, MapPin, DollarSign, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { apiService } from '@/services/api'

function BookingSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const bookingId = searchParams.get('bookingId')
  const [booking, setBooking] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // If no booking ID, just show success message
    if (!bookingId) {
      setLoading(false)
      return
    }

    // Fetch booking details if ID is provided
    // This would need to be implemented in the API
    setLoading(false)
  }, [bookingId])

  if (loading) {
    return (
      <div className="min-h-screen bg-mist-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500 mx-auto mb-4"></div>
          <p className="text-charcoal-600">Loading booking details...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-mist-100 to-sand-100">
      <div className="max-w-2xl mx-auto container-padding py-16">
        <div className="bg-white rounded-2xl shadow-xl border border-mist-200 p-8 md:p-12 text-center animate-scale-in">
          {/* Success Icon */}
          <div className="mx-auto w-20 h-20 bg-gradient-accent rounded-full flex items-center justify-center mb-6 shadow-lg shadow-accent-500/30">
            <CheckCircle className="h-12 w-12 text-white" />
          </div>

          {/* Success Message */}
          <h1 className="text-3xl md:text-4xl font-bold text-charcoal-900 mb-4">
            Booking Confirmed!
          </h1>
          <p className="text-lg text-charcoal-600 mb-8">
            Your parking spot has been reserved successfully.
          </p>

          {/* Booking Details */}
          {booking && (
            <div className="bg-mist-50 rounded-xl p-6 mb-8 text-left">
              <h2 className="text-xl font-semibold text-charcoal-900 mb-4">Booking Details</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-accent-600" />
                  <span className="text-charcoal-700">
                    {new Date(booking.start_time).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-accent-600" />
                  <span className="text-charcoal-700">{booking.property?.address}</span>
                </div>
                {booking.total_amount && (
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-accent-600" />
                    <span className="text-charcoal-700">
                      Total: ${booking.total_amount.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/profile?tab=bookings"
              className="btn-primary inline-flex items-center justify-center"
            >
              View My Bookings
            </Link>
            <Link
              href="/find-parking"
              className="btn-secondary inline-flex items-center justify-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Find More Parking
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-mist-100 to-sand-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500 mx-auto mb-4"></div>
          <p className="text-charcoal-600">Loading...</p>
        </div>
      </div>
    }>
      <BookingSuccessContent />
    </Suspense>
  )
}
