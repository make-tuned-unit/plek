'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { MapboxAutocomplete } from './MapboxAutocomplete'
import { useRouter } from 'next/navigation'

export function SearchBar() {
  const [location, setLocation] = useState('')
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Navigate to find-parking page with location query
    if (location.trim()) {
      router.push(`/find-parking?location=${encodeURIComponent(location)}`)
    } else {
      router.push('/find-parking')
    }
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