// ─── Commercial Property Analysis Engine ─────────────────────────────────────
// Formulas cross-referenced against the uploaded spreadsheet and industry sources.
// Canadian commercial real estate conventions throughout.

// ─── Mortgage helpers ────────────────────────────────────────────────────────
// Canadian mortgages compound semi-annually — convert to monthly equivalent
export function canadianMonthlyRate(annualRate) {
  // Canada: (1 + r/2)^2 = (1 + monthly)^12  =>  monthly = (1 + r/2)^(1/6) - 1
  return Math.pow(1 + annualRate / 2, 1 / 6) - 1
}

export function monthlyPayment(principal, annualRate, termYears) {
  const r = canadianMonthlyRate(annualRate)
  const n = termYears * 12
  if (r === 0) return principal / n
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

// Remaining mortgage balance after k months
export function mortgageBalance(principal, annualRate, termYears, monthsPaid) {
  const r = canadianMonthlyRate(annualRate)
  const n = termYears * 12
  const pmt = monthlyPayment(principal, annualRate, termYears)
  if (r === 0) return Math.max(0, principal - pmt * monthsPaid)
  const balance = principal * Math.pow(1 + r, monthsPaid) - pmt * (Math.pow(1 + r, monthsPaid) - 1) / r
  return Math.max(0, balance)
}

// Annual interest paid in year Y (1-indexed)
export function annualInterest(principal, annualRate, termYears, year) {
  let interest = 0
  const r = canadianMonthlyRate(annualRate)
  const pmt = monthlyPayment(principal, annualRate, termYears)
  let bal = mortgageBalance(principal, annualRate, termYears, (year - 1) * 12)
  for (let m = 0; m < 12; m++) {
    const intPmt = bal * r
    interest += intPmt
    bal = bal - (pmt - intPmt)
    if (bal < 0) break
  }
  return interest
}

// ─── IRR solver (Newton-Raphson) ─────────────────────────────────────────────
export function calcIRR(cashFlows, guess = 0.1) {
  // cashFlows[0] = initial outflow (negative), rest = annual inflows
  let rate = guess
  for (let iter = 0; iter < 200; iter++) {
    let npv = 0, dnpv = 0
    for (let t = 0; t < cashFlows.length; t++) {
      npv  += cashFlows[t] / Math.pow(1 + rate, t)
      dnpv -= t * cashFlows[t] / Math.pow(1 + rate, t + 1)
    }
    if (Math.abs(dnpv) < 1e-12) break
    const newRate = rate - npv / dnpv
    if (Math.abs(newRate - rate) < 1e-8) { rate = newRate; break }
    rate = newRate
    if (rate < -0.999) rate = -0.999
  }
  return isFinite(rate) ? rate : null
}

// ─── Main year-by-year property simulation ───────────────────────────────────
export function analyseProperty(inputs) {
  const {
    ownershipMode = 'buying',  // 'buying' | 'owned'
    purchasePrice,
    downPaymentPct,       // buying mode: fraction of purchase price
    mortgageRate,
    mortgageTerm,
    // Existing ownership fields
    currentMarketValue,   // owned mode: current appraised/market value
    existingMortgageBal,  // owned mode: current outstanding mortgage balance
    existingMortgageRate, // owned mode: current mortgage interest rate
    existingMortgageTerm, // owned mode: remaining amortization years
    // Income / expense fields
    sqFootage,
    rentPerSqFt,
    sharedCAM,
    vacancyRate,
    maintenanceReservePct,
    managementFeePct,
    propertyTaxRate,
    insurance,
    utilities,
    miscExpenses,
    rentalIncreaseRate,
    propertyTaxIncrease,
    utilitiesIncrease,
    appreciationRate,
    buildingToLandRatio,
    closingCostBuyPct,
    closingCostSellPct,
    holdingYears,
  } = inputs

  // ── Derive financing basis depending on mode ──────────────────────────────
  let loanAmount, totalCashIn, annualMortgage, effectivePurchasePrice

  if (ownershipMode === 'owned') {
    // Already own it — equity is the "cash invested" for CoC / IRR purposes
    effectivePurchasePrice = currentMarketValue
    loanAmount             = existingMortgageBal
    const existingEquity   = currentMarketValue - existingMortgageBal
    totalCashIn            = Math.max(0, existingEquity)  // opportunity cost basis
    annualMortgage         = monthlyPayment(existingMortgageBal, existingMortgageRate, existingMortgageTerm) * 12
  } else {
    // Buying — standard down payment flow
    effectivePurchasePrice = purchasePrice
    const downPayment      = purchasePrice * downPaymentPct
    loanAmount             = purchasePrice - downPayment
    const closingCostBuy   = purchasePrice * closingCostBuyPct
    totalCashIn            = downPayment + closingCostBuy
    annualMortgage         = monthlyPayment(loanAmount, mortgageRate, mortgageTerm) * 12
  }

  const activeMortgageRate = ownershipMode === 'owned' ? existingMortgageRate : mortgageRate
  const activeMortgageTerm = ownershipMode === 'owned' ? existingMortgageTerm : mortgageTerm
  const activePrice        = effectivePurchasePrice

  // Building value for depreciation (CCA Class 1 at 4% declining balance in Canada,
  // but spreadsheet uses straight-line over 27.5 years — we follow the spreadsheet convention)
  const buildingValue  = activePrice * buildingToLandRatio
  const annualDepreciation = buildingValue / 27.5

  const years = []
  const irrCashFlows = [-totalCashIn]

  for (let yr = 1; yr <= holdingYears; yr++) {
    const inflFactor = Math.pow(1 + rentalIncreaseRate, yr - 1)

    // Income
    // rentPerSqFt is annual (commercial standard: e.g. $15/sqft/yr = $82,500/yr for 5,500sqft)
    // sharedCAM is monthly — multiply by 12 for annual
    const grossScheduled   = (sqFootage * rentPerSqFt + sharedCAM * 12) * inflFactor
    const vacancyLoss      = grossScheduled * vacancyRate
    const totalOperIncome  = grossScheduled - vacancyLoss

    // Operating expenses (NOI excludes mortgage — financing cost)
    const propTax          = activePrice * propertyTaxRate * Math.pow(1 + propertyTaxIncrease, yr - 1)
    const insur            = insurance   // flat or could index — kept flat per spreadsheet
    const util             = utilities   * Math.pow(1 + utilitiesIncrease, yr - 1)
    const misc             = miscExpenses * Math.pow(1 + 0.04, yr - 1)
    const maintenanceRes   = grossScheduled * maintenanceReservePct
    const mgmtFee          = totalOperIncome * managementFeePct
    const totalOpEx        = propTax + insur + util + misc + maintenanceRes + mgmtFee

    const noi              = totalOperIncome - totalOpEx

    // Cap rate = NOI / current property value
    const propValue        = activePrice * Math.pow(1 + appreciationRate, yr)
    const capRate          = noi / propValue

    // Financing
    const mortBal          = mortgageBalance(loanAmount, activeMortgageRate, activeMortgageTerm, yr * 12)
    const mortInterest     = annualInterest(loanAmount, activeMortgageRate, activeMortgageTerm, yr)
    const principalPaydown = annualMortgage - mortInterest  // approximate
    const annualCashFlow   = noi - annualMortgage
    const monthlyCashFlow  = annualCashFlow / 12

    // Returns
    const cocReturn        = totalCashIn > 0 ? annualCashFlow / totalCashIn : 0
    const dscr             = annualMortgage > 0 ? noi / annualMortgage : null
    const equity           = propValue - mortBal
    const roe              = equity > 0 ? (noi - annualMortgage + principalPaydown) / equity : 0

    // Sale proceeds if selling this year
    const saleProceeds     = propValue * (1 - closingCostSellPct) - mortBal

    // Tax benefits
    const taxBenefitDepreciation = annualDepreciation
    const taxBenefitInterest     = mortInterest

    years.push({
      year: yr,
      grossScheduled,
      vacancyLoss,
      totalOperIncome,
      propTax,
      insur,
      util,
      misc,
      maintenanceRes,
      mgmtFee,
      totalOpEx,
      noi,
      annualMortgage,
      mortInterest,
      principalPaydown,
      annualCashFlow,
      monthlyCashFlow,
      mortBal,
      propValue,
      equity,
      capRate,
      cocReturn,
      dscr,
      roe,
      saleProceeds,
      taxBenefitDepreciation,
      taxBenefitInterest,
    })

    // IRR: each year's cash flow, in terminal year add sale proceeds
    const terminalCashFlow = yr === holdingYears
      ? annualCashFlow + saleProceeds
      : annualCashFlow
    irrCashFlows.push(terminalCashFlow)
  }

  // Cumulative cash flow
  let cumulative = 0
  years.forEach(y => { cumulative += y.annualCashFlow; y.cumulativeCashFlow = cumulative })

  // IRR across holding period
  const irr = calcIRR(irrCashFlows)

  // Summary metrics (Year 1 for key rates, Year 5 equity, holding year totals)
  const y1  = years[0]
  const y5  = years[Math.min(4, years.length - 1)]
  const yN  = years[years.length - 1]

  const downPayment = ownershipMode === 'owned'
    ? (currentMarketValue - existingMortgageBal)
    : purchasePrice * (downPaymentPct ?? 0)
  const existingEquityDisplay = ownershipMode === 'owned' ? Math.max(0, currentMarketValue - existingMortgageBal) : null
  const netSaleProceeds = ownershipMode === 'owned'
    ? currentMarketValue * (1 - closingCostSellPct) - existingMortgageBal
    : null

  return {
    // Inputs reflected
    purchasePrice: activePrice, downPayment, loanAmount, totalCashIn,
    closingCostBuy: ownershipMode === 'owned' ? 0 : activePrice * (closingCostBuyPct ?? 0),
    annualMortgage, ownershipMode, existingEquityDisplay, netSaleProceeds,
    buildingValue, annualDepreciation,
    // Summary metrics
    capRateYear1:   y1?.capRate,
    cocReturnYear1: y1?.cocReturn,
    dscrYear1:      y1?.dscr,
    noiYear1:       y1?.noi,
    cashFlowYear1:  y1?.annualCashFlow,
    equity5:        y5?.equity,
    equityFinal:    yN?.equity,
    saleProceeds:   yN?.saleProceeds,
    irr,
    holdingYears,
    years,
    irrCashFlows,
  }
}

// ─── Retirement contribution from property ───────────────────────────────────
// Monthly net cash flow from property that could be contributed to retirement accounts
export function propertyMonthlyContribution(analysis, mode) {
  if (mode === 'none') return 0
  const y1 = analysis.years[0]
  if (!y1) return 0
  if (mode === 'cashflow') return Math.max(0, y1.monthlyCashFlow)
  if (mode === 'half')     return Math.max(0, y1.monthlyCashFlow / 2)
  return 0
}

// ─── Formatting ──────────────────────────────────────────────────────────────
export const pct = (n, dec = 1) => isFinite(n) && n != null ? (n * 100).toFixed(dec) + '%' : '—'
export const fmtC = n => n != null && isFinite(n) ? '$' + Math.round(n).toLocaleString('en-CA') : '—'
export const fmtK = n => n != null && isFinite(n)
  ? (Math.abs(n) >= 1_000_000 ? '$' + (n/1_000_000).toFixed(1) + 'M' : '$' + Math.round(n/1000).toLocaleString('en-CA') + 'k')
  : '—'

// ─── Multi-unit / mixed-use engine extension ──────────────────────────────────

/**
 * Calculate annual gross income for a single unit.
 * type: 'residential' | 'commercial'
 * rateMode: 'persqft' | 'flat'
 * - residential + persqft: ratePerSqFt = monthly $/sqft → annual = sqft × rate × 12
 * - residential + flat:    flatMonthly = monthly rent → annual = flat × 12
 * - commercial + persqft:  ratePerSqFt = annual $/sqft → annual = sqft × rate
 * - commercial + flat:     flatMonthly = monthly rent → annual = flat × 12
 * camRecovery: annual CAM this unit pays back (commercial only)
 */
export function unitAnnualGross(unit, inflFactor = 1) {
  const { type = 'commercial', rateMode = 'persqft', sqft = 0,
          ratePerSqFt = 0, flatMonthly = 0, camPct = 0 } = unit

  let baseAnnual = 0
  if (rateMode === 'flat') {
    baseAnnual = (flatMonthly || 0) * 12
  } else {
    // persqft
    if (type === 'residential') {
      // residential: ratePerSqFt is monthly $/sqft
      baseAnnual = (sqft || 0) * (ratePerSqFt || 0) * 12
    } else {
      // commercial: ratePerSqFt is annual $/sqft
      baseAnnual = (sqft || 0) * (ratePerSqFt || 0)
    }
  }
  return baseAnnual * inflFactor
}

/**
 * Analyse a multi-unit / mixed-use property.
 * inputs.units: array of unit objects (see unitAnnualGross)
 * inputs.totalCAMMonthly: total building CAM (landlord's monthly cost)
 *   - Each commercial unit pays camPct% of this back as CAM recovery
 */
export function analysePropertyMulti(inputs) {
  const {
    propertyType  = 'commercial',  // 'residential' | 'commercial' | 'mixed'
    ownershipMode = 'buying',
    purchasePrice = 1_000_000,
    downPaymentPct = 0.25,         // fraction 0–1
    mortgageRate   = 0.065,
    mortgageTerm   = 25,
    currentMarketValue = 0,
    existingMortgageBal = 0,
    existingMortgageRate = 0.055,
    existingMortgageTerm = 20,
    units = [],                    // array of unit objects
    totalCAMMonthly = 0,           // building-wide monthly CAM cost
    defaultVacancyRate = 0.05,
    maintenanceReservePct = 0.02,
    managementFeePct = 0.08,
    propertyTaxRate = 0.015,
    insurance = 400 * 12,          // annual
    utilities = 300 * 12,          // annual
    miscExpenses = 200 * 12,       // annual
    rentalIncreaseRate = 0.03,
    propertyTaxIncrease = 0.02,
    utilitiesIncrease = 0.025,
    appreciationRate = 0.03,
    buildingToLandRatio = 0.70,
    closingCostBuyPct = 0.015,
    closingCostSellPct = 0.04,
    holdingYears = 10,
  } = inputs

  // ── Financing ────────────────────────────────────────────────────────────
  let loanAmount, totalCashIn, annualMortgage, effectivePurchasePrice
  if (ownershipMode === 'owned') {
    effectivePurchasePrice = currentMarketValue
    loanAmount             = existingMortgageBal
    totalCashIn            = Math.max(0, currentMarketValue - existingMortgageBal)
    annualMortgage         = monthlyPayment(existingMortgageBal, existingMortgageRate, existingMortgageTerm) * 12
  } else {
    effectivePurchasePrice = purchasePrice
    const down             = purchasePrice * downPaymentPct
    loanAmount             = purchasePrice - down
    const closingBuy       = purchasePrice * closingCostBuyPct
    totalCashIn            = down + closingBuy
    annualMortgage         = monthlyPayment(loanAmount, mortgageRate, mortgageTerm) * 12
  }

  const activeMortgageRate = ownershipMode === 'owned' ? existingMortgageRate : mortgageRate
  const activeMortgageTerm = ownershipMode === 'owned' ? existingMortgageTerm : mortgageTerm
  const activePrice        = effectivePurchasePrice
  const buildingValue      = activePrice * buildingToLandRatio
  const annualDepreciation = buildingValue / 27.5

  // ── Unit summary for display ─────────────────────────────────────────────
  const totalCommercialSqftSummary = units
    .filter(u => u.type === 'commercial')
    .reduce((s, u) => s + (u.rateMode === 'persqft' ? (u.sqft || 0) : 0), 0)

  const unitSummary = units.map(u => {
    const sqftShare = u.type === 'commercial' && totalCommercialSqftSummary > 0 && u.rateMode === 'persqft'
      ? (u.sqft || 0) / totalCommercialSqftSummary : 0
    return {
      ...u,
      annualGross: unitAnnualGross(u, 1),
      annualCAMRecovery: u.type === 'commercial'
        ? sqftShare * totalCAMMonthly * 12 : 0,
    }
  })

  const totalBuildingCAM = totalCAMMonthly * 12  // landlord's annual CAM cost

  // ── Year-by-year simulation ───────────────────────────────────────────────
  const years = []
  const irrCashFlows = [-totalCashIn]

  for (let yr = 1; yr <= holdingYears; yr++) {
    const inflFactor = Math.pow(1 + rentalIncreaseRate, yr - 1)

    // Gross scheduled income: sum across units
    // CAM recovery: split proportionally by commercial sqft (no per-unit % needed)
    const totalCommercialSqft = units
      .filter(u => u.type === 'commercial')
      .reduce((s, u) => s + (u.rateMode === 'persqft' ? (u.sqft || 0) : 0), 0)

    let grossScheduled = 0
    let camRecovery    = 0
    for (const u of units) {
      const vac = defaultVacancyRate
      const gross = unitAnnualGross(u, inflFactor)
      const vacLoss = gross * vac
      grossScheduled += gross - vacLoss
      // CAM recovery: commercial units share building CAM by sqft proportion
      if (u.type === 'commercial' && totalBuildingCAM > 0) {
        const unitSqft = u.rateMode === 'persqft' ? (u.sqft || 0) : 0
        // flat-rate commercial units: split equally among commercial units
        const flatCommercialUnits = units.filter(u2 => u2.type === 'commercial' && u2.rateMode === 'flat').length
        const sqftShare = totalCommercialSqft > 0
          ? unitSqft / totalCommercialSqft
          : u.rateMode === 'flat' && flatCommercialUnits > 0
            ? 1 / flatCommercialUnits
            : 0
        const camGross = sqftShare * totalBuildingCAM * inflFactor
        camRecovery += camGross * (1 - vac)
      }
    }

    const totalOperIncome = grossScheduled + camRecovery

    // Operating expenses
    const propTax       = activePrice * propertyTaxRate * Math.pow(1 + propertyTaxIncrease, yr - 1)
    const insur         = insurance
    const util          = utilities * Math.pow(1 + utilitiesIncrease, yr - 1)
    const misc          = miscExpenses * Math.pow(1 + 0.04, yr - 1)
    const cam           = totalBuildingCAM * inflFactor   // landlord pays full CAM
    const maintRes      = grossScheduled * maintenanceReservePct
    const mgmtFee       = totalOperIncome * managementFeePct
    const totalOpEx     = propTax + insur + util + misc + cam + maintRes + mgmtFee

    const noi           = totalOperIncome - totalOpEx
    const propValue     = activePrice * Math.pow(1 + appreciationRate, yr)
    const capRate       = noi / propValue

    const mortBal       = mortgageBalance(loanAmount, activeMortgageRate, activeMortgageTerm, yr * 12)
    const mortInterest  = annualInterest(loanAmount, activeMortgageRate, activeMortgageTerm, yr)
    const principalPaydown = annualMortgage - mortInterest
    const annualCashFlow   = noi - annualMortgage
    const monthlyCashFlow  = annualCashFlow / 12
    const cocReturn     = totalCashIn > 0 ? annualCashFlow / totalCashIn : 0
    const dscr          = annualMortgage > 0 ? noi / annualMortgage : null
    const equity        = propValue - mortBal
    const saleProceeds  = propValue * (1 - closingCostSellPct) - mortBal

    years.push({
      year: yr, grossScheduled, camRecovery, totalOperIncome,
      propTax, insur, util, misc, cam, maintRes, mgmtFee, totalOpEx,
      noi, annualMortgage, mortInterest, principalPaydown,
      annualCashFlow, monthlyCashFlow, mortBal, propValue,
      equity, capRate, cocReturn, dscr, saleProceeds,
      taxBenefitDepreciation: annualDepreciation, taxBenefitInterest: mortInterest,
    })

    irrCashFlows.push(yr === holdingYears ? annualCashFlow + saleProceeds : annualCashFlow)
  }

  let cumulative = 0
  years.forEach(y => { cumulative += y.annualCashFlow; y.cumulativeCashFlow = cumulative })

  const irr = calcIRR(irrCashFlows)
  const y1  = years[0]
  const yN  = years[years.length - 1]

  return {
    propertyType, units: unitSummary, totalCashIn, loanAmount, annualMortgage,
    purchasePrice: activePrice, buildingValue, annualDepreciation,
    capRateYear1: y1?.capRate, cocReturnYear1: y1?.cocReturn,
    dscrYear1: y1?.dscr, noiYear1: y1?.noi, cashFlowYear1: y1?.annualCashFlow,
    equityFinal: yN?.equity, saleProceeds: yN?.saleProceeds,
    irr, holdingYears, years, irrCashFlows,
  }
}
