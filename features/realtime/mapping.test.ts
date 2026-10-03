import { describe, expect, it } from 'vitest'
import { featuresForEvent, orgTopic } from './mapping'

describe('realtime mapping', () => {
  it('maps broadcast events to feature keys', () => {
    expect(featuresForEvent('production_order_operations.update')).toContain('production_orders')
    expect(featuresForEvent('inventory_balances.insert')).toContain('stock')
    expect(featuresForEvent('unknown_table.update')).toEqual([])
    expect(featuresForEvent('')).toEqual([])
  })
  it('uses the private organization topic', () => {
    expect(orgTopic('abc')).toBe('org:abc')
  })
})
