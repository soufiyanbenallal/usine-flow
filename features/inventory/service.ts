import { toUserError } from '@/lib/errors'
import { rpc } from '@/lib/rpc'
import { requireSupabase } from '@/lib/supabase'
import { createCrudService } from '../_core/crud-service'
import type { InventoryCount, InventoryCountLine, Lot, Movement, Reservation, Serial, StockAdjustment, StockAdjustmentLine, StockTransfer, StockTransferLine } from './types'

type Payload = Record<string, unknown>
export const movementsService = createCrudService<Movement, Payload, Payload>('inventory_movements', {
  select: '*, items(sku, name), warehouses(code), locations(code), lots(lot_number)',
  order: { column: 'occurred_at', ascending: false },
})
export const lotsService = createCrudService<Lot, Payload, Payload>('lots', { select: '*, items(sku, name)', order: { column: 'created_at', ascending: false } })
export const serialsService = createCrudService<Serial, Payload, Payload>('serials', { select: '*, items(sku, name)' })
export const reservationsService = createCrudService<Reservation, Payload, Payload>('inventory_reservations', { select: '*, items(sku, name), warehouses(code)' })
export const adjustmentsService = createCrudService<StockAdjustment, Payload, Payload>('stock_adjustments')
export const adjustmentLinesService = createCrudService<StockAdjustmentLine, Payload, Payload>('stock_adjustment_lines')
export const transfersService = createCrudService<StockTransfer, Payload, Payload>('stock_transfers')
export const transferLinesService = createCrudService<StockTransferLine, Payload, Payload>('stock_transfer_lines')
export const countsService = createCrudService<InventoryCount, Payload, Payload>('inventory_counts')
export const countLinesService = createCrudService<InventoryCountLine, Payload, Payload>('inventory_count_lines')

export const inventoryApi = {
  postAdjustment: (id: string) => rpc<void>('post_stock_adjustment', { p_id: id }),
  postTransfer: (id: string) => rpc<void>('post_stock_transfer', { p_id: id }),
  startCount: (id: string) => rpc<number>('start_inventory_count', { p_id: id }),
  recordCountLine: (line: string, counted: number) => rpc<void>('record_count_line', { p_line: line, p_counted: counted }),
  postCount: (id: string) => rpc<number>('post_inventory_count', { p_id: id }),
  reserve: (args: { org: string; item: string; warehouse: string; qty: number; sourceType: string; sourceId: string }) =>
    rpc<string>('reserve_stock', { p_org: args.org, p_item: args.item, p_warehouse: args.warehouse, p_qty: args.qty, p_source_type: args.sourceType, p_source_id: args.sourceId }),
  release: (org: string, sourceType: string, sourceId: string) => rpc<number>('release_reservations', { p_org: org, p_source_type: sourceType, p_source_id: sourceId }),
  availableToPromise: (org: string, item: string, warehouse?: string) => rpc<number>('available_to_promise', { p_org: org, p_item: item, p_warehouse: warehouse ?? null }),
  async agingBuckets(organizationId: string) {
    const { data, error } = await requireSupabase().from('stock_aging_view').select('*').eq('organization_id', organizationId).limit(5000)
    if (error) throw toUserError(error)
    return (data ?? []) as { item_id: string; age_bucket: string; quantity: number; value: number }[]
  },
  async slowMoving(organizationId: string) {
    const { data, error } = await requireSupabase().from('slow_moving_view').select('*').eq('organization_id', organizationId).order('days_idle', { ascending: false }).limit(1000)
    if (error) throw toUserError(error)
    return (data ?? []) as { item_id: string; sku: string; name: string; on_hand: number; stock_value: number; last_movement: string | null; days_idle: number; classification: 'active' | 'slow' | 'dead' }[]
  },
  async valueSnapshots(organizationId: string, days = 90) {
    const { data, error } = await requireSupabase().from('inventory_snapshots_daily').select('*').eq('organization_id', organizationId).order('day', { ascending: false }).limit(days)
    if (error) throw toUserError(error)
    return ((data ?? []) as { day: string; total_value: number; items_in_stock: number; low_stock_items: number }[]).reverse()
  },
}
