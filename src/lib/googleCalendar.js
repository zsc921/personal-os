// src/lib/googleCalendar.js
// Handles Google OAuth login (multiple accounts) and pulling events from
// each connected account's calendars. Tokens are stored in Supabase so they
// sync across devices like everything else in this app.

import { supabase } from './supabase'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly profile email'

// ── Step 1: Kick off OAuth login for a new Google account ──────────────────
export function startGoogleLogin() {
  const redirectUri = `${window.location.origin}/oauth/callback`
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent select_account',
  })
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

// ── Step 2: Exchange the auth code (from redirect) for tokens ──────────────
export async function exchangeCodeForTokens(code) {
  const res = await fetch('/api/google-auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  if (!res.ok) throw new Error('Failed to exchange Google auth code')
  const tokens = await res.json()

  // Fetch basic profile info to label this account
  const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  const profile = await profileRes.json()

  // Persist this connected account in Supabase
  const { data, error } = await supabase
    .from('google_accounts')
    .insert({
      email: profile.email,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    })
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Refresh an account's access token if expired ────────────────────────────
async function refreshAccessToken(account) {
  const res = await fetch('/api/google-auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grant_type: 'refresh_token', refresh_token: account.refresh_token }),
  })
  if (!res.ok) throw new Error(`Failed to refresh token for ${account.email}`)
  const tokens = await res.json()

  const newExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
  await supabase
    .from('google_accounts')
    .update({ access_token: tokens.access_token, expires_at: newExpiry })
    .eq('id', account.id)

  return { ...account, access_token: tokens.access_token, expires_at: newExpiry }
}

function isExpired(account) {
  return new Date(account.expires_at).getTime() < Date.now() + 60000 // refresh 1 min early
}

// ── Fetch events from all connected Google accounts for a date range ───────
export async function fetchGoogleEvents(accounts, timeMin, timeMax) {
  const allEvents = []

  for (let account of accounts) {
    try {
      if (isExpired(account)) {
        account = await refreshAccessToken(account)
      }

      // Get list of calendars for this account
      const calRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: { Authorization: `Bearer ${account.access_token}` },
      })
      const calData = await calRes.json()
      const calendars = calData.items || []

      for (const cal of calendars) {
        const eventsRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
          { headers: { Authorization: `Bearer ${account.access_token}` } }
        )
        const eventsData = await eventsRes.json()
        for (const ev of eventsData.items || []) {
          const start = ev.start?.dateTime || ev.start?.date
          if (!start) continue
          allEvents.push({
            id: `g-${ev.id}`,
            source: 'google',
            accountEmail: account.email,
            calendarName: cal.summary,
            date: start.split('T')[0],
            time: ev.start?.dateTime
              ? new Date(ev.start.dateTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
              : 'All day',
            name: ev.summary || '(no title)',
            tag: 'tag-google',
          })
        }
      }
    } catch (err) {
      console.error(`[googleCalendar] Failed to fetch events for ${account.email}:`, err)
    }
  }

  return allEvents
}

export async function getConnectedAccounts() {
  const { data, error } = await supabase.from('google_accounts').select('*')
  if (error) throw error
  return data || []
}

export async function disconnectAccount(accountId) {
  const { error } = await supabase.from('google_accounts').delete().eq('id', accountId)
  if (error) throw error
}
