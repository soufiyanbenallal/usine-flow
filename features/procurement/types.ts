export type DocStatus = 'draft' | 'pending_approval' | 'approved' | 'posted' | 'reversed' | 'cancelled'

type Priced = { quantity: number; uom_id: string | null; base_quantity: number | null; unit_price: number; discount_pct: number; vat_rate: number; line_total: number }
type Totals = { subtotal: number; tax_amount: number; total_amount: number }

export type PurchaseRequest = { id: string; organization_id: string; number: string | null; department_id: string | null; requested_by_name: string | null; needed_on: string | null; status: 'draft' | 'pending_approval' | 'approved' | 'converted' | 'cancelled'; notes: string | null; created_at: string } & Totals
export type PurchaseRequestLine = { id: string; request_id: string; item_id: string; description: string | null; supplier_id: string | null } & Priced

export type PurchaseOrderStatus = 'draft' | 'pending_approval' | 'approved' | 'ordered' | 'partially_received' | 'received' | 'closed' | 'cancelled'
export type PurchaseOrder = {
  id: string; organization_id: string; number: string | null; supplier_id: string; warehouse_id: string | null; request_id: string | null; agreement_id: string | null; rfq_id: string | null
  order_date: string; expected_date: string | null; currency: string; payment_terms_days: number; status: PurchaseOrderStatus; notes: string | null; created_at: string
} & Totals
export type PurchaseOrderLine = { id: string; po_id: string; item_id: string; description: string | null; received_qty: number; expected_date: string | null } & Priced

export type PurchaseReceipt = {
  id: string; organization_id: string; number: string | null; po_id: string | null; supplier_id: string; warehouse_id: string; location_id: string | null; supplier_delivery_note: string | null
  received_on: string; status: 'draft' | 'posted' | 'reversed' | 'cancelled'; notes: string | null; created_at: string
}
export type PurchaseReceiptLine = {
  id: string; receipt_id: string; po_line_id: string | null; item_id: string; quantity: number; uom_id: string | null; base_quantity: number | null; unit_cost: number | null
  lot_number: string | null; expires_on: string | null; manufactured_on: string | null; location_id: string | null; lot_id: string | null; serials: string[] | null; discrepancy_note: string | null
}
export type SupplierReturn = { id: string; organization_id: string; number: string | null; supplier_id: string; receipt_id: string | null; warehouse_id: string; reason: string | null; status: 'draft' | 'posted' | 'reversed' | 'cancelled'; notes: string | null; created_at: string }
export type SupplierReturnLine = { id: string; return_id: string; item_id: string; lot_id: string | null; location_id: string | null; bucket: string; quantity: number; unit_cost: number | null }
export type SupplierInvoice = {
  id: string; organization_id: string; number: string | null; supplier_invoice_no: string; supplier_id: string; po_id: string | null; receipt_id: string | null; invoice_date: string; due_date: string | null
  currency: string; paid_amount: number; status: DocStatus; payment_status: 'unpaid' | 'partial' | 'paid'; notes: string | null; created_at: string
} & Totals
export type SupplierInvoiceLine = { id: string; invoice_id: string; item_id: string | null; description: string; quantity: number; unit_price: number; discount_pct: number; vat_rate: number; line_total: number }
export type PurchaseAgreement = { id: string; organization_id: string; number: string | null; supplier_id: string; valid_from: string; valid_to: string | null; status: 'draft' | 'active' | 'expired' | 'cancelled'; notes: string | null; created_at: string }
export type PurchaseAgreementLine = { id: string; agreement_id: string; item_id: string; price: number; min_qty: number; max_qty: number | null }

export type Rfq = { id: string; organization_id: string; number: string | null; request_id: string | null; due_date: string | null; status: 'draft' | 'sent' | 'quoted' | 'awarded' | 'cancelled'; notes: string | null; created_at: string }
export type RfqLine = { id: string; rfq_id: string; item_id: string; quantity: number; uom_id: string | null }
export type RfqQuote = { id: string; rfq_id: string; supplier_id: string; status: 'invited' | 'quoted' | 'declined' | 'selected'; lead_time_days: number | null; valid_until: string | null; total_amount: number; notes: string | null }
export type RfqQuoteLine = { id: string; quote_id: string; rfq_line_id: string; unit_price: number }

export type PriceHistoryRow = { item_id: string; supplier_id: string; po_id: string; po_number: string | null; order_date: string; unit_price_base: number; standard_cost: number; variance_vs_standard: number }

export const SUPPLIER_RETURN_BUCKETS = [{ value: 'damaged', label: 'Endommagé' }, { value: 'quarantine', label: 'Quarantaine' }, { value: 'available', label: 'Disponible' }]
export const AGREEMENT_STATUS = [{ value: 'draft', label: 'Brouillon' }, { value: 'active', label: 'Actif' }, { value: 'expired', label: 'Expiré' }, { value: 'cancelled', label: 'Annulé' }]
