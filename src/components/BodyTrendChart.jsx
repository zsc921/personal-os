// src/components/BodyTrendChart.jsx
// Dual-line: date on X, weight (left axis kg) and body fat (right axis %).

import styles from './BodyTrendChart.module.css'

export default function BodyTrendChart({ logs, goal = 'maintain' }) {
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
      <div className={styles.metricStrip}>
        {(() => {
          const withW = data.filter(d => d.weight != null)
          const withF = data.filter(d => d.body_fat != null)
          const latestW = withW.length ? withW[withW.length - 1].weight : null
          const prevW = withW.length > 1 ? withW[withW.length - 2].weight : null
          const latestF = withF.length ? withF[withF.length - 1].body_fat : null
          const prevF = withF.length > 1 ? withF[withF.length - 2].body_fat : null
          const dW = (latestW != null && prevW != null) ? latestW - prevW : null
          const dF = (latestF != null && prevF != null) ? latestF - prevF : null

          // Goal direction: cut = down is good, bulk = up is good, maintain = flat is good
          const goalDir = goal === 'cut' ? -1 : goal === 'bulk' ? 1 : 0
          function goodness(delta) {
            if (delta == null || goalDir === 0) return 'neutral'
            return Math.sign(delta) === goalDir ? 'good' : 'bad'
          }
          const fmtDelta = (d, unit) => d == null ? '—' : `${d > 0 ? '+' : ''}${d.toFixed(1)}${unit}`

          return (
            <>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Weight</span>
                <span className={styles.metricValue}>{latestW != null ? `${latestW} kg` : '—'}</span>
                <span className={`${styles.metricDelta} ${styles[goodness(dW)]}`}>{fmtDelta(dW, ' kg')}</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Body fat</span>
                <span className={styles.metricValue}>{latestF != null ? `${latestF}%` : '—'}</span>
                <span className={`${styles.metricDelta} ${styles[goodness(dF)]}`}>{fmtDelta(dF, '%')}</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Goal</span>
                <span className={styles.metricValue}>{goal === 'cut' ? 'Cut' : goal === 'bulk' ? 'Bulk' : 'Maintain'}</span>
                <span className={`${styles.metricDelta} ${styles[goodness(dW)]}`}>
                  {dW == null ? 'need 2 logs' : goodness(dW) === 'good' ? 'on track' : goodness(dW) === 'bad' ? 'off track' : 'steady'}
                </span>
              </div>
            </>
          )
        })()}
      </div>

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
