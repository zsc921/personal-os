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

// Send an image (base64) plus a prompt to Claude vision. Returns parsed text.
export async function callClaudeWithImage({ system, prompt, imageBase64, mediaType, maxTokens = 1500 }) {
  return callClaude({
    system,
    maxTokens,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
        { type: 'text', text: prompt },
      ],
    }],
  })
}

// Parse JSON from Claude response safely (strips markdown fences if present)
export function parseJSON(text) {
  const clean = text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

// Read a File/Blob into base64 (strip the data URL prefix).
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      const comma = result.indexOf(',')
      resolve(result.slice(comma + 1))
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}
