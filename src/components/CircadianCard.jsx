// src/components/CircadianCard.jsx
// Circadian consistency: lower day-to-day variation in bed & wake times = higher score.
// Score is 0-100, derived from the standard deviation of bed/wake minutes over the
// last 14 logged days. SD of 0 min -> 100; SD of 90+ min -> approaches 0.

import styles from './CircadianCard.module.css'

// Parse "HH:MM" (24h) into minutes-from-a-pivot. Bedtimes after 6pm are treated
// as belonging to the "previous day" axis so 11pm and 1am sit near each other
// rather than 22 hours apart.
function bedMinutes(t) {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  let mins = h * 60 + m
  // Shift the clock so the pivot is 6pm: times 18:00-05:59 wrap sensibly around midnight
  mins = (mins - 18 * 60 + 1440) % 1440
  return mins
}
function wakeMinutes(t) {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function stddev(arr) {
  if (arr.length < 2) return null
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length
  const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length
  return Math.sqrt(variance)
}

// Map an SD (minutes) to a 0-100 sub-score. 0min->100, 90min->~0, smooth in between.
function sdToScore(sd) {
  if (sd == null) return null
  return Math.max(0, Math.round(100 * Math.exp(-sd / 60)))
}

function fmtTime(t) {
  if (!t) return '—'
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}
function avgTimeFromMinutes(minsArr, isBed) {
  if (minsArr.length === 0) return null
  const mean = minsArr.reduce((s, v) => s + v, 0) / minsArr.length
  let realMins = isBed ? (mean + 18 * 60) % 1440 : mean
  const h = Math.floor(realMins / 60), m = Math.round(realMins % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export default function CircadianCard({ logs }) {
  const recent = logs.slice(0, 14).filter(l => l.bed_time || l.wake_time)

  if (recent.length < 2) {
    return (
      <div className={styles.wrapper}>
        <p className={styles.empty}>Log bed & wake times for a couple of nights to see your rhythm consistency. Try the command bar: "Slept 7h, bed 11pm, woke 6:30am"</p>
      </div>
    )
  }

  const bedMins = recent.map(l => bedMinutes(l.bed_time)).filter(v => v != null)
  const wakeMins = recent.map(l => wakeMinutes(l.wake_time)).filter(v => v != null)

  const bedScore = sdToScore(stddev(bedMins))
  const wakeScore = sdToScore(stddev(wakeMins))
  const scores = [bedScore, wakeScore].filter(v => v != null)
  const overall = scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : null

  const rating = overall == null ? '' : overall >= 80 ? 'Very consistent' : overall >= 60 ? 'Fairly consistent' : overall >= 40 ? 'Somewhat variable' : 'Irregular'
  const ratingColor = overall == null ? 'var(--muted)' : overall >= 80 ? 'var(--green)' : overall >= 60 ? 'var(--accent)' : overall >= 40 ? 'var(--amber)' : 'var(--red)'

  const avgBed = avgTimeFromMinutes(bedMins, true)
  const avgWake = avgTimeFromMinutes(wakeMins, false)

  const R = 42, C = 2 * Math.PI * R
  const pct = (overall || 0) / 100

  return (
    <div className={styles.wrapper}>
      <div className={styles.scoreRow}>
        <div className={styles.ring}>
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" />
            <circle cx="50" cy="50" r={R} fill="none" stroke={ratingColor} strokeWidth="7" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - pct)} transform="rotate(-90 50 50)" />
            <text x="50" y="47" textAnchor="middle" className={styles.ringScore}>{overall ?? '—'}</text>
            <text x="50" y="62" textAnchor="middle" className={styles.ringUnit}>/ 100</text>
          </svg>
        </div>
        <div className={styles.detail}>
          <div className={styles.rating} style={{ color: ratingColor }}>{rating}</div>
          <div className={styles.times}>
            <div className={styles.timeItem}><span className={styles.timeLabel}>Avg bedtime</span><span className={styles.timeVal}>{fmtTime(avgBed)}</span></div>
            <div className={styles.timeItem}><span className={styles.timeLabel}>Avg wake</span><span className={styles.timeVal}>{fmtTime(avgWake)}</span></div>
          </div>
          <div className={styles.subScores}>
            {bedScore != null && <span className={styles.subScore}>Bedtime {bedScore}</span>}
            {wakeScore != null && <span className={styles.subScore}>Wake {wakeScore}</span>}
          </div>
        </div>
      </div>
      <p className={styles.hint}>Based on how consistent your bed & wake times were across {recent.length} nights. Steadier times score higher.</p>
    </div>
  )
}
