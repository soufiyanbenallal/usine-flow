import type { ProductionStatus, OperationState } from './production-rules'

export type WorkCenter = {
  id: string; organization_id: string; facility_id: string | null; code: string; name: string; kind: 'machine' | 'manual' | 'assembly' | 'packaging' | 'quality' | 'subcontract'
  capacity_hours_per_day: number; efficiency_pct: number; hourly_machine_cost: number; hourly_labor_cost: number; overhead_rate_pct: number; active: boolean; created_at: string
}
export type Bom = { id: string; organization_id: string; item_id: string; code: string; name: string; active: boolean; created_at: string }
export type BomVersion = { id: string; organization_id: string; bom_id: string; version: number; status: 'draft' | 'active' | 'obsolete'; effective_from: string | null; effective_to: string | null; base_quantity: number; change_note: string | null; created_at: string }
export type BomLineRow = {
  id: string; version_id: string; component_item_id: string; quantity: number; uom_id: string | null; scrap_pct: number; kind: 'component' | 'co_product' | 'by_product'
  alternative_group: string | null; is_alternative: boolean; operation_seq: number | null; notes: string | null
}
export type Routing = { id: string; organization_id: string; item_id: string | null; code: string; name: string; active: boolean; created_at: string }
export type RoutingOperation = {
  id: string; routing_id: string; seq: number; name: string; work_center_id: string | null; setup_minutes: number; run_minutes_per_unit: number; move_minutes: number; queue_minutes: number
  labor_count: number; required_skill_id: string | null; instructions: string | null
}
export type ProductionOrder = {
  id: string; organization_id: string; number: string | null; item_id: string; quantity: number; bom_version_id: string | null; routing_id: string | null; warehouse_id: string; output_location_id: string | null
  sales_order_id: string | null; status: ProductionStatus; priority: number; source: 'manual' | 'mrp' | 'sales' | 'maintenance'; planned_start: string | null; planned_end: string | null
  actual_start: string | null; actual_end: string | null; produced_qty: number; scrap_qty: number; lot_number: string | null; total_amount: number; notes: string | null; created_at: string
}
export type ProductionMaterial = { id: string; production_order_id: string; bom_line_id: string | null; item_id: string; required_qty: number; issued_qty: number; warehouse_id: string | null; backflush: boolean; lot_id: string | null }
export type ProductionOperation = {
  id: string; production_order_id: string; routing_operation_id: string | null; seq: number; name: string; work_center_id: string | null; status: OperationState; planned_qty: number; done_qty: number; scrap_qty: number
  setup_minutes: number; run_minutes_per_unit: number; planned_minutes: number; accumulated_minutes: number; resumed_at: string | null; labor_count: number; operator_id: string | null; started_at: string | null; finished_at: string | null
}
export type ProductionOutput = { id: string; production_order_id: string; operation_id: string | null; item_id: string; kind: 'finished' | 'co_product' | 'by_product' | 'rework'; quantity: number; lot_id: string | null; unit_cost: number; reported_at: string }
export type ProductionConsumption = { id: string; production_order_id: string; material_id: string | null; item_id: string; lot_id: string | null; quantity: number; unit_cost: number; value: number; backflush: boolean; consumed_at: string }
export type ProductionScrap = { id: string; production_order_id: string; operation_id: string | null; item_id: string; quantity: number; reason_id: string | null; unit_cost: number; cost: number; notes: string | null; reported_at: string }
export type Downtime = {
  id: string; production_order_id: string | null; operation_id: string | null; work_center_id: string | null; asset_id: string | null; category: 'breakdown' | 'setup' | 'material' | 'planned' | 'quality' | 'other'
  reason_id: string | null; started_at: string; ended_at: string | null; minutes: number; maintenance_work_order_id: string | null; notes: string | null
}
export type CostSnapshot = {
  id: string; production_order_id: string; produced_qty: number; material_cost: number; labor_cost: number; machine_cost: number; overhead_cost: number; subcontract_cost: number; total_cost: number; unit_cost: number
  standard_total: number; standard_unit: number; variance: number; material_variance: number; labor_variance: number; machine_variance: number; other_variance: number; computed_at: string; number?: string | null; item_id?: string
}
export type StandardCostRoll = { id: string; item_id: string; bom_version_id: string | null; material: number; labor: number; machine: number; overhead: number; subcontract: number; total: number; computed_at: string }
export type SubcontractOrder = {
  id: string; number: string | null; production_order_id: string | null; operation_id: string | null; partner_id: string; item_id: string | null; description: string | null; quantity: number; unit_price: number; total_amount: number
  expected_date: string | null; status: 'draft' | 'sent' | 'received' | 'cancelled'; notes: string | null; created_at: string
}
export type MrpRun = { id: string; horizon_days: number; status: 'running' | 'completed' | 'failed'; params: Record<string, unknown>; warnings: string[]; suggestion_count: number; run_at: string }
export type MrpSuggestionRow = {
  id: string; run_id: string; item_id: string; kind: 'purchase' | 'production'; need_date: string; gross_qty: number; net_qty: number; suggested_qty: number; supplier_id: string | null; reason: string | null
  status: 'open' | 'converted' | 'dismissed'; converted_ref_type: string | null; converted_ref_id: string | null
}
export type OeeRow = { work_center_id: string; day: string; run_minutes: number; downtime_minutes: number; availability_pct: number | null; performance_pct: number | null; quality_pct: number | null; oee_pct: number | null }
export type DowntimeReasonRow = { work_center_id: string | null; reason: string; category: string; minutes: number; events: number }

export const WORK_CENTER_KINDS = [
  { value: 'machine', label: 'Machine' }, { value: 'manual', label: 'Poste manuel' }, { value: 'assembly', label: 'Assemblage' }, { value: 'packaging', label: 'Conditionnement' }, { value: 'quality', label: 'Contrôle' }, { value: 'subcontract', label: 'Sous-traitance' },
]
export const DOWNTIME_CATEGORIES = [
  { value: 'breakdown', label: 'Panne' }, { value: 'setup', label: 'Réglage / changement de série' }, { value: 'material', label: 'Manque matière' }, { value: 'planned', label: 'Arrêt planifié' }, { value: 'quality', label: 'Problème qualité' }, { value: 'other', label: 'Autre' },
]
export const BOM_LINE_KINDS = [{ value: 'component', label: 'Composant' }, { value: 'co_product', label: 'Co-produit' }, { value: 'by_product', label: 'Sous-produit' }]
export const PRODUCTION_PRIORITIES = [1, 2, 3, 4, 5].map((p) => ({ value: String(p), label: p === 1 ? '1 — Urgent' : p === 5 ? '5 — Faible' : String(p) }))
