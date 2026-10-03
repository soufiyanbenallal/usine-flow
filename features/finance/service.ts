import { rpc } from '@/lib/rpc'
import { createCrudService } from '../_core/crud-service'
import type { CashMovement, CostCenter, Expense, Payment } from './types'

type P = Record<string, unknown>
export const paymentsService = createCrudService<Payment, P, P>('payments')
export const expensesService = createCrudService<Expense, P, P>('expenses')
export const cashService = createCrudService<CashMovement, P, P>('cash_movements', { order: { column: 'occurred_on', ascending: false } })
export const costCentersService = createCrudService<CostCenter, P, P>('cost_centers', { order: { column: 'code', ascending: true } })

export const financeApi = {
  postPayment: (id: string) => rpc<void>('post_payment', { p_id: id }),
  reversePayment: (id: string, reason: string) => rpc<void>('reverse_payment', { p_id: id, p_reason: reason }),
  postExpense: (id: string) => rpc<void>('post_expense', { p_id: id }),
}
