import { toUserError } from '@/lib/errors'
import { rpc } from '@/lib/rpc'
import { requireSupabase } from '@/lib/supabase'
import { createCrudService } from '../_core/crud-service'
import type { CustomerReturn, CustomerReturnLine, Delivery, DeliveryLine, MarginRow, OtifRow, Quote, QuoteLine, SalesInvoice, SalesInvoiceLine, SalesOrder, SalesOrderLine } from './types'

type P = Record<string, unknown>
const crud = <R extends { id: string }>(table: string) => createCrudService<R, P, P>(table)
export const quotesService = crud<Quote>('quotes')
export const quoteLinesService = crud<QuoteLine>('quote_lines')
export const ordersService = crud<SalesOrder>('sales_orders')
export const orderLinesService = crud<SalesOrderLine>('sales_order_lines')
export const deliveriesService = crud<Delivery>('deliveries')
export const deliveryLinesService = crud<DeliveryLine>('delivery_lines')
export const returnsService = crud<CustomerReturn>('customer_returns')
export const returnLinesService = crud<CustomerReturnLine>('customer_return_lines')
export const invoicesService = crud<SalesInvoice>('sales_invoices')
export const invoiceLinesService = crud<SalesInvoiceLine>('sales_invoice_lines')

export const salesApi = {
  confirmOrder: (id: string) => rpc<void>('confirm_sales_order', { p_id: id }),
  convertQuote: (quote: string, warehouse?: string) => rpc<string>('convert_quote_to_order', { p_quote: quote, p_warehouse: warehouse ?? null }),
  createDelivery: (so: string) => rpc<string>('create_delivery_from_so', { p_so: so }),
  postDelivery: (id: string) => rpc<void>('post_delivery', { p_id: id }),
  setStage: (id: string, stage: string) => rpc<void>('set_delivery_stage', { p_id: id, p_stage: stage }),
  postReturn: (id: string) => rpc<void>('post_customer_return', { p_id: id }),
  createInvoice: (so: string, deliveredOnly = true) => rpc<string>('create_invoice_from_so', { p_so: so, p_delivered_only: deliveredOnly }),
  postInvoice: (id: string) => rpc<void>('post_sales_invoice', { p_id: id }),
  customerExposure: (org: string, customer: string) => rpc<number>('customer_exposure', { p_org: org, p_customer: customer }),
  async margins(organizationId: string, since?: string): Promise<MarginRow[]> {
    let qb = requireSupabase().from('sales_margin_view').select('*').eq('organization_id', organizationId)
    if (since) qb = qb.gte('order_date', since)
    const { data, error } = await qb.limit(20000)
    if (error) throw toUserError(error)
    return (data ?? []) as MarginRow[]
  },
  async otif(organizationId: string): Promise<OtifRow[]> {
    const { data, error } = await requireSupabase().from('order_otif_view').select('*').eq('organization_id', organizationId).limit(5000)
    if (error) throw toUserError(error)
    return (data ?? []) as OtifRow[]
  },
}
