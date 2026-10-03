/** Broadcast table → query-feature keys to invalidate (see `public.broadcast_org_change()`). */
export const TABLE_FEATURES: Record<string, string[]> = {
  production_orders: ['production_orders', 'dashboard'],
  production_order_operations: ['production_order_operations', 'production_orders'],
  production_downtime: ['production_downtime', 'assets'],
  assets: ['assets', 'production_downtime'],
  maintenance_work_orders: ['maintenance_work_orders', 'assets', 'dashboard'],
  warehouse_tasks: ['warehouse_tasks'],
  approval_requests: ['approvals', 'dashboard'],
  inventory_balances: ['stock', 'dashboard', 'movements'],
  notifications: ['notifications'],
  inspections: ['inspections', 'non_conformances'],
  pick_lists: ['pick_lists', 'warehouse_tasks'],
}

/** Feature keys affected by a broadcast event named `<table>.<operation>`. */
export function featuresForEvent(event: string): string[] {
  const table = event.split('.')[0] ?? ''
  return TABLE_FEATURES[table] ?? []
}

export const orgTopic = (organizationId: string) => `org:${organizationId}`
