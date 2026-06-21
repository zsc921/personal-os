// src/App.jsx
import { useState, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import OmniBar from './components/OmniBar'
import Home from './components/Home'
import Nutrition from './components/Nutrition'
import Habits from './components/Habits'
import Finance from './components/Finance'
import Calendar from './components/Calendar'
import Journal from './components/Journal'
import { useData } from './hooks/useData'
import './index.css'

const ICONS = { Food: '🛒', Grocery: '🥦', Transport: '🚇', Shopping: '📦', Health: '💪', Home: '🏠', Travel: '✈️', Beauty: '💄', Sports: '⚽', Utility: '💡', Other: '💳' }

export default function App() {
  const [tab, setTab] = useState('home')
  const [toasts, setToasts] = useState([])
  const data = useData()

  function addToast(msg, type = 'default') {
    const id = Date.now()
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }

  // Called by OmniBar after Claude parses intent
  const handleOmniResult = useCallback(async (parsed) => {
    const { module, data: d, toast, action } = parsed
    try {
      if (module === 'finance' && d) {
        await data.addTransaction({
          name: d.name,
          amount: d.amount,
          cat: d.cat,
          icon: d.icon || ICONS[d.cat] || '💳',
        })
        addToast(toast || action, 'finance')
        setTab('finance')
      } else if (module === 'calendar' && d) {
        await data.addEvent({ date: d.date, time: d.time || 'All day', name: d.name, tag: d.tag || 'tag-personal' })
        addToast(toast || action, 'calendar')
        setTab('calendar')
      } else if (module === 'habits' && d) {
        if (d.habitId) {
          await data.markHabitToday(d.habitId, d.completed)
        } else {
          await data.addHabit(d.name)
          if (d.completed) {
            const newHabit = data.habits.find(h => h.name === d.name)
            if (newHabit) await data.markHabitToday(newHabit.id, true)
          }
        }
        addToast(toast || action, 'habit')
        setTab('habits')
      } else if (module === 'journal' && d) {
        await data.addJournalEntry({ text: d.text })
        addToast(toast || action, 'journal')
        setTab('journal')
      } else if (module === 'wellness' && d) {
        await data.addWellnessLog({
          sleepHours: d.sleepHours ?? null,
          sleepScore: d.sleepScore ?? null,
          energyLevel: d.energyLevel ?? null,
          note: d.note ?? null,
        })
        addToast(toast || action, 'journal')
        setTab('home')
      } else if (module === 'nutrition' && d) {
        if (d.kind === 'body') {
          await data.addBodyLog({ weight: d.weight ?? null, bodyFat: d.bodyFat ?? null })
        } else {
          await data.addMeal({
            name: d.name || 'Meal',
            calories: d.calories || 0,
            carbs: d.carbs || 0,
            protein: d.protein || 0,
            fat: d.fat || 0,
          })
        }
        addToast(toast || action, 'habit')
        setTab('nutrition')
      } else {
        addToast("Couldn't determine intent. Try rephrasing.", 'error')
      }
    } catch (err) {
      addToast(`Error: ${err.message}`, 'error')
      console.error('[App] handleOmniResult error:', err)
    }
  }, [data])

  const titles = { home: 'Good morning', nutrition: 'Nutrition', habits: 'Habit tracker', finance: 'Finance', calendar: 'Calendar', journal: 'Voice journal' }

  return (
    <div className="layout">
      {/* Toast notifications */}
      <div className="toast-area">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span className="toast-dot" />
            <span>{t.msg}</span>
          </div>
        ))}
      </div>

      <Sidebar activeTab={tab} onTabChange={setTab} />

      <div className="main">
        <div className="topbar">
          <span className="topbar-title">{titles[tab]}</span>
          <div className="topbar-brief">
            <div className="brief-dot" />
            <span>
              {data.habitsDoneToday}/{data.habits.length} habits · ${data.totalSpent} spent · {(data.events[new Date().toISOString().split('T')[0]] || []).length} events today
            </span>
          </div>
        </div>

        <OmniBar data={data} onResult={handleOmniResult} onToast={(msg, type) => addToast(msg, type)} onTabChange={setTab} />

        <div className="content">
          {data.loading ? (
            <div className="loading-state">
              <div className="loading-dot" />
              <span>Connecting to your data…</span>
            </div>
          ) : (
            <>
              {tab === 'home' && (
                <Home
                  data={data}
                  onTabChange={setTab}
                  onHabitToggle={(id) => data.toggleHabitDate(id)}
                />
              )}
              {tab === 'nutrition' && (
                <Nutrition
                  bodyLogs={data.bodyLogs}
                  meals={data.meals}
                  settings={data.settings}
                  onAddBodyLog={data.addBodyLog}
                  onAddMeal={data.addMeal}
                  onDeleteMeal={data.deleteMeal}
                  onUpdateSetting={data.updateSetting}
                />
              )}
              {tab === 'habits' && (
                <Habits
                  habits={data.habits}
                  habitLogs={data.habitLogs}
                  onToggleDate={data.toggleHabitDate}
                  onAddHabit={data.addHabit}
                  onEditHabit={data.editHabit}
                  onDeleteHabit={data.deleteHabit}
                />
              )}
              {tab === 'finance' && (
                <Finance
                  budgets={data.budgets}
                  transactions={data.transactions}
                  totalSpent={data.totalSpent}
                  totalBudget={data.totalBudget}
                  settings={data.settings}
                  spendingHistory={data.spendingHistory}
                  onUpdateSetting={data.updateSetting}
                  onEditTransaction={data.editTransaction}
                  onDeleteTransaction={data.deleteTransaction}
                  onEditBudget={data.editBudget}
                  onAddBudget={data.addBudget}
                  onDeleteBudget={data.deleteBudget}
                  onResetMonthlySpend={data.resetMonthlySpend}
                />
              )}
              {tab === 'calendar' && (
                <Calendar
                  events={data.events}
                  onEditEvent={data.editEvent}
                  onDeleteEvent={data.deleteEvent}
                />
              )}
              {tab === 'journal' && (
                <Journal
                  journalEntries={data.journalEntries}
                  onAddEntry={data.addJournalEntry}
                  onUpdateEntry={data.updateJournalEntry}
                  onDeleteEntry={data.deleteJournalEntry}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
