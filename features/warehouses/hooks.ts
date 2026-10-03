'use client'

import { useMemo } from 'react'
import { createCrudHooks } from '../_core/crud-hooks'
import type { Option } from '../_core/form-values'
import { createPickerSource } from '../_core/picker'
import { locationsService, warehousesService, zonesService } from './service'
import type { Location } from './types'

export const warehouseHooks = createCrudHooks('warehouses', warehousesService, ['stock', 'options'])
export const zoneHooks = createCrudHooks('warehouse_zones', zonesService)
export const locationHooks = createCrudHooks('locations', locationsService)

export function useWarehouseOptions(): Option[] {
  const { data } = warehouseHooks.useList()
  return useMemo(() => (data ?? []).filter((w) => w.active).map((w) => ({ value: w.id, label: w.name, hint: w.code })), [data])
}
export function useZoneOptions(warehouseId?: string): Option[] {
  const { data } = zoneHooks.useList()
  return useMemo(() => (data ?? []).filter((z) => z.active && (!warehouseId || z.warehouse_id === warehouseId)).map((z) => ({ value: z.id, label: z.name, hint: z.code })), [data, warehouseId])
}
export function useLocationOptions(warehouseId?: string): Option[] {
  const { data } = locationHooks.useList()
  return useMemo(() => (data ?? []).filter((l) => l.active && (!warehouseId || l.warehouse_id === warehouseId)).map((l) => ({ value: l.id, label: l.code })), [data, warehouseId])
}
export function useLocationIndex() {
  const { data } = locationHooks.useList()
  return useMemo(() => new Map<string, Location>((data ?? []).map((l) => [l.id, l])), [data])
}
export const locationPicker = createPickerSource<Pick<Location, 'id' | 'code'>>({
  feature: 'locations', table: 'locations', select: 'id, code', searchColumns: ['code', 'barcode'], order: 'code', where: { active: true },
  toOption: (l) => ({ value: l.id, label: l.code }),
})
