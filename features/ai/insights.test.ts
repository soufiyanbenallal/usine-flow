import { describe, expect, it } from 'vitest'
import { detectAnomalies, forecast, linearTrend, reorderAdvice } from './insights'

describe('insights', () => {
  it('fits a linear trend', () => {
    const { slope, intercept } = linearTrend([2, 4, 6, 8])
    expect(slope).toBeCloseTo(2)
    expect(intercept).toBeCloseTo(2)
  })
  it('forecasts non-negative values and rates confidence by history', () => {
    const steady = forecast([100, 102, 98, 101, 99, 100, 101, 100, 99, 102, 100, 101], 2)
    expect(steady.next[0]).toBeGreaterThan(90)
    expect(steady.confidence).toBe('high')
    expect(forecast([5, 1], 1).confidence).toBe('low')
    expect(forecast([10, 5, 1, 0], 3).next.every((v) => v >= 0)).toBe(true)
    expect(forecast([], 2).next).toEqual([0, 0])
  })
  it('flags outliers with a robust score', () => {
    const pts = [10, 11, 9, 10, 12, 10, 95, 11].map((value, i) => ({ period: `p${i}`, value }))
    const a = detectAnomalies(pts)
    expect(a).toHaveLength(1)
    expect(a[0]).toMatchObject({ period: 'p6', direction: 'high' })
    expect(detectAnomalies(pts.slice(0, 4))).toEqual([])
    expect(detectAnomalies(Array.from({ length: 8 }, (_, i) => ({ period: `p${i}`, value: 5 })))).toEqual([])
  })
  it('advises reorders by coverage', () => {
    const critical = reorderAdvice({ itemId: 'a', onHand: 5, monthlyDemand: [100, 100, 100], leadTimeDays: 30 })
    expect(critical.urgency).toBe('critical')
    expect(critical.suggestedOrderQty).toBe(295)
    expect(reorderAdvice({ itemId: 'b', onHand: 500, monthlyDemand: [100, 100] }).urgency).toBe('ok')
    expect(reorderAdvice({ itemId: 'c', onHand: 5, monthlyDemand: [] })).toMatchObject({ urgency: 'ok', suggestedOrderQty: 0, coverageMonths: null })
  })
})
