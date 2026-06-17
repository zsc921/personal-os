// src/components/Finance.jsx
import { useState } from 'react'
import styles from './Finance.module.css'

const CATS = ['Food', 'Transport', 'Shopping', 'Health', 'Other']
const ICONS = { Food: '🛒', Transport: '🚇', Shopping: '📦', Health: '💪', Other: '💳' }

export default function Finance({ budgets, transactions, totalSpent, totalBudget, onDeleteTransaction, onEditTransaction }) {
  const remaining = totalBudget - totalSpent
  const overBudget = budgets.filter(b => b.spent > b.budget)
  const [editingId, setEditingId] = useState(null)
  const [editFields, setEditFields] = useState({})

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
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Monthly budget</div>
          <div className={styles.statValue}>${totalBudget.toLocaleString()}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Spent so far</div>
          <div className={styles.statValue}>${totalSpent.toLocaleString()}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Remaining</div>
          <div className={`${styles.statValue} ${remaining >= 0 ? styles.up : styles.down}`}>
            {remaining >= 0 ? '+' : '-'}${Math.abs(remaining).toLocaleString()}
          </div>
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
                  <div className={styles.txAmount}>-${t.amount}</div>
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
