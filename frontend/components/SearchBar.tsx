'use client'

import { useState } from 'react'
import { Search, MapPin, Calendar } from 'lucide-react'
import { MapboxAutocomplete } from './MapboxAutocomplete'

export function SearchBar() {
  const [location, setLocation] = useState('')
  const [dates, setDates] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement search functionality
    console.log('Searching for:', { location, dates })
  }

  return (
    <form onSubmit={handleSearch} className="w-full max-w-2xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-white rounded-lg shadow-lg">
        <div className="flex-1 relative">
          <MapboxAutocomplete
            value={location}
            onChange={setLocation}
            onSelect={(place) => {
              setLocation(place.place_name);
              // Store coordinates for future use
              console.log('Selected location:', place);
            }}
            placeholder="Where do you need parking?"
            className="w-full"
          />
        </div>
        
        <div className="flex-1 relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="When do you need it?"
            value={dates}
            onChange={(e) => setDates(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        
        <button
          type="submit"
          className="btn-primary px-8 py-3 flex items-center justify-center gap-2"
        >
          <Search className="w-5 h-5" />
          Search
        </button>
      </div>
    </form>
  )
} 