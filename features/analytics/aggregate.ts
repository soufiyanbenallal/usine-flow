import type { DailyAmount, OeeDaily, QualityDaily } from './types'

export const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0)

/** Groups daily amounts by ISO week (Monday) for compact charts. */
export function byWeek(rows: DailyAmount[]): { week: string; total: number; orders: number }[] {
  const map = new Map<string, { total: number; orders: number }>()
  for (const r of rows) {
    const d = new Date(`${r.day}T00:00:00Z`)
    const shift = (d.getUTCDay() + 6) % 7
    d.setUTCDate(d.getUTCDate() - shift)
    const key = d.toISOString().slice(0, 10)
    const cur = map.get(key) ?? { total: 0, orders: 0 }
    map.set(key, { total: cur.total + Number(r.total), orders: cur.orders + Number(r.orders) })
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([week, v]) => ({ week, ...v }))
}

/** Average OEE per day (mean of work centers). */
export function oeeByDay(rows: OeeDaily[]): { day: string; oee: number }[] {
  const map = new Map<string, number[]>()
  for (const r of rows) if (r.oee_pct != null) map.set(r.day, [...(map.get(r.day) ?? []), Number(r.oee_pct)])
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, v]) => ({ day, oee: Math.round((sum(v) / v.length) * 10) / 10 }))
}

/** Overall first-pass yield weighted by inspections. */
export function firstPassYield(rows: QualityDaily[]): number | null {
  const total = sum(rows.map((r) => Number(r.inspections)))
  return total === 0 ? null : Math.round((1000 * sum(rows.map((r) => Number(r.passed)))) / total) / 10
}

export const pct = (n: number, d: number) => (d === 0 ? 0 : Math.round((1000 * n) / d) / 10)
