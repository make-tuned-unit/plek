'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Map } from 'lucide-react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useAuth } from '@/contexts/AuthContext'

interface Property {
  id: string
  title: string
  address: string
  hourly_rate: number
  latitude?: number
  longitude?: number
  distance?: number
  property_type?: string
  host?: {
    first_name: string
    last_name: string
    rating?: number
  }
}

interface PropertiesMapProps {
  properties: Property[]
  userLocation?: { lat: number; lng: number }
  selectedLocation?: { lat: number; lng: number }
  onPropertyClick?: (property: Property) => void
  className?: string
}

// Halifax, Nova Scotia coordinates: [-63.5752, 44.6488]
const HALIFAX_CENTER: [number, number] = [-63.5752, 44.6488]

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

const formatPropertyAddress = (property: any) => {
  if (!property) return 'Address unavailable'
  const street =
    typeof property.address === 'string'
      ? property.address.split(',')[0]?.trim() || property.address
      : ''

  const parts = [street, property.city, formatProvince(property.state)].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : 'Address unavailable'
}

export function PropertiesMap({ properties, userLocation, selectedLocation, onPropertyClick, className = '' }: PropertiesMapProps) {
  const { user } = useAuth()
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const markersRef = useRef<Array<{ marker: mapboxgl.Marker; element: HTMLDivElement }>>([])

  useEffect(() => {
    if (!mapContainer.current) return

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token || token === 'your_mapbox_token_here') {
      console.warn('Mapbox token not configured')
      return
    }

    // Initialize map - use greyscale style so colored pins pop more
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11', // Greyscale/light style for better pin visibility
      center: HALIFAX_CENTER, // Always center on Halifax
      zoom: 12,
      accessToken: token
    })

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    // Add geolocate control only if geolocation is supported
    if (navigator.geolocation) {
      const geolocate = new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
      })
      map.current.addControl(geolocate, 'top-left')
    }

    map.current.on('load', () => {
      setMapLoaded(true)
    })

    // Ensure markers stay fixed on zoom - re-validate positions when zoom changes
    map.current.on('zoom', () => {
      // Force markers to re-validate their positions
      markersRef.current.forEach(({ marker }) => {
        const lngLat = marker.getLngLat()
        // Re-set the position to ensure it's correct at current zoom level
        marker.setLngLat(lngLat)
      })
    })

    return () => {
      if (map.current) {
        map.current.remove()
      }
    }
  }, []) // Remove userLocation dependency - map should only initialize once

  useEffect(() => {
    if (!map.current || !mapLoaded) return

    // Remove existing markers
    markersRef.current.forEach(({ marker }) => marker.remove())
    markersRef.current = []

    console.log(`Creating markers for ${properties.length} properties`)
    
    // Add markers for each property with valid coordinates
    properties.forEach(property => {
      // Validate coordinates are numbers and in valid range
      if (
        typeof property.latitude !== 'number' || 
        typeof property.longitude !== 'number' ||
        isNaN(property.latitude) || 
        isNaN(property.longitude) ||
        property.latitude < -90 || 
        property.latitude > 90 ||
        property.longitude < -180 || 
        property.longitude > 180
      ) {
        console.warn(`Invalid coordinates for property ${property.id}:`, property.latitude, property.longitude)
        return
      }

      // Create marker element with icon.png as map pin
      const markerEl = document.createElement('div')
      markerEl.className = 'property-marker'
      // Let Mapbox handle positioning completely
      markerEl.style.width = '48px'
      markerEl.style.height = '48px'
      markerEl.style.cursor = 'pointer'
      markerEl.style.display = 'flex'
      markerEl.style.alignItems = 'center'
      markerEl.style.justifyContent = 'center'
      markerEl.style.pointerEvents = 'auto'
      markerEl.style.margin = '0'
      markerEl.style.padding = '0'
      markerEl.style.border = 'none'
      markerEl.style.outline = 'none'
      // Don't set position, transform, or transformOrigin - let Mapbox handle all positioning
      
      // Use icon.png for map pins
      const pinImage = document.createElement('img')
      pinImage.src = '/icon.png'
      pinImage.alt = 'Property location'
      pinImage.style.width = '48px'
      pinImage.style.height = '48px'
      pinImage.style.objectFit = 'contain'
      pinImage.style.display = 'block'
      pinImage.style.margin = '0' // Remove any default margins
      pinImage.style.padding = '0' // Remove any default padding
      pinImage.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
      pinImage.style.pointerEvents = 'none' // Prevent image from intercepting clicks
      pinImage.style.position = 'relative' // Ensure proper positioning
      
      // Handle image load errors - fallback to a simple colored div if PNG fails
      pinImage.onerror = () => {
        console.warn('Failed to load icon.png, using fallback marker')
        pinImage.style.display = 'none'
        const fallbackDiv = document.createElement('div')
        fallbackDiv.style.width = '32px'
        fallbackDiv.style.height = '32px'
        fallbackDiv.style.borderRadius = '50%'
        fallbackDiv.style.backgroundColor = '#3dbb85'
        fallbackDiv.style.border = '3px solid white'
        fallbackDiv.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)'
        markerEl.appendChild(fallbackDiv)
      }
      
      markerEl.appendChild(pinImage)

      // Create popup with Book Now button (hide if user owns the property)
      const isOwnProperty = (property as any).hostId || (property as any).host_id === user?.id
      const popupContent = document.createElement('div')
      popupContent.style.padding = '12px'
      popupContent.style.minWidth = '220px'

      const titleEl = document.createElement('h3')
      titleEl.style.margin = '0 0 8px 0'
      titleEl.style.fontSize = '16px'
      titleEl.style.fontWeight = 'bold'
      titleEl.style.color = '#111'
      titleEl.textContent = property.title
      popupContent.appendChild(titleEl)

      const addressEl = document.createElement('p')
      addressEl.style.margin = '0 0 6px 0'
      addressEl.style.color = '#666'
      addressEl.style.fontSize = '14px'
      addressEl.style.lineHeight = '1.4'
      addressEl.textContent = formatPropertyAddress(property)
      popupContent.appendChild(addressEl)

      const rateEl = document.createElement('p')
      rateEl.style.margin = '0 0 8px 0'
      rateEl.style.fontSize = '16px'
      rateEl.style.fontWeight = '600'
      rateEl.style.color = '#3DBB85'
      rateEl.innerHTML = `<strong>$${property.hourly_rate}/hour</strong>`
      popupContent.appendChild(rateEl)

      if (property.distance) {
        const distanceEl = document.createElement('p')
        distanceEl.style.margin = '0 0 8px 0'
        distanceEl.style.color = '#666'
        distanceEl.style.fontSize = '12px'
        distanceEl.textContent = `${property.distance.toFixed(1)} km away`
        popupContent.appendChild(distanceEl)
      }

      if (property.host) {
        const hostEl = document.createElement('p')
        hostEl.style.margin = '0 0 12px 0'
        hostEl.style.color = '#666'
        hostEl.style.fontSize = '12px'
        hostEl.textContent = `Host: ${property.host.first_name} ${property.host.last_name}`
        popupContent.appendChild(hostEl)
      }

      if (isOwnProperty) {
        const ownListingEl = document.createElement('div')
        ownListingEl.style.width = '100%'
        ownListingEl.style.padding = '10px 16px'
        ownListingEl.style.backgroundColor = '#f3f4f6'
        ownListingEl.style.color = '#6b7280'
        ownListingEl.style.borderRadius = '6px'
        ownListingEl.style.fontSize = '14px'
        ownListingEl.style.textAlign = 'center'
        ownListingEl.textContent = 'Your Listing'
        popupContent.appendChild(ownListingEl)
      } else {
        const bookButton = document.createElement('button')
        bookButton.style.width = '100%'
        bookButton.style.padding = '10px 16px'
        bookButton.style.backgroundColor = '#3DBB85'
        bookButton.style.color = '#ffffff'
        bookButton.style.border = 'none'
        bookButton.style.borderRadius = '6px'
        bookButton.style.fontSize = '14px'
        bookButton.style.fontWeight = '600'
        bookButton.style.cursor = 'pointer'
        bookButton.style.transition = 'background-color 0.2s'
        bookButton.textContent = 'Book Now'

        bookButton.addEventListener('mouseenter', () => {
          bookButton.style.backgroundColor = '#2c9970'
        })
        bookButton.addEventListener('mouseleave', () => {
          bookButton.style.backgroundColor = '#3DBB85'
        })
        bookButton.addEventListener('click', (event) => {
          event.preventDefault()
          event.stopPropagation()
          if (onPropertyClick) {
            onPropertyClick(property)
          } else {
            const redirectTarget = `/find-parking?property=${property.id}&book=true`
            window.location.href = `/auth/signup?redirect=${encodeURIComponent(redirectTarget)}`
          }
        })

        popupContent.appendChild(bookButton)
      }

      const popup = new mapboxgl.Popup({ offset: 25 }).setDOMContent(popupContent)

      // Validate coordinate order: Mapbox expects [longitude, latitude]
      let lng = Number(property.longitude)
      let lat = Number(property.latitude)
      
      // Detect and fix coordinate swap
      // Latitude should be between -90 and 90
      // Longitude should be between -180 and 180
      // If both values are in the -90 to 90 range, check if they're swapped
      const bothInLatRange = lat >= -90 && lat <= 90 && lng >= -90 && lng <= 90
      const latInLngRange = (lat >= -180 && lat <= 180) && (lat < -90 || lat > 90)
      const lngInLatRange = lng >= -90 && lng <= 90
      
      // If coordinates appear swapped (lat is outside -90 to 90 but in -180 to 180, and lng is in -90 to 90)
      // OR if both are in lat range but the "lng" value looks more like a latitude (positive for northern hemisphere)
      if (latInLngRange && lngInLatRange) {
        console.warn(`Coordinate swap detected for property ${property.id}, correcting...`)
        const temp = lng
        lng = lat
        lat = temp
      } else if (bothInLatRange && lng > 0 && lat < 0) {
        // Both in lat range, but lng is positive (northern hemisphere) and lat is negative - likely swapped
        console.warn(`Coordinate swap detected for property ${property.id} (both in lat range), correcting...`)
        const temp = lng
        lng = lat
        lat = temp
      }
      
      // Create marker with validated coordinates
      // Use 'center' anchor with a small upward offset to compensate for visual drift
      const marker = new mapboxgl.Marker({
        element: markerEl,
        anchor: 'center', // Center anchor - icon center aligns with coordinates
        draggable: false,
        // Ensure marker maintains position at all zoom levels
        pitchAlignment: 'map',
        rotationAlignment: 'map',
        // Small upward offset to compensate for downward drift when zoomed out
        // Offset is in pixels: [x, y] where positive y moves down, negative y moves up
        offset: [0, -2] // Move up 2px to compensate for drift
      })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map.current!)
      
      markersRef.current.push({ marker, element: markerEl })
      console.log(`Created marker for property ${property.id} at [${lng}, ${lat}]`)

      // Add click handler
      markerEl.addEventListener('click', () => {
        if (onPropertyClick) {
          onPropertyClick(property)
        }
      })
    })

    // Add user location marker if available
    if (userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lng === 'number') {
      const userMarkerEl = document.createElement('div')
      userMarkerEl.className = 'user-marker'
      userMarkerEl.style.width = '20px'
      userMarkerEl.style.height = '20px'
      userMarkerEl.style.borderRadius = '50%'
      userMarkerEl.style.backgroundColor = '#10B981'
      userMarkerEl.style.border = '3px solid white'
      userMarkerEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)'
      userMarkerEl.style.transform = 'none'
      userMarkerEl.style.transformOrigin = 'center center'

      // Validate user location coordinates
      const userLng = Number(userLocation.lng)
      const userLat = Number(userLocation.lat)
      
      if (
        !isNaN(userLng) && !isNaN(userLat) &&
        userLat >= -90 && userLat <= 90 &&
        userLng >= -180 && userLng <= 180
      ) {
        new mapboxgl.Marker({
          element: userMarkerEl,
          anchor: 'center',
          draggable: false
        })
          .setLngLat([userLng, userLat])
          .addTo(map.current!)
      } else {
        console.warn('Invalid user location coordinates:', userLocation)
      }
    }

    // When multiple properties have coordinates, fit the map to include all markers.
    const propertiesWithCoords = properties.filter(
      (property) => {
        const lat = Number(property.latitude)
        const lng = Number(property.longitude)
        return (
          typeof property.latitude === 'number' && 
          typeof property.longitude === 'number' &&
          !isNaN(lat) && !isNaN(lng) &&
          lat >= -90 && lat <= 90 &&
          lng >= -180 && lng <= 180
        )
      }
    )

    // Center map based on selectedLocation, userLocation (GPS), properties, or default
    if (selectedLocation) {
      // If user selected a location, center on it
      map.current!.setCenter([selectedLocation.lng, selectedLocation.lat])
      map.current!.setZoom(14)
    } else if (userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lng === 'number') {
      // If user clicked "Use My Location", prioritize their GPS location over properties
      map.current!.setCenter([userLocation.lng, userLocation.lat])
      map.current!.setZoom(12)
    } else if (propertiesWithCoords.length > 1) {
      const bounds = new mapboxgl.LngLatBounds()
      propertiesWithCoords.forEach((property) => {
        let lng = Number(property.longitude)
        let lat = Number(property.latitude)
        
        // Apply same swap detection logic
        const latInLngRange = lat >= -180 && lat <= 180 && (lat < -90 || lat > 90)
        const lngInLatRange = lng >= -90 && lng <= 90
        const bothInLatRange = lat >= -90 && lat <= 90 && lng >= -90 && lng <= 90
        
        if (latInLngRange && lngInLatRange) {
          const temp = lng
          lng = lat
          lat = temp
        } else if (bothInLatRange && lng > 0 && lat < 0) {
          const temp = lng
          lng = lat
          lat = temp
        }
        
        bounds.extend([lng, lat])
      })
      map.current!.fitBounds(bounds, { padding: 80, maxZoom: 15 })
    } else if (propertiesWithCoords.length === 1) {
      const property = propertiesWithCoords[0]
      let lng = Number(property.longitude)
      let lat = Number(property.latitude)
      
      // Apply same swap detection logic
      const latInLngRange = lat >= -180 && lat <= 180 && (lat < -90 || lat > 90)
      const lngInLatRange = lng >= -90 && lng <= 90
      const bothInLatRange = lat >= -90 && lat <= 90 && lng >= -90 && lng <= 90
      
      if (latInLngRange && lngInLatRange) {
        const temp = lng
        lng = lat
        lat = temp
      } else if (bothInLatRange && lng > 0 && lat < 0) {
        const temp = lng
        lng = lat
        lat = temp
      }
      
      map.current!.setCenter([lng, lat])
      map.current!.setZoom(14)
    } else {
      map.current!.setCenter(HALIFAX_CENTER)
      map.current!.setZoom(12)
    }
    
    console.log(`Map centered. Properties with coords: ${propertiesWithCoords.length}, Markers created: ${markersRef.current.length}`)
  }, [properties, mapLoaded, userLocation, selectedLocation, onPropertyClick])

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const isTokenConfigured = token && token !== 'your_mapbox_token_here'

  if (!isTokenConfigured) {
    return (
      <div className={`relative ${className}`}>
        <div className="w-full h-full min-h-[400px] rounded-lg bg-mist-100 flex items-center justify-center">
          <div className="text-center p-8">
            <Map className="h-12 w-12 text-mist-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-charcoal-900 mb-2">Map View</h3>
            <p className="text-charcoal-600 mb-4">Mapbox token not configured</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl">
              {properties.slice(0, 6).map((property) => (
                <div key={property.id} className="bg-white p-4 rounded-lg shadow-sm">
                  <h4 className="font-medium text-charcoal-900">{property.title}</h4>
                  <p className="text-sm text-charcoal-600">{property.address}</p>
                  <p className="text-sm font-medium text-accent-600">${property.hourly_rate}/hr</p>
                  {property.distance && (
                    <p className="text-xs text-mist-600">{property.distance.toFixed(1)} km away</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div ref={mapContainer} className="w-full h-full rounded-lg" />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-mist-100 rounded-lg">
          <div className="text-mist-600">Loading map...</div>
        </div>
      )}
    </div>
  )
}
