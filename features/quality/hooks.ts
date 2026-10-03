'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createCrudHooks, featureKey } from '../_core/crud-hooks'
import type { Option } from '../_core/form-values'
import { useOrganization } from '../organization/context'
import { capaService, certificatesService, inspectionsService, ncrService, plansService, pointsService, qualityApi, reasonsService, recallItemsService, recallsService, resultsService } from './service'
import type { ReasonKind } from './types'

export const reasonHooks = createCrudHooks('reason_codes', reasonsService)
export const planHooks = createCrudHooks('inspection_plans', plansService)
export const pointHooks = createCrudHooks('inspection_points', pointsService, ['inspection_plans'])
export const inspectionHooks = createCrudHooks('inspections', inspectionsService, ['stock', 'non_conformances', 'lots'])
export const resultHooks = createCrudHooks('inspection_results', resultsService, ['inspections'])
export const ncrHooks = createCrudHooks('non_conformances', ncrService)
export const capaHooks = createCrudHooks('capa_actions', capaService)
export const certificateHooks = createCrudHooks('quality_certificates', certificatesService)
export const recallHooks = createCrudHooks('recalls', recallsService, ['lots'])
export const recallItemHooks = createCrudHooks('recall_items', recallItemsService)

export function useReasonOptions(kind: ReasonKind): Option[] {
  const { data } = reasonHooks.useList()
  return useMemo(() => (data ?? []).filter((r) => r.kind === kind && r.active).map((r) => ({ value: r.id, label: r.label, hint: r.code })), [data, kind])
}
export const useScrapReasons = () => useReasonOptions('scrap')
export const useDowntimeReasons = () => useReasonOptions('downtime')
export const useFailureReasons = () => useReasonOptions('failure')
export const useDefectReasons = () => useReasonOptions('defect')

export function useTrace(lotId: string | undefined, direction: 'forward' | 'backward') {
  const org = useOrganization()
  return useQuery({ queryKey: [...featureKey(org.id, 'lots'), 'trace', direction, lotId], queryFn: () => (direction === 'forward' ? qualityApi.traceForward(lotId!) : qualityApi.traceBackward(lotId!)), enabled: !!lotId })
}
