export type ItemType = 'raw_material' | 'component' | 'consumable' | 'packaging' | 'semi_finished' | 'finished_product' | 'spare_part' | 'service'
export type Tracking = 'none' | 'lot' | 'serial'
export type ValuationMethod = 'fifo' | 'average' | 'standard'

export type Item = {
  id: string
  organization_id: string
  sku: string
  internal_ref: string | null
  name: string
  name_ar: string | null
  name_fr: string | null
  description: string | null
  item_type: ItemType
  category_id: string | null
  brand: string | null
  family: string | null
  base_uom_id: string
  purchase_uom_id: string | null
  sales_uom_id: string | null
  production_uom_id: string | null
  weight: number | null
  volume: number | null
  length: number | null
  width: number | null
  height: number | null
  min_stock: number
  max_stock: number | null
  safety_stock: number
  reorder_point: number
  reorder_qty: number
  lead_time_days: number
  manufacturer_ref: string | null
  tracking: Tracking
  expiry_tracking: boolean
  valuation_method: ValuationMethod
  standard_cost: number
  last_purchase_cost: number
  avg_cost: number
  sale_price: number
  vat_rate: number
  requires_inspection: boolean
  is_purchasable: boolean
  is_sellable: boolean
  is_manufactured: boolean
  image_path: string | null
  active: boolean
  created_at: string
}

export type ItemBarcode = { id: string; item_id: string; barcode: string; kind: 'ean13' | 'ean8' | 'code128' | 'code39' | 'qr' | 'internal'; uom_id: string | null; is_primary: boolean }
export type ItemSupplier = { id: string; item_id: string; supplier_id: string; supplier_ref: string | null; price: number; currency: string; lead_time_days: number; min_order_qty: number; preferred: boolean }
export type ItemPrice = { id: string; item_id: string; price_list_id: string; price: number; min_qty: number; discount_pct: number; valid_from: string | null; valid_to: string | null }
export type ItemUom = { id: string; item_id: string; uom_id: string; factor_to_base: number; purpose: 'purchase' | 'sales' | 'production' | 'storage' }

/** Row of the `item_stock_summary` view. */
export type ItemStock = {
  item_id: string; sku: string; name: string; item_type: ItemType; category_id: string | null; base_uom_id: string
  min_stock: number; max_stock: number | null; reorder_point: number; reorder_qty: number; safety_stock: number
  avg_cost: number; standard_cost: number; active: boolean
  on_hand: number; quarantine: number; damaged: number; reserved: number; available: number; stock_value: number; incoming: number; low_stock: boolean
}

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  raw_material: 'Matière première', component: 'Composant', consumable: 'Consommable', packaging: 'Emballage',
  semi_finished: 'Semi-fini', finished_product: 'Produit fini', spare_part: 'Pièce de rechange', service: 'Service',
}
export const itemTypeOptions = (Object.keys(ITEM_TYPE_LABELS) as ItemType[]).map((value) => ({ value, label: ITEM_TYPE_LABELS[value] }))
export const TRACKING_LABELS: Record<Tracking, string> = { none: 'Aucun', lot: 'Par lot', serial: 'Par numéro de série' }
export const trackingOptions = (Object.keys(TRACKING_LABELS) as Tracking[]).map((value) => ({ value, label: TRACKING_LABELS[value] }))
export const VALUATION_LABELS: Record<ValuationMethod, string> = { fifo: 'FIFO (premier entré, premier sorti)', average: 'Coût moyen pondéré', standard: 'Coût standard' }
export const valuationOptions = (Object.keys(VALUATION_LABELS) as ValuationMethod[]).map((value) => ({ value, label: VALUATION_LABELS[value] }))
export const BARCODE_KINDS = [
  { value: 'ean13', label: 'EAN-13' }, { value: 'ean8', label: 'EAN-8' }, { value: 'code128', label: 'Code 128' },
  { value: 'code39', label: 'Code 39' }, { value: 'qr', label: 'QR code' }, { value: 'internal', label: 'Code interne' },
]
export const VAT_OPTIONS = [0, 7, 10, 14, 20].map((v) => ({ value: String(v), label: `${v} %` }))
