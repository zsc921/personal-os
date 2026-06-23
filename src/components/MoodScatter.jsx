// src/components/MoodScatter.jsx
// Read-only four-quadrant mood scatter — plots recent journal entries
// by their (valence, arousal) coordinates.

import styles from './MoodScatter.module.css'

export default function MoodScatter({ entries }) {
  const moodEntries = entries.filter(e => e.valence != null && e.arousal != null).slice(0, 30)

  if (moodEntries.length === 0) {
    return <p className={styles.empty}>No mood entries yet. Add one in the Journal tab.</p>
  }

  function pos(v, a) {
    return {
      left: `${((v + 1) / 2) * 100}%`,
      top:  `${((1 - a) / 2) * 100}%`,
    }
  }

  // Color a dot by quadrant
  function dotColor(v, a) {
    if (v >= 0 && a >= 0) return '#FBBF24' // happy
    if (v < 0  && a >= 0) return '#F472B6' // angry
    if (v < 0  && a < 0 ) return '#60A5FA' // sad
    return '#34D399'                      // calm
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.grid}>
        <div className={`${styles.quadrant} ${styles.qTL}`} />
        <div className={`${styles.quadrant} ${styles.qTR}`} />
        <div className={`${styles.quadrant} ${styles.qBL}`} />
        <div className={`${styles.quadrant} ${styles.qBR}`} />

        <div className={styles.axisH} />
        <div className={styles.axisV} />

        <div className={`${styles.axisLabel} ${styles.lblTop}`}>High arousal</div>
        <div className={`${styles.axisLabel} ${styles.lblBot}`}>Low arousal</div>
        <div className={`${styles.axisLabel} ${styles.lblLeft}`}>Unpleasant</div>
        <div className={`${styles.axisLabel} ${styles.lblRight}`}>Pleasant</div>

        {moodEntries.map((e, i) => {
          // Newer entries are larger and more opaque
          const recency = 1 - (i / moodEntries.length)
          const size = 6 + recency * 6
          const opacity = 0.4 + recency * 0.6
          return (
            <div
              key={e.id}
              className={styles.dot}
              style={{
                ...pos(e.valence, e.arousal),
                width: size,
                height: size,
                background: dotColor(e.valence, e.arousal),
                opacity,
              }}
              title={`${e.mood_label || 'mood'} · ${new Date(e.created_at).toLocaleDateString()}`}
            />
          )
        })}
      </div>
      <p className={styles.hint}>{moodEntries.length} entries · larger dots = more recent</p>
    </div>
  )
}
