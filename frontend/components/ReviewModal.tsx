'use client'

import { useState } from 'react'
import { X, Star } from 'lucide-react'
import { apiService } from '../services/api'
import toast from 'react-hot-toast'

interface ReviewModalProps {
  isOpen: boolean
  onClose: () => void
  bookingId: string
  propertyTitle?: string
  reviewedUserName?: string
  onReviewSubmitted?: () => void
}

export function ReviewModal({
  isOpen,
  onClose,
  bookingId,
  propertyTitle = 'this property',
  reviewedUserName = 'this user',
  onReviewSubmitted,
}: ReviewModalProps) {
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState('')
  const [cleanliness, setCleanliness] = useState(0)
  const [communication, setCommunication] = useState(0)
  const [checkIn, setCheckIn] = useState(0)
  const [accuracy, setAccuracy] = useState(0)
  const [value, setValue] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (rating === 0) {
      toast.error('Please select a rating')
      return
    }

    setIsSubmitting(true)

    try {
      await apiService.createReview({
        bookingId,
        rating,
        comment: comment.trim() || undefined,
        cleanliness: cleanliness > 0 ? cleanliness : undefined,
        communication: communication > 0 ? communication : undefined,
        checkIn: checkIn > 0 ? checkIn : undefined,
        accuracy: accuracy > 0 ? accuracy : undefined,
        value: value > 0 ? value : undefined,
      })

      toast.success('Review submitted successfully!')
      
      // Reset form
      setRating(0)
      setComment('')
      setCleanliness(0)
      setCommunication(0)
      setCheckIn(0)
      setAccuracy(0)
      setValue(0)

      onReviewSubmitted?.()
      onClose()
    } catch (error: any) {
      console.error('Error submitting review:', error)
      toast.error(error.message || 'Failed to submit review')
    } finally {
      setIsSubmitting(false)
    }
  }

  const StarRating = ({
    rating,
    onRatingChange,
    onHover,
    label,
  }: {
    rating: number
    onRatingChange: (rating: number) => void
    onHover: (rating: number) => void
    label: string
  }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange(star)}
            onMouseEnter={() => onHover(star)}
            onMouseLeave={() => onHover(0)}
            className="focus:outline-none transition-colors"
          >
            <Star
              className={`h-6 w-6 ${
                star <= (hoveredRating || rating)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 text-sm text-gray-600">{rating}/5</span>
        )}
      </div>
    </div>
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Leave a Review</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Overall Rating */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Overall Rating <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="focus:outline-none transition-colors"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= (hoveredRating || rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
                {rating > 0 && (
                  <span className="ml-3 text-lg font-medium text-gray-700">
                    {rating}/5
                  </span>
                )}
              </div>
            </div>

            {/* Comment */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Review
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent resize-none"
                placeholder={`Share your experience with ${reviewedUserName}...`}
              />
            </div>

            {/* Detailed Ratings (Optional) */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-3">Detailed Ratings (Optional)</p>
              <div className="space-y-3">
                <StarRating
                  rating={cleanliness}
                  onRatingChange={setCleanliness}
                  onHover={setHoveredRating}
                  label="Cleanliness"
                />
                <StarRating
                  rating={communication}
                  onRatingChange={setCommunication}
                  onHover={setHoveredRating}
                  label="Communication"
                />
                <StarRating
                  rating={checkIn}
                  onRatingChange={setCheckIn}
                  onHover={setHoveredRating}
                  label="Check-in Process"
                />
                <StarRating
                  rating={accuracy}
                  onRatingChange={setAccuracy}
                  onHover={setHoveredRating}
                  label="Accuracy"
                />
                <StarRating
                  rating={value}
                  onRatingChange={setValue}
                  onHover={setHoveredRating}
                  label="Value"
                />
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || rating === 0}
                className="flex-1 px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}



