import React, { useState } from 'react'
import { BudgetModal } from './BudgetModal.jsx'
import { PROVINCES_LIST } from '../lib/engine.js'
import { NumericInput } from './NumericInput.jsx'
import { Icon } from './Icon.jsx'
import styles from './InputPanel.module.css'

// ─── Shared mini-components ───────────────────────────────────────────────────
function StepInput({ value, onChange, min = 0, max, step = 1, prefix = '', suffix = '' }) {
  return <NumericInput value={value} onChange={onChange} min={min} max={max} step={step} prefix={prefix} suffix={suffix} compact />
}

function Field({ label, sub, children }) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}{sub && <span className={styles.labelSub}> · {sub}</span>}</label>
      {children}
    </div>
  )
}

function SliderField({ label, value, onChange, min, max, step }) {
  return (
    <Field label={label}>
      <div className={styles.sliderRow}>
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))} className={styles.slider} />
        <StepInput value={value} onChange={onChange} min={min} max={max} step={step} suffix="%" />
      </div>
    </Field>
  )
}

function SectionHead({ title }) {
  return <div className={styles.sectionHead}>{title}</div>
}

function Toggle({ on, onToggle, label }) {
  return (
    <button className={`${styles.toggle} ${on ? styles.toggleOn : ''}`} onClick={onToggle} type="button">
      <span className={styles.toggleThumb} />
      {label && <span className={styles.toggleLabel}>{label}</span>}
    </button>
  )
}

function fmtDollar(n) { return '$' + Math.round(n).toLocaleString('en-CA') }

// ─── Tab: Profile ─────────────────────────────────────────────────────────────
function ProfileTab({ person, setPField, spouse, setSField, shared, setShField }) {
  const [showBudget, setShowBudget] = useState(false)
  const isCouple = shared.coupleMode
  return (
    <div className={styles.tabContent}>

      {/* Couple toggle */}
      <div className={styles.coupleRow}>
        <span className={styles.coupleLabel}>
          <Icon name={isCouple ? 'couple' : 'person'} size={14} />
          {isCouple ? 'Couple mode' : 'Single / planning alone'}
        </span>
        <Toggle on={isCouple} onToggle={() => setShField('coupleMode', !isCouple)} />
      </div>

      <SectionHead title={isCouple ? 'Person 1' : 'Your profile'} />

      <div className={styles.row2}>
        <Field label="Current age">
          <StepInput value={person.currentAge} onChange={v => setPField('currentAge', v)} min={18} max={80} step={1} />
        </Field>
        <Field label="Retire at">
          <StepInput value={person.retirementAge} onChange={v => setPField('retirementAge', v)} min={45} max={80} step={1} />
        </Field>
      </div>
      <Field label="Life expectancy">
        <StepInput value={person.lifeExpectancy} onChange={v => setPField('lifeExpectancy', v)} min={70} max={105} step={1} />
      </Field>
      <Field label="Annual income">
        <StepInput value={person.annualIncome || 0} onChange={v => setPField('annualIncome', v)} min={0} step={5000} prefix="$" />
      </Field>

      {/* Savings rate indicator */}
      {(person.annualIncome || 0) > 0 && (() => {
        const rate = Math.round(person.monthlyContrib * 12 / person.annualIncome * 100)
        return (
          <div className={styles.savingsRate}>
            <span className={styles.savingsRateBar}><span className={styles.savingsRateFill} style={{ width: `${Math.min(rate, 100)}%` }} /></span>
            <span className={styles.savingsRateLabel}>
              {rate}% saved
              {rate < 10 && <span className={styles.savingsRateHint}> · aim 15%+</span>}
              {rate >= 20 && <span className={styles.savingsRateGood}> · great</span>}
            </span>
          </div>
        )
      })()}

      {isCouple && (
        <>
          <SectionHead title="Person 2 (spouse / partner)" />
          <div className={styles.row2}>
            <Field label="Current age">
              <StepInput value={spouse.currentAge} onChange={v => setSField('currentAge', v)} min={18} max={80} step={1} />
            </Field>
            <Field label="Retire at">
              <StepInput value={spouse.retirementAge} onChange={v => setSField('retirementAge', v)} min={45} max={80} step={1} />
            </Field>
          </div>
          <Field label="Life expectancy">
            <StepInput value={spouse.lifeExpectancy} onChange={v => setSField('lifeExpectancy', v)} min={70} max={105} step={1} />
          </Field>
          <Field label="Annual income">
            <StepInput value={spouse.annualIncome || 0} onChange={v => setSField('annualIncome', v)} min={0} step={5000} prefix="$" />
          </Field>
          {(spouse.annualIncome || 0) > 0 && (() => {
            const rate = Math.round(spouse.monthlyContrib * 12 / spouse.annualIncome * 100)
            return (
              <div className={styles.savingsRate}>
                <span className={styles.savingsRateBar}><span className={styles.savingsRateFill} style={{ width: `${Math.min(rate, 100)}%` }} /></span>
                <span className={styles.savingsRateLabel}>{rate}% saved</span>
              </div>
            )
          })()}
        </>
      )}

      <SectionHead title="Province" />
      <select className={styles.provinceSelect} value={shared.province}
        onChange={e => setShField('province', e.target.value)}>
        {PROVINCES_LIST.map(([code, name]) => (
          <option key={code} value={code}>{code} — {name}</option>
        ))}
      </select>

      <SectionHead title="Spending & assumptions" />
      <div className={styles.spendingRow}>
        <div className={styles.spendingInput}>
          <Field label="Annual spending">
            <StepInput value={shared.annualSpending} onChange={v => setShField('annualSpending', v)} min={10000} step={2500} prefix="$" />
          </Field>
        </div>
        <button className={styles.budgetBtn} onClick={() => setShowBudget(true)} title="Open budget planner">
          <Icon name="drawdown" size={12} />
          Budget
        </button>
      </div>
      {shared.budget?.enabled && (
        <div className={styles.budgetActive}>
          <Icon name="check" size={11} />
          Budget active · {shared.budget?.items?.length ?? 0} categories
        </div>
      )}

      {showBudget && (
        <BudgetModal
          onClose={() => setShowBudget(false)}
          shared={shared}
          setShField={setShField}
        />
      )}
      <SliderField label={`Pre-ret. return: ${shared.preReturnRate}%`}
        value={shared.preReturnRate} onChange={v => setShField('preReturnRate', v)} min={1} max={12} step={0.25} />
      <SliderField label={`Ret. return: ${shared.postReturnRate}%`}
        value={shared.postReturnRate} onChange={v => setShField('postReturnRate', v)} min={1} max={10} step={0.25} />
      <SliderField label={`Inflation: ${shared.inflationRate}%`}
        value={shared.inflationRate} onChange={v => setShField('inflationRate', v)} min={0} max={6} step={0.25} />
    </div>
  )
}

// ─── DB Pension sub-section ───────────────────────────────────────────────────
function DbPensionSection({ values, set, isSpouse, isCouple, province }) {
  const enabled = values.dbPensionEnabled ?? false
  return (
    <div className={`${styles.dbSection} ${enabled ? styles.dbSectionOn : ''}`}>
      <div className={styles.dbHeader}>
        <div className={styles.dbTitle}>
          <Icon name="government" size={13} />
          DB Pension {isSpouse ? '(P2)' : ''}
        </div>
        <Toggle on={enabled} onToggle={() => set('dbPensionEnabled', !enabled)} />
      </div>

      {enabled && (
        <div className={styles.dbFields}>
          <Field label="Monthly amount at retirement">
            <StepInput value={values.dbPensionMonthly ?? 0} onChange={v => set('dbPensionMonthly', v)} min={0} step={100} prefix="$" />
          </Field>

          <Field label="Bridge benefit" sub="extra /mo until 65">
            <StepInput value={values.dbPensionBridge ?? 0} onChange={v => set('dbPensionBridge', v)} min={0} step={50} prefix="$" />
          </Field>

          <Field label="Inflation indexing">
            <div className={styles.pillGroup}>
              {[
                { val: 'none', label: 'Fixed' },
                { val: 'half', label: '½ CPI' },
                { val: 'full', label: 'Full CPI' },
              ].map(({ val, label }) => (
                <button key={val}
                  className={`${styles.pill} ${(values.dbPensionIndexed ?? 'none') === val ? styles.pillOn : ''}`}
                  onClick={() => set('dbPensionIndexed', val)}
                  type="button"
                >{label}</button>
              ))}
            </div>
          </Field>

          {isCouple && (
            <Field label="Survivor benefit" sub="% to spouse">
              <StepInput value={values.dbPensionSurvivor ?? 60} onChange={v => set('dbPensionSurvivor', Math.min(100, Math.max(0, v)))} min={0} max={100} step={10} suffix="%" />
            </Field>
          )}

          <div className={styles.dbNote}>
            DB income is taxable. At 65+ it qualifies for pension income splitting.
            {values.dbPensionIndexed === 'none' && ' Fixed — purchasing power erodes with inflation.'}
            {values.dbPensionIndexed === 'half' && ' Half-indexed — partially protected from inflation.'}
            {values.dbPensionIndexed === 'full' && ' Fully indexed — purchasing power preserved.'}
          </div>
        </div>
      )}
    </div>
  )
}


// ─── Other Income sub-section ────────────────────────────────────────────────
function OtherIncomeSection({ values, set, isSpouse }) {
  const monthly = values.otherIncomeMonthly ?? 0
  const taxable = values.otherIncomeTaxable ?? true

  return (
    <div className={styles.otherIncomeRow}>
      <div className={styles.otherIncomeInput}>
        <Field label={`Other income${isSpouse ? ' (P2)' : ''}`} sub="part-time, gig, rental /mo">
          <StepInput value={monthly} onChange={v => set('otherIncomeMonthly', v)} min={0} step={50} prefix="$" />
        </Field>
      </div>
      {monthly > 0 && (
        <button
          className={`${styles.taxableBtn} ${taxable ? styles.taxableBtnOn : styles.taxableBtnOff}`}
          onClick={() => set('otherIncomeTaxable', !taxable)}
          title={taxable ? 'Counted as taxable income — click to make non-taxable' : 'Non-taxable — click to mark as taxable'}
          type="button"
        >
          <span className={styles.taxableCheck}>{taxable ? '✓' : '○'}</span>
          Taxable
        </button>
      )}
      {monthly > 0 && (
        <div className={styles.incomeHint}>
          {(monthly * 12).toLocaleString('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })}/yr
          {taxable ? ' · taxable income' : ' · non-taxable'}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Income ──────────────────────────────────────────────────────────────
function IncomeTab({ person, setPField, spouse, setSField, shared, setShField }) {
  const isCouple = shared.coupleMode
  const isQC = shared.province === 'QC'
  return (
    <div className={styles.tabContent}>

      <SectionHead title={`${isQC ? 'QPP' : 'CPP'} & OAS${isCouple ? ' — Person 1' : ''}`} />
      <div className={styles.row2}>
        <Field label={`${isQC ? 'QPP' : 'CPP'} at 65 /mo`}>
          <StepInput value={person.cppMonthly65} onChange={v => setPField('cppMonthly65', v)} min={0} max={1400} step={25} prefix="$" />
        </Field>
        <Field label="OAS start">
          <StepInput value={person.oasStartAge} onChange={v => setPField('oasStartAge', v)} min={65} max={70} step={1} />
        </Field>
      </div>
      <div className={styles.incomeHint}>
        CPP max 2025: ~$1,433/mo at 65. Check My Service Canada for your estimate.
        {person.oasStartAge > 65 && ` Deferring OAS to ${person.oasStartAge} gives +${Math.round((person.oasStartAge - 65) * 7.2)}% boost.`}
      </div>

      <DbPensionSection values={person} set={setPField} isSpouse={false} isCouple={isCouple} province={shared.province} />

      {isCouple && (
        <>
          <SectionHead title={`${isQC ? 'QPP' : 'CPP'} & OAS — Person 2`} />
          <div className={styles.row2}>
            <Field label={`${isQC ? 'QPP' : 'CPP'} at 65 /mo`}>
              <StepInput value={spouse.cppMonthly65} onChange={v => setSField('cppMonthly65', v)} min={0} max={1400} step={25} prefix="$" />
            </Field>
            <Field label="OAS start">
              <StepInput value={spouse.oasStartAge} onChange={v => setSField('oasStartAge', v)} min={65} max={70} step={1} />
            </Field>
          </div>
          <DbPensionSection values={spouse} set={setSField} isSpouse={true} isCouple={isCouple} province={shared.province} />
        </>
      )}

      <SectionHead title="Other income" />
      <OtherIncomeSection values={person} set={setPField} isSpouse={false} />
      {isCouple && <OtherIncomeSection values={spouse} set={setSField} isSpouse={true} />}

      <SectionHead title="One-time windfall" />
      <div className={styles.row2}>
        <Field label="Amount">
          <StepInput value={shared.windfall} onChange={v => setShField('windfall', v)} min={0} step={5000} prefix="$" />
        </Field>
        <Field label="At age">
          <StepInput value={shared.windfallAge} onChange={v => setShField('windfallAge', v)} min={person.currentAge} max={person.lifeExpectancy} step={1} />
        </Field>
      </div>
      {shared.windfall > 0 && (
        <div className={styles.incomeHint}>
          {shared.windfallAge <= person.retirementAge
            ? 'Added to starting pool before retirement.'
            : `Applied at age ${shared.windfallAge} during retirement.`}
        </div>
      )}

      <SectionHead title="RRSP meltdown" />
      <div className={styles.toggleRow}>
        <label className={styles.toggleLabel}>
          <input type="checkbox" checked={!!shared.rrspMeltdownEnabled}
            onChange={e => setShField('rrspMeltdownEnabled', e.target.checked)} />
          Deliberately draw RRSP before age 71
        </label>
      </div>
      {shared.rrspMeltdownEnabled && (
        <>
          <Field label="Extra annual RRSP draw" sub="Withdrawn each year from retirement until age 71 to reduce future RRIF minimums">
            <StepInput value={shared.rrspMeltdownAnnual || 10000} onChange={v => setShField('rrspMeltdownAnnual', v)} min={0} step={1000} prefix="$" />
          </Field>
          <div className={styles.incomeHint}>
            This extra draw increases taxable income now but shrinks RRIF minimums after 71, potentially reducing lifetime tax if you expect to be in a lower bracket later.
          </div>
        </>
      )}
    </div>
  )
}

// ─── Tab: Portfolio ───────────────────────────────────────────────────────────
function PortfolioTab({ person, setPField, spouse, setSField, shared }) {
  const isCouple = shared.coupleMode
  // P1 total includes spousal RRSP received from P2 (spouse.spousalRrsp)
  const p1SpousalReceived = isCouple ? (spouse?.spousalRrsp || 0) : 0
  const total1 = person.rrsp + person.tfsa + person.nonReg + (person.lira || 0) + p1SpousalReceived
  // P2 total includes spousal RRSP received from P1 (person.spousalRrsp)
  const p2SpousalReceived = person.spousalRrsp || 0
  const total2 = isCouple ? spouse.rrsp + spouse.tfsa + spouse.nonReg + (spouse.lira || 0) + p2SpousalReceived : 0
  return (
    <div className={styles.tabContent}>

      <SectionHead title={isCouple ? 'Person 1 savings' : 'Your savings'} />
      <div className={styles.totalToday}>{fmtDollar(total1)}</div>

      <div className={styles.row2}>
        <Field label="RRSP">
          <StepInput value={person.rrsp} onChange={v => setPField('rrsp', v)} min={0} step={5000} prefix="$" />
        </Field>
        <Field label="TFSA">
          <StepInput value={person.tfsa} onChange={v => setPField('tfsa', v)} min={0} step={5000} prefix="$" />
        </Field>
      </div>
      <div className={styles.row2}>
        <Field label="Non-reg">
          <StepInput value={person.nonReg} onChange={v => setPField('nonReg', v)} min={0} step={5000} prefix="$" />
        </Field>
        <Field label="LIRA / LIF" sub="Locked-in retirement funds from former employer pension">
          <StepInput value={person.lira || 0} onChange={v => setPField('lira', v)} min={0} step={5000} prefix="$" />
        </Field>
      </div>
      <div className={styles.row2}>
        <Field label="Monthly contrib">
          <StepInput value={person.monthlyContrib} onChange={v => setPField('monthlyContrib', v)} min={0} step={100} prefix="$" />
        </Field>
        {isCouple && (
          <Field label="Spousal RRSP contributed" sub="Amount you (P1) contributed into P2's name — taxed in P2's hands at withdrawal">
            <StepInput value={person.spousalRrsp || 0} onChange={v => setPField('spousalRrsp', v)} min={0} step={5000} prefix="$" />
          </Field>
        )}
      </div>
      {(person.lira || 0) > 0 && (
        <div className={styles.incomeHint}>
          LIRA converts to a LIF at retirement. LIF has both a minimum (like RRIF) and a maximum withdrawal each year — excess stays locked. All withdrawals are fully taxable.
        </div>
      )}

      {isCouple && (
        <>
          <SectionHead title="Person 2 savings" />
          <div className={styles.totalToday} style={{ color: 'var(--teal-40)' }}>{fmtDollar(total2)}</div>
          <div className={styles.row2}>
            <Field label="RRSP">
              <StepInput value={spouse.rrsp} onChange={v => setSField('rrsp', v)} min={0} step={5000} prefix="$" />
            </Field>
            <Field label="TFSA">
              <StepInput value={spouse.tfsa} onChange={v => setSField('tfsa', v)} min={0} step={5000} prefix="$" />
            </Field>
          </div>
          <div className={styles.row2}>
            <Field label="Non-reg">
              <StepInput value={spouse.nonReg} onChange={v => setSField('nonReg', v)} min={0} step={5000} prefix="$" />
            </Field>
            <Field label="LIRA / LIF" sub="Locked-in retirement funds from former employer pension">
              <StepInput value={spouse.lira || 0} onChange={v => setSField('lira', v)} min={0} step={5000} prefix="$" />
            </Field>
          </div>
          <div className={styles.row2}>
            <Field label="Monthly contrib">
              <StepInput value={spouse.monthlyContrib} onChange={v => setSField('monthlyContrib', v)} min={0} step={100} prefix="$" />
            </Field>
            <Field label="Spousal RRSP contributed" sub="Amount P2 contributed into P1's name — taxed in P1's hands at withdrawal">
              <StepInput value={spouse.spousalRrsp || 0} onChange={v => setSField('spousalRrsp', v)} min={0} step={5000} prefix="$" />
            </Field>
          </div>
        </>
      )}

      {isCouple && total1 + total2 > 0 && (
        <div className={styles.combinedTotal}>
          <span>Combined today</span>
          <strong>{fmtDollar(total1 + total2)}</strong>
        </div>
      )}
    </div>
  )
}

// ─── Main InputPanel ──────────────────────────────────────────────────────────
export function InputPanel({ person, spouse, shared, setPField, setSField, setShField, onCalculate, onReset }) {
  const [activeTab, setActiveTab] = useState('profile')

  const TABS = [
    { id: 'profile',   icon: 'person',     label: 'Profile' },
    { id: 'income',    icon: 'government', label: 'Income' },
    { id: 'portfolio', icon: 'assets',     label: 'Portfolio' },
  ]

  // Badge: DB pension enabled indicator
  const hasDB = person.dbPensionEnabled || (shared.coupleMode && spouse.dbPensionEnabled)

  return (
    <aside className={styles.panel}>
      <div className={styles.panelInner}>

        {/* Tab bar */}
        <div className={styles.sidebarTabs}>
          {TABS.map(t => (
            <button key={t.id}
              className={`${styles.sidebarTab} ${activeTab === t.id ? styles.sidebarTabActive : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              <Icon name={t.icon} size={12} />
              {t.label}
              {t.id === 'income' && hasDB && <span className={styles.dbBadge}>DB</span>}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'profile' && (
          <ProfileTab person={person} setPField={setPField} spouse={spouse} setSField={setSField} shared={shared} setShField={setShField} />
        )}
        {activeTab === 'income' && (
          <IncomeTab person={person} setPField={setPField} spouse={spouse} setSField={setSField} shared={shared} setShField={setShField} />
        )}
        {activeTab === 'portfolio' && (
          <PortfolioTab person={person} setPField={setPField} spouse={spouse} setSField={setSField} shared={shared} />
        )}

        {/* Footer actions */}
        <div className={styles.panelFooter}>
          <button className={styles.resetBtn} onClick={onReset} title="Reset all inputs">
            <Icon name="reset" size={12} />Reset
          </button>
          <button className={styles.calcBtn} onClick={onCalculate}>
            Calculate scenarios →
          </button>
        </div>

      </div>
    </aside>
  )
}
