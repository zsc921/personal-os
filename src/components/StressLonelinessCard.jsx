// src/components/StressLonelinessCard.jsx
// Trend of stress & loneliness (0-10) pulled from journal entries over time.

import styles from './StressLonelinessCard.module.css'

export default function StressLonelinessCard({ entries }) {
  const data = [...entries]
    .filter(e => e.stress != null || e.loneliness != null)
    .reverse()
    .slice(-30)

  if (data.length < 2) {
    return <p className={styles.empty}>Rate stress & loneliness on a couple of journal entries to see the trend here.</p>
  }

  const W = 620, H = 180, padL = 24, padR = 16, padT = 16, padB = 26
  const plotW = W - padL - padR, plotH = H - padT - padB
  const n = data.length
  const xFor = i => padL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW)
  const yFor = v => padT + plotH - (v / 10) * plotH

  const line = (key) => {
    const pts = data.map((d, i) => d[key] != null ? [xFor(i), yFor(d[key])] : null).filter(Boolean)
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  }

  const latest = data[data.length - 1]
  const avg = (key) => {
    const vals = data.map(d => d[key]).filter(v => v != null)
    return vals.length ? (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1) : '—'
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.legend}>
        <span className={styles.legendItem}><span className={styles.dot} style={{ background: 'var(--amber)' }} /> Stress · now {latest.stress ?? '—'}, avg {avg('stress')}</span>
        <span className={styles.legendItem}><span className={styles.dot} style={{ background: 'var(--blue)' }} /> Loneliness · now {latest.loneliness ?? '—'}, avg {avg('loneliness')}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg} preserveAspectRatio="xMidYMid meet">
        {[0, 5, 10].map((v, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={yFor(v)} y2={yFor(v)} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <text x={padL - 6} y={yFor(v) + 3} textAnchor="end" className={styles.axisLabel}>{v}</text>
          </g>
        ))}
        <path d={line('stress')} fill="none" stroke="var(--amber)" strokeWidth="2" strokeLinejoin="round" />
        <path d={line('loneliness')} fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinejoin="round" strokeDasharray="4 3" />
        {data.map((d, i) => d.stress != null && <circle key={`s${i}`} cx={xFor(i)} cy={yFor(d.stress)} r="2.5" fill="var(--amber)" />)}
        {data.map((d, i) => d.loneliness != null && <circle key={`l${i}`} cx={xFor(i)} cy={yFor(d.loneliness)} r="2.5" fill="var(--blue)" />)}
      </svg>
    </div>
  )
}
