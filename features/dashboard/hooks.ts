'use client'

import { useQuery } from '@tanstack/react-query'
import { featureKey } from '../_core/crud-hooks'
import { useOrganization } from '@/features/organization/context'
import { dashboardService, type CadencePoint } from './service'

export function useWeeklyCadence() {
  const org = useOrganization()
  return useQuery<CadencePoint[], Error>({
    queryKey: [...featureKey(org.id, 'dashboard'), 'cadence'],
    queryFn: () => dashboardService.getWeeklyCadence(org.id),
  })
}
