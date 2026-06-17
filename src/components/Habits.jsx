// src/components/Habits.jsx
import { useState } from 'react'
import styles from './Habits.module.css'

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export default function Habits({ habits, onToggleDay, onAddHabit, onEditHabit, onDeleteHabit }) {
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const today = new Date().getDay()
  const doneToday = habits.filter(h => h.days?.[today]).length

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
          <span className={styles.cardTitle}>This week</span>
          <span className={styles.count}>{doneToday}/{habits.length} done today</span>
        </div>

        {habits.length === 0 && (
          <p className={styles.empty}>No habits yet. Add one below or use the command bar.</p>
        )}

        {habits.map(h => (
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
                  {DAY_LABELS.map((label, di) => (
                    <button
                      key={di}
                      className={`${styles.dayDot} ${h.days?.[di] ? styles.done : ''} ${di === today ? styles.today : ''}`}
                      onClick={() => onToggleDay(h.id, di)}
                      aria-label={`${label} for ${h.name}`}
                      title={label}
                    >
                      {h.days?.[di] ? '✓' : label}
                    </button>
                  ))}
                </div>
                <span className={styles.streak}>🔥 {h.streak || 0}d</span>
                <div className={styles.rowActions}>
                  <button className={styles.editBtn} onClick={() => startEdit(h)} title="Edit habit">✎</button>
                  <button className={styles.deleteBtn} onClick={() => onDeleteHabit(h.id)} title="Delete habit">×</button>
                </div>
              </>
            )}
          </div>
        ))}

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
