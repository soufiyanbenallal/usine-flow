import { describe, expect, it } from 'vitest'
import { trialDaysLeft, trialEnd } from './billing'

describe('billing trial', () => {
  it('ends 14 days after creation', () => {
    expect(trialEnd('2026-01-01T00:00:00.000Z')).toBe('2026-01-15T00:00:00.000Z')
  })
  it('counts remaining days and floors at 0', () => {
    const end = '2026-01-15T00:00:00.000Z'
    expect(trialDaysLeft(end, Date.parse('2026-01-10T00:00:00.000Z'))).toBe(5)
    expect(trialDaysLeft(end, Date.parse('2026-02-01T00:00:00.000Z'))).toBe(0)
  })
})
