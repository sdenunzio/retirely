// ─── Provincial tax data (2024) ──────────────────────────────────────────────
export const PROVINCE_TAX = {
  ON: { name: 'Ontario',                  basic: 11865, brackets: [[51446,0.0505],[51446,0.0915],[75286,0.1116],[70000,0.1216],[Infinity,0.1316]], surtax: true },
  BC: { name: 'British Columbia',         basic: 11981, brackets: [[45654,0.0506],[45655,0.077],[13525,0.105],[22464,0.1229],[41860,0.147],[62937,0.168],[Infinity,0.205]] },
  AB: { name: 'Alberta',                  basic: 21003, brackets: [[148269,0.10],[12173,0.12],[24844,0.13],[49689,0.14],[Infinity,0.15]] },
  QC: { name: 'Québec',                   basic: 17183, brackets: [[51780,0.14],[51780,0.19],[20260,0.24],[Infinity,0.2575]] },
  SK: { name: 'Saskatchewan',             basic: 17661, brackets: [[49720,0.105],[92338,0.125],[Infinity,0.145]] },
  MB: { name: 'Manitoba',                 basic: 15780, brackets: [[36842,0.108],[63158,0.1275],[Infinity,0.174]] },
  NS: { name: 'Nova Scotia',              basic: 8481,  brackets: [[29590,0.0879],[29590,0.1495],[33820,0.1667],[57000,0.175],[Infinity,0.21]] },
  NB: { name: 'New Brunswick',            basic: 12458, brackets: [[47715,0.094],[47716,0.14],[81325,0.16],[Infinity,0.195]] },
  PE: { name: 'Prince Edward Island',     basic: 12000, brackets: [[32656,0.0965],[31657,0.1363],[40687,0.166],[35000,0.18],[Infinity,0.187]] },
  NL: { name: 'Newfoundland & Labrador',  basic: 10818, brackets: [[43198,0.087],[43197,0.145],[67849,0.158],[61699,0.178],[59927,0.198],[Infinity,0.208]] },
}
export const PROVINCES_LIST = Object.entries(PROVINCE_TAX).map(([c,p]) => [c, p.name])

// ─── Federal tax ─────────────────────────────────────────────────────────────
const FED_BASIC = 15705
const FED_BRACKETS = [[57375,0.15],[57375,0.205],[63895,0.26],[70645,0.29],[Infinity,0.33]]
const OAS_CLAWBACK_THRESHOLD = 90997   // 2024 net income threshold
const OAS_CLAWBACK_RATE = 0.15

function fedTax(income) {
  let tax = 0, rem = Math.max(0, income - FED_BASIC)
  for (const [cap, rate] of FED_BRACKETS) { const t = Math.min(rem, cap); tax += t * rate; rem -= t; if (rem <= 0) break }
  return tax
}

function provTax(income, code) {
  const prov = PROVINCE_TAX[code] || PROVINCE_TAX.ON
  let tax = 0, rem = Math.max(0, income - prov.basic)
  for (const [cap, rate] of prov.brackets) { const t = Math.min(rem, cap); tax += t * rate; rem -= t; if (rem <= 0) break }
  if (code === 'ON' && tax > 4991) { tax += Math.max(0, tax - 4991) * 0.20; if (tax > 6387) tax += Math.max(0, tax - 6387) * 0.36 }
  return tax
}

export function approxTax(income, code = 'ON') {
  if (income <= 0) return 0
  return fedTax(income) + provTax(income, code)
}

export function marginalRate(income, code = 'ON') {
  const step = 1000
  return (approxTax(income + step, code) - approxTax(income, code)) / step * 100
}

export function effectiveRate(income, code = 'ON') {
  if (income <= 0) return 0
  return approxTax(income, code) / income * 100
}

// OAS clawback: 15¢ per dollar of net income above threshold, up to full OAS
export function oasClawback(netIncome, oasAnnual) {
  if (netIncome <= OAS_CLAWBACK_THRESHOLD) return 0
  return Math.min(oasAnnual, (netIncome - OAS_CLAWBACK_THRESHOLD) * OAS_CLAWBACK_RATE)
}

// ─── Provincial retirement supplements (2025 rates) ──────────────────────────
// All amounts are annual, income-tested. Must receive OAS/GIS to qualify (except MB 55+).

export const PROV_SUPPLEMENTS = {
  ON: {
    name: 'Ontario GAINS',
    maxSingle: 90 * 12,        // $90/mo = $1,080/yr (July 2025–June 2026)
    maxCouple: 180 * 12,       // $180/mo = $2,160/yr
    privateIncomeThresholdSingle: 4320,  // zero benefit above this
    privateIncomeThresholdCouple: 8640,
    note: 'Guaranteed Annual Income System — on top of OAS/GIS, auto-enrolled',
  },
  BC: {
    name: "BC Senior's Supplement",
    maxSingle: 99.30 * 12,     // $99.30/mo = $1,191.60/yr (2024)
    maxCouple: 110.25 * 12,    // $110.25/mo = $1,323/yr
    privateIncomeThresholdSingle: 2280,
    privateIncomeThresholdCouple: 3480,
    note: 'Automatic for GIS recipients in BC. Paid monthly ~29th.',
  },
  AB: {
    name: 'Alberta Seniors Benefit',
    maxSingle: 3868,           // 2025 annual max for single homeowner/renter
    maxCouple: 5801,           // 2025 annual max for couple
    incomeThresholdSingle: 34770,  // income threshold (includes OAS)
    incomeThresholdCouple: 56820,
    phaseOutRate: 0.1561,      // benefit reduces ~$0.16 per $1 of income
    note: 'Income-tested. Requires OAS eligibility. Apply via Seniors Financial Assistance.',
  },
  MB: {
    name: 'Manitoba 55 PLUS',
    maxSingle: 161.80 * 4,     // $161.80/quarter = $647.20/yr
    maxCouple: 173.90 * 4,     // $173.90/quarter/person = $695.60/yr per person
    seniorIncomeThresholdSingle: 12000,  // approximate GIS-linked threshold
    seniorIncomeThresholdCouple: 18000,
    startAge: 55,              // starts at 55, not 65
    note: 'Quarterly payments. Auto-enrolled if receiving GIS/OAS.',
  },
  QC: {
    name: 'Quebec Senior Assistance Tax Credit',
    amount: 2000,              // $2,000 for single, $4,000 for couple at 70+
    amountCouple: 4000,
    startAge: 70,
    note: 'Refundable tax credit at 70+. Reduces with income above ~$26,000.',
  },
  // Note: NS, NB, PE, NL have modest programs but amounts are small and vary;
  // modelled as informational only in TaxBreakdown, not in simulation
}

/**
 * Calculate annual provincial supplement benefit.
 * privateIncome = total income excluding OAS and GIS (CPP + RRSP withdrawals + nr)
 * Returns annual benefit amount (0 if ineligible)
 */
export function calcProvSupplement(province, age, privateIncome, isCouple, receivingGIS) {
  if (age < 65) return 0  // most require 65+
  const supp = PROV_SUPPLEMENTS[province]
  if (!supp) return 0

  // Most provincial supplements require GIS receipt
  if (province !== 'MB' && !receivingGIS) return 0
  if (province === 'MB' && age < 55) return 0

  switch (province) {
    case 'ON': {
      const max       = isCouple ? supp.maxCouple : supp.maxSingle
      const threshold = isCouple ? supp.privateIncomeThresholdCouple : supp.privateIncomeThresholdSingle
      if (privateIncome >= threshold) return 0
      // Linear taper from max to 0 as private income goes from 0 to threshold
      return Math.max(0, max * (1 - privateIncome / threshold))
    }
    case 'BC': {
      const max       = isCouple ? supp.maxCouple : supp.maxSingle
      const threshold = isCouple ? supp.privateIncomeThresholdCouple : supp.privateIncomeThresholdSingle
      if (privateIncome >= threshold) return 0
      return Math.max(0, max * (1 - privateIncome / threshold))
    }
    case 'AB': {
      // Alberta: income-tested, not strictly GIS-linked
      // Non-deductible income = total income less OAS — approximated as privateIncome
      const max       = isCouple ? supp.maxCouple : supp.maxSingle
      const threshold = isCouple ? supp.incomeThresholdCouple : supp.incomeThresholdSingle
      if (privateIncome >= threshold) return 0
      return Math.max(0, max - privateIncome * supp.phaseOutRate)
    }
    case 'MB': {
      if (age < supp.startAge) return 0
      // Senior component: GIS-linked; junior component: income-based
      // For simplicity model as GIS-linked above 65
      if (!receivingGIS && privateIncome > (isCouple ? supp.seniorIncomeThresholdCouple : supp.seniorIncomeThresholdSingle)) return 0
      return isCouple ? supp.maxCouple : supp.maxSingle
    }
    case 'QC': {
      if (age < supp.startAge) return 0
      // Refundable tax credit — reduces with income above ~$26k, ignoring taper for simplicity
      // For low-income retirees this will often be full amount
      const creditAmount = isCouple ? supp.amountCouple : supp.amount
      if (privateIncome > 52000) return 0   // rough income limit
      if (privateIncome > 26000) return Math.max(0, creditAmount * (1 - (privateIncome - 26000) / 26000))
      return creditAmount
    }
    default: return 0
  }
}

// ─── RRIF minimum withdrawal rates (CRA 2024) ────────────────────────────────
const RRIF_MIN_RATES = {
  71:0.0528, 72:0.0540, 73:0.0553, 74:0.0567, 75:0.0582,
  76:0.0598, 77:0.0617, 78:0.0636, 79:0.0658, 80:0.0682,
  81:0.0708, 82:0.0738, 83:0.0771, 84:0.0808, 85:0.0851,
  86:0.0899, 87:0.0955, 88:0.1021, 89:0.1099, 90:0.1192,
  91:0.1306, 92:0.1449, 93:0.1634, 94:0.1879, 95:0.2000,
}

export function rrifMinimum(balance, age) {
  if (age < 71) return 0
  const rate = RRIF_MIN_RATES[Math.min(age, 95)] || 0.20
  return balance * rate
}


// ─── LIF maximum withdrawal rates (CRA — federal schedule) ──────────────────
// LIF has both a minimum (same as RRIF) and a maximum each year.
// Max = (annual investment return / (1 - (1+r)^-(n))) where n = years to 90.
// CRA publishes a simplified factor table; we use an approximation based on
// the prescribed rate. These are the approximate max rates at common ages:
const LIF_MAX_RATES = {
  55:0.0640, 56:0.0650, 57:0.0663, 58:0.0677, 59:0.0692, 60:0.0708,
  61:0.0726, 62:0.0746, 63:0.0768, 64:0.0793, 65:0.0821, 66:0.0851,
  67:0.0885, 68:0.0923, 69:0.0966, 70:0.1015, 71:0.1071, 72:0.1134,
  73:0.1206, 74:0.1289, 75:0.1385, 76:0.1497, 77:0.1629, 78:0.1784,
  79:0.1968, 80:0.2188, 81:0.2452, 82:0.2768, 83:0.3154, 84:0.3621,
  85:0.4000, 86:0.4000, 87:0.4000, 88:0.4000, 89:0.4000, 90:1.0000,
}

export function lifMaximum(balance, age) {
  if (age < 55) return 0
  const rate = LIF_MAX_RATES[Math.min(age, 90)] || 1.0
  return balance * rate
}

// ─── Pre-retirement accumulation ─────────────────────────────────────────────
export function growToRetirement({ rrsp, tfsa, nr, monthly, years, annualRate }) {
  const mr = annualRate / 100 / 12
  let r = rrsp, t = tfsa, n = nr
  for (let m = 0; m < years * 12; m++) {
    r *= (1 + mr); t *= (1 + mr); n *= (1 + mr)
    const tot = r + t + n
    // When all balances are zero, distribute contributions equally across all three
    const w = tot > 0 ? [r/tot, t/tot, n/tot] : [1/3, 1/3, 1/3]
    r += monthly * w[0]; t += monthly * w[1]; n += monthly * w[2]
  }
  return { rrsp: r, tfsa: t, nr: n }
}

// Returns year-by-year accumulation snapshots — used for the accumulation chart/table
export function growToRetirementYearly({ rrsp, tfsa, nr, lif = 0, monthly, years, annualRate }) {
  const mr = annualRate / 100 / 12
  let r = rrsp, t = tfsa, n = nr, l = lif
  const snapshots = []
  for (let yr = 0; yr < years; yr++) {
    for (let m = 0; m < 12; m++) {
      r *= (1 + mr); t *= (1 + mr); n *= (1 + mr); l *= (1 + mr)
      const tot = r + t + n
      // When all balances are zero, distribute contributions equally
      const w = tot > 0 ? [r/tot, t/tot, n/tot] : [1/3, 1/3, 1/3]
      r += monthly * w[0]; t += monthly * w[1]; n += monthly * w[2]
    }
    const totalContribSoFar = (rrsp + tfsa + nr + lif) + monthly * 12 * (yr + 1)
    snapshots.push({
      year: yr + 1,
      rrsp: Math.round(r), tfsa: Math.round(t), nr: Math.round(n), lif: Math.round(l),
      total: Math.round(r + t + n + l),
      contributed: Math.round(totalContribSoFar),
      growth: Math.round(r + t + n + l - totalContribSoFar),
    })
  }
  return snapshots
}

// ─── CPP / OAS adjustments ───────────────────────────────────────────────────
export function cppAdjustment(age) {
  if (age < 65) return Math.max(0.4, 1 - 0.072 * (65 - age))
  if (age > 65) return 1 + 0.084 * (age - 65)
  return 1
}
export function oasAdjustment(age) {
  if (age <= 65) return 1
  return 1 + 0.072 * (age - 65)
}
const OAS_ANNUAL_65 = 8618

// ─── Pension income splitting optimiser ──────────────────────────────────────
function calcSplitTax(p1Tax, p2Tax, p1Elig, p2Elig, province) {
  let best = Infinity
  for (let s1 = 0; s1 <= 50; s1 += 5) {
    for (let s2 = 0; s2 <= 50; s2 += 5) {
      const t1 = p1Tax - p1Elig * (s1/100) + p2Elig * (s2/100)
      const t2 = p2Tax - p2Elig * (s2/100) + p1Elig * (s1/100)
      if (t1 < 0 || t2 < 0) continue
      const tax = approxTax(t1, province) + approxTax(t2, province)
      if (tax < best) best = tax
    }
  }
  return best
}


// ─── Income equalisation solver ──────────────────────────────────────────────
// Given two people's taxable base income (guaranteed only, no withdrawals yet)
// and a total withdrawal needed from their combined accounts,
// find the withdrawal split that minimises combined household tax.
// Returns { draw1, draw2 } — how much each person should withdraw.
function solveEqualisation(
  p1Base,    // P1 existing taxable income (CPP, DB, other taxable guaranteed)
  p2Base,    // P2 existing taxable income
  p1RrifMin, // P1 mandatory RRIF min already withdrawn
  p2RrifMin, // P2 mandatory RRIF min already withdrawn
  totalNeeded, // additional withdrawal needed on top of RRIF mins
  p1MaxDraw, // max P1 can draw (total account balances)
  p2MaxDraw, // max P2 can draw
  province
) {
  // Already covered by RRIF mins
  const already1 = p1RrifMin
  const already2 = p2RrifMin
  let remaining = Math.max(0, totalNeeded - already1 - already2)

  if (remaining <= 0) return { draw1: already1, draw2: already2 }

  // Binary search: find draw1 that minimises combined tax
  // draw2 = remaining - draw1 (capped by p2MaxDraw)
  const maxDraw1 = Math.min(p1MaxDraw - already1, remaining)
  const maxDraw2 = Math.min(p2MaxDraw - already2, remaining)

  let bestTax = Infinity
  let bestDraw1 = 0

  // 200 steps for reasonable precision
  const steps = 200
  for (let i = 0; i <= steps; i++) {
    const d1 = (maxDraw1 * i) / steps
    const d2 = Math.min(maxDraw2, remaining - d1)
    if (d1 + d2 < remaining - 1) continue  // can't cover gap

    const inc1 = p1Base + already1 + d1
    const inc2 = p2Base + already2 + d2
    const tax = approxTax(inc1, province) + approxTax(inc2, province)
    if (tax < bestTax) { bestTax = tax; bestDraw1 = d1 }
  }

  return {
    draw1: already1 + bestDraw1,
    draw2: already2 + Math.min(maxDraw2, remaining - bestDraw1),
  }
}
// ─── Single-person year-by-year simulation ───────────────────────────────────
function simulatePerson(pp, strategy, shared, returnOverrides = null) {
  const { startRRSP, startTFSA, startNR, startLIF = 0, startSpousalRrsp = 0,
          retAge, lifeExp, cppMonthly65, oasBaseAge, windfall, windfallAge,
          homeProceeds = 0, homeAge = 0, reverseMortgageAnnual = 0,
          propSellWindfall = 0, propSellAge = 0, propCashflowByYear = {}, propCurrentAge = 0,
          homeRentExtra = 0, homeRentStartAge = 0,
          dbPensionEnabled = false, dbPensionMonthly = 0, dbPensionIndexed = 'none', dbPensionBridge = 0,
          otherIncomeMonthly = 0, otherIncomeTaxable = true,
          rrspMeltdownAnnual = 0 } = pp
  const { spending, inflation, postReturnRate, province } = shared
  const isCouple = !!returnOverrides?.isCouple  // passed from runScenario for couple mode
  const { cppStartAge = 65, oasStartAge = oasBaseAge, withdrawOrder = ['nr','rrsp','tfsa'], gis = false } = strategy

  const baseReturn = postReturnRate / 100
  const cppFactor = cppAdjustment(cppStartAge)
  const oasFactor = oasAdjustment(oasStartAge)
  let rrsp = startRRSP + startSpousalRrsp, tfsa = startTFSA, nr = startNR
  let lif  = startLIF   // Locked-in Fund — separate from RRSP, has min AND max withdrawal
  const years = lifeExp - retAge
  const data = []

  // If windfall age is at or before retirement, add it to starting non-reg immediately
  if (windfall > 0 && windfallAge <= retAge) nr += windfall
  // Same for home downsize proceeds
  if (homeProceeds > 0 && homeAge > 0 && homeAge <= retAge) nr += homeProceeds
  // Property sell proceeds before retirement
  if (propSellWindfall > 0 && propSellAge > 0 && propSellAge <= retAge) nr += propSellWindfall

  for (let yr = 0; yr < years; yr++) {
    const age = retAge + yr
    // Use override return for this year (Monte Carlo) or base rate
    const annualReturn = returnOverrides ? returnOverrides[yr] : baseReturn
    const inflFactor = Math.pow(1 + inflation / 100, yr)
    const adjSpend = spending * inflFactor

    // Government income
    const cppAnn = age >= cppStartAge ? cppMonthly65 * 12 * cppFactor : 0
    // CPP is indexed to CPI — approximate with inflation
    const cppIndexed = cppAnn * Math.pow(1 + inflation / 100, Math.max(0, age - cppStartAge))
    const oasBase  = age >= oasStartAge ? OAS_ANNUAL_65 * oasFactor : 0
    const oasGross = oasBase > 0 && age >= 75 ? oasBase * 1.10 : oasBase  // 10% boost at 75 (July 2022)
    // Reverse mortgage income — added to non-reg equivalent (tax-free drawdown of home equity)
    const revMortIncome = reverseMortgageAnnual > 0 ? reverseMortgageAnnual : 0
    // DB pension — taxable, indexed, bridge drops at 65
    const dbAnnual = (() => {
      if (!dbPensionEnabled || dbPensionMonthly <= 0) return 0
      const yearsInRet = Math.max(0, age - retAge)
      const inflFactor = dbPensionIndexed === 'full' ? Math.pow(1 + inflation / 100, yearsInRet)
                       : dbPensionIndexed === 'half' ? Math.pow(1 + inflation / 200, yearsInRet)
                       : 1
      const base = dbPensionMonthly * 12 * inflFactor
      const bridge = (dbPensionBridge > 0 && age < 65) ? dbPensionBridge * 12 * inflFactor : 0
      return base + bridge
    })()

    // Other income (part-time, gig, etc.) — active throughout retirement
    const otherAnnual = (otherIncomeMonthly ?? 0) * 12

    // Rent cost after downsize — increases the spending gap from that age onward
    const rentThisYear = (homeRentExtra > 0 && homeRentStartAge > 0 && age >= homeRentStartAge)
      ? homeRentExtra : 0

    // Property cash flow: map current age → ownership year, look up annual cash flow
    const ownershipYear = propCurrentAge > 0 ? (age - propCurrentAge + 1) : 0
    const propCashflowThisYear = (ownershipYear > 0 && propCashflowByYear[ownershipYear] != null)
      ? propCashflowByYear[ownershipYear]
      : 0

    // In-retirement windfall — only fires once, only if after retirement
    const windfallThisYear = (windfall > 0 && windfallAge > retAge && age === windfallAge)
    if (windfallThisYear) nr += windfall
    // Home downsize proceeds
    const homeThisYear = (homeProceeds > 0 && homeAge > retAge && age === homeAge)
    if (homeThisYear) nr += homeProceeds
    // Property sell proceeds
    const propSellThisYear = (propSellWindfall > 0 && propSellAge > retAge && age === propSellAge)
    if (propSellThisYear) nr += propSellWindfall

    // RRIF minimum: at 71 RRSP converts to RRIF, minimum withdrawal is mandatory
    const rrifMin = age >= 71 ? rrifMinimum(rrsp, age) : 0

    // LIF: minimum (same as RRIF at 71+) and maximum withdrawal
    const lifMin = age >= 71 && lif > 0 ? rrifMinimum(lif, age) : 0
    const lifMax = lif > 0 ? lifMaximum(lif, age) : 0
    // Optimal LIF draw: take minimum (or more if spending gap needs it, up to maximum)
    const lifDraw = Math.min(lifMax, Math.max(lifMin, 0))

    // RRSP meltdown: intentional extra RRSP draw before 71 to reduce future RRIF minimums
    // Only fires when there's a meltdownAnnual target AND age < 71 AND RRSP has balance
    const meltdown = (rrspMeltdownAnnual > 0 && age < 71 && rrsp > 0)
      ? Math.min(rrsp, rrspMeltdownAnnual)
      : 0

    // Provincial supplement — estimate using CPP income (withdrawals not yet known)
    // GIS is received when CPP is low; this is a reasonable proxy for eligibility
    const gisEstimate = (gis && age >= 65 && cppIndexed < 8000)
    const provSupplement = calcProvSupplement(province, age, cppIndexed, false, gisEstimate)

    let gap = Math.max(0, adjSpend + rentThisYear - cppIndexed - oasGross - revMortIncome - propCashflowThisYear - provSupplement - dbAnnual - otherAnnual)
    const accounts = { nr, rrsp, tfsa }
    let withdrawn = 0, rrspWithdrawn = 0

    // Force RRIF minimum first if it exceeds what we'd otherwise take
    if (rrifMin > 0) {
      const forceRRSP = Math.min(accounts.rrsp, rrifMin)
      accounts.rrsp -= forceRRSP
      rrspWithdrawn += forceRRSP
      withdrawn += forceRRSP
      gap = Math.max(0, gap - forceRRSP)
    }

    // Force LIF minimum withdrawal
    if (lifMin > 0) {
      lif -= lifMin
      withdrawn += lifMin
      rrspWithdrawn += lifMin  // LIF withdrawals are fully taxable like RRSP
      gap = Math.max(0, gap - lifMin)
    }

    // Apply RRSP meltdown extra draw (before normal gap filling)
    if (meltdown > 0) {
      accounts.rrsp -= meltdown
      rrspWithdrawn += meltdown
      withdrawn += meltdown
      // Does not reduce spending gap — it's an extra withdrawal for tax planning
    }

    // Use remaining LIF capacity (up to max) to cover spending gap before other accounts
    if (lif > 0 && gap > 0 && lifMax > lifMin) {
      const extraLIF = Math.min(lif, lifMax - lifMin, gap)
      if (extraLIF > 0) {
        lif -= extraLIF
        withdrawn += extraLIF
        rrspWithdrawn += extraLIF
        gap -= extraLIF
      }
    }

    // Then draw per withdrawal order for remaining gap
    for (const acc of withdrawOrder) {
      if (gap <= 0) break
      const take = Math.min(Math.max(accounts[acc], 0), gap)
      if (take <= 0) continue
      accounts[acc] -= take
      withdrawn += take
      gap -= take
      if (acc === 'rrsp') rrspWithdrawn += take
    }

    // Taxable income & OAS clawback
    const taxableBase = rrspWithdrawn + cppIndexed * 0.85 + oasGross + dbAnnual + (otherIncomeTaxable ? otherAnnual : 0)
    const clawback = oasClawback(taxableBase, oasGross)
    const oasNet = oasGross - clawback
    const gisAnn = (gis && age >= 65 && cppIndexed < 8000) ? Math.max(0, 11000 - cppIndexed * 0.5) : 0
    const govIncome = cppIndexed + oasNet + gisAnn + revMortIncome + propCashflowThisYear + provSupplement + dbAnnual + otherAnnual
    const splitEligible = age >= 65 ? rrspWithdrawn + oasNet : 0

    // Apply returns
    rrsp = accounts.rrsp * (1 + annualReturn)
    tfsa = accounts.tfsa * (1 + annualReturn)
    nr   = accounts.nr   * (1 + annualReturn)
    lif  = lif  * (1 + annualReturn)

    const balance = rrsp + tfsa + nr + lif
    data.push({
      age, balance, govIncome, cppAnn: cppIndexed, oasAnn: oasNet, oasClawback: clawback, gisAnn,
      propCashflow: propCashflowThisYear,
      revMortIncome,
      provSupplement,
      dbAnnual,
      otherAnnual,
      withdrawn, rrspWithdrawn, rrifMin, lifMin, lifMax, meltdown, spending: adjSpend,
      taxableBase, splitEligible, rrsp, tfsa, nr, lif,
    })

    if (balance <= 0) {
      for (let y2 = yr + 1; y2 < years; y2++) {
        data.push({ age: retAge + y2, balance: 0, govIncome: 0, cppAnn: 0, oasAnn: 0, oasClawback: 0,
          gisAnn: 0, withdrawn: 0, rrspWithdrawn: 0, rrifMin: 0,
          spending: spending * Math.pow(1 + inflation / 100, y2),
          taxableBase: 0, splitEligible: 0, rrsp: 0, tfsa: 0, nr: 0 })
      }
      break
    }
  }
  return data
}

// ─── Household scenario simulation ───────────────────────────────────────────
export function runScenario(params, strategy, spouseParams = null, returnOverrides = null) {
  const { startRRSP, startTFSA, startNR, startLIF = 0, startSpousalRrsp = 0,
          retAge, lifeExp, spending, cppMonthly65, oasBaseAge,
          inflation, postReturnRate, windfall, windfallAge, homeProceeds = 0, homeAge = 0,
          reverseMortgageAnnual = 0, propSellWindfall = 0, propSellAge = 0,
          propCashflowByYear = {}, propCurrentAge = 0,
          homeRentExtra = 0, homeRentStartAge = 0,
          rrspMeltdownAnnual = 0, province } = params
  const shared = { spending, inflation, postReturnRate, province }
  const soloSpend = spouseParams ? spending / 2 : spending

  const primaryData = simulatePerson(
    { startRRSP, startTFSA, startNR, startLIF, startSpousalRrsp,
      retAge, lifeExp, cppMonthly65, oasBaseAge, windfall, windfallAge,
      homeProceeds, homeAge, reverseMortgageAnnual, propSellWindfall, propSellAge,
      propCashflowByYear, propCurrentAge, homeRentExtra, homeRentStartAge,
      rrspMeltdownAnnual },
    strategy, { ...shared, spending: soloSpend }, returnOverrides
  )

  let spouseData = null
  if (spouseParams) {
    const ss = { cppStartAge: strategy.spouseCppStartAge || strategy.cppStartAge,
                 oasStartAge: strategy.spouseOasStartAge || strategy.oasStartAge,
                 withdrawOrder: strategy.withdrawOrder, gis: strategy.gis }
    spouseData = simulatePerson(
      { startRRSP: spouseParams.startRRSP, startTFSA: spouseParams.startTFSA,
        startNR: spouseParams.startNR, startLIF: spouseParams.startLIF || 0,
        retAge: spouseParams.retAge, lifeExp: spouseParams.lifeExp,
        cppMonthly65: spouseParams.cppMonthly65, oasBaseAge: spouseParams.oasStartAge,
        windfall: 0, windfallAge: 70, rrspMeltdownAnnual },
      ss, { ...shared, spending: spending / 2 }, returnOverrides
    )
  }

  let totalTax = 0, totalTaxNoSplit = 0
  const yearData = []

  // ── Income equalisation mode ─────────────────────────────────────────────────
  // When strategy.equalise is true and we have a spouse, optimise withdrawal split
  // each year to minimise combined household tax.
  // We do this by running both sims with spending=0 to get guaranteed income only,
  // then solving the withdrawal split in the year loop.
  if (strategy.equalise && spouseParams && spouseData) {
    // Re-run both with zero spending so we get guaranteed income per year
    const zeroSpend = { ...params, spending: 0 }
    const zeroShared = { spending: 0, inflation, postReturnRate, province }

    // We'll track accounts independently in the equalisation loop
    let p1rrsp = params.startRRSP, p1tfsa = params.startTFSA, p1nr = params.startNR
    let p2rrsp = spouseParams.startRRSP, p2tfsa = spouseParams.startTFSA, p2nr = spouseParams.startNR
    const annualReturn = postReturnRate / 100
    const years = lifeExp - retAge

    for (let yr = 0; yr < years; yr++) {
      const p = primaryData[yr]   // guaranteed income fields (withdrawn will be wrong)
      const s = spouseData[yr] || { balance: 0, govIncome: 0, taxableBase: 0, rrifMin: 0 }

      // Guaranteed income for each person (CPP, OAS, DB, other, prov supplement)
      const p1Guaranteed = (p.cppAnn || 0) + (p.oasAnn || 0) + (p.gisAnn || 0)
        + (p.dbAnnual || 0) + (p.otherAnnual || 0) + (p.provSupplement || 0)
        + (p.revMortIncome || 0) + (p.propCashflow || 0)
      const p2Guaranteed = (s.cppAnn || 0) + (s.oasAnn || 0) + (s.gisAnn || 0)
        + (s.dbAnnual || 0) + (s.otherAnnual || 0) + (s.provSupplement || 0)

      // Taxable guaranteed income (for tax calculation)
      const p1GuaranteedTax = (p.cppAnn || 0) * 0.85 + (p.oasAnn || 0) + (p.dbAnnual || 0)
        + (p.otherAnnual || 0)   // simplified — other taxable
      const p2GuaranteedTax = (s.cppAnn || 0) * 0.85 + (s.oasAnn || 0) + (s.dbAnnual || 0)
        + (s.otherAnnual || 0)

      // Total spending need
      const adjSpend = (spending * Math.pow(1 + inflation / 100, yr))
      const totalGap = Math.max(0, adjSpend - p1Guaranteed - p2Guaranteed)

      // RRIF minimums (mandatory, can't optimise)
      const age = retAge + yr
      const p1RrifMin = age >= 71 ? Math.min(p1rrsp, rrifMinimum(p1rrsp, age)) : 0
      const p2RrifMin = age >= 71 ? Math.min(p2rrsp, rrifMinimum(p2rrsp, age)) : 0

      // Account maximums
      const p1Max = Math.max(0, p1rrsp + p1tfsa + p1nr)
      const p2Max = Math.max(0, p2rrsp + p2tfsa + p2nr)

      // Solve optimal split
      const { draw1, draw2 } = solveEqualisation(
        p1GuaranteedTax, p2GuaranteedTax,
        p1RrifMin, p2RrifMin,
        totalGap, p1Max, p2Max, province
      )

      // Apply withdrawals from P1 accounts (withdrawOrder)
      const order = strategy.withdrawOrder || ['nr', 'rrsp', 'tfsa']
      let rem1 = draw1
      let p1rrspW = p1RrifMin
      p1rrsp -= p1RrifMin
      for (const acc of order) {
        if (rem1 <= p1RrifMin) break
        const bal = acc === 'rrsp' ? p1rrsp : acc === 'tfsa' ? p1tfsa : p1nr
        const take = Math.min(Math.max(bal, 0), rem1 - (acc === 'rrsp' ? p1RrifMin : 0))
        if (take <= 0) continue
        if (acc === 'rrsp') { p1rrsp -= take; p1rrspW += take }
        else if (acc === 'tfsa') p1tfsa -= take
        else p1nr -= take
        rem1 -= take
      }

      // Apply withdrawals from P2 accounts
      let rem2 = draw2
      let p2rrspW = p2RrifMin
      p2rrsp -= p2RrifMin
      for (const acc of order) {
        if (rem2 <= p2RrifMin) break
        const bal = acc === 'rrsp' ? p2rrsp : acc === 'tfsa' ? p2tfsa : p2nr
        const take = Math.min(Math.max(bal, 0), rem2 - (acc === 'rrsp' ? p2RrifMin : 0))
        if (take <= 0) continue
        if (acc === 'rrsp') { p2rrsp -= take; p2rrspW += take }
        else if (acc === 'tfsa') p2tfsa -= take
        else p2nr -= take
        rem2 -= take
      }

      // Tax
      const p1TaxInc = p1GuaranteedTax + p1rrspW
      const p2TaxInc = p2GuaranteedTax + p2rrspW
      const yearTax = approxTax(p1TaxInc, province) + approxTax(p2TaxInc, province)
      const yearTaxNoSplit = yearTax  // equalisation already optimised; split saving is vs. non-equalised

      totalTax += yearTax
      totalTaxNoSplit += approxTax(p1TaxInc + p2TaxInc, province)  // as if one person

      // Apply returns
      p1rrsp = p1rrsp * (1 + annualReturn)
      p1tfsa = p1tfsa * (1 + annualReturn)
      p1nr   = p1nr   * (1 + annualReturn)
      p2rrsp = p2rrsp * (1 + annualReturn)
      p2tfsa = p2tfsa * (1 + annualReturn)
      p2nr   = p2nr   * (1 + annualReturn)

      const p1Balance = Math.max(0, p1rrsp + p1tfsa + p1nr)
      const p2Balance = Math.max(0, p2rrsp + p2tfsa + p2nr)
      const hBalance  = p1Balance + p2Balance

      yearData.push({
        age,
        balance:  hBalance, p1Balance, p2Balance,
        govIncome: p1Guaranteed + p2Guaranteed,
        withdrawn: draw1 + draw2,
        spending: adjSpend,
        tax: yearTax,
        rrifMin: p1RrifMin + p2RrifMin,
        oasClawback: (p.oasClawback || 0) + (s.oasClawback || 0),
        splitSaving: yearTaxNoSplit - yearTax,
        p1TaxInc, p2TaxInc,
        cppAnn:   (p.cppAnn || 0) + (s.cppAnn || 0),
        oasAnn:   (p.oasAnn || 0) + (s.oasAnn || 0),
        gisAnn:   (p.gisAnn || 0) + (s.gisAnn || 0),
        revMortIncome: p.revMortIncome || 0,
        propCashflow:  p.propCashflow || 0,
        provSupplement: (p.provSupplement || 0) + (s.provSupplement || 0),
        dbAnnual:  (p.dbAnnual || 0) + (s.dbAnnual || 0),
        otherAnnual: (p.otherAnnual || 0) + (s.otherAnnual || 0),
        rrsp: p1rrsp + p2rrsp, tfsa: p1tfsa + p2tfsa, nr: p1nr + p2nr,
      })

      if (hBalance <= 0) {
        for (let y2 = yr + 1; y2 < years; y2++) {
          yearData.push({ age: retAge + y2, balance: 0, govIncome: 0, withdrawn: 0,
            spending: spending * Math.pow(1 + inflation / 100, y2),
            tax: 0, rrifMin: 0, oasClawback: 0, splitSaving: 0,
            p1Balance: 0, p2Balance: 0, rrsp: 0, tfsa: 0, nr: 0 })
        }
        break
      }
    }
  } else {
  for (let yr = 0; yr < primaryData.length; yr++) {
    const p = primaryData[yr]
    const s = spouseData ? (spouseData[yr] || { balance:0, govIncome:0, withdrawn:0, taxableBase:0, splitEligible:0, spending:0 }) : null
    const hBalance = p.balance + (s ? s.balance : 0)
    const hGovIncome = p.govIncome + (s ? s.govIncome : 0)
    const hWithdrawn = p.withdrawn + (s ? s.withdrawn : 0)
    const hSpending = spouseData ? p.spending + s.spending : p.spending
    const hRrifMin = p.rrifMin + (s ? (s.rrifMin || 0) : 0)
    const hOasClawback = p.oasClawback + (s ? (s.oasClawback || 0) : 0)

    let yearTax, yearTaxNoSplit
    if (spouseData && s) {
      yearTaxNoSplit = approxTax(p.taxableBase, province) + approxTax(s.taxableBase, province)
      yearTax = calcSplitTax(p.taxableBase, s.taxableBase, p.splitEligible, s.splitEligible, province)
    } else {
      yearTax = approxTax(p.taxableBase, province)
      yearTaxNoSplit = yearTax
    }
    totalTax += yearTax; totalTaxNoSplit += yearTaxNoSplit

    yearData.push({ age: p.age, balance: hBalance, govIncome: hGovIncome, withdrawn: hWithdrawn,
      spending: hSpending, tax: yearTax, rrifMin: hRrifMin, oasClawback: hOasClawback,
      p1Balance: p.balance, p2Balance: s ? s.balance : 0, splitSaving: yearTaxNoSplit - yearTax,
      cppAnn:         p.cppAnn + (s?.cppAnn || 0),
      oasAnn:         p.oasAnn + (s?.oasAnn || 0),
      gisAnn:         p.gisAnn + (s?.gisAnn || 0),
      revMortIncome:  p.revMortIncome ?? 0,
      propCashflow:   p.propCashflow ?? 0,
      provSupplement: (p.provSupplement ?? 0) + (s?.provSupplement ?? 0),
      dbAnnual:       (p.dbAnnual ?? 0) + (s?.dbAnnual ?? 0),
      otherAnnual:    (p.otherAnnual ?? 0) + (s?.otherAnnual ?? 0),
      rrsp: p.rrsp + (s?.rrsp || 0),
      tfsa: p.tfsa + (s?.tfsa || 0),
      nr:   p.nr   + (s?.nr   || 0),
    })
  }
  } // end else (standard loop)

  const getAt = a => yearData.find(d => d.age === a)?.balance ?? null
  const depleted = yearData.find(d => d.balance <= 0)
  const projAtRet = startRRSP + startTFSA + startNR + (spouseParams ? spouseParams.startRRSP + spouseParams.startTFSA + spouseParams.startNR : 0)

  return {
    label: strategy.label, projAtRet, totalTax, totalTaxNoSplit,
    incomeSplitSaving: totalTaxNoSplit - totalTax,
    depletedAge: depleted?.age ?? null,
    age70Assets: getAt(70), age80Assets: getAt(80), age85Assets: getAt(85),
    estateValue: yearData[yearData.length - 1]?.balance ?? 0,
    firstYearIncome: yearData[0] ? yearData[0].govIncome + yearData[0].withdrawn : 0,
    yearData,
  }
}

// ─── Monte Carlo engine ──────────────────────────────────────────────────────
// Generates n simulations using log-normal return distribution.
// Returns percentile bands for the balance trajectory.
export function runMonteCarlo({ params, strategy, spouseParams = null, simCount = 1000, stdDev = 10 }) {
  const { retAge, lifeExp, postReturnRate } = params
  const years = lifeExp - retAge
  const meanReturn = postReturnRate / 100
  // Log-normal parameters
  const sigma = stdDev / 100
  const mu = Math.log(1 + meanReturn) - 0.5 * sigma * sigma

  // Box-Muller normal random
  function randNorm() {
    let u = 0, v = 0
    while (u === 0) u = Math.random()
    while (v === 0) v = Math.random()
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }

  function randReturn() {
    return Math.exp(mu + sigma * randNorm()) - 1
  }

  const allBalances = Array.from({ length: years }, () => [])
  let survivedCount = 0

  for (let sim = 0; sim < simCount; sim++) {
    const overrides = Array.from({ length: years }, () => randReturn())
    const result = runScenario(params, strategy, spouseParams, overrides)
    const survived = !result.depletedAge
    if (survived) survivedCount++

    result.yearData.forEach((d, yr) => {
      allBalances[yr].push(d.balance)
    })
  }

  // Calculate percentile bands per year
  function percentile(arr, p) {
    const sorted = [...arr].sort((a, b) => a - b)
    const idx = Math.floor((p / 100) * (sorted.length - 1))
    return sorted[idx]
  }

  const bands = Array.from({ length: years }, (_, yr) => {
    const age = retAge + yr
    const vals = allBalances[yr]
    return {
      age,
      p10: Math.round(percentile(vals, 10) / 1000),
      p25: Math.round(percentile(vals, 25) / 1000),
      p50: Math.round(percentile(vals, 50) / 1000),
      p75: Math.round(percentile(vals, 75) / 1000),
      p90: Math.round(percentile(vals, 90) / 1000),
    }
  })

  return {
    bands,
    survivalRate: Math.round(survivedCount / simCount * 100),
    simCount,
  }
}

// ─── FIRE calculations ───────────────────────────────────────────────────────
export const FIRE_SWR_OPTIONS = [
  { rate: 0.03,  label: '3.0%', desc: 'Ultra-conservative (50+ yr horizon)' },
  { rate: 0.035, label: '3.5%', desc: 'Conservative (40–50 yr horizon)' },
  { rate: 0.04,  label: '4.0%', desc: 'Classic Trinity Study (30 yr)' },
  { rate: 0.045, label: '4.5%', desc: 'Moderate (with CPP/OAS bridge)' },
  { rate: 0.05,  label: '5.0%', desc: 'Aggressive (strong CPP/OAS)' },
]

export function calcFIRE({ currentAge, currentAssets, monthlyContrib, preReturnRate, spending, cppMonthly65, oasAnnual, cppStartAge, oasStartAge, swr }) {
  const annualReturn = preReturnRate / 100
  const monthlyReturn = annualReturn / 12

  // FIRE number: spending minus government income / SWR
  // Government income at target retirement reduces the portfolio needed
  const cppFactor = cppAdjustment(cppStartAge)
  const oasFactor = oasAdjustment(oasStartAge)
  const govAtFire = cppMonthly65 * 12 * cppFactor + oasAnnual * oasFactor

  // Full FIRE (no gov income assumed yet — conservative)
  const fireNumber = spending / swr
  // Lean FIRE (with government income offsetting)
  const leanFireNumber = Math.max(0, (spending - govAtFire)) / swr

  // How many months to reach FIRE number?
  const gap = Math.max(0, fireNumber - currentAssets)
  let monthsToFire = 0
  if (gap <= 0) {
    monthsToFire = 0
  } else if (monthlyContrib <= 0) {
    // Growing without contributions
    monthsToFire = Math.log(fireNumber / currentAssets) / Math.log(1 + monthlyReturn)
  } else {
    // Solve: FV = PV*(1+r)^n + PMT*((1+r)^n - 1)/r = fireNumber
    // Iterate (Newton's method approximation)
    let assets = currentAssets
    let months = 0
    while (assets < fireNumber && months < 600) {
      assets = assets * (1 + monthlyReturn) + monthlyContrib
      months++
    }
    monthsToFire = months >= 600 ? null : months
  }

  const fireAge = monthsToFire != null ? currentAge + monthsToFire / 12 : null

  // Coast FIRE: point at which you can stop contributing and coast to FIRE
  // Solve: currentAssets * (1+r)^n = fireNumber
  const coastMonths = currentAssets > 0 ? Math.log(fireNumber / currentAssets) / Math.log(1 + monthlyReturn) : null
  const coastAge = coastMonths != null ? currentAge + coastMonths / 12 : null

  // Annual savings rate
  const annualContrib = monthlyContrib * 12
  // Progress toward FIRE number
  const progress = Math.min(100, Math.round(currentAssets / fireNumber * 100))

  return {
    fireNumber,
    leanFireNumber,
    fireAge,
    coastAge,
    monthsToFire,
    progress,
    govAtFire,
    annualContrib,
  }
}

// ─── Scenario definitions ────────────────────────────────────────────────────
export function buildScenarios(oasBaseAge) {
  return [
    {
      id: 'standard', label: 'Standard (65/65)', color: '#1D9E75',
      description: 'CPP and OAS both at 65. Non-reg first, then RRSP, then TFSA.',
      cppStartAge: 65, oasStartAge: 65, spouseCppStartAge: 65, spouseOasStartAge: 65,
      withdrawOrder: ['nr','rrsp','tfsa'], gis: false,
      fullExplanation: {
        overview: 'The Standard strategy takes CPP and OAS at the traditional age of 65 and uses a tax-efficient withdrawal order: non-registered first, then RRSP/RRIF, then TFSA last.',
        cppOas: 'Starting CPP at 65 gives you the full, unmodified benefit — no reduction for early claiming, no uplift for deferral. OAS also begins at 65 at its base rate of approximately $8,618/year (2024). Both are indexed to CPI annually.',
        withdrawalOrder: 'Non-registered accounts are drawn first because withdrawals are only partially taxable (capital gains at 50% inclusion). RRSP withdrawals follow — they are fully taxable as income but delaying them allows further tax-deferred growth. TFSA is drawn last as a tax-free reservoir, preserving maximum flexibility.',
        rrif: 'At age 71, your RRSP automatically converts to a RRIF. Minimum withdrawals are mandatory (starting at 5.28% of the balance, rising to 20% by age 95) and are fully taxable. This strategy does not take extra steps to reduce RRIF exposure.',
        taxProfile: 'Tax burden is moderate and predictable. Non-reg withdrawals generate capital gains. RRSP/RRIF withdrawals are fully taxed as ordinary income. With CPP and OAS both active from 65, total taxable income is stable and somewhat elevated — watch for OAS clawback if income exceeds ~$91k.',
        suitedFor: 'Canadians with balanced account types, no strong preference for estate building, and who want the simplest approach with predictable government income from 65 onward.',
        tradeoffs: 'Misses the upside of deferred CPP/OAS (8.4%/year on CPP, 7.2%/year on OAS after 65). Does not aggressively manage RRIF minimums. The withdrawal order may generate more taxable income earlier than a TFSA-first approach.',
      }
    },
    {
      id: 'early', label: 'Early CPP (60)', color: '#378ADD',
      description: 'Take CPP at 60 (reduced 36%). Draw RRSP first to manage RRIF.',
      cppStartAge: 60, oasStartAge: 65, spouseCppStartAge: 60, spouseOasStartAge: 65,
      withdrawOrder: ['rrsp','nr','tfsa'], gis: false,
      fullExplanation: {
        overview: 'This strategy takes CPP as early as possible at age 60, accepting a permanent 36% reduction in exchange for 5 extra years of government income. RRSP is drawn first to reduce the future RRIF balance and mandatory minimum withdrawals.',
        cppOas: 'CPP at 60 is reduced by 7.2% per year before age 65 — a total of 36% permanently. If your base CPP at 65 would be $900/month, early CPP pays $576/month for life. OAS is still taken at 65 (it cannot start before 65). The breakeven point vs. waiting until 65 is typically around age 74-76.',
        withdrawalOrder: 'RRSP is drawn first, ahead of non-registered, to deliberately shrink the RRSP balance before mandatory RRIF conversion at 71. This reduces future minimum withdrawals that could push you into higher tax brackets. TFSA remains last as the tax-free buffer.',
        rrif: 'By drawing RRSP heavily in early retirement (60-70), you reduce the balance subject to mandatory RRIF minimums at 71. This is the primary mechanical advantage of this strategy — lower forced taxable income in your 70s and 80s when OAS clawback is a real risk.',
        taxProfile: 'Taxable income is higher in early retirement (60-71) due to RRSP withdrawals, but lower in later years due to the reduced RRIF balance. The reduced CPP amount means lower ordinary income from government sources. This profile may be advantageous if you expect to be in a lower bracket after 71.',
        suitedFor: 'People retiring before 65 who need income immediately, those with health concerns reducing life expectancy, those with very large RRSPs who are concerned about RRIF minimums, and those who prefer certainty of income now over larger income later.',
        tradeoffs: 'The 36% CPP reduction is permanent and compounds over decades. If you live past 75, waiting to 65 or 70 typically produces more lifetime CPP income. This strategy front-loads tax in early retirement years.',
      }
    },
    {
      id: 'delay', label: 'Delay max (70/70)', color: '#D85A30',
      description: 'Defer CPP and OAS to 70 for maximum lifetime benefits. TFSA-first.',
      cppStartAge: 70, oasStartAge: 70, spouseCppStartAge: 70, spouseOasStartAge: 70,
      withdrawOrder: ['tfsa','nr','rrsp'], gis: false,
      fullExplanation: {
        overview: 'The maximum deferral strategy delays both CPP and OAS to age 70, earning the maximum possible lifetime government benefit. Portfolio assets bridge the gap from retirement to 70, with TFSA drawn first to minimise taxable income during the bridge period.',
        cppOas: 'Deferring CPP past 65 earns 8.4% per year — a total of 42% increase by age 70. A $900/month CPP at 65 becomes $1,278/month at 70, for life, indexed to CPI. OAS deferred to 70 earns 7.2% per year — a 36% increase — raising the annual benefit from ~$8,618 to ~$11,720. The CPP breakeven vs. age 65 is around age 82-84. The OAS breakeven is around age 74-76.',
        withdrawalOrder: 'TFSA is drawn first during the bridge period (retirement to age 70) because withdrawals are completely tax-free, keeping taxable income low and preserving RRSP/RRIF room. Non-registered follows. RRSP is drawn last, reducing the years of RRIF mandatory minimums.',
        rrif: 'RRSP must still convert to RRIF at 71. However, by drawing TFSA and non-reg first in the 60s, more RRSP remains — this is a trade-off. The strategy benefits from having very high guaranteed income from 70 onward, which can offset larger RRIF minimums. Careful planning is needed if the RRSP balance is very large.',
        taxProfile: 'Taxable income is low from retirement to 70 (TFSA withdrawals are not taxable). From 70 onward, income rises significantly with CPP + OAS + RRIF. At high RRSP balances and with maximum CPP/OAS, OAS clawback becomes a real risk — total income could exceed $91k/year triggering a 15% clawback on OAS. This strategy works best when RRSP balances are moderate.',
        suitedFor: 'People in good health with reasonable life expectancy (80+), those with significant TFSA savings available to bridge the gap, those who want maximum inflation-protected guaranteed income in later life, and couples who can stagger deferral ages.',
        tradeoffs: 'Requires enough liquid assets to cover 5-10 years without government income. If you die before 82-84, early CPP would have produced more lifetime income. Large RRSP balances combined with maximum CPP/OAS may trigger OAS clawback. The bridge period draws down portfolio faster initially.',
      }
    },
    {
      id: 'gis', label: 'GIS optimised', color: '#BA7517',
      description: 'Minimise taxable income to qualify for GIS. TFSA-first.',
      cppStartAge: 65, oasStartAge: 65, spouseCppStartAge: 65, spouseOasStartAge: 65,
      withdrawOrder: ['tfsa','nr','rrsp'], gis: true,
      fullExplanation: {
        overview: 'The Guaranteed Income Supplement (GIS) is a federal benefit for low-income seniors receiving OAS. This strategy deliberately keeps taxable income below the GIS threshold by drawing TFSA first, unlocking thousands of dollars per year in additional government support.',
        cppOas: 'OAS begins at 65 at the standard rate. GIS is available to OAS recipients with net income below approximately $21,768 (single, 2024) and phases out as income rises. The maximum GIS for a single senior is approximately $11,000/year — a significant supplement if income qualifies. CPP income directly reduces GIS eligibility at 50 cents per dollar of CPP.',
        withdrawalOrder: 'TFSA withdrawals are completely excluded from the income test for GIS — they do not count as income. Drawing TFSA first keeps taxable income low, maximising GIS entitlement. Non-registered follows (only capital gains are taxable). RRSP/RRIF withdrawals are drawn last since they are fully taxable and would disqualify from GIS.',
        rrif: 'At 71, RRIF minimums will force taxable RRSP withdrawals, potentially reducing or eliminating GIS. This strategy works best for those with modest RRSP balances and significant TFSA savings. The GIS benefit is most valuable in early retirement (65-70) before RRIF minimums force income higher.',
        taxProfile: 'Taxable income is minimised — often below $20,000 in the early years when TFSA is the primary source. Combined OAS + GIS + CPP provides a meaningful guaranteed income floor. The trade-off is that later years (when RRIF minimums kick in) may see reduced GIS or full disqualification.',
        suitedFor: 'Lower-income retirees, those with large TFSA balances relative to RRSP, those who worked part-time or had gaps in employment reducing CPP, and single seniors where the GIS amounts are highest. Not suitable for those with large RRSPs as RRIF minimums will disqualify GIS regardless.',
        tradeoffs: 'Requires careful income management annually — exceeding the threshold even slightly reduces GIS. RRIF minimums from 71 onward make sustained GIS eligibility difficult with any significant RRSP balance. The strategy has limited benefit for couples (GIS amounts are lower per person) or those with high CPP.',
      }
    },
    {
      id: 'equalise', label: 'Income equalisation', color: '#9B59B6',
      couplesOnly: true,
      description: 'Each year, optimise which partner draws from which accounts to minimise combined household tax.',
      cppStartAge: 65, oasStartAge: 65, spouseCppStartAge: 65, spouseOasStartAge: 65,
      withdrawOrder: ['nr','rrsp','tfsa'], gis: false,
      equalise: true,
      fullExplanation: {
        overview: 'Income Equalisation is a couples-only strategy that solves each year for the withdrawal split between partners that minimises your combined household tax bill. Rather than each person drawing from their own accounts independently, the engine finds the optimal per-person income to keep both in the lowest combined marginal brackets.',
        cppOas: 'CPP and OAS both start at 65 for both partners. The value of equalisation is most visible when one partner has significantly more RRSP savings — the engine draws more from the lower-income partner\'s accounts in high-income years, and shifts draws to the higher-income partner when they\'re in a lower bracket.',
        withdrawalOrder: 'Both partners share the same account draw order (non-reg → RRSP → TFSA by default). The engine decides *how much* each draws, not the order within each person\'s accounts. RRIF minimums are still applied first as mandatory minimums cannot be optimised away.',
        rrif: 'RRIF minimums at 71 are applied before optimisation — mandatory withdrawals happen regardless. The equalisation solver then distributes any remaining gap between partners to minimise combined tax on the discretionary portion.',
        taxProfile: 'This strategy typically produces the lowest total lifetime household tax of any scenario, particularly when partners have unequal RRSP balances or different CPP amounts. The annual "split saving" shown in the drawdown table is the per-year tax reduction vs. each partner drawing independently.',
        suitedFor: 'Couples where one partner has significantly more RRSP savings than the other, couples with a meaningful difference in CPP entitlement, and households in higher combined tax brackets where marginal rate differences create real savings. Works best with a mix of RRSP, TFSA, and non-reg across both partners.',
        tradeoffs: 'More complex to execute in practice — requires coordinated withdrawals and potentially more complex tax filing. The savings depend heavily on the gap between partners\' incomes and account balances. If partners have nearly identical financial profiles, the benefit over standard pension splitting may be modest.',
      }
    },
  ]
}

// ─── Formatting ──────────────────────────────────────────────────────────────
export const fmt  = n => '$' + Math.round(n).toLocaleString('en-CA')
export const fmtK = n => {
  if (n == null || !isFinite(n)) return '—'
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return (n < 0 ? '-' : '') + '$' + (abs / 1_000_000).toFixed(1) + 'M'
  return '$' + Math.round(n / 1000).toLocaleString('en-CA') + 'k'
}
export const fmtM = n => {
  if (Math.abs(n) >= 1_000_000) return '$' + (n/1_000_000).toFixed(1) + 'M'
  if (Math.abs(n) <= 0) return '$0'
  return fmtK(n)
}

// ─── Work-backwards solver ────────────────────────────────────────────────────
// Given a target retirement spending and age, solve for what's needed.
// Uses binary search on monthly contribution to find the minimum that makes
// the plan survive to lifeExpectancy with the standard scenario.

export function solveWorkBackwards({
  // Goals
  targetSpending,        // annual household spending in retirement (today's $)
  targetRetirementAge,
  targetEstateValue,     // desired estate at life expectancy (0 = just survive)
  lifeExpectancy,
  // Current situation
  currentAge,
  currentRRSP, currentTFSA, currentNonReg,
  currentMonthlyContrib,
  cppMonthly65,
  oasStartAge,
  // Assumptions
  preReturnRate,
  postReturnRate,
  inflationRate,
  province,
}) {
  const yearsToRet = Math.max(targetRetirementAge - currentAge, 0)
  const annualReturn = preReturnRate / 100

  // Standard strategy for solving
  const strategy = {
    id: 'standard', label: 'Standard', color: '#1D9E75',
    cppStartAge: 65, oasStartAge, withdrawOrder: ['nr','rrsp','tfsa'], gis: false,
  }

  // Helper: run a full simulation with a given monthly contribution
  function simulate(monthlyContrib) {
    const grown = growToRetirement({
      rrsp: currentRRSP, tfsa: currentTFSA, nr: currentNonReg,
      monthly: monthlyContrib, years: yearsToRet, annualRate: preReturnRate,
    })
    const params = {
      startRRSP: grown.rrsp, startTFSA: grown.tfsa, startNR: grown.nr,
      retAge: targetRetirementAge, lifeExp: lifeExpectancy,
      spending: targetSpending, cppMonthly65, oasBaseAge: oasStartAge,
      inflation: inflationRate, postReturnRate, windfall: 0, windfallAge: 70, province,
    }
    const result = runScenario(params, strategy, null)
    return { result, grown }
  }

  // Current trajectory (no change)
  const { result: currentResult, grown: currentGrown } = simulate(currentMonthlyContrib)
  const projAtRetCurrent = currentGrown.rrsp + currentGrown.tfsa + currentGrown.nr

  // Check if current plan already works
  const currentSurvives = !currentResult.depletedAge &&
    (currentResult.estateValue >= targetEstateValue)

  // Binary search: find minimum monthly contribution that meets the goal
  // Search range: 0 to $20,000/month
  let lo = 0, hi = 20000
  let solvedContrib = null
  let solvedResult = null
  let solvedGrown = null

  // First check if even $20k/mo works
  const { result: maxResult, grown: maxGrown } = simulate(hi)
  const maxWorks = !maxResult.depletedAge && maxResult.estateValue >= targetEstateValue

  if (currentSurvives) {
    // Already works — find minimum needed (could be less than current)
    lo = 0; hi = currentMonthlyContrib
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2
      const { result: r } = simulate(mid)
      const works = !r.depletedAge && r.estateValue >= targetEstateValue
      if (works) hi = mid; else lo = mid
    }
    solvedContrib = Math.ceil(hi / 50) * 50
  } else if (maxWorks) {
    // Binary search between current and max
    lo = currentMonthlyContrib; hi = 20000
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2
      const { result: r } = simulate(mid)
      const works = !r.depletedAge && r.estateValue >= targetEstateValue
      if (works) hi = mid; else lo = mid
    }
    solvedContrib = Math.ceil(hi / 50) * 50
  } else {
    solvedContrib = null  // Impossible even at $20k/mo
  }

  if (solvedContrib !== null) {
    const { result, grown } = simulate(solvedContrib)
    solvedResult = result
    solvedGrown = grown
  }

  // Required lump sum today (alternative: instead of higher contributions)
  // Solve: what lump sum added to current assets today reaches the needed portfolio at retirement?
  // We know the gap at retirement, so discount it back at pre-retirement rate
  let requiredLumpSum = null
  if (solvedContrib !== null && solvedContrib > currentMonthlyContrib) {
    // Extra monthly needed * months, discounted — approximate lump sum equivalent
    const extraMonthly = solvedContrib - currentMonthlyContrib
    const months = yearsToRet * 12
    const mr = preReturnRate / 100 / 12
    // FV of extra contributions = PV lump sum needed today
    // FV_annuity = PMT * ((1+r)^n - 1) / r
    // Grow that FV back to today: PV = FV / (1+r)^n
    const fvExtra = mr > 0
      ? extraMonthly * (Math.pow(1 + mr, months) - 1) / mr
      : extraMonthly * months
    requiredLumpSum = Math.round(fvExtra / Math.pow(1 + preReturnRate / 100, yearsToRet))
  }

  // Build year-by-year comparison data
  const ages = Array.from({ length: lifeExpectancy - targetRetirementAge }, (_, i) => targetRetirementAge + i)
  const comparisonData = ages.map(age => {
    const curr = currentResult.yearData.find(d => d.age === age)
    const solved = solvedResult?.yearData.find(d => d.age === age)
    return {
      age,
      current: curr ? Math.round(curr.balance / 1000) : 0,
      target:  solved ? Math.round(solved.balance / 1000) : 0,
    }
  })

  return {
    // Inputs reflected back
    targetSpending, targetRetirementAge, targetEstateValue,
    // Current trajectory
    currentMonthlyContrib, projAtRetCurrent,
    currentSurvives, currentDepletedAge: currentResult.depletedAge,
    currentEstate: currentResult.estateValue,
    // Solution
    solvedContrib,               // required monthly contribution
    requiredLumpSum,             // alternative one-time top-up today
    solvedProjAtRet: solvedGrown ? solvedGrown.rrsp + solvedGrown.tfsa + solvedGrown.nr : null,
    solvedEstate: solvedResult?.estateValue ?? null,
    impossible: solvedContrib === null,
    // Extra monthly needed
    extraMonthlyNeeded: solvedContrib !== null ? Math.max(0, solvedContrib - currentMonthlyContrib) : null,
    // Chart data
    comparisonData,
  }
}
