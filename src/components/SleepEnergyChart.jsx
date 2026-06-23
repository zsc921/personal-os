// src/components/SleepEnergyChart.jsx
// Three-metric chart: date on X axis, sleep hours (left axis 4-10),
// and sleep score + energy together (right axis 50-100).

import styles from './SleepEnergyChart.module.css'

const SLEEP_MIN = 4, SLEEP_MAX = 10
const SCORE_MIN = 50, SCORE_MAX = 100

export default function SleepEnergyChart({ logs }) {
  const data = [...logs].reverse().filter(l =>
    l.sleep_hours != null || l.energy_level != null || l.sleep_score != null
  )

  if (data.length === 0) {
    return <p className={styles.empty}>No logs yet. Try the command bar: "Slept 7.5h, sleep score 84, energy 80"</p>
  }

  const W = 640, H = 220
  const padL = 36, padR = 40, padT = 16, padB = 32
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  const n = data.length
  const xFor = i => padL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW)

  const ySleep = h => {
    const c = Math.max(SLEEP_MIN, Math.min(h, SLEEP_MAX))
    return padT + plotH - ((c - SLEEP_MIN) / (SLEEP_MAX - SLEEP_MIN)) * plotH
  }
  const yScore = e => {
    const c = Math.max(SCORE_MIN, Math.min(e, SCORE_MAX))
    return padT + plotH - ((c - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * plotH
  }

  const sleepPts = data.map((d, i) => d.sleep_hours != null ? [xFor(i), ySleep(d.sleep_hours)] : null).filter(Boolean)
  const scorePts = data.map((d, i) => d.sleep_score != null ? [xFor(i), yScore(d.sleep_score)] : null).filter(Boolean)
  const energyPts = data.map((d, i) => d.energy_level != null ? [xFor(i), yScore(d.energy_level)] : null).filter(Boolean)

  const toPath = pts => pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')

  const fmtDate = d => {
    const date = new Date(d.created_at)
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
  }

  const labelStep = Math.ceil(n / 7)
  const sleepTicks = [4, 6, 8, 10]
  const scoreTicks = [50, 75, 100]

  return (
    <div className={styles.wrapper}>
      <div className={styles.legend}>
        <span className={styles.legendItem}><span className={styles.dotSleep} /> Sleep (h)</span>
        <span className={styles.legendItem}><span className={styles.dotScore} /> Sleep score</span>
        <span className={styles.legendItem}><span className={styles.dotEnergy} /> Energy (/100)</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg} preserveAspectRatio="xMidYMid meet">
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
          <line key={i} x1={padL} x2={W - padR} y1={padT + t * plotH} y2={padT + t * plotH}
            stroke="var(--border)" strokeWidth="1" strokeDasharray="2 4" />
        ))}

        {sleepTicks.map((h, i) => (
          <text key={i} x={padL - 6} y={ySleep(h) + 3} textAnchor="end" className={styles.axisLabel}>{h}</text>
        ))}
        {scoreTicks.map((e, i) => (
          <text key={i} x={W - padR + 6} y={yScore(e) + 3} textAnchor="start" className={styles.axisLabelEnergy}>{e}</text>
        ))}

        {data.map((d, i) => (i % labelStep === 0 || i === n - 1) && (
          <text key={i} x={xFor(i)} y={H - 10} textAnchor="middle" className={styles.dateLabel}>{fmtDate(d)}</text>
        ))}

        {/* Sleep hours — solid purple */}
        <path d={toPath(sleepPts)} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
        {data.map((d, i) => d.sleep_hours != null && (
          <circle key={`s${i}`} cx={xFor(i)} cy={ySleep(d.sleep_hours)} r="3" fill="var(--accent)" />
        ))}

        {/* Sleep score — solid blue */}
        <path d={toPath(scorePts)} fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinejoin="round" />
        {data.map((d, i) => d.sleep_score != null && (
          <circle key={`sc${i}`} cx={xFor(i)} cy={yScore(d.sleep_score)} r="3" fill="var(--blue)" />
        ))}

        {/* Energy — dashed amber */}
        <path d={toPath(energyPts)} fill="none" stroke="var(--amber)" strokeWidth="2" strokeLinejoin="round" strokeDasharray="4 3" />
        {data.map((d, i) => d.energy_level != null && (
          <circle key={`e${i}`} cx={xFor(i)} cy={yScore(d.energy_level)} r="3" fill="var(--amber)" />
        ))}
      </svg>
    </div>
  )
}
