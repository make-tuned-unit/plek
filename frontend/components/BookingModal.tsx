'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, Clock, DollarSign, Car, AlertCircle, CheckCircle } from 'lucide-react'
import { apiService } from '@/services/api'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

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
  const [priceBreakdown, setPriceBreakdown] = useState<{
    hours: number
    hourlyRate: number
    subtotal: number
    serviceFee: number
    securityDeposit: number
    total: number
  } | null>(null)

  // Calculate price breakdown when dates/times change
  useEffect(() => {
    if (startDate && startTime && endDate && endTime && property?.hourly_rate) {
      const start = new Date(`${startDate}T${startTime}`)
      const end = new Date(`${endDate}T${endTime}`)
      
      if (end > start) {
        const diffMs = end.getTime() - start.getTime()
        const hours = Math.ceil(diffMs / (1000 * 60 * 60)) // Round up to nearest hour
        const hourlyRate = property.hourly_rate
        const subtotal = hours * hourlyRate
        const serviceFee = Math.round(subtotal * 0.1) // 10% service fee
        const securityDeposit = Math.round(subtotal * 0.2) // 20% security deposit
        const total = subtotal + serviceFee + securityDeposit

        setPriceBreakdown({
          hours,
          hourlyRate,
          subtotal,
          serviceFee,
          securityDeposit,
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
      const response = await apiService.createBooking({
        propertyId: property.id,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        vehicleInfo: vehicleInfo || null,
        specialRequests: specialRequests || null,
      })

      if (response.success) {
        toast.success(response.message || 'Booking created successfully!')
        onSuccess?.()
        onClose()
        // Redirect to bookings page or profile
        router.push('/profile')
      } else {
        throw new Error(response.error || 'Failed to create booking')
      }
    } catch (error: any) {
      console.error('Error creating booking:', error)
      toast.error(error.message || 'Failed to create booking. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Book Parking</h2>
            <p className="text-sm text-gray-600 mt-1">{property?.title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Property Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600">Address</p>
                <p className="font-medium text-gray-900">{property?.address}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Rate</p>
                <p className="font-bold text-blue-600 text-lg">${property?.hourly_rate}/hour</p>
              </div>
            </div>
          </div>

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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Price Breakdown */}
          {priceBreakdown && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-blue-600" />
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
                  <span className="text-gray-600">Service Fee (10%)</span>
                  <span className="font-medium">${priceBreakdown.serviceFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Security Deposit (20%)</span>
                  <span className="font-medium">${priceBreakdown.securityDeposit.toFixed(2)}</span>
                </div>
                <div className="border-t border-blue-200 pt-2 mt-2 flex justify-between">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-bold text-blue-600 text-lg">${priceBreakdown.total.toFixed(2)}</span>
                </div>
              </div>
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
              className="flex-1 px-4 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !priceBreakdown}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              {isSubmitting ? 'Processing...' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

