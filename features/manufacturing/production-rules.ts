import { D, pct } from '@/lib/decimal'

export type ProductionStatus = 'draft' | 'pending_approval' | 'approved' | 'planned' | 'released' | 'in_progress' | 'paused' | 'completed' | 'closed' | 'cancelled'

/** Production order state machine (mirrors the database functions). */
const TRANSITIONS: Record<ProductionStatus, ProductionStatus[]> = {
  draft: ['pending_approval', 'approved', 'planned', 'released', 'cancelled'],
  pending_approval: ['approved', 'draft', 'cancelled'],
  approved: ['planned', 'released', 'cancelled'],
  planned: ['released', 'cancelled'],
  released: ['in_progress', 'cancelled'],
  in_progress: ['paused', 'completed'],
  paused: ['in_progress', 'completed'],
  completed: ['closed'],
  closed: [],
  cancelled: [],
}
export const canTransition = (from: ProductionStatus, to: ProductionStatus) => TRANSITIONS[from]?.includes(to) ?? false
export const nextStatuses = (from: ProductionStatus) => TRANSITIONS[from] ?? []
export const isOpenOrder = (s: ProductionStatus) => ['released', 'in_progress', 'paused'].includes(s)

export type OperationState = 'pending' | 'running' | 'paused' | 'done' | 'skipped'
export type OperationProgress = { status: OperationState; plannedQty: number; doneQty: number; scrapQty: number }

/** Progress of one operation, 0–100. */
export const operationProgress = (op: OperationProgress) => (op.status === 'done' ? 100 : Math.min(pct(op.doneQty, op.plannedQty, 1).toNumber(), 100))

/** Order progress = produced / planned, capped at 100 (guide example OF-2026-00942 → 64 %). */
export const orderProgress = (producedQty: number, quantity: number) => Math.min(pct(producedQty, quantity, 0).toNumber(), 100)

export type MaterialLine = { required: number; issued: number; available: number }
/** Shortage of a material line: what is still to be issued and not covered by available stock. */
export const materialShortage = (m: MaterialLine) => Math.max(D(m.required).minus(m.issued).minus(m.available).toNumber(), 0)

/** Planned duration (minutes) of an operation: setup + run per unit × quantity + move + queue. */
export const plannedMinutes = (op: { setup: number; runPerUnit: number; move?: number; queue?: number }, quantity: number) =>
  D(op.setup).plus(D(op.runPerUnit).times(quantity)).plus(op.move ?? 0).plus(op.queue ?? 0).toDecimalPlaces(2).toNumber()

/** Backflush quantity of a material when `produced` units were reported (capped at 110 % of the requirement, like the SQL function). */
export const backflushQuantity = (m: { required: number; issued: number }, produced: number, orderQty: number) =>
  Math.max(Math.min(D(m.required).times(produced).div(orderQty).toDecimalPlaces(4).toNumber(), D(m.required).times(1.1).minus(m.issued).toNumber()), 0)

export const isLate = (plannedEnd: string | null | undefined, status: ProductionStatus, today: string) => !!plannedEnd && plannedEnd < today && isOpenOrder(status)
