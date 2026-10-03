import { describe, expect, it } from 'vitest'
import { backflushQuantity, canTransition, isLate, materialShortage, nextStatuses, operationProgress, orderProgress, plannedMinutes } from './production-rules'

describe('production state machine', () => {
  it('allows the nominal path and nothing else', () => {
    expect(canTransition('draft', 'released')).toBe(true)
    expect(canTransition('released', 'in_progress')).toBe(true)
    expect(canTransition('in_progress', 'completed')).toBe(true)
    expect(canTransition('completed', 'closed')).toBe(true)
    expect(canTransition('closed', 'in_progress')).toBe(false)
    expect(canTransition('completed', 'in_progress')).toBe(false)
    expect(nextStatuses('cancelled')).toEqual([])
  })
})

describe('progress', () => {
  it('computes order and operation progress (guide: 64 %)', () => {
    expect(orderProgress(320, 500)).toBe(64)
    expect(orderProgress(600, 500)).toBe(100)
    expect(operationProgress({ status: 'running', plannedQty: 500, doneQty: 340, scrapQty: 0 })).toBe(68)
    expect(operationProgress({ status: 'done', plannedQty: 500, doneQty: 100, scrapQty: 0 })).toBe(100)
  })
  it('detects late open orders', () => {
    expect(isLate('2026-10-01', 'in_progress', '2026-10-03')).toBe(true)
    expect(isLate('2026-10-01', 'completed', '2026-10-03')).toBe(false)
    expect(isLate(null, 'in_progress', '2026-10-03')).toBe(false)
  })
})

describe('materials', () => {
  it('computes shortages', () => {
    expect(materialShortage({ required: 250, issued: 120, available: 50 })).toBe(80)
    expect(materialShortage({ required: 250, issued: 250, available: 0 })).toBe(0)
  })
  it('backflushes proportionally, capped at 110 %', () => {
    expect(backflushQuantity({ required: 100, issued: 0 }, 5, 10)).toBe(50)
    expect(backflushQuantity({ required: 100, issued: 108 }, 5, 10)).toBe(2)
    expect(backflushQuantity({ required: 100, issued: 115 }, 5, 10)).toBe(0)
  })
  it('plans operation durations', () => {
    expect(plannedMinutes({ setup: 30, runPerUnit: 2.5, move: 5, queue: 10 }, 20)).toBe(95)
  })
})
