// src/hooks/useData.js
// Central data hook. All four modules read/write through here.
// Supabase real-time subscriptions keep data in sync across devices instantly.

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const TODAY = new Date().toISOString().split('T')[0]

export function useData() {
  const [habits, setHabits] = useState([])
  const [habitLogs, setHabitLogs] = useState([])
  const [transactions, setTransactions] = useState([])
  const [budgets, setBudgets] = useState([])
  const [events, setEvents] = useState({})
  const [journalEntries, setJournalEntries] = useState([])
  const [wellnessLogs, setWellnessLogs] = useState([])
  const [bodyLogs, setBodyLogs] = useState([])
  const [meals, setMeals] = useState([])
  const [spendingHistory, setSpendingHistory] = useState([])
  const [settings, setSettings] = useState({ usd_cny_rate: 7.1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    loadAll()
    const subs = setupRealtimeSubscriptions()
    return () => subs.forEach(s => supabase.removeChannel(s))
  }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [h, hl, t, b, e, j, w, s, bl, m, sh] = await Promise.all([
        supabase.from('habits').select('*').order('created_at'),
        supabase.from('habit_logs').select('*').order('date', { ascending: false }).limit(400),
        supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('budgets').select('*').order('cat'),
        supabase.from('calendar_events').select('*').order('date').order('time'),
        supabase.from('journal_entries').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('wellness_logs').select('*').order('created_at', { ascending: false }).limit(30),
        supabase.from('app_settings').select('*'),
        supabase.from('body_logs').select('*').order('date', { ascending: false }).limit(60),
        supabase.from('meals').select('*').order('created_at', { ascending: false }).limit(60),
        supabase.from('spending_history').select('*').order('year', { ascending: false }).order('month', { ascending: false }),
      ])
      if (h.error) throw h.error
      if (hl.error) throw hl.error
      if (t.error) throw t.error
      if (b.error) throw b.error
      if (e.error) throw e.error
      if (j.error) throw j.error
      if (w.error) throw w.error
      if (s.error) throw s.error
      if (bl.error) throw bl.error
      if (m.error) throw m.error
      if (sh.error) throw sh.error

      setHabits(h.data || [])
      setHabitLogs(hl.data || [])
      setTransactions(t.data || [])
      setBudgets(b.data || [])
      setEvents(groupEventsByDate(e.data || []))
      setJournalEntries(j.data || [])
      setWellnessLogs(w.data || [])
      setBodyLogs(bl.data || [])
      setMeals(m.data || [])
      setSpendingHistory(sh.data || [])
      const settingsObj = (s.data || []).reduce((acc, row) => {
        acc[row.key] = isNaN(row.value) ? row.value : parseFloat(row.value)
        return acc
      }, { usd_cny_rate: 7.1 })
      setSettings(settingsObj)
    } catch (err) {
      setError(err.message)
      console.error('[useData] Load error:', err)
      loadFallbackData()
    } finally {
      setLoading(false)
    }
  }

  // ── Real-time subscriptions ───────────────────────────────────────────────
  function setupRealtimeSubscriptions() {
    const tables = ['habits', 'habit_logs', 'transactions', 'budgets', 'calendar_events', 'journal_entries', 'wellness_logs', 'body_logs', 'meals']
    return tables.map(table =>
      supabase
        .channel(`realtime:${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => loadAll())
        .subscribe()
    )
  }

  function groupEventsByDate(rows) {
    return rows.reduce((acc, row) => {
      if (!acc[row.date]) acc[row.date] = []
      acc[row.date].push(row)
      return acc
    }, {})
  }

  // Build a quick lookup: habitId -> Set of completed date strings ('YYYY-MM-DD')
  function buildCompletionMap(logs) {    const map = {}
    logs.forEach(l => {
      if (!map[l.habit_id]) map[l.habit_id] = new Set()
      if (l.completed) map[l.habit_id].add(l.date)
    })
    return map
  }

  function dateStr(d) { return d.toISOString().split('T')[0] }

  // True consecutive-day streak ending today (or yesterday, if today not yet done),
  // walking backward through real calendar dates rather than a fixed weekly array.
  function computeStreakFromLogs(habitId, logs) {
    const completionMap = buildCompletionMap(logs)
    const doneDates = completionMap[habitId] || new Set()
    let streak = 0
    let cursor = new Date()
    // If today isn't done yet, start counting from yesterday so an unbroken
    // streak doesn't appear to reset to 0 before the day is even over.
    if (!doneDates.has(dateStr(cursor))) {
      cursor.setDate(cursor.getDate() - 1)
    }
    while (doneDates.has(dateStr(cursor))) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    }
    return streak
  }

  // ── Fallback data (when Supabase not yet configured) ──────────────────────
  function loadFallbackData() {
    const today = new Date()
    const d = (offset) => { const x = new Date(today); x.setDate(x.getDate() - offset); return dateStr(x) }
    setHabits([
      { id: 1, name: 'Morning meditation' },
      { id: 2, name: 'Exercise' },
      { id: 3, name: 'Read 20 mins' },
    ])
    setHabitLogs([
      { id: 1, habit_id: 1, date: d(0), completed: true },
      { id: 2, habit_id: 1, date: d(1), completed: true },
      { id: 3, habit_id: 1, date: d(2), completed: true },
      { id: 4, habit_id: 2, date: d(0), completed: true },
      { id: 5, habit_id: 2, date: d(1), completed: true },
    ])
    setTransactions([
      { id: 1, name: 'Whole Foods', cat: 'Food', amount: 87, icon: '🛒', created_at: '2026-06-12' },
      { id: 2, name: 'Metro card', cat: 'Transport', amount: 33, icon: '🚇', created_at: '2026-06-11' },
      { id: 3, name: 'Amazon', cat: 'Shopping', amount: 54, icon: '📦', created_at: '2026-06-10' },
      { id: 4, name: 'Gym membership', cat: 'Health', amount: 45, icon: '💪', created_at: '2026-06-09' },
    ])
    setBudgets([
      { id: 1, cat: 'Food', budget: 600, spent: 490, color: '#A78BFA' },
      { id: 2, cat: 'Transport', budget: 200, spent: 143, color: '#60A5FA' },
      { id: 3, cat: 'Shopping', budget: 300, spent: 284, color: '#FBBF24' },
      { id: 4, cat: 'Health', budget: 200, spent: 165, color: '#34D399' },
      { id: 5, cat: 'Other', budget: 700, spent: 758, color: '#F87171' },
    ])
    setEvents({
      [TODAY]: [
        { id: 1, date: TODAY, time: '9:00 AM', name: 'Team standup', tag: 'tag-work' },
        { id: 2, date: TODAY, time: '6:30 PM', name: 'Evening run', tag: 'tag-health' },
      ],
    })
    setJournalEntries([{
      id: 1,
      text: 'Feeling really focused today. Got a solid 7 hours of sleep and meditated this morning.',
      summary: 'Strong energy day. Clear priorities identified.',
      actions: ['Follow up on project proposal', 'Call mom this weekend'],
      insight: "Your best entries correlate with meditation + 7h sleep.",
      valence: 0.6,
      arousal: 0.4,
      created_at: new Date().toISOString(),
    }])
    setWellnessLogs([
      { id: 1, sleep_hours: 7.5, sleep_score: 84, energy_level: 75, created_at: new Date().toISOString() },
    ])
    setBodyLogs([])
    setMeals([])
    setSettings({ usd_cny_rate: 7.1, body_goal: 'maintain' })
  }

  // ── Habits ────────────────────────────────────────────────────────────────
  const addHabit = useCallback(async (name) => {
    const { data, error } = await supabase
      .from('habits')
      .insert({ name })
      .select()
      .single()
    if (error) throw error
    setHabits(prev => [...prev, data])
  }, [])

  // Toggle completion for a habit on a specific date (defaults to today).
  // Upserts into habit_logs keyed on (habit_id, date) so each day has one row.
  const toggleHabitDate = useCallback(async (habitId, date = null) => {
    const day = date || dateStr(new Date())
    const existing = habitLogs.find(l => l.habit_id === habitId && l.date === day)
    const newCompleted = !existing?.completed

    const { data, error } = await supabase
      .from('habit_logs')
      .upsert({ habit_id: habitId, date: day, completed: newCompleted }, { onConflict: 'habit_id,date' })
      .select()
      .single()
    if (error) throw error

    setHabitLogs(prev => {
      const without = prev.filter(l => !(l.habit_id === habitId && l.date === day))
      return [data, ...without]
    })
  }, [habitLogs])

  const markHabitToday = useCallback(async (habitId, done = true) => {
    const day = dateStr(new Date())
    const { data, error } = await supabase
      .from('habit_logs')
      .upsert({ habit_id: habitId, date: day, completed: done }, { onConflict: 'habit_id,date' })
      .select()
      .single()
    if (error) throw error
    setHabitLogs(prev => {
      const without = prev.filter(l => !(l.habit_id === habitId && l.date === day))
      return [data, ...without]
    })
  }, [])

  // ── Delete habit ─────────────────────────────────────────────────────────
  const deleteHabit = useCallback(async (habitId) => {
    const { error } = await supabase.from('habits').delete().eq('id', habitId)
    if (error) throw error
    setHabits(prev => prev.filter(h => h.id !== habitId))
    setHabitLogs(prev => prev.filter(l => l.habit_id !== habitId))
  }, [])

  // ── Edit habit name ───────────────────────────────────────────────────────
  const editHabit = useCallback(async (habitId, name) => {
    const { error } = await supabase.from('habits').update({ name }).eq('id', habitId)
    if (error) throw error
    setHabits(prev => prev.map(h => h.id === habitId ? { ...h, name } : h))
  }, [])

  // ── Transactions ──────────────────────────────────────────────────────────
  const addTransaction = useCallback(async ({ name, amount, cat, icon }) => {
    const { data, error } = await supabase
      .from('transactions')
      .insert({ name, amount, cat, icon })
      .select()
      .single()
    if (error) throw error
    setTransactions(prev => [data, ...prev])
    // Update budget spent
    const bud = budgets.find(b => b.cat === cat)
    if (bud) {
      const newSpent = bud.spent + amount
      await supabase.from('budgets').update({ spent: newSpent }).eq('id', bud.id)
      setBudgets(prev => prev.map(b => b.id === bud.id ? { ...b, spent: newSpent } : b))
    }
  }, [budgets])

  // ── Edit transaction ──────────────────────────────────────────────────────
  const editTransaction = useCallback(async (txId, updates) => {
    const tx = transactions.find(t => t.id === txId)
    if (!tx) return
    const { error } = await supabase.from('transactions').update(updates).eq('id', txId)
    if (error) throw error
    // Adjust budget if amount or cat changed
    if (updates.amount !== undefined || updates.cat !== undefined) {
      const oldBud = budgets.find(b => b.cat === tx.cat)
      const newCat = updates.cat || tx.cat
      const newAmt = updates.amount !== undefined ? updates.amount : tx.amount
      if (oldBud) {
        const revert = Math.max(0, oldBud.spent - tx.amount)
        await supabase.from('budgets').update({ spent: revert }).eq('id', oldBud.id)
        setBudgets(prev => prev.map(b => b.id === oldBud.id ? { ...b, spent: revert } : b))
      }
      const newBud = budgets.find(b => b.cat === newCat)
      if (newBud) {
        const add = newBud.spent + newAmt
        await supabase.from('budgets').update({ spent: add }).eq('id', newBud.id)
        setBudgets(prev => prev.map(b => b.id === newBud.id ? { ...b, spent: add } : b))
      }
    }
    setTransactions(prev => prev.map(t => t.id === txId ? { ...t, ...updates } : t))
  }, [transactions, budgets])

  // ── Delete transaction ────────────────────────────────────────────────────
  const deleteTransaction = useCallback(async (txId) => {
    const tx = transactions.find(t => t.id === txId)
    if (!tx) return
    const { error } = await supabase.from('transactions').delete().eq('id', txId)
    if (error) throw error
    setTransactions(prev => prev.filter(t => t.id !== txId))
    // Reverse the budget spent amount
    const bud = budgets.find(b => b.cat === tx.cat)
    if (bud) {
      const newSpent = Math.max(0, bud.spent - tx.amount)
      await supabase.from('budgets').update({ spent: newSpent }).eq('id', bud.id)
      setBudgets(prev => prev.map(b => b.id === bud.id ? { ...b, spent: newSpent } : b))
    }
  }, [transactions, budgets])

  // ── Calendar events ───────────────────────────────────────────────────────
  const addEvent = useCallback(async ({ date, time, name, tag }) => {
    const { data, error } = await supabase
      .from('calendar_events')
      .insert({ date, time, name, tag })
      .select()
      .single()
    if (error) throw error
    setEvents(prev => ({
      ...prev,
      [date]: [...(prev[date] || []), data],
    }))
  }, [])

  // ── Edit calendar event ───────────────────────────────────────────────────
  const editEvent = useCallback(async (eventId, oldDate, updates) => {
    const { error } = await supabase.from('calendar_events').update(updates).eq('id', eventId)
    if (error) throw error
    const newDate = updates.date || oldDate
    setEvents(prev => {
      const next = { ...prev }
      // Remove from old date
      next[oldDate] = (next[oldDate] || []).filter(e => e.id !== eventId)
      // Add to new date (or same date with updates)
      const updated = { ...(prev[oldDate]?.find(e => e.id === eventId) || {}), ...updates }
      next[newDate] = [...(next[newDate] || []).filter(e => e.id !== eventId), updated]
      return next
    })
  }, [])

  // ── Delete calendar event ─────────────────────────────────────────────────
  const deleteEvent = useCallback(async (eventId, date) => {
    const { error } = await supabase.from('calendar_events').delete().eq('id', eventId)
    if (error) throw error
    setEvents(prev => ({
      ...prev,
      [date]: (prev[date] || []).filter(e => e.id !== eventId),
    }))
  }, [])

  // ── Journal ───────────────────────────────────────────────────────────────
  const addJournalEntry = useCallback(async ({ text, summary = '', actions = [], insight = '', valence = null, arousal = null, mood_label = null }) => {
    const { data, error } = await supabase
      .from('journal_entries')
      .insert({ text, summary, actions, insight, valence, arousal, mood_label })
      .select()
      .single()
    if (error) throw error
    setJournalEntries(prev => [data, ...prev])
    return data
  }, [])

  const deleteJournalEntry = useCallback(async (id) => {
    const { error } = await supabase.from('journal_entries').delete().eq('id', id)
    if (error) throw error
    setJournalEntries(prev => prev.filter(e => e.id !== id))
  }, [])

  const updateJournalEntry = useCallback(async (id, updates) => {
    const { error } = await supabase
      .from('journal_entries')
      .update(updates)
      .eq('id', id)
    if (error) throw error
    setJournalEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e))
  }, [])

  // ── Wellness (sleep / energy) ────────────────────────────────────────────
  const addWellnessLog = useCallback(async ({ sleepHours = null, sleepScore = null, energyLevel = null, note = null }) => {
    const { data, error } = await supabase
      .from('wellness_logs')
      .insert({ sleep_hours: sleepHours, sleep_score: sleepScore, energy_level: energyLevel, note })
      .select()
      .single()
    if (error) throw error
    setWellnessLogs(prev => [data, ...prev])
    return data
  }, [])

  const deleteWellnessLog = useCallback(async (id) => {
    const { error } = await supabase.from('wellness_logs').delete().eq('id', id)
    if (error) throw error
    setWellnessLogs(prev => prev.filter(w => w.id !== id))
  }, [])

  const editWellnessLog = useCallback(async (id, updates) => {
    const { error } = await supabase.from('wellness_logs').update(updates).eq('id', id)
    if (error) throw error
    setWellnessLogs(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w))
  }, [])

  // ── Budget categories ─────────────────────────────────────────────────────
  const editBudget = useCallback(async (budgetId, updates) => {
    const { error } = await supabase.from('budgets').update(updates).eq('id', budgetId)
    if (error) throw error
    setBudgets(prev => prev.map(b => b.id === budgetId ? { ...b, ...updates } : b))
  }, [])

  const addBudget = useCallback(async ({ cat, budget, color = '#A78BFA' }) => {
    const { data, error } = await supabase
      .from('budgets')
      .insert({ cat, budget, spent: 0, color })
      .select()
      .single()
    if (error) throw error
    setBudgets(prev => [...prev, data].sort((a, b) => a.cat.localeCompare(b.cat)))
  }, [])

  const deleteBudget = useCallback(async (budgetId) => {
    const { error } = await supabase.from('budgets').delete().eq('id', budgetId)
    if (error) throw error
    setBudgets(prev => prev.filter(b => b.id !== budgetId))
  }, [])

  const resetMonthlySpend = useCallback(async () => {
    // Calls the Supabase function that snapshots current spending to history, then resets.
    // Same function is run automatically by pg_cron on the 1st of each month.
    const { error } = await supabase.rpc('archive_and_reset_month')
    if (error) throw error
    await loadAll()
  }, [])

  // ── Settings (exchange rate, etc.) ─────────────────────────────────────────
  const updateSetting = useCallback(async (key, value) => {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key, value: String(value) }, { onConflict: 'key' })
    if (error) throw error
    setSettings(prev => ({ ...prev, [key]: isNaN(value) ? value : parseFloat(value) }))
  }, [])

  // ── Nutrition: body logs (weight / body fat) ───────────────────────────────
  const addBodyLog = useCallback(async ({ date, weight = null, bodyFat = null }) => {
    const today = date || new Date().toISOString().split('T')[0]
    // Upsert by date so one entry per day
    const { data, error } = await supabase
      .from('body_logs')
      .upsert({ date: today, weight, body_fat: bodyFat }, { onConflict: 'date' })
      .select()
      .single()
    if (error) throw error
    setBodyLogs(prev => {
      const without = prev.filter(b => b.date !== today)
      return [data, ...without].sort((a, b) => b.date.localeCompare(a.date))
    })
    return data
  }, [])

  const deleteBodyLog = useCallback(async (id) => {
    const { error } = await supabase.from('body_logs').delete().eq('id', id)
    if (error) throw error
    setBodyLogs(prev => prev.filter(b => b.id !== id))
  }, [])

  // ── Nutrition: meals (calories + macros) ───────────────────────────────────
  const addMeal = useCallback(async ({ name, calories = 0, carbs = 0, protein = 0, fat = 0, date = null, ingredients = [] }) => {
    const mealDate = date || new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('meals')
      .insert({ name, calories, carbs, protein, fat, date: mealDate, ingredients })
      .select()
      .single()
    if (error) throw error
    setMeals(prev => [data, ...prev])
    return data
  }, [])

  const deleteMeal = useCallback(async (id) => {
    const { error } = await supabase.from('meals').delete().eq('id', id)
    if (error) throw error
    setMeals(prev => prev.filter(m => m.id !== id))
  }, [])

  // ── Derived stats ─────────────────────────────────────────────────────────
  const totalSpent = budgets.reduce((s, b) => s + (b.spent || 0), 0)
  const totalBudget = budgets.reduce((s, b) => s + (b.budget || 0), 0)

  const todayKey = dateStr(new Date())
  const completionMap = buildCompletionMap(habitLogs)

  // Enrich each habit with a live-computed streak and "done today" flag —
  // derived fresh from habitLogs every render, never stored/stale.
  const habitsWithStreaks = habits.map(h => ({
    ...h,
    streak: computeStreakFromLogs(h.id, habitLogs),
    doneToday: completionMap[h.id]?.has(todayKey) || false,
  }))

  const maxStreak = Math.max(...habitsWithStreaks.map(h => h.streak), 0)
  const habitsDoneToday = habitsWithStreaks.filter(h => h.doneToday).length

  return {
    // state
    habits: habitsWithStreaks, habitLogs, transactions, budgets, events, journalEntries, wellnessLogs, settings,
    bodyLogs, meals, spendingHistory,
    loading, error,
    // actions
    addHabit, editHabit, toggleHabitDate, markHabitToday, deleteHabit,
    addTransaction, editTransaction, deleteTransaction,
    editBudget, addBudget, deleteBudget, resetMonthlySpend,
    addEvent, editEvent, deleteEvent,
    addJournalEntry, updateJournalEntry, deleteJournalEntry,
    addWellnessLog, deleteWellnessLog, editWellnessLog,
    updateSetting,
    addBodyLog, deleteBodyLog, addMeal, deleteMeal,
    reload: loadAll,
    // derived
    totalSpent, totalBudget, maxStreak, habitsDoneToday,
  }
}
