// src/components/Nutrition.jsx
import { useState, useEffect } from 'react'
import { callClaude, parseJSON } from '../lib/claude'
import BodyTrendChart from './BodyTrendChart'
import styles from './Nutrition.module.css'

const GOALS = ['cut', 'maintain', 'bulk']
const TODAY = new Date().toISOString().split('T')[0]

export default function Nutrition({ bodyLogs, meals, settings, onAddBodyLog, onAddMeal, onDeleteMeal, onUpdateSetting }) {
  const [showBodyForm, setShowBodyForm] = useState(false)
  const [weight, setWeight] = useState('')
  const [bodyFat, setBodyFat] = useState('')

  const [showMealForm, setShowMealForm] = useState(false)
  const [mealFields, setMealFields] = useState({ name: '', calories: '', carbs: '', protein: '', fat: '' })

  const [targets, setTargets] = useState(null)
  const [insight, setInsight] = useState(null)
  const [loadingAI, setLoadingAI] = useState(false)

  const goal = settings?.body_goal || 'maintain'
  const latestBody = bodyLogs[0]

  // Today's meals and totals
  const todayMeals = meals.filter(m => m.date === TODAY)
  const todayTotals = todayMeals.reduce((acc, m) => ({
    calories: acc.calories + (m.calories || 0),
    carbs: acc.carbs + (m.carbs || 0),
    protein: acc.protein + (m.protein || 0),
    fat: acc.fat + (m.fat || 0),
  }), { calories: 0, carbs: 0, protein: 0, fat: 0 })

  useEffect(() => {
    if (bodyLogs.length > 0 || meals.length > 0) loadAITargets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal, bodyLogs.length])

  async function loadAITargets() {
    setLoadingAI(true)
    const recentMeals = meals.slice(0, 14).map(m =>
      `${m.date}: ${m.name} (${m.calories}cal, ${m.protein}p/${m.carbs}c/${m.fat}f)`
    ).join('; ')
    const bodyTrend = bodyLogs.slice(0, 10).map(b => `${b.date}: ${b.weight}kg${b.body_fat ? ' ' + b.body_fat + '%bf' : ''}`).join('; ')

    const system = `You are a sports nutritionist and body composition coach. Based on the user's body goal, current stats, and recent diet, provide daily nutrition targets and a concise insight.
Return ONLY a raw JSON object (no markdown) with:
- "targets": { "calories": number, "protein": number, "carbs": number, "fat": number } — daily targets in grams/kcal appropriate for the goal
- "insight": a 2-3 sentence observation about their current diet relative to the goal — be specific and actionable
- "suggestion": one concrete change they could make today`

    const userMsg = `Body goal: ${goal}
Latest body stats: ${latestBody ? `${latestBody.weight}kg, ${latestBody.body_fat || '?'}% body fat` : 'not logged yet'}
Body trend (recent): ${bodyTrend || 'none'}
Recent meals: ${recentMeals || 'none logged'}
Today so far: ${todayTotals.calories}cal, ${todayTotals.protein}g protein, ${todayTotals.carbs}g carbs, ${todayTotals.fat}g fat`

    try {
      const raw = await callClaude({ system, messages: [{ role: 'user', content: userMsg }], maxTokens: 700 })
      const parsed = parseJSON(raw)
      setTargets(parsed.targets)
      setInsight({ insight: parsed.insight, suggestion: parsed.suggestion })
    } catch (e) {
      setTargets({ calories: 2000, protein: 140, carbs: 200, fat: 60 })
      setInsight(null)
    }
    setLoadingAI(false)
  }

  async function saveBody() {
    if (!weight && !bodyFat) return
    await onAddBodyLog({
      date: TODAY,
      weight: weight ? parseFloat(weight) : null,
      bodyFat: bodyFat ? parseFloat(bodyFat) : null,
    })
    setWeight(''); setBodyFat(''); setShowBodyForm(false)
  }

  async function saveMeal() {
    if (!mealFields.name.trim()) return
    await onAddMeal({
      name: mealFields.name.trim(),
      calories: parseFloat(mealFields.calories) || 0,
      carbs: parseFloat(mealFields.carbs) || 0,
      protein: parseFloat(mealFields.protein) || 0,
      fat: parseFloat(mealFields.fat) || 0,
    })
    setMealFields({ name: '', calories: '', carbs: '', protein: '', fat: '' })
    setShowMealForm(false)
  }

  function MacroBar({ label, value, target, color }) {
    const pct = target ? Math.min(100, Math.round((value / target) * 100)) : 0
    return (
      <div className={styles.macroRow}>
        <div className={styles.macroMeta}>
          <span>{label}</span>
          <span className={styles.macroNums}>{Math.round(value)}{target ? ` / ${target}g` : 'g'}</span>
        </div>
        <div className={styles.macroTrack}>
          <div className={styles.macroFill} style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.wrapper}>
      {/* Goal selector */}
      <div className={styles.goalBar}>
        <span className={styles.goalLabel}>Body goal</span>
        <div className={styles.goalbtns}>
          {GOALS.map(g => (
            <button
              key={g}
              className={`${styles.goalBtn} ${goal === g ? styles.goalActive : ''}`}
              onClick={() => onUpdateSetting('body_goal', g)}
            >
              {g === 'cut' ? '🔻 Cut' : g === 'bulk' ? '🔺 Bulk' : '⚖️ Maintain'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Current weight</div>
          <div className={styles.statValue}>{latestBody?.weight ? `${latestBody.weight} kg` : '–'}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Body fat</div>
          <div className={styles.statValue}>{latestBody?.body_fat ? `${latestBody.body_fat}%` : '–'}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Today's calories</div>
          <div className={styles.statValue}>{Math.round(todayTotals.calories)}{targets ? <span className={styles.statTarget}> / {targets.calories}</span> : ''}</div>
        </div>
      </div>

      {/* AI insight */}
      {(insight || loadingAI) && (
        <div className={styles.insightCard}>
          <div className={styles.insightHeader}>
            <span className={styles.cardTitle}>AI Nutrition Coach</span>
            <button className={styles.refreshBtn} onClick={loadAITargets} disabled={loadingAI}>
              {loadingAI ? '…' : '↻'}
            </button>
          </div>
          {loadingAI ? (
            <div className={styles.loading}>Analyzing your diet & goal…</div>
          ) : insight && (
            <>
              <p className={styles.insightText}>{insight.insight}</p>
              {insight.suggestion && (
                <div className={styles.suggestion}>💡 {insight.suggestion}</div>
              )}
            </>
          )}
        </div>
      )}

      <div className={styles.grid2}>
        {/* Body trend chart */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Weight & body fat trend</span>
            <button className={styles.addBtn} onClick={() => setShowBodyForm(s => !s)}>+ Log</button>
          </div>
          {showBodyForm && (
            <div className={styles.bodyForm}>
              <input className={styles.input} type="number" step="0.1" placeholder="Weight (kg)" value={weight} onChange={e => setWeight(e.target.value)} />
              <input className={styles.input} type="number" step="0.1" placeholder="Body fat (%)" value={bodyFat} onChange={e => setBodyFat(e.target.value)} />
              <button className={styles.accentBtn} onClick={saveBody}>Save</button>
            </div>
          )}
          <BodyTrendChart logs={bodyLogs} />
        </div>

        {/* Today's macros */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Today's nutrition</span>
            <button className={styles.addBtn} onClick={() => setShowMealForm(s => !s)}>+ Meal</button>
          </div>
          {showMealForm && (
            <div className={styles.mealForm}>
              <input className={styles.input} placeholder="Meal name" value={mealFields.name} onChange={e => setMealFields(f => ({ ...f, name: e.target.value }))} style={{ width: '100%' }} />
              <div className={styles.mealMacroInputs}>
                <input className={styles.input} type="number" placeholder="cal" value={mealFields.calories} onChange={e => setMealFields(f => ({ ...f, calories: e.target.value }))} />
                <input className={styles.input} type="number" placeholder="protein" value={mealFields.protein} onChange={e => setMealFields(f => ({ ...f, protein: e.target.value }))} />
                <input className={styles.input} type="number" placeholder="carbs" value={mealFields.carbs} onChange={e => setMealFields(f => ({ ...f, carbs: e.target.value }))} />
                <input className={styles.input} type="number" placeholder="fat" value={mealFields.fat} onChange={e => setMealFields(f => ({ ...f, fat: e.target.value }))} />
              </div>
              <button className={styles.accentBtn} onClick={saveMeal}>Add meal</button>
              <p className={styles.hint}>Or use the command bar: "Ate chicken salad, 450 cal, 40g protein"</p>
            </div>
          )}

          <MacroBar label="Protein" value={todayTotals.protein} target={targets?.protein} color="#A78BFA" />
          <MacroBar label="Carbs" value={todayTotals.carbs} target={targets?.carbs} color="#60A5FA" />
          <MacroBar label="Fat" value={todayTotals.fat} target={targets?.fat} color="#FBBF24" />

          <div className={styles.mealList}>
            {todayMeals.length === 0 ? (
              <p className={styles.empty}>No meals logged today.</p>
            ) : todayMeals.map(m => (
              <div key={m.id} className={styles.mealRow}>
                <span className={styles.mealName}>{m.name}</span>
                <span className={styles.mealCal}>{m.calories} cal</span>
                <button className={styles.deleteBtn} onClick={() => onDeleteMeal(m.id)}>×</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
