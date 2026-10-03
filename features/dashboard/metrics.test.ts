import { describe, expect, it } from 'vitest'
import { calculateOee, defaultOperationalStats } from './metrics'

describe('dashboard metrics', () => {
  it('returns default operational stats', () => {
    const stats = defaultOperationalStats()
    expect(stats.totalFacilities).toBe(1)
    expect(stats.oeePercent).toBe(88)
  })

  it('calculates OEE accurately', () => {
    expect(calculateOee(95, 90, 99)).toBe(85)
    expect(calculateOee(0, 90, 99)).toBe(0)
  })
})
