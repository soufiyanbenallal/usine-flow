type Priced = { quantity: number; uom_id: string | null; base_quantity: number | null; unit_price: number; discount_pct: number; vat_rate: number; line_total: number }
type Totals = { subtotal: number; tax_amount: number; total_amount: number }

export type Quote = { id: string; organization_id: string; number: string | null; customer_id: string; quote_date: string; valid_until: string | null; currency: string; status: 'draft' | 'pending_approval' | 'approved' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted' | 'cancelled'; notes: string | null; created_at: string } & Totals
export type QuoteLine = { id: string; quote_id: string; item_id: string; description: string | null } & Priced

export type SalesOrderStatus = 'draft' | 'pending_approval' | 'approved' | 'confirmed' | 'partially_delivered' | 'delivered' | 'invoiced' | 'closed' | 'cancelled'
export type SalesOrder = {
  id: string; organization_id: string; number: string | null; customer_id: string; quote_id: string | null; warehouse_id: string | null; delivery_address_id: string | null; order_date: string
  requested_date: string | null; currency: string; payment_terms_days: number; status: SalesOrderStatus; cost_amount: number; notes: string | null; created_at: string
} & Totals
export type SalesOrderLine = { id: string; so_id: string; item_id: string; description: string | null; delivered_qty: number; invoiced_qty: number; cost_amount: number; requested_date: string | null } & Priced

export type DeliveryStage = 'pending' | 'picking' | 'packed' | 'loaded' | 'dispatched'
export type Delivery = {
  id: string; organization_id: string; number: string | null; so_id: string | null; customer_id: string; warehouse_id: string; carrier_id: string | null; vehicle: string | null; driver: string | null; tracking_no: string | null
  delivery_date: string; stage: DeliveryStage; status: 'draft' | 'posted' | 'reversed' | 'cancelled'; notes: string | null; created_at: string
}
export type DeliveryLine = { id: string; delivery_id: string; so_line_id: string | null; item_id: string; quantity: number; uom_id: string | null; base_quantity: number | null; lot_id: string | null; location_id: string | null; serials: string[] | null }
export type CustomerReturn = { id: string; organization_id: string; number: string | null; customer_id: string; delivery_id: string | null; warehouse_id: string; reason: string | null; status: 'draft' | 'posted' | 'reversed' | 'cancelled'; notes: string | null; created_at: string }
export type CustomerReturnLine = { id: string; return_id: string; item_id: string; lot_id: string | null; location_id: string | null; quantity: number; condition: 'good' | 'damaged' | 'quarantine'; unit_cost: number | null }
export type SalesInvoice = {
  id: string; organization_id: string; number: string | null; customer_id: string; so_id: string | null; delivery_id: string | null; invoice_date: string; due_date: string | null; currency: string
  paid_amount: number; status: 'draft' | 'approved' | 'posted' | 'reversed' | 'cancelled'; payment_status: 'unpaid' | 'partial' | 'paid'; notes: string | null; created_at: string
} & Totals
export type SalesInvoiceLine = { id: string; invoice_id: string; so_line_id: string | null; item_id: string | null; description: string; quantity: number; unit_price: number; discount_pct: number; vat_rate: number; line_total: number }

export type MarginRow = { customer_id: string; item_id: string; so_id: string; order_date: string; delivered_qty: number; revenue: number; cost: number; margin: number }
export type OtifRow = { so_id: string; number: string | null; customer_id: string; requested_date: string | null; delivered_on: string | null; in_full: boolean; on_time: boolean }

export const RETURN_CONDITIONS = [{ value: 'good', label: 'Bon état (remis en stock)' }, { value: 'damaged', label: 'Endommagé' }, { value: 'quarantine', label: 'À contrôler (quarantaine)' }]
export const DELIVERY_STAGES: { value: DeliveryStage; label: string }[] = [
  { value: 'pending', label: 'À préparer' }, { value: 'picking', label: 'Préparation' }, { value: 'packed', label: 'Emballé' }, { value: 'loaded', label: 'Chargé' }, { value: 'dispatched', label: 'Expédié' },
]
