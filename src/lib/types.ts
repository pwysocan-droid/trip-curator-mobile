export interface VisionAnalysis {
  region: string
  aesthetic_tags: string[]
  vibe: string
  inferred_location?: string
}

export interface Listing {
  id: string
  name: string
  type: string
  region: string
  location: string
  lat: number
  lng: number
  price: number
  rating: number
  reviews: number
  description: string
  images: Array<{url: string; alt: string}>
  datesAvailable?: {startDate: string; endDate: string}
}

export interface Stay extends Listing {
  bedrooms?: number
  beds: string
  baths: number
  totalForFive: number
  pricePerNight: number
  host: {
    name: string
    avatar?: string
    isSuperhost: boolean
    yearsHosting: number
    responseRate?: string
    responseTime?: string
  }
  badges: string[]
  amenities: string[]
  reviewHighlights: Array<{tag: string; count: number}>
  ratingBreakdown: {
    cleanliness?: number
    accuracy?: number
    checkin?: number
    communication?: number
    location?: number
    value?: number
  }
}

export interface Experience extends Listing {
  duration: string
  groupSize: string
  host: {name: string}
}

export interface Service extends Listing {
  priceRange: string
  cuisine?: string
  host: {name: string}
}

export interface TripOption {
  stay: Stay
  experiences: Experience[]
  service: Service
  headline: string
  blurb: string
  persona?: string
  totalPrice: (nights: number, experienceCount: number) => number
}

export function experienceCountForNights(nights: number): number {
  if (nights <= 4) return 1
  if (nights <= 7) return 2
  return 3
}

export interface MockData {
  metadata: {
    version: string
    lastUpdated: string
    regions: string[]
    totalListings: number
  }
  stays: Stay[]
  experiences: Experience[]
  services: Service[]
}
