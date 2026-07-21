// src/components/Sidebar.jsx
import styles from './Sidebar.module.css'

// Each module has its own signature color instead of an icon.
const NAV = [
  { id: 'home',          label: 'Home',          color: '#A78BFA' },
  { id: 'nutrition',     label: 'Nutrition',     color: '#34D399' },
  { id: 'habits',        label: 'Habits',        color: '#C4B5FD' },
  { id: 'finance',       label: 'Finance',       color: '#FBBF24' },
  { id: 'calendar',      label: 'Calendar',      color: '#60A5FA' },
  { id: 'relationships', label: 'Relationships', color: '#F472B6' },
  { id: 'journal',       label: 'Journal',       color: '#FB923C' },
]

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function Sidebar({ activeTab, onTabChange }) {
  const now = new Date()

  function NavButton({ n }) {
    const active = activeTab === n.id
    return (
      <button
        className={`${styles.navItem} ${active ? styles.active : ''}`}
        onClick={() => onTabChange(n.id)}
        style={{
          '--module-color': n.color,
          color: active ? n.color : undefined,
        }}
      >
        <span className={styles.colorTick} style={{ background: n.color, opacity: active ? 1 : 0.35 }} />
        {n.label}
      </button>
    )
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <div className={styles.logoDot} />
        <span className={styles.logoText}>Anni's Personal OS</span>
      </div>

      <nav className={styles.nav}>
        <div className={styles.sectionLabel}>Overview</div>
        {NAV.slice(0,1).map(n => <NavButton key={n.id} n={n} />)}
        <div className={styles.sectionLabel}>Modules</div>
        {NAV.slice(1).map(n => <NavButton key={n.id} n={n} />)}
      </nav>

      <div className={styles.date}>
        <strong>{DAYS[now.getDay()]}</strong>
        <span>{MONTHS[now.getMonth()]} {now.getDate()}, {now.getFullYear()}</span>
      </div>
    </aside>
  )
}
