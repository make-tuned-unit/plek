'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, Calendar, Clock, MapPin, DollarSign, ArrowRight, ExternalLink } from 'lucide-react'
import { apiService } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

function BookingSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [booking, setBooking] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const bookingId = searchParams.get('bookingId')

  useEffect(() => {
    if (!user) {
      router.push('/auth/signin')
      return
    }

    if (!bookingId) {
      // If no booking ID, try to get the most recent booking
      fetchLatestBooking()
    } else {
      fetchBooking(bookingId)
    }
  }, [user, bookingId, router])

  const fetchLatestBooking = async () => {
    try {
      setIsLoading(true)
      const response = await apiService.getUserBookings()
      if (response.success && response.data?.bookings && response.data.bookings.length > 0) {
        // Get the most recent booking
        const latestBooking = response.data.bookings[0]
        setBooking(latestBooking)
      }
    } catch (error) {
      console.error('Error fetching latest booking:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchBooking = async (id: string) => {
    try {
      setIsLoading(true)
      const response = await apiService.getUserBookings()
      if (response.success && response.data?.bookings) {
        const foundBooking = response.data.bookings.find((b: any) => b.id === id)
        if (foundBooking) {
          setBooking(foundBooking)
        } else {
          // If not found, try fetching all bookings again
          fetchLatestBooking()
        }
      }
    } catch (error) {
      console.error('Error fetching booking:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading booking details...</p>
        </div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Booking Not Found</h1>
          <p className="text-gray-600 mb-6">We couldn't find your booking details.</p>
          <Link
            href="/profile?tab=bookings"
            className="inline-flex items-center px-6 py-3 bg-accent-500 text-white rounded-lg hover:bg-accent-600 font-semibold"
          >
            View My Bookings
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </div>
    )
  }

  const startDate = booking.start_time ? new Date(booking.start_time) : null
  const endDate = booking.end_time ? new Date(booking.end_time) : null
  const property = booking.property || {}
  const coverPhoto = property.photos?.[0] 
    ? (typeof property.photos[0] === 'string' ? property.photos[0] : property.photos[0]?.url)
    : null

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
          <p className="text-lg text-gray-600">Your parking reservation has been successfully created</p>
        </div>

        {/* Booking Details Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          {coverPhoto && (
            <div className="h-48 w-full overflow-hidden">
              <img
                src={coverPhoto}
                alt={property.title || 'Property'}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          <div className="p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">{property.title || 'Parking Space'}</h2>
            
            <div className="space-y-4">
              {/* Address */}
              <div className="flex items-start">
                <MapPin className="h-5 w-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="text-gray-900">{property.address || 'Address not available'}</p>
                </div>
              </div>

              {/* Date & Time */}
              {startDate && endDate && (
                <>
                  <div className="flex items-start">
                    <Calendar className="h-5 w-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-500">Date</p>
                      <p className="text-gray-900">
                        {startDate.toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <Clock className="h-5 w-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-500">Time</p>
                      <p className="text-gray-900">
                        {startDate.toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit',
                          hour12: true 
                        })} - {endDate.toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit',
                          hour12: true 
                        })}
                      </p>
                      {booking.total_hours && (
                        <p className="text-sm text-gray-500 mt-1">
                          {booking.total_hours} {booking.total_hours === 1 ? 'hour' : 'hours'}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Payment */}
              {booking.total_amount && (
                <div className="flex items-start">
                  <DollarSign className="h-5 w-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500">Total Paid</p>
                    <p className="text-gray-900 font-semibold text-lg">${booking.total_amount.toFixed(2)}</p>
                  </div>
                </div>
              )}

              {/* Status */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Status</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    booking.status === 'confirmed' 
                      ? 'bg-green-100 text-green-800'
                      : booking.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {booking.status === 'confirmed' ? 'Confirmed' : 
                     booking.status === 'pending' ? 'Pending' : 
                     booking.status || 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/profile?tab=bookings"
            className="flex-1 flex items-center justify-center px-6 py-3 bg-accent-500 text-white rounded-lg hover:bg-accent-600 font-semibold transition-colors"
          >
            View All Bookings
            <ExternalLink className="ml-2 h-5 w-5" />
          </Link>
          <Link
            href="/find-parking"
            className="flex-1 flex items-center justify-center px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
          >
            Book Another Space
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>

        {/* Help Text */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            A confirmation email has been sent to {user?.email || 'your email address'}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <BookingSuccessContent />
    </Suspense>
  )
}

