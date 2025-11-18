'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, Clock, DollarSign, Car, AlertCircle, CheckCircle, CreditCard, MapPin } from 'lucide-react'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { loadStripe, Stripe } from '@stripe/stripe-js'
import { apiService } from '@/services/api'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { ModernDatePicker } from '@/components/ModernDatePicker'
import { TimePicker } from '@/components/TimePicker'

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
    <div className="p-6 md:p-8 space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-center mb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-accent-500 text-white flex items-center justify-center font-semibold text-sm">
              ✓
            </div>
            <span className="ml-2 text-sm font-medium text-gray-500">Date & Time</span>
          </div>
          <div className="h-px w-8 bg-accent-500 mx-2" />
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-accent-500 text-white flex items-center justify-center font-semibold text-sm">
              ✓
            </div>
            <span className="ml-2 text-sm font-medium text-gray-500">Details</span>
          </div>
          <div className="h-px w-8 bg-accent-500 mx-2" />
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-accent-500 text-white flex items-center justify-center font-semibold text-sm">
              3
            </div>
            <span className="ml-2 text-sm font-medium text-gray-900">Payment</span>
          </div>
        </div>
      </div>

      {/* Success Banner */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start">
          <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-green-900 mb-1">Booking Created</h3>
            <p className="text-sm text-green-800">
              Your booking has been created. Complete payment to confirm your spot.
            </p>
          </div>
        </div>
      </div>

      {/* Price Summary - Prominent */}
      {priceBreakdown && (
        <div className="bg-gradient-to-br from-accent-500 to-accent-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              Payment Summary
            </h3>
            <div className="text-right">
              <div className="text-3xl font-bold">${priceBreakdown.total.toFixed(2)}</div>
              <div className="text-sm text-accent-100">Total</div>
            </div>
          </div>
          <div className="bg-white/10 rounded-lg p-4 space-y-2 text-sm backdrop-blur-sm">
            <div className="flex justify-between">
              <span className="text-accent-100">
                {priceBreakdown.hours} hour{priceBreakdown.hours !== 1 ? 's' : ''} × ${priceBreakdown.hourlyRate}/hour
              </span>
              <span className="font-medium">${priceBreakdown.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-accent-100">Service Fee (5%)</span>
              <span className="font-medium">${priceBreakdown.bookerServiceFee.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Payment Form */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center">
            <CreditCard className="h-5 w-5 mr-2 text-accent-500" />
            Payment Information
          </h3>
          <div className="border border-gray-200 rounded-lg p-5 bg-white">
            <PaymentElement onReady={() => setIsElementReady(true)} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={async () => {
              await onBack()
            }}
            className="flex-1 px-6 py-3 text-gray-700 border border-mist-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            disabled={isProcessingPayment}
          >
            Back
          </button>
          <button
            type="button"
            onClick={handlePayment}
            disabled={isProcessingPayment || !stripe || !isElementReady}
            className="flex-1 px-6 py-3 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold shadow-lg shadow-accent-500/25 hover:shadow-accent-500/40"
          >
            {isProcessingPayment ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing Payment...
              </span>
            ) : (
              'Pay Now'
            )}
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
  const [isMultiDay, setIsMultiDay] = useState(false)
  const [vehicleInfo, setVehicleInfo] = useState('')
  const [specialRequests, setSpecialRequests] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [step, setStep] = useState<'date-time' | 'details' | 'payment'>('date-time')
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)
  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdown | null>(null)

  // Calculate price breakdown when dates/times change
  useEffect(() => {
    if (startDate && startTime && property?.hourly_rate) {
      // For single-day bookings, use startDate for endDate
      const effectiveEndDate = isMultiDay && endDate ? endDate : startDate
      const effectiveEndTime = endTime || startTime

      if (!effectiveEndTime) {
        setPriceBreakdown(null)
        return
      }

      const start = new Date(`${startDate}T${startTime}`)
      const end = new Date(`${effectiveEndDate}T${effectiveEndTime}`)
      
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
  }, [startDate, startTime, endDate, endTime, isMultiDay, property?.hourly_rate])

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('date-time')
      setIsMultiDay(false)
      setEndDate('')
      setEndTime('')
      setVehicleInfo('')
      setSpecialRequests('')
      
      // Set default start time to now (rounded to next 15 minutes)
      const now = new Date()
      const roundedMinutes = Math.ceil(now.getMinutes() / 15) * 15
      const startHours = roundedMinutes >= 60 ? now.getHours() + 1 : now.getHours()
      const finalStartMinutes = roundedMinutes >= 60 ? 0 : roundedMinutes
      const hours = String(startHours % 24).padStart(2, '0')
      const minutes = String(finalStartMinutes).padStart(2, '0')
      setStartTime(`${hours}:${minutes}`)
      
      // Default end time to 2 hours later
      const endTimeDate = new Date(now.getTime() + 2 * 60 * 60 * 1000)
      const endRoundedMinutes = Math.ceil(endTimeDate.getMinutes() / 15) * 15
      const endHoursCalc = endRoundedMinutes >= 60 ? endTimeDate.getHours() + 1 : endTimeDate.getHours()
      const finalEndMinutes = endRoundedMinutes >= 60 ? 0 : endRoundedMinutes
      const endHours = String(endHoursCalc % 24).padStart(2, '0')
      const endMinutes = String(finalEndMinutes).padStart(2, '0')
      setEndTime(`${endHours}:${endMinutes}`)
    }
  }, [isOpen])

  // Set today as minimum date
  const today = new Date().toISOString().split('T')[0]

  const handleDateTimeNext = () => {
    if (!startDate || !startTime) {
      toast.error('Please select a date and start time')
      return
    }

    if (!isMultiDay && !endTime) {
      toast.error('Please select an end time')
      return
    }

    if (isMultiDay && (!endDate || !endTime)) {
      toast.error('Please select end date and time for multi-day booking')
      return
    }

    // Validate times
    const effectiveEndDate = isMultiDay && endDate ? endDate : startDate
    const effectiveEndTime = endTime || startTime
    const startDateTime = new Date(`${startDate}T${startTime}`)
    const endDateTime = new Date(`${effectiveEndDate}T${effectiveEndTime}`)

    if (endDateTime <= startDateTime) {
      toast.error('End time must be after start time')
      return
    }

    if (startDateTime < new Date()) {
      toast.error('Start time cannot be in the past')
      return
    }

    setStep('details')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast.error('Please sign in to book a parking spot')
      router.push('/auth/signin')
      return
    }

    const effectiveEndDate = isMultiDay && endDate ? endDate : startDate
    const effectiveEndTime = endTime || startTime

    if (!startDate || !startTime || !effectiveEndTime) {
      toast.error('Please complete all required fields')
      return
    }

    const startDateTime = new Date(`${startDate}T${startTime}`)
    const endDateTime = new Date(`${effectiveEndDate}T${effectiveEndTime}`)

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
    setStep('date-time')
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
      setStep('date-time')
    }
    onClose()
  }

  const rawCoverPhoto = property?.photos?.[0] as string | { url?: string } | undefined
  const coverPhoto = typeof rawCoverPhoto === 'string' ? rawCoverPhoto : rawCoverPhoto?.url

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full my-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header - Compact */}
        <div className="relative overflow-hidden border-b border-gray-200">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-20 h-8 w-8 flex items-center justify-center rounded-full bg-white/90 hover:bg-white text-gray-600 hover:text-gray-900 transition-all shadow-lg"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
          {coverPhoto ? (
            <div className="relative h-32 w-full">
              <img
                src={coverPhoto}
                alt={property?.title || 'Property photo'}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
          ) : (
            <div className="h-20 bg-gradient-to-br from-accent-500 to-accent-600" />
          )}
        </div>

        {/* Content */}
        {step === 'date-time' ? (
          <div className="p-6 space-y-6">
          {/* Step Indicator */}
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-accent-500 text-white flex items-center justify-center font-semibold text-sm">
                  1
                </div>
                <span className="ml-2 text-sm font-medium text-gray-900">Date & Time</span>
              </div>
              <div className="h-px w-8 bg-gray-300 mx-2" />
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-semibold text-sm">
                  2
                </div>
                <span className="ml-2 text-sm text-gray-500">Details</span>
              </div>
              <div className="h-px w-8 bg-gray-300 mx-2" />
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-semibold text-sm">
                  3
                </div>
                <span className="ml-2 text-sm text-gray-500">Payment</span>
              </div>
            </div>
          </div>

          {/* Property Summary - Compact */}
          <div className="bg-gradient-to-br from-accent-50 to-mist-50 rounded-xl p-4 border border-accent-100">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-gray-900 mb-1">{property?.title || 'Parking Space'}</h3>
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                  <span className="truncate">{property?.address || 'Address unavailable'}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-accent-600 font-bold text-lg">
                  ${property?.hourly_rate || 0}
                </span>
                <span className="text-gray-600 text-xs ml-1">/hour</span>
              </div>
            </div>
          </div>

          {/* Date and Time Selection */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center">
              <Clock className="h-5 w-5 mr-2 text-accent-500" />
              When do you need parking?
            </h3>
            
            <div className="space-y-4">
              {/* Date */}
              <ModernDatePicker
                value={startDate}
                onChange={setStartDate}
                min={today}
                label="Date"
                required
              />

              {/* Start and End Time - Same Row */}
              <div className="grid grid-cols-2 gap-4">
                <TimePicker
                  value={startTime}
                  onChange={(newStartTime) => {
                    setStartTime(newStartTime)
                    // If end time is before or equal to new start time, clear it
                    if (endTime && newStartTime) {
                      const [startHours, startMinutes] = newStartTime.split(':').map(Number)
                      const [endHours, endMinutes] = endTime.split(':').map(Number)
                      const startTotal = startHours * 60 + startMinutes
                      const endTotal = endHours * 60 + endMinutes
                      if (endTotal <= startTotal) {
                        setEndTime('')
                      }
                    }
                  }}
                  label="Start Time"
                  required
                />
                <TimePicker
                  value={endTime}
                  onChange={setEndTime}
                  label="End Time"
                  required
                  minTime={startTime || undefined}
                />
              </div>

              {/* Multi-day Checkbox */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="multi-day"
                  checked={isMultiDay}
                  onChange={(e) => {
                    setIsMultiDay(e.target.checked)
                    if (!e.target.checked) {
                      setEndDate('')
                    }
                  }}
                  className="h-4 w-4 text-accent-500 focus:ring-accent-400 border-gray-300 rounded"
                />
                <label htmlFor="multi-day" className="ml-2 text-sm text-gray-700 cursor-pointer">
                  Multi-day booking
                </label>
              </div>

              {/* End Date - Only show when multi-day is checked */}
              {isMultiDay && (
                <ModernDatePicker
                  value={endDate}
                  onChange={setEndDate}
                  min={startDate || today}
                  label="End Date"
                  required
                />
              )}
            </div>
          </div>

          {/* Price Preview */}
          {priceBreakdown && (
            <div className="bg-accent-50 rounded-xl p-4 border border-accent-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Estimated Total</p>
                  <p className="text-2xl font-bold text-accent-600">${priceBreakdown.total.toFixed(2)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {priceBreakdown.hours} hour{priceBreakdown.hours !== 1 ? 's' : ''} × ${priceBreakdown.hourlyRate}/hour
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Next Button */}
          <button
            type="button"
            onClick={handleDateTimeNext}
            disabled={!startDate || !startTime || !endTime || (isMultiDay && !endDate)}
            className="w-full px-6 py-3 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold shadow-lg shadow-accent-500/25 hover:shadow-accent-500/40"
          >
            Continue
          </button>
        </div>
        ) : step === 'details' ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Step Indicator */}
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-accent-500 text-white flex items-center justify-center font-semibold text-sm">
                  ✓
                </div>
                <span className="ml-2 text-sm font-medium text-gray-500">Date & Time</span>
              </div>
              <div className="h-px w-8 bg-accent-500 mx-2" />
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-accent-500 text-white flex items-center justify-center font-semibold text-sm">
                  2
                </div>
                <span className="ml-2 text-sm font-medium text-gray-900">Details</span>
              </div>
              <div className="h-px w-8 bg-gray-300 mx-2" />
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-semibold text-sm">
                  3
                </div>
                <span className="ml-2 text-sm text-gray-500">Payment</span>
              </div>
            </div>
          </div>

          {/* Optional Fields */}
          <div className="space-y-4">
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
          </div>

          {/* Price Breakdown */}
          {priceBreakdown && (
            <div className="bg-gradient-to-br from-accent-500 to-accent-600 rounded-xl p-5 text-white shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Booking Summary
                </h3>
                <div className="text-right">
                  <div className="text-3xl font-bold">${priceBreakdown.total.toFixed(2)}</div>
                  <div className="text-sm text-accent-100">Total</div>
                </div>
              </div>
              <div className="bg-white/10 rounded-lg p-3 space-y-1.5 text-sm backdrop-blur-sm">
                <div className="flex justify-between">
                  <span className="text-accent-100">
                    {priceBreakdown.hours} hour{priceBreakdown.hours !== 1 ? 's' : ''} × ${priceBreakdown.hourlyRate}/hour
                  </span>
                  <span className="font-medium">${priceBreakdown.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-accent-100">Service Fee (5%)</span>
                  <span className="font-medium">${priceBreakdown.bookerServiceFee.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Booking Type Info */}
          {(() => {
            // Calculate if booking can be auto-approved based on lead time
            const canAutoApprove = (() => {
              if (property?.require_approval) return false; // Host always requires approval
              if (!startDate || !startTime) return false;
              
              const bookingStart = new Date(`${startDate}T${startTime}`)
              const now = new Date()
              const hoursUntilBooking = (bookingStart.getTime() - now.getTime()) / (1000 * 60 * 60)
              const leadTimeHours = property?.lead_time_hours || 24
              
              return hoursUntilBooking >= leadTimeHours
            })()
            
            return canAutoApprove ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start">
                <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-900 mb-1">Instant Booking</p>
                  <p className="text-sm text-green-800">
                    Your booking will be confirmed immediately upon payment. The host will be notified.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start">
                <AlertCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">Requires Host Approval</p>
                  <p className="text-sm text-blue-800">
                    {startDate && startTime ? (
                      <>
                        This booking requires {property?.lead_time_hours || 24} hours advance notice. 
                        Your booking request will be sent to the host for review after payment.
                      </>
                    ) : (
                      'Your booking request will be sent to the host for review after payment.'
                    )}
                  </p>
                </div>
              </div>
            )
          })()}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setStep('date-time')}
              className="flex-1 px-6 py-3 text-gray-700 border border-mist-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !priceBreakdown}
              className="flex-1 px-6 py-3 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold shadow-lg shadow-accent-500/25 hover:shadow-accent-500/40"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                'Continue to Payment'
              )}
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
                    setStep('date-time')
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

