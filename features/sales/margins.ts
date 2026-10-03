import { D, marginPct, round } from '@/lib/decimal'
import type { MarginRow, OtifRow } from './types'

export type MarginGroup = { key: string; revenue: number; cost: number; margin: number; marginPct: number; orders: number; quantity: number }

/** Groups delivered sales lines by product, customer or order and computes margin and margin % with exact decimals. */
export function aggregateMargins(rows: MarginRow[], by: 'item_id' | 'customer_id' | 'so_id'): MarginGroup[] {
  const groups = new Map<string, { revenue: ReturnType<typeof D>; cost: ReturnType<typeof D>; qty: ReturnType<typeof D>; orders: Set<string> }>()
  for (const r of rows) {
    const g = groups.get(r[by]) ?? { revenue: D(0), cost: D(0), qty: D(0), orders: new Set<string>() }
    g.revenue = g.revenue.plus(r.revenue)
    g.cost = g.cost.plus(r.cost)
    g.qty = g.qty.plus(r.delivered_qty)
    g.orders.add(r.so_id)
    groups.set(r[by], g)
  }
  return [...groups.entries()]
    .map(([key, g]) => ({ key, revenue: round(g.revenue, 2).toNumber(), cost: round(g.cost, 2).toNumber(), margin: round(g.revenue.minus(g.cost), 2).toNumber(), marginPct: marginPct(g.revenue, g.cost).toNumber(), orders: g.orders.size, quantity: g.qty.toNumber() }))
    .sort((a, b) => b.margin - a.margin)
}

/** OTIF = share of orders delivered both on time and in full. */
export function otifRate(rows: OtifRow[]): { otif: number; onTime: number; inFull: number; count: number } {
  if (rows.length === 0) return { otif: 0, onTime: 0, inFull: 0, count: 0 }
  const pct = (n: number) => Math.round((n / rows.length) * 1000) / 10
  return {
    otif: pct(rows.filter((r) => r.on_time && r.in_full).length),
    onTime: pct(rows.filter((r) => r.on_time).length),
    inFull: pct(rows.filter((r) => r.in_full).length),
    count: rows.length,
  }
}
