import { rpc } from '@/lib/rpc'
import { createCrudService } from '../_core/crud-service'
import type { CapaAction, Inspection, InspectionPlan, InspectionPoint, InspectionResult, NonConformance, QualityCertificate, ReasonCode, Recall, RecallItem, TraceRow } from './types'

type P = Record<string, unknown>
const crud = <R extends { id: string }>(table: string, order?: { column: string; ascending?: boolean }) => createCrudService<R, P, P>(table, order ? { order } : {})
export const reasonsService = crud<ReasonCode>('reason_codes', { column: 'code', ascending: true })
export const plansService = crud<InspectionPlan>('inspection_plans', { column: 'code', ascending: true })
export const pointsService = crud<InspectionPoint>('inspection_points', { column: 'seq', ascending: true })
export const inspectionsService = crud<Inspection>('inspections')
export const resultsService = crud<InspectionResult>('inspection_results', { column: 'created_at', ascending: true })
export const ncrService = crud<NonConformance>('non_conformances')
export const capaService = crud<CapaAction>('capa_actions')
export const certificatesService = crud<QualityCertificate>('quality_certificates')
export const recallsService = crud<Recall>('recalls')
export const recallItemsService = crud<RecallItem>('recall_items')

export const qualityApi = {
  createInspection: (args: { kind: string; item: string; qty: number; lot?: string; sourceType?: string; sourceId?: string; warehouse?: string; location?: string }) =>
    rpc<string>('create_inspection', { p_kind: args.kind, p_item: args.item, p_qty: args.qty, p_lot: args.lot ?? null, p_source_type: args.sourceType ?? null, p_source_id: args.sourceId ?? null, p_warehouse: args.warehouse ?? null, p_location: args.location ?? null }),
  decide: (id: string, accepted: number, rejected: number, rejectBucket = 'damaged', comment?: string, deviation = false) =>
    rpc<string>('decide_inspection', { p_id: id, p_accepted: accepted, p_rejected: rejected, p_reject_bucket: rejectBucket, p_comment: comment ?? null, p_deviation: deviation }),
  traceForward: (lot: string) => rpc<TraceRow[]>('trace_forward', { p_lot: lot }),
  traceBackward: (lot: string) => rpc<TraceRow[]>('trace_backward', { p_lot: lot }),
  openRecall: (lot: string, reason: string, severity = 'major') => rpc<string>('open_recall', { p_lot: lot, p_reason: reason, p_severity: severity }),
}
