// src/components/MoodGrid.jsx
// Four-quadrant mood picker based on the arousal/valence circumplex model.
// Enriched vocabulary: ~50 emotion words. "Primary" terms are always labeled;
// "secondary" terms show as small dots with a hover tooltip, to keep the
// canvas readable at this density (labeling all ~50 permanently would collide).

import { useState } from 'react'
import styles from './MoodGrid.module.css'

// v = valence (-1 unpleasant .. 1 pleasant), a = arousal (-1 calm .. 1 activated)
const EMOTIONS = [
  // ── High arousal / pleasant (top right) ──────────────────────────────────
  { label: 'Aroused',       v: 0.35, a: 0.95, tier: 'secondary', color: '#FBBF24' },
  { label: 'Astonished',    v: 0.30, a: 0.90, tier: 'secondary', color: '#FBBF24' },
  { label: 'Excited',       v: 0.55, a: 0.85, tier: 'primary',   color: '#FBBF24' },
  { label: 'Adventurous',   v: 0.65, a: 0.90, tier: 'secondary', color: '#FBBF24' },
  { label: 'Triumphant',    v: 0.60, a: 0.70, tier: 'secondary', color: '#FBBF24' },
  { label: 'Elated',        v: 0.75, a: 0.65, tier: 'secondary', color: '#FBBF24' },
  { label: 'Ambitious',     v: 0.45, a: 0.60, tier: 'secondary', color: '#FBBF24' },
  { label: 'Confident',     v: 0.55, a: 0.55, tier: 'secondary', color: '#FBBF24' },
  { label: 'Courageous',    v: 0.70, a: 0.55, tier: 'secondary', color: '#FBBF24' },
  { label: 'Delighted',     v: 0.65, a: 0.50, tier: 'primary',   color: '#FBBF24' },
  { label: 'Enthusiastic',  v: 0.60, a: 0.42, tier: 'secondary', color: '#FBBF24' },
  { label: 'Determined',    v: 0.40, a: 0.35, tier: 'secondary', color: '#FBBF24' },
  { label: 'Happy',         v: 0.80, a: 0.35, tier: 'primary',   color: '#FBBF24' },
  { label: 'Amused',        v: 0.35, a: 0.30, tier: 'primary',   color: '#FBBF24' },
  { label: 'Passionate',    v: 0.45, a: 0.25, tier: 'secondary', color: '#FBBF24' },
  { label: 'Joyous',        v: 0.72, a: 0.22, tier: 'secondary', color: '#FBBF24' },
  { label: 'Glad',          v: 0.68, a: 0.15, tier: 'primary',   color: '#FBBF24' },
  { label: 'Interested',    v: 0.42, a: 0.12, tier: 'secondary', color: '#FBBF24' },
  { label: 'Curious',       v: 0.30, a: 0.10, tier: 'primary',   color: '#FBBF24' },

  // ── High arousal / unpleasant (top left) ─────────────────────────────────
  { label: 'Infuriated',    v: -0.80, a: 0.90, tier: 'primary',   color: '#F472B6' },
  { label: 'Hostile',       v: -0.55, a: 0.80, tier: 'secondary', color: '#F472B6' },
  { label: 'Fear',          v: -0.45, a: 0.85, tier: 'primary',   color: '#F472B6' },
  { label: 'Alarmed',       v: -0.30, a: 0.75, tier: 'primary',   color: '#F472B6' },
  { label: 'Tense',         v: -0.20, a: 0.70, tier: 'secondary', color: '#F472B6' },
  { label: 'Angry',         v: -0.70, a: 0.60, tier: 'primary',   color: '#F472B6' },
  { label: 'Enraged',       v: -0.60, a: 0.72, tier: 'secondary', color: '#F472B6' },
  { label: 'Hateful',       v: -0.75, a: 0.68, tier: 'secondary', color: '#F472B6' },
  { label: 'Envious',       v: -0.50, a: 0.55, tier: 'secondary', color: '#F472B6' },
  { label: 'Jealous',       v: -0.40, a: 0.50, tier: 'secondary', color: '#F472B6' },
  { label: 'Defiant',       v: -0.35, a: 0.62, tier: 'secondary', color: '#F472B6' },
  { label: 'Contemptuous',  v: -0.45, a: 0.65, tier: 'secondary', color: '#F472B6' },
  { label: 'Frustrated',    v: -0.60, a: 0.38, tier: 'primary',   color: '#F472B6' },
  { label: 'Annoyed',       v: -0.40, a: 0.30, tier: 'primary',   color: '#F472B6' },
  { label: 'Distressed',    v: -0.25, a: 0.42, tier: 'secondary', color: '#F472B6' },
  { label: 'Disgusted',     v: -0.20, a: 0.35, tier: 'secondary', color: '#F472B6' },
  { label: 'Indignant',     v: -0.15, a: 0.28, tier: 'secondary', color: '#F472B6' },
  { label: 'Suspicious',    v: -0.10, a: 0.20, tier: 'secondary', color: '#F472B6' },
  { label: 'Impatient',     v: -0.05, a: 0.15, tier: 'secondary', color: '#F472B6' },

  // ── Low arousal / unpleasant (bottom left) ───────────────────────────────
  { label: 'Miserable',     v: -0.65, a: -0.25, tier: 'primary',   color: '#60A5FA' },
  { label: 'Disappointed',  v: -0.20, a: -0.10, tier: 'secondary', color: '#60A5FA' },
  { label: 'Dissatisfied',  v: -0.35, a: -0.20, tier: 'secondary', color: '#60A5FA' },
  { label: 'Depressed',     v: -0.75, a: -0.45, tier: 'primary',   color: '#60A5FA' },
  { label: 'Gloomy',        v: -0.50, a: -0.55, tier: 'primary',   color: '#60A5FA' },
  { label: 'Sad',           v: -0.65, a: -0.65, tier: 'primary',   color: '#60A5FA' },
  { label: 'Desperate',     v: -0.55, a: -0.35, tier: 'secondary', color: '#60A5FA' },
  { label: 'Ashamed',       v: -0.40, a: -0.50, tier: 'secondary', color: '#60A5FA' },
  { label: 'Embarrassed',   v: -0.30, a: -0.45, tier: 'secondary', color: '#60A5FA' },
  { label: 'Melancholic',   v: -0.45, a: -0.60, tier: 'secondary', color: '#60A5FA' },
  { label: 'Anxious',       v: -0.20, a: -0.70, tier: 'secondary', color: '#60A5FA' },
  { label: 'Worried',       v: -0.15, a: -0.30, tier: 'secondary', color: '#60A5FA' },
  { label: 'Uncomfortable', v: -0.25, a: -0.30, tier: 'secondary', color: '#60A5FA' },
  { label: 'Apathetic',     v: -0.10, a: -0.35, tier: 'secondary', color: '#60A5FA' },
  { label: 'Bored',         v: -0.35, a: -0.40, tier: 'primary',   color: '#60A5FA' },
  { label: 'Dejected',      v: -0.30, a: -0.75, tier: 'secondary', color: '#60A5FA' },
  { label: 'Tired',         v: -0.15, a: -0.80, tier: 'primary',   color: '#60A5FA' },
  { label: 'Sleepy',        v: -0.10, a: -0.90, tier: 'secondary', color: '#60A5FA' },

  // ── Low arousal / pleasant (bottom right) ────────────────────────────────
  { label: 'Content',       v: 0.60, a: -0.30, tier: 'primary',   color: '#34D399' },
  { label: 'Pleased',       v: 0.40, a: -0.15, tier: 'secondary', color: '#34D399' },
  { label: 'Satisfied',     v: 0.30, a: -0.40, tier: 'primary',   color: '#34D399' },
  { label: 'Amorous',       v: 0.55, a: -0.15, tier: 'secondary', color: '#34D399' },
  { label: 'Hopeful',       v: 0.35, a: -0.10, tier: 'secondary', color: '#34D399' },
  { label: 'Longing',       v: 0.15, a: -0.25, tier: 'secondary', color: '#34D399' },
  { label: 'Attentive',     v: 0.25, a: -0.35, tier: 'secondary', color: '#34D399' },
  { label: 'Friendly',      v: 0.45, a: -0.45, tier: 'secondary', color: '#34D399' },
  { label: 'Relaxed',       v: 0.60, a: -0.60, tier: 'primary',   color: '#34D399' },
  { label: 'Serene',        v: 0.50, a: -0.55, tier: 'secondary', color: '#34D399' },
  { label: 'Contemplative', v: 0.20, a: -0.50, tier: 'secondary', color: '#34D399' },
  { label: 'Polite',        v: 0.30, a: -0.55, tier: 'secondary', color: '#34D399' },
  { label: 'Serious',       v: 0.10, a: -0.55, tier: 'secondary', color: '#34D399' },
  { label: 'Pensive',       v: 0.05, a: -0.45, tier: 'secondary', color: '#34D399' },
  { label: 'Compassionate', v: 0.35, a: -0.70, tier: 'secondary', color: '#34D399' },
  { label: 'Peaceful',      v: 0.45, a: -0.80, tier: 'secondary', color: '#34D399' },
  { label: 'Calm',          v: 0.40, a: -0.90, tier: 'primary',   color: '#34D399' },
  { label: 'Conscientious', v: 0.15, a: -0.65, tier: 'secondary', color: '#34D399' },
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
  const [hoverLabel, setHoverLabel] = useState(null)
  const gridSize = 320

  function handleClick(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const v = ((x / rect.width) * 2 - 1)
    const a = (1 - (y / rect.height) * 2)
    const emotion = nearestEmotion(v, a)
    onChange({ valence: v, arousal: a, label: emotion.label })
  }

  function handleEmotionClick(e, emotion) {
    e.stopPropagation()
    onChange({ valence: emotion.v, arousal: emotion.a, label: emotion.label })
  }

  function pos(v, a) {
    return {
      left: `${((v + 1) / 2) * 100}%`,
      top:  `${((1 - a) / 2) * 100}%`,
    }
  }

  const primary = EMOTIONS.filter(e => e.tier === 'primary')
  const secondary = EMOTIONS.filter(e => e.tier === 'secondary')

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

        {/* Secondary — small dots, label only on hover, still clickable/selectable */}
        {secondary.map(e => (
          <button
            key={e.label}
            className={`${styles.secondaryDot} ${value?.label === e.label ? styles.dotActive : ''}`}
            style={{ ...pos(e.v, e.a), background: e.color }}
            onClick={(ev) => handleEmotionClick(ev, e)}
            onMouseEnter={() => setHoverLabel(e.label)}
            onMouseLeave={() => setHoverLabel(null)}
            onFocus={() => setHoverLabel(e.label)}
            onBlur={() => setHoverLabel(null)}
            aria-label={e.label}
          />
        ))}

        {/* Primary — always-labeled, the "anchor" vocabulary */}
        {primary.map(e => (
          <button
            key={e.label}
            className={`${styles.emotion} ${value?.label === e.label ? styles.emotionActive : ''}`}
            style={{ ...pos(e.v, e.a), color: e.color }}
            onClick={(ev) => handleEmotionClick(ev, e)}
            onMouseEnter={() => setHoverLabel(e.label)}
            onMouseLeave={() => setHoverLabel(null)}
          >
            {e.label}
          </button>
        ))}

        {/* Floating tooltip for whichever secondary dot is hovered */}
        {hoverLabel && secondary.some(e => e.label === hoverLabel) && (
          <div
            className={styles.tooltip}
            style={pos(
              secondary.find(e => e.label === hoverLabel).v,
              secondary.find(e => e.label === hoverLabel).a
            )}
          >
            {hoverLabel}
          </div>
        )}

        {value && (
          <div className={styles.pin} style={pos(value.valence, value.arousal)} />
        )}
      </div>
      <p className={styles.hint}>{EMOTIONS.length} emotions · tap a dot or anywhere on the grid</p>
    </div>
  )
}

export { EMOTIONS, nearestEmotion }
