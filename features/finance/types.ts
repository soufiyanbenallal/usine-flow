export type PaymentMethod = 'cash' | 'bank_transfer' | 'cheque' | 'card' | 'bill_of_exchange'
export type Payment = {
  id: string; organization_id: string; number: string | null; direction: 'in' | 'out'; partner_id: string; sales_invoice_id: string | null; supplier_invoice_id: string | null
  amount: number; total_amount: number; method: PaymentMethod; paid_on: string; reference: string | null; cost_center_id: string | null
  status: 'draft' | 'pending_approval' | 'approved' | 'posted' | 'reversed' | 'cancelled'; notes: string | null; created_at: string
}
export type ExpenseCategory = 'raw_materials' | 'transport' | 'energy' | 'maintenance' | 'salaries' | 'rent' | 'taxes' | 'supplies' | 'other'
export type Expense = {
  id: string; organization_id: string; number: string | null; category: ExpenseCategory; description: string; amount: number; total_amount: number; spent_on: string; partner_id: string | null
  cost_center_id: string | null; paid: boolean; method: PaymentMethod; status: 'draft' | 'pending_approval' | 'approved' | 'posted' | 'reversed' | 'cancelled'; receipt_path: string | null; notes: string | null; created_at: string
}
export type CashMovement = { id: string; organization_id: string; kind: 'in' | 'out'; account: 'cash' | 'bank'; amount: number; occurred_on: string; label: string; source_type: string | null; source_id: string | null; cost_center_id: string | null; created_at: string }
export type CostCenter = { id: string; organization_id: string; code: string; name: string; kind: 'department' | 'project' | 'site' | 'other'; department_id: string | null; active: boolean; created_at: string }

export const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Virement' }, { value: 'cash', label: 'Espèces' }, { value: 'cheque', label: 'Chèque' }, { value: 'card', label: 'Carte' }, { value: 'bill_of_exchange', label: 'Effet (LCN)' },
]
export const EXPENSE_CATEGORIES = [
  { value: 'raw_materials', label: 'Matières premières' }, { value: 'transport', label: 'Transport' }, { value: 'energy', label: 'Énergie' }, { value: 'maintenance', label: 'Maintenance' },
  { value: 'salaries', label: 'Salaires' }, { value: 'rent', label: 'Loyer' }, { value: 'taxes', label: 'Taxes' }, { value: 'supplies', label: 'Fournitures' }, { value: 'other', label: 'Autre' },
]
export const COST_CENTER_KINDS = [{ value: 'department', label: 'Département' }, { value: 'project', label: 'Projet' }, { value: 'site', label: 'Site' }, { value: 'other', label: 'Autre' }]
