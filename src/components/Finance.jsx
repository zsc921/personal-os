// src/components/Finance.jsx
import { useState } from 'react'
import YTDChart from './YTDChart'
import styles from './Finance.module.css'

const CATS = ['Food', 'Grocery', 'Transport', 'Shopping', 'Health', 'Home', 'Travel', 'Beauty', 'Sports', 'Utility', 'Other']
const ICONS = { Food: '🛒', Grocery: '🥦', Transport: '🚇', Shopping: '📦', Health: '💪', Home: '🏠', Travel: '✈️', Beauty: '💄', Sports: '⚽', Utility: '💡', Other: '💳' }

export default function Finance({
  budgets, transactions, totalSpent, totalBudget,
  onDeleteTransaction, onEditTransaction, settings, onUpdateSetting,
  onEditBudget, onAddBudget, onDeleteBudget, onResetMonthlySpend,
  spendingHistory = [],
}) {
  const remaining = totalBudget - totalSpent
  const overBudget = budgets.filter(b => b.spent > b.budget)
  const [editingId, setEditingId] = useState(null)
  const [editFields, setEditFields] = useState({})
  const [editingRate, setEditingRate] = useState(false)
  const [rateInput, setRateInput] = useState('')

  // Budget editor state
  const [planMode, setPlanMode] = useState(false)
  const [budgetEdits, setBudgetEdits] = useState({})
  const [newCat, setNewCat] = useState('')
  const [newAmt, setNewAmt] = useState('')

  const rate = settings?.usd_cny_rate || 7.1
  const toCny = usd => (usd * rate).toLocaleString('en-US', { maximumFractionDigits: 0 })

  async function saveRate() {
    const r = parseFloat(rateInput)
    if (!isNaN(r) && r > 0) await onUpdateSetting('usd_cny_rate', r)
    setEditingRate(false)
  }

  // Start planning: snapshot all current budget values into local state
  function startPlanning() {
    const snapshot = {}
    budgets.forEach(b => { snapshot[b.id] = b.budget })
    setBudgetEdits(snapshot)
    setPlanMode(true)
  }

  async function saveAllBudgets() {
    // Save only changed values
    const changes = budgets.filter(b => budgetEdits[b.id] !== undefined && parseFloat(budgetEdits[b.id]) !== b.budget)
    await Promise.all(changes.map(b => onEditBudget(b.id, { budget: parseFloat(budgetEdits[b.id]) || 0 })))
    setPlanMode(false)
  }

  async function handleAddCategory() {
    if (!newCat.trim() || !newAmt) return
    await onAddBudget({ cat: newCat.trim(), budget: parseFloat(newAmt) || 0 })
    setNewCat(''); setNewAmt('')
  }

  async function handleResetSpend() {
    if (!confirm('Reset all spent amounts to $0? This is useful at the start of a new month.')) return
    await onResetMonthlySpend()
  }

  function startEdit(t) {
    setEditingId(t.id)
    setEditFields({ name: t.name, amount: t.amount, cat: t.cat })
  }

  async function saveEdit(id) {
    const updates = {
      name: editFields.name,
      amount: parseFloat(editFields.amount),
      cat: editFields.cat,
      icon: ICONS[editFields.cat] || '💳',
    }
    await onEditTransaction(id, updates)
    setEditingId(null)
  }

  function cancelEdit() { setEditingId(null) }

  return (
    <div className={styles.wrapper}>
      <div className={styles.rateBar}>
        {editingRate ? (
          <div className={styles.rateEdit}>
            <span className={styles.rateLabel}>1 USD =</span>
            <input
              className={styles.rateInput}
              type="number"
              step="0.01"
              value={rateInput}
              onChange={e => setRateInput(e.target.value)}
              autoFocus
            />
            <span className={styles.rateLabel}>CNY</span>
            <button className={styles.accentBtn} onClick={saveRate}>Save</button>
            <button className={styles.ghostBtn} onClick={() => setEditingRate(false)}>✕</button>
          </div>
        ) : (
          <div className={styles.rateDisplay}>
            <span className={styles.rateLabel}>Exchange rate: 1 USD = ¥{rate}</span>
            <button className={styles.rateEditBtn} onClick={() => { setRateInput(String(rate)); setEditingRate(true) }}>
              ✎ edit
            </button>
          </div>
        )}
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Monthly budget</div>
          <div className={styles.statValue}>${totalBudget.toLocaleString()}</div>
          <div className={styles.statCny}>¥{toCny(totalBudget)}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Spent so far</div>
          <div className={styles.statValue}>${totalSpent.toLocaleString()}</div>
          <div className={styles.statCny}>¥{toCny(totalSpent)}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Remaining</div>
          <div className={`${styles.statValue} ${remaining >= 0 ? styles.up : styles.down}`}>
            {remaining >= 0 ? '+' : '-'}${Math.abs(remaining).toLocaleString()}
          </div>
          <div className={styles.statCny}>¥{toCny(Math.abs(remaining))}</div>
        </div>
      </div>

      {overBudget.length > 0 && (
        <div className={styles.alert}>
          ⚠ Over budget: {overBudget.map(b => `${b.cat} ($${b.spent - b.budget} over)`).join(' · ')}
        </div>
      )}

      <YTDChart history={spendingHistory} budgets={budgets} toCny={toCny} />

      <div className={styles.grid2}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Budget vs spend</span>
            {planMode ? (
              <div className={styles.headerBtns}>
                <button className={styles.accentBtn} onClick={saveAllBudgets}>Save plan</button>
                <button className={styles.ghostBtn} onClick={() => setPlanMode(false)}>Cancel</button>
              </div>
            ) : (
              <div className={styles.headerBtns}>
                <button className={styles.addBtn} onClick={startPlanning}>✎ Plan budgets</button>
                <button className={styles.addBtn} onClick={handleResetSpend} title="Reset spent amounts for new month">↻ New month</button>
              </div>
            )}
          </div>

          {budgets.map(b => {
            const pct = Math.min(100, Math.round((b.spent / b.budget) * 100))
            const over = b.spent > b.budget

            if (planMode) {
              return (
                <div key={b.id} className={styles.budgetRow}>
                  <div className={styles.planRow}>
                    <span className={styles.budgetCat}>{b.cat}</span>
                    <span className={styles.dollarSign}>$</span>
                    <input
                      className={styles.budgetInput}
                      type="number"
                      step="50"
                      value={budgetEdits[b.id] ?? b.budget}
                      onChange={e => setBudgetEdits(prev => ({ ...prev, [b.id]: e.target.value }))}
                    />
                    <button
                      className={styles.delBtn}
                      onClick={() => { if (confirm(`Delete ${b.cat} category? Transactions will not be deleted.`)) onDeleteBudget(b.id) }}
                      title="Delete category"
                    >×</button>
                  </div>
                </div>
              )
            }

            return (
              <div key={b.id} className={styles.budgetRow}>
                <div className={styles.budgetMeta}>
                  <span className={styles.budgetCat}>{b.cat}</span>
                  <span className={styles.budgetNums}>
                    <span style={{ color: over ? 'var(--red)' : 'var(--text)' }}>${b.spent}</span>
                    {' / '}${b.budget}
                  </span>
                </div>
                <div className={styles.track}>
                  <div className={styles.fill} style={{ width: `${pct}%`, background: over ? 'var(--red)' : b.color }} />
                </div>
              </div>
            )
          })}

          {planMode && (
            <div className={styles.addCatForm}>
              <input
                className={styles.budgetInput}
                placeholder="New category"
                value={newCat}
                onChange={e => setNewCat(e.target.value)}
                style={{ flex: 1 }}
              />
              <span className={styles.dollarSign}>$</span>
              <input
                className={styles.budgetInput}
                placeholder="Amount"
                type="number"
                value={newAmt}
                onChange={e => setNewAmt(e.target.value)}
                style={{ width: 80 }}
              />
              <button className={styles.accentBtn} onClick={handleAddCategory}>Add</button>
            </div>
          )}

          {!planMode && <p className={styles.hint}>Add transactions via the command bar: "Spent $X on Y"</p>}
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}><span className={styles.cardTitle}>Recent transactions</span></div>
          {transactions.length === 0 && <p className={styles.empty}>No transactions yet.</p>}
          {transactions.slice(0, 8).map((t, i) => (
            <div key={t.id || i} className={styles.txRow}>
              {editingId === t.id ? (
                <div className={styles.editRow}>
                  <input
                    className={styles.editInput}
                    value={editFields.name}
                    onChange={e => setEditFields(f => ({ ...f, name: e.target.value }))}
                    placeholder="Description"
                  />
                  <input
                    className={styles.editInput}
                    type="number"
                    value={editFields.amount}
                    onChange={e => setEditFields(f => ({ ...f, amount: e.target.value }))}
                    style={{ width: 70 }}
                  />
                  <select
                    className={styles.editSelect}
                    value={editFields.cat}
                    onChange={e => setEditFields(f => ({ ...f, cat: e.target.value }))}
                  >
                    {CATS.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <button className={styles.accentBtn} onClick={() => saveEdit(t.id)}>Save</button>
                  <button className={styles.ghostBtn} onClick={cancelEdit}>✕</button>
                </div>
              ) : (
                <>
                  <div className={styles.txIcon}>{t.icon || '💳'}</div>
                  <div className={styles.txInfo}>
                    <div className={styles.txName}>{t.name}</div>
                    <div className={styles.txMeta}>
                      {t.created_at ? new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''} · {t.cat}
                    </div>
                  </div>
                  <div className={styles.txAmount}>
                    -${t.amount}
                    <span className={styles.txCny}>¥{toCny(t.amount)}</span>
                  </div>
                  <div className={styles.rowActions}>
                    <button className={styles.editBtn} onClick={() => startEdit(t)} title="Edit">✎</button>
                    <button className={styles.deleteBtn} onClick={() => onDeleteTransaction(t.id)} title="Delete">×</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
