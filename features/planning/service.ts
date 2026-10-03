import { toUserError } from '@/lib/errors'
import { requireSupabase } from '@/lib/supabase'
import { addDays, runMrp, type Demand, type MrpInput, type MrpItem, type MrpResult, type Supply } from './mrp'
import type { BomIndex } from '../manufacturing/bom'

type Row = Record<string, unknown>
const num = (v: unknown) => Number(v ?? 0)
const str = (v: unknown) => (v === null || v === undefined ? null : String(v))

async function select(table: string, columns: string, organizationId: string) {
  const { data, error } = await requireSupabase().from(table).select(columns).eq('organization_id', organizationId).limit(20000)
  if (error) throw toUserError(error)
  return (data ?? []) as unknown as Row[]
}

/** Loads everything the MRP engine needs (stock, BOMs are passed in, open demand and supply) from the operational tables. */
export async function loadMrpInput(organizationId: string, boms: BomIndex, today: string, horizonDays: number): Promise<MrpInput> {
  const [stock, items, suppliers, soLines, orders, poLines, pos, materials, prods] = await Promise.all([
    select('item_stock_summary', 'item_id, sku, on_hand, min_stock, safety_stock, reorder_point, reorder_qty, active, item_type', organizationId),
    select('items', 'id, lead_time_days', organizationId),
    select('item_suppliers', 'item_id, supplier_id, preferred, min_order_qty', organizationId),
    select('sales_order_lines', 'so_id, item_id, quantity, base_quantity, delivered_qty, requested_date', organizationId),
    select('sales_orders', 'id, status, requested_date, order_date', organizationId),
    select('purchase_order_lines', 'po_id, item_id, quantity, base_quantity, received_qty, expected_date', organizationId),
    select('purchase_orders', 'id, status, expected_date, order_date', organizationId),
    select('production_order_materials', 'production_order_id, item_id, required_qty, issued_qty', organizationId),
    select('production_orders', 'id, item_id, quantity, produced_qty, status, planned_start, planned_end', organizationId),
  ])
  const lead = new Map(items.map((i) => [String(i.id), num(i.lead_time_days)]))
  const supplierOf = new Map<string, { supplier: string; moq: number }>()
  for (const s of suppliers) {
    const cur = supplierOf.get(String(s.item_id))
    if (!cur || s.preferred) supplierOf.set(String(s.item_id), { supplier: String(s.supplier_id), moq: num(s.min_order_qty) })
  }
  const mrpItems: MrpItem[] = stock
    .filter((s) => s.active && s.item_type !== 'service')
    .map((s) => ({
      id: String(s.item_id), sku: String(s.sku), onHand: num(s.on_hand), safetyStock: num(s.safety_stock), minStock: num(s.min_stock), reorderPoint: num(s.reorder_point),
      lotSize: num(s.reorder_qty), minOrderQty: supplierOf.get(String(s.item_id))?.moq ?? 0, leadTimeDays: lead.get(String(s.item_id)) ?? 0, supplierId: supplierOf.get(String(s.item_id))?.supplier ?? null,
    }))

  const soById = new Map(orders.map((o) => [String(o.id), o]))
  const demands: Demand[] = []
  for (const l of soLines) {
    const so = soById.get(String(l.so_id))
    if (!so || !['approved', 'confirmed', 'partially_delivered'].includes(String(so.status))) continue
    const qty = num(l.quantity)
    const remaining = qty > 0 ? (num(l.base_quantity) * (qty - num(l.delivered_qty))) / qty : 0
    if (remaining > 0) demands.push({ itemId: String(l.item_id), quantity: remaining, date: str(l.requested_date) ?? str(so.requested_date) ?? addDays(String(so.order_date), 7), source: 'sales_order', ref: String(l.so_id) })
  }
  const prodById = new Map(prods.map((p) => [String(p.id), p]))
  for (const m of materials) {
    const po = prodById.get(String(m.production_order_id))
    if (!po || !['planned', 'released', 'in_progress', 'paused'].includes(String(po.status))) continue
    const remaining = num(m.required_qty) - num(m.issued_qty)
    if (remaining > 0) demands.push({ itemId: String(m.item_id), quantity: remaining, date: str(po.planned_start) ?? today, source: 'production_order', ref: String(m.production_order_id) })
  }

  const poById = new Map(pos.map((p) => [String(p.id), p]))
  const supplies: Supply[] = []
  for (const l of poLines) {
    const po = poById.get(String(l.po_id))
    if (!po || !['approved', 'ordered', 'partially_received'].includes(String(po.status))) continue
    const qty = num(l.quantity)
    const remaining = qty > 0 ? (num(l.base_quantity) * (qty - num(l.received_qty))) / qty : 0
    if (remaining > 0) supplies.push({ itemId: String(l.item_id), quantity: remaining, date: str(l.expected_date) ?? str(po.expected_date) ?? addDays(String(po.order_date), lead.get(String(l.item_id)) ?? 7), source: 'purchase_order', ref: String(l.po_id) })
  }
  for (const p of prods) {
    if (!['planned', 'released', 'in_progress', 'paused'].includes(String(p.status))) continue
    const remaining = num(p.quantity) - num(p.produced_qty)
    if (remaining > 0) supplies.push({ itemId: String(p.item_id), quantity: remaining, date: str(p.planned_end) ?? today, source: 'production_order', ref: String(p.id) })
  }
  return { items: mrpItems, boms, demands, supplies, today, horizonDays, includeReorderPoint: true }
}

export async function loadRoutingLoads(organizationId: string) {
  const [routings, ops, wcs] = await Promise.all([
    select('routings', 'id, item_id', organizationId),
    select('routing_operations', 'routing_id, work_center_id, run_minutes_per_unit, setup_minutes', organizationId),
    select('work_centers', 'id, capacity_hours_per_day, efficiency_pct', organizationId),
  ])
  const minutes = new Map<string, { workCenterId: string; minutesPerUnit: number; setupMinutes: number }[]>()
  for (const r of routings) {
    if (!r.item_id) continue
    minutes.set(String(r.item_id), ops.filter((o) => o.routing_id === r.id && o.work_center_id).map((o) => ({ workCenterId: String(o.work_center_id), minutesPerUnit: num(o.run_minutes_per_unit), setupMinutes: num(o.setup_minutes) })))
  }
  return { minutes, capacity: new Map(wcs.map((w) => [String(w.id), (num(w.capacity_hours_per_day) * num(w.efficiency_pct)) / 100])) }
}

/** Persists a run and its suggestions. Returns the run id. */
export async function saveMrpRun(organizationId: string, horizonDays: number, result: MrpResult): Promise<string> {
  const supabase = requireSupabase()
  const { data: run, error } = await supabase.from('mrp_runs').insert({ organization_id: organizationId, horizon_days: horizonDays, warnings: result.warnings, suggestion_count: result.suggestions.length, params: { shortages: result.shortages.length } }).select('id').single()
  if (error) throw toUserError(error)
  if (result.suggestions.length > 0) {
    const { error: e2 } = await supabase.from('mrp_suggestions').insert(
      result.suggestions.filter((s) => s.suggestedQty > 0).map((s) => ({ organization_id: organizationId, run_id: run.id, item_id: s.itemId, kind: s.kind, need_date: s.needDate, gross_qty: s.grossQty, net_qty: s.netQty, suggested_qty: s.suggestedQty, supplier_id: s.supplierId ?? null, reason: s.reason })),
    )
    if (e2) throw toUserError(e2)
  }
  return run.id as string
}

export { runMrp }
