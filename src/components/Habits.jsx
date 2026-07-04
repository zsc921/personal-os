// src/components/Habits.jsx
import { useState } from 'react'
import HabitRings from './HabitRings'
import styles from './Habits.module.css'

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function dateStr(d) { return d.toISOString().split('T')[0] }

// Returns the 7 dates of the current week (Sunday → Saturday), so the
// week genuinely resets every Sunday rather than reusing a fixed array.
function getCurrentWeekDates() {
  const today = new Date()
  const sunday = new Date(today)
  sunday.setDate(today.getDate() - today.getDay())
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday)
    d.setDate(sunday.getDate() + i)
    return dateStr(d)
  })
}

export default function Habits({ habits, habitLogs, onToggleDate, onAddHabit, onEditHabit, onDeleteHabit }) {
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [view, setView] = useState('week') // 'week' | 'calendar'

  const weekDates = getCurrentWeekDates()
  const todayStr = dateStr(new Date())
  const todayIdx = new Date().getDay()

  const doneToday = habits.filter(h => h.doneToday).length

  // Build per-habit completion set for fast lookup in the week grid
  function isDone(habitId, date) {
    return habitLogs.some(l => l.habit_id === habitId && l.date === date && l.completed)
  }

  async function handleAdd() {
    if (!newName.trim()) return
    await onAddHabit(newName.trim())
    setNewName('')
    setShowForm(false)
  }

  function startEdit(h) {
    setEditingId(h.id)
    setEditName(h.name)
  }

  async function saveEdit(id) {
    if (!editName.trim()) return
    await onEditHabit(id, editName.trim())
    setEditingId(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName('')
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>{view === 'week' ? 'This week' : 'Calendar view'}</span>
          <div className={styles.headerRight}>
            <span className={styles.count}>{doneToday}/{habits.length} done today</span>
            <div className={styles.viewToggle}>
              <button className={`${styles.toggleBtn} ${view === 'week' ? styles.toggleActive : ''}`} onClick={() => setView('week')}>Week</button>
              <button className={`${styles.toggleBtn} ${view === 'calendar' ? styles.toggleActive : ''}`} onClick={() => setView('calendar')}>Calendar</button>
            </div>
          </div>
        </div>

        {habits.length === 0 && (
          <p className={styles.empty}>No habits yet. Add one below or use the command bar.</p>
        )}

        {view === 'week' ? (
          habits.map(h => (
            <div key={h.id} className={styles.habitRow}>
              {editingId === h.id ? (
                <div className={styles.editInline}>
                  <input
                    className={styles.input}
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(h.id); if (e.key === 'Escape') cancelEdit() }}
                    autoFocus
                  />
                  <button className={styles.accentBtn} onClick={() => saveEdit(h.id)}>Save</button>
                  <button className={styles.ghostBtn} onClick={cancelEdit}>Cancel</button>
                </div>
              ) : (
                <>
                  <span className={styles.habitName}>{h.name}</span>
                  <div className={styles.days}>
                    {weekDates.map((date, di) => {
                      const done = isDone(h.id, date)
                      const isFuture = date > todayStr
                      return (
                        <button
                          key={date}
                          className={`${styles.dayDot} ${done ? styles.done : ''} ${di === todayIdx ? styles.today : ''} ${isFuture ? styles.future : ''}`}
                          onClick={() => !isFuture && onToggleDate(h.id, date)}
                          disabled={isFuture}
                          aria-label={`${DAY_LABELS[di]} for ${h.name}`}
                          title={date}
                        >
                          {done ? '✓' : DAY_LABELS[di]}
                        </button>
                      )
                    })}
                  </div>
                  <span className={styles.streak}>🔥 {h.streak}d</span>
                  <div className={styles.rowActions}>
                    <button className={styles.editBtn} onClick={() => startEdit(h)} title="Edit habit">✎</button>
                    <button className={styles.deleteBtn} onClick={() => onDeleteHabit(h.id)} title="Delete habit">×</button>
                  </div>
                </>
              )}
            </div>
          ))
        ) : (
          <HabitRings habits={habits} habitLogs={habitLogs} onToggleDate={onToggleDate} />
        )}

        {showForm ? (
          <div className={styles.addForm}>
            <input
              className={styles.input}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Habit name…"
              autoFocus
            />
            <button className={styles.accentBtn} onClick={handleAdd}>Add</button>
            <button className={styles.ghostBtn} onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        ) : (
          <button className={styles.addBtn} onClick={() => setShowForm(true)}>
            + Add habit
          </button>
        )}
      </div>
    </div>
  )
}
