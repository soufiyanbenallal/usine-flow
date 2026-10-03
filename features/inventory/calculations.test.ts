import { describe, expect, it } from 'vitest'
import { abcClassification, ageBucket, availableToPromise, daysOfInventory, fifoConsume, inventoryTurnover, movementClass, projectedStock, reorderSuggestion, runningBalance, stockAccuracy, stockStatus, stockValue, weightedAverageCost } from './calculations'

describe('availability', () => {
  it('is on hand minus reserved, floored at zero', () => {
    expect(availableToPromise({ onHand: 100, reserved: 30 })).toBe(70)
    expect(availableToPromise({ onHand: 10, reserved: 30 })).toBe(0)
  })
  it('projects incoming stock', () => {
    expect(projectedStock({ onHand: 100, reserved: 30, incoming: 50 })).toBe(120)
  })
})

describe('stock status', () => {
  const rules = { minStock: 20, maxStock: 200, reorderPoint: 30 }
  it('classifies levels', () => {
    expect(stockStatus(0, rules)).toBe('out')
    expect(stockStatus(25, rules)).toBe('low')
    expect(stockStatus(100, rules)).toBe('ok')
    expect(stockStatus(250, rules)).toBe('over')
  })
})

describe('replenishment', () => {
  const base = { onHand: 10, reserved: 0, reorderPoint: 20, reorderQty: 50, minStock: 0, safetyStock: 0 }
  it('orders up to target in lots of the reorder quantity', () => {
    expect(reorderSuggestion(base)).toBe(50)
    expect(reorderSuggestion({ ...base, maxStock: 120 })).toBe(150)
  })
  it('does nothing when projected stock is above the trigger', () => {
    expect(reorderSuggestion({ ...base, onHand: 100 })).toBe(0)
    expect(reorderSuggestion({ ...base, incoming: 100 })).toBe(0)
  })
  it('respects the supplier minimum order quantity', () => {
    expect(reorderSuggestion({ ...base, reorderQty: 5, minOrderQty: 40 })).toBe(40)
  })
  it('has no trigger without thresholds', () => {
    expect(reorderSuggestion({ onHand: 0, reserved: 0, reorderPoint: 0, reorderQty: 10, minStock: 0, safetyStock: 0 })).toBe(0)
  })
})

describe('valuation', () => {
  const layers = [{ remaining: 100, unitCost: 10 }, { remaining: 50, unitCost: 20 }]
  it('consumes the oldest layers first (FIFO)', () => {
    const r = fifoConsume(layers, 120)
    expect(r.cost).toBe(100 * 10 + 20 * 20)
    expect(r.unitCost).toBe(11.6667)
    expect(r.remainingLayers).toEqual([{ remaining: 30, unitCost: 20 }])
    expect(r.shortfall).toBe(0)
  })
  it('reports a shortfall when stock is insufficient', () => {
    expect(fifoConsume(layers, 200).shortfall).toBe(50)
  })
  it('computes weighted average cost and value', () => {
    expect(weightedAverageCost(layers)).toBe(13.3333)
    expect(stockValue(layers)).toBe(2000)
    expect(weightedAverageCost([])).toBe(0)
  })
})

describe('reports', () => {
  it('buckets stock age', () => {
    expect([10, 31, 91, 400].map(ageBucket)).toEqual(['0-30', '31-90', '91-180', '180+'])
  })
  it('flags slow and dead stock', () => {
    expect([30, 120, 200].map(movementClass)).toEqual(['active', 'slow', 'dead'])
  })
  it('computes turnover and days of inventory', () => {
    const t = inventoryTurnover(1_200_000, 300_000)
    expect(t).toBe(4)
    expect(daysOfInventory(t)).toBe(91)
    expect(inventoryTurnover(100, 0)).toBe(0)
  })
  it('classifies ABC on value', () => {
    const abc = abcClassification([{ id: 'a', value: 800 }, { id: 'b', value: 150 }, { id: 'c', value: 40 }, { id: 'd', value: 10 }])
    expect(abc.get('a')).toBe('A')
    expect(abc.get('b')).toBe('B')
    expect(abc.get('c')).toBe('C')
  })
  it('measures stock accuracy', () => {
    expect(stockAccuracy([{ expected: 5, counted: 5 }, { expected: 3, counted: 2 }, { expected: 1, counted: null }])).toBe(50)
    expect(stockAccuracy([])).toBe(100)
  })
  it('keeps a running balance without drift', () => {
    expect(runningBalance([{ quantity: 0.1 }, { quantity: 0.2 }, { quantity: -0.3 }])).toEqual([0.1, 0.3, 0])
  })
})
