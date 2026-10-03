import { describe, expect, it } from 'vitest'
import type { BomIndex } from '../manufacturing/bom'
import { addDays, capacityWarnings, lotSized, runMrp, type MrpItem } from './mrp'

const today = '2026-10-03'
const item = (id: string, over: Partial<MrpItem> = {}): MrpItem => ({ id, sku: id.toUpperCase(), onHand: 0, safetyStock: 0, minStock: 0, reorderPoint: 0, lotSize: 0, minOrderQty: 0, leadTimeDays: 0, ...over })
const boms: BomIndex = new Map([['table', { itemId: 'table', baseQuantity: 1, lines: [{ componentId: 'top', quantity: 1 }, { componentId: 'screw', quantity: 16 }] }], ['top', { itemId: 'top', baseQuantity: 1, lines: [{ componentId: 'plank', quantity: 2 }] }]])

describe('lot sizing', () => {
  it('rounds up to the lot size and honours the minimum order quantity', () => {
    expect(lotSized(30, 25, 0)).toBe(50)
    expect(lotSized(3, 0, 10)).toBe(10)
    expect(lotSized(7, 0, 0)).toBe(7)
  })
})

describe('MRP', () => {
  it('suggests nothing when stock and incoming supply cover the demand', () => {
    const r = runMrp({ items: [item('plank', { onHand: 100 })], boms: new Map(), demands: [{ itemId: 'plank', quantity: 80, date: '2026-10-10', source: 'sales_order' }], supplies: [], today, horizonDays: 30 })
    expect(r.suggestions).toEqual([])
    const r2 = runMrp({ items: [item('plank', { onHand: 10 })], boms: new Map(), demands: [{ itemId: 'plank', quantity: 80, date: '2026-10-10', source: 'sales_order' }], supplies: [{ itemId: 'plank', quantity: 70, date: '2026-10-08', source: 'purchase_order' }], today, horizonDays: 30 })
    expect(r2.suggestions).toEqual([])
  })
  it('creates a purchase suggestion for the net requirement, lot-sized, with lead time', () => {
    const r = runMrp({ items: [item('plank', { onHand: 10, lotSize: 50, leadTimeDays: 5 })], boms: new Map(), demands: [{ itemId: 'plank', quantity: 80, date: '2026-10-20', source: 'sales_order' }], supplies: [], today, horizonDays: 30 })
    expect(r.suggestions).toHaveLength(1)
    expect(r.suggestions[0]).toMatchObject({ kind: 'purchase', netQty: 70, suggestedQty: 100, needDate: '2026-10-20', releaseDate: '2026-10-15', late: false })
    expect(r.shortages).toEqual([{ itemId: 'plank', date: '2026-10-20', shortage: 70 }])
  })
  it('flags late orders when the lead time exceeds the available time', () => {
    const r = runMrp({ items: [item('plank', { leadTimeDays: 10 })], boms: new Map(), demands: [{ itemId: 'plank', quantity: 5, date: '2026-10-06', source: 'sales_order' }], supplies: [], today, horizonDays: 30 })
    expect(r.suggestions[0]).toMatchObject({ late: true, releaseDate: today })
    expect(r.warnings[0]).toContain('PLANK')
  })
  it('explodes production suggestions into dependent demand level by level', () => {
    const r = runMrp({
      items: [item('table', { leadTimeDays: 2 }), item('top', { leadTimeDays: 1 }), item('plank', { onHand: 20, leadTimeDays: 3 }), item('screw', { onHand: 100 })],
      boms,
      demands: [{ itemId: 'table', quantity: 10, date: '2026-10-20', source: 'sales_order' }],
      supplies: [], today, horizonDays: 30,
    })
    const by = Object.fromEntries(r.suggestions.map((s) => [s.itemId, s]))
    expect(by.table).toMatchObject({ kind: 'production', suggestedQty: 10, needDate: '2026-10-20', releaseDate: '2026-10-18' })
    expect(by.top).toMatchObject({ kind: 'production', suggestedQty: 10, needDate: '2026-10-18' })
    // 10 tops need 20 planks, 20 on hand → no purchase; 160 screws needed, 100 on hand → 60 to buy
    expect(by.plank).toBeUndefined()
    expect(by.screw).toMatchObject({ kind: 'purchase', suggestedQty: 60 })
  })
  it('keeps safety stock and replenishes to the reorder point', () => {
    const r = runMrp({ items: [item('screw', { onHand: 30, safetyStock: 20, reorderPoint: 50, lotSize: 100, leadTimeDays: 4 })], boms: new Map(), demands: [{ itemId: 'screw', quantity: 15, date: '2026-10-12', source: 'sales_order' }], supplies: [], today, horizonDays: 30 })
    expect(r.suggestions.length).toBeGreaterThan(0)
    expect(r.suggestions[0]!.suggestedQty % 100).toBe(0)
  })
  it('ignores demand beyond the horizon', () => {
    const r = runMrp({ items: [item('plank')], boms: new Map(), demands: [{ itemId: 'plank', quantity: 5, date: '2027-03-01', source: 'forecast' }], supplies: [], today, horizonDays: 30 })
    expect(r.suggestions).toEqual([])
  })
  it('computes dates safely', () => {
    expect(addDays('2026-12-30', 5)).toBe('2027-01-04')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
})

describe('capacity', () => {
  it('flags overloaded work centers', () => {
    const loads = capacityWarnings(
      [{ itemId: 'table', kind: 'production', needDate: today, releaseDate: today, grossQty: 100, netQty: 100, suggestedQty: 100, reason: '', late: false }],
      new Map([['table', [{ workCenterId: 'wc1', minutesPerUnit: 30, setupMinutes: 60 }]]]),
      new Map([['wc1', 8]]),
      5,
    )
    expect(loads[0]).toMatchObject({ workCenterId: 'wc1', plannedHours: 51, capacityHours: 40, overloaded: true })
  })
})
