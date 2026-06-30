import { describe, it, expect } from 'vitest'
import {
  approxTax,
  marginalRate,
  effectiveRate,
  oasClawback,
  rrifMinimum,
  lifMaximum,
  growToRetirement,
  growToRetirementYearly,
  cppAdjustment,
  oasAdjustment,
  calcFIRE,
  buildScenarios,
  runScenario,
} from './engine.js'

describe('income tax', () => {
  it('is zero for non-positive income', () => {
    expect(approxTax(0)).toBe(0)
    expect(approxTax(-5000)).toBe(0)
  })

  it('is positive and increases with income', () => {
    const low = approxTax(40000, 'ON')
    const high = approxTax(120000, 'ON')
    expect(low).toBeGreaterThan(0)
    expect(high).toBeGreaterThan(low)
  })

  it('varies by province for the same income', () => {
    expect(approxTax(80000, 'ON')).not.toBeCloseTo(approxTax(80000, 'AB'), 0)
  })

  it('marginal rate is non-decreasing across brackets and exceeds the effective rate', () => {
    expect(marginalRate(150000, 'ON')).toBeGreaterThan(marginalRate(30000, 'ON'))
    expect(marginalRate(80000, 'ON')).toBeGreaterThan(effectiveRate(80000, 'ON'))
  })
})

describe('OAS clawback', () => {
  const OAS = 8618

  it('is zero at or below the income threshold', () => {
    expect(oasClawback(90997, OAS)).toBe(0)
    expect(oasClawback(50000, OAS)).toBe(0)
  })

  it('claws back 15 cents per dollar above the threshold', () => {
    // 10,000 over the 90,997 threshold * 0.15 = 1,500
    expect(oasClawback(100997, OAS)).toBeCloseTo(1500, 6)
  })

  it('never exceeds the OAS benefit amount', () => {
    expect(oasClawback(500000, OAS)).toBe(OAS)
  })
})

describe('RRIF minimum withdrawal', () => {
  it('is zero before age 71', () => {
    expect(rrifMinimum(500000, 65)).toBe(0)
    expect(rrifMinimum(500000, 70)).toBe(0)
  })

  it('uses the CRA factor at 71 (5.28%)', () => {
    expect(rrifMinimum(100000, 71)).toBeCloseTo(5280, 6)
  })

  it('caps the factor at the age-95 rate (20%)', () => {
    expect(rrifMinimum(100000, 95)).toBeCloseTo(20000, 6)
    expect(rrifMinimum(100000, 110)).toBeCloseTo(20000, 6)
  })
})

describe('LIF maximum withdrawal', () => {
  it('is zero before age 55', () => {
    expect(lifMaximum(100000, 50)).toBe(0)
  })

  it('uses the published factor at 65 (8.21%)', () => {
    expect(lifMaximum(100000, 65)).toBeCloseTo(8210, 6)
  })

  it('unlocks fully at age 90+', () => {
    expect(lifMaximum(100000, 90)).toBeCloseTo(100000, 6)
    expect(lifMaximum(100000, 99)).toBeCloseTo(100000, 6)
  })
})

describe('pre-retirement accumulation', () => {
  it('returns the starting balances unchanged when years is zero', () => {
    const out = growToRetirement({ rrsp: 1000, tfsa: 500, nr: 250, monthly: 100, years: 0, annualRate: 6 })
    expect(out).toEqual({ rrsp: 1000, tfsa: 500, nr: 250 })
  })

  it('grows balances over time with contributions', () => {
    const out = growToRetirement({ rrsp: 10000, tfsa: 0, nr: 0, monthly: 500, years: 10, annualRate: 6 })
    const total = out.rrsp + out.tfsa + out.nr
    const contributed = 10000 + 500 * 12 * 10
    expect(total).toBeGreaterThan(contributed) // growth on top of contributions
  })

  it('distributes contributions across accounts when all start at zero', () => {
    const out = growToRetirement({ rrsp: 0, tfsa: 0, nr: 0, monthly: 300, years: 1, annualRate: 0 })
    // even split, no growth
    expect(out.rrsp).toBeCloseTo(1200, 0)
    expect(out.tfsa).toBeCloseTo(1200, 0)
    expect(out.nr).toBeCloseTo(1200, 0)
  })

  it('produces one yearly snapshot per year with consistent totals', () => {
    const snaps = growToRetirementYearly({ rrsp: 10000, tfsa: 5000, nr: 0, monthly: 200, years: 5, annualRate: 5 })
    expect(snaps).toHaveLength(5)
    const last = snaps[4]
    expect(last.year).toBe(5)
    expect(last.total).toBe(last.rrsp + last.tfsa + last.nr + last.lif)
    expect(last.growth).toBe(last.total - last.contributed)
  })
})

describe('CPP / OAS timing adjustments', () => {
  it('applies no adjustment at age 65', () => {
    expect(cppAdjustment(65)).toBe(1)
    expect(oasAdjustment(65)).toBe(1)
  })

  it('reduces CPP for early claiming (7.2%/yr) with a 0.4 floor', () => {
    expect(cppAdjustment(60)).toBeCloseTo(0.64, 5)
    expect(cppAdjustment(55)).toBe(0.4) // floor, not 0.28
  })

  it('boosts deferred CPP (8.4%/yr) and OAS (7.2%/yr)', () => {
    expect(cppAdjustment(70)).toBeCloseTo(1.42, 5)
    expect(oasAdjustment(70)).toBeCloseTo(1.36, 5)
  })
})

describe('FIRE projection', () => {
  it('derives the FIRE number from spending and the safe withdrawal rate', () => {
    const fire = calcFIRE({
      currentAge: 40, currentAssets: 100000, monthlyContrib: 2000, preReturnRate: 6,
      spending: 40000, cppMonthly65: 800, oasAnnual: 8618, cppStartAge: 65, oasStartAge: 65, swr: 0.04,
    })
    expect(fire.fireNumber).toBeCloseTo(1000000, 6) // 40000 / 0.04
    expect(fire.leanFireNumber).toBeLessThan(fire.fireNumber)
    expect(fire.progress).toBe(10) // 100k / 1M
    expect(fire.fireAge).toBeGreaterThan(40)
  })

  it('reports zero time-to-FIRE when assets already exceed the target', () => {
    const fire = calcFIRE({
      currentAge: 50, currentAssets: 2000000, monthlyContrib: 0, preReturnRate: 5,
      spending: 40000, cppMonthly65: 800, oasAnnual: 8618, cppStartAge: 65, oasStartAge: 65, swr: 0.04,
    })
    expect(fire.monthsToFire).toBe(0)
    expect(fire.progress).toBe(100)
  })
})

describe('scenario definitions', () => {
  it('returns the five named strategies', () => {
    const ids = buildScenarios(65).map(s => s.id)
    expect(ids).toEqual(['standard', 'early', 'delay', 'gis', 'equalise'])
  })

  it('marks income equalisation as couples-only', () => {
    const equalise = buildScenarios(65).find(s => s.id === 'equalise')
    expect(equalise.couplesOnly).toBe(true)
    expect(equalise.equalise).toBe(true)
  })
})

describe('runScenario (drawdown integration)', () => {
  const params = {
    startRRSP: 400000, startTFSA: 100000, startNR: 50000,
    retAge: 65, lifeExp: 90, spending: 60000,
    cppMonthly65: 800, oasBaseAge: 65,
    inflation: 2.5, postReturnRate: 4, windfall: 0, windfallAge: 70,
    province: 'ON',
  }
  const standard = buildScenarios(65).find(s => s.id === 'standard')

  it('simulates one row per retirement year and returns a tax total', () => {
    const result = runScenario(params, standard)
    expect(result.yearData).toHaveLength(90 - 65) // 25 years
    expect(result.totalTax).toBeGreaterThan(0)
    expect(result.label).toBe(standard.label)
  })

  it('exposes longevity and estate summary fields', () => {
    const result = runScenario(params, standard)
    expect(result).toHaveProperty('depletedAge')
    expect(result).toHaveProperty('estateValue')
    expect(result.yearData[0].age).toBe(65)
  })
})
