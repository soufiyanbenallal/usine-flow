import Decimal from 'decimal.js'

/** Money, quantities and dimensions never use JS floating point: everything goes through decimal.js. */
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP })

export type Num = Decimal.Value | null | undefined
export const D = (v: Num) => new Decimal(v === null || v === undefined || v === '' ? 0 : v)

export const add = (...vs: Num[]) => vs.reduce<Decimal>((acc, v) => acc.plus(D(v)), D(0))
export const sub = (a: Num, b: Num) => D(a).minus(D(b))
export const mul = (a: Num, b: Num) => D(a).times(D(b))
export const div = (a: Num, b: Num) => (D(b).isZero() ? D(0) : D(a).div(D(b)))
export const round = (v: Num, places = 2) => D(v).toDecimalPlaces(places, Decimal.ROUND_HALF_UP)
/** Rounded plain number for display / transport (JSON, PostgREST). */
export const num = (v: Num, places = 4) => round(v, places).toNumber()
export const sumOf = (values: Num[]) => add(...values)
export const pct = (part: Num, whole: Num, places = 1) => (D(whole).isZero() ? D(0) : round(D(part).div(D(whole)).times(100), places))

export type PricedLine = { quantity: Num; unitPrice: Num; discountPct?: Num; vatRate?: Num }

/** quantity × price × (1 − discount %), rounded to 2 decimals like `public.set_line_total()`. */
export const lineTotal = (l: PricedLine) => round(D(l.quantity).times(D(l.unitPrice)).times(D(100).minus(D(l.discountPct)).div(100)), 2)

/** Header totals computed exactly like the SQL triggers (`recalc_document_totals`). */
export function documentTotals(lines: PricedLine[]) {
  const subtotal = round(sumOf(lines.map((l) => lineTotal(l))), 2)
  const tax = round(sumOf(lines.map((l) => lineTotal(l).times(D(l.vatRate ?? 0)).div(100))), 2)
  return { subtotal: subtotal.toNumber(), tax: tax.toNumber(), total: subtotal.plus(tax).toNumber() }
}

/** Margin of a sale: (revenue − cost) / revenue × 100. */
export const marginPct = (revenue: Num, cost: Num) => pct(sub(revenue, cost), revenue)

export { Decimal }
