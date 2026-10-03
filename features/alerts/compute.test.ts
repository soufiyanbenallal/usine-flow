import { describe, expect, it } from 'vitest'
import { computeAlerts } from './compute'

describe('alerts', () => {
  it('returns empty list when no alerts triggered', () => {
    expect(computeAlerts()).toEqual([])
  })
})
