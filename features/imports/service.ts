import { toUserError } from '@/lib/errors'
import { requireSupabase } from '@/lib/supabase'
import type { ResolvedLine } from './opening-stock'

export type ImportJob = { id: string; kind: string; filename: string | null; total_rows: number; valid_rows: number; error_rows: number; status: string; created_at: string }

export const EXPORT_DATASETS = [
  { id: 'items', label: 'Articles', table: 'items', order: 'sku' },
  { id: 'partners', label: 'Partenaires', table: 'partners', order: 'code' },
  { id: 'locations', label: 'Emplacements', table: 'locations', order: 'code' },
  { id: 'employees', label: 'Employés', table: 'employees', order: 'code' },
  { id: 'assets', label: 'Équipements', table: 'assets', order: 'code' },
  { id: 'stock', label: 'Stock par article', table: 'item_stock_summary', order: 'sku' },
  { id: 'lots', label: 'Lots', table: 'lots', order: 'lot_number' },
] as const

export const importsApi = {
  async items(organizationId: string) {
    const { data, error } = await requireSupabase().from('items').select('id, sku, tracking, expiry_tracking').eq('organization_id', organizationId).limit(20000)
    if (error) throw toUserError(error)
    return (data ?? []) as { id: string; sku: string; tracking: string; expiry_tracking: boolean }[]
  },
  async locations(warehouseId: string) {
    const { data, error } = await requireSupabase().from('locations').select('id, code').eq('warehouse_id', warehouseId).limit(20000)
    if (error) throw toUserError(error)
    return (data ?? []) as { id: string; code: string }[]
  },
  /** Creates a draft opening-balance adjustment with its lines (posting stays an explicit, approved step). */
  async createOpeningAdjustment(organizationId: string, warehouseId: string, lines: ResolvedLine[], filename: string): Promise<string> {
    const db = requireSupabase()
    const { data, error } = await db.from('stock_adjustments').insert({ organization_id: organizationId, warehouse_id: warehouseId, kind: 'opening', reason: `Import ${filename}` }).select('id').single()
    if (error) throw toUserError(error)
    const id = data.id as string
    for (let i = 0; i < lines.length; i += 500) {
      const chunk = lines.slice(i, i + 500).map((l) => ({ ...l, organization_id: organizationId, adjustment_id: id, reason: 'Stock d’ouverture' }))
      const res = await db.from('stock_adjustment_lines').insert(chunk)
      if (res.error) {
        await db.from('stock_adjustments').delete().eq('id', id)
        throw toUserError(res.error)
      }
    }
    return id
  },
  async recordJob(organizationId: string, job: { kind: string; filename: string; total: number; valid: number; errors: number; report?: unknown }): Promise<void> {
    const { error } = await requireSupabase().from('import_jobs').insert({ organization_id: organizationId, kind: job.kind, filename: job.filename, total_rows: job.total, valid_rows: job.valid, error_rows: job.errors, status: job.errors > 0 && job.valid === 0 ? 'failed' : 'completed', report: job.report ?? null })
    if (error) throw toUserError(error)
  },
  async jobs(organizationId: string): Promise<ImportJob[]> {
    const { data, error } = await requireSupabase().from('import_jobs').select('id, kind, filename, total_rows, valid_rows, error_rows, status, created_at').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(30)
    if (error) throw toUserError(error)
    return (data ?? []) as ImportJob[]
  },
  async dataset(organizationId: string, table: string, order: string): Promise<Record<string, unknown>[]> {
    const { data, error } = await requireSupabase().from(table).select('*').eq('organization_id', organizationId).order(order).limit(50000)
    if (error) throw toUserError(error)
    return (data ?? []) as Record<string, unknown>[]
  },
}
