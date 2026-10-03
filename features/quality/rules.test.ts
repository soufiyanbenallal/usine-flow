import { describe, expect, it } from 'vitest'
import { capaAging, defectRate, firstPassYield, groupTraceByLevel, inspectionVerdict, judgeMeasurement, sampleSize } from './rules'

describe('inspection rules', () => {
  it('judges measurements against tolerance', () => {
    expect(judgeMeasurement(2.0, { min: 1.9, max: 2.1 })).toBe('pass')
    expect(judgeMeasurement(1.89, { min: 1.9, max: 2.1 })).toBe('fail')
    expect(judgeMeasurement(2.11, { min: 1.9, max: 2.1 })).toBe('fail')
    expect(judgeMeasurement(5, { min: null, max: null })).toBe('pass')
    expect(judgeMeasurement(null, { min: 1, max: 2 })).toBe('pending')
  })
  it('sizes samples', () => {
    expect(sampleSize({ method: 'all' }, 500)).toBe(500)
    expect(sampleSize({ method: 'percent', percent: 10 }, 55)).toBe(6)
    expect(sampleSize({ method: 'fixed', size: 80 }, 50)).toBe(50)
    expect(sampleSize({ method: 'aql', size: 32 }, 500)).toBe(32)
  })
  it('derives the verdict', () => {
    expect(inspectionVerdict([{ required: true, result: 'pass' }, { required: false, result: 'pending' }])).toBe('passed')
    expect(inspectionVerdict([{ required: true, result: 'pass' }, { required: true, result: 'pending' }])).toBe('pending')
    expect(inspectionVerdict([{ required: true, result: 'fail' }, { required: true, result: 'pending' }])).toBe('failed')
  })
  it('computes quality KPIs', () => {
    expect(defectRate(5, 400)).toBe(1.25)
    expect(firstPassYield(47, 50)).toBe(94)
    expect(defectRate(1, 0)).toBe(0)
  })
  it('ages CAPA actions', () => {
    const r = capaAging([
      { status: 'open', createdAt: '2026-09-23T00:00:00Z', dueDate: '2026-10-01' },
      { status: 'in_progress', createdAt: '2026-09-30T00:00:00Z', dueDate: '2026-10-20' },
      { status: 'verified', createdAt: '2026-01-01T00:00:00Z', dueDate: null },
    ], '2026-10-03')
    expect(r).toEqual({ open: 2, overdue: 1, averageAgeDays: 7 })
  })
  it('groups trace nodes by level', () => {
    const g = groupTraceByLevel([{ id: 'b', type: 'lot', label: 'B', level: 1 }, { id: 'a', type: 'lot', label: 'A', level: 0 }, { id: 'c', type: 'delivery', label: 'C', level: 1 }])
    expect([...g.keys()]).toEqual([0, 1])
    expect(g.get(1)).toHaveLength(2)
  })
})
