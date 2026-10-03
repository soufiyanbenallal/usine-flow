import { toUserError } from '@/lib/errors'
import { rpc } from '@/lib/rpc'
import { requireSupabase } from '@/lib/supabase'
import { createCrudService } from '../_core/crud-service'
import type {
  Bom, BomLineRow, BomVersion, CostSnapshot, Downtime, DowntimeReasonRow, MrpRun, MrpSuggestionRow, OeeRow, ProductionConsumption, ProductionMaterial, ProductionOperation, ProductionOrder, ProductionOutput,
  ProductionScrap, Routing, RoutingOperation, StandardCostRoll, SubcontractOrder, WorkCenter,
} from './types'

type P = Record<string, unknown>
const crud = <R extends { id: string }>(table: string, order?: { column: string; ascending?: boolean }) => createCrudService<R, P, P>(table, order ? { order } : {})

export const workCentersService = crud<WorkCenter>('work_centers', { column: 'code', ascending: true })
export const bomsService = crud<Bom>('boms', { column: 'code', ascending: true })
export const bomVersionsService = crud<BomVersion>('bom_versions', { column: 'version', ascending: false })
export const bomLinesService = crud<BomLineRow>('bom_lines', { column: 'created_at', ascending: true })
export const routingsService = crud<Routing>('routings', { column: 'code', ascending: true })
export const routingOperationsService = crud<RoutingOperation>('routing_operations', { column: 'seq', ascending: true })
export const productionOrdersService = crud<ProductionOrder>('production_orders')
export const materialsService = crud<ProductionMaterial>('production_order_materials')
export const operationsService = crud<ProductionOperation>('production_order_operations', { column: 'seq', ascending: true })
export const outputsService = crud<ProductionOutput>('production_outputs')
export const consumptionsService = crud<ProductionConsumption>('production_consumptions')
export const scrapService = crud<ProductionScrap>('production_scrap')
export const downtimeService = crud<Downtime>('production_downtime', { column: 'started_at', ascending: false })
export const snapshotsService = crud<CostSnapshot>('production_cost_snapshots')
export const standardRollsService = crud<StandardCostRoll>('standard_cost_rolls')
export const subcontractService = crud<SubcontractOrder>('subcontract_orders')
export const mrpRunsService = crud<MrpRun>('mrp_runs', { column: 'run_at', ascending: false })
export const mrpSuggestionsService = crud<MrpSuggestionRow>('mrp_suggestions')

export const manufacturingApi = {
  activateBom: (version: string) => rpc<void>('activate_bom_version', { p_version: version }),
  newBomVersion: (bom: string, note?: string) => rpc<string>('new_bom_version', { p_bom: bom, p_change_note: note ?? null }),
  release: (id: string) => rpc<void>('release_production_order', { p_id: id }),
  startOperation: (op: string, employee?: string) => rpc<void>('start_production_operation', { p_op: op, p_employee: employee ?? null }),
  pauseOperation: (op: string, category = 'other', reason?: string, notes?: string) => rpc<void>('pause_production_operation', { p_op: op, p_category: category, p_reason: reason ?? null, p_notes: notes ?? null }),
  resumeOperation: (op: string) => rpc<void>('resume_production_operation', { p_op: op }),
  completeOperation: (op: string) => rpc<void>('complete_production_operation', { p_op: op }),
  report: (args: { op: string; produced: number; scrap?: number; scrapReason?: string; lot?: string; employee?: string }) =>
    rpc<void>('report_production', { p_op: args.op, p_produced: args.produced, p_scrap: args.scrap ?? 0, p_scrap_reason: args.scrapReason ?? null, p_lot_number: args.lot ?? null, p_employee: args.employee ?? null }),
  postOutput: (po: string, qty: number, lot?: string, location?: string, op?: string, kind = 'finished') =>
    rpc<string>('post_production_output', { p_po: po, p_qty: qty, p_lot_number: lot ?? null, p_location: location ?? null, p_op: op ?? null, p_kind: kind }),
  consume: (po: string, material: string, qty: number, lot?: string) => rpc<number>('consume_material', { p_po: po, p_material: material, p_qty: qty, p_lot: lot ?? null }),
  startDowntime: (args: { workCenter: string; category: string; reason?: string; asset?: string; po?: string; notes?: string }) =>
    rpc<string>('start_downtime', { p_work_center: args.workCenter, p_category: args.category, p_reason: args.reason ?? null, p_asset: args.asset ?? null, p_po: args.po ?? null, p_notes: args.notes ?? null }),
  endDowntime: (id: string) => rpc<void>('end_downtime', { p_id: id }),
  complete: (id: string) => rpc<void>('complete_production_order', { p_id: id }),
  close: (id: string) => rpc<void>('close_production_order', { p_id: id }),
  requestCloseApproval: (id: string) => rpc<string | null>('request_production_close_approval', { p_id: id }),
  convertSuggestion: (id: string, warehouse: string, supplier?: string) => rpc<string>('convert_mrp_suggestion', { p_id: id, p_warehouse: warehouse, p_supplier: supplier ?? null }),
  async oee(organizationId: string, since: string): Promise<OeeRow[]> {
    const { data, error } = await requireSupabase().from('oee_daily_view').select('*').eq('organization_id', organizationId).gte('day', since).order('day').limit(5000)
    if (error) throw toUserError(error)
    return (data ?? []) as OeeRow[]
  },
  async downtimeReasons(organizationId: string): Promise<DowntimeReasonRow[]> {
    const { data, error } = await requireSupabase().from('downtime_by_reason_view').select('*').eq('organization_id', organizationId).limit(2000)
    if (error) throw toUserError(error)
    return (data ?? []) as DowntimeReasonRow[]
  },
}
