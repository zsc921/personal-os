// src/components/WeeklyRitual.jsx
// Sunday-evening reflection ritual. Surfaces the current week's framework
// (1 of 4, rotating), lets you answer each question inline, and composes the
// answers into a single journal entry.

import { useState } from 'react'
import { frameworkForDate, isSunday, isRitualTime, daysUntilSunday } from '../lib/weeklyFramework'
import styles from './WeeklyRitual.module.css'

export default function WeeklyRitual({ onComposeIntoJournal }) {
  const fw = frameworkForDate()
  const sunday = isSunday()
  const ritualNow = isRitualTime()
  const daysAway = daysUntilSunday()

  const [open, setOpen] = useState(ritualNow)
  const [answers, setAnswers] = useState(fw.questions.map(() => ''))

  const answered = answers.filter(a => a.trim()).length
  const allBlank = answered === 0

  function setAnswer(i, val) {
    setAnswers(prev => prev.map((a, idx) => idx === i ? val : a))
  }

  // Build a readable markdown-ish entry from whatever's been answered
  function compose() {
    const lines = [`## Week ${fw.week} — ${fw.title} (${fw.subtitle})`, '']
    fw.questions.forEach((q, i) => {
      if (!answers[i].trim()) return
      lines.push(`**${q}**`)
      lines.push(answers[i].trim())
      lines.push('')
    })
    return lines.join('\n')
  }

  function handleSend() {
    if (allBlank) return
    onComposeIntoJournal(compose())
    setAnswers(fw.questions.map(() => ''))
    setOpen(false)
  }

  return (
    <div className={styles.card} style={{ '--fw-color': fw.color }}>
      <button className={styles.header} onClick={() => setOpen(o => !o)}>
        <div className={styles.headerLeft}>
          <span className={styles.weekBadge}>W{fw.week}</span>
          <div className={styles.titleBlock}>
            <span className={styles.title}>{fw.title}</span>
            <span className={styles.subtitle}>{fw.subtitle} · {fw.minutes} min</span>
          </div>
        </div>
        <div className={styles.headerRight}>
          {ritualNow ? (
            <span className={styles.liveTag}>Tonight</span>
          ) : sunday ? (
            <span className={styles.soonTag}>Today, 5pm+</span>
          ) : (
            <span className={styles.awayTag}>in {daysAway}d</span>
          )}
          <span className={styles.chevron}>{open ? '▾' : '▸'}</span>
        </div>
      </button>

      {open && (
        <div className={styles.body}>
          {fw.questions.map((q, i) => (
            <div key={i} className={styles.qBlock}>
              <label className={styles.question}>
                <span className={styles.qNum}>{i + 1}</span>
                {q}
              </label>
              <textarea
                className={styles.answer}
                value={answers[i]}
                onChange={e => setAnswer(i, e.target.value)}
                rows={2}
                placeholder="…"
              />
            </div>
          ))}
          <div className={styles.actions}>
            <button className={styles.sendBtn} onClick={handleSend} disabled={allBlank}>
              Send to journal ({answered}/{fw.questions.length})
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
