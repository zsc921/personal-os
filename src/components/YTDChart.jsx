// src/components/YTDChart.jsx
// YTD spending: toggle between "By category" (horizontal bars) and
// "MoM trend" (stacked bars by category with per-month totals).

import { useState } from 'react'
import styles from './YTDChart.module.css'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const CAT_COLORS = {
  Beauty: '#FB7185', Entertainment: '#FB923C', Dining: '#A78BFA', Grocery: '#34D399',
  Home: '#C4B5FD', Shopping: '#F472B6', Sports: '#2DD4BF', Transport: '#60A5FA',
  Travel: '#38BDF8', Utility: '#FBBF24', Rent: '#818CF8', Other: '#8B8B95',
  Food: '#A78BFA', Health: '#4ADE80', // legacy, for old data still in history
}

export default function YTDChart({ history, budgets, toCny }) {
  const [view, setView] = useState('category')
  const [hoverCat, setHoverCat] = useState(null)
  const year = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  const liveCurrent = budgets.map(b => ({
    year, month: currentMonth, cat: b.cat, spent: b.spent || 0,
  }))
  const archived = history.filter(h => h.year === year && h.month < currentMonth)
  const allRows = [...archived, ...liveCurrent]

  // By category totals
  const byCat = {}
  allRows.forEach(r => { byCat[r.cat] = (byCat[r.cat] || 0) + (parseFloat(r.spent) || 0) })
  const catEntries = Object.entries(byCat).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
  const catMax = Math.max(...catEntries.map(e => e[1]), 1)
  const ytdTotal = catEntries.reduce((s, [, v]) => s + v, 0)

  // By month x category matrix
  const byMonth = {}
  for (let m = 1; m <= currentMonth; m++) byMonth[m] = {}
  allRows.forEach(r => {
    if (!byMonth[r.month]) byMonth[r.month] = {}
    byMonth[r.month][r.cat] = (byMonth[r.month][r.cat] || 0) + (parseFloat(r.spent) || 0)
  })
  const monthTotals = Object.fromEntries(
    Object.entries(byMonth).map(([m, cats]) => [m, Object.values(cats).reduce((s, v) => s + v, 0)])
  )
  const monthMax = Math.max(...Object.values(monthTotals), 1)

  const colorFor = cat => CAT_COLORS[cat] || '#8B8B95'

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
          <button className={`${styles.toggleBtn} ${view === 'month' ? styles.toggleActive : ''}`} onClick={() => setView('month')}>MoM trend</button>
        </div>
      </div>

      {view === 'category' ? (
        catEntries.length === 0 ? <p className={styles.empty}>No spending recorded yet.</p> :
        <div className={styles.catBars}>
          {catEntries.map(([cat, amt]) => (
            <div key={cat} className={styles.catRow}>
              <span className={styles.catName}>{cat}</span>
              <div className={styles.catBarWrap}>
                <div className={styles.catBar} style={{ width: `${(amt / catMax) * 100}%`, background: colorFor(cat) }} />
              </div>
              <span className={styles.catAmt}>${Math.round(amt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className={styles.monthChart}>
            {Object.entries(byMonth).map(([m, cats]) => {
              const total = monthTotals[m]
              const isCurrent = parseInt(m) === currentMonth
              // Sort segments by size for a stable stack
              const segments = Object.entries(cats).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
              return (
                <div key={m} className={styles.monthCol}>
                  <div className={styles.monthBarWrap}>
                    <div className={styles.monthAmtLabel}>${Math.round(total).toLocaleString()}</div>
                    <div className={`${styles.stackBar} ${isCurrent ? styles.stackCurrent : ''}`}
                      style={{ height: `${Math.max((total / monthMax) * 100, 2)}%` }}>
                      {segments.map(([cat, v]) => (
                        <div
                          key={cat}
                          className={styles.segment}
                          style={{
                            height: `${(v / total) * 100}%`,
                            background: colorFor(cat),
                            opacity: hoverCat && hoverCat !== cat ? 0.25 : 0.9,
                          }}
                          title={`${cat}: $${Math.round(v).toLocaleString()}`}
                        />
                      ))}
                    </div>
                  </div>
                  <span className={styles.monthLabel}>{MONTHS[parseInt(m) - 1]}</span>
                </div>
              )
            })}
          </div>
          <div className={styles.stackLegend}>
            {catEntries.slice(0, 8).map(([cat]) => (
              <span
                key={cat}
                className={styles.stackLegendItem}
                onMouseEnter={() => setHoverCat(cat)}
                onMouseLeave={() => setHoverCat(null)}
              >
                <span className={styles.legendSwatch} style={{ background: colorFor(cat) }} />
                {cat}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
