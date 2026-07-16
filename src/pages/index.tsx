import {useRouter} from 'next/router'
import {useRef, useState} from 'react'
import TabBar from '@/components/TabBar'
import styles from '@/styles/Home.module.css'
import {regionById, resolveRegion} from '@/lib/regions'
import type {AnalysisResult} from './api/analyze'

const FINAL_MARKER = '<<<TRIP_CURATOR_FINAL>>>'

// Known-good Unsplash image (CORS-enabled) for the one-tap demo path.
const SAMPLE_IMAGE_URL = 'https://images.unsplash.com/photo-1728200696554-d469313c15f5?w=1200&q=80'

interface Progress {
  stage: string
  sub: string
}

const INITIAL_PROGRESS: Progress = {stage: 'Reading the image…', sub: 'Curating your trips'}

// Pull progressive hints out of the partially-streamed JSON so the wait
// feels alive: region lands first, then the vibe line, then trip count.
function progressFromPartial(buffer: string): Progress {
  const tripCount = (buffer.match(/"concept"/g) || []).length
  if (tripCount > 0) {
    return {
      stage: `Composing trip ${Math.min(tripCount, 3)} of 3…`,
      sub: extractString(buffer, 'vibe') || 'Curating your trips',
    }
  }
  const region = buffer.match(/"region"\s*:\s*"([a-z]+)"/)?.[1]
  if (region) {
    const name = regionById(resolveRegion(region))?.name || region
    return {stage: `This looks like ${name}…`, sub: extractString(buffer, 'vibe') || 'Matching real places'}
  }
  const vibe = extractString(buffer, 'vibe')
  if (vibe) return {stage: vibe, sub: 'Placing the region'}
  return INITIAL_PROGRESS
}

function extractString(buffer: string, key: string): string | null {
  const m = buffer.match(new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`))
  if (!m) return null
  try {
    return JSON.parse(`"${m[1]}"`)
  } catch {
    return m[1]
  }
}

export default function Home() {
  const router = useRouter()
  const fileInput = useRef<HTMLInputElement>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [progress, setProgress] = useState<Progress>(INITIAL_PROGRESS)
  const [error, setError] = useState('')

  const openPicker = () => fileInput.current?.click()

  // Resize to max 1600px and compress to JPEG to stay under Claude's 5MB limit
  const toBase64 = (objectUrl: string) =>
    new Promise<string>((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const MAX = 1600
        const scale = Math.min(1, MAX / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1])
      }
      img.onerror = reject
      img.src = objectUrl
    })

  const analyze = async (objectUrl: string) => {
    setError('')
    setProgress(INITIAL_PROGRESS)
    setAnalyzing(true)

    try {
      const base64 = await toBase64(objectUrl)

      // Store as a data URL — survives page reloads, unlike a blob: URL.
      sessionStorage.setItem('trip-image', `data:image/jpeg;base64,${base64}`)

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({imageBase64: base64, mediaType: 'image/jpeg'}),
      })

      if (!res.ok || !res.body) throw new Error('Analysis failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const {done, value} = await reader.read()
        if (done) break
        buffer += decoder.decode(value, {stream: true})
        if (!buffer.includes(FINAL_MARKER)) setProgress(progressFromPartial(buffer))
      }
      buffer += decoder.decode()

      const markerAt = buffer.indexOf(FINAL_MARKER)
      if (markerAt === -1) throw new Error('No final payload')
      const final = JSON.parse(buffer.slice(markerAt + FINAL_MARKER.length))
      if (final.error) throw new Error(final.error)

      const analysis: AnalysisResult = final
      sessionStorage.setItem('trip-analysis', JSON.stringify(analysis))
      router.push('/results/0')
    } catch (err) {
      setError('Couldn’t read that image. Try another photo — or the example below.')
      setAnalyzing(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await analyze(URL.createObjectURL(file))
  }

  const runSample = async () => {
    if (analyzing) return
    try {
      const resp = await fetch(SAMPLE_IMAGE_URL)
      const blob = await resp.blob()
      await analyze(URL.createObjectURL(blob))
    } catch {
      setError('Couldn’t load the example image. Check your connection.')
    }
  }

  return (
    <div className="frame">

      <main className={styles.main}>
        <div className={styles.copy}>
          <h1 className={styles.headline} style={{animationDelay: '300ms'}}>
            IRL Generator
          </h1>
          <p className={styles.body} style={{animationDelay: '1500ms'}}>
            When AI slop seems too good to be true upload it and we&rsquo;ll find Airbnbs that make it real.
          </p>
          <button
            className={styles.sampleBtn}
            style={{animationDelay: '2400ms'}}
            onClick={runSample}
            disabled={analyzing}
          >
            No image handy? Try an example
          </button>
          {error && <p className={styles.error}>{error}</p>}
        </div>
      </main>

      {/* Floating action button */}
      <button
        className={styles.fab}
        onClick={openPicker}
        disabled={analyzing}
        aria-label="Upload a photo to start a trip"
      >
        {analyzing ? (
          <span className={styles.fabSpinner} aria-hidden />
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.4" strokeLinecap="round"/>
          </svg>
        )}
      </button>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        disabled={analyzing}
        className={styles.fileInput}
      />

      {/* Analyzing overlay — narrates the stream as it arrives */}
      {analyzing && (
        <div className={styles.analyzing}>
          <div className={styles.analyzingCard}>
            <div className={styles.analyzingDots} aria-hidden>
              <span /><span /><span />
            </div>
            <p className={styles.analyzingText}>{progress.stage}</p>
            <p className={styles.analyzingSub}>{progress.sub}</p>
          </div>
        </div>
      )}

      <TabBar active="trips" />
    </div>
  )
}
