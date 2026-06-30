import React, { useState, useRef } from 'react'
import styles from './NumericInput.module.css'

/**
 * NumericInput — replaces all StepInput variants across the app.
 * 
 * Features:
 * - Displays formatted value with thousands separators (read mode)
 * - Switches to raw numeric input on focus (edit mode)  
 * - Large +/– buttons on opposite sides (safe from finger-obscuring)
 * - Full-width on mobile; compact variant for sidebar
 * - prefix ($) shown inline with the formatted value
 */
export function NumericInput({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  prefix = '',
  suffix = '',
  compact = false,   // compact = sidebar style; false = card/tab style
}) {
  const [editing, setEditing] = useState(false)
  const [raw, setRaw] = useState('')
  const inputRef = useRef(null)

  const clamp = v => {
    if (min != null && v < min) v = min
    if (max != null && v > max) v = max
    return v
  }

  const dec = e => { e.stopPropagation(); onChange(clamp(+(value - step).toFixed(4))) }
  const inc = e => { e.stopPropagation(); onChange(clamp(+(value + step).toFixed(4))) }

  const startEdit = () => {
    setRaw(String(value))
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  const commitEdit = () => {
    const v = parseFloat(raw.replace(/,/g, ''))
    if (!isNaN(v)) onChange(clamp(v))
    setEditing(false)
  }

  const onKey = e => {
    if (e.key === 'Enter' || e.key === 'Tab') commitEdit()
    if (e.key === 'Escape') setEditing(false)
    if (e.key === 'ArrowUp')   { e.preventDefault(); onChange(clamp(+(value + step).toFixed(4))) }
    if (e.key === 'ArrowDown') { e.preventDefault(); onChange(clamp(+(value - step).toFixed(4))) }
  }

  // Format value for display
  const formatted = (() => {
    const n = Number(value)
    if (isNaN(n)) return String(value)
    // Use locale formatting for thousands separators
    if (Number.isInteger(n) || step >= 1) {
      return Math.round(n).toLocaleString('en-CA')
    }
    return n.toFixed(2)
  })()

  const displayLabel = `${prefix}${formatted}${suffix}`

  return (
    <div className={`${styles.wrap} ${compact ? styles.compact : styles.full}`}>
      <button
        className={styles.btn}
        onClick={dec}
        type="button"
        aria-label="Decrease"
        tabIndex={-1}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <rect x="2" y="6" width="10" height="2" rx="1" fill="currentColor"/>
        </svg>
      </button>

      <div className={styles.valueArea} onClick={startEdit}>
        {editing ? (
          <input
            ref={inputRef}
            className={styles.editInput}
            type="number"
            value={raw}
            onChange={e => setRaw(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={onKey}
            step={step}
          />
        ) : (
          <span className={styles.displayVal}>{displayLabel}</span>
        )}
      </div>

      <button
        className={styles.btn}
        onClick={inc}
        type="button"
        aria-label="Increase"
        tabIndex={-1}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <rect x="2" y="6" width="10" height="2" rx="1" fill="currentColor"/>
          <rect x="6" y="2" width="2" height="10" rx="1" fill="currentColor"/>
        </svg>
      </button>
    </div>
  )
}
