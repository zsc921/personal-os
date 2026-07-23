// src/components/HabitRings.jsx
// Month calendar where each day is a progress ring = fraction of habits completed.
// Click a day to see and toggle its individual habits.

import { useState } from 'react'
import styles from './HabitRings.module.css'
import { toLocalDateStr as dateStr } from '../lib/dates'

// dateStr now comes from lib/dates (local-time safe)
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DOW = ['Su','Mo','Tu','We','Th','Fr','Sa']

export default function HabitRings({ habits, habitLogs, onToggleDate }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selectedDay, setSelectedDay] = useState(null)

  const todayStr = dateStr(new Date())
  const nHabits = habits.length || 1

  // Completion lookup: date -> Set(habit_id)
  const doneByDate = {}
  habitLogs.forEach(l => {
    if (!l.completed) return
    if (!doneByDate[l.date]) doneByDate[l.date] = new Set()
    doneByDate[l.date].add(l.habit_id)
  })

  function prevMonth() {
    setSelectedDay(null)
    if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1)
  }
  function nextMonth() {
    setSelectedDay(null)
    if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1)
  }

  // Build the day cells for the displayed month
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))

  const R = 15, C = 2 * Math.PI * R

  return (
    <div className={styles.wrapper}>
      <div className={styles.monthNav}>
        <button className={styles.navBtn} onClick={prevMonth}>‹</button>
        <span className={styles.monthTitle}>{MONTHS[month]} {year}</span>
        <button className={styles.navBtn} onClick={nextMonth}>›</button>
      </div>

      <div className={styles.dowRow}>
        {DOW.map(d => <span key={d} className={styles.dowLabel}>{d}</span>)}
      </div>

      <div className={styles.grid}>
        {cells.map((day, i) => {
          if (!day) return <div key={`x${i}`} />
          const ds = dateStr(day)
          const isFuture = ds > todayStr
          const isToday = ds === todayStr
          const done = doneByDate[ds]?.size || 0
          const frac = Math.min(1, done / nHabits)
          const selected = selectedDay === ds

          return (
            <button
              key={ds}
              className={`${styles.dayCell} ${selected ? styles.selected : ''}`}
              onClick={() => !isFuture && setSelectedDay(selected ? null : ds)}
              disabled={isFuture}
            >
              <svg viewBox="0 0 40 40" className={styles.ring}>
                <circle cx="20" cy="20" r={R} fill="none"
                  stroke={isFuture ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)'}
                  strokeWidth="4" strokeDasharray={isFuture ? '2 3' : undefined} />
                {!isFuture && frac > 0 && (
                  <circle cx="20" cy="20" r={R} fill="none"
                    stroke={frac >= 1 ? 'var(--green)' : 'var(--accent)'}
                    strokeWidth="4" strokeLinecap="round"
                    strokeDasharray={C}
                    strokeDashoffset={C * (1 - frac)}
                    transform="rotate(-90 20 20)" />
                )}
                <text x="20" y="24" textAnchor="middle"
                  className={`${styles.dayNum} ${isToday ? styles.todayNum : ''}`}>
                  {day.getDate()}
                </text>
              </svg>
            </button>
          )
        })}
      </div>

      {selectedDay && (
        <div className={styles.dayDetail}>
          <div className={styles.dayDetailTitle}>
            {new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
          {habits.map(h => {
            const isDone = doneByDate[selectedDay]?.has(h.id) || false
            return (
              <button
                key={h.id}
                className={`${styles.detailRow} ${isDone ? styles.detailDone : ''}`}
                onClick={() => onToggleDate(h.id, selectedDay)}
              >
                <span className={styles.detailCheck}>{isDone ? '✓' : ''}</span>
                <span className={styles.detailName}>{h.name}</span>
              </button>
            )
          })}
        </div>
      )}

      <div className={styles.legendRow}>
        <span className={styles.legendItem}><span className={styles.legendRing} style={{ borderColor: 'var(--accent)' }} /> partial</span>
        <span className={styles.legendItem}><span className={styles.legendRing} style={{ borderColor: 'var(--green)' }} /> all done</span>
      </div>
    </div>
  )
}
