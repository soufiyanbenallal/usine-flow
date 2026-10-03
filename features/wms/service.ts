import { toUserError } from '@/lib/errors'
import { rpc } from '@/lib/rpc'
import { requireSupabase } from '@/lib/supabase'
import { createCrudService } from '../_core/crud-service'
import type { Package, PackageLine, PickList, PickListLine, PickWave, WarehouseTask } from './types'

type P = Record<string, unknown>
const crud = <R extends { id: string }>(table: string, order?: { column: string; ascending?: boolean }) => createCrudService<R, P, P>(table, order ? { order } : {})
export const tasksService = crud<WarehouseTask>('warehouse_tasks', { column: 'priority', ascending: true })
export const wavesService = crud<PickWave>('pick_waves', { column: 'number', ascending: false })
export const pickListsService = crud<PickList>('pick_lists', { column: 'number', ascending: false })
export const pickLinesService = crud<PickListLine>('pick_list_lines')
export const packagesService = crud<Package>('packages', { column: 'package_no', ascending: false })
export const packageLinesService = crud<PackageLine>('package_lines')

export type ScanHit =
  | { kind: 'item'; id: string; label: string; hint: string }
  | { kind: 'location'; id: string; label: string; hint: string }
  | { kind: 'lot'; id: string; label: string; hint: string }

export const wmsApi = {
  createPickList: (salesOrderId: string, waveId?: string) => rpc<string>('create_pick_list_from_so', { p_so: salesOrderId, p_wave: waveId ?? null }),
  createWave: (warehouseId: string, pickLists: string[]) => rpc<string>('create_pick_wave', { p_warehouse: warehouseId, p_pick_lists: pickLists }),
  confirmPick: (line: string, qty: number) => rpc<void>('confirm_pick_line', { p_line: line, p_qty: qty }),
  createDelivery: (pickListId: string) => rpc<string>('create_delivery_from_pick_list', { p_pick_list: pickListId }),
  completeTask: (id: string, toLocation?: string, qty?: number) => rpc<void>('complete_warehouse_task', { p_id: id, p_to_location: toLocation ?? null, p_qty: qty ?? null }),
  async startTask(id: string): Promise<void> {
    const { error } = await requireSupabase().from('warehouse_tasks').update({ status: 'in_progress', started_at: new Date().toISOString() }).eq('id', id).eq('status', 'open')
    if (error) throw toUserError(error)
  },
  /** Resolves a scanned code: item barcode / SKU, location barcode / code, then lot number. */
  async resolveCode(organizationId: string, raw: string): Promise<ScanHit | null> {
    const code = raw.trim()
    if (!code) return null
    const db = requireSupabase()
    const bc = await db.from('item_barcodes').select('item_id, items(sku, name)').eq('organization_id', organizationId).eq('barcode', code).maybeSingle()
    if (bc.error) throw toUserError(bc.error)
    if (bc.data) {
      const item = bc.data.items as unknown as { sku: string; name: string } | null
      return { kind: 'item', id: bc.data.item_id as string, label: item?.name ?? code, hint: item?.sku ?? '' }
    }
    const sku = await db.from('items').select('id, sku, name').eq('organization_id', organizationId).eq('sku', code).maybeSingle()
    if (sku.error) throw toUserError(sku.error)
    if (sku.data) return { kind: 'item', id: sku.data.id as string, label: sku.data.name as string, hint: sku.data.sku as string }
    const loc = await db.from('locations').select('id, code').eq('organization_id', organizationId).or(`barcode.eq.${code.replace(/[,()]/g, '')},code.eq.${code.replace(/[,()]/g, '')}`).limit(1).maybeSingle()
    if (loc.error) throw toUserError(loc.error)
    if (loc.data) return { kind: 'location', id: loc.data.id as string, label: loc.data.code as string, hint: 'Emplacement' }
    const lot = await db.from('lots').select('id, lot_number, items(name)').eq('organization_id', organizationId).eq('lot_number', code).limit(1).maybeSingle()
    if (lot.error) throw toUserError(lot.error)
    if (lot.data) return { kind: 'lot', id: lot.data.id as string, label: lot.data.lot_number as string, hint: (lot.data.items as unknown as { name: string } | null)?.name ?? 'Lot' }
    return null
  },
}
