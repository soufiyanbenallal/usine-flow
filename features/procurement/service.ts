import { toUserError } from '@/lib/errors'
import { rpc } from '@/lib/rpc'
import { requireSupabase } from '@/lib/supabase'
import { createCrudService } from '../_core/crud-service'
import type {
  PriceHistoryRow, PurchaseAgreement, PurchaseAgreementLine, PurchaseOrder, PurchaseOrderLine, PurchaseReceipt, PurchaseReceiptLine, PurchaseRequest, PurchaseRequestLine, Rfq, RfqLine, RfqQuote, RfqQuoteLine,
  SupplierInvoice, SupplierInvoiceLine, SupplierReturn, SupplierReturnLine,
} from './types'

type P = Record<string, unknown>
const crud = <R extends { id: string }>(table: string) => createCrudService<R, P, P>(table)

export const requestsService = crud<PurchaseRequest>('purchase_requests')
export const requestLinesService = crud<PurchaseRequestLine>('purchase_request_lines')
export const ordersService = crud<PurchaseOrder>('purchase_orders')
export const orderLinesService = crud<PurchaseOrderLine>('purchase_order_lines')
export const receiptsService = crud<PurchaseReceipt>('purchase_receipts')
export const receiptLinesService = crud<PurchaseReceiptLine>('purchase_receipt_lines')
export const supplierReturnsService = crud<SupplierReturn>('supplier_returns')
export const supplierReturnLinesService = crud<SupplierReturnLine>('supplier_return_lines')
export const supplierInvoicesService = crud<SupplierInvoice>('supplier_invoices')
export const supplierInvoiceLinesService = crud<SupplierInvoiceLine>('supplier_invoice_lines')
export const agreementsService = crud<PurchaseAgreement>('purchase_agreements')
export const agreementLinesService = crud<PurchaseAgreementLine>('purchase_agreement_lines')
export const rfqsService = crud<Rfq>('rfqs')
export const rfqLinesService = crud<RfqLine>('rfq_lines')
export const rfqQuotesService = crud<RfqQuote>('rfq_quotes')
export const rfqQuoteLinesService = crud<RfqQuoteLine>('rfq_quote_lines')

export const procurementApi = {
  sendOrder: (id: string) => rpc<void>('send_purchase_order', { p_id: id }),
  closeOrder: (id: string) => rpc<void>('close_purchase_order', { p_id: id }),
  createPoFromRequest: (request: string, supplier: string, warehouse?: string) => rpc<string>('create_po_from_request', { p_request: request, p_supplier: supplier, p_warehouse: warehouse ?? null }),
  awardRfq: (quote: string, warehouse?: string) => rpc<string>('award_rfq', { p_quote: quote, p_warehouse: warehouse ?? null }),
  createReceiptFromPo: (po: string, warehouse?: string, location?: string) => rpc<string>('create_receipt_from_po', { p_po: po, p_warehouse: warehouse ?? null, p_location: location ?? null }),
  postReceipt: (id: string) => rpc<void>('post_purchase_receipt', { p_id: id }),
  postSupplierReturn: (id: string) => rpc<void>('post_supplier_return', { p_id: id }),
  postSupplierInvoice: (id: string) => rpc<void>('post_supplier_invoice', { p_id: id }),
  async priceHistory(organizationId: string, itemId?: string): Promise<PriceHistoryRow[]> {
    let qb = requireSupabase().from('purchase_price_history_view').select('*').eq('organization_id', organizationId)
    if (itemId) qb = qb.eq('item_id', itemId)
    const { data, error } = await qb.order('order_date', { ascending: false }).limit(1000)
    if (error) throw toUserError(error)
    return (data ?? []) as PriceHistoryRow[]
  },
  /** Upserts the price a supplier quoted for one RFQ line. */
  async saveQuotePrice(organizationId: string, quoteId: string, rfqLineId: string, unitPrice: number): Promise<void> {
    const { error } = await requireSupabase().from('rfq_quote_lines').upsert({ organization_id: organizationId, quote_id: quoteId, rfq_line_id: rfqLineId, unit_price: unitPrice }, { onConflict: 'quote_id,rfq_line_id' })
    if (error) throw toUserError(error)
  },
}
