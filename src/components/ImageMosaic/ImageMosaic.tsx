import {TripOption, experienceCountForNights} from '@/lib/types'
import styles from './ImageMosaic.module.css'

interface Props {
  trip: TripOption
  nights: number
  // Analysis-derived signals — drive which images surface from each listing's image array
  analysisTags?: string[]
  vibe?: string
  place?: string | null
}

interface Img {
  url: string
  alt: string
}

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'into', 'onto', 'from', 'over', 'under',
  'this', 'that', 'these', 'those', 'their', 'your', 'about', 'where',
])

const EXTERIOR_HINTS = [
  'exterior', 'outside', 'outdoor', 'courtyard', 'terrace', 'patio',
  'rooftop', 'roof', 'facade', 'view', 'pool', 'garden', 'street',
  'village', 'square', 'piazza', 'plaza', 'beach', 'coast', 'building',
  'door', 'entry',
]
const INTERIOR_HINTS = [
  'interior', 'inside', 'living room', 'bedroom', 'kitchen', 'bathroom',
  'dining room', 'lounge',
]

// Build a stable list of analysis-derived search terms used to score image relevance.
// Combines tags + tokens of the vibe phrase + the inferred place name.
function buildSearchTerms(tags: string[], vibe?: string, place?: string | null): string[] {
  const terms = new Set<string>()
  for (const t of tags || []) {
    const clean = (t || '').toLowerCase().trim()
    if (clean.length >= 3) terms.add(clean)
  }
  if (vibe) {
    for (const raw of vibe.toLowerCase().split(/\s+/)) {
      const clean = raw.replace(/[^a-z-]/g, '')
      if (clean.length >= 4 && !STOPWORDS.has(clean)) terms.add(clean)
    }
  }
  if (place) {
    const clean = place.toLowerCase().trim()
    if (clean) terms.add(clean)
  }
  return Array.from(terms)
}

function relevanceScore(img: Img, terms: string[]): number {
  if (terms.length === 0) return 0
  const alt = (img.alt || '').toLowerCase()
  return terms.reduce((acc, t) => (alt.includes(t) ? acc + 1 : acc), 0)
}

function rankByRelevance(images: Img[], terms: string[]): Img[] {
  return images
    .map((img, idx) => ({img, idx, score: relevanceScore(img, terms)}))
    .sort((a, b) => b.score - a.score || a.idx - b.idx)
    .map((x) => x.img)
}

// Pick the strongest exterior shot from the stay's images.
// Score = exterior hints (+2) − interior hints (−1) + analysis relevance.
// Falls back to the listing's natural lead photo when nothing scores.
function pickHero(stayImages: Img[], terms: string[]): Img | undefined {
  if (stayImages.length === 0) return undefined
  const ranked = stayImages
    .map((img, idx) => {
      const alt = (img.alt || '').toLowerCase()
      let score = 0
      for (const h of EXTERIOR_HINTS) if (alt.includes(h)) score += 2
      for (const h of INTERIOR_HINTS) if (alt.includes(h)) score -= 1
      score += relevanceScore(img, terms)
      return {img, idx, score}
    })
    .sort((a, b) => b.score - a.score || a.idx - b.idx)
  return ranked[0]?.img
}

interface Mosaic {
  hero: Img | undefined
  below: Img[]
}

// 1 hero (stay exterior) + 4 supporting images.
// Below: 1 more stay → 2 experience → 1 service, ranked by analysis relevance,
// backfilled from any source if a category runs short. Deduped by URL.
function pickMosaic(
  trip: TripOption,
  nights: number,
  analysisTags: string[] = [],
  vibe?: string,
  place?: string | null,
): Mosaic {
  const expCount = experienceCountForNights(nights)
  const visibleExp = trip.experiences.slice(0, expCount)
  const terms = buildSearchTerms(analysisTags, vibe, place)

  const stayImgs = ((trip.stay.images || []).filter((i) => i?.url)) as Img[]
  const expImgs = visibleExp.flatMap((e) => (e.images || []).filter((i) => i?.url)) as Img[]
  const svcImgs = ((trip.service.images || []).filter((i) => i?.url)) as Img[]

  const hero = pickHero(stayImgs, terms)
  const seen = new Set<string>()
  if (hero) seen.add(hero.url)

  const remainingStay = rankByRelevance(stayImgs.filter((i) => !seen.has(i.url)), terms)
  const rankedExp = rankByRelevance(expImgs, terms)
  const rankedSvc = rankByRelevance(svcImgs, terms)

  const below: Img[] = []
  const tryAdd = (img: Img | undefined) => {
    if (!img?.url || seen.has(img.url) || below.length >= 4) return
    seen.add(img.url)
    below.push(img)
  }

  // Composition for the 4 supporting tiles
  tryAdd(remainingStay[0])
  tryAdd(rankedExp[0])
  tryAdd(rankedExp[1])
  tryAdd(rankedSvc[0])

  // Backfill in relevance order if a category was short
  for (const img of [...remainingStay, ...rankedExp, ...rankedSvc]) tryAdd(img)

  return {hero, below: below.slice(0, 4)}
}

export function ImageMosaic({trip, nights, analysisTags, vibe, place}: Props) {
  const {hero, below} = pickMosaic(trip, nights, analysisTags, vibe, place)
  if (!hero && below.length === 0) return null

  return (
    <div className={styles.mosaic}>
      {hero && (
        <div className={styles.hero}>
          <img src={hero.url} alt={hero.alt} loading="eager" />
        </div>
      )}
      {below.length > 0 && (
        <div className={styles.row}>
          {below.map((img, i) => (
            <div key={img.url} className={styles.tile}>
              <img src={img.url} alt={img.alt} loading={i < 2 ? 'eager' : 'lazy'} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
