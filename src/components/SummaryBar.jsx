import React, { useState, useRef, useMemo } from 'react'
import { fmt, fmtM, PROVINCE_TAX } from '../lib/engine.js'
import { Icon } from './Icon.jsx'
import styles from './SummaryBar.module.css'

// ─── Sweet-spot spending suggestion ──────────────────────────────────────────
// Binary-search the highest spend that keeps the best scenario's portfolio alive.
// Uses the best scenario's yearData to estimate sustainable withdrawal.
function suggestSpending(results, shared, person) {
  const best = results?.scenarios?.slice().sort((a, b) => {
    const ad = a.result.depletedAge ?? 999, bd = b.result.depletedAge ?? 999
    return bd - ad || b.result.estateValue - a.result.estateValue
  })[0]
  if (!best) return null

  const yearData = best.result?.yearData
  if (!yearData?.length) return null

  const lifeExp   = person.lifeExpectancy
  const retAge    = person.retirementAge
  const years     = lifeExp - retAge
  const postRate  = shared.postReturnRate / 100
  const inflation = shared.inflationRate  / 100

  // Average annual government + guaranteed income across the plan
  const avgGovIncome = yearData.reduce((s, y) =>
    s + (y.cppAnn||0) + (y.oasAnn||0) + (y.gisAnn||0)
      + (y.dbAnnual||0) + (y.revMortIncome||0)
      + (y.provSupplement||0) + (y.otherAnnual||0), 0) / yearData.length

  // Starting portfolio
  const pool = results.projAtRet ?? 0
  if (pool <= 0) return null

  // Binary search: highest spend where portfolio survives to lifeExp
  // Simplified: real annuity formula with inflation-adjusted withdrawal
  // PV of inflation-growing withdrawals = pool + PV of gov income
  // withdrawal * [ (1-(1+r)^-n) / (r-g) ] ≈ pool + avgGov * PV factor
  // Use the existing yearData: scale spending proportionally
  const currentSpend = shared.annualSpending

  // Find the gap-filling capacity: pool / PV annuity factor (inflation-adjusted)
  const r = postRate, g = inflation
  const pvFactor = r !== g
    ? (1 - Math.pow((1 + g) / (1 + r), years)) / (r - g)
    : years / (1 + r)

  // Portfolio can sustain this much annual withdrawal (year-1 dollars)
  const portfolioCapacity = pvFactor > 0 ? pool / pvFactor : 0
  const sustainableSpend  = Math.round((portfolioCapacity + avgGovIncome) / 1000) * 1000

  // Clamp: between 60% and 200% of current spend, and minimum $20k
  const minSuggest = Math.max(20000, currentSpend * 0.6)
  const maxSuggest = currentSpend * 2
  const clamped = Math.max(minSuggest, Math.min(maxSuggest, sustainableSpend))

  const diff = clamped - currentSpend
  const pctDiff = Math.round(diff / currentSpend * 100)

  return {
    amount: clamped,
    portfolioCapacity,
    avgGovIncome,
    diff,
    pctDiff,
    // Label to explain the suggestion
    label: Math.abs(pctDiff) < 3
      ? 'Your current spending is right at the sustainable sweet spot.'
      : diff > 0
      ? `You could afford ${fmt(clamped)}/yr — ${pctDiff}% more than your current target.`
      : `Reducing to ${fmt(clamped)}/yr would better protect your portfolio longevity.`,
    tone: Math.abs(pctDiff) < 5 ? 'good' : diff > 0 ? 'good' : 'warn',
  }
}

export function SummaryBar({ results, shared, person, spouse, propertyState, setShField, onRecalculate }) {
  const { totalToday, projAtRet, coupleMode, totalTodayP, totalTodayS } = results
  const growth    = projAtRet - totalToday
  const growthPct = totalToday > 0 ? Math.round((projAtRet / totalToday - 1) * 100) : 0
  const provinceName = PROVINCE_TAX[shared.province]?.name || shared.province

  const retAge = person.retirementAge
  const inRetirementEvents = []
  if (shared.windfall > 0 && shared.windfallAge > retAge)
    inRetirementEvents.push(`+${fmtM(shared.windfall)} windfall at ${shared.windfallAge}`)
  if (shared.homeEnabled && shared.homeDownsizeAge > retAge) {
    const proceeds = Math.round(shared.homeValue * (shared.homeKeepPct / 100))
    inRetirementEvents.push(`+${fmtM(proceeds)} home at ${shared.homeDownsizeAge}`)
  }
  if (propertyState && !propertyState._wizard && propertyState.sellEnabled && propertyState.sellAge > retAge)
    inRetirementEvents.push(`+property sale at ${propertyState.sellAge}`)
  const projSub = inRetirementEvents.length > 0
    ? `+${fmtM(growth)} growth · ${inRetirementEvents.join(' · ')} applied in retirement`
    : `+${fmtM(growth)} growth (${growthPct}%)`

  const propCashflow    = propertyState && !propertyState._wizard && propertyState.retireContribMode !== 'none' && propertyState.retireContribMode
  const propSellEnabled = propertyState?.sellEnabled && !propertyState?._wizard
  const propMonthlyShown = results?.propMonthlyContrib > 0 ? results.propMonthlyContrib : 0

  const suggestion = useMemo(() => suggestSpending(results, shared, person), [results, shared, person])

  // Editor state
  const [editingSpend, setEditingSpend] = useState(false)
  const [spendRaw, setSpendRaw]         = useState('')
  const [showSuggest, setShowSuggest]   = useState(false)
  const spendRef = useRef(null)

  const applySpend = (v) => {
    const n = typeof v === 'number' ? v : parseInt(String(v).replace(/[^0-9]/g, ''), 10)
    if (!isNaN(n) && n > 0) {
      setShField('annualSpending', n)
      if (onRecalculate) onRecalculate()
    }
  }

  const startEdit = () => {
    setSpendRaw(String(shared.annualSpending))
    setEditingSpend(true)
    setShowSuggest(false)
    setTimeout(() => { spendRef.current?.focus(); spendRef.current?.select() }, 0)
  }

  const commitEdit = () => {
    applySpend(spendRaw)
    setEditingSpend(false)
  }

  const onKey = e => {
    if (e.key === 'Enter')  commitEdit()
    if (e.key === 'Escape') setEditingSpend(false)
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSpendRaw(v => String((parseInt(v||'0') + 1000))) }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSpendRaw(v => String(Math.max(1000, parseInt(v||'0') - 1000))) }
  }

  const step = (delta) => {
    const cur = editingSpend ? parseInt(spendRaw||'0') : shared.annualSpending
    const next = Math.max(1000, Math.round((cur + delta) / 1000) * 1000)
    if (editingSpend) {
      setSpendRaw(String(next))
    } else {
      applySpend(next)
    }
  }

  const cards = [
    { label: 'Province', value: shared.province, sub: provinceName },
    {
      label: coupleMode ? 'Household assets today' : 'Total assets today',
      value: fmtM(totalToday),
      sub: coupleMode ? `P1: ${fmtM(totalTodayP)} · P2: ${fmtM(results.totalTodayS)}` : 'RRSP + TFSA + non-reg',
    },
    { label: 'Projected at retirement', value: fmtM(projAtRet), sub: projSub, accent: true },
  ]

  return (
    <div>
      <div className={styles.bar}>
        {cards.map((c, i) => (
          <div key={i} className={`${styles.card} ${c.accent ? styles.accent : ''}`}>
            <div className={styles.label}>{c.label}</div>
            <div className={styles.value}>{c.value}</div>
            <div className={styles.sub}>{c.sub}</div>
          </div>
        ))}

        {/* Editable spending card */}
        <div className={`${styles.card} ${styles.spendCard} ${editingSpend ? styles.spendCardActive : ''}`}>

          {/* Label row */}
          <div className={styles.spendLabelRow}>
            <span className={styles.label}>Annual spending target</span>
            <div className={styles.spendActions}>
              {suggestion && (
                <button
                  className={`${styles.suggestBtn} ${showSuggest ? styles.suggestBtnOn : ''}`}
                  onClick={() => setShowSuggest(s => !s)}
                  title="Suggest optimal spending based on your plan"
                >
                  <Icon name="fire" size={10} />
                  Suggest
                </button>
              )}
              <button className={styles.editIconBtn} onClick={startEdit} title="Edit spending">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Value row: − | value/input | + */}
          <div className={styles.spendStepper}>
            <button
              className={styles.stepBtn}
              onMouseDown={e => { e.preventDefault(); step(-1000) }}
              tabIndex={-1}
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><rect x="2" y="6" width="10" height="2" rx="1" fill="currentColor"/></svg>
            </button>

            <div className={styles.spendValueArea} onClick={!editingSpend ? startEdit : undefined}>
              {editingSpend ? (
                <input
                  ref={spendRef}
                  className={styles.spendInput}
                  type="number"
                  value={spendRaw}
                  onChange={e => setSpendRaw(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={onKey}
                  min={1000} step={1000}
                />
              ) : (
                <span className={styles.spendValue}>{fmt(shared.annualSpending)}</span>
              )}
            </div>

            <button
              className={styles.stepBtn}
              onMouseDown={e => { e.preventDefault(); step(+1000) }}
              tabIndex={-1}
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><rect x="2" y="6" width="10" height="2" rx="1" fill="currentColor"/><rect x="6" y="2" width="2" height="10" rx="1" fill="currentColor"/></svg>
            </button>
          </div>

          {/* Sub / hint */}
          {editingSpend ? (
            <div className={styles.spendHint}>Enter · Apply &nbsp;|&nbsp; Esc · Cancel &nbsp;|&nbsp; ↑↓ $1k steps</div>
          ) : (
            <div className={styles.sub}>{coupleMode ? 'combined household' : "today's dollars"} · ±$1k steps</div>
          )}

          {/* Suggestion panel */}
          {showSuggest && suggestion && (
            <div className={`${styles.suggestPanel} ${styles['suggestPanel_' + suggestion.tone]}`}>
              <div className={styles.suggestLabel}>{suggestion.label}</div>
              <div className={styles.suggestDetail}>
                Portfolio supports <strong>{fmt(suggestion.portfolioCapacity)}/yr</strong> withdrawal
                + avg <strong>{fmt(suggestion.avgGovIncome)}/yr</strong> govt income
              </div>
              {Math.abs(suggestion.diff) >= 500 && (
                <button
                  className={styles.suggestApply}
                  onClick={() => { applySpend(suggestion.amount); setShowSuggest(false) }}
                >
                  Apply {fmt(suggestion.amount)}/yr
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Banners */}
      {propertyState && !propertyState._wizard && (
        <div className={styles.propertyBanner}>
          <Icon name='property' size={14} />
          <span className={styles.propText}>
            <strong>Commercial property active</strong>
            {propCashflow && propCashflow !== 'none' && propMonthlyShown > 0 && (
              <> · <strong>{fmt(propMonthlyShown)}/mo</strong> property cash flow added to retirement savings</>
            )}
            {propCashflow && propCashflow !== 'none' && propMonthlyShown <= 0 && (
              <> · Cash flow selected but property not yet cash-flow positive</>
            )}
            {propSellEnabled && <> · Sell at age {propertyState.sellAge} proceeds added to portfolio</>}
          </span>
        </div>
      )}
      {results.primaryHomeEquity > 0 && (
        <div className={styles.homeBanner}>
          <Icon name='residence' size={14} />
          <span className={styles.propText}>
            <strong>Primary residence equity: {fmtM(results.primaryHomeEquity)}</strong> contributes to estate value
            {shared.reverseMortgageEnabled && <> · Reverse mortgage {fmt(shared.reverseMortgageMonthly)}/mo adds to retirement income</>}
          </span>
        </div>
      )}
    </div>
  )
}
