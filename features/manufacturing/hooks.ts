'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { createCrudHooks, featureKey } from '../_core/crud-hooks'
import type { Option } from '../_core/form-values'
import { useOrganization } from '../organization/context'
import {
  bomLinesService, bomsService, bomVersionsService, consumptionsService, downtimeService, manufacturingApi, materialsService, mrpRunsService, mrpSuggestionsService, operationsService, outputsService,
  productionOrdersService, routingOperationsService, routingsService, scrapService, snapshotsService, standardRollsService, subcontractService, workCentersService,
} from './service'

export const workCenterHooks = createCrudHooks('work_centers', workCentersService)
export const bomHooks = createCrudHooks('boms', bomsService)
export const bomVersionHooks = createCrudHooks('bom_versions', bomVersionsService, ['boms'])
export const bomLineHooks = createCrudHooks('bom_lines', bomLinesService, ['bom_versions'])
export const routingHooks = createCrudHooks('routings', routingsService)
export const routingOperationHooks = createCrudHooks('routing_operations', routingOperationsService, ['routings'])
export const productionOrderHooks = createCrudHooks('production_orders', productionOrdersService, ['approvals'])
export const materialHooks = createCrudHooks('production_order_materials', materialsService, ['production_orders'])
export const operationHooks = createCrudHooks('production_order_operations', operationsService, ['production_orders'])
export const outputHooks = createCrudHooks('production_outputs', outputsService)
export const consumptionHooks = createCrudHooks('production_consumptions', consumptionsService)
export const scrapHooks = createCrudHooks('production_scrap', scrapService)
export const downtimeHooks = createCrudHooks('production_downtime', downtimeService, ['assets'])
export const snapshotHooks = createCrudHooks('production_cost_snapshots', snapshotsService)
export const standardRollHooks = createCrudHooks('standard_cost_rolls', standardRollsService, ['items'])
export const subcontractHooks = createCrudHooks('subcontract_orders', subcontractService)
export const mrpRunHooks = createCrudHooks('mrp_runs', mrpRunsService, ['mrp_suggestions'])
export const mrpSuggestionHooks = createCrudHooks('mrp_suggestions', mrpSuggestionsService)

export const PRODUCTION_FEATURES = ['production_orders', 'production_order_materials', 'production_order_operations', 'production_outputs', 'production_consumptions', 'production_scrap', 'production_downtime', 'stock', 'movements', 'lots', 'inspections', 'assets', 'maintenance_work_orders', 'production_cost_snapshots']

export function useWorkCenterOptions(): Option[] {
  const { data } = workCenterHooks.useList()
  return useMemo(() => (data ?? []).filter((w) => w.active).map((w) => ({ value: w.id, label: w.name, hint: w.code })), [data])
}
export function useWorkCenterIndex() {
  const { data } = workCenterHooks.useList()
  return useMemo(() => new Map((data ?? []).map((w) => [w.id, w])), [data])
}

export function useOee(days = 30) {
  const org = useOrganization()
  return useQuery({
    queryKey: [...featureKey(org.id, 'production_orders'), 'oee', days],
    queryFn: () => manufacturingApi.oee(org.id, new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)),
  })
}
export function useDowntimeReasons() {
  const org = useOrganization()
  return useQuery({ queryKey: [...featureKey(org.id, 'production_downtime'), 'reasons'], queryFn: () => manufacturingApi.downtimeReasons(org.id) })
}

import type { BomIndex } from './bom'

/** Active BOM version of every manufactured item as a lookup structure (explosion, MRP, cost roll-up). */
export function useBomIndex(): { index: BomIndex; loading: boolean } {
  const boms = bomHooks.useList()
  const versions = bomVersionHooks.useList()
  const lines = bomLineHooks.useList()
  const index = useMemo(() => {
    const out: BomIndex = new Map()
    const bomById = new Map((boms.data ?? []).map((b) => [b.id, b]))
    for (const v of versions.data ?? []) {
      if (v.status !== 'active') continue
      const bom = bomById.get(v.bom_id)
      if (!bom || !bom.active) continue
      out.set(bom.item_id, {
        itemId: bom.item_id,
        baseQuantity: v.base_quantity,
        lines: (lines.data ?? []).filter((l) => l.version_id === v.id).map((l) => ({ componentId: l.component_item_id, quantity: l.quantity, scrapPct: l.scrap_pct, kind: l.kind, isAlternative: l.is_alternative })),
      })
    }
    return out
  }, [boms.data, versions.data, lines.data])
  return { index, loading: boms.isPending || versions.isPending || lines.isPending }
}
