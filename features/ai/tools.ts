import type { SupabaseClient } from '@supabase/supabase-js'

/** Read-only tools exposed to the assistant. They run with the caller's JWT, so row-level security scopes every answer to their organization. */
export const TOOL_DEFINITIONS = [
  { name: 'get_kpis', description: 'Key operational indicators of the organization (stock value, late production orders, open NCRs, receivables, breakdowns, tasks…).', input_schema: { type: 'object' as const, properties: {}, required: [] as string[] } },
  { name: 'search_stock', description: 'Stock levels (on hand, reserved, available, incoming, reorder point) for items matching a SKU or name fragment.', input_schema: { type: 'object' as const, properties: { query: { type: 'string', description: 'SKU or name fragment' } }, required: ['query'] } },
  { name: 'low_stock_items', description: 'Items at or below their reorder point or minimum stock.', input_schema: { type: 'object' as const, properties: {}, required: [] as string[] } },
  { name: 'late_production_orders', description: 'Production orders (released / in progress / paused) whose planned end date has passed.', input_schema: { type: 'object' as const, properties: {}, required: [] as string[] } },
  { name: 'open_breakdowns', description: 'Open maintenance breakdown work orders and stopped machines.', input_schema: { type: 'object' as const, properties: {}, required: [] as string[] } },
  { name: 'open_quality_issues', description: 'Open non-conformances and overdue CAPA actions.', input_schema: { type: 'object' as const, properties: {}, required: [] as string[] } },
  { name: 'overdue_receivables', description: 'Customers with overdue invoices, largest first.', input_schema: { type: 'object' as const, properties: {}, required: [] as string[] } },
]

const clean = (q: string) => q.replace(/[%_\\,()]/g, ' ').trim().slice(0, 50)

export async function runTool(db: SupabaseClient, organizationId: string, name: string, input: Record<string, unknown>): Promise<unknown> {
  const fail = (e: { message: string } | null) => { if (e) throw new Error(e.message) }
  switch (name) {
    case 'get_kpis': {
      const { data, error } = await db.rpc('dashboard_kpis', { p_org: organizationId })
      fail(error)
      return data
    }
    case 'search_stock': {
      const q = clean(String(input.query ?? ''))
      const { data, error } = await db.from('item_stock_summary').select('sku, name, on_hand, reserved, available, incoming, reorder_point, min_stock, stock_value').eq('organization_id', organizationId).or(`sku.ilike.%${q}%,name.ilike.%${q}%`).limit(15)
      fail(error)
      return data
    }
    case 'low_stock_items': {
      const { data, error } = await db.from('item_stock_summary').select('sku, name, on_hand, available, incoming, reorder_point, reorder_qty').eq('organization_id', organizationId).eq('low_stock', true).eq('active', true).limit(25)
      fail(error)
      return data
    }
    case 'late_production_orders': {
      const { data, error } = await db.from('production_progress_view').select('number, quantity, produced_qty, status, planned_end, progress_pct').eq('organization_id', organizationId).in('status', ['released', 'in_progress', 'paused']).lt('planned_end', new Date().toISOString().slice(0, 10)).order('planned_end').limit(25)
      fail(error)
      return data
    }
    case 'open_breakdowns': {
      const [wo, assets] = await Promise.all([
        db.from('maintenance_work_orders').select('number, title, status, priority, opened_at').eq('organization_id', organizationId).eq('breakdown', true).in('status', ['open', 'assigned', 'in_progress']).limit(25),
        db.from('assets').select('code, name, status').eq('organization_id', organizationId).eq('status', 'stopped').limit(25),
      ])
      fail(wo.error); fail(assets.error)
      return { breakdowns: wo.data, stopped_machines: assets.data }
    }
    case 'open_quality_issues': {
      const [ncr, capa] = await Promise.all([
        db.from('non_conformances').select('number, title, severity, status').eq('organization_id', organizationId).in('status', ['open', 'investigating', 'contained']).limit(25),
        db.from('capa_actions').select('number, title, status, due_date').eq('organization_id', organizationId).in('status', ['open', 'in_progress']).lt('due_date', new Date().toISOString().slice(0, 10)).limit(25),
      ])
      fail(ncr.error); fail(capa.error)
      return { non_conformances: ncr.data, overdue_capa: capa.data }
    }
    case 'overdue_receivables': {
      const { data, error } = await db.from('partner_balances_view').select('name, receivable, receivable_overdue').eq('organization_id', organizationId).gt('receivable_overdue', 0).order('receivable_overdue', { ascending: false }).limit(15)
      fail(error)
      return data
    }
    default:
      throw new Error(`Outil inconnu : ${name}`)
  }
}
