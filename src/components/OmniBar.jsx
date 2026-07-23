// src/components/OmniBar.jsx
// The single global input. Sends natural language to Claude, which parses intent
// and returns structured JSON. The result is applied directly to the data layer.

import { useState } from 'react'
import { callClaude, parseJSON } from '../lib/claude'
import { todayStr, tomorrowStr } from '../lib/dates'
import styles from './OmniBar.module.css'

const TODAY = todayStr()
const TOMORROW = tomorrowStr()

export default function OmniBar({ data, onResult, onToast, onTabChange }) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setLoading(true)
    setInput('')

    const snapshot = {
      habits: data.habits.map(h => ({ id: h.id, name: h.name, streak: h.streak })),
      budgets: data.budgets.map(b => ({ cat: b.cat, spent: b.spent, budget: b.budget })),
      recentTransactions: data.transactions.slice(0, 3).map(t => ({ name: t.name, cat: t.cat, amount: t.amount })),
      todayEvents: (data.events[TODAY] || []).map(e => e.name),
      journalCount: data.journalEntries.length,
    }

    const system = `You are an intelligent personal assistant router and data parser. The user has a dashboard with five modules: Finance, Calendar, Habits, Journal, Wellness (sleep/energy).

Your job:
1. Detect the intent of the user's natural language input.
2. Parse all relevant data from it.
3. Return ONLY a raw JSON object (no markdown, no backticks, no explanation) with:
   - "module": one of "finance", "calendar", "habits", "journal", "wellness", "nutrition", "relationships", "unknown"
   - "action": short past-tense description of what you did (e.g. "Logged $15 Food transaction")
   - "data": the parsed payload:
       finance  → { name (string), amount (number), cat ("Food"|"Grocery"|"Transport"|"Shopping"|"Health"|"Home"|"Travel"|"Beauty"|"Sports"|"Utility"|"Other"), icon (emoji) }
       calendar → { date ("YYYY-MM-DD"), time (e.g. "2:00 PM" or "All day"), name (string), tag ("tag-work"|"tag-personal"|"tag-health") }
       habits   → { habitId (number or null if new), name (string), completed (boolean) }
       journal  → { text (string) }
       wellness → { sleepHours (number or null), sleepScore (number 0-100 or null), energyLevel (number 0-100 or null), bedTime ("HH:MM" 24h or null), wakeTime ("HH:MM" 24h or null), note (string or null) }
       nutrition → { kind ("meal"|"body"), name (string, for meals), calories (number), carbs (number), protein (number), fat (number), fiber (number), weight (number kg, for body), bodyFat (number %, for body) }
       relationships → { contactNames (array of strings), energy (number 1-5, default 3 if unclear), depth ("surface"|"real", default "real"), note (string or null) }
   - "toast": a friendly single-sentence confirmation

Wellness examples: "slept 7.5 hours" → sleepHours: 7.5. "energy is 80 today" → energyLevel: 80. "sleep score 82, energy feels low" → sleepScore: 82, energyLevel: 30 (your best estimate from "low" on a 0-100 scale, where 50-100 is normal). Energy is always 0-100, never 1-10. "bed at 11pm, woke 6:30am" → bedTime: "23:00", wakeTime: "06:30". Convert all times to 24h HH:MM.

Nutrition examples: "ate chicken salad, 450 cal, 40g protein, 20g carbs, 15g fat" → kind: meal. "weighed 62kg this morning, body fat 22%" → kind: body, weight: 62, bodyFat: 22. If only some macros are given, estimate the rest reasonably from the food described.

Relationships examples: "hung out with Sarah, felt energized, real talk" → contactNames: ["Sarah"], energy: 5, depth: "real". "grabbed coffee with Mike and Jen, kind of surface level" → contactNames: ["Mike","Jen"], depth: "surface". "saw my sister today, was draining" → contactNames: ["sister"], energy: 1.

Finance category guidance: "Grocery" = supermarket runs or "groceries." "Food" = restaurants, takeout, coffee, delivery. "Home" = rent, furniture, home supplies, repairs. "Travel" = flights, hotels, trips. "Beauty" = skincare, makeup, salon, spa. "Sports" = gym, classes, sports gear, equipment. "Utility" = electricity, water, internet, phone bills. "Health" = doctor, pharmacy, supplements.

Date context: today = ${TODAY}, tomorrow = ${TOMORROW}. For relative dates like "next Monday", calculate the actual date.
Existing habit IDs and names: ${JSON.stringify(snapshot.habits)}`

    try {
      const raw = await callClaude({
        system,
        messages: [{ role: 'user', content: text }],
      })
      const parsed = parseJSON(raw)
      await onResult(parsed)
    } catch (err) {
      onToast('Could not connect to Claude API. Check your Vercel environment variables.', 'error')
      console.error('[OmniBar]', err)
    } finally {
      setLoading(false)
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={`${styles.row} ${loading ? styles.loading : ''}`}>
        <span className={styles.icon} aria-hidden="true">✦</span>
        <input
          className={styles.input}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder='Try "Spent $15 on lunch" · "Slept 7.5 hours" · "Meditated today" · "Feeling overwhelmed"'
          disabled={loading}
          aria-label="AI command input"
        />
        <button className={styles.btn} onClick={send} disabled={loading || !input.trim()}>
          {loading ? 'Routing…' : 'Send'}
        </button>
      </div>
      <p className={styles.hint}>
        Claude detects intent and routes to the right module automatically —{' '}
        <span>no forms, no tab switching</span>
      </p>
    </div>
  )
}
