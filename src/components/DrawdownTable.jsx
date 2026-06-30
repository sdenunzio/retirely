import React, { useState, useMemo } from 'react'
import { Icon } from './Icon.jsx'
import { PROV_SUPPLEMENTS } from '../lib/engine.js'
import styles from './DrawdownTable.module.css'

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmtN  = n => n == null || !isFinite(n) ? '—'
  : '$' + Math.round(n).toLocaleString('en-CA')
const fmtK  = n => n == null || !isFinite(n) ? '—'
  : (Math.abs(n) >= 1_000_000
    ? '$' + (n / 1_000_000).toFixed(1) + 'M'
    : '$' + Math.round(n / 1000).toLocaleString('en-CA') + 'k')
const fmtPct = n => n == null || !isFinite(n) ? '—' : (n * 100).toFixed(1) + '%'

// ─── Sub-components ───────────────────────────────────────────────────────────
function Th({ children, title, right }) {
  return <th className={`${styles.th} ${right ? styles.right : ''}`} title={title}>{children}</th>
}

function Td({ value, tone, bold, dim, title }) {
  const cls = [
    styles.td,
    tone === 'good' ? styles.good : '',
    tone === 'warn' ? styles.warn : '',
    tone === 'dead' ? styles.dead : '',
    bold ? styles.bold : '',
    dim  ? styles.dim  : '',
  ].filter(Boolean).join(' ')
  return <td className={cls} title={title}>{value}</td>
}

// ─── Main component ───────────────────────────────────────────────────────────
export function DrawdownTable({ scenarios, shared, person, results, propertyState, initialScenario = 0 }) {
  const [activeScenario, setActiveScenario] = useState(initialScenario)
  const [showDetail, setShowDetail] = useState(false)   // toggle RRSP/TFSA/NR breakdown

  const scenario = scenarios[activeScenario]
  const yearData  = scenario?.result?.yearData ?? []

  // Determine which optional columns to show
  const hasRevMort    = shared.primaryHomeEnabled && shared.reverseMortgageEnabled
  const hasDB         = yearData.some(y => (y.dbAnnual ?? 0) > 0)
  const hasOther      = yearData.some(y => (y.otherAnnual ?? 0) > 0)
  const hasProv       = !!PROV_SUPPLEMENTS[shared.province] && yearData.some(y => (y.provSupplement ?? 0) > 0)
  const provName      = PROV_SUPPLEMENTS[shared.province]?.name ?? ''
  const hasPropCF     = propertyState && !propertyState._wizard
    && (propertyState.retireContribMode === 'cashflow' || propertyState.retireContribMode === 'half')
  const hasGIS        = yearData.some(y => y.gisAnn > 0)
  const hasSplit      = shared.coupleMode && yearData.some(y => y.splitSaving > 50)
  const hasEqualise   = scenario?.id === 'equalise' && shared.coupleMode && yearData.some(y => y.p1TaxInc != null)
  const hasLIF        = yearData.some(y => (y.lif ?? 0) > 0 || (y.lifMin ?? 0) > 0)
  const primaryHomeEq = results?.primaryHomeEquity ?? 0

  // Find best scenario for badge
  const ranked = [...scenarios].sort((a, b) => {
    const ad = a.result.depletedAge ?? 999, bd = b.result.depletedAge ?? 999
    return bd - ad || b.result.estateValue - a.result.estateValue
  })
  const bestId = ranked[0]?.id

  // Summary stats for header
  const r = scenario?.result
  const lifeExp = person.lifeExpectancy

  // Column defs — built dynamically based on what's active
  const incomeCols = [
    { key: 'cppAnn',        label: 'CPP',          title: 'Canada Pension Plan income',                    always: true },
    { key: 'oasAnn',        label: 'OAS',           title: 'Old Age Security (net of clawback)',             always: true },
    { key: 'gisAnn',        label: 'GIS',           title: 'Guaranteed Income Supplement',                  always: hasGIS },
    { key: 'revMortIncome', label: 'Rev. Mort.',    title: 'Reverse mortgage monthly income (annual)',       always: hasRevMort },
    { key: 'propCashflow',  label: 'Prop. CF',      title: 'Property rental cash flow contribution',        always: hasPropCF },
    { key: 'provSupplement',label: 'Prov. Supp.',   title: 'Provincial retirement supplement',              always: hasProv },
    { key: 'dbAnnual',      label: 'DB Pension',    title: 'Defined benefit pension income',                always: hasDB },
    { key: 'otherAnnual',   label: 'Other',         title: 'Other income (part-time, gig, rental)',         always: hasOther },
  ].filter(c => c.always)

  return (
    <div className={styles.wrap}>
      {/* ── Strategy selector tabs ── */}
      <div className={styles.stratTabs}>
        {scenarios.map((s, i) => (
          <button
            key={s.id}
            className={`${styles.stratTab} ${i === activeScenario ? styles.stratTabActive : ''}`}
            onClick={() => setActiveScenario(i)}
            style={{ '--accent': s.color }}
          >
            <span className={styles.stratDot} style={{ background: s.color }} />
            <span className={styles.stratLabel}>{s.label}</span>
            {s.id === bestId && <span className={styles.bestBadge}>Best</span>}
          </button>
        ))}
      </div>

      {/* ── Scenario summary strip ── */}
      {r && (
        <div className={styles.summaryStrip}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Starting pool</span>
            <span className={styles.summaryVal}>{fmtK(r.projAtRet)}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>First yr income</span>
            <span className={styles.summaryVal}>{fmtN(r.firstYearIncome)}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Total tax est.</span>
            <span className={styles.summaryVal}>{fmtK(r.totalTax)}</span>
          </div>
          {hasSplit && (
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Split saving</span>
              <span className={`${styles.summaryVal} ${styles.good}`}>{fmtK(r.incomeSplitSaving)}</span>
            </div>
          )}
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Portfolio estate</span>
            <span className={`${styles.summaryVal} ${r.estateValue > 0 ? styles.good : styles.warn}`}>
              {fmtK(r.estateValue)}
            </span>
          </div>
          {primaryHomeEq > 0 && (
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>+ Home equity</span>
              <span className={`${styles.summaryVal} ${styles.good}`}>{fmtK(primaryHomeEq)}</span>
            </div>
          )}
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Total estate</span>
            <span className={`${styles.summaryVal} ${styles.good}`}>
              {fmtK((r.estateValue ?? 0) + primaryHomeEq)}
            </span>
          </div>
          {r.depletedAge && (
            <div className={`${styles.summaryItem} ${styles.depletedBadge}`}>
              <span className={styles.summaryLabel}>⚠️ Depleted</span>
              <span className={styles.summaryVal}>Age {r.depletedAge}</span>
            </div>
          )}
          {!r.depletedAge && (
            <div className={`${styles.summaryItem} ${styles.survivedBadge}`}>
              <span className={styles.summaryLabel}>✓ Survives to</span>
              <span className={styles.summaryVal}>Age {lifeExp}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Table controls ── */}
      {shared.rrspMeltdownEnabled && (
        <div className={styles.meltdownBanner}>
          ⚡ RRSP meltdown active — drawing an extra {`$${Math.round((shared.rrspMeltdownAnnual||0)/1000)}k/yr`} from RRSP before age 71 to reduce future RRIF minimums
        </div>
      )}
      <div className={styles.tableControls}>
        <span className={styles.tableDesc}>Year-by-year drawdown — {scenario?.label}</span>
        <button
          className={`${styles.detailBtn} ${showDetail ? styles.detailBtnOn : ''}`}
          onClick={() => setShowDetail(d => !d)}
        >
          {showDetail ? '▲ Hide account detail' : '▼ Show RRSP / TFSA / NR'}
        </button>
      </div>

      {/* ── Main table ── */}
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              {/* Identity */}
              <Th title="Age at start of year">Age</Th>

              {/* Spending */}
              <Th right title="Inflation-adjusted annual spending target">Spending</Th>

              {/* Income sources */}
              <Th right title={shared.province === 'QC' ? 'Quebec Pension Plan — adjusted for start age' : 'Canada Pension Plan — adjusted for start age'}>{shared.province === 'QC' ? 'QPP' : 'CPP'}</Th>
              <Th right title="Old Age Security net of clawback">OAS</Th>
              {hasGIS     && <Th right title="Guaranteed Income Supplement">GIS</Th>}
              {hasRevMort && <Th right title="Reverse mortgage annual income">Rev. Mort.</Th>}
              {hasDB      && <Th right title="Defined benefit pension income">DB Pension</Th>}
              {hasOther   && <Th right title="Other income (part-time, gig, etc.)">Other</Th>}
              {hasProv    && <Th right title={provName}>{shared.province} Supp.</Th>}
              {hasPropCF  && <Th right title="Property rental cash flow this year">Prop. CF</Th>}

              {/* Portfolio */}
              <Th right title="Total from all non-portfolio sources (CPP + OAS + DB + other) — teal when fully covers spending">Guaranteed</Th>
              <Th right title="Total drawn from investment accounts to cover spending gap">Portfolio draw</Th>
              {showDetail && <>
                <Th right title="RRSP / RRIF balance end of year">RRSP/RRIF</Th>
                <Th right title="TFSA balance end of year">TFSA</Th>
                <Th right title="Non-registered balance end of year">Non-reg</Th>
                {hasLIF && <Th right title="LIF balance end of year (locked-in funds)">LIF</Th>}
              </>}

              {/* Tax & estate */}
              <Th right title="Estimated income tax (federal + provincial)">Tax est.</Th>
              {hasSplit    && <Th right title="Tax saved via pension income splitting">Split save</Th>}
              {hasEqualise && <Th right title="Person 1 taxable income this year">P1 income</Th>}
              {hasEqualise && <Th right title="Person 2 taxable income this year">P2 income</Th>}
              <Th right title="Total investment portfolio balance end of year">Portfolio</Th>
              <Th right title="Portfolio + primary home equity">Est. estate</Th>
            </tr>
          </thead>
          <tbody>
            {yearData.map((y, i) => {
              const depleted   = y.balance <= 0
              const milestone  = y.age % 5 === 0
              const totalIncome = y.govIncome + y.withdrawn
              const shortfall  = totalIncome < y.spending * 0.9
              const estate     = (y.balance ?? 0) + primaryHomeEq

              // Sum of all non-portfolio income sources
              const guaranteed = (y.cppAnn || 0) + (y.oasAnn || 0) + (y.gisAnn || 0)
                + (y.dbAnnual || 0) + (y.otherAnnual || 0) + (y.provSupplement || 0)
                + (y.revMortIncome || 0) + (y.propCashflow || 0)
              const guaranteedCoversAll = guaranteed >= y.spending * 0.98

              return (
                <tr
                  key={y.age}
                  className={[
                    depleted  ? styles.rowDepleted  : '',
                    milestone ? styles.rowMilestone : '',
                  ].filter(Boolean).join(' ')}
                >
                  {/* Age */}
                  <td className={`${styles.td} ${styles.ageCell} ${milestone ? styles.ageMilestone : ''}`}>
                    {y.age}
                    {y.age === person.retirementAge && <span className={styles.ageBadge}>Ret.</span>}
                    {y.age === 65 && y.age !== person.retirementAge && <span className={styles.ageBadge}>65</span>}
                    {y.age === 71 && <span className={styles.ageBadge}>RRIF</span>}
                  </td>

                  {/* Spending */}
                  <Td value={fmtN(y.spending)} />

                  {/* Income sources */}
                  <Td value={y.cppAnn > 0 ? fmtN(y.cppAnn) : '—'} dim={!y.cppAnn} />
                  <Td value={y.oasAnn > 0 ? fmtN(y.oasAnn) : '—'} dim={!y.oasAnn} />
                  {hasGIS     && <Td value={y.gisAnn > 0 ? fmtN(y.gisAnn) : '—'} tone={y.gisAnn > 0 ? 'good' : null} dim={!y.gisAnn} />}
                  {hasRevMort && <Td value={y.revMortIncome > 0 ? fmtN(y.revMortIncome) : '—'} tone={y.revMortIncome > 0 ? 'good' : null} dim={!y.revMortIncome} />}
                  {hasDB      && <Td value={(y.dbAnnual ?? 0) > 0 ? fmtN(y.dbAnnual) : '—'} tone={(y.dbAnnual ?? 0) > 0 ? 'good' : null} dim={!(y.dbAnnual ?? 0)} />}
                  {hasOther   && <Td value={(y.otherAnnual ?? 0) > 0 ? fmtN(y.otherAnnual) : '—'} tone={(y.otherAnnual ?? 0) > 0 ? 'good' : null} dim={!(y.otherAnnual ?? 0)} />}
                  {hasProv    && <Td value={(y.provSupplement ?? 0) > 0 ? fmtN(y.provSupplement) : '—'} tone={(y.provSupplement ?? 0) > 0 ? 'good' : null} dim={!(y.provSupplement ?? 0)} />}
                  {hasPropCF  && <Td value={y.propCashflow > 0 ? fmtN(y.propCashflow) : '—'} tone={y.propCashflow > 0 ? 'good' : null} dim={!y.propCashflow} />}

                  {/* Guaranteed income subtotal */}
                  <Td
                    value={guaranteed > 0 ? fmtN(guaranteed) : '—'}
                    tone={guaranteedCoversAll ? 'good' : guaranteed > 0 ? null : null}
                    bold={guaranteedCoversAll}
                    dim={guaranteed <= 0}
                    title={guaranteedCoversAll ? 'Guaranteed income fully covers spending — no portfolio draw needed' : undefined}
                  />

                  {/* Portfolio draw */}
                  <Td
                    value={depleted ? 'Depleted' : guaranteedCoversAll ? 'Covered ✓' : y.withdrawn > 0 ? fmtN(y.withdrawn) : '—'}
                    tone={depleted ? 'dead' : guaranteedCoversAll ? 'good' : shortfall ? 'warn' : null}
                    bold={y.withdrawn > 0 || guaranteedCoversAll}
                  />

                  {/* Account detail */}
                  {showDetail && <>
                    <Td value={depleted ? '—' : fmtK(y.rrsp)} dim={depleted} />
                    <Td value={depleted ? '—' : fmtK(y.tfsa)} dim={depleted} />
                    <Td value={depleted ? '—' : fmtK(y.nr)}   dim={depleted} />
                    {hasLIF && <Td value={depleted ? '—' : fmtK(y.lif ?? 0)} dim={depleted || !(y.lif ?? 0)} />}
                  </>}

                  {/* Tax */}
                  <Td value={y.tax > 0 ? fmtN(y.tax) : '—'} dim={!y.tax} />
                  {hasSplit    && <Td value={y.splitSaving > 50 ? fmtN(y.splitSaving) : '—'} tone={y.splitSaving > 50 ? 'good' : null} dim={y.splitSaving <= 50} />}
                  {hasEqualise && <Td value={y.p1TaxInc > 0 ? fmtN(y.p1TaxInc) : '—'} dim={!y.p1TaxInc} />}
                  {hasEqualise && <Td value={y.p2TaxInc > 0 ? fmtN(y.p2TaxInc) : '—'} dim={!y.p2TaxInc} />}

                  {/* Portfolio balance */}
                  <Td
                    value={depleted ? '$0' : fmtK(y.balance)}
                    tone={depleted ? 'dead' : y.balance < 100000 ? 'warn' : null}
                    bold
                  />

                  {/* Estate */}
                  <Td
                    value={depleted && primaryHomeEq <= 0 ? '$0' : fmtK(estate)}
                    tone={depleted && estate <= 0 ? 'dead' : estate < 100000 ? 'warn' : 'good'}
                    bold
                  />
                </tr>
              )
            })}
          </tbody>

          {/* Footer totals */}
          <tfoot>
            <tr className={styles.footRow}>
              <td className={styles.footLabel} colSpan={2 + incomeCols.length}>Totals / final</td>
              <td className={`${styles.td} ${styles.right} ${styles.bold}`} /> {/* guaranteed — no lifetime total shown */}
              <td className={`${styles.td} ${styles.right} ${styles.bold}`} /> {/* portfolio draw */}
              {showDetail && <><td className={styles.td}/><td className={styles.td}/><td className={styles.td}/></>}
              <td className={`${styles.td} ${styles.right} ${styles.bold}`}>{fmtN(r?.totalTax)}</td>
              {hasSplit    && <td className={`${styles.td} ${styles.right} ${styles.good} ${styles.bold}`}>{fmtN(r?.incomeSplitSaving)}</td>}
              {hasEqualise && <td className={styles.td}/>}
              {hasEqualise && <td className={styles.td}/>}
              <td className={`${styles.td} ${styles.right} ${styles.bold} ${r?.estateValue > 0 ? styles.good : styles.warn}`}>{fmtK(r?.estateValue)}</td>
              <td className={`${styles.td} ${styles.right} ${styles.bold} ${styles.good}`}>{fmtK((r?.estateValue ?? 0) + primaryHomeEq)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <span><span className={styles.legendChip} style={{ background: 'rgba(29,158,117,.2)', border: '1px solid rgba(29,158,117,.4)' }} /> Positive / good</span>
        <span><span className={styles.legendChip} style={{ background: 'rgba(245,166,35,.15)', border: '1px solid rgba(245,166,35,.4)' }} /> Low / caution</span>
        <span><span className={styles.legendChip} style={{ background: 'rgba(240,84,84,.15)', border: '1px solid rgba(240,84,84,.4)' }} /> Depleted</span>
        <span><span className={styles.legendChip} style={{ background: 'rgba(255,255,255,.06)', border: '1px solid var(--border)' }} /> Every 5 years highlighted</span>
        <span>RRIF conversion required at age 71</span>
        {hasPropCF && <span>Prop. CF = property cash flow year-matched to ownership year</span>}
        {hasRevMort && <span>Rev. Mort. = reverse mortgage income (reduces portfolio draw)</span>}
        <span>Covered ✓ = guaranteed income fully covers spending — no portfolio draw needed</span>
        <span>OAS increases 10% automatically at age 75 (July 2022 rule)</span>
        {hasLIF && <span>LIF = Locked-In Fund — mandatory minimum AND maximum withdrawal apply each year</span>}
      </div>
    </div>
  )
}
