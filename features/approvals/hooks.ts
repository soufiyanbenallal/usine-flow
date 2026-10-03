'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createCrudHooks, featureKey } from '../_core/crud-hooks'
import { useOrganization } from '../organization/context'
import { approvalsApi, policiesService, requestsService } from './service'
import type { ApprovalAction, ApprovalRequest, ApprovalStep } from './types'

export const policyHooks = createCrudHooks('approval_policies', policiesService)
export const requestHooks = createCrudHooks('approvals', requestsService, ['notifications'])

export function useApprovalSteps(requests: ApprovalRequest[]) {
  const org = useOrganization()
  const ids = requests.map((r) => r.id)
  return useQuery<ApprovalStep[], Error>({ queryKey: [...featureKey(org.id, 'approvals'), 'steps', ids.join(',')], queryFn: () => approvalsApi.steps(ids), enabled: ids.length > 0 })
}

export function useApprovalActions(requestId: string | undefined) {
  const org = useOrganization()
  return useQuery<ApprovalAction[], Error>({ queryKey: [...featureKey(org.id, 'approvals'), 'actions', requestId], queryFn: () => approvalsApi.actions(requestId!), enabled: !!requestId })
}

/** Latest approval request for a document (pending / approved / rejected). */
export function useDocumentApproval(entityType: string, entityId: string | undefined) {
  const org = useOrganization()
  return useQuery<ApprovalRequest | null, Error>({
    queryKey: [...featureKey(org.id, 'approvals'), 'doc', entityType, entityId],
    enabled: !!entityId,
    queryFn: async () => {
      const rows = await requestsService.listBy(org.id, 'entity_id', entityId!)
      return rows.filter((r) => r.entity_type === entityType).sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null
    },
  })
}

export function useDecideApproval() {
  const org = useOrganization()
  const client = useQueryClient()
  return useMutation<string, Error, { requestId: string; approve: boolean; comment?: string }>({
    mutationFn: ({ requestId, approve, comment }) => approvalsApi.decide(requestId, approve, comment),
    // approving moves the underlying document, so everything of the organization may change
    onSuccess: () => client.invalidateQueries({ queryKey: ['org', org.id] }),
  })
}

export function useCancelApproval() {
  const org = useOrganization()
  const client = useQueryClient()
  return useMutation<void, Error, string>({ mutationFn: approvalsApi.cancel, onSuccess: () => client.invalidateQueries({ queryKey: ['org', org.id] }) })
}
