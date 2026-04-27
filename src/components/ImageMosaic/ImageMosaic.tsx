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

function scoreImage(img: Img, terms: string[]): number {
  if (terms.length === 0) return 0
  const alt = (img.alt || '').toLowerCase()
  return terms.reduce((acc, t) => (alt.includes(t) ? acc + 1 : acc), 0)
}

// Sort a listing's images by analysis-relevance, breaking ties with the original order
// so the listing's natural lead photo still wins when nothing matches.
function rankByRelevance(images: Img[], terms: string[]): Img[] {
  return images
    .map((img, idx) => ({img, idx, score: scoreImage(img, terms)}))
    .sort((a, b) => b.score - a.score || a.idx - b.idx)
    .map((x) => x.img)
}

// 6-slot mosaic. Each category contributes images ranked by analysis relevance.
// Composition: 2 stay (architecture + landscape) + 2 experience + 2 service (textural).
// Backfills from any source if a category runs short. Dedupes by URL.
function pickMosaic(
  trip: TripOption,
  nights: number,
  analysisTags: string[] = [],
  vibe?: string,
  place?: string | null,
): Img[] {
  const expCount = experienceCountForNights(nights)
  const visibleExp = trip.experiences.slice(0, expCount)
  const terms = buildSearchTerms(analysisTags, vibe, place)

  const stayImgs = rankByRelevance(
    (trip.stay.images || []).filter((i) => i?.url) as Img[],
    terms,
  )
  const expImgs = rankByRelevance(
    visibleExp.flatMap((e) => (e.images || []).filter((i) => i?.url)) as Img[],
    terms,
  )
  const svcImgs = rankByRelevance(
    (trip.service.images || []).filter((i) => i?.url) as Img[],
    terms,
  )

  const slots: Img[] = []
  const seen = new Set<string>()
  const tryAdd = (img: Img | undefined) => {
    if (!img?.url || seen.has(img.url) || slots.length >= 6) return
    seen.add(img.url)
    slots.push(img)
  }

  // Composition 2/2/2 with relevance-first picks per category
  tryAdd(stayImgs[0])
  tryAdd(stayImgs[1])
  tryAdd(expImgs[0])
  tryAdd(expImgs[1])
  tryAdd(svcImgs[0])
  tryAdd(svcImgs[1])

  // Backfill in the same relevance-ranked order if any category was short
  for (const img of [...stayImgs, ...expImgs, ...svcImgs]) tryAdd(img)

  return slots.slice(0, 6)
}

export function ImageMosaic({trip, nights, analysisTags, vibe, place}: Props) {
  const slots = pickMosaic(trip, nights, analysisTags, vibe, place)
  if (slots.length === 0) return null

  return (
    <div className={styles.mosaic}>
      {slots.map((img, i) => (
        <div key={img.url} className={styles.tile}>
          <img src={img.url} alt={img.alt} loading={i < 3 ? 'eager' : 'lazy'} />
        </div>
      ))}
    </div>
  )
}
