import { describe, expect, it } from 'vitest'
import { inherentAvailability, isAnomaly, mtbfHours, mttrHours, oee, preventiveCompliance } from './kpis'

describe('reliability KPIs', () => {
  const failures = [{ downtimeMinutes: 120, repairMinutes: 90 }, { downtimeMinutes: 60, repairMinutes: 30 }]
  it('computes MTBF and MTTR', () => {
    expect(mtbfHours(500, failures)).toBe(248.5)
    expect(mttrHours(failures)).toBe(1)
    expect(mtbfHours(500, [])).toBeNull()
    expect(mttrHours([])).toBeNull()
  })
  it('computes availability', () => {
    expect(inherentAvailability(248.5, 1)).toBe(99.6)
    expect(inherentAvailability(null, 1)).toBeNull()
  })
  it('computes preventive compliance', () => {
    expect(preventiveCompliance([{ dueDate: '2026-10-01', completedOn: '2026-10-01' }, { dueDate: '2026-10-01', completedOn: '2026-10-05' }, { dueDate: '2026-10-02', completedOn: null }, { dueDate: '2026-10-03', completedOn: '2026-09-30' }])).toBe(50)
    expect(preventiveCompliance([])).toBe(100)
  })
})

describe('OEE / TRS', () => {
  it('multiplies availability, performance and quality', () => {
    const r = oee({ plannedMinutes: 480, downtimeMinutes: 48, idealCycleMinutes: 0.5, totalCount: 800, goodCount: 760 })
    expect(r).toMatchObject({ availability: 90, performance: 92.6, quality: 95, runMinutes: 432 })
    expect(r.oee).toBe(79.2)
  })
  it('caps performance at 100 % and handles empty production', () => {
    expect(oee({ plannedMinutes: 100, downtimeMinutes: 0, idealCycleMinutes: 2, totalCount: 80, goodCount: 80 }).performance).toBe(100)
    expect(oee({ plannedMinutes: 0, downtimeMinutes: 0, idealCycleMinutes: 1, totalCount: 0, goodCount: 0 }).oee).toBe(0)
  })
})

describe('anomaly detection (guide: 1.8 h/day normal, 5.6 h today)', () => {
  const history = [1.6, 1.9, 1.7, 2.0, 1.8, 1.8, 1.9]
  it('flags an abnormal downtime', () => {
    expect(isAnomaly(history, 5.6).anomaly).toBe(true)
    expect(isAnomaly(history, 2.1).anomaly).toBe(false)
  })
  it('needs enough history', () => {
    expect(isAnomaly([1, 2], 50).anomaly).toBe(false)
  })
})
