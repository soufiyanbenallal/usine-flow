import { describe, expect, it } from 'vitest'
import { allocateJointCost, operationCost, purchasePriceVariance, totalCost, varianceAnalysis } from './costing'

describe('costing', () => {
  it('reproduces the guide example (118.40 → 126.75, +7.1 %)', () => {
    const standard = { material: 1000, labor: 100, machine: 50, overhead: 34, subcontract: 0 } // 1184 for 10 units
    const actual = { material: 1042, labor: 119, machine: 62.5, overhead: 44, subcontract: 0 } // 1267.5 for 10 units
    expect(totalCost(standard)).toBe(1184)
    const v = varianceAnalysis(standard, actual, 10)
    expect(v.standardUnit).toBe(118.4)
    expect(v.actualUnit).toBe(126.75)
    expect(v.variance).toBe(8.35)
    expect(v.variancePct).toBe(7.1)
    expect(v.material).toBe(4.2)
    expect(v.labor).toBe(1.9)
    expect(v.machine).toBe(1.25)
    expect(v.other).toBe(1)
  })
  it('handles zero production safely', () => {
    expect(varianceAnalysis({ material: 1, labor: 0, machine: 0, overhead: 0, subcontract: 0 }, { material: 2, labor: 0, machine: 0, overhead: 0, subcontract: 0 }, 0).actualUnit).toBe(0)
  })
  it('computes purchase price variance', () => {
    expect(purchasePriceVariance(10.5, 10, 200)).toBe(100)
    expect(purchasePriceVariance(9.5, 10, 200)).toBe(-100)
  })
  it('costs an operation from run time and hourly rates', () => {
    expect(operationCost(90, { machinePerHour: 60, laborPerHour: 30, laborCount: 2, overheadPct: 10 })).toEqual({ labor: 90, machine: 90, overhead: 18 })
  })
  it('allocates joint costs without losing a centime', () => {
    const a = allocateJointCost(100, [{ id: 'a', value: 1 }, { id: 'b', value: 1 }, { id: 'c', value: 1 }])
    expect([...a.values()].reduce((x, y) => x + y, 0)).toBeCloseTo(100, 2)
    expect(allocateJointCost(50, [{ id: 'a', value: 0 }]).get('a')).toBe(50)
  })
})
