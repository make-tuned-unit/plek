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

export function PropertiesMap({ properties, userLocation, onPropertyClick, className = '' }: PropertiesMapProps) {
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

    // Initialize map - always center on Halifax, zoomed out
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: HALIFAX_CENTER, // Always center on Halifax
      zoom: 12,
      accessToken: token
    })

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    // Add geolocate control
    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true,
      showUserHeading: true
    })
    map.current.addControl(geolocate, 'top-left')

    map.current.on('load', () => {
      setMapLoaded(true)
    })

    return () => {
      if (map.current) {
        map.current.remove()
      }
    }
  }, [userLocation])

  useEffect(() => {
    if (!map.current || !mapLoaded) return

    // Remove existing markers
    markersRef.current.forEach(({ marker }) => marker.remove())
    markersRef.current = []

    // Add markers for each property with valid coordinates
    properties.forEach(property => {
      if (typeof property.latitude !== 'number' || typeof property.longitude !== 'number') {
        return
      }

      // Create marker element with P logo as map pin
      const markerEl = document.createElement('div')
      markerEl.className = 'property-marker'
      markerEl.style.width = '48px'
      markerEl.style.height = '48px'
      markerEl.style.cursor = 'pointer'
      markerEl.style.position = 'relative'
      markerEl.style.display = 'flex'
      markerEl.style.alignItems = 'center'
      markerEl.style.justifyContent = 'center'
      
      // Create image element for P logo
      const pinImage = document.createElement('img')
      pinImage.src = '/logo.png'
      pinImage.alt = 'Property location'
      pinImage.style.width = '48px'
      pinImage.style.height = '48px'
      pinImage.style.objectFit = 'contain'
      pinImage.style.display = 'block'
      pinImage.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
      
      markerEl.appendChild(pinImage)

      // Create popup with Book Now button (hide if user owns the property)
      const isOwnProperty = property.host_id === user?.id
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

      // Add marker to map - anchor at center for P logo
      const marker = new mapboxgl.Marker({
        element: markerEl,
        anchor: 'center'
      })
        .setLngLat([property.longitude, property.latitude])
        .setPopup(popup)
        .addTo(map.current!)

      // Store marker reference if needed later (currently no scaling)
      markersRef.current.push({ marker, element: markerEl })

      // Ensure marker anchor is at center
      markerEl.style.transform = 'translate3d(0, 0, 0)'
      markerEl.style.transformOrigin = 'center center'

      // Add click handler
      markerEl.addEventListener('click', () => {
        if (onPropertyClick) {
          onPropertyClick(property)
        }
      })
    })

    // Add user location marker if available
    if (userLocation) {
      const userMarkerEl = document.createElement('div')
      userMarkerEl.className = 'user-marker'
      userMarkerEl.style.width = '20px'
      userMarkerEl.style.height = '20px'
      userMarkerEl.style.borderRadius = '50%'
      userMarkerEl.style.backgroundColor = '#10B981'
      userMarkerEl.style.border = '3px solid white'
      userMarkerEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)'

      new mapboxgl.Marker(userMarkerEl)
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(map.current!)
    }

    // When multiple properties have coordinates, fit the map to include all markers.
    const propertiesWithCoords = properties.filter(
      (property) =>
        typeof property.latitude === 'number' && typeof property.longitude === 'number'
    )

    if (propertiesWithCoords.length > 1) {
      const bounds = new mapboxgl.LngLatBounds()
      propertiesWithCoords.forEach((property) => {
        bounds.extend([property.longitude, property.latitude])
      })
      map.current!.fitBounds(bounds, { padding: 80, maxZoom: 15 })
    } else {
      map.current!.setCenter(HALIFAX_CENTER)
      map.current!.setZoom(12)
    }
  }, [properties, mapLoaded, userLocation, onPropertyClick])

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const isTokenConfigured = token && token !== 'your_mapbox_token_here'

  if (!isTokenConfigured) {
    return (
      <div className={`relative ${className}`}>
        <div className="w-full h-full min-h-[400px] rounded-lg bg-gray-100 flex items-center justify-center">
          <div className="text-center p-8">
            <Map className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Map View</h3>
            <p className="text-gray-600 mb-4">Mapbox token not configured</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl">
              {properties.slice(0, 6).map((property) => (
                <div key={property.id} className="bg-white p-4 rounded-lg shadow-sm">
                  <h4 className="font-medium text-gray-900">{property.title}</h4>
                  <p className="text-sm text-gray-600">{property.address}</p>
                  <p className="text-sm font-medium text-accent-600">${property.hourly_rate}/hr</p>
                  {property.distance && (
                    <p className="text-xs text-gray-500">{property.distance.toFixed(1)} km away</p>
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
    <div className={`relative ${className}`}>
      <div ref={mapContainer} className="w-full h-full min-h-[400px] rounded-lg" />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-gray-500">Loading map...</div>
        </div>
      )}
    </div>
  )
}
