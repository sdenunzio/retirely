import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'
import { analyseProperty, propertyMonthlyContribution, pct, fmtC, fmtK } from '../lib/propertyEngine.js'
import { CapitalGainsModal } from './CapitalGainsModal.jsx'
import { NumericInput } from './NumericInput.jsx'
import { Icon, IconBox } from './Icon.jsx'
import styles from './PropertyTab.module.css'

function StepInput({ value, onChange, min = 0, max, step = 1, prefix = '', suffix = '', wide }) {
  return <NumericInput value={value} onChange={onChange} min={min} max={max} step={step} prefix={prefix} suffix={suffix} />
}

function PctInput({ value, onChange, min = 0, max = 1, step = 0.01 }) {
  return (
    <div className={styles.pctRow}>
      <input type="range" min={min * 100} max={max * 100} step={step * 100}
        value={+(value * 100).toFixed(2)}
        onChange={e => onChange(Number(e.target.value) / 100)}
        className={styles.slider} />
      <StepInput value={+(value * 100).toFixed(2)} onChange={v => onChange(v / 100)}
        min={min * 100} max={max * 100} step={+(step * 100).toFixed(2)} suffix="%" />
    </div>
  )
}

function Field({ label, sub, children }) {
  return (
    <div className={styles.field}>
      <div className={styles.fieldLabel}>{label}</div>
      {sub && <div className={styles.fieldSub}>{sub}</div>}
      {children}
    </div>
  )
}

function KPICard({ label, value, sub, tone, big }) {
  return (
    <div className={`${styles.kpi} ${tone ? styles['kpi_' + tone] : ''}`}>
      <div className={styles.kpiLabel}>{label}</div>
      <div className={`${styles.kpiValue} ${big ? styles.kpiBig : ''}`}>{value}</div>
      {sub && <div className={styles.kpiSub}>{sub}</div>}
    </div>
  )
}

const DEFAULTS = {
  ownershipMode:        'buying',  // 'buying' | 'owned'
  // Owned-property fields
  currentMarketValue:   1000000,
  existingMortgageBal:  500000,
  existingMortgageRate: 0.055,
  existingMortgageTerm: 18,
  // Buying fields
  purchasePrice:        1000000,
  downPaymentPct:       0.25,
  mortgageRate:         0.06,
  mortgageTerm:         20,
  sqFootage:            5500,
  rentPerSqFt:          15,
  sharedCAM:            400,
  vacancyRate:          0.05,
  maintenanceReservePct:0.05,
  managementFeePct:     0.00,
  propertyTaxRate:      0.0237,
  insurance:            1800,
  utilities:            0,
  miscExpenses:         0,
  rentalIncreaseRate:   0.03,
  propertyTaxIncrease:  0.01,
  utilitiesIncrease:    0.04,
  appreciationRate:     0.04,
  buildingToLandRatio:  0.75,
  closingCostBuyPct:    0.01,
  closingCostSellPct:   0.04,
  holdingYears:         20,
  retireContribMode:    'none',  // 'none' | 'cashflow' | 'half'
  sellEnabled:          false,
  sellAge:              70,
  // Capital gains tax on sale
  ccaClaimedToDate:     0,        // total CCA claimed (depreciation deducted)
  marginalTaxRate:      40,       // % — seller's marginal income tax rate
  coupleOwnership:      false,    // split gain 50/50 between spouses
  spouseMarginalRate:   35,       // % — spouse marginal rate (if couple)
}

// Wizard-specific field helpers (light theme)
function WField({ label, sub, children }) {
  return (
    <div style={{ marginBottom: '.75rem' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--gray-40)', marginBottom: 4 }}>{sub}</div>}
      {children}
    </div>
  )
}

function WStepInput({ value, onChange, min = 0, max, step = 1, prefix = '', suffix = '' }) {
  const dec = () => onChange(Math.max(min ?? -Infinity, +(value - step).toFixed(4)))
  const inc = () => onChange(max != null ? Math.min(max, +(value + step).toFixed(4)) : +(value + step).toFixed(4))
  const display = prefix
    ? prefix + (value >= 1000 ? Math.round(value).toLocaleString('en-CA') : +value.toFixed(2))
    : (value >= 1000 ? Math.round(value).toLocaleString('en-CA') : +value.toFixed(2)) + suffix
  return (
    <div style={{ display:'flex', alignItems:'stretch', border:'1.5px solid var(--gray-20)', borderRadius:'var(--radius-sm)', overflow:'hidden', background:'var(--white)', height:36 }}>
      <button onClick={dec} type="button" style={{ width:32, background:'var(--gray-05)', border:'none', color:'var(--gray-60)', fontSize:17, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
      <span style={{ flex:1, textAlign:'center', fontSize:14, fontWeight:600, fontFamily:'var(--font-mono)', color:'var(--navy)', display:'flex', alignItems:'center', justifyContent:'center' }}>{display}</span>
      <button onClick={inc} type="button" style={{ width:32, background:'var(--gray-05)', border:'none', color:'var(--gray-60)', fontSize:17, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.tooltip}>
      <div className={styles.tipLabel}>Year {label}</div>
      {payload.map((p, i) => (
        <div key={i} className={styles.tipRow} style={{ color: p.color || 'var(--navy)' }}>
          <span>{p.name}</span><span>{p.value < 0 ? '-' : ''}${Math.abs(Math.round(p.value)).toLocaleString('en-CA')}</span>
        </div>
      ))}
    </div>
  )
}

export function PropertyTab({ person, spouse, shared, setPField, setSField, propertyState, setPropertyState, setPropertyField }) {
  const [wizardStep, setWizardStep] = useState(1)
  const [activeChart, setActiveChart] = useState('cashflow')
  const [showExpenses, setShowExpenses] = useState(false)
  const [showCGModal, setShowCGModal] = useState(false)

  const hasProperty = propertyState !== null
  const inputs      = propertyState || DEFAULTS
  const set         = (k, v) => setPropertyField(k, v)

  const startWizard = () => { setWizardStep(1); setPropertyState({ ...DEFAULTS, _wizard: true }) }
  const confirmAdd  = () => setPropertyState(prev => { const n = { ...prev }; delete n._wizard; return n })
  const removeAll   = () => { setPropertyState(null); setWizardStep(1) }

  const wizardActive = propertyState?._wizard

  const analysis = useMemo(() => analyseProperty(inputs), [inputs])
  const { years, capRateYear1, cocReturnYear1, dscrYear1, noiYear1, cashFlowYear1,
          equity5, irr, purchasePrice, downPayment, totalCashIn, annualMortgage,
          loanAmount, annualDepreciation } = analysis

  const monthlyContrib = propertyMonthlyContribution(analysis, inputs.retireContribMode)

  // ── Capital gains tax calculation on sale ─────────────────────────────────
  const calcCapGainsTax = (yrData, atAge) => {
    if (!yrData) return null
    const ownershipMode  = inputs.ownershipMode
    const acb            = ownershipMode === 'owned' ? inputs.currentMarketValue : inputs.purchasePrice
    const buildingValue  = acb * inputs.buildingToLandRatio
    const ccaClaimed     = Math.min(inputs.ccaClaimedToDate || 0, buildingValue)
    const ucc            = buildingValue - ccaClaimed           // undepreciated capital cost
    const salePrice      = yrData.propValue
    const sellingCosts   = salePrice * inputs.closingCostSellPct
    const netProceeds    = salePrice - sellingCosts
    const mortBal        = yrData.mortBal

    // CCA Recapture — 100% taxable as income (building portion only)
    // Recapture = min(selling price of building, building cost) - UCC
    const buildingSalePrice  = salePrice * inputs.buildingToLandRatio
    const recapture      = Math.max(0, Math.min(buildingSalePrice, buildingValue) - ucc)

    // Capital gain = sale price − ACB − selling costs
    const capitalGain    = Math.max(0, netProceeds - acb)
    const taxableGain    = capitalGain * 0.5   // 50% inclusion rate

    // Split between spouses if couple ownership
    const rate1 = (inputs.marginalTaxRate || 40) / 100
    const rate2 = (inputs.spouseMarginalRate || 35) / 100

    let recaptureTax, gainTax
    if (inputs.coupleOwnership) {
      recaptureTax = (recapture / 2) * rate1 + (recapture / 2) * rate2
      gainTax      = (taxableGain / 2) * rate1 + (taxableGain / 2) * rate2
    } else {
      recaptureTax = recapture * rate1
      gainTax      = taxableGain * rate1
    }

    const totalTax       = recaptureTax + gainTax
    const afterTaxProceeds = netProceeds - mortBal - totalTax

    return {
      salePrice, sellingCosts, netProceeds, mortBal,
      acb, buildingValue, ucc, ccaClaimed, recapture, recaptureTax,
      capitalGain, taxableGain, gainTax, totalTax,
      afterTaxProceeds,
      grossProceeds: netProceeds - mortBal,
    }
  }

  const chartData = years.map(y => ({
    year: y.year,
    noi:          Math.round(y.noi),
    cashFlow:     Math.round(y.annualCashFlow),
    equity:       Math.round(y.equity / 1000),
    propValue:    Math.round(y.propValue / 1000),
    capRate:      +(y.capRate * 100).toFixed(2),
    coc:          +(y.cocReturn * 100).toFixed(2),
  }))

  const dscrOk = dscrYear1 != null && dscrYear1 >= 1.25

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!propertyState) {
    return (
      <div className={styles.emptyWrap}>
        <IconBox name="property" size={32} tone="teal" />
        <h2 className={styles.emptyTitle}>No property added yet</h2>
        <p className={styles.emptyBody}>
          Add a commercial property to analyse CAP rate, cash-on-cash return, NOI, IRR,
          equity accumulation, and 30-year projections. Optionally route rental income
          into your retirement plan.
        </p>
        <ul className={styles.emptyFeatures}>
          <li>CAP rate, Cash-on-Cash, DSCR, IRR</li>
          <li>Year-by-year NOI and cash flow</li>
          <li>Equity and property value trajectory</li>
          <li>Tax benefit via depreciation (CCA Class 1)</li>
          <li>Route cash flow to retirement contributions</li>
        </ul>
        <button className={styles.addBtn} onClick={startWizard}>
          + Add property
        </button>
      </div>
    )
  }

  // ── Wizard: step 1 — ownership type ─────────────────────────────────────────
  if (wizardActive && wizardStep === 1) {
    return (
      <div className={styles.wizardWrap}>
        <div className={styles.wizardCard}>
          <div className={styles.wizardStep}>Step 1 of 2</div>
          <h2 className={styles.wizardTitle}>Do you already own this property?</h2>
          <p className={styles.wizardBody}>This changes how equity, cash invested, and returns are calculated.</p>

          <div className={styles.ownershipGrid}>
            <button
              className={`${styles.ownerCard} ${inputs.ownershipMode === 'buying' ? styles.ownerCardActive : ''}`}
              onClick={() => set('ownershipMode', 'buying')}
            >
              <IconBox name="buying" size={20} tone="teal" />
              <div className={styles.ownerLabel}>Purchasing a property</div>
              <div className={styles.ownerDesc}>I'm looking to buy. Analysis starts from down payment, closing costs, and a new mortgage.</div>
            </button>

            <button
              className={`${styles.ownerCard} ${inputs.ownershipMode === 'owned' ? styles.ownerCardActive : ''}`}
              onClick={() => set('ownershipMode', 'owned')}
            >
              <IconBox name="owned" size={20} tone="teal" />
              <div className={styles.ownerLabel}>I already own this property</div>
              <div className={styles.ownerDesc}>Factor in existing equity, current mortgage, and current rental income. Includes a "what if I sell?" scenario.</div>
            </button>
          </div>

          <div className={styles.wizardNav}>
            <button className={styles.wizardBack} onClick={() => setHasProperty(false)}>← Back</button>
            <button className={styles.wizardNext} onClick={() => setWizardStep(2)}>
              Next: {inputs.ownershipMode === 'owned' ? 'Enter property details' : 'Enter purchase details'} →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Wizard: step 2 — ownership details ──────────────────────────────────────
  if (wizardActive && wizardStep === 2) {
    const isOwned = inputs.ownershipMode === 'owned'
    const equity  = isOwned ? Math.max(0, inputs.currentMarketValue - inputs.existingMortgageBal) : null
    const sellNet = isOwned ? inputs.currentMarketValue * (1 - inputs.closingCostSellPct) - inputs.existingMortgageBal : null

    return (
      <div className={styles.wizardWrap}>
        <div className={styles.wizardCard} style={{ maxWidth: 560 }}>
          <div className={styles.wizardStep}>Step 2 of 2 · {isOwned ? 'Existing property' : 'Purchase details'}</div>
          <h2 className={styles.wizardTitle}>{isOwned ? 'Tell us about your property' : 'Tell us about the purchase'}</h2>

          {isOwned ? (<>
            <div className={styles.wizardFields}>
              <WField label="Current market value" sub="Estimated or appraised value today">
                <WStepInput value={inputs.currentMarketValue} onChange={v => set('currentMarketValue', v)} min={50000} step={25000} prefix="$" />
              </WField>
              <WField label="Outstanding mortgage balance" sub="Remaining principal owed">
                <WStepInput value={inputs.existingMortgageBal} onChange={v => set('existingMortgageBal', v)} min={0} step={10000} prefix="$" />
              </WField>
              <WField label="Current mortgage rate" sub="Annual interest rate on existing mortgage">
                <WStepInput value={+(inputs.existingMortgageRate * 100).toFixed(2)} onChange={v => set('existingMortgageRate', v / 100)} min={0.5} max={15} step={0.1} suffix="%" />
              </WField>
              <WField label="Remaining amortization" sub="Years left on your mortgage">
                <WStepInput value={inputs.existingMortgageTerm} onChange={v => set('existingMortgageTerm', v)} min={1} max={30} step={1} suffix=" yrs" />
              </WField>
            </div>

            {equity != null && (
              <div className={styles.equitySummary}>
                <div className={styles.equityRow}>
                  <span>Current equity</span>
                  <strong className={styles.equityGood}>{fmtC(equity)}</strong>
                </div>
                <div className={styles.equityRow}>
                  <span>Net sale proceeds (after {(inputs.closingCostSellPct * 100).toFixed(1)}% selling costs)</span>
                  <strong className={sellNet > 0 ? styles.equityGood : styles.equityBad}>{fmtC(sellNet)}</strong>
                </div>
                <div className={styles.equityNote}>
                  Cash-on-Cash and IRR will use your equity ({fmtC(equity)}) as the investment basis — reflecting your true opportunity cost.
                </div>
              </div>
            )}
          </>) : (<>
            <div className={styles.wizardFields}>
              <WField label="Purchase price">
                <WStepInput value={inputs.purchasePrice} onChange={v => set('purchasePrice', v)} min={50000} step={25000} prefix="$" />
              </WField>
              <WField label={`Down payment: ${(inputs.downPaymentPct * 100).toFixed(0)}%`} sub={fmtC(inputs.purchasePrice * inputs.downPaymentPct) + ' cash'}>
                <div className={styles.wPctRow}>
                  <input type="range" min={0} max={100} step={1} value={Math.round(inputs.downPaymentPct * 100)}
                    onChange={e => set('downPaymentPct', Number(e.target.value) / 100)} className={styles.wSlider} />
                  <WStepInput value={Math.round(inputs.downPaymentPct * 100)} onChange={v => set('downPaymentPct', v / 100)} min={0} max={100} step={1} suffix="%" />
                </div>
              </WField>
              <WField label="Mortgage rate">
                <WStepInput value={+(inputs.mortgageRate * 100).toFixed(2)} onChange={v => set('mortgageRate', v / 100)} min={0.5} max={15} step={0.1} suffix="%" />
              </WField>
              <WField label="Amortization term">
                <WStepInput value={inputs.mortgageTerm} onChange={v => set('mortgageTerm', v)} min={5} max={30} step={1} suffix=" yrs" />
              </WField>
            </div>

            <div className={styles.equitySummary}>
              <div className={styles.equityRow}>
                <span>Down payment + closing costs</span>
                <strong>{fmtC(inputs.purchasePrice * inputs.downPaymentPct + inputs.purchasePrice * inputs.closingCostBuyPct)}</strong>
              </div>
              <div className={styles.equityRow}>
                <span>Loan amount</span>
                <strong>{fmtC(inputs.purchasePrice * (1 - inputs.downPaymentPct))}</strong>
              </div>
            </div>
          </>)}

          <div className={styles.wizardNav}>
            <button className={styles.wizardBack} onClick={() => setWizardStep(1)}>← Back</button>
            <button className={styles.wizardNext} onClick={confirmAdd}>
              View analysis →
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Commercial property analyser</h2>
          <p className={styles.subtitle}>CAP rate · Cash-on-Cash · NOI · IRR · Equity accumulation · 30-year projection</p>
        </div>
        <div className={styles.headerBtns}>
          <Link to="/speculator" className={styles.speculatorCallout}>
            <svg width="13" height="13" viewBox="0 0 36 36" fill="none">
              <path d="M18 3L33 13v20H3V13L18 3z" fill="currentColor" opacity=".25" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
              <rect x="11" y="19" width="4" height="14" rx="1" fill="currentColor" opacity=".55"/>
              <rect x="18" y="15" width="4" height="18" rx="1" fill="currentColor"/>
            </svg>
            Try Property Speculator
            <span className={styles.speculatorBeta}>BETA</span>
          </Link>
          <button className={styles.resetBtn} onClick={() => setInputs(DEFAULTS)}>↺ Reset inputs</button>
          <button className={styles.removeBtn} onClick={removeAll}>✕ Remove property</button>
        </div>
      </div>

      {/* ── Sticky retirement action bar ── */}
      <div className={styles.actionBar}>
        <div className={styles.actionLeft}>
          <div className={styles.actionLabel}>
            <Icon name="scenarios" size={14} />
            Apply to retirement scenarios
          </div>
          <div className={styles.actionSub}>
            {inputs.retireContribMode === 'none' && !inputs.sellEnabled
              ? 'Not contributing — choose an option to include this property in your plan'
              : [
                  inputs.retireContribMode === 'cashflow' && monthlyContrib > 0 && `${fmtC(monthlyContrib)}/mo cash flow`,
                  inputs.retireContribMode === 'half'     && monthlyContrib > 0 && `${fmtC(monthlyContrib)}/mo (50% cash flow)`,
                  inputs.retireContribMode !== 'none'     && monthlyContrib <= 0 && 'Cash flow not yet positive',
                  inputs.sellEnabled && (() => {
                    const ownershipYears = Math.max(1, inputs.sellAge - person.currentAge)
                    const yrData = analysis.years[Math.min(ownershipYears - 1, analysis.years.length - 1)]
                    return yrData ? `Sell at ${inputs.sellAge} → ${fmtC(yrData.saleProceeds)} proceeds` : `Sell at ${inputs.sellAge}`
                  })(),
                ].filter(Boolean).join(' · ')
            }
          </div>
        </div>

        <div className={styles.actionRight}>
          {/* Contribution mode pills */}
          <div className={styles.modeGroup}>
            {[
              { val: 'none',     label: 'No cash flow' },
              { val: 'cashflow', label: '100% CF' },
              { val: 'half',     label: '50% CF' },
            ].map(({ val, label }) => (
              <button
                key={val}
                className={`${styles.modePill} ${inputs.retireContribMode === val ? styles.modePillActive : ''}`}
                onClick={() => set('retireContribMode', val)}
                title={val === 'none' ? 'Do not route cash flow to retirement' : val === 'cashflow' ? 'Apply 100% of annual cash flow to retirement savings' : 'Apply 50% of cash flow to retirement savings'}
              >{label}</button>
            ))}
          </div>

          {/* Sell toggle */}
          <div className={styles.sellGroup}>
            <button
              className={`${styles.sellPill} ${inputs.sellEnabled ? styles.sellPillActive : ''}`}
              onClick={() => set('sellEnabled', !inputs.sellEnabled)}
            >
              <Icon name={inputs.sellEnabled ? 'check' : 'plus'} size={12} />
              {inputs.sellEnabled ? `Sell at ${inputs.sellAge}` : 'Add sale'}
            </button>
            {inputs.sellEnabled && (
              <input
                type="number"
                className={styles.sellAgeInput}
                value={inputs.sellAge}
                min={person.currentAge + 1}
                max={95}
                step={1}
                onChange={e => set('sellAge', Number(e.target.value))}
                title="Age at which you sell the property"
              />
            )}
            {inputs.sellEnabled && (
              <button
                className={`${styles.cgBtn} ${inputs.ccaClaimedToDate > 0 || inputs.coupleOwnership ? styles.cgBtnActive : ''}`}
                onClick={() => setShowCGModal(true)}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                </svg>
                Capital gains tax
              </button>
            )}
          </div>

          {/* Apply button — highlights when something is active */}
          <div className={`${styles.activeIndicator} ${(inputs.retireContribMode !== 'none' || inputs.sellEnabled) ? styles.activeIndicatorOn : ''}`}>
            {(inputs.retireContribMode !== 'none' || inputs.sellEnabled)
              ? <><Icon name="check" size={13} /> Applied to scenarios</>
              : 'Not applied'}
          </div>
        </div>
      </div>

      <div className={styles.layout}>
        {/* ── Left panel: inputs ── */}
        <div className={styles.inputCol}>

          {inputs.ownershipMode === 'owned' ? (
            <section className={styles.section}>
              <div className={styles.sectionTitle}>Your property</div>
              <Field label="Current market value">
                <StepInput value={inputs.currentMarketValue} onChange={v => set('currentMarketValue', v)} min={50000} step={25000} prefix="$" wide />
              </Field>
              <Field label="Outstanding mortgage balance">
                <StepInput value={inputs.existingMortgageBal} onChange={v => set('existingMortgageBal', v)} min={0} step={10000} prefix="$" wide />
              </Field>
              <Field label={`Mortgage rate: ${(inputs.existingMortgageRate * 100).toFixed(2)}%`}>
                <PctInput value={inputs.existingMortgageRate} onChange={v => set('existingMortgageRate', v)} min={0.005} max={0.15} step={0.0025} />
              </Field>
              <Field label="Remaining amortization">
                <StepInput value={inputs.existingMortgageTerm} onChange={v => set('existingMortgageTerm', v)} min={1} max={30} step={1} suffix=" yrs" />
              </Field>
              <div className={styles.highlight}>
                Equity: <strong>{fmtC(Math.max(0, inputs.currentMarketValue - inputs.existingMortgageBal))}</strong>
                {' '}· Monthly payment: <strong>{fmtC(annualMortgage / 12)}</strong>
              </div>
            </section>
          ) : (
            <>
              <section className={styles.section}>
                <div className={styles.sectionTitle}>Purchase</div>
                <Field label="Purchase price"><StepInput value={inputs.purchasePrice} onChange={v => set('purchasePrice', v)} min={50000} step={25000} prefix="$" wide /></Field>
                <Field label={`Down payment: ${(inputs.downPaymentPct * 100).toFixed(0)}%`} sub={`${fmtC(inputs.purchasePrice * inputs.downPaymentPct)} cash`}>
                  <PctInput value={inputs.downPaymentPct} onChange={v => set('downPaymentPct', v)} min={0} max={1} step={0.01} />
                </Field>
                <Field label={`Closing costs (buy): ${(inputs.closingCostBuyPct * 100).toFixed(1)}%`} sub={fmtC(inputs.purchasePrice * inputs.closingCostBuyPct)}>
                  <PctInput value={inputs.closingCostBuyPct} onChange={v => set('closingCostBuyPct', v)} min={0} max={0.05} step={0.005} />
                </Field>
                <div className={styles.highlight}>Total cash required: <strong>{fmtC(totalCashIn)}</strong></div>
              </section>

              <section className={styles.section}>
                <div className={styles.sectionTitle}>Mortgage</div>
                <Field label={`Interest rate: ${(inputs.mortgageRate * 100).toFixed(2)}%`} sub="Canadian semi-annual compounding">
                  <PctInput value={inputs.mortgageRate} onChange={v => set('mortgageRate', v)} min={0.01} max={0.15} step={0.0025} />
                </Field>
                <Field label="Amortization term">
                  <StepInput value={inputs.mortgageTerm} onChange={v => set('mortgageTerm', v)} min={5} max={30} step={1} suffix=" yrs" />
                </Field>
                <div className={styles.highlight}>Monthly payment: <strong>{fmtC(annualMortgage / 12)}</strong> · Loan: <strong>{fmtC(loanAmount)}</strong></div>
              </section>
            </>
          )}

          <section className={styles.section}>
            <div className={styles.sectionTitle}>Rental income</div>
            <Field label="Sq footage"><StepInput value={inputs.sqFootage} onChange={v => set('sqFootage', v)} min={500} step={100} suffix=" ft²" /></Field>
            <Field label="Rent per sq ft / year" sub="Commercial standard — e.g. $15/sqft/yr"><StepInput value={inputs.rentPerSqFt} onChange={v => set('rentPerSqFt', v)} min={0} step={0.5} prefix="$" /></Field>
            <Field label="Shared CAM / month" sub="Common area maintenance (billed monthly to tenants)"><StepInput value={inputs.sharedCAM} onChange={v => set('sharedCAM', v)} min={0} step={50} prefix="$" /></Field>
            <div className={styles.highlight}>Annual rent: <strong>{fmtC(inputs.sqFootage * inputs.rentPerSqFt)}</strong> + CAM: <strong>{fmtC(inputs.sharedCAM * 12)}/yr</strong> · Gross scheduled: <strong>{fmtC(inputs.sqFootage * inputs.rentPerSqFt + inputs.sharedCAM * 12)}</strong></div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionTitle}>Operating expenses</div>
            <Field label={`Vacancy allowance: ${(inputs.vacancyRate * 100).toFixed(0)}%`}>
              <PctInput value={inputs.vacancyRate} onChange={v => set('vacancyRate', v)} min={0} max={0.3} step={0.01} />
            </Field>
            <Field label={`Maintenance reserve: ${(inputs.maintenanceReservePct * 100).toFixed(0)}%`} sub="of gross scheduled income">
              <PctInput value={inputs.maintenanceReservePct} onChange={v => set('maintenanceReservePct', v)} min={0} max={0.15} step={0.01} />
            </Field>
            <Field label={`Property management: ${(inputs.managementFeePct * 100).toFixed(0)}%`} sub="of operating income">
              <PctInput value={inputs.managementFeePct} onChange={v => set('managementFeePct', v)} min={0} max={0.15} step={0.01} />
            </Field>
            <Field label="Property tax rate" sub="% of purchase price / year">
              <PctInput value={inputs.propertyTaxRate} onChange={v => set('propertyTaxRate', v)} min={0.005} max={0.05} step={0.0005} />
            </Field>
            <Field label="Insurance (annual)"><StepInput value={inputs.insurance} onChange={v => set('insurance', v)} min={0} step={100} prefix="$" /></Field>
            <button className={styles.expandBtn} onClick={() => setShowExpenses(!showExpenses)}>
              {showExpenses ? '▲ Hide' : '▼ More'} expense items
            </button>
            {showExpenses && (
              <>
                <Field label="Utilities (annual)"><StepInput value={inputs.utilities} onChange={v => set('utilities', v)} min={0} step={100} prefix="$" /></Field>
                <Field label="Misc expenses (annual)" sub="Accounting, advertising, legal, etc."><StepInput value={inputs.miscExpenses} onChange={v => set('miscExpenses', v)} min={0} step={100} prefix="$" /></Field>
              </>
            )}
          </section>

          <section className={styles.section}>
            <div className={styles.sectionTitle}>Growth assumptions</div>
            <Field label={`Rental increase: ${(inputs.rentalIncreaseRate * 100).toFixed(1)}%/yr`}>
              <PctInput value={inputs.rentalIncreaseRate} onChange={v => set('rentalIncreaseRate', v)} min={0} max={0.1} step={0.005} />
            </Field>
            <Field label={`Appreciation: ${(inputs.appreciationRate * 100).toFixed(1)}%/yr`}>
              <PctInput value={inputs.appreciationRate} onChange={v => set('appreciationRate', v)} min={0} max={0.15} step={0.005} />
            </Field>
            <Field label={`Property tax increase: ${(inputs.propertyTaxIncrease * 100).toFixed(1)}%/yr`}>
              <PctInput value={inputs.propertyTaxIncrease} onChange={v => set('propertyTaxIncrease', v)} min={0} max={0.05} step={0.005} />
            </Field>
            <Field label={`Building to land ratio: ${(inputs.buildingToLandRatio * 100).toFixed(0)}%`} sub={`Depreciation base: ${fmtC(purchasePrice * inputs.buildingToLandRatio)} / 27.5 yrs = ${fmtC(annualDepreciation)}/yr`}>
              <PctInput value={inputs.buildingToLandRatio} onChange={v => set('buildingToLandRatio', v)} min={0.4} max={0.95} step={0.05} />
            </Field>
            <Field label={`Selling closing costs: ${(inputs.closingCostSellPct * 100).toFixed(1)}%`}>
              <PctInput value={inputs.closingCostSellPct} onChange={v => set('closingCostSellPct', v)} min={0} max={0.08} step={0.005} />
            </Field>
            <Field label="Holding period">
              <StepInput value={inputs.holdingYears} onChange={v => set('holdingYears', Math.min(30, Math.max(1, v)))} min={1} max={30} step={1} suffix=" yrs" />
            </Field>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionTitle}>Capital gains on sale</div>
            <Field label="CCA claimed to date" sub="Total depreciation deducted — triggers recapture at 100% tax">
              <StepInput value={inputs.ccaClaimedToDate || 0} onChange={v => set('ccaClaimedToDate', v)} min={0} step={5000} prefix="$" />
            </Field>
            <Field label={`Your marginal tax rate: ${inputs.marginalTaxRate || 40}%`} sub="Applied to recapture (100%) and taxable gain (50%)">
              <PctInput value={(inputs.marginalTaxRate || 40) / 100} onChange={v => set('marginalTaxRate', Math.round(v * 100))} min={0.2} max={0.6} step={0.01} />
            </Field>
            <div className={styles.cgToggleRow}>
              <button
                className={`${styles.cgToggle} ${inputs.coupleOwnership ? styles.cgToggleOn : ''}`}
                onClick={() => set('coupleOwnership', !inputs.coupleOwnership)}
              >
                {inputs.coupleOwnership ? '✓' : '○'} Split gain between spouses (50/50)
              </button>
            </div>
            {inputs.coupleOwnership && (
              <Field label={`Spouse marginal rate: ${inputs.spouseMarginalRate || 35}%`}>
                <PctInput value={(inputs.spouseMarginalRate || 35) / 100} onChange={v => set('spouseMarginalRate', Math.round(v * 100))} min={0.2} max={0.6} step={0.01} />
              </Field>
            )}
            <div className={styles.cgNote}>
              Capital gains: 50% inclusion rate. CCA recapture: 100% taxable as ordinary income. Land portion not depreciable.
            </div>
          </section>

        </div>

        {/* ── Right panel: results ── */}
        <div className={styles.resultCol}>

          {/* KPI summary */}
          <div className={styles.kpiGrid}>
            <KPICard label="CAP rate (yr 1)" value={pct(capRateYear1)} sub="NOI / property value" tone={capRateYear1 > 0.05 ? 'good' : capRateYear1 > 0.035 ? 'neutral' : 'warn'} big />
            <KPICard label="Cash-on-Cash (yr 1)" value={pct(cocReturnYear1)} sub="Cash flow / equity invested" tone={cocReturnYear1 > 0.06 ? 'good' : cocReturnYear1 > 0 ? 'neutral' : 'warn'} big />
            <KPICard label={`IRR (${inputs.holdingYears}-yr)`} value={irr != null ? pct(irr) : '—'} sub="Total annualised return" tone={irr != null && irr > 0.08 ? 'good' : 'neutral'} big />
            <KPICard label="DSCR (yr 1)" value={dscrYear1 != null ? dscrYear1.toFixed(2) + 'x' : '—'} sub={dscrOk ? 'Lender threshold met (≥1.25)' : 'Below lender threshold'} tone={dscrOk ? 'good' : 'warn'} big />
          </div>

          <div className={styles.kpiGrid4}>
            <KPICard label="NOI (yr 1)"       value={fmtC(noiYear1)}       sub="Net operating income" />
            <KPICard label="Cash flow (yr 1)"  value={fmtC(cashFlowYear1)}  sub="After mortgage" tone={cashFlowYear1 > 0 ? 'good' : 'warn'} />
            <KPICard label="Equity (yr 5)"     value={fmtK(equity5)}        sub="Appreciation + paydown" />
            <KPICard label="Annual depreciation" value={fmtC(annualDepreciation)} sub="CCA class 1 (27.5 yrs)" />
          </div>

          {/* Owned-property: sell vs hold panel */}
          {inputs.ownershipMode === 'owned' && (() => {
            const currEquity     = Math.max(0, inputs.currentMarketValue - inputs.existingMortgageBal)
            const sellingCosts   = inputs.currentMarketValue * inputs.closingCostSellPct
            const netSaleToday   = inputs.currentMarketValue - sellingCosts - inputs.existingMortgageBal
            return (
              <div className={styles.sellPanel}>
                <div className={styles.sellPanelTitle}>Current position &amp; sell scenario</div>
                <div className={styles.sellGrid}>
                  <div className={styles.sellItem}>
                    <span className={styles.sellLabel}>Current equity</span>
                    <span className={styles.sellVal}>{fmtC(currEquity)}</span>
                  </div>
                  <div className={styles.sellItem}>
                    <span className={styles.sellLabel}>Net sale proceeds today</span>
                    <span className={`${styles.sellVal} ${netSaleToday > 0 ? styles.pos : styles.neg}`}>{fmtC(netSaleToday)}</span>
                  </div>
                  <div className={styles.sellItem}>
                    <span className={styles.sellLabel}>Selling costs ({(inputs.closingCostSellPct * 100).toFixed(1)}%)</span>
                    <span className={styles.sellVal}>{fmtC(sellingCosts)}</span>
                  </div>
                  <div className={styles.sellItem}>
                    <span className={styles.sellLabel}>Mortgage balance</span>
                    <span className={styles.sellVal}>{fmtC(inputs.existingMortgageBal)}</span>
                  </div>
                </div>
                <p className={styles.sellNote}>
                  If you sold today, net proceeds of <strong>{fmtC(netSaleToday)}</strong> could be reinvested
                  or added to your retirement plan. Compare this against holding: your equity at year {inputs.holdingYears} is projected at <strong>{fmtK(analysis.equityFinal)}</strong>.
                </p>
              </div>
            )
          })()}

          {/* ── After-tax sale proceeds panel ── */}
          {(() => {
            const holdYrs = inputs.holdingYears
            const yrData  = years[Math.min(holdYrs - 1, years.length - 1)]
            const cg      = yrData ? calcCapGainsTax(yrData, inputs.sellAge) : null
            if (!cg) return null
            const saved   = cg.grossProceeds - cg.afterTaxProceeds
            return (
              <div className={styles.cgPanel}>
                <div className={styles.cgPanelTitle}>
                  After-tax sale proceeds — year {holdYrs}
                  {inputs.coupleOwnership && <span className={styles.cgPanelSub}> · 50/50 couple split</span>}
                </div>
                <div className={styles.cgGrid}>
                  <div className={styles.cgRow}>
                    <span className={styles.cgLabel}>Sale price</span>
                    <span className={styles.cgVal}>{fmtC(cg.salePrice)}</span>
                  </div>
                  <div className={styles.cgRow}>
                    <span className={styles.cgLabel}>Selling costs ({(inputs.closingCostSellPct * 100).toFixed(1)}%)</span>
                    <span className={`${styles.cgVal} ${styles.cgNeg}`}>− {fmtC(cg.sellingCosts)}</span>
                  </div>
                  <div className={styles.cgRow}>
                    <span className={styles.cgLabel}>Mortgage balance</span>
                    <span className={`${styles.cgVal} ${styles.cgNeg}`}>− {fmtC(cg.mortBal)}</span>
                  </div>
                  <div className={`${styles.cgRow} ${styles.cgRowSub}`}>
                    <span className={styles.cgLabel}>Gross proceeds (pre-tax)</span>
                    <span className={styles.cgVal}>{fmtC(cg.grossProceeds)}</span>
                  </div>

                  <div className={styles.cgDivider} />

                  <div className={styles.cgRow}>
                    <span className={styles.cgLabel}>
                      Capital gain
                      <span className={styles.cgChip}>50% taxable</span>
                    </span>
                    <span className={styles.cgVal}>{fmtC(cg.capitalGain)}</span>
                  </div>
                  <div className={styles.cgRow}>
                    <span className={styles.cgLabel}>Capital gains tax</span>
                    <span className={`${styles.cgVal} ${styles.cgNeg}`}>− {fmtC(cg.gainTax)}</span>
                  </div>

                  {cg.recapture > 0 && (
                    <>
                      <div className={styles.cgRow}>
                        <span className={styles.cgLabel}>
                          CCA recapture
                          <span className={`${styles.cgChip} ${styles.cgChipWarn}`}>100% taxable</span>
                        </span>
                        <span className={styles.cgVal}>{fmtC(cg.recapture)}</span>
                      </div>
                      <div className={styles.cgRow}>
                        <span className={styles.cgLabel}>Recapture tax</span>
                        <span className={`${styles.cgVal} ${styles.cgNeg}`}>− {fmtC(cg.recaptureTax)}</span>
                      </div>
                    </>
                  )}

                  <div className={styles.cgDivider} />

                  <div className={`${styles.cgRow} ${styles.cgRowTotal}`}>
                    <span className={styles.cgLabel}>Total tax on sale</span>
                    <span className={`${styles.cgVal} ${styles.cgNeg}`}>− {fmtC(cg.totalTax)}</span>
                  </div>
                  <div className={`${styles.cgRow} ${styles.cgRowResult}`}>
                    <span className={styles.cgLabel}>After-tax proceeds</span>
                    <span className={`${styles.cgVal} ${cg.afterTaxProceeds > 0 ? styles.cgPos : styles.cgNeg}`}>
                      {fmtC(cg.afterTaxProceeds)}
                    </span>
                  </div>
                </div>

                {inputs.coupleOwnership && (
                  <div className={styles.cgSplitNote}>
                    Each spouse: <strong>{fmtC(cg.capitalGain / 2)}</strong> gain (taxable: {fmtC(cg.taxableGain / 2)}) at {inputs.marginalTaxRate}% / {inputs.spouseMarginalRate}%
                    {cg.recapture > 0 && <> + <strong>{fmtC(cg.recapture / 2)}</strong> recapture each</>}
                  </div>
                )}

                <div className={styles.cgStrategies}>
                  <div className={styles.cgStrategiesTitle}>Tax reduction strategies</div>
                  <div className={styles.cgStrategy}>
                    <span className={styles.cgStratIcon}>📅</span>
                    <span><strong>Sell in retirement</strong> — lower marginal rate reduces both gain tax and recapture. Your {inputs.marginalTaxRate}% rate dropping to 30% saves ~{fmtC(cg.totalTax * (1 - 30 / (inputs.marginalTaxRate || 40)))}.</span>
                  </div>
                  {!inputs.coupleOwnership && (
                    <div className={styles.cgStrategy}>
                      <span className={styles.cgStratIcon}>👥</span>
                      <span><strong>50/50 spouse ownership</strong> — splitting the gain could reduce total tax by spreading across two marginal rates.</span>
                    </div>
                  )}
                  <div className={styles.cgStrategy}>
                    <span className={styles.cgStratIcon}>📋</span>
                    <span><strong>Capital gains reserve</strong> — if taking a vendor take-back mortgage, spread the gain over up to 5 years to stay in lower brackets.</span>
                  </div>
                  {cg.recapture > 0 && (
                    <div className={styles.cgStrategy}>
                      <span className={styles.cgStratIcon}>⚠️</span>
                      <span><strong>CCA recapture ({fmtC(cg.recapture)})</strong> — 100% taxable as income. Consider limiting future CCA claims if you plan to sell, as the tax savings now may not outweigh the higher recapture bill later.</span>
                    </div>
                  )}
                  <div className={styles.cgStrategy}>
                    <span className={styles.cgStratIcon}>🔄</span>
                    <span><strong>Replacement property election</strong> — if buying another commercial property, you may defer some capital gains recognition. Consult a tax advisor.</span>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Chart tabs */}
          <div className={styles.chartCard}>
            <div className={styles.chartTabs}>
              {[
                ['cashflow',  'Cash flow'],
                ['equity',    'Equity & value'],
                ['returns',   'Returns'],
              ].map(([id, label]) => (
                <button key={id}
                  className={`${styles.chartTab} ${activeChart === id ? styles.chartTabActive : ''}`}
                  onClick={() => setActiveChart(id)}
                >{label}</button>
              ))}
            </div>

            {activeChart === 'cashflow' && (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-10)" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--gray-40)' }} label={{ value: 'Year', position: 'insideBottom', offset: -2, fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--gray-40)' }} tickFormatter={v => Math.abs(v) >= 1_000_000 ? '$' + (v/1_000_000).toFixed(1) + 'M' : '$' + Math.round(v/1000) + 'k'} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke="var(--gray-20)" />
                  <Bar dataKey="noi" name="NOI" fill="#1D9E75" radius={[2,2,0,0]}>
                    {chartData.map((d, i) => <Cell key={i} fill="#1D9E75" />)}
                  </Bar>
                  <Bar dataKey="cashFlow" name="Cash flow" fill="#378ADD" radius={[2,2,0,0]}>
                    {chartData.map((d, i) => <Cell key={i} fill={d.cashFlow >= 0 ? '#378ADD' : '#E24B4A'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}

            {activeChart === 'equity' && (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-10)" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--gray-40)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--gray-40)' }} tickFormatter={v => Math.abs(v) >= 1000 ? '$' + (v/1000).toFixed(1) + 'M' : '$' + v + 'k'} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line dataKey="propValue" name="Property value ($k)" stroke="#D85A30" strokeWidth={2} dot={false} />
                  <Line dataKey="equity" name="Your equity ($k)" stroke="#1D9E75" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}

            {activeChart === 'returns' && (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-10)" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--gray-40)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--gray-40)' }} tickFormatter={v => v + '%'} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line dataKey="capRate" name="CAP rate (%)" stroke="#D85A30" strokeWidth={2} dot={false} />
                  <Line dataKey="coc" name="Cash-on-Cash (%)" stroke="#1D9E75" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}

            <div className={styles.chartLegend}>
              {activeChart === 'cashflow' && <>
                <span><span className={styles.dot} style={{background:'#1D9E75'}}/>NOI</span>
                <span><span className={styles.dot} style={{background:'#378ADD'}}/>Cash flow (after mortgage)</span>
              </>}
              {activeChart === 'equity' && <>
                <span><span className={styles.dot} style={{background:'#D85A30'}}/>Property value</span>
                <span><span className={styles.dot} style={{background:'#1D9E75'}}/>Your equity</span>
              </>}
              {activeChart === 'returns' && <>
                <span><span className={styles.dot} style={{background:'#D85A30'}}/>CAP rate</span>
                <span><span className={styles.dot} style={{background:'#1D9E75'}}/>Cash-on-Cash</span>
              </>}
            </div>
          </div>

          {/* Year-by-year table */}
          <div className={styles.tableCard}>
            <div className={styles.tableTitle}>Year-by-year projection</div>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Year</th>
                    <th>Gross income</th>
                    <th>NOI</th>
                    <th>Cash flow</th>
                    <th>Monthly CF</th>
                    <th>CAP rate</th>
                    <th>CoC return</th>
                    <th>DSCR</th>
                    <th>Property value</th>
                    <th>Equity</th>
                    <th>Mortgage bal.</th>
                    <th>Sale proceeds</th>
                  </tr>
                </thead>
                <tbody>
                  {years.map(y => (
                    <tr key={y.year} className={y.year % 5 === 0 ? styles.highlight5 : ''}>
                      <td className={styles.yearCell}>{y.year}</td>
                      <td>{fmtC(y.grossScheduled)}</td>
                      <td className={y.noi > 0 ? styles.pos : styles.neg}>{fmtC(y.noi)}</td>
                      <td className={y.annualCashFlow > 0 ? styles.pos : styles.neg}>{fmtC(y.annualCashFlow)}</td>
                      <td className={y.monthlyCashFlow > 0 ? styles.pos : styles.neg}>{fmtC(y.monthlyCashFlow)}</td>
                      <td>{pct(y.capRate)}</td>
                      <td>{pct(y.cocReturn)}</td>
                      <td className={y.dscr >= 1.25 ? styles.pos : styles.neg}>{y.dscr?.toFixed(2)}x</td>
                      <td>{fmtK(y.propValue)}</td>
                      <td className={styles.pos}>{fmtK(y.equity)}</td>
                      <td>{fmtK(y.mortBal)}</td>
                      <td>{fmtK(y.saleProceeds)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Metric glossary */}
          <div className={styles.glossary}>
            <div className={styles.glossaryTitle}>Metric definitions</div>
            <div className={styles.glossaryGrid}>
              <div><strong>CAP rate</strong> — NOI ÷ Property value. Unlevered yield; excludes financing. Compare against market rates (4–6% typical for stable Canadian commercial).</div>
              <div><strong>Cash-on-Cash</strong> — Annual cash flow ÷ total equity invested. Measures actual cash yield on your capital including financing.</div>
              <div><strong>NOI</strong> — Gross income less vacancy loss less all operating expenses. Does NOT include mortgage payments.</div>
              <div><strong>IRR</strong> — Internal Rate of Return across the full holding period including sale proceeds. Accounts for time value of money.</div>
              <div><strong>DSCR</strong> — Debt Service Coverage Ratio. NOI ÷ annual mortgage. Lenders typically require ≥1.25x.</div>
              <div><strong>Depreciation</strong> — Building value ÷ 27.5 years (CCA Class 1). A non-cash expense that reduces taxable income.</div>
            </div>
          </div>
        </div>
      </div>

      {showCGModal && (
        <CapitalGainsModal
          inputs={inputs}
          set={set}
          analysis={analysis}
          onClose={() => setShowCGModal(false)}
        />
      )}
    </div>
  )
}