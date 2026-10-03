/** Pure statistical helpers behind the AI insights (forecast, anomalies, reorder advice). No network, fully tested. */

export type Point = { period: string; value: number }

const mean = (xs: number[]) => (xs.length === 0 ? 0 : xs.reduce((s, x) => s + x, 0) / xs.length)
const stdev = (xs: number[]) => {
  if (xs.length < 2) return 0
  const m = mean(xs)
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1))
}
const median = (xs: number[]) => {
  if (xs.length === 0) return 0
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2
}

/** Ordinary least squares on index → value. */
export function linearTrend(values: number[]): { slope: number; intercept: number } {
  const n = values.length
  if (n === 0) return { slope: 0, intercept: 0 }
  if (n === 1) return { slope: 0, intercept: values[0]! }
  const xm = (n - 1) / 2
  const ym = mean(values)
  let num = 0
  let den = 0
  values.forEach((y, x) => { num += (x - xm) * (y - ym); den += (x - xm) ** 2 })
  const slope = den === 0 ? 0 : num / den
  return { slope, intercept: ym - slope * xm }
}

export type Forecast = { next: number[]; slope: number; confidence: 'low' | 'medium' | 'high'; band: number }

/**
 * Forecast of the next `horizon` periods: blend of a damped linear trend and the recent average.
 * Confidence comes from history length and relative noise.
 */
export function forecast(values: number[], horizon = 3): Forecast {
  const n = values.length
  if (n === 0) return { next: Array(horizon).fill(0), slope: 0, confidence: 'low', band: 0 }
  const { slope, intercept } = linearTrend(values)
  const recent = mean(values.slice(-Math.min(3, n)))
  const next = Array.from({ length: horizon }, (_, h) => {
    const trend = intercept + slope * (n + h)
    const damped = recent + (trend - recent) * 0.5
    return Math.max(0, Math.round(damped * 100) / 100)
  })
  const residuals = values.map((y, x) => y - (intercept + slope * x))
  const band = Math.round(stdev(residuals) * 100) / 100
  const noise = mean(values) === 0 ? 1 : band / Math.abs(mean(values))
  const confidence = n >= 12 && noise < 0.25 ? 'high' : n >= 6 && noise < 0.5 ? 'medium' : 'low'
  return { next, slope: Math.round(slope * 1000) / 1000, confidence, band }
}

export type Anomaly = { index: number; period: string; value: number; expected: number; score: number; direction: 'high' | 'low' }

/** Robust anomaly detection (median / MAD modified z-score; |z| > threshold). Needs at least 6 points. */
export function detectAnomalies(points: Point[], threshold = 3.5): Anomaly[] {
  if (points.length < 6) return []
  const values = points.map((p) => p.value)
  const med = median(values)
  const mad = median(values.map((v) => Math.abs(v - med)))
  if (mad === 0) {
    const sd = stdev(values)
    if (sd === 0) return []
    return points.flatMap((p, index) => (Math.abs(p.value - med) / sd > threshold ? [{ index, period: p.period, value: p.value, expected: med, score: Math.round((Math.abs(p.value - med) / sd) * 10) / 10, direction: p.value > med ? 'high' as const : 'low' as const }] : []))
  }
  return points.flatMap((p, index) => {
    const z = (0.6745 * (p.value - med)) / mad
    return Math.abs(z) > threshold ? [{ index, period: p.period, value: p.value, expected: med, score: Math.round(Math.abs(z) * 10) / 10, direction: z > 0 ? 'high' as const : 'low' as const }] : []
  })
}

export type ReorderAdvice = { itemId: string; onHand: number; avgMonthlyDemand: number; coverageMonths: number | null; suggestedOrderQty: number; urgency: 'critical' | 'soon' | 'ok' }

/** Coverage in months from average monthly demand; suggests an order up to `targetMonths` of cover. */
export function reorderAdvice(input: { itemId: string; onHand: number; incoming?: number; monthlyDemand: number[]; leadTimeDays?: number; targetMonths?: number }): ReorderAdvice {
  const { itemId, onHand, incoming = 0, monthlyDemand, leadTimeDays = 14, targetMonths = 2 } = input
  const avg = mean(monthlyDemand.slice(-6))
  const coverage = avg > 0 ? onHand / avg : null
  const leadMonths = leadTimeDays / 30
  const suggested = avg > 0 ? Math.max(0, Math.ceil(avg * (targetMonths + leadMonths) - onHand - incoming)) : 0
  const urgency = coverage === null ? 'ok' : coverage < leadMonths ? 'critical' : coverage < leadMonths + 0.5 ? 'soon' : 'ok'
  return { itemId, onHand, avgMonthlyDemand: Math.round(avg * 100) / 100, coverageMonths: coverage === null ? null : Math.round(coverage * 10) / 10, suggestedOrderQty: suggested, urgency }
}
