import styles from '@/styles/DurationStepper.module.css'

interface DurationStepperProps {
  value: number
  min?: number
  max?: number
  onChange: (n: number) => void
  label?: string
}

export default function DurationStepper({
  value,
  min = 2,
  max = 10,
  onChange,
  label = 'Length of stay',
}: DurationStepperProps) {
  const dec = () => onChange(Math.max(min, value - 1))
  const inc = () => onChange(Math.min(max, value + 1))

  return (
    <div className={styles.row}>
      <div className={styles.labels}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>{value} nights</span>
      </div>
      <div className={styles.controls}>
        <button
          className={styles.btn}
          onClick={dec}
          disabled={value <= min}
          aria-label="Decrease nights"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 7h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </button>
        <span className={styles.count} aria-live="polite">{value}</span>
        <button
          className={styles.btn}
          onClick={inc}
          disabled={value >= max}
          aria-label="Increase nights"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
