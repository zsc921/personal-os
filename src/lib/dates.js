// src/lib/dates.js
// All "what day is it" logic must go through here.
//
// Why: `new Date().toISOString()` returns UTC. In San Jose (UTC-7 in summer,
// UTC-8 in winter) that means after ~5pm local, toISOString() reports
// TOMORROW's date — so habits, meals, and journal entries silently land on the
// wrong day every evening. These helpers use the browser's local calendar day
// instead, which is what the user actually means by "today".

// 'YYYY-MM-DD' for a Date, in LOCAL time (not UTC).
export function toLocalDateStr(d = new Date()) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Today's local date as 'YYYY-MM-DD'. Call this, don't cache it at module
// scope — a long-lived tab should roll over to the new day correctly.
export function todayStr() {
  return toLocalDateStr(new Date())
}

export function tomorrowStr() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return toLocalDateStr(d)
}

// Parse 'YYYY-MM-DD' into a Date at LOCAL midnight.
// (new Date('2026-07-21') parses as UTC midnight and can render as the
// previous day in negative-offset timezones — this avoids that.)
export function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}
