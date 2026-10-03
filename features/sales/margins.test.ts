import { describe, expect, it } from 'vitest'
import { aggregateMargins, otifRate } from './margins'

const rows = [
  { customer_id: 'c1', item_id: 'i1', so_id: 's1', order_date: '2026-09-01', delivered_qty: 10, revenue: 1000, cost: 700, margin: 300 },
  { customer_id: 'c1', item_id: 'i2', so_id: 's1', order_date: '2026-09-01', delivered_qty: 5, revenue: 500, cost: 400, margin: 100 },
  { customer_id: 'c2', item_id: 'i1', so_id: 's2', order_date: '2026-09-02', delivered_qty: 2, revenue: 200.1, cost: 100.05, margin: 100.05 },
]

describe('margins', () => {
  it('aggregates per customer with margin %', () => {
    const g = aggregateMargins(rows, 'customer_id')
    expect(g[0]).toMatchObject({ key: 'c1', revenue: 1500, cost: 1100, margin: 400, marginPct: 26.7, orders: 1, quantity: 15 })
    expect(g[1]).toMatchObject({ key: 'c2', margin: 100.05, marginPct: 50 })
  })
  it('aggregates per product, best margin first', () => {
    const g = aggregateMargins(rows, 'item_id')
    expect(g.map((x) => x.key)).toEqual(['i1', 'i2'])
    expect(g[0]!.revenue).toBe(1200.1)
  })
  it('computes OTIF', () => {
    const base = { so_id: 'x', number: 'CV-1', customer_id: 'c', requested_date: null, delivered_on: null }
    expect(otifRate([])).toEqual({ otif: 0, onTime: 0, inFull: 0, count: 0 })
    expect(otifRate([{ ...base, in_full: true, on_time: true }, { ...base, in_full: true, on_time: false }, { ...base, in_full: false, on_time: true }, { ...base, in_full: true, on_time: true }])).toEqual({ otif: 50, onTime: 75, inFull: 75, count: 4 })
  })
})
