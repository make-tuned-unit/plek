'use client'

import { useState, useEffect, useRef } from 'react'
import { MapPin, Loader2 } from 'lucide-react'

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

interface MapboxAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelect: (place: Place) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function MapboxAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Enter address or area",
  className = "",
  disabled = false
}: MapboxAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Place[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [hasUserInteracted, setHasUserInteracted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()
  const previousValueRef = useRef<string>(value)
  const isUserTypingRef = useRef<boolean>(false)

  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  // Reset interaction state when value changes externally (not from user typing)
  useEffect(() => {
    // Only reset if the value changed externally (not from user typing)
    // This prevents auto-showing suggestions when modal opens with pre-filled data
    if (!isUserTypingRef.current && value !== previousValueRef.current) {
      setHasUserInteracted(false)
      setShowSuggestions(false)
      setSuggestions([])
    }
    previousValueRef.current = value
    // Reset the typing flag after a short delay
    if (isUserTypingRef.current) {
      setTimeout(() => {
        isUserTypingRef.current = false
      }, 100)
    }
  }, [value])

  // Get user's location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.longitude, position.coords.latitude])
        },
        (error) => {
          // Only log if it's not a user denial (code 1)
          if (error.code !== 1) {
            console.log('Geolocation not available:', error.message)
          }
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 300000 // 5 minutes
        }
      )
    }
  }, [])

  useEffect(() => {
    // Only fetch suggestions if user has interacted with the field
    if (!hasUserInteracted) {
      return
    }

    if (!value.trim()) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Debounce the API call
    timeoutRef.current = setTimeout(async () => {
      if (value.trim().length < 2) return

      setIsLoading(true)
      try {
        // Build the API URL with parameters
        const params = new URLSearchParams({
          access_token: MAPBOX_TOKEN || '',
          types: 'address,poi,neighborhood,place',
          limit: '8',
          language: 'en'
        })

        // Add proximity bias if user location is available
        if (userLocation) {
          params.append('proximity', `${userLocation[0]},${userLocation[1]}`)
        }

        // Add autocomplete parameter for better results
        params.append('autocomplete', 'true')

        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?${params}`
        )
        
        if (response.ok) {
          const data = await response.json()
          setSuggestions(data.features || [])
          // Only show suggestions if user is actively interacting
          if (hasUserInteracted && document.activeElement === inputRef.current) {
            setShowSuggestions(true)
          }
          setSelectedIndex(-1)
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error)
        setSuggestions([])
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [value, MAPBOX_TOKEN, userLocation, hasUserInteracted])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelect(suggestions[selectedIndex])
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        inputRef.current?.blur()
        break
    }
  }

  const handleSelect = (place: Place) => {
    onChange(place.place_name)
    onSelect(place)
    setShowSuggestions(false)
    setSelectedIndex(-1)
    inputRef.current?.blur()
  }

  const getPlaceType = (place: Place) => {
    // Extract place type from the place object
    const types = place.context?.map(ctx => ctx.id.split('.')[0]) || []
    if (types.includes('country')) return 'Country'
    if (types.includes('region')) return 'State/Province'
    if (types.includes('place')) return 'City'
    if (types.includes('neighborhood')) return 'Neighborhood'
    if (types.includes('address')) return 'Address'
    if (types.includes('poi')) return 'Point of Interest'
    return 'Location'
  }

  const formatSuggestion = (place: Place) => {
    const context = place.context?.map(ctx => ctx.text).join(', ')
    return context ? `${place.text}, ${context}` : place.place_name
  }

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            isUserTypingRef.current = true
            setHasUserInteracted(true)
            onChange(e.target.value)
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setHasUserInteracted(true)
            if (value.trim() && suggestions.length > 0) {
              setShowSuggestions(true)
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 animate-spin" />
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              onClick={() => handleSelect(suggestion)}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none ${
                index === selectedIndex ? 'bg-blue-50 border-l-4 border-blue-500' : ''
              }`}
            >
              <div className="flex items-center">
                <MapPin className="h-4 w-4 text-gray-400 mr-3 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {suggestion.text}
                  </div>
                  <div className="text-xs text-gray-500">
                    {suggestion.context?.map(ctx => ctx.text).join(', ')}
                  </div>
                </div>
                <div className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                  {getPlaceType(suggestion)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
} 