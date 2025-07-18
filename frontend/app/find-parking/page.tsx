'use client'

import { useState } from 'react'
import { Search, MapPin, Calendar, Clock, Car, Filter, Star } from 'lucide-react'
import { MapboxAutocomplete } from '@/components/MapboxAutocomplete'

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
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLocation, setSelectedLocation] = useState<Place | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [priceRange, setPriceRange] = useState([0, 50])
  const [propertyType, setPropertyType] = useState('all')
  const [showFilters, setShowFilters] = useState(false)

  const handleLocationSelect = (place: Place) => {
    setSelectedLocation(place)
    console.log('Selected location:', place)
    // Here you could trigger a search for parking spots near this location
    // For now, we'll just log the coordinates: place.center
  }

  const filteredProperties = mockProperties.filter(property => {
    const matchesSearch = property.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         property.address.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = propertyType === 'all' || property.type === propertyType
    const matchesPrice = property.price >= priceRange[0] && property.price <= priceRange[1]
    
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
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="h-5 w-5 mr-2" />
              Filters
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Search & Filters</h3>
              
              {/* Search */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Where do you need parking?
                </label>
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

          {/* Results */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-600">
                {filteredProperties.length} parking spots found
              </p>
              <select className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option>Sort by: Recommended</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
                <option>Distance</option>
                <option>Rating</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredProperties.map((property) => (
                <div key={property.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <div className="relative">
                    <img
                      src={property.image}
                      alt={property.title}
                      className="w-full h-48 object-cover"
                    />
                    {!property.available && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-sm">
                        Unavailable
                      </div>
                    )}
                    <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded text-sm">
                      ${property.price}/hr
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{property.title}</h3>
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="ml-1 text-sm text-gray-600">{property.rating}</span>
                        <span className="ml-1 text-sm text-gray-500">({property.reviews})</span>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mb-3 flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {property.address}
                    </p>
                    
                    <p className="text-sm text-gray-500 mb-4">{property.distance} away</p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {property.features.map((feature, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                    
                    <button
                      disabled={!property.available}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {property.available ? 'Book Now' : 'Currently Unavailable'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {filteredProperties.length === 0 && (
              <div className="text-center py-12">
                <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No parking spots found</h3>
                <p className="text-gray-600">Try adjusting your search criteria or location</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 