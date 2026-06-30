import { useCallback } from 'react'
import * as XLSX from 'xlsx'
import { analyseProperty } from '../lib/propertyEngine.js'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const pct = (n, d = 1) => n != null && isFinite(n) ? +((n * 100).toFixed(d)) : null
const dollar = n => n != null && isFinite(n) ? Math.round(n) : null

// Style helpers — xlsx-js-style would give full cell styling, but vanilla xlsx
// supports column widths, sheet names, and data types natively.
function makeSheet(rows) {
  return XLSX.utils.aoa_to_sheet(rows)
}

function setColWidths(ws, widths) {
  ws['!cols'] = widths.map(w => ({ wch: w }))
}

// ─── Sheet builders ───────────────────────────────────────────────────────────

function buildInputsSheet(person, spouse, shared) {
  const rows = [
    ['RETIREMENT LAB — Input Summary'],
    [],
    ['PERSON 1', ''],
    ['Field', 'Value'],
    ['Current age', person.currentAge],
    ['Retirement age', person.retirementAge],
    ['Life expectancy', person.lifeExpectancy],
    ['Annual income', dollar(person.annualIncome)],
    ['RRSP', dollar(person.rrsp)],
    ['TFSA', dollar(person.tfsa)],
    ['Non-registered', dollar(person.nonReg)],
    ['Monthly contribution', dollar(person.monthlyContrib)],
    ['CPP at 65 (monthly)', dollar(person.cppMonthly65)],
    ['OAS start age', person.oasStartAge],
  ]

  if (shared.coupleMode) {
    rows.push([], ['PERSON 2', ''])
    rows.push(['Field', 'Value'])
    rows.push(
      ['Current age', spouse.currentAge],
      ['Retirement age', spouse.retirementAge],
      ['Life expectancy', spouse.lifeExpectancy],
      ['Annual income', dollar(spouse.annualIncome)],
      ['RRSP', dollar(spouse.rrsp)],
      ['TFSA', dollar(spouse.tfsa)],
      ['Non-registered', dollar(spouse.nonReg)],
      ['Monthly contribution', dollar(spouse.monthlyContrib)],
      ['CPP at 65 (monthly)', dollar(spouse.cppMonthly65)],
      ['OAS start age', spouse.oasStartAge],
    )
  }

  rows.push(
    [],
    ['SHARED ASSUMPTIONS', ''],
    ['Field', 'Value'],
    ['Province', shared.province],
    ['Pre-retirement return (%)', pct(shared.preReturnRate / 100)],
    ['Retirement return (%)', pct(shared.postReturnRate / 100)],
    ['Inflation (%)', pct(shared.inflationRate / 100)],
    ['Annual spending target', dollar(shared.annualSpending)],
    ['Couple mode', shared.coupleMode ? 'Yes' : 'No'],
    ['Windfall amount', shared.windfall > 0 ? dollar(shared.windfall) : 'None'],
    ['Windfall age', shared.windfall > 0 ? shared.windfallAge : '—'],
  )

  const ws = makeSheet(rows)
  setColWidths(ws, [32, 20])
  return ws
}

function buildScenariosSheet(results) {
  if (!results?.scenarios) return null

  const header = [
    'Strategy', 'Description',
    'Start Pool ($)', 'First Yr Income ($)',
    'Assets @ 70 ($)', 'Assets @ 85 ($)',
    'Est. Tax ($)', 'Estate Value ($)',
    'Depleted Age', 'Income Split Saving ($)',
  ]

  const rows = [
    ['RETIREMENT LAB — Scenario Comparison'],
    [],
    header,
  ]

  results.scenarios.forEach(s => {
    const r = s.result
    rows.push([
      s.label,
      s.description,
      dollar(r.projAtRet),
      dollar(r.firstYearIncome),
      dollar(r.age70Assets),
      dollar(r.age85Assets),
      dollar(r.totalTax),
      dollar(r.estateValue + (results.primaryHomeEquity || 0)),
      r.depletedAge ?? 'Survives',
      r.incomeSplitSaving > 500 ? dollar(r.incomeSplitSaving) : 'N/A',
    ])
  })

  const ws = makeSheet(rows)
  setColWidths(ws, [28, 36, 16, 18, 14, 14, 14, 16, 12, 20])
  return ws
}

function buildFireSheet(results) {
  if (!results?.fire) return null
  const f = results.fire
  const rows = [
    ['RETIREMENT LAB — FIRE Analysis'],
    [],
    ['Metric', 'Value'],
    ['FIRE number ($)', dollar(f.fireNumber)],
    ['Lean FIRE number ($)', dollar(f.leanFireNumber)],
    ['Progress toward FIRE (%)', f.progress],
    ['FIRE target age', f.fireAge ? +f.fireAge.toFixed(1) : '—'],
    ['Coast FIRE age', f.coastAge ? +f.coastAge.toFixed(1) : '—'],
    ['Government income at FIRE ($)', dollar(f.govAtFire)],
    ['Annual contributions ($)', dollar(f.annualContrib)],
    [],
    ['Note', 'FIRE number = target spending ÷ SWR. Lean FIRE offsets CPP/OAS. For planning only.'],
  ]
  const ws = makeSheet(rows)
  setColWidths(ws, [32, 20])
  return ws
}

function buildTaxSheet(shared) {
  const income = shared.annualSpending
  const PROVINCES = [
    { code: 'ON', name: 'Ontario',           rate: 0.0905, basic: 11865 },
    { code: 'BC', name: 'British Columbia',  rate: 0.0506, basic: 11981 },
    { code: 'AB', name: 'Alberta',           rate: 0.10,   basic: 21003 },
    { code: 'QC', name: 'Quebec',            rate: 0.14,   basic: 17183 },
    { code: 'SK', name: 'Saskatchewan',      rate: 0.105,  basic: 17661 },
    { code: 'MB', name: 'Manitoba',          rate: 0.108,  basic: 15780 },
    { code: 'NS', name: 'Nova Scotia',       rate: 0.0879, basic: 8481  },
    { code: 'NB', name: 'New Brunswick',     rate: 0.094,  basic: 12458 },
  ]

  const approxTax = (inc, basic, rate) => {
    const FED_BASIC = 15705
    let fed = 0, rem = Math.max(0, inc - FED_BASIC)
    for (const [cap, r] of [[57375,0.15],[57375,0.205],[63895,0.26],[70645,0.29],[Infinity,0.33]]) {
      const t = Math.min(rem, cap); fed += t * r; rem -= t; if (rem <= 0) break
    }
    const prov = Math.max(0, inc - basic) * rate
    return fed + prov
  }

  const rows = [
    ['RETIREMENT LAB — Provincial Tax Comparison'],
    [`Reference income: $${income.toLocaleString('en-CA')}`],
    [],
    ['Province', 'Code', 'Total Tax ($)', 'After-Tax ($)', 'Effective Rate (%)', 'Current Province'],
  ]

  PROVINCES.forEach(p => {
    const tax = approxTax(income, p.basic, p.rate)
    const eff = +(tax / income * 100).toFixed(1)
    rows.push([
      p.name, p.code,
      dollar(tax),
      dollar(income - tax),
      eff,
      p.code === shared.province ? '✓' : '',
    ])
  })

  const ws = makeSheet(rows)
  setColWidths(ws, [22, 8, 16, 16, 18, 16])
  return ws
}

function buildPropertySheet(propertyState) {
  if (!propertyState || propertyState._wizard) return null

  let analysis
  try {
    analysis = analyseProperty(propertyState)
  } catch { return null }

  const rows = [
    ['RETIREMENT LAB — Property Analysis'],
    [`Mode: ${propertyState.ownershipMode === 'owned' ? 'Existing ownership' : 'Purchase'}`],
    [],
    ['KEY METRICS', ''],
    ['Metric', 'Value'],
    ['CAP rate year 1 (%)', pct(analysis.capRateYear1)],
    ['Cash-on-Cash year 1 (%)', pct(analysis.cocReturnYear1)],
    ['NOI year 1 ($)', dollar(analysis.noiYear1)],
    ['Annual cash flow year 1 ($)', dollar(analysis.cashFlowYear1)],
    ['DSCR year 1', analysis.dscrYear1 != null ? +analysis.dscrYear1.toFixed(2) : null],
    [`IRR ${propertyState.holdingYears || 20} yr (%)`, pct(analysis.irr)],
    ['Equity year 5 ($)', dollar(analysis.equity5)],
    ['Annual depreciation ($)', dollar(analysis.annualDepreciation)],
    [],
    ['YEAR-BY-YEAR PROJECTION', ''],
    ['Year', 'Gross Income ($)', 'NOI ($)', 'Cash Flow ($)', 'Monthly CF ($)',
     'CAP Rate (%)', 'CoC Return (%)', 'DSCR', 'Property Value ($)', 'Mortgage Bal ($)',
     'Equity ($)', 'Sale Proceeds ($)'],
  ]

  analysis.years.forEach(y => {
    rows.push([
      y.year,
      dollar(y.grossScheduled),
      dollar(y.noi),
      dollar(y.annualCashFlow),
      dollar(y.monthlyCashFlow),
      pct(y.capRate),
      pct(y.cocReturn),
      y.dscr != null ? +y.dscr.toFixed(2) : null,
      dollar(y.propValue),
      dollar(y.mortBal),
      dollar(y.equity),
      dollar(y.saleProceeds),
    ])
  })

  const ws = makeSheet(rows)
  setColWidths(ws, [6, 16, 14, 14, 14, 12, 12, 8, 16, 16, 14, 16])
  return ws
}

function buildResidenceSheet(shared) {
  const rows = [
    ['RETIREMENT LAB — Residence Summary'],
    [],
  ]

  if (shared.primaryHomeEnabled) {
    const equity = Math.max(0, shared.primaryHomeValue - shared.primaryHomeMortgage)
    rows.push(
      ['PRIMARY RESIDENCE', ''],
      ['Field', 'Value'],
      ['Home market value ($)', dollar(shared.primaryHomeValue)],
      ['Mortgage remaining ($)', dollar(shared.primaryHomeMortgage)],
      ['Home equity ($)', dollar(equity)],
      ['Estate contribution ($)', dollar(equity)],
    )
    if (shared.reverseMortgageEnabled) {
      rows.push(
        ['Reverse mortgage monthly ($)', dollar(shared.reverseMortgageMonthly)],
        ['Reverse mortgage annual ($)', dollar(shared.reverseMortgageMonthly * 12)],
      )
    }
    rows.push([])
  }

  if (shared.homeEnabled) {
    const proceeds = Math.round(shared.homeValue * shared.homeKeepPct / 100)
    rows.push(
      ['HOME DOWNSIZE PLAN', ''],
      ['Field', 'Value'],
      ['Home value at sale ($)', dollar(shared.homeValue)],
      ['Proceeds to invest (%)', shared.homeKeepPct],
      ['Proceeds to invest ($)', dollar(proceeds)],
      ['Downsize at age', shared.homeDownsizeAge],
      ['Timing', shared.homeDownsizeAge <= 65 ? 'Before/at retirement' : 'During retirement'],
    )
  }

  if (!shared.primaryHomeEnabled && !shared.homeEnabled) {
    rows.push(['No residence options enabled.', ''])
  }

  const ws = makeSheet(rows)
  setColWidths(ws, [32, 20])
  return ws
}

// ─── Main hook ───────────────────────────────────────────────────────────────
export function useExcelExport() {
  const exportExcel = useCallback(({ sections, person, spouse, shared, results, propertyState }) => {
    const wb = XLSX.utils.book_new()
    wb.Props = {
      Title: 'Retirement Lab — Scenario Export',
      Author: 'Retirement Lab',
      CreatedDate: new Date(),
    }

    if (sections.inputs) {
      XLSX.utils.book_append_sheet(wb, buildInputsSheet(person, spouse, shared), 'Inputs')
    }
    if (sections.scenarios && results) {
      const ws = buildScenariosSheet(results)
      if (ws) XLSX.utils.book_append_sheet(wb, ws, 'Scenarios')
    }
    if (sections.fire && results) {
      const ws = buildFireSheet(results)
      if (ws) XLSX.utils.book_append_sheet(wb, ws, 'FIRE')
    }
    if (sections.tax) {
      XLSX.utils.book_append_sheet(wb, buildTaxSheet(shared), 'Tax Breakdown')
    }
    if (sections.property && propertyState && !propertyState._wizard) {
      const ws = buildPropertySheet(propertyState)
      if (ws) XLSX.utils.book_append_sheet(wb, ws, 'Property')
    }
    if (sections.residence) {
      XLSX.utils.book_append_sheet(wb, buildResidenceSheet(shared), 'Residence')
    }

    if (wb.SheetNames.length === 0) return

    const filename = `retirement-lab-${new Date().toISOString().slice(0, 10)}.xlsx`
    XLSX.writeFile(wb, filename)
  }, [])

  return { exportExcel }
}
