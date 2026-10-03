import { toUserError } from '@/lib/errors'
import { rpc } from '@/lib/rpc'
import { requireSupabase } from '@/lib/supabase'
import { createCrudService } from '../_core/crud-service'
import type { Asset, MaintenancePart, MaintenancePlan, MaintenanceReading, MaintenanceWorkOrder, ReliabilityRow } from './types'

type P = Record<string, unknown>
export const assetsService = createCrudService<Asset, P, P>('assets', { order: { column: 'code', ascending: true } })
export const plansService = createCrudService<MaintenancePlan, P, P>('maintenance_plans', { order: { column: 'next_due_date', ascending: true } })
export const workOrdersService = createCrudService<MaintenanceWorkOrder, P, P>('maintenance_work_orders')
export const partsService = createCrudService<MaintenancePart, P, P>('maintenance_parts')
export const readingsService = createCrudService<MaintenanceReading, P, P>('maintenance_readings', { order: { column: 'read_at', ascending: false } })

export const maintenanceApi = {
  reportBreakdown: (asset: string, title: string, description?: string, reason?: string) => rpc<string>('report_breakdown', { p_asset: asset, p_title: title, p_description: description ?? null, p_reason: reason ?? null }),
  startWorkOrder: (id: string) => rpc<void>('start_maintenance_work_order', { p_id: id }),
  completeWorkOrder: (id: string, resolution?: string, laborMinutes?: number) => rpc<void>('complete_maintenance_work_order', { p_id: id, p_resolution: resolution ?? null, p_labor_minutes: laborMinutes ?? null }),
  recordReading: (asset: string, value: number, kind = 'hours', notes?: string) => rpc<void>('record_meter_reading', { p_asset: asset, p_value: value, p_kind: kind, p_notes: notes ?? null }),
  generatePreventive: (org: string) => rpc<number>('generate_preventive_work_orders', { p_org: org }),
  async reliability(organizationId: string): Promise<ReliabilityRow[]> {
    const { data, error } = await requireSupabase().from('asset_reliability_view').select('*').eq('organization_id', organizationId).limit(2000)
    if (error) throw toUserError(error)
    return (data ?? []) as ReliabilityRow[]
  },
}
