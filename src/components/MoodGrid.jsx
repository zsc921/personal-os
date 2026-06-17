// src/components/MoodGrid.jsx
// 2D mood picker: valence (negative ↔ positive) on X, arousal (calm ↔ activated) on Y.
// Inspired by the circumplex model of affect referenced in "A Brief History of Intelligence."

import { useRef } from 'react'
import styles from './MoodGrid.module.css'

const QUADRANT_LABELS = {
  q1: 'Excited / Energized',   // +valence, +arousal
  q2: 'Tense / Anxious',       // -valence, +arousal
  q3: 'Sad / Depleted',        // -valence, -arousal
  q4: 'Calm / Content',        // +valence, -arousal
}

function getQuadrant(v, a) {
  if (v >= 0 && a >= 0) return 'q1'
  if (v < 0 && a >= 0) return 'q2'
  if (v < 0 && a < 0) return 'q3'
  return 'q4'
}

export function moodLabel(v, a) {
  return QUADRANT_LABELS[getQuadrant(v, a)]
}

export default function MoodGrid({ valence = 0, arousal = 0, onChange, readOnly = false }) {
  const gridRef = useRef(null)

  function handleInteract(clientX, clientY) {
    if (readOnly || !onChange) return
    const rect = gridRef.current.getBoundingClientRect()
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width)
    const y = Math.min(Math.max(clientY - rect.top, 0), rect.height)
    const v = Math.round(((x / rect.width) * 2 - 1) * 10) / 10
    const a = Math.round((1 - (y / rect.height) * 2) * 10) / 10
    onChange(v, a)
  }

  function handleClick(e) {
    handleInteract(e.clientX, e.clientY)
  }

  function handleDrag(e) {
    if (e.buttons !== 1) return
    handleInteract(e.clientX, e.clientY)
  }

  const dotX = ((valence + 1) / 2) * 100
  const dotY = ((1 - arousal) / 2) * 100

  return (
    <div className={styles.wrapper}>
      <div
        ref={gridRef}
        className={`${styles.grid} ${readOnly ? styles.readOnly : ''}`}
        onClick={handleClick}
        onMouseMove={handleDrag}
        role={readOnly ? undefined : 'slider'}
        aria-label="Mood: valence and arousal"
      >
        <div className={styles.axisLabelTop}>High energy</div>
        <div className={styles.axisLabelBottom}>Low energy</div>
        <div className={styles.axisLabelLeft}>Unpleasant</div>
        <div className={styles.axisLabelRight}>Pleasant</div>
        <div className={styles.crosshairV} />
        <div className={styles.crosshairH} />
        <div
          className={styles.dot}
          style={{ left: `${dotX}%`, top: `${dotY}%` }}
        />
      </div>
      <div className={styles.readout}>
        <span className={styles.moodTag}>{moodLabel(valence, arousal)}</span>
        <span className={styles.coords}>v {valence.toFixed(1)} · a {arousal.toFixed(1)}</span>
      </div>
    </div>
  )
}
