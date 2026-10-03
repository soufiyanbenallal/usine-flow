import { toUserError } from '@/lib/errors'
import { requireSupabase } from '@/lib/supabase'
import { createCrudService } from '../_core/crud-service'
import type { Item, ItemBarcode, ItemPrice, ItemStock, ItemSupplier, ItemUom } from './types'

type Payload = Record<string, unknown>
export const itemsService = createCrudService<Item, Payload, Payload>('items', { order: { column: 'sku', ascending: true } })
export const barcodesService = createCrudService<ItemBarcode, Payload, Payload>('item_barcodes')
export const itemSuppliersService = createCrudService<ItemSupplier, Payload, Payload>('item_suppliers')
export const itemPricesService = createCrudService<ItemPrice, Payload, Payload>('item_prices')
export const itemUomsService = createCrudService<ItemUom, Payload, Payload>('item_uoms')

export const itemStockService = {
  async list(organizationId: string): Promise<ItemStock[]> {
    const { data, error } = await requireSupabase().from('item_stock_summary').select('*').eq('organization_id', organizationId).order('sku').limit(5000)
    if (error) throw toUserError(error)
    return (data ?? []) as ItemStock[]
  },
  /** Resolves a scanned code (barcode, SKU or internal reference) to an item id. */
  async findByCode(organizationId: string, code: string): Promise<Item | null> {
    const supabase = requireSupabase()
    const clean = code.trim()
    const { data: bc } = await supabase.from('item_barcodes').select('item_id').eq('organization_id', organizationId).eq('barcode', clean).maybeSingle()
    if (bc) return itemsService.get(bc.item_id)
    const { data, error } = await supabase.from('items').select('*').eq('organization_id', organizationId).or(`sku.eq.${clean.replace(/[,()]/g, '')},internal_ref.eq.${clean.replace(/[,()]/g, '')}`).limit(1).maybeSingle()
    if (error) throw toUserError(error)
    return (data as Item | null) ?? null
  },
}
