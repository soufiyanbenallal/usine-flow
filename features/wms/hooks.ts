'use client'

import { useMemo } from 'react'
import { createCrudHooks, useRpcMutation } from '../_core/crud-hooks'
import { packageLinesService, packagesService, pickLinesService, pickListsService, tasksService, wavesService, wmsApi } from './service'

const AFTER = ['stock', 'movements', 'sales_orders', 'deliveries']
export const taskHooks = createCrudHooks('warehouse_tasks', tasksService, ['pick_lists'])
export const waveHooks = createCrudHooks('pick_waves', wavesService, ['pick_lists'])
export const pickListHooks = createCrudHooks('pick_lists', pickListsService, ['warehouse_tasks', 'pick_list_lines', 'pick_waves'])
export const pickLineHooks = createCrudHooks('pick_list_lines', pickLinesService, ['pick_lists', 'warehouse_tasks'])
export const packageHooks = createCrudHooks('packages', packagesService, ['pick_lists'])
export const packageLineHooks = createCrudHooks('package_lines', packageLinesService, ['packages'])

export const useCreatePickList = () => useRpcMutation(({ so, wave }: { so: string; wave?: string }) => wmsApi.createPickList(so, wave), ['pick_lists', 'warehouse_tasks', 'sales_orders'])
export const useCreateWave = () => useRpcMutation(({ warehouse, lists }: { warehouse: string; lists: string[] }) => wmsApi.createWave(warehouse, lists), ['pick_waves', 'pick_lists'])
export const useConfirmPick = () => useRpcMutation(({ line, qty }: { line: string; qty: number }) => wmsApi.confirmPick(line, qty), ['pick_list_lines', 'pick_lists', 'warehouse_tasks'])
export const useCreateDeliveryFromPick = () => useRpcMutation((pickList: string) => wmsApi.createDelivery(pickList), ['pick_lists', ...AFTER])
export const useCompleteTask = () => useRpcMutation(({ id, to, qty }: { id: string; to?: string; qty?: number }) => wmsApi.completeTask(id, to, qty), ['warehouse_tasks', ...AFTER])
export const useStartTask = () => useRpcMutation((id: string) => wmsApi.startTask(id), ['warehouse_tasks'])

export function usePickListIndex() {
  const { data } = pickListHooks.useList()
  return useMemo(() => new Map((data ?? []).map((p) => [p.id, p])), [data])
}
