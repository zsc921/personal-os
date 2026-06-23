// src/components/Journal.jsx
import { useState, useRef } from 'react'
import { callClaude, parseJSON } from '../lib/claude'
import MoodGrid, { nearestEmotion } from './MoodGrid'
import styles from './Journal.module.css'

export default function Journal({ journalEntries, onAddEntry, onUpdateEntry, onDeleteEntry }) {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [mood, setMood] = useState(null) // { valence, arousal, label }
  const [typingMode, setTypingMode] = useState(false) // text-input alternative

  const timerRef = useRef(null)
  const recognitionRef = useRef(null)

  function startRecording() {
    setRecording(true)
    setTranscript('')
    setAnalysis(null)
    setSeconds(0)
    setMood(null)
    setTypingMode(false)

    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition
      const rec = new SR()
      rec.continuous = true
      rec.interimResults = true
      rec.onresult = e => {
        const t = Array.from(e.results).map(r => r[0].transcript).join(' ')
        setTranscript(t)
      }
      rec.start()
      recognitionRef.current = rec
    }
  }

  function stopRecording() {
    setRecording(false)
    clearInterval(timerRef.current)
    if (recognitionRef.current) recognitionRef.current.stop()
  }

  function toggleRecord() {
    recording ? stopRecording() : startRecording()
  }

  function startTyping() {
    setTypingMode(true)
    setTranscript('')
    setAnalysis(null)
    setMood(null)
    setSeconds(0)
  }

  async function analyze() {
    if (!transcript.trim()) return
    setAnalyzing(true)
    try {
      const raw = await callClaude({
        system: 'You are a personal assistant analyzing journal entries. Return ONLY a raw JSON object (no markdown, no backticks) with: "summary" (1 sentence), "actions" (array of strings, max 3), "insight" (1 motivating observation about patterns or energy).',
        messages: [{ role: 'user', content: `Analyze this journal entry: "${transcript}"` }],
      })
      setAnalysis(parseJSON(raw))
    } catch (e) {
      setAnalysis({ summary: 'AI analysis unavailable — check your API configuration.', actions: [], insight: '' })
    }
    setAnalyzing(false)
  }

  async function save() {
    if (!transcript.trim()) return
    setSaving(true)
    await onAddEntry({
      text: transcript,
      summary: analysis?.summary || '',
      actions: analysis?.actions || [],
      insight: analysis?.insight || '',
      valence: mood?.valence ?? null,
      arousal: mood?.arousal ?? null,
      mood_label: mood?.label ?? null,
    })
    setTranscript('')
    setAnalysis(null)
    setMood(null)
    setTypingMode(false)
    setSaving(false)
  }

  async function saveEdit(id) {
    if (!editText.trim()) return
    await onUpdateEntry(id, { text: editText.trim() })
    setEditingId(null)
  }

  const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  // Show edit area whenever we have transcript and aren't currently recording
  const showEditArea = (transcript || typingMode) && !recording

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        {!typingMode && !transcript && (
          <div className={styles.recordArea}>
            <button
              className={`${styles.recordBtn} ${recording ? styles.recording : ''}`}
              onClick={toggleRecord}
              aria-label={recording ? 'Stop recording' : 'Start recording'}
            >
              {recording ? '■' : '🎙'}
            </button>
            <div className={styles.recordLabel}>
              {recording ? 'Recording… tap to stop' : 'Tap to record a voice note'}
            </div>
            {recording && <div className={styles.timer}>{fmt(seconds)}</div>}
            {!recording && (
              <button className={styles.typeToggle} onClick={startTyping}>
                or type instead
              </button>
            )}
          </div>
        )}

        {showEditArea && (
          <div className={styles.transcriptArea}>
            <textarea
              className={styles.transcriptBox}
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
              placeholder={typingMode ? "What's on your mind?" : ''}
              rows={5}
              autoFocus={typingMode}
            />
            <div className={styles.moodSection}>
              <MoodGrid value={mood} onChange={setMood} />
            </div>
            <div className={styles.actions}>
              <button className={styles.accentBtn} onClick={analyze} disabled={analyzing || !transcript.trim()}>
                {analyzing ? 'Analyzing…' : 'Analyze with AI'}
              </button>
              <button className={styles.ghostBtn} onClick={save} disabled={saving || !transcript.trim()}>
                {saving ? 'Saving…' : 'Save entry'}
              </button>
              <button className={styles.ghostBtn} onClick={() => { setTranscript(''); setAnalysis(null); setMood(null); setTypingMode(false) }}>
                Discard
              </button>
            </div>

            {analysis && (
              <div className={styles.aiBlock}>
                <div className={styles.aiLabel}>AI Analysis</div>
                <div className={styles.aiSummary}>{analysis.summary}</div>
                {analysis.actions?.length > 0 && (
                  <div className={styles.aiRow}>
                    <span className={styles.aiKey}>Action items · </span>
                    {analysis.actions.join(' · ')}
                  </div>
                )}
                {analysis.insight && (
                  <div className={styles.aiRow}>
                    <span className={styles.aiKey}>Insight · </span>
                    {analysis.insight}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Past entries */}
      {journalEntries.map((e, i) => {
        // Resolve the label for legacy entries that only have valence/arousal
        const moodLabelToShow = e.mood_label || (
          e.valence != null && e.arousal != null ? nearestEmotion(e.valence, e.arousal).label : null
        )
        return (
          <div key={e.id || i} className={styles.entry}>
            <div className={styles.entryHeader}>
              <span>{new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                <span>{new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {editingId !== e.id && (
                  <>
                    <button className={styles.editBtn} onClick={() => { setEditingId(e.id); setEditText(e.text) }} title="Edit entry">✎</button>
                    <button className={styles.deleteBtn} onClick={() => onDeleteEntry(e.id)} title="Delete entry">×</button>
                  </>
                )}
              </div>
            </div>
            {editingId === e.id ? (
              <div className={styles.editBlock}>
                <textarea
                  className={styles.editTextarea}
                  value={editText}
                  onChange={ev => setEditText(ev.target.value)}
                  rows={4}
                  autoFocus
                />
                <div className={styles.editBtns}>
                  <button className={styles.accentBtn} onClick={() => saveEdit(e.id)}>Save</button>
                  <button className={styles.ghostBtn} onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <p className={styles.entryText}>{e.text}</p>
            )}
            {moodLabelToShow && (
              <div className={styles.moodBadge}>
                <span className={styles.moodDot} style={{
                  background: `hsl(${((e.valence + 1) / 2) * 120}, 70%, 60%)`
                }} />
                {moodLabelToShow}
              </div>
            )}
            {e.summary && (
              <div className={styles.aiBlock}>
                <div className={styles.aiLabel}>AI Summary</div>
                <div className={styles.aiSummary}>{e.summary}</div>
                {e.actions?.length > 0 && (
                  <div className={styles.aiRow}><span className={styles.aiKey}>Actions · </span>{e.actions.join(' · ')}</div>
                )}
                {e.insight && (
                  <div className={styles.aiRow}><span className={styles.aiKey}>Insight · </span>{e.insight}</div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
