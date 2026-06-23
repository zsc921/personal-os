// src/components/SleepEnergyChart.jsx
// Dual-line chart: date on X axis, sleep hours (left axis 4-10) and energy 0-100 (right axis 50-100).
// Pure SVG, no chart library needed.

import styles from './SleepEnergyChart.module.css'

const SLEEP_MIN = 4, SLEEP_MAX = 10
const ENERGY_MIN = 50, ENERGY_MAX = 100

export default function SleepEnergyChart({ logs }) {
  // logs come newest-first; reverse to chronological for the timeline
  const data = [...logs].reverse().filter(l => l.sleep_hours != null || l.energy_level != null)

  if (data.length === 0) {
    return <p className={styles.empty}>No logs yet. Try the command bar: "Slept 7.5 hours, energy 80"</p>
  }

  const W = 640, H = 200
  const padL = 36, padR = 40, padT = 16, padB = 32
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  const n = data.length
  const xFor = i => padL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW)

  // Map a value to plot Y, clamping to the axis range
  const ySleep = h => {
    const clamped = Math.max(SLEEP_MIN, Math.min(h, SLEEP_MAX))
    return padT + plotH - ((clamped - SLEEP_MIN) / (SLEEP_MAX - SLEEP_MIN)) * plotH
  }
  const yEnergy = e => {
    const clamped = Math.max(ENERGY_MIN, Math.min(e, ENERGY_MAX))
    return padT + plotH - ((clamped - ENERGY_MIN) / (ENERGY_MAX - ENERGY_MIN)) * plotH
  }

  const sleepPts = data.map((d, i) => d.sleep_hours != null ? [xFor(i), ySleep(d.sleep_hours)] : null).filter(Boolean)
  const energyPts = data.map((d, i) => d.energy_level != null ? [xFor(i), yEnergy(d.energy_level)] : null).filter(Boolean)

  const toPath = pts => pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')

  const fmtDate = d => {
    const date = new Date(d.created_at)
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
  }

  // Show at most ~7 x labels to avoid crowding
  const labelStep = Math.ceil(n / 7)

  // Axis tick values
  const sleepTicks = [4, 6, 8, 10]
  const energyTicks = [50, 75, 100]

  return (
    <div className={styles.wrapper}>
      <div className={styles.legend}>
        <span className={styles.legendItem}><span className={styles.dotSleep} /> Sleep (h)</span>
        <span className={styles.legendItem}><span className={styles.dotEnergy} /> Energy (/100)</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg} preserveAspectRatio="xMidYMid meet">
        {/* horizontal gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
          <line key={i}
            x1={padL} x2={W - padR}
            y1={padT + t * plotH} y2={padT + t * plotH}
            stroke="var(--border)" strokeWidth="1" strokeDasharray="2 4" />
        ))}

        {/* left axis labels (sleep hrs) */}
        {sleepTicks.map((h, i) => (
          <text key={i} x={padL - 6} y={ySleep(h) + 3} textAnchor="end" className={styles.axisLabel}>{h}</text>
        ))}
        {/* right axis labels (energy) */}
        {energyTicks.map((e, i) => (
          <text key={i} x={W - padR + 6} y={yEnergy(e) + 3} textAnchor="start" className={styles.axisLabelEnergy}>{e}</text>
        ))}

        {/* x date labels */}
        {data.map((d, i) => (i % labelStep === 0 || i === n - 1) && (
          <text key={i} x={xFor(i)} y={H - 10} textAnchor="middle" className={styles.dateLabel}>{fmtDate(d)}</text>
        ))}

        {/* sleep line + dots */}
        <path d={toPath(sleepPts)} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
        {data.map((d, i) => d.sleep_hours != null && (
          <circle key={`s${i}`} cx={xFor(i)} cy={ySleep(d.sleep_hours)} r="3" fill="var(--accent)" />
        ))}

        {/* energy line + dots */}
        <path d={toPath(energyPts)} fill="none" stroke="var(--amber)" strokeWidth="2" strokeLinejoin="round" strokeDasharray="4 3" />
        {data.map((d, i) => d.energy_level != null && (
          <circle key={`e${i}`} cx={xFor(i)} cy={yEnergy(d.energy_level)} r="3" fill="var(--amber)" />
        ))}
      </svg>
    </div>
  )
}
