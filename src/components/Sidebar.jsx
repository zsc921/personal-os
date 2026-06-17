// src/components/Sidebar.jsx
import styles from './Sidebar.module.css'

const NAV = [
  { id: 'home',     label: 'Home',    icon: '⊞' },
  { id: 'habits',   label: 'Habits',  icon: '◎' },
  { id: 'finance',  label: 'Finance', icon: '◈' },
  { id: 'calendar', label: 'Calendar',icon: '▦' },
  { id: 'journal',  label: 'Journal', icon: '◉' },
]

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function Sidebar({ activeTab, onTabChange }) {
  const now = new Date()
  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <div className={styles.logoDot} />
        <span className={styles.logoText}>OS</span>
      </div>

      <nav className={styles.nav}>
        <div className={styles.sectionLabel}>Overview</div>
        {NAV.slice(0,1).map(n => (
          <button key={n.id} className={`${styles.navItem} ${activeTab === n.id ? styles.active : ''}`} onClick={() => onTabChange(n.id)}>
            <span className={styles.navIcon}>{n.icon}</span>{n.label}
          </button>
        ))}
        <div className={styles.sectionLabel}>Modules</div>
        {NAV.slice(1).map(n => (
          <button key={n.id} className={`${styles.navItem} ${activeTab === n.id ? styles.active : ''}`} onClick={() => onTabChange(n.id)}>
            <span className={styles.navIcon}>{n.icon}</span>{n.label}
          </button>
        ))}
      </nav>

      <div className={styles.date}>
        <strong>{DAYS[now.getDay()]}</strong>
        <span>{MONTHS[now.getMonth()]} {now.getDate()}, {now.getFullYear()}</span>
      </div>
    </aside>
  )
}
