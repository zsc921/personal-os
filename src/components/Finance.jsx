// src/components/Finance.jsx
import { useState } from 'react'
import styles from './Finance.module.css'

const CATS = ['Food', 'Grocery', 'Transport', 'Shopping', 'Health', 'Home', 'Travel', 'Beauty', 'Sports', 'Utility', 'Other']
const ICONS = { Food: '🛒', Grocery: '🥦', Transport: '🚇', Shopping: '📦', Health: '💪', Home: '🏠', Travel: '✈️', Beauty: '💄', Sports: '⚽', Utility: '💡', Other: '💳' }

export default function Finance({ budgets, transactions, totalSpent, totalBudget, onDeleteTransaction, onEditTransaction, settings, onUpdateSetting }) {
  const remaining = totalBudget - totalSpent
  const overBudget = budgets.filter(b => b.spent > b.budget)
  const [editingId, setEditingId] = useState(null)
  const [editFields, setEditFields] = useState({})
  const [editingRate, setEditingRate] = useState(false)
  const [rateInput, setRateInput] = useState('')

  const rate = settings?.usd_cny_rate || 7.1
  const toCny = usd => (usd * rate).toLocaleString('en-US', { maximumFractionDigits: 0 })

  async function saveRate() {
    const r = parseFloat(rateInput)
    if (!isNaN(r) && r > 0) await onUpdateSetting('usd_cny_rate', r)
    setEditingRate(false)
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

      <div className={styles.grid2}>
        <div className={styles.card}>
          <div className={styles.cardHeader}><span className={styles.cardTitle}>Budget vs spend</span></div>
          {budgets.map(b => {
            const pct = Math.min(100, Math.round((b.spent / b.budget) * 100))
            const over = b.spent > b.budget
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
          <p className={styles.hint}>Add transactions via the command bar: "Spent $X on Y"</p>
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
