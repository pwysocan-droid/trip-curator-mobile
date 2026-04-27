import {useRouter} from 'next/router'
import {useEffect, useState} from 'react'
import dynamic from 'next/dynamic'
import {Service} from '@/lib/types'
import styles from '@/styles/StayDetail.module.css'
import {regionFromListingId, fetchRegionData, DEFAULT_REGION} from '@/lib/regions'

const MapWidget = dynamic(() => import('@/components/MapWidget'), {ssr: false})

export default function ServiceDetail() {
  const router = useRouter()
  const {id} = router.query
  const [item, setItem] = useState<Service | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id || typeof id !== 'string') return
    const region = regionFromListingId(id) || DEFAULT_REGION
    fetchRegionData(region)
      .then((data) => {
        setItem(data.services.find((s: Service) => s.id === id) || null)
        setLoading(false)
      })
  }, [id])

  if (loading) return <div className={styles.loading}>Loading…</div>
  if (!item) return <div className={styles.loading}>Service not found.</div>

  const hasRating = item.rating != null && item.reviews != null && item.reviews > 0
  const hostBio = (item.host as any).bio as string | undefined

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => router.back()}>← Back</button>
      </div>

      <div className={styles.photoGrid}>
        <div className={styles.photoMain}>
          <img src={item.images[0]?.url} alt={item.images[0]?.alt} />
        </div>
        {item.images.length > 1 && (
          <div className={styles.photoSide}>
            {item.images.slice(1, 5).map((img, i) => (
              <div key={i} className={styles.photoThumb}>
                <img src={img.url} alt={img.alt} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.layout}>
        <div className={styles.content}>

          <div className={styles.titleBlock}>
            <h1 className={styles.title}>{item.name}</h1>
            <div className={styles.meta}><span>{item.location}</span></div>
            {item.cuisine && (
              <div className={styles.stats}><span>{item.cuisine}</span></div>
            )}
            <div className={styles.ratingRow}>
              {hasRating
                ? <><span className={styles.star}>★</span><span>{item.rating!.toFixed(2)}</span><span className={styles.reviewCount}>· {item.reviews} reviews</span></>
                : <><span className={styles.newBadge}>New</span></>
              }
            </div>
          </div>

          <div className={styles.divider} />

          <div className={styles.hostBlock}>
            <div className={styles.hostAvatar} />
            <div>
              <p className={styles.hostName}>Hosted by {item.host.name}</p>
              {hostBio && <p className={styles.hostMeta}>{hostBio}</p>}
            </div>
          </div>

          <div className={styles.divider} />

          <div className={styles.description}>
            <p>{item.description}</p>
          </div>

          <div className={styles.divider} />

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Where you&apos;ll be</h2>
            <p className={styles.mapLocation}>{item.location}</p>
            <div className={styles.mapContainer}>
              <MapWidget
                center={[item.lat, item.lng]}
                markers={[{lat: item.lat, lng: item.lng, name: item.name, type: 'service'}]}
                radiusKm={0}
              />
            </div>
          </div>

        </div>

        <div className={styles.sidebar}>
          <div className={styles.bookingCard}>
            <div className={styles.bookingPrice}>
              <span className={styles.priceAmount}>{item.priceRange}</span>
            </div>
            <button className={styles.reserveBtn}>Request to book</button>
            <p className={styles.noCharge}>You won&apos;t be charged yet</p>
          </div>
        </div>
      </div>
    </div>
  )
}
