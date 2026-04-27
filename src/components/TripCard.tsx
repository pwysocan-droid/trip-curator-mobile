import dynamic from 'next/dynamic'
import Link from 'next/link'
import {useState} from 'react'
import {TripOption, experienceCountForNights} from '@/lib/types'
import {distance} from '@/lib/utils'
import styles from '@/styles/TripCard.module.css'

const MapWidget = dynamic(() => import('./MapWidget'), {ssr: false})

interface TripCardProps {
  trip: TripOption
  nights: number
  index: number
  total?: number
  heroRounded?: boolean
}

function kmLabel(km: number): string {
  if (km < 1) return 'Same village'
  if (km < 10) return `${km.toFixed(1)} km away`
  return `${Math.round(km)} km away`
}

interface ListingRowProps {
  href: string
  imageUrl: string
  imageAlt: string
  type: string
  title: string
  meta: string
  rating?: number
  reviews?: number
  price: string
}

function ListingRow({href, imageUrl, imageAlt, type, title, meta, rating, reviews, price}: ListingRowProps) {
  return (
    <Link href={href} className={styles.row}>
      <div className={styles.rowImage}>
        <img src={imageUrl} alt={imageAlt} loading="lazy" />
      </div>
      <div className={styles.rowContent}>
        <span className={styles.rowType}>{type}</span>
        <p className={styles.rowTitle}>{title}</p>
        <p className={styles.rowMeta}>{meta}</p>
        <div className={styles.rowFooter}>
          {rating != null && reviews != null && reviews > 0 && (
            <span className={styles.rowRating}>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
                <path d="M6 .8l1.5 3.5 3.7.3-2.8 2.5.9 3.7L6 8.7 2.7 10.8l.9-3.7L.8 4.6l3.7-.3z"/>
              </svg>
              {rating.toFixed(2)}
            </span>
          )}
          <span className={styles.rowPrice}>{price}</span>
        </div>
      </div>
    </Link>
  )
}

export default function TripCard({trip, nights, index, total = 3, heroRounded = false}: TripCardProps) {
  const [imageIndex, setImageIndex] = useState(0)
  const [liked, setLiked] = useState(false)

  const expCount = experienceCountForNights(nights)
  const visibleExperiences = trip.experiences.slice(0, expCount)
  const total$ = trip.totalPrice(nights, expCount)

  // Hero carousel: stay + each visible experience + service
  const heroImages = [
    {url: trip.stay.images[0]?.url, alt: trip.stay.name},
    ...visibleExperiences.map((e) => ({url: e.images[0]?.url, alt: e.name})),
    {url: trip.service.images[0]?.url, alt: trip.service.name},
  ].filter((i) => i.url)

  return (
    <article className={styles.card}>

      {/* Hero carousel — swipeable on mobile */}
      <div className={`${styles.hero} ${heroRounded ? styles.heroRounded : ''}`}>
        <div className={styles.carousel}>
          {heroImages.map((img, i) => (
            <div key={i} className={styles.slide}>
              <img src={img.url} alt={img.alt} loading={index === 0 ? 'eager' : 'lazy'} />
            </div>
          ))}
        </div>

        {/* Heart save */}
        <button
          className={styles.heart}
          onClick={() => setLiked((v) => !v)}
          aria-label={liked ? 'Unsave trip' : 'Save trip'}
        >
          <svg width="22" height="22" viewBox="0 0 24 24"
               fill={liked ? '#FF385C' : 'rgba(0,0,0,0.5)'}
               stroke={liked ? '#FF385C' : 'white'}
               strokeWidth="2">
            <path d="M12 21s-7.5-4.6-7.5-10.4A4.5 4.5 0 0 1 12 7.6a4.5 4.5 0 0 1 7.5 3A11.6 11.6 0 0 1 12 21z"/>
          </svg>
        </button>

        {/* Trip number badge */}
        <div className={styles.tripBadge}>Trip {index + 1} of {total}</div>

        {/* Carousel dots */}
        <div className={styles.dots}>
          {heroImages.map((_, i) => (
            <span key={i} className={`${styles.dot} ${i === imageIndex ? styles.dotActive : ''}`} />
          ))}
        </div>
      </div>

      {/* Title + concept */}
      <div className={styles.head}>
        <div className={styles.titleRow}>
          <h2 className={styles.headline}>{trip.headline}</h2>
        </div>
        <p className={styles.persona}>For {trip.persona?.toLowerCase()}</p>
        <p className={styles.blurb}>{trip.blurb}</p>
      </div>

      {/* Listings — stay first, experiences in order, service last */}
      <div className={styles.listings}>
        <ListingRow
          href={`/stay/${trip.stay.id}`}
          imageUrl={trip.stay.images[0]?.url}
          imageAlt={trip.stay.images[0]?.alt || trip.stay.name}
          type="Stay"
          title={trip.stay.name}
          meta={trip.stay.location.split(',')[0]}
          rating={trip.stay.rating}
          reviews={(trip.stay as any).reviewCount ?? trip.stay.reviews}
          price={`$${trip.stay.price} night`}
        />
        {visibleExperiences.map((exp, i) => (
          <ListingRow
            key={exp.id}
            href={`/experience/${exp.id}`}
            imageUrl={exp.images[0]?.url}
            imageAlt={exp.images[0]?.alt || exp.name}
            type={visibleExperiences.length > 1 ? `Experience ${i + 1}` : 'Experience'}
            title={exp.name}
            meta={kmLabel(distance(trip.stay.lat, trip.stay.lng, exp.lat, exp.lng))}
            rating={exp.rating}
            reviews={(exp as any).reviewCount ?? exp.reviews}
            price={`$${exp.price} pp`}
          />
        ))}
        <ListingRow
          href={`/service/${trip.service.id}`}
          imageUrl={trip.service.images[0]?.url}
          imageAlt={trip.service.images[0]?.alt || trip.service.name}
          type="Eat & drink"
          title={trip.service.name}
          meta={kmLabel(distance(trip.stay.lat, trip.stay.lng, trip.service.lat, trip.service.lng))}
          rating={trip.service.rating}
          reviews={(trip.service as any).reviewCount ?? trip.service.reviews}
          price={trip.service.priceRange || '$$'}
        />
      </div>

      {/* Map */}
      <div className={styles.mapBlock}>
        <div className={styles.mapHead}>
          <h3 className={styles.mapTitle}>Where it all is</h3>
          <span className={styles.mapMeta}>Within 150 km</span>
        </div>
        <div className={styles.mapBox}>
          <MapWidget
            center={[trip.stay.lat, trip.stay.lng]}
            markers={[
              {lat: trip.stay.lat, lng: trip.stay.lng, name: trip.stay.name, type: 'stay', label: `$${trip.stay.price}`},
              ...visibleExperiences.map((exp) => ({
                lat: exp.lat,
                lng: exp.lng,
                name: exp.name,
                type: 'experience' as const,
                label: `$${exp.price}`,
              })),
              {lat: trip.service.lat, lng: trip.service.lng, name: trip.service.name, type: 'service', label: trip.service.priceRange || '$$'},
            ]}
            radiusKm={150}
          />
        </div>
      </div>

      {/* Footer total + CTA */}
      <div className={styles.footer}>
        <div className={styles.totals}>
          <span className={styles.totalLabel}>Total for {nights} nights</span>
          <span className={styles.totalAmount}>${total$.toLocaleString()}</span>
          <span className={styles.totalSub}>
            Stay + {visibleExperiences.length} experience{visibleExperiences.length === 1 ? '' : 's'} + meal
          </span>
        </div>
        <button className={styles.cta}>Reserve trip</button>
      </div>

    </article>
  )
}
