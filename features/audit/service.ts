import { toUserError } from '@/lib/errors'
import { requireSupabase } from '@/lib/supabase'
import { createCrudService } from '../_core/crud-service'
import type { AuditLog } from './types'

export const auditService = {
  ...createCrudService<AuditLog, Record<string, unknown>, Record<string, unknown>>('audit_logs', { order: { column: 'created_at', ascending: false } }),
  /** Change history of one record, newest first. */
  async history(organizationId: string, entity: string, entityId: string): Promise<AuditLog[]> {
    const { data, error } = await requireSupabase()
      .from('audit_logs')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('entity', entity)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) throw toUserError(error)
    return (data ?? []) as AuditLog[]
  },
}
