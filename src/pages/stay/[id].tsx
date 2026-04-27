import {useRouter} from 'next/router'
import {useEffect, useState} from 'react'
import dynamic from 'next/dynamic'
import styles from '@/styles/StayDetail.module.css'
import {regionFromListingId, fetchRegionData, DEFAULT_REGION} from '@/lib/regions'

const MapWidget = dynamic(() => import('@/components/MapWidget'), {ssr: false})

interface BedroomDetail {
  name: string
  beds: string
}

interface Highlight {
  title: string
  detail: string
}

interface Review {
  author: string
  yearsOnAirbnb?: number
  monthsOnAirbnb?: number
  location?: string
  date?: string
  context?: string
  rating: number
  text: string
}

interface HouseRules {
  checkin: string
  checkout: string
  maxGuests: number
  cancellation: string
}

interface StayDetailData {
  id: string
  airbnbId?: string
  name: string
  typeLabel?: string
  location: string
  lat: number
  lng: number
  guests?: number
  bedroomCount?: number
  beds: string
  baths: number
  price: number
  pricePerNight?: number
  totalForFive?: number
  rating: number
  reviewCount?: number
  isGuestFavorite?: boolean
  topPercent?: number | null
  isNew?: boolean
  isRareFind?: boolean
  host: {
    name: string
    location?: string
    isSuperhost?: boolean
    yearsHosting?: number
    monthsHosting?: number
    totalReviews?: number
    totalRating?: number
    responseRate?: string
    responseTime?: string
    languages?: string[]
    work?: string
    bio?: string
  }
  coHosts?: string[]
  highlights?: Highlight[]
  description: string
  neighborhoodHighlights?: string
  bedrooms?: BedroomDetail[]
  amenities: string[]
  amenitiesTotal?: number
  safetyConfirmed?: string[]
  safetyNotReported?: string[]
  safetyNotes?: string[]
  houseRules?: HouseRules
  reviews?: Review[]
  reviewMentions?: Array<{tag: string; count: number}>
  ratingBreakdown?: Record<string, number | null>
  images: Array<{url: string; alt: string}>
}

export default function StayDetail() {
  const router = useRouter()
  const {id} = router.query
  const [stay, setStay] = useState<StayDetailData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id || typeof id !== 'string') return
    const region = regionFromListingId(id) || DEFAULT_REGION
    fetchRegionData(region)
      .then((data) => {
        const found = data.stays.find((s: StayDetailData) => s.id === id)
        setStay(found || null)
        setLoading(false)
      })
  }, [id])

  if (loading) return <div className={styles.loading}>Loading…</div>
  if (!stay) return <div className={styles.loading}>Listing not found.</div>

  const nights = 5
  const totalPrice = stay.totalForFive ?? stay.price * nights
  const reviewCount = stay.reviewCount ?? stay.reviews?.length ?? 0
  const isNewListing = reviewCount < 3

  return (
    <div className={styles.page}>

      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => router.back()}>← Back to trips</button>
      </div>

      {/* Photo grid */}
      <div className={styles.photoGrid}>
        <div className={styles.photoMain}>
          <img src={stay.images[0]?.url} alt={stay.images[0]?.alt} />
        </div>
        <div className={styles.photoSide}>
          {stay.images.slice(1, 5).map((img, i) => (
            <div key={i} className={styles.photoThumb}>
              <img src={img.url} alt={img.alt} />
            </div>
          ))}
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.content}>

          {/* Title */}
          <div className={styles.titleBlock}>
            <h1 className={styles.title}>{stay.name}</h1>
            <div className={styles.meta}>
              <span>{stay.typeLabel || stay.location}</span>
            </div>
            <div className={styles.stats}>
              {stay.guests && <><span>{stay.guests} guests</span><span className={styles.dot}>·</span></>}
              {stay.bedroomCount != null && <><span>{stay.bedroomCount} bedroom{stay.bedroomCount === 1 ? '' : 's'}</span><span className={styles.dot}>·</span></>}
              <span>{stay.beds}</span>
              <span className={styles.dot}>·</span>
              <span>{stay.baths} bath{stay.baths === 1 ? '' : 's'}</span>
            </div>
            <div className={styles.ratingRow}>
              {isNewListing
                ? <><span className={styles.newBadge}>New</span><span className={styles.reviewCount}>· {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}</span></>
                : <><span className={styles.star}>★</span><span>{stay.rating.toFixed(2)}</span><span className={styles.reviewCount}>· {reviewCount} reviews</span></>
              }
              {stay.isGuestFavorite && <span className={styles.gfBadge}>· Guest favorite</span>}
            </div>
          </div>

          <div className={styles.divider} />

          {/* Host */}
          <div className={styles.hostBlock}>
            <div className={styles.hostAvatar} />
            <div>
              <p className={styles.hostName}>
                {stay.host.isSuperhost ? `Stay with ${stay.host.name}` : `Hosted by ${stay.host.name}`}
              </p>
              <p className={styles.hostMeta}>
                {stay.host.isSuperhost && 'Superhost · '}
                {stay.host.monthsHosting
                  ? `${stay.host.monthsHosting} months hosting`
                  : stay.host.yearsHosting != null
                    ? `${stay.host.yearsHosting} ${stay.host.yearsHosting === 1 ? 'year' : 'years'} hosting`
                    : ''}
              </p>
            </div>
          </div>

          <div className={styles.divider} />

          {/* Highlights */}
          {stay.highlights && stay.highlights.length > 0 && (
            <>
              <div className={styles.highlights}>
                {stay.highlights.map((h, i) => (
                  <div key={i} className={styles.highlight}>
                    <span className={styles.highlightIcon}>◈</span>
                    <div>
                      <p className={styles.highlightText}>{h.title}</p>
                      <p className={styles.highlightDetail}>{h.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.divider} />
            </>
          )}

          {/* Description */}
          <div className={styles.description}>
            <p>{stay.description}</p>
            {stay.neighborhoodHighlights && (
              <>
                <h3 className={styles.subhead}>Neighborhood highlights</h3>
                <p className={styles.neighborhood}>{stay.neighborhoodHighlights}</p>
              </>
            )}
          </div>

          <div className={styles.divider} />

          {/* Where you'll sleep */}
          {stay.bedrooms && stay.bedrooms.length > 0 && (
            <>
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Where you&apos;ll sleep</h2>
                <div className={styles.bedroomGrid}>
                  {stay.bedrooms.map((room, i) => (
                    <div key={i} className={styles.bedroomCard}>
                      <div className={styles.bedroomIcon}>🛏</div>
                      <p className={styles.bedroomName}>{room.name}</p>
                      <p className={styles.bedroomBeds}>{room.beds}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className={styles.divider} />
            </>
          )}

          {/* Amenities */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>What this place offers</h2>
            <div className={styles.amenityGrid}>
              {stay.amenities.map((a, i) => (
                <div key={i} className={styles.amenity}>
                  <span className={styles.amenityIcon}>◇</span>
                  <span>{a}</span>
                </div>
              ))}
            </div>
            {stay.amenitiesTotal && stay.amenitiesTotal > stay.amenities.length && (
              <p className={styles.amenityShowAll}>Show all {stay.amenitiesTotal} amenities</p>
            )}
          </div>

          <div className={styles.divider} />

          {/* Reviews */}
          {stay.reviews && stay.reviews.length > 0 && (
            <>
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>
                  {isNewListing ? `New · ${stay.reviews.length} reviews` : `★ ${stay.rating} · ${reviewCount} reviews`}
                </h2>
                {stay.reviewMentions && stay.reviewMentions.length > 0 && (
                  <div className={styles.mentions}>
                    <span className={styles.mentionsLabel}>Guests mention:</span>
                    {stay.reviewMentions.map((m) => (
                      <span key={m.tag} className={styles.mention}>{m.tag} ({m.count})</span>
                    ))}
                  </div>
                )}
                <div className={styles.reviewList}>
                  {stay.reviews.map((r, i) => (
                    <div key={i} className={styles.review}>
                      <div className={styles.reviewHeader}>
                        <div className={styles.reviewAvatar} />
                        <div>
                          <p className={styles.reviewAuthor}>{r.author}</p>
                          <p className={styles.reviewMeta}>
                            {r.location || (r.yearsOnAirbnb != null ? `${r.yearsOnAirbnb} years on Airbnb` : r.monthsOnAirbnb != null ? `${r.monthsOnAirbnb} months on Airbnb` : '')}
                            {r.date ? ` · ${r.date}` : ''}
                            {r.context ? ` · ${r.context}` : ''}
                          </p>
                        </div>
                      </div>
                      <p className={styles.reviewText}>{r.text}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className={styles.divider} />
            </>
          )}

          {/* Map */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Where you&apos;ll be</h2>
            <p className={styles.mapLocation}>{stay.location}</p>
            <div className={styles.mapContainer}>
              <MapWidget
                center={[stay.lat, stay.lng]}
                markers={[{lat: stay.lat, lng: stay.lng, name: stay.name, type: 'stay'}]}
                radiusKm={0}
              />
            </div>
          </div>

          <div className={styles.divider} />

          {/* Things to know */}
          {stay.houseRules && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Things to know</h2>
              <div className={styles.rulesGrid}>
                <div>
                  <p className={styles.rulesHeading}>House rules</p>
                  <p>Check-in: {stay.houseRules.checkin}</p>
                  <p>Checkout: {stay.houseRules.checkout}</p>
                  <p>{stay.houseRules.maxGuests} guests maximum</p>
                </div>
                <div>
                  <p className={styles.rulesHeading}>Cancellation policy</p>
                  <p>{stay.houseRules.cancellation}</p>
                </div>
                <div>
                  <p className={styles.rulesHeading}>Safety & property</p>
                  {stay.safetyConfirmed?.map((s) => <p key={s}>{s}</p>)}
                  {stay.safetyNotReported?.map((s) => <p key={s}>{s} not reported</p>)}
                  {stay.safetyNotes?.map((s) => <p key={s}>{s}</p>)}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Booking sidebar */}
        <div className={styles.sidebar}>
          <div className={styles.bookingCard}>
            {stay.isRareFind && (
              <div className={styles.rareBadge}>💎 Rare find! This place is usually booked</div>
            )}
            <div className={styles.bookingPrice}>
              <span className={styles.priceAmount}>${totalPrice.toLocaleString()}</span>
              <span className={styles.priceUnit}> for {nights} nights</span>
            </div>
            <div className={styles.bookingDates}>
              <div className={styles.dateBox}>
                <span className={styles.dateLabel}>CHECK-IN</span>
                <span className={styles.dateValue}>5/9/2026</span>
              </div>
              <div className={styles.dateBox}>
                <span className={styles.dateLabel}>CHECKOUT</span>
                <span className={styles.dateValue}>5/14/2026</span>
              </div>
            </div>
            <div className={styles.guestBox}>
              <span className={styles.dateLabel}>GUESTS</span>
              <span className={styles.dateValue}>1 guest</span>
            </div>
            <button className={styles.reserveBtn}>Reserve</button>
            <p className={styles.noCharge}>You won&apos;t be charged yet</p>
            <div className={styles.priceBreakdown}>
              <div className={styles.priceRow}>
                <span>${stay.price} × {nights} nights</span>
                <span>${(stay.price * nights).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
