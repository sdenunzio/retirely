import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon.jsx'
import { NumericInput } from './NumericInput.jsx'
import styles from './CapitalGainsModal.module.css'

const fmtC = n => n == null || !isFinite(n) ? '—' : '$' + Math.round(n).toLocaleString('en-CA')

function PctRow({ label, hint, value, onChange, min = 20, max = 60, step = 1 }) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      {hint && <div className={styles.fieldHint}>{hint}</div>}
      <NumericInput value={value} onChange={onChange} min={min} max={max} step={step} suffix="%" compact />
    </div>
  )
}

export function calcCapitalGains(inputs, analysis) {
  const years = analysis?.years
  if (!years?.length) return null

  const holdYrs = inputs.holdingYears || 10
  const yrIdx   = Math.min(holdYrs - 1, years.length - 1)
  const yrData  = years[yrIdx]
  if (!yrData) return null

  const ownershipMode = inputs.ownershipMode || 'buying'
  const acb           = ownershipMode === 'owned' ? (inputs.currentMarketValue || 0) : (inputs.purchasePrice || 0)
  const buildingRatio = inputs.buildingToLandRatio || 0.75
  const buildingValue = acb * buildingRatio
  const ccaClaimed    = Math.min(inputs.ccaClaimedToDate || 0, buildingValue)
  const ucc           = buildingValue - ccaClaimed
  const salePrice     = yrData.propValue
  const sellingCosts  = salePrice * (inputs.closingCostSellPct || 0.04)
  const netProceeds   = salePrice - sellingCosts
  const mortBal       = yrData.mortBal || 0

  // CCA recapture: building portion only, 100% taxable as income
  const buildingSalePrice = salePrice * buildingRatio
  const recapture     = Math.max(0, Math.min(buildingSalePrice, buildingValue) - ucc)

  // Capital gain: sale price − ACB − selling costs, 50% inclusion
  const capitalGain   = Math.max(0, netProceeds - acb)
  const taxableGain   = capitalGain * 0.5

  const rate1 = (inputs.marginalTaxRate || 40) / 100
  const rate2 = (inputs.spouseMarginalRate || 35) / 100
  const couple = inputs.coupleOwnership || false

  const recaptureTax = couple
    ? (recapture / 2) * rate1 + (recapture / 2) * rate2
    : recapture * rate1
  const gainTax = couple
    ? (taxableGain / 2) * rate1 + (taxableGain / 2) * rate2
    : taxableGain * rate1
  const totalTax = recaptureTax + gainTax

  const grossProceeds    = netProceeds - mortBal
  const afterTaxProceeds = grossProceeds - totalTax
  const effectiveRate    = grossProceeds > 0 ? totalTax / grossProceeds : 0

  return {
    salePrice, sellingCosts, netProceeds, mortBal,
    acb, buildingValue, ucc, ccaClaimed, recapture, recaptureTax,
    capitalGain, taxableGain, gainTax, totalTax,
    grossProceeds, afterTaxProceeds, effectiveRate,
    holdingYear: holdYrs,
  }
}

export function CapitalGainsModal({ inputs, set, analysis, onClose }) {
  const cg = calcCapitalGains(inputs, analysis)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const onBackdrop = e => { if (e.target === e.currentTarget) onClose() }
  const rate1 = inputs.marginalTaxRate || 40
  const couple = inputs.coupleOwnership || false

  return createPortal(
    <div className={styles.backdrop} onClick={onBackdrop} role="dialog" aria-modal="true">
      <div className={styles.modal}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
            </svg>
            <div>
              <div className={styles.title}>Capital gains tax on sale</div>
              <div className={styles.sub}>Year {inputs.holdingYears} · Sell at age {inputs.sellAge}</div>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <Icon name="close" size={14} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.cols}>

            {/* ── Left: inputs + strategies ── */}
            <div className={styles.leftCol}>
              <div className={styles.sectionHead}>Tax inputs</div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>CCA claimed to date</label>
                <div className={styles.fieldHint}>Total depreciation deducted — triggers 100% taxable recapture on sale</div>
                <NumericInput value={inputs.ccaClaimedToDate || 0} onChange={v => set('ccaClaimedToDate', v)} min={0} step={5000} prefix="$" />
              </div>

              <PctRow
                label={`Your marginal tax rate: ${rate1}%`}
                hint="Applied to capital gain (50% inclusion) and any CCA recapture (100%)"
                value={rate1} onChange={v => set('marginalTaxRate', v)} />

              <button
                className={`${styles.splitToggle} ${couple ? styles.splitToggleOn : ''}`}
                onClick={() => set('coupleOwnership', !couple)}
              >
                {couple ? '✓' : '○'} Split 50/50 between spouses
              </button>

              {couple && (
                <PctRow
                  label={`Spouse marginal rate: ${inputs.spouseMarginalRate || 35}%`}
                  value={inputs.spouseMarginalRate || 35}
                  onChange={v => set('spouseMarginalRate', v)} />
              )}

              <div className={styles.rulesBox}>
                <div className={styles.rule}><span className={styles.chip}>50%</span> Capital gains inclusion (2025 rate — hike cancelled)</div>
                <div className={styles.rule}><span className={`${styles.chip} ${styles.chipWarn}`}>100%</span> CCA recapture taxed as ordinary income</div>
                <div className={styles.rule}><span className={`${styles.chip} ${styles.chipGrey}`}>0%</span> Land portion — not depreciable, no recapture</div>
              </div>

              <div className={styles.sectionHead} style={{ marginTop: '1.25rem' }}>Tax reduction strategies</div>
              <div className={styles.strategies}>
                <div className={styles.strategy}>
                  <span>📅</span>
                  <span><strong>Sell in retirement</strong> — lower marginal rate saves on both gain and recapture.
                    {cg && ` Dropping from ${rate1}% → 30% saves ~${fmtC(cg.totalTax * (1 - 30 / rate1))}.`}
                  </span>
                </div>
                {!couple && (
                  <div className={styles.strategy}>
                    <span>👥</span>
                    <span><strong>50/50 spouse split</strong> — spreads the gain across two marginal rates, reducing total tax. Enable above.</span>
                  </div>
                )}
                <div className={styles.strategy}>
                  <span>📋</span>
                  <span><strong>Capital gains reserve</strong> — vendor take-back mortgage spreads gain over up to 5 tax years, keeping you in lower brackets each year.</span>
                </div>
                {cg && cg.recapture > 0 && (
                  <div className={styles.strategy}>
                    <span>⚠️</span>
                    <span><strong>CCA recapture ({fmtC(cg.recapture)})</strong> — 100% taxable. Consider limiting future CCA claims — the tax savings now may cost more at sale.</span>
                  </div>
                )}
                <div className={styles.strategy}>
                  <span>🔄</span>
                  <span><strong>Replacement property election</strong> — buying another commercial property may defer capital gains recognition. Consult a tax advisor.</span>
                </div>
              </div>
            </div>

            {/* ── Right: waterfall ── */}
            <div className={styles.rightCol}>
              <div className={styles.sectionHead}>After-tax proceeds — year {inputs.holdingYears}</div>
              {cg ? (
                <div className={styles.waterfall}>
                  <div className={styles.wRow}>
                    <span className={styles.wLabel}>Sale price</span>
                    <span className={styles.wVal}>{fmtC(cg.salePrice)}</span>
                  </div>
                  <div className={styles.wRow}>
                    <span className={styles.wLabel}>Selling costs ({((inputs.closingCostSellPct || 0.04) * 100).toFixed(1)}%)</span>
                    <span className={`${styles.wVal} ${styles.wNeg}`}>− {fmtC(cg.sellingCosts)}</span>
                  </div>
                  <div className={styles.wRow}>
                    <span className={styles.wLabel}>Mortgage balance</span>
                    <span className={`${styles.wVal} ${styles.wNeg}`}>− {fmtC(cg.mortBal)}</span>
                  </div>
                  <div className={`${styles.wRow} ${styles.wSubtotal}`}>
                    <span className={styles.wLabel}>Gross proceeds (pre-tax)</span>
                    <span className={styles.wVal}>{fmtC(cg.grossProceeds)}</span>
                  </div>

                  <div className={styles.wDivider} />

                  <div className={styles.wRow}>
                    <span className={styles.wLabel}>Adjusted cost base (ACB)</span>
                    <span className={styles.wVal}>{fmtC(cg.acb)}</span>
                  </div>
                  <div className={styles.wRow}>
                    <span className={styles.wLabel}>
                      Capital gain <span className={styles.wChip}>50% taxable</span>
                    </span>
                    <span className={styles.wVal}>{fmtC(cg.capitalGain)}</span>
                  </div>
                  <div className={styles.wRow}>
                    <span className={styles.wLabel}>
                      Capital gains tax
                      {couple ? ` (split ${rate1}%/${inputs.spouseMarginalRate || 35}%)` : ` (${rate1}%)`}
                    </span>
                    <span className={`${styles.wVal} ${styles.wNeg}`}>− {fmtC(cg.gainTax)}</span>
                  </div>

                  {cg.recapture > 0 && (
                    <>
                      <div className={styles.wDivider} />
                      <div className={styles.wRow}>
                        <span className={styles.wLabel}>UCC (cost − CCA claimed)</span>
                        <span className={styles.wVal}>{fmtC(cg.ucc)}</span>
                      </div>
                      <div className={styles.wRow}>
                        <span className={styles.wLabel}>
                          CCA recapture <span className={`${styles.wChip} ${styles.wChipWarn}`}>100% taxable</span>
                        </span>
                        <span className={styles.wVal}>{fmtC(cg.recapture)}</span>
                      </div>
                      <div className={styles.wRow}>
                        <span className={styles.wLabel}>Recapture tax ({rate1}%)</span>
                        <span className={`${styles.wVal} ${styles.wNeg}`}>− {fmtC(cg.recaptureTax)}</span>
                      </div>
                    </>
                  )}

                  <div className={styles.wDivider} />
                  <div className={`${styles.wRow} ${styles.wTotal}`}>
                    <span className={styles.wLabel}>Total tax on sale</span>
                    <span className={`${styles.wVal} ${styles.wNeg}`}>− {fmtC(cg.totalTax)}</span>
                  </div>
                  <div className={`${styles.wRow} ${styles.wResult}`}>
                    <span className={styles.wLabel}>After-tax proceeds</span>
                    <span className={`${styles.wVal} ${cg.afterTaxProceeds > 0 ? styles.wPos : styles.wNeg}`}>
                      {fmtC(cg.afterTaxProceeds)}
                    </span>
                  </div>

                  {couple && (
                    <div className={styles.splitNote}>
                      Each spouse: <strong>{fmtC(cg.capitalGain / 2)}</strong> gain ({fmtC(cg.taxableGain / 2)} taxable)
                      {cg.recapture > 0 && <> + <strong>{fmtC(cg.recapture / 2)}</strong> recapture</>}
                    </div>
                  )}

                  <div className={styles.effectiveRate}>
                    Tax as % of gross proceeds: <strong>{(cg.effectiveRate * 100).toFixed(1)}%</strong>
                  </div>
                </div>
              ) : (
                <div className={styles.noData}>Configure inputs and holding period to see calculation</div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <span className={styles.disclaimer}>
            Illustrative only. Does not account for provincial surtaxes, AMT, or other deductions. Consult a tax advisor.
          </span>
          <button className={styles.doneBtn} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
