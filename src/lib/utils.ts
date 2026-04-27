import {Stay, Experience, Service, TripOption} from './types'

export interface TripCuration {
  concept: string
  blurb: string
  persona: string
  stayId: string
  experienceIds: string[]
  serviceId: string
  reasoning?: string
}

const EXPERIENCES_PER_TRIP = 3

// Haversine distance calculation (lat/lng to km)
export function distance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371 // Earth radius in km
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

// Check if dates overlap
export function datesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const a1 = new Date(startA).getTime()
  const a2 = new Date(endA).getTime()
  const b1 = new Date(startB).getTime()
  const b2 = new Date(endB).getTime()
  return !(a2 < b1 || b2 < a1)
}

// Per-location editorial copy
const TRIP_NARRATIVES: Record<string, {headline: string; blurb: string; persona: string}> = {
  'Gordes': {
    headline: 'Stone-village mornings, Luberon afternoons — Gordes',
    blurb: 'A pocket of Provence where potters and painters quietly settled. The light here teaches you to see slowly. Four centuries of stone walls hold the memory of hands at work.',
    persona: 'The maker seeking ground',
  },
  'Saint-Rémy-de-Provence': {
    headline: 'Quiet-walled streets where Van Gogh painted — Saint-Rémy',
    blurb: 'A village that doesn\'t perform for visitors — it simply exists, and you get to exist alongside it. The market opens the doors. The walking does the rest.',
    persona: 'The food-focused traveler',
  },
  'Aix-en-Provence': {
    headline: 'Rooftop aperitif hour in old Aix — Aix-en-Provence',
    blurb: 'Place des Précheurs at dusk, market mornings, the long shadow of Sainte-Victoire on the horizon. A city where slowness is a discipline.',
    persona: 'The city-walker',
  },
  'Èze': {
    headline: 'A medieval village above the Mediterranean — Èze',
    blurb: 'Half-way between Nice and Monaco, perched in the cliffs. Hand-craft, art galleries, the exotic garden at the top. Romantic at the level of architecture.',
    persona: 'The romantic',
  },
  'Marseille': {
    headline: 'Coastal cove living at Malmousque — Marseille',
    blurb: 'Nestled between plane trees and umbrella pines in the heights of the corniche. The boats below, the bouillabaisse nearby. A working city you can swim in.',
    persona: 'The coastal nomad',
  },
  'Collias': {
    headline: '13th-century stone in a wine village — Collias',
    blurb: 'Limestone, lavender light, a guesthouse hidden behind a courtyard. The Pont du Gard is twenty minutes; the wines are made here.',
    persona: 'The slow traveler',
  },
}

function pickNarrative(stay: Stay) {
  const town = stay.location.split(',')[0].trim()
  return TRIP_NARRATIVES[town] || {
    headline: `Discover ${town}`,
    blurb: stay.description.substring(0, 160) + '…',
    persona: 'Traveler',
  }
}

// Assemble trips from Claude's concept-driven curations.
// Validates each pairing against the 150km radius; falls back to the nearest
// in-range alternative when Claude's pick is out of range or missing.
export function assembleTrips(
  curations: TripCuration[],
  stays: Stay[],
  experiences: Experience[],
  services: Service[],
  region: string,
  radiusKm: number = 150,
): TripOption[] {
  const stayById = new Map(stays.filter((s) => s.region === region).map((s) => [s.id, s]))
  const expPool = experiences.filter((e) => e.region === region)
  const svcPool = services.filter((s) => s.region === region)

  const usedExpIds = new Set<string>()
  const usedSvcIds = new Set<string>()
  const trips: TripOption[] = []

  for (const c of curations) {
    const stay = stayById.get(c.stayId)
    if (!stay) continue

    // Pick up to EXPERIENCES_PER_TRIP experiences:
    //   1. honor Claude's ordered ids (when in-range and unused)
    //   2. backfill from nearest unused in-range experiences
    const experiences: Experience[] = []
    const wantIds = c.experienceIds || []
    for (const wantId of wantIds) {
      if (experiences.length >= EXPERIENCES_PER_TRIP) break
      const candidate = expPool.find((e) => e.id === wantId)
      if (
        candidate &&
        !usedExpIds.has(candidate.id) &&
        !experiences.some((e) => e.id === candidate.id) &&
        distance(stay.lat, stay.lng, candidate.lat, candidate.lng) <= radiusKm
      ) {
        experiences.push(candidate)
      }
    }
    if (experiences.length < EXPERIENCES_PER_TRIP) {
      const fillers = expPool
        .filter(
          (e) => !usedExpIds.has(e.id) && !experiences.some((x) => x.id === e.id),
        )
        .map((e) => ({e, d: distance(stay.lat, stay.lng, e.lat, e.lng)}))
        .filter((x) => x.d <= radiusKm)
        .sort((a, b) => a.d - b.d)
      for (const {e} of fillers) {
        if (experiences.length >= EXPERIENCES_PER_TRIP) break
        experiences.push(e)
      }
    }

    const pickedSvc = svcPool.find((s) => s.id === c.serviceId)
    const svc = pickedSvc && !usedSvcIds.has(pickedSvc.id)
      && distance(stay.lat, stay.lng, pickedSvc.lat, pickedSvc.lng) <= radiusKm
      ? pickedSvc
      : svcPool
          .filter((s) => !usedSvcIds.has(s.id))
          .map((s) => ({s, d: distance(stay.lat, stay.lng, s.lat, s.lng)}))
          .filter((x) => x.d <= radiusKm)
          .sort((a, b) => a.d - b.d)[0]?.s

    if (experiences.length === 0 || !svc) continue

    for (const e of experiences) usedExpIds.add(e.id)
    usedSvcIds.add(svc.id)

    trips.push({
      stay,
      experiences,
      service: svc,
      headline: c.concept,
      blurb: c.blurb,
      persona: c.persona,
      totalPrice: (nights: number, experienceCount: number) => {
        const expSum = experiences
          .slice(0, experienceCount)
          .reduce((sum, e) => sum + (e.price ?? 0), 0)
        const svcCost = typeof (svc as any).price === 'string' ? 85 : (svc as any).price ?? 85
        return stay.price * nights + expSum + svcCost
      },
    })
  }

  return trips
}

// Legacy fallback: geometric closest pairing, used when no curations exist.
export function curateTripOptions(
  stays: Stay[],
  experiences: Experience[],
  services: Service[],
  region: string,
  radiusKm: number = 150,
  count: number = 3,
  preferredStayIds?: string[]
): TripOption[] {
  const regionStays = stays.filter((s) => s.region === region)

  let candidateStays: Stay[]
  if (preferredStayIds && preferredStayIds.length > 0) {
    // Use Claude's ranking; append any remaining stays as fallback
    const byId = new Map(regionStays.map((s) => [s.id, s]))
    const ranked = preferredStayIds.map((id) => byId.get(id)).filter((s): s is Stay => !!s)
    const remaining = regionStays.filter((s) => !preferredStayIds.includes(s.id))
    candidateStays = [...ranked, ...remaining]
  } else {
    // Fallback: sort by rating × log(reviews+1)
    candidateStays = [...regionStays].sort((a, b) => {
      const ar = (a.rating || 0) * Math.log(((a as any).reviewCount ?? a.reviews ?? 0) + 2)
      const br = (b.rating || 0) * Math.log(((b as any).reviewCount ?? b.reviews ?? 0) + 2)
      return br - ar
    })
  }

  const usedExpIds = new Set<string>()
  const usedSvcIds = new Set<string>()
  const trips: TripOption[] = []

  for (const stay of candidateStays) {
    if (trips.length >= count) break

    // Closest EXPERIENCES_PER_TRIP unused in-range experiences
    const expCandidates = experiences
      .filter((e) => e.region === region && !usedExpIds.has(e.id))
      .map((e) => ({e, d: distance(stay.lat, stay.lng, e.lat, e.lng)}))
      .filter((x) => x.d <= radiusKm)
      .sort((a, b) => a.d - b.d)
      .slice(0, EXPERIENCES_PER_TRIP)
      .map((x) => x.e)

    const svc = services
      .filter((s) => s.region === region && !usedSvcIds.has(s.id))
      .map((s) => ({s, d: distance(stay.lat, stay.lng, s.lat, s.lng)}))
      .filter((x) => x.d <= radiusKm)
      .sort((a, b) => a.d - b.d)[0]?.s

    if (expCandidates.length === 0 || !svc) continue

    for (const e of expCandidates) usedExpIds.add(e.id)
    usedSvcIds.add(svc.id)

    const narr = pickNarrative(stay)

    trips.push({
      stay,
      experiences: expCandidates,
      service: svc,
      headline: narr.headline,
      blurb: narr.blurb,
      persona: narr.persona,
      totalPrice: (nights: number, experienceCount: number) => {
        const expSum = expCandidates
          .slice(0, experienceCount)
          .reduce((sum, e) => sum + (e.price ?? 0), 0)
        const svcCost = typeof svc.price === 'string' ? 85 : (svc as any).price ?? 85
        return stay.price * nights + expSum + svcCost
      },
    })
  }

  return trips
}

// Parse vision analysis from Claude API response
export function parseVisionAnalysis(text: string) {
  // Simple parsing—in production, structure Claude's response better
  return {
    region: 'provence',
    aesthetic_tags: ['mediterranean', 'historic', 'artistic'],
    vibe: 'Sun-baked villages with artistic communities',
  }
}
