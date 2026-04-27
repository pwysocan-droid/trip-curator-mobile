import {TripOption, experienceCountForNights} from '@/lib/types'
import styles from './ImageMosaic.module.css'

interface Props {
  trip: TripOption
  nights: number
}

interface Img {
  url: string
  alt: string
}

// Build a 6-slot mosaic from the trip's listings.
// Order: stay first (architecture/landscape), then experiences (activity/landscape),
// then service (textural/detail). Dedupe by URL. Backfill if any source runs short.
function pickMosaic(trip: TripOption, nights: number): Img[] {
  const expCount = experienceCountForNights(nights)
  const visibleExp = trip.experiences.slice(0, expCount)

  const stayImgs = (trip.stay.images || []).filter((i) => i?.url)
  const expImgs = visibleExp.flatMap((e) => (e.images || []).filter((i) => i?.url))
  const svcImgs = (trip.service.images || []).filter((i) => i?.url)

  const slots: Img[] = []
  const seen = new Set<string>()
  const tryAdd = (img: Img | undefined) => {
    if (!img?.url || seen.has(img.url) || slots.length >= 6) return
    seen.add(img.url)
    slots.push(img)
  }

  // Preferred composition: 2 stay + 2 experience + 2 service
  tryAdd(stayImgs[0])
  tryAdd(stayImgs[1])
  tryAdd(expImgs[0])
  tryAdd(expImgs[1])
  tryAdd(svcImgs[0])
  tryAdd(svcImgs[1])

  // Backfill from any remaining images if a category had fewer than two
  for (const img of [...stayImgs, ...expImgs, ...svcImgs]) tryAdd(img)

  return slots.slice(0, 6)
}

export function ImageMosaic({trip, nights}: Props) {
  const slots = pickMosaic(trip, nights)
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
