'use client'

import { useQuery } from '@tanstack/react-query'
import { createCrudHooks, featureKey } from '../_core/crud-hooks'
import { useOrganization } from '../organization/context'
import { useCan } from '../organization/permissions'
import { auditService } from './service'
import type { AuditLog } from './types'

export const auditHooks = createCrudHooks('audit', auditService)

export function useEntityHistory(entity: string, entityId: string | undefined) {
  const org = useOrganization()
  const allowed = useCan('audit.view')
  return useQuery<AuditLog[], Error>({
    queryKey: [...featureKey(org.id, 'audit'), 'history', entity, entityId],
    queryFn: () => auditService.history(org.id, entity, entityId!),
    enabled: !!entityId && allowed,
  })
}
