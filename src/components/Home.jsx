// src/components/Home.jsx
import { useState, useEffect } from 'react'
import { callClaude, parseJSON } from '../lib/claude'
import SleepEnergyChart from './SleepEnergyChart'
import styles from './Home.module.css'

const TODAY = new Date().toISOString().split('T')[0]
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function Home({ data, onTabChange, onHabitToggle }) {
  const [priorities, setPriorities] = useState(null)
  const [briefLoading, setBriefLoading] = useState(true)

  useEffect(() => {
    if (!data.loading) loadBriefing()
  }, [data.loading])

  async function loadBriefing() {
    setBriefLoading(true)
    const overBudget = data.budgets.filter(b => b.spent > b.budget).map(b => b.cat)
    const habitStatus = data.habits.map(h =>
      `${h.name} (${h.streak}d streak, ${h.doneToday ? 'done' : 'NOT done'} today)`
    ).join(', ')

    const system = `You are a strategic personal consultant reviewing someone's life dashboard each morning.
Act as a highly perceptive advisor who synthesizes across all life domains — health, finances, time, personal growth.
Return ONLY a raw JSON array (no markdown, no backticks) of exactly 4 priority objects, each with:
- "action": a specific, concrete action (max 10 words)
- "why": the strategic reason (1-2 insightful sentences — surface tensions or leverage points)
- "module": one of "habit", "finance", "calendar", "journal"
- "urgency": "high", "medium", or "low"`

    const userMsg = `Dashboard snapshot for ${new Date().toDateString()}:
Habits: ${habitStatus || 'none'}
Spending: $${data.totalSpent} of $${data.totalBudget} total budget. Over-budget: ${overBudget.join(', ') || 'none'}
Budget breakdown: ${data.budgets.map(b => `${b.cat} $${b.spent}/$${b.budget}`).join(', ')}
Today's events: ${(data.events[TODAY] || []).map(e => `${e.time} ${e.name}`).join(', ') || 'none'}
Journal entries this month: ${data.journalEntries.length}
Last journal insight: "${data.journalEntries[0]?.insight || 'none'}"
Latest sleep/energy log: ${data.wellnessLogs[0] ? `${data.wellnessLogs[0].sleep_hours ? data.wellnessLogs[0].sleep_hours + 'h sleep' : ''} ${data.wellnessLogs[0].sleep_score ? 'score ' + data.wellnessLogs[0].sleep_score : ''} ${data.wellnessLogs[0].energy_level ? 'energy ' + data.wellnessLogs[0].energy_level + '/100' : ''}`.trim() : 'none logged'}`

    try {
      const raw = await callClaude({ system, messages: [{ role: 'user', content: userMsg }] })
      setPriorities(parseJSON(raw))
    } catch {
      setPriorities(FALLBACK_PRIORITIES)
    } finally {
      setBriefLoading(false)
    }
  }

  const todayEvents = data.events[TODAY] || []

  return (
    <div className={styles.home}>
      {/* Morning briefing */}
      <div className={styles.briefCard}>
        <div className={styles.briefHeader}>
          <div>
            <div className={styles.cardTitle}>AI Morning Briefing</div>
            <div className={styles.briefSub}>Your top priorities for today</div>
          </div>
          <button className={styles.refreshBtn} onClick={loadBriefing} disabled={briefLoading}>
            {briefLoading ? '…' : '↻ Refresh'}
          </button>
        </div>
        <div className={styles.briefBody}>
          {briefLoading ? (
            <div className={styles.briefLoading}>
              <span className={styles.pulseDot} />
              Analyzing your dashboard…
            </div>
          ) : (
            <div className={styles.priorities}>
              {(priorities || []).map((p, i) => (
                <div key={i} className={styles.priorityItem}>
                  <div className={styles.priorityNum}>{i + 1}</div>
                  <div className={styles.priorityBody}>
                    <div className={styles.priorityAction}>{p.action}</div>
                    <div className={styles.priorityWhy}>{p.why}</div>
                    <div className={styles.priorityMeta}>
                      <span className={`${styles.tag} ${styles[`tag_${p.module}`]}`}>{p.module}</span>
                      <span className={`${styles.urgency} ${styles[`urgency_${p.urgency}`]}`}>{p.urgency}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Best streak</div>
          <div className={styles.statValue}>{data.maxStreak}</div>
          <div className={`${styles.statSub} ${styles.up}`}>↑ days</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Monthly spend</div>
          <div className={styles.statValue}>${data.totalSpent.toLocaleString()}</div>
          <div className={`${styles.statSub} ${data.totalSpent > data.totalBudget ? styles.down : styles.up}`}>
            {data.totalSpent > data.totalBudget ? `↑ $${(data.totalSpent - data.totalBudget).toLocaleString()} over` : `↓ $${(data.totalBudget - data.totalSpent).toLocaleString()} under`}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Habits today</div>
          <div className={styles.statValue}>{data.habitsDoneToday}/{data.habits.length}</div>
          <div className={styles.statSub} style={{ color: 'var(--muted)' }}>completed</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Journal entries</div>
          <div className={styles.statValue}>{data.journalEntries.length}</div>
          <div className={styles.statSub} style={{ color: 'var(--muted)' }}>this month</div>
        </div>
      </div>

      {/* Habits + Events */}
      <div className={styles.grid2}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Habits today</span>
            <button className={styles.linkBtn} onClick={() => onTabChange('habits')}>View all →</button>
          </div>
          {data.habits.slice(0, 4).map(h => (
            <div key={h.id} className={styles.habitRow}>
              <span className={styles.habitName}>{h.name}</span>
              <button
                className={`${styles.habitDot} ${h.doneToday ? styles.done : ''}`}
                onClick={() => onHabitToggle(h.id)}
                aria-label={`Toggle ${h.name}`}
              >
                {h.doneToday ? '✓' : ''}
              </button>
              <span className={styles.streak}>🔥 {h.streak}d</span>
            </div>
          ))}
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Today's events</span>
            <button className={styles.linkBtn} onClick={() => onTabChange('calendar')}>Calendar →</button>
          </div>
          {todayEvents.length === 0 ? (
            <p className={styles.empty}>No events today.</p>
          ) : todayEvents.map((e, i) => (
            <div key={i} className={styles.eventRow}>
              <span className={styles.eventTime}>{e.time}</span>
              <div>
                <div className={styles.eventName}>{e.name}</div>
                <span className={`${styles.eventTag} ${styles[e.tag]}`}>{e.tag?.replace('tag-', '')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Wellness */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>Sleep & energy</span>
          <span className={styles.cardSub}>last {Math.min(data.wellnessLogs.length, 14)} days</span>
        </div>
        <SleepEnergyChart logs={data.wellnessLogs.slice(0, 14)} />
      </div>
    </div>
  )
}

const FALLBACK_PRIORITIES = [
  { action: 'Complete your morning meditation', why: "You've maintained a 5-day streak — breaking it now resets compounding momentum. Meditation correlates with your highest-focus days.", module: 'habit', urgency: 'high' },
  { action: 'Review any over-budget categories', why: "Uncategorized or overspent categories are where budgets quietly collapse. Address them before month-end.", module: 'finance', urgency: 'high' },
  { action: 'Check and prep for upcoming events', why: "Proactive prep for calendar items reduces cognitive load on the day and signals respect for your commitments.", module: 'calendar', urgency: 'medium' },
  { action: 'Record a voice journal entry', why: "Consistent reflection is the mechanism that turns experience into self-knowledge. Even 2 minutes compounds over time.", module: 'journal', urgency: 'low' },
]
