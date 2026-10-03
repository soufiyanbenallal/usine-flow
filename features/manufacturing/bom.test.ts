import { describe, expect, it } from 'vitest'
import { explodeBom, flattenRequirements, lineRequirement, lowLevelCodes, rollupStandardCost, whereUsed, wouldCreateCycle, type BomIndex } from './bom'

// TABLE = 1 top + 4 legs + 16 screws + 0.4 L paint; TOP = 2 planks (+ 5 % scrap)
const index: BomIndex = new Map([
  ['table', { itemId: 'table', baseQuantity: 1, lines: [
    { componentId: 'top', quantity: 1 }, { componentId: 'leg', quantity: 4 }, { componentId: 'screw', quantity: 16 }, { componentId: 'paint', quantity: 0.4 },
    { componentId: 'sawdust', quantity: 0.2, kind: 'by_product' }, { componentId: 'steel-leg', quantity: 4, isAlternative: true },
  ] }],
  ['top', { itemId: 'top', baseQuantity: 1, lines: [{ componentId: 'plank', quantity: 2, scrapPct: 5 }] }],
])

describe('BOM explosion', () => {
  it('applies scrap and quantity scaling', () => {
    expect(lineRequirement({ componentId: 'plank', quantity: 2, scrapPct: 5 }, 1, 10)).toBe(21)
    expect(lineRequirement({ componentId: 'x', quantity: 3 }, 6, 2)).toBe(1)
  })
  it('explodes multi-level and ignores by-products and alternatives', () => {
    const reqs = explodeBom('table', 500, index)
    const byItem = Object.fromEntries(reqs.map((r) => [r.itemId, r.quantity]))
    expect(byItem).toMatchObject({ top: 500, leg: 2000, screw: 8000, paint: 200, plank: 1050 })
    expect(byItem).not.toHaveProperty('sawdust')
    expect(byItem).not.toHaveProperty('steel-leg')
  })
  it('flattens to purchased items only', () => {
    expect(Object.fromEntries(flattenRequirements(explodeBom('table', 10, index), index))).toEqual({ leg: 40, screw: 160, paint: 4, plank: 21 })
  })
  it('finds where a component is used', () => {
    expect(whereUsed('plank', index)).toEqual(['top'])
    expect(whereUsed('top', index)).toEqual(['table'])
  })
  it('detects cycles', () => {
    expect(wouldCreateCycle('table', 'table', index)).toBe(true)
    expect(wouldCreateCycle('plank', 'table', index)).toBe(true)
    expect(wouldCreateCycle('table', 'plank', index)).toBe(false)
    const circular: BomIndex = new Map([['a', { itemId: 'a', baseQuantity: 1, lines: [{ componentId: 'b', quantity: 1 }] }], ['b', { itemId: 'b', baseQuantity: 1, lines: [{ componentId: 'a', quantity: 1 }] }]])
    expect(() => explodeBom('a', 1, circular)).toThrow(/circulaire/)
    expect(() => lowLevelCodes(circular)).toThrow()
  })
  it('computes low-level codes', () => {
    const codes = lowLevelCodes(index)
    expect(codes.get('table')).toBe(0)
    expect(codes.get('top')).toBe(1)
  })
})

describe('standard cost roll-up', () => {
  const costs: Record<string, number> = { plank: 20, leg: 15, screw: 0.1, paint: 50 }
  it('rolls material and operation costs up the tree', () => {
    const c = rollupStandardCost('table', index, {
      itemCost: (id) => costs[id] ?? 0,
      operationCost: (id) => (id === 'table' ? { labor: 12, machine: 8, overhead: 2, subcontract: 0 } : id === 'top' ? { labor: 3, machine: 1, overhead: 0.5, subcontract: 0 } : { labor: 0, machine: 0, overhead: 0, subcontract: 0 }),
    })
    // top: 2 planks * 1.05 * 20 = 42 material; table material = 42 + 4*15 + 16*0.1 + 0.4*50 = 42 + 60 + 1.6 + 20 = 123.6
    expect(c.material).toBe(123.6)
    expect(c.labor).toBe(15)
    expect(c.machine).toBe(9)
    expect(c.overhead).toBe(2.5)
    expect(c.total).toBe(150.1)
  })
})
