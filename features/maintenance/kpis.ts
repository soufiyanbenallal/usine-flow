import { D, pct } from '@/lib/decimal'

export type FailureRecord = { downtimeMinutes: number; repairMinutes: number; cost?: number }

/** MTBF = (operating time − downtime) / failures, in hours. */
export function mtbfHours(operatingHours: number, failures: FailureRecord[]): number | null {
  if (failures.length === 0) return null
  const down = failures.reduce((a, f) => a.plus(f.downtimeMinutes), D(0)).div(60)
  return D(operatingHours).minus(down).div(failures.length).toDecimalPlaces(1).toNumber()
}
/** MTTR = repair time / failures, in hours. */
export function mttrHours(failures: FailureRecord[]): number | null {
  if (failures.length === 0) return null
  return failures.reduce((a, f) => a.plus(f.repairMinutes), D(0)).div(60).div(failures.length).toDecimalPlaces(2).toNumber()
}
/** Inherent availability = MTBF / (MTBF + MTTR). */
export function inherentAvailability(mtbf: number | null, mttr: number | null): number | null {
  if (mtbf === null || mttr === null || mtbf + mttr === 0) return null
  return D(mtbf).div(D(mtbf).plus(mttr)).times(100).toDecimalPlaces(1).toNumber()
}

/** Preventive compliance = preventive work orders completed on or before their due date / due work orders. */
export function preventiveCompliance(orders: { dueDate: string; completedOn: string | null }[]): number {
  if (orders.length === 0) return 100
  return pct(orders.filter((o) => o.completedOn !== null && o.completedOn <= o.dueDate).length, orders.length).toNumber()
}

/** OEE (TRS) = availability × performance × quality. */
export type OeeInput = { plannedMinutes: number; downtimeMinutes: number; idealCycleMinutes: number; totalCount: number; goodCount: number }
export type OeeResult = { availability: number; performance: number; quality: number; oee: number; runMinutes: number }
export function oee(i: OeeInput): OeeResult {
  const run = D(i.plannedMinutes).minus(i.downtimeMinutes)
  const availability = i.plannedMinutes > 0 ? run.div(i.plannedMinutes) : D(0)
  const performance = run.gt(0) ? D(i.idealCycleMinutes).times(i.totalCount).div(run) : D(0)
  const cappedPerformance = performance.gt(1) ? D(1) : performance
  const quality = i.totalCount > 0 ? D(i.goodCount).div(i.totalCount) : D(0)
  const r = (v: ReturnType<typeof D>) => v.times(100).toDecimalPlaces(1).toNumber()
  return { availability: r(availability), performance: r(cappedPerformance), quality: r(quality), oee: r(availability.times(cappedPerformance).times(quality)), runMinutes: run.toNumber() }
}

/** Anomaly detection: flags a value that deviates more than `k` standard deviations from the history mean. */
export function isAnomaly(history: number[], value: number, k = 2, minSamples = 5): { anomaly: boolean; mean: number; stdDev: number } {
  if (history.length < minSamples) return { anomaly: false, mean: 0, stdDev: 0 }
  const mean = history.reduce((a, b) => a + b, 0) / history.length
  const variance = history.reduce((a, b) => a + (b - mean) ** 2, 0) / history.length
  const stdDev = Math.sqrt(variance)
  const threshold = Math.max(stdDev * k, mean * 0.25)
  return { anomaly: value > mean + threshold, mean: Math.round(mean * 100) / 100, stdDev: Math.round(stdDev * 100) / 100 }
}
