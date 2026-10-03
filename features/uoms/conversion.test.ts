import { describe, expect, it } from 'vitest'
import { convertQuantity, toBaseQuantity } from './conversion'

const rules = [
  { from: 'carton', to: 'pc', factor: 24 },
  { from: 'pallet', to: 'carton', factor: 40 },
  { from: 't', to: 'kg', factor: 1000 },
]

describe('unit conversion', () => {
  it('converts directly and in reverse', () => {
    expect(convertQuantity(2, 'carton', 'pc', rules)).toBe(48)
    expect(convertQuantity(48, 'pc', 'carton', rules)).toBe(2)
  })
  it('chains rules (pallet → carton → piece)', () => {
    expect(convertQuantity(1, 'pallet', 'pc', rules)).toBe(960)
    expect(convertQuantity(960, 'pc', 'pallet', rules)).toBe(1)
  })
  it('is exact with decimals', () => {
    expect(convertQuantity('0.1', 't', 'kg', rules)).toBe(100)
    expect(convertQuantity('0.3', 'kg', 't', rules)).toBe(0.0003)
  })
  it('returns null without a path and identity for the same unit', () => {
    expect(convertQuantity(3, 'kg', 'pc', rules)).toBeNull()
    expect(convertQuantity(3, 'kg', 'kg', rules)).toBe(3)
  })
  it('computes base quantities like the database trigger', () => {
    expect(toBaseQuantity(3, '24')).toBe(72)
    expect(toBaseQuantity('1.5', '0.001')).toBe(0.0015)
  })
})
