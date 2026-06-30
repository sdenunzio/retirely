import { useCallback } from 'react'
import jsPDF from 'jspdf'
import { analyseProperty } from '../lib/propertyEngine.js'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const NAVY  = [13, 27, 42]
const TEAL  = [29, 158, 117]
const TEAL2 = [15, 110, 86]
const GRAY  = [107, 105, 99]
const LGRAY = [239, 239, 237]
const WHITE = [255, 255, 255]
const BLACK = [40, 40, 40]

const fmt  = n => '$' + Math.round(n).toLocaleString('en-CA')
const fmtM = n => {
  if (n == null || !isFinite(n)) return '—'
  if (Math.abs(n) >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M'
  if (Math.abs(n) >= 1000)      return '$' + Math.round(n / 1000) + 'k'
  return '$' + Math.round(n)
}
const pct = (n, d = 1) => (n != null && isFinite(n)) ? (n * 100).toFixed(d) + '%' : '—'

// ─── PDF layout helpers ───────────────────────────────────────────────────────
function makeDoc() {
  return new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
}

const PAGE_W = 210, PAGE_H = 297
const MARGIN = 16, COL_W = PAGE_W - MARGIN * 2

function drawPageHeader(doc, title) {
  // Top bar
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, PAGE_W, 12, 'F')
  doc.setFillColor(...TEAL)
  doc.rect(0, 10, PAGE_W, 2, 'F')
  // Logo text
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...WHITE)
  doc.text('RETIREMENT LAB', MARGIN, 7.5)
  // Section title right-aligned
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(title, PAGE_W - MARGIN, 7.5, { align: 'right' })
  return 20 // y after header
}

function drawPageFooter(doc, pageNum, totalPages) {
  doc.setFillColor(...LGRAY)
  doc.rect(0, PAGE_H - 10, PAGE_W, 10, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  doc.text('Retirement Lab — Scenario explorer only. Not financial advice.', MARGIN, PAGE_H - 4)
  doc.text(`Page ${pageNum} of ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 4, { align: 'right' })
}

function sectionTitle(doc, text, y) {
  doc.setFillColor(...NAVY)
  doc.rect(MARGIN, y, COL_W, 6, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...WHITE)
  doc.text(text.toUpperCase(), MARGIN + 3, y + 4)
  return y + 9
}

function row(doc, label, value, y, shade) {
  if (shade) { doc.setFillColor(...LGRAY); doc.rect(MARGIN, y, COL_W, 6, 'F') }
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...GRAY)
  doc.text(label, MARGIN + 2, y + 4)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLACK)
  doc.text(String(value), MARGIN + COL_W - 2, y + 4, { align: 'right' })
  return y + 6
}

function twoCol(doc, pairs, y) {
  const hw = (COL_W - 4) / 2
  pairs.forEach(([l, v], i) => {
    const shade = i % 2 === 0
    const cx = MARGIN + (i % 2) * (hw + 4)
    if (i % 2 === 0 && shade) {
      doc.setFillColor(...LGRAY)
      doc.rect(MARGIN, y + Math.floor(i / 2) * 6, COL_W, 6, 'F')
    }
    const rowY = y + Math.floor(i / 2) * 6
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GRAY)
    doc.text(String(l), cx + 1, rowY + 4)
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
    doc.text(String(v), cx + hw - 1, rowY + 4, { align: 'right' })
  })
  return y + Math.ceil(pairs.length / 2) * 6 + 2
}

function checkPage(doc, y, needed = 20) {
  if (y + needed > PAGE_H - 14) {
    doc.addPage()
    return { y: 20, newPage: true }
  }
  return { y, newPage: false }
}

// ─── Section builders ─────────────────────────────────────────────────────────
function buildCover(doc, person, spouse, shared, generatedAt) {
  // Full-page navy cover
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F')
  doc.setFillColor(...TEAL)
  doc.rect(0, PAGE_H - 8, PAGE_W, 8, 'F')

  // Logo area
  doc.setFillColor(...TEAL)
  doc.roundedRect(MARGIN, 30, 40, 40, 4, 4, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(...WHITE)
  doc.text('RL', MARGIN + 14, 55)

  // Title
  doc.setFontSize(26); doc.setFont('helvetica', 'bold'); doc.setTextColor(...WHITE)
  doc.text('Retirement Lab', MARGIN + 48, 50)
  doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(...TEAL)
  doc.text('Scenario Explorer Report', MARGIN + 48, 59)

  // Divider
  doc.setFillColor(...TEAL2); doc.rect(MARGIN, 78, COL_W, 0.5, 'F')

  // Person info
  doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(180, 200, 220)
  doc.text('Prepared for', MARGIN, 90)
  doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(...WHITE)
  doc.text(shared.coupleMode ? 'Household scenario' : 'Personal scenario', MARGIN, 101)

  const details = [
    ['Current age', `${person.currentAge}${shared.coupleMode ? ` / ${spouse.currentAge}` : ''}`],
    ['Target retirement', `Age ${person.retirementAge}`],
    ['Province', shared.province],
    ['Annual spending', fmt(shared.annualSpending)],
    ['Total assets today', fmtM(person.rrsp + person.tfsa + person.nonReg + (shared.coupleMode ? spouse.rrsp + spouse.tfsa + spouse.nonReg : 0))],
  ]

  let dy = 112
  details.forEach(([l, v]) => {
    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(150, 180, 200)
    doc.text(l, MARGIN, dy)
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...WHITE)
    doc.text(v, MARGIN + 50, dy)
    dy += 8
  })

  // Generated at
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 130, 160)
  doc.text(`Generated: ${generatedAt}`, MARGIN, PAGE_H - 16)
  doc.setTextColor(80, 110, 140)
  doc.text('Not financial advice. For scenario planning only.', MARGIN, PAGE_H - 10)
}

function buildInputSummary(doc, person, spouse, shared) {
  let y = drawPageHeader(doc, 'Input Summary')
  y = sectionTitle(doc, 'Person 1 — Profile & Assets', y)

  const p1rows = [
    ['Current age', person.currentAge],
    ['Retirement age', person.retirementAge],
    ['Life expectancy', person.lifeExpectancy],
    ['Annual income', fmt(person.annualIncome || 0)],
    ['RRSP', fmt(person.rrsp)],
    ['TFSA', fmt(person.tfsa)],
    ['Non-registered', fmt(person.nonReg)],
    ['Monthly contribution', fmt(person.monthlyContrib)],
    ['CPP at 65', fmt(person.cppMonthly65) + '/mo'],
    ['OAS start age', person.oasStartAge],
  ]
  p1rows.forEach(([l, v], i) => { y = row(doc, l, v, y, i % 2 === 0) })
  y += 3

  if (shared.coupleMode) {
    ;({ y } = checkPage(doc, y, 70))
    y = sectionTitle(doc, 'Person 2 — Profile & Assets', y)
    const p2rows = [
      ['Current age', spouse.currentAge], ['Retirement age', spouse.retirementAge],
      ['Life expectancy', spouse.lifeExpectancy], ['Annual income', fmt(spouse.annualIncome || 0)],
      ['RRSP', fmt(spouse.rrsp)], ['TFSA', fmt(spouse.tfsa)],
      ['Non-registered', fmt(spouse.nonReg)], ['Monthly contribution', fmt(spouse.monthlyContrib)],
      ['CPP at 65', fmt(spouse.cppMonthly65) + '/mo'], ['OAS start age', spouse.oasStartAge],
    ]
    p2rows.forEach(([l, v], i) => { y = row(doc, l, v, y, i % 2 === 0) })
    y += 3
  }

  ;({ y } = checkPage(doc, y, 60))
  y = sectionTitle(doc, 'Assumptions & Settings', y)
  const settings = [
    ['Province', shared.province],
    ['Pre-retirement return', pct(shared.preReturnRate / 100)],
    ['Retirement return', pct(shared.postReturnRate / 100)],
    ['Inflation rate', pct(shared.inflationRate / 100)],
    ['Annual spending target', fmt(shared.annualSpending)],
    ['Couple mode', shared.coupleMode ? 'Yes' : 'No'],
    ['Windfall', shared.windfall > 0 ? `${fmt(shared.windfall)} at age ${shared.windfallAge}` : 'None'],
  ]
  settings.forEach(([l, v], i) => { y = row(doc, l, v, y, i % 2 === 0) })
  return y
}

function buildScenarios(doc, results) {
  if (!results?.scenarios) return
  let y = drawPageHeader(doc, 'Scenario Comparison')
  y = sectionTitle(doc, 'Four Retirement Strategies', y)

  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GRAY)
  doc.text('Four withdrawal strategies are compared using the same asset base and assumptions.', MARGIN, y + 4)
  y += 10

  results.scenarios.forEach((s, idx) => {
    ;({ y } = checkPage(doc, y, 55))
    const r = s.result

    // Scenario header bar
    doc.setFillColor(245, 248, 252)
    doc.rect(MARGIN, y, COL_W, 7, 'F')
    doc.setFillColor(TEAL[0], TEAL[1], TEAL[2])
    doc.rect(MARGIN, y, 3, 7, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...BLACK)
    doc.text(s.label, MARGIN + 6, y + 5)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...GRAY)
    doc.text(s.description, PAGE_W - MARGIN - 2, y + 5, { align: 'right' })
    y += 9

    const pairs = [
      ['Start pool', fmtM(r.projAtRet)],
      ['First yr income', fmt(r.firstYearIncome)],
      ['Assets @ 70', r.age70Assets != null ? fmtM(r.age70Assets) : '—'],
      ['Assets @ 85', r.age85Assets != null ? fmtM(r.age85Assets) : '—'],
      ['Est. tax paid', fmtM(r.totalTax)],
      ['Estate value', fmtM(r.estateValue)],
      ['Longevity', r.depletedAge ? `Depleted at ${r.depletedAge}` : `Survives to plan end`],
      ['Split saving', r.incomeSplitSaving > 500 ? fmtM(r.incomeSplitSaving) : 'N/A'],
    ]
    y = twoCol(doc, pairs, y)
    y += 4
  })
}

function buildFire(doc, results) {
  if (!results?.fire) return
  let y = drawPageHeader(doc, 'FIRE Analysis')
  y = sectionTitle(doc, 'Financial Independence, Retire Early', y)
  const f = results.fire
  const rows = [
    ['FIRE number', fmtM(f.fireNumber)],
    ['Lean FIRE number', fmtM(f.leanFireNumber)],
    ['Progress toward FIRE', f.progress + '%'],
    ['FIRE target age', f.fireAge ? f.fireAge.toFixed(1) : '—'],
    ['Coast FIRE age', f.coastAge ? f.coastAge.toFixed(1) : '—'],
    ['Government income at FIRE', fmt(f.govAtFire)],
    ['Annual contributions', fmt(f.annualContrib)],
  ]
  rows.forEach(([l, v], i) => { y = row(doc, l, v, y, i % 2 === 0) })
  y += 6
  doc.setFont('helvetica', 'italic'); doc.setFontSize(7.5); doc.setTextColor(...GRAY)
  const note = 'FIRE number = target spending ÷ safe withdrawal rate. Lean FIRE offsets government income (CPP/OAS). The 4% rule assumes a ~30-year retirement horizon; use 3-3.5% for 40-50 years.'
  const lines = doc.splitTextToSize(note, COL_W)
  doc.text(lines, MARGIN, y)
}

function buildTaxBreakdown(doc, shared) {
  let y = drawPageHeader(doc, 'Provincial Tax Breakdown')
  y = sectionTitle(doc, `Tax comparison — ${fmt(shared.annualSpending)} reference income`, y)

  const PROVINCES = ['ON','BC','AB','QC','SK','MB','NS','NB']
  const approxTaxSimple = (income, code) => {
    const rates = { ON:0.0905, BC:0.0506, AB:0.10, QC:0.14, SK:0.105, MB:0.108, NS:0.0879, NB:0.094 }
    const basics = { ON:11865, BC:11981, AB:21003, QC:17183, SK:17661, MB:15780, NS:8481, NB:12458 }
    const FED_BASIC = 15705
    let fed = 0, rem = Math.max(0, income - FED_BASIC)
    const brackets = [[57375,0.15],[57375,0.205],[63895,0.26],[70645,0.29],[Infinity,0.33]]
    for (const [cap,rate] of brackets) { const t=Math.min(rem,cap); fed+=t*rate; rem-=t; if(rem<=0) break }
    const prov = Math.max(0, income - (basics[code]||11865)) * (rates[code]||0.0905)
    return fed + prov
  }
  const income = shared.annualSpending

  // Table header
  doc.setFillColor(...NAVY)
  doc.rect(MARGIN, y, COL_W, 6, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...WHITE)
  const cols = [0, 22, 50, 78, 105]
  const headers = ['Province', 'Total Tax', 'After-Tax', 'Eff. Rate', 'Marginal']
  headers.forEach((h, i) => doc.text(h, MARGIN + cols[i] + 1, y + 4))
  y += 6

  PROVINCES.forEach((code, i) => {
    const tax = approxTaxSimple(income, code)
    const eff = tax / income * 100
    const marg = (approxTaxSimple(income + 1000, code) - tax) / 10
    const isCurrent = code === shared.province
    if (isCurrent) { doc.setFillColor(225, 245, 235) } else { doc.setFillColor(i%2===0 ? 250:245, i%2===0 ? 250:245, i%2===0 ? 249:248) }
    doc.rect(MARGIN, y, COL_W, 6, 'F')
    doc.setFont('helvetica', isCurrent ? 'bold' : 'normal')
    doc.setFontSize(8); doc.setTextColor(...BLACK)
    const vals = [code, fmt(tax), fmt(income - tax), eff.toFixed(1) + '%', marg.toFixed(1) + '%']
    vals.forEach((v, j) => doc.text(v, MARGIN + cols[j] + 1, y + 4))
    y += 6
  })
}

function buildPropertySummary(doc, propertyState) {
  if (!propertyState || propertyState._wizard) return
  let y = drawPageHeader(doc, 'Property Summary')

  let analysis
  try { analysis = analyseProperty(propertyState) } catch { return }

  y = sectionTitle(doc, `Commercial Property — ${propertyState.ownershipMode === 'owned' ? 'Existing Ownership' : 'Purchase Analysis'}`, y)

  const keyMetrics = [
    ['CAP rate (year 1)', pct(analysis.capRateYear1)],
    ['Cash-on-Cash (year 1)', pct(analysis.cocReturnYear1)],
    ['NOI (year 1)', fmt(analysis.noiYear1)],
    ['Annual cash flow (year 1)', fmt(analysis.cashFlowYear1)],
    ['DSCR (year 1)', analysis.dscrYear1 != null ? analysis.dscrYear1.toFixed(2) + 'x' : '—'],
    [`IRR (${propertyState.holdingYears || 20} yr)`, pct(analysis.irr)],
    ['Equity (year 5)', fmtM(analysis.equity5)],
    ['Annual depreciation', fmt(analysis.annualDepreciation)],
  ]
  keyMetrics.forEach(([l, v], i) => { y = row(doc, l, v, y, i % 2 === 0) })
  y += 4

  ;({ y } = checkPage(doc, y, 40))
  y = sectionTitle(doc, 'Financing', y)
  const fin = propertyState.ownershipMode === 'owned'
    ? [
        ['Market value', fmt(propertyState.currentMarketValue)],
        ['Mortgage balance', fmt(propertyState.existingMortgageBal)],
        ['Equity', fmt(Math.max(0, propertyState.currentMarketValue - propertyState.existingMortgageBal))],
        ['Mortgage rate', pct(propertyState.existingMortgageRate)],
        ['Remaining amortization', propertyState.existingMortgageTerm + ' yrs'],
      ]
    : [
        ['Purchase price', fmt(propertyState.purchasePrice)],
        ['Down payment', pct(propertyState.downPaymentPct) + ' (' + fmt(propertyState.purchasePrice * propertyState.downPaymentPct) + ')'],
        ['Loan amount', fmt(analysis.loanAmount)],
        ['Mortgage rate', pct(propertyState.mortgageRate)],
        ['Amortization', (propertyState.mortgageTerm || 20) + ' yrs'],
        ['Monthly payment', fmt(analysis.annualMortgage / 12)],
      ]
  fin.forEach(([l, v], i) => { y = row(doc, l, v, y, i % 2 === 0) })

  // Year-by-year table (first 10 years)
  ;({ y } = checkPage(doc, y, 60))
  y = sectionTitle(doc, 'Year-by-Year (first 10 years)', y)
  doc.setFillColor(...NAVY)
  doc.rect(MARGIN, y, COL_W, 6, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...WHITE)
  const th = ['Yr', 'NOI', 'Cash Flow', 'CAP Rate', 'Property Value', 'Equity', 'Sale Proceeds']
  const tc = [0, 8, 28, 48, 63, 86, 110]
  th.forEach((h, i) => doc.text(h, MARGIN + tc[i] + 1, y + 4))
  y += 6

  analysis.years.slice(0, 10).forEach((yr, i) => {
    if (i % 2 === 0) { doc.setFillColor(...LGRAY); doc.rect(MARGIN, y, COL_W, 5.5, 'F') }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...BLACK)
    const vals = [yr.year, fmtM(yr.noi), fmtM(yr.annualCashFlow), pct(yr.capRate), fmtM(yr.propValue), fmtM(yr.equity), fmtM(yr.saleProceeds)]
    vals.forEach((v, j) => doc.text(String(v), MARGIN + tc[j] + 1, y + 4))
    y += 5.5
  })
}

function buildResidenceSummary(doc, shared) {
  let y = drawPageHeader(doc, 'Residence Summary')
  y = sectionTitle(doc, 'Residence & Real Estate', y)

  if (shared.primaryHomeEnabled) {
    const equity = Math.max(0, shared.primaryHomeValue - shared.primaryHomeMortgage)
    const entries = [
      ['Home market value', fmt(shared.primaryHomeValue)],
      ['Mortgage remaining', fmt(shared.primaryHomeMortgage)],
      ['Home equity', fmt(equity)],
      ['Estate contribution', fmt(equity)],
    ]
    if (shared.reverseMortgageEnabled) {
      entries.push(['Reverse mortgage (monthly)', fmt(shared.reverseMortgageMonthly)])
      entries.push(['Reverse mortgage (annual)', fmt(shared.reverseMortgageMonthly * 12)])
    }
    entries.forEach(([l, v], i) => { y = row(doc, l, v, y, i % 2 === 0) })
    y += 4
  }

  if (shared.homeEnabled) {
    ;({ y } = checkPage(doc, y, 40))
    y = sectionTitle(doc, 'Home Downsize Plan', y)
    const proceeds = Math.round(shared.homeValue * shared.homeKeepPct / 100)
    const entries = [
      ['Home value at sale', fmt(shared.homeValue)],
      ['Proceeds to invest', pct(shared.homeKeepPct / 100) + ' = ' + fmt(proceeds)],
      ['Downsize at age', shared.homeDownsizeAge],
      ['Timing', shared.homeDownsizeAge <= 65 ? 'Before/at retirement' : 'During retirement'],
    ]
    entries.forEach(([l, v], i) => { y = row(doc, l, v, y, i % 2 === 0) })
  }

  if (!shared.primaryHomeEnabled && !shared.homeEnabled) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...GRAY)
    doc.text('No residence options are currently enabled.', MARGIN, y + 8)
  }
}

// ─── Main export hook ─────────────────────────────────────────────────────────
export function usePdfExport() {
  const exportPdf = useCallback(async ({ sections, person, spouse, shared, results, propertyState }) => {
    const doc = makeDoc()
    const now = new Date().toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })

    // Cover page (always)
    buildCover(doc, person, spouse, shared, now)

    const pageTracker = { current: 1 }
    const addSection = (builder, ...args) => {
      doc.addPage()
      pageTracker.current++
      builder(doc, ...args)
    }

    if (sections.inputs)     addSection(buildInputSummary, person, spouse, shared)
    if (sections.scenarios && results)  addSection(buildScenarios, results)
    if (sections.fire && results)       addSection(buildFire, results)
    if (sections.tax)        addSection(buildTaxBreakdown, shared)
    if (sections.property && propertyState && !propertyState._wizard) addSection(buildPropertySummary, propertyState)
    if (sections.residence)  addSection(buildResidenceSummary, shared)

    // Add footers to all pages
    const total = doc.getNumberOfPages()
    for (let p = 1; p <= total; p++) {
      doc.setPage(p)
      if (p > 1) drawPageFooter(doc, p, total)
    }

    const filename = `retirement-lab-${new Date().toISOString().slice(0, 10)}.pdf`
    doc.save(filename)
  }, [])

  return { exportPdf }
}
