// src/components/Journal.jsx
import { useState, useRef } from 'react'
import { callClaude, parseJSON } from '../lib/claude'
import MoodGrid, { moodLabel } from './MoodGrid'
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
  const [valence, setValence] = useState(0)
  const [arousal, setArousal] = useState(0)

  const timerRef = useRef(null)
  const recognitionRef = useRef(null)

  function startRecording() {
    setRecording(true)
    setTranscript('')
    setAnalysis(null)
    setSeconds(0)
    setValence(0)
    setArousal(0)

    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)

    // Use Web Speech API if available, otherwise simulate
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
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    // Fallback placeholder if no transcript captured
    setTranscript(t => t || "Feeling pretty good today. Had a great morning workout and the team meeting went well. I want to make sure I prep for the quarterly review next week and also reach out to Sarah about the collaboration idea. Overall energy is high — I think the sleep schedule change is working.")
  }

  function toggleRecord() {
    recording ? stopRecording() : startRecording()
  }

  async function analyze() {
    if (!transcript.trim()) return
    setAnalyzing(true)
    try {
      const raw = await callClaude({
        system: 'You are a personal assistant analyzing voice journal entries. Return ONLY a raw JSON object (no markdown, no backticks) with: "summary" (1 sentence), "actions" (array of strings, max 3), "insight" (1 motivating observation about patterns or energy).',
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
      valence,
      arousal,
    })
    setTranscript('')
    setAnalysis(null)
    setValence(0)
    setArousal(0)
    setSaving(false)
  }

  async function saveEdit(id) {
    if (!editText.trim()) return
    await onUpdateEntry(id, { text: editText.trim() })
    setEditingId(null)
  }

  const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
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
        </div>

        {transcript && !recording && (
          <div className={styles.transcriptArea}>
            <textarea
              className={styles.transcriptBox}
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
              rows={4}
            />
            <div className={styles.moodSection}>
              <div className={styles.moodLabel}>How are you feeling?</div>
              <MoodGrid valence={valence} arousal={arousal} onChange={(v, a) => { setValence(v); setArousal(a) }} />
            </div>
            <div className={styles.actions}>
              <button className={styles.accentBtn} onClick={analyze} disabled={analyzing}>
                {analyzing ? 'Analyzing…' : 'Analyze with AI'}
              </button>
              <button className={styles.ghostBtn} onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save entry'}
              </button>
              <button className={styles.ghostBtn} onClick={() => { setTranscript(''); setAnalysis(null) }}>
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
      {journalEntries.map((e, i) => (
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
          {(e.valence !== undefined && e.valence !== null) && (
            <div className={styles.moodBadge}>
              <span className={styles.moodDot} style={{
                background: `hsl(${((e.valence + 1) / 2) * 120}, 70%, 60%)`
              }} />
              {moodLabel(e.valence, e.arousal || 0)}
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
      ))}
    </div>
  )
}
