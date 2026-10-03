import type { MovementKind } from './calculations'

export type StockBucket = 'available' | 'quarantine' | 'damaged' | 'scrap' | 'consignment' | 'in_transit'
export const BUCKET_LABELS: Record<StockBucket, string> = { available: 'Disponible', quarantine: 'Quarantaine', damaged: 'Endommagé', scrap: 'Rebut', consignment: 'Consignation', in_transit: 'En transit' }
export const bucketOptions = (Object.keys(BUCKET_LABELS) as StockBucket[]).map((value) => ({ value, label: BUCKET_LABELS[value] }))

export type Movement = {
  id: string
  organization_id: string
  movement_type: MovementKind
  item_id: string
  warehouse_id: string
  location_id: string | null
  lot_id: string | null
  bucket: StockBucket
  quantity: number
  unit_cost: number
  value: number
  source_type: string
  source_id: string | null
  source_line_id: string | null
  idempotency_key: string | null
  reverses_id: string | null
  reason: string | null
  occurred_at: string
  created_at: string
  items?: { sku: string; name: string } | null
  warehouses?: { code: string } | null
  locations?: { code: string } | null
  lots?: { lot_number: string } | null
}

export type LotStatus = 'available' | 'quarantine' | 'blocked' | 'expired' | 'consumed'
export type Lot = {
  id: string; organization_id: string; item_id: string; lot_number: string; supplier_id: string | null; supplier_lot: string | null
  manufactured_on: string | null; received_on: string | null; expires_on: string | null; status: LotStatus; source_type: string | null; source_id: string | null; notes: string | null; created_at: string
  items?: { sku: string; name: string } | null
}
export type SerialStatus = 'in_stock' | 'reserved' | 'shipped' | 'consumed' | 'scrapped' | 'returned'
export type Serial = {
  id: string; organization_id: string; item_id: string; serial_number: string; lot_id: string | null; warehouse_id: string | null; location_id: string | null; status: SerialStatus
  source_type: string | null; source_id: string | null; created_at: string; items?: { sku: string; name: string } | null
}
export type Reservation = {
  id: string; organization_id: string; item_id: string; warehouse_id: string; lot_id: string | null; quantity: number; source_type: string; source_id: string; source_line_id: string | null
  status: 'active' | 'fulfilled' | 'released'; expires_on: string | null; created_at: string; items?: { sku: string; name: string } | null; warehouses?: { code: string } | null
}

export type AdjustmentKind = 'adjustment' | 'scrap' | 'damage' | 'found' | 'opening'
export type StockAdjustment = {
  id: string; organization_id: string; number: string | null; warehouse_id: string; kind: AdjustmentKind; reason: string | null; adjusted_on: string
  status: 'draft' | 'pending_approval' | 'approved' | 'posted' | 'reversed' | 'cancelled'; total_value: number; total_amount: number; notes: string | null; created_at: string
}
export type StockAdjustmentLine = {
  id: string; adjustment_id: string; item_id: string; location_id: string | null; lot_id: string | null; lot_number: string | null; expires_on: string | null
  bucket: StockBucket; quantity_delta: number; unit_cost: number | null; serials: string[] | null; reason: string | null
}
export type StockTransfer = { id: string; organization_id: string; number: string | null; from_warehouse_id: string; to_warehouse_id: string; transfer_date: string; status: 'draft' | 'approved' | 'posted' | 'reversed' | 'cancelled'; notes: string | null; created_at: string }
export type StockTransferLine = { id: string; transfer_id: string; item_id: string; from_location_id: string | null; to_location_id: string | null; lot_id: string | null; quantity: number }
export type InventoryCount = {
  id: string; organization_id: string; number: string | null; warehouse_id: string; zone_id: string | null; kind: 'cycle' | 'full'
  status: 'draft' | 'in_progress' | 'review' | 'posted' | 'reversed' | 'cancelled'; scheduled_on: string | null; total_variance_value: number; notes: string | null; created_at: string
}
export type InventoryCountLine = {
  id: string; count_id: string; item_id: string; location_id: string | null; lot_id: string | null; expected_qty: number; counted_qty: number | null
  counted_by: string | null; counted_at: string | null; recount: boolean; notes: string | null
}

export const ADJUSTMENT_KINDS = [
  { value: 'adjustment', label: 'Ajustement' }, { value: 'scrap', label: 'Rebut' }, { value: 'damage', label: 'Casse' }, { value: 'found', label: 'Surplus retrouvé' }, { value: 'opening', label: 'Stock initial' },
]
export const COUNT_KINDS = [{ value: 'cycle', label: 'Inventaire tournant' }, { value: 'full', label: 'Inventaire complet' }]
export const LOT_STATUS_OPTIONS = [
  { value: 'available', label: 'Disponible' }, { value: 'quarantine', label: 'Quarantaine' }, { value: 'blocked', label: 'Bloqué' }, { value: 'expired', label: 'Expiré' }, { value: 'consumed', label: 'Consommé' },
]
export const SERIAL_STATUS_OPTIONS = [
  { value: 'in_stock', label: 'En stock' }, { value: 'reserved', label: 'Réservé' }, { value: 'shipped', label: 'Expédié' }, { value: 'consumed', label: 'Consommé' }, { value: 'scrapped', label: 'Rebuté' }, { value: 'returned', label: 'Retourné' },
]
