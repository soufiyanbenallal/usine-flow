'use client'

import { createCrudHooks } from '../_core/crud-hooks'
import { createPickerSource } from '../_core/picker'
import { cashService, costCentersService, expensesService, paymentsService } from './service'

export const paymentHooks = createCrudHooks('payments', paymentsService, ['balances', 'sales_invoices', 'supplier_invoices', 'cash_movements'])
export const expenseHooks = createCrudHooks('expenses', expensesService, ['cash_movements'])
export const cashHooks = createCrudHooks('cash_movements', cashService)
export const costCenterHooks = createCrudHooks('cost_centers', costCentersService)

export const salesInvoicePicker = createPickerSource<{ id: string; number: string | null; total_amount: number }>({
  feature: 'sales_invoices', table: 'sales_invoices', select: 'id, number, total_amount', searchColumns: ['number'], order: 'number', where: { status: 'posted' },
  toOption: (i) => ({ value: i.id, label: i.number ?? i.id, hint: `${i.total_amount} MAD` }),
})
export const supplierInvoicePicker = createPickerSource<{ id: string; number: string | null; supplier_invoice_no: string; total_amount: number }>({
  feature: 'supplier_invoices', table: 'supplier_invoices', select: 'id, number, supplier_invoice_no, total_amount', searchColumns: ['number', 'supplier_invoice_no'], order: 'number', where: { status: 'posted' },
  toOption: (i) => ({ value: i.id, label: i.number ?? i.id, hint: `${i.supplier_invoice_no} · ${i.total_amount} MAD` }),
})
