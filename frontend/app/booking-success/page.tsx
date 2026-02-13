'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, Calendar, MapPin, DollarSign, ArrowLeft, Mail, MessageSquare, Car, Shield } from 'lucide-react'
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
    if (!bookingId) {
      setLoading(false)
      return
    }
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
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="bg-white rounded-2xl shadow-xl border border-mist-200 p-6 sm:p-8 md:p-12 text-center">
          {/* Success Icon */}
          <div className="mx-auto w-20 h-20 bg-gradient-accent rounded-full flex items-center justify-center mb-6 shadow-lg shadow-accent-500/30">
            <CheckCircle className="h-12 w-12 text-white" />
          </div>

          {/* Success Message */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-charcoal-900 mb-3">
            Booking Confirmed!
          </h1>
          <p className="text-base sm:text-lg text-charcoal-600 mb-8 max-w-md mx-auto">
            Your parking spot has been reserved. You're all set.
          </p>

          {/* Booking Details */}
          {booking && (
            <div className="bg-mist-50 rounded-xl p-5 sm:p-6 mb-8 text-left border border-mist-200">
              <h2 className="text-lg font-semibold text-charcoal-900 mb-4">Booking Details</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-accent-600 flex-shrink-0" />
                  <span className="text-charcoal-700">
                    {new Date(booking.start_time).toLocaleString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                      timeZone: booking.timezone || undefined
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-accent-600 flex-shrink-0" />
                  <span className="text-charcoal-700">{booking.property?.address}</span>
                </div>
                {booking.total_amount && (
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-accent-600 flex-shrink-0" />
                    <span className="text-charcoal-700">
                      Total: ${booking.total_amount.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* What happens next */}
          <div className="bg-mist-50 rounded-xl p-5 sm:p-6 mb-8 text-left border border-mist-200">
            <h2 className="text-base font-semibold text-charcoal-900 mb-4">What happens next</h2>
            <ol className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accent-100 text-accent-700 text-sm font-bold flex items-center justify-center mt-0.5">
                  1
                </span>
                <div>
                  <p className="font-medium text-charcoal-900">Check your email</p>
                  <p className="text-sm text-charcoal-600">You'll receive a confirmation with the booking details and address.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accent-100 text-accent-700 text-sm font-bold flex items-center justify-center mt-0.5">
                  2
                </span>
                <div>
                  <p className="font-medium text-charcoal-900">Message your host</p>
                  <p className="text-sm text-charcoal-600">Coordinate arrival instructions and any access details via the booking messages.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accent-100 text-accent-700 text-sm font-bold flex items-center justify-center mt-0.5">
                  3
                </span>
                <div>
                  <p className="font-medium text-charcoal-900">Arrive and park</p>
                  <p className="text-sm text-charcoal-600">Head to your reserved spot at the booked time. No circling required.</p>
                </div>
              </li>
            </ol>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <Link
              href="/profile?tab=bookings"
              className="inline-flex items-center justify-center min-h-[48px] px-6 py-3 bg-accent-500 text-white font-semibold rounded-xl hover:bg-accent-600 transition-colors shadow-md shadow-accent-500/25"
            >
              View My Bookings
            </Link>
            <Link
              href="/find-parking"
              className="inline-flex items-center justify-center min-h-[48px] px-6 py-3 border border-mist-300 text-charcoal-700 font-semibold rounded-xl hover:bg-mist-50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Find More Parking
            </Link>
          </div>

          {/* Trust reinforcement */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-charcoal-500 pt-6 border-t border-mist-200">
            <span className="flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-accent-500" />
              Payment secured by Stripe
            </span>
            <span className="flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-accent-500" />
              In-app messaging with host
            </span>
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
