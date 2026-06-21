// src/components/HabitHeatmap.jsx
// GitHub-style calendar heatmap: weeks as columns, days as rows, one heatmap per habit.
// Selecting a habit shows its individual grid; intensity = completed or not (binary).

import { useState } from 'react'
import styles from './HabitHeatmap.module.css'

function dateStr(d) { return d.toISOString().split('T')[0] }
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// Build the last N weeks of dates, organized as columns (weeks) x rows (Sun-Sat)
function buildWeeks(numWeeks = 14) {
  const today = new Date()
  const endSunday = new Date(today)
  endSunday.setDate(today.getDate() - today.getDay() + 6) // end of this week (Saturday)
  const startSunday = new Date(endSunday)
  startSunday.setDate(endSunday.getDate() - (numWeeks * 7) + 1)

  const weeks = []
  let cursor = new Date(startSunday)
  cursor.setDate(cursor.getDate() - cursor.getDay()) // align to Sunday

  for (let w = 0; w < numWeeks; w++) {
    const week = []
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  }
  return weeks
}

export default function HabitHeatmap({ habits, habitLogs, onToggleDate }) {
  const [selectedHabitId, setSelectedHabitId] = useState(habits[0]?.id ?? null)
  const weeks = buildWeeks(14)
  const todayStr = dateStr(new Date())

  const selectedHabit = habits.find(h => h.id === selectedHabitId)

  function isDone(date) {
    return habitLogs.some(l => l.habit_id === selectedHabitId && l.date === date && l.completed)
  }

  // Month labels: show a label above the first week that starts a new month
  const monthLabels = weeks.map((week, wi) => {
    const firstOfWeek = week[0]
    if (wi === 0) return MONTHS[firstOfWeek.getMonth()]
    const prevWeekFirst = weeks[wi - 1][0]
    return firstOfWeek.getMonth() !== prevWeekFirst.getMonth() ? MONTHS[firstOfWeek.getMonth()] : ''
  })

  if (habits.length === 0) {
    return <p className={styles.empty}>No habits yet — add one to see its history here.</p>
  }

  // Count completions in the visible range for the selected habit
  const totalDays = weeks.flat().filter(d => dateStr(d) <= todayStr).length
  const completedDays = weeks.flat().filter(d => dateStr(d) <= todayStr && isDone(dateStr(d))).length

  return (
    <div className={styles.wrapper}>
      <div className={styles.habitTabs}>
        {habits.map(h => (
          <button
            key={h.id}
            className={`${styles.habitTab} ${h.id === selectedHabitId ? styles.habitTabActive : ''}`}
            onClick={() => setSelectedHabitId(h.id)}
          >
            {h.name}
          </button>
        ))}
      </div>

      {selectedHabit && (
        <>
          <div className={styles.summary}>
            <span className={styles.summaryStat}>{completedDays}/{totalDays} days completed</span>
            <span className={styles.summaryStreak}>🔥 {selectedHabit.streak}d streak</span>
          </div>

          <div className={styles.heatmapScroll}>
            <div className={styles.heatmapGrid}>
              <div className={styles.dayLabelCol}>
                {DAY_LABELS.map((l, i) => (
                  <div key={i} className={styles.dayLabelCell}>{i % 2 === 1 ? l : ''}</div>
                ))}
              </div>
              {weeks.map((week, wi) => (
                <div key={wi} className={styles.weekCol}>
                  <div className={styles.monthLabel}>{monthLabels[wi]}</div>
                  {week.map((day, di) => {
                    const ds = dateStr(day)
                    const future = ds > todayStr
                    const done = !future && isDone(ds)
                    const isToday = ds === todayStr
                    return (
                      <button
                        key={di}
                        className={`${styles.cell} ${done ? styles.cellDone : ''} ${future ? styles.cellFuture : ''} ${isToday ? styles.cellToday : ''}`}
                        disabled={future}
                        onClick={() => onToggleDate(selectedHabitId, ds)}
                        title={`${ds}${done ? ' ✓' : ''}`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.legend}>
            <span>Less</span>
            <span className={`${styles.legendCell}`} />
            <span className={`${styles.legendCell} ${styles.cellDone}`} />
            <span>More</span>
          </div>
        </>
      )}
    </div>
  )
}
