// src/components/Journal.jsx
// Typing-first journal with: data-aware daily prompt, voice capture with AI
// transcript refinement, mood quadrant tagging, and day-grouped entry blurbs.

import { useState, useRef, useEffect } from 'react'
import { callClaude, parseJSON } from '../lib/claude'
import MoodGrid, { nearestEmotion } from './MoodGrid'
import styles from './Journal.module.css'

export default function Journal({ journalEntries, onAddEntry, onUpdateEntry, onDeleteEntry, dataSnapshot }) {
  const [text, setText] = useState('')
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [refining, setRefining] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [saving, setSaving] = useState(false)
  const [mood, setMood] = useState(null)
  const [showMood, setShowMood] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [expandedIds, setExpandedIds] = useState(new Set())
  const [prompt, setPrompt] = useState(null)
  const [promptLoading, setPromptLoading] = useState(false)

  const timerRef = useRef(null)
  const recognitionRef = useRef(null)
  const rawTranscriptRef = useRef('')

  // ── Data-aware daily prompt (cached per day in localStorage) ──────────────
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    const cached = localStorage.getItem('journal_prompt')
    if (cached) {
      try {
        const { date, question } = JSON.parse(cached)
        if (date === today && question) { setPrompt(question); return }
      } catch {}
    }
    loadPrompt(today)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadPrompt(today) {
    setPromptLoading(true)
    try {
      const raw = await callClaude({
        system: `You pick ONE short journal prompt (a single question, under 20 words) for the user, personalized to their recent data. Prompts should be concrete and answerable in 2-5 minutes, not abstract soul-searching. Categories to draw from: daily reflection ("Describe today in three words", "What's taking up most of my mental energy?"), gratitude ("What simple pleasure did I overlook today?"), goal-connected ("What's one thing tomorrow-me will thank me for?", "What am I avoiding, and why?"), energy-aware ("When did I feel most energized today, and what was I doing?"). Pick or adapt based on what stands out in their data: low energy -> energy prompt; broken habit streak -> avoidance prompt; heavy spending -> values check; negative recent moods -> gentle gratitude; all normal -> daily reflection. Return ONLY a raw JSON object: {"question": "..."}`,
        messages: [{ role: 'user', content: `My recent data: ${JSON.stringify(dataSnapshot || {})}. Today is ${today}.` }],
        maxTokens: 200,
      })
      const parsed = parseJSON(raw)
      if (parsed.question) {
        setPrompt(parsed.question)
        localStorage.setItem('journal_prompt', JSON.stringify({ date: today, question: parsed.question }))
      }
    } catch {
      setPrompt("Describe today in three words — then explain one of them.")
    }
    setPromptLoading(false)
  }

  // ── Voice capture ──────────────────────────────────────────────────────────
  function startRecording() {
    setRecording(true)
    setSeconds(0)
    rawTranscriptRef.current = ''
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition
      const rec = new SR()
      rec.continuous = true
      rec.interimResults = true
      rec.onresult = e => {
        const t = Array.from(e.results).map(r => r[0].transcript).join(' ')
        rawTranscriptRef.current = t
        setText(prev => prev) // keep typing intact; raw goes in on stop
      }
      rec.start()
      recognitionRef.current = rec
    }
  }

  async function stopRecording() {
    setRecording(false)
    clearInterval(timerRef.current)
    if (recognitionRef.current) recognitionRef.current.stop()

    const raw = rawTranscriptRef.current.trim()
    if (!raw) return

    // Refine the raw transcript into clean prose before inserting
    setRefining(true)
    try {
      const refined = await callClaude({
        system: 'You clean up raw voice-to-text journal transcripts. Rewrite into clear, concise first-person prose: remove filler words, repetitions, and false starts; fix grammar; keep ALL meaning, specific details, and the writer\'s tone. Do not add anything new. Return ONLY the cleaned text, no preamble.',
        messages: [{ role: 'user', content: raw }],
        maxTokens: 1000,
      })
      setText(prev => prev ? prev + '\n\n' + refined.trim() : refined.trim())
    } catch {
      setText(prev => prev ? prev + '\n\n' + raw : raw)
    }
    setRefining(false)
  }

  function toggleRecord() { recording ? stopRecording() : startRecording() }

  // ── Analyze + save ─────────────────────────────────────────────────────────
  async function analyze() {
    if (!text.trim()) return
    setAnalyzing(true)
    try {
      const raw = await callClaude({
        system: 'You analyze journal entries. Return ONLY a raw JSON object (no markdown) with: "summary" (1 sentence), "actions" (array of strings, max 3), "insight" (1 motivating observation).',
        messages: [{ role: 'user', content: `Analyze this journal entry: "${text}"` }],
      })
      setAnalysis(parseJSON(raw))
    } catch {
      setAnalysis({ summary: 'AI analysis unavailable.', actions: [], insight: '' })
    }
    setAnalyzing(false)
  }

  async function save() {
    if (!text.trim()) return
    setSaving(true)
    await onAddEntry({
      text,
      summary: analysis?.summary || '',
      actions: analysis?.actions || [],
      insight: analysis?.insight || '',
      valence: mood?.valence ?? null,
      arousal: mood?.arousal ?? null,
      mood_label: mood?.label ?? null,
    })
    setText(''); setAnalysis(null); setMood(null); setShowMood(false)
    setSaving(false)
  }

  async function saveEdit(id) {
    if (!editText.trim()) return
    await onUpdateEntry(id, { text: editText.trim() })
    setEditingId(null)
  }

  function toggleExpand(id) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── Group entries by day ───────────────────────────────────────────────────
  const groups = journalEntries.reduce((acc, e) => {
    const day = new Date(e.created_at).toDateString()
    if (!acc[day]) acc[day] = []
    acc[day].push(e)
    return acc
  }, {})

  const fmtTimer = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const blurb = e => e.summary || (e.text.length > 140 ? e.text.slice(0, 140) + '…' : e.text)

  return (
    <div className={styles.wrapper}>
      {/* Daily prompt */}
      <div className={styles.promptCard}>
        <div className={styles.promptLabel}>Today's prompt</div>
        <div className={styles.promptText}>
          {promptLoading ? 'Thinking of a good question…' : prompt}
        </div>
        {prompt && !promptLoading && (
          <button className={styles.promptUse} onClick={() => setText(t => t || prompt + '\n\n')}>
            Answer this →
          </button>
        )}
      </div>

      {/* Compose — typing first, voice secondary */}
      <div className={styles.card}>
        <textarea
          className={styles.composeBox}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="What's on your mind?"
          rows={5}
        />
        {refining && <div className={styles.refining}>✨ Cleaning up your voice note…</div>}

        <div className={styles.composeBar}>
          <button
            className={`${styles.micBtn} ${recording ? styles.micActive : ''}`}
            onClick={toggleRecord}
            title={recording ? 'Stop recording' : 'Dictate — will be cleaned up automatically'}
          >
            {recording ? `■ ${fmtTimer(seconds)}` : '🎙 Dictate'}
          </button>
          <button className={styles.moodToggle} onClick={() => setShowMood(s => !s)}>
            {mood ? `Mood: ${mood.label}` : '+ Mood'}
          </button>
          <div className={styles.composeSpacer} />
          <button className={styles.ghostBtn} onClick={analyze} disabled={analyzing || !text.trim()}>
            {analyzing ? 'Analyzing…' : 'Analyze'}
          </button>
          <button className={styles.accentBtn} onClick={save} disabled={saving || !text.trim()}>
            {saving ? 'Saving…' : 'Save entry'}
          </button>
        </div>

        {showMood && (
          <div className={styles.moodSection}>
            <MoodGrid value={mood} onChange={setMood} />
          </div>
        )}

        {analysis && (
          <div className={styles.aiBlock}>
            <div className={styles.aiLabel}>AI Analysis</div>
            <div className={styles.aiSummary}>{analysis.summary}</div>
            {analysis.actions?.length > 0 && (
              <div className={styles.aiRow}><span className={styles.aiKey}>Actions · </span>{analysis.actions.join(' · ')}</div>
            )}
            {analysis.insight && (
              <div className={styles.aiRow}><span className={styles.aiKey}>Insight · </span>{analysis.insight}</div>
            )}
          </div>
        )}
      </div>

      {/* Day-grouped past entries */}
      {Object.entries(groups).map(([day, entries]) => (
        <div key={day} className={styles.dayGroup}>
          <div className={styles.dayHeader}>
            {new Date(day).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            <span className={styles.dayCount}>{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span>
          </div>
          {entries.map(e => {
            const expanded = expandedIds.has(e.id)
            const moodLabelToShow = e.mood_label || (e.valence != null && e.arousal != null ? nearestEmotion(e.valence, e.arousal).label : null)
            return (
              <div key={e.id} className={styles.blurbCard} onClick={() => editingId !== e.id && toggleExpand(e.id)}>
                <div className={styles.blurbTop}>
                  <span className={styles.blurbTime}>{new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {moodLabelToShow && (
                    <span className={styles.moodBadge}>
                      <span className={styles.moodDot} style={{ background: `hsl(${((e.valence + 1) / 2) * 120}, 70%, 60%)` }} />
                      {moodLabelToShow}
                    </span>
                  )}
                  <div className={styles.blurbActions} onClick={ev => ev.stopPropagation()}>
                    <button className={styles.editBtn} onClick={() => { setEditingId(e.id); setEditText(e.text); setExpandedIds(prev => new Set(prev).add(e.id)) }}>✎</button>
                    <button className={styles.deleteBtn} onClick={() => onDeleteEntry(e.id)}>×</button>
                  </div>
                </div>

                {editingId === e.id ? (
                  <div className={styles.editBlock} onClick={ev => ev.stopPropagation()}>
                    <textarea className={styles.editTextarea} value={editText} onChange={ev => setEditText(ev.target.value)} rows={4} autoFocus />
                    <div className={styles.editBtns}>
                      <button className={styles.accentBtn} onClick={() => saveEdit(e.id)}>Save</button>
                      <button className={styles.ghostBtn} onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  </div>
                ) : expanded ? (
                  <>
                    <p className={styles.entryText}>{e.text}</p>
                    {e.summary && (
                      <div className={styles.aiBlock}>
                        <div className={styles.aiLabel}>AI Summary</div>
                        <div className={styles.aiSummary}>{e.summary}</div>
                        {e.actions?.length > 0 && <div className={styles.aiRow}><span className={styles.aiKey}>Actions · </span>{e.actions.join(' · ')}</div>}
                        {e.insight && <div className={styles.aiRow}><span className={styles.aiKey}>Insight · </span>{e.insight}</div>}
                      </div>
                    )}
                  </>
                ) : (
                  <p className={styles.blurbText}>{blurb(e)}</p>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
