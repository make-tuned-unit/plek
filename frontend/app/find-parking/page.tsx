'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, MapPin, Calendar, Clock, Car, Filter, Star, Map as MapIcon, Navigation } from 'lucide-react'
import { MapboxAutocomplete } from '@/components/MapboxAutocomplete'
import { PropertiesMap } from '@/components/PropertiesMap'
import { BookingModal } from '@/components/BookingModal'
import { DatePicker } from '@/components/DatePicker'
import { TimePicker } from '@/components/TimePicker'
import { apiService } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { listingFeatures } from '@/data/listingFeatures'

const DEFAULT_RADIUS_KM = 25

const provinceAbbreviations: Record<string, string> = {
  'alberta': 'AB',
  'british columbia': 'BC',
  'manitoba': 'MB',
  'new brunswick': 'NB',
  'newfoundland and labrador': 'NL',
  'northwest territories': 'NT',
  'nova scotia': 'NS',
  'nunavut': 'NU',
  'ontario': 'ON',
  'prince edward island': 'PE',
  'quebec': 'QC',
  'saskatchewan': 'SK',
  'yukon': 'YT'
}

const formatProvince = (province?: string | null) => {
  if (!province) return ''
  const normalized = province.toLowerCase().trim()
  return provinceAbbreviations[normalized] || province
}

const normalizePropertyCoordinates = (property: any) => {
  if (!property) return property
  const normalized = { ...property }

  if (typeof normalized.latitude === 'number' && typeof normalized.longitude === 'number') {
    const latitude = normalized.latitude
    const longitude = normalized.longitude

    const looksSwapped =
      latitude >= -140 && latitude <= -40 &&
      longitude >= 40 && longitude <= 90

    if (looksSwapped) {
      normalized.latitude = longitude
      normalized.longitude = latitude
    }
  }

  return normalized
}

const normalizePropertiesList = (properties: any[] = []) =>
  properties.map((property) => normalizePropertyCoordinates(property))

const geocodeCache = new Map<string, { lat: number; lng: number }>()

const propertyTypeLabels: Record<string, string> = {
  driveway: 'Driveway',
  garage: 'Garage',
  warehouse: 'Warehouse',
  barn: 'Barn',
  storage: 'Storage',
  other: 'Other',
}

interface Place {
  id: string
  place_name: string
  text: string
  center: [number, number]
  context?: Array<{
    id: string
    text: string
  }>
}

function FindParkingContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const geocodeCacheRef = useRef(geocodeCache)
  const lastLocationQueryRef = useRef<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLocation, setSelectedLocation] = useState<Place | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  
  // Set today as minimum date
  const today = new Date().toISOString().split('T')[0]
  const [priceRange, setPriceRange] = useState([0, 50])
  const [propertyType, setPropertyType] = useState('all')
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])
  const [isFeatureFilterOpen, setIsFeatureFilterOpen] = useState(false)
  const [properties, setProperties] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [locationAccuracyWarning, setLocationAccuracyWarning] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | undefined>(undefined)
  const [showMap, setShowMap] = useState(false)
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt')
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<any>(null)
  const [sortBy, setSortBy] = useState('recommended')

  const geocodeProperty = useCallback(async (property: any) => {
    if (!mapboxToken || !property?.id) return null

    const cache = geocodeCacheRef.current
    const cacheKey = `${property.id}:${property.updated_at || ''}`
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey)!
    }

    const queryParts = [
      property.address,
      property.city,
      property.state,
      property.zip_code,
      property.country,
    ]
      .filter(Boolean)
      .map((part: string) => part.trim())

    if (queryParts.length === 0) return null

    try {
      // Use types=address for address-level precision (exact point, not city/postcode centroid)
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          queryParts.join(', ')
        )}.json?access_token=${mapboxToken}&limit=1&types=address,place`
      )
      const data = await response.json()
      if (data?.features?.length) {
        const feature = data.features[0]
        const [lng, lat] = feature.center
        // Prefer address-type result for pin accuracy; place is fallback for rural/city-only
        const coords = { lat, lng }
        cache.set(cacheKey, coords)
        return coords
      }
    } catch (error) {
      console.warn('Failed to geocode property', property.id, error)
    }

    return null
  }, [mapboxToken])

  const ensureAccurateCoordinates = useCallback(async (properties: any[]) => {
    if (!mapboxToken) return properties

    const enriched = await Promise.all(
      properties.map(async (property) => {
        const cache = geocodeCacheRef.current

        const coords = await geocodeProperty(property)
        if (coords) {
          return {
            ...property,
            latitude: coords.lat,
            longitude: coords.lng,
          }
        }

        const hasValidCoordinates =
          typeof property.latitude === 'number' &&
          typeof property.longitude === 'number' &&
          property.latitude >= 40 &&
          property.latitude <= 60 &&
          property.longitude <= -40 &&
          property.longitude >= -150

        if (hasValidCoordinates && property?.id) {
          const cacheKey = `${property.id}:${property.updated_at || ''}`
          cache.set(cacheKey, { lat: property.latitude, lng: property.longitude })
          return property
        }

        return property
      })
    )

    return enriched
  }, [mapboxToken, geocodeProperty])

  const handleOpenBooking = useCallback((property: any) => {
    if (!property) return

    if (!user) {
      const redirectTarget = `/find-parking?property=${property.id}&book=true`
      router.push(`/auth/signup?redirect=${encodeURIComponent(redirectTarget)}`)
      return
    }

    setSelectedProperty(property)
    setShowBookingModal(true)
  }, [user, router])

  const handleLocationSelect = async (place: Place) => {
    setSelectedLocation(place)
    setSearchQuery(place.place_name)
    // Don't overwrite userLocation - keep it separate from selected search location
    // The map will use selectedLocation for centering, userLocation is for the user's actual GPS position
    // Clear accuracy warning when user manually selects a location (more precise)
    setLocationAccuracyWarning(null)
    await fetchPropertiesNearLocation(place.center[1], place.center[0], DEFAULT_RADIUS_KM)
  }

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords
        
        // Check if location accuracy is poor (more than 1000 meters = city-level)
        if (accuracy && accuracy > 1000) {
          const accuracyKm = (accuracy / 1000).toFixed(1)
          console.warn(`Location accuracy is poor: ${accuracy.toFixed(0)} meters. This may only be city-level precision.`)
          // Show a warning but don't block functionality
          setLocationAccuracyWarning(`Location accuracy is limited (${accuracyKm} km radius). For precise location, ensure your browser has permission to use precise location.`)
        } else {
          setLocationAccuracyWarning(null)
        }
        
        setUserLocation({ lat: latitude, lng: longitude })
        setLocationPermission('granted')
        // Fetch properties near user location
        fetchPropertiesNearLocation(latitude, longitude, DEFAULT_RADIUS_KM)
      },
      (error) => {
        // Only log error if it's not a user denial (which is expected)
        if (error.code !== 1) {
          console.error('Error getting location:', error)
        }
        setLocationPermission('denied')
        // Don't show error for user denial - just fetch all properties silently
        if (error.code !== 1) {
          let errorMessage = 'Unable to get your location. '
          if (error.code === 2) {
            errorMessage += 'Location unavailable. Please try again or search manually.'
          } else if (error.code === 3) {
            errorMessage += 'Location request timed out. Please try again or search manually.'
          } else {
            errorMessage += 'Please allow location access or search manually.'
          }
          setError(errorMessage)
        }
        // Fall back to fetching all properties
        fetchProperties()
      },
      {
        enableHighAccuracy: true, // Request GPS-level accuracy
        timeout: 15000, // Increased timeout to allow GPS to get a fix
        maximumAge: 0 // Don't use cached coordinates - always get fresh GPS reading
      }
    )
  }

  const fetchProperties = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      setProperties([])
      const response = await apiService.getProperties()
      if (response.success && response.data) {
        const normalized = normalizePropertiesList(response.data.properties || [])
        const enriched = await ensureAccurateCoordinates(normalized)
        setProperties(enriched)
      } else {
        setError('Failed to load properties')
      }
    } catch (err: any) {
      console.error('Error fetching properties:', err)
      setError(err.message || 'Failed to load properties')
    } finally {
      setIsLoading(false)
    }
  }, [ensureAccurateCoordinates])

  const fetchPropertiesNearLocation = useCallback(async (lat: number, lng: number, radius: number = DEFAULT_RADIUS_KM) => {
    try {
      setIsLoading(true)
      setError(null)
      setProperties([])
      const response = await apiService.getPropertiesNearLocation(lat, lng, radius)
      if (response.success && response.data) {
        const nearbyNormalized = normalizePropertiesList(response.data.properties || [])
        const nearbyProperties = await ensureAccurateCoordinates(nearbyNormalized)

        // Always merge nearby results with the full property list so we never hide valid listings.
        const allResponse = await apiService.getProperties()
        let mergedProperties: any[] = nearbyProperties

        if (allResponse.success && allResponse.data) {
          const allNormalized = normalizePropertiesList(allResponse.data.properties || [])
          const allProperties = await ensureAccurateCoordinates(allNormalized)
          const mergedMap = new Map<string, any>()

          for (const property of allProperties) {
            if (property?.id) {
              mergedMap.set(property.id, property)
            }
          }

          for (const property of nearbyProperties) {
            if (property?.id) {
              const existing = mergedMap.get(property.id) || {}
              mergedMap.set(property.id, {
                ...existing,
                ...property
              })
            }
          }

          mergedProperties = Array.from(mergedMap.values()).sort((a, b) => {
            const distanceA = typeof a.distance === 'number' ? a.distance : Number.POSITIVE_INFINITY
            const distanceB = typeof b.distance === 'number' ? b.distance : Number.POSITIVE_INFINITY
            if (distanceA === distanceB) return 0
            return distanceA - distanceB
          })
        }

        setProperties(mergedProperties)
      } else {
        setError('Failed to load properties near your location')
        // Fall back to fetching all properties
        await fetchProperties()
      }
    } catch (err: any) {
      console.error('Error fetching properties near location:', err)
      setError(err.message || 'Failed to load properties near your location')
      // Fall back to fetching all properties
      await fetchProperties()
    } finally {
      setIsLoading(false)
    }
  }, [fetchProperties, ensureAccurateCoordinates])

  useEffect(() => {
    // Kick off both location-aware and general fetches so the list isn't empty while geolocation resolves
    getUserLocation()
    void fetchProperties()
  }, [fetchProperties])

  useEffect(() => {
    const locationParam = searchParams.get('location')

    if (locationParam && locationParam !== lastLocationQueryRef.current) {
      lastLocationQueryRef.current = locationParam
      if (!mapboxToken) {
        console.warn('[FindParking] Missing Mapbox token, falling back to all properties')
        void fetchProperties()
        return
      }

      const geocodeAndFetch = async () => {
        try {
          setIsLoading(true)
          setError(null)
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(locationParam)}.json?access_token=${mapboxToken}&limit=1&types=place,locality,region,address`
          )
          const data = await response.json()

          if (data?.features?.length) {
            const feature = data.features[0]
            const place: Place = {
              id: feature.id,
              place_name: feature.place_name,
              text: feature.text,
              center: feature.center,
              context: feature.context?.map((ctx: any) => ({ id: ctx.id, text: ctx.text })) || []
            }

            setSelectedLocation(place)
            setSearchQuery(feature.place_name)
            setUserLocation({ lat: feature.center[1], lng: feature.center[0] })
            await fetchPropertiesNearLocation(feature.center[1], feature.center[0], DEFAULT_RADIUS_KM)
          } else {
            setError('Could not find that location. Showing all listings.')
            await fetchProperties()
          }
        } catch (error) {
          console.error('Error geocoding location:', error)
          setError('Could not determine that location. Showing all listings.')
          await fetchProperties()
        } finally {
          setIsLoading(false)
        }
      }

      geocodeAndFetch()
    }
  }, [searchParams, mapboxToken, fetchProperties, fetchPropertiesNearLocation])

  // Check for booking parameters in URL
  useEffect(() => {
    const propertyId = searchParams.get('property')
    const shouldBook = searchParams.get('book') === 'true'

    if (propertyId && shouldBook && !user) {
      const redirectTarget = `/find-parking?property=${propertyId}&book=true`
      router.replace(`/auth/signup?redirect=${encodeURIComponent(redirectTarget)}`, { scroll: false })
      return
    }

    if (propertyId && shouldBook && properties.length > 0) {
      const property = properties.find(p => p.id === propertyId)
      if (property) {
        handleOpenBooking(property)
        // Clean up URL parameters
        router.replace('/find-parking', { scroll: false })
      }
    }
  }, [searchParams, properties, router, handleOpenBooking, user])

  const filteredProperties = properties
    .filter(property => {
      // Only show active properties (backend should filter, but this is a safety check)
      if (property.status !== 'active') {
        return false
      }

      const normalizedQuery = searchQuery.trim().toLowerCase()
      const useTextSearch = !selectedLocation && normalizedQuery.length > 0
      const matchesSearch = !useTextSearch ||
        property.title?.toLowerCase().includes(normalizedQuery) ||
        property.address?.toLowerCase().includes(normalizedQuery) ||
        property.city?.toLowerCase().includes(normalizedQuery) ||
        property.state?.toLowerCase().includes(normalizedQuery)
      const matchesType = propertyType === 'all' || property.property_type === propertyType
      const matchesPrice = (property.hourly_rate || 0) >= priceRange[0] && (property.hourly_rate || 0) <= priceRange[1]

      const matchesFeatures =
        selectedFeatures.length === 0 ||
        selectedFeatures.every((feature) => property.features?.includes(feature))

      return matchesSearch && matchesType && matchesPrice && matchesFeatures
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price_asc':
          return (a.hourly_rate || 0) - (b.hourly_rate || 0)
        case 'price_desc':
          return (b.hourly_rate || 0) - (a.hourly_rate || 0)
        case 'rating':
          return (b.rating || 0) - (a.rating || 0)
        case 'recommended':
        default: {
          const distanceA = typeof a.distance === 'number' ? a.distance : Number.POSITIVE_INFINITY
          const distanceB = typeof b.distance === 'number' ? b.distance : Number.POSITIVE_INFINITY
          return distanceA - distanceB
        }
      }
    })

  return (
    <div className="min-h-screen bg-mist-100">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-md shadow-sm border-b border-mist-200 sticky top-16 md:top-20 z-40">
        <div className="max-w-7xl mx-auto container-padding py-5 sm:py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-charcoal-900 tracking-tight">Find Parking</h1>
              <p className="mt-1.5 text-base text-charcoal-600">Discover available parking spots near you</p>
            </div>
            <div className="flex items-center shrink-0">
              <button
                onClick={() => setShowMap(!showMap)}
                className={`flex items-center min-h-[44px] px-4 sm:px-5 py-2.5 border-2 rounded-xl transition-all duration-200 font-semibold text-sm sm:text-base ${
                  showMap 
                    ? 'bg-gradient-accent text-white border-accent-500 shadow-md shadow-accent-500/25 hover:shadow-accent-lg hover:-translate-y-0.5' 
                    : 'border-mist-300 hover:bg-mist-50 hover:border-accent-300 text-charcoal-700'
                }`}
              >
                {showMap ? (
                  <Navigation className="h-5 w-5 mr-2" />
                ) : (
                  <MapIcon className="h-5 w-5 mr-2" />
                )}
                <span>
                  {showMap ? 'List View' : 'Map View'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Filters Sidebar - Always Visible */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-6 sticky top-24 border border-mist-200">
              <h3 className="text-base font-bold text-charcoal-900 mb-5 tracking-tight">Search & Filters</h3>
                
                {/* Search */}
                <div className="mb-5">
                  <label className="block text-sm font-medium text-charcoal-700 mb-2">
                    Where do you need parking?
                  </label>
                  <div className="flex space-x-2 mb-2">
                    <button
                      onClick={getUserLocation}
                      className="flex items-center min-h-[44px] px-4 py-2.5 text-sm bg-gradient-accent text-white rounded-xl font-semibold shadow-md shadow-accent-500/25 hover:shadow-accent-lg hover:-translate-y-0.5 transition-all duration-200"
                    >
                      <Navigation className="h-4 w-4 mr-2" />
                      Use My Location
                    </button>
                  </div>
                  <MapboxAutocomplete
                    value={searchQuery}
                    onChange={setSearchQuery}
                    onSelect={handleLocationSelect}
                    placeholder="e.g. Halifax, Nova Scotia"
                  />
                  {selectedLocation && (
                    <p className="mt-2 text-xs text-charcoal-600">
                      Showing results near <span className="font-medium">{selectedLocation.text || selectedLocation.place_name}</span>
                    </p>
                  )}
                  {!selectedLocation && userLocation && (
                    <p className="mt-2 text-xs text-charcoal-600">
                      Showing results near your location
                    </p>
                  )}
                  {locationAccuracyWarning && (
                    <p className="mt-1.5 text-xs text-amber-700">
                      Location accuracy is limited. For better results, search for a specific address above.
                    </p>
                  )}
                </div>

              {/* Date & Time */}
              <div className="mb-5 space-y-4">
                <DatePicker
                  value={selectedDate}
                  onChange={setSelectedDate}
                  min={today}
                  label="Date"
                  placeholder="Select date"
                />
                <TimePicker
                  value={selectedTime}
                  onChange={setSelectedTime}
                  label="Time"
                  placeholder="Select time"
                />
              </div>

              {/* Property Type */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-charcoal-700 mb-2">
                  Property Type
                </label>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="w-full px-3 py-2 border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  <option value="driveway">Driveway</option>
                  <option value="garage">Garage</option>
                  <option value="warehouse">Warehouse</option>
                  <option value="barn">Barn</option>
                  <option value="storage">Storage</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Feature Filters */}
              <div className="mb-5 border border-mist-200 rounded-xl">
                <button
                  type="button"
                  onClick={() => setIsFeatureFilterOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium text-charcoal-600 hover:bg-mist-100 transition"
                >
                  <span>Listing Features</span>
                  <span className="text-xs text-mist-600">
                    {isFeatureFilterOpen ? 'Hide' : 'Show'}
                  </span>
                </button>
                {isFeatureFilterOpen && (
                  <div className="px-4 pb-4">
                    <p className="text-xs text-charcoal-500 mb-3">
                      Filter results by amenities hosts can add to their listings.
                    </p>
                    <div className="flex flex-col space-y-2">
                      {listingFeatures.map((feature) => {
                        const isSelected = selectedFeatures.includes(feature.id)
                        return (
                          <button
                            key={feature.id}
                            type="button"
                            onClick={() => {
                              setSelectedFeatures((prev) =>
                                isSelected
                                  ? prev.filter((id) => id !== feature.id)
                                  : [...prev, feature.id]
                              )
                            }}
                            className={`flex items-center space-x-3 px-3 py-3 rounded-lg border text-sm transition ${
                              isSelected
                                ? 'border-accent-500 bg-accent-50 text-accent-700'
                                : 'border-mist-200 hover:border-accent-300 hover:bg-accent-50'
                            }`}
                          >
                            <span>{feature.icon}</span>
                            <span>{feature.label}</span>
                          </button>
                        )
                      })}
                    </div>
                    {selectedFeatures.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedFeatures([])}
                        className="mt-4 text-xs text-accent-600 hover:text-accent-700 underline"
                      >
                        Clear selected features
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Price Range */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-charcoal-700 mb-2">
                  Price Range (per hour)
                </label>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-charcoal-600">
                    <span>${priceRange[0]}</span>
                    <span>${priceRange[1]}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Clear Filters */}
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSelectedLocation(null)
                  setSelectedDate('')
                  setSelectedTime('')
                  setSelectedFeatures([])
                  setIsFeatureFilterOpen(false)
                  setPriceRange([0, 50])
                  setLocationAccuracyWarning(null)
                  setPropertyType('all')
                }}
                className="w-full min-h-[44px] px-4 py-2.5 text-sm font-medium text-charcoal-600 border border-mist-300 rounded-xl hover:bg-mist-100 transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          </div>

          {/* Main Content Area - Map or List View */}
          <div className="lg:col-span-2">
            {showMap ? (
              /* Map View */
              <div className="bg-white rounded-lg shadow-sm overflow-hidden h-[calc(100vh-250px)] min-h-[600px]">
                <PropertiesMap
                  properties={filteredProperties}
                  userLocation={userLocation}
                  selectedLocation={selectedLocation ? { lat: selectedLocation.center[1], lng: selectedLocation.center[0] } : undefined}
                  onPropertyClick={handleOpenBooking}
                  className="w-full h-full"
                />
              </div>
            ) : (
              /* List View */
              <>
                <div className="flex items-center justify-between gap-4 mb-5">
                  <div className="min-w-0">
                    <p className="text-sm sm:text-base font-medium text-charcoal-700">
                      {isLoading ? 'Loading...' : `${filteredProperties.length} parking spots found`}
                    </p>
                  </div>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="shrink-0 px-3 py-2.5 pr-10 border border-mist-300 rounded-xl text-sm font-medium text-charcoal-700 focus:ring-2 focus:ring-accent-400 focus:border-transparent appearance-none bg-white bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3E%3Cpath stroke=%27%23666%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27m6 8 4 4 4-4%27/%3E%3C/svg%3E')] bg-[length:1.5em_1.5em] bg-[right_0.5rem_center] bg-no-repeat"
                  >
                    <option value="recommended">Sort by: Recommended</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="rating">Rating</option>
                  </select>
                </div>

                {/* Error State */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <p className="text-red-800">{error}</p>
                    <button
                      onClick={fetchProperties}
                      className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
                    >
                      Try again
                    </button>
                  </div>
                )}

                {/* Loading State — skeleton cards */}
                {isLoading && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="bg-white rounded-2xl border border-mist-200 overflow-hidden">
                        <div className="skeleton w-full h-44 sm:h-48" />
                        <div className="p-4 sm:p-5 space-y-3">
                          <div className="skeleton h-5 w-3/4 rounded" />
                          <div className="skeleton h-4 w-1/2 rounded" />
                          <div className="flex gap-2">
                            <div className="skeleton h-6 w-16 rounded" />
                            <div className="skeleton h-6 w-20 rounded" />
                          </div>
                          <div className="skeleton h-10 w-full rounded-xl" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Properties Grid */}
                {!isLoading && !error && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                    {filteredProperties.map((property) => {
                      const locationParts = [
                        property.address?.split(',')[0]?.trim() || property.address,
                        property.city,
                        formatProvince(property.state)
                      ].filter(Boolean)

                      return (
                  <div key={property.id} className="property-card group">
                    <Link href={`/driveway/${property.id}`} className="block relative overflow-hidden rounded-t-2xl">
                      {property.photos && property.photos.length > 0 && property.photos[0]?.url ? (
                        <img
                          src={property.photos[0].url}
                          alt={property.title || 'Parking Space'}
                          className="w-full h-44 sm:h-48 object-cover group-hover:scale-[1.03] transition-transform duration-300"
                          onError={(e) => {
                            // Fallback to a default image if photo fails to load
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="200"%3E%3Crect fill="%23e5e7eb" width="300" height="200"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-family="sans-serif" font-size="14"%3ENo Image%3C/text%3E%3C/svg%3E'
                          }}
                        />
                      ) : (
                        <div className="w-full h-44 sm:h-48 bg-gradient-to-br from-mist-200 to-mist-300 flex items-center justify-center">
                          <div className="text-center text-mist-600">
                            <Car className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2" />
                            <p className="text-sm font-medium">No photos available</p>
                          </div>
                        </div>
                      )}
                      {property.status !== 'active' && (
                        <div className="absolute top-3 right-3 bg-red-500 text-white px-2.5 py-1 rounded-full text-xs font-semibold shadow-md">
                          {property.status === 'pending_review' ? 'Pending Review' : 'Unavailable'}
                        </div>
                      )}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        <span className="bg-gradient-accent text-white px-2.5 py-1.5 rounded-lg text-sm font-bold shadow-md shadow-accent-500/30">
                          ${property.hourly_rate || 0}/hr
                        </span>
                        {property.property_type && propertyTypeLabels[property.property_type] && (
                          <span className="bg-white/90 backdrop-blur-sm text-charcoal-700 px-2 py-1.5 rounded-lg text-xs font-semibold shadow-md">
                            {propertyTypeLabels[property.property_type]}
                          </span>
                        )}
                      </div>
                    </Link>
                    
                    <div className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Link href={`/driveway/${property.id}`} className="min-w-0">
                          <h3 className="text-base sm:text-lg font-bold text-charcoal-900 pr-2 group-hover:text-accent-700 transition-colors tracking-tight line-clamp-2">{property.title || 'Parking Space'}</h3>
                        </Link>
                        {(property.rating || property.review_count) > 0 && (
                          <div className="flex items-center flex-shrink-0 bg-mist-50 px-2 py-1 rounded-lg border border-mist-200">
                            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                            <span className="ml-1 text-sm font-semibold text-charcoal-800">{property.rating || 0}</span>
                            {property.review_count > 0 && (
                              <span className="ml-0.5 text-xs text-mist-600">({property.review_count})</span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-1.5 mb-3">
                        <p className="text-charcoal-600 flex items-center text-sm">
                          <MapPin className="h-4 w-4 mr-1.5 flex-shrink-0 text-mist-500" />
                          <span className="line-clamp-1">{locationParts.length > 0 ? locationParts.join(', ') : 'Address not available'}</span>
                          {typeof property.distance === 'number' && (
                            <span className="ml-auto pl-2 text-xs text-mist-600 whitespace-nowrap flex-shrink-0">
                              {property.distance < 1
                                ? `${(property.distance * 1000).toFixed(0)} m`
                                : `${property.distance.toFixed(1)} km`}
                            </span>
                          )}
                        </p>
                        
                        {property.start_time && property.end_time && (
                          <p className="text-charcoal-600 flex items-center text-sm">
                            <Clock className="h-4 w-4 mr-1.5 flex-shrink-0 text-mist-500" />
                            <span>
                              {(() => {
                                const formatTime = (time: string) => {
                                  if (!time) return '';
                                  const [hours, minutes] = time.split(':');
                                  const hour = parseInt(hours);
                                  const ampm = hour >= 12 ? 'PM' : 'AM';
                                  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                                  return `${displayHour}:${minutes} ${ampm}`;
                                };
                                return `${formatTime(property.start_time)} - ${formatTime(property.end_time)}`;
                              })()}
                            </span>
                          </p>
                        )}
                      </div>
                      
                      {property.description && (
                        <p className="text-sm text-mist-600 mb-3 line-clamp-2">{property.description}</p>
                      )}
                      
                      {property.features && property.features.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {property.features.slice(0, 3).map((feature: string, index: number) => (
                            <span key={index} className="px-2 py-0.5 bg-accent-50 text-accent-700 text-xs rounded">
                              {feature}
                            </span>
                          ))}
                          {property.features.length > 3 && (
                            <span className="px-2 py-0.5 bg-mist-100 text-charcoal-600 text-xs rounded">
                              +{property.features.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                      
                      {property.host_id === user?.id ? (
                        <div className="w-full bg-mist-100 text-charcoal-600 py-3 px-4 rounded-xl text-center text-sm font-semibold border border-mist-200">
                          Your Listing
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenBooking(property)}
                          disabled={property.status !== 'active'}
                          className="w-full min-h-[48px] bg-gradient-accent text-white py-3.5 px-4 rounded-xl font-bold text-sm sm:text-base shadow-md shadow-accent-500/25 hover:shadow-accent-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none transition-all duration-200"
                        >
                          {property.status === 'active' ? 'Book Now' : 'Currently Unavailable'}
                        </button>
                      )}
                    </div>
                  </div>
                      )
                    })}
                  </div>
                )}

                {!isLoading && !error && filteredProperties.length === 0 && (
                  <div className="text-center py-12 sm:py-16">
                    <Car className="h-12 w-12 text-mist-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-charcoal-900 mb-2 tracking-tight">No parking spots found</h3>
                    <p className="text-sm text-charcoal-600">Try adjusting your search criteria or location</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {selectedProperty && (
        <BookingModal
          property={selectedProperty}
          isOpen={showBookingModal}
          onClose={() => {
            setShowBookingModal(false)
            setSelectedProperty(null)
          }}
          onSuccess={() => {
            // Refresh properties after successful booking
            fetchProperties()
          }}
        />
      )}
    </div>
  )
}

export default function FindParkingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-mist-100">
        <div className="bg-white/95 backdrop-blur-md shadow-sm border-b border-mist-200 sticky top-16 md:top-20 z-40">
          <div className="max-w-7xl mx-auto container-padding py-6">
            <h1 className="text-3xl md:text-4xl font-bold text-charcoal-900">Find Parking</h1>
            <p className="mt-2 text-charcoal-600">Discover available parking spots near you</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto container-padding py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500 mx-auto mb-4"></div>
            <p className="text-charcoal-600">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <FindParkingContent />
    </Suspense>
  )
} 