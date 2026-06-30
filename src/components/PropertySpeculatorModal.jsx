import React, { useState, useMemo, useRef } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts'
import { analyseProperty, pct, fmtC, fmtK } from '../lib/propertyEngine.js'
import { NumericInput } from './NumericInput.jsx'
import { Icon, IconBox } from './Icon.jsx'
import styles from './PropertySpeculatorModal.module.css'

// ─── Default inputs for speculator ───────────────────────────────────────────
const DEFAULTS = {
  purchasePrice:      1_000_000,
  downPaymentPct:     25,
  mortgageRate:       0.065,
  mortgageTerm:       25,
  sqFootage:          4000,
  rentPerSqFt:        18,        // annual $/sqft
  vacancyRate:        0.05,
  sharedCAM:          800,       // monthly
  maintenanceReservePct: 0.02,
  managementFeePct:   0.08,
  propertyTaxRate:    0.015,
  insurance:          400,
  utilities:          300,
  miscExpenses:       200,
  rentalIncreaseRate: 0.03,
  propertyTaxIncrease: 0.02,
  utilitiesIncrease:  0.025,
  appreciationRate:   0.03,
  buildingToLandRatio: 0.70,
  closingCostBuyPct:  0.015,
  closingCostSellPct: 0.04,
  holdingYears:       10,
  ownershipMode:      'buying',
}

// ─── Small helper components ──────────────────────────────────────────────────
const fmtN = n => n == null || !isFinite(n) ? '—' : '$' + Math.round(n).toLocaleString('en-CA')

function Field({ label, sub, children }) {
  return (
    <div className={styles.field}>
      <div className={styles.fieldLabel}>{label}{sub && <span className={styles.fieldSub}> — {sub}</span>}</div>
      {children}
    </div>
  )
}

function PctInput({ value, onChange, min = 0, max = 0.5, step = 0.0025 }) {
  return (
    <NumericInput
      value={+(value * 100).toFixed(2)}
      onChange={v => onChange(Math.min(max, Math.max(min, v / 100)))}
      min={min * 100} max={max * 100}
      step={+(step * 100).toFixed(2)}
      suffix="%"
    />
  )
}

function KPI({ label, value, tone, sub }) {
  return (
    <div className={`${styles.kpi} ${tone ? styles['kpi_' + tone] : ''}`}>
      <div className={styles.kpiValue}>{value}</div>
      <div className={styles.kpiLabel}>{label}</div>
      {sub && <div className={styles.kpiSub}>{sub}</div>}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.tooltip}>
      <div className={styles.tipLabel}>Year {label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontSize: 12, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span>{p.name}</span><span>${Math.round(Math.abs(p.value)).toLocaleString('en-CA')}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function PropertySpeculatorModal({ onClose }) {
  const [inputs, setInputs] = useState(DEFAULTS)
  const [activeTab, setActiveTab] = useState('overview')
  const set = (k, v) => setInputs(prev => ({ ...prev, [k]: v }))

  const analysis = useMemo(() => analyseProperty({
    ...inputs,
    downPaymentPct: inputs.downPaymentPct / 100,  // stored as 0–100, engine expects 0–1
    insurance:      inputs.insurance * 12,         // stored as monthly, engine expects annual
    utilities:      inputs.utilities * 12,         // stored as monthly, engine expects annual
  }), [inputs])
  const { years, capRateYear1, cocReturnYear1, dscrYear1, noiYear1, cashFlowYear1,
          equity5, irr, purchasePrice, downPayment, totalCashIn,
          annualMortgage, loanAmount, annualDepreciation } = analysis

  const dscrOk = dscrYear1 != null && dscrYear1 >= 1.25
  const cocGood = cocReturnYear1 > 0.07
  const irrGood = irr > 0.10

  // Sale analysis
  const holdYrs = Math.max(1, Math.min(inputs.holdingYears, years.length))
  const exitYear = years[holdYrs - 1]
  const saleProceeds = exitYear?.saleProceeds ?? 0
  const totalCashReceived = (years.slice(0, holdYrs).reduce((s, y) => s + Math.max(0, y.annualCashFlow), 0)) + saleProceeds
  const totalInvested = totalCashIn   // already includes down payment + closing costs from engine
  const totalReturn = saleProceeds + (years.slice(0, holdYrs).reduce((s, y) => s + y.annualCashFlow, 0)) - totalInvested
  const moic = totalInvested > 0 ? (totalCashReceived / totalInvested).toFixed(2) : '—'

  // Chart data
  const chartData = years.map(y => ({
    year: y.year,
    cashFlow:  Math.round(y.annualCashFlow),
    equity:    Math.round(y.equity / 1000),
    propValue: Math.round(y.propValue / 1000),
    noi:       Math.round(y.noi),
    capRate:   +(y.capRate * 100).toFixed(2),
    coc:       +(y.cocReturn * 100).toFixed(2),
  }))

  const onBackdrop = e => { if (e.target === e.currentTarget) onClose() }

  return (
    <div className={styles.backdrop} onClick={onBackdrop} role="dialog" aria-modal="true">
      <div className={styles.modal}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <IconBox name="property" size={18} tone="teal" />
            <div>
              <div className={styles.headerTitle}>Commercial Property Speculator</div>
              <div className={styles.headerSub}>Evaluate a new investment property — independent of your retirement plan</div>
            </div>
          </div>
          <div className={styles.headerRight}>
            <button className={styles.resetBtn} onClick={() => setInputs(DEFAULTS)}>
              <Icon name="reset" size={13} /> Reset
            </button>
            <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
              <Icon name="close" size={15} />
            </button>
          </div>
        </div>

        <div className={styles.body}>

          {/* ── Left: inputs ── */}
          <div className={styles.inputCol}>
            <div className={styles.inputSection}>
              <div className={styles.sectionTitle}>Purchase</div>
              <Field label="Purchase price">
                <NumericInput value={inputs.purchasePrice} onChange={v => set('purchasePrice', v)} min={50000} step={25000} prefix="$" />
              </Field>
              <Field label="Down payment" sub={`${fmtN(inputs.purchasePrice * inputs.downPaymentPct / 100)}`}>
                <NumericInput value={inputs.downPaymentPct} onChange={v => set('downPaymentPct', Math.min(100, Math.max(0, v)))} min={0} max={100} step={5} suffix="%" />
              </Field>
              <Field label="Mortgage rate">
                <PctInput value={inputs.mortgageRate} onChange={v => set('mortgageRate', v)} min={0.01} max={0.15} step={0.0025} />
              </Field>
              <Field label="Amortization">
                <NumericInput value={inputs.mortgageTerm} onChange={v => set('mortgageTerm', v)} min={5} max={30} step={1} suffix=" yrs" />
              </Field>
              <Field label="Closing costs (buy)" sub="Transfer tax, legal, etc.">
                <PctInput value={inputs.closingCostBuyPct} onChange={v => set('closingCostBuyPct', v)} min={0} max={0.05} step={0.001} />
              </Field>
            </div>

            <div className={styles.inputSection}>
              <div className={styles.sectionTitle}>Income</div>
              <Field label="Leasable area" sub="sq ft">
                <NumericInput value={inputs.sqFootage} onChange={v => set('sqFootage', v)} min={500} step={500} suffix=" sqft" />
              </Field>
              <Field label="Rent" sub="Annual $/sqft (commercial standard)">
                <NumericInput value={inputs.rentPerSqFt} onChange={v => set('rentPerSqFt', v)} min={5} step={0.5} prefix="$" suffix="/sqft/yr" />
              </Field>
              <div className={styles.rentPreview}>
                → <strong>{fmtN(inputs.sqFootage * inputs.rentPerSqFt)}/yr</strong> gross rent
                {inputs.sharedCAM > 0 && <> + <strong>{fmtN(inputs.sharedCAM * 12)}/yr</strong> CAM</>}
              </div>
              <Field label="Vacancy rate">
                <PctInput value={inputs.vacancyRate} onChange={v => set('vacancyRate', v)} min={0} max={0.5} step={0.01} />
              </Field>
              <Field label="CAM recovery" sub="Monthly">
                <NumericInput value={inputs.sharedCAM} onChange={v => set('sharedCAM', v)} min={0} step={50} prefix="$" />
              </Field>
              <Field label="Annual rent increase">
                <PctInput value={inputs.rentalIncreaseRate} onChange={v => set('rentalIncreaseRate', v)} min={0} max={0.15} step={0.005} />
              </Field>
            </div>

            <div className={styles.inputSection}>
              <div className={styles.sectionTitle}>Expenses</div>
              <Field label="Maintenance reserve">
                <PctInput value={inputs.maintenanceReservePct} onChange={v => set('maintenanceReservePct', v)} min={0} max={0.10} step={0.005} />
              </Field>
              <Field label="Management fee">
                <PctInput value={inputs.managementFeePct} onChange={v => set('managementFeePct', v)} min={0} max={0.15} step={0.005} />
              </Field>
              <Field label="Property tax rate">
                <PctInput value={inputs.propertyTaxRate} onChange={v => set('propertyTaxRate', v)} min={0.005} max={0.04} step={0.0005} />
              </Field>
              <Field label="Insurance" sub="Monthly">
                <NumericInput value={inputs.insurance} onChange={v => set('insurance', v)} min={0} step={50} prefix="$" />
              </Field>
              <Field label="Utilities" sub="Monthly">
                <NumericInput value={inputs.utilities} onChange={v => set('utilities', v)} min={0} step={50} prefix="$" />
              </Field>
            </div>

            <div className={styles.inputSection}>
              <div className={styles.sectionTitle}>Exit strategy</div>
              <Field label="Hold period">
                <NumericInput value={inputs.holdingYears} onChange={v => set('holdingYears', Math.min(30, Math.max(1, v)))} min={1} max={30} step={1} suffix=" yrs" />
              </Field>
              <Field label="Appreciation rate">
                <PctInput value={inputs.appreciationRate} onChange={v => set('appreciationRate', v)} min={0} max={0.15} step={0.005} />
              </Field>
              <Field label="Selling costs" sub="Agent, legal">
                <PctInput value={inputs.closingCostSellPct} onChange={v => set('closingCostSellPct', v)} min={0} max={0.10} step={0.005} />
              </Field>
            </div>
          </div>

          {/* ── Right: analysis ── */}
          <div className={styles.analysisCol}>

            {/* KPI strip */}
            <div className={styles.kpiStrip}>
              <KPI label="CAP Rate" value={pct(capRateYear1)} tone={capRateYear1 > 0.06 ? 'good' : capRateYear1 > 0.04 ? 'warn' : 'bad'} sub="Year 1" />
              <KPI label="Cash-on-Cash" value={pct(cocReturnYear1)} tone={cocGood ? 'good' : cocReturnYear1 > 0.04 ? 'warn' : 'bad'} sub="Year 1" />
              <KPI label="DSCR" value={dscrYear1?.toFixed(2) ?? '—'} tone={dscrOk ? 'good' : dscrYear1 > 1.0 ? 'warn' : 'bad'} sub="≥ 1.25 = lender OK" />
              <KPI label="NOI Yr 1" value={fmtK(noiYear1)} sub="Net operating income" />
              <KPI label="Cash Flow" value={fmtC(cashFlowYear1) + '/yr'} tone={cashFlowYear1 > 0 ? 'good' : 'bad'} sub="After mortgage" />
              <KPI label="IRR" value={irr ? pct(irr) : '—'} tone={irrGood ? 'good' : irr > 0.07 ? 'warn' : 'bad'} sub={`${holdYrs}-year hold`} />
            </div>

            {/* Exit summary */}
            <div className={styles.exitCard}>
              <div className={styles.exitTitle}>
                <Icon name="windfall" size={14} />
                Exit at year {holdYrs} — {exitYear ? fmtN(exitYear.propValue) : '—'} property value
              </div>
              <div className={styles.exitGrid}>
                <div className={styles.exitItem}><span>Sale proceeds (net)</span><strong>{fmtN(saleProceeds)}</strong></div>
                <div className={styles.exitItem}><span>Total cash invested</span><strong>{fmtN(totalInvested)}</strong></div>
                <div className={styles.exitItem}><span>Cumulative cash flow</span><strong style={{ color: years.slice(0,holdYrs).reduce((s,y) => s+y.annualCashFlow,0) > 0 ? 'var(--teal)' : 'var(--danger)' }}>{fmtN(years.slice(0,holdYrs).reduce((s,y) => s+y.annualCashFlow,0))}</strong></div>
                <div className={styles.exitItem}><span>Total return</span><strong style={{ color: totalReturn > 0 ? 'var(--teal)' : 'var(--danger)' }}>{fmtN(totalReturn)}</strong></div>
                <div className={styles.exitItem}><span>Equity at exit</span><strong>{fmtN(exitYear?.equity)}</strong></div>
                <div className={styles.exitItem}><span>MOIC</span><strong>{moic}×</strong></div>
              </div>
            </div>

            {/* Analysis tabs */}
            <div className={styles.analysisTabs}>
              {[
                { id: 'overview', label: 'Cash flow' },
                { id: 'equity',   label: 'Equity' },
                { id: 'returns',  label: 'Returns' },
                { id: 'table',    label: 'Year-by-year' },
              ].map(t => (
                <button key={t.id}
                  className={`${styles.analysisTab} ${activeTab === t.id ? styles.analysisTabActive : ''}`}
                  onClick={() => setActiveTab(t.id)}
                >{t.label}</button>
              ))}
            </div>

            {/* Charts */}
            {activeTab === 'overview' && (
              <div className={styles.chartCard}>
                <div className={styles.chartTitle}>Annual cash flow after mortgage</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="year" tick={{ fontSize: 10 }} label={{ value: 'Year', position: 'insideBottom', offset: -2, fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => '$' + (v/1000).toFixed(0) + 'k'} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={0} stroke="var(--border)" />
                    <ReferenceLine x={holdYrs} stroke="var(--teal)" strokeDasharray="3 3" label={{ value: 'Exit', fontSize: 9, fill: 'var(--teal)' }} />
                    <Bar dataKey="cashFlow" name="Cash flow" fill="var(--teal)" radius={[3,3,0,0]}
                      style={{ opacity: 0.85 }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {activeTab === 'equity' && (
              <div className={styles.chartCard}>
                <div className={styles.chartTitle}>Property value & equity ($k)</div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => '$' + v + 'k'} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <ReferenceLine x={holdYrs} stroke="var(--teal)" strokeDasharray="3 3" />
                    <Line dataKey="propValue" name="Property value ($k)" stroke="var(--amber)" strokeWidth={2} dot={false} />
                    <Line dataKey="equity" name="Your equity ($k)" stroke="var(--teal)" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {activeTab === 'returns' && (
              <div className={styles.chartCard}>
                <div className={styles.chartTitle}>CAP rate & Cash-on-Cash return (%)</div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v + '%'} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line dataKey="capRate" name="CAP rate %" stroke="var(--amber)" strokeWidth={2} dot={false} />
                    <Line dataKey="coc" name="Cash-on-Cash %" stroke="var(--teal)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {activeTab === 'table' && (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Yr</th><th>NOI</th><th>Cash flow</th>
                      <th>Prop value</th><th>Equity</th>
                      <th>CAP%</th><th>CoC%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {years.map(y => (
                      <tr key={y.year} className={y.year === holdYrs ? styles.exitRow : ''}>
                        <td className={styles.yearCell}>{y.year}{y.year === holdYrs ? ' ★' : ''}</td>
                        <td>{fmtK(y.noi)}</td>
                        <td className={y.annualCashFlow >= 0 ? styles.pos : styles.neg}>{fmtC(y.annualCashFlow)}</td>
                        <td>{fmtK(y.propValue)}</td>
                        <td className={styles.pos}>{fmtK(y.equity)}</td>
                        <td>{(y.capRate * 100).toFixed(2)}%</td>
                        <td className={y.cocReturn > 0.05 ? styles.pos : ''}>{(y.cocReturn * 100).toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className={styles.disclaimer}>
              For speculative analysis only. Assumes stable tenancy and constant rental increases.
              Does not account for tenant turnover costs, capital expenditures, or financing changes.
              Not financial or investment advice.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
