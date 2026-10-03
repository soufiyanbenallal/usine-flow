import { D, div, mul } from '@/lib/decimal'

export type ConversionRule = { from: string; to: string; factor: number }

/**
 * Converts a quantity between units using direct rules, their inverse, or a path of up to `maxHops` rules
 * (e.g. pallet → carton → piece). Exact decimal arithmetic; returns `null` when no path exists.
 */
export function convertQuantity(quantity: number | string, from: string, to: string, rules: ConversionRule[], maxHops = 4): number | null {
  if (from === to) return D(quantity).toNumber()
  const edges = new Map<string, { to: string; factor: number }[]>()
  const add = (a: string, b: string, f: number) => edges.set(a, [...(edges.get(a) ?? []), { to: b, factor: f }])
  for (const r of rules) {
    add(r.from, r.to, r.factor)
    if (r.factor !== 0) add(r.to, r.from, div(1, r.factor).toNumber())
  }
  let frontier: { unit: string; factor: ReturnType<typeof D> }[] = [{ unit: from, factor: D(1) }]
  const seen = new Set([from])
  for (let hop = 0; hop < maxHops; hop++) {
    const next: typeof frontier = []
    for (const node of frontier) {
      for (const e of edges.get(node.unit) ?? []) {
        if (seen.has(e.to)) continue
        const factor = node.factor.times(D(e.factor))
        if (e.to === to) return mul(quantity, factor).toDecimalPlaces(6).toNumber()
        seen.add(e.to)
        next.push({ unit: e.to, factor })
      }
    }
    frontier = next
    if (frontier.length === 0) break
  }
  return null
}

/** Quantity of an item expressed in its base unit given an item-specific factor (base units per 1 `uom`). */
export const toBaseQuantity = (quantity: number | string, factorToBase: number | string) => mul(quantity, factorToBase).toDecimalPlaces(4).toNumber()
