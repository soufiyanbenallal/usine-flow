import { D } from '@/lib/decimal'
import { explodeBom, lineRequirement, lowLevelCodes, type BomIndex } from '../manufacturing/bom'

/**
 * Focused MRP engine (guide §14): net requirement = demand − (stock + incoming purchases + open production),
 * then purchase or production suggestions, exploded level by level through the BOMs.
 * Pure and deterministic: all data is passed in, nothing is read from the database here.
 */

export type MrpItem = {
  id: string
  sku: string
  onHand: number
  safetyStock: number
  minStock: number
  reorderPoint: number
  /** Lot size / reorder quantity (0 = lot for lot). */
  lotSize: number
  minOrderQty: number
  leadTimeDays: number
  supplierId?: string | null
}
export type DemandSource = 'sales_order' | 'production_order' | 'forecast' | 'dependent'
export type Demand = { itemId: string; quantity: number; date: string; source: DemandSource; ref?: string }
export type SupplySource = 'purchase_order' | 'production_order'
export type Supply = { itemId: string; quantity: number; date: string; source: SupplySource; ref?: string }

export type MrpSuggestion = {
  itemId: string
  kind: 'purchase' | 'production'
  needDate: string
  /** Latest date to order / launch given the lead time. */
  releaseDate: string
  grossQty: number
  netQty: number
  suggestedQty: number
  reason: string
  late: boolean
  supplierId?: string | null
}
export type MrpShortage = { itemId: string; date: string; shortage: number }
export type MrpResult = { suggestions: MrpSuggestion[]; shortages: MrpShortage[]; warnings: string[] }

export type MrpInput = {
  items: MrpItem[]
  boms: BomIndex
  demands: Demand[]
  supplies: Supply[]
  /** ISO date (yyyy-mm-dd) of the run. */
  today: string
  horizonDays: number
  /** Include reorder-point replenishment beyond known demand. */
  includeReorderPoint?: boolean
}

const dayMs = 86_400_000
export const addDays = (iso: string, days: number) => new Date(new Date(iso + 'T00:00:00Z').getTime() + days * dayMs).toISOString().slice(0, 10)
const daysBetween = (a: string, b: string) => Math.round((new Date(b + 'T00:00:00Z').getTime() - new Date(a + 'T00:00:00Z').getTime()) / dayMs)

/** Rounds a net requirement up to the lot size, honouring the minimum order quantity. */
export function lotSized(net: number, lotSize: number, minOrderQty: number): number {
  let qty = D(net)
  if (lotSize > 0) qty = qty.div(lotSize).ceil().times(lotSize)
  if (qty.lt(minOrderQty)) qty = D(minOrderQty)
  return qty.toNumber()
}

export function runMrp(input: MrpInput): MrpResult {
  const { items, boms, today } = input
  const horizonEnd = addDays(today, input.horizonDays)
  const itemById = new Map(items.map((i) => [i.id, i]))
  const levels = lowLevelCodes(boms)
  const result: MrpResult = { suggestions: [], shortages: [], warnings: [] }

  // dependent demand accumulated while processing parents (higher levels first)
  const dependent: Demand[] = []
  const ordered = [...items].sort((a, b) => (levels.get(a.id) ?? 0) - (levels.get(b.id) ?? 0) || a.sku.localeCompare(b.sku))

  for (const item of ordered) {
    const demands = [...input.demands, ...dependent].filter((d) => d.itemId === item.id && d.quantity > 0)
    const supplies = input.supplies.filter((s) => s.itemId === item.id && s.quantity > 0)
    const events = [
      ...demands.map((d) => ({ date: d.date < today ? today : d.date, delta: -d.quantity, kind: 'demand' as const })),
      ...supplies.map((s) => ({ date: s.date < today ? today : s.date, delta: s.quantity, kind: 'supply' as const })),
    ].sort((a, b) => a.date.localeCompare(b.date) || (a.kind === 'supply' ? -1 : 1))

    let projected = D(item.onHand)
    const floor = D(Math.max(item.safetyStock, 0))
    const isMade = boms.has(item.id)

    const plan = (date: string, shortage: number, reason: string) => {
      const qty = lotSized(shortage, item.lotSize, item.minOrderQty)
      const releaseDate = addDays(date, -item.leadTimeDays)
      const late = releaseDate < today
      result.suggestions.push({ itemId: item.id, kind: isMade ? 'production' : 'purchase', needDate: date, releaseDate: late ? today : releaseDate, grossQty: shortage, netQty: shortage, suggestedQty: qty, reason, late, supplierId: item.supplierId })
      if (late) result.warnings.push(`${item.sku} : à lancer avant aujourd’hui (délai ${item.leadTimeDays} j) — besoin le ${date}.`)
      projected = projected.plus(qty)
      if (isMade) {
        const bom = boms.get(item.id)!
        for (const line of bom.lines) {
          if ((line.kind ?? 'component') !== 'component' || line.isAlternative) continue
          dependent.push({ itemId: line.componentId, quantity: lineRequirement(line, bom.baseQuantity, qty), date: late ? today : releaseDate, source: 'dependent', ref: item.id })
        }
      }
    }

    for (const e of events) {
      projected = projected.plus(e.delta)
      if (e.kind === 'demand' && projected.lt(floor)) {
        const shortage = floor.minus(projected).toNumber()
        result.shortages.push({ itemId: item.id, date: e.date, shortage })
        plan(e.date, shortage, e.date <= horizonEnd ? 'Besoin couvert par commande/production' : 'Besoin hors horizon')
      }
    }
    // replenishment up to the reorder point after known demand
    if (input.includeReorderPoint !== false) {
      const trigger = Math.max(item.reorderPoint, item.minStock)
      if (trigger > 0 && projected.lt(trigger)) plan(addDays(today, item.leadTimeDays), D(trigger).minus(projected).toNumber(), 'Point de commande / stock minimum')
    }
  }

  // horizon filter: keep suggestions needed within the horizon (late ones are always kept)
  result.suggestions = result.suggestions.filter((s) => s.needDate <= horizonEnd || s.late)
  return result
}

export type CapacityLoad = { workCenterId: string; plannedHours: number; capacityHours: number; loadPct: number; overloaded: boolean }

/** Compares planned production hours (suggested quantity × routing minutes) to work-center capacity over the horizon. */
export function capacityWarnings(
  suggestions: MrpSuggestion[],
  routingMinutesPerUnit: Map<string, { workCenterId: string; minutesPerUnit: number; setupMinutes: number }[]>,
  capacityHoursPerDay: Map<string, number>,
  horizonDays: number,
  efficiency = 1,
): CapacityLoad[] {
  const load = new Map<string, ReturnType<typeof D>>()
  for (const s of suggestions) {
    if (s.kind !== 'production') continue
    for (const op of routingMinutesPerUnit.get(s.itemId) ?? []) {
      const hours = D(op.minutesPerUnit).times(s.suggestedQty).plus(op.setupMinutes).div(60)
      load.set(op.workCenterId, (load.get(op.workCenterId) ?? D(0)).plus(hours))
    }
  }
  return [...load.entries()].map(([workCenterId, hours]) => {
    const capacity = D(capacityHoursPerDay.get(workCenterId) ?? 8).times(horizonDays).times(efficiency)
    const loadPct = capacity.gt(0) ? hours.div(capacity).times(100).toDecimalPlaces(1).toNumber() : 0
    return { workCenterId, plannedHours: hours.toDecimalPlaces(1).toNumber(), capacityHours: capacity.toDecimalPlaces(1).toNumber(), loadPct, overloaded: loadPct > 100 }
  })
}

export { explodeBom, daysBetween }
