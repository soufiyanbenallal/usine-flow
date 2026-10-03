'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { createCrudHooks, featureKey } from '../_core/crud-hooks'
import type { Option } from '../_core/form-values'
import { useOrganization } from '../organization/context'
import { assetsService, maintenanceApi, partsService, plansService, readingsService, workOrdersService } from './service'

export const assetHooks = createCrudHooks('assets', assetsService, ['options'])
export const planHooks = createCrudHooks('maintenance_plans', plansService)
export const workOrderHooks = createCrudHooks('maintenance_work_orders', workOrdersService, ['assets', 'maintenance_plans', 'production_downtime', 'stock'])
export const partHooks = createCrudHooks('maintenance_parts', partsService, ['maintenance_work_orders'])
export const readingHooks = createCrudHooks('maintenance_readings', readingsService, ['assets', 'maintenance_work_orders'])

export const MAINTENANCE_FEATURES = ['assets', 'maintenance_work_orders', 'maintenance_plans', 'maintenance_readings', 'production_downtime', 'production_order_operations', 'stock', 'notifications']

export function useAssetOptions(): Option[] {
  const { data } = assetHooks.useList()
  return useMemo(() => (data ?? []).filter((a) => a.active).map((a) => ({ value: a.id, label: a.name, hint: a.code })), [data])
}
export function useAssetIndex() {
  const { data } = assetHooks.useList()
  return useMemo(() => new Map((data ?? []).map((a) => [a.id, a])), [data])
}
export function useReliability() {
  const org = useOrganization()
  return useQuery({ queryKey: [...featureKey(org.id, 'assets'), 'reliability'], queryFn: () => maintenanceApi.reliability(org.id) })
}
