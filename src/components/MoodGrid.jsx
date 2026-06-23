// src/components/MoodGrid.jsx
// Four-quadrant mood picker based on the arousal/valence model.
// User clicks a position on the grid; we map to (valence, arousal) in [-1, 1]
// and surface the nearest descriptive emotion label from the surrounding quadrant.

import { useState } from 'react'
import styles from './MoodGrid.module.css'

// Curated emotions placed at approximate (valence, arousal) coordinates from -1 to 1
const EMOTIONS = [
  // High-arousal pleasant (top right)
  { label: 'Excited',     v:  0.5, a:  0.9, color: '#FBBF24' },
  { label: 'Happy',       v:  0.8, a:  0.6, color: '#FBBF24' },
  { label: 'Delighted',   v:  0.6, a:  0.7, color: '#FBBF24' },
  { label: 'Amused',      v:  0.3, a:  0.5, color: '#FBBF24' },
  { label: 'Glad',        v:  0.7, a:  0.4, color: '#FBBF24' },
  { label: 'Curious',     v:  0.3, a:  0.3, color: '#FBBF24' },
  // High-arousal unpleasant (top left)
  { label: 'Infuriated',  v: -0.8, a:  0.9, color: '#F472B6' },
  { label: 'Fear',        v: -0.5, a:  0.8, color: '#F472B6' },
  { label: 'Angry',       v: -0.7, a:  0.6, color: '#F472B6' },
  { label: 'Alarmed',     v: -0.3, a:  0.6, color: '#F472B6' },
  { label: 'Frustrated',  v: -0.6, a:  0.4, color: '#F472B6' },
  { label: 'Annoyed',     v: -0.4, a:  0.3, color: '#F472B6' },
  // Low-arousal unpleasant (bottom left)
  { label: 'Miserable',   v: -0.7, a: -0.3, color: '#60A5FA' },
  { label: 'Bored',       v: -0.4, a: -0.4, color: '#60A5FA' },
  { label: 'Depressed',   v: -0.8, a: -0.5, color: '#60A5FA' },
  { label: 'Gloomy',      v: -0.5, a: -0.6, color: '#60A5FA' },
  { label: 'Sad',         v: -0.7, a: -0.7, color: '#60A5FA' },
  { label: 'Tired',       v: -0.3, a: -0.8, color: '#60A5FA' },
  // Low-arousal pleasant (bottom right)
  { label: 'Content',     v:  0.6, a: -0.3, color: '#34D399' },
  { label: 'Satisfied',   v:  0.3, a: -0.4, color: '#34D399' },
  { label: 'Relaxed',     v:  0.6, a: -0.6, color: '#34D399' },
  { label: 'Calm',        v:  0.4, a: -0.8, color: '#34D399' },
]

function nearestEmotion(v, a) {
  let best = EMOTIONS[0], bestDist = Infinity
  EMOTIONS.forEach(e => {
    const d = (e.v - v) ** 2 + (e.a - a) ** 2
    if (d < bestDist) { bestDist = d; best = e }
  })
  return best
}

export default function MoodGrid({ value, onChange }) {
  const [hover, setHover] = useState(null)
  const gridSize = 280
  const padding = 20

  function handleClick(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const v = ((x / rect.width) * 2 - 1).toFixed(2) * 1
    const a = (1 - (y / rect.height) * 2).toFixed(2) * 1
    const emotion = nearestEmotion(v, a)
    onChange({ valence: v, arousal: a, label: emotion.label })
  }

  function handleEmotionClick(e, emotion) {
    e.stopPropagation()
    onChange({ valence: emotion.v, arousal: emotion.a, label: emotion.label })
  }

  // Convert (v,a) [-1,1] to pixel position
  function pos(v, a) {
    return {
      left: `${((v + 1) / 2) * 100}%`,
      top:  `${((1 - a) / 2) * 100}%`,
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.label}>
        How do you feel?
        {value && <span className={styles.selectedLabel}>· {value.label}</span>}
      </div>
      <div
        className={styles.grid}
        style={{ width: gridSize, height: gridSize }}
        onClick={handleClick}
      >
        {/* Quadrant backgrounds */}
        <div className={`${styles.quadrant} ${styles.qTL}`} />
        <div className={`${styles.quadrant} ${styles.qTR}`} />
        <div className={`${styles.quadrant} ${styles.qBL}`} />
        <div className={`${styles.quadrant} ${styles.qBR}`} />

        {/* Axis lines */}
        <div className={styles.axisH} />
        <div className={styles.axisV} />

        {/* Quadrant labels */}
        <div className={`${styles.axisLabel} ${styles.lblTop}`}>High arousal</div>
        <div className={`${styles.axisLabel} ${styles.lblBot}`}>Low arousal</div>
        <div className={`${styles.axisLabel} ${styles.lblLeft}`}>Unpleasant</div>
        <div className={`${styles.axisLabel} ${styles.lblRight}`}>Pleasant</div>

        {/* Emotion dots */}
        {EMOTIONS.map(e => (
          <button
            key={e.label}
            className={`${styles.emotion} ${value?.label === e.label ? styles.emotionActive : ''}`}
            style={{ ...pos(e.v, e.a), color: e.color }}
            onClick={(ev) => handleEmotionClick(ev, e)}
            onMouseEnter={() => setHover(e.label)}
            onMouseLeave={() => setHover(null)}
          >
            {e.label}
          </button>
        ))}

        {/* Selected pin */}
        {value && (
          <div className={styles.pin} style={pos(value.valence, value.arousal)} />
        )}
      </div>
    </div>
  )
}

export { EMOTIONS, nearestEmotion }
