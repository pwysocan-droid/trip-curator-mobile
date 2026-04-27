import {useEffect, useState} from 'react'
import {useRouter} from 'next/router'
import Link from 'next/link'
import {MockData, TripOption} from '@/lib/types'
import {assembleTrips, curateTripOptions} from '@/lib/utils'
import TripCard from '@/components/TripCard'
import DurationStepper from '@/components/DurationStepper'
import TabBar from '@/components/TabBar'
import styles from '@/styles/Results.module.css'
import type {AnalysisResult} from '../api/analyze'
import {fetchRegionData, resolveRegion} from '@/lib/regions'

const FALLBACK_ANALYSIS: AnalysisResult = {
  vibe: 'Sun-baked Provençal village',
  detail: 'A pocket of slow-light Provence where stone holds the day',
  tags: ['provence', 'artistic', 'slow-time'],
  region: 'provence',
  place: null,
  trips: [],
  rankedStayIds: [],
  reasoning: '',
}

const NIGHTS_MIN = 2
const NIGHTS_MAX = 10
const NIGHTS_DEFAULT = 5

function clampNights(n: number): number {
  if (!Number.isFinite(n)) return NIGHTS_DEFAULT
  return Math.max(NIGHTS_MIN, Math.min(NIGHTS_MAX, Math.round(n)))
}

export default function TripPage() {
  const router = useRouter()
  const [analysis, setAnalysis] = useState<AnalysisResult>(FALLBACK_ANALYSIS)
  const [heroImage, setHeroImage] = useState<string | null>(null)
  const [trips, setTrips] = useState<TripOption[]>([])
  const [nights, setNights] = useState(NIGHTS_DEFAULT)
  const [loading, setLoading] = useState(true)

  // Parse current trip index from the URL
  const rawIndex = router.query.index
  const tripIndex = Array.isArray(rawIndex) ? Number(rawIndex[0]) : Number(rawIndex)
  const safeIndex = Number.isFinite(tripIndex) && tripIndex >= 0 ? tripIndex : 0

  // Initial load: analysis + mock data + curated trips. Runs once.
  useEffect(() => {
    const stored = sessionStorage.getItem('trip-analysis')
    const image = sessionStorage.getItem('trip-image')
    const activeAnalysis: AnalysisResult = stored ? JSON.parse(stored) : FALLBACK_ANALYSIS
    setAnalysis(activeAnalysis)
    if (image) setHeroImage(image)

    const regionId = resolveRegion(activeAnalysis.region)
    fetchRegionData(regionId)
      .then((mockData: MockData) => {
        const curated = activeAnalysis.trips && activeAnalysis.trips.length > 0
          ? assembleTrips(
              activeAnalysis.trips,
              mockData.stays,
              mockData.experiences,
              mockData.services,
              activeAnalysis.region,
              150,
            )
          : curateTripOptions(
              mockData.stays,
              mockData.experiences,
              mockData.services,
              activeAnalysis.region,
              150,
              3,
              activeAnalysis.rankedStayIds,
            )
        setTrips(curated)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Sync nights from URL ?n=
  useEffect(() => {
    if (!router.isReady) return
    const fromQuery = router.query.n
    const parsed = Array.isArray(fromQuery) ? Number(fromQuery[0]) : Number(fromQuery)
    if (Number.isFinite(parsed)) setNights(clampNights(parsed))
  }, [router.isReady, router.query.n])

  // Redirect out-of-range indexes once trips are loaded
  useEffect(() => {
    if (loading || trips.length === 0) return
    if (safeIndex >= trips.length) {
      router.replace({pathname: `/results/0`, query: {n: nights}}, undefined, {shallow: true})
    }
  }, [loading, trips.length, safeIndex])

  const updateNights = (n: number) => {
    setNights(n)
    router.replace(
      {pathname: router.pathname, query: {...router.query, n}},
      undefined,
      {shallow: true, scroll: false},
    )
  }

  const trip = trips[safeIndex]
  const isFirstTrip = safeIndex === 0

  return (
    <div className="frame">

      <header className={styles.topBar}>
        <button
          className={styles.backBtn}
          onClick={() => router.push('/')}
          aria-label="Back to Trips"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span className={styles.topTitle}>
          {trips.length > 0 ? `Trip ${safeIndex + 1} of ${trips.length}` : 'Your trips'}
        </span>
        <button className={styles.shareBtn} aria-label="Share">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 3v13M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"
                  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </header>

      {/* Inspiration block — full on trip 0, condensed on subsequent trips */}
      {isFirstTrip ? (
        <section className={styles.inspiration}>
          {heroImage && (
            <div className={styles.refImage}>
              <img src={heroImage} alt="Your inspiration" />
              <span className={styles.refLabel}>Your photo</span>
            </div>
          )}

          <div className={styles.analysisBlock}>
            <p className={styles.detail}>{analysis.detail}</p>
            <div className={styles.tags}>
              {analysis.tags.slice(0, 5).map((tag) => (
                <span key={tag} className={styles.tag}>{tag}</span>
              ))}
            </div>
          </div>

          <div className={styles.stepperWrap}>
            <DurationStepper value={nights} onChange={updateNights} min={NIGHTS_MIN} max={NIGHTS_MAX} />
          </div>
        </section>
      ) : (
        <section className={styles.compactInspiration}>
          {heroImage && (
            <img className={styles.compactThumb} src={heroImage} alt="Your inspiration" />
          )}
          <div className={styles.compactText}>
            <span className={styles.compactVibe}>{analysis.vibe}</span>
          </div>
          <div className={styles.compactStepper}>
            <DurationStepper value={nights} onChange={updateNights} min={NIGHTS_MIN} max={NIGHTS_MAX} label="" />
          </div>
        </section>
      )}

      {/* Trip body */}
      <section className={styles.feed}>
        {loading && (
          <div className={styles.skeleton}>
            <div className={styles.skelHero} />
            <div className={styles.skelLines}>
              <div className={styles.skelLine} style={{width: '70%'}} />
              <div className={styles.skelLine} style={{width: '40%'}} />
            </div>
          </div>
        )}
        {!loading && trips.length === 0 && (
          <div className={styles.empty}>
            <p>No trips found for this region.</p>
            <button className={styles.emptyBtn} onClick={() => router.push('/')}>
              Try a different photo
            </button>
          </div>
        )}
        {!loading && trip && (
          <TripCard trip={trip} nights={nights} index={safeIndex} total={trips.length} />
        )}
      </section>

      {/* Trip pagination — jump to any trip */}
      {!loading && trips.length > 1 && (
        <nav className={styles.tripNav} aria-label="Trip selector">
          <span className={styles.tripNavLabel}>Other trips</span>
          <div className={styles.tripChips}>
            {trips.map((_, i) => {
              const active = i === safeIndex
              return (
                <Link
                  key={i}
                  href={{pathname: `/results/${i}`, query: {n: nights}}}
                  className={`${styles.tripChip} ${active ? styles.tripChipActive : ''}`}
                  aria-current={active ? 'page' : undefined}
                  aria-label={`Trip ${i + 1}`}
                  scroll
                >
                  {i + 1}
                </Link>
              )
            })}
          </div>
        </nav>
      )}

      <div style={{height: 'calc(var(--tab-bar-h) + 16px)'}} />
      <TabBar active="trips" />
    </div>
  )
}
