// src/components/BodyTrendChart.jsx
// Dual-line: date on X, weight (left axis kg) and body fat (right axis %).

import styles from './BodyTrendChart.module.css'

export default function BodyTrendChart({ logs }) {
  const data = [...logs].reverse().filter(l => l.weight != null || l.body_fat != null)

  if (data.length === 0) {
    return <p className={styles.empty}>No body logs yet. Tap "+ Log" or use the command bar: "Weight 62kg, body fat 22%"</p>
  }

  const W = 600, H = 190
  const padL = 36, padR = 38, padT = 14, padB = 28
  const plotW = W - padL - padR
  const plotH = H - padT - padB
  const n = data.length
  const xFor = i => padL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW)

  const weights = data.filter(d => d.weight != null).map(d => d.weight)
  const fats = data.filter(d => d.body_fat != null).map(d => d.body_fat)

  const wMin = weights.length ? Math.min(...weights) - 1 : 0
  const wMax = weights.length ? Math.max(...weights) + 1 : 100
  const fMin = fats.length ? Math.min(...fats) - 1 : 0
  const fMax = fats.length ? Math.max(...fats) + 1 : 40

  const yWeight = w => padT + plotH - ((w - wMin) / (wMax - wMin || 1)) * plotH
  const yFat = f => padT + plotH - ((f - fMin) / (fMax - fMin || 1)) * plotH

  const wPts = data.map((d, i) => d.weight != null ? [xFor(i), yWeight(d.weight)] : null).filter(Boolean)
  const fPts = data.map((d, i) => d.body_fat != null ? [xFor(i), yFat(d.body_fat)] : null).filter(Boolean)
  const toPath = pts => pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')

  const fmtDate = d => new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
  const labelStep = Math.ceil(n / 6)

  return (
    <div className={styles.wrapper}>
      <div className={styles.legend}>
        <span className={styles.legendItem}><span className={styles.dotW} /> Weight (kg)</span>
        <span className={styles.legendItem}><span className={styles.dotF} /> Body fat (%)</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg} preserveAspectRatio="xMidYMid meet">
        {[0, 0.5, 1].map((t, i) => (
          <line key={i} x1={padL} x2={W - padR} y1={padT + t * plotH} y2={padT + t * plotH}
            stroke="var(--border)" strokeWidth="1" strokeDasharray="2 4" />
        ))}
        {weights.length > 0 && [wMin, (wMin + wMax) / 2, wMax].map((w, i) => (
          <text key={i} x={padL - 6} y={yWeight(w) + 3} textAnchor="end" className={styles.axisW}>{w.toFixed(0)}</text>
        ))}
        {fats.length > 0 && [fMin, (fMin + fMax) / 2, fMax].map((f, i) => (
          <text key={i} x={W - padR + 6} y={yFat(f) + 3} textAnchor="start" className={styles.axisF}>{f.toFixed(0)}</text>
        ))}
        {data.map((d, i) => (i % labelStep === 0 || i === n - 1) && (
          <text key={i} x={xFor(i)} y={H - 8} textAnchor="middle" className={styles.dateLabel}>{fmtDate(d)}</text>
        ))}
        <path d={toPath(wPts)} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
        {data.map((d, i) => d.weight != null && <circle key={`w${i}`} cx={xFor(i)} cy={yWeight(d.weight)} r="3" fill="var(--accent)" />)}
        <path d={toPath(fPts)} fill="none" stroke="var(--green)" strokeWidth="2" strokeLinejoin="round" strokeDasharray="4 3" />
        {data.map((d, i) => d.body_fat != null && <circle key={`f${i}`} cx={xFor(i)} cy={yFat(d.body_fat)} r="3" fill="var(--green)" />)}
      </svg>
    </div>
  )
}
