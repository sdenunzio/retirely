import React, { useState } from 'react'
import { fmt, fmtM } from '../lib/engine.js'
import { ScenarioModal } from './ScenarioModal.jsx'
import { Icon } from './Icon.jsx'
import styles from './ScenarioCards.module.css'

function DepletionBar({ depletedAge, retAge, lifeExp, color }) {
  const pct = depletedAge
    ? Math.round((depletedAge - retAge) / (lifeExp - retAge) * 100)
    : 100
  return (
    <div className={styles.barTrack}>
      <div className={styles.barFill} style={{ width: `${pct}%`, background: depletedAge ? 'var(--danger)' : color }} />
    </div>
  )
}

export function ScenarioCards({ scenarios, shared, person, results, onViewDrawdown }) {
  const [activeModal, setActiveModal] = useState(null)

  const ranked = [...scenarios].sort((a, b) => {
    const ad = a.result.depletedAge ?? 999
    const bd = b.result.depletedAge ?? 999
    return bd - ad || b.result.estateValue - a.result.estateValue
  })
  const bestId = ranked[0]?.id
  const retAge = person.retirementAge
  const lifeExp = person.lifeExpectancy

  return (
    <>
      <div className={styles.grid}>
        {scenarios.map(s => {
          const r = s.result
          const isBest = s.id === bestId
          const survived = !r.depletedAge
          return (
            <div key={s.id} className={`${styles.card} ${isBest ? styles.best : ''}`} style={{ '--accent': s.color }}>
              <div className={styles.topRow}>
                <div className={styles.stratIcon} style={{ color: s.color, border: `1.5px solid ${s.color}40` }}>
                  {s.id === 'standard' && <Icon name="oas65"      size={14} />}
                  {s.id === 'early'    && <Icon name="fire"        size={14} />}
                  {s.id === 'delay'    && <Icon name="oas70"       size={14} />}
                  {s.id === 'gis'     && <Icon name="government" size={14} />}
                </div>
                <span className={styles.name}>{s.label}</span>
                {isBest && <span className={styles.bestBadge}>Best</span>}
                <button
                  className={styles.helpBtn}
                  onClick={() => setActiveModal(s)}
                  title="Explain this strategy"
                  aria-label={`Explain ${s.label} strategy`}
                >
                  <Icon name='help' size={13} />
                </button>
              </div>
              <p className={styles.desc}>{s.description}</p>

              <div className={styles.metrics}>
                <Metric label="Start pool"      value={fmtM(r.projAtRet)} />
                <Metric label="First yr income" value={fmt(r.firstYearIncome)} />
                <Metric label="Assets @ 70"     value={r.age70Assets != null ? fmtM(r.age70Assets) : '—'} />
                <Metric label="Assets @ 85"     value={r.age85Assets != null ? fmtM(r.age85Assets) : '—'} color={r.age85Assets > 0 ? 'good' : 'bad'} />
                <Metric label="Est. tax paid"   value={fmtM(r.totalTax)} />
                {r.incomeSplitSaving > 500 && (
                  <Metric label="Split saving"  value={fmtM(r.incomeSplitSaving)} color="good" />
                )}
                <Metric label="Estate value"
                value={fmtM(r.estateValue + (results?.primaryHomeEquity || 0))}
                sub={results?.primaryHomeEquity > 0 ? `incl. ${fmtM(results.primaryHomeEquity)} home equity` : null}
                color={(r.estateValue + (results?.primaryHomeEquity || 0)) > 0 ? 'good' : 'neutral'} />
              </div>

              <div className={styles.longevity}>
                <span className={styles.longevityLabel}>Longevity</span>
                <span className={`${styles.longevityVal} ${survived ? styles.survived : styles.depleted}`}>
                  {survived ? `Survives to ${lifeExp}` : `Depleted at ${r.depletedAge}`}
                </span>
              </div>
              <DepletionBar depletedAge={r.depletedAge} retAge={retAge} lifeExp={lifeExp} color={s.color} />

              {onViewDrawdown && (
                <button
                  className={styles.drawdownBtn}
                  onClick={() => onViewDrawdown(scenarios.indexOf(s))}
                >
                  <Icon name="drawdown" size={13} />
                  View drawdown table
                  <Icon name="chevronRight" size={13} />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {activeModal && (
        <ScenarioModal scenario={activeModal} onClose={() => setActiveModal(null)} />
      )}
    </>
  )
}

function Metric({ label, value, sub, color }) {
  return (
    <div className={styles.metric}>
      <span className={styles.mLabel}>{label}{sub && <span style={{fontSize:10,color:'var(--gray-40)',marginLeft:4}}>{sub}</span>}</span>
      <span className={`${styles.mVal} ${color === 'good' ? styles.good : color === 'bad' ? styles.bad : ''}`}>
        {value}
      </span>
    </div>
  )
}
