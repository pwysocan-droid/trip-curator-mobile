'use client'

import {useEffect, useRef} from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import styles from '@/styles/MapWidget.module.css'

interface Marker {
  lat: number
  lng: number
  name: string
  type: 'stay' | 'experience' | 'service'
  /** Optional label shown inside the pill (e.g. "$298"). Falls back to type label. */
  label?: string
}

interface MapWidgetProps {
  center: [number, number]
  markers: Marker[]
  radiusKm: number
  /** When true, render compact dot markers instead of full pills (for tiny maps) */
  compact?: boolean
}

const TYPE_LABEL: Record<string, string> = {
  stay: 'Stay',
  experience: 'Experience',
  service: 'Eat',
}

export default function MapWidget({center, markers, radiusKm, compact = false}: MapWidgetProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapContainer.current) return

    mapRef.current = L.map(mapContainer.current, {
      zoomControl: !compact,
      scrollWheelZoom: false,
      attributionControl: false,
    }).setView(center, 10)

    // Subtle attribution
    L.control.attribution({prefix: false}).addAttribution('© OpenStreetMap').addTo(mapRef.current)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(mapRef.current)

    // Airbnb-style price-bubble pins
    markers.forEach((marker) => {
      const isStay = marker.type === 'stay'
      const labelText = marker.label || TYPE_LABEL[marker.type]

      const html = compact
        ? `<div class="${styles.dot} ${isStay ? styles.dotStay : ''}"></div>`
        : `<div class="${styles.bubble} ${isStay ? styles.bubbleStay : ''}">
             <span>${labelText}</span>
           </div>`

      const icon = L.divIcon({
        html,
        className: styles.pinWrap,
        iconSize: compact ? [16, 16] : [60, 30],
        iconAnchor: compact ? [8, 8] : [30, 15],
      })

      L.marker([marker.lat, marker.lng], {icon}).addTo(mapRef.current!)
    })

    // Fit map to all markers
    if (markers.length > 1) {
      const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng] as [number, number]))
      mapRef.current.fitBounds(bounds, {padding: [40, 40], maxZoom: 11})
    }

    // Optional radius circle — softer than v1
    if (radiusKm) {
      L.circle(center, {
        radius: radiusKm * 1000,
        color: '#FF385C',
        weight: 1.2,
        opacity: 0.35,
        fillColor: '#FF385C',
        fillOpacity: 0.04,
      }).addTo(mapRef.current)
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [center, markers, radiusKm, compact])

  return (
    <div className={styles.container}>
      <div ref={mapContainer} className={styles.map} />
    </div>
  )
}
