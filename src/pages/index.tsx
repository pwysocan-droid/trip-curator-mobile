import {useRouter} from 'next/router'
import {useRef, useState} from 'react'
import TabBar from '@/components/TabBar'
import styles from '@/styles/Home.module.css'
import type {AnalysisResult} from './api/analyze'

export default function Home() {
  const router = useRouter()
  const fileInput = useRef<HTMLInputElement>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')

  const openPicker = () => fileInput.current?.click()

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    const objectUrl = URL.createObjectURL(file)
    setAnalyzing(true)

    try {
      // Resize to max 1600px and compress to JPEG to stay under Claude's 5MB limit
      const base64 = await new Promise<string>((resolve, reject) => {
        const img = new Image()
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

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({imageBase64: base64, mediaType: 'image/jpeg'}),
      })

      if (!res.ok) throw new Error('Analysis failed')

      const analysis: AnalysisResult = await res.json()
      sessionStorage.setItem('trip-analysis', JSON.stringify(analysis))
      sessionStorage.setItem('trip-image', objectUrl)
      router.push('/results/0')
    } catch (err) {
      setError('Couldn\'t analyze that image. Try another, or check your API key.')
      setAnalyzing(false)
    }
  }

  return (
    <div className="frame">

      <header className={styles.header}>
        <h1 className={styles.title}>Explorer trips</h1>
      </header>

      <main className={styles.main}>
        <div className={styles.copy}>
          <p className={styles.line} style={{animationDelay: '200ms'}}>
            The real world is far more interesting.
          </p>
          <p className={styles.line} style={{animationDelay: '1100ms'}}>
            Than anything you&rsquo;ll find in the metaverse.
          </p>
          <p className={styles.line} style={{animationDelay: '2000ms'}}>
            Upload your image and we will take you somewhere real.
          </p>
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

      {/* Analyzing overlay */}
      {analyzing && (
        <div className={styles.analyzing}>
          <div className={styles.analyzingCard}>
            <div className={styles.analyzingDots} aria-hidden>
              <span /><span /><span />
            </div>
            <p className={styles.analyzingText}>Reading the image…</p>
            <p className={styles.analyzingSub}>Curating your trips</p>
          </div>
        </div>
      )}

      <TabBar active="trips" />
    </div>
  )
}
