'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import { Car } from 'lucide-react'
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

export function PropertiesMap({ properties, userLocation, onPropertyClick, className = '' }: PropertiesMapProps) {
  const { user } = useAuth()
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const markersRef = useRef<Array<{ marker: mapboxgl.Marker; element: HTMLDivElement }>>([])
  const [currentZoom, setCurrentZoom] = useState(12)

  // Function to calculate scale based on zoom level
  const getScaleForZoom = useCallback((zoom: number): number => {
    // Base zoom is 12, scale factor increases with zoom
    // At zoom 12: scale = 1.0
    // At zoom 15: scale = 1.5
    // At zoom 9: scale = 0.7
    const baseZoom = 12
    const scaleFactor = Math.pow(1.15, zoom - baseZoom) // Exponential scaling
    return Math.max(0.5, Math.min(2.0, scaleFactor)) // Clamp between 0.5x and 2.0x
  }, [])

  // Update marker sizes based on zoom
  const updateMarkerSizes = useCallback((zoom: number) => {
    const scale = getScaleForZoom(zoom)
    markersRef.current.forEach(({ element }) => {
      element.style.transform = `scale(${scale})`
      element.style.transformOrigin = 'bottom center'
    })
  }, [getScaleForZoom])

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
      setCurrentZoom(map.current!.getZoom())
    })

    // Listen for zoom changes to scale markers
    const handleZoom = () => {
      if (map.current) {
        const zoom = map.current.getZoom()
        setCurrentZoom(zoom)
        updateMarkerSizes(zoom)
      }
    }

    map.current.on('zoom', handleZoom)
    map.current.on('zoomend', handleZoom)

    return () => {
      if (map.current) {
        map.current.off('zoom', handleZoom)
        map.current.off('zoomend', handleZoom)
        map.current.remove()
      }
    }
  }, [userLocation, updateMarkerSizes])

  useEffect(() => {
    if (!map.current || !mapLoaded) return

    // Remove existing markers
    const existingMarkers = document.querySelectorAll('.mapboxgl-marker')
    existingMarkers.forEach(marker => marker.remove())
    markersRef.current = [] // Clear marker references

    // Add markers for each property
    properties.forEach(property => {
      if (!property.latitude || !property.longitude) return

      // Create marker element with proper pin shape and car icon
      const markerEl = document.createElement('div')
      markerEl.className = 'property-marker'
      markerEl.style.width = '48px'
      markerEl.style.height = '64px'
      markerEl.style.cursor = 'pointer'
      markerEl.style.position = 'relative'
      
      // Create pin SVG container - larger size
      const pinSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      pinSvg.setAttribute('width', '48')
      pinSvg.setAttribute('height', '64')
      pinSvg.setAttribute('viewBox', '0 0 36 48')
      pinSvg.style.display = 'block'
      
      // Pin shadow
      const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse')
      shadow.setAttribute('cx', '18')
      shadow.setAttribute('cy', '46')
      shadow.setAttribute('rx', '5')
      shadow.setAttribute('ry', '1.5')
      shadow.setAttribute('fill', 'rgba(0,0,0,0.15)')
      pinSvg.appendChild(shadow)
      
      // Pin body - teardrop shape
      const pinBody = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      pinBody.setAttribute('d', 'M 18 0 C 25 0 30 5 30 12 C 30 20 18 36 18 36 C 18 36 6 20 6 12 C 6 5 11 0 18 0 Z')
      pinBody.setAttribute('fill', '#3B82F6')
      pinBody.setAttribute('stroke', 'white')
      pinBody.setAttribute('stroke-width', '2.5')
      pinSvg.appendChild(pinBody)
      
      // Pin point
      const pinPoint = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      pinPoint.setAttribute('d', 'M 18 36 L 12 46 L 18 48 L 24 46 Z')
      pinPoint.setAttribute('fill', '#3B82F6')
      pinPoint.setAttribute('stroke', 'white')
      pinPoint.setAttribute('stroke-width', '2.5')
      pinSvg.appendChild(pinPoint)
      
      // Create container for car icon - positioned in the widest part of the pin (top)
      const carContainer = document.createElement('div')
      carContainer.style.position = 'absolute'
      carContainer.style.top = '4px'
      carContainer.style.left = '9px'
      carContainer.style.width = '30px'
      carContainer.style.height = '30px'
      carContainer.style.display = 'flex'
      carContainer.style.alignItems = 'center'
      carContainer.style.justifyContent = 'center'
      carContainer.style.color = 'white'
      
      // Render Car icon from lucide-react - larger size
      const root = createRoot(carContainer)
      root.render(<Car size={24} strokeWidth={2.5} />)
      
      markerEl.appendChild(pinSvg)
      markerEl.appendChild(carContainer)

      // Create popup with Book Now button (hide if user owns the property)
      const isOwnProperty = property.host_id === user?.id
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 12px; min-width: 220px;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: #111;">${property.title}</h3>
          <p style="margin: 0 0 6px 0; color: #666; font-size: 14px; line-height: 1.4;">${property.address}</p>
          <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #3B82F6;">
            <strong>$${property.hourly_rate}/hour</strong>
          </p>
          ${property.distance ? `<p style="margin: 0 0 8px 0; color: #666; font-size: 12px;">${property.distance.toFixed(1)} km away</p>` : ''}
          ${property.host ? `<p style="margin: 0 0 12px 0; color: #666; font-size: 12px;">Host: ${property.host.first_name} ${property.host.last_name}</p>` : ''}
          ${isOwnProperty 
            ? `<div style="width: 100%; padding: 10px 16px; background-color: #f3f4f6; color: #6b7280; border-radius: 6px; font-size: 14px; text-align: center;">Your Listing</div>`
            : `<button 
                onclick="window.location.href='/find-parking?property=${property.id}&book=true'" 
                style="
                  width: 100%; 
                  padding: 10px 16px; 
                  background-color: #3B82F6; 
                  color: white; 
                  border: none; 
                  border-radius: 6px; 
                  font-size: 14px; 
                  font-weight: 600; 
                  cursor: pointer;
                  transition: background-color 0.2s;
                "
                onmouseover="this.style.backgroundColor='#2563EB'"
                onmouseout="this.style.backgroundColor='#3B82F6'"
              >
                Book Now
              </button>`
          }
        </div>
      `)

      // Add marker to map - anchor at bottom center so pin point is at the location
      const marker = new mapboxgl.Marker({
        element: markerEl,
        anchor: 'bottom' // Pin point will be at the exact location
      })
        .setLngLat([property.longitude, property.latitude])
        .setPopup(popup)
        .addTo(map.current!)

      // Store marker reference for zoom scaling
      markersRef.current.push({ marker, element: markerEl })

      // Set initial scale based on current zoom
      const initialScale = getScaleForZoom(map.current!.getZoom())
      markerEl.style.transform = `scale(${initialScale})`
      markerEl.style.transformOrigin = 'bottom center'

      // Add click handler
      markerEl.addEventListener('click', () => {
        if (onPropertyClick) {
          onPropertyClick(property)
        }
      })
    })

    // Update all marker sizes when zoom changes
    updateMarkerSizes(map.current.getZoom())

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

    // Keep map centered on Halifax, zoomed out - don't auto-zoom to listings
    // This ensures the map always shows Halifax as a whole, regardless of property locations
    map.current!.setCenter(HALIFAX_CENTER)
    map.current!.setZoom(12)
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
                  <p className="text-sm font-medium text-blue-600">${property.hourly_rate}/hr</p>
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
