'use client'

import { useQuery } from '@tanstack/react-query'
import { createCrudHooks, featureKey } from '../_core/crud-hooks'
import { useOrganization } from '../organization/context'
import { deliveriesService, deliveryLinesService, invoiceLinesService, invoicesService, orderLinesService, ordersService, quoteLinesService, quotesService, returnLinesService, returnsService, salesApi } from './service'

export const quoteHooks = createCrudHooks('quotes', quotesService, ['approvals'])
export const quoteLineHooks = createCrudHooks('quote_lines', quoteLinesService, ['quotes'])
export const orderHooks = createCrudHooks('sales_orders', ordersService, ['approvals'])
export const orderLineHooks = createCrudHooks('sales_order_lines', orderLinesService, ['sales_orders'])
export const deliveryHooks = createCrudHooks('deliveries', deliveriesService, ['sales_orders', 'stock', 'movements'])
export const deliveryLineHooks = createCrudHooks('delivery_lines', deliveryLinesService, ['deliveries'])
export const customerReturnHooks = createCrudHooks('customer_returns', returnsService, ['stock'])
export const customerReturnLineHooks = createCrudHooks('customer_return_lines', returnLinesService, ['customer_returns'])
export const salesInvoiceHooks = createCrudHooks('sales_invoices', invoicesService, ['balances', 'sales_orders'])
export const salesInvoiceLineHooks = createCrudHooks('sales_invoice_lines', invoiceLinesService, ['sales_invoices'])

export function useMargins(since?: string) {
  const org = useOrganization()
  return useQuery({ queryKey: [...featureKey(org.id, 'margins'), since], queryFn: () => salesApi.margins(org.id, since) })
}
export function useOtif() {
  const org = useOrganization()
  return useQuery({ queryKey: [...featureKey(org.id, 'otif')], queryFn: () => salesApi.otif(org.id) })
}
export function useCustomerExposure(customerId: string | undefined) {
  const org = useOrganization()
  return useQuery({ queryKey: [...featureKey(org.id, 'balances'), 'exposure', customerId], queryFn: () => salesApi.customerExposure(org.id, customerId!), enabled: !!customerId })
}
