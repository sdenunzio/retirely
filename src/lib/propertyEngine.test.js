import { describe, it, expect } from 'vitest'
import {
  canadianMonthlyRate,
  monthlyPayment,
  mortgageBalance,
  calcIRR,
  analyseProperty,
} from './propertyEngine.js'

describe('Canadian mortgage rate conversion', () => {
  it('converts a semi-annually compounded annual rate to its monthly equivalent', () => {
    // (1 + monthly)^12 must equal (1 + r/2)^2
    const r = 0.06
    const m = canadianMonthlyRate(r)
    expect(Math.pow(1 + m, 12)).toBeCloseTo(Math.pow(1 + r / 2, 2), 10)
  })

  it('returns zero for a zero rate', () => {
    expect(canadianMonthlyRate(0)).toBe(0)
  })
})

describe('mortgage payment & balance', () => {
  it('amortizes a zero-interest loan linearly', () => {
    // 120,000 over 10 years (120 months) at 0% => 1,000/month
    expect(monthlyPayment(120000, 0, 10)).toBeCloseTo(1000, 6)
  })

  it('charges more than the principal/term for an interest-bearing loan', () => {
    const pmt = monthlyPayment(500000, 5, 25)
    expect(pmt).toBeGreaterThan(500000 / (25 * 12))
  })

  it('leaves the full principal outstanding at month zero and pays it down over time', () => {
    const principal = 300000
    expect(mortgageBalance(principal, 5, 25, 0)).toBeCloseTo(principal, 6)
    const after5yr = mortgageBalance(principal, 5, 25, 60)
    expect(after5yr).toBeGreaterThan(0)
    expect(after5yr).toBeLessThan(principal)
  })

  it('never returns a negative balance past the amortization period', () => {
    expect(mortgageBalance(120000, 0, 10, 200)).toBe(0)
  })
})

describe('IRR solver', () => {
  it('finds the rate where a known cash-flow stream has ~zero NPV', () => {
    // -1000 now, +1100 in one year => 10% IRR
    const irr = calcIRR([-1000, 1100])
    expect(irr).toBeCloseTo(0.1, 4)
  })

  it('solves a multi-year stream', () => {
    // -1000, then 500, 500, 500 => IRR ~23.4%
    const irr = calcIRR([-1000, 500, 500, 500])
    expect(irr).toBeGreaterThan(0.2)
    expect(irr).toBeLessThan(0.27)
  })
})

describe('analyseProperty (buying mode)', () => {
  const inputs = {
    ownershipMode: 'buying',
    purchasePrice: 1000000,
    downPaymentPct: 0.25,
    mortgageRate: 5,
    mortgageTerm: 25,
    sqFootage: 5000,
    rentPerSqFt: 24,
    sharedCAM: 0,
    vacancyRate: 0.05,
    maintenanceReservePct: 0.05,
    managementFeePct: 0.05,
    propertyTaxRate: 0.01,
    insurance: 5000,
    utilities: 6000,
    miscExpenses: 2000,
    rentalIncreaseRate: 0.03,
    propertyTaxIncrease: 0.02,
    utilitiesIncrease: 0.02,
    appreciationRate: 0.03,
    buildingToLandRatio: 0.7,
    closingCostBuyPct: 0.015,
    closingCostSellPct: 0.05,
    holdingYears: 10,
  }

  it('produces one projection row per holding year', () => {
    const out = analyseProperty(inputs)
    expect(out.years).toHaveLength(10)
  })

  it('computes the cash invested from down payment plus closing costs', () => {
    const out = analyseProperty(inputs)
    // 25% down (250k) + 1.5% closing (15k) = 265k
    expect(out.totalCashIn).toBeCloseTo(265000, 0)
    expect(out.loanAmount).toBeCloseTo(750000, 0)
  })

  it('returns headline metrics (cap rate, IRR) as finite numbers', () => {
    const out = analyseProperty(inputs)
    expect(Number.isFinite(out.capRateYear1)).toBe(true)
    expect(out.irr === null || Number.isFinite(out.irr)).toBe(true)
    expect(out.holdingYears).toBe(10)
  })
})
