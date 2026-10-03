export type Kpis = {
  inventory_value: number; items_count: number; low_stock_count: number; open_purchase_orders: number; pending_approvals: number; open_sales_orders: number
  sales_30d: number; purchases_30d: number; production_in_progress: number; production_late: number; produced_7d: number; scrap_7d: number
  open_ncr: number; overdue_capa: number; pending_inspections: number; open_breakdowns: number; machines_stopped: number; preventive_due: number; downtime_minutes_7d: number
  receivable: number; receivable_overdue: number; payable: number; cash_balance: number; open_tasks: number; expiring_lots: number; unread_notifications: number
}
export type DailyAmount = { day: string; orders: number; total: number }
export type ProductionDaily = { day: string; item_id: string; produced_qty: number; scrap_qty: number }
export type QualityDaily = { day: string; inspections: number; passed: number; failed: number; rejected_qty: number; inspected_qty: number; first_pass_yield_pct: number | null }
export type OeeDaily = { work_center_id: string; day: string; run_minutes: number; downtime_minutes: number; availability_pct: number | null; performance_pct: number | null; quality_pct: number | null; oee_pct: number | null }
export type DowntimeReason = { work_center_id: string | null; reason: string; category: string; minutes: number; events: number }
export type SupplierPerformance = Record<string, unknown> & { supplier_id?: string; name?: string }
export type PartnerBalance = { partner_id: string; name: string; kinds: string[]; credit_limit: number | null; receivable: number; receivable_overdue: number; payable: number; payable_overdue: number }
export type ProgressRow = { production_order_id: string; number: string | null; item_id: string; quantity: number; produced_qty: number; scrap_qty: number; status: string; planned_start: string | null; planned_end: string | null; progress_pct: number | null }

export type DashboardRole = 'direction' | 'purchasing' | 'sales' | 'production' | 'quality' | 'maintenance' | 'warehouse' | 'finance'
export const DASHBOARD_ROLES: { id: DashboardRole; label: string }[] = [
  { id: 'direction', label: 'Direction' }, { id: 'purchasing', label: 'Achats' }, { id: 'sales', label: 'Ventes' }, { id: 'production', label: 'Production' },
  { id: 'quality', label: 'Qualité' }, { id: 'maintenance', label: 'Maintenance' }, { id: 'warehouse', label: 'Entrepôt' }, { id: 'finance', label: 'Finance' },
]
