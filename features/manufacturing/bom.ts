import { D, add, mul, round } from '@/lib/decimal'

export type BomLineKind = 'component' | 'co_product' | 'by_product'
export type BomLine = {
  componentId: string
  /** Quantity per `baseQuantity` of the produced item, in the component's base unit. */
  quantity: number
  scrapPct?: number
  kind?: BomLineKind
  /** Alternative components are substitutes of a primary line, never exploded unless chosen. */
  isAlternative?: boolean
}
export type BomVersion = { itemId: string; baseQuantity: number; lines: BomLine[] }
/** Active version of each manufactured item. */
export type BomIndex = Map<string, BomVersion>

export type Requirement = { itemId: string; quantity: number; level: number; parentId: string | null }

/** Quantity needed of one component for `quantity` of the parent, including expected scrap. */
export const lineRequirement = (line: BomLine, base: number, quantity: number) =>
  round(mul(mul(line.quantity, D(quantity).div(base)), D(1).plus(D(line.scrapPct ?? 0).div(100))), 6).toNumber()

/**
 * Multi-level explosion of a BOM into the list of requirements (sub-assemblies and purchased items).
 * Throws on circular structures. By-products / co-products and alternatives are not requirements.
 */
export function explodeBom(itemId: string, quantity: number, index: BomIndex, maxDepth = 12): Requirement[] {
  const out: Requirement[] = []
  const walk = (id: string, qty: number, level: number, parent: string | null, path: string[]) => {
    const bom = index.get(id)
    if (!bom) return
    if (path.includes(id)) throw new Error(`Nomenclature circulaire : ${[...path, id].join(' → ')}`)
    if (level > maxDepth) throw new Error('Nomenclature trop profonde.')
    for (const line of bom.lines) {
      if ((line.kind ?? 'component') !== 'component' || line.isAlternative) continue
      const need = lineRequirement(line, bom.baseQuantity, qty)
      out.push({ itemId: line.componentId, quantity: need, level, parentId: id })
      walk(line.componentId, need, level + 1, id, [...path, id])
    }
  }
  walk(itemId, quantity, 1, null, [])
  return out
}

/** Leaf requirements only (what must actually be purchased / taken from stock), aggregated by item. */
export function flattenRequirements(reqs: Requirement[], index: BomIndex): Map<string, number> {
  const totals = new Map<string, ReturnType<typeof D>>()
  for (const r of reqs) {
    if (index.has(r.itemId)) continue
    totals.set(r.itemId, (totals.get(r.itemId) ?? D(0)).plus(r.quantity))
  }
  return new Map([...totals.entries()].map(([k, v]) => [k, v.toNumber()]))
}

/** Where-used: parents (direct) of a component. */
export const whereUsed = (componentId: string, index: BomIndex): string[] => [...index.values()].filter((b) => b.lines.some((l) => l.componentId === componentId && (l.kind ?? 'component') === 'component')).map((b) => b.itemId)

/** True when adding `componentId` under `parentId` would create a cycle. */
export function wouldCreateCycle(parentId: string, componentId: string, index: BomIndex): boolean {
  if (parentId === componentId) return true
  const seen = new Set<string>()
  const stack = [componentId]
  while (stack.length > 0) {
    const id = stack.pop()!
    if (id === parentId) return true
    if (seen.has(id)) continue
    seen.add(id)
    for (const l of index.get(id)?.lines ?? []) if ((l.kind ?? 'component') === 'component') stack.push(l.componentId)
  }
  return false
}

/** Low-level code: 0 for finished items, +1 for every BOM level below. MRP processes items by ascending code. */
export function lowLevelCodes(index: BomIndex): Map<string, number> {
  const codes = new Map<string, number>()
  const visit = (id: string, level: number, path: string[]) => {
    if (path.includes(id)) throw new Error('Nomenclature circulaire.')
    if ((codes.get(id) ?? -1) < level) codes.set(id, level)
    for (const l of index.get(id)?.lines ?? []) if ((l.kind ?? 'component') === 'component' && !l.isAlternative) visit(l.componentId, level + 1, [...path, id])
  }
  for (const id of index.keys()) visit(id, 0, [])
  return codes
}

export type CostInputs = {
  /** Unit cost of purchased items (standard or last purchase cost). */
  itemCost: (itemId: string) => number
  /** Operation cost per unit of a manufactured item (labor + machine + overhead + subcontracting). */
  operationCost?: (itemId: string) => { labor: number; machine: number; overhead: number; subcontract: number }
}
export type CostBreakdown = { material: number; labor: number; machine: number; overhead: number; subcontract: number; total: number }

/** Standard cost roll-up per unit: Σ components × (1 + scrap) rolled up recursively + operations of each level. */
export function rollupStandardCost(itemId: string, index: BomIndex, inputs: CostInputs, cache = new Map<string, CostBreakdown>(), path: string[] = []): CostBreakdown {
  const cached = cache.get(itemId)
  if (cached) return cached
  const bom = index.get(itemId)
  if (!bom) {
    const unit = inputs.itemCost(itemId)
    return { material: unit, labor: 0, machine: 0, overhead: 0, subcontract: 0, total: unit }
  }
  if (path.includes(itemId)) throw new Error('Nomenclature circulaire.')
  let material = D(0)
  let labor = D(0)
  let machine = D(0)
  let overhead = D(0)
  let subcontract = D(0)
  for (const line of bom.lines) {
    if ((line.kind ?? 'component') !== 'component' || line.isAlternative) continue
    const per = D(line.quantity).div(bom.baseQuantity).times(D(1).plus(D(line.scrapPct ?? 0).div(100)))
    const c = rollupStandardCost(line.componentId, index, inputs, cache, [...path, itemId])
    material = material.plus(per.times(c.material))
    labor = labor.plus(per.times(c.labor))
    machine = machine.plus(per.times(c.machine))
    overhead = overhead.plus(per.times(c.overhead))
    subcontract = subcontract.plus(per.times(c.subcontract))
  }
  const ops = inputs.operationCost?.(itemId)
  if (ops) {
    labor = labor.plus(ops.labor)
    machine = machine.plus(ops.machine)
    overhead = overhead.plus(ops.overhead)
    subcontract = subcontract.plus(ops.subcontract)
  }
  const r = (v: ReturnType<typeof D>) => round(v, 4).toNumber()
  const result = { material: r(material), labor: r(labor), machine: r(machine), overhead: r(overhead), subcontract: r(subcontract), total: r(add(material, labor, machine, overhead, subcontract)) }
  cache.set(itemId, result)
  return result
}
