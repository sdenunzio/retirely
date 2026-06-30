import React, { useState, useEffect } from 'react'
import { PROVINCES_LIST } from '../lib/engine.js'
import { NumericInput } from './NumericInput.jsx'
import { Icon, IconBox } from './Icon.jsx'
import styles from './OnboardingWizard.module.css'

const FIRST_VISIT_KEY = 'retirement_lab_onboarded_v1'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtDollar(n) { return '$' + Math.round(n).toLocaleString('en-CA') }

function StepInput({ value, onChange, min = 0, max, step = 1, prefix = '', suffix = '' }) {
  return <NumericInput value={value} onChange={onChange} min={min} max={max} step={step} prefix={prefix} suffix={suffix} />
}

function WField({ label, hint, children }) {
  return (
    <div className={styles.wField}>
      <label className={styles.wLabel}>{label}</label>
      {hint && <p className={styles.wHint}>{hint}</p>}
      {children}
    </div>
  )
}

function ToggleCard({ active, onClick, icon, title, desc }) {
  return (
    <button className={`${styles.toggleCard} ${active ? styles.toggleCardOn : ''}`} onClick={onClick} type="button">
      <IconBox name={icon} size={16} tone={active ? "teal" : "navy"} />
      <div>
        <div className={styles.toggleCardTitle}>{title}</div>
        <div className={styles.toggleCardDesc}>{desc}</div>
      </div>
      <span className={styles.toggleCardCheck}>{active ? '✓' : ''}</span>
    </button>
  )
}

// ─── Mode picker (first-visit) ────────────────────────────────────────────────
function ModePicker({ onGuided, onAdvanced }) {
  const [agreed, setAgreed] = React.useState(false)
  const [showTerms, setShowTerms] = React.useState(false)

  return (
    <div className={styles.modeBackdrop}>
      <div className={styles.modeCard}>
        <IconBox name="scenarios" size={28} tone="teal" />
        <h1 className={styles.modeTitle}>Welcome to Retirely</h1>
        <p className={styles.modeSub}>
          A free Canadian retirement scenario explorer. How would you like to get started?
        </p>

        <div className={styles.modeOptions}>
          <button
            className={`${styles.modeBtn} ${styles.modeBtnGuided} ${!agreed ? styles.modeBtnDisabled : ''}`}
            onClick={agreed ? onGuided : undefined}
            title={!agreed ? 'Please acknowledge the disclaimer below' : ''}
          >
            <IconBox name="guided" size={22} tone="teal" />
            <div>
              <div className={styles.modeBtnTitle}>Guide me through it</div>
              <div className={styles.modeBtnDesc}>
                Answer a few simple questions step-by-step. Takes about 3 minutes.
                Perfect if you're new to retirement planning tools.
              </div>
            </div>
          </button>
          <button
            className={`${styles.modeBtn} ${styles.modeBtnAdvanced} ${!agreed ? styles.modeBtnDisabled : ''}`}
            onClick={agreed ? onAdvanced : undefined}
            title={!agreed ? 'Please acknowledge the disclaimer below' : ''}
          >
            <IconBox name="advanced" size={22} tone="teal" />
            <div>
              <div className={styles.modeBtnTitle}>Advanced mode</div>
              <div className={styles.modeBtnDesc}>
                Jump straight to the full input panel. Best if you're comfortable
                with financial inputs or have used this tool before.
              </div>
            </div>
          </button>
        </div>

        {/* T&C acknowledgment */}
        <div className={styles.tcBox}>
          <label className={styles.tcLabel}>
            <input
              type="checkbox"
              className={styles.tcCheck}
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
            />
            <span>
              I understand that Retirely provides{` `}
              <strong>illustrative projections only</strong> — not financial advice.
              Projections are estimates based on the inputs I provide and may not reflect
              my actual retirement outcomes. I will consult a qualified financial advisor
              before making any financial decisions.
            </span>
          </label>
          <button className={styles.tcLink} onClick={() => setShowTerms(true)}>
            Read full terms of use →
          </button>
        </div>

        <p className={styles.modeNote}>You can always switch modes later via the left panel.</p>
      </div>

      {/* Terms modal */}
      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
    </div>
  )
}

// ─── Terms modal ─────────────────────────────────────────────────────────────
export function TermsModal({ onClose }) {
  React.useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  return (
    <div className={styles.termsBackdrop} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.termsModal}>
        <div className={styles.termsHeader}>
          <h2 className={styles.termsTitle}>Terms of Use</h2>
          <button className={styles.termsClose} onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className={styles.termsBody}>
          <p className={styles.termsUpdated}>Last updated: April 2026</p>

          <h3 className={styles.termsH3}>1. Not financial advice</h3>
          <p>Retirely is a free scenario exploration tool. All projections, calculations, tax estimates, and retirement income figures are <strong>illustrative only</strong> and do not constitute financial, tax, investment, or legal advice. Retirely is not a registered financial advisor, planner, or broker under any Canadian or provincial legislation.</p>
          <p>You should consult a qualified Certified Financial Planner (CFP), Chartered Professional Accountant (CPA), or other licensed professional before making any retirement, investment, or tax decisions.</p>

          <h3 className={styles.termsH3}>2. Accuracy of calculations</h3>
          <p>Retirely uses publicly available 2024–2025 federal and provincial tax brackets, CRA RRIF minimum withdrawal schedules, CPP and OAS adjustment factors, and other published government data. These rules change annually. Retirely makes no guarantee that calculations are current, complete, or accurate for your specific situation.</p>
          <p>Projections depend entirely on the inputs you provide. Results are sensitive to assumed rates of return, inflation, life expectancy, and spending — none of which can be predicted with certainty.</p>

          <h3 className={styles.termsH3}>3. Your data</h3>
          <p>All data you enter stays on your device. Retirely does not transmit, store, or share any financial information you input. Scenarios are saved to your browser's local storage only and are not accessible to Retirely or any third party.</p>

          <h3 className={styles.termsH3}>4. Limitation of liability</h3>
          <p>To the maximum extent permitted by applicable law, Retirely and its operators shall not be liable for any direct, indirect, incidental, consequential, or special damages arising from your use of this tool or reliance on its outputs. This includes but is not limited to financial losses, missed investment opportunities, or tax penalties.</p>

          <h3 className={styles.termsH3}>5. Acceptable use</h3>
          <p>Retirely is intended for personal retirement planning purposes by Canadian residents. Commercial use, redistribution, scraping, or automated access is not permitted without written permission.</p>

          <h3 className={styles.termsH3}>6. Intellectual property</h3>
          <p>All content, software, and design elements of Retirely are the property of Retirely (retirely.ca). Unauthorised reproduction or distribution is prohibited.</p>

          <h3 className={styles.termsH3}>7. Governing law</h3>
          <p>These terms are governed by the laws of the Province of Ontario and the federal laws of Canada applicable therein. Any disputes shall be resolved in the courts of Ontario.</p>

          <h3 className={styles.termsH3}>8. Changes to these terms</h3>
          <p>Retirely may update these terms at any time. Continued use of the tool after changes constitutes acceptance of the revised terms. The date at the top of this page reflects when the terms were last updated.</p>
        </div>
        <div className={styles.termsFooter}>
          <button className={styles.termsCloseBtn} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

// ─── Individual steps ─────────────────────────────────────────────────────────
const STEPS = [
  { id: 'province',    title: 'Where do you live?',               icon: 'province' },
  { id: 'couple',      title: 'Planning alone or as a couple?',   icon: 'couple' },
  { id: 'p1_ages',     title: 'Your age & retirement target',     icon: 'ages' },
  { id: 'p1_income',   title: 'Your income & savings',            icon: 'income' },
  { id: 'p1_assets',   title: 'Your current savings accounts',    icon: 'assets' },
  { id: 'p1_govt',     title: 'Government benefits',              icon: 'government' },
  { id: 'p1_pension',  title: 'Employer pension',                 icon: 'scenarios', skippable: true },
  { id: 'p2_all',      title: 'Spouse / partner details',         icon: 'couple2', coupleOnly: true },
  { id: 'spending',    title: 'Retirement spending',              icon: 'spending' },
  { id: 'windfall',    title: 'Any expected windfall?',           icon: 'windfall', skippable: true },
  { id: 'residence',   title: 'Your home',                        icon: 'residence', skippable: true },
  { id: 'review',      title: 'Ready to calculate',               icon: 'review' },
]

function StepBody({ step, person, spouse, shared, setPField, setSField, setShField }) {
  const set1 = (k, v) => setPField(k, v)
  const set2 = (k, v) => setSField(k, v)
  const setS = (k, v) => setShField(k, v)
  const fmt = fmtDollar

  if (step.id === 'province') return (
    <div className={styles.stepContent}>
      <WField label="Your province" hint="Tax rates and calculations are province-specific.">
        <select className={styles.provinceSelect} value={shared.province}
          onChange={e => setS('province', e.target.value)}>
          {PROVINCES_LIST.map(([code, name]) => (
            <option key={code} value={code}>{code} — {name}</option>
          ))}
        </select>
      </WField>
    </div>
  )

  if (step.id === 'couple') return (
    <div className={styles.stepContent}>
      <WField label="Household type" hint="Couple mode calculates pension income splitting and combines household assets.">
        <div className={styles.coupleChoice}>
          <ToggleCard active={!shared.coupleMode} onClick={() => setS('coupleMode', false)}
            icon="single" title="Just me" desc="Single or planning independently" />
          <ToggleCard active={shared.coupleMode} onClick={() => setS('coupleMode', true)}
            icon="couple" title="Couple" desc="Two people, combined household planning" />
        </div>
      </WField>
    </div>
  )

  if (step.id === 'p1_ages') return (
    <div className={styles.stepContent}>
      <WField label="Your current age">
        <StepInput value={person.currentAge} onChange={v => set1('currentAge', v)} min={18} max={80} />
      </WField>
      <WField label="Target retirement age" hint="When do you hope to stop working full-time?">
        <StepInput value={person.retirementAge} onChange={v => set1('retirementAge', v)} min={45} max={80} />
      </WField>
      <WField label="Life expectancy" hint="Plan a bit long — it's better to have money left over.">
        <StepInput value={person.lifeExpectancy} onChange={v => set1('lifeExpectancy', v)} min={70} max={105} />
      </WField>
      <div className={styles.calcNote}>
        Planning window: <strong>{Math.max(0, person.retirementAge - person.currentAge)} years to retirement</strong>
        {' '}· <strong>{Math.max(0, person.lifeExpectancy - person.retirementAge)} years in retirement</strong>
      </div>
    </div>
  )

  if (step.id === 'p1_income') return (
    <div className={styles.stepContent}>
      <WField label="Annual employment income" hint="Your gross income before tax. Used to estimate CPP and savings rate.">
        <StepInput value={person.annualIncome || 0} onChange={v => set1('annualIncome', v)} min={0} step={5000} prefix="$" />
      </WField>
      <WField label="Monthly savings contribution" hint="How much do you save toward retirement each month (RRSP + TFSA + other)?">
        <StepInput value={person.monthlyContrib} onChange={v => set1('monthlyContrib', v)} min={0} step={100} prefix="$" />
      </WField>
      {(person.annualIncome || 0) > 0 && (() => {
        const rate = Math.round((person.monthlyContrib * 12) / (person.annualIncome || 1) * 100)
        return (
          <div className={`${styles.calcNote} ${rate >= 15 ? styles.calcNoteGood : rate < 10 ? styles.calcNoteWarn : ''}`}>
            Savings rate: <strong>{rate}%</strong>
            {rate >= 15 && ' — great!'}
            {rate < 10 && rate > 0 && ' — aim for 15% or more'}
            {rate === 0 && ' — even small amounts add up'}
          </div>
        )
      })()}
    </div>
  )

  if (step.id === 'p1_assets') return (
    <div className={styles.stepContent}>
      <WField label="RRSP balance" hint="Registered Retirement Savings Plan. Check your latest statement.">
        <StepInput value={person.rrsp} onChange={v => set1('rrsp', v)} min={0} step={5000} prefix="$" />
      </WField>
      <WField label="TFSA balance" hint="Tax-Free Savings Account. Withdrawals don't affect OAS or GIS.">
        <StepInput value={person.tfsa} onChange={v => set1('tfsa', v)} min={0} step={5000} prefix="$" />
      </WField>
      <WField label="Non-registered investments" hint="Taxable investment accounts, savings, or GICs outside RRSP/TFSA.">
        <StepInput value={person.nonReg} onChange={v => set1('nonReg', v)} min={0} step={5000} prefix="$" />
      </WField>
      <WField label="LIRA / LIF balance (if any)" hint="Locked-In Retirement Account from a former employer's pension. Converts to a LIF with minimum and maximum withdrawals.">
        <StepInput value={person.lira || 0} onChange={v => set1('lira', v)} min={0} step={5000} prefix="$" />
      </WField>
      <div className={styles.calcNote}>
        Total assets today: <strong>{fmt(person.rrsp + person.tfsa + person.nonReg + (person.lira || 0))}</strong>
      </div>
    </div>
  )

  if (step.id === 'p1_govt') return (
    <div className={styles.stepContent}>
      <WField label="Estimated CPP at age 65 (monthly)" hint="Find this on My Service Canada Account. Average is ~$800/mo; maximum is $1,306.57 in 2024.">
        <StepInput value={person.cppMonthly65} onChange={v => set1('cppMonthly65', v)} min={0} max={1400} step={50} prefix="$" />
      </WField>
      <WField label="OAS start age" hint="Old Age Security starts at 65 but can be deferred to 70 for a 36% boost.">
        <div className={styles.coupleChoice}>
          <ToggleCard active={person.oasStartAge === 65} onClick={() => set1('oasStartAge', 65)}
            icon="oas65" title="Age 65" desc="Standard — full OAS from 65" />
          <ToggleCard active={person.oasStartAge === 70} onClick={() => set1('oasStartAge', 70)}
            icon="oas70" title="Age 70" desc="+36% boost for waiting 5 years" />
        </div>
      </WField>
    </div>
  )

  if (step.id === 'p1_pension') return (
    <div className={styles.stepContent}>
      <p className={styles.stepIntro}>Do you have a defined benefit (DB) pension from an employer, government, or union? Skip this step if not.</p>
      <WField label="Do you have a DB pension?">
        <div className={styles.coupleChoice}>
          <ToggleCard active={!person.dbPensionEnabled} onClick={() => set1('dbPensionEnabled', false)}
            icon="no" title="No DB pension" desc="I rely on RRSP, TFSA and government benefits only" />
          <ToggleCard active={!!person.dbPensionEnabled} onClick={() => set1('dbPensionEnabled', true)}
            icon="scenarios" title="Yes, I have one" desc="Employer, government, or union defined benefit plan" />
        </div>
      </WField>
      {person.dbPensionEnabled && (
        <>
          <WField label="Monthly pension amount at retirement" hint="The fixed monthly amount you'll receive starting at your retirement date. Check your pension statement.">
            <StepInput value={person.dbPensionMonthly || 0} onChange={v => set1('dbPensionMonthly', v)} min={0} step={100} prefix="$" />
          </WField>
          <WField label="Is the pension indexed to inflation?">
            <div className={styles.coupleChoice}>
              <ToggleCard active={person.dbPensionIndexed === 'none'} onClick={() => set1('dbPensionIndexed', 'none')}
                icon="no" title="Not indexed" desc="Fixed amount — loses purchasing power over time" />
              <ToggleCard active={person.dbPensionIndexed === 'full'} onClick={() => set1('dbPensionIndexed', 'full')}
                icon="yes" title="Fully indexed" desc="Rises with inflation each year (CPI)" />
            </div>
            <div style={{ marginTop: 8 }}>
              <ToggleCard active={person.dbPensionIndexed === 'half'} onClick={() => set1('dbPensionIndexed', 'half')}
                icon="scenarios" title="Partially indexed" desc="Rises at half the inflation rate" />
            </div>
          </WField>
          <WField label="Bridge benefit (monthly, ends at 65)" hint="Some pensions pay an extra bridge amount until CPP kicks in at 65. Enter 0 if none.">
            <StepInput value={person.dbPensionBridge || 0} onChange={v => set1('dbPensionBridge', v)} min={0} step={100} prefix="$" />
          </WField>
          {(person.dbPensionMonthly || 0) > 0 && (
            <div className={styles.calcNote}>
              Annual pension: <strong>{fmt((person.dbPensionMonthly || 0) * 12)}/yr</strong>
              {(person.dbPensionBridge || 0) > 0 && <> + <strong>{fmt(person.dbPensionBridge * 12)}/yr</strong> bridge until 65</>}
              {' '}· DB income is taxable and qualifies for pension income splitting at 65+.
            </div>
          )}
        </>
      )}
    </div>
  )

  if (step.id === 'p2_all') return (
    <div className={styles.stepContent}>
      <p className={styles.stepIntro}>Now let's add your partner's details.</p>
      <div className={styles.twoColFields}>
        <WField label="Partner's age"><StepInput value={spouse.currentAge} onChange={v => set2('currentAge', v)} min={18} max={80} /></WField>
        <WField label="Retire at"><StepInput value={spouse.retirementAge} onChange={v => set2('retirementAge', v)} min={45} max={80} /></WField>
        <WField label="Life expectancy"><StepInput value={spouse.lifeExpectancy} onChange={v => set2('lifeExpectancy', v)} min={70} max={105} /></WField>
        <WField label="Annual income" hint="Gross"><StepInput value={spouse.annualIncome || 0} onChange={v => set2('annualIncome', v)} min={0} step={5000} prefix="$" /></WField>
        <WField label="RRSP"><StepInput value={spouse.rrsp} onChange={v => set2('rrsp', v)} min={0} step={5000} prefix="$" /></WField>
        <WField label="TFSA"><StepInput value={spouse.tfsa} onChange={v => set2('tfsa', v)} min={0} step={5000} prefix="$" /></WField>
        <WField label="Non-reg"><StepInput value={spouse.nonReg} onChange={v => set2('nonReg', v)} min={0} step={5000} prefix="$" /></WField>
        <WField label="Monthly contrib"><StepInput value={spouse.monthlyContrib} onChange={v => set2('monthlyContrib', v)} min={0} step={100} prefix="$" /></WField>
        <WField label="CPP at 65 /mo"><StepInput value={spouse.cppMonthly65} onChange={v => set2('cppMonthly65', v)} min={0} max={1400} step={50} prefix="$" /></WField>
      </div>

      <WField label="Does your partner have a DB pension?">
        <div className={styles.coupleChoice}>
          <ToggleCard active={!spouse.dbPensionEnabled} onClick={() => set2('dbPensionEnabled', false)}
            icon="no" title="No DB pension" desc="Relies on RRSP, TFSA and government benefits" />
          <ToggleCard active={!!spouse.dbPensionEnabled} onClick={() => set2('dbPensionEnabled', true)}
            icon="scenarios" title="Yes, they have one" desc="Employer, government, or union pension" />
        </div>
      </WField>
      {spouse.dbPensionEnabled && (
        <>
          <WField label="Partner's monthly pension at retirement">
            <StepInput value={spouse.dbPensionMonthly || 0} onChange={v => set2('dbPensionMonthly', v)} min={0} step={100} prefix="$" />
          </WField>
          <WField label="Indexed to inflation?">
            <div className={styles.coupleChoice}>
              <ToggleCard active={spouse.dbPensionIndexed === 'none'} onClick={() => set2('dbPensionIndexed', 'none')}
                icon="no" title="Not indexed" desc="Fixed amount" />
              <ToggleCard active={spouse.dbPensionIndexed === 'full'} onClick={() => set2('dbPensionIndexed', 'full')}
                icon="yes" title="Fully indexed" desc="Rises with CPI" />
            </div>
          </WField>
          <WField label="Bridge benefit /mo (ends at 65)" hint="0 if none">
            <StepInput value={spouse.dbPensionBridge || 0} onChange={v => set2('dbPensionBridge', v)} min={0} step={100} prefix="$" />
          </WField>
        </>
      )}
    </div>
  )

  if (step.id === 'spending') return (
    <div className={styles.stepContent}>
      <WField label="Annual spending in retirement" hint="In today's dollars — how much do you plan to spend per year? Include housing, food, travel, healthcare, hobbies.">
        <StepInput value={shared.annualSpending} onChange={v => setS('annualSpending', v)} min={10000} step={2500} prefix="$" />
      </WField>
      <WField label="Expected investment return before retirement (%)" hint="Historical Canadian balanced portfolio average is ~6%. Be conservative.">
        <div className={styles.sliderRow}>
          <input type="range" min={1} max={12} step={0.25} value={shared.preReturnRate}
            onChange={e => setS('preReturnRate', Number(e.target.value))} className={styles.slider} />
          <span className={styles.sliderVal}>{shared.preReturnRate}%</span>
        </div>
      </WField>
      <WField label="Expected investment return in retirement (%)" hint="Usually lower — more conservative as you draw down.">
        <div className={styles.sliderRow}>
          <input type="range" min={1} max={10} step={0.25} value={shared.postReturnRate}
            onChange={e => setS('postReturnRate', Number(e.target.value))} className={styles.slider} />
          <span className={styles.sliderVal}>{shared.postReturnRate}%</span>
        </div>
      </WField>
    </div>
  )

  if (step.id === 'windfall') return (
    <div className={styles.stepContent}>
      <p className={styles.stepIntro}>Are you expecting a one-time lump sum? (inheritance, business sale, insurance payout)</p>
      <WField label="Amount (leave $0 to skip)" hint="This will be added to your portfolio at the age you specify.">
        <StepInput value={shared.windfall} onChange={v => setS('windfall', v)} min={0} step={5000} prefix="$" />
      </WField>
      {shared.windfall > 0 && (
        <WField label="At what age do you expect to receive it?">
          <StepInput value={shared.windfallAge} onChange={v => setS('windfallAge', v)} min={person.currentAge} max={person.lifeExpectancy} step={1} />
        </WField>
      )}
      {shared.windfall > 0 && (
        <div className={styles.calcNote}>
          {fmt(shared.windfall)} {shared.windfallAge <= person.retirementAge
            ? `added to your starting pool (before retirement)`
            : `applied at age ${shared.windfallAge} during retirement`}
        </div>
      )}
    </div>
  )

  if (step.id === 'residence') return (
    <div className={styles.stepContent}>
      <WField label="Do you own a primary residence?" hint="Your home equity will be included in your estate value.">
        <div className={styles.coupleChoice}>
          <ToggleCard active={!shared.primaryHomeEnabled} onClick={() => setS('primaryHomeEnabled', false)}
            icon="no" title="No / skip" desc="Renting or not including home equity" />
          <ToggleCard active={shared.primaryHomeEnabled} onClick={() => setS('primaryHomeEnabled', true)}
            icon="yes" title="Yes" desc="I own a home — include the equity" />
        </div>
      </WField>
      {shared.primaryHomeEnabled && (
        <>
          <WField label="Home market value" hint="Estimated current value.">
            <StepInput value={shared.primaryHomeValue} onChange={v => setS('primaryHomeValue', v)} min={0} step={25000} prefix="$" />
          </WField>
          <WField label="Mortgage remaining">
            <StepInput value={shared.primaryHomeMortgage} onChange={v => setS('primaryHomeMortgage', v)} min={0} step={10000} prefix="$" />
          </WField>
          <div className={styles.calcNote}>
            Home equity: <strong>{fmt(Math.max(0, shared.primaryHomeValue - shared.primaryHomeMortgage))}</strong> — added to estate value in all scenarios.
          </div>
        </>
      )}
      <WField label="Planning to downsize?" hint="You can add downsize proceeds as retirement income. Configure in the Residence tab after setup.">
        <div className={styles.coupleChoice}>
          <ToggleCard active={!shared.homeEnabled} onClick={() => setS('homeEnabled', false)}
            icon="no" title="Not planning to" desc="Keep the same home throughout retirement" />
          <ToggleCard active={shared.homeEnabled} onClick={() => setS('homeEnabled', true)}
            icon="downsize" title="Yes, downsize" desc="Some proceeds will go into my portfolio" />
        </div>
      </WField>
      {shared.homeEnabled && (
        <>
          <WField label="Home value at time of sale">
            <StepInput value={shared.homeValue} onChange={v => setS('homeValue', v)} min={0} step={25000} prefix="$" />
          </WField>
          <WField label="Downsize at age">
            <StepInput value={shared.homeDownsizeAge} onChange={v => setS('homeDownsizeAge', v)} min={person.currentAge} max={person.lifeExpectancy} step={1} />
          </WField>
          <div className={styles.calcNote}>
            You can adjust what percentage of proceeds to invest in the Residence tab.
          </div>
        </>
      )}
    </div>
  )

  if (step.id === 'review') {
    const totalAssets = person.rrsp + person.tfsa + person.nonReg + (person.lira || 0) +
      (shared.coupleMode ? spouse.rrsp + spouse.tfsa + spouse.nonReg + (spouse.lira || 0) : 0)
    const yearsToRet = Math.max(0, person.retirementAge - person.currentAge)
    return (
      <div className={styles.stepContent}>
        <p className={styles.stepIntro}>Here's a summary of what you've entered. Hit Calculate to see your scenarios.</p>
        <div className={styles.reviewGrid}>
          <div className={styles.reviewItem}><span className={styles.reviewLabel}>Province</span><span className={styles.reviewVal}>{shared.province}</span></div>
          <div className={styles.reviewItem}><span className={styles.reviewLabel}>Household</span><span className={styles.reviewVal}>{shared.coupleMode ? 'Couple' : 'Single'}</span></div>
          <div className={styles.reviewItem}><span className={styles.reviewLabel}>Current age</span><span className={styles.reviewVal}>{person.currentAge}</span></div>
          <div className={styles.reviewItem}><span className={styles.reviewLabel}>Retire at</span><span className={styles.reviewVal}>{person.retirementAge} ({yearsToRet} yrs)</span></div>
          <div className={styles.reviewItem}><span className={styles.reviewLabel}>Total assets</span><span className={styles.reviewVal}>{fmt(totalAssets)}</span></div>
          <div className={styles.reviewItem}><span className={styles.reviewLabel}>Monthly savings</span><span className={styles.reviewVal}>{fmt(person.monthlyContrib + (shared.coupleMode ? spouse.monthlyContrib : 0))}/mo</span></div>
          <div className={styles.reviewItem}><span className={styles.reviewLabel}>Spending target</span><span className={styles.reviewVal}>{fmt(shared.annualSpending)}/yr</span></div>
          <div className={styles.reviewItem}><span className={styles.reviewLabel}>CPP (P1 at 65)</span><span className={styles.reviewVal}>{fmt(person.cppMonthly65)}/mo</span></div>
          {shared.primaryHomeEnabled && <div className={styles.reviewItem}><span className={styles.reviewLabel}>Home equity</span><span className={styles.reviewVal}>{fmt(Math.max(0, shared.primaryHomeValue - shared.primaryHomeMortgage))}</span></div>}
          {shared.windfall > 0 && <div className={styles.reviewItem}><span className={styles.reviewLabel}>Windfall</span><span className={styles.reviewVal}>{fmt(shared.windfall)} at {shared.windfallAge}</span></div>}
          {person.dbPensionEnabled && (person.dbPensionMonthly || 0) > 0 && (
            <div className={styles.reviewItem}><span className={styles.reviewLabel}>DB pension (P1)</span><span className={styles.reviewVal}>{fmt(person.dbPensionMonthly)}/mo</span></div>
          )}
          {shared.coupleMode && spouse.dbPensionEnabled && (spouse.dbPensionMonthly || 0) > 0 && (
            <div className={styles.reviewItem}><span className={styles.reviewLabel}>DB pension (P2)</span><span className={styles.reviewVal}>{fmt(spouse.dbPensionMonthly)}/mo</span></div>
          )}
        </div>
        <div className={styles.reviewNote}>
          You can adjust any of these in the left panel at any time and recalculate. The full Residence tab has more options for home downsize and reverse mortgage.
        </div>
      </div>
    )
  }

  return null
}

const fmt = fmtDollar

// ─── Main wizard ──────────────────────────────────────────────────────────────
export function OnboardingWizard({ person, spouse, shared, setPField, setSField, setShField, onFinish }) {
  const [showModePicker, setShowModePicker] = useState(true)
  const [stepIndex, setStepIndex] = useState(0)

  const visibleSteps = STEPS.filter(s => !s.coupleOnly || shared.coupleMode)
  const step = visibleSteps[stepIndex]
  const total = visibleSteps.length
  const progress = Math.round((stepIndex / (total - 1)) * 100)

  const next = () => {
    if (stepIndex < total - 1) setStepIndex(i => i + 1)
  }
  const back = () => {
    if (stepIndex > 0) setStepIndex(i => i - 1)
  }
  const finish = () => {
    localStorage.setItem(FIRST_VISIT_KEY, '1')
    onFinish()
  }
  const skipToAdvanced = () => {
    localStorage.setItem(FIRST_VISIT_KEY, '1')
    onFinish(false) // false = don't calculate
  }

  if (showModePicker) {
    return (
      <ModePicker
        onGuided={() => setShowModePicker(false)}
        onAdvanced={skipToAdvanced}
      />
    )
  }

  return (
    <div className={styles.wizardBackdrop}>
      <div className={styles.wizardPanel}>

        {/* Progress bar */}
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>

        {/* Header */}
        <div className={styles.wizardHeader}>
          <div className={styles.stepCounter}>{stepIndex + 1} of {total}</div>
          <div className={styles.stepTitle}>
            <IconBox name={step.icon} size={18} tone='teal' />
            {step.title}
          </div>
          <button className={styles.skipAllBtn} onClick={skipToAdvanced} title="Exit wizard and use advanced mode">
            Skip to advanced mode
          </button>
        </div>

        {/* Step body */}
        <div className={styles.wizardBody}>
          <StepBody
            step={step}
            person={person} spouse={spouse} shared={shared}
            setPField={setPField} setSField={setSField} setShField={setShField}
          />
        </div>

        {/* Navigation */}
        <div className={styles.wizardNav}>
          <button className={styles.backBtn} onClick={back} disabled={stepIndex === 0}>
            ← Back
          </button>
          <div className={styles.dots}>
            {visibleSteps.map((_, i) => (
              <span key={i} className={`${styles.dot} ${i === stepIndex ? styles.dotActive : i < stepIndex ? styles.dotDone : ''}`} />
            ))}
          </div>
          {step.id === 'review' ? (
            <button className={styles.calcBtn} onClick={finish}>
              Calculate scenarios →
            </button>
          ) : (
            <button className={styles.nextBtn} onClick={next}>
              {step.skippable ? 'Skip / Next →' : 'Next →'}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}

export function useFirstVisit() {
  const [isFirstVisit, setIsFirstVisit] = useState(() => {
    try { return !localStorage.getItem(FIRST_VISIT_KEY) } catch { return false }
  })
  const dismiss = () => {
    try { localStorage.setItem(FIRST_VISIT_KEY, '1') } catch {}
    setIsFirstVisit(false)
  }
  return { isFirstVisit, dismiss }
}
