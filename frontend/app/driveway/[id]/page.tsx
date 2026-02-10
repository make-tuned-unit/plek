'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  MapPin,
  DollarSign,
  Star,
  User,
  ArrowLeft,
  Loader2,
  Car,
  Clock,
  CheckCircle,
  Zap,
  CalendarDays,
} from 'lucide-react'
import { ImageCarousel } from '@/components/ImageCarousel'
import { BookingModal } from '@/components/BookingModal'
import { apiService } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { listingFeatures } from '@/data/listingFeatures'

const propertyTypeLabels: Record<string, string> = {
  driveway: 'Driveway',
  garage: 'Garage',
  warehouse: 'Warehouse',
  barn: 'Barn',
  storage: 'Storage',
  other: 'Other',
}

const formatTime = (time: string) => {
  if (!time) return ''
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return `${displayHour}:${minutes} ${ampm}`
}

const dayLabels: Record<string, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
}

export default function DrivewayDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const id = typeof params?.id === 'string' ? params.id : null

  const [property, setProperty] = useState<any>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showBookingModal, setShowBookingModal] = useState(false)

  useEffect(() => {
    if (!id) {
      setError('Invalid listing')
      setLoading(false)
      return
    }
    const propertyId: string = id
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await apiService.getProperty(propertyId)
        if (!cancelled && res.success && res.data?.property) {
          const p = res.data.property
          setProperty(p)
          const hostId = p.host_id || p.host?.id
          if (hostId) {
            const revRes = await apiService.getReviewsByUser(hostId)
            if (!cancelled && revRes.success && revRes.data?.reviews) {
              setReviews(revRes.data.reviews.slice(0, 5))
            }
          }
        } else if (!cancelled) {
          setError('Listing not found')
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load listing')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  const handleBookClick = () => {
    if (!user) {
      router.push(`/auth/signin?redirect=${encodeURIComponent(`/driveway/${id}`)}`)
      return
    }
    if (property?.host_id === user.id) return
    setShowBookingModal(true)
  }

  const isHost = !!user && property?.host_id === user.id
  const locationParts = property
    ? [
        property.address?.split(',')[0]?.trim() || property.address,
        property.city,
        property.state,
      ].filter(Boolean)
    : []
  const locationText = locationParts.length > 0 ? locationParts.join(', ') : 'Address not available'
  const hostName = property?.host
    ? [property.host.first_name, property.host.last_name].filter(Boolean).join(' ') || 'Host'
    : 'Host'
  const hostRating = property?.host?.rating != null ? Number(property.host.rating) : null
  const hostReviewCount = property?.host?.review_count != null ? Number(property.host.review_count) : 0
  const photos = Array.isArray(property?.photos)
    ? property.photos.map((p: any) => ({ url: p.url, caption: p.caption }))
    : []

  const propertyTypeLabel = property?.property_type
    ? propertyTypeLabels[property.property_type] || property.property_type
    : null

  if (loading) {
    return (
      <div className="min-h-screen bg-mist-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-accent-500 mx-auto" />
          <p className="mt-4 text-charcoal-600">Loading listing...</p>
        </div>
      </div>
    )
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-mist-100 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <p className="text-charcoal-700 mb-4">{error || 'Listing not found'}</p>
          <Link
            href="/find-parking"
            className="inline-flex items-center gap-2 text-accent-600 hover:text-accent-700 font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to find parking
          </Link>
        </div>
      </div>
    )
  }

  const ctaLabel =
    property.status !== 'active'
      ? 'Currently unavailable'
      : isHost
        ? 'Your listing'
        : property.instant_booking
          ? 'Book now'
          : 'Request booking'

  return (
    <div className="min-h-screen bg-mist-100 pb-24 md:pb-8">
      {/* Back link */}
      <div className="bg-white border-b border-mist-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
          <Link
            href="/find-parking"
            className="inline-flex items-center gap-2 text-charcoal-600 hover:text-charcoal-900 text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to find parking
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Photos — full width above the grid */}
        {photos.length > 0 ? (
          <ImageCarousel images={photos} alt={property.title} className="mb-6" />
        ) : (
          <div className="w-full aspect-[16/10] sm:aspect-[2/1] rounded-xl bg-mist-200 flex items-center justify-center mb-6">
            <Car className="h-16 w-16 text-mist-500" />
          </div>
        )}

        {/* Two-column grid: content + sticky sidebar on md+ */}
        <div className="md:grid md:grid-cols-[1fr_340px] md:gap-8 lg:gap-10">
          {/* Left column — content */}
          <main className="min-w-0">
            {/* Title & badge */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-charcoal-900 break-words">
                {property.title}
              </h1>
              {propertyTypeLabel && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent-100 text-accent-800">
                  {propertyTypeLabel}
                </span>
              )}
            </div>
            <p className="text-charcoal-600 flex items-center gap-1.5 mb-6">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="break-words">{locationText}</span>
            </p>

            {/* Quick info — visible on mobile, hidden on md+ (sidebar shows it) */}
            <div className="flex flex-wrap gap-4 mb-6 md:hidden">
              <div className="flex items-center gap-2 text-charcoal-700">
                <DollarSign className="h-5 w-5 text-accent-600" />
                <span className="text-xl font-bold text-charcoal-900">
                  ${Number(property.hourly_rate ?? 0).toFixed(0)}
                  <span className="text-base font-normal text-charcoal-600">/hour</span>
                </span>
              </div>
              {property.instant_booking && (
                <div className="flex items-center gap-1.5 text-sm text-charcoal-600">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Instant booking
                </div>
              )}
            </div>

            {/* Availability hours */}
            {property.start_time && property.end_time && (
              <div className="flex items-center gap-2 text-sm text-charcoal-600 mb-6">
                <Clock className="h-4 w-4 text-mist-500" />
                <span>Available {formatTime(property.start_time)} – {formatTime(property.end_time)}</span>
              </div>
            )}

            {/* Available days */}
            {property.available_days && property.available_days.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-charcoal-600 mb-6">
                <CalendarDays className="h-4 w-4 text-mist-500" />
                <span>
                  {property.available_days.length === 7
                    ? 'Every day'
                    : property.available_days
                        .map((d: string) => dayLabels[d.toLowerCase()] || d)
                        .join(', ')}
                </span>
              </div>
            )}

            {/* Description */}
            {property.description && (
              <section className="mb-8">
                <h2 className="text-lg font-semibold text-charcoal-900 mb-2">About this space</h2>
                <p className="text-charcoal-700 whitespace-pre-wrap break-words">{property.description}</p>
              </section>
            )}

            {/* Host */}
            {property.host && (
              <section className="mb-8">
                <h2 className="text-lg font-semibold text-charcoal-900 mb-3">Hosted by</h2>
                <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-mist-200">
                  <div
                    className="w-14 h-14 rounded-full bg-accent-100 flex items-center justify-center text-accent-700 font-semibold text-lg flex-shrink-0"
                    aria-hidden
                  >
                    {hostName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-charcoal-900 truncate">{hostName}</p>
                    <div className="flex items-center gap-2 text-sm text-charcoal-600 mt-0.5">
                      {hostRating != null && (
                        <span className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                          {hostRating.toFixed(1)}
                        </span>
                      )}
                      {hostReviewCount > 0 && (
                        <span>{hostReviewCount} review{hostReviewCount !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Recent reviews */}
            {reviews.length > 0 && (
              <section className="mb-8">
                <h2 className="text-lg font-semibold text-charcoal-900 mb-3">Recent reviews</h2>
                <ul className="space-y-4">
                  {reviews.map((r: any) => (
                    <li key={r.id} className="p-4 bg-white rounded-xl border border-mist-200">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-medium text-charcoal-900">
                          {r.reviewer?.first_name} {r.reviewer?.last_name}
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                          <span className="text-sm font-medium">{Number(r.rating).toFixed(0)}</span>
                        </div>
                      </div>
                      {r.comment && (
                        <p className="text-charcoal-600 text-sm break-words">{r.comment}</p>
                      )}
                      <p className="text-xs text-mist-600 mt-2">
                        {new Date(r.created_at).toLocaleDateString()}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Features */}
            {property.features && property.features.length > 0 && (
              <section className="mb-8">
                <h2 className="text-lg font-semibold text-charcoal-900 mb-3">Features</h2>
                <ul className="flex flex-wrap gap-2">
                  {property.features.map((f: string, i: number) => {
                    const resolved = listingFeatures.find(
                      (x) => x.id === f || x.label.toLowerCase() === String(f).toLowerCase()
                    )
                    const label = resolved ? resolved.label : f
                    const icon = resolved?.icon
                    return (
                      <li
                        key={`${f}-${i}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent-50 text-accent-800 rounded-lg text-sm"
                      >
                        {icon && <span aria-hidden>{icon}</span>}
                        {label}
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}
          </main>

          {/* Right column — sticky booking sidebar (md+ only) */}
          <aside className="hidden md:block">
            <div className="sticky top-24 bg-white rounded-2xl border border-mist-200 shadow-lg p-6 space-y-5">
              {/* Price */}
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-charcoal-900">
                  ${Number(property.hourly_rate ?? 0).toFixed(0)}
                </span>
                <span className="text-base text-charcoal-600">/hour</span>
              </div>

              {/* Quick badges */}
              <div className="flex flex-wrap gap-2">
                {propertyTypeLabel && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-mist-100 text-charcoal-700 border border-mist-200">
                    <Car className="h-3.5 w-3.5" />
                    {propertyTypeLabel}
                  </span>
                )}
                {property.instant_booking && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                    <Zap className="h-3.5 w-3.5" />
                    Instant booking
                  </span>
                )}
                {hostRating != null && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-mist-100 text-charcoal-700 border border-mist-200">
                    <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                    {hostRating.toFixed(1)}
                  </span>
                )}
              </div>

              {/* Availability hours */}
              {property.start_time && property.end_time && (
                <div className="flex items-center gap-2 text-sm text-charcoal-600">
                  <Clock className="h-4 w-4 text-mist-500" />
                  <span>{formatTime(property.start_time)} – {formatTime(property.end_time)}</span>
                </div>
              )}

              {/* Available days */}
              {property.available_days && property.available_days.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-charcoal-600">
                  <CalendarDays className="h-4 w-4 text-mist-500" />
                  <span>
                    {property.available_days.length === 7
                      ? 'Every day'
                      : property.available_days
                          .map((d: string) => dayLabels[d.toLowerCase()] || d)
                          .join(', ')}
                  </span>
                </div>
              )}

              <hr className="border-mist-200" />

              {/* CTA button */}
              <button
                type="button"
                onClick={handleBookClick}
                disabled={property.status !== 'active' || isHost}
                className="w-full py-3.5 px-4 bg-accent-500 text-white font-semibold rounded-xl hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {ctaLabel}
              </button>

              {!isHost && property.status === 'active' && (
                <p className="text-xs text-center text-charcoal-500">You won't be charged yet</p>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Sticky CTA – mobile only */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-mist-200 shadow-lg md:hidden z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="min-w-0">
            <span className="text-lg font-bold text-charcoal-900">
              ${Number(property.hourly_rate ?? 0).toFixed(0)}
            </span>
            <span className="text-sm text-charcoal-600">/hour</span>
          </div>
          <button
            type="button"
            onClick={handleBookClick}
            disabled={property.status !== 'active' || isHost}
            className="py-3 px-6 bg-accent-500 text-white font-semibold rounded-xl hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {ctaLabel}
          </button>
        </div>
      </div>

      {showBookingModal && property && (
        <BookingModal
          property={property}
          isOpen={showBookingModal}
          onClose={() => setShowBookingModal(false)}
          onSuccess={() => setShowBookingModal(false)}
        />
      )}
    </div>
  )
}
