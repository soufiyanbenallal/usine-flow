import { describe, expect, it } from 'vitest'
import { parseDate, resolveOpening, type OpeningRow } from './opening-stock'

const row = (o: Partial<OpeningRow>): OpeningRow => ({ sku: 'A', location: null, quantity: 1, unit_cost: 2, lot_number: null, expires_on: null, ...o })
const items = new Map([['a', { id: 'i1', tracking: 'none', expiry_tracking: false }], ['l', { id: 'i2', tracking: 'lot', expiry_tracking: true }]])
const locations = new Map([['a-01', 'loc1']])

describe('opening stock', () => {
  it('parses ISO and French dates', () => {
    expect(parseDate('2027-06-30')).toBe('2027-06-30')
    expect(parseDate('3/7/2027')).toBe('2027-07-03')
    expect(parseDate('')).toBeNull()
    expect(parseDate('bientôt')).toBeUndefined()
  })
  it('resolves lines case-insensitively', () => {
    const r = resolveOpening([row({ sku: 'a', location: 'A-01' })], items, locations)
    expect(r.errors).toEqual([])
    expect(r.lines[0]).toMatchObject({ item_id: 'i1', location_id: 'loc1', quantity_delta: 1 })
  })
  it('reports unknown sku/location, missing lot and bad date with the file line', () => {
    const r = resolveOpening([row({ sku: 'zz' }), row({ location: 'nope' }), row({ sku: 'l' }), row({ expires_on: 'x' })], items, locations)
    expect(r.lines).toHaveLength(0)
    expect(r.errors.map((e) => e.line)).toEqual([2, 3, 4, 5])
    expect(r.errors[2]!.message).toMatch(/lot/)
  })
})
