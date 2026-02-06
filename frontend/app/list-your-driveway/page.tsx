'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  MapPin, 
  DollarSign, 
  Camera, 
  Clock, 
  Shield, 
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Upload,
  X,
  PartyPopper
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { apiService } from '@/services/api'
import toast from 'react-hot-toast'

const propertySchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  address: z.string().min(10, 'Please enter a complete address'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'Province/State is required'),
  zipCode: z.string().min(3, 'Valid postal/zip code is required'),
  propertyType: z.enum(['driveway', 'garage', 'warehouse', 'barn', 'storage', 'other']),
  hourlyRate: z.preprocess((v) => (v === '' || v === undefined || Number.isNaN(v) ? undefined : Number(v)), z.number().min(1, 'Hourly rate must be at least $1').default(1)),
  dailyRate: z.preprocess((v) => (v === '' || v === undefined || Number.isNaN(v) ? undefined : Number(v)), z.number().min(1, 'Daily rate must be at least $1').default(1)),
  maxVehicleSize: z.enum(['compact', 'sedan', 'suv', 'truck', 'any']),
  features: z.array(z.string()).min(1, 'Select at least one feature'),
  availability: z.object({
    monday: z.boolean(),
    tuesday: z.boolean(),
    wednesday: z.boolean(),
    thursday: z.boolean(),
    friday: z.boolean(),
    saturday: z.boolean(),
    sunday: z.boolean(),
  }),
  startTime: z.string(),
  endTime: z.string(),
  requireApproval: z.boolean(),
  leadTimeHours: z.number().min(0, 'Lead time must be 0 or greater').default(24),
})

type PropertyForm = z.infer<typeof propertySchema>

const steps = [
  { id: 1, title: 'Basic Info', description: 'Property details and location' },
  { id: 2, title: 'Pricing', description: 'Set your rates and availability' },
  { id: 3, title: 'Photos', description: 'Upload photos of your space' },
  { id: 4, title: 'Review', description: 'Review and publish your listing' },
]

const features = [
  { id: 'covered', label: 'Covered Parking', icon: '🏠' },
  { id: 'security', label: 'Security Camera', icon: '📹' },
  { id: 'lighting', label: 'Well Lit', icon: '💡' },
  { id: 'access', label: '24/7 Access', icon: '🔑' },
  { id: 'ev', label: 'EV Charging', icon: '⚡' },
  { id: 'wifi', label: 'Free WiFi', icon: '📶' },
  { id: 'guard', label: 'Security Guard', icon: '👮' },
  { id: 'easy', label: 'Easy Access', icon: '🚗' },
]

export default function ListYourDrivewayPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')
  const { user, isLoading: authLoading } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [uploadedImageFiles, setUploadedImageFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [publishedListingId, setPublishedListingId] = useState<string | null>(null)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [editLoadDone, setEditLoadDone] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      const redirectTarget = encodeURIComponent('/list-your-driveway')
      router.replace(`/auth/signup?redirect=${redirectTarget}&host=true`)
    }
  }, [authLoading, user, router])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PropertyForm>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      propertyType: 'driveway',
      maxVehicleSize: 'sedan',
      features: [],
      availability: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: true,
        sunday: true,
      },
      startTime: '00:00',
      endTime: '23:59',
      requireApproval: false,
      leadTimeHours: 24, // Default: 24 hours lead time
    },
  })

  const watchedFeatures = watch('features')

  // Load property for edit mode
  useEffect(() => {
    if (!editId || !user) {
      setEditLoadDone(true)
      return
    }
    let cancelled = false
    apiService.getProperty(editId).then((res) => {
      if (cancelled || !res.success || !res.data?.property) {
        setEditLoadDone(true)
        return
      }
      const p = res.data.property
      const availability = {
        monday: p.monday_available ?? true,
        tuesday: p.tuesday_available ?? true,
        wednesday: p.wednesday_available ?? true,
        thursday: p.thursday_available ?? true,
        friday: p.friday_available ?? true,
        saturday: p.saturday_available ?? true,
        sunday: p.sunday_available ?? true,
      }
      reset({
        title: p.title || '',
        description: p.description || '',
        address: p.address || '',
        city: p.city || '',
        state: p.state || '',
        zipCode: p.zip_code || '',
        propertyType: (p.property_type as PropertyForm['propertyType']) || 'driveway',
        hourlyRate: Number(p.hourly_rate ?? p.price ?? 0) || 1,
        dailyRate: Number(p.daily_rate) || 1,
        maxVehicleSize: (p.max_vehicle_size as PropertyForm['maxVehicleSize']) || 'sedan',
        features: Array.isArray(p.features) ? p.features : [],
        availability,
        startTime: p.start_time ? String(p.start_time).slice(11, 16) : '00:00',
        endTime: p.end_time ? String(p.end_time).slice(11, 16) : '23:59',
        requireApproval: p.require_approval === true,
        leadTimeHours: Number(p.lead_time_hours) ?? 24,
      })
      if (Array.isArray(p.photos) && p.photos.length > 0) {
        setUploadedImages(p.photos.map((ph: { url?: string }) => ph.url).filter(Boolean) as string[])
      }
      setEditLoadDone(true)
    }).catch(() => setEditLoadDone(true))
    return () => { cancelled = true }
  }, [editId, user, reset])

  const handleFeatureToggle = (featureId: string) => {
    const currentFeatures = watchedFeatures || []
    if (currentFeatures.includes(featureId)) {
      setValue('features', currentFeatures.filter(f => f !== featureId))
    } else {
      setValue('features', [...currentFeatures, featureId])
    }
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      const fileList = Array.from(files)
      const newPreviews = fileList.map(file => URL.createObjectURL(file))
      setUploadedImages(prev => [...prev, ...newPreviews])
      setUploadedImageFiles(prev => [...prev, ...fileList])
    }
    event.target.value = ''
  }

  const removeImage = (index: number) => {
    URL.revokeObjectURL(uploadedImages[index])
    setUploadedImages(prev => prev.filter((_, i) => i !== index))
    setUploadedImageFiles(prev => prev.filter((_, i) => i !== index))
  }

  const uploadPhotos = async (propertyId: string, files: File[]): Promise<void> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    if (!token) return
    const apiBase = (() => {
      const url = process.env.NEXT_PUBLIC_API_URL || ''
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        return url.endsWith('/api') ? url.replace(/\/$/, '') : url.replace(/\/$/, '') + '/api'
      }
      return typeof window !== 'undefined' ? `${window.location.origin}/api` : 'http://localhost:8000/api'
    })()
    for (const file of files) {
      const formData = new FormData()
      formData.append('photo', file)
      const res = await fetch(`${apiBase}/properties/${propertyId}/photos`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || err.error || 'Photo upload failed')
      }
    }
  }

  const onSubmit = async (data: PropertyForm) => {
    setIsSubmitting(true)
    setPublishError(null)
    try {
      let coordinates: [number, number] | undefined
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
      const queryParts = [data.address, data.city, data.state, data.zipCode].filter(Boolean).map(String)
      if (token && queryParts.length > 0) {
        try {
          const res = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(queryParts.join(', '))}.json?access_token=${token}&limit=1&types=address,place`
          )
          const geo = await res.json()
          if (geo?.features?.length && geo.features[0].center?.length >= 2) {
            coordinates = geo.features[0].center as [number, number]
          }
        } catch (_) {
          // continue without coordinates
        }
      }

      const availability = data.availability
      const propertyData = {
        title: data.title,
        description: data.description,
        address: data.address,
        city: data.city,
        state: data.state,
        zip_code: data.zipCode,
        price: data.hourlyRate,
        property_type: data.propertyType,
        max_vehicles: 1,
        features: data.features || [],
        restrictions: [],
        require_approval: data.requireApproval,
        instant_booking: !data.requireApproval,
        coordinates: coordinates || undefined,
        start_time: data.startTime,
        end_time: data.endTime,
        monday_available: availability.monday,
        tuesday_available: availability.tuesday,
        wednesday_available: availability.wednesday,
        thursday_available: availability.thursday,
        friday_available: availability.friday,
        saturday_available: availability.saturday,
        sunday_available: availability.sunday,
      }

      let propertyId: string

      if (editId) {
        const response = await apiService.updateProperty(editId, propertyData)
        if (!response.success) {
          throw new Error(response.error || 'Failed to update listing')
        }
        propertyId = editId
        if (uploadedImageFiles.length > 0) {
          await uploadPhotos(propertyId, uploadedImageFiles)
        }
        toast.success('Listing updated!')
        router.push('/profile?tab=listings')
      } else {
        const response = await apiService.createProperty(propertyData)
        if (!response.success || !response.data?.property?.id) {
          throw new Error(response.error || 'Failed to create listing')
        }
        propertyId = response.data.property.id
        if (uploadedImageFiles.length > 0) {
          await uploadPhotos(propertyId, uploadedImageFiles)
        }
        setPublishedListingId(propertyId)
        toast.success('Listing sent for review!')
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Something went wrong. Please try again.'
      setPublishError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const stepForField: Record<string, number> = {
    title: 1, description: 1, address: 1, city: 1, state: 1, zipCode: 1, propertyType: 1, maxVehicleSize: 1, features: 1,
    hourlyRate: 2, dailyRate: 2, startTime: 2, endTime: 2, requireApproval: 2, leadTimeHours: 2,
    availability: 2,
  }

  const onValidationError = (errors: Record<string, { message?: string }>) => {
    const firstKey = Object.keys(errors)[0]
    const step = firstKey
      ? (stepForField[firstKey] ?? (firstKey.startsWith('availability') ? 2 : 1))
      : 1
    setCurrentStep(step)
    const msg = firstKey && errors[firstKey]?.message ? errors[firstKey].message : 'Please complete all required fields'
    toast.error(msg)
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-mist-100 flex items-center justify-center">
        <div className="text-charcoal-600">Loading...</div>
      </div>
    )
  }

  // Confirmation / success view after listing is published — no going back to steps
  if (publishedListingId) {
    return (
      <div className="min-h-screen bg-mist-100">
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-charcoal-900">List Your Driveway</h1>
              <p className="mt-2 text-charcoal-600">Start earning money from your parking space</p>
            </div>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-xl shadow-sm border border-mist-200 p-8 sm:p-10 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-6">
              <PartyPopper className="h-8 w-8 text-green-600" aria-hidden />
            </div>
            <h2 className="text-2xl font-bold text-charcoal-900 mb-2">Listing published successfully</h2>
            <p className="text-charcoal-600 mb-6">
              Your listing has been submitted and is now under review. It will appear in the Admin Dashboard as pending and will go live once approved—usually within 24 hours.
            </p>
            <p className="text-sm text-mist-600 mb-8">
              You can view and edit it anytime from your profile.
            </p>
            <button
              type="button"
              onClick={() => router.push('/profile')}
              className="inline-flex items-center px-6 py-3 bg-accent-500 text-white font-medium rounded-lg hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500"
            >
              Go to My Profile
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-mist-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-charcoal-900">List Your Driveway</h1>
            <p className="mt-2 text-charcoal-600">Start earning money from your parking space</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-x-hidden">
        {/* Progress Steps: compact tabs on mobile, text below */}
        <div className="mb-8">
          {/* Tab row - equal width, no horizontal scroll */}
          <div className="flex items-center gap-2 sm:gap-4">
            {steps.map((step, index) => (
              <button
                key={step.id}
                type="button"
                onClick={() => setCurrentStep(step.id)}
                className="flex-1 min-w-0 flex flex-col items-center gap-1 sm:gap-2 focus:outline-none focus:ring-2 focus:ring-accent-400 focus:ring-offset-2 rounded-lg p-1"
                aria-current={currentStep === step.id ? 'step' : undefined}
                aria-label={`Step ${step.id}: ${step.title}`}
              >
                <div className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 flex-shrink-0 ${
                  currentStep >= step.id
                    ? 'bg-accent-500 border-accent-500 text-white'
                    : 'border-mist-300 text-mist-600'
                }`}>
                  {currentStep > step.id ? (
                    <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                  ) : (
                    <span className="text-sm font-medium">{step.id}</span>
                  )}
                </div>
                {/* Step title below tab on mobile; hide on small to save space, show from sm */}
                <span className={`hidden sm:block text-xs font-medium text-center truncate w-full ${
                  currentStep >= step.id ? 'text-charcoal-900' : 'text-mist-600'
                }`}>
                  {step.title}
                </span>
              </button>
            ))}
          </div>
          {/* Current step title + description below (mobile-friendly) */}
          <div className="mt-3 text-center sm:mt-4">
            <p className="text-sm font-medium text-charcoal-900">
              {steps.find(s => s.id === currentStep)?.title}
            </p>
            <p className="text-xs text-mist-600 mt-0.5">
              {steps.find(s => s.id === currentStep)?.description}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit, onValidationError)} className="bg-white rounded-lg shadow-sm p-8">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-charcoal-900">Basic Information</h2>
              
              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-2">
                  Listing Title
                </label>
                <input
                  {...register('title')}
                  type="text"
                  className="w-full px-3 py-2 border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent"
                  placeholder="e.g., Downtown Parking Spot - Safe & Convenient"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-2">
                  Description
                </label>
                <textarea
                  {...register('description')}
                  rows={4}
                  className="w-full px-3 py-2 border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent"
                  placeholder="Describe your parking space, access instructions, and any special features..."
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-2">
                    Street Address
                  </label>
                  <input
                    {...register('address')}
                    type="text"
                    className="w-full px-3 py-2 border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent"
                    placeholder="1234 Barrington St"
                  />
                  {errors.address && (
                    <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-2">
                    City
                  </label>
                  <input
                    {...register('city')}
                    type="text"
                    className="w-full px-3 py-2 border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent"
                    placeholder="Halifax"
                  />
                  {errors.city && (
                    <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-2">
                    State
                  </label>
                  <input
                    {...register('state')}
                    type="text"
                    className="w-full px-3 py-2 border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent"
                    placeholder="NS"
                  />
                  {errors.state && (
                    <p className="mt-1 text-sm text-red-600">{errors.state.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-2">
                    Postal/Zip Code
                  </label>
                  <input
                    {...register('zipCode')}
                    type="text"
                    className="w-full px-3 py-2 border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent"
                    placeholder="B3J 1Y2"
                  />
                  {errors.zipCode && (
                    <p className="mt-1 text-sm text-red-600">{errors.zipCode.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-2">
                    Property Type
                  </label>
                  <select
                    {...register('propertyType')}
                    className="w-full px-3 py-2 border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent"
                  >
                    <option value="driveway">Driveway</option>
                    <option value="garage">Garage</option>
                    <option value="warehouse">Warehouse</option>
                    <option value="barn">Barn</option>
                    <option value="storage">Storage (boats, RVs, motorcycles, etc.)</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-2">
                    Maximum Vehicle Size
                  </label>
                  <select
                    {...register('maxVehicleSize')}
                    className="w-full px-3 py-2 border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent"
                  >
                    <option value="compact">Compact</option>
                    <option value="sedan">Sedan</option>
                    <option value="suv">SUV</option>
                    <option value="truck">Truck</option>
                    <option value="any">Any Size</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Pricing */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-charcoal-900">Pricing & Availability</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-2">
                    Hourly Rate ($)
                  </label>
                  <input
                    {...register('hourlyRate', { valueAsNumber: true })}
                    type="number"
                    min="1"
                    step="0.50"
                    className="w-full px-3 py-2 border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent"
                    placeholder="15.00"
                  />
                  {errors.hourlyRate && (
                    <p className="mt-1 text-sm text-red-600">{errors.hourlyRate.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-2">
                    Daily Rate ($)
                  </label>
                  <input
                    {...register('dailyRate', { valueAsNumber: true })}
                    type="number"
                    min="1"
                    step="0.50"
                    className="w-full px-3 py-2 border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent"
                    placeholder="50.00"
                  />
                  {errors.dailyRate && (
                    <p className="mt-1 text-sm text-red-600">{errors.dailyRate.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-3">
                  Available Days
                </label>
                                 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                   {Object.entries(watch('availability')).map(([day, checked]) => (
                     <label key={day} className="flex items-center">
                       <input
                         type="checkbox"
                         checked={checked}
                         onChange={(e) => {
                           const availability = watch('availability')
                           setValue('availability', {
                             ...availability,
                             [day]: e.target.checked
                           })
                         }}
                         className="h-4 w-4 text-accent-600 focus:ring-accent-400 border-mist-300 rounded"
                       />
                       <span className="ml-2 text-sm text-charcoal-700 capitalize">{day}</span>
                     </label>
                   ))}
                 </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-2">
                  Available Times
                </label>
                <div className="mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setValue('startTime', '00:00')
                      setValue('endTime', '23:59')
                    }}
                    className="px-3 py-1.5 text-xs font-medium bg-mist-100 text-charcoal-700 rounded hover:bg-mist-200"
                  >
                    All Day (00:00 – 23:59)
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-charcoal-600 mb-1">Start Time</label>
                    <input
                      {...register('startTime')}
                      type="time"
                      className="w-full px-3 py-2 border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-charcoal-600 mb-1">End Time</label>
                    <input
                      {...register('endTime')}
                      type="time"
                      className="w-full px-3 py-2 border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent"
                    />
                  </div>
                </div>
                <p className="mt-1 text-xs text-mist-600">
                  💡 Same times apply to all selected days. e.g. overnight for winter parking bans: set 6 PM–8 AM.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-2">
                    Booking Lead Time
                  </label>
                  <p className="text-xs text-mist-600 mb-3">
                    Set how much advance notice you need before a booking can be auto-approved. Bookings with less notice will require your approval.
                  </p>
                  <div className="flex items-center gap-4">
                    <select
                      {...register('leadTimeHours', { valueAsNumber: true })}
                      className="px-3 py-2 border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent"
                    >
                      <option value={0}>Same day (always require approval)</option>
                      <option value={12}>12 hours</option>
                      <option value={24}>24 hours (1 day)</option>
                      <option value={48}>48 hours (2 days)</option>
                      <option value={72}>72 hours (3 days)</option>
                      <option value={168}>1 week</option>
                      <option value={336}>2 weeks</option>
                    </select>
                  </div>
                  <p className="text-xs text-mist-600 mt-2">
                    Bookings made with at least this much advance notice will be auto-approved. You'll receive a notification email.
                  </p>
                </div>

                <div className="flex items-center">
                  <input
                    {...register('requireApproval')}
                    type="checkbox"
                    className="h-4 w-4 text-accent-600 focus:ring-accent-400 border-mist-300 rounded"
                  />
                  <label className="ml-2 text-sm text-charcoal-700">
                    Always require approval (ignore lead time)
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Photos */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-charcoal-900">Photos</h2>
              <p className="text-charcoal-600">Upload clear photos of your parking space to attract more renters</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {uploadedImages.map((image, index) => (
                  <div key={index} className="relative">
                    <img
                      src={image}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                
                <label className="border-2 border-dashed border-mist-300 rounded-lg p-6 text-center hover:border-mist-400 cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Upload className="h-8 w-8 text-mist-500 mx-auto mb-2" />
                  <p className="text-sm text-charcoal-600">Upload Photos</p>
                </label>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-charcoal-900">Review Your Listing</h2>
              
              <div className="bg-mist-100 rounded-lg p-6">
                <h3 className="font-medium text-charcoal-900 mb-4">Listing Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-charcoal-600">Title:</span>
                    <span className="font-medium">{watch('title')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-charcoal-600">Type:</span>
                    <span className="font-medium capitalize">{watch('propertyType')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-charcoal-600">Hourly Rate:</span>
                    <span className="font-medium">${watch('hourlyRate')}/hr</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-charcoal-600">Daily Rate:</span>
                    <span className="font-medium">${watch('dailyRate')}/day</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-charcoal-600">Photos:</span>
                    <span className="font-medium">{uploadedImages.length} uploaded</span>
                  </div>
                </div>
              </div>

              <div className="bg-accent-50 rounded-lg p-4">
                <h3 className="font-medium text-primary-800 mb-2">Ready to send for review?</h3>
                <p className="text-sm text-accent-700">
                  Your listing will be sent for review and published within 24 hours once approved. You can edit it anytime from your profile.
                </p>
              </div>

            </div>
          )}

          {publishError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800 text-sm mt-4" role="alert">
              {publishError}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-6 border-t">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="flex items-center px-4 py-2 text-charcoal-600 border border-mist-300 rounded-lg hover:bg-mist-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </button>

            {currentStep < steps.length ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex items-center px-6 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Sending...' : 'Send for review'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
} 