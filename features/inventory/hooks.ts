'use client'

import { useQuery } from '@tanstack/react-query'
import { createCrudHooks, featureKey, useRpcMutation } from '../_core/crud-hooks'
import { createPickerSource } from '../_core/picker'
import { useOrganization } from '../organization/context'
import {
  adjustmentLinesService, adjustmentsService, countLinesService, countsService, inventoryApi, lotsService, movementsService, reservationsService, serialsService, transferLinesService, transfersService,
} from './service'
import type { Lot } from './types'

export const movementHooks = createCrudHooks('movements', movementsService)
export const lotHooks = createCrudHooks('lots', lotsService, ['stock'])
export const serialHooks = createCrudHooks('serials', serialsService)
export const reservationHooks = createCrudHooks('reservations', reservationsService, ['stock'])
export const adjustmentHooks = createCrudHooks('stock_adjustments', adjustmentsService, ['stock'])
export const adjustmentLineHooks = createCrudHooks('stock_adjustment_lines', adjustmentLinesService, ['stock_adjustments'])
export const transferHooks = createCrudHooks('stock_transfers', transfersService, ['stock'])
export const transferLineHooks = createCrudHooks('stock_transfer_lines', transferLinesService, ['stock_transfers'])
export const countHooks = createCrudHooks('inventory_counts', countsService, ['stock'])
export const countLineHooks = createCrudHooks('inventory_count_lines', countLinesService, ['inventory_counts'])

export const lotPicker = createPickerSource<Pick<Lot, 'id' | 'lot_number'>>({
  feature: 'lots', table: 'lots', select: 'id, lot_number', searchColumns: ['lot_number', 'supplier_lot'], order: 'lot_number',
  toOption: (l) => ({ value: l.id, label: l.lot_number }),
})

export const STOCK_FEATURES = ['stock', 'movements', 'lots', 'reservations', 'items', 'inventory_counts', 'stock_adjustments', 'stock_transfers']

export const useRecordCountLine = () => useRpcMutation(({ line, counted }: { line: string; counted: number }) => inventoryApi.recordCountLine(line, counted), ['inventory_count_lines'])

export function useAgingBuckets() {
  const org = useOrganization()
  return useQuery({ queryKey: [...featureKey(org.id, 'stock'), 'aging'], queryFn: () => inventoryApi.agingBuckets(org.id) })
}
export function useSlowMoving() {
  const org = useOrganization()
  return useQuery({ queryKey: [...featureKey(org.id, 'stock'), 'slow'], queryFn: () => inventoryApi.slowMoving(org.id) })
}
export function useValueSnapshots() {
  const org = useOrganization()
  return useQuery({ queryKey: [...featureKey(org.id, 'stock'), 'snapshots'], queryFn: () => inventoryApi.valueSnapshots(org.id) })
}
