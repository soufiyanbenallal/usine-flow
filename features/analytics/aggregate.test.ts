import { describe, expect, it } from 'vitest'
import { byWeek, firstPassYield, oeeByDay, pct } from './aggregate'

describe('analytics aggregation', () => {
  it('groups by Monday-based week', () => {
    const w = byWeek([{ day: '2026-09-28', orders: 1, total: 10 }, { day: '2026-10-02', orders: 2, total: 5 }, { day: '2026-10-05', orders: 1, total: 1 }])
    expect(w).toEqual([{ week: '2026-09-28', total: 15, orders: 3 }, { week: '2026-10-05', total: 1, orders: 1 }])
  })
  it('averages OEE per day', () => {
    const base = { work_center_id: 'a', run_minutes: 0, downtime_minutes: 0, availability_pct: null, performance_pct: null, quality_pct: null }
    expect(oeeByDay([{ ...base, day: 'd1', oee_pct: 80 }, { ...base, work_center_id: 'b', day: 'd1', oee_pct: 60 }])).toEqual([{ day: 'd1', oee: 70 }])
  })
  it('computes weighted first-pass yield', () => {
    expect(firstPassYield([{ day: 'd', inspections: 10, passed: 9, failed: 1, rejected_qty: 0, inspected_qty: 0, first_pass_yield_pct: 90 }])).toBe(90)
    expect(firstPassYield([])).toBeNull()
    expect(pct(1, 3)).toBe(33.3)
  })
})
