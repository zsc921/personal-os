// src/components/Relationships.jsx
// Quick-log hangouts: person autocomplete (multi-tag), energy scale (emoji),
// depth toggle (Surface/Real), optional note. Target: under 10 seconds to log.
// Running energy/depth averages are computed server-side per contact on save.

import { useState, useMemo } from 'react'
import styles from './Relationships.module.css'

const ENERGY_SCALE = [
  { value: 1, emoji: '😔', label: 'Drained' },
  { value: 2, emoji: '😐', label: 'Neutral' },
  { value: 3, emoji: '🙂', label: 'Good' },
  { value: 4, emoji: '😄', label: 'Great' },
  { value: 5, emoji: '🤩', label: 'Energized' },
]

function daysSince(dateStr) {
  if (!dateStr) return null
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / 86400000)
}

export default function Relationships({ contacts, hangoutLogs, onLogHangout, onDeleteContact, onDeleteHangout }) {
  const [showForm, setShowForm] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [selectedNames, setSelectedNames] = useState([])
  const [energy, setEnergy] = useState(3)
  const [depth, setDepth] = useState('real')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [expandedContact, setExpandedContact] = useState(null)

  const suggestions = useMemo(() => {
    if (!nameInput.trim()) return []
    const q = nameInput.toLowerCase()
    return contacts
      .filter(c => c.name.toLowerCase().includes(q) && !selectedNames.includes(c.name))
      .slice(0, 5)
  }, [nameInput, contacts, selectedNames])

  function addName(name) {
    const trimmed = name.trim()
    if (!trimmed || selectedNames.includes(trimmed)) return
    setSelectedNames(prev => [...prev, trimmed])
    setNameInput('')
  }

  function removeName(name) {
    setSelectedNames(prev => prev.filter(n => n !== name))
  }

  function handleNameKeyDown(e) {
    if (e.key === 'Enter' && nameInput.trim()) {
      e.preventDefault()
      addName(nameInput)
    }
  }

  async function handleSave() {
    // Include whatever's still typed in the name field, in case the user
    // never pressed Enter to convert it into a tag — don't make that a silent trap.
    const names = nameInput.trim() && !selectedNames.includes(nameInput.trim())
      ? [...selectedNames, nameInput.trim()]
      : selectedNames
    if (names.length === 0) return
    setSaving(true)
    await onLogHangout({ contactNames: names, energy, depth, note: note.trim() })
    setSelectedNames([]); setNameInput(''); setEnergy(3); setDepth('real'); setNote('')
    setSaving(false); setShowForm(false)
  }

  // Sort contacts: most overdue for contact first
  const sortedContacts = [...contacts].sort((a, b) => {
    const da = daysSince(a.last_contact_date) ?? 9999
    const db = daysSince(b.last_contact_date) ?? 9999
    return db - da
  })

  return (
    <div className={styles.wrapper}>
      {/* Quick-log card — persistent CTA */}
      <div className={styles.card}>
        {!showForm ? (
          <button className={styles.logCta} onClick={() => setShowForm(true)}>
            + Log a hangout
          </button>
        ) : (
          <div className={styles.form}>
            <div className={styles.fieldLabel}>Who</div>
            <div className={styles.tagInput}>
              {selectedNames.map(name => (
                <span key={name} className={styles.tag}>
                  {name}
                  <button className={styles.tagRemove} onClick={() => removeName(name)}>×</button>
                </span>
              ))}
              <input
                className={styles.nameField}
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={handleNameKeyDown}
                placeholder={selectedNames.length ? 'Add another…' : 'Type a name…'}
                autoFocus
              />
            </div>
            {suggestions.length > 0 && (
              <div className={styles.suggestions}>
                {suggestions.map(c => (
                  <button key={c.id} className={styles.suggestionChip} onClick={() => addName(c.name)}>{c.name}</button>
                ))}
              </div>
            )}

            <div className={styles.fieldLabel}>Energy</div>
            <div className={styles.energyRow}>
              {ENERGY_SCALE.map(e => (
                <button
                  key={e.value}
                  className={`${styles.energyBtn} ${energy === e.value ? styles.energyActive : ''}`}
                  onClick={() => setEnergy(e.value)}
                  title={e.label}
                >
                  {e.emoji}
                </button>
              ))}
            </div>

            <div className={styles.fieldLabel}>Depth</div>
            <div className={styles.depthRow}>
              <button className={`${styles.depthBtn} ${depth === 'surface' ? styles.depthActive : ''}`} onClick={() => setDepth('surface')}>Surface</button>
              <button className={`${styles.depthBtn} ${depth === 'real' ? styles.depthActive : ''}`} onClick={() => setDepth('real')}>Real</button>
            </div>

            <input
              className={styles.noteField}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="One-line note (optional)"
            />

            <div className={styles.formBtns}>
              <button className={styles.accentBtn} onClick={handleSave} disabled={saving || (selectedNames.length === 0 && !nameInput.trim())}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button className={styles.ghostBtn} onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* People list */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>People</span>
          <span className={styles.cardSub}>{contacts.length} tracked</span>
        </div>
        {sortedContacts.length === 0 ? (
          <p className={styles.empty}>No one logged yet — start with "Log a hangout" above.</p>
        ) : sortedContacts.map(c => {
          const d = daysSince(c.last_contact_date)
          const overdue = d != null && d > 21
          const expanded = expandedContact === c.id
          const contactHangouts = hangoutLogs.filter(h => h.contact_ids.includes(c.id))
          return (
            <div key={c.id} className={styles.personRow}>
              <button className={styles.personMain} onClick={() => setExpandedContact(expanded ? null : c.id)}>
                <span className={styles.personName}>{c.name}</span>
                <span className={styles.personMeta}>
                  {c.avg_energy != null && (
                    <span className={styles.avgBadge}>{ENERGY_SCALE.find(e => Math.round(c.avg_energy) === e.value)?.emoji || '🙂'} {c.avg_energy.toFixed(1)}</span>
                  )}
                  {c.depth_ratio != null && (
                    <span className={styles.depthBadge}>{Math.round(c.depth_ratio * 100)}% real</span>
                  )}
                  <span className={`${styles.lastContact} ${overdue ? styles.overdue : ''}`}>
                    {d == null ? '' : d === 0 ? 'today' : `${d}d ago`}
                  </span>
                </span>
              </button>
              {expanded && (
                <div className={styles.personDetail}>
                  {contactHangouts.slice(0, 8).map(h => (
                    <div key={h.id} className={styles.hangoutRow}>
                      <span>{ENERGY_SCALE.find(e => e.value === h.energy)?.emoji}</span>
                      <span className={styles.hangoutDepth}>{h.depth === 'real' ? 'Real' : 'Surface'}</span>
                      <span className={styles.hangoutDate}>{new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      {h.note && <span className={styles.hangoutNote}>· {h.note}</span>}
                      <button className={styles.deleteBtn} onClick={() => onDeleteHangout(h.id)}>×</button>
                    </div>
                  ))}
                  <button className={styles.deleteContactBtn} onClick={() => onDeleteContact(c.id)}>Remove {c.name}</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
