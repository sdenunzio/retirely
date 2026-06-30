import React, { useState } from 'react'
import { approxTax, effectiveRate, marginalRate, PROVINCE_TAX, PROV_SUPPLEMENTS, calcProvSupplement, fmt, fmtM } from '../lib/engine.js'
import styles from './TaxBreakdown.module.css'

const COMPARE_PROVINCES = ['ON', 'BC', 'AB', 'QC', 'SK', 'MB', 'NS', 'NB']

// All 10 provinces with supplement info
const ALL_PROVINCES = ['ON', 'BC', 'AB', 'QC', 'SK', 'MB', 'NS', 'NB', 'PE', 'NL']

const INFORMAL_PROGRAMS = {
  NS:  { name: 'NS Low-Income Seniors Grant', amount: 750,   note: 'One-time annual grant for qualifying low-income seniors. Must receive GIS.' },
  NB:  { name: 'NB Low-Income Seniors Benefit', amount: 600, note: 'Annual benefit for GIS recipients resident since Dec 31 prior year.' },
  PE:  { name: 'PEI Senior Assistance (limited)', amount: 0, note: 'No province-wide supplement program as of 2025. Some municipal programs exist.' },
  NL:  { name: 'NL Seniors Benefit', amount: 1313,          note: 'Annual payment up to $1,313 for low-income seniors 65+. Income-tested.' },
}

export function TaxBreakdown({ shared, results }) {
  const [compareIncome, setCompareIncome] = useState(() => shared.annualSpending || 80000)
  const [activeTab, setActiveTab] = useState('tax')
  const currentProvince = shared.province
  const coupleMode = results?.coupleMode ?? false

  // ── Tax comparison ──────────────────────────────────────────────────────────
  const provinceRows = COMPARE_PROVINCES.map(code => {
    const prov = PROVINCE_TAX[code]
    const tax = approxTax(compareIncome, code)
    const eff = effectiveRate(compareIncome, code)
    const marg = marginalRate(compareIncome, code)
    const afterTax = compareIncome - tax
    const isCurrent = code === currentProvince
    return { code, name: prov.name, tax, eff, marg, afterTax, isCurrent }
  }).sort((a, b) => a.tax - b.tax)

  const maxTax = provinceRows[provinceRows.length - 1]?.tax || 1

  // ── Provincial supplements at current plan income ───────────────────────────
  // Use first-year retirement income as reference (or annual spending as proxy)
  const retirementIncome = results?.scenarios?.[0]?.result?.firstYearIncome ?? shared.annualSpending
  const privateIncomeEst = Math.max(0, retirementIncome - 8618 - 11000) // rough: subtract OAS+GIS

  const suppRows = ALL_PROVINCES.map(code => {
    const suppDef = PROV_SUPPLEMENTS[code]
    const informal = INFORMAL_PROGRAMS[code]
    const isCurrent = code === currentProvince
    const prov = PROVINCE_TAX[code]

    // Calculate what a GIS-receiving retiree would get
    const annualBenefit = suppDef
      ? calcProvSupplement(code, 65, privateIncomeEst, coupleMode, true)
      : 0
    const maxBenefit = suppDef
      ? (coupleMode ? (suppDef.maxCouple ?? suppDef.amount ?? 0) : (suppDef.maxSingle ?? suppDef.amount ?? 0))
      : (informal?.amount ?? 0)
    const name = suppDef?.name ?? informal?.name ?? '—'
    const note = suppDef?.note ?? informal?.note ?? 'No provincial supplement program.'
    const hasProgram = !!(suppDef || informal?.amount)

    return { code, name: prov.name, suppName: name, annualBenefit, maxBenefit, note, isCurrent, hasProgram }
  })

  return (
    <div className={styles.wrap}>

      {/* Tab bar */}
      <div className={styles.tabs}>
        {[
          { id: 'tax',       label: 'Tax by province' },
          { id: 'supplements', label: 'Provincial supplements' },
        ].map(t => (
          <button key={t.id}
            className={`${styles.tab} ${activeTab === t.id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(t.id)}
          >{t.label}</button>
        ))}
      </div>

      {/* ── TAX COMPARISON ── */}
      {activeTab === 'tax' && (
        <>
          <div className={styles.header}>
            <div className={styles.title}>Provincial tax comparison</div>
            <div className={styles.incomeControl}>
              <label className={styles.incomeLabel}>
                Reference income: <strong>{fmt(compareIncome)}</strong>
              </label>
              <input type="range" min={20000} max={200000} step={5000}
                value={compareIncome}
                onChange={e => setCompareIncome(Number(e.target.value))}
                className={styles.incomeSlider}
              />
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Province</th>
                  <th>Total tax</th>
                  <th>After-tax income</th>
                  <th>Effective rate</th>
                  <th>Marginal rate</th>
                  <th style={{ width: 120 }}>Tax bar</th>
                </tr>
              </thead>
              <tbody>
                {provinceRows.map(row => (
                  <tr key={row.code} className={row.isCurrent ? styles.currentRow : ''}>
                    <td>
                      <span className={styles.provCode}>{row.code}</span>
                      <span className={styles.provName}>{row.name}</span>
                      {row.isCurrent && <span className={styles.currentBadge}>selected</span>}
                    </td>
                    <td className={styles.mono}>{fmt(row.tax)}</td>
                    <td className={`${styles.mono} ${styles.good}`}>{fmt(row.afterTax)}</td>
                    <td className={styles.mono}>{row.eff.toFixed(1)}%</td>
                    <td className={styles.mono}>{row.marg.toFixed(1)}%</td>
                    <td>
                      <div className={styles.taxBarTrack}>
                        <div
                          className={`${styles.taxBarFill} ${row.isCurrent ? styles.taxBarCurrent : ''}`}
                          style={{ width: `${Math.round((row.tax / maxTax) * 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* QPP note for Quebec */}
          {currentProvince === 'QC' && (
            <div className={styles.qppNote}>
              <strong>Quebec residents:</strong> You contribute to the <strong>Quebec Pension Plan (QPP)</strong> instead of CPP.
              QPP and CPP have nearly identical benefit formulas and the same early/late adjustment factors (−7.2%/yr before 65, +8.4%/yr after).
              The primary difference is that QPP is administered by Retraite Québec, and Quebec workers pay slightly higher contribution rates (5.4% vs 5.95% employee share in 2025).
              Benefits entered in the CPP field are treated as QPP benefits throughout this calculator.
            </div>
          )}

          <p className={styles.note}>
            Estimates use 2025 federal + provincial brackets. Excludes surtax (except Ontario approximation) and credits beyond basic personal amounts.
          </p>
        </>
      )}

      {/* ── PROVINCIAL SUPPLEMENTS ── */}
      {activeTab === 'supplements' && (
        <>
          <div className={styles.header}>
            <div className={styles.title}>Provincial retirement supplements</div>
            <div className={styles.suppSubtitle}>
              Benefits available at your estimated retirement income of <strong>{fmtM(retirementIncome)}/yr</strong>.
              Most require GIS eligibility (low income). Amounts shown are approximate annual values.
            </div>
          </div>

          <div className={styles.suppGrid}>
            {suppRows.map(row => (
              <div key={row.code}
                className={`${styles.suppCard} ${row.isCurrent ? styles.suppCardCurrent : ''} ${!row.hasProgram ? styles.suppCardNone : ''}`}
              >
                <div className={styles.suppCardTop}>
                  <div className={styles.suppProvince}>
                    <span className={styles.provCode}>{row.code}</span>
                    <span className={styles.suppProvName}>{row.name}</span>
                    {row.isCurrent && <span className={styles.currentBadge}>your province</span>}
                  </div>
                  {row.hasProgram ? (
                    <div className={styles.suppAmount}>
                      <span className={styles.suppAmountVal}>
                        {row.annualBenefit > 0 ? fmtM(row.annualBenefit) : row.maxBenefit > 0 ? `up to ${fmtM(row.maxBenefit)}` : '—'}
                      </span>
                      <span className={styles.suppAmountLabel}>/yr est.</span>
                    </div>
                  ) : (
                    <span className={styles.suppNone}>No program</span>
                  )}
                </div>
                <div className={styles.suppName}>{row.suppName}</div>
                <div className={styles.suppNote}>{row.note}</div>
                {row.hasProgram && row.maxBenefit > 0 && (
                  <div className={styles.suppBarTrack}>
                    <div className={styles.suppBarFill}
                      style={{
                        width: `${Math.min(100, row.annualBenefit / row.maxBenefit * 100)}%`,
                        background: row.isCurrent ? 'var(--teal)' : 'rgba(255,255,255,.25)',
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* QPP box */}
          <div className={styles.qppBox}>
            <div className={styles.qppBoxTitle}>Quebec Pension Plan (QPP) vs CPP</div>
            <p className={styles.qppBoxText}>
              Quebec residents contribute to QPP (administered by Retraite Québec) rather than CPP.
              The benefit formulas are nearly identical — same early/late adjustment rates and the same pensionable earnings ceiling.
              The main practical differences: QPP employee contribution rate is 5.4% (vs CPP 5.95% in 2025), and QPP includes a
              "retirement pension supplement" for those who continue working after starting benefits.
              Benefits entered as CPP in this calculator are treated as QPP for Quebec residents.
            </p>
            <div className={styles.qppGrid}>
              {[
                ['Administered by', 'Retraite Québec', 'CRA / Service Canada'],
                ['2025 employee rate', '5.4%', '5.95%'],
                ['Early start (60)', '−36%', '−36%'],
                ['Late start (70)', '+42%', '+42%'],
                ['Max monthly (2025)', '~$1,433', '~$1,433'],
                ['Post-ret. supplement', 'Yes (QPP supplement)', 'Yes (CPP PRB)'],
              ].map(([label, qpp, cpp]) => (
                <React.Fragment key={label}>
                  <div className={styles.qppCell}>{label}</div>
                  <div className={`${styles.qppCell} ${styles.qppHighlight}`}>{qpp}</div>
                  <div className={styles.qppCell}>{cpp}</div>
                </React.Fragment>
              ))}
            </div>
          </div>

          <p className={styles.note}>
            Benefit amounts are estimates based on your projected retirement income. Actual eligibility depends on prior year income tax filing.
            Most provincial supplements require GIS receipt — meaning total retirement income must be quite low (typically under $20,000–$25,000/yr).
          </p>
        </>
      )}
    </div>
  )
}
