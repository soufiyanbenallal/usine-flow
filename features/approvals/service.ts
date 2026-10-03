import { toUserError } from '@/lib/errors'
import { rpc } from '@/lib/rpc'
import { requireSupabase } from '@/lib/supabase'
import { createCrudService } from '../_core/crud-service'
import type { ApprovalAction, ApprovalPolicy, ApprovalRequest, ApprovalStep } from './types'

export const policiesService = createCrudService<ApprovalPolicy, Record<string, unknown>, Record<string, unknown>>('approval_policies', { order: { column: 'min_amount', ascending: true } })
export const requestsService = createCrudService<ApprovalRequest, Record<string, unknown>, Record<string, unknown>>('approval_requests')

export const approvalsApi = {
  async steps(requestIds: string[]): Promise<ApprovalStep[]> {
    if (requestIds.length === 0) return []
    const { data, error } = await requireSupabase().from('approval_steps').select('*').in('request_id', requestIds).order('step_no')
    if (error) throw toUserError(error)
    return (data ?? []) as ApprovalStep[]
  },
  async actions(requestId: string): Promise<ApprovalAction[]> {
    const { data, error } = await requireSupabase().from('approval_actions').select('*').eq('request_id', requestId).order('created_at')
    if (error) throw toUserError(error)
    return (data ?? []) as ApprovalAction[]
  },
  decide: (requestId: string, approve: boolean, comment?: string) => rpc<string>('decide_approval', { p_request: requestId, p_approve: approve, p_comment: comment ?? null }),
  cancel: (requestId: string) => rpc<void>('cancel_approval', { p_request: requestId }),
  submit: (docType: string, id: string) => rpc<string>('submit_document', { p_type: docType, p_id: id }),
}
