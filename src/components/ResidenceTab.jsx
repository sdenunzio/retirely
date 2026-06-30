import React, { useMemo } from 'react'
import { fmt, fmtM } from '../lib/engine.js'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts'
import { NumericInput } from './NumericInput.jsx'
import { Icon, IconBox } from './Icon.jsx'
import styles from './ResidenceTab.module.css'

// ─── Mortgage math (Canadian semi-annual compounding) ────────────────────────
function canadianMonthlyRate(annualPct) {
  const r = annualPct / 100
  return Math.pow(1 + r / 2, 1 / 6) - 1
}

function monthlyPayment(principal, annualPct, termYears) {
  if (principal <= 0) return 0
  const r = canadianMonthlyRate(annualPct)
  const n = termYears * 12
  if (r === 0 || n === 0) return principal / n
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

function mortgageBalance(principal, annualPct, termYears, monthsPaid) {
  if (principal <= 0) return 0
  const r = canadianMonthlyRate(annualPct)
  const n = termYears * 12
  const pmt = monthlyPayment(principal, annualPct, termYears)
  if (r === 0) return Math.max(0, principal - pmt * monthsPaid)
  const bal = principal * Math.pow(1 + r, monthsPaid)
    - pmt * (Math.pow(1 + r, monthsPaid) - 1) / r
  return Math.max(0, bal)
}

// ─── Shared UI components ─────────────────────────────────────────────────────
function StepInput({ value, onChange, min = 0, max, step = 1, prefix = '', suffix = '' }) {
  return <NumericInput value={value} onChange={onChange} min={min} max={max} step={step} prefix={prefix} suffix={suffix} />
}

function Toggle({ on, onToggle }) {
  return (
    <button className={`${styles.toggle} ${on ? styles.toggleOn : ''}`} onClick={onToggle} type="button">
      <span className={styles.toggleThumb} />
      <span className={styles.toggleLabel}>{on ? 'On' : 'Off'}</span>
    </button>
  )
}

function SectionHeader({ title, enabled, onToggle }) {
  return (
    <div className={styles.sectionHeader}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {onToggle && <Toggle on={enabled} onToggle={onToggle} />}
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

function InfoBox({ children, tone = 'neutral' }) {
  return <div className={`${styles.infoBox} ${styles['infoBox_' + tone]}`}>{children}</div>
}

function Row({ label, value, sub, tone }) {
  return (
    <div className={styles.equityRow}>
      <span className={styles.rowLabel}>{label}{sub && <span className={styles.rowSub}> — {sub}</span>}</span>
      <strong className={tone === 'good' ? styles.good : tone === 'warn' ? styles.warn : ''}>{value}</strong>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.tooltip}>
      <div className={styles.tipLabel}>Age {label}</div>
      {payload.map((p, i) => (
        <div key={i} className={styles.tipRow} style={{ color: p.color }}>
          <span>{p.name}</span><span>${Math.round(Math.abs(p.value)).toLocaleString('en-CA')}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Downsize calculation ─────────────────────────────────────────────────────
function calcDownsize(shared, person) {
  const yearsUntilSale = Math.max(0, shared.homeDownsizeAge - person.currentAge)
  // Use primaryHomeValue as the home being sold (same property, no duplicate input)
  const baseValue = shared.primaryHomeEnabled ? shared.primaryHomeValue : (shared.homeValue ?? 800000)
  const appreciatedValue = baseValue * Math.pow(1 + (shared.homeAppreciationRate ?? 3) / 100, yearsUntilSale)
  const monthsPaid = yearsUntilSale * 12
  const mortgageAtSale = mortgageBalance(
    shared.homeMortgageRemaining, shared.homeMortgageRate, shared.homeMortgageTerm, monthsPaid
  )
  const mortgagePaidOff = shared.homeMortgageRemaining > 0 && mortgageAtSale <= 0
  const grossProceeds = appreciatedValue
  const closingCosts = grossProceeds * (shared.homeClosingCostPct / 100)
  // Capital gains
  let cgTax = 0
  const nonExemptFrac = (shared.homeNonExemptPct ?? 0) / 100
  if (!shared.homePrincipalResidenceExempt || nonExemptFrac > 0) {
    const gain = Math.max(0, appreciatedValue - (shared.homeOriginalCost ?? 0))
    const taxableGain = gain * nonExemptFrac
    const inc = Math.min(taxableGain, 250000)*0.5 + Math.max(0, taxableGain-250000)*0.6667
    cgTax = inc * 0.43
  }
  const netAfterMortgage = Math.max(0, grossProceeds - closingCosts - mortgageAtSale - cgTax)
  // Net invested depends on mode
  const mode = shared.homeDownsizeMode ?? 'invest'
  const newHomeCost = mode === 'purchase' ? (shared.homeNewPurchasePrice ?? 0) : 0
  const investedAmount = mode === 'purchase'
    ? Math.max(0, netAfterMortgage - newHomeCost)
    : mode === 'rent'
      ? netAfterMortgage  // full proceeds invested, but rent added to expenses
      : Math.round(netAfterMortgage * shared.homeKeepPct / 100)
  const monthlyPmt = monthlyPayment(shared.homeMortgageRemaining, shared.homeMortgageRate, shared.homeMortgageTerm)

  // Year-by-year home value & mortgage chart
  const maxYrs = Math.min(yearsUntilSale + 5, 35)
  const chartData = []
  for (let y = 0; y <= maxYrs; y++) {
    const age = person.currentAge + y
    const baseVal = shared.primaryHomeEnabled ? shared.primaryHomeValue : (shared.homeValue ?? 800000)
    const homeVal = baseVal * Math.pow(1 + (shared.homeAppreciationRate ?? 3) / 100, y)
    const mortBal = mortgageBalance(shared.homeMortgageRemaining, shared.homeMortgageRate, shared.homeMortgageTerm, y * 12)
    const equity = homeVal - mortBal
    chartData.push({
      age,
      homeValue:    Math.round(homeVal / 1000),
      mortgageBal:  Math.round(mortBal / 1000),
      equity:       Math.round(equity / 1000),
      isSaleYear:   age === shared.homeDownsizeAge,
    })
  }

  return {
    yearsUntilSale, appreciatedValue, mortgageAtSale, mortgagePaidOff,
    grossProceeds, closingCosts, cgTax, newHomeCost, netAfterMortgage, investedAmount,
    monthlyPmt, chartData, mode,
  }
}

// ─── Reverse mortgage calculation ─────────────────────────────────────────────
function calcReverseMortgage(shared, person) {
  const startAge = Math.max(shared.reverseMortgageStartAge || person.retirementAge, 55)
  const endAge   = person.lifeExpectancy
  const years    = Math.max(0, endAge - startAge)
  const annualRate = (shared.reverseMortgageRate || 6.59) / 100
  const annualDraw = shared.reverseMortgageMonthly * 12

  // Home appreciates, loan balance compounds
  const homeAtStart = shared.primaryHomeValue
    * Math.pow(1 + (shared.primaryHomeAppreciationRate || 3) / 100,
        Math.max(0, startAge - person.currentAge))

  const chartData = []
  let loanBal = 0

  for (let y = 0; y <= years; y++) {
    const age       = startAge + y
    const homeVal   = homeAtStart * Math.pow(1 + (shared.primaryHomeAppreciationRate || 3) / 100, y)
    // Loan compounds annually on prior balance, then adds this year's draw
    loanBal = loanBal * (1 + annualRate) + annualDraw
    const equity    = Math.max(0, homeVal - loanBal)
    const ltv       = homeVal > 0 ? Math.min(100, loanBal / homeVal * 100) : 100
    chartData.push({
      age,
      homeValue: Math.round(homeVal / 1000),
      loanBal:   Math.round(loanBal / 1000),
      equity:    Math.round(equity / 1000),
      ltv:       +ltv.toFixed(1),
      equityGone: equity <= 0,
    })
  }

  // When does equity run out?
  const depletedEntry = chartData.find(d => d.equityGone)
  const equityDepletedAge = depletedEntry?.age ?? null
  const finalEntry = chartData[chartData.length - 1]
  const totalDrawn = annualDraw * years
  const totalInterest = (finalEntry?.loanBal ?? 0) * 1000 - totalDrawn
  const estateEquity = finalEntry ? Math.max(0, finalEntry.homeValue * 1000 - finalEntry.loanBal * 1000) : 0

  return {
    startAge, annualRate, annualDraw, homeAtStart,
    totalDrawn, totalInterest, estateEquity,
    equityDepletedAge, chartData,
  }
}

// ─── Main component ───────────────────────────────────────────────────────────
export function ResidenceTab({ shared, setShField, person }) {
  const ds  = useMemo(() => shared.homeEnabled    ? calcDownsize(shared, person)       : null, [shared, person])
  const rev = useMemo(() => (shared.primaryHomeEnabled && shared.reverseMortgageEnabled)
    ? calcReverseMortgage(shared, person) : null, [shared, person])

  const primaryEquity = Math.max(0, shared.primaryHomeValue - shared.primaryHomeMortgage)

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h2 className={styles.title}>Residence</h2>
        <p className={styles.subtitle}>
          Primary home equity, downsize proceeds, and reverse mortgage income — modelled year by year.
        </p>
      </div>

      <div className={styles.body}>

        {/* ═══════════════════════════════════════════════════════════════════
            PRIMARY RESIDENCE
        ═══════════════════════════════════════════════════════════════════ */}
        <div className={styles.card}>
          <SectionHeader
            title={<span style={{display:'flex',alignItems:'center',gap:6}}><IconBox name="residence" size={14} tone="teal"/>Primary residence</span>}
            enabled={shared.primaryHomeEnabled}
            onToggle={() => setShField('primaryHomeEnabled', !shared.primaryHomeEnabled)}
          />
          <p className={styles.cardDesc}>
            Your home's equity contributes to estate value and can be unlocked via a reverse mortgage.
          </p>

          {shared.primaryHomeEnabled && (
            <>
              <div className={styles.fieldGrid}>
                <Field label="Home market value (today)">
                  <StepInput value={shared.primaryHomeValue} onChange={v => setShField('primaryHomeValue', v)} min={0} step={25000} prefix="$" />
                </Field>
                <Field label="Mortgage balance (today)">
                  <StepInput value={shared.primaryHomeMortgage} onChange={v => setShField('primaryHomeMortgage', v)} min={0} step={10000} prefix="$" />
                </Field>
                <Field label="Mortgage rate" sub="% annual">
                  <StepInput value={shared.primaryHomeMortgageRate ?? 5.5} onChange={v => setShField('primaryHomeMortgageRate', v)} min={0} max={15} step={0.1} suffix="%" />
                </Field>
                <Field label="Amortization remaining" sub="years">
                  <StepInput value={shared.primaryHomeMortgageTerm ?? 20} onChange={v => setShField('primaryHomeMortgageTerm', v)} min={1} max={30} step={1} suffix=" yrs" />
                </Field>
                <Field label="Home appreciation" sub="% per year">
                  <StepInput value={shared.primaryHomeAppreciationRate ?? 3} onChange={v => setShField('primaryHomeAppreciationRate', v)} min={0} max={10} step={0.5} suffix="%" />
                </Field>
              </div>

              <InfoBox tone="good">
                <Row label="Current equity" value={fmt(primaryEquity)} tone="good" />
                <Row label="Current mortgage" value={fmt(shared.primaryHomeMortgage)} />
                <div className={styles.equityNote}>
                  Equity of <strong>{fmt(primaryEquity)}</strong> is added to estate value in all scenario cards.
                </div>
              </InfoBox>

              {/* ── Reverse mortgage ── */}
              <div className={styles.subSection}>
                <SectionHeader
                  title={<span style={{display:'flex',alignItems:'center',gap:6}}><IconBox name="reversemortgage" size={14} tone="teal"/>Reverse mortgage</span>}
                  enabled={shared.reverseMortgageEnabled}
                  onToggle={() => setShField('reverseMortgageEnabled', !shared.reverseMortgageEnabled)}
                />
                <p className={styles.cardDesc}>
                  Converts home equity into monthly tax-free income with no repayment while you live in the home.
                  The loan plus compounding interest is repaid when the home is sold. Available to Canadians 55+.
                </p>

                {shared.reverseMortgageEnabled && rev && (
                  <>
                    <div className={styles.fieldGrid}>
                      <Field label="Monthly draw" sub="Tax-free income">
                        <StepInput value={shared.reverseMortgageMonthly} onChange={v => setShField('reverseMortgageMonthly', v)} min={0} step={100} prefix="$" />
                      </Field>
                      <Field label="Start age" sub="Minimum 55 in Canada">
                        <StepInput value={shared.reverseMortgageStartAge ?? person.retirementAge} onChange={v => setShField('reverseMortgageStartAge', v)} min={55} max={85} step={1} />
                      </Field>
                      <Field label="Interest rate" sub="CHIP typical ~6.59%">
                        <StepInput value={shared.reverseMortgageRate ?? 6.59} onChange={v => setShField('reverseMortgageRate', v)} min={3} max={12} step={0.1} suffix="%" />
                      </Field>
                    </div>

                    <InfoBox tone="blue">
                      <Row label="Monthly income" value={`${fmt(shared.reverseMortgageMonthly)}/mo`} />
                      <Row label="Annual income" value={`${fmt(rev.annualDraw)}/yr`} />
                      <Row label="Total drawn over plan" value={fmt(rev.totalDrawn)} />
                      <Row label="Total interest accrued (est.)" value={fmt(Math.max(0, rev.totalInterest))} tone="warn" />
                      <Row label="Remaining home equity at {person.lifeExpectancy}"
                        value={fmt(rev.estateEquity)}
                        tone={rev.estateEquity > 0 ? 'good' : 'warn'}
                        sub="estate value from home" />
                      {rev.equityDepletedAge && (
                        <Row label="⚠️ Equity exhausted at age" value={rev.equityDepletedAge} tone="warn" />
                      )}
                      <div className={styles.equityNote}>
                        Interest compounds at <strong>{shared.reverseMortgageRate ?? 6.59}%/yr</strong> on the outstanding loan balance.
                        The loan grows each year even if no additional draws are taken, because interest is added to principal.
                      </div>
                    </InfoBox>

                    {/* Year-by-year equity chart */}
                    <div className={styles.chartCard}>
                      <div className={styles.chartTitle}>Home equity vs. reverse mortgage loan balance</div>
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={rev.chartData} margin={{ top: 8, right: 12, bottom: 0, left: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-10)" />
                          <XAxis dataKey="age" tick={{ fontSize: 11 }} label={{ value: 'Age', position: 'insideBottom', offset: -2, fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => '$' + v + 'k'} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Line dataKey="homeValue" name="Home value ($k)" stroke="#1D9E75" strokeWidth={2} dot={false} />
                          <Line dataKey="loanBal"   name="Loan balance ($k)" stroke="#E24B4A" strokeWidth={2} dot={false} />
                          <Line dataKey="equity"    name="Your equity ($k)" stroke="#378ADD" strokeWidth={2.5} dot={false} strokeDasharray="4 2" />
                          <ReferenceLine x={rev.startAge} stroke="var(--gray-40)" strokeDasharray="3 3" label={{ value: 'Start', fontSize: 10, fill: 'var(--gray-40)' }} />
                          {rev.equityDepletedAge && (
                            <ReferenceLine x={rev.equityDepletedAge} stroke="#E24B4A" strokeDasharray="3 3"
                              label={{ value: 'Equity gone', fontSize: 10, fill: '#E24B4A' }} />
                          )}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Year-by-year table */}
                    <div className={styles.tableWrap}>
                      <div className={styles.tableTitle}>Year-by-year reverse mortgage schedule</div>
                      <div className={styles.tableScroll}>
                        <table className={styles.table}>
                          <thead>
                            <tr>
                              <th>Age</th>
                              <th>Home value</th>
                              <th>Loan balance</th>
                              <th>Your equity</th>
                              <th>LTV %</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rev.chartData.map(r => (
                              <tr key={r.age} className={r.equityGone ? styles.rowWarn : ''}>
                                <td className={styles.ageCell}>{r.age}</td>
                                <td>{fmt(r.homeValue * 1000)}</td>
                                <td className={styles.negCell}>{fmt(r.loanBal * 1000)}</td>
                                <td className={r.equityGone ? styles.negCell : styles.posCell}>{fmt(r.equity * 1000)}</td>
                                <td className={r.ltv > 80 ? styles.negCell : ''}>{r.ltv}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            HOME DOWNSIZE
        ═══════════════════════════════════════════════════════════════════ */}
        <div className={styles.card}>
          <SectionHeader
            title={<span style={{display:'flex',alignItems:'center',gap:6}}><IconBox name="downsize" size={14} tone="teal"/>Home downsize</span>}
            enabled={shared.homeEnabled}
            onToggle={() => setShField('homeEnabled', !shared.homeEnabled)}
          />
          <p className={styles.cardDesc}>
            Model the future sale of your home — proceeds are adjusted for appreciation, remaining mortgage at sale date, and closing costs.
          </p>

          {shared.homeEnabled && ds && (
            <>
              {/* Home value comes from Primary Residence section — no duplicate input */}
              {shared.primaryHomeEnabled ? (
                <InfoBox tone="neutral">
                  <Row label="Using home value from Primary Residence section"
                    value={fmt(shared.primaryHomeValue)}
                    sub={`Appreciated to ${fmt(ds.appreciatedValue)} by age ${shared.homeDownsizeAge}`} />
                </InfoBox>
              ) : (
                <InfoBox tone="neutral">
                  <div className={styles.equityNote}>
                    ⚠️ Enable <strong>Primary Residence</strong> above to set the home value used in this calculation.
                  </div>
                </InfoBox>
              )}

              <div className={styles.fieldGrid}>
                <Field label="Downsize at age">
                  <StepInput value={shared.homeDownsizeAge} onChange={v => setShField('homeDownsizeAge', v)} min={person.currentAge} max={person.lifeExpectancy} step={1} />
                </Field>
                <Field label="Selling costs" sub="Agent + legal (% of sale price)">
                  <StepInput value={shared.homeClosingCostPct ?? 5} onChange={v => setShField('homeClosingCostPct', v)} min={0} max={10} step={0.5} suffix="%" />
                </Field>
                <Field label="Current mortgage balance" sub="Leave $0 if mortgage-free">
                  <StepInput value={shared.homeMortgageRemaining ?? 0} onChange={v => setShField('homeMortgageRemaining', v)} min={0} step={10000} prefix="$" />
                </Field>
                {(shared.homeMortgageRemaining ?? 0) > 0 && <>
                  <Field label="Mortgage rate">
                    <StepInput value={shared.homeMortgageRate ?? 5.5} onChange={v => setShField('homeMortgageRate', v)} min={0} max={15} step={0.1} suffix="%" />
                  </Field>
                  <Field label="Amortization remaining">
                    <StepInput value={shared.homeMortgageTerm ?? 20} onChange={v => setShField('homeMortgageTerm', v)} min={1} max={30} step={1} suffix=" yrs" />
                  </Field>
                </>}
              </div>

              {/* Capital gains section */}
              <div className={styles.cgSection}>
                <div className={styles.cgTitle}>Capital gains</div>
                <div className={styles.cgRow}>
                  <label className={styles.cgCheck}>
                    <input type="checkbox"
                      checked={shared.homePrincipalResidenceExempt ?? true}
                      onChange={e => setShField('homePrincipalResidenceExempt', e.target.checked)} />
                    <span>Principal residence exemption applies (full — no capital gains)</span>
                  </label>
                </div>
                {(shared.homePrincipalResidenceExempt === false || (shared.homeNonExemptPct ?? 0) > 0) && (
                  <div className={styles.fieldGrid} style={{ marginTop: 8 }}>
                    <Field label="Original purchase price" sub="Adjusted cost base (ACB)">
                      <StepInput value={shared.homeOriginalCost ?? 400000} onChange={v => setShField('homeOriginalCost', v)} min={0} step={10000} prefix="$" />
                    </Field>
                    <Field label="Non-exempt portion" sub="% not covered by PRE (e.g. rental suite, home office)">
                      <StepInput value={shared.homeNonExemptPct ?? 0} onChange={v => setShField('homeNonExemptPct', v)} min={0} max={100} step={5} suffix="%" />
                    </Field>
                  </div>
                )}
                {!(shared.homePrincipalResidenceExempt ?? true) || (shared.homeNonExemptPct ?? 0) > 0 ? (
                  <div className={styles.cgNote}>
                    <strong>Estimated capital gains tax: {fmt(ds.cgTax)}</strong>
                    {' '} — Gain: {fmt(ds.appreciatedValue - (shared.homeOriginalCost ?? 0))}, taxable portion ({shared.homeNonExemptPct ?? 0}%),
                    50%/66.67% inclusion, ~43% marginal rate. Consult a tax advisor for your actual liability.
                  </div>
                ) : (
                  <div className={styles.cgNote}>
                    Primary residence exemption: <strong>no capital gains tax</strong> on this sale.
                    If you rented part of the home or used it for business, check the non-exempt portion box above.
                  </div>
                )}
              </div>

              {/* After-downsize mode */}
              <Field label="After selling, you plan to…" sub="This changes how net proceeds are applied">
                <div className={styles.modeGrid}>
                  {[
                    { id: 'invest', icon: 'charts', label: 'Invest a portion', desc: 'Choose what % of net proceeds to add to your portfolio' },
                    { id: 'purchase', icon: '🏡', label: 'Buy a smaller home', desc: 'Net proceeds minus new purchase price goes to portfolio' },
                    { id: 'rent', icon: 'property', label: 'Rent instead', desc: 'Full proceeds invested; rent added to your spending' },
                  ].map(m => (
                    <button key={m.id} type="button"
                      className={`${styles.modeBtn} ${(shared.homeDownsizeMode ?? 'invest') === m.id ? styles.modeBtnOn : ''}`}
                      onClick={() => setShField('homeDownsizeMode', m.id)}>
                      <span className={styles.modeIcon}>{m.icon}</span>
                      <div>
                        <div className={styles.modeLabel}>{m.label}</div>
                        <div className={styles.modeDesc}>{m.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </Field>

              {(shared.homeDownsizeMode ?? 'invest') === 'invest' && (
                <Field label={`Proceeds to invest: ${shared.homeKeepPct}%`} sub="% of net proceeds added to your retirement portfolio">
                  <div className={styles.sliderRow}>
                    <input type="range" min={10} max={100} step={5} value={shared.homeKeepPct}
                      onChange={e => setShField('homeKeepPct', Number(e.target.value))} className={styles.slider} />
                    <span className={styles.sliderVal}>{shared.homeKeepPct}%</span>
                  </div>
                </Field>
              )}
              {(shared.homeDownsizeMode ?? 'invest') === 'purchase' && (
                <Field label="New home purchase price">
                  <StepInput value={shared.homeNewPurchasePrice ?? 500000} onChange={v => setShField('homeNewPurchasePrice', v)} min={0} step={25000} prefix="$" />
                </Field>
              )}
              {(shared.homeDownsizeMode ?? 'invest') === 'rent' && (
                <Field label="Monthly rent" sub="Added to your annual retirement spending from the downsize age">
                  <StepInput value={shared.homeRentMonthly ?? 2500} onChange={v => setShField('homeRentMonthly', v)} min={0} step={100} prefix="$" />
                </Field>
              )}

              <InfoBox tone="good">
                <Row label={`Home value at sale (age ${shared.homeDownsizeAge})`}
                  value={fmt(ds.appreciatedValue)}
                  sub={`${ds.yearsUntilSale} yrs × ${shared.primaryHomeAppreciationRate ?? 3}%/yr`} />
                <Row label={`Selling costs (${shared.homeClosingCostPct ?? 5}%)`}
                  value={`−${fmt(ds.closingCosts)}`} tone="warn" />
                {(shared.homeMortgageRemaining ?? 0) > 0 && (
                  <Row
                    label={`Mortgage at sale${ds.mortgagePaidOff ? ' ✓ paid off' : ''}`}
                    value={ds.mortgagePaidOff ? '$0' : `−${fmt(ds.mortgageAtSale)}`}
                    sub={!ds.mortgagePaidOff ? `${fmt(ds.monthlyPmt)}/mo today` : undefined}
                    tone={ds.mortgagePaidOff ? 'good' : 'warn'}
                  />
                )}
                {ds.cgTax > 0 && (
                  <Row label="Capital gains tax (est.)" value={`−${fmt(ds.cgTax)}`} tone="warn" />
                )}
                {ds.newHomeCost > 0 && (
                  <Row label="New home purchase" value={`−${fmt(ds.newHomeCost)}`} tone="warn" />
                )}
                <div className={styles.divider} />
                <Row label="Net proceeds" value={fmt(ds.netAfterMortgage)} />
                <Row label={
                  ds.mode === 'invest' ? `Amount invested (${shared.homeKeepPct}%)`
                  : ds.mode === 'purchase' ? 'Added to portfolio (after new home)'
                  : 'Full proceeds invested (rent scenario)'}
                  value={fmt(ds.investedAmount)} tone="good" />
                {ds.mode === 'rent' && (
                  <Row label="Monthly rent added to expenses" value={`+${fmt(shared.homeRentMonthly ?? 0)}/mo`} tone="warn" />
                )}
                <div className={styles.equityNote}>
                  <strong>{fmt(ds.investedAmount)}</strong> added to portfolio
                  {shared.homeDownsizeAge <= person.retirementAge
                    ? ` at age ${shared.homeDownsizeAge} — boosting your starting pool.`
                    : ` at age ${shared.homeDownsizeAge} during retirement.`}
                  {ds.mode === 'rent' && ` Rent of ${fmt((shared.homeRentMonthly ?? 0)*12)}/yr increases spending from age ${shared.homeDownsizeAge}.`}
                </div>
              </InfoBox>

              {/* Chart */}
              <div className={styles.chartCard}>
                <div className={styles.chartTitle}>Home value, mortgage balance & equity over time</div>
                <ResponsiveContainer width="100%" height={210}>
                  <LineChart data={ds.chartData} margin={{ top: 8, right: 12, bottom: 0, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-10)" />
                    <XAxis dataKey="age" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => '$' + v + 'k'} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line dataKey="homeValue"   name="Home value ($k)"   stroke="#D85A30" strokeWidth={2} dot={false} />
                    {(shared.homeMortgageRemaining ?? 0) > 0 && (
                      <Line dataKey="mortgageBal" name="Mortgage bal ($k)" stroke="#E24B4A" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                    )}
                    <Line dataKey="equity"      name="Equity ($k)"       stroke="#1D9E75" strokeWidth={2.5} dot={false} />
                    <ReferenceLine x={shared.homeDownsizeAge} stroke="var(--navy)" strokeDasharray="3 3"
                      label={{ value: 'Sale', fontSize: 10, fill: 'var(--navy)' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>

        {/* Combined summary */}
        {(shared.primaryHomeEnabled || shared.homeEnabled) && (
          <div className={`${styles.card} ${styles.summaryCard}`}>
            <div className={styles.summaryTitle}>Residence contribution to retirement plan</div>
            <div className={styles.summaryGrid}>
              {shared.primaryHomeEnabled && (
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Primary home equity</span>
                  <span className={styles.summaryVal}>{fmtM(primaryEquity)}</span>
                  <span className={styles.summarySub}>Added to estate value</span>
                </div>
              )}
              {shared.homeEnabled && ds && (
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Downsize proceeds</span>
                  <span className={styles.summaryVal}>{fmtM(ds.investedAmount)}</span>
                  <span className={styles.summarySub}>At age {shared.homeDownsizeAge}</span>
                </div>
              )}
              {shared.reverseMortgageEnabled && rev && (
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Reverse mortgage income</span>
                  <span className={styles.summaryVal}>{fmt(shared.reverseMortgageMonthly)}/mo</span>
                  <span className={styles.summarySub}>From age {rev.startAge} · {fmt(rev.totalDrawn)} total</span>
                </div>
              )}
              {shared.reverseMortgageEnabled && rev && (
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Est. home equity at {person.lifeExpectancy}</span>
                  <span className={styles.summaryVal} style={{ color: rev.estateEquity > 0 ? 'var(--teal-60)' : 'var(--danger)' }}>{fmtM(rev.estateEquity)}</span>
                  <span className={styles.summarySub}>{rev.equityDepletedAge ? `Equity gone at ${rev.equityDepletedAge}` : 'Estate from home'}</span>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
