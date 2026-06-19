// src/components/YTDChart.jsx
// YTD spending viz with toggle between "by category" (horizontal bars) and "by month" (vertical bars).
// Reads from spending_history (archived months) + current month's live budget.spent.

import { useState } from 'react'
import styles from './YTDChart.module.css'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function YTDChart({ history, budgets, toCny }) {
  const [view, setView] = useState('category')
  const year = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  // Combine archived history rows for this year + current month from live budgets
  const liveCurrent = budgets.map(b => ({
    year, month: currentMonth, cat: b.cat, spent: b.spent || 0, budget: b.budget || 0,
  }))
  const archived = history.filter(h => h.year === year && h.month < currentMonth)
  const allRows = [...archived, ...liveCurrent]

  // ── By category aggregation ───────────────────────────────────────────────
  const byCat = {}
  allRows.forEach(r => { byCat[r.cat] = (byCat[r.cat] || 0) + (parseFloat(r.spent) || 0) })
  const catEntries = Object.entries(byCat).sort((a, b) => b[1] - a[1])
  const catMax = Math.max(...catEntries.map(e => e[1]), 1)
  const ytdTotal = catEntries.reduce((s, [, v]) => s + v, 0)

  // ── By month aggregation ──────────────────────────────────────────────────
  const byMonth = {}
  for (let m = 1; m <= currentMonth; m++) byMonth[m] = 0
  allRows.forEach(r => { byMonth[r.month] = (byMonth[r.month] || 0) + (parseFloat(r.spent) || 0) })
  const monthMax = Math.max(...Object.values(byMonth), 1)

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <span className={styles.cardTitle}>{year} YTD spending</span>
          <div className={styles.ytdTotal}>
            <span className={styles.ytdAmount}>${Math.round(ytdTotal).toLocaleString()}</span>
            <span className={styles.ytdCny}>¥{toCny(ytdTotal)}</span>
          </div>
        </div>
        <div className={styles.toggleGroup}>
          <button className={`${styles.toggleBtn} ${view === 'category' ? styles.toggleActive : ''}`} onClick={() => setView('category')}>By category</button>
          <button className={`${styles.toggleBtn} ${view === 'month' ? styles.toggleActive : ''}`} onClick={() => setView('month')}>By month</button>
        </div>
      </div>

      {view === 'category' ? (
        catEntries.length === 0 ? <p className={styles.empty}>No spending recorded yet.</p> :
        <div className={styles.catBars}>
          {catEntries.map(([cat, amt]) => (
            <div key={cat} className={styles.catRow}>
              <span className={styles.catName}>{cat}</span>
              <div className={styles.catBarWrap}>
                <div className={styles.catBar} style={{ width: `${(amt / catMax) * 100}%` }} />
              </div>
              <span className={styles.catAmt}>${Math.round(amt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.monthChart}>
          {Object.entries(byMonth).map(([m, amt]) => {
            const h = (amt / monthMax) * 100
            const isCurrent = parseInt(m) === currentMonth
            return (
              <div key={m} className={styles.monthCol}>
                <div className={styles.monthBarWrap}>
                  <div className={styles.monthAmtLabel}>${Math.round(amt).toLocaleString()}</div>
                  <div className={`${styles.monthBar} ${isCurrent ? styles.monthBarCurrent : ''}`} style={{ height: `${Math.max(h, 2)}%` }} />
                </div>
                <span className={styles.monthLabel}>{MONTHS[parseInt(m) - 1]}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
