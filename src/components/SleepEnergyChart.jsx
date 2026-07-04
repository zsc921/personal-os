// src/components/SleepEnergyChart.jsx
// Three-metric chart, decluttered: smooth curves, endpoint dots only, soft grid.
// Sleep hours on left axis (4-10); sleep score + energy share the right axis (50-100).

import styles from './SleepEnergyChart.module.css'

const SLEEP_MIN = 4, SLEEP_MAX = 10
const SCORE_MIN = 50, SCORE_MAX = 100

// Catmull-Rom -> cubic bezier for a smooth line through all points
function smoothPath(pts) {
  if (pts.length === 0) return ''
  if (pts.length === 1) return `M ${pts[0][0]} ${pts[0][1]}`
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
  }
  return d
}

export default function SleepEnergyChart({ logs }) {
  const data = [...logs].reverse().filter(l =>
    l.sleep_hours != null || l.energy_level != null || l.sleep_score != null
  )

  if (data.length === 0) {
    return <p className={styles.empty}>No logs yet. Try the command bar: "Slept 7.5h, sleep score 84, energy 80"</p>
  }

  const W = 640, H = 220
  const padL = 34, padR = 38, padT = 18, padB = 30
  const plotW = W - padL - padR
  const plotH = H - padT - padB
  const n = data.length
  const xFor = i => padL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW)

  const ySleep = h => padT + plotH - ((Math.max(SLEEP_MIN, Math.min(h, SLEEP_MAX)) - SLEEP_MIN) / (SLEEP_MAX - SLEEP_MIN)) * plotH
  const yScore = e => padT + plotH - ((Math.max(SCORE_MIN, Math.min(e, SCORE_MAX)) - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * plotH

  const series = [
    { key: 'sleep_hours',  yFn: ySleep, color: 'var(--accent)', dash: null,   label: 'Sleep (h)' },
    { key: 'sleep_score',  yFn: yScore, color: 'var(--blue)',   dash: null,   label: 'Sleep score' },
    { key: 'energy_level', yFn: yScore, color: 'var(--amber)',  dash: '5 4',  label: 'Energy' },
  ].map(s => {
    const pts = data.map((d, i) => d[s.key] != null ? [xFor(i), s.yFn(d[s.key]), d[s.key]] : null).filter(Boolean)
    return { ...s, pts }
  })

  const fmtDate = d => new Date(d.created_at).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
  const labelStep = Math.ceil(n / 6)

  return (
    <div className={styles.wrapper}>
      <div className={styles.legend}>
        {series.map(s => (
          <span key={s.key} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: s.color }} /> {s.label}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg} preserveAspectRatio="xMidYMid meet">
        {/* Two soft gridlines only */}
        {[0.25, 0.75].map((t, i) => (
          <line key={i} x1={padL} x2={W - padR} y1={padT + t * plotH} y2={padT + t * plotH}
            stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        ))}

        {/* Minimal axis labels — extremes only */}
        <text x={padL - 6} y={ySleep(SLEEP_MAX) + 3} textAnchor="end" className={styles.axisLabel}>{SLEEP_MAX}</text>
        <text x={padL - 6} y={ySleep(SLEEP_MIN) + 3} textAnchor="end" className={styles.axisLabel}>{SLEEP_MIN}</text>
        <text x={W - padR + 6} y={yScore(SCORE_MAX) + 3} textAnchor="start" className={styles.axisLabelEnergy}>{SCORE_MAX}</text>
        <text x={W - padR + 6} y={yScore(SCORE_MIN) + 3} textAnchor="start" className={styles.axisLabelEnergy}>{SCORE_MIN}</text>

        {data.map((d, i) => (i % labelStep === 0 || i === n - 1) && (
          <text key={i} x={xFor(i)} y={H - 8} textAnchor="middle" className={styles.dateLabel}>{fmtDate(d)}</text>
        ))}

        {series.map(s => s.pts.length > 0 && (
          <g key={s.key}>
            <path d={smoothPath(s.pts.map(p => [p[0], p[1]]))} fill="none" stroke={s.color}
              strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
              strokeDasharray={s.dash || undefined} opacity="0.9" />
            {/* Endpoint dot + value only */}
            <circle cx={s.pts[s.pts.length - 1][0]} cy={s.pts[s.pts.length - 1][1]} r="3.5" fill={s.color} />
            <text x={s.pts[s.pts.length - 1][0]} y={s.pts[s.pts.length - 1][1] - 8}
              textAnchor="middle" className={styles.endLabel} fill={s.color}>
              {s.pts[s.pts.length - 1][2]}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
