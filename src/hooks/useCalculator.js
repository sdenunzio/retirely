import { useState, useCallback, useMemo } from 'react'
import { growToRetirement, growToRetirementYearly, runScenario, buildScenarios, runMonteCarlo, calcFIRE } from '../lib/engine.js'
import { analyseProperty } from '../lib/propertyEngine.js'
import { loadSaved, usePersistence } from './usePersistence.js'

const PERSON_DEFAULTS = {
  currentAge: 40, retirementAge: 65, lifeExpectancy: 90,
  annualIncome: 100000,
  rrsp: 200000, tfsa: 50000, nonReg: 20000, lira: 0, spousalRrsp: 0, monthlyContrib: 1500,
  cppMonthly65: 800, oasStartAge: 65,
  // DB pension
  dbPensionEnabled: false,
  dbPensionMonthly: 0,       // monthly amount at retirement date
  dbPensionIndexed: 'none',  // 'none' | 'half' | 'full'
  dbPensionBridge: 0,        // extra monthly bridge until age 65
  dbPensionSurvivor: 60,     // % to survivor (0–100), only relevant in couple mode
  // Other income (part-time, gig, rental, etc.)
  otherIncomeMonthly: 0,     // monthly amount during retirement
  otherIncomeTaxable: true,  // whether it counts as taxable income
}
const SPOUSE_DEFAULTS = {
  currentAge: 38, retirementAge: 65, lifeExpectancy: 92,
  annualIncome: 80000,
  rrsp: 100000, tfsa: 30000, nonReg: 10000, lira: 0, spousalRrsp: 0, monthlyContrib: 1000,
  cppMonthly65: 650, oasStartAge: 65,
  dbPensionEnabled: false,
  dbPensionMonthly: 0,
  dbPensionIndexed: 'none',
  dbPensionBridge: 0,
  dbPensionSurvivor: 60,
  otherIncomeMonthly: 0,
  otherIncomeTaxable: true,
}
const SHARED_DEFAULTS = {
  province: 'ON', preReturnRate: 6, postReturnRate: 4, inflationRate: 2.5,
  annualSpending: 70000, windfall: 0, windfallAge: 70,
  // Retirement budget planner
  budget: {
    enabled: false,
    mode: 'reference',   // 'reference' = show only  |  'override' = replace annualSpending
    items: [
      { id: 'housing',      label: 'Housing / rent',        monthly: 2000, emoji: '🏠', included: true },
      { id: 'property_tax', label: 'Property tax',          monthly: 400,  emoji: '🏛', included: true },
      { id: 'maintenance',  label: 'Home maintenance',      monthly: 250,  emoji: '🔧', included: true },
      { id: 'utilities',    label: 'Utilities',             monthly: 300,  emoji: '💡', included: true },
      { id: 'groceries',    label: 'Groceries',             monthly: 800,  emoji: '🛒', included: true },
      { id: 'dining',       label: 'Dining & entertainment',monthly: 400,  emoji: '🍽', included: true },
      { id: 'transport',    label: 'Transportation',        monthly: 350,  emoji: '🚗', included: true },
      { id: 'health',       label: 'Healthcare & meds',     monthly: 200,  emoji: '💊', included: true },
      { id: 'travel',       label: 'Travel & holidays',     monthly: 500,  emoji: '✈', included: true },
      { id: 'clothing',     label: 'Clothing & personal',   monthly: 150,  emoji: '👔', included: true },
      { id: 'subscriptions',label: 'Subscriptions & tech',  monthly: 100,  emoji: '📱', included: true },
      { id: 'gifts',        label: 'Gifts & charitable',    monthly: 150,  emoji: '🎁', included: true },
      { id: 'other',        label: 'Other / miscellaneous', monthly: 200,  emoji: '📦', included: true },
    ]
  },
  coupleMode: false,
  // Home downsize — uses primaryHomeValue as the property being sold
  homeEnabled: false, homeDownsizeAge: 70, homeKeepPct: 50,
  homeAppreciationRate: 3,
  homeClosingCostPct: 5,
  homeMortgageRemaining: 300000,
  homeMortgageRate: 5.5,
  homeMortgageTerm: 20,
  homeDownsizeMode: 'invest',      // 'invest' | 'purchase' | 'rent'
  homeNewPurchasePrice: 500000,
  homeRentMonthly: 2500,
  homePrincipalResidenceExempt: true,
  homeOriginalCost: 400000,
  homeNonExemptPct: 0,
  // Primary residence
  primaryHomeEnabled: false, primaryHomeValue: 1000000, primaryHomeMortgage: 400000,
  primaryHomeMortgageRate: 5.5,
  primaryHomeMortgageTerm: 20,
  primaryHomeAppreciationRate: 3,
  reverseMortgageEnabled: false, reverseMortgageMonthly: 1500,
  reverseMortgageRate: 6.59,
  reverseMortgageStartAge: 65,
  // RRSP meltdown
  rrspMeltdownEnabled: false, rrspMeltdownAnnual: 10000,
  // Monte Carlo
  mcEnabled: false, mcStdDev: 10, mcSimCount: 1000,
  // FIRE
  fireSwr: 0.04,
}

// Canadian mortgage helper
function mortgageBalanceAtMonth(principal, annualPct, termYears, monthsPaid) {
  if (!principal || principal <= 0) return 0
  const r = Math.pow(1 + annualPct / 200, 1/6) - 1
  const n = termYears * 12
  if (r === 0 || n === 0) return Math.max(0, principal - (principal / Math.max(1,n)) * monthsPaid)
  const pmt = principal * (r * Math.pow(1+r,n)) / (Math.pow(1+r,n)-1)
  const bal = principal * Math.pow(1+r, monthsPaid) - pmt*(Math.pow(1+r,monthsPaid)-1)/r
  return Math.max(0, bal)
}

export function useCalculator() {
  const _saved = loadSaved()
  const [person, setPerson]   = useState(_saved?.person        ?? PERSON_DEFAULTS)
  const [spouse, setSpouse]   = useState(_saved?.spouse        ?? SPOUSE_DEFAULTS)
  const [shared, setShared]   = useState(_saved?.shared        ?? SHARED_DEFAULTS)
  const [hasRun, setHasRun]   = useState(false)
  const [mcRunning, setMcRunning] = useState(false)
  const [propertyState, setPropertyState] = useState(_saved?.propertyState ?? null)

  const persistence = usePersistence({
    person, spouse, shared, propertyState,
    setPerson, setSpouse, setShared, setPropertyState,
  })

  const setPField  = useCallback((k, v) => setPerson(p => ({ ...p, [k]: v })), [])
  const setSField  = useCallback((k, v) => setSpouse(s => ({ ...s, [k]: v })), [])
  const setShField = useCallback((k, v) => setShared(s => ({ ...s, [k]: v })), [])

  const results = useMemo(() => {
    if (!hasRun) return null
    const { province, preReturnRate, postReturnRate, inflationRate,
            annualSpending, windfall, windfallAge, coupleMode } = shared

    // ── Property cash flow ────────────────────────────────────────────────────
    const prop = (propertyState && !propertyState._wizard) ? propertyState : null
    let propMonthlyContrib   = 0
    let propSellWindfall     = 0
    let propSellAge          = 0
    const propCashflowByYear = {}

    if (prop) {
      try {
        const propAnalysis = analyseProperty(prop)
        const mode = prop.retireContribMode || 'none'
        if (mode !== 'none') {
          const factor = mode === 'half' ? 0.5 : 1.0
          const yearsOwnedAtRet = Math.max(0, person.retirementAge - person.currentAge)
          propAnalysis.years.forEach(y => {
            propCashflowByYear[y.year] = Math.max(0, y.annualCashFlow) * factor
          })
          const preRetYears = propAnalysis.years.filter(y => y.year <= yearsOwnedAtRet && y.annualCashFlow > 0)
          if (preRetYears.length > 0) {
            propMonthlyContrib = preRetYears.reduce((s,y) => s + y.annualCashFlow*factor, 0) / preRetYears.length / 12
          }
        }
        if (prop.sellEnabled && prop.sellAge) {
          const ownershipYears = Math.max(1, prop.sellAge - person.currentAge)
          const yrData = propAnalysis.years[Math.min(ownershipYears-1, propAnalysis.years.length-1)]
          if (yrData) { propSellWindfall = Math.max(0, yrData.saleProceeds); propSellAge = prop.sellAge }
        }
      } catch(e) { /* ignore */ }
    }

    // ── Growth to retirement ──────────────────────────────────────────────────
    const yearsToRetP = Math.max(person.retirementAge - person.currentAge, 0)
    // P1 receives spousal RRSP contributed by P2 (held in P1's name) — grows as RRSP
    const p1SpousalReceived = coupleMode ? (spouse?.spousalRrsp || 0) : 0
    const grownP = growToRetirement({
      rrsp: person.rrsp + p1SpousalReceived,
      tfsa: person.tfsa, nr: person.nonReg,
      monthly: person.monthlyContrib + propMonthlyContrib,
      years: yearsToRetP, annualRate: preReturnRate,
    })
    // Grow LIRA separately — stays as LIF with its own min/max rules in the engine
    const liraReturnFactor = Math.pow(1 + preReturnRate / 100, yearsToRetP)
    const grownLIFP = (person.lira || 0) * liraReturnFactor

    let grownS = null
    let grownLIFS = 0
    if (coupleMode) {
      const yearsToRetS = Math.max(spouse.retirementAge - spouse.currentAge, 0)
      // P2 receives spousal RRSP contributed by P1 (held in P2's name) — grows as RRSP
      const p2SpousalReceived = person.spousalRrsp || 0
      grownS = growToRetirement({
        rrsp: spouse.rrsp + p2SpousalReceived,
        tfsa: spouse.tfsa, nr: spouse.nonReg,
        monthly: spouse.monthlyContrib, years: yearsToRetS, annualRate: preReturnRate,
      })
      // Grow spouse LIRA separately
      const yearsToRetS2 = Math.max(spouse.retirementAge - spouse.currentAge, 0)
      const liraReturnFactorS = Math.pow(1 + preReturnRate / 100, yearsToRetS2)
      grownLIFS = (spouse.lira || 0) * liraReturnFactorS
    }

    // ── Year-by-year accumulation snapshots ─────────────────────────────────────
    const accP = growToRetirementYearly({
      rrsp: person.rrsp + p1SpousalReceived,
      tfsa: person.tfsa, nr: person.nonReg,
      lif: person.lira || 0,
      monthly: person.monthlyContrib + propMonthlyContrib,
      years: yearsToRetP, annualRate: preReturnRate,
    })
    const accS = coupleMode ? growToRetirementYearly({
      rrsp: spouse.rrsp + (person.spousalRrsp || 0),
      tfsa: spouse.tfsa, nr: spouse.nonReg,
      lif: spouse.lira || 0,
      monthly: spouse.monthlyContrib,
      years: Math.max(spouse.retirementAge - spouse.currentAge, 0),
      annualRate: preReturnRate,
    }) : null

    const simRetAge  = coupleMode ? Math.min(person.retirementAge, spouse.retirementAge) : person.retirementAge
    const simLifeExp = coupleMode ? Math.max(person.lifeExpectancy, spouse.lifeExpectancy) : person.lifeExpectancy

    // ── Reverse mortgage ──────────────────────────────────────────────────────
    const reverseMortgageAnnual = (shared.primaryHomeEnabled && shared.reverseMortgageEnabled)
      ? shared.reverseMortgageMonthly * 12 : 0

    // ── Home downsize — full calculation ─────────────────────────────────────
    let homeProceeds    = 0
    let homeRentExtra   = 0
    let homeRentStartAge = 0
    if (shared.homeEnabled) {
      const yearsUntilSale = Math.max(0, shared.homeDownsizeAge - person.currentAge)
      // Appreciate from today's primary home value (same property)
      const baseValue  = shared.primaryHomeEnabled ? shared.primaryHomeValue : 800000
      const saleValue  = baseValue * Math.pow(1 + (shared.primaryHomeAppreciationRate ?? 3)/100, yearsUntilSale)
      const closing    = saleValue * ((shared.homeClosingCostPct ?? 5) / 100)
      const mortBal    = mortgageBalanceAtMonth(
        shared.homeMortgageRemaining ?? 0, shared.homeMortgageRate ?? 5.5,
        shared.homeMortgageTerm ?? 20, yearsUntilSale * 12
      )
      // Capital gains
      let cgTax = 0
      const nonExemptFrac = (shared.homeNonExemptPct ?? 0) / 100
      if (!shared.homePrincipalResidenceExempt || nonExemptFrac > 0) {
        const gain = Math.max(0, saleValue - (shared.homeOriginalCost ?? 0))
        const taxableGain = gain * nonExemptFrac
        const inc = Math.min(taxableGain, 250000)*0.5 + Math.max(0, taxableGain-250000)*0.6667
        cgTax = inc * 0.43  // approximate marginal rate
      }
      const netSale = Math.max(0, saleValue - closing - mortBal - cgTax)

      if (shared.homeDownsizeMode === 'purchase') {
        homeProceeds = Math.max(0, netSale - (shared.homeNewPurchasePrice ?? 0))
      } else if (shared.homeDownsizeMode === 'rent') {
        homeProceeds = netSale
        homeRentExtra = (shared.homeRentMonthly ?? 0) * 12
        homeRentStartAge = shared.homeDownsizeAge
      } else {
        homeProceeds = Math.round(netSale * (shared.homeKeepPct / 100))
      }
    }

    const primaryParams = {
      startRRSP: grownP.rrsp, startTFSA: grownP.tfsa, startNR: grownP.nr,
      startLIF: grownLIFP,   // LIRA grown to retirement separately
      startSpousalRrsp: 0,   // already included in grownP.rrsp
      rrspMeltdownAnnual: shared.rrspMeltdownEnabled ? (shared.rrspMeltdownAnnual || 0) : 0,
      dbPensionEnabled: person.dbPensionEnabled ?? false,
      dbPensionMonthly: person.dbPensionMonthly ?? 0,
      dbPensionIndexed: person.dbPensionIndexed ?? 'none',
      dbPensionBridge:  person.dbPensionBridge ?? 0,
      otherIncomeMonthly: person.otherIncomeMonthly ?? 0,
      otherIncomeTaxable: person.otherIncomeTaxable ?? true,
      retAge: simRetAge, lifeExp: simLifeExp, spending: annualSpending,
      cppMonthly65: person.cppMonthly65, oasBaseAge: person.oasStartAge,
      inflation: inflationRate, postReturnRate, windfall, windfallAge,
      homeProceeds,
      homeAge: shared.homeEnabled ? shared.homeDownsizeAge : 0,
      homeRentExtra, homeRentStartAge,
      reverseMortgageAnnual,
      propSellWindfall, propSellAge,
      propCashflowByYear,
      propCurrentAge: person.currentAge,
      province,
    }

    const spouseSimParams = coupleMode && grownS ? {
      startRRSP: grownS.rrsp, startTFSA: grownS.tfsa, startNR: grownS.nr,
      startLIF: coupleMode ? (grownLIFS || 0) : 0,   // spouse LIRA grown to retirement
      retAge: simRetAge, lifeExp: simLifeExp,
      cppMonthly65: spouse.cppMonthly65, oasStartAge: spouse.oasStartAge,
      dbPensionEnabled: spouse.dbPensionEnabled ?? false,
      dbPensionMonthly: spouse.dbPensionMonthly ?? 0,
      dbPensionIndexed: spouse.dbPensionIndexed ?? 'none',
      dbPensionBridge:  spouse.dbPensionBridge  ?? 0,
      otherIncomeMonthly: spouse.otherIncomeMonthly ?? 0,
      otherIncomeTaxable: spouse.otherIncomeTaxable ?? true,
    } : null

    const scenarios = buildScenarios(person.oasStartAge)
      .filter(s => !s.couplesOnly || coupleMode)
    const scenarioResults = scenarios.map(s => ({
      ...s, result: runScenario(primaryParams, s, spouseSimParams),
    }))

    // P1 today includes LIRA + spousal RRSP received from P2 (spouse.spousalRrsp)
    const totalTodayP = person.rrsp + person.tfsa + person.nonReg + (person.lira || 0) + (coupleMode ? (spouse?.spousalRrsp || 0) : 0)
    // P2 today includes LIRA + spousal RRSP received from P1 (person.spousalRrsp)
    const totalTodayS = coupleMode ? spouse.rrsp + spouse.tfsa + spouse.nonReg + (spouse.lira || 0) + (person.spousalRrsp || 0) : 0

    const windfallDisplay = windfall > 0 ? windfall : 0
    const primaryHomeEquityDisplay = shared.primaryHomeEnabled
      ? Math.max(0, shared.primaryHomeValue - shared.primaryHomeMortgage) : 0

    const projAtRetP = grownP.rrsp + grownP.tfsa + grownP.nr + (grownLIFP || 0) + windfallDisplay + homeProceeds + propSellWindfall
    const projAtRetS = grownS ? grownS.rrsp + grownS.tfsa + grownS.nr + (grownLIFS || 0) : 0

    const fireResult = calcFIRE({
      currentAge:    person.currentAge,
      currentAssets: totalTodayP + totalTodayS,
      monthlyContrib: person.monthlyContrib + (coupleMode ? spouse.monthlyContrib : 0),
      preReturnRate,
      spending:       annualSpending,
      cppMonthly65:   person.cppMonthly65 + (coupleMode ? spouse.cppMonthly65 : 0),
      oasAnnual:      8618 * (coupleMode ? 2 : 1),
      cppStartAge: 65, oasStartAge: person.oasStartAge,
      swr: shared.fireSwr,
    })

    return {
      totalToday: totalTodayP + totalTodayS, totalTodayP, totalTodayS,
      projAtRet: projAtRetP + projAtRetS, projAtRetP, projAtRetS,
      accP, accS,
      coupleMode, scenarios: scenarioResults,
      primaryParams, spouseSimParams,
      fire: fireResult,
      primaryHomeEquity: primaryHomeEquityDisplay,
      propMonthlyContrib,
    }
  }, [person, spouse, shared, hasRun, propertyState])

  const [mcResults, setMcResults] = useState(null)

  const runMC = useCallback(() => {
    if (!results) return
    setMcRunning(true)
    setMcResults(null)
    setTimeout(() => {
      const { primaryParams, spouseSimParams, scenarios } = results
      const bestScenario = scenarios.reduce((best, s) => {
        const bd = best.result.depletedAge ?? 999
        const sd = s.result.depletedAge ?? 999
        return sd > bd ? s : best
      }, scenarios[0])
      const mc = runMonteCarlo({
        params: primaryParams, strategy: bestScenario,
        spouseParams: spouseSimParams,
        simCount: shared.mcSimCount, stdDev: shared.mcStdDev,
      })
      setMcResults({ ...mc, scenarioLabel: bestScenario.label, color: bestScenario.color })
      setMcRunning(false)
    }, 30)
  }, [results, shared.mcSimCount, shared.mcStdDev])

  const calculate = useCallback(() => { setHasRun(true); setMcResults(null) }, [])

  const reset = useCallback(() => {
    setPerson(PERSON_DEFAULTS)
    setSpouse(SPOUSE_DEFAULTS)
    setShared(SHARED_DEFAULTS)
    setHasRun(false)
    setMcResults(null)
    setPropertyState(null)
    persistence.clearSaved()
  }, [persistence])

  return {
    person, spouse, shared,
    setPerson, setSpouse, setShared,
    setPField, setSField, setShField,
    results, calculate,
    mcResults, mcRunning, runMC,
    reset,
    propertyState, setPropertyState,
    persistence,
  }
}
