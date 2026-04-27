import {useEffect, useState} from 'react'
import styles from './AccessGate.module.css'

const RAW = process.env.NEXT_PUBLIC_ACCESS_PASSWORD ?? ''
const PASSWORDS = RAW.split(',').map((p) => p.trim()).filter(Boolean)
const STORAGE_KEY = 'tcm_access'

interface Props {
  children: React.ReactNode
}

export function AccessGate({children}: Props) {
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)
  const [granted, setGranted] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Hydrate gate state from sessionStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    if (PASSWORDS.length === 0) {
      setGranted(true)
    } else {
      const saved = sessionStorage.getItem(STORAGE_KEY) ?? ''
      if (PASSWORDS.includes(saved)) setGranted(true)
    }
    setHydrated(true)
  }, [])

  if (!hydrated) return null
  if (granted) return <>{children}</>

  function attempt(e: React.FormEvent) {
    e.preventDefault()
    const value = input.trim()
    if (PASSWORDS.includes(value)) {
      sessionStorage.setItem(STORAGE_KEY, value)
      setGranted(true)
    } else {
      setError(true)
      setInput('')
    }
  }

  return (
    <div className={styles.screen}>
      <form className={styles.form} onSubmit={attempt}>
        <div className={styles.title}>Explorer trips</div>
        <div className={styles.rule} />
        <label className={styles.label} htmlFor="access-input">Access</label>
        <input
          id="access-input"
          type="password"
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            setError(false)
          }}
          className={`${styles.input} ${error ? styles.inputError : ''}`}
          placeholder="Password"
          autoFocus
          autoComplete="off"
        />
        {error && <div className={styles.error}>Incorrect</div>}
        <button type="submit" className={styles.btn}>Enter →</button>
      </form>
    </div>
  )
}
