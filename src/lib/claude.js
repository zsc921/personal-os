// src/lib/claude.js
// Calls /api/claude (Vercel edge function) which injects the API key server-side.
// Never calls Anthropic directly from the browser — key is never exposed.

export async function callClaude({ system, messages, maxTokens = 1000 }) {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system,
      messages,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `API error ${res.status}`)
  }

  const data = await res.json()
  const text = data.content?.map(c => c.text || '').join('') || ''
  return text
}

// Parse JSON from Claude response safely (strips markdown fences if present)
export function parseJSON(text) {
  const clean = text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}
