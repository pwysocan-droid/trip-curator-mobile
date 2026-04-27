import styles from '@/styles/TabBar.module.css'

type TabId = 'explore' | 'wishlists' | 'trips' | 'inbox' | 'profile'

interface TabBarProps {
  active?: TabId
}

interface Tab {
  id: TabId
  label: string
  icon: React.ReactNode
}

// Compact line-icons in the spirit of Airbnb's tab bar.
// Filled when active, outlined when not. Stroke-based for crispness.
const Icon = {
  explore: (filled: boolean) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={filled ? 2.4 : 1.6} fill={filled ? 'currentColor' : 'none'}/>
      <path d="M15.5 8.5L13 13l-4.5 2.5L11 11l4.5-2.5z" fill={filled ? '#fff' : 'currentColor'} stroke={filled ? 'none' : 'currentColor'} strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  ),
  wishlists: (filled: boolean) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 1.7} aria-hidden>
      <path d="M12 20.5s-7.5-4.5-7.5-10A4.5 4.5 0 0 1 12 7.2a4.5 4.5 0 0 1 7.5 3.3c0 5.5-7.5 10-7.5 10z"/>
    </svg>
  ),
  trips: (filled: boolean) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4.5" y="6.5" width="15" height="12" rx="1.5" stroke="currentColor" strokeWidth={filled ? 0 : 1.7} fill={filled ? 'currentColor' : 'none'}/>
      <path d="M9 6.5V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1.5" stroke="currentColor" strokeWidth="1.7" fill="none"/>
      <path d="M4.5 11h15" stroke={filled ? '#fff' : 'currentColor'} strokeWidth="1.4"/>
    </svg>
  ),
  inbox: (filled: boolean) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 1.7} strokeLinejoin="round" aria-hidden>
      <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8.5L5 21v-3a2 2 0 0 1-1-2V7z"/>
    </svg>
  ),
  profile: (filled: boolean) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 1.7} aria-hidden>
      <circle cx="12" cy="9" r="3.5"/>
      <path d="M5 20c1.2-3.5 4-5 7-5s5.8 1.5 7 5"/>
    </svg>
  ),
}

const TABS: Tab[] = [
  {id: 'explore', label: 'Explore', icon: null},
  {id: 'wishlists', label: 'Wishlists', icon: null},
  {id: 'trips', label: 'Trips', icon: null},
  {id: 'inbox', label: 'Inbox', icon: null},
  {id: 'profile', label: 'Profile', icon: null},
]

export default function TabBar({active = 'trips'}: TabBarProps) {
  return (
    <nav className={styles.bar} aria-label="Main navigation">
      {TABS.map((tab) => {
        const isActive = tab.id === active
        const iconRenderer = Icon[tab.id]
        return (
          <button
            key={tab.id}
            className={`${styles.tab} ${isActive ? styles.active : ''}`}
            aria-current={isActive ? 'page' : undefined}
            aria-label={tab.label}
          >
            <span className={styles.icon}>{iconRenderer(isActive)}</span>
            <span className={styles.label}>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
