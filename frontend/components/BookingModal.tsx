'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, Clock, DollarSign, Car, AlertCircle, CheckCircle, CreditCard } from 'lucide-react'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { loadStripe, Stripe } from '@stripe/stripe-js'
import { apiService } from '@/services/api'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise: Promise<Stripe | null> | null = publishableKey ? loadStripe(publishableKey) : null

interface PriceBreakdown {
  hours: number
  hourlyRate: number
  subtotal: number
  bookerServiceFee: number
  hostServiceFee: number
  total: number
}

interface PaymentFormProps {
  bookingId: string
  paymentIntentId: string | null
  priceBreakdown: PriceBreakdown | null
  onBack: () => Promise<void> | void
  onPaymentSuccess: () => void
}

function PaymentForm({
  bookingId,
  paymentIntentId,
  priceBreakdown,
  onBack,
  onPaymentSuccess,
}: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [isElementReady, setIsElementReady] = useState(false)

  const handlePayment = async () => {
    if (!stripe || !elements) {
      toast.error('Payment system not ready')
      return
    }

    if (!isElementReady) {
      toast.error('Payment form is still loading')
      return
    }

    setIsProcessingPayment(true)

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/profile?payment_success=true`,
        },
        redirect: 'if_required',
      })

      if (error) {
        toast.error(error.message || 'Payment failed')
        return
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        const intentId = paymentIntentId || paymentIntent.id
        await apiService.confirmPayment(intentId, bookingId)

        toast.success('Payment successful! Your booking is confirmed.')
        onPaymentSuccess()
      }
    } catch (error: any) {
      console.error('Error processing payment:', error)
      toast.error(error.message || 'Payment processing failed')
    } finally {
      setIsProcessingPayment(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="bg-sand-100 border border-sand-200 rounded-lg p-4">
        <h3 className="font-semibold text-primary-800 mb-2 flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          Booking Created
        </h3>
        <p className="text-sm text-primary-700">
          Your booking has been created. Please complete payment to confirm.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Payment Information
          </h3>
          <div className="border border-gray-200 rounded-lg p-4">
            <PaymentElement onReady={() => setIsElementReady(true)} />
          </div>
        </div>

        {priceBreakdown && (
          <div className="bg-mist-200 rounded-lg p-4 border border-mist-200">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-accent-600" />
              Payment Summary
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">
                  {priceBreakdown.hours} hour{priceBreakdown.hours !== 1 ? 's' : ''} × ${priceBreakdown.hourlyRate}/hour
                </span>
                <span className="font-medium">${priceBreakdown.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Service Fee (5%)</span>
                <span className="font-medium">${priceBreakdown.bookerServiceFee.toFixed(2)}</span>
              </div>
              <div className="border-t border-mist-200 pt-2 mt-2 flex justify-between">
                <span className="font-bold text-gray-900">Total</span>
                <span className="font-bold text-accent-600 text-lg">${priceBreakdown.total.toFixed(2)}</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Hosts also contribute a 5% plekk service fee from their payout.
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={async () => {
              await onBack()
            }}
            className="flex-1 px-4 py-3 text-gray-700 border border-mist-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isProcessingPayment}
          >
            Back
          </button>
          <button
            type="button"
            onClick={handlePayment}
            disabled={isProcessingPayment || !stripe || !isElementReady}
            className="flex-1 px-4 py-3 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
          >
            {isProcessingPayment ? 'Processing...' : 'Pay Now'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface BookingModalProps {
  property: any
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function BookingModal({ property, isOpen, onClose, onSuccess }: BookingModalProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [vehicleInfo, setVehicleInfo] = useState('')
  const [specialRequests, setSpecialRequests] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [step, setStep] = useState<'booking' | 'payment'>('booking')
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)
  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdown | null>(null)

  // Calculate price breakdown when dates/times change
  useEffect(() => {
    if (startDate && startTime && endDate && endTime && property?.hourly_rate) {
      const start = new Date(`${startDate}T${startTime}`)
      const end = new Date(`${endDate}T${endTime}`)
      
      if (end > start) {
        const diffMs = end.getTime() - start.getTime()
        const hours = Math.ceil(diffMs / (1000 * 60 * 60)) // Round up to nearest hour
        const hourlyRate = property.hourly_rate
        const subtotal = Math.round(hours * hourlyRate * 100) / 100
        const bookerServiceFee = Math.round(subtotal * 0.05 * 100) / 100 // 5% service fee for booker
        const hostServiceFee = Math.round(subtotal * 0.05 * 100) / 100 // 5% service fee for host (deducted from payout)
        const total = Math.round((subtotal + bookerServiceFee) * 100) / 100

        setPriceBreakdown({
          hours,
          hourlyRate,
          subtotal,
          bookerServiceFee,
          hostServiceFee,
          total,
        })
      } else {
        setPriceBreakdown(null)
      }
    } else {
      setPriceBreakdown(null)
    }
  }, [startDate, startTime, endDate, endTime, property?.hourly_rate])

  // Set default times
  useEffect(() => {
    if (isOpen && !startTime) {
      const now = new Date()
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      setStartTime(`${hours}:${minutes}`)
      
      // Default to 2 hours later
      const endTimeDate = new Date(now.getTime() + 2 * 60 * 60 * 1000)
      const endHours = String(endTimeDate.getHours()).padStart(2, '0')
      const endMinutes = String(endTimeDate.getMinutes()).padStart(2, '0')
      setEndTime(`${endHours}:${endMinutes}`)
    }
  }, [isOpen, startTime])

  // Set today as minimum date
  const today = new Date().toISOString().split('T')[0]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast.error('Please sign in to book a parking spot')
      router.push('/auth/signin')
      return
    }

    if (!startDate || !startTime || !endDate || !endTime) {
      toast.error('Please select start and end dates and times')
      return
    }

    const startDateTime = new Date(`${startDate}T${startTime}`)
    const endDateTime = new Date(`${endDate}T${endTime}`)

    if (endDateTime <= startDateTime) {
      toast.error('End time must be after start time')
      return
    }

    if (startDateTime < new Date()) {
      toast.error('Start time cannot be in the past')
      return
    }

    setIsSubmitting(true)

    try {
      // Step 1: Create booking
      const bookingResponse = await apiService.createBooking({
        propertyId: property.id,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        vehicleInfo: vehicleInfo || null,
        specialRequests: specialRequests || null,
      })

      if (!bookingResponse.success) {
        throw new Error(bookingResponse.error || 'Failed to create booking')
      }

      const booking = bookingResponse.data
      if (!booking) {
        throw new Error('Booking created but no data returned')
      }

      setBookingId(booking.id)

      // Step 2: Create payment intent
      const paymentResponse = await apiService.createPaymentIntent(booking.id)

      if (!paymentResponse.success) {
        toast.error(paymentResponse.error || 'Unable to start payment. Your booking was cancelled.')
        
        try {
          await apiService.cancelBooking(booking.id)
        } catch (cancelError) {
          console.error('Failed to cancel booking after payment setup error:', cancelError)
        }

        setBookingId(null)
        setClientSecret(null)
        setPaymentIntentId(null)
        setStep('booking')
        return
      }

      const clientSecret = (paymentResponse as any).clientSecret ?? paymentResponse.data?.clientSecret ?? null
      const paymentId = (paymentResponse as any).paymentIntentId ?? paymentResponse.data?.paymentIntentId ?? null

      if (!clientSecret) {
        toast.error('Payment setup did not return a client secret. Booking was cancelled.')
        try {
          await apiService.cancelBooking(booking.id)
        } catch (cancelError) {
          console.error('Failed to cancel booking after missing client secret:', cancelError)
        }
        setBookingId(null)
        setClientSecret(null)
        setPaymentIntentId(null)
        setStep('booking')
        return
      }

      setClientSecret(clientSecret)
      setPaymentIntentId(paymentId)
      setStep('payment') // Move to payment step
      toast.success('Booking created! Please complete payment.')
    } catch (error: any) {
      console.error('Error creating booking:', error)
      toast.error(error.message || 'Failed to create booking. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReturnToBooking = async () => {
    if (bookingId) {
      try {
        await apiService.cancelBooking(bookingId)
      } catch (error) {
        console.error('Failed to cancel booking when returning to edit:', error)
      }
    }
    setBookingId(null)
    setClientSecret(null)
    setPaymentIntentId(null)
    setStep('booking')
  }

  const handleClose = async () => {
    if (step === 'payment' && bookingId) {
      try {
        await apiService.cancelBooking(bookingId)
      } catch (error) {
        console.error('Failed to cancel booking when closing modal:', error)
      }
      setBookingId(null)
      setClientSecret(null)
      setPaymentIntentId(null)
      setStep('booking')
    }
    onClose()
  }

  const rawCoverPhoto = property?.photos?.[0] as string | { url?: string } | undefined
  const coverPhoto = typeof rawCoverPhoto === 'string' ? rawCoverPhoto : rawCoverPhoto?.url

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="relative overflow-hidden border-b border-gray-200">
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 z-20 text-white/80 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          {coverPhoto ? (
            <div className="relative h-48 w-full">
              <img
                src={coverPhoto}
                alt={property?.title || 'Property photo'}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-6 py-4">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pr-12">
                  <div className="max-w-xl">
                    <p className="text-sm sm:text-base font-semibold text-white leading-snug">
                      {property?.address || 'Address unavailable'}
                    </p>
                  </div>
                  <div className="sm:text-right text-white">
                    <p className="text-lg sm:text-xl font-bold whitespace-nowrap">
                      {property?.hourly_rate ? `$${property.hourly_rate}/hour` : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Content */}
        {step === 'booking' ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Date and Time Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={today}
                required
                className="w-full px-3 py-2 border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="h-4 w-4 inline mr-1" />
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full px-3 py-2 border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || today}
                required
                className="w-full px-3 py-2 border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="h-4 w-4 inline mr-1" />
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full px-3 py-2 border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent"
              />
            </div>
          </div>

          {/* Vehicle Info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Car className="h-4 w-4 inline mr-1" />
              Vehicle Information (Optional)
            </label>
            <input
              type="text"
              value={vehicleInfo}
              onChange={(e) => setVehicleInfo(e.target.value)}
              placeholder="e.g., Blue Honda Civic, License Plate: ABC123"
              className="w-full px-3 py-2 border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent"
            />
          </div>

          {/* Special Requests */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Special Requests (Optional)
            </label>
            <textarea
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="Any special requests or notes for the host..."
              rows={3}
              className="w-full px-3 py-2 border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent"
            />
          </div>

          {/* Price Breakdown */}
          {priceBreakdown && (
            <div className="bg-mist-200 rounded-lg p-4 border border-mist-200">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-accent-600" />
                Price Breakdown
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {priceBreakdown.hours} hour{priceBreakdown.hours !== 1 ? 's' : ''} × ${priceBreakdown.hourlyRate}/hour
                  </span>
                  <span className="font-medium">${priceBreakdown.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Service Fee (5%)</span>
                  <span className="font-medium">${priceBreakdown.bookerServiceFee.toFixed(2)}</span>
                </div>
                <div className="border-t border-mist-200 pt-2 mt-2 flex justify-between">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-bold text-accent-600 text-lg">${priceBreakdown.total.toFixed(2)}</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Hosts pay an additional 5% plekk service fee from their payout.
              </p>
            </div>
          )}

          {/* Info Note */}
          {property?.instant_booking ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-green-800">
                This property allows instant booking. Your booking will be confirmed immediately upon payment.
              </p>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start">
              <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-yellow-800">
                This property requires host approval. Your booking request will be sent to the host for review.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 text-gray-700 border border-mist-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !priceBreakdown}
              className="flex-1 px-4 py-3 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              {isSubmitting ? 'Processing...' : 'Continue to Payment'}
            </button>
          </div>
        </form>
        ) : (
          clientSecret && bookingId ? (
            stripePromise ? (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: { theme: 'stripe' },
                }}
                key={clientSecret}
              >
                <PaymentForm
                  bookingId={bookingId}
                  paymentIntentId={paymentIntentId}
                  priceBreakdown={priceBreakdown}
                  onBack={handleReturnToBooking}
                  onPaymentSuccess={async () => {
                    setBookingId(null)
                    setClientSecret(null)
                    setPaymentIntentId(null)
                    setStep('booking')
                    onSuccess?.()
                    onClose()
                    router.push('/profile')
                  }}
                />
              </Elements>
            ) : (
              <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">
                    Stripe publishable key is missing. Please configure <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>.
                  </p>
                </div>
              </div>
            )
          ) : (
            <div className="p-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  Preparing payment details...
                </p>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}

