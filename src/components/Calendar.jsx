// src/components/Calendar.jsx
import { useState, useEffect, useCallback } from 'react'
import styles from './Calendar.module.css'
import { startGoogleLogin, fetchGoogleEvents, getConnectedAccounts, disconnectAccount } from '../lib/googleCalendar'
import { toLocalDateStr } from '../lib/dates'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_LABELS = ['Su','Mo','Tu','We','Th','Fr','Sa']
const TAGS = ['tag-work', 'tag-personal', 'tag-health']

export default function Calendar({ events, onDeleteEvent, onEditEvent }) {
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState(toLocalDateStr(now))
  const [editingId, setEditingId] = useState(null)
  const [editFields, setEditFields] = useState({})

  // Google Calendar state
  const [googleAccounts, setGoogleAccounts] = useState([])
  const [googleEvents, setGoogleEvents] = useState({})
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showAccountsPanel, setShowAccountsPanel] = useState(false)

  useEffect(() => {
    loadGoogleAccounts()
  }, [])

  async function loadGoogleAccounts() {
    try {
      const accounts = await getConnectedAccounts()
      setGoogleAccounts(accounts)
      if (accounts.length > 0) loadGoogleEvents(accounts)
    } catch (err) {
      // google_accounts table may not exist yet if user hasn't run the migration — fail quietly
      console.warn('[Calendar] Google accounts not available yet:', err.message)
    }
  }

  const loadGoogleEvents = useCallback(async (accounts) => {
    setGoogleLoading(true)
    try {
      const timeMin = new Date(viewYear, viewMonth - 1, 1).toISOString()
      const timeMax = new Date(viewYear, viewMonth + 2, 0).toISOString()
      const evs = await fetchGoogleEvents(accounts, timeMin, timeMax)
      const grouped = evs.reduce((acc, e) => {
        if (!acc[e.date]) acc[e.date] = []
        acc[e.date].push(e)
        return acc
      }, {})
      setGoogleEvents(grouped)
    } catch (err) {
      console.error('[Calendar] Failed to load Google events:', err)
    }
    setGoogleLoading(false)
  }, [viewYear, viewMonth])

  useEffect(() => {
    if (googleAccounts.length > 0) loadGoogleEvents(googleAccounts)
  }, [viewYear, viewMonth, googleAccounts, loadGoogleEvents])

  async function handleDisconnect(accountId) {
    await disconnectAccount(accountId)
    const remaining = googleAccounts.filter(a => a.id !== accountId)
    setGoogleAccounts(remaining)
    if (remaining.length > 0) loadGoogleEvents(remaining)
    else setGoogleEvents({})
  }

  const todayStr = toLocalDateStr(now)
  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate()

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  function startEdit(e) {
    setEditingId(e.id)
    setEditFields({ name: e.name, time: e.time, tag: e.tag })
  }

  async function saveEdit(eventId) {
    await onEditEvent(eventId, selectedDate, editFields)
    setEditingId(null)
  }

  // Merge local + Google events for display
  function mergedEventsFor(dateStr) {
    return [...(events[dateStr] || []), ...(googleEvents[dateStr] || [])]
  }

  const selectedEvents = mergedEventsFor(selectedDate)
  const selectedLabel = selectedDate === todayStr
    ? "Today's agenda"
    : new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

  return (
    <div className={styles.wrapper}>
      <div className={styles.googleBar}>
        <div className={styles.googleStatus}>
          {googleAccounts.length === 0 ? (
            <span className={styles.googleMuted}>No Google accounts connected</span>
          ) : (
            <span className={styles.googleMuted}>
              {googleLoading ? 'Syncing… ' : ''}
              {googleAccounts.length} account{googleAccounts.length > 1 ? 's' : ''} connected
            </span>
          )}
        </div>
        <button className={styles.googleBtn} onClick={() => setShowAccountsPanel(s => !s)}>
          Manage Google Calendars
        </button>
      </div>

      {showAccountsPanel && (
        <div className={styles.accountsPanel}>
          {googleAccounts.map(acc => (
            <div key={acc.id} className={styles.accountRow}>
              <span className={styles.accountDot} />
              <span className={styles.accountEmail}>{acc.email}</span>
              <button className={styles.disconnectBtn} onClick={() => handleDisconnect(acc.id)}>Disconnect</button>
            </div>
          ))}
          <button className={styles.addAccountBtn} onClick={startGoogleLogin}>
            + Connect a Google account
          </button>
        </div>
      )}

      <div className={styles.grid2}>
        <div className={styles.card}>
          <div className={styles.calHeader}>
            <button className={styles.navBtn} onClick={prevMonth}>‹</button>
            <span className={styles.cardTitle}>{MONTHS[viewMonth]} {viewYear}</span>
            <button className={styles.navBtn} onClick={nextMonth}>›</button>
          </div>
          <div className={styles.calGrid}>
            {DAY_LABELS.map(d => <div key={d} className={styles.dayHeader}>{d}</div>)}
            {Array.from({ length: firstDay }, (_, i) => (
              <div key={`prev-${i}`} className={`${styles.day} ${styles.otherMonth}`}>
                {prevMonthDays - firstDay + 1 + i}
              </div>
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const d = i + 1
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
              const hasEvents = mergedEventsFor(dateStr).length > 0
              return (
                <button
                  key={d}
                  className={`${styles.day} ${dateStr === todayStr ? styles.today : ''} ${dateStr === selectedDate && dateStr !== todayStr ? styles.selected : ''}`}
                  onClick={() => setSelectedDate(dateStr)}
                >
                  {d}
                  {hasEvents && <span className={styles.eventDot} />}
                </button>
              )
            })}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.agendaHeader}>
            <span className={styles.cardTitle}>{selectedLabel}</span>
          </div>
          {selectedEvents.length === 0 ? (
            <p className={styles.empty}>No events. Add one via the command bar: "Meeting with X on [date] at [time]"</p>
          ) : selectedEvents.map((e, i) => (
            <div key={e.id || i} className={styles.eventRow}>
              {editingId === e.id ? (
                <div className={styles.editBlock}>
                  <input
                    className={styles.editInput}
                    value={editFields.name}
                    onChange={ev => setEditFields(f => ({ ...f, name: ev.target.value }))}
                    placeholder="Event name"
                  />
                  <div className={styles.editRow2}>
                    <input
                      className={styles.editInput}
                      value={editFields.time}
                      onChange={ev => setEditFields(f => ({ ...f, time: ev.target.value }))}
                      placeholder="Time"
                      style={{ flex: 1 }}
                    />
                    <select
                      className={styles.editSelect}
                      value={editFields.tag}
                      onChange={ev => setEditFields(f => ({ ...f, tag: ev.target.value }))}
                    >
                      {TAGS.map(t => <option key={t} value={t}>{t.replace('tag-', '')}</option>)}
                    </select>
                  </div>
                  <div className={styles.editBtns}>
                    <button className={styles.accentBtn} onClick={() => saveEdit(e.id)}>Save</button>
                    <button className={styles.ghostBtn} onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <span className={styles.eventTime}>{e.time}</span>
                  <div style={{ flex: 1 }}>
                    <div className={styles.eventName}>{e.name}</div>
                    <span className={`${styles.eventTag} ${styles[e.tag] || styles['tag-google']}`}>
                      {e.source === 'google' ? `📅 ${e.accountEmail?.split('@')[0]}` : e.tag?.replace('tag-', '')}
                    </span>
                  </div>
                  {e.source !== 'google' && (
                    <div className={styles.rowActions}>
                      <button className={styles.editBtn} onClick={() => startEdit(e)} title="Edit">✎</button>
                      <button className={styles.deleteBtn} onClick={() => onDeleteEvent(e.id, selectedDate)} title="Delete">×</button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
