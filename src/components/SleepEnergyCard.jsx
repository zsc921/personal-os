// src/components/SleepEnergyCard.jsx
// Combines the chart with a recent-logs list that allows inline editing.

import { useState } from 'react'
import SleepEnergyChart from './SleepEnergyChart'
import styles from './SleepEnergyCard.module.css'

export default function SleepEnergyCard({ logs, onEdit, onDelete, onAdd }) {
  const [editingId, setEditingId] = useState(null)
  const [fields, setFields] = useState({})
  const [showAdd, setShowAdd] = useState(false)
  const [newFields, setNewFields] = useState({ sleep_hours: '', sleep_score: '', energy_level: '' })

  function startEdit(log) {
    setEditingId(log.id)
    setFields({
      sleep_hours: log.sleep_hours ?? '',
      sleep_score: log.sleep_score ?? '',
      energy_level: log.energy_level ?? '',
    })
  }

  async function saveEdit(id) {
    await onEdit(id, {
      sleep_hours: fields.sleep_hours === '' ? null : parseFloat(fields.sleep_hours),
      sleep_score: fields.sleep_score === '' ? null : parseFloat(fields.sleep_score),
      energy_level: fields.energy_level === '' ? null : parseFloat(fields.energy_level),
    })
    setEditingId(null)
  }

  async function handleAdd() {
    const payload = {
      sleepHours: newFields.sleep_hours === '' ? null : parseFloat(newFields.sleep_hours),
      sleepScore: newFields.sleep_score === '' ? null : parseFloat(newFields.sleep_score),
      energyLevel: newFields.energy_level === '' ? null : parseFloat(newFields.energy_level),
    }
    if (payload.sleepHours == null && payload.sleepScore == null && payload.energyLevel == null) return
    await onAdd(payload)
    setNewFields({ sleep_hours: '', sleep_score: '', energy_level: '' })
    setShowAdd(false)
  }

  const fmtDate = ts => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <>
      <SleepEnergyChart logs={logs.slice(0, 14)} />

      <div className={styles.controls}>
        <div className={styles.controlsHeader}>
          <span className={styles.controlsLabel}>Recent logs</span>
          <button className={styles.addBtn} onClick={() => setShowAdd(s => !s)}>+ Log</button>
        </div>

        {showAdd && (
          <div className={styles.addForm}>
            <input className={styles.input} type="number" step="0.1" placeholder="sleep h" value={newFields.sleep_hours} onChange={e => setNewFields(f => ({ ...f, sleep_hours: e.target.value }))} />
            <input className={styles.input} type="number" placeholder="score" value={newFields.sleep_score} onChange={e => setNewFields(f => ({ ...f, sleep_score: e.target.value }))} />
            <input className={styles.input} type="number" placeholder="energy" value={newFields.energy_level} onChange={e => setNewFields(f => ({ ...f, energy_level: e.target.value }))} />
            <button className={styles.accentBtn} onClick={handleAdd}>Save</button>
          </div>
        )}

        <div className={styles.logList}>
          {logs.slice(0, 5).map(l => (
            <div key={l.id} className={styles.logRow}>
              {editingId === l.id ? (
                <>
                  <span className={styles.logDate}>{fmtDate(l.created_at)}</span>
                  <input className={styles.input} type="number" step="0.1" placeholder="h" value={fields.sleep_hours} onChange={e => setFields(f => ({ ...f, sleep_hours: e.target.value }))} style={{ width: 60 }} />
                  <input className={styles.input} type="number" placeholder="score" value={fields.sleep_score} onChange={e => setFields(f => ({ ...f, sleep_score: e.target.value }))} style={{ width: 65 }} />
                  <input className={styles.input} type="number" placeholder="energy" value={fields.energy_level} onChange={e => setFields(f => ({ ...f, energy_level: e.target.value }))} style={{ width: 65 }} />
                  <button className={styles.accentBtn} onClick={() => saveEdit(l.id)}>Save</button>
                  <button className={styles.ghostBtn} onClick={() => setEditingId(null)}>✕</button>
                </>
              ) : (
                <>
                  <span className={styles.logDate}>{fmtDate(l.created_at)}</span>
                  <span className={styles.metric}>{l.sleep_hours != null ? `💤 ${l.sleep_hours}h` : ''}</span>
                  <span className={styles.metric}>{l.sleep_score != null ? `📊 ${l.sleep_score}` : ''}</span>
                  <span className={styles.metric}>{l.energy_level != null ? `⚡ ${l.energy_level}` : ''}</span>
                  <div className={styles.rowActions}>
                    <button className={styles.editBtn} onClick={() => startEdit(l)} title="Edit">✎</button>
                    <button className={styles.deleteBtn} onClick={() => onDelete(l.id)} title="Delete">×</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
