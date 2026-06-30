import React, { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { solveWorkBackwards, fmt, fmtM } from '../lib/engine.js'
import styles from './WorkBackwards.module.css'

function StepInput({ value, onChange, min = 0, max, step = 1, prefix = '' }) {
  const dec = () => onChange(Math.max(min ?? -Infinity, +(value - step).toFixed(2)))
  const inc = () => onChange(max != null ? Math.min(max, +(value + step).toFixed(2)) : +(value + step).toFixed(2))
  const display = prefix
    ? prefix + (value >= 1000 ? Math.round(value).toLocaleString('en-CA') : value)
    : (value >= 1000 ? Math.round(value).toLocaleString('en-CA') : value)
  return (
    <div className={styles.stepWrap}>
      <button className={styles.stepBtn} onClick={dec} type="button">−</button>
      <span className={styles.stepVal}>{display}</span>
      <button className={styles.stepBtn} onClick={inc} type="button">+</button>
    </div>
  )
}

function GoalInput({ label, sub, children, synced }) {
  return (
    <div className={`${styles.goalField} ${synced ? styles.goalSynced : ''}`}>
      {synced && <span className={styles.syncBadge}>synced</span>}
      <div className={styles.goalLabel}>{label}</div>
      {sub && <div className={styles.goalSub}>{sub}</div>}
      {children}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.tooltip}>
      <div className={styles.tipAge}>Age {label}</div>
      {payload.map((p, i) => (
        <div key={i} className={styles.tipRow} style={{ color: p.color }}>
          <span>{p.name}</span><span>${p.value}k</span>
        </div>
      ))}
    </div>
  )
}

export function WorkBackwards({ person, spouse, shared }) {
  // Only targetEstate is truly local — everything else syncs from the left panel
  // but can be overridden locally for "what-if" exploration.
  const [overrides, setOverrides] = useState({})
  const [targetEstate, setTargetEstate] = useState(0)
  const [solved, setSolved] = useState(false)

  // Effective values: local override wins, otherwise panel value
  const targetSpending = overrides.spending     ?? shared.annualSpending
  const targetRetAge   = overrides.retAge       ?? person.retirementAge
  const lifeExp        = overrides.lifeExp      ?? person.lifeExpectancy
  const targetCPP      = overrides.cpp          ?? (person.cppMonthly65 + (shared.coupleMode ? spouse.cppMonthly65 : 0))

  const setOverride = (key, val) => {
    setOverrides(prev => ({ ...prev, [key]: val }))
    setSolved(false)
  }

  const resetOverride = (key) => {
    setOverrides(prev => { const n = { ...prev }; delete n[key]; return n })
    setSolved(false)
  }

  // Are any fields overridden from panel?
  const isSynced = (key) => !(key in overrides)

  const totalCurrentAssets = person.rrsp + person.tfsa + person.nonReg +
    (shared.coupleMode ? spouse.rrsp + spouse.tfsa + spouse.nonReg : 0)
  const totalMonthlyContrib = person.monthlyContrib +
    (shared.coupleMode ? spouse.monthlyContrib : 0)

  const result = useMemo(() => {
    if (!solved) return null
    return solveWorkBackwards({
      targetSpending,
      targetRetirementAge: targetRetAge,
      targetEstateValue:   targetEstate,
      lifeExpectancy:      lifeExp,
      currentAge:          person.currentAge,
      // Pass combined assets when couple mode is on — solver works on household totals
      currentRRSP:         person.rrsp + (shared.coupleMode ? spouse.rrsp : 0),
      currentTFSA:         person.tfsa + (shared.coupleMode ? spouse.tfsa : 0),
      currentNonReg:       person.nonReg + (shared.coupleMode ? spouse.nonReg : 0),
      currentMonthlyContrib: totalMonthlyContrib,
      cppMonthly65:        targetCPP,
      oasStartAge:         person.oasStartAge,
      preReturnRate:       shared.preReturnRate,
      postReturnRate:      shared.postReturnRate,
      inflationRate:       shared.inflationRate,
      province:            shared.province,
    })
  }, [solved, targetSpending, targetRetAge, targetEstate, lifeExp, targetCPP, person, spouse, shared])

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Work backwards</h2>
          <p className={styles.subtitle}>
            Values sync from your left panel — adjust any goal here for what-if exploration
          </p>
        </div>
      </div>

      <div className={styles.body}>
        {/* Sync notice */}
        <div className={styles.syncNotice}>
          <span className={styles.syncDot} />
          Synced from left panel: age {person.currentAge}{shared.coupleMode ? ' (couple mode)' : ''}, retire at {person.retirementAge},
          life expectancy {person.lifeExpectancy}, spending ${shared.annualSpending.toLocaleString('en-CA')}/yr.
          {Object.keys(overrides).length > 0 && (
            <button className={styles.resetOverridesBtn} onClick={() => { setOverrides({}); setSolved(false) }}>
              Reset to panel values
            </button>
          )}
        </div>

        {/* Goal inputs */}
        <div className={styles.goalGrid}>
          <GoalInput
            label="Target retirement spending"
            sub="Annual household (today's dollars)"
            synced={isSynced('spending')}
          >
            <div className={styles.inputRow}>
              <StepInput value={targetSpending}
                onChange={v => setOverride('spending', v)}
                min={10000} step={2500} prefix="$" />
              {!isSynced('spending') && (
                <button className={styles.syncBtn} onClick={() => resetOverride('spending')} title="Reset to panel value">↺</button>
              )}
            </div>
          </GoalInput>

          <GoalInput
            label="Target retirement age"
            sub="When you want to stop working"
            synced={isSynced('retAge')}
          >
            <div className={styles.inputRow}>
              <StepInput value={targetRetAge}
                onChange={v => setOverride('retAge', v)}
                min={45} max={80} step={1} />
              {!isSynced('retAge') && (
                <button className={styles.syncBtn} onClick={() => resetOverride('retAge')} title="Reset to panel value">↺</button>
              )}
            </div>
          </GoalInput>

          <GoalInput
            label="Life expectancy"
            sub="How long the plan must last"
            synced={isSynced('lifeExp')}
          >
            <div className={styles.inputRow}>
              <StepInput value={lifeExp}
                onChange={v => setOverride('lifeExp', v)}
                min={70} max={105} step={1} />
              {!isSynced('lifeExp') && (
                <button className={styles.syncBtn} onClick={() => resetOverride('lifeExp')} title="Reset to panel value">↺</button>
              )}
            </div>
          </GoalInput>

          <GoalInput
            label="Target estate value"
            sub="Desired balance at end (0 = just survive)"
          >
            <StepInput value={targetEstate}
              onChange={v => { setTargetEstate(v); setSolved(false) }}
              min={0} step={25000} prefix="$" />
          </GoalInput>
        </div>

        {/* Context chips */}
        <div className={styles.currentRow}>
          <div className={styles.currentChip}>
            <span className={styles.chipLabel}>Current assets</span>
            <span className={styles.chipVal}>{fmtM(totalCurrentAssets)}</span>
          </div>
          <div className={styles.currentChip}>
            <span className={styles.chipLabel}>Current monthly savings</span>
            <span className={styles.chipVal}>{fmt(totalMonthlyContrib)}/mo</span>
          </div>
          <div className={styles.currentChip}>
            <span className={styles.chipLabel}>Current age</span>
            <span className={styles.chipVal}>{person.currentAge}</span>
          </div>
          <div className={styles.currentChip}>
            <span className={styles.chipLabel}>Years to retirement</span>
            <span className={styles.chipVal}>{Math.max(0, targetRetAge - person.currentAge)} yrs</span>
          </div>
        </div>

        <button className={styles.solveBtn} onClick={() => setSolved(true)}>
          Solve for required savings →
        </button>

        {/* Results */}
        {result && (
          <>
            {result.impossible ? (
              <div className={styles.impossibleBox}>
                <div className={styles.impossibleIcon}>⚠️</div>
                <div>
                  <strong>This goal isn't achievable even at $20,000/month in contributions.</strong>
                  <p>Try increasing your retirement age, reducing target spending, or extending your planning horizon.</p>
                </div>
              </div>
            ) : (
              <>
                <div className={styles.resultGrid}>
                  <ResultCard
                    label="Required monthly savings"
                    value={fmt(result.solvedContrib) + '/mo'}
                    sub={result.extraMonthlyNeeded > 0
                      ? `+${fmt(result.extraMonthlyNeeded)}/mo more than today`
                      : 'Your current savings are sufficient'}
                    tone={result.extraMonthlyNeeded > 0 ? 'warn' : 'good'}
                    big
                  />
                  <ResultCard
                    label="Required portfolio at retirement"
                    value={fmtM(result.solvedProjAtRet)}
                    sub={`vs ${fmtM(result.projAtRetCurrent)} on current path`}
                    tone={result.solvedProjAtRet > result.projAtRetCurrent ? 'warn' : 'good'}
                  />
                  <ResultCard
                    label="Alternative: lump sum today"
                    value={result.requiredLumpSum > 0 ? fmtM(result.requiredLumpSum) : 'Not needed'}
                    sub="One-time top-up instead of higher monthly savings"
                    tone="neutral"
                  />
                  <ResultCard
                    label="Projected estate"
                    value={fmtM(result.solvedEstate)}
                    sub={`at age ${lifeExp}`}
                    tone={result.solvedEstate >= targetEstate ? 'good' : 'warn'}
                  />
                </div>

                <div className={`${styles.pathBox} ${result.currentSurvives ? styles.pathGood : styles.pathBad}`}>
                  <div className={styles.pathIcon}>{result.currentSurvives ? '✓' : '✗'}</div>
                  <div>
                    {result.currentSurvives ? (
                      <>
                        <strong>Your current savings already fund this goal.</strong>
                        {' '}On your current path of {fmt(result.currentMonthlyContrib)}/mo, the portfolio
                        survives to age {lifeExp} with an estate of {fmtM(result.currentEstate)}.
                        {result.extraMonthlyNeeded === 0 && ' No additional savings are required.'}
                      </>
                    ) : (
                      <>
                        <strong>Your current savings fall short.</strong>
                        {' '}On your current path of {fmt(result.currentMonthlyContrib)}/mo, the portfolio
                        would be depleted at age {result.currentDepletedAge} —{' '}
                        {result.currentDepletedAge - targetRetAge} years into retirement.
                        You need an additional {fmt(result.extraMonthlyNeeded)}/mo to fund this goal.
                      </>
                    )}
                  </div>
                </div>

                <div className={styles.chartSection}>
                  <div className={styles.chartTitle}>Portfolio balance comparison</div>
                  <div className={styles.chartLegend}>
                    <span><span className={styles.legendDot} style={{ background: '#94A3B8' }} />Current path</span>
                    <span><span className={styles.legendDot} style={{ background: '#1D9E75' }} />Required path</span>
                    {targetEstate > 0 && <span><span className={styles.legendDash} />Target estate</span>}
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={result.comparisonData} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-10)" />
                      <XAxis dataKey="age" tick={{ fontSize: 11, fill: 'var(--gray-40)' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--gray-40)' }} tickFormatter={v => Math.abs(v) >= 1000 ? `$${(v/1000).toFixed(1)}M` : `$${v}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="current" name="Current path"
                        stroke="#94A3B8" strokeWidth={2} strokeDasharray="5 3" dot={false} activeDot={{ r: 3 }} />
                      <Line type="monotone" dataKey="target" name="Required path"
                        stroke="#1D9E75" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                      {targetEstate > 0 && (
                        <ReferenceLine y={Math.round(targetEstate / 1000)}
                          stroke="#D85A30" strokeDasharray="4 2" strokeWidth={1.5}
                          label={{ value: 'Target estate', position: 'insideTopRight', fontSize: 10, fill: '#D85A30' }} />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className={styles.actionsBox}>
                  <div className={styles.actionsTitle}>What to do next</div>
                  <div className={styles.actionsList}>
                    {result.extraMonthlyNeeded > 0 && (
                      <div className={styles.action}>
                        <span className={styles.actionNum}>1</span>
                        <div>
                          <strong>Increase monthly savings by {fmt(result.extraMonthlyNeeded)}</strong>
                          <p>Bringing total contributions to {fmt(result.solvedContrib)}/mo. Prioritise TFSA first (tax-free growth), then RRSP (deduction now, taxable later).</p>
                        </div>
                      </div>
                    )}
                    {result.requiredLumpSum > 0 && (
                      <div className={styles.action}>
                        <span className={styles.actionNum}>{result.extraMonthlyNeeded > 0 ? '2' : '1'}</span>
                        <div>
                          <strong>Or invest a lump sum of {fmtM(result.requiredLumpSum)} today</strong>
                          <p>Equivalent to the higher monthly savings over {Math.max(0, targetRetAge - person.currentAge)} years of compounding.</p>
                        </div>
                      </div>
                    )}
                    {result.currentSurvives && result.extraMonthlyNeeded === 0 && (
                      <div className={styles.action}>
                        <span className={styles.actionNum} style={{ background: 'var(--teal)' }}>✓</span>
                        <div>
                          <strong>You're on track</strong>
                          <p>Your current savings of {fmt(result.currentMonthlyContrib)}/mo are sufficient. Use the Scenarios tab to explore withdrawal strategies and tax optimisation.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ResultCard({ label, value, sub, tone, big }) {
  return (
    <div className={`${styles.resultCard} ${styles['tone_' + tone]}`}>
      <div className={styles.rcLabel}>{label}</div>
      <div className={`${styles.rcValue} ${big ? styles.rcBig : ''}`}>{value}</div>
      {sub && <div className={styles.rcSub}>{sub}</div>}
    </div>
  )
}
