import React, { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon.jsx'
import styles from './BudgetModal.module.css'

const fmt  = n => '$' + Math.round(n).toLocaleString('en-CA')
const fmtM = n => '$' + Math.round(n).toLocaleString('en-CA') + '/mo'

// Category icons mapped to our SVG icon set where possible, fallback to emoji span
function CatIcon({ emoji }) {
  return <span className={styles.catEmoji} aria-hidden="true">{emoji}</span>
}

export function BudgetModal({ onClose, shared, setShField }) {
  const budget = shared.budget ?? {}
  const items  = budget?.items ?? []

  // Local edit state — only commit on Apply
  const [localItems, setLocalItems] = useState(() =>
    items.map(i => ({ ...i }))
  )
  const [mode, setMode]     = useState(budget?.mode ?? 'reference')
  const [newLabel, setNewLabel] = useState('')

  const setItem = (id, field, value) =>
    setLocalItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))

  const removeItem = id =>
    setLocalItems(prev => prev.filter(i => i.id !== id))

  const addItem = () => {
    if (!newLabel.trim()) return
    setLocalItems(prev => [...prev, {
      id:       'custom_' + Date.now(),
      label:    newLabel.trim(),
      monthly:  0,
      emoji:    '📌',
      included: true,
    }])
    setNewLabel('')
  }

  // Totals
  const totalMonthly  = useMemo(() => localItems.reduce((s, i) => s + (i.monthly || 0), 0), [localItems])
  const totalAnnual   = totalMonthly * 12
  const addOnMonthly  = useMemo(() => localItems.filter(i => !i.included).reduce((s, i) => s + (i.monthly || 0), 0), [localItems])
  const currentSpend  = shared.annualSpending || 0
  const diff          = totalAnnual - currentSpend
  const overrideTotal = totalAnnual  // used when mode === 'override'

  const apply = () => {
    const newBudget = { enabled: true, mode, items: localItems }
    setShField('budget', newBudget)
    if (mode === 'override') {
      setShField('annualSpending', Math.round(totalAnnual))
    } else if (mode === 'addons') {
      // Add only the "add-on" items to current spending
      setShField('annualSpending', Math.round(currentSpend + addOnMonthly * 12))
    }
    onClose()
  }

  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const onBackdrop = e => { if (e.target === e.currentTarget) onClose() }

  const content = (
    <div className={styles.backdrop} onClick={onBackdrop} role="dialog" aria-modal="true">
      <div className={styles.modal}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Icon name="spending" size={17} style={{ color: 'var(--teal)' }} />
            <div>
              <div className={styles.title}>Retirement budget planner</div>
              <div className={styles.sub}>Build your monthly budget — then apply it to the plan</div>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <Icon name="close" size={14} />
          </button>
        </div>

        <div className={styles.body}>

          {/* Summary strip */}
          <div className={styles.summaryStrip}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Budget total</span>
              <span className={styles.summaryVal}>{fmt(totalAnnual)}/yr</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Monthly</span>
              <span className={styles.summaryVal}>{fmtM(totalMonthly)}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Current spending</span>
              <span className={styles.summaryVal}>{fmt(currentSpend)}/yr</span>
            </div>
            <div className={`${styles.summaryItem} ${diff > 0 ? styles.summaryWarn : diff < 0 ? styles.summaryGood : ''}`}>
              <span className={styles.summaryLabel}>Difference</span>
              <span className={styles.summaryVal}>
                {diff === 0 ? '—' : (diff > 0 ? '+' : '') + fmt(diff) + '/yr'}
              </span>
            </div>
          </div>

          {/* Mode picker */}
          <div className={styles.modeRow}>
            <span className={styles.modeLabel}>When applied:</span>
            <div className={styles.modeGroup}>
              {[
                { val: 'reference', label: 'Reference only',    sub: 'Show budget, keep current spending figure' },
                { val: 'override',  label: 'Replace spending',  sub: 'Set annual spending = budget total' },
                { val: 'addons',    label: 'Add extras only',   sub: 'Add unchecked items on top of current spending' },
              ].map(m => (
                <button key={m.val}
                  className={`${styles.modeBtn} ${mode === m.val ? styles.modeBtnOn : ''}`}
                  onClick={() => setMode(m.val)}
                  title={m.sub}
                >{m.label}</button>
              ))}
            </div>
          </div>

          {/* Mode explanation */}
          <div className={styles.modeExplain}>
            {mode === 'reference' && <>Your budget is for reference. The annual spending field stays at <strong>{fmt(currentSpend)}</strong>.</>}
            {mode === 'override'  && <>Annual spending will be set to your budget total: <strong>{fmt(overrideTotal)}</strong>.</>}
            {mode === 'addons'    && addOnMonthly > 0 && <>Items marked "Add-on" total <strong>{fmtM(addOnMonthly)}</strong> and will be added to your current <strong>{fmt(currentSpend)}</strong> → <strong>{fmt(currentSpend + addOnMonthly * 12)}</strong>.</>}
            {mode === 'addons'    && addOnMonthly === 0 && <>No items are marked "Add-on". Uncheck items you want to add on top of your current spending.</>}
          </div>

          {/* Category table */}
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.thCat}>Category</th>
                  <th className={styles.thAmt}>Monthly</th>
                  <th className={styles.thAmt}>Annual</th>
                  <th className={styles.thMode} title="✓ = already counted in spending  |  unchecked = add-on">Included</th>
                  <th className={styles.thDel} />
                </tr>
              </thead>
              <tbody>
                {localItems.map(item => (
                  <tr key={item.id} className={!item.included ? styles.rowAddon : ''}>
                    <td className={styles.tdCat}>
                      <CatIcon emoji={item.emoji} />
                      <span className={styles.catLabel}>{item.label}</span>
                    </td>
                    <td className={styles.tdAmt}>
                      <div className={styles.amtInput}>
                        <span className={styles.amtPrefix}>$</span>
                        <input
                          type="number"
                          className={styles.amtField}
                          value={item.monthly}
                          min={0}
                          step={25}
                          onChange={e => setItem(item.id, 'monthly', Math.max(0, Number(e.target.value)))}
                        />
                      </div>
                    </td>
                    <td className={styles.tdAnnual}>{fmt((item.monthly || 0) * 12)}</td>
                    <td className={styles.tdMode}>
                      <button
                        className={`${styles.includedBtn} ${item.included ? styles.includedOn : styles.includedOff}`}
                        onClick={() => setItem(item.id, 'included', !item.included)}
                        title={item.included ? 'Already in spending — click to mark as add-on' : 'Add-on — click to mark as included'}
                      >
                        {item.included
                          ? <><Icon name="check" size={11} /> Included</>
                          : <><Icon name="plus"  size={11} /> Add-on</>
                        }
                      </button>
                    </td>
                    <td className={styles.tdDel}>
                      <button className={styles.delBtn} onClick={() => removeItem(item.id)} title="Remove category">
                        <Icon name="close" size={11} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className={styles.totalRow}>
                  <td className={styles.totalLabel}>Total</td>
                  <td className={styles.totalAmt}>{fmtM(totalMonthly)}</td>
                  <td className={styles.totalAmt}>{fmt(totalAnnual)}/yr</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Add custom category */}
          <div className={styles.addRow}>
            <input
              className={styles.addInput}
              type="text"
              placeholder="Add a category…"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem()}
              maxLength={40}
            />
            <button className={styles.addBtn} onClick={addItem} disabled={!newLabel.trim()}>
              <Icon name="plus" size={13} /> Add
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <div className={styles.footerLeft}>
            {mode === 'override' && <span className={styles.applyNote}>Will set spending → <strong>{fmt(totalAnnual)}/yr</strong></span>}
            {mode === 'addons'   && addOnMonthly > 0 && <span className={styles.applyNote}>Will add <strong>{fmt(addOnMonthly * 12)}/yr</strong> to spending</span>}
            {mode === 'reference' && <span className={styles.applyNote}>Spending unchanged — budget saved for reference</span>}
          </div>
          <div className={styles.footerBtns}>
            <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button className={styles.applyBtn} onClick={apply}>
              <Icon name="check" size={13} /> Apply
            </button>
          </div>
        </div>

      </div>
    </div>
  )
  return createPortal(content, document.body)
}
