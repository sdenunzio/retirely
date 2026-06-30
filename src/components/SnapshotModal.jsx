import React, { useMemo } from 'react'
import { Icon } from './Icon.jsx'
import { PROV_SUPPLEMENTS } from '../lib/engine.js'
import styles from './SnapshotModal.module.css'

const fmt  = n => n == null || !isFinite(n) ? '—' : '$' + Math.round(n).toLocaleString('en-CA')
const fmtM = n => {
  if (n == null || !isFinite(n)) return '—'
  if (Math.abs(n) >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M'
  if (Math.abs(n) >= 1000)      return '$' + Math.round(n / 1000) + 'k'
  return '$' + Math.round(n)
}

function StatusChip({ ok, warn, label }) {
  const tone = ok ? 'good' : warn ? 'warn' : 'bad'
  const icon = ok ? 'check' : 'warning'
  return (
    <span className={`${styles.chip} ${styles['chip_' + tone]}`}>
      <Icon name={icon} size={11} />{label}
    </span>
  )
}

function HeroStat({ label, value, sub, tone }) {
  return (
    <div className={styles.heroStat}>
      <div className={`${styles.heroVal} ${tone ? styles['val_' + tone] : ''}`}>{value}</div>
      <div className={styles.heroLabel}>{label}</div>
      {sub && <div className={styles.heroSub}>{sub}</div>}
    </div>
  )
}

function Row({ icon, label, value, sub, tone, accent }) {
  return (
    <div className={`${styles.row} ${accent ? styles.rowAccent : ''}`}>
      <div className={styles.rowIcon}><Icon name={icon} size={14} /></div>
      <div className={styles.rowBody}>
        <div className={styles.rowLabel}>{label}</div>
        {sub && <div className={styles.rowSub}>{sub}</div>}
      </div>
      <div className={`${styles.rowVal} ${tone ? styles['val_' + tone] : ''}`}>{value}</div>
    </div>
  )
}

function Divider({ label }) {
  return (
    <div className={styles.divider}><span>{label}</span></div>
  )
}

export function SnapshotPanel({ results, person, spouse, shared, propertyState }) {
  const best = useMemo(() => {
    if (!results?.scenarios?.length) return null
    return [...results.scenarios].sort((a, b) => {
      const ad = a.result.depletedAge ?? 999, bd = b.result.depletedAge ?? 999
      return bd - ad || b.result.estateValue - a.result.estateValue
    })[0]
  }, [results])

  if (!results || !best) return null

  const r          = best.result
  const fire       = results.fire
  const coupleMode = results.coupleMode
  const lifeExp    = person.lifeExpectancy
  const retAge     = person.retirementAge
  const yearsToRet = Math.max(0, retAge - person.currentAge)
  const yearsInRet = Math.max(0, lifeExp - retAge)
  const survived   = !r.depletedAge
  const totalEstate = (r.estateValue ?? 0) + (results.primaryHomeEquity ?? 0)

  // ── Practical metrics ──────────────────────────────────────────────
  const firstYearIncome  = r.firstYearIncome ?? 0
  const monthlyIncome    = Math.round(firstYearIncome / 12)
  const monthlySpend     = Math.round(shared.annualSpending / 12)
  const incomeVsSpend    = shared.annualSpending > 0
    ? Math.round(firstYearIncome / shared.annualSpending * 100) : 0
  const gap              = monthlyIncome - monthlySpend
  const longevityYrs     = survived ? yearsInRet : Math.max(0, (r.depletedAge ?? retAge) - retAge)

  // Government income
  const cppOasAnnual = (person.cppMonthly65 + (coupleMode ? (spouse?.cppMonthly65 ?? 0) : 0)) * 12
    + 8618 * (coupleMode ? 2 : 1)

  // Overall status
  const onTrack     = survived && incomeVsSpend >= 90
  const almostThere = survived && incomeVsSpend >= 70
  const needsWork   = !survived || incomeVsSpend < 70

  // Verdict
  const verdict = (() => {
    if (!survived)
      return `Your plan runs short at age ${r.depletedAge}, leaving ${lifeExp - r.depletedAge} years underfunded. Deferring CPP/OAS or increasing savings would close the gap.`
    if (incomeVsSpend >= 100)
      return `Your retirement income of ${fmt(firstYearIncome)}/yr fully covers your ${fmt(shared.annualSpending)} spending target — with ${fmtM(gap * 12)}/yr to spare.`
    if (incomeVsSpend >= 80)
      return `You cover ${incomeVsSpend}% of your spending target. A small gap of ${fmt(Math.abs(gap))}/mo exists early in retirement before CPP/OAS reach full swing.`
    return `Your projected income covers ${incomeVsSpend}% of your ${fmt(shared.annualSpending)}/yr spending target. Consider adjusting your timeline or increasing savings.`
  })()

  // Savings rate
  const monthlyTotal = person.monthlyContrib + (coupleMode ? (spouse?.monthlyContrib ?? 0) : 0)
  const incomeTotal  = (person.annualIncome ?? 0) + (coupleMode ? (spouse?.annualIncome ?? 0) : 0)
  const savingsRate  = incomeTotal > 0 ? Math.round(monthlyTotal * 12 / incomeTotal * 100) : null

  // FIRE
  const fireProgress = Math.min(100, Math.round(fire?.progress ?? 0))
  const fireAge      = fire?.fireAge

  return (
    <div className={styles.panel}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Icon name="review" size={15} style={{ color: 'var(--teal)' }} />
            <div>
              <div className={styles.headerTitle}>Snapshot</div>
              <div className={styles.headerSub}>{best.label}</div>
            </div>
          </div>
        </div>

        <div className={styles.body}>

          {/* Verdict */}
          <div className={`${styles.verdictBanner} ${styles['verdict_' + (onTrack ? 'good' : almostThere ? 'warn' : 'bad')]}`}>
            <StatusChip ok={onTrack} warn={almostThere}
              label={onTrack ? 'On track' : almostThere ? 'Needs attention' : 'Action required'} />
            <p className={styles.verdictText}>{verdict}</p>
          </div>

          {/* ── HERO: The 3 numbers that matter ── */}
          <div className={styles.heroGrid}>
            <HeroStat
              label="Monthly income"
              value={`$${monthlyIncome.toLocaleString('en-CA')}`}
              sub={`vs $${monthlySpend.toLocaleString('en-CA')} target`}
              tone={incomeVsSpend >= 90 ? 'good' : incomeVsSpend >= 70 ? 'warn' : 'bad'}
            />
            <HeroStat
              label={survived ? 'Plan lasts' : 'Runs out'}
              value={survived ? `${longevityYrs} yrs` : `Age ${r.depletedAge}`}
              sub={survived ? `To age ${lifeExp}` : `${lifeExp - r.depletedAge} yrs short`}
              tone={survived ? 'good' : 'bad'}
            />
            <HeroStat
              label="Total estate"
              value={fmtM(totalEstate)}
              sub={results.primaryHomeEquity > 0 ? `incl. ${fmtM(results.primaryHomeEquity)} home` : `At age ${lifeExp}`}
              tone={totalEstate > 0 ? 'good' : 'bad'}
            />
          </div>

          <Divider label="Income breakdown" />

          {/* Income coverage bar */}
          <div className={styles.coverageBar}>
            <div className={styles.coverageLabels}>
              <span>Income covers</span>
              <span className={incomeVsSpend >= 90 ? styles['val_good'] : incomeVsSpend >= 70 ? styles['val_warn'] : styles['val_bad']}>
                {incomeVsSpend}% of spending
              </span>
            </div>
            <div className={styles.coverageTrack}>
              <div className={styles.coverageFill}
                style={{
                  width: `${Math.min(100, incomeVsSpend)}%`,
                  background: incomeVsSpend >= 90 ? 'var(--teal)' : incomeVsSpend >= 70 ? 'var(--amber)' : 'var(--danger)',
                }}
              />
              <div className={styles.coverageTarget} style={{ left: '100%' }} />
            </div>
            <div className={styles.coverageSubs}>
              <span className={styles['val_good']}>{fmt(firstYearIncome)}/yr income</span>
              <span>target {fmt(shared.annualSpending)}/yr</span>
            </div>
          </div>

          <Row icon="government" label="CPP + OAS"
            value={fmt(cppOasAnnual) + '/yr'}
            sub={`${coupleMode ? 'Combined household' : 'Your'} government income at elected start ages`} />

          {/* Provincial supplement */}
          {(() => {
            const suppDef = PROV_SUPPLEMENTS[shared.province]
            if (!suppDef) return null
            const totalProvSupp = r.yearData?.reduce((sum, y) => sum + (y.provSupplement ?? 0), 0) ?? 0
            if (totalProvSupp < 100) return null
            const firstYearSupp = r.yearData?.find(y => (y.provSupplement ?? 0) > 0)?.provSupplement ?? 0
            return (
              <Row icon="government" label={suppDef.name}
                value={fmt(firstYearSupp) + '/yr'}
                sub={`${shared.province} provincial top-up · income-tested · requires GIS`}
                tone="good" />
            )
          })()}

          {shared.primaryHomeEnabled && shared.reverseMortgageEnabled && (
            <Row icon="residence" label="Reverse mortgage"
              value={fmt(shared.reverseMortgageMonthly * 12) + '/yr'}
              sub={`From age ${shared.reverseMortgageStartAge ?? retAge} · reduces portfolio draw`}
              tone="good" />
          )}
          {/* Other income */}
          {(person.otherIncomeMonthly ?? 0) > 0 && (
            <Row icon="income"
              label={`Other income${shared.coupleMode && (spouse?.otherIncomeMonthly ?? 0) > 0 ? ' (P1)' : ''}`}
              value={fmt((person.otherIncomeMonthly ?? 0) * 12) + '/yr'}
              sub={person.otherIncomeTaxable ? 'Taxable · part-time / gig / rental' : 'Non-taxable'}
              tone="good" />
          )}
          {shared.coupleMode && (spouse?.otherIncomeMonthly ?? 0) > 0 && (
            <Row icon="income"
              label="Other income (P2)"
              value={fmt((spouse.otherIncomeMonthly ?? 0) * 12) + '/yr'}
              sub={spouse.otherIncomeTaxable ? 'Taxable' : 'Non-taxable'}
              tone="good" />
          )}

          {results.propMonthlyContrib > 0 && (
            <Row icon="property" label="Property cash flow"
              value={fmt(results.propMonthlyContrib * 12) + '/yr'}
              sub="Added to savings during accumulation phase"
              tone="good" />
          )}
          {r.incomeSplitSaving > 500 && (
            <Row icon="tax" label="Income split saving"
              value={fmtM(r.incomeSplitSaving)}
              sub="Tax saved via pension income splitting"
              tone="good" />
          )}

          <Divider label="Your savings" />

          <Row icon="assets" label="Total assets today"
            value={fmtM(results.totalToday)}
            sub={`${yearsToRet} years to grow before retirement`} />
          <Row icon="income" label="At retirement"
            value={fmtM(results.projAtRet)}
            sub={`Projected pool at age ${retAge}`}
            tone="good" />
          {savingsRate != null && (
            <Row icon="income" label="Monthly savings"
              value={`$${monthlyTotal.toLocaleString('en-CA')}/mo`}
              sub={`${savingsRate}% of household income${savingsRate >= 15 ? ' · great rate' : savingsRate < 10 ? ' · aim for 15%+' : ''}`}
              tone={savingsRate >= 15 ? 'good' : savingsRate < 10 ? 'warn' : null} />
          )}
          <Row icon="tax" label="Estimated lifetime tax"
            value={fmtM(r.totalTax)}
            sub={r.incomeSplitSaving > 500 ? `After ${fmtM(r.incomeSplitSaving)} split saving` : 'Federal + provincial combined'} />

          {/* ── FIRE: secondary / alternative lens ── */}
          <Divider label="FIRE perspective" />
          <div className={styles.fireSection}>
            <div className={styles.fireIntro}>
              An alternative lens — what would it take to retire based on portfolio size alone, without factoring in CPP/OAS.
            </div>
            <div className={styles.fireGrid}>
              <div className={styles.fireStat}>
                <span className={styles.fireStatLabel}>FIRE number</span>
                <span className={styles.fireStatVal}>{fmtM(fire?.fireNumber)}</span>
              </div>
              <div className={styles.fireStat}>
                <span className={styles.fireStatLabel}>Progress</span>
                <span className={`${styles.fireStatVal} ${styles['val_' + (fireProgress >= 80 ? 'good' : fireProgress >= 50 ? 'warn' : 'bad')]}`}>
                  {fireProgress}%
                </span>
              </div>
              <div className={styles.fireStat}>
                <span className={styles.fireStatLabel}>Lean FIRE</span>
                <span className={styles.fireStatVal}>{fmtM(fire?.leanFireNumber)}</span>
              </div>
              <div className={styles.fireStat}>
                <span className={styles.fireStatLabel}>FIRE at age</span>
                <span className={`${styles.fireStatVal} ${fireAge && fireAge <= retAge ? styles['val_good'] : ''}`}>
                  {fireAge ? fireAge.toFixed(0) : '—'}
                  {fireAge && fireAge <= retAge ? ' ✓' : ''}
                </span>
              </div>
            </div>
            {/* Mini progress bar */}
            <div className={styles.fireBar}>
              <div className={styles.fireBarFill}
                style={{
                  width: `${fireProgress}%`,
                  background: fireProgress >= 80 ? 'var(--teal)' : fireProgress >= 50 ? 'var(--amber)' : 'var(--danger)',
                }}
              />
            </div>
          </div>

          {/* Suggestions */}
          {needsWork && (
            <>
              <Divider label="Suggestions" />
              <div className={styles.suggestions}>
                {!survived && (
                  <div className={styles.suggestion}>
                    <Icon name="chevronRight" size={12} />
                    Defer CPP to 70 for a 42% boost to your guaranteed lifetime income
                  </div>
                )}
                {incomeVsSpend < 80 && monthlyTotal < 2000 && (
                  <div className={styles.suggestion}>
                    <Icon name="chevronRight" size={12} />
                    Increasing contributions by $500/mo would add approx. {fmtM(500 * 12 * yearsToRet * 1.5)} to your retirement pool
                  </div>
                )}
                {!shared.primaryHomeEnabled && (
                  <div className={styles.suggestion}>
                    <Icon name="chevronRight" size={12} />
                    Add your primary home in the Residence tab — home equity counts toward your estate
                  </div>
                )}
                {!propertyState && (
                  <div className={styles.suggestion}>
                    <Icon name="chevronRight" size={12} />
                    A commercial property generating rental income can meaningfully reduce portfolio drawdown
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className={styles.footer}>
          <span className={styles.footerNote}>
            {best.label} · Not financial advice
          </span>
        </div>
      </div>
  )
}
