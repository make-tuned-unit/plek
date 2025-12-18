'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, X, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react'
import { apiService } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function IdentityVerificationPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [documentType, setDocumentType] = useState<'drivers_license' | 'passport' | 'other'>('drivers_license')
  const [frontImage, setFrontImage] = useState<File | null>(null)
  const [backImage, setBackImage] = useState<File | null>(null)
  const [frontPreview, setFrontPreview] = useState<string | null>(null)
  const [backPreview, setBackPreview] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const frontInputRef = useRef<HTMLInputElement>(null)
  const backInputRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = (
    file: File,
    type: 'front' | 'back',
    setImage: (file: File | null) => void,
    setPreview: (url: string | null) => void
  ) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }

    setImage(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('photo', file)
    formData.append('type', 'verification')

    const token = localStorage.getItem('auth_token')
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/upload/photo`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      }
    )

    if (!response.ok) {
      throw new Error('Failed to upload image')
    }

    const data = await response.json()
    return data.data?.url || data.url
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!frontImage) {
      toast.error('Please upload the front of your ID')
      return
    }

    setIsSubmitting(true)

    try {
      // Upload images
      toast.loading('Uploading images...', { id: 'upload' })
      const frontImageUrl = await uploadImage(frontImage)
      let backImageUrl: string | undefined

      if (backImage) {
        backImageUrl = await uploadImage(backImage)
      }

      toast.dismiss('upload')

      // Submit verification
      toast.loading('Submitting verification...', { id: 'submit' })
      const response = await apiService.submitIdentityVerification({
        documentType,
        frontImageUrl,
        backImageUrl,
        notes: notes || undefined,
      })

      toast.dismiss('submit')

      if (response.success) {
        toast.success('Identity verification submitted! Admin will review within 24-48 hours.')
        router.push('/profile?tab=verification')
      } else {
        throw new Error(response.error || 'Failed to submit verification')
      }
    } catch (error: any) {
      console.error('Error submitting verification:', error)
      toast.error(error.message || 'Failed to submit verification')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/profile?tab=verification"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Profile
        </Link>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Identity Verification</h1>
          <p className="text-gray-600 mb-6">
            Upload a government-issued ID to verify your identity. This helps build trust with other users.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Document Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Type *
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent"
                required
              >
                <option value="drivers_license">Driver's License</option>
                <option value="passport">Passport</option>
                <option value="other">Other Government ID</option>
              </select>
            </div>

            {/* Front Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Front of ID *
              </label>
              {frontPreview ? (
                <div className="relative">
                  <img
                    src={frontPreview}
                    alt="Front of ID"
                    className="w-full max-w-md h-64 object-contain border border-gray-300 rounded-lg bg-gray-50"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setFrontImage(null)
                      setFrontPreview(null)
                    }}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => frontInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-accent-400 transition-colors"
                >
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Click to upload front of ID</p>
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG, or WebP (max 5MB)</p>
                </div>
              )}
              <input
                ref={frontInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    handleImageSelect(file, 'front', setFrontImage, setFrontPreview)
                  }
                }}
                className="hidden"
                required
              />
            </div>

            {/* Back Image (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Back of ID (Optional)
              </label>
              {backPreview ? (
                <div className="relative">
                  <img
                    src={backPreview}
                    alt="Back of ID"
                    className="w-full max-w-md h-64 object-contain border border-gray-300 rounded-lg bg-gray-50"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setBackImage(null)
                      setBackPreview(null)
                    }}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => backInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-accent-400 transition-colors"
                >
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Click to upload back of ID (if applicable)</p>
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG, or WebP (max 5MB)</p>
                </div>
              )}
              <input
                ref={backInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    handleImageSelect(file, 'back', setBackImage, setBackPreview)
                  }
                }}
                className="hidden"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent"
                placeholder="Any additional information that might help with verification..."
              />
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Privacy & Security</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-700">
                    <li>Your ID documents are stored securely and encrypted</li>
                    <li>Only verified admins can view your documents</li>
                    <li>Documents are used solely for identity verification</li>
                    <li>Review typically takes 24-48 hours</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !frontImage}
                className="flex-1 px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isSubmitting ? 'Submitting...' : 'Submit for Review'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

