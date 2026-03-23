'use client'

import { useEffect, useMemo, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

export interface CommercialZoneDraft {
  id: string
  name: string
  description?: string
  lat?: number
  lng?: number
  accessInstructions?: string
  photoUrl?: string
  isDefaultZone?: boolean
  isActive?: boolean
}

interface CommercialZonePlannerProps {
  propertyLocation?: { lat?: number; lng?: number }
  zones: CommercialZoneDraft[]
  selectedZoneId?: string
  placementMode: 'property' | 'zone'
  onPropertyLocationChange: (coords: { lat: number; lng: number }) => void
  onZoneLocationChange: (zoneId: string, coords: { lat: number; lng: number }) => void
}

const HALIFAX_CENTER: [number, number] = [-63.5752, 44.6488]

export function CommercialZonePlanner({
  propertyLocation,
  zones,
  selectedZoneId,
  placementMode,
  onPropertyLocationChange,
  onZoneLocationChange,
}: CommercialZonePlannerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const propertyMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const zoneMarkersRef = useRef<mapboxgl.Marker[]>([])

  const selectedZone = useMemo(
    () => zones.find((zone) => zone.id === selectedZoneId),
    [selectedZoneId, zones]
  )

  useEffect(() => {
    if (!containerRef.current) return

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token || token === 'your_mapbox_token_here') return

    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center:
        propertyLocation?.lng != null && propertyLocation?.lat != null
          ? [propertyLocation.lng, propertyLocation.lat]
          : HALIFAX_CENTER,
      zoom: propertyLocation?.lng != null && propertyLocation?.lat != null ? 13 : 10,
      accessToken: token,
    })

    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    mapRef.current.on('click', (event) => {
      const coords = { lat: event.lngLat.lat, lng: event.lngLat.lng }
      if (placementMode === 'property') {
        onPropertyLocationChange(coords)
        return
      }
      if (selectedZoneId) {
        onZoneLocationChange(selectedZoneId, coords)
      }
    })

    return () => {
      zoneMarkersRef.current.forEach((marker) => marker.remove())
      propertyMarkerRef.current?.remove()
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (propertyLocation?.lng != null && propertyLocation?.lat != null) {
      if (!propertyMarkerRef.current) {
        const el = document.createElement('div')
        el.className = 'h-5 w-5 rounded-full border-4 border-white bg-accent-500 shadow-lg'
        propertyMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
      }
      propertyMarkerRef.current
        .setLngLat([propertyLocation.lng, propertyLocation.lat])
        .addTo(map)
      map.flyTo({
        center: [propertyLocation.lng, propertyLocation.lat],
        zoom: Math.max(map.getZoom(), 12),
        essential: true,
      })
    }
  }, [propertyLocation?.lat, propertyLocation?.lng])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    zoneMarkersRef.current.forEach((marker) => marker.remove())
    zoneMarkersRef.current = []

    zones.forEach((zone) => {
      if (zone.lat == null || zone.lng == null) return
      const el = document.createElement('button')
      el.type = 'button'
      el.className =
        zone.id === selectedZone?.id
          ? 'h-9 w-9 rounded-full border-4 border-white bg-charcoal-900 text-white text-xs font-semibold shadow-lg'
          : 'h-8 w-8 rounded-full border-4 border-white bg-accent-400 text-charcoal-900 text-xs font-semibold shadow-md'
      el.textContent = zone.name.slice(0, 2).toUpperCase()
      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([zone.lng, zone.lat])
        .addTo(map)
      zoneMarkersRef.current.push(marker)
    })
  }, [selectedZone?.id, zones])

  return (
    <div className="overflow-hidden rounded-2xl border border-mist-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-mist-200 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-charcoal-900">Zone pin setup</p>
          <p className="text-xs text-charcoal-500">
            Click the map to place the {placementMode === 'property' ? 'property pin' : selectedZone ? `"${selectedZone.name}" zone pin` : 'selected zone pin'}.
          </p>
        </div>
        <div className="rounded-full bg-mist-100 px-3 py-1 text-xs font-medium text-charcoal-700">
          {placementMode === 'property' ? 'Property pin mode' : 'Zone pin mode'}
        </div>
      </div>
      <div ref={containerRef} className="h-[320px] w-full bg-mist-100" />
      <div className="border-t border-mist-200 bg-mist-50 px-4 py-3 text-xs text-charcoal-600">
        Use a simple point for each zone in v1. Polygon support can be added later without changing the commercial data model.
      </div>
    </div>
  )
}
