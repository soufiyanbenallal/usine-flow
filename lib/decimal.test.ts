import { describe, expect, it } from 'vitest'
import { D, add, documentTotals, lineTotal, marginPct, mul, pct, round } from './decimal'

describe('decimal math', () => {
  it('has no floating point drift', () => {
    expect(0.1 + 0.2).not.toBe(0.3)
    expect(add(0.1, 0.2).toNumber()).toBe(0.3)
    expect(mul('19.99', 3).toNumber()).toBe(59.97)
  })
  it('treats empty values as zero', () => {
    expect(D(null).toNumber()).toBe(0)
    expect(D('').toNumber()).toBe(0)
  })
  it('rounds half up', () => {
    expect(round('1.005', 2).toNumber()).toBe(1.01)
    expect(round('2.5', 0).toNumber()).toBe(3)
  })
  it('computes line totals and document totals like the SQL triggers', () => {
    expect(lineTotal({ quantity: 10, unitPrice: 500, discountPct: 10 }).toNumber()).toBe(4500)
    expect(documentTotals([{ quantity: 10, unitPrice: 500, vatRate: 20 }, { quantity: 3, unitPrice: '19.99', vatRate: 10 }])).toEqual({ subtotal: 5059.97, tax: 1006, total: 6065.97 })
  })
  it('computes percentages and margins safely', () => {
    expect(pct(1, 3).toNumber()).toBe(33.3)
    expect(pct(1, 0).toNumber()).toBe(0)
    expect(marginPct(200, 150).toNumber()).toBe(25)
  })
})
