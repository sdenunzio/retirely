import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { useSpeculatorScenarios } from '../hooks/useSpeculatorScenarios.js'
import { SpeculatorScenariosModal } from './SpeculatorScenariosModal.jsx'
import { Link } from 'react-router-dom'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
         Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts'
import { analysePropertyMulti, pct, fmtC, fmtK } from '../lib/propertyEngine.js'
import { NumericInput } from '../components/NumericInput.jsx'
import { Icon } from '../components/Icon.jsx'
import { AppSwitcher } from '../components/AppSwitcher.jsx'
import { usePageMeta } from '../hooks/usePageMeta.js'
import styles from './SpeculatorPage.module.css'

// ─── Constants ───────────────────────────────────────────────────────────────
const MAX_PROPERTIES = 3
const MAX_UNITS = 8

const UNIT_DEFAULTS = {
  residential: { type: 'residential', rateMode: 'flat', flatMonthly: 1800, sqft: 800, ratePerSqFt: 2.0, vacancyRate: 0.04, camPct: 0 },
  commercial:  { type: 'commercial',  rateMode: 'persqft', flatMonthly: 3000, sqft: 2000, ratePerSqFt: 18, vacancyRate: 0.07, camPct: 100 },
}

const newUnit = (type = 'commercial', idx = 0) => ({
  id: crypto.randomUUID(),
  name: `Unit ${idx + 1}`,
  ...UNIT_DEFAULTS[type] ?? UNIT_DEFAULTS.commercial,
})

const DEFAULT_PROPERTY = (idx) => ({
  id: crypto.randomUUID(),
  name: `Property ${idx + 1}`,
  address: '',
  propertyType: 'commercial',
  ownershipMode: 'buying',
  purchasePrice: 1_000_000,
  downPaymentPct: 25,    // UI: 0–100
  mortgageRate: 6.5,     // UI: %
  mortgageTerm: 25,
  totalCAMMonthly: 800,
  defaultVacancyRate: 7,  // UI: %
  maintenanceReservePct: 2,
  managementFeePct: 8,
  propertyTaxRate: 1.5,
  insurance: 400,        // monthly
  utilities: 300,        // monthly
  miscExpenses: 200,     // monthly
  rentalIncreaseRate: 3,
  propertyTaxIncrease: 2,
  utilitiesIncrease: 2.5,
  appreciationRate: 3,
  buildingToLandRatio: 70,
  closingCostBuyPct: 1.5,
  closingCostSellPct: 4,
  holdingYears: 10,
  units: [newUnit('commercial', 0)],
})

// ─── Convert UI inputs (% as 0-100) to engine fractions ────────────────────
function toEngineInputs(p) {
  return {
    ...p,
    downPaymentPct:        p.downPaymentPct / 100,
    mortgageRate:          p.mortgageRate / 100,
    defaultVacancyRate:    p.defaultVacancyRate / 100,
    maintenanceReservePct: p.maintenanceReservePct / 100,
    managementFeePct:      p.managementFeePct / 100,
    propertyTaxRate:       p.propertyTaxRate / 100,
    rentalIncreaseRate:    p.rentalIncreaseRate / 100,
    propertyTaxIncrease:   p.propertyTaxIncrease / 100,
    utilitiesIncrease:     p.utilitiesIncrease / 100,
    appreciationRate:      p.appreciationRate / 100,
    buildingToLandRatio:   p.buildingToLandRatio / 100,
    closingCostBuyPct:     p.closingCostBuyPct / 100,
    closingCostSellPct:    p.closingCostSellPct / 100,
    insurance:             p.insurance * 12,
    utilities:             p.utilities * 12,
    miscExpenses:          p.miscExpenses * 12,
    units: p.units.map(u => ({
      ...u,
      vacancyRate: u.vacancyRate != null ? u.vacancyRate / 100 : undefined,
    })),
  }
}

// ─── Small shared components ─────────────────────────────────────────────────
const fmtN = n => n == null || !isFinite(n) ? '—' : '$' + Math.round(n).toLocaleString('en-CA')

function Field({ label, sub, children, tight }) {
  return (
    <div className={`${styles.field} ${tight ? styles.tight : ''}`}>
      <div className={styles.fieldLabel}>{label}{sub && <span className={styles.fieldSub}> · {sub}</span>}</div>
      {children}
    </div>
  )
}

function PctField({ label, sub, value, onChange, min = 0, max = 100, step = 0.25 }) {
  return (
    <Field label={label} sub={sub}>
      <NumericInput value={value} onChange={onChange} min={min} max={max} step={step} suffix="%" compact />
    </Field>
  )
}

function SectionHead({ title }) {
  return <div className={styles.sectionHead}>{title}</div>
}

function KPI({ label, value, tone, sub }) {
  return (
    <div className={`${styles.kpi} ${tone ? styles['kpi_' + tone] : ''}`}>
      <div className={styles.kpiVal}>{value}</div>
      <div className={styles.kpiLabel}>{label}</div>
      {sub && <div className={styles.kpiSub}>{sub}</div>}
    </div>
  )
}

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.tip}>
      <div className={styles.tipLabel}>Year {label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontSize: 11, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span>{p.name}</span><span>{fmtN(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Unit row ─────────────────────────────────────────────────────────────────
function UnitRow({ unit, onChange, onRemove, showType, isOnly }) {
  const set = (k, v) => onChange({ ...unit, [k]: v })

  return (
    <div className={styles.unitRow}>
      {/* Name */}
      <input className={styles.unitName} value={unit.name}
        onChange={e => set('name', e.target.value)} maxLength={20} />

      {/* Type — only shown in mixed mode */}
      {showType ? (
        <div className={styles.typePills}>
          {['residential','commercial'].map(t => (
            <button key={t}
              className={`${styles.typePill} ${unit.type === t ? styles.typePillOn : ''}`}
              onClick={() => set('type', t)}
            >{t === 'residential' ? 'Res' : 'Com'}</button>
          ))}
        </div>
      ) : (
        <span className={styles.unitTypeBadge}
          style={{ color: unit.type === 'residential' ? 'var(--amber)' : 'var(--teal)' }}>
          {unit.type === 'residential' ? 'Res' : 'Com'}
        </span>
      )}

      {/* Rate mode */}
      <div className={styles.typePills}>
        {[['flat','Flat $'],['persqft','$/sqft']].map(([m, l]) => (
          <button key={m}
            className={`${styles.typePill} ${unit.rateMode === m ? styles.typePillOn : ''}`}
            onClick={() => set('rateMode', m)}
          >{l}</button>
        ))}
      </div>

      {/* Rate inputs */}
      {unit.rateMode === 'flat' ? (
        <div className={styles.unitAmt}>
          <NumericInput value={unit.flatMonthly ?? 0} onChange={v => set('flatMonthly', v)}
            min={0} step={100} prefix="$" suffix="/mo" compact />
        </div>
      ) : (
        <div className={styles.unitAmtDouble}>
          <NumericInput value={unit.sqft ?? 0} onChange={v => set('sqft', v)}
            min={0} step={100} suffix=" sqft" compact />
          <NumericInput value={unit.ratePerSqFt ?? 0} onChange={v => set('ratePerSqFt', v)}
            min={0} step={0.5} prefix="$"
            suffix={unit.type === 'residential' ? '/sqft/mo' : '/sqft/yr'}
            compact />
        </div>
      )}

      {/* Remove */}
      {!isOnly && (
        <button className={styles.unitRemove} onClick={onRemove} title="Remove unit">
          <Icon name="close" size={11} />
        </button>
      )}
    </div>
  )
}

// ─── Property column ──────────────────────────────────────────────────────────
function PropertyColumn({ prop, onChange, onRemove, analysis, canRemove, isWinner }) {
  const [activeChart, setActiveChart] = useState('cashflow')
  const [showExpenses, setShowExpenses] = useState(false)
  const set = (k, v) => onChange({ ...prop, [k]: v })
  const setUnit = (id, unit) => onChange({ ...prop, units: prop.units.map(u => u.id === id ? unit : u) })

  // When switching property type, snap all units to the enforced type
  const setPropertyType = (t) => {
    if (t === 'mixed') {
      onChange({ ...prop, propertyType: t })
    } else {
      const forcedType = t
      onChange({
        ...prop,
        propertyType: t,
        units: prop.units.map(u => ({ ...u, type: forcedType })),
      })
    }
  }

  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft]     = useState(prop.name)
  const nameInputRef = React.useRef(null)

  const startEditName = () => {
    setNameDraft(prop.name)
    setEditingName(true)
    setTimeout(() => nameInputRef.current?.select(), 0)
  }
  const commitName = () => {
    const v = nameDraft.trim()
    if (v) set('name', v)
    else setNameDraft(prop.name)  // revert if blank
    setEditingName(false)
  }
  const onNameKey = e => {
    if (e.key === 'Enter')  commitName()
    if (e.key === 'Escape') { setNameDraft(prop.name); setEditingName(false) }
  }

  const addUnit = (type) => {
    if (prop.units.length >= MAX_UNITS) return
    onChange({ ...prop, units: [...prop.units, newUnit(type, prop.units.length)] })
  }
  const removeUnit = (id) => onChange({ ...prop, units: prop.units.filter(u => u.id !== id) })

  const isMixed      = prop.propertyType === 'mixed'
  const hasCommercial = prop.units.some(u => u.type === 'commercial')
  const showCAM      = hasCommercial && prop.propertyType !== 'residential'

  const r = analysis
  const y1ok  = r.dscrYear1 != null && r.dscrYear1 >= 1.25
  const cocOk = r.cocReturnYear1 > 0.07
  const irrOk = r.irr > 0.10
  const cf1   = r.cashFlowYear1 ?? 0

  const chartData = r.years?.map(y => ({
    year: y.year,
    cf:   Math.round(y.annualCashFlow),
    noi:  Math.round(y.noi),
    eq:   Math.round(y.equity / 1000),
  })) ?? []

  return (
    <div className={`${styles.propCol} ${isWinner ? styles.propColWinner : ''}`}>

      {/* Header */}
      <div className={styles.propHeader}>
        <div className={styles.propHeaderMain}>

          {/* Property name — click to edit */}
          {editingName ? (
            <input
              ref={nameInputRef}
              className={styles.propNameInput}
              value={nameDraft}
              onChange={e => setNameDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={onNameKey}
              maxLength={40}
            />
          ) : (
            <div className={styles.propNameDisplay} onClick={startEditName} title="Click to rename">
              <span className={styles.propNameText}>{prop.name}</span>
              <svg className={styles.propNameEdit} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </div>
          )}

          <div className={styles.propAddressRow}>
            <input className={styles.propAddress} value={prop.address ?? ''}
              onChange={e => set('address', e.target.value)} maxLength={120}
              placeholder="Address (optional)" />
            {prop.address?.trim() && (
              <a
                className={styles.mapsLink}
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(prop.address.trim())}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in Google Maps"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                Maps
              </a>
            )}
          </div>
        </div>
        <div className={styles.propHeaderRight}>
          {isWinner && <span className={styles.winnerBadge}><Icon name="check" size={10} /> Best IRR</span>}
          {canRemove && (
            <button className={styles.removePropBtn} onClick={onRemove} title="Remove property">
              <Icon name="close" size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Property type */}
      <div className={styles.typePills} style={{ marginBottom: '0.5rem' }}>
        {[['residential','🏠 Residential'],['commercial','🏢 Commercial'],['mixed','⚡ Mixed-use']].map(([t, l]) => (
          <button key={t}
            className={`${styles.typePill} ${prop.propertyType === t ? styles.typePillOn : ''}`}
            onClick={() => setPropertyType(t)}
          >{l}</button>
        ))}
      </div>

      {/* KPI strip */}
      <div className={styles.kpiStrip}>
        <KPI label="CAP rate" value={pct(r.capRateYear1)}
          tone={r.capRateYear1 > 0.06 ? 'good' : r.capRateYear1 > 0.04 ? 'warn' : 'bad'} sub="Yr 1" />
        <KPI label="Cash-on-Cash" value={pct(r.cocReturnYear1)}
          tone={cocOk ? 'good' : r.cocReturnYear1 > 0.04 ? 'warn' : 'bad'} sub="Yr 1" />
        <KPI label="DSCR" value={r.dscrYear1?.toFixed(2) ?? '—'}
          tone={y1ok ? 'good' : r.dscrYear1 > 1 ? 'warn' : 'bad'} sub="≥1.25" />
        <KPI label="IRR" value={r.irr ? pct(r.irr) : '—'}
          tone={irrOk ? 'good' : r.irr > 0.07 ? 'warn' : 'bad'} sub={`${prop.holdingYears}yr`} />
        <KPI label="CF / yr" value={fmtC(cf1)}
          tone={cf1 > 0 ? 'good' : 'bad'} sub="Yr 1" />
        <KPI label="Equity" value={fmtK(r.equityFinal)}
          tone="good" sub={`Yr ${prop.holdingYears}`} />
      </div>

      {/* Units */}
      <SectionHead title={`Units (${prop.units.length})`} />
      <div className={styles.unitHeader}>
        <span className={styles.uhName}>Name</span>
        {isMixed && <span className={styles.uhType}>Type</span>}
        <span className={styles.uhMode}>Rate mode</span>
        <span className={styles.uhAmt}>Amount</span>
      </div>
      {prop.units.map(u => (
        <UnitRow key={u.id} unit={u}
          onChange={updated => setUnit(u.id, updated)}
          onRemove={() => removeUnit(u.id)}
          showType={isMixed}
          isOnly={prop.units.length === 1}
        />
      ))}
      <div className={styles.addUnitRow}>
        {isMixed ? (
          <>
            <button className={styles.addUnitBtn} onClick={() => addUnit('residential')}
              disabled={prop.units.length >= MAX_UNITS}>
              <Icon name="plus" size={11} /> Residential unit
            </button>
            <button className={styles.addUnitBtn} onClick={() => addUnit('commercial')}
              disabled={prop.units.length >= MAX_UNITS}>
              <Icon name="plus" size={11} /> Commercial unit
            </button>
          </>
        ) : (
          <button className={styles.addUnitBtn}
            onClick={() => addUnit(prop.propertyType)}
            disabled={prop.units.length >= MAX_UNITS}>
            <Icon name="plus" size={11} /> Add unit
          </button>
        )}
      </div>

      {/* Building-level inputs */}
      <SectionHead title="Purchase & financing" />
      <Field label="Purchase price">
        <NumericInput value={prop.purchasePrice} onChange={v => set('purchasePrice', v)}
          min={50000} step={25000} prefix="$" compact />
      </Field>
      <div className={styles.row2}>
        <PctField label="Down payment" value={prop.downPaymentPct}
          onChange={v => set('downPaymentPct', v)} min={5} max={100} step={5} />
        <PctField label="Mortgage rate" value={prop.mortgageRate}
          onChange={v => set('mortgageRate', v)} min={1} max={15} step={0.25} />
      </div>
      <div className={styles.row2}>
        <Field label="Amortization">
          <NumericInput value={prop.mortgageTerm} onChange={v => set('mortgageTerm', v)}
            min={5} max={30} step={1} suffix=" yrs" compact />
        </Field>
        <Field label="Hold period">
          <NumericInput value={prop.holdingYears} onChange={v => set('holdingYears', v)}
            min={1} max={30} step={1} suffix=" yrs" compact />
        </Field>
      </div>
      <div className={styles.infoLine}>
        Loan: <strong>{fmtC(r.loanAmount)}</strong> ·
        Cash in: <strong>{fmtC(r.totalCashIn)}</strong> ·
        Mortgage: <strong>{fmtC(r.annualMortgage)}/yr</strong>
      </div>

      {showCAM && (
        <>
          <SectionHead title="Building CAM" />
          <Field label="Total monthly CAM" sub="landlord cost, auto-split to commercial tenants by sqft">
            <NumericInput value={prop.totalCAMMonthly} onChange={v => set('totalCAMMonthly', v)}
              min={0} step={50} prefix="$" suffix="/mo" compact />
          </Field>
          {prop.totalCAMMonthly > 0 && (() => {
            const commUnits = prop.units.filter(u => u.type === 'commercial')
            const totalSqft = commUnits.filter(u => u.rateMode === 'persqft').reduce((s, u) => s + (u.sqft || 0), 0)
            return (
              <div className={styles.camNote}>
                {commUnits.length} commercial unit{commUnits.length !== 1 ? 's' : ''} share ${(prop.totalCAMMonthly).toLocaleString('en-CA')}/mo CAM
                {totalSqft > 0 && ` · split by sqft proportion (${totalSqft.toLocaleString('en-CA')} sqft total)`}
              </div>
            )
          })()}
        </>
      )}

      <SectionHead title="Operating expenses" />
      <div className={styles.row2}>
        <PctField label="Prop. tax rate" value={prop.propertyTaxRate}
          onChange={v => set('propertyTaxRate', v)} min={0.1} max={4} step={0.1} />
        <PctField label="Maintenance" value={prop.maintenanceReservePct}
          onChange={v => set('maintenanceReservePct', v)} min={0} max={10} step={0.25} />
      </div>
      <div className={styles.row2}>
        <PctField label="Mgmt fee" value={prop.managementFeePct}
          onChange={v => set('managementFeePct', v)} min={0} max={15} step={0.5} />
        <PctField label="Default vacancy" value={prop.defaultVacancyRate}
          onChange={v => set('defaultVacancyRate', v)} min={0} max={50} step={1} />
      </div>

      <button className={styles.expToggle} onClick={() => setShowExpenses(e => !e)}>
        {showExpenses ? '▲ Hide' : '▼ More'} expense inputs
      </button>

      {showExpenses && (
        <>
          <div className={styles.row2}>
            <Field label="Insurance" sub="/mo">
              <NumericInput value={prop.insurance} onChange={v => set('insurance', v)}
                min={0} step={50} prefix="$" compact />
            </Field>
            <Field label="Utilities" sub="/mo">
              <NumericInput value={prop.utilities} onChange={v => set('utilities', v)}
                min={0} step={50} prefix="$" compact />
            </Field>
          </div>
          <div className={styles.row2}>
            <Field label="Misc" sub="/mo">
              <NumericInput value={prop.miscExpenses} onChange={v => set('miscExpenses', v)}
                min={0} step={50} prefix="$" compact />
            </Field>
            <PctField label="Appreciation" value={prop.appreciationRate}
              onChange={v => set('appreciationRate', v)} min={0} max={15} step={0.5} />
          </div>
          <div className={styles.row2}>
            <PctField label="Rent increase/yr" value={prop.rentalIncreaseRate}
              onChange={v => set('rentalIncreaseRate', v)} min={0} max={15} step={0.25} />
            <PctField label="Selling costs" value={prop.closingCostSellPct}
              onChange={v => set('closingCostSellPct', v)} min={0} max={10} step={0.5} />
          </div>
        </>
      )}

      {/* Chart */}
      <SectionHead title="Performance" />
      <div className={styles.chartTabs}>
        {[['cashflow','Cash flow'],['equity','Equity']].map(([id, label]) => (
          <button key={id}
            className={`${styles.chartTab} ${activeChart === id ? styles.chartTabOn : ''}`}
            onClick={() => setActiveChart(id)}
          >{label}</button>
        ))}
      </div>

      <div className={styles.chart}>
        <ResponsiveContainer width="100%" height={160}>
          {activeChart === 'cashflow' ? (
            <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} tickFormatter={v => '$' + (v/1000).toFixed(0) + 'k'} />
              <Tooltip content={<ChartTip />} />
              <ReferenceLine y={0} stroke="var(--border)" />
              <Bar dataKey="cf" name="Cash flow" fill="var(--teal)" radius={[2,2,0,0]} opacity={0.85} />
            </BarChart>
          ) : (
            <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} tickFormatter={v => '$' + v + 'k'} />
              <Tooltip content={<ChartTip />} />
              <Line dataKey="eq" name="Equity ($k)" stroke="var(--teal)" strokeWidth={2} dot={false} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Sale summary */}
      <div className={styles.saleBox}>
        <div className={styles.saleRow}>
          <span>Sale proceeds (yr {prop.holdingYears})</span>
          <strong>{fmtC(r.saleProceeds)}</strong>
        </div>
        <div className={styles.saleRow}>
          <span>Total cash invested</span>
          <strong>{fmtC(r.totalCashIn)}</strong>
        </div>
        <div className={styles.saleRow}>
          <span>Cumulative cash flow</span>
          <strong style={{ color: (r.years?.[r.years.length-1]?.cumulativeCashFlow ?? 0) >= 0 ? 'var(--teal)' : 'var(--danger)' }}>
            {fmtC(r.years?.[r.years.length-1]?.cumulativeCashFlow)}
          </strong>
        </div>
      </div>

    </div>
  )
}

// ─── Inline comparison table — renders inside same grid as columns ─────────────
function ComparisonInline({ properties, analyses }) {
  if (properties.length < 2) return null

  const metrics = [
    { key: 'irr',            label: 'IRR',          fmt: r => r.irr ? pct(r.irr) : '—',             higher: true },
    { key: 'capRateYear1',   label: 'CAP rate',     fmt: r => pct(r.capRateYear1),                   higher: true },
    { key: 'cocReturnYear1', label: 'Cash-on-Cash', fmt: r => pct(r.cocReturnYear1),                 higher: true },
    { key: 'cashFlowYear1',  label: 'CF yr 1',      fmt: r => fmtC(r.cashFlowYear1),                 higher: true },
    { key: 'dscrYear1',      label: 'DSCR',         fmt: r => r.dscrYear1?.toFixed(2) ?? '—',        higher: true },
    { key: 'equityFinal',    label: 'Final equity', fmt: r => fmtK(r.equityFinal),                   higher: true },
    { key: 'saleProceeds',   label: 'Sale proceeds',fmt: r => fmtK(r.saleProceeds),                  higher: true },
    { key: 'totalCashIn',    label: 'Cash in',      fmt: r => fmtC(r.totalCashIn),                   higher: false },
  ]

  // Grid: one column per property, value cells flex to match property column widths
  return (
    <div className={styles.compInline}
      style={{ gridTemplateColumns: `repeat(${properties.length}, 1fr)` }}>

      {/* Header row — property names, one per column */}
      <div className={styles.compInlineHeader}>
        <div className={styles.compInlineCorner}>
          <Icon name="comparison" size={11} /> Compare
        </div>
        {properties.map((p, i) => (
          <div key={p.id} className={styles.compInlineColHead}>{p.name}</div>
        ))}
      </div>

      {/* Metric rows */}
      {metrics.map(m => {
        const vals = analyses.map(a => a[m.key] ?? null)
        const nums = vals.filter(v => v !== null && isFinite(v))
        const best = nums.length > 1 ? (m.higher ? Math.max(...nums) : Math.min(...nums)) : null
        return (
          <div key={m.key} className={styles.compInlineRow}>
            <div className={styles.compInlineLabel}>{m.label}</div>
            {analyses.map((a, i) => {
              const v      = a[m.key]
              const isBest = v !== null && isFinite(v) && v === best
              return (
                <div key={i} className={`${styles.compInlineVal} ${isBest ? styles.compInlineBest : ''}`}>
                  {m.fmt(a)}{isBest && <span className={styles.compBestBadge}> ✓</span>}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

const SPECULATOR_DRAFT_KEY = 'retirement_lab_speculator_draft_v1'

function loadDraft() {
  try {
    const raw = localStorage.getItem(SPECULATOR_DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return null
    return parsed
  } catch { return null }
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function SpeculatorPage() {
  usePageMeta({
    title: 'Rental Property Investment Calculator (Canada) — Cash Flow & IRR | Retirely',
    description: 'Free Canadian rental & commercial property analyzer. Model mortgage payments, cash flow, cap rate and IRR across multiple properties and units. No sign-up.',
    canonical: 'https://retirely.ca/speculator',
  })
  const [properties, setProperties] = useState(() => loadDraft() ?? [DEFAULT_PROPERTY(0)])
  const [scenariosMode, setScenariosMode] = useState(null)  // null | 'save' | 'load'
  const scenariosHook = useSpeculatorScenarios()

  // Auto-save draft on every change so navigation doesn't lose state
  useEffect(() => {
    try { localStorage.setItem(SPECULATOR_DRAFT_KEY, JSON.stringify(properties)) } catch {}
  }, [properties])

  const updateProp = useCallback((id, updated) =>
    setProperties(prev => prev.map(p => p.id === id ? updated : p)), [])
  const removeProp = useCallback((id) =>
    setProperties(prev => prev.filter(p => p.id !== id)), [])
  const addProp = () => {
    if (properties.length >= MAX_PROPERTIES) return
    setProperties(prev => [...prev, DEFAULT_PROPERTY(prev.length)])
  }

  const analyses = useMemo(() =>
    properties.map(p => analysePropertyMulti(toEngineInputs(p))),
    [properties])

  const bestIRRIdx = useMemo(() => {
    let best = -Infinity, idx = 0
    analyses.forEach((a, i) => { if ((a.irr ?? -Infinity) > best) { best = a.irr; idx = i } })
    return analyses.length > 1 ? idx : -1
  }, [analyses])

  // Empty slot placeholders to always show 3 columns
  const emptySlots = MAX_PROPERTIES - properties.length

  return (
    <div className={styles.page}>

      {/* Top nav */}
      <div className={styles.topNav}>
        <div className={styles.navLeft}>
          <AppSwitcher />
          <div className={styles.navBrand}>
            <span className={styles.pageTitle}>Retirely</span>
            <span className={styles.betaPill}>BETA</span>
          </div>
          <div className={styles.navDivider} />
          <div className={styles.navCenter}>
            <Icon name="property" size={14} style={{ color: 'var(--teal)', flexShrink: 0 }} />
            <span className={styles.pageSub}>Property Speculator</span>
          </div>
        </div>
        <div className={styles.navRight}>
          {scenariosHook.activeScenario && (
            <span className={styles.activeScenarioPill}>
              <Icon name="check" size={10} />
              <span className={styles.activeScenarioName}>{scenariosHook.activeScenario.name}</span>
            </span>
          )}
          <button className={styles.navBtn} onClick={() => setScenariosMode('save')}>
            <Icon name="save" size={13} /> Save
          </button>
          <button className={styles.navBtn} onClick={() => setScenariosMode('load')}>
            <Icon name="load" size={13} /> Load
            {scenariosHook.scenarios.length > 0 && (
              <span className={styles.navBadge}>{scenariosHook.scenarios.length}</span>
            )}
          </button>
        </div>
      </div>

      {/* Instructions banner */}
      <div className={styles.instrBanner}>
        <Icon name="info" size={14} style={{ color: 'var(--teal)', flexShrink: 0 }} />
        <span>
          Add up to <strong>3 properties</strong> to compare side-by-side.
          Each property can have multiple units — residential, commercial, or mixed.
          When 2 or more properties are active, a summary comparison appears above.
          The <strong>best IRR</strong> property is highlighted in teal.
        </span>
      </div>

      {/* Condensed summary — only when 2+ properties */}
      {properties.length > 1 && (
        <div className={styles.summaryStrip}>
          {properties.map((p, i) => {
            const a = analyses[i]
            const isWinner = bestIRRIdx === i
            const cf1 = a.cashFlowYear1 ?? 0
            return (
              <div key={p.id} className={`${styles.summaryCard} ${isWinner ? styles.summaryCardWinner : ''}`}>
                <div className={styles.summaryName}>
                  {isWinner && <span className={styles.summaryWinDot} />}
                  {p.name}
                </div>
                <div className={styles.summaryMetrics}>
                  {[
                    { label: 'IRR',    val: a.irr ? pct(a.irr) : '—',           tone: a.irr > 0.10 ? 'good' : a.irr > 0.07 ? 'warn' : 'bad' },
                    { label: 'CAP',    val: pct(a.capRateYear1),                  tone: a.capRateYear1 > 0.06 ? 'good' : 'warn' },
                    { label: 'CF/yr',  val: fmtK(cf1),                           tone: cf1 >= 0 ? 'good' : 'bad' },
                    { label: 'DSCR',   val: a.dscrYear1?.toFixed(2) ?? '—',      tone: (a.dscrYear1 ?? 0) >= 1.25 ? 'good' : 'warn' },
                    { label: 'Equity', val: fmtK(a.equityFinal),                 tone: null },
                    { label: 'Cash in',val: fmtK(a.totalCashIn),                 tone: null },
                  ].map(m => (
                    <div key={m.label} className={styles.summaryMetric}>
                      <span className={styles.smLabel}>{m.label}</span>
                      <span className={`${styles.smVal} ${m.tone ? styles['sm' + m.tone.charAt(0).toUpperCase() + m.tone.slice(1)] : ''}`}>
                        {m.val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Property columns — always 3 wide */}
      <div className={styles.columns}>
        {properties.map((p, i) => (
          <PropertyColumn
            key={p.id}
            prop={p}
            analysis={analyses[i]}
            onChange={updated => updateProp(p.id, updated)}
            onRemove={() => removeProp(p.id)}
            canRemove={properties.length > 1}
            isWinner={bestIRRIdx === i}
          />
        ))}
        {/* Empty dotted slots — always fill to 3 */}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <div key={'empty-' + i} className={styles.addPropCard} onClick={addProp}>
            <Icon name="plus" size={28} style={{ opacity: .3 }} />
            <span>Add property</span>
          </div>
        ))}
      </div>

      {/* Scenarios modal */}
      {scenariosMode && (
        <SpeculatorScenariosModal
          onClose={() => setScenariosMode(null)}
          initialMode={scenariosMode}
          scenarios={scenariosHook.scenarios}
          maxScenarios={scenariosHook.maxScenarios}
          activeId={scenariosHook.activeId}
          activeScenario={scenariosHook.activeScenario}
          onSave={(name, props) => scenariosHook.saveScenario(name, props)}
          onSaveAsNew={(name, props) => scenariosHook.saveAsNew(name, props)}
          onLoad={(id) => scenariosHook.loadScenario(id, setProperties)}
          onDelete={scenariosHook.deleteScenario}
          onRename={scenariosHook.renameScenario}
          properties={properties}
        />
      )}

      <footer className={styles.footer}>
        © {new Date().getFullYear()} Retirely (retirely.ca) · All rights reserved · For speculative analysis only · Not financial or investment advice
      </footer>
    </div>
  )
}
