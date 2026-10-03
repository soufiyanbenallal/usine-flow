import { D, add, div, mul, pct, round, sub } from '@/lib/decimal'

/** Pure inventory rules (mirrors what Postgres enforces; used by UI previews, replenishment and reports). */

export type StockLevels = { onHand: number; reserved: number; incoming?: number; quarantine?: number }

/** Available-to-promise = on hand − reserved (never negative). */
export const availableToPromise = ({ onHand, reserved }: Pick<StockLevels, 'onHand' | 'reserved'>) => Math.max(sub(onHand, reserved).toNumber(), 0)

/** Projected stock = on hand − reserved + incoming purchases / production. */
export const projectedStock = ({ onHand, reserved, incoming = 0 }: StockLevels) => sub(add(onHand, incoming), reserved).toNumber()

export type StockStatus = 'out' | 'low' | 'ok' | 'over'
export type StockRules = { minStock: number; maxStock?: number | null; reorderPoint: number }

export function stockStatus(onHand: number, rules: StockRules): StockStatus {
  if (onHand <= 0) return 'out'
  if ((rules.reorderPoint > 0 && onHand <= rules.reorderPoint) || (rules.minStock > 0 && onHand < rules.minStock)) return 'low'
  if (rules.maxStock && rules.maxStock > 0 && onHand > rules.maxStock) return 'over'
  return 'ok'
}

export type ReorderInput = StockLevels & { reorderPoint: number; reorderQty: number; minStock: number; safetyStock: number; maxStock?: number | null; minOrderQty?: number }

/**
 * Replenishment suggestion: when projected stock falls to the reorder point (or below min + safety),
 * order up to max stock (rounded to the lot size) or, without a maximum, whole lots of the reorder quantity.
 * Returns 0 when nothing is needed.
 */
export function reorderSuggestion(i: ReorderInput): number {
  const projected = projectedStock(i)
  const trigger = Math.max(i.reorderPoint, add(i.minStock, i.safetyStock).toNumber())
  if (trigger <= 0 || projected > trigger) return 0
  let qty: ReturnType<typeof D>
  if (i.maxStock && i.maxStock > 0) {
    // order up to the maximum level, rounded up to the lot size
    qty = D(i.maxStock).minus(projected)
    if (i.reorderQty > 0) qty = qty.div(i.reorderQty).ceil().times(i.reorderQty)
  } else if (i.reorderQty > 0) {
    // whole lots of the reorder quantity until the projected stock is back above the trigger
    qty = D(trigger).minus(projected).div(i.reorderQty).floor().plus(1).times(i.reorderQty)
  } else {
    qty = D(trigger).minus(projected)
  }
  const moq = D(i.minOrderQty ?? 0)
  if (qty.lt(moq)) qty = moq
  return qty.gt(0) ? qty.toNumber() : 0
}

export type Layer = { id?: string; remaining: number; unitCost: number }

/** FIFO consumption of valuation layers (oldest first). Mirrors `post_stock_movement`. */
export function fifoConsume(layers: Layer[], quantity: number) {
  let left = D(quantity)
  let value = D(0)
  const remainingLayers: Layer[] = []
  for (const l of layers) {
    if (left.lte(0)) {
      remainingLayers.push(l)
      continue
    }
    const take = D(Math.min(l.remaining, left.toNumber()))
    value = value.plus(take.times(l.unitCost))
    left = left.minus(take)
    const rest = D(l.remaining).minus(take)
    if (rest.gt(0)) remainingLayers.push({ ...l, remaining: rest.toNumber() })
  }
  const consumed = D(quantity).minus(left)
  return { cost: value.toNumber(), unitCost: consumed.gt(0) ? value.div(consumed).toDecimalPlaces(4).toNumber() : 0, shortfall: left.toNumber(), remainingLayers }
}

/** Weighted-average unit cost of the open layers. */
export function weightedAverageCost(layers: Layer[]): number {
  const qty = layers.reduce((a, l) => a.plus(l.remaining), D(0))
  if (qty.lte(0)) return 0
  const value = layers.reduce((a, l) => a.plus(D(l.remaining).times(l.unitCost)), D(0))
  return value.div(qty).toDecimalPlaces(4).toNumber()
}

export const stockValue = (layers: Layer[]) => round(layers.reduce((a, l) => a.plus(D(l.remaining).times(l.unitCost)), D(0)), 2).toNumber()

export type AgeBucket = '0-30' | '31-90' | '91-180' | '180+'
export const AGE_BUCKETS: AgeBucket[] = ['0-30', '31-90', '91-180', '180+']
export const ageBucket = (days: number): AgeBucket => (days <= 30 ? '0-30' : days <= 90 ? '31-90' : days <= 180 ? '91-180' : '180+')

export type MovementClass = 'active' | 'slow' | 'dead'
/** Dead stock: no outbound movement for 180 days; slow-moving: 90 days. */
export const movementClass = (daysIdle: number): MovementClass => (daysIdle > 180 ? 'dead' : daysIdle > 90 ? 'slow' : 'active')

/** Annualised turnover = COGS / average inventory value. */
export const inventoryTurnover = (cogs: number, averageInventoryValue: number) => round(div(cogs, averageInventoryValue), 2).toNumber()
export const daysOfInventory = (turnover: number, daysInPeriod = 365) => (turnover > 0 ? round(div(daysInPeriod, turnover), 0).toNumber() : 0)

/** ABC classification on annual consumption value: A = top 80 %, B = next 15 %, C = rest. */
export function abcClassification<T extends { id: string; value: number }>(items: T[]): Map<string, 'A' | 'B' | 'C'> {
  const total = items.reduce((a, i) => a.plus(i.value), D(0))
  const out = new Map<string, 'A' | 'B' | 'C'>()
  if (total.lte(0)) {
    items.forEach((i) => out.set(i.id, 'C'))
    return out
  }
  let cumulative = D(0)
  for (const i of [...items].sort((a, b) => b.value - a.value)) {
    const before = pct(cumulative, total, 4).toNumber()
    out.set(i.id, before < 80 ? 'A' : before < 95 ? 'B' : 'C')
    cumulative = cumulative.plus(i.value)
  }
  return out
}

/** Share of counted lines with no variance. */
export function stockAccuracy(lines: { expected: number; counted: number | null }[]): number {
  const counted = lines.filter((l) => l.counted !== null)
  if (counted.length === 0) return 100
  return pct(counted.filter((l) => l.counted === l.expected).length, counted.length).toNumber()
}

export type MovementKind = 'receipt' | 'issue' | 'transfer_in' | 'transfer_out' | 'adjustment' | 'count_adjustment' | 'production_consume' | 'production_output' | 'sale' | 'return_in' | 'return_out' | 'scrap' | 'reversal' | 'opening' | 'maintenance_consume' | 'quality_move'
export const MOVEMENT_LABELS: Record<MovementKind, string> = {
  opening: 'Stock initial', receipt: 'Réception', issue: 'Sortie', transfer_in: 'Transfert (entrée)', transfer_out: 'Transfert (sortie)', adjustment: 'Ajustement',
  count_adjustment: 'Écart d’inventaire', production_consume: 'Consommation OF', production_output: 'Production OF', sale: 'Vente', return_in: 'Retour client',
  return_out: 'Retour fournisseur', scrap: 'Rebut', reversal: 'Contre-passation', maintenance_consume: 'Pièces maintenance', quality_move: 'Mouvement qualité',
}

/** Running balance of a chronologically ordered list of signed movements. */
export function runningBalance(movements: { quantity: number }[], opening = 0): number[] {
  let acc = D(opening)
  return movements.map((m) => (acc = acc.plus(m.quantity)).toNumber())
}

/** Value of a movement (quantity × unit cost) with exact rounding. */
export const movementValue = (quantity: number, unitCost: number) => round(mul(quantity, unitCost), 2).toNumber()
