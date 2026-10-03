import { D, pct } from '@/lib/decimal'

export type PointKind = 'pass_fail' | 'measurement' | 'visual'
export type InspectionPoint = { kind: PointKind; min?: number | null; max?: number | null; required?: boolean }
export type PointResult = 'pending' | 'pass' | 'fail' | 'na'

/** Judges a measurement against its tolerance range (same rule as the SQL trigger). */
export function judgeMeasurement(value: number | null, point: Pick<InspectionPoint, 'min' | 'max'>): PointResult {
  if (value === null || Number.isNaN(value)) return 'pending'
  if (point.min !== null && point.min !== undefined && value < point.min) return 'fail'
  if (point.max !== null && point.max !== undefined && value > point.max) return 'fail'
  return 'pass'
}

/** Sample size for a sampling plan. */
export function sampleSize(plan: { method: 'all' | 'percent' | 'fixed' | 'aql'; percent?: number | null; size?: number | null }, lotQty: number): number {
  if (plan.method === 'percent') return Math.min(Math.ceil(D(lotQty).times(plan.percent ?? 100).div(100).toNumber()), lotQty)
  if (plan.method === 'fixed' || plan.method === 'aql') return Math.min(plan.size ?? lotQty, lotQty)
  return lotQty
}

/** Overall verdict from point results: any failed required point fails the inspection; pending required points block the decision. */
export function inspectionVerdict(results: { required: boolean; result: PointResult }[]): 'pending' | 'passed' | 'failed' {
  if (results.some((r) => r.result === 'fail')) return 'failed'
  if (results.some((r) => r.required && r.result === 'pending')) return 'pending'
  return 'passed'
}

export const defectRate = (rejected: number, inspected: number) => pct(rejected, inspected, 2).toNumber()
/** First-pass yield = inspections passed at the first attempt / inspections. */
export const firstPassYield = (passed: number, total: number) => pct(passed, total, 1).toNumber()

/** CAPA aging in days (open actions only) and overdue flag. */
export function capaAging(actions: { status: string; createdAt: string; dueDate: string | null }[], today: string) {
  const open = actions.filter((a) => ['open', 'in_progress'].includes(a.status))
  const days = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000)
  return {
    open: open.length,
    overdue: open.filter((a) => a.dueDate !== null && a.dueDate < today).length,
    averageAgeDays: open.length === 0 ? 0 : Math.round(open.reduce((s, a) => s + days(a.createdAt.slice(0, 10), today), 0) / open.length),
  }
}

export type TraceNode = { id: string; type: 'lot' | 'production_order' | 'delivery' | 'receipt'; label: string; level: number; partnerId?: string | null }
/** Groups a trace result by level for display (forward: 0 = root lot, deeper = descendants/customers). */
export function groupTraceByLevel(nodes: TraceNode[]): Map<number, TraceNode[]> {
  const out = new Map<number, TraceNode[]>()
  for (const n of [...nodes].sort((a, b) => a.level - b.level)) out.set(n.level, [...(out.get(n.level) ?? []), n])
  return out
}
