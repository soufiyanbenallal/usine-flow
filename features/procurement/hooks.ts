'use client'

import { useQuery } from '@tanstack/react-query'
import { createCrudHooks, featureKey } from '../_core/crud-hooks'
import { useOrganization } from '../organization/context'
import {
  agreementLinesService, agreementsService, orderLinesService, ordersService, procurementApi, receiptLinesService, receiptsService, requestLinesService, requestsService, rfqLinesService, rfqQuoteLinesService,
  rfqQuotesService, rfqsService, supplierInvoiceLinesService, supplierInvoicesService, supplierReturnLinesService, supplierReturnsService,
} from './service'
import type { PriceHistoryRow } from './types'

export const requestHooks = createCrudHooks('purchase_requests', requestsService, ['approvals'])
export const requestLineHooks = createCrudHooks('purchase_request_lines', requestLinesService, ['purchase_requests'])
export const orderHooks = createCrudHooks('purchase_orders', ordersService, ['approvals'])
export const orderLineHooks = createCrudHooks('purchase_order_lines', orderLinesService, ['purchase_orders'])
export const receiptHooks = createCrudHooks('purchase_receipts', receiptsService, ['purchase_orders', 'stock', 'movements'])
export const receiptLineHooks = createCrudHooks('purchase_receipt_lines', receiptLinesService, ['purchase_receipts'])
export const supplierReturnHooks = createCrudHooks('supplier_returns', supplierReturnsService, ['stock'])
export const supplierReturnLineHooks = createCrudHooks('supplier_return_lines', supplierReturnLinesService, ['supplier_returns'])
export const supplierInvoiceHooks = createCrudHooks('supplier_invoices', supplierInvoicesService, ['balances'])
export const supplierInvoiceLineHooks = createCrudHooks('supplier_invoice_lines', supplierInvoiceLinesService, ['supplier_invoices'])
export const agreementHooks = createCrudHooks('purchase_agreements', agreementsService)
export const agreementLineHooks = createCrudHooks('purchase_agreement_lines', agreementLinesService, ['purchase_agreements'])
export const rfqHooks = createCrudHooks('rfqs', rfqsService)
export const rfqLineHooks = createCrudHooks('rfq_lines', rfqLinesService, ['rfqs'])
export const rfqQuoteHooks = createCrudHooks('rfq_quotes', rfqQuotesService, ['rfqs'])
export const rfqQuoteLineHooks = createCrudHooks('rfq_quote_lines', rfqQuoteLinesService, ['rfq_quotes'])

export const PROCUREMENT_FEATURES = ['purchase_orders', 'purchase_receipts', 'purchase_requests', 'rfqs', 'stock', 'movements', 'lots', 'inspections', 'approvals', 'notifications', 'balances', 'supplier_invoices']

export function usePriceHistory(itemId?: string) {
  const org = useOrganization()
  return useQuery<PriceHistoryRow[], Error>({ queryKey: [...featureKey(org.id, 'price_history'), itemId], queryFn: () => procurementApi.priceHistory(org.id, itemId) })
}
