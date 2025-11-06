'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, MapPin, Calendar, Clock, Car, Filter, Star, Map, Navigation } from 'lucide-react'
import { MapboxAutocomplete } from '@/components/MapboxAutocomplete'
import { AvailabilityDisplay } from '@/components/AvailabilityDisplay'
import { PropertiesMap } from '@/components/PropertiesMap'
import { BookingModal } from '@/components/BookingModal'
import { apiService } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'

// Mock data for demonstration
const mockProperties = [
  {
    id: 1,
    title: 'Downtown Parking Spot',
    address: '123 Main St, Downtown',
    price: 15,
    rating: 4.8,
    reviews: 127,
    distance: '0.2 miles',
    image: '/api/placeholder/300/200',
    available: true,
    type: 'driveway',
    features: ['Covered', '24/7 Access', 'Security Camera'],
  },
  {
    id: 2,
    title: 'Residential Driveway',
    address: '456 Oak Ave, Residential Area',
    price: 8,
    rating: 4.6,
    reviews: 89,
    distance: '0.5 miles',
    image: '/api/placeholder/300/200',
    available: true,
    type: 'driveway',
    features: ['Easy Access', 'Well Lit'],
  },
  {
    id: 3,
    title: 'Secure Parking Garage',
    address: '789 Business Blvd, Commercial District',
    price: 25,
    rating: 4.9,
    reviews: 203,
    distance: '0.8 miles',
    image: '/api/placeholder/300/200',
    available: true,
    type: 'garage',
    features: ['Covered', 'Security Guard', '24/7 Access', 'EV Charging'],
  },
  {
    id: 4,
    title: 'Street Parking Space',
    address: '321 Elm St, Quiet Neighborhood',
    price: 5,
    rating: 4.3,
    reviews: 45,
    distance: '1.2 miles',
    image: '/api/placeholder/300/200',
    available: false,
    type: 'street',
    features: ['Free WiFi', 'Easy Access'],
  },
]

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

export default function FindParkingPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLocation, setSelectedLocation] = useState<Place | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [priceRange, setPriceRange] = useState([0, 50])
  const [propertyType, setPropertyType] = useState('all')
  const [properties, setProperties] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | undefined>(undefined)
  const [showMap, setShowMap] = useState(false)
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt')
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<any>(null)

  const handleLocationSelect = (place: Place) => {
    setSelectedLocation(place)
    console.log('Selected location:', place)
    // Here you could trigger a search for parking spots near this location
    // For now, we'll just log the coordinates: place.center
  }

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setUserLocation({ lat: latitude, lng: longitude })
        setLocationPermission('granted')
        // Fetch properties near user location
        fetchPropertiesNearLocation(latitude, longitude)
      },
      (error) => {
        // Only log error if it's not a user denial (which is expected)
        if (error.code !== 1) {
          console.error('Error getting location:', error)
        }
        setLocationPermission('denied')
        // Don't show error for user denial - just fetch all properties silently
        if (error.code !== 1) {
          setError('Unable to get your location. Please allow location access or search manually.')
        }
        // Fall back to fetching all properties
        fetchProperties()
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    )
  }

  const fetchProperties = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await apiService.getProperties()
      if (response.success && response.data) {
        setProperties(response.data.properties || [])
      } else {
        setError('Failed to load properties')
      }
    } catch (err: any) {
      console.error('Error fetching properties:', err)
      setError(err.message || 'Failed to load properties')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPropertiesNearLocation = async (lat: number, lng: number) => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await apiService.getPropertiesNearLocation(lat, lng, 50) // 50km radius
      if (response.success && response.data) {
        setProperties(response.data.properties || [])
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
  }

  useEffect(() => {
    // Try to get user location first, then fetch properties
    getUserLocation()
  }, [])

  // Check for booking parameters in URL
  useEffect(() => {
    const propertyId = searchParams.get('property')
    const shouldBook = searchParams.get('book') === 'true'

    if (propertyId && shouldBook && properties.length > 0) {
      const property = properties.find(p => p.id === propertyId)
      if (property) {
        setSelectedProperty(property)
        setShowBookingModal(true)
        // Clean up URL parameters
        router.replace('/find-parking', { scroll: false })
      }
    }
  }, [searchParams, properties, router])

  const filteredProperties = properties.filter(property => {
    // Only show active properties (backend should filter, but this is a safety check)
    if (property.status !== 'active') {
      return false
    }
    
    const matchesSearch = property.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         property.address?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = propertyType === 'all' || property.property_type === propertyType
    const matchesPrice = (property.hourly_rate || 0) >= priceRange[0] && (property.hourly_rate || 0) <= priceRange[1]
    
    return matchesSearch && matchesType && matchesPrice
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Find Parking</h1>
              <p className="mt-1 text-gray-600">Discover available parking spots near you</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowMap(!showMap)}
                className={`flex items-center px-4 py-2 border rounded-lg transition-colors ${
                  showMap 
                    ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' 
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                {showMap ? <Navigation className="h-5 w-5 mr-2" /> : <Map className="h-5 w-5 mr-2" />}
                {showMap ? 'List View' : 'Map View'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar - Always Visible */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Search & Filters</h3>
                
                {/* Search */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Where do you need parking?
                  </label>
                  <div className="flex space-x-2 mb-2">
                    <button
                      onClick={getUserLocation}
                      className="flex items-center px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Navigation className="h-4 w-4 mr-2" />
                      Use My Location
                    </button>
                  </div>
                  <MapboxAutocomplete
                    value={searchQuery}
                    onChange={setSearchQuery}
                    onSelect={handleLocationSelect}
                    placeholder="Enter address or area"
                  />
                  {selectedLocation && (
                    <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-800">
                        <strong>Selected:</strong> {selectedLocation.place_name}
                      </p>
                      <p className="text-xs text-blue-600">
                        Coordinates: {selectedLocation.center[1].toFixed(4)}, {selectedLocation.center[0].toFixed(4)}
                      </p>
                    </div>
                  )}
                  {userLocation && (
                    <div className="mt-2 p-2 bg-green-50 rounded-lg">
                      <p className="text-xs text-green-800">
                        <strong>Your Location:</strong> {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                      </p>
                    </div>
                  )}
                </div>

              {/* Date & Time */}
              <div className="mb-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      type="time"
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Property Type */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Type
                </label>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  <option value="driveway">Driveway</option>
                  <option value="garage">Garage</option>
                  <option value="street">Street Parking</option>
                </select>
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price Range (per hour)
                </label>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
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
                  setPriceRange([0, 50])
                  setPropertyType('all')
                }}
                className="w-full px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Clear All Filters
              </button>
            </div>
          </div>

          {/* Main Content Area - Map or List View */}
          <div className="lg:col-span-3">
            {showMap ? (
              /* Map View */
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <PropertiesMap
                  properties={filteredProperties}
                  userLocation={userLocation}
                  onPropertyClick={(property) => {
                    setSelectedProperty(property)
                    setShowBookingModal(true)
                  }}
                  className="h-[calc(100vh-250px)] min-h-[600px]"
                />
              </div>
            ) : (
              /* List View */
              <>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <p className="text-gray-600">
                      {isLoading ? 'Loading...' : `${filteredProperties.length} parking spots found`}
                    </p>
                    <button
                      onClick={fetchProperties}
                      disabled={isLoading}
                      className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
                    >
                      🔄 Refresh
                    </button>
                  </div>
                  <select className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option>Sort by: Recommended</option>
                    <option>Price: Low to High</option>
                    <option>Price: High to Low</option>
                    <option>Distance</option>
                    <option>Rating</option>
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

                {/* Loading State */}
                {isLoading && (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading parking spots...</p>
                  </div>
                )}

                {/* Properties Grid */}
                {!isLoading && !error && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredProperties.map((property) => (
                  <div key={property.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    <div className="relative">
                      {property.photos && property.photos.length > 0 && property.photos[0]?.url ? (
                        <img
                          src={property.photos[0].url}
                          alt={property.title || 'Parking Space'}
                          className="w-full h-48 object-cover"
                          onError={(e) => {
                            // Fallback to a default image if photo fails to load
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="200"%3E%3Crect fill="%23e5e7eb" width="300" height="200"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-family="sans-serif" font-size="14"%3ENo Image%3C/text%3E%3C/svg%3E'
                          }}
                        />
                      ) : (
                        <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                          <div className="text-center text-gray-400">
                            <Car className="h-12 w-12 mx-auto mb-2" />
                            <p className="text-sm">No photos available</p>
                          </div>
                        </div>
                      )}
                      {property.status !== 'active' && (
                        <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-sm">
                          {property.status === 'pending_review' ? 'Pending Review' : 'Unavailable'}
                        </div>
                      )}
                      <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded text-sm">
                        ${property.hourly_rate || 0}/hr
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{property.title || 'Parking Space'}</h3>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <span className="ml-1 text-sm text-gray-600">{property.rating || 0}</span>
                          <span className="ml-1 text-sm text-gray-500">({property.review_count || 0})</span>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 mb-3 flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        {property.address || 'Address not available'}
                      </p>
                      
                      {property.description && (
                        <p className="text-sm text-gray-500 mb-4 line-clamp-2">{property.description}</p>
                      )}
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        {property.type && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                            {property.type}
                          </span>
                        )}
                        {property.status && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                            {property.status}
                          </span>
                        )}
                        {/* Display features */}
                        {property.features && property.features.length > 0 && 
                          property.features.slice(0, 3).map((feature: string, index: number) => (
                            <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                              {feature}
                            </span>
                          ))
                        }
                        {property.features && property.features.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                            +{property.features.length - 3} more
                          </span>
                        )}
                      </div>
                      
                      {/* Availability info */}
                      {property.start_time && property.end_time && (
                        <div className="mb-4">
                          <AvailabilityDisplay 
                            availability={{
                              monday: { start: property.start_time, end: property.end_time, available: property.monday_available || false },
                              tuesday: { start: property.start_time, end: property.end_time, available: property.tuesday_available || false },
                              wednesday: { start: property.start_time, end: property.end_time, available: property.wednesday_available || false },
                              thursday: { start: property.start_time, end: property.end_time, available: property.thursday_available || false },
                              friday: { start: property.start_time, end: property.end_time, available: property.friday_available || false },
                              saturday: { start: property.start_time, end: property.end_time, available: property.saturday_available || false },
                              sunday: { start: property.start_time, end: property.end_time, available: property.sunday_available || false }
                            }}
                            className="text-xs"
                          />
                        </div>
                      )}
                      
                      {property.host_id === user?.id ? (
                        <div className="w-full bg-gray-100 text-gray-600 py-2 px-4 rounded-lg text-center text-sm">
                          Your Listing
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedProperty(property)
                            setShowBookingModal(true)
                          }}
                          disabled={property.status !== 'active'}
                          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {property.status === 'active' ? 'Book Now' : 'Currently Unavailable'}
                        </button>
                      )}
                    </div>
                  </div>
                    ))}
                  </div>
                )}

                {!isLoading && !error && filteredProperties.length === 0 && (
                  <div className="text-center py-12">
                    <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No parking spots found</h3>
                    <p className="text-gray-600">Try adjusting your search criteria or location</p>
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