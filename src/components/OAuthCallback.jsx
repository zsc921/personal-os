// src/components/OAuthCallback.jsx
// Handles the redirect back from Google after the user approves access.
// Exchanges the auth code for tokens, then sends the user back to the dashboard.

import { useEffect, useState } from 'react'
import { exchangeCodeForTokens } from '../lib/googleCalendar'

export default function OAuthCallback() {
  const [status, setStatus] = useState('Connecting your Google account…')
  const [error, setError] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const errorParam = params.get('error')

    if (errorParam) {
      setError('Google sign-in was cancelled or denied.')
      return
    }
    if (!code) {
      setError('No authorization code received from Google.')
      return
    }

    exchangeCodeForTokens(code)
      .then(account => {
        setStatus(`Connected ${account.email}! Redirecting…`)
        setTimeout(() => { window.location.href = '/' }, 1200)
      })
      .catch(err => {
        console.error(err)
        setError('Failed to connect your Google account. Check your OAuth setup in Vercel env variables.')
      })
  }, [])

  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0E0E11', color: '#F4F4F5', fontFamily: 'Inter, sans-serif', fontSize: 14,
    }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        {error ? (
          <>
            <div style={{ color: '#F87171', marginBottom: 12 }}>⚠ {error}</div>
            <a href="/" style={{ color: '#A78BFA' }}>← Back to dashboard</a>
          </>
        ) : (
          <div>{status}</div>
        )}
      </div>
    </div>
  )
}
